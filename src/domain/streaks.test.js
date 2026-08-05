import { describe, it, expect } from 'vitest'
import { currentStreak, completionRate, dueToday, scheduledOn, FREEZES_PER_MONTH } from './streaks'
import { isDueOn, describeSchedule, normalizeSchedule } from './schedule'

// 2026-07-27 is a Monday. Every fixture below is anchored to it.
const MON = '2026-07-27'

const habit = (overrides = {}) => ({
  id: 1,
  name: 'Test',
  category: 'personal',
  completions: {},
  ...overrides
})

const completedOn = (...keys) => Object.fromEntries(keys.map((k) => [k, true]))

describe('isDueOn', () => {
  it('daily habits are due every day', () => {
    const h = habit({ schedule: { type: 'daily' } })
    expect(isDueOn(h, MON)).toBe(true)
    expect(isDueOn(h, '2026-08-02')).toBe(true)
  })

  it('habits saved before schedules existed are treated as daily', () => {
    expect(isDueOn(habit(), MON)).toBe(true)
    expect(normalizeSchedule(undefined)).toEqual({ type: 'daily' })
  })

  it('weekday habits are due only on their days', () => {
    const mwf = habit({ schedule: { type: 'weekdays', days: [1, 3, 5] } })
    expect(isDueOn(mwf, '2026-07-27')).toBe(true) // Mon
    expect(isDueOn(mwf, '2026-07-28')).toBe(false) // Tue
    expect(isDueOn(mwf, '2026-07-29')).toBe(true) // Wed
  })

  it('refuses to create a schedule that can never come due', () => {
    // An empty day list would hide the habit forever with no way to notice.
    expect(normalizeSchedule({ type: 'weekdays', days: [] })).toEqual({ type: 'daily' })
  })
})

describe('currentStreak — daily', () => {
  it('counts consecutive completed days backwards', () => {
    const h = habit({
      schedule: { type: 'daily' },
      completions: completedOn('2026-07-27', '2026-07-26', '2026-07-25')
    })
    expect(currentStreak(h, MON).streak).toBe(3)
  })

  it('does not break a streak just because today is not done yet', () => {
    // The desktop app reported 0 here until you checked in, which made the
    // number useless every morning.
    const h = habit({
      schedule: { type: 'daily' },
      completions: completedOn('2026-07-26', '2026-07-25', '2026-07-24')
    })
    expect(currentStreak(h, MON).streak).toBe(3)
  })

  it('is zero for a habit with no history', () => {
    expect(currentStreak(habit({ schedule: { type: 'daily' } }), MON).streak).toBe(0)
  })
})

describe('currentStreak — weekday schedules', () => {
  it('a Mon/Wed/Fri habit survives Tuesday', () => {
    // Fri 24th, Wed 22nd, Mon 20th — all its scheduled days. The untouched
    // Tue/Thu/weekend in between are not misses.
    const h = habit({
      schedule: { type: 'weekdays', days: [1, 3, 5] },
      completions: completedOn('2026-07-24', '2026-07-22', '2026-07-20')
    })
    expect(currentStreak(h, MON).streak).toBe(3)
  })

  it('still breaks when a scheduled day is genuinely missed', () => {
    // Misses Fri 24, Wed 22, Mon 20 → three misses in July exceeds the freeze
    // allowance, so the streak stops.
    const h = habit({
      schedule: { type: 'weekdays', days: [1, 3, 5] },
      completions: completedOn('2026-07-17', '2026-07-15')
    })
    expect(currentStreak(h, MON).streak).toBe(0)
  })
})

describe('currentStreak — freezes', () => {
  it('a single missed day is absorbed and the streak continues', () => {
    // 26th missed; 25th, 24th, 23rd done.
    const h = habit({
      schedule: { type: 'daily' },
      completions: completedOn('2026-07-27', '2026-07-25', '2026-07-24', '2026-07-23')
    })
    const { streak, frozenDays } = currentStreak(h, MON)
    expect(streak).toBe(4)
    expect(frozenDays).toEqual(['2026-07-26'])
  })

  it('stops forgiving once the monthly allowance runs out', () => {
    // Three misses in the same month: 26th, 24th, 22nd.
    const h = habit({
      schedule: { type: 'daily' },
      completions: completedOn('2026-07-27', '2026-07-25', '2026-07-23', '2026-07-21')
    })
    const { streak, frozenDays } = currentStreak(h, MON)
    expect(frozenDays).toHaveLength(FREEZES_PER_MONTH)
    expect(streak).toBe(3) // 27th, 25th, 23rd — the run ends at the third miss
  })

  it('an explicit skip costs nothing and consumes no freeze', () => {
    const h = habit({
      schedule: { type: 'daily' },
      completions: completedOn('2026-07-27', '2026-07-25', '2026-07-24'),
      skips: { '2026-07-26': true }
    })
    const { streak, frozenDays } = currentStreak(h, MON)
    expect(streak).toBe(3)
    expect(frozenDays).toEqual([])
  })
})

