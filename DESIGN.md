---
name: LifeRPG
description: A habit tracker set as a game System overlay. Near-black ground with a blue cast, SIGNAL blue for what is live, terminal monospace throughout, and a monochrome code strip that encodes a week at a glance. Containers are rounded and filled; the data marks inside them stay square. Completion inverts the row, then settles onto the ground so that what is left holds the eye. Phone-first — every rule assumes a thumb, a 411px viewport and no mouse.

# The source of truth for colour, type and radius is src/theme/global.css.
# This frontmatter is the portable export the detector reads. If a token
# changes there, change it here in the same commit.
colors:
  # ---- Dark: the canonical ground. ------------------------------------
  # Near-black but not neutral — a blue cast under everything is what makes
  # an overlay read as projected rather than printed. `panel` is a real
  # surface: corners without a fill read as a floating wire rather than a
  # window. Every ratio here is measured against `panel`, the lightest
  # ground any text sits on.
  bg: '#05070d' # VOID
  surface: '#05070d'
  card: '#05070d'
  panel: '#0d1420'
  input: '#0d1420'
  border: '#24405f' # hairline, structural
  rule: '#16273d' # hairline, decorative — separators inside a group
  text: '#dce9f5' # GLASS — pale blue-white, lit not pressed, 15.0:1
  text-dim: '#8fa9c4' # 7.6:1
  text-muted: '#6b83a0' # 4.7:1 — the least headroom in the palette; 4.5 is the floor
  accent: '#4da6ff' # SIGNAL — what is live, next, or just earned
  danger: '#ff5570' # 6.0:1 — CAUTION, relapses, destructive, failed validation
  on-accent: '#05070d'
  on-ink: '#05070d' # text drawn on an inverted (GLASS-filled) row

  # ---- Light: DAYLIGHT ground, the same grammar inverted. ---------------
  # The System has no light mode of its own. This is the concession the app
  # makes to being read outdoors, and the glow switches off entirely here.
  light-bg: '#eef3f9'
  light-surface: '#eef3f9'
  light-card: '#eef3f9'
  light-panel: '#ffffff' # paper stock on a paper ground
  light-input: '#ffffff'
  light-border: '#c2d2e4'
  light-rule: '#dde7f2'
  light-text: '#0b1622' # 18.2:1
  light-text-dim: '#3d5570' # 7.7:1
  light-text-muted: '#5a748f' # 4.9:1
  light-accent: '#1d4ed8' # SIGNAL translated: #4da6ff is ~2:1 on white
  light-danger: '#c02a3e'
  light-on-accent: '#eef3f9'
  light-on-ink: '#eef3f9'

  # ---- Category block colours. -----------------------------------------
  # Fills, never text. Every one clears 3:1 against BOTH grounds, which is
  # why they sit in a narrow mid-luminance band — a bone-white or a bright
  # yellow disappears on paper. Eight distinct hues, always paired with a
  # text label. They appear on the Stats bars, the Status marks, the My Day
  # blocks and the Excel export — no longer in the code strip, which went
  # monochrome so that red could go back to meaning one thing.
  cat-fitness: '#4f9420' # hue 96° — was #d8232a, 8° from danger
  cat-education: '#3a67c0'
  cat-health: '#1c8f6a'
  cat-productivity: '#6a4bc4'
  cat-personal: '#b0468f'
  cat-mindfulness: '#10787e'
  cat-social: '#94741b'
  cat-creative: '#c25e10'

  scrim: 'rgba(2,4,10,0.76)'

glow:
  # The halo, and the allow-list that keeps it from becoming fog. Decoration
  # only: a glow on a paragraph turns readable text into a smear, and this app
  # is read half awake. Resolves to `none` in daylight, so both utilities are
  # inert there without a media query.
  glow: '0 0 14px rgba(77,166,255,0.45)' # .glow — display type only
  glow-soft: '0 0 10px rgba(77,166,255,0.22)' # .glow-edge — a live panel edge

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
    '28': '1.75rem' # screen titles (terminal caps, lit)
    '38': '2.375rem' # the one hero numeral per screen
    '64': '4rem' # the level-up card's numeral, and the STATUS level
  body:
    # Prose only: the intro paragraph, empty-state hints, the explanations in
    # Settings. Everything that is a name, a label or a number is mono.
    fontFamily: "'Archivo Variable', 'Segoe UI', system-ui, -apple-system, sans-serif"
    fontSize: '0.9375rem'
    fontWeight: 450
  title:
    # Terminal type, opened up and lit. The System has no engraving, so
    # Archivo's condensed axis is no longer used anywhere.
    fontFamily: "'JetBrains Mono Variable', ui-monospace, 'Cascadia Mono', monospace"
    fontSize: '1.75rem'
    fontWeight: 700
    letterSpacing: '0.08em'
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
  # Containers only. Data marks — the code strip, the year strip, calendar
  # cells, badge blocks, the tick scale — take none of these and never will.
  none: '0' # every mark in the notation
  sm: '10px' # inputs, nested cells, icon buttons
  md: '16px' # panels, rows, sheets (top corners), the tab bar
  pill: '999px' # buttons, chips, segmented controls, checkboxes, day pickers

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

