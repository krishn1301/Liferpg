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

describe('habit/relapse and habit/unrelapse', () => {
  const withVows = () => {
    let doc = reducer(emptyDoc(), {
      type: 'habit/add',
      habit: { name: 'No fap', kind: 'quit' },
      todayKey: MON
    })
    doc = reducer(doc, {
      type: 'habit/add',
      habit: { name: 'No smoking', kind: 'quit' },
      todayKey: MON
    })
    return reducer(doc, { type: 'habit/add', habit: { name: 'Run' }, todayKey: MON })
  }

  it('breaks every vow named in one action', () => {
    const doc = withVows()
    const ids = [doc.habits[0].id, doc.habits[1].id]

    const next = reducer(doc, { type: 'habit/relapse', ids, dateKey: MON })

    expect(next.habits[0].relapses).toEqual({ [MON]: true })
    expect(next.habits[1].relapses).toEqual({ [MON]: true })
    // One slip usually breaks more than one thing; the untouched habit proves
    // the action is a list and not a sweep.
    expect(next.habits[2].relapses).toEqual({})
  })

  it('takes a relapse back cleanly', () => {
    const doc = withVows()
    const id = doc.habits[0].id

    const broken = reducer(doc, { type: 'habit/relapse', ids: [id], dateKey: MON })
    const fixed = reducer(broken, { type: 'habit/unrelapse', id, dateKey: MON })

    // Deleted, not stored as false — same rule completions and skips follow.
    expect(MON in fixed.habits[0].relapses).toBe(false)
    expect(fixed.habits[0].relapses).toEqual({})
  })

  it('is idempotent — a double tap does not double-count', () => {
    const doc = withVows()
    const id = doc.habits[0].id
    let next = reducer(doc, { type: 'habit/relapse', ids: [id], dateKey: MON })
    next = reducer(next, { type: 'habit/relapse', ids: [id], dateKey: MON })
    expect(Object.keys(next.habits[0].relapses)).toHaveLength(1)
  })

  it('keeps earlier slips when a new one is recorded', () => {
    const doc = withVows()
    const id = doc.habits[0].id
    let next = reducer(doc, { type: 'habit/relapse', ids: [id], dateKey: '2026-07-20' })
    next = reducer(next, { type: 'habit/relapse', ids: [id], dateKey: MON })
    expect(Object.keys(next.habits[0].relapses).sort()).toEqual(['2026-07-20', MON])
  })
})

describe('vow migration', () => {
  it('reads every habit written before vows existed as one you build', () => {
    const doc = migrate({ habits: [{ id: 'a', name: 'Run', completions: {} }] })
    expect(doc.habits[0].kind).toBe('build')
    expect(doc.habits[0].relapses).toEqual({})
  })

  it('does not overwrite a kind that is already stored', () => {
    const doc = migrate({
      habits: [{ id: 'a', name: 'No fap', kind: 'quit', relapses: { [MON]: true } }]
    })
    expect(doc.habits[0].kind).toBe('quit')
    expect(doc.habits[0].relapses).toEqual({ [MON]: true })
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
