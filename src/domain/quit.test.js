import { describe, it, expect } from 'vitest'
import {
  isVow,
  cleanStreak,
  bestCleanStreak,
  cleanDaysTotal,
  relapseCount,
  lastRelapse
} from './quit'
import { isDueOn } from './schedule'
import { currentStreak, bestStreak, dueToday } from './streaks'
import { totalXp, earnedBadges } from './xp'
import { overview, habitBreakdown, categoryStats, vowBreakdown } from './stats'

const vow = (over = {}) => ({
  id: 'v1',
  name: 'No fap',
  kind: 'quit',
  category: 'personal',
  createdKey: '2026-07-01',
  relapses: {},
  completions: {},
  ...over
})

const TODAY = '2026-07-31'

describe('cleanStreak', () => {
  it('counts days since the clean-since date when never broken', () => {
    // 1 July is the start; by the 31st you have got through 30 whole days.
    expect(cleanStreak(vow(), TODAY)).toBe(30)
  })

  it('is zero on the day you start, not one', () => {
    expect(cleanStreak(vow({ createdKey: TODAY }), TODAY)).toBe(0)
  })

  it('restarts from the day after the last relapse', () => {
    // Clean from the 26th; the 26th–30th are whole days, the 31st is still being
    // lived. Same rule as above, applied to a later start.
    expect(cleanStreak(vow({ relapses: { '2026-07-25': true } }), TODAY)).toBe(5)
  })

  it('is zero on the day of a relapse', () => {
    // Otherwise someone could slip every single day and still read "1 day clean".
    expect(cleanStreak(vow({ relapses: { [TODAY]: true } }), TODAY)).toBe(0)
  })

  it('only counts the most recent relapse', () => {
    const habit = vow({ relapses: { '2026-07-05': true, '2026-07-28': true } })
    expect(cleanStreak(habit, TODAY)).toBe(2)
  })

  it('ignores relapses recorded after the day being asked about', () => {
    const habit = vow({ relapses: { '2026-07-28': true } })
    expect(cleanStreak(habit, '2026-07-20')).toBe(19)
  })
})

describe('bestCleanStreak', () => {
  it('remembers a longer run that has since been broken', () => {
    const habit = vow({ relapses: { '2026-07-21': true } })
    expect(cleanStreak(habit, TODAY)).toBe(9)
    expect(bestCleanStreak(habit, TODAY)).toBe(20)
  })

  it('uses the current run when it is the longest', () => {
    const habit = vow({ relapses: { '2026-07-03': true } })
    // Two days before the slip, twenty-seven whole days since.
    expect(bestCleanStreak(habit, TODAY)).toBe(27)
  })

  it('handles back-to-back relapses without going negative', () => {
    // The run between the two slips is zero days long, not minus one.
    const habit = vow({ relapses: { '2026-07-10': true, '2026-07-11': true } })
    expect(bestCleanStreak(habit, TODAY)).toBe(19)
  })
})

describe('cleanDaysTotal', () => {
  it('banks every clean day, not just the current run', () => {
    // 30 days elapsed, one of them a relapse.
    const habit = vow({ relapses: { '2026-07-21': true } })
    expect(cleanDaysTotal(habit, TODAY)).toBe(29)
  })

  it('never goes below zero when every day was a relapse', () => {
    const relapses = {}
    for (let d = 1; d <= 31; d++) relapses[`2026-07-${String(d).padStart(2, '0')}`] = true
    expect(cleanDaysTotal(vow({ relapses }), TODAY)).toBe(0)
  })
})

describe('relapse bookkeeping', () => {
  it('counts and finds the latest slip', () => {
    const habit = vow({ relapses: { '2026-07-05': true, '2026-07-28': true } })
    expect(relapseCount(habit)).toBe(2)
    expect(lastRelapse(habit, TODAY)).toBe('2026-07-28')
    expect(lastRelapse(vow(), TODAY)).toBeNull()
  })
})

// The rest of the app was built assuming every habit has completions. These
// pin the boundary that keeps a vow out of every denominator.
describe('vows stay out of the completion machinery', () => {
  it('is never due', () => {
    expect(isVow(vow())).toBe(true)
    expect(isDueOn(vow(), TODAY)).toBe(false)
    expect(dueToday([vow()], TODAY)).toEqual([])
  })

  it('reports its clean run through the ordinary streak functions', () => {
    const habit = vow({ relapses: { '2026-07-21': true } })
    expect(currentStreak(habit, TODAY).streak).toBe(9)
    expect(bestStreak(habit, TODAY)).toBe(20)
  })

  it('does not drag completion rates down', () => {
    const build = {
      id: 'h1',
      name: 'Tuition',
      kind: 'build',
      category: 'education',
      createdKey: '2026-07-29',
      schedule: { type: 'daily' },
      completions: { '2026-07-29': true, '2026-07-30': true, '2026-07-31': true }
    }

    const alone = overview([build], TODAY, '2026-07-29')
    const withVow = overview([build, vow()], TODAY, '2026-07-29')

    expect(alone.rate).toBe(100)
    expect(withVow.rate).toBe(100)

    // And it does not appear as a permanent 0% row at the top of the list.
    expect(habitBreakdown([build, vow()], '2026-07-29', TODAY, TODAY).map((r) => r.name)).toEqual([
      'Tuition'
    ])
    expect(categoryStats([build, vow()], '2026-07-29', TODAY).map((c) => c.key)).toEqual([
      'education'
    ])
  })

  it('cannot make a perfect day unwinnable', () => {
    const build = {
      id: 'h1',
      name: 'Tuition',
      kind: 'build',
      schedule: { type: 'daily' },
      completions: { [TODAY]: true }
    }
    const badges = earnedBadges([build, vow()], TODAY)
    expect(badges.find((b) => b.id === 'perfect-day').earned).toBe(true)
  })

  it('gets its own breakdown, longest run first', () => {
    const rows = vowBreakdown(
      [vow(), vow({ id: 'v2', name: 'No smoking', relapses: { '2026-07-29': true } })],
      TODAY
    )
    expect(rows.map((r) => [r.name, r.streak])).toEqual([
      ['No fap', 30],
      ['No smoking', 1]
    ])
    expect(rows[1].relapses).toBe(1)
    expect(rows[1].lastRelapse).toBe('2026-07-29')
  })
})

describe('XP from clean days', () => {
  it('pays the same rate a completion pays', () => {
    expect(totalXp([vow()], TODAY)).toBe(300) // 30 clean days × 10
  })

  it('survives a relapse — the streak resets, the XP does not', () => {
    const before = vow({ relapses: {} })
    const after = vow({ relapses: { [TODAY]: true } })

    expect(cleanStreak(after, TODAY)).toBe(0)
    // The relapse is today, which was never banked either way, so the XP earned
    // over the previous thirty days is untouched.
    expect(totalXp([after], TODAY)).toBe(totalXp([before], TODAY))
  })

  it('does not pay for a relapsed day', () => {
    const habit = vow({ relapses: { '2026-07-15': true } })
    expect(totalXp([habit], TODAY)).toBe(290)
  })
})
