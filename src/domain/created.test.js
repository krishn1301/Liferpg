import { describe, it, expect } from 'vitest'
import { existedOn, isDueOn } from './schedule'
import { completionRate, currentStreak } from './streaks'
import { categoryStats, dailyTrend } from './stats'
import { reducer, emptyDoc } from '../state/reducer'

// Adding a habit must not retroactively invent a month of failure. This file
// pins the boundary: days before `createdKey` are not due, not counted, and not
// drawn as missed.

const MON = '2026-06-01'
const WED = '2026-06-03'
const SUN = '2026-06-07'

const habit = (over = {}) => ({
  id: 'h1',
  name: 'Run',
  category: 'fitness',
  schedule: { type: 'daily' },
  completions: {},
  skips: {},
  ...over
})

describe('existedOn', () => {
  it('is false before the habit was created', () => {
    expect(existedOn(habit({ createdKey: WED }), MON)).toBe(false)
  })

  it('is true on the creation day itself', () => {
    expect(existedOn(habit({ createdKey: WED }), WED)).toBe(true)
  })

  it('treats a habit with no creation date as always having existed', () => {
    expect(existedOn(habit(), MON)).toBe(true)
    expect(existedOn(habit({ createdKey: null }), MON)).toBe(true)
  })
})

describe('isDueOn respects the creation date', () => {
  it('is not due before it existed, even on a scheduled weekday', () => {
    const h = habit({ createdKey: WED, schedule: { type: 'weekdays', days: [1] } })
    expect(isDueOn(h, MON)).toBe(false) // Monday, but the habit did not exist
    expect(isDueOn(h, '2026-06-08')).toBe(true) // the next Monday
  })
})

describe('rates ignore days before creation', () => {
  it('does not count a fresh habit against the whole window', () => {
    // Created Sunday, done Sunday. One due day, not seven.
    const h = habit({ createdKey: SUN, completions: { [SUN]: true } })
    expect(completionRate(h, MON, SUN)).toBe(100)
  })

  it('would have reported 14% without the fix', () => {
    // Same habit, but pretending it always existed: 1 done out of 7 due.
    const old = habit({ completions: { [SUN]: true } })
    expect(completionRate(old, MON, SUN)).toBe(14)
  })

  it('keeps pre-creation days out of the category denominator', () => {
    const habits = [habit({ createdKey: SUN, completions: { [SUN]: true } })]
    const [fitness] = categoryStats(habits, MON, SUN)
    expect(fitness).toMatchObject({ due: 1, done: 1, pct: 100 })
  })

  it('marks pre-creation days as having nothing due in the trend', () => {
    const habits = [habit({ createdKey: SUN })]
    const trend = dailyTrend(habits, MON, SUN)
    // The calendar keys off `due` to decide whether a day is even drawn.
    expect(trend.slice(0, 6).every((d) => d.due === 0)).toBe(true)
    expect(trend[6]).toMatchObject({ dateKey: SUN, due: 1, done: 0 })
  })

  it('does not walk a streak back past creation', () => {
    const h = habit({ createdKey: SUN, completions: { [SUN]: true } })
    expect(currentStreak(h, SUN).streak).toBe(1)
  })
})

describe('reducer stamps the creation date', () => {
  it('records the day a habit was added', () => {
    const doc = reducer(emptyDoc(), {
      type: 'habit/add',
      habit: { name: 'Run', category: 'fitness' },
      todayKey: WED
    })
    expect(doc.habits[0].createdKey).toBe(WED)
  })

  it('stamps every habit added from a template', () => {
    const doc = reducer(emptyDoc(), {
      type: 'habits/addMany',
      habits: [{ name: 'A' }, { name: 'B' }],
      todayKey: WED
    })
    expect(doc.habits.map((h) => h.createdKey)).toEqual([WED, WED])
  })

  it('leaves an imported habit unbounded rather than inventing a start date', () => {
    // A document from before the field existed. Guessing here would silently
    // rewrite the user's history, so it stays null.
    const doc = reducer(emptyDoc(), {
      type: 'doc/replace',
      doc: { habits: [{ id: 'old', name: 'Read', completions: { [MON]: true } }] }
    })
    expect(doc.habits[0].createdKey).toBeNull()
    expect(isDueOn(doc.habits[0], MON)).toBe(true)
  })
})
