import { describe, it, expect } from 'vitest'
import {
  activeMedicines,
  adherence,
  describeDoses,
  doseId,
  dosesForDay,
  dueMedicines,
  isCourseActive
} from './medicines'

// 2026-06-01 is a Monday.
const MON = '2026-06-01'
const TUE = '2026-06-02'
const WED = '2026-06-03'
const SUN = '2026-06-07'

const med = (over = {}) => ({
  id: 'm1',
  name: 'Vitamin D',
  dose: '1000IU',
  times: ['08:00'],
  schedule: { type: 'daily' },
  ...over
})

describe('isCourseActive', () => {
  it('is active when no window is set', () => {
    expect(isCourseActive(med(), MON)).toBe(true)
  })

  it('excludes days before the course starts and after it ends', () => {
    const course = med({ startKey: TUE, endKey: WED })
    expect(isCourseActive(course, MON)).toBe(false)
    expect(isCourseActive(course, TUE)).toBe(true)
    expect(isCourseActive(course, WED)).toBe(true)
    expect(isCourseActive(course, SUN)).toBe(false)
  })

  it('treats the start and end days as inclusive', () => {
    const course = med({ startKey: MON, endKey: MON })
    expect(isCourseActive(course, MON)).toBe(true)
  })
})

describe('dueMedicines', () => {
  it('honours a weekday schedule the same way habits do', () => {
    const meds = [med({ id: 'a', schedule: { type: 'weekdays', days: [1, 3] } })]
    expect(dueMedicines(meds, MON).map((m) => m.id)).toEqual(['a'])
    expect(dueMedicines(meds, TUE)).toEqual([])
    expect(dueMedicines(meds, WED).map((m) => m.id)).toEqual(['a'])
  })

  it('drops archived medicines', () => {
    expect(dueMedicines([med({ archived: true })], MON)).toEqual([])
    expect(activeMedicines([med({ archived: true }), med({ id: 'b' })])).toHaveLength(1)
  })

  it('drops medicines whose course has finished', () => {
    expect(dueMedicines([med({ endKey: MON })], TUE)).toEqual([])
  })
})

describe('dosesForDay', () => {
  it('produces one entry per time, ordered through the day', () => {
    const meds = [med({ times: ['22:00', '08:00', '14:00'] })]
    expect(dosesForDay(meds, {}, MON).map((d) => d.time)).toEqual(['08:00', '14:00', '22:00'])
  })

  it('reads taken state out of the day log', () => {
    const meds = [med({ times: ['08:00', '22:00'] })]
    const logs = { [MON]: { meds: { [doseId('m1', '08:00')]: true } } }
    const doses = dosesForDay(meds, logs, MON)
    expect(doses.map((d) => d.taken)).toEqual([true, false])
  })

  it('keeps two medicines at the same time apart', () => {
    const meds = [med({ id: 'a', name: 'Zinc' }), med({ id: 'b', name: 'Iron' })]
    const doses = dosesForDay(meds, {}, MON)
    expect(doses).toHaveLength(2)
    // Sorted by name within a time slot, so the list order is stable.
    expect(doses.map((d) => d.med.name)).toEqual(['Iron', 'Zinc'])
    expect(new Set(doses.map((d) => d.id)).size).toBe(2)
  })

  it('returns nothing for a medicine with no times set', () => {
    expect(dosesForDay([med({ times: [] })], {}, MON)).toEqual([])
  })
})

describe('adherence', () => {
  it('counts only the days a medicine was actually due', () => {
    // Mon/Wed only, one dose a day, taken on Monday.
    const meds = [med({ schedule: { type: 'weekdays', days: [1, 3] } })]
    const logs = { [MON]: { meds: { [doseId('m1', '08:00')]: true } } }
    // Two due days across Mon–Sun, not seven.
    expect(adherence(meds, logs, MON, SUN)).toEqual({ due: 2, taken: 1, pct: 50 })
  })

  it('keeps a finished course out of the denominator', () => {
    const meds = [med({ endKey: MON })]
    const logs = { [MON]: { meds: { [doseId('m1', '08:00')]: true } } }
    expect(adherence(meds, logs, MON, SUN)).toEqual({ due: 1, taken: 1, pct: 100 })
  })

  it('counts each dose of a multi-dose day separately', () => {
    const meds = [med({ times: ['08:00', '22:00'] })]
    const logs = { [MON]: { meds: { [doseId('m1', '08:00')]: true } } }
    expect(adherence(meds, logs, MON, MON)).toEqual({ due: 2, taken: 1, pct: 50 })
  })

  it('reports 0 rather than NaN when nothing is due', () => {
    expect(adherence([], {}, MON, SUN)).toEqual({ due: 0, taken: 0, pct: 0 })
  })
})

describe('describeDoses', () => {
  it('names the slots in the order they fall', () => {
    expect(describeDoses(med({ times: ['22:00', '08:00'] }))).toBe('Morning, Night')
  })

  it('says so when no times are set', () => {
    expect(describeDoses(med({ times: [] }))).toBe('No times set')
  })
})
