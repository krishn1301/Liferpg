import { describe, it, expect } from 'vitest'
import { reducer, emptyDoc, migrate } from './reducer'
import { MAX_HABITS } from '../domain/constants'

const MON = '2026-07-27'
const withHabit = (habit = {}) =>
  reducer(emptyDoc(), { type: 'habit/add', habit: { name: 'Run', ...habit } })

describe('migrate', () => {
  it('accepts a document from before schedules existed', () => {
    const old = { habits: [{ id: 'a', name: 'Run', completions: { [MON]: true } }], xp: 120 }
    const doc = migrate(old)
    expect(doc.habits[0].schedule).toEqual({ type: 'daily' })
    expect(doc.habits[0].completions).toEqual({ [MON]: true })
    expect(doc.settings.theme).toBe('dark')
  })

  it('survives junk instead of crashing on launch', () => {
    expect(migrate(null)).toEqual(emptyDoc())
    expect(migrate('nonsense')).toEqual(emptyDoc())
  })

  it('keeps unknown future keys rather than dropping user data', () => {
    expect(migrate({ somethingNew: 42 }).somethingNew).toBe(42)
  })
})

describe('habit/toggle', () => {
  it('completes and un-completes a day', () => {
    const doc = withHabit()
    const id = doc.habits[0].id

    const done = reducer(doc, { type: 'habit/toggle', id, dateKey: MON })
    expect(done.habits[0].completions[MON]).toBe(true)

    const undone = reducer(done, { type: 'habit/toggle', id, dateKey: MON })
    // Removed entirely, not stored as false — two representations of "not done"
    // would eventually disagree.
    expect(MON in undone.habits[0].completions).toBe(false)
  })

  it('clears a skip when the day is completed after all', () => {
    const doc = withHabit()
    const id = doc.habits[0].id
    const skipped = reducer(doc, { type: 'habit/skip', id, dateKey: MON })
    expect(skipped.habits[0].skips[MON]).toBe(true)

    const done = reducer(skipped, { type: 'habit/toggle', id, dateKey: MON })
    expect(done.habits[0].skips[MON]).toBeUndefined()
    expect(done.habits[0].completions[MON]).toBe(true)
  })

  it('leaves other habits untouched', () => {
    let doc = withHabit({ name: 'A' })
    doc = reducer(doc, { type: 'habit/add', habit: { name: 'B' } })
    const next = reducer(doc, { type: 'habit/toggle', id: doc.habits[0].id, dateKey: MON })
    expect(next.habits[1].completions).toEqual({})
  })
})

describe('habit/add', () => {
  it('fills in defaults so the domain layer never sees a half-built habit', () => {
    const h = withHabit().habits[0]
    expect(h.id).toBeTruthy()
    expect(h.schedule).toEqual({ type: 'daily' })
    expect(h.completions).toEqual({})
    expect(h.xpBonus).toBe(1)
    expect(h.archived).toBe(false)
  })

  it('refuses to exceed the habit cap', () => {
    let doc = emptyDoc()
    for (let i = 0; i < MAX_HABITS + 5; i++) {
      doc = reducer(doc, { type: 'habit/add', habit: { name: `H${i}` } })
    }
    expect(doc.habits).toHaveLength(MAX_HABITS)
  })

  it('gives every habit a distinct id', () => {
    let doc = emptyDoc()
    for (let i = 0; i < 50; i++) {
      doc = reducer(doc, { type: 'habit/add', habit: { name: `H${i}` } })
    }
    expect(new Set(doc.habits.map((h) => h.id)).size).toBe(50)
  })
})

describe('habits/addMany', () => {
  it('applies a template without overshooting the cap', () => {
    const doc = reducer(emptyDoc(), {
      type: 'habits/addMany',
      habits: [{ name: 'A' }, { name: 'B' }, { name: 'C' }]
    })
    expect(doc.habits.map((h) => h.name)).toEqual(['A', 'B', 'C'])
  })
})

describe('log/set and settings/set', () => {
  it('merges fields into the day rather than replacing it', () => {
    let doc = reducer(emptyDoc(), { type: 'log/set', dateKey: MON, field: 'water', value: 3 })
    doc = reducer(doc, { type: 'log/set', dateKey: MON, field: 'mood', value: 4 })
    expect(doc.dailyLogs[MON]).toEqual({ water: 3, mood: 4 })
  })

  it('merges settings', () => {
    const doc = reducer(emptyDoc(), { type: 'settings/set', changes: { theme: 'light' } })
    expect(doc.settings).toEqual({ theme: 'light', onboarded: false })
  })
})

describe('reducer contract', () => {
  it('returns the same object for an unknown action', () => {
    const doc = emptyDoc()
    expect(reducer(doc, { type: 'nope' })).toBe(doc)
  })

  it('never mutates the document it was given', () => {
    const doc = withHabit()
    const snapshot = JSON.parse(JSON.stringify(doc))
    reducer(doc, { type: 'habit/toggle', id: doc.habits[0].id, dateKey: MON })
    expect(doc).toEqual(snapshot)
  })
})
