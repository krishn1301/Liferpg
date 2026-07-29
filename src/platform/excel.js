import { Filesystem, Directory } from '@capacitor/filesystem'
import { Share } from '@capacitor/share'
import { isNative } from './storage'
import { rangeKeys, toDateKey } from '../domain/dates'
import { activeHabits, completionRate, currentStreak, dueToday } from '../domain/streaks'
import { XP_PER_COMPLETION } from '../domain/xp'
import { categoryOf } from '../domain/constants'

// The desktop app's headline feature, moved client-side. The layout is kept
// close to the original — three sheets, emerald accent, a habits × dates grid
// of ticks — because people recognise it and print it.
//
// exceljs is ~250 KB and is imported lazily inside exportExcel, so it is only
// fetched when someone actually taps Export. Never import it at module scope.

const SHEET = {
  daily: 'Daily Habits',
  stats: 'Statistics',
  config: 'Config'
}

const HEADER_BG = 'FF374151'
const ACCENT = 'FF10B981'
const CELL_BORDER = 'FFE5E7EB'
const EMPTY_CELL = 'FFF3F4F6'

/** '#f97316' → 'FFF97316'. ExcelJS wants ARGB, our tokens are CSS hex. */
const argb = (hex) => `FF${String(hex).replace('#', '').toUpperCase()}`

export const excelFilename = (now = new Date()) => `liferpg-${toDateKey(now)}.xlsx`

/**
 * The columns of the daily grid: every calendar day from the first completion
 * to today, contiguous.
 *
 * The desktop version listed only days that had an entry, which silently closed
 * up the gaps — the weeks you missed vanished instead of showing as blanks,
 * which is the single most useful thing a tracker grid can show you.
 */
export function exportDates(habits, todayKey) {
  let earliest = null
  for (const habit of habits) {
    for (const [key, done] of Object.entries(habit.completions ?? {})) {
      if (done && (earliest === null || key < earliest)) earliest = key
    }
  }

  if (earliest === null) {
    // Nothing logged yet: show the last 30 days so the sheet is still readable.
    const start = new Date(todayKey + 'T00:00:00')
    start.setDate(start.getDate() - 29)
    earliest = toDateKey(start)
  }

  return rangeKeys(earliest < todayKey ? earliest : todayKey, todayKey)
}

/** 'Jun 3' — the column header for a date key, in the user's locale. */
const shortDate = (dateKey) =>
  new Date(dateKey + 'T00:00:00').toLocaleDateString(undefined, { month: 'short', day: 'numeric' })

const titleCase = (s) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : '')

const styleHeader = (row) => {
  row.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 11 }
  row.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: HEADER_BG } }
  row.alignment = { horizontal: 'center', vertical: 'middle' }
  row.height = 28
}

/**
 * Build the workbook. Exported separately from delivery so the contents can be
 * asserted in tests without touching the filesystem.
 */
export async function buildWorkbook(doc, todayKey) {
  const { default: ExcelJS } = await import('exceljs')

  const habits = activeHabits(doc.habits)
  const dates = exportDates(habits, todayKey)
  const from = dates[0]
  const to = dates[dates.length - 1]

  const workbook = new ExcelJS.Workbook()
  workbook.creator = 'LifeRPG'
  workbook.created = new Date()

  buildDailySheet(workbook, habits, dates)
  buildStatsSheet(workbook, habits, from, to, todayKey)
  buildConfigSheet(workbook, habits)

  return workbook
}

function buildDailySheet(workbook, habits, dates) {
  const sheet = workbook.addWorksheet(SHEET.daily, {
    properties: { tabColor: { argb: ACCENT } }
  })

  styleHeader(sheet.addRow(['#', 'Habit', 'Category', ...dates.map(shortDate), 'Done', 'Rate']))

  sheet.getColumn(1).width = 5
  sheet.getColumn(2).width = 22
  sheet.getColumn(3).width = 14
  for (let i = 0; i < dates.length; i++) sheet.getColumn(4 + i).width = 9
  sheet.getColumn(4 + dates.length).width = 8
  sheet.getColumn(5 + dates.length).width = 8

  habits.forEach((habit, index) => {
    const cat = categoryOf(habit.category)
    const done = dates.filter((d) => habit.completions?.[d]).length

    const row = sheet.addRow([
      index + 1,
      `${habit.icon ?? ''} ${habit.name}`.trim(),
      titleCase(habit.category),
      ...dates.map((d) => (habit.completions?.[d] ? '✓' : '')),
      done,
      // Each habit measured against its own scheduled days. The desktop
      // version divided by every date in the sheet, so a Mon/Wed/Fri habit
      // could never exceed 43% however perfectly it was kept.
      `${completionRate(habit, dates[0], dates[dates.length - 1])}%`
    ])

    row.height = 22
    row.alignment = { horizontal: 'center', vertical: 'middle' }
    row.getCell(2).alignment = { horizontal: 'left', vertical: 'middle' }

    dates.forEach((d, i) => {
      const cell = row.getCell(4 + i)
      const filled = Boolean(habit.completions?.[d])
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: filled ? argb(cat.color) : EMPTY_CELL }
      }
      cell.font = filled
        ? { color: { argb: 'FFFFFFFF' }, bold: true }
        : { color: { argb: 'FFD1D5DB' } }
      cell.border = {
        top: { style: 'thin', color: { argb: CELL_BORDER } },
        bottom: { style: 'thin', color: { argb: CELL_BORDER } },
        left: { style: 'thin', color: { argb: CELL_BORDER } },
        right: { style: 'thin', color: { argb: CELL_BORDER } }
      }
    })

    row.getCell(3).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: EMPTY_CELL } }
    row.getCell(3).font = { color: { argb: argb(cat.color) }, bold: true, size: 10 }
  })

  const pctRow = sheet.addRow([
    '',
    'COMPLETION %',
    '',
    ...dates.map((dateKey) => {
      // Denominator is what was actually scheduled that day, not the whole
      // habit list — otherwise every day with a rest-day habit reads as a
      // partial failure.
      const due = dueToday(habits, dateKey).length
      const done = habits.filter((h) => h.completions?.[dateKey]).length
      return due ? `${Math.round((done / due) * 100)}%` : '—'
    }),
    '',
    ''
  ])
  pctRow.font = { bold: true, color: { argb: ACCENT } }
  pctRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF0FDF4' } }
  pctRow.height = 24
}

