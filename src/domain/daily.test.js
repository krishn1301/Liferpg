import { describe, it, expect } from 'vitest'
import { logFor, hasLog, logTrend, logAverages, moodByCompletion } from './daily'

const MON = '2026-06-01'
const TUE = '2026-06-02'
const WED = '2026-06-03'

const habit = (over = {}) => ({
  id: 'h1',
  name: 'Run',
  kind: 'build',
  category: 'fitness',
  schedule: { type: 'daily' },
  completions: {},
  skips: {},
  archived: false,
  createdKey: null,
  ...over
})

describe('logFor', () => {
  it('fills in every field for a day nobody touched', () => {
    expect(logFor({}, MON)).toEqual({ mood: null, energy: null, water: 0, note: '' })
    expect(logFor(undefined, MON)).toEqual({ mood: null, energy: null, water: 0, note: '' })
  })

  it('leaves the medicine bag it shares the day with alone', () => {
    const logs = { [MON]: { meds: { 'm1@08:00': true }, mood: 4 } }
    expect(logFor(logs, MON).mood).toBe(4)
  })

  it('clamps a scale value into 1..5 and rejects nonsense', () => {
    expect(logFor({ [MON]: { mood: 9 } }, MON).mood).toBe(5)
    expect(logFor({ [MON]: { mood: 0 } }, MON).mood).toBeNull()
    expect(logFor({ [MON]: { mood: 'good' } }, MON).mood).toBeNull()
    expect(logFor({ [MON]: { mood: 3.4 } }, MON).mood).toBe(3)
  })

  it('never returns negative water', () => {
    expect(logFor({ [MON]: { water: -3 } }, MON).water).toBe(0)
  })
})

describe('hasLog', () => {
  it('is false for an empty day and for whitespace', () => {
    expect(hasLog({}, MON)).toBe(false)
    expect(hasLog({ [MON]: { note: '   ' } }, MON)).toBe(false)
    // Doses are not the daily log — a day with only medicines has nothing here.
    expect(hasLog({ [MON]: { meds: { a: true } } }, MON)).toBe(false)
  })

  it('is true as soon as anything is recorded', () => {
    expect(hasLog({ [MON]: { mood: 1 } }, MON)).toBe(true)
    expect(hasLog({ [MON]: { water: 1 } }, MON)).toBe(true)
    expect(hasLog({ [MON]: { note: 'rough day' } }, MON)).toBe(true)
  })
})

describe('logTrend', () => {
  it('covers every day in the range, logged or not', () => {
    const trend = logTrend({ [TUE]: { mood: 5 } }, MON, WED)
    expect(trend.map((d) => d.dateKey)).toEqual([MON, TUE, WED])
    expect(trend.map((d) => d.mood)).toEqual([null, 5, null])
  })
})

describe('logAverages', () => {
  it('averages mood over the days it was recorded, not the whole range', () => {
    // A fortnight of not bothering must not read as the worst fortnight ever.
    const logs = { [MON]: { mood: 4 }, [WED]: { mood: 2 } }
    const avg = logAverages(logs, MON, WED)

    expect(avg.mood).toBe(3)
    expect(avg.logged).toBe(2)
    expect(avg.days).toBe(3)
  })

  it('averages water over every day, because a day with none really is zero', () => {
    const logs = { [MON]: { water: 6 }, [WED]: { water: 3 } }
    // 6 + 0 + 3 over three days.
    expect(logAverages(logs, MON, WED).water).toBe(3)
  })

  it('is null rather than zero when nothing was ever logged', () => {
    const avg = logAverages({}, MON, WED)
    expect(avg.mood).toBeNull()
    expect(avg.energy).toBeNull()
    expect(avg.water).toBe(0)
  })
})

describe('moodByCompletion', () => {
  it('splits mood by whether the day was finished', () => {
    const habits = [habit({ completions: { [MON]: true, [WED]: true } })]
    const logs = { [MON]: { mood: 5 }, [TUE]: { mood: 2 }, [WED]: { mood: 4 } }

    expect(moodByCompletion(habits, logs, MON, WED)).toEqual({
      perfect: 4.5,
      perfectDays: 2,
      other: 2,
      otherDays: 1
    })
  })

  it('ignores days with nothing scheduled', () => {
    // Mon/Wed/Fri: Tuesday asked nothing of anyone, so it is neither a win nor
    // a loss and belongs in neither bucket.
    const habits = [
      habit({ schedule: { type: 'weekdays', days: [1, 3, 5] }, completions: { [MON]: true } })
    ]
    const logs = { [MON]: { mood: 5 }, [TUE]: { mood: 1 }, [WED]: { mood: 3 } }
    const split = moodByCompletion(habits, logs, MON, WED)

    expect(split).toEqual({ perfect: 5, perfectDays: 1, other: 3, otherDays: 1 })
  })

  it('ignores days with no mood recorded', () => {
    const habits = [habit({ completions: { [MON]: true } })]
    const split = moodByCompletion(habits, { [MON]: { mood: 4 } }, MON, WED)

    expect(split.perfect).toBe(4)
    // Tuesday and Wednesday were missed but unlogged — nothing to average.
    expect(split.other).toBeNull()
    expect(split.otherDays).toBe(0)
  })

  it('is null on both sides when there is no data at all', () => {
    expect(moodByCompletion([], {}, MON, WED)).toEqual({
      perfect: null,
      perfectDays: 0,
      other: null,
      otherDays: 0
    })
  })
})
