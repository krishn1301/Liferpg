import ExcelJS from 'exceljs'
import { dialog } from 'electron'

const CATEGORY_COLORS = {
  fitness: { hex: 'FFF97316', light: 'FFFFF7ED' },
  education: { hex: 'FF8B5CF6', light: 'FFF5F3FF' },
  health: { hex: 'FF10B981', light: 'FFECFDF5' },
  productivity: { hex: 'FF3B82F6', light: 'FFEFF6FF' },
  personal: { hex: 'FFEC4899', light: 'FFFDF2F8' },
  mindfulness: { hex: 'FF14B8A6', light: 'FFF0FDFA' },
  social: { hex: 'FFF59E0B', light: 'FFFFFBEB' },
  creative: { hex: 'FFE11D48', light: 'FFFFF1F2' }
}

function getCatColors(category) {
  return CATEGORY_COLORS[category] || { hex: 'FF6B7280', light: 'FFF9FAFB' }
}

export async function exportToExcel(habits, xp) {
  const { filePath, canceled } = await dialog.showSaveDialog({
    title: 'Export Habits to Excel',
    defaultPath: `LifeRPG_Habits_${new Date().toISOString().split('T')[0]}.xlsx`,
    filters: [{ name: 'Excel Files', extensions: ['xlsx'] }]
  })

  if (canceled || !filePath) return { success: false, reason: 'cancelled' }

  const workbook = new ExcelJS.Workbook()
  workbook.creator = 'LifeRPG'
  workbook.created = new Date()

  // ── Sheet 1: Daily Habits Tracker ──
  const dailySheet = workbook.addWorksheet('Daily Habits', {
    properties: { tabColor: { argb: 'FF10B981' } }
  })

  // Gather all dates from completions
  const allDates = new Set()
  habits.forEach((h) => {
    Object.keys(h.completions || {}).forEach((d) => allDates.add(d))
  })
  const sortedDates = [...allDates].sort()

  // If no dates, use last 30 days
  if (sortedDates.length === 0) {
    const today = new Date()
    for (let i = 29; i >= 0; i--) {
      const d = new Date(today)
      d.setDate(d.getDate() - i)
      sortedDates.push(d.toISOString().split('T')[0])
    }
  }

  // Header row
  const headerRow = ['#', 'Habit', 'Category', ...sortedDates.map((d) => {
    const date = new Date(d + 'T00:00:00')
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  }), 'Total', 'Rate']

  dailySheet.addRow(headerRow)

  // Style header
  const hRow = dailySheet.getRow(1)
  hRow.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 11 }
  hRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF374151' } }
  hRow.alignment = { horizontal: 'center', vertical: 'middle' }
  hRow.height = 28

  // Set column widths
  dailySheet.getColumn(1).width = 5
  dailySheet.getColumn(2).width = 22
  dailySheet.getColumn(3).width = 14
  for (let i = 4; i <= 3 + sortedDates.length; i++) {
    dailySheet.getColumn(i).width = 9
  }
  dailySheet.getColumn(4 + sortedDates.length).width = 8
  dailySheet.getColumn(5 + sortedDates.length).width = 8

  // Data rows
  habits.forEach((h, idx) => {
    const cat = getCatColors(h.category)
    const completionCells = sortedDates.map((d) => (h.completions?.[d] ? '✓' : ''))
    const totalDone = sortedDates.filter((d) => h.completions?.[d]).length
    const rate = sortedDates.length > 0 ? Math.round((totalDone / sortedDates.length) * 100) + '%' : '0%'

    const row = dailySheet.addRow([
      idx + 1,
      `${h.icon || ''} ${h.name}`,
      h.category?.charAt(0).toUpperCase() + h.category?.slice(1),
      ...completionCells,
      totalDone,
      rate
    ])

    row.height = 22
    row.alignment = { horizontal: 'center', vertical: 'middle' }
    row.getCell(2).alignment = { horizontal: 'left', vertical: 'middle' }

    // Color-code completion cells
    sortedDates.forEach((d, di) => {
      const cell = row.getCell(4 + di)
      if (h.completions?.[d]) {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: cat.hex } }
        cell.font = { color: { argb: 'FFFFFFFF' }, bold: true }
      } else {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF3F4F6' } }
        cell.font = { color: { argb: 'FFD1D5DB' } }
      }
      cell.border = {
        top: { style: 'thin', color: { argb: 'FFE5E7EB' } },
        bottom: { style: 'thin', color: { argb: 'FFE5E7EB' } },
        left: { style: 'thin', color: { argb: 'FFE5E7EB' } },
        right: { style: 'thin', color: { argb: 'FFE5E7EB' } }
      }
    })

    // Style category cell
    row.getCell(3).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: cat.light } }
    row.getCell(3).font = { color: { argb: cat.hex }, bold: true, size: 10 }
  })

  // Completion % row at bottom
  const pctRow = dailySheet.addRow([
    '',
    'COMPLETION %',
    '',
    ...sortedDates.map((d) => {
      const done = habits.filter((h) => h.completions?.[d]).length
      return habits.length > 0 ? Math.round((done / habits.length) * 100) + '%' : '0%'
    }),
    '',
    ''
  ])
  pctRow.font = { bold: true, color: { argb: 'FF10B981' } }
  pctRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF0FDF4' } }
  pctRow.height = 24

  // ── Sheet 2: Statistics ──
  const statsSheet = workbook.addWorksheet('Statistics', {
    properties: { tabColor: { argb: 'FF8B5CF6' } }
  })

  statsSheet.columns = [
    { header: 'Habit', key: 'name', width: 24 },
    { header: 'Category', key: 'category', width: 14 },
    { header: 'Current Streak', key: 'streak', width: 15 },
    { header: 'Total Completions', key: 'total', width: 18 },
    { header: 'Completion Rate', key: 'rate', width: 16 },
    { header: 'XP Earned', key: 'xp', width: 12 }
  ]

  const sHdr = statsSheet.getRow(1)
  sHdr.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 11 }
  sHdr.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF374151' } }
  sHdr.alignment = { horizontal: 'center', vertical: 'middle' }
  sHdr.height = 28

  habits.forEach((h) => {
    const total = Object.values(h.completions || {}).filter(Boolean).length
    const allDays = Object.keys(h.completions || {}).length || 1

    // Calculate current streak
    let streak = 0
    const today = new Date()
    const tempDate = new Date(today)
    while (true) {
      const key = tempDate.toISOString().split('T')[0]
      if (h.completions?.[key]) {
        streak++
        tempDate.setDate(tempDate.getDate() - 1)
      } else {
        break
      }
    }

    statsSheet.addRow({
      name: `${h.icon || ''} ${h.name}`,
      category: h.category?.charAt(0).toUpperCase() + h.category?.slice(1),
      streak: `${streak} days`,
      total,
      rate: Math.round((total / allDays) * 100) + '%',
      xp: total * 10 * (h.xpBonus || 1)
    })
  })

  // Summary row
  statsSheet.addRow({})
  statsSheet.addRow({
    name: '📊 TOTAL',
    category: '',
    streak: '',
    total: habits.reduce((s, h) => s + Object.values(h.completions || {}).filter(Boolean).length, 0),
    rate: '',
    xp: xp
  }).font = { bold: true, size: 12, color: { argb: 'FF10B981' } }

  // ── Sheet 3: Config (for re-import) ──
  const configSheet = workbook.addWorksheet('Config', {
    properties: { tabColor: { argb: 'FFF59E0B' } }
  })

  configSheet.columns = [
    { header: 'ID', key: 'id', width: 16 },
    { header: 'Name', key: 'name', width: 24 },
    { header: 'Category', key: 'category', width: 14 },
    { header: 'Icon', key: 'icon', width: 8 },
    { header: 'XP Bonus', key: 'xpBonus', width: 10 },
    { header: 'Target', key: 'target', width: 10 }
  ]

  const cHdr = configSheet.getRow(1)
  cHdr.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 11 }
  cHdr.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF374151' } }
  cHdr.height = 28

  habits.forEach((h) => {
    configSheet.addRow({
      id: h.id,
      name: h.name,
      category: h.category,
      icon: h.icon,
      xpBonus: h.xpBonus || 1,
      target: h.target || 'daily'
    })
  })

  await workbook.xlsx.writeFile(filePath)
  return { success: true, filePath }
}

