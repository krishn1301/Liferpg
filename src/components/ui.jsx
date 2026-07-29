// Shared primitives. The design language is the desktop app's: blocky, zero
// border-radius, monochrome, one emerald accent. Colours come from CSS custom
// properties so the light/dark swap is a single attribute on <html>.
//
// Font sizes are `var(--fs-*)` tokens, never numbers. A bare number in a React
// style object becomes px, and px text ignores every text-size preference the
// user has — see the type scale in theme/global.css.

export function Screen({ title, subtitle, action, children }) {
  return (
    <div style={S.screen}>
      <header style={S.header}>
        <div style={{ minWidth: 0 }}>
          <h1 style={S.title}>{title}</h1>
          {subtitle && <p style={S.subtitle}>{subtitle}</p>}
        </div>
        {action}
      </header>
      {children}
    </div>
  )
}

export function SectionTitle({ children }) {
  return <h2 style={S.sectionTitle}>{children}</h2>
}

export function Card({ children, style }) {
  return <div style={{ ...S.card, ...style }}>{children}</div>
}

export function Button({ children, variant = 'primary', style, ...rest }) {
  return (
    <button style={{ ...S.button, ...S.buttonVariants[variant], ...style }} {...rest}>
      {children}
    </button>
  )
}

export function EmptyState({ icon, title, hint, action }) {
  return (
    <div style={S.empty}>
      <div style={{ fontSize: 'var(--fs-4xl)', marginBottom: 12 }}>{icon}</div>
      <div style={{ fontSize: 'var(--fs-base)', fontWeight: 700 }}>{title}</div>
      {hint && <div style={S.emptyHint}>{hint}</div>}
      {action && <div style={{ marginTop: 18 }}>{action}</div>}
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
    marginBottom: 22
  },
  title: { fontSize: 'var(--fs-2xl)', fontWeight: 800, letterSpacing: '-0.02em' },
  subtitle: { color: 'var(--textDim)', fontSize: 'var(--fs-md)', marginTop: 4 },
  sectionTitle: {
    fontSize: 'var(--fs-2xs)',
    fontWeight: 700,
    textTransform: 'uppercase',
    letterSpacing: '0.12em',
    color: 'var(--textMuted)',
    margin: '26px 0 10px'
  },
  card: {
    background: 'var(--card)',
    border: '1px solid var(--border)',
    padding: 16
  },
  button: {
    padding: '11px 18px',
    fontSize: 'var(--fs-sm)',
    fontWeight: 700,
    textTransform: 'uppercase',
    letterSpacing: '0.06em',
    borderRadius: 0,
    whiteSpace: 'nowrap'
  },
  buttonVariants: {
    primary: { background: 'var(--accent)', color: 'var(--onAccent)' },
    ghost: { background: 'transparent', color: 'var(--textDim)', border: '1px solid var(--border)' },
    danger: { background: 'transparent', color: 'var(--danger)', border: '1px solid var(--danger)' }
  },
  empty: { textAlign: 'center', padding: '56px 16px', color: 'var(--textMuted)' },
  emptyHint: { fontSize: 'var(--fs-md)', marginTop: 6, lineHeight: 1.6, color: 'var(--textDim)' },
  scrim: {
    position: 'fixed',
    inset: 0,
    background: 'rgba(0,0,0,0.6)',
    zIndex: 40
  },
  sheet: {
    position: 'fixed',
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 41,
    background: 'var(--surface)',
    borderTop: '1px solid var(--border)',
    maxHeight: '85vh',
    overflowY: 'auto',
    paddingBottom: 'var(--safe-bottom)'
  },
  sheetHead: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '14px 16px',
    borderBottom: '1px solid var(--border)',
    position: 'sticky',
    top: 0,
    background: 'var(--surface)'
  },
  sheetTitle: {
    fontSize: 'var(--fs-xs)',
    fontWeight: 700,
    textTransform: 'uppercase',
    letterSpacing: '0.1em',
    color: 'var(--textDim)'
  },
  sheetClose: { color: 'var(--textDim)', fontSize: 'var(--fs-base)' },
  sheetBody: { padding: 16 },
  sheetFooter: {
    position: 'sticky',
    bottom: 0,
    background: 'var(--surface)',
    borderTop: '1px solid var(--border)',
    padding: '12px 16px',
    display: 'flex',
    gap: 8
  },
  field: { display: 'block', marginBottom: 16 },
  fieldLabel: {
    display: 'block',
    fontSize: 'var(--fs-2xs)',
    fontWeight: 700,
    textTransform: 'uppercase',
    letterSpacing: '0.08em',
    color: 'var(--textDim)',
    marginBottom: 7
  }
}
