import { addDays, fromDateKey, todayKey as currentKey } from './dates'
import { describeSchedule, isDueOn, weeklyTargetMet } from './schedule'
import { activeHabits } from './streaks'

// What to remind someone about, and when.
//
// This file is pure. It expands habits into a flat list of concrete moments;
// platform/reminders.js is the only thing that talks to the OS.
//
// ---- Why this is not one repeating notification per habit ----
//
// The obvious design is a repeating OS notification per habit per time, set
// once and forgotten. It cannot express what this app already knows:
//
//   - A `weekly` habit ("3× a week") has no fixed days. No repeating weekday
//     rule describes it, and firing every day would nag on the four days you
//     correctly chose not to use.
//   - A repeating notification cannot know the habit is already done today.
//   - A vow has no due days at all and must never fire.
//
// So `isDueOn` decides — the same predicate the Today list, the weekly grid,
// streaks and every percentage run on. A reminder can therefore never disagree
// with what the app shows you, and vows and archived habits drop out for free.
//
// The cost is that the plan has to be re-expanded whenever the document changes
// and re-armed whenever the app is opened. That is what useReminders does.

/**
 * How far ahead to schedule.
 *
 * The queue drains if the app is not opened for this long. That is an
 * acceptable failure for something whose whole premise is being opened daily,
 * and the alternative — repeating notifications — is wrong for the reasons
 * above.
 */
export const HORIZON_DAYS = 21

/**
 * The most notifications to leave pending at once.
 *
 * Not arbitrary: **iOS allows 64 pending local notifications per app** and
 * silently discards the rest. 56 leaves headroom. Because the list is sorted
 * soonest-first before it is capped, overflowing loses the furthest-away
 * reminders, which are the right ones to lose.
 */
export const MAX_PENDING = 56

const TIME = /^([01]\d|2[0-3]):([0-5]\d)$/

/**
 * Clean a stored reminder list: valid HH:MM only, deduped, in order.
 *
 * Runs in `normalizeHabit`, so a hand-edited backup carrying `"8am"` or
 * `"25:00"` cannot reach the scheduler and produce an Invalid Date.
 */
export function normalizeReminders(reminders) {
  if (!Array.isArray(reminders)) return []
  return [...new Set(reminders.filter((t) => typeof t === 'string' && TIME.test(t)))].sort()
}

/** Local Date for a date key and an HH:MM time. Never through UTC — see dates.js. */
function momentOf(dateKey, time) {
  const [h, m] = time.split(':').map(Number)
  const date = fromDateKey(dateKey)
  date.setHours(h, m, 0, 0)
  return date
}

/**
 * Every reminder that should be pending right now, soonest first.
 *
 * @param habits    the whole habit list, archived included — filtered here
 * @param todayKey  today, so tests do not depend on the wall clock
 * @param now       used to drop moments that have already passed
 * @param limit     hard cap, see MAX_PENDING
 */
export function plannedReminders(
  habits,
  todayKey = currentKey(),
  now = new Date(),
  limit = MAX_PENDING
) {
  const live = activeHabits(habits).filter((h) => normalizeReminders(h.reminders).length > 0)
  if (!live.length) return []

  const out = []

  for (let i = 0; i < HORIZON_DAYS; i++) {
    const dateKey = addDays(todayKey, i)

    for (const habit of live) {
      // The same predicate everything else in the app asks. A vow answers no.
      if (!isDueOn(habit, dateKey)) continue
      // Done is done — no reminder for a box already ticked, today or on a day
      // that was backfilled forward.
      if (habit.completions?.[dateKey]) continue
      // An "n times a week" habit that already hit its target this week is not
      // owed anything else, the same rule the code strip paints.
      if (weeklyTargetMet(habit, dateKey)) continue

      for (const time of normalizeReminders(habit.reminders)) {
        const at = momentOf(dateKey, time)
        // Covers today's slots that have already gone by, with no special case
        // for "today" anywhere.
        if (at <= now) continue

        out.push({
          habitId: habit.id,
          dateKey,
          time,
          at,
          title: `${habit.icon ?? '⭐'} ${habit.name}`.trim(),
          // Stable text: this fires days from now, so anything counted at plan
          // time — "2 of 3 this week" — would be stale by the time it is read.
          body: describeSchedule(habit.schedule)
        })
      }
    }
  }

  return out.sort((a, b) => a.at - b.at || a.title.localeCompare(b.title)).slice(0, limit)
}
