---
name: LifeRPG
description: A habit tracker built as a record catalogue. Void-black ground, hairline rules instead of cards, engraved condensed caps against monospace data, and a colour-code strip that encodes a week at a glance. Completion is an inversion, not a tick. Phone-first — every rule assumes a thumb, a 411px viewport and no mouse.

# The source of truth for colour, type and radius is src/theme/global.css.
# This frontmatter is the portable export the detector reads. If a token
# changes there, change it here in the same commit.
colors:
  # ---- Dark: the canonical ground. ------------------------------------
  # There is no elevation in this world. Panels are the same black as the
  # ground; separation is a 1px rule. `panel` exists only so a sheet can
  # sit above the scrim and still read as a surface.
  bg: '#0a0a0b' # VOID
  surface: '#0a0a0b'
  card: '#0a0a0b'
  panel: '#121214'
  input: '#121214'
  border: '#2b2c2e' # hairline, structural
  rule: '#1b1c1e' # hairline, decorative — separators inside a group
  text: '#f2f1ec' # PULSE — warm off-white, 16.5:1
  text-dim: '#adb1b4' # 8.7:1
  text-muted: '#7c8083' # 4.7:1
  accent: '#e9b417' # ENERGY — the signal colour: what is live, next, or earned
  danger: '#f0574c'
  warn: '#e9b417'
  on-accent: '#0a0a0b'
  on-ink: '#0a0a0b' # text drawn on an inverted (PULSE-filled) row

  # ---- Light: PULSE ground, the same grammar inverted. ------------------
  light-bg: '#eeece4'
  light-surface: '#eeece4'
  light-card: '#eeece4'
  light-panel: '#f7f6f1'
  light-input: '#f7f6f1'
  light-border: '#c9c6ba'
  light-rule: '#dedbd0'
  light-text: '#0a0a0b' # 18.3:1
  light-text-dim: '#4a4d4f' # 7.9:1
  light-text-muted: '#63676a' # 5.3:1
  light-accent: '#7d5500' # ENERGY translated: yellow on paper is unreadable
  light-danger: '#b0201c'
  light-warn: '#7d5500'
  light-on-accent: '#f2f1ec'
  light-on-ink: '#f2f1ec'

  # ---- Category block colours. -----------------------------------------
  # Fills in a code strip, never text. Every one clears 3:1 against BOTH
  # grounds, which is why they sit in a narrow mid-luminance band — a
  # bone-white or a bright yellow disappears on paper. Eight distinct hues
  # so the strip is readable as a code; always paired with a text label.
  cat-fitness: '#d8232a'
  cat-education: '#3a67c0'
  cat-health: '#1c8f6a'
  cat-productivity: '#6a4bc4'
  cat-personal: '#b0468f'
  cat-mindfulness: '#10787e'
  cat-social: '#94741b'
  cat-creative: '#c25e10'

  scrim: 'rgba(0,0,0,0.72)'

typography:
  scale:
    # rem at a 16px root, never px. A bare number in a React style object
    # becomes px, and px text ignores the WebView's text zoom and the
    # text-size preference in Settings. Keys are the px equivalent.
    '9': '0.5625rem' # code-strip legends, plot ticks
    '10': '0.625rem' # mono labels, tab labels, quest numbers
    '11': '0.6875rem' # meta rows, sheet titles
    '12': '0.75rem' # buttons, secondary text
    '13': '0.8125rem' # subtitles, field labels
    '15': '0.9375rem' # body, inputs, habit names
    '17': '1.0625rem' # tab icons
    '20': '1.25rem' # row icons, tile values
    '28': '1.75rem' # screen titles (engraved caps)
    '38': '2.375rem' # the one hero numeral per screen
    '64': '4rem' # the level-up card's numeral
  body:
    fontFamily: "'Archivo Variable', 'Segoe UI', system-ui, -apple-system, sans-serif"
    fontSize: '0.9375rem'
    fontWeight: 450
  title:
    # Engraved: condensed width axis, heavy, uppercase, opened up. This is
    # the one place the width axis is pushed — body text stays at 100%.
    fontFamily: "'Archivo Variable', 'Segoe UI', system-ui, -apple-system, sans-serif"
    fontSize: '1.75rem'
    fontWeight: 800
    fontStretch: '78%'
    letterSpacing: '0.06em'
    textTransform: 'uppercase'
  overline:
    # Data, labels, codes, times, counts. Monospace here is measurement, not
    # costume — it is what keeps a column of numerals in a column.
    fontFamily: "'JetBrains Mono Variable', ui-monospace, 'Cascadia Mono', monospace"
    fontSize: '0.625rem'
    fontWeight: 600
    letterSpacing: '0.14em'
    textTransform: 'uppercase'

