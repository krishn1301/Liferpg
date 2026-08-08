import { describe, it, expect } from 'vitest'
import {
  levelFromXp,
  totalXp,
  earnedBadges,
  xpSummary,
  highestTitle,
  TITLE_RANK,
  BADGES,
  XP_PER_COMPLETION
} from './xp'

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

describe('xpSummary', () => {
  const habits = [{ completions: { '2026-07-27': true, '2026-07-26': true } }]

  it('carries the lifetime total and the within-level pair together', () => {
    // The two used to be computed at four separate call sites with four
    // different sentences, so a lifetime figure and a within-level one sat next
    // to each other unlabelled and read as a bug.
    expect(xpSummary(habits, MON)).toEqual({
      total: 20,
      level: 1,
      current: 20,
      needed: 100,
      remaining: 80
    })
  })

  it('agrees with totalXp and levelFromXp, since it is only their composition', () => {
    const s = xpSummary(habits, MON)
    expect(s.total).toBe(totalXp(habits, MON))
    expect(s.level).toBe(levelFromXp(s.total).level)
    expect(s.current + s.remaining).toBe(s.needed)
  })

  it('measures a vow against the day it is asked about', () => {
    // The bug this replaced: two screens called totalXp without a todayKey, so
    // cleanDaysTotal measured a vow against an undefined date and those screens
    // showed a different level from Today's.
    const vow = { kind: 'quit', createdKey: '2026-07-01', relapses: {}, completions: {} }
    expect(xpSummary([vow], MON).total).toBeGreaterThan(0)
    expect(xpSummary([vow], MON).total).not.toBe(xpSummary([vow], '2026-07-05').total)
  })
})

describe('highestTitle', () => {
  const done = (n, from = 1) =>
    Object.fromEntries(
      Array.from({ length: n }, (_, i) => [`2026-07-${String(from + i).padStart(2, '0')}`, true])
    )

  it('is honest when nothing is earned', () => {
    expect(highestTitle([], MON)).toBe('Unranked')
  })

  it('ranks by what a badge costs, not by where it sits in BADGES', () => {
    // Five habits (Habit Master) is the cheapest title and is declared fifth;
    // a 7-day streak (Week Warrior) is dearer and is declared first. Reading
    // "the last earned entry in BADGES" would get this backwards.
    const five = Array.from({ length: 5 }, () => ({ completions: done(1) }))
    expect(highestTitle(five, MON)).toBe('Habit Master')

    const streak = [{ completions: done(7, 20) }]
    expect(highestTitle(streak, MON)).toBe('Week Warrior')
  })

  it('gives every rank a distinct label, weakest to strongest', () => {
    const labels = TITLE_RANK.map((id) => BADGES.find((b) => b.id === id).label)
    expect(new Set(labels).size).toBe(TITLE_RANK.length)
    expect(TITLE_RANK).toHaveLength(BADGES.length)
  })

  it('reports the strongest held, not the most recent', () => {
    // A 30-day streak also satisfies week-warrior, centurion and century.
    const long = [{ completions: done(30, 1) }]
    expect(highestTitle(long, '2026-07-31')).toBe('Diamond Habit')
  })
})
