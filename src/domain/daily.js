import { rangeKeys } from './dates'
import { dailyTrend } from './stats'
import { LOG_SCALE } from './constants'

// The end-of-day log: mood, energy, water and a line of text.
//
// It rides on `dailyLogs`, the same per-day bag medicine doses already live in,
// and goes through the `log/set` action that already existed and only `meds`
// ever used. No reducer change, no migration, no new shape.
//
// One rule runs through all of this: **a day nobody logged is absent, not zero.**
// Averaging an unlogged day as a mood of 0 would let a fortnight of not
// bothering read as the worst fortnight on record.

// `steps` is null rather than 0 when absent, and water is 0. The difference is
// not an inconsistency: a day with no water entry genuinely is a day of no
// water, but a day with no step reading is a day the counter was never asked,
// which is not the same as a day of sitting still.
const EMPTY = { mood: null, energy: null, water: 0, note: '', steps: null }

/** Clamp to the 1..5 scale, or null. Anything unparseable becomes null. */
function scalePoint(value) {
  const n = Number(value)
  if (!Number.isFinite(n) || n < 1) return null
  return Math.min(LOG_SCALE, Math.round(n))
}

/** One day's log, with every field present so callers never guard. */
export function logFor(dailyLogs, dateKey) {
  const log = dailyLogs?.[dateKey]
  if (!log) return { ...EMPTY }

  return {
    mood: scalePoint(log.mood),
    energy: scalePoint(log.energy),
    water: Math.max(0, Math.round(Number(log.water) || 0)),
    note: typeof log.note === 'string' ? log.note : '',
    steps: typeof log.steps === 'number' ? Math.max(0, Math.round(log.steps)) : null
  }
}

/** Is there anything on this day worth showing? */
export function hasLog(dailyLogs, dateKey) {
  const { mood, energy, water, note, steps } = logFor(dailyLogs, dateKey)
  // A step count counts even at zero: unlike the others it is not something the
  // user forgot to fill in, it is something the phone recorded.
  return mood !== null || energy !== null || water > 0 || note.trim().length > 0 || steps !== null
}

/** Every day in the range, oldest first, for plotting. */
export function logTrend(dailyLogs, fromKey, toKey) {
  return rangeKeys(fromKey, toKey).map((dateKey) => ({ dateKey, ...logFor(dailyLogs, dateKey) }))
}

/** Mean of the values that exist, or null if none do. */
function mean(values) {
  if (!values.length) return null
  return Math.round((values.reduce((a, b) => a + b, 0) / values.length) * 10) / 10
}

/**
 * Averages over the range.
 *
 * Mood and energy average only the days they were recorded — see the rule at
 * the top. Water is different: a day with no entry genuinely is zero glasses
 * logged, and averaging only the days someone remembered would report a number
 * that flatters them.
 */
export function logAverages(dailyLogs, fromKey, toKey) {
  const days = logTrend(dailyLogs, fromKey, toKey)

  return {
    mood: mean(days.filter((d) => d.mood !== null).map((d) => d.mood)),
    energy: mean(days.filter((d) => d.energy !== null).map((d) => d.energy)),
    water: mean(days.map((d) => d.water)),
    logged: days.filter((d) => d.mood !== null || d.energy !== null).length,
    days: days.length
  }
}

/**
 * Mood on the days everything got done, against mood on the days it didn't.
 *
 * Two averages, deliberately — **not a correlation coefficient.** Three users
 * and a month of data cannot support one, and printing `r = 0.62` would dress
 * up noise as a finding. Two numbers side by side say what is actually known
 * and let the reader decide whether the gap means anything.
 *
 * `null` on either side means there were no such days to average, which the UI
 * has to say rather than print as a zero.
 */
export function moodByCompletion(habits, dailyLogs, fromKey, toKey) {
  const trend = dailyTrend(habits, fromKey, toKey)

  const full = []
  const partial = []

  for (const day of trend) {
    // A day with nothing scheduled is neither a win nor a loss and belongs in
    // neither bucket.
    if (!day.due) continue
    const { mood } = logFor(dailyLogs, day.dateKey)
    if (mood === null) continue
    ;(day.done === day.due ? full : partial).push(mood)
  }

  return {
    perfect: mean(full),
    perfectDays: full.length,
    other: mean(partial),
    otherDays: partial.length
  }
}