function buildStatsSheet(workbook, habits, from, to, todayKey) {
  const sheet = workbook.addWorksheet(SHEET.stats, {
    properties: { tabColor: { argb: 'FF8B5CF6' } }
  })

  sheet.columns = [
    { header: 'Habit', key: 'name', width: 24 },
    { header: 'Category', key: 'category', width: 14 },
    { header: 'Current Streak', key: 'streak', width: 15 },
    { header: 'Total Completions', key: 'total', width: 18 },
    { header: 'Completion Rate', key: 'rate', width: 16 },
    { header: 'XP Earned', key: 'xp', width: 12 }
  ]
  styleHeader(sheet.getRow(1))

  let totalCompletions = 0
  let totalXpEarned = 0

  for (const habit of habits) {
    const total = Object.values(habit.completions ?? {}).filter(Boolean).length
    const xp = total * XP_PER_COMPLETION * (habit.xpBonus ?? 1)
    totalCompletions += total
    totalXpEarned += xp

    sheet.addRow({
      name: `${habit.icon ?? ''} ${habit.name}`.trim(),
      category: titleCase(habit.category),
      // The shared streak logic, which knows about schedules and skips. The
      // desktop version walked days with toISOString(), so anything logged
      // before 05:30 IST counted against the previous day and broke the run.
      streak: `${currentStreak(habit, todayKey).streak} days`,
      total,
      rate: `${completionRate(habit, from, to)}%`,
      xp
    })
  }

  sheet.addRow({})
  sheet.addRow({
    name: '📊 TOTAL',
    total: totalCompletions,
    xp: totalXpEarned
  }).font = { bold: true, size: 12, color: { argb: ACCENT } }
}

function buildConfigSheet(workbook, habits) {
  const sheet = workbook.addWorksheet(SHEET.config, {
    properties: { tabColor: { argb: 'FFF59E0B' } }
  })

  sheet.columns = [
    { header: 'ID', key: 'id', width: 18 },
    { header: 'Name', key: 'name', width: 24 },
    { header: 'Category', key: 'category', width: 14 },
    { header: 'Icon', key: 'icon', width: 8 },
    { header: 'XP Bonus', key: 'xpBonus', width: 10 },
    { header: 'Schedule', key: 'schedule', width: 18 },
    { header: 'Created', key: 'created', width: 12 }
  ]
  styleHeader(sheet.getRow(1))

  for (const habit of habits) {
    sheet.addRow({
      id: habit.id,
      name: habit.name,
      category: habit.category,
      icon: habit.icon,
      xpBonus: habit.xpBonus ?? 1,
      schedule: JSON.stringify(habit.schedule),
      created: habit.createdKey ?? ''
    })
  }
}

/** ArrayBuffer → base64, in chunks so a large sheet can't blow the call stack. */
function toBase64(buffer) {
  const bytes = new Uint8Array(buffer)
  let binary = ''
  const CHUNK = 0x8000
  for (let i = 0; i < bytes.length; i += CHUNK) {
    binary += String.fromCharCode.apply(null, bytes.subarray(i, i + CHUNK))
  }
  return btoa(binary)
}

const MIME = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'

/**
 * Write the workbook where the user can reach it. Mirrors exportBackup: on
 * Android, Documents plus a share sheet; on web, a download.
 */
export async function exportExcel(doc, todayKey) {
  const workbook = await buildWorkbook(doc, todayKey)
  const buffer = await workbook.xlsx.writeBuffer()
  const name = excelFilename()

  if (!isNative) {
    const url = URL.createObjectURL(new Blob([buffer], { type: MIME }))
    const a = document.createElement('a')
    a.href = url
    a.download = name
    a.click()
    URL.revokeObjectURL(url)
    return { name, shared: false }
  }

  // Binary, so no `encoding` — Filesystem treats the string as base64 only
  // when the encoding option is absent.
  const { uri } = await Filesystem.writeFile({
    path: name,
    data: toBase64(buffer),
    directory: Directory.Documents,
    recursive: true
  })

  try {
    await Share.share({ title: 'LifeRPG export', url: uri, dialogTitle: 'Share your spreadsheet' })
    return { name, uri, shared: true }
  } catch {
    return { name, uri, shared: false }
  }
}
