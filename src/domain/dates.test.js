import { describe, it, expect } from 'vitest'
import {
  toDateKey,
  fromDateKey,
  addDays,
  startOfWeek,
  weekKeys,
  dayOfWeek,
  msUntilNextLocalMidnight,
  formatTime,
  rangeKeys
} from './dates'

describe('date keys', () => {
  it('uses the LOCAL calendar day, not UTC', () => {
    // The bug that corrupted the desktop app: at UTC+5:30, 00:30 local is
    // 19:00 the *previous* day in UTC, so toISOString() filed it under
    // yesterday and every early-morning check-in broke a streak.
    const justAfterMidnight = new Date(2026, 6, 27, 0, 30, 0)
    expect(toDateKey(justAfterMidnight)).toBe('2026-07-27')

    const lateNight = new Date(2026, 6, 27, 23, 45, 0)
    expect(toDateKey(lateNight)).toBe('2026-07-27')
  })

  it('pads months and days', () => {
    expect(toDateKey(new Date(2026, 0, 5))).toBe('2026-01-05')
  })

  it('round-trips through fromDateKey at local midnight', () => {
    const d = fromDateKey('2026-03-09')
    expect(d.getFullYear()).toBe(2026)
    expect(d.getMonth()).toBe(2)
    expect(d.getDate()).toBe(9)
    expect(d.getHours()).toBe(0)
  })

  it('adds and subtracts days across month and year boundaries', () => {
    expect(addDays('2026-07-31', 1)).toBe('2026-08-01')
    expect(addDays('2026-01-01', -1)).toBe('2025-12-31')
    expect(addDays('2024-02-28', 1)).toBe('2024-02-29') // leap year
    expect(addDays('2026-02-28', 1)).toBe('2026-03-01')
  })

  it('treats weeks as Monday-first', () => {
    // 2026-07-27 is a Monday
    expect(dayOfWeek('2026-07-27')).toBe(1)
    expect(startOfWeek('2026-07-27')).toBe('2026-07-27')
    // Sunday belongs to the week that started the previous Monday
    expect(startOfWeek('2026-08-02')).toBe('2026-07-27')
    expect(weekKeys('2026-07-29')).toEqual([
      '2026-07-27',
      '2026-07-28',
      '2026-07-29',
      '2026-07-30',
      '2026-07-31',
      '2026-08-01',
      '2026-08-02'
    ])
  })

  it('builds inclusive ranges', () => {
    expect(rangeKeys('2026-07-27', '2026-07-30')).toHaveLength(4)
  })

  it('counts down to the next local midnight', () => {
    const at2330 = new Date(2026, 6, 27, 23, 30, 0)
    expect(msUntilNextLocalMidnight(at2330)).toBe(30 * 60 * 1000)
  })

  it('formats 24h times for display', () => {
    expect(formatTime('00:00')).toBe('12:00 AM')
    expect(formatTime('08:05')).toBe('8:05 AM')
    expect(formatTime('12:00')).toBe('12:00 PM')
    expect(formatTime('22:30')).toBe('10:30 PM')
  })
})
