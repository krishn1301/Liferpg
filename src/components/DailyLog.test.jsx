// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from 'vitest'
import { act } from 'react'
import { createRoot } from 'react-dom/client'
import DailyLog from './DailyLog'
import { WATER_TARGET, WATER_MAX, LOG_SCALE } from '../domain/constants'

// The last panel on Today, filled in half asleep. Everything here is about
// whether a control says what it does before you touch it.

const DATE = '2026-07-30'

let mounted = []

/** Render the panel over one day's log and hand back the DOM plus the spy. */
function draw(log = {}) {
  const onSet = vi.fn()
  const container = document.createElement('div')
  document.body.append(container)

  const root = createRoot(container)
  act(() => root.render(<DailyLog dailyLogs={{ [DATE]: log }} dateKey={DATE} onSet={onSet} />))
  mounted.push({ root, container })

  return { container, onSet }
}

const click = (el) => act(() => el.dispatchEvent(new MouseEvent('click', { bubbles: true })))

const buttons = (c) => [...c.querySelectorAll('button')]
// The boxes themselves — "6 glasses" — not the stepper's "One glass more".
const glasses = (c) =>
  buttons(c).filter((b) => /^\d+ glass(es)?$/.test(b.getAttribute('aria-label') ?? ''))

afterEach(() => {
  mounted.forEach(({ root, container }) => {
    act(() => root.unmount())
    container.remove()
  })
  mounted = []
})

describe('mood and energy', () => {
  it('names both ends of the scale without waiting for a value', () => {
    // Five identical squares do not say which way is up, and the value line
    // only names an end once you have already picked one — too late to be an
    // affordance.
    const { container } = draw()

    expect(container.textContent).toContain('Rough')
    expect(container.textContent).toContain('Great')
    expect(container.textContent).toContain('Drained')
    expect(container.textContent).toContain('Wired')
  })

  it('reports one checked radio, not a row of pressed toggles', () => {
    // The fill is cumulative, so `aria-pressed` announced three separate
    // buttons as "pressed" at mood 3 and left the value to be counted out.
    const { container } = draw({ mood: 3 })
    const group = container.querySelector('[role="radiogroup"][aria-label="Mood"]')
    const radios = [...group.querySelectorAll('[role="radio"]')]

    expect(radios).toHaveLength(LOG_SCALE)
    expect(radios.filter((r) => r.getAttribute('aria-checked') === 'true')).toHaveLength(1)
    expect(radios[2].getAttribute('aria-checked')).toBe('true')
  })
})

describe('water', () => {
  it('sets the count from the box you tap', () => {
    // Eight presses of + to log an ordinary day is a lot of friction on the
    // screen people open last thing at night.
    const { container, onSet } = draw({ water: 0 })
    click(glasses(container)[5])
    expect(onSet).toHaveBeenCalledWith('water', 6)
  })

  it('steps back down when you tap the box you are already on', () => {
    const { container, onSet } = draw({ water: 6 })
    click(glasses(container)[5])
    expect(onSet).toHaveBeenCalledWith('water', 5)
  })

  it('stops at the cap instead of growing the panel without limit', () => {
    // + was unbounded and the row draws one box per glass, so a leaning thumb
    // wrapped it over several lines and reflowed everything below it.
    const { container, onSet } = draw({ water: WATER_MAX })
    const plus = buttons(container).find((b) => b.getAttribute('aria-label') === 'One glass more')

    expect(plus.disabled).toBe(true)
    click(plus)
    expect(onSet).not.toHaveBeenCalled()
  })

  it('always draws at least the target, so the goal is visible from empty', () => {
    const { container } = draw({ water: 0 })
    expect(glasses(container)).toHaveLength(WATER_TARGET)
  })
})

describe('note', () => {
  it('has a real label rather than borrowing its placeholder', () => {
    // A placeholder disappears the moment anything is typed into the field, so
    // it is the one thing that cannot serve as the accessible name.
    const { container } = draw()
    const field = container.querySelector('textarea')
    const label = container.querySelector(`label[for="${field.id}"]`)

    expect(field.id).toBeTruthy()
    expect(label?.textContent).toBe('Note')
  })
})