export async function importFromExcel() {
  const { filePaths, canceled } = await dialog.showOpenDialog({
    title: 'Import Habits from Excel',
    filters: [{ name: 'Excel Files', extensions: ['xlsx'] }],
    properties: ['openFile']
  })

  if (canceled || !filePaths?.length) return { success: false, reason: 'cancelled' }

  const workbook = new ExcelJS.Workbook()
  await workbook.xlsx.readFile(filePaths[0])

  // Try to read config sheet first
  const configSheet = workbook.getWorksheet('Config')
  const dailySheet = workbook.getWorksheet('Daily Habits')

  if (!configSheet) {
    return { success: false, reason: 'No Config sheet found. Export from LifeRPG first.' }
  }

  const habits = []
  configSheet.eachRow((row, rowNumber) => {
    if (rowNumber === 1) return // skip header
    const habit = {
      id: row.getCell(1).value || Date.now() + rowNumber,
      name: String(row.getCell(2).value || '').trim(),
      category: String(row.getCell(3).value || 'personal').trim().toLowerCase(),
      icon: String(row.getCell(4).value || '⭐').trim(),
      xpBonus: Number(row.getCell(5).value) || 1,
      target: String(row.getCell(6).value || 'daily').trim(),
      streak: 0,
      completions: {}
    }
    if (habit.name) habits.push(habit)
  })

  // Read completions from Daily Habits sheet
  if (dailySheet) {
    // Get dates from header row
    const headerRow = dailySheet.getRow(1)
    const dates = []
    const year = new Date().getFullYear()

    for (let col = 4; col <= headerRow.cellCount - 2; col++) {
      const val = String(headerRow.getCell(col).value || '').trim()
      if (val) {
        // Parse "May 1", "Jun 15" etc.
        const parsed = new Date(`${val}, ${year}`)
        if (!isNaN(parsed.getTime())) {
          dates.push({ col, date: parsed.toISOString().split('T')[0] })
        }
      }
    }

    // Read each habit row
    dailySheet.eachRow((row, rowNumber) => {
      if (rowNumber === 1) return
      const habitIdx = Number(row.getCell(1).value) - 1
      if (habitIdx >= 0 && habitIdx < habits.length) {
        dates.forEach(({ col, date }) => {
          const val = String(row.getCell(col).value || '').trim()
          if (val === '✓' || val === '✔' || val === 'Y' || val === 'y' || val === '1') {
            habits[habitIdx].completions[date] = true
          }
        })
      }
    })
  }

  // Calculate XP from completions
  let totalXP = 0
  habits.forEach((h) => {
    const completionCount = Object.values(h.completions).filter(Boolean).length
    totalXP += completionCount * 10 * (h.xpBonus || 1)
  })

  return { success: true, habits, xp: totalXP, filePath: filePaths[0] }
}
