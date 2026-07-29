import { describe, it, expect } from 'vitest'
import { buildWorkbook, excelFilename, exportDates } from './excel'
import { emptyDoc } from '../state/reducer'

// 2026-06-01 Mon … 2026-06-07 Sun
const MON = '2026-06-01'
const SUN = '2026-06-07'

const habit = (over = {}) => ({
  id: 'h1',
  name: 'Run',
  icon: '🏃',
  category: 'fitness',
  schedule: { type: 'daily' },
  completions: {},
  skips: {},
  xpBonus: 1,
  archived: false,
  createdKey: null,
  ...over
})

const docWith = (habits) => ({ ...emptyDoc(), habits })

/** Cell values of a row, 1-indexed as ExcelJS numbers them. */
const rowValues = (sheet, n) => sheet.getRow(n).values.slice(1)

describe('exportDates', () => {
  it('runs contiguously from the first completion to today', () => {
    const dates = exportDates([habit({ completions: { [MON]: true } })], SUN)
    expect(dates[0]).toBe(MON)
    expect(dates[dates.length - 1]).toBe(SUN)
    expect(dates).toHaveLength(7)
  })

  it('includes the days with nothing done, so gaps are visible', () => {
    // The desktop version listed only dates that had an entry, closing the gaps.
    const dates = exportDates([habit({ completions: { [MON]: true, [SUN]: true } })], SUN)
    expect(dates).toHaveLength(7)
    expect(dates).toContain('2026-06-04')
  })

  it('falls back to the last 30 days when nothing has been logged', () => {
    const dates = exportDates([habit()], SUN)
    expect(dates).toHaveLength(30)
    expect(dates[dates.length - 1]).toBe(SUN)
  })

  it('ignores false-y completions when finding the earliest day', () => {
    const dates = exportDates([habit({ completions: { '2026-01-01': false, [MON]: true } })], SUN)
    expect(dates[0]).toBe(MON)
  })
})

describe('workbook structure', () => {
  it('has the three sheets the desktop app produced', async () => {
    const wb = await buildWorkbook(docWith([habit()]), SUN)
    expect(wb.worksheets.map((s) => s.name)).toEqual(['Daily Habits', 'Statistics', 'Config'])
  })

  it('leaves archived habits out of every sheet', async () => {
    const wb = await buildWorkbook(
      docWith([habit({ id: 'live' }), habit({ id: 'gone', name: 'Archived', archived: true })]),
      SUN
    )
    const stats = wb.getWorksheet('Statistics')
    const names = stats.getColumn('name').values.filter(Boolean)
    expect(names.some((n) => String(n).includes('Archived'))).toBe(false)
  })

  it('survives an empty document', async () => {
    const wb = await buildWorkbook(emptyDoc(), SUN)
    expect(wb.worksheets).toHaveLength(3)
  })
})

describe('per-habit rate uses that habit own scheduled days', () => {
  it('gives a perfectly-kept Mon/Wed/Fri habit 100%, not 43%', async () => {
    // The desktop bug: totalDone / every date in the sheet. Three of seven days
    // done looked like failure when it was a perfect week.
    const mwf = habit({
      schedule: { type: 'weekdays', days: [1, 3, 5] },
      completions: { '2026-06-01': true, '2026-06-03': true, '2026-06-05': true }
    })
    const wb = await buildWorkbook(docWith([mwf]), SUN)
    const row = rowValues(wb.getWorksheet('Daily Habits'), 2)

    expect(row[row.length - 1]).toBe('100%')
    // The raw count is still shown, and is still three.
    expect(row[row.length - 2]).toBe(3)
  })

  it('reports the same rate on the Statistics sheet', async () => {
    const mwf = habit({
      schedule: { type: 'weekdays', days: [1, 3, 5] },
      completions: { '2026-06-01': true, '2026-06-03': true, '2026-06-05': true }
    })
    const wb = await buildWorkbook(docWith([mwf]), SUN)
    expect(wb.getWorksheet('Statistics').getRow(2).getCell('rate').value).toBe('100%')
  })

  it('still reports a genuinely poor rate as poor', async () => {
    const slacker = habit({ completions: { [MON]: true } })
    const wb = await buildWorkbook(docWith([slacker]), SUN)
    const row = rowValues(wb.getWorksheet('Daily Habits'), 2)
    expect(row[row.length - 1]).toBe('14%')
  })
})

describe('the daily grid', () => {
  it('marks done days with a tick and leaves the rest blank', async () => {
    const wb = await buildWorkbook(docWith([habit({ completions: { [MON]: true } })]), SUN)
    const row = rowValues(wb.getWorksheet('Daily Habits'), 2)
    // index 0,1,2 are #, Habit, Category — the grid starts at 3.
    expect(row[3]).toBe('✓')
    expect(row[4]).toBe('')
  })

  it('divides the completion % row by what was due that day', async () => {
    // Tuesday: only the daily habit is due, and it is done. That is 100%,
    // not 50% — the Mon/Wed/Fri habit was never asked for.
    const habits = [
      habit({ id: 'daily', completions: { '2026-06-02': true } }),
      habit({ id: 'mwf', schedule: { type: 'weekdays', days: [1, 3, 5] } })
    ]
    const wb = await buildWorkbook(docWith(habits), SUN)
    const sheet = wb.getWorksheet('Daily Habits')
    const pct = rowValues(sheet, sheet.rowCount)

    const dates = exportDates(habits, SUN)
    const tuesday = dates.indexOf('2026-06-02')
    expect(pct[3 + tuesday]).toBe('100%')
  })

  it('shows an em dash rather than 0% on a day nothing was scheduled', async () => {
    // Wednesdays only. The sheet runs Wed 3rd → Sun 7th, so Thursday the 4th
    // is inside the range with nothing due: not a 0% day, a no-op day.
    const habits = [
      habit({ schedule: { type: 'weekdays', days: [3] }, completions: { '2026-06-03': true } })
    ]
    const wb = await buildWorkbook(docWith(habits), SUN)
    const sheet = wb.getWorksheet('Daily Habits')
    const pct = rowValues(sheet, sheet.rowCount)
    const dates = exportDates(habits, SUN)

    const thursday = dates.indexOf('2026-06-04')
    expect(thursday).toBeGreaterThan(-1)
    expect(pct[3 + thursday]).toBe('—')
    expect(pct[3 + dates.indexOf('2026-06-03')]).toBe('100%')
  })
})

describe('Statistics sheet', () => {
  it('totals XP from completions, at ten a piece', async () => {
    const wb = await buildWorkbook(
      docWith([habit({ completions: { [MON]: true, '2026-06-02': true } })]),
      SUN
    )
    expect(wb.getWorksheet('Statistics').getRow(2).getCell('xp').value).toBe(20)
  })

  it('honours an xpBonus', async () => {
    const wb = await buildWorkbook(
      docWith([habit({ xpBonus: 2, completions: { [MON]: true } })]),
      SUN
    )
    expect(wb.getWorksheet('Statistics').getRow(2).getCell('xp').value).toBe(20)
  })
})

describe('filenames use the local day, never UTC', () => {
  it('files 00:30 on the 2nd under the 2nd', () => {
    // toISOString() would roll this back to the 1st at IST.
    expect(excelFilename(new Date(2026, 5, 2, 0, 30))).toBe('liferpg-2026-06-02.xlsx')
  })
})
