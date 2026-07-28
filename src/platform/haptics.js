import { Haptics, ImpactStyle } from '@capacitor/haptics'
import { Capacitor } from '@capacitor/core'

// Haptics are native-only. On the web this is a no-op rather than a guard the
// caller has to remember — screens shouldn't know which platform they're on.
const enabled = Capacitor.isNativePlatform()

const STYLES = {
  light: ImpactStyle.Light,
  medium: ImpactStyle.Medium,
  heavy: ImpactStyle.Heavy
}

/** A short tap for a completed action. Never throws; feedback isn't worth a crash. */
export function tap(strength = 'light') {
  if (!enabled) return
  Haptics.impact({ style: STYLES[strength] ?? ImpactStyle.Light }).catch(() => {})
}

/** Slightly heavier, for something finished — a streak extended, a level gained. */
export function success() {
  if (!enabled) return
  Haptics.notification().catch(() => {})
}
