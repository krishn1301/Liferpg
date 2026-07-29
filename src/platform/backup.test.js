import { describe, it, expect } from 'vitest'
import { buildBackup, backupFilename, describeBackup, parseBackup } from './backup'
import { emptyDoc, reducer } from '../state/reducer'

const seeded = () => {
  let doc = emptyDoc()
  doc = reducer(doc, {
    type: 'habit/add',
    habit: { name: 'Run', icon: '🏃', category: 'fitness', schedule: { type: 'daily' } }
  })
  doc = reducer(doc, { type: 'habit/toggle', id: doc.habits[0].id, dateKey: '2026-06-01' })
  doc = reducer(doc, {
    type: 'med/add',
    medicine: { name: 'Vitamin D', times: ['08:00'] }
  })
  return doc
}

describe('backup round trip', () => {
  it('restores a document unchanged', () => {
    const doc = seeded()
    expect(parseBackup(buildBackup(doc))).toEqual(doc)
  })

  it('survives a round trip that a real file would take, including the header', () => {
    const doc = seeded()
    const parsed = JSON.parse(buildBackup(doc))
    expect(parsed.app).toBe('liferpg')
    expect(parsed.backupVersion).toBe(1)
    expect(parseBackup(JSON.stringify(parsed)).habits[0].name).toBe('Run')
  })

  it('accepts a bare document, not just the wrapped export', () => {
    const doc = seeded()
    expect(parseBackup(JSON.stringify(doc)).habits).toHaveLength(1)
  })

  it('brings an old document up to the current shape on the way in', () => {
    // No schedule, no skips, no medicines — a Phase 0 era document.
    const old = { habits: [{ id: 'h1', name: 'Read', completions: { '2026-06-01': true } }] }
    const restored = parseBackup(JSON.stringify(old))
    expect(restored.habits[0].schedule).toEqual({ type: 'daily' })
    expect(restored.habits[0].skips).toEqual({})
    expect(restored.medicines).toEqual([])
    expect(restored.settings.theme).toBe('dark')
  })
})

describe('parseBackup rejects bad input', () => {
  it('rejects text that is not JSON', () => {
    expect(() => parseBackup('not json at all')).toThrow(/valid JSON/)
  })

  it('rejects JSON that is not a document', () => {
    expect(() => parseBackup('"a string"')).toThrow(/LifeRPG backup/)
    expect(() => parseBackup('null')).toThrow(/LifeRPG backup/)
  })

  it('rejects an object with no habits array', () => {
    expect(() => parseBackup('{"settings":{}}')).toThrow(/no habits/)
  })
})

describe('presentation', () => {
  it('names the file by local date, never UTC', () => {
    // 00:30 local on the 2nd is still the 2nd, even though UTC has rolled back.
    expect(backupFilename(new Date(2026, 5, 2, 0, 30))).toBe('liferpg-backup-2026-06-02.json')
  })

  it('summarises what is inside so a restore can be confirmed', () => {
    expect(describeBackup(seeded())).toBe('1 habit · 1 completions · 1 medicine')
  })

  it('pluralises an empty document without crashing', () => {
    expect(describeBackup(emptyDoc())).toBe('0 habits · 0 completions')
  })
})
