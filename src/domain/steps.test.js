import { describe, it, expect } from 'vitest'
import { startDay, fold, goalMet, formatSteps } from './steps'

// The two events this has to survive — a reboot and a midnight — take a day
// each to reproduce on hardware, which is the entire reason the arithmetic
// lives in a pure module instead of inside the plugin.

const MON = '2026-08-10'
const TUE = '2026-08-11'

describe('startDay', () => {
  it('anchors the day at whatever the counter already reads', () => {
    // The counter has been running since boot and owes today nothing.
    expect(startDay(MON, 12000)).toEqual({ dateKey: MON, atMidnight: 12000, last: 12000 })
  })

  it('treats a missing or negative reading as zero', () => {
    expect(startDay(MON, undefined).atMidnight).toBe(0)
    expect(startDay(MON, -5).atMidnight).toBe(0)
  })
})

describe('fold', () => {
  it('counts from the day anchor, not from the raw counter', () => {
    const base = startDay(MON, 12000)
    expect(fold(base, MON, 13500).steps).toBe(1500)
  })

  it('starts a new day at zero and leaves the night to yesterday', () => {
    // Deliberately not splitting a walk across midnight: nobody is owed that
    // precision and guessing would make the number less trustworthy.
    const base = { dateKey: MON, atMidnight: 12000, last: 13500 }
    const { baseline, steps } = fold(base, TUE, 13500)

    expect(steps).toBe(0)
    expect(baseline).toEqual({ dateKey: TUE, atMidnight: 13500, last: 13500 })
  })

  it('starts from scratch when there is no baseline at all', () => {
    expect(fold(null, MON, 900).steps).toBe(0)
    expect(fold(undefined, MON, 900).baseline.dateKey).toBe(MON)
  })

  it('keeps the day total moving across a reboot', () => {
    // 4,000 steps banked, then the phone restarts and the counter drops to 120.
    // Without reboot handling the day would snap back to 120.
    const base = { dateKey: MON, atMidnight: 8000, last: 12000 }
    const { baseline, steps } = fold(base, MON, 120, 4000)

    expect(steps).toBe(4120)
    expect(baseline.last).toBe(120)
  })

  it('carries on correctly after the reboot, without double counting', () => {
    const rebooted = fold({ dateKey: MON, atMidnight: 8000, last: 12000 }, MON, 120, 4000)
    // Another 300 steps on the fresh counter.
    const later = fold(rebooted.baseline, MON, 420, rebooted.steps)

    expect(later.steps).toBe(4420)
  })

  it('never reports a negative day', () => {
    const base = { dateKey: MON, atMidnight: 500, last: 500 }
    // Equal reading, no movement.
    expect(fold(base, MON, 500).steps).toBe(0)
  })

  it('is stable when called repeatedly with the same reading', () => {
    // The app reads on load and on every resume, so this happens constantly.
    const base = startDay(MON, 1000)
    const once = fold(base, MON, 2500)
    const twice = fold(once.baseline, MON, 2500)

    expect(once.steps).toBe(1500)
    expect(twice.steps).toBe(1500)
  })
})

describe('goalMet', () => {
  it('is met at the goal, not just past it', () => {
    expect(goalMet(8000, 8000)).toBe(true)
    expect(goalMet(7999, 8000)).toBe(false)
  })

  it('is never met when there is no goal', () => {
    // Otherwise switching steps on would complete every habit that has no goal.
    expect(goalMet(9999, 0)).toBe(false)
    expect(goalMet(9999, null)).toBe(false)
    expect(goalMet(9999, undefined)).toBe(false)
  })
})

describe('formatSteps', () => {
  it('groups thousands and floors to whole steps', () => {
    expect(formatSteps(8412)).toBe((8412).toLocaleString())
    expect(formatSteps(undefined)).toBe('0')
    expect(formatSteps(-3)).toBe('0')
  })
})

describe('the crossing rule', () => {
  // Auto-completion fires on the transition into a met goal, never on the
  // standing fact of one. `useSteps` expresses that as
  // `goalMet(after) && !goalMet(before)`, and this pins the truth table so the
  // undo behaviour cannot quietly regress.
  const crossed = (before, after, goal) => goalMet(after, goal) && !goalMet(before, goal)

  it('fires once, when the goal is first reached', () => {
    expect(crossed(7900, 8000, 8000)).toBe(true)
  })

  it('does not fire again on further steps', () => {
    // This is what makes an auto-tick undoable: untick at 8,000 and walking
    // another hundred must not silently re-tick it.
    expect(crossed(8000, 8100, 8000)).toBe(false)
  })

  it('fires on a first reading that is already past the goal', () => {
    // The app was not opened all day and the counter has been running.
    expect(crossed(0, 12000, 8000)).toBe(true)
  })

  it('never fires for a habit with no goal', () => {
    expect(crossed(0, 12000, 0)).toBe(false)
  })
})
