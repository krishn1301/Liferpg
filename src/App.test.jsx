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
  Capacitor: { isNativePlatform: () => false, getPlatform: () => 'web' },
  // The step counter is a local plugin, so it is registered rather than
  // imported. Nothing here ever calls it — `canCountSteps` is false in jsdom —
  // but the registration runs at module load, so it has to exist.
  registerPlugin: () => ({
    checkPermission: async () => ({ granted: false, available: false }),
    requestPermission: async () => ({ granted: false, available: false }),
    read: async () => ({ available: false })
  })
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
// Never actually reached — `canRemind` is false in jsdom, so every call in
// platform/reminders.js short-circuits. Mocked so the import itself is inert.
vi.mock('@capacitor/local-notifications', () => ({
  LocalNotifications: {
    checkPermissions: async () => ({ display: 'denied' }),
    requestPermissions: async () => ({ display: 'denied' }),
    schedule: async () => ({ notifications: [] }),
    getPending: async () => ({ notifications: [] }),
    cancel: async () => {},
    createChannel: async () => {}
  }
}))

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

const click = async (el) =>
  act(async () => el.dispatchEvent(new MouseEvent('click', { bubbles: true })))

/**
 * An empty document that has already been through first run.
 *
 * Without this every test would land on the Welcome screen, which is correct
 * behaviour and not what these tests are about. First run has its own describe
 * at the bottom.
 */
const skipOnboarding = () =>
  store.set(
    'liferpg.doc.v1',
    JSON.stringify({
      habits: [],
      medicines: [],
      routineBlocks: [],
      dailyLogs: {},
      settings: { theme: 'dark', onboarded: true }
    })
  )

/**
 * Wait for the UI to say something.
 *
 * The file-import flow goes through `FileReader`, which resolves on its own
 * schedule. Waiting a single macrotask for it passed nearly always and failed
 * roughly once in two hundred runs — a flake that cost more to chase than it
 * ever did to fix. Poll instead, and let the timeout be the failure.
 */
async function waitForText(container, text, tries = 50) {
  for (let i = 0; i < tries; i++) {
    if (container.textContent.includes(text)) return
    await act(async () => new Promise((r) => setTimeout(r, 10)))
  }
  throw new Error(`Timed out waiting for ${JSON.stringify(text)}`)
}

/** Put a File on a file input. jsdom has no DataTransfer to build a FileList with. */
const setFiles = (input, file) =>
  Object.defineProperty(input, 'files', {
    value: Object.assign([file], { item: (i) => [file][i] }),
    configurable: true
  })

describe('App', () => {
  beforeEach(() => {
    store.clear()
    skipOnboarding()
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
    await click(
      [...first.container.querySelectorAll('a')].find((a) => a.textContent.includes('Habits'))
    )
    await click(
      [...first.container.querySelectorAll('button')].find((b) => b.textContent.includes('Add'))
    )

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
    // The day's code strip replaced the completion percentage: one block per
    // habit due today, with the count bracketed beside it the way the System
    // window states a goal.
    expect(second.container.textContent).toContain('[ 1 / 1 ]')
    // Nothing left, so no caution line.
    expect(second.container.textContent).not.toContain('unfinished')
    second.unmount()
  })
})