rounded:
  # One value. A radius anywhere is a different product.
  none: '0'

spacing:
  xs: '6px'
  sm: '8px'
  md: '12px'
  lg: '16px'
  xl: '22px'
  '2xl': '28px'
---

# LifeRPG — design system

## The world

**Factory Records catalogue sleeves.** Peter Saville's house style: a black
field, a hairline grid, engraved condensed capitals, everything catalogued and
numbered, and colour used as an *encoding system* rather than decoration —
the Blue Monday floppy-disk colour code, where a row of coloured blocks spells
something to anyone who learns the key.

That last part is why this world was chosen over a literal fantasy dashboard.
A habit tracker is fundamentally a **log of small verified events**, and a
catalogue is the visual language humans invented for exactly that.

### How the RPG words live here

The vocabulary is binding — XP, levels, quests, badges — and the catalogue
makes them native rather than bolted on:

- A habit is a **catalogued item**. It carries a **quest number** (`Q07`),
  derived from its position in the list, set in mono beside the name.
- **XP** is a pressing count. **Levels** are a graduated tick scale, read like
  an instrument, not a bubbly bar.
- **Badges** are catalogue entries: numbered, titled, either pressed or not.
- A **streak** is an unbroken run of blocks in the code strip.

### The three signature devices

Nothing below is optional garnish. Strip these and this is a black theme, not
a world.

1. **The code strip.** A run of small blocks reading left→right over the last
   seven days. Solid block = done, hollow outline = missed, single centre dot =
   not scheduled. Colour is the habit's category. It replaces both the old
   3px side stripe and the progress ring, and it is shape-encoded as well as
   hue-encoded, so it survives colour blindness and a greyscale screenshot.
2. **The pulsar plot.** Stacked ridgelines, one per week, occluding each other
   front-to-back — the *Unknown Pleasures* mechanic, which is a real plot of
   real data and not an ornament. It is the Stats hero and the history view.
   Each ridge is that week's completions by weekday; a good month has tall,
   even ridges. Filled with the ground colour so the ridges genuinely hide
   what is behind them.
3. **Inversion as completion.** A finished habit does not gain a green tick;
   the whole row **flips to PULSE ground with VOID text**. It is the strongest
   done/not-done signal available at 7am with one eye open, and it is the
   board's own active state.

## Rules

**Type is rem, always.** Sizes come from `var(--fs-*)`. A number in a React
style object is px, and px text cannot be scaled by the user. If a size you
need isn't on the ramp, the answer is the nearest step, not a new one.

**Two faces, and they do not trade jobs.**
`Archivo Variable` is structure and language: screen titles (condensed 78%,
uppercase, opened up), habit names, body copy, buttons.
`JetBrains Mono Variable` is measurement: quest numbers, times, doses, XP,
streak counts, section labels, meta rows, plot ticks.
**Habit names are set in Archivo at normal width and sentence case**, not in
tracked-out mono capitals. The world would happily set everything as a code;
this app is read at 7am by someone half awake, and a name has to be legible
before it is stylish. That is the one place the world yields, deliberately.

**No cards. Rules.** Panels do not have their own background — separation is a
1px `--border` line, or a `--rule` hairline within a group. Nested boxes are
wrong here in a way they are merely lazy elsewhere: a catalogue page is a grid
of ruled cells, not a stack of floating tiles. There are no shadows in this
design, because there is no elevation to describe.

