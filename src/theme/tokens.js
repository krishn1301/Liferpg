// Category colours and the theme switch.
//
// The palettes themselves live in global.css, as `:root` and
// `:root[data-theme='light']`. They used to be duplicated here as JS objects
// that applyTheme wrote back as inline custom properties, which meant two
// sources of truth where the inline copy silently won. Now this file only
// flips the attribute and lets the stylesheet do the work.

// Per-habit category colours. Identical in both themes so a habit keeps its
// identity. These stay in JS because they are data — habits reference them by
// key — not theme chrome.
export const CATEGORY_COLORS = {
  fitness: '#f97316',
  education: '#8b5cf6',
  health: '#22c55e',
  productivity: '#3b82f6',
  personal: '#ec4899',
  mindfulness: '#14b8a6',
  social: '#fbbf24',
  creative: '#e11d48'
}

export const THEMES = ['dark', 'light']

/**
 * Switch theme. Reads --bg back out of the cascade rather than keeping a copy,
 * so the Android status bar colour can never drift from the actual background.
 */
export function applyTheme(mode) {
  const root = document.documentElement
  root.dataset.theme = THEMES.includes(mode) ? mode : 'dark'

  const bg = getComputedStyle(root).getPropertyValue('--bg').trim()
  if (bg) document.querySelector('meta[name="theme-color"]')?.setAttribute('content', bg)
}