// Every route mounted at least once. A screen that throws on first render is
// the exact failure the tests above exist to prevent, and a new screen only
// reachable behind two taps is easy to ship broken.
describe('every route renders', () => {
  beforeEach(() => {
    store.clear()
    skipOnboarding()
  })

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

// The reward moments are the whole reason this is a *gamified* tracker rather
// than a checklist. They also have arithmetic in them, which is the part that
// silently goes wrong.
describe('reward moments', () => {
  beforeEach(() => store.clear())

  /** A daily habit sitting on `n` completions, none of them today. */
  const seedXp = (n) => {
    const completions = {}
    for (let i = 1; i <= n; i++) {
      const d = new Date()
      d.setDate(d.getDate() - i)
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
      completions[key] = true
    }
    store.set(
      'liferpg.doc.v1',
      JSON.stringify({
        habits: [
          {
            id: 1,
            name: 'Tuition',
            icon: '📚',
            category: 'education',
            schedule: { type: 'daily' },
            completions
          }
        ],
        medicines: [],
        routineBlocks: [],
        dailyLogs: {},
        settings: { theme: 'dark' }
      })
    )
  }

  it('presents a catalogue card, with the right price, on crossing a level', async () => {
    seedXp(9) // 90 XP — one completion short of level 2
    const { container, unmount } = await render()

    expect(container.textContent).not.toContain('Level reached')

    await click(
      [...container.querySelectorAll('button')].find((b) =>
        b.getAttribute('aria-label')?.startsWith('Mark Tuition done')
      )
    )

    expect(container.textContent).toContain('Level reached')
    // levelCost(1), not levelCost(2): the card names what this level cost,
    // not what the next one will.
    expect(container.textContent).toContain('That level cost 100 XP')
    expect(container.textContent).toContain('The next one costs 200')
    unmount()
  })

  it('stays quiet when a saved document simply already has levels', async () => {
    seedXp(40) // 400 XP, comfortably past level 2 — but nothing happened *now*
    const { container, unmount } = await render()

    expect(container.textContent).not.toContain('Level reached')
    expect(container.textContent).not.toContain('Badge earned')
    unmount()
  })
})

// First run is the only screen a new tester is guaranteed to see, and the one
// place the app has to get someone from nothing to something.
describe('first run', () => {
  beforeEach(() => {
    store.clear()
    window.location.hash = ''
  })

  it('offers starter packs instead of an empty app', async () => {
    const { container, unmount } = await render()
    expect(container.textContent).toContain('Pick a starting point')
    // No tab bar yet — there is nothing to navigate between.
    expect(container.querySelector('nav')).toBeNull()
    unmount()
  })

  it('creates the pack and never asks again', async () => {
    const first = await render()

    await click(
      [...first.container.querySelectorAll('button')].find((b) =>
        b.textContent.includes('Just getting started')
      )
    )
    // The habits are named before anything is created.
    expect(first.container.textContent).toContain('Drink water')

    await click(
      [...first.container.querySelectorAll('button')].find(
        (b) => b.textContent === 'Start with these'
      )
    )
    expect(first.container.textContent).toContain('Drink water')
    expect(first.container.textContent).toMatch(/Good (morning|afternoon|evening)/)
    first.unmount()

    const second = await render()
    expect(second.container.textContent).not.toContain('Pick a starting point')
    second.unmount()
  })

  it('takes no for an answer', async () => {
    const first = await render()
    await click(
      [...first.container.querySelectorAll('button')].find((b) => b.textContent.startsWith('Skip'))
    )
    expect(first.container.textContent).toContain('No habits yet')
    first.unmount()

    // Skipping still counts as answering — it must not reappear next launch.
    const second = await render()
    expect(second.container.textContent).not.toContain('Pick a starting point')
    second.unmount()
  })

  it('does not interrupt someone restoring a backup', async () => {
    // A restored document has habits but no `onboarded` flag, and being asked
    // to pick a starter pack on top of real data would be alarming.
    store.set(
      'liferpg.doc.v1',
      JSON.stringify({
        habits: [{ id: 'h1', name: 'Tuition', schedule: { type: 'daily' }, completions: {} }],
        medicines: [],
        routineBlocks: [],
        dailyLogs: {},
        settings: { theme: 'dark' }
      })
    )
    const { container, unmount } = await render()
    expect(container.textContent).not.toContain('Pick a starting point')
    expect(container.textContent).toContain('Tuition')
    unmount()
  })
})

// Vows are the one habit shape with no checkbox, so nothing in the flow above
// exercises them. The relapse button is also the only destructive control on
// Today, and the only one that can quietly destroy a two-month run.
describe('vows and the relapse flow', () => {
  beforeEach(() => store.clear())

  /** A vow clean since `days` ago, plus a build habit so Stats has a rate. */
  const seedVow = (days, relapses = {}) => {
    const d = new Date()
    d.setDate(d.getDate() - days)
    const clean = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`

    store.set(
      'liferpg.doc.v1',
      JSON.stringify({
        habits: [
          {
            id: 'v1',
            name: 'No smoking',
            icon: '🚭',
            category: 'health',
            kind: 'quit',
            createdKey: clean,
            relapses,
            completions: {}
          }
        ],
        medicines: [],
        routineBlocks: [],
        dailyLogs: {},
        settings: { theme: 'dark' }
      })
    )
    return clean
  }

  it('shows the run on Today, with no checkbox to tick', async () => {
    seedVow(14)
    const { container, unmount } = await render()

    expect(container.textContent).toContain('Vows')
    expect(container.textContent).toContain('No smoking')
    expect(container.textContent).toContain('14 days clean')
    // Fourteen clean days at the same rate a completion pays.
    expect(container.textContent).toContain('140 XP')

    const tick = [...container.querySelectorAll('button')].find((b) =>
      b.getAttribute('aria-label')?.includes('No smoking done')
    )
    expect(tick).toBeUndefined()

    // And it must not appear in the quest list, where it would sit unticked
    // forever and make Perfect Day unwinnable.
    expect(container.textContent).toContain('Nothing scheduled today')
    unmount()
  })

  it('resets the streak on a relapse and keeps the XP', async () => {
    seedVow(14)
    const { container, unmount } = await render()

    await click([...container.querySelectorAll('button')].find((b) => b.textContent === 'Relapse'))
    expect(container.textContent).toContain('Record a relapse')

    // The control lives on the vow's own row now, so opening the sheet has
    // already named a vow and it starts picked. Confirming is still a separate,
    // explicit press on a danger button — the destructive step is never one tap.
    const confirm = () =>
      [...container.querySelectorAll('button')].find((b) => b.textContent?.startsWith('Reset '))
    expect(confirm().disabled).toBe(false)
    expect(confirm().textContent).toBe('Reset 1 streak')

    // Still multi-select, and still deselectable: tapping the picked vow clears
    // it and disarms the button.
    const pick = () =>
      [...container.querySelectorAll('button')].find((b) => b.textContent?.includes('No smoking'))
    await click(pick())
    expect(confirm().disabled).toBe(true)
    await click(pick())

    expect(confirm().textContent).toBe('Reset 1 streak')
    await click(confirm())

    expect(container.textContent).toContain('0 days clean')
    // The XP the previous fourteen days earned is untouched — losing levels
    // over one bad night is how people delete a habit tracker.
    expect(container.textContent).toContain('140 XP')
    unmount()
  })

  it('gives a vow its own section in Stats rather than a permanent 0%', async () => {
    seedVow(40, {})
    const { container, unmount } = await render('#/stats')

    expect(container.textContent).toContain('Vows')
    expect(container.textContent).toContain('40 d')
    expect(container.textContent).toContain('never broken')
    // No completion rate at all: there is nothing measurable to divide by.
    expect(container.textContent).not.toContain('Completion')
    expect(container.textContent).not.toContain('0%')
    unmount()
  })

  it('survives a restart with the slip still recorded', async () => {
    const clean = seedVow(30)
    const first = await render()

    // Opening from the row pre-picks that vow, so this is open-then-confirm.
    await click(
      [...first.container.querySelectorAll('button')].find((b) => b.textContent === 'Relapse')
    )
    await click(
      [...first.container.querySelectorAll('button')].find((b) =>
        b.textContent?.startsWith('Reset ')
      )
    )
    first.unmount()

    const second = await render('#/habits')
    expect(second.container.textContent).toContain('0 days clean')
    // The clean-since date is untouched by a relapse; only the run restarts.
    await click(
      [...second.container.querySelectorAll('button')].find((b) =>
        b.textContent.includes('No smoking')
      )
    )
    expect(second.container.querySelector('input[type="date"]').value).toBe(clean)
    expect(second.container.textContent).toContain('Relapses (1)')
    second.unmount()
  })
})

describe('importing a desktop save through the real UI', () => {
  beforeEach(() => {
    store.clear()
    skipOnboarding()
  })

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
    })
    await waitForText(container, 'Import from desktop')

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
    })
    await waitForText(container, "isn't valid JSON")

    expect(container.textContent).toContain("isn't valid JSON")
    expect(container.textContent).not.toContain('Replace my data')
    unmount()
  })
})