**48dp is the floor for anything tappable.** Enforced globally in `global.css`
via `--touch`. The one deliberate exception is the seven-across day picker in
the habit sheet, which sets `minWidth: 0` — seven 48px buttons overflow a
411px screen. Height still carries the target.

**Contrast is computed, not eyeballed.** Every pair in both themes clears WCAG
AA (4.5:1) against `--panel`, the lightest ground any text sits on. Category
blocks clear the 3:1 non-text floor against *both* grounds — that constraint is
what forced the mid-luminance band, and it is why there is no bone-white or
bright-yellow category.

**Animate transform, opacity and clip-path. Nothing else.** Progress fills
scale rather than resize (`scaleX`, `transformOrigin: left`, `overflow: hidden`
on the track). The completion inversion is a `clip-path` wipe. All three stay
on the compositor; animating `width`, `height` or `background` relayouts or
repaints, and the pulsar plot has up to 90 points doing it at once.

**One authored moment per event, and it fires only on the real thing.**
Completing a habit sweeps the row. Reaching a level, or earning a badge,
presents a catalogue card. Nothing else moves — nothing animates on mount, on
scroll, or because a screen appeared. A habit tracker opened twice a day cannot
afford an entrance, and an animation that plays when you *undo* something is
telling you a lie about what happened, so un-completing is silent.

**Every tap gets acknowledged.** `-webkit-tap-highlight-color` is off, so
`:active { opacity: 0.55 }` in `global.css` is the only press feedback there
is. A control that opts out feels dead on hardware even when it works. This
matters more since the redesign: **there are no haptics on iPhone**, so the
visual acknowledgement is the entire confirmation on that platform.

**Sheets pin their actions.** Anything the user must press goes in the `Sheet`
`footer` prop, never at the end of `children`. The on-screen keyboard eats most
of a bottom sheet; a primary button below the fold reads as a broken flow.
Found on a real Galaxy S9+, not in a browser.

**Colour is never the only signal.** A category block is always accompanied by
its label, and the code strip encodes state as shape (solid / hollow / dot)
before it encodes it as hue.

## Deliberate deviations

Both of the detector waivers this project used to carry are **gone**, resolved
by the redesign rather than re-argued:

- **`side-tab`** — the 3px category stripe no longer exists. Category is
  carried by the code strip, which is a better signal and not a border.
- **`overused-font`** — Inter is gone. Archivo and JetBrains Mono are still
  self-hosted through `@fontsource-variable/*`, which is what solved the
  desktop build's CSP-blocked Google Fonts `@import` in the first place. The
  mechanism is kept; only the faces changed.

Two judgement calls that are not detector rules:

- **Monospace across the data layer.** The craft floor treats mono as a
  costume for "technical" by default. Here it is carrying codes, times, doses
  and counts — measurement, which is the exempted use — and it is the chosen
  world's own body face. It never sets prose.
- **The trend history is hand-drawn SVG**, not a charting library. The pulsar
  plot's whole point is front-to-back occlusion, which no chart library exposes,
  and `recharts` was ~200 kB for a plot it cannot draw. It has been removed
  from `package.json`.

## Platform truth

- **Dark is canonical**, and it is picked from the use scene — a phone, in
  bed, at either end of the day — not from the category. The PULSE-ground light
  theme is the same grammar for daylight, not a second design.
- **Reminders exist on Android only.** iOS Safari has no scheduled local
  notification API and Web Push needs a server, which contradicts offline-only.
  Settings says this in words rather than offering a toggle that does nothing.
- **No haptics on iPhone.** Every feedback moment has a visual form that stands
  on its own.

## Still open

Nothing from the previous system carried forward. The one item that used to sit
here — badges unlocking off the *current* streak while Stats printed *best
ever* above them — was fixed before this redesign; `earnedBadges` keys off
`bestStreak` now.
