import { registerPlugin } from '@capacitor/core'
import { canCountSteps } from './device'

// The only file that talks to the pedometer. Everything about *what a reading
// means* is pure and lives in domain/steps.js.
//
// Every function here is safe to call on any platform: in a browser
// `canCountSteps` is false and they answer "unavailable", so callers never have
// to guard. Same contract as platform/reminders.js.

const StepCounter = registerPlugin('StepCounter')

/** Nothing is known and nothing can be read. The browser's permanent answer. */
const UNAVAILABLE = { available: false, granted: false }

/**
 * Can we read steps, and are we allowed to?
 *
 * Returns both, because they are different problems with different copy: a
 * phone with no pedometer is not a phone with a denied permission, and telling
 * someone to check their settings when the hardware simply is not there wastes
 * their time.
 */
export async function stepPermission() {
  if (!canCountSteps) return UNAVAILABLE
  try {
    const { granted, available } = await StepCounter.checkPermission()
    return { available: Boolean(available), granted: Boolean(granted) }
  } catch {
    return UNAVAILABLE
  }
}

/**
 * Ask for the activity-recognition permission.
 *
 * Called when someone turns steps on, never at launch — the same rule the
 * reminder prompt follows, and for the same reason: a permission dialog fired
 * before the user has asked for the feature is how an app collects a permanent
 * Deny it cannot recover from.
 */
export async function requestStepPermission() {
  if (!canCountSteps) return UNAVAILABLE
  try {
    const { granted, available } = await StepCounter.requestPermission()
    return { available: Boolean(available), granted: Boolean(granted) }
  } catch {
    return UNAVAILABLE
  }
}

/**
 * The counter's current value, in steps since the device booted.
 *
 * `null` means "no reading" — no sensor, no permission, or the sensor did not
 * report in time. Callers must treat that as "leave the number alone", never as
 * zero: writing a zero would wipe a day's steps every time the app opened on a
 * phone that had just denied the permission.
 */
export async function readStepCounter() {
  if (!canCountSteps) return null
  try {
    const { available, sinceBoot } = await StepCounter.read()
    if (!available || typeof sinceBoot !== 'number') return null
    return sinceBoot
  } catch {
    return null
  }
}
