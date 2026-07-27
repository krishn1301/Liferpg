// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest'
import { act } from 'react'
import { createRoot } from 'react-dom/client'

// The desktop app died because a component threw on its very first render and
// nothing caught it — a blank window with no error anywhere the user could see.
// This test exists so that failure mode can never ship silently again.

const store = new Map()
vi.mock('@capacitor/preferences', () => ({
  Preferences: {
    get: async ({ key }) => ({ value: store.get(key) ?? null }),
    set: async ({ key, value }) => void store.set(key, value),
    remove: async ({ key }) => void store.delete(key)
  }
}))
vi.mock('@capacitor/core', () => ({
  Capacitor: { isNativePlatform: () => false, getPlatform: () => 'web' }
}))

vi.stubGlobal('__APP_VERSION__', '0.0.1-test')

const { default: App } = await import('./App')

async function render() {
  const container = document.createElement('div')
  document.body.appendChild(container)
  const root = createRoot(container)
  await act(async () => root.render(<App />))
  return { container, unmount: () => act(() => root.unmount()) }
}

describe('App', () => {
  it('mounts and reaches a settled state without throwing', async () => {
    const { container, unmount } = await render()
    expect(container.textContent).toContain('LifeRPG')
    expect(container.textContent).not.toContain('FAILED')
    unmount()
  })

  it('round-trips through native storage and counts the launch', async () => {
    store.clear()
    const first = await render()
    expect(first.container.textContent).toContain('launch #1')
    first.unmount()

    // Simulates closing and reopening the app: state must come back from disk.
    const second = await render()
    expect(second.container.textContent).toContain('launch #2')
    second.unmount()
  })
})
