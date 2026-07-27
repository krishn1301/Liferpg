// Every date in LifeRPG is a "date key": a local calendar day as 'YYYY-MM-DD'.
//
// The desktop app used `toISOString().split('T')[0]`, which converts to UTC
// first. At UTC+5:30 that filed everything logged before 5:30 AM under the
// previous day — streaks broke overnight and the weekly grid lied. Nothing in
// this file may call toISOString().

const pad = (n) => String(n).padStart(2, '0')

/** Local calendar day of a Date, as 'YYYY-MM-DD'. */
export function toDateKey(date) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

/** A Date at local midnight of the given key. */
export function fromDateKey(key) {
  const [y, m, d] = key.split('-').map(Number)
  return new Date(y, m - 1, d)
}

/** Today's key. Pass a clock for tests. */
export function todayKey(now = new Date()) {
  return toDateKey(now)
}

/** Shift a key by whole days. Negative goes back. */
export function addDays(key, delta) {
  const d = fromDateKey(key)
  d.setDate(d.getDate() + delta)
  return toDateKey(d)
}

/** 0 = Sunday … 6 = Saturday, matching Date#getDay. */
export function dayOfWeek(key) {
  return fromDateKey(key).getDay()
}

/** Monday-based start of the week containing `key`. */
export function startOfWeek(key) {
  const dow = dayOfWeek(key)
  return addDays(key, dow === 0 ? -6 : 1 - dow)
}

/** The seven keys Mon…Sun for the week containing `key`. */
export function weekKeys(key) {
  const monday = startOfWeek(key)
  return Array.from({ length: 7 }, (_, i) => addDays(monday, i))
}

/** Inclusive range of keys. */
export function rangeKeys(fromKey, toKey) {
  const out = []
  let cursor = fromKey
  while (cursor <= toKey) {
    out.push(cursor)
    cursor = addDays(cursor, 1)
  }
  return out
}

/** Days in the month containing `key`. */
export function daysInMonth(year, monthIndex) {
  return new Date(year, monthIndex + 1, 0).getDate()
}

/**
 * Milliseconds until the next local midnight.
 *
 * The desktop app captured `const TODAY = new Date()` once at module load, so
 * an app left open overnight kept writing to yesterday. The UI schedules a
 * rollover on this instead.
 */
export function msUntilNextLocalMidnight(now = new Date()) {
  const next = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1)
  return next.getTime() - now.getTime()
}

/** '14:30' → '2:30 PM' */
export function formatTime(hhmm) {
  const [h, m] = hhmm.split(':').map(Number)
  const suffix = h >= 12 ? 'PM' : 'AM'
  const hour = h % 12 === 0 ? 12 : h % 12
  return `${hour}:${pad(m)} ${suffix}`
}

/** Minutes since local midnight, for positioning things on a timeline. */
export function minutesOfDay(hhmm) {
  const [h, m] = hhmm.split(':').map(Number)
  return h * 60 + m
}
