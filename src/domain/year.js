import { fromDateKey, toDateKey, todayKey as currentKey } from './dates'

// How much of the year is gone.
//
// Nothing here goes through UTC. `toDateKey` exists because the desktop app's
// `toISOString().split('T')[0]` filed everything before 5:30 AM under the
// previous day at UTC+5:30, and a year counter reading one day out on the 31st
// of December would be the most visible possible version of that bug.

/** Days in a year, leap years included. */
export const daysInYear = (year) => (isLeapYear(year) ? 366 : 365)

/** The Gregorian rule in full — 2000 was a leap year, 1900 and 2100 are not. */
export const isLeapYear = (year) => (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0

/**
 * Year progress for a date key.
 *
 * `elapsed` counts today as spent — you are living it, and a counter that only
 * moves at midnight tells you the day has not started. `left` therefore excludes
 * today and reaches 0 on the 31st, which is what "days left" means to anyone
 * looking at it on New Year's Eve.
 */
export function yearProgress(dateKey = currentKey()) {
  const date = fromDateKey(dateKey)
  const year = date.getFullYear()
  const total = daysInYear(year)

  const startOfYear = fromDateKey(`${year}-01-01`)
  const elapsed = Math.round((date - startOfYear) / 86_400_000) + 1

  return {
    year,
    total,
    elapsed,
    left: total - elapsed,
    pct: Math.round((elapsed / total) * 100)
  }
}

/**
 * The year as a run of week blocks, oldest first — the code strip's alphabet at
 * year scale. 52 blocks read cleanly on a 411px screen; 365 would be under a
 * pixel each and tell you nothing.
 *
 * The final block is short in most years (365 = 52 weeks + 1 day) and the
 * remainder is folded into it rather than given a block of its own, which would
 * imply a 53rd week that mostly does not exist.
 */
export function yearBlocks(dateKey = currentKey(), count = 52) {
  const { elapsed, total } = yearProgress(dateKey)
  const perBlock = total / count
  // Which block today falls in, clamped so 31 December cannot overflow the run.
  const current = Math.min(count - 1, Math.floor((elapsed - 1) / perBlock))

  return Array.from({ length: count }, (_, i) => ({
    key: i,
    state: i < current ? 'done' : i === current ? 'current' : 'off'
  }))
}

/** '2026-12-31' → the last day of that year, for tests and labels. */
export const endOfYear = (year) => toDateKey(new Date(year, 11, 31))
