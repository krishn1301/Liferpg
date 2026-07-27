// Design tokens carried over from the original LifeRPG desktop styles.js:
// blocky, monochrome, zero border-radius, a single emerald accent.
// Emitted as CSS custom properties so light/dark is one attribute swap.

export const dark = {
  bg: '#0e0e0e',
  surface: '#141414',
  card: '#1a1a1a',
  input: '#222222',
  border: '#2a2a2a',
  text: '#e0e0e0',
  textDim: '#888888',
  textMuted: '#555555',
  accent: '#22c55e',
  danger: '#ef4444',
  warn: '#f97316'
}

export const light = {
  bg: '#f5f5f4',
  surface: '#ffffff',
  card: '#ffffff',
  input: '#f0f0ef',
  border: '#d9d9d6',
  text: '#1a1a1a',
  textDim: '#6b6b68',
  textMuted: '#9a9a96',
  accent: '#16a34a',
  danger: '#dc2626',
  warn: '#ea580c'
}

// Per-habit category colours. Identical in both themes so a habit keeps its identity.
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

export function applyTheme(mode) {
  const palette = mode === 'light' ? light : dark
  const root = document.documentElement
  for (const [key, value] of Object.entries(palette)) {
    root.style.setProperty(`--${key}`, value)
  }
  root.dataset.theme = mode
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', palette.bg)
}
