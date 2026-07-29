import { describe, it, expect } from 'vitest'
import { reducer, emptyDoc, migrate } from './reducer'
import { doseId } from '../domain/medicines'

const TODAY = '2026-06-03'

const withMed = (over = {}) => {
  const doc = reducer(emptyDoc(), {
    type: 'med/add',
    medicine: { name: 'Vitamin D', times: ['08:00', '22:00'], ...over },
    todayKey: TODAY
  })
  return { doc, med: doc.medicines[0] }
}

describe('medicine actions', () => {
  it('adds a medicine with defaults filled in', () => {
    const { med } = withMed()
    expect(med).toMatchObject({
      name: 'Vitamin D',
      icon: '💊',
      dose: '',
      archived: false,
      endKey: null,
      schedule: { type: 'daily' }
    })
    expect(med.id).toBeTruthy()
  })

  it('starts the course today, so a new medicine has not already missed doses', () => {
    const { med } = withMed()
    expect(med.startKey).toBe(TODAY)
  })

  it('keeps an explicit start date the user chose', () => {
    const { med } = withMed({ startKey: '2026-05-01' })
    expect(med.startKey).toBe('2026-05-01')
  })

  it('dedupes times so a dose can never render twice', () => {
    const { med } = withMed({ times: ['08:00', '08:00', '22:00'] })
    expect(med.times).toEqual(['08:00', '22:00'])
  })

  it('updates and deletes by id', () => {
    const { doc, med } = withMed()
    const renamed = reducer(doc, { type: 'med/update', id: med.id, changes: { dose: '2000IU' } })
    expect(renamed.medicines[0].dose).toBe('2000IU')
    expect(reducer(renamed, { type: 'med/delete', id: med.id }).medicines).toEqual([])
  })

  it('normalises a bad schedule on update rather than storing it', () => {
    const { doc, med } = withMed()
    const bad = reducer(doc, {
      type: 'med/update',
      id: med.id,
      changes: { schedule: { type: 'weekdays', days: [] } }
    })
    // No days selected can never come due, so it falls back to daily.
    expect(bad.medicines[0].schedule).toEqual({ type: 'daily' })
  })
})

describe('med/toggleDose', () => {
  it('marks a dose taken and then untaken, deleting rather than storing false', () => {
    const { doc, med } = withMed()
    const id = doseId(med.id, '08:00')

    const taken = reducer(doc, { type: 'med/toggleDose', dateKey: '2026-06-01', doseId: id })
    expect(taken.dailyLogs['2026-06-01'].meds).toEqual({ [id]: true })

    const undone = reducer(taken, { type: 'med/toggleDose', dateKey: '2026-06-01', doseId: id })
    expect(undone.dailyLogs['2026-06-01'].meds).toEqual({})
    expect(id in undone.dailyLogs['2026-06-01'].meds).toBe(false)
  })

  it('keeps the two doses of one day independent', () => {
    const { doc, med } = withMed()
    const morning = doseId(med.id, '08:00')
    const night = doseId(med.id, '22:00')

    let next = reducer(doc, { type: 'med/toggleDose', dateKey: '2026-06-01', doseId: morning })
    next = reducer(next, { type: 'med/toggleDose', dateKey: '2026-06-01', doseId: night })
    next = reducer(next, { type: 'med/toggleDose', dateKey: '2026-06-01', doseId: morning })

    expect(next.dailyLogs['2026-06-01'].meds).toEqual({ [night]: true })
  })

  it('does not disturb other fields already logged for that day', () => {
    const { doc, med } = withMed()
    const withNote = reducer(doc, {
      type: 'log/set',
      dateKey: '2026-06-01',
      field: 'mood',
      value: 4
    })
    const next = reducer(withNote, {
      type: 'med/toggleDose',
      dateKey: '2026-06-01',
      doseId: doseId(med.id, '08:00')
    })
    expect(next.dailyLogs['2026-06-01'].mood).toBe(4)
  })
})

describe('routine block actions', () => {
  const add = (doc, block) => reducer(doc, { type: 'block/add', block })

  it('keeps blocks sorted by start time however they are added', () => {
    let doc = emptyDoc()
    doc = add(doc, { label: 'Evening', start: '19:00', end: '20:00' })
    doc = add(doc, { label: 'Morning', start: '07:00', end: '08:00' })
    doc = add(doc, { label: 'Lunch', start: '12:00', end: '13:00' })
    expect(doc.routineBlocks.map((b) => b.label)).toEqual(['Morning', 'Lunch', 'Evening'])
  })

  it('re-sorts after an edit moves a block', () => {
    let doc = emptyDoc()
    doc = add(doc, { label: 'A', start: '07:00', end: '08:00' })
    doc = add(doc, { label: 'B', start: '09:00', end: '10:00' })
    const moved = reducer(doc, {
      type: 'block/update',
      id: doc.routineBlocks[0].id,
      changes: { start: '11:00', end: '12:00' }
    })
    expect(moved.routineBlocks.map((b) => b.label)).toEqual(['B', 'A'])
  })

  it('clamps an end that falls before the start instead of storing it', () => {
    const doc = add(emptyDoc(), { label: 'Backwards', start: '10:00', end: '09:00' })
    expect(doc.routineBlocks[0].end).toBe('10:00')
  })

  it('deletes by id', () => {
    const doc = add(emptyDoc(), { label: 'A', start: '07:00', end: '08:00' })
    expect(reducer(doc, { type: 'block/delete', id: doc.routineBlocks[0].id }).routineBlocks)
      .toEqual([])
  })
})

describe('migrate', () => {
  it('normalises medicines and blocks stored by an older build', () => {
    const raw = {
      habits: [],
      medicines: [{ id: 'm1', name: 'Old', times: ['08:00', '08:00'] }],
      routineBlocks: [
        { id: 'b2', label: 'Late', start: '20:00', end: '21:00' },
        { id: 'b1', label: 'Early', start: '06:00', end: '07:00' }
      ]
    }
    const doc = migrate(raw)
    expect(doc.medicines[0].times).toEqual(['08:00'])
    expect(doc.medicines[0].schedule).toEqual({ type: 'daily' })
    expect(doc.routineBlocks.map((b) => b.label)).toEqual(['Early', 'Late'])
  })

  it('fills in collections a very old document never had', () => {
    const doc = migrate({ habits: [] })
    expect(doc.medicines).toEqual([])
    expect(doc.routineBlocks).toEqual([])
    expect(doc.dailyLogs).toEqual({})
  })
})
