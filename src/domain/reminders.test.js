import { describe, it, expect } from 'vitest'
import { plannedReminders, normalizeReminders, HORIZON_DAYS, MAX_PENDING } from './reminders'

// 2026-07-30 is a Thursday.
const TODAY = '2026-07-30'
const MORNING = new Date(2026, 6, 30, 7, 0)

const habit = (over = {}) => ({
  id: 'h1',
  name: 'Morning run',
  icon: '🏃',
  category: 'fitness',
  kind: 'build',
  schedule: { type: 'daily' },
  reminders: ['08:00'],
  completions: {},
  skips: {},
  archived: false,
  createdKey: null,
  ...over
})

describe('normalizeReminders', () => {
  it('keeps valid times, deduped and in order', () => {
    expect(normalizeReminders(['21:00', '08:00', '21:00'])).toEqual(['08:00', '21:00'])
  })

  it('throws out anything that would produce an Invalid Date', () => {
    // A hand-edited backup is the realistic source of this.
    expect(normalizeReminders(['8am', '25:00', '12:60', '', null, 7, '09:30'])).toEqual(['09:30'])
    expect(normalizeReminders(undefined)).toEqual([])
    expect(normalizeReminders('08:00')).toEqual([])
  })
})

describe('plannedReminders', () => {
  it('is empty when nothing has a reminder set', () => {
    expect(plannedReminders([habit({ reminders: [] })], TODAY, MORNING)).toEqual([])
    expect(plannedReminders([], TODAY, MORNING)).toEqual([])
  })

  it('fills the horizon for a daily habit, one per day', () => {
    const plan = plannedReminders([habit()], TODAY, MORNING)
    expect(plan).toHaveLength(HORIZON_DAYS)
    expect(plan[0].dateKey).toBe(TODAY)
    expect(plan[0].at.getHours()).toBe(8)
    expect(plan.at(-1).dateKey).toBe('2026-08-19')
  })

  it('drops a slot that has already gone by today', () => {
    // 9pm: this morning's 08:00 is gone, tonight's 21:30 is not.
    const evening = new Date(2026, 6, 30, 21, 0)
    const plan = plannedReminders([habit({ reminders: ['08:00', '21:30'] })], TODAY, evening)

    expect(plan[0]).toMatchObject({ dateKey: TODAY, time: '21:30' })
    expect(plan.filter((r) => r.dateKey === TODAY)).toHaveLength(1)
    // Tomorrow still gets both.
    expect(plan.filter((r) => r.dateKey === '2026-07-31')).toHaveLength(2)
  })

  it('says nothing about a box already ticked', () => {
    const plan = plannedReminders([habit({ completions: { [TODAY]: true } })], TODAY, MORNING)
    expect(plan.some((r) => r.dateKey === TODAY)).toBe(false)
    expect(plan).toHaveLength(HORIZON_DAYS - 1)
  })

  it('only uses the days a weekday habit is actually due', () => {
    // Mon/Wed/Fri, starting from a Thursday.
    const mwf = habit({ schedule: { type: 'weekdays', days: [1, 3, 5] } })
    const plan = plannedReminders([mwf], TODAY, MORNING)

    expect(plan.some((r) => r.dateKey === TODAY)).toBe(false) // Thursday
    expect(plan[0].dateKey).toBe('2026-07-31') // Friday
    expect(plan[1].dateKey).toBe('2026-08-03') // Monday
  })

  it('stops nagging an "n times a week" habit that already hit its target', () => {
    // Mon, Tue, Wed of this week done — three of three.
    const weekly = habit({
      schedule: { type: 'weekly', timesPerWeek: 3 },
      completions: { '2026-07-27': true, '2026-07-28': true, '2026-07-29': true }
    })
    const plan = plannedReminders([weekly], TODAY, MORNING)

    // Nothing left this week (Thu–Sun), but next week starts clean.
    expect(plan.some((r) => r.dateKey <= '2026-08-02')).toBe(false)
    expect(plan[0].dateKey).toBe('2026-08-03')
  })

  it('never schedules a vow — there is nothing to be reminded to do', () => {
    const vow = habit({ id: 'v1', name: 'No smoking', kind: 'quit', relapses: {} })
    expect(plannedReminders([vow], TODAY, MORNING)).toEqual([])
  })

  it('never schedules an archived habit', () => {
    expect(plannedReminders([habit({ archived: true })], TODAY, MORNING)).toEqual([])
  })

  it('never schedules a habit before it existed', () => {
    const plan = plannedReminders([habit({ createdKey: '2026-08-05' })], TODAY, MORNING)
    expect(plan[0].dateKey).toBe('2026-08-05')
  })

  it('sorts soonest first across habits', () => {
    const plan = plannedReminders(
      [
        habit({ id: 'a', name: 'Evening walk', reminders: ['20:00'] }),
        habit({ id: 'b', name: 'Water', reminders: ['09:00'] })
      ],
      TODAY,
      MORNING
    )

    expect(plan.slice(0, 3).map((r) => r.time)).toEqual(['09:00', '20:00', '09:00'])
    for (let i = 1; i < plan.length; i++) {
      expect(plan[i].at >= plan[i - 1].at).toBe(true)
    }
  })

  it('caps the plan, keeping the soonest', () => {
    // Four habits × three times × 21 days is 252 — well past what iOS will hold.
    const many = ['a', 'b', 'c', 'd'].map((id) =>
      habit({ id, name: id, reminders: ['08:00', '13:00', '20:00'] })
    )
    const plan = plannedReminders(many, TODAY, MORNING)

    expect(plan).toHaveLength(MAX_PENDING)
    expect(plan[0].dateKey).toBe(TODAY)
    // What falls off the end is the far future, never the next few days.
    expect(plan.at(-1).at.getTime()).toBeLessThan(new Date(2026, 7, 5).getTime())
  })

  it('respects an explicit lower limit', () => {
    expect(plannedReminders([habit()], TODAY, MORNING, 3)).toHaveLength(3)
  })

  it('carries text that will still be true when it fires', () => {
    const plan = plannedReminders(
      [habit({ schedule: { type: 'weekdays', days: [1, 3, 5] } })],
      TODAY,
      MORNING
    )
    expect(plan[0].title).toBe('🏃 Morning run')
    // Not "2 of 3 this week": this fires days from now and any count taken at
    // plan time would be stale by then.
    expect(plan[0].body).toBe('Mon, Wed, Fri')
  })
})
