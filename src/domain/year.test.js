import { describe, it, expect } from 'vitest'
import { isLeapYear, daysInYear, yearProgress, yearBlocks, endOfYear } from './year'

describe('leap years', () => {
  it('follows the Gregorian rule, not just divide-by-four', () => {
    expect(isLeapYear(2024)).toBe(true)
    expect(isLeapYear(2026)).toBe(false)
    expect(isLeapYear(1900)).toBe(false) // divisible by 100
    expect(isLeapYear(2000)).toBe(true) // divisible by 400
    expect(isLeapYear(2100)).toBe(false)
  })

  it('sizes the year to match', () => {
    expect(daysInYear(2026)).toBe(365)
    expect(daysInYear(2028)).toBe(366)
  })
})

describe('yearProgress', () => {
  it('counts the first day as spent, not as zero', () => {
    // Someone opening the app on New Year's Day is living day one of 365.
    const p = yearProgress('2026-01-01')
    expect(p).toEqual({ year: 2026, total: 365, elapsed: 1, left: 364, pct: 0 })
  })

  it('reaches zero left on the last day of the year', () => {
    const p = yearProgress('2026-12-31')
    expect(p.elapsed).toBe(365)
    expect(p.left).toBe(0)
    expect(p.pct).toBe(100)
  })

  it('gives a leap year its extra day', () => {
    expect(yearProgress('2028-12-31')).toMatchObject({ total: 366, elapsed: 366, left: 0 })
    // 29 February is day 60 in a leap year and does not exist otherwise.
    expect(yearProgress('2028-03-01').elapsed).toBe(61)
    expect(yearProgress('2026-03-01').elapsed).toBe(60)
  })

  it('does not drift across a daylight-saving boundary', () => {
    // Local-midnight subtraction across a DST change is 23 or 25 hours, which
    // floors to the wrong day. `Math.round` is what keeps this honest.
    const march = yearProgress('2026-03-30')
    const nov = yearProgress('2026-11-02')
    expect(march.elapsed).toBe(89)
    expect(nov.elapsed).toBe(306)
  })

  it('agrees with itself day over day, all year', () => {
    // Every day of 2026 advances `elapsed` by exactly one and never repeats.
    let previous = 0
    const seen = new Set()
    const date = new Date(2026, 0, 1)
    while (date.getFullYear() === 2026) {
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
      const { elapsed } = yearProgress(key)
      expect(elapsed).toBe(previous + 1)
      expect(seen.has(elapsed)).toBe(false)
      seen.add(elapsed)
      previous = elapsed
      date.setDate(date.getDate() + 1)
    }
    expect(seen.size).toBe(365)
  })
})

describe('yearBlocks', () => {
  it('is one run of 52 with exactly one current block', () => {
    const blocks = yearBlocks('2026-07-31')
    expect(blocks).toHaveLength(52)
    expect(blocks.filter((b) => b.state === 'current')).toHaveLength(1)
  })

  it('reads left to right — done, current, then off', () => {
    const states = yearBlocks('2026-07-31').map((b) => b.state)
    const current = states.indexOf('current')
    expect(states.slice(0, current).every((s) => s === 'done')).toBe(true)
    expect(states.slice(current + 1).every((s) => s === 'off')).toBe(true)
  })

  it('starts on the first block and ends on the last', () => {
    expect(yearBlocks('2026-01-01')[0].state).toBe('current')
    const end = yearBlocks('2026-12-31')
    // 365 / 52 is not whole; the remainder folds into the final block rather
    // than overflowing into a 53rd that mostly does not exist.
    expect(end[51].state).toBe('current')
    expect(end.filter((b) => b.state === 'off')).toHaveLength(0)
  })

  it('takes a block count, for a narrower strip', () => {
    expect(yearBlocks('2026-07-31', 12)).toHaveLength(12)
  })
})

describe('endOfYear', () => {
  it('is a local date key, not a UTC one', () => {
    // `new Date(2026, 11, 31).toISOString()` is 2026-12-30 anywhere east of
    // Greenwich, which would print "1 day left" on New Year's Eve.
    expect(endOfYear(2026)).toBe('2026-12-31')
    expect(endOfYear(2028)).toBe('2028-12-31')
  })
})
