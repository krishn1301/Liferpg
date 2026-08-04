import { Filesystem, Directory } from '@capacitor/filesystem'
import { Share } from '@capacitor/share'
import { isNative } from './storage'
import { rangeKeys, toDateKey } from '../domain/dates'
import {
  activeHabits,
  bestStreak,
  completionRate,
  currentStreak,
  dueToday
} from '../domain/streaks'
import { isVow, cleanDaysTotal, relapseCount, lastRelapse } from '../domain/quit'
import { hasLog, logTrend } from '../domain/daily'
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
  log: 'Daily Log',
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
  // The daily grid is a grid of ticks. A vow has no completions to tick, so a
  // vow row would be an unbroken run of blanks reading as total failure — the
  // exact opposite of what a kept vow is. They get their own block on the
  // stats sheet instead, and they stay in Config because that sheet is the
  // record dump, not a report.
  const builds = habits.filter((h) => !isVow(h))
  const vows = habits.filter(isVow)

  const dates = exportDates(builds, todayKey)
  const from = dates[0]
  const to = dates[dates.length - 1]

  const workbook = new ExcelJS.Workbook()
  workbook.creator = 'LifeRPG'
  workbook.created = new Date()

  buildDailySheet(workbook, builds, dates)
  buildStatsSheet(workbook, builds, vows, from, to, todayKey)
  buildLogSheet(workbook, doc.dailyLogs, from, to)
  buildConfigSheet(workbook, habits)

  return workbook
}

/**
 * Mood, energy, water and the day's note.
 *
 * A fourth sheet, where the desktop app had three. That contract was worth
 * keeping while the export was a straight port; it is not worth keeping at the
 * cost of an export that silently omits data the user entered.
 *
 * Days nobody logged are left blank rather than zeroed — a mood of 0 is not the
 * same fact as no mood, and averaging the two together is the mistake
 * domain/daily.js exists to avoid.
 */
function buildLogSheet(workbook, dailyLogs, from, to) {
  const sheet = workbook.addWorksheet(SHEET.log, {
    properties: { tabColor: { argb: 'FF0EA5E9' } }
  })

  sheet.columns = [
    { header: 'Date', key: 'date', width: 12 },
    { header: 'Mood', key: 'mood', width: 8 },
    { header: 'Energy', key: 'energy', width: 8 },
    { header: 'Water', key: 'water', width: 8 },
    { header: 'Note', key: 'note', width: 60 }
  ]
  styleHeader(sheet.getRow(1))

  for (const day of logTrend(dailyLogs, from, to)) {
    if (!hasLog(dailyLogs, day.dateKey)) continue
    sheet.addRow({
      date: day.dateKey,
      mood: day.mood ?? '',
      energy: day.energy ?? '',
      water: day.water || '',
      note: day.note
    }).alignment = { vertical: 'top', wrapText: true }
  }
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

function buildStatsSheet(workbook, habits, vows, from, to, todayKey) {
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

  // Vows below the habits, under their own header. The columns are reused
  // rather than added: "Current Streak" is days clean, "Total Completions" is
  // clean days banked, "Completion Rate" is the best run ever. Sharing the
  // grid keeps one table instead of two, and the header row says which is which.
  if (vows.length > 0) {
    sheet.addRow({})
    styleHeader(
      sheet.addRow({
        name: 'VOWS',
        category: 'Category',
        streak: 'Days Clean',
        total: 'Clean Days',
        rate: 'Best Run',
        xp: 'XP Earned'
      })
    )

    for (const vow of vows) {
      const clean = cleanDaysTotal(vow, todayKey)
      const xp = clean * XP_PER_COMPLETION * (vow.xpBonus ?? 1)
      totalXpEarned += xp

      sheet.addRow({
        name: `${vow.icon ?? ''} ${vow.name}`.trim(),
        category: titleCase(vow.category),
        streak: `${currentStreak(vow, todayKey).streak} days`,
        total: clean,
        rate: `${bestStreak(vow, todayKey)} days`,
        xp
      })
    }

    sheet.addRow({})
    styleHeader(
      sheet.addRow({
        name: 'RELAPSES',
        category: 'Times Broken',
        streak: 'Last Relapse',
        total: 'Clean Since'
      })
    )

    for (const vow of vows) {
      sheet.addRow({
        name: `${vow.icon ?? ''} ${vow.name}`.trim(),
        category: relapseCount(vow),
        streak: lastRelapse(vow, todayKey) ?? 'never',
        total: vow.createdKey ?? ''
      })
    }
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
    { header: 'Type', key: 'kind', width: 8 },
    { header: 'Category', key: 'category', width: 14 },
    { header: 'Icon', key: 'icon', width: 8 },
    { header: 'XP Bonus', key: 'xpBonus', width: 10 },
    { header: 'Schedule', key: 'schedule', width: 18 },
    { header: 'Created', key: 'created', width: 12 },
    { header: 'Relapses', key: 'relapses', width: 30 }
  ]
  styleHeader(sheet.getRow(1))

  for (const habit of habits) {
    const vow = isVow(habit)
    sheet.addRow({
      id: habit.id,
      name: habit.name,
      kind: vow ? 'quit' : 'build',
      category: habit.category,
      icon: habit.icon,
      xpBonus: habit.xpBonus ?? 1,
      // A vow has no schedule; printing `{"type":"daily"}` next to one would
      // suggest it is due every day, which is precisely what it is not.
      schedule: vow ? '' : JSON.stringify(habit.schedule),
      created: habit.createdKey ?? '',
      relapses: vow
        ? Object.keys(habit.relapses ?? {})
            .sort()
            .join(' ')
        : ''
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
