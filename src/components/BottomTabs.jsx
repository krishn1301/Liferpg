import { NavLink } from 'react-router-dom'

// Eight desktop sidebar entries don't fit a phone. The five people touch daily
// get tabs; the rest live behind More.
export const TABS = [
  { to: '/', icon: '✅', label: 'Today', end: true },
  { to: '/habits', icon: '📋', label: 'Habits' },
  { to: '/stats', icon: '📊', label: 'Stats' },
  { to: '/day', icon: '🕐', label: 'My Day' },
  { to: '/more', icon: '⋯', label: 'More' }
]

export default function BottomTabs() {
  return (
    <nav style={S.bar}>
      {TABS.map((tab) => (
        <NavLink key={tab.to} to={tab.to} end={tab.end} style={S.link}>
          {({ isActive }) => (
            <span style={{ ...S.item, ...(isActive ? S.itemActive : null) }}>
              <span style={S.icon}>{tab.icon}</span>
              <span style={S.label}>{tab.label}</span>
            </span>
          )}
        </NavLink>
      ))}
    </nav>
  )
}

const S = {
  bar: {
    position: 'fixed',
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 30,
    display: 'grid',
    gridTemplateColumns: `repeat(${TABS.length}, 1fr)`,
    background: 'var(--surface)',
    borderTop: '1px solid var(--border)',
    paddingBottom: 'var(--safe-bottom)'
  },
  link: { textDecoration: 'none' },
  item: {
    height: 'var(--tab-height)',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
    color: 'var(--textMuted)',
    // Matches the desktop app's active-nav treatment, moved to the top edge.
    // Longhand only — mixing borderTop with borderTopColor makes React warn
    // and can leave the colour stranded between renders.
    borderTopWidth: 2,
    borderTopStyle: 'solid',
    borderTopColor: 'transparent'
  },
  itemActive: { color: 'var(--accent)', borderTopColor: 'var(--accent)' },
  icon: { fontSize: 'var(--fs-lg)', lineHeight: 1 },
  label: { fontSize: 'var(--fs-2xs)', fontWeight: 600, letterSpacing: '0.02em' }
}