describe('currentStreak — N times a week', () => {
  it('counts weeks that hit the target, not days', () => {
    const h = habit({
      schedule: { type: 'weekly', timesPerWeek: 3 },
      completions: completedOn(
        // current week (Mon 27th) — only one so far, still in progress
        '2026-07-27',
        // previous week: Mon 20, Wed 22, Fri 24
        '2026-07-20',
        '2026-07-22',
        '2026-07-24',
        // week before: Tue 14, Thu 16, Sat 18
        '2026-07-14',
        '2026-07-16',
        '2026-07-18'
      )
    })
    // An unfinished current week must not be counted as a failure.
    expect(currentStreak(h, MON).streak).toBe(2)
  })

  it('counts the current week once its target is met', () => {
    const h = habit({
      schedule: { type: 'weekly', timesPerWeek: 2 },
      completions: completedOn('2026-07-27', '2026-07-28', '2026-07-21', '2026-07-23')
    })
    expect(currentStreak(h, '2026-07-28').streak).toBe(2)
  })

  it('breaks on a completed week that fell short', () => {
    const h = habit({
      schedule: { type: 'weekly', timesPerWeek: 3 },
      completions: completedOn('2026-07-20', '2026-07-22') // only 2 last week
    })
    expect(currentStreak(h, MON).streak).toBe(0)
  })
})

describe('completionRate', () => {
  it('divides by scheduled days only, so a 3-day habit can reach 100%', () => {
    // The desktop app divided every category by habit #0's history, which made
    // the analytics bars meaningless.
    const h = habit({
      schedule: { type: 'weekdays', days: [1, 3, 5] },
      completions: completedOn('2026-07-20', '2026-07-22', '2026-07-24')
    })
    expect(completionRate(h, '2026-07-20', '2026-07-26')).toBe(100)
  })

  it('reports partial completion honestly', () => {
    const h = habit({
      schedule: { type: 'daily' },
      completions: completedOn('2026-07-20', '2026-07-21')
    })
    expect(completionRate(h, '2026-07-20', '2026-07-23')).toBe(50)
  })

  it('is zero rather than NaN when nothing was scheduled', () => {
    const h = habit({ schedule: { type: 'weekdays', days: [0] } })
    expect(completionRate(h, '2026-07-27', '2026-07-28')).toBe(0)
  })
})

describe('dueToday', () => {
  it('hides habits not scheduled for today, and archived ones', () => {
    const habits = [
      habit({ id: 1, schedule: { type: 'daily' } }),
      habit({ id: 2, schedule: { type: 'weekdays', days: [2] } }), // Tuesday only
      habit({ id: 3, schedule: { type: 'daily' }, archived: true })
    ]
    expect(dueToday(habits, MON).map((h) => h.id)).toEqual([1])
  })

  it('retires a weekly habit once its target is met', () => {
    const h = habit({
      id: 9,
      schedule: { type: 'weekly', timesPerWeek: 2 },
      completions: completedOn('2026-07-28', '2026-07-29')
    })
    // Target already hit earlier in the week, and not done today
    expect(dueToday([h], '2026-07-30')).toEqual([])
    // But on a day it was completed, it still shows so it can be unchecked
    expect(dueToday([h], '2026-07-29')).toHaveLength(1)
  })
})

describe('describeSchedule', () => {
  it('names the groupings people actually think in', () => {
    expect(describeSchedule({ type: 'daily' })).toBe('Every day')
    expect(describeSchedule({ type: 'weekdays', days: [1, 2, 3, 4, 5] })).toBe('Weekdays')
    expect(describeSchedule({ type: 'weekdays', days: [0, 6] })).toBe('Weekends')
    expect(describeSchedule({ type: 'weekdays', days: [1, 3, 5] })).toBe('Mon, Wed, Fri')
    expect(describeSchedule({ type: 'weekly', timesPerWeek: 3 })).toBe('3× a week')
    expect(describeSchedule({ type: 'weekly', timesPerWeek: 1 })).toBe('Once a week')
  })

  it('lists days Monday-first, matching the rest of the UI', () => {
    expect(describeSchedule({ type: 'weekdays', days: [0, 1] })).toBe('Mon, Sun')
  })
})

// Skipping a day must not make the habit unreachable. `dueToday` hides it on
// purpose — the decision is already made — but the Calendar's day sheet needs
// it present so the skip can be taken back.
describe('scheduledOn', () => {
  const THU = '2026-07-30'
  const skipped = habit({
    schedule: { type: 'daily' },
    skips: { [THU]: true }
  })

  it('keeps a skipped habit visible, where dueToday drops it', () => {
    expect(scheduledOn([skipped], THU)).toHaveLength(1)
    expect(dueToday([skipped], THU)).toHaveLength(0)
  })

  it('still drops archived habits', () => {
    expect(scheduledOn([habit({ schedule: { type: 'daily' }, archived: true })], THU)).toHaveLength(
      0
    )
  })

  it('still respects the schedule', () => {
    const mwf = habit({ schedule: { type: 'weekdays', days: [1, 3, 5] } })
    expect(scheduledOn([mwf], THU)).toHaveLength(0)
  })
})
