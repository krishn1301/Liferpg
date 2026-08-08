import { describe, it, expect } from 'vitest'
import { statBlock, status, STAT_FLOOR } from './status'
import { CATEGORIES } from './constants'

const TODAY = '2026-07-31'

const habit = (over = {}) => ({
  id: 'h1',
  name: 'Run',
  category: 'fitness',
  kind: 'build',
  schedule: { type: 'daily' },
  completions: {},
  skips: {},
  archived: false,
  createdKey: null,
  ...over
})

/** `n` completions on distinct days ending yesterday. */
const completions = (n) =>
  Object.fromEntries(
    Array.from({ length: n }, (_, i) => [`2026-07-${String(30 - i).padStart(2, '0')}`, true])
  )

describe('statBlock', () => {
  it('always returns all eight categories, in declaration order', () => {
    const block = statBlock([], TODAY)
    expect(block).toHaveLength(8)
    expect(block.map((s) => s.key)).toEqual(Object.keys(CATEGORIES))
  })

  it('sits every untouched category at the floor', () => {
    // A category with no habits still appears — an absent row would make the
    // sheet reshuffle as habits come and go.
    expect(statBlock([], TODAY).every((s) => s.value === STAT_FLOOR)).toBe(true)
  })

  it('raises a stat one point per five completions', () => {
    const block = statBlock([habit({ completions: completions(12) })], TODAY)
    const fitness = block.find((s) => s.key === 'fitness')

    expect(fitness.total).toBe(12)
    expect(fitness.value).toBe(STAT_FLOOR + 2)
    // Two of the five needed for the next point.
    expect(fitness.progress).toBeCloseTo(0.4)
  })

  it('adds up several habits in the same category', () => {
    const block = statBlock(
      [
        habit({ id: 'a', completions: completions(4) }),
        habit({ id: 'b', completions: completions(6) })
      ],
      TODAY
    )
    expect(block.find((s) => s.key === 'fitness').total).toBe(10)
  })

  it('counts a vow clean days, since it has no completions to count', () => {
    const vow = habit({
      id: 'v1',
      name: 'No smoking',
      kind: 'quit',
      category: 'health',
      createdKey: '2026-07-01',
      relapses: {},
      completions: {}
    })
    // 1 July to 31 July: thirty whole days banked.
    expect(statBlock([vow], TODAY).find((s) => s.key === 'health').total).toBe(30)
  })

  it('ignores archived habits', () => {
    const block = statBlock([habit({ completions: completions(20), archived: true })], TODAY)
    expect(block.find((s) => s.key === 'fitness').value).toBe(STAT_FLOOR)
  })

  it('files an unknown category under personal rather than dropping it', () => {
    const block = statBlock([habit({ category: 'nonsense', completions: completions(5) })], TODAY)
    expect(block.find((s) => s.key === 'personal').total).toBe(5)
    expect(block).toHaveLength(8)
  })
})

describe('status', () => {
  it('bundles the block and the title, and no longer a job', () => {
    const s = status([habit({ completions: completions(5) })], TODAY)
    expect(s.block).toHaveLength(8)
    expect(s).not.toHaveProperty('job')
  })

  it('is honest when nothing has been earned', () => {
    // Not a flattering placeholder, and not "Fitness" for being first in the
    // category list — which is what the title used to be.
    expect(status([], TODAY).title).toBe('Unranked')
  })

  it('titles from badges rather than from the strongest category', () => {
    // Five habits earns Habit Master. The old title would have said "Fitness"
    // here, which is a category name doing duty as an achievement.
    const habits = Array.from({ length: 5 }, (_, i) =>
      habit({ id: `h${i}`, completions: completions(1) })
    )
    expect(status(habits, TODAY).title).toBe('Habit Master')
  })
})
