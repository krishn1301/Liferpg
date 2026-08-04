// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { watchForUpdates } from './updates'

// A stand-in for navigator.serviceWorker: an event target with a controller.
function fakeSW(controller) {
  const target = new EventTarget()
  return {
    controller,
    addEventListener: target.addEventListener.bind(target),
    removeEventListener: target.removeEventListener.bind(target),
    claim: () => target.dispatchEvent(new Event('controllerchange'))
  }
}

const install = (sw) =>
  Object.defineProperty(navigator, 'serviceWorker', { value: sw, configurable: true })

describe('watchForUpdates', () => {
  beforeEach(() => vi.useFakeTimers())
  afterEach(() => vi.useRealTimers())

  it('reloads when a new worker takes over a page that already had one', () => {
    const sw = fakeSW({})
    install(sw)
    const reload = vi.fn()

    watchForUpdates(reload)
    sw.claim()

    expect(reload).toHaveBeenCalledTimes(1)
  })

  it('does not reload on a first visit', () => {
    // No controller yet, so this is the very first worker claiming the page —
    // reloading an app somebody just opened would be a flash for nothing.
    const sw = fakeSW(null)
    install(sw)
    const reload = vi.fn()

    watchForUpdates(reload)
    sw.claim()

    expect(reload).not.toHaveBeenCalled()
  })

  it('reloads at most once', () => {
    const sw = fakeSW({})
    install(sw)
    const reload = vi.fn()

    watchForUpdates(reload)
    sw.claim()
    sw.claim()

    expect(reload).toHaveBeenCalledTimes(1)
  })

  it('leaves a session in progress alone', () => {
    // Yanking the page out from under someone mid-tap is worse than showing
    // them yesterday's build; the worker has claimed it, so the next launch
    // picks the update up anyway.
    const sw = fakeSW({})
    install(sw)
    const reload = vi.fn()

    watchForUpdates(reload)
    vi.advanceTimersByTime(11_000)
    sw.claim()

    expect(reload).not.toHaveBeenCalled()
  })

  it('survives a platform with no service worker at all', () => {
    install(undefined)
    expect(() => watchForUpdates(vi.fn())).not.toThrow()
  })

  it('detaches when told to', () => {
    const sw = fakeSW({})
    install(sw)
    const reload = vi.fn()

    watchForUpdates(reload)()
    sw.claim()

    expect(reload).not.toHaveBeenCalled()
  })
})
