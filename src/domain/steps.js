// Turning a hardware counter into "steps today".
//
// Android's TYPE_STEP_COUNTER reports steps since the device last booted. It is
// cumulative, it survives the app being closed, and it resets to zero on
// reboot. None of that is what a daily log wants, so this module owns the
// arithmetic that converts one into the other — pure, so it can be tested
// against reboots and midnights that would take days to reproduce on hardware.
//
// **This shape is Android's, not the feature's.** HealthKit answers "how many
// steps on this date" directly, so the iOS target will skip all of this and
// write the daily total straight into the log. What both platforms share is the
// output: a number of steps against a date key. Nothing above this module knows
// which way the number was arrived at.

/**
 * The bookkeeping the counter needs between readings.
 *
 * Stored, unlike almost everything else in this app, and it has to be: a
 * cumulative counter cannot be re-derived from history. It is not a *score*
 * though — it is a meter reading, the same category of thing as the odometer
 * value you write down to work out a journey.
 *
 * @typedef {{ dateKey: string, atMidnight: number, last: number }} StepBaseline
 * `atMidnight` is what the counter read when the day started, so that today's
 * steps are `reading - atMidnight`. After a reboot it becomes a plain offset
 * and can go negative — the subtraction is what matters, not the label.
 * `last` is the most recent reading, kept only to notice the counter resetting.
 */

/** A fresh baseline for a day, given what the counter reads right now. */
export function startDay(dateKey, sinceBoot) {
  const reading = Math.max(0, Math.floor(sinceBoot ?? 0))
  return { dateKey, atMidnight: reading, last: reading }
}

/**
 * Fold a new reading into the baseline, returning the baseline and the day's
 * total together.
 *
 * Three things can have happened since the last reading:
 *
 * 1. **The day rolled over.** Today starts from the current reading, and
 *    whatever the counter did overnight belongs to yesterday. We do not try to
 *    split a walk that crossed midnight; nobody is owed that precision and
 *    guessing at it would make the number less trustworthy, not more.
 * 2. **The device rebooted.** The counter restarts at zero, so a reading lower
 *    than the last one is the only evidence we get — there is no reboot event
 *    to listen for. Steps taken before the reboot are already banked in the
 *    day's total, so the baseline drops to zero and today's count carries on
 *    from what it had reached. The walk during the reboot itself is lost, which
 *    is a handful of steps and honest to lose.
 * 3. **Nothing unusual.** Today is the reading minus the day's starting value.
 *
 * @param {StepBaseline | null | undefined} baseline
 * @param {string} dateKey today
 * @param {number} sinceBoot the counter's current value
 * @param {number} bankedToday steps already recorded for `dateKey`
 * @returns {{ baseline: StepBaseline, steps: number }}
 */
export function fold(baseline, dateKey, sinceBoot, bankedToday = 0) {
  const reading = Math.max(0, Math.floor(sinceBoot ?? 0))
  const banked = Math.max(0, Math.floor(bankedToday ?? 0))

  // No baseline, or one from another day: today starts here.
  if (!baseline || baseline.dateKey !== dateKey) {
    return { baseline: startDay(dateKey, reading), steps: 0 }
  }

  // Rebooted. Re-anchor at zero and keep what the day had already banked, so
  // the total moves forward rather than snapping back to a few dozen steps.
  if (reading < baseline.last) {
    return {
      baseline: { dateKey, atMidnight: -banked, last: reading },
      steps: banked + reading
    }
  }

  return {
    baseline: { ...baseline, last: reading },
    steps: Math.max(0, reading - baseline.atMidnight)
  }
}

/**
 * Has a step goal been met?
 *
 * A goal of zero or nothing is not a goal, and must never read as "met" — a
 * habit with no goal set would otherwise complete itself the moment steps were
 * switched on.
 */
export function goalMet(steps, goal) {
  if (!goal || goal <= 0) return false
  return (steps ?? 0) >= goal
}

/** Steps carry thousands separators everywhere they are shown. */
export function formatSteps(steps) {
  return Math.max(0, Math.floor(steps ?? 0)).toLocaleString()
}
