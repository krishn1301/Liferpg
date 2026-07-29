import { describe, it, expect } from 'vitest'
import { earnedBadges } from './xp'

// 2026-06-01 is a Monday, 2026-06-02 a Tuesday.
const MON = '2026-06-01'
const TUE = '2026-06-02'

const habit = (over = {}) => ({
  id: 'h1',
  name: 'Run',
  category: 'fitness',
  schedule: { type: 'daily' },
  completions: {},
  skips: {},
  xpBonus: 1,
  ...over
})

/** Consecutive true completions ending on `lastKey`. */
const run = (lastKey, days) => {
  const out = {}
  const d = new Date(lastKey + 'T00:00:00')
  for (let i = 0; i < days; i++) {
    const k = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
    out[k] = true
    d.setDate(d.getDate() - 1)
  }
  return out
}

const badge = (habits, todayKey, id) => earnedBadges(habits, todayKey).find((b) => b.id === id)

describe('Perfect Day counts only what was scheduled', () => {
  it('is earned on a day when the habit that is not due goes untouched', () => {
    // The regression. A Mon/Wed/Fri habit is not asked for on Tuesday, so it
    // must not sit in the denominator making the day unwinnable.
    const habits = [
      habit({ id: 'daily', completions: { [TUE]: true } }),
      habit({ id: 'mwf', schedule: { type: 'weekdays', days: [1, 3, 5] } })
    ]
    expect(badge(habits, TUE, 'perfect-day').earned).toBe(true)
  })

  it('is not earned when something actually due is left undone', () => {
    const habits = [
      habit({ id: 'a', completions: { [TUE]: true } }),
      habit({ id: 'b' })
    ]
    expect(badge(habits, TUE, 'perfect-day').earned).toBe(false)
  })

  it('is not earned on a day with nothing scheduled at all', () => {
    // Zero of zero is not a perfect day, it is an empty one.
    const habits = [habit({ schedule: { type: 'weekdays', days: [3] } })]
    expect(badge(habits, TUE, 'perfect-day').earned).toBe(false)
  })

  it('ignores a skipped habit, which is not owed either', () => {
    const habits = [
      habit({ id: 'a', completions: { [TUE]: true } }),
      habit({ id: 'b', skips: { [TUE]: true } })
    ]
    expect(badge(habits, TUE, 'perfect-day').earned).toBe(true)
  })
})

describe('streak badges unlock on best-ever, not the current run', () => {
  it('keeps the badge after a streak lapses', () => {
    // Seven days ending three weeks ago: current streak is 0, best is 7.
    const habits = [habit({ completions: run('2026-05-11', 7) })]
    expect(badge(habits, MON, 'week-warrior').earned).toBe(true)
  })

  it('keeps the 30-day badge after a lapse', () => {
    const habits = [habit({ completions: run('2026-05-11', 30) })]
    expect(badge(habits, MON, 'diamond').earned).toBe(true)
  })

  it('still does not unlock a streak that was never reached', () => {
    const habits = [habit({ completions: run(MON, 6) })]
    expect(badge(habits, MON, 'week-warrior').earned).toBe(false)
  })

  it('takes the best across habits, not the sum', () => {
    const habits = [
      habit({ id: 'a', completions: run(MON, 4) }),
      habit({ id: 'b', completions: run(MON, 8) })
    ]
    expect(badge(habits, MON, 'week-warrior').earned).toBe(true)
    expect(badge(habits, MON, 'diamond').earned).toBe(false)
  })
})

describe('archived habits stay out of every badge', () => {
  it('does not count an archived habit toward Habit Master', () => {
    const habits = [
      ...Array.from({ length: 4 }, (_, i) => habit({ id: `a${i}` })),
      habit({ id: 'gone', archived: true })
    ]
    // Five entries, but only four are live.
    expect(badge(habits, MON, 'master').earned).toBe(false)
    expect(badge([...habits, habit({ id: 'a5' })], MON, 'master').earned).toBe(true)
  })

  it('does not count an archived habit toward XP or completions', () => {
    const habits = [habit({ id: 'gone', archived: true, completions: run(MON, 20) })]
    expect(badge(habits, MON, 'centurion').earned).toBe(false)
  })

  it('does not let an archived habit block a Perfect Day', () => {
    const habits = [
      habit({ id: 'live', completions: { [TUE]: true } }),
      habit({ id: 'gone', archived: true })
    ]
    expect(badge(habits, TUE, 'perfect-day').earned).toBe(true)
  })

  it('does not award a streak badge for an archived habit', () => {
    const habits = [habit({ id: 'gone', archived: true, completions: run(MON, 40) })]
    expect(badge(habits, MON, 'diamond').earned).toBe(false)
  })
})

describe('threshold badges', () => {
  it('unlocks XP Centurion at exactly 100 XP', () => {
    expect(badge([habit({ completions: run(MON, 9) })], MON, 'centurion').earned).toBe(false)
    expect(badge([habit({ completions: run(MON, 10) })], MON, 'centurion').earned).toBe(true)
  })

  it('unlocks Century at exactly 100 completions', () => {
    expect(badge([habit({ completions: run(MON, 99) })], MON, 'century').earned).toBe(false)
    expect(badge([habit({ completions: run(MON, 100) })], MON, 'century').earned).toBe(true)
  })

  it('returns every badge unearned for an empty document, without crashing', () => {
    const badges = earnedBadges([], MON)
    expect(badges).toHaveLength(6)
    expect(badges.every((b) => b.earned === false)).toBe(true)
  })
})
