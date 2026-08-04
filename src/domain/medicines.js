import { isDueOn } from './schedule'
import { rangeKeys } from './dates'
import { MED_TIMES } from './constants'

// A medicine is a habit with a stricter shape: it recurs on a schedule like a
// habit does, but it is taken at named times of day and it usually has an end.
// Reusing `isDueOn` means a Mon/Wed/Fri prescription is judged the same way a
// Mon/Wed/Fri gym habit is, rather than growing a second, subtly different
// notion of "due".

/** Doses are logged per day under one key so a day's log stays one object. */
export const doseId = (medId, time) => `${medId}|${time}`

export const activeMedicines = (meds) => (meds ?? []).filter((m) => !m.archived)

/**
 * Is this medicine live on this day?
 *
 * A course has a start and, usually, an end — antibiotics for seven days.
 * Outside that window the medicine is not merely "not done", it is not asked
 * for at all, and must stay out of every denominator.
 */
export function isCourseActive(med, dateKey) {
  if (med.startKey && dateKey < med.startKey) return false
  if (med.endKey && dateKey > med.endKey) return false
  return true
}

/** Medicines expected on this day, in the order their doses fall. */
export function dueMedicines(meds, dateKey) {
  return activeMedicines(meds).filter((m) => isCourseActive(m, dateKey) && isDueOn(m, dateKey))
}

const timeRank = (time) => {
  const i = MED_TIMES.findIndex((t) => t.key === time)
  return i === -1 ? MED_TIMES.length : i
}

/**
 * Every dose expected on a day, flattened and sorted by time of day.
 * One medicine taken morning and night is two entries, because they are two
 * separate things the user has to actually do.
 */
export function dosesForDay(meds, dailyLogs, dateKey) {
  const taken = dailyLogs?.[dateKey]?.meds ?? {}
  const out = []

  for (const med of dueMedicines(meds, dateKey)) {
    for (const time of med.times ?? []) {
      out.push({
        id: doseId(med.id, time),
        med,
        time,
        taken: Boolean(taken[doseId(med.id, time)])
      })
    }
  }

  return out.sort(
    (a, b) => timeRank(a.time) - timeRank(b.time) || a.med.name.localeCompare(b.med.name)
  )
}

/** Doses taken vs expected over a range. Same shape as the habit stats. */
export function adherence(meds, dailyLogs, fromKey, toKey) {
  let due = 0
  let taken = 0

  for (const dateKey of rangeKeys(fromKey, toKey)) {
    for (const dose of dosesForDay(meds, dailyLogs, dateKey)) {
      due++
      if (dose.taken) taken++
    }
  }

  return { due, taken, pct: due ? Math.round((taken / due) * 100) : 0 }
}

/** Human summary for a medicine row, e.g. "500mg · Morning, Night". */
export function describeDoses(med) {
  const times = (med.times ?? [])
    .slice()
    .sort((a, b) => timeRank(a) - timeRank(b))
    .map((t) => MED_TIMES.find((m) => m.key === t)?.label ?? t)
  return times.join(', ') || 'No times set'
}