**The System.** The status overlay from _Solo Leveling_: a near-black field
with a blue cast, terminal monospace throughout, thin bright rules bracketing
every heading, values stated in brackets, and one electric blue marking what is
live. The window is lit from inside — that is a halo, not a shadow, and it is
the only lighting effect this design has.

The world changed once before, from Factory Records catalogue sleeves. What
survived the move is everything that was actually load-bearing: the code strip,
inversion as completion, and colour used as an _encoding system_ rather than
decoration. Those were never Saville's — they are what a **log of small verified
events** needs, and they fit a status window as well as they fit a record sleeve.

### How the RPG words live here

The vocabulary is binding — XP, levels, quests, badges — and the System makes
them native rather than bolted on, because it is the same fiction:

- A habit is a **quest**. It carries a **quest number** (`Q07`), derived from
  its position in the list, set beside the name.
- The day states its progress the way the System does: **`[ 2 / 5 ]`**, with a
  **CAUTION** line beneath while anything is open.
- **XP** is a banked count. **Levels** are a graduated tick scale, read like an
  instrument, not a bubbly bar.
- **STATUS** is the character sheet: level, TITLE and one stat per category,
  every number derived from real completions. TITLE is the highest badge held —
  it used to be the strongest category, which printed a category name as though
  it were an achievement. There was a JOB row too, hardcoded to "Human"; a
  constant is not content, and it was occupying the best space on the screen.
- A **streak** is an unbroken run of blocks in the code strip.

**What the System does not get is teeth.** The source material punishes a failed
daily quest. This app does not: XP is never taken back, and the caution line
states what is left rather than threatening a consequence the app then declines
to carry out. See `domain/xp.js` for why — losing levels over one bad night is
how a habit tracker gets deleted rather than reopened.

### The three signature devices

Nothing below is optional garnish. Strip these and this is a black theme, not
a world.

1. **The code strip.** A run of small blocks reading left→right over the last
   seven days. Solid block = done, hollow outline = missed, centre bar =
   skipped on purpose, single centre dot = not scheduled. It replaces both the
   old 3px side stripe and the progress ring. State is carried by _shape_, so
   the strip survives colour blindness and a greyscale screenshot.

   It is monochrome — SIGNAL blue for a pressed day, hairlines for everything
   else. It used to paint a done day in the habit's category colour, and that
   gave red one job too many: `--danger` marks a relapse, `cat-fitness` was a
   near red, and so a _completed_ workout and a _broken_ vow rendered as the
   same wall of red. The only hue a strip can now contain is the `--danger` of
   an actual relapse day.

2. **The pulsar plot.** Stacked ridgelines, one per week, occluding each other
   front-to-back — the _Unknown Pleasures_ mechanic, which is a real plot of
   real data and not an ornament. It is the Stats hero and the history view.
   Each ridge is that week's completions by weekday; a good month has tall,
   even ridges. Filled with the ground colour so the ridges genuinely hide
   what is behind them.
3. **Inversion as completion, then a settle.** A finished habit does not gain a
   green tick; the whole row **flips to GLASS ground with VOID text**. It is the
   strongest done/not-done signal available at 7am with one eye open, and it is
   what a System window does when a goal is met.

   It does not stay that way. GLASS is the brightest value in the palette, so
   leaving finished rows inverted made a day with three of five done shout about
   the three you had already dealt with. When the sweep ends the row settles onto
   the VOID ground with a decorative hairline and `--textDim` text — still
   legibly done, no longer competing. What is outstanding keeps `--panel` and the
   structural border, and the first outstanding row gets the lit edge.

## Rules

**Type is rem, always.** Sizes come from `var(--fs-*)`. A number in a React
style object is px, and px text cannot be scaled by the user. If a size you
need isn't on the ramp, the answer is the nearest step, not a new one.

**Mono is the interface; Archivo is only prose.**
`JetBrains Mono Variable` sets screen titles, section labels, habit names, quest
numbers, times, doses, XP, streak counts, meta rows and plot ticks — everything
that is a name, a label or a number. `Archivo Variable` is left with actual
sentences: empty-state hints, the Settings explanations, the first-run intro.
Archivo's condensed width axis is no longer used anywhere.

**Habit names are mono at sentence case with normal tracking.** The rule this
replaces said names must not be "tracked-out mono capitals", and that is still
true — what made a name hard to read was the tracking and the caps, not the
face. JetBrains Mono at 15px sentence case is legible at 7am, which is the only
test that matters here.

