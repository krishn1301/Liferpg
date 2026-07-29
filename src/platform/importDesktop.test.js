import { describe, it, expect } from 'vitest'
import { convertDesktopSave, describeImport, isDesktopSave } from './importDesktop'
import { buildBackup } from './backup'
import { emptyDoc } from '../state/reducer'
import { totalXp } from '../domain/xp'

// A verbatim slice of the real desktop save at %APPDATA%/life-rpg/liferpg-data.json,
// including the `false` completions, the number ids, the trailing space in a
// name and the drifted xp counter.
const DESKTOP_SAVE = {
  habits: [
    {
      id: 1778145267136,
      name: 'Tuition',
      category: 'personal',
      icon: '📚',
      streak: 0,
      completions: {
        '2026-05-04': true,
        '2026-05-06': true,
        '2026-05-05': false,
        '2026-05-01': true,
        '2026-04-30': true
      },
      target: 'daily',
      xpBonus: 1
    },
    {
      id: 1778149094291,
      name: 'Supradyn',
      category: 'health',
      icon: '🍎',
      streak: 0,
      completions: { '2026-05-05': true, '2026-05-07': true },
      target: 'daily',
      xpBonus: 1
    },
    {
      id: 1778149128153,
      name: '4L Water ',
      category: 'health',
      icon: '💧',
      streak: 0,
      completions: {
        '2026-05-06': true,
        '2026-05-04': false,
        '2026-04-30': true,
        '2026-05-01': true
      },
      target: 'daily',
      xpBonus: 1
    },
    {
      id: 1778149245042,
      name: 'Gym',
      category: 'fitness',
      icon: '💪',
      streak: 0,
      completions: { '2026-05-02': false, '2026-05-01': true },
      target: 'daily',
      xpBonus: 1
    }
  ],
  xp: 190,
  settings: { excelPath: '', autoSaveInterval: 30 },
  lastUpdated: '2026-05-07T10:28:56.426Z'
}

describe('isDesktopSave', () => {
  it('recognises a desktop save', () => {
    expect(isDesktopSave(DESKTOP_SAVE)).toBe(true)
  })

  it('does not mistake a LifeRPG backup for one', () => {
    expect(isDesktopSave(JSON.parse(buildBackup(emptyDoc())))).toBe(false)
  })

  it('rejects anything without a habits array', () => {
    expect(isDesktopSave({ xp: 10 })).toBe(false)
    expect(isDesktopSave(null)).toBe(false)
    expect(isDesktopSave('a string')).toBe(false)
  })
})

describe('convertDesktopSave', () => {
  const doc = convertDesktopSave(DESKTOP_SAVE)

  it('brings across every habit', () => {
    expect(doc.habits.map((h) => h.name)).toEqual(['Tuition', 'Supradyn', '4L Water', 'Gym'])
  })

  it('trims a name that had a trailing space', () => {
    expect(doc.habits[2].name).toBe('4L Water')
  })

  it('drops the false completions rather than storing them', () => {
    // Tuition logged five days but only four were done.
    expect(Object.keys(doc.habits[0].completions).sort()).toEqual([
      '2026-04-30',
      '2026-05-01',
      '2026-05-04',
      '2026-05-06'
    ])
    // Gym logged two days, one of them false.
    expect(doc.habits[3].completions).toEqual({ '2026-05-01': true })
  })

  it('keeps ten completions in total, not the thirteen logged rows', () => {
    const total = doc.habits.reduce((n, h) => n + Object.keys(h.completions).length, 0)
    expect(total).toBe(10)
  })

  it('turns target into a schedule', () => {
    expect(doc.habits.every((h) => h.schedule.type === 'daily')).toBe(true)
    expect(doc.habits.every((h) => !('target' in h))).toBe(true)
  })

  it('drops the stored streak and xp counters, which are derived now', () => {
    expect(doc.habits.every((h) => !('streak' in h))).toBe(true)
    expect('xp' in doc).toBe(false)
  })

  it('regenerates ids as unique strings', () => {
    const ids = doc.habits.map((h) => h.id)
    expect(ids.every((id) => typeof id === 'string' && id.length > 0)).toBe(true)
    expect(new Set(ids).size).toBe(4)
  })

  it('leaves habits unbounded, since they really did exist back then', () => {
    expect(doc.habits.every((h) => h.createdKey === null)).toBe(true)
  })

  it('preserves icons and categories', () => {
    expect(doc.habits.map((h) => h.icon)).toEqual(['📚', '🍎', '💧', '💪'])
    expect(doc.habits.map((h) => h.category)).toEqual([
      'personal',
      'health',
      'health',
      'fitness'
    ])
  })

  it('produces a document the rest of the app can use unchanged', () => {
    expect(doc.medicines).toEqual([])
    expect(doc.routineBlocks).toEqual([])
    expect(doc.settings.theme).toBe('dark')
    expect(doc.version).toBe(1)
  })

  it('rejects a file that is not a desktop save', () => {
    expect(() => convertDesktopSave({ nope: true })).toThrow(/desktop save/)
  })
})

describe('the XP correction is surfaced, not silent', () => {
  const doc = convertDesktopSave(DESKTOP_SAVE)

  it('derives 100 XP from ten completions, not the stored 190', () => {
    expect(totalXp(doc.habits)).toBe(100)
  })

  it('reports both numbers so the drop can be explained before it happens', () => {
    expect(describeImport(DESKTOP_SAVE, doc)).toEqual({
      habits: 4,
      completions: 10,
      derivedXp: 100,
      storedXp: 190,
      xpDrifted: true
    })
  })

  it('does not claim drift when the counter happened to be right', () => {
    const honest = { ...DESKTOP_SAVE, xp: 100 }
    expect(describeImport(honest, doc).xpDrifted).toBe(false)
  })

  it('copes with a file that has no xp field at all', () => {
    const summary = describeImport({ habits: [] }, doc)
    expect(summary.storedXp).toBeNull()
    expect(summary.xpDrifted).toBe(false)
  })
})
