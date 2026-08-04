import { addDays, rangeKeys, todayKey as currentKey } from './dates'

// Vows — the habits you keep by *not* doing something.
//
// A build habit asks "did you do it today?" and stores a completion. A vow asks
// "how long since you last slipped?" and stores the slips. Nobody opens an app
// every night to tick "I didn't smoke", so a vow that needed daily confirmation
// would read as broken the first time someone forgot.
//
// So the stored fact is the relapse, and everything else is derived from it —
// the same rule the rest of the app runs on. There is no clean-day counter to
// drift out of step with the history that justifies it.
//
// A vow's `createdKey` is its clean-since date. It is settable on creation,
// because "I have already been clean for sixty days" is true and the app has no
// business pretending otherwise.

export const HABIT_KINDS = { build: 'build', quit: 'quit' }

/** Is this a vow rather than a habit you tick? */
export const isVow = (habit) => habit?.kind === HABIT_KINDS.quit

/** Relapse date keys, oldest first. */
export function relapseKeys(habit) {
  return Object.keys(habit?.relapses ?? {})
    .filter((k) => habit.relapses[k])
    .sort()
}

/** The day the current clean run began: the day after the last relapse. */
function runStart(habit, todayKey) {
  const relapses = relapseKeys(habit).filter((k) => k <= todayKey)
  const last = relapses[relapses.length - 1]
  if (last) return addDays(last, 1)
  return habit?.createdKey ?? todayKey
}

/**
 * Days clean right now.
 *
 * The day you relapse counts as zero, not one — you did not get through it. The
 * day after is day one. Counting the relapse day itself would let someone slip
 * every single day and still show a streak of 1 forever.
 *
 * A vow started today reads 0, and ticks over to 1 tomorrow. That is the honest
 * answer: you have not yet been clean for a day.
 */
export function cleanStreak(habit, todayKey = currentKey()) {
  const start = runStart(habit, todayKey)
  if (start > todayKey) return 0
  return rangeKeys(start, todayKey).length - 1
}

/**
 * The longest clean run this vow has ever held, including the current one.
 *
 * Runs are the gaps between relapses. A relapse on the start date leaves a run
 * of zero rather than a negative one.
 */
export function bestCleanStreak(habit, todayKey = currentKey()) {
  const start = habit?.createdKey ?? todayKey
  const relapses = relapseKeys(habit).filter((k) => k >= start && k <= todayKey)

  let best = 0
  let cursor = start

  for (const relapse of relapses) {
    // Days survived between `cursor` and the relapse, exclusive of the relapse.
    const run = Math.max(0, rangeKeys(cursor, relapse).length - 1)
    if (run > best) best = run
    cursor = addDays(relapse, 1)
  }

  const current = cleanStreak(habit, todayKey)
  return Math.max(best, current)
}

/**
 * Every clean day this vow has ever banked — the whole history, not the current
 * run. This is what XP is paid on, which is why a relapse resets the streak
 * without taking back a single point that was already earned. Losing months of
 * levels over one bad night is how people delete a habit tracker.
 */
export function cleanDaysTotal(habit, todayKey = currentKey()) {
  const start = habit?.createdKey ?? todayKey
  if (start > todayKey) return 0

  // The current day is not banked until it is over, matching cleanStreak.
  const days = rangeKeys(start, todayKey).length - 1
  const slips = relapseKeys(habit).filter((k) => k >= start && k < todayKey).length
  return Math.max(0, days - slips)
}

/** How many times this vow has been broken, ever. */
export const relapseCount = (habit) => relapseKeys(habit).length

/** The most recent relapse on or before `todayKey`, or null if never broken. */
export function lastRelapse(habit, todayKey = currentKey()) {
  const relapses = relapseKeys(habit).filter((k) => k <= todayKey)
  return relapses[relapses.length - 1] ?? null
}
