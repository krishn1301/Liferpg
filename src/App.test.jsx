// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { act } from 'react'
import { createRoot } from 'react-dom/client'

// The desktop app died because a component threw on its very first render and
// nothing caught it — a blank window with no error anywhere the user could see.
// These tests exist so that failure mode can never ship silently again.

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
vi.mock('@capacitor/app', () => ({
  App: { addListener: async () => ({ remove: () => {} }), exitApp: () => {} }
}))
vi.mock('@capacitor/haptics', () => ({
  Haptics: { impact: async () => {}, notification: async () => {} },
  ImpactStyle: { Light: 'LIGHT', Medium: 'MEDIUM', Heavy: 'HEAVY' }
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

const click = async (el) => act(async () => el.dispatchEvent(new MouseEvent('click', { bubbles: true })))

describe('App', () => {
  beforeEach(() => {
    store.clear()
    window.location.hash = ''
  })

  it('mounts past the splash and lands on Today without throwing', async () => {
    const { container, unmount } = await render()
    expect(container.textContent).toMatch(/Good (morning|afternoon|evening)/)
    expect(container.textContent).toContain('No habits yet')
    unmount()
  })

  it('renders every bottom tab', async () => {
    const { container, unmount } = await render()
    for (const label of ['Today', 'Habits', 'Stats', 'My Day', 'More']) {
      expect(container.textContent).toContain(label)
    }
    unmount()
  })

  it('persists a habit across a restart and awards XP for completing it', async () => {
    const first = await render()

    // Navigate to Habits and create one through the real UI
    await click([...first.container.querySelectorAll('a')].find((a) => a.textContent.includes('Habits')))
    await click([...first.container.querySelectorAll('button')].find((b) => b.textContent.includes('Add')))

    const nameInput = first.container.querySelector('input')
    await act(async () => {
      const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set
      setter.call(nameInput, 'Morning run')
      nameInput.dispatchEvent(new Event('input', { bubbles: true }))
    })
    await click(
      [...first.container.querySelectorAll('button')].find((b) => b.textContent === 'Add habit')
    )
    expect(first.container.textContent).toContain('Morning run')
    first.unmount()

    // Reopen the app on the Today tab: the habit must come back from storage,
    // and completing it must move XP off zero — the two things a habit tracker
    // cannot get wrong.
    window.location.hash = ''
    const second = await render()
    expect(second.container.textContent).toContain('Morning run')
    expect(second.container.textContent).toContain('0 XP')

    const checkbox = [...second.container.querySelectorAll('button')].find((b) =>
      b.getAttribute('aria-label')?.startsWith('Mark Morning run done')
    )
    await click(checkbox)
    expect(second.container.textContent).toContain('10 XP')
    expect(second.container.textContent).toContain('100%')
    second.unmount()
  })
})
