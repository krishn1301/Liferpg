// What this build can actually do on the device it is running on.
//
// The app ships two ways from one codebase: a Capacitor APK on Android and an
// installed PWA on iPhone. They are not equivalent, and the interface says so
// rather than offering controls that silently do nothing — see DESIGN.md,
// "Platform truth".

import { Capacitor } from '@capacitor/core'

/**
 * iOS, including iPadOS 13+, which reports itself as a Mac. The touch-point
 * check is the only reliable way to tell an iPad from a desktop Safari, and
 * getting it wrong would show a desktop user an iPhone-specific warning.
 *
 * Guarded for jsdom and for any environment without a navigator.
 */
export const isIOS =
  typeof navigator !== 'undefined' &&
  (/iP(hone|od|ad)/.test(navigator.userAgent ?? '') ||
    ((navigator.userAgent ?? '').includes('Macintosh') && (navigator.maxTouchPoints ?? 0) > 1))

/** Running from the home screen rather than inside a browser tab. */
export const isStandalone =
  typeof window !== 'undefined' &&
  (window.navigator?.standalone === true ||
    window.matchMedia?.('(display-mode: standalone)')?.matches === true)

/**
 * Can this build schedule a reminder at all?
 *
 * Only the native Android build can. iOS Safari has no scheduled local
 * notification API — there is no Notification Triggers implementation — and
 * Web Push would need a server, which contradicts the app being offline-only.
 */
export const canRemind = Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'android'

/**
 * Ask the browser to make our storage durable.
 *
 * All data lives in localStorage via @capacitor/preferences. On iOS, script-
 * writable storage for a site the user has not "engaged with" can be evicted
 * after a period of disuse, which for a habit tracker means losing months of
 * history. A granted persistence request takes it out of the evictable pool.
 *
 * Best-effort by design: it is unavailable in the Android WebView and in jsdom,
 * some browsers decide without prompting, and a refusal is not an error worth
 * showing anyone. Export remains the real answer, which is why it stays
 * prominent in Settings.
 */
export async function requestPersistentStorage() {
  try {
    if (!navigator.storage?.persist) return false
    if (await navigator.storage.persisted?.()) return true
    return await navigator.storage.persist()
  } catch {
    return false
  }
}
