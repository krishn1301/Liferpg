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
vi.mock('@capacitor/filesystem', () => ({
  Filesystem: { writeFile: async () => ({ uri: 'file:///fake' }) },
  Directory: { Documents: 'DOCUMENTS' },
  Encoding: { UTF8: 'utf8' }
}))
vi.mock('@capacitor/share', () => ({ Share: { share: async () => {} } }))

vi.stubGlobal('__APP_VERSION__', '0.0.1-test')

const { default: App } = await import('./App')

async function render(hash = '') {
  window.location.hash = hash
  const container = document.createElement('div')
  document.body.appendChild(container)
  const root = createRoot(container)
  await act(async () => root.render(<App />))
  return { container, unmount: () => act(() => root.unmount()) }
}

const click = async (el) => act(async () => el.dispatchEvent(new MouseEvent('click', { bubbles: true })))

/** Put a File on a file input. jsdom has no DataTransfer to build a FileList with. */
const setFiles = (input, file) =>
  Object.defineProperty(input, 'files', {
    value: Object.assign([file], { item: (i) => [file][i] }),
    configurable: true
  })

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

// Every route mounted at least once. A screen that throws on first render is
// the exact failure the tests above exist to prevent, and a new screen only
// reachable behind two taps is easy to ship broken.
describe('every route renders', () => {
  beforeEach(() => store.clear())

  const routes = [
    ['#/', 'Good'],
    ['#/habits', 'Habits'],
    ['#/stats', 'Stats'],
    ['#/day', 'My Day'],
    ['#/more', 'More'],
    ['#/calendar', 'Calendar'],
    ['#/medicines', 'Medicines'],
    ['#/settings', 'Settings']
  ]

  for (const [hash, expected] of routes) {
    it(`mounts ${hash} without throwing`, async () => {
      const { container, unmount } = await render(hash)
      expect(container.textContent).toContain(expected)
      unmount()
    })
  }

  it('shows the not-found screen for an unknown route', async () => {
    const { container, unmount } = await render('#/nope')
    expect(container.textContent).toContain('Not found')
    unmount()
  })
})

describe('importing a desktop save through the real UI', () => {
  beforeEach(() => store.clear())

  const DESKTOP_SAVE = JSON.stringify({
    habits: [
      {
        id: 1778145267136,
        name: 'Tuition',
        category: 'personal',
        icon: '📚',
        streak: 0,
        completions: { '2026-05-04': true, '2026-05-05': false, '2026-04-30': true },
        target: 'daily',
        xpBonus: 1
      }
    ],
    xp: 190,
    lastUpdated: '2026-05-07T10:28:56.426Z'
  })

  it('explains the XP correction, then imports on confirm', async () => {
    const { container, unmount } = await render('#/settings')

    const input = container.querySelector('input[type="file"]')
    const file = new File([DESKTOP_SAVE], 'liferpg-data.json', { type: 'application/json' })

    await act(async () => {
      // jsdom has no DataTransfer, and the handler only ever reads files[0].
      setFiles(input, file)
      input.dispatchEvent(new Event('change', { bubbles: true }))
      // Let FileReader's async callback land before assertions.
      await new Promise((r) => setTimeout(r, 0))
    })

    // The sheet must name both numbers before anything is replaced: two live
    // completions earn 20 XP, while the file claims 190.
    expect(container.textContent).toContain('Import from desktop')
    expect(container.textContent).toContain('190')
    expect(container.textContent).toContain('20 XP')

    await click(
      [...container.querySelectorAll('button')].find((b) => b.textContent === 'Replace my data')
    )

    expect(container.textContent).toContain('Desktop data imported.')
    unmount()

    // And it survives a restart, which is the whole point of importing.
    const reopened = await render('#/habits')
    expect(reopened.container.textContent).toContain('Tuition')
    reopened.unmount()
  })

  it('rejects a file that is not JSON without replacing anything', async () => {
    const { container, unmount } = await render('#/settings')

    const input = container.querySelector('input[type="file"]')

    await act(async () => {
      setFiles(input, new File(['not json'], 'junk.json', { type: 'application/json' }))
      input.dispatchEvent(new Event('change', { bubbles: true }))
      await new Promise((r) => setTimeout(r, 0))
    })

    expect(container.textContent).toContain("isn't valid JSON")
    expect(container.textContent).not.toContain('Replace my data')
    unmount()
  })
})
