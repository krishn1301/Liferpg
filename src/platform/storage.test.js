import { describe, it, expect, vi, beforeEach } from 'vitest'

// The real plugin needs a browser/native bridge; we only care about the
// debounce behaviour layered on top of it.
const store = new Map()
const setSpy = vi.fn(async ({ key, value }) => void store.set(key, value))

vi.mock('@capacitor/preferences', () => ({
  Preferences: {
    get: async ({ key }) => ({ value: store.get(key) ?? null }),
    set: setSpy,
    remove: async ({ key }) => void store.delete(key)
  }
}))

vi.mock('@capacitor/core', () => ({
  Capacitor: { isNativePlatform: () => false, getPlatform: () => 'web' }
}))

const { createDebouncedSaver, load, save } = await import('./storage')

describe('storage', () => {
  beforeEach(() => {
    store.clear()
    setSpy.mockClear()
    vi.useRealTimers()
  })

  it('round-trips a document', async () => {
    await save({ habits: [{ id: 1, name: 'Run' }], xp: 40 })
    expect(await load()).toEqual({ habits: [{ id: 1, name: 'Run' }], xp: 40 })
  })

  it('returns null when nothing has been saved', async () => {
    expect(await load()).toBeNull()
  })

  it('quarantines a corrupt payload instead of throwing', async () => {
    store.set('liferpg.doc.v1', '{ this is not json')
    expect(await load()).toBeNull()
    // the bad payload is preserved under a different key, not destroyed
    const quarantined = [...store.keys()].filter((k) => k.includes('corrupt'))
    expect(quarantined).toHaveLength(1)
  })

  it('coalesces a burst of queued writes into a single disk write', async () => {
    vi.useFakeTimers()
    const saver = createDebouncedSaver(400)

    saver.queue({ xp: 1 })
    saver.queue({ xp: 2 })
    saver.queue({ xp: 3 })
    expect(setSpy).not.toHaveBeenCalled()

    await vi.advanceTimersByTimeAsync(400)
    expect(setSpy).toHaveBeenCalledTimes(1)
    expect(JSON.parse(setSpy.mock.calls[0][0].value)).toEqual({ xp: 3 })
  })

  it('flush writes immediately without waiting for the timer', async () => {
    const saver = createDebouncedSaver(10_000)
    saver.queue({ xp: 7 })
    await saver.flush()
    expect(setSpy).toHaveBeenCalledTimes(1)

    // a second flush with nothing pending must not write again
    await saver.flush()
    expect(setSpy).toHaveBeenCalledTimes(1)
  })
})
