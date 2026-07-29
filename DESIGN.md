---
name: LifeRPG
description: Blocky monochrome habit tracker for Android. Zero radius, near-black ground, one emerald accent, and a colour per habit category. Phone-first — every rule here assumes a thumb, a 411px viewport and no mouse.

# The source of truth for colour, type and radius is src/theme/global.css.
# This frontmatter is the portable export the detector reads. If a token
# changes there, change it here in the same commit.
colors:
  # Dark — the default and the identity.
  bg: '#0e0e0e'
  surface: '#141414'
  card: '#1a1a1a'
  input: '#222222'
  border: '#2a2a2a'
  text: '#e0e0e0'
  text-dim: '#989898'
  text-muted: '#828282'
  accent: '#22c55e'
  danger: '#ef4444'
  warn: '#f97316'
  on-accent: '#04140a'

  # Light — the same palette inverted, not a second design.
  light-bg: '#f5f5f4'
  light-surface: '#ffffff'
  light-input: '#f0f0ef'
  light-border: '#d9d9d6'
  light-text: '#1a1a1a'
  light-text-dim: '#595959'
  light-text-muted: '#707070'
  light-accent: '#15803d'
  light-danger: '#b91c1c'
  light-warn: '#b45309'
  light-on-accent: '#ffffff'

  # Category colours. Data, not chrome — a habit keeps its colour in both
  # themes so it stays recognisable. Also used by the My Day routine blocks.
  cat-fitness: '#f97316'
  cat-education: '#8b5cf6'
  cat-health: '#22c55e'
  cat-productivity: '#3b82f6'
  cat-personal: '#ec4899'
  cat-mindfulness: '#14b8a6'
  cat-social: '#fbbf24'
  cat-creative: '#e11d48'

  # Sheet scrim.
  scrim: 'rgba(0,0,0,0.6)'

typography:
  scale:
    # rem at a 16px root, never px. A bare number in a React style object
    # becomes px, and px text ignores the WebView's text zoom and any
    # text-size preference we add in Settings. Keys are the px equivalent.
    '9': '0.5625rem' # badge sub-labels, chart ticks
    '10': '0.625rem' # overlines, tab labels, section titles
    '11': '0.6875rem' # meta rows, sheet titles, segmented controls
    '12': '0.75rem' # buttons, secondary text
    '13': '0.8125rem' # subtitles, bar labels
    '15': '0.9375rem' # body, inputs, habit names
    '17': '1.0625rem' # checkmark glyph, tab icons
    '20': '1.25rem' # row icons, tile values
    '26': '1.625rem' # screen titles
    '30': '1.875rem' # the one hero number, on Today
    '40': '2.5rem' # empty-state and splash glyphs
  body:
    fontFamily: "'Inter Variable', Inter, 'Segoe UI', system-ui, -apple-system, sans-serif"
    fontSize: '0.9375rem'
    fontWeight: 400
  title:
    fontFamily: "'Inter Variable', Inter, 'Segoe UI', system-ui, -apple-system, sans-serif"
    fontSize: '1.625rem'
    fontWeight: 800
    letterSpacing: '-0.02em'
  overline:
    fontFamily: "'Inter Variable', Inter, 'Segoe UI', system-ui, -apple-system, sans-serif"
    fontSize: '0.625rem'
    fontWeight: 700
    letterSpacing: '0.12em'

rounded:
  # One value. Rounding anything is a change of identity, not a tweak.
  none: '0'

spacing:
  xs: '6px'
  sm: '8px'
  md: '12px'
  lg: '16px'
  xl: '22px'
  '2xl': '26px'
---

# LifeRPG — design system

## The brief

A gamified habit tracker that runs offline on an Android phone, installed as an
APK rather than through the Play Store. It is a **tool people open twice a day
for fifteen seconds** — once to see what's due, once to tick things off. Speed
and legibility beat delight everywhere they conflict.

The visual language is inherited from the LifeRPG desktop app and is not up for
redesign: **near-black ground, zero border-radius, monochrome greys, one
emerald accent, and a colour per habit category.** It reads as a terminal or a
control panel, not a consumer app. Anything that softens that — rounded
corners, gradients, drop shadows, tonal elevation, Material components — is
wrong for this product even where it would be right for another.

## Rules

**Type is rem, always.** Font sizes come from `var(--fs-*)`. A number in a
React style object is px, and px text cannot be scaled by the user. If a size
you need isn't on the ramp, the answer is usually the nearest step, not a new
one.

**48dp is the floor for anything tappable.** Enforced globally in `global.css`
via `--touch`. The one deliberate exception is the seven-across day picker in
the habit sheet, which sets `minWidth: 0` — seven 48px buttons overflow a
411px screen. Height still carries the target.

**Contrast is checked, not eyeballed.** Every foreground/background pair in
both themes clears WCAG AA (4.5:1), measured against `--card`, which is the
lightest ground any of this text sits on. The greys are already at their floor;
darkening `--textMuted` for looks would break it.

**Animate transform and opacity. Nothing else.** Progress bars scale rather
than resize — `scaleX` on a full-width fill, `transformOrigin: left`, with
`overflow: hidden` on the track. Animating `width` or `height` relayouts the
whole card, and the trend strip has up to 90 columns doing it at once.

**Every tap gets acknowledged.** `-webkit-tap-highlight-color` is off, so
`:active { opacity: 0.55 }` in `global.css` is the only press feedback there
is. A new control that opts out of it will feel dead on hardware even when it
works.

**Sheets pin their actions.** Anything the user must press goes in the `Sheet`
`footer` prop, never at the end of `children`. The on-screen keyboard eats most
of a bottom sheet; a primary button below the fold reads as a broken flow. This
was found on a real Galaxy S9+, not in a browser.

**Colour is not the only signal.** The category stripe and the accent both
carry meaning; each is paired with a text label. Nothing is distinguishable by
hue alone.

## Deliberate deviations

Two of impeccable's detector rules are waived in `.impeccable/config.json`,
with reasons recorded there:

- **`side-tab`** — the 3px category stripe. In a UI with no other chrome it is
  the load-bearing signal for a habit's category, not decoration.
- **`overused-font`** — Inter. Self-hosted specifically because the desktop
  build's Google Fonts `@import` was CSP-blocked and silently never loaded.
  Changing the face is a redesign and reopens a solved offline-loading problem.

A third judgement call, not a detector rule: the Stats trend strip is drawn
with divs rather than a charting library. 30–90 bars on a 411px screen is a
strip, not a plot, and recharts would roughly double the bundle.

## Still open

`earnedBadges` in `domain/xp.js` unlocks off **current** streak, while the
Stats screen shows **best ever** right above the badge grid. A user whose 42-day
streak lapsed sees "Best ever: 42" next to a locked "30-day streak" badge,
which reads as a bug. Unresolved — it is a product decision, not a defect.
