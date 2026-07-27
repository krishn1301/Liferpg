import { Preferences } from '@capacitor/preferences'
import { Capacitor } from '@capacitor/core'

// The whole app is one JSON document under one key. Small enough that partial
// writes buy nothing, and a single document means reads can never see a
// half-updated state across keys.
//
// @capacitor/preferences has a web implementation backed by localStorage, so
// this file is the only place that differs between Android and the browser —
// and in practice it doesn't differ at all.
const KEY = 'liferpg.doc.v1'

export const isNative = Capacitor.isNativePlatform()
export const platform = Capacitor.getPlatform() // 'android' | 'web'

/** Read the document. Returns null when nothing has ever been saved. */
export async function load() {
  const { value } = await Preferences.get({ key: KEY })
  if (!value) return null
  try {
    return JSON.parse(value)
  } catch (err) {
    // Corrupt payload: keep a copy so the user's data isn't silently destroyed,
    // then start clean rather than crashing on every launch.
    console.error('Corrupt store, quarantining:', err)
    await Preferences.set({ key: `${KEY}.corrupt.${Date.now()}`, value })
    return null
  }
}

/** Overwrite the document. */
export async function save(doc) {
  await Preferences.set({ key: KEY, value: JSON.stringify(doc) })
}

/** Wipe everything this app has stored. */
export async function clear() {
  await Preferences.remove({ key: KEY })
}

/**
 * Trailing-debounced saver. UI state updates land immediately; disk writes
 * coalesce so a burst of taps doesn't serialise the document once per tap.
 */
export function createDebouncedSaver(delayMs = 400) {
  let timer = null
  let pending = null

  const flush = async () => {
    if (timer) {
      clearTimeout(timer)
      timer = null
    }
    if (pending === null) return
    const doc = pending
    pending = null
    await save(doc)
  }

  return {
    queue(doc) {
      pending = doc
      if (timer) clearTimeout(timer)
      timer = setTimeout(flush, delayMs)
    },
    flush
  }
}
