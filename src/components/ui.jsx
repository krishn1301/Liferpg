// Shared primitives for the catalogue world — see DESIGN.md.
//
// Two rules drive nearly everything here:
//
//   1. Containers round, data stays geometric. A `Panel` is a soft filled cell
//      with a hairline edge; the marks *inside* it — code strips, calendar
//      cells, badge blocks — stay square, because a rounded block stops reading
//      as a printed cell and starts reading as a dot. (There is still no
//      `Card`: the container is named after the ruled panel it descends from,
//      not after the generic tile every other app ships.)
//   2. Emphasis is inversion. The committed state — a primary button, a
//      finished habit, the selected tab — fills with PULSE and sets its text in
//      VOID. There is no third accent doing the job of contrast.
//
// Font sizes are `var(--fs-*)` tokens, never numbers. A bare number in a React
// style object becomes px, and px text ignores every text-size preference the
// user has — see the type scale in theme/global.css.

/**
 * Screen frame. A System header: the title in the display mono, lit, with a
 * monospace subtitle beneath and a rule closing the block off from the content.
 */
export function Screen({ title, subtitle, action, children }) {
  return (
    <div style={S.screen}>
      <header style={S.header}>
        <div style={{ minWidth: 0, flex: 1 }}>
          <h1 className="glow" style={S.title}>
            {title}
          </h1>
          {subtitle && <p style={S.subtitle}>{subtitle}</p>}
        </div>
        {action}
      </header>
      {children}
    </div>
  )
}

/**
 * Section label, ruled top and bottom.
 *
 * The System window announces every block between two thin bright lines. Here
 * that is one hairline above the label and one below, which also does the job
 * the old bare overline was doing badly: separating a section from whatever
 * panel ended immediately above it.
 */
export function Overline({ children, style }) {
  return (
    <div style={{ ...S.overlineWrap, ...style }}>
      <h2 style={S.overline}>{children}</h2>
    </div>
  )
}

/**
 * A soft filled cell. `flush` drops the padding for content that rules itself
 * — and because the fill is now real, flush children must clip to the corners,
 * which is what `overflow: hidden` on the panel is for.
 */
export function Panel({ children, style, flush = false }) {
  return <div style={{ ...S.panel, ...(flush ? { padding: 0 } : null), ...style }}>{children}</div>
}

/**
 * A separator inside a panel. `--rule` is the quieter of the two hairlines:
 * `--border` marks where a cell ends, this marks where a record ends.
 */
export function Rule({ style }) {
  return <div style={{ ...S.ruleLine, ...style }} />
}

export function Button({ children, variant = 'primary', style, ...rest }) {
  return (
    <button style={{ ...S.button, ...S.buttonVariants[variant], ...style }} {...rest}>
      {children}
    </button>
  )
}

/**
 * Inline monospace. For anything measured — a count, a time, a dose, a quest
 * number. Never for prose; that distinction is what stops the mono reading as
 * a costume.
 */
export function Data({ children, style }) {
  return <span style={{ ...S.data, ...style }}>{children}</span>
}

/**
 * A quest number, `Q07`, in its own hairline cell. Every habit carries one:
 * it is the catalogue's spine, and it is where the RPG vocabulary and the
 * record-sleeve grammar turn out to be the same idea.
 */
export function QuestNumber({ n, style }) {
  return (
    <span style={{ ...S.questNumber, ...style }} aria-hidden="true">
      Q{String(n).padStart(2, '0')}
    </span>
  )
}

/**
 * Empty state. No emoji: the world's own answer to "nothing here yet" is an
 * unpressed record — a strip of hollow blocks waiting to be filled.
 */
export function EmptyState({ title, hint, action }) {
  return (
    <div style={S.empty}>
      <div style={S.emptyBlocks} aria-hidden="true">
        {Array.from({ length: 7 }, (_, i) => (
          <span key={i} style={S.emptyBlock} />
        ))}
      </div>
      <div style={S.emptyTitle}>{title}</div>
      {hint && <div style={S.emptyHint}>{hint}</div>}
      {action && <div style={{ marginTop: 20 }}>{action}</div>}
    </div>
  )
}

/**
 * Bottom sheet — the mobile replacement for the desktop app's inline forms.
 *
 * `footer` is pinned to the bottom of the sheet's own scroll area. On a real
 * phone the on-screen keyboard swallows most of the sheet, and a primary action
 * sitting at the end of the form ends up below the fold with no hint it exists.
 * Anything the user must be able to press belongs in `footer`, not `children`.
 */
