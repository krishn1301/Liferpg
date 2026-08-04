// @vitest-environment jsdom
import { describe, it, expect } from 'vitest'
import { stripDays, vowStripDays } from './catalog'

// The code strip is the app's main visual claim about a habit's recent past.
// Getting its three states wrong is not a cosmetic bug: a hollow block reads
// as "you missed that", and saying so about a day nobody was asked to show up
// is the exact failure the desktop app was rebuilt to fix.

const TODAY = '2026-07-30' // a Thursday

describe('stripDays', () => {
  it('marks completed days done and scheduled-but-empty days missed', () => {
    const habit = {
      schedule: { type: 'daily' },
      completions: { '2026-07-30': true, '2026-07-28': true }
    }

    const strip = stripDays(habit, TODAY)

    expect(strip).toHaveLength(7)
    expect(strip.at(-1)).toEqual({ key: '2026-07-30', state: 'done' })
    expect(strip.at(-3)).toEqual({ key: '2026-07-28', state: 'done' })
    expect(strip.at(-2)).toEqual({ key: '2026-07-29', state: 'missed' })
  })

  it('does not count days before the habit existed', () => {
    const habit = { schedule: { type: 'daily' }, createdKey: '2026-07-28', completions: {} }

    const strip = stripDays(habit, TODAY)

    expect(strip.slice(0, 4).map((d) => d.state)).toEqual(['off', 'off', 'off', 'off'])
    expect(strip.slice(4).map((d) => d.state)).toEqual(['missed', 'missed', 'missed'])
  })

  it('leaves a weekday habit alone on days it was never scheduled', () => {
    // Mon/Wed/Fri. The window 2026-07-24 (Fri) … 2026-07-30 (Thu).
    const habit = { schedule: { type: 'weekdays', days: [1, 3, 5] }, completions: {} }

    expect(stripDays(habit, TODAY).map((d) => d.state)).toEqual([
      'missed', // Fri 24
      'off', // Sat 25
      'off', // Sun 26
      'missed', // Mon 27
      'off', // Tue 28
      'missed', // Wed 29
      'off' // Thu 30
    ])
  })

  it('never shows a miss for an "n times a week" habit', () => {
    // `isDueOn` says yes every day for a weekly habit — you *may* do it any
    // day — so a naive strip paints four misses a week for someone hitting
    // their target exactly. The day is simply not one they owed.
    const habit = {
      schedule: { type: 'weekly', timesPerWeek: 3 },
      completions: { '2026-07-30': true, '2026-07-27': true }
    }

    const states = stripDays(habit, TODAY).map((d) => d.state)

    expect(states).not.toContain('missed')
    expect(states.filter((s) => s === 'done')).toHaveLength(2)
  })
})

describe('vowStripDays', () => {
  const vow = (over = {}) => ({ kind: 'quit', createdKey: '2026-07-01', relapses: {}, ...over })

  it('is an unbroken run when the vow has been kept', () => {
    // Nothing to confirm and nothing to miss: every day you did not slip is a
    // day you held it. A hollow block here would be an accusation.
    const strip = vowStripDays(vow(), TODAY)
    expect(strip.map((d) => d.state)).toEqual(Array(7).fill('done'))
    expect(strip.some((d) => d.color)).toBe(false)
  })

  it('presses the relapse day in danger, not as a gap', () => {
    const strip = vowStripDays(vow({ relapses: { '2026-07-28': true } }), TODAY)
    const slip = strip.find((d) => d.key === '2026-07-28')

    expect(slip).toEqual({ key: '2026-07-28', state: 'done', color: 'var(--danger)' })
    // The run either side is unbroken — the strip shows where it broke, not a
    // hole where the day used to be.
    expect(strip.filter((d) => d.state === 'done')).toHaveLength(7)
  })

  it('leaves the days before the vow existed alone', () => {
    const strip = vowStripDays(vow({ createdKey: '2026-07-28' }), TODAY)
    expect(strip.map((d) => d.state)).toEqual([
      'off', // Fri 24
      'off', // Sat 25
      'off', // Sun 26
      'off', // Mon 27
      'done', // Tue 28 — clean since
      'done', // Wed 29
      'done' // Thu 30
    ])
  })
})
