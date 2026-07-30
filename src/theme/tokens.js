// Category colours and the theme switch.
//
// The palettes themselves live in global.css, as `:root` and
// `:root[data-theme='light']`. They used to be duplicated here as JS objects
// that applyTheme wrote back as inline custom properties, which meant two
// sources of truth where the inline copy silently won. Now this file only
// flips the attribute and lets the stylesheet do the work.

// Per-habit category colours — the code strip's alphabet. Identical in both
// themes so a habit keeps its identity. These stay in JS because they are data
// — habits reference them by key — not theme chrome.
//
// They are fills, never text, and every one clears the 3:1 non-text floor
// against BOTH grounds. That double constraint pins them into a narrow
// mid-luminance band (0.11–0.23 relative luminance), which is why there is no
// bone-white or bright-yellow category here: either would vanish on paper.
// Eight distinct hues so a strip stays readable as a code; a label always
// accompanies the colour, so hue is never the sole carrier.
export const CATEGORY_COLORS = {
  fitness: '#d8232a',
  education: '#3a67c0',
  health: '#1c8f6a',
  productivity: '#6a4bc4',
  personal: '#b0468f',
  mindfulness: '#10787e',
  social: '#94741b',
  creative: '#c25e10'
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
