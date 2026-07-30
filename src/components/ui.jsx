// Shared primitives for the catalogue world — see DESIGN.md.
//
// Two rules drive nearly everything here:
//
//   1. There is no elevation. A `Panel` is a 1px ruled cell on the page's own
//      black, not a lighter tile floating above it. Nothing has a shadow and
//      nothing has a radius. (This is why there is no `Card` any more: naming
//      the container after the thing the world rejects kept re-teaching the
//      wrong habit.)
//   2. Emphasis is inversion. The committed state — a primary button, a
//      finished habit, the selected tab — fills with PULSE and sets its text in
//      VOID. There is no third accent doing the job of contrast.
//
// Font sizes are `var(--fs-*)` tokens, never numbers. A bare number in a React
// style object becomes px, and px text ignores every text-size preference the
// user has — see the type scale in theme/global.css.

/**
 * Screen frame. The header is a catalogue masthead: an engraved condensed
 * title, a monospace subtitle beneath it, and a rule closing the block off
 * from the content.
 */
export function Screen({ title, subtitle, action, children }) {
  return (
    <div style={S.screen}>
      <header style={S.header}>
        <div style={{ minWidth: 0, flex: 1 }}>
          <h1 style={S.title}>{title}</h1>
          {subtitle && <p style={S.subtitle}>{subtitle}</p>}
        </div>
        {action}
      </header>
      {children}
    </div>
  )
}

/**
 * Monospace section label. Data-layer type: this names a block of records, so
 * it is set the same way a column heading is.
 */
export function Overline({ children, style }) {
  return <h2 style={{ ...S.overline, ...style }}>{children}</h2>
}

/** A ruled cell. `flush` drops the padding for content that rules itself. */
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
  borderRadius: 0
}

const S = {
  screen: {
    padding: `calc(var(--safe-top) + 20px) 18px calc(var(--tab-height) + var(--safe-bottom) + 28px)`,
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
  // Engraved: the width axis pushed to 78%, heavy, uppercase, opened up. This
  // is the only place the condensed axis is used — body text stays at 100%,
  // because condensed prose is slower to read and this app is read half awake.
  title: {
    fontSize: 'var(--fs-2xl)',
    fontWeight: 800,
    fontStretch: '78%',
    letterSpacing: '0.06em',
    textTransform: 'uppercase',
    lineHeight: 1.05
  },
  subtitle: {
    fontFamily: 'var(--font-mono)',
    color: 'var(--textDim)',
    fontSize: 'var(--fs-2xs)',
    letterSpacing: '0.12em',
    textTransform: 'uppercase',
    marginTop: 7
  },
  overline: {
    fontFamily: 'var(--font-mono)',
    fontSize: 'var(--fs-2xs)',
    fontWeight: 600,
    textTransform: 'uppercase',
    letterSpacing: '0.14em',
    color: 'var(--textMuted)',
    // More space above than below: the label belongs to what follows it.
    margin: '28px 0 10px'
  },
  panel: {
    background: 'transparent',
    border: '1px solid var(--border)',
    padding: 16
  },
  ruleLine: { height: 1, background: 'var(--rule)' },
  button: {
    padding: '12px 18px',
    fontSize: 'var(--fs-sm)',
    fontWeight: 700,
    textTransform: 'uppercase',
    letterSpacing: '0.1em',
    borderRadius: 0,
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
    padding: '2px 4px',
    lineHeight: 1
  },
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
    borderTop: '1px solid var(--text)',
    maxHeight: '85vh',
    overflowY: 'auto',
    paddingBottom: 'var(--safe-bottom)'
  },
  sheetHead: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '12px 16px',
    borderBottom: '1px solid var(--border)',
    position: 'sticky',
    top: 0,
    background: 'var(--panel)'
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
    borderTop: '1px solid var(--border)',
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