**Glow is display type only**, via `.glow`, plus `.glow-edge` for a panel edge
that is genuinely live. Never body copy, never a meta row, never anything below
`--fs-base`. A halo on a paragraph is the fastest way to make a screen
unreadable. Both utilities resolve to `none` in daylight, because a glow on
paper reads as a printing fault rather than as power.

**Containers round; data stays geometric.** This is the load-bearing rule of
the softened world, and it is what stops "rounded" turning into "generic".

- _Furniture_ — panels, rows, sheets, inputs, buttons, chips, the tab bar —
  takes `--radius` (16px), `--radius-sm` (10px) or `--radius-pill`.
- _Marks in the notation_ — the code strip, the year strip, calendar cells,
  badge blocks, the tick scale, the pulsar plot, empty-state blocks, and the
  daily log's mood, energy and water marks — take **no radius at all**. A
  rounded block stops reading as a printed cell and starts reading as a dot,
  and the code strip's whole claim is that it is a printed record you can learn
  to read.

**Rounded outlines need a fill.** A 16px hairline rectangle on the page's own
black reads as a floating wire, not a card, so `--panel` became a real surface
in the same change. That retires the earlier "no elevation, separation is a
1px line" doctrine — it is the honest cost of corners, not an oversight. There
are still no shadows: the lift is one step of ground colour plus the hairline,
nothing more. Nested filled boxes are still wrong; a panel holds records, not
more panels.

The tab bar floats: a pill of `--panel` in a transparent dock, with the active
cell a pill of GLASS. The dock is `pointer-events: none` so the strip of
content either side of it is not a dead band.

**48dp is the floor for anything tappable.** Enforced globally in `global.css`
via `--touch`. The one deliberate exception is the seven-across day picker in
the habit sheet, which sets `minWidth: 0` — seven 48px buttons overflow a
411px screen. Height still carries the target.

**Contrast is computed, not eyeballed.** Every pair in both themes clears WCAG
AA (4.5:1) against `--panel`, the lightest ground any text sits on. Category
blocks clear the 3:1 non-text floor against _both_ grounds — that constraint is
what forced the mid-luminance band, and it is why there is no bone-white or
bright-yellow category.

**Animate transform, opacity and clip-path. Nothing else.** Progress fills
scale rather than resize (`scaleX`, `transformOrigin: left`, `overflow: hidden`
on the track). The completion inversion is a `clip-path` wipe. All three stay
on the compositor; animating `width`, `height` or `background` relayouts or
repaints, and the pulsar plot has up to 90 points doing it at once.

**One authored moment per event, and it fires only on the real thing.**
Completing a habit sweeps the row. Reaching a level, or earning a badge,
presents a System card. Nothing else moves — nothing animates on mount, on
scroll, or because a screen appeared. A habit tracker opened twice a day cannot
afford an entrance, and an animation that plays when you _undo_ something is
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
its label, and the code strip encodes state as shape (solid / hollow / bar /
dot) before it encodes it as hue — it is monochrome, so shape is very nearly all
it has.

**Red means one thing: something went wrong.** A relapse, a destructive control,
a failed validation. Nothing that is going _well_ is allowed to be red, which is
why `cat-fitness` moved off `#d8232a` and why the code strip stopped using
category colour. There is no `--warn`: it was an exact alias of `--accent`, so
it rendered every warning as "this is live".

**`--textMuted` never sits on `--bg`.** It is specified against `--panel`, where
it measures 4.73:1 dark and 4.85:1 light. On the VOID ground in daylight it
falls to **4.35:1**, under the AA floor. Anything that recedes onto the bare
ground — the settled done row — uses `--textDim` and gets its subordination
from size instead.

## Deliberate deviations

Both of the detector waivers this project used to carry are **gone**, resolved
by the redesign rather than re-argued:

- **`side-tab`** — the 3px category stripe no longer exists. Category is
  carried in words, by the `{cat.label}` line every row that draws a strip
  already prints directly above it. That was true before the strip went
  monochrome too; the colour was never the thing doing the work.
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
  bed, at either end of the day — not from the category. The DAYLIGHT-ground light
  theme is the same grammar for daylight, not a second design.
- **Reminders exist on Android only.** iOS Safari has no scheduled local
  notification API and Web Push needs a server, which contradicts offline-only.
  Settings says this in words rather than offering a toggle that does nothing.
- **No haptics on iPhone.** Every feedback moment has a visual form that stands
  on its own.

## Still open

Nothing from the previous system carried forward. The one item that used to sit
here — badges unlocking off the _current_ streak while Stats printed _best
ever_ above them — was fixed before this redesign; `earnedBadges` keys off
`bestStreak` now.
