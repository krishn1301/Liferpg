import { useEffect, useRef } from 'react'
import { App as CapApp } from '@capacitor/app'
import { syncReminders } from '../platform/reminders'
import { canRemind } from '../platform/device'
import { useToday } from './useToday'

/**
 * Keep the OS notification queue in step with the document.
 *
 * The plan is derived, never stored — the same rule XP, levels and streaks
 * follow. That means it has to be re-derived on anything that could change what
 * is due, and there are four such moments:
 *
 *   1. Once the stored document has actually loaded. Syncing against the empty
 *      starting document would cancel every real reminder for a beat.
 *   2. Any change to the habits, debounced, because ticking a habit off should
 *      silence the rest of today's nudges for it.
 *   3. Midnight, via `useToday` — a phone left on the counter overnight would
 *      otherwise keep a plan that starts on yesterday.
 *   4. Returning to the foreground, so a phone that sat in a drawer for three
 *      weeks re-arms instead of running the queue dry.
 *
 * A no-op in a browser: `syncReminders` guards on `canRemind`.
 */
export function useReminders(habits, ready) {
  const today = useToday()
  const timer = useRef(null)
  // Held in a ref so the foreground listener can be registered once and still
  // see current data, rather than tearing down and re-adding on every edit.
  const latest = useRef({ habits, today })

  useEffect(() => {
    latest.current = { habits, today }
  }, [habits, today])

  useEffect(() => {
    if (!ready || !canRemind) return

    // Debounced for the same reason the autosave is: a burst of taps should
    // rewrite the queue once, not once per tap. Longer than the 400ms save
    // because this one crosses a native bridge.
    if (timer.current) clearTimeout(timer.current)
    timer.current = setTimeout(() => syncReminders(habits, today), 800)

    return () => clearTimeout(timer.current)
  }, [habits, today, ready])

  useEffect(() => {
    if (!ready || !canRemind) return

    let remove
    CapApp.addListener('appStateChange', ({ isActive }) => {
      if (!isActive) return
      const { habits, today } = latest.current
      syncReminders(habits, today)
    })
      .then((handle) => {
        remove = () => handle.remove()
      })
      .catch(() => {
        // Not native, so there are no reminders to re-arm in the first place.
      })

    return () => remove?.()
  }, [ready])
}
