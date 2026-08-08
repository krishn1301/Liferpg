import { useEffect, useRef } from 'react'
import { App as CapApp } from '@capacitor/app'
import { readStepCounter } from '../platform/steps'
import { canCountSteps } from '../platform/device'
import { fold, goalMet } from '../domain/steps'
import { activeHabits } from '../domain/streaks'
import { isDueOn } from '../domain/schedule'
import { useToday } from './useToday'

/**
 * Keep today's step count up to date.
 *
 * The hardware counts continuously whether the app is running or not, so this
 * does not sample on a timer — it reads at the two moments the number is about
 * to be *looked at*:
 *
 *   1. Once the stored document has loaded, so the baseline that comes back is
 *      the real one rather than the empty document's.
 *   2. Every return to the foreground, which is also what catches midnight and
 *      what catches a reboot — `fold` recognises both from the reading itself.
 *
 * A no-op in a browser and on a phone that has not been asked yet:
 * `readStepCounter` answers `null`, and null means "leave the number alone",
 * never zero. Writing a zero would erase a day's steps every time the app
 * opened somewhere it could not read the sensor.
 */
/**
 * Tick any habit whose step goal was just crossed.
 *
 * Fires on the *crossing*, not on the condition. That distinction is the whole
 * reason an auto-completion here stays undoable: once the goal has been met the
 * app says so once and then leaves the habit alone, so unticking a step habit
 * at 9,000 steps does not silently re-tick itself when you walk another
 * hundred. Reaching a goal is an event; having reached it is not.
 *
 * Completion goes through the ordinary `habit/toggle` path, so a step habit is
 * a completion like any other — `isDueOn`, streaks, XP and every percentage
 * agree about it without knowing steps exist.
 */
function completeCrossedGoals(doc, dateKey, before, after, dispatch) {
  for (const habit of activeHabits(doc.habits ?? [])) {
    const goal = habit.stepGoal ?? 0
    if (!goalMet(after, goal) || goalMet(before, goal)) continue
    if (!isDueOn(habit, dateKey) || habit.completions?.[dateKey]) continue
    dispatch({ type: 'habit/toggle', id: habit.id, dateKey })
  }
}

export function useSteps(doc, ready, dispatch) {
  const today = useToday()
  // Held in a ref so the foreground listener registers once and still sees
  // current data, rather than tearing down and re-adding on every edit.
  const latest = useRef({ doc, today })

  useEffect(() => {
    latest.current = { doc, today }
  }, [doc, today])

  useEffect(() => {
    if (!ready || !canCountSteps) return
    if (!doc.settings?.stepsEnabled) return

    let cancelled = false

    const sample = async () => {
      const sinceBoot = await readStepCounter()
      if (cancelled || sinceBoot === null) return

      const { doc: current, today: day } = latest.current
      // Raw, so that "no steps field yet" stays distinguishable from "zero
      // steps so far". Collapsing the two meant the very first sample of a day
      // computed 0, compared 0 to 0, wrote nothing, and left someone who had
      // just switched steps on staring at a log with no step row in it.
      const recorded = current.dailyLogs?.[day]?.steps
      const banked = recorded ?? 0
      const { baseline, steps } = fold(current.settings?.stepBaseline, day, sinceBoot, banked)

      // Otherwise the autosave fires on every resume, rewriting the whole
      // document to store a number it already had.
      if (steps !== recorded) {
        dispatch({ type: 'log/set', dateKey: day, field: 'steps', value: steps })
        completeCrossedGoals(current, day, banked, steps, dispatch)
      }
      dispatch({ type: 'settings/set', changes: { stepBaseline: baseline } })
    }

    sample()

    let remove
    CapApp.addListener('appStateChange', ({ isActive }) => {
      if (isActive) sample()
    })
      .then((handle) => {
        remove = () => handle.remove()
      })
      .catch(() => {
        // Not native, so there is no sensor to read in the first place.
      })

    return () => {
      cancelled = true
      remove?.()
    }
    // `doc` deliberately absent: this must not re-sample on every edit, and the
    // listener reads current data from the ref. Enabling steps or a new day are
    // the only things that should rebuild it.
  }, [ready, today, doc.settings?.stepsEnabled, dispatch])
}
