import { describe, it, expect } from 'vitest'
import { categoryStats, dailyTrend, habitBreakdown, overview, activeHabits } from './stats'

// 2026-06-01 is a Monday, so this window runs Mon…Sun.
const FROM = '2026-06-01'
const TO = '2026-06-07'
const MON = '2026-06-01'
const TUE = '2026-06-02'
const WED = '2026-06-03'
const FRI = '2026-06-05'

const habit = (over) => ({
  id: over.id ?? 'h',
  name: over.name ?? 'Habit',
  icon: '⭐',
  category: 'personal',
  xpBonus: 1,
  archived: false,
  completions: {},
  skips: {},
  schedule: { type: 'daily' },
  ...over
})

describe('categoryStats', () => {
  // The defect this file exists to prevent: the desktop app divided every
  // category by habit #0's history, so a Mon/Wed/Fri habit that never missed
  // showed 43% because a *daily* habit in another category set the denominator.
  it('gives each category a denominator built from its own habits schedules', () => {
    const habits = [
      habit({
        id: 'a',
        name: 'Daily thing',
        category: 'fitness',
        schedule: { type: 'daily' },
        completions: { [MON]: true, [TUE]: true, [WED]: true }
      }),
      habit({
        id: 'b',
        name: 'MWF thing',
        category: 'education',
        schedule: { type: 'weekdays', days: [1, 3, 5] },
        completions: { [MON]: true, [WED]: true, [FRI]: true }
      })
    ]

    const stats = categoryStats(habits, FROM, TO)
    const fitness = stats.find((s) => s.key === 'fitness')
    const education = stats.find((s) => s.key === 'education')

    expect(fitness).toMatchObject({ due: 7, done: 3, pct: 43 })

    // Three scheduled days, three completions. Not 3/7.
    expect(education).toMatchObject({ due: 3, done: 3, pct: 100 })
  })

  it('sums multiple habits into one category bucket', () => {
    const habits = [
      habit({ id: 'a', category: 'health', completions: { [MON]: true } }),
      habit({ id: 'b', category: 'health', completions: { [MON]: true, [TUE]: true } })
    ]
    const [health] = categoryStats(habits, FROM, TO)
    expect(health).toMatchObject({ habits: 2, due: 14, done: 3 })
  })

  it('excludes skipped days from the denominator entirely', () => {
    const habits = [
      habit({ id: 'a', category: 'health', completions: { [MON]: true }, skips: { [TUE]: true } })
    ]
    const [health] = categoryStats(habits, FROM, TO)
    // 7 days minus the skipped Tuesday
    expect(health.due).toBe(6)
  })

  it('ignores archived habits', () => {
    const habits = [habit({ id: 'a', category: 'health', archived: true })]
    expect(categoryStats(habits, FROM, TO)).toEqual([])
    expect(activeHabits(habits)).toEqual([])
  })

  it('buckets an unknown category under personal rather than dropping it', () => {
    const habits = [habit({ id: 'a', category: 'nonsense', completions: { [MON]: true } })]
    const stats = categoryStats(habits, FROM, TO)
    expect(stats).toHaveLength(1)
    expect(stats[0].key).toBe('personal')
  })

  it('reports 0% rather than dividing by zero when nothing was due', () => {
    const habits = [habit({ id: 'a', schedule: { type: 'weekdays', days: [0] } })]
    // Sunday 2026-06-07 is in range, so force a window with no Sundays
    const stats = categoryStats(habits, FROM, '2026-06-06')
    expect(stats[0]).toMatchObject({ due: 0, pct: 0 })
  })
})

describe('dailyTrend', () => {
  it('returns one entry per day with per-day due counts', () => {
    const habits = [
      habit({ id: 'a', schedule: { type: 'daily' }, completions: { [MON]: true } }),
      habit({ id: 'b', schedule: { type: 'weekdays', days: [1] }, completions: { [MON]: true } })
    ]
    const trend = dailyTrend(habits, FROM, TO)

    expect(trend).toHaveLength(7)
    // Monday: both habits due, both done
    expect(trend[0]).toMatchObject({ dateKey: MON, due: 2, done: 2, pct: 100 })
    // Tuesday: only the daily habit is due, and it wasn't done
    expect(trend[1]).toMatchObject({ dateKey: TUE, due: 1, done: 0, pct: 0 })
  })
})

describe('habitBreakdown', () => {
  it('sorts the worst completion rate first', () => {
    const habits = [
      habit({ id: 'a', name: 'Good', completions: { [MON]: true, [TUE]: true, [WED]: true } }),
      habit({ id: 'b', name: 'Bad', completions: { [MON]: true } })
    ]
    const rows = habitBreakdown(habits, FROM, TO, TO)
    expect(rows.map((r) => r.name)).toEqual(['Bad', 'Good'])
    expect(rows[0]).toMatchObject({ due: 7, done: 1, pct: 14 })
  })
})

describe('overview', () => {
  it('derives XP and completion counts from history', () => {
    const habits = [habit({ id: 'a', completions: { [MON]: true, [TUE]: true } })]
    const stats = overview(habits, TO, FROM)
    expect(stats).toMatchObject({ tracked: 1, completions: 2, xp: 20 })
  })

  it('handles an empty habit list without NaN', () => {
    const stats = overview([], TO, FROM)
    expect(stats).toMatchObject({ tracked: 0, longestCurrent: 0, allTimeBest: 0, xp: 0, rate: 0 })
  })
})