export function Sheet({ open, title, onClose, footer, children }) {
  if (!open) return null
  return (
    <>
      <div style={S.scrim} onClick={onClose} />
      <div style={S.sheet} role="dialog" aria-modal="true" aria-label={title}>
        <div style={S.sheetHead}>
          <span style={S.sheetTitle}>{title}</span>
          <button onClick={onClose} style={S.sheetClose} aria-label="Close">
            ✕
          </button>
        </div>
        <div style={S.sheetBody}>{children}</div>
        {footer && <div style={S.sheetFooter}>{footer}</div>}
      </div>
    </>
  )
}

/**
 * Segmented control — a pill track with a pill-shaped selected segment.
 *
 * Stats, Habits, Medicines and Settings each carried their own copy of this,
 * which is how four supposedly identical controls ended up with three
 * different paddings. `options` is `[{ key, label }]`; `onChange` is handed the
 * key, so callers that need to build a whole object from it still can.
 */
export function Segmented({ options, value, onChange, style }) {
  return (
    <div style={{ ...S.segmented, ...style }}>
      {options.map((opt) => {
        const selected = value === opt.key
        return (
          <button
            key={opt.key}
            type="button"
            aria-pressed={selected}
            onClick={() => onChange(opt.key)}
            style={{ ...S.segment, ...(selected ? S.segmentOn : null) }}
          >
            {opt.label}
          </button>
        )
      })}
    </div>
  )
}

export function Field({ label, children }) {
  return (
    <label style={S.field}>
      <span style={S.fieldLabel}>{label}</span>
      {children}
    </label>
  )
}

export const inputStyle = {
  background: 'var(--input)',
  border: '1px solid var(--border)',
  color: 'var(--text)',
  padding: '12px 14px',
  fontSize: 'var(--fs-base)',
  width: '100%',
  minHeight: 'var(--touch)',
  outline: 'none',
  // Not a pill: a pill-shaped text field pushes its caret away from the edge
  // and reads as a search box. Fields are containers, so they take the small
  // container radius.
  borderRadius: 'var(--radius-sm)'
}

