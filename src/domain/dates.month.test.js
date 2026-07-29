import { describe, it, expect } from 'vitest'
import { addMonths, daysInMonth, leadingBlanks, monthKeys } from './dates'

describe('monthKeys', () => {
  it('covers the whole month, zero-padded', () => {
    const keys = monthKeys(2026, 5) // June
    expect(keys).toHaveLength(30)
    expect(keys[0]).toBe('2026-06-01')
    expect(keys[29]).toBe('2026-06-30')
  })

  it('handles a leap February', () => {
    expect(monthKeys(2028, 1)).toHaveLength(29)
    expect(monthKeys(2026, 1)).toHaveLength(28)
    expect(daysInMonth(2028, 1)).toBe(29)
  })

  it('pads single-digit months and days', () => {
    expect(monthKeys(2026, 0)[0]).toBe('2026-01-01')
  })
})

describe('leadingBlanks', () => {
  it('puts Monday first', () => {
    // 2026-06-01 is a Monday — no blanks before it.
    expect(leadingBlanks(2026, 5)).toBe(0)
  })

  it('wraps Sunday to the end of the week, not the start', () => {
    // 2026-02-01 is a Sunday. Monday-first means six blanks, not zero.
    expect(leadingBlanks(2026, 1)).toBe(6)
  })

  it('counts correctly for a mid-week start', () => {
    // 2026-07-01 is a Wednesday: Mon and Tue are blank.
    expect(leadingBlanks(2026, 6)).toBe(2)
  })
})

describe('addMonths', () => {
  it('rolls forward over a year boundary', () => {
    expect(addMonths(2026, 11, 1)).toEqual({ year: 2027, monthIndex: 0 })
  })

  it('rolls backward over a year boundary', () => {
    expect(addMonths(2026, 0, -1)).toEqual({ year: 2025, monthIndex: 11 })
  })

  it('stays put for a zero shift', () => {
    expect(addMonths(2026, 5, 0)).toEqual({ year: 2026, monthIndex: 5 })
  })

  it('does not overflow when the current day has no counterpart', () => {
    // Anchored to the 1st internally, so a 31-day month never spills into the next.
    expect(addMonths(2026, 0, 1)).toEqual({ year: 2026, monthIndex: 1 })
  })
})
