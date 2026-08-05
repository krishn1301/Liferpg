import { addDays, startOfWeek, weekKeys } from './dates'
import { isDueOn, normalizeSchedule, SCHEDULE_TYPES, completionsThisWeek } from './schedule'
import { isVow, cleanStreak, bestCleanStreak } from './quit'

// Streaks are the number one reason people quit a habit tracker: one missed
// day wipes out months of work and the app stops feeling worth opening. Three
// rules soften that without making the number meaningless.
//
//  1. Days the habit isn't scheduled for are skipped, not counted as misses.
//  2. Today counts as "not over yet" — an unchecked habit today never breaks
//     a streak, it just doesn't extend it.
//  3. A small number of missed days per calendar month are forgiven (freezes).
//
// Freezes are derived, never stored. There is no counter to get out of sync
// with the completion history, and recomputing the same history always gives
// the same answer.

export const FREEZES_PER_MONTH = 2

const MAX_LOOKBACK_DAYS = 3650 // 10 years — a hard stop, never reached in practice

/**
 * Consecutive scheduled days completed, counting backwards from `todayKey`.
 * Returns `{ streak, frozenDays }` — `frozenDays` are the misses that were
 * forgiven, so the UI can say "2 days covered by a freeze" instead of pretending
 * they never happened.
 */
export function currentStreak(habit, todayKey) {
  // A vow's streak is days since it was last broken. It comes out of the
  // relapse history rather than the completion history, but callers get the
  // same shape back so the Today rows, badges and Stats tiles need no special
  // case — see domain/quit.js.
  if (isVow(habit)) return { streak: cleanStreak(habit, todayKey), frozenDays: [] }

  const schedule = normalizeSchedule(habit?.schedule)
  if (schedule.type === SCHEDULE_TYPES.weekly) {
    return weeklyStreak(habit, todayKey, schedule.timesPerWeek)
  }

  const completions = habit?.completions ?? {}
  const skips = habit?.skips ?? {}

  let streak = 0
  const frozen = []
  // A freeze only counts once it actually bridges to an older completion.
  // Freezes spent past the end of the run bought nothing, and reporting them
  // would tell the user they'd burned an allowance that never held anything up.
  let pendingFrozen = []
  const freezesUsedInMonth = {}
  let cursor = todayKey
  let isToday = true

  for (let guard = 0; guard < MAX_LOOKBACK_DAYS; guard++) {
    if (isDueOn(habit, cursor)) {
      if (completions[cursor]) {
        streak++
        frozen.push(...pendingFrozen)
        pendingFrozen = []
      } else if (skips[cursor]) {
        // An explicit "I'm skipping this deliberately" — neither credit nor penalty.
      } else if (isToday) {
        // The day isn't over. Not a miss yet.
      } else {
        const month = cursor.slice(0, 7)
        freezesUsedInMonth[month] = (freezesUsedInMonth[month] ?? 0) + 1
        if (freezesUsedInMonth[month] > FREEZES_PER_MONTH) break
        pendingFrozen.push(cursor)
      }
      isToday = false
    }
    cursor = addDays(cursor, -1)
  }

  return { streak, frozenDays: frozen }
}

/**
 * For "N times a week" habits the unit is the week, not the day. A week counts
 * once it hits target; the current week is never held against you while it's
 * still running.
 */
function weeklyStreak(habit, todayKey, timesPerWeek) {
  let streak = 0
  let weekStart = startOfWeek(todayKey)
  let isCurrentWeek = true

  for (let guard = 0; guard < MAX_LOOKBACK_DAYS / 7; guard++) {
    const done = completionsThisWeek(habit, weekStart)
    if (done >= timesPerWeek) {
      streak++
    } else if (!isCurrentWeek) {
      break
    }
    isCurrentWeek = false
    weekStart = addDays(weekStart, -7)
  }

  return { streak, frozenDays: [] }
}

/**
 * The longest streak this habit has ever reached, for the stats screen.
 *
 * `todayKey` only matters for vows, whose best run may be the one still going.
 * It stays optional so the many call sites that pass a habit alone keep working.
 */
export function bestStreak(habit, todayKey) {
  // Routing vows through here rather than giving them their own path is what
  // makes the streak badges work for free: earnedBadges keys off bestStreak, so
  // a 30-day clean run unlocks Diamond Habit with no extra code.
  if (isVow(habit)) return bestCleanStreak(habit, todayKey)

  const keys = Object.keys(habit?.completions ?? {})
    .filter((k) => habit.completions[k])
    .sort()
  if (!keys.length) return 0

  let best = 0
  for (const key of keys) {
    const { streak } = currentStreak(habit, key)
    if (streak > best) best = streak
  }
  return best
}

/**
 * Completions ÷ scheduled days over a window. Only days the habit was actually
 * due are in the denominator, so a 3-days-a-week habit can still reach 100%.
 */
export function completionRate(habit, fromKey, toKey) {
  let due = 0
  let done = 0
  let cursor = fromKey

  while (cursor <= toKey) {
    if (isDueOn(habit, cursor) && !habit?.skips?.[cursor]) {
      due++
      if (habit?.completions?.[cursor]) done++
    }
    cursor = addDays(cursor, 1)
  }

  return due === 0 ? 0 : Math.round((done / due) * 100)
}

/**
 * Habits that still count. Archived ones stay in the file so their history
 * survives, but they leave every total.
 *
 * Lives here rather than in stats.js because xp.js needs it too, and stats.js
 * already imports xp.js — putting it there and importing it back would be a
 * cycle.
 */
export const activeHabits = (habits) => (habits ?? []).filter((h) => !h.archived)

/**
 * Habits a day actually asked for: scheduled, live, and — for weekly habits —
 * not already finished for the week. **Skipped days are still included.**
 *
 * This is what the Calendar's day sheet lists, and the distinction is not
 * academic: `dueToday` hides a skipped habit, so a sheet built on it made the
 * row vanish the instant Skip was pressed and left no way to take it back.
 */
export function scheduledOn(habits, dateKey) {
  return habits.filter((habit) => {
    if (!isDueOn(habit, dateKey)) return false
    if (habit.archived) return false

    const schedule = normalizeSchedule(habit.schedule)
    if (schedule.type === SCHEDULE_TYPES.weekly) {
      // Already hit the weekly target and not done today? It's finished; let it rest.
      const done = weekKeys(dateKey).filter((k) => habit.completions?.[k]).length
      if (done >= schedule.timesPerWeek && !habit.completions?.[dateKey]) return false
    }
    return true
  })
}

/**
 * Habits that should appear on a given day's list: everything `scheduledOn`
 * returns, minus the ones deliberately skipped. A skip is a decision already
 * made, so Today has nothing left to ask about.
 */
export const dueToday = (habits, dateKey) =>
  scheduledOn(habits, dateKey).filter((habit) => !habit.skips?.[dateKey])