const S = {
  screen: {
    // `--dock-clearance` is the floating bar's real footprint plus a gutter,
    // defined next to the metrics it is derived from. This used to spell the
    // sum out as `--tab-height + 40px`, which left 20px clear and no record of
    // where the 40 came from. See global.css.
    padding: `calc(var(--safe-top) + 20px) 18px var(--dock-clearance)`,
    maxWidth: 720,
    margin: '0 auto'
  },
  header: {
    display: 'flex',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
    paddingBottom: 14,
    marginBottom: 20,
    borderBottom: '1px solid var(--border)'
  },
  // The display face is the mono. Archivo's condensed axis carried the old
  // world's engraved masthead; the System has no engraving — it has terminal
  // type, opened up and lit.
  title: {
    fontFamily: 'var(--font-mono)',
    fontSize: 'var(--fs-2xl)',
    fontWeight: 700,
    letterSpacing: '0.08em',
    textTransform: 'uppercase',
    lineHeight: 1.1
  },
  subtitle: {
    fontFamily: 'var(--font-mono)',
    color: 'var(--textDim)',
    fontSize: 'var(--fs-2xs)',
    letterSpacing: '0.12em',
    textTransform: 'uppercase',
    marginTop: 7
  },
  // More space above than below: the label belongs to what follows it.
  overlineWrap: {
    margin: '28px 0 10px',
    borderTop: '1px solid var(--rule)',
    borderBottom: '1px solid var(--rule)',
    padding: '7px 0'
  },
  overline: {
    fontFamily: 'var(--font-mono)',
    fontSize: 'var(--fs-2xs)',
    fontWeight: 600,
    textTransform: 'uppercase',
    letterSpacing: '0.14em',
    color: 'var(--textMuted)'
  },
  panel: {
    background: 'var(--panel)',
    border: '1px solid var(--border)',
    borderRadius: 'var(--radius)',
    // Flush panels put full-bleed rows and strips against the edge; without
    // this they square off the corners the panel just paid for.
    overflow: 'hidden',
    padding: 16
  },
  ruleLine: { height: 1, background: 'var(--rule)' },
  button: {
    padding: '12px 20px',
    fontSize: 'var(--fs-sm)',
    fontWeight: 700,
    textTransform: 'uppercase',
    letterSpacing: '0.1em',
    borderRadius: 'var(--radius-pill)',
    whiteSpace: 'nowrap'
  },
  buttonVariants: {
    // The committed action is the inverted one — PULSE ground, VOID label.
    primary: { background: 'var(--text)', color: 'var(--onInk)' },
    ghost: { background: 'transparent', color: 'var(--text)', border: '1px solid var(--border)' },
    danger: { background: 'transparent', color: 'var(--danger)', border: '1px solid var(--danger)' }
  },
  data: {
    fontFamily: 'var(--font-mono)',
    fontVariantNumeric: 'tabular-nums',
    letterSpacing: '0.06em'
  },
  questNumber: {
    fontFamily: 'var(--font-mono)',
    fontSize: 'var(--fs-3xs)',
    fontWeight: 600,
    letterSpacing: '0.1em',
    color: 'var(--textMuted)',
    border: '1px solid var(--rule)',
    borderRadius: 'var(--radius-pill)',
    padding: '2px 6px',
    lineHeight: 1
  },
  segmented: {
    display: 'flex',
    border: '1px solid var(--border)',
    borderRadius: 'var(--radius-pill)',
    padding: 3,
    gap: 3
  },
  segment: {
    flex: 1,
    minWidth: 0,
    padding: '8px 10px',
    fontFamily: 'var(--font-mono)',
    fontSize: 'var(--fs-2xs)',
    fontWeight: 600,
    letterSpacing: '0.08em',
    textTransform: 'uppercase',
    background: 'transparent',
    color: 'var(--textDim)',
    borderRadius: 'var(--radius-pill)'
    // No minHeight override: each segment is a tap target in its own right and
    // keeps the global 48dp floor, which makes the track 56px tall.
  },
  segmentOn: { background: 'var(--text)', color: 'var(--onInk)' },
  empty: { textAlign: 'center', padding: '52px 16px' },
  emptyBlocks: { display: 'flex', gap: 4, justifyContent: 'center', marginBottom: 22 },
  emptyBlock: {
    width: 12,
    height: 12,
    border: '1px solid var(--border)'
  },
  emptyTitle: {
    fontSize: 'var(--fs-base)',
    fontWeight: 700,
    fontStretch: '86%',
    letterSpacing: '0.03em',
    textTransform: 'uppercase',
    color: 'var(--text)'
  },
  emptyHint: {
    fontSize: 'var(--fs-md)',
    marginTop: 8,
    lineHeight: 1.6,
    color: 'var(--textDim)',
    maxWidth: 34 + 'ch',
    marginLeft: 'auto',
    marginRight: 'auto'
  },
  scrim: {
    position: 'fixed',
    inset: 0,
    background: 'var(--scrim)',
    zIndex: 40
  },
  sheet: {
    position: 'fixed',
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 41,
    background: 'var(--panel)',
    borderTop: '1px solid var(--border)',
    // Top corners only. A sheet rounded at the bottom would float above the
    // screen edge with a sliver of scrim under it, which is not what it is —
    // it is anchored to the bottom of the device.
    borderRadius: 'var(--radius) var(--radius) 0 0',
    maxHeight: '85vh',
    overflowY: 'auto',
    paddingBottom: 'var(--safe-bottom)'
  },
  sheetHead: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '12px 16px',
    borderBottom: '1px solid var(--rule)',
    position: 'sticky',
    top: 0,
    background: 'var(--panel)',
    borderRadius: 'var(--radius) var(--radius) 0 0'
  },
  sheetTitle: {
    fontFamily: 'var(--font-mono)',
    fontSize: 'var(--fs-2xs)',
    fontWeight: 600,
    textTransform: 'uppercase',
    letterSpacing: '0.14em',
    color: 'var(--textDim)'
  },
  sheetClose: { color: 'var(--textDim)', fontSize: 'var(--fs-base)' },
  sheetBody: { padding: 16 },
  sheetFooter: {
    position: 'sticky',
    bottom: 0,
    background: 'var(--panel)',
    borderTop: '1px solid var(--rule)',
    padding: '12px 16px',
    display: 'flex',
    gap: 8
  },
  field: { display: 'block', marginBottom: 16 },
  fieldLabel: {
    display: 'block',
    fontFamily: 'var(--font-mono)',
    fontSize: 'var(--fs-2xs)',
    fontWeight: 600,
    textTransform: 'uppercase',
    letterSpacing: '0.14em',
    color: 'var(--textDim)',
    marginBottom: 8
  }
}
