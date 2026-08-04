import { dayOfWeek, weekKeys } from './dates'
import { isVow } from './quit'

// A habit is only judged on the days it is actually meant to happen.
//
// The desktop app treated every habit as daily, so a Mon/Wed/Fri gym habit
// showed a broken streak every Tuesday and a completion rate capped at 43%.
// `isDueOn` is the single predicate that the Today list, the weekly grid,
// streaks and every percentage all agree on.

export const SCHEDULE_TYPES = {
  daily: 'daily',
  weekdays: 'weekdays',
  weekly: 'weekly'
}

export const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

/** Habits saved before schedules existed are daily. */
export function normalizeSchedule(schedule) {
  if (!schedule || !schedule.type) return { type: SCHEDULE_TYPES.daily }

  if (schedule.type === SCHEDULE_TYPES.weekdays) {
    const days = [...new Set(schedule.days ?? [])].filter((d) => d >= 0 && d <= 6).sort()
    // A weekday schedule with no days selected can never come due, which would
    // silently hide the habit forever. Treat it as daily instead.
    return days.length ? { type: SCHEDULE_TYPES.weekdays, days } : { type: SCHEDULE_TYPES.daily }
  }

  if (schedule.type === SCHEDULE_TYPES.weekly) {
    const timesPerWeek = Math.min(7, Math.max(1, Math.round(schedule.timesPerWeek ?? 3)))
    return { type: SCHEDULE_TYPES.weekly, timesPerWeek }
  }

  return { type: SCHEDULE_TYPES.daily }
}

/**
 * Did this habit exist yet on this day?
 *
 * A habit created today has not missed the past month. Without this the
 * calendar paints every day back to the 1st as a miss, and a habit added
 * five minutes ago reports a 3% completion rate over 30 days — numbers that
 * describe days it did not exist for.
 *
 * A habit with no `createdKey` is treated as always having existed. That is
 * the honest answer for a document written before the field did: guessing a
 * start date would silently rewrite someone's history.
 */
export function existedOn(habit, dateKey) {
  return !habit?.createdKey || dateKey >= habit.createdKey
}

/**
 * Is this habit expected on this day?
 *
 * `weekly` habits ("3 times a week") are due every day in the sense that you
 * may do them on any day — the target is enforced per week by the streak
 * logic, not per day.
 *
 * Creation date is folded in here rather than at each call site, because every
 * denominator in the app runs through this predicate and one of them forgetting
 * is exactly how the desktop app's percentages drifted apart.
 */
export function isDueOn(habit, dateKey) {
  if (!existedOn(habit, dateKey)) return false

  // A vow is never "due". There is nothing to complete — you keep it by not
  // acting — so it must stay out of every denominator in the app.
  //
  // This one line is load-bearing. Without it a vow reads as due every day and
  // completed on none: a permanent 0% that drags down each category rate,
  // flattens the trend plot, parks itself at the top of the worst-first list,
  // and makes Perfect Day unwinnable for as long as the vow exists. Its own
  // numbers come from domain/quit.js instead.
  if (isVow(habit)) return false

  const schedule = normalizeSchedule(habit?.schedule)
  switch (schedule.type) {
    case SCHEDULE_TYPES.weekdays:
      return schedule.days.includes(dayOfWeek(dateKey))
    case SCHEDULE_TYPES.weekly:
    case SCHEDULE_TYPES.daily:
    default:
      return true
  }
}

/** How many times a `weekly` habit was completed in the week containing `dateKey`. */
export function completionsThisWeek(habit, dateKey) {
  return weekKeys(dateKey).filter((k) => habit?.completions?.[k]).length
}

/** Has a weekly habit already hit its target for the week containing `dateKey`? */
export function weeklyTargetMet(habit, dateKey) {
  const schedule = normalizeSchedule(habit?.schedule)
  if (schedule.type !== SCHEDULE_TYPES.weekly) return false
  return completionsThisWeek(habit, dateKey) >= schedule.timesPerWeek
}

/** Short human description for the habit list, e.g. "Mon, Wed, Fri". */
export function describeSchedule(schedule) {
  const s = normalizeSchedule(schedule)
  if (s.type === SCHEDULE_TYPES.daily) return 'Every day'
  if (s.type === SCHEDULE_TYPES.weekly) {
    return s.timesPerWeek === 1 ? 'Once a week' : `${s.timesPerWeek}× a week`
  }
  if (s.days.length === 7) return 'Every day'
  // Recognise the two groupings people actually think in
  const isWeekdays = s.days.join() === '1,2,3,4,5'
  const isWeekend = s.days.join() === '0,6'
  if (isWeekdays) return 'Weekdays'
  if (isWeekend) return 'Weekends'
  // Display Monday-first, the way the rest of the app shows weeks
  const ordered = [1, 2, 3, 4, 5, 6, 0].filter((d) => s.days.includes(d))
  return ordered.map((d) => DAY_LABELS[d]).join(', ')
}
