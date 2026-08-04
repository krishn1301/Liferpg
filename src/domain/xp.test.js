import { describe, it, expect } from 'vitest'
import { levelFromXp, totalXp, earnedBadges, XP_PER_COMPLETION } from './xp'

const MON = '2026-07-27'

describe('levelFromXp', () => {
  it('starts everyone at level 1', () => {
    expect(levelFromXp(0)).toEqual({ level: 1, current: 0, needed: 100 })
  })

  it('levels up on the n × 100 curve', () => {
    expect(levelFromXp(99).level).toBe(1)
    expect(levelFromXp(100)).toEqual({ level: 2, current: 0, needed: 200 })
    expect(levelFromXp(299)).toEqual({ level: 2, current: 199, needed: 200 })
    expect(levelFromXp(300)).toEqual({ level: 3, current: 0, needed: 300 })
  })

  it('does not go backwards on negative input', () => {
    expect(levelFromXp(-50).level).toBe(1)
  })
})

describe('totalXp', () => {
  it('is derived from completions, so unchecking a habit takes the XP back', () => {
    // The desktop app incremented a stored counter on each tap, so XP survived
    // an undo and an Excel import had to guess the total.
    const habits = [{ completions: { '2026-07-27': true, '2026-07-26': true } }]
    expect(totalXp(habits)).toBe(2 * XP_PER_COMPLETION)

    const undone = [{ completions: { '2026-07-27': false, '2026-07-26': true } }]
    expect(totalXp(undone)).toBe(XP_PER_COMPLETION)
  })

  it('applies the per-habit bonus multiplier', () => {
    expect(totalXp([{ completions: { a: true }, xpBonus: 3 }])).toBe(30)
  })

  it('is zero with no habits', () => {
    expect(totalXp([])).toBe(0)
  })
})

describe('earnedBadges', () => {
  it('awards a perfect day only when every habit is done', () => {
    const partial = [
      { completions: { [MON]: true }, schedule: { type: 'daily' } },
      { completions: {}, schedule: { type: 'daily' } }
    ]
    const badge = (habits) => earnedBadges(habits, MON).find((b) => b.id === 'perfect-day').earned

    expect(badge(partial)).toBe(false)
    expect(badge([partial[0]])).toBe(true)
  })

  it('does not award a perfect day when there are no habits at all', () => {
    expect(earnedBadges([], MON).find((b) => b.id === 'perfect-day').earned).toBe(false)
  })

  it('unlocks the streak badges from the longest current streak', () => {
    const week = {
      schedule: { type: 'daily' },
      completions: Object.fromEntries(
        ['27', '26', '25', '24', '23', '22', '21'].map((d) => [`2026-07-${d}`, true])
      )
    }
    const badges = earnedBadges([week], MON)
    expect(badges.find((b) => b.id === 'week-warrior').earned).toBe(true)
    expect(badges.find((b) => b.id === 'diamond').earned).toBe(false)
  })
})
