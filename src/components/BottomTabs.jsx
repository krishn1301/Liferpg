import { NavLink } from 'react-router-dom'

// Eight desktop sidebar entries don't fit a phone. The five people touch daily
// get tabs; the rest live behind More.
//
// The marks are drawn, not emoji. Emoji is the one thing in this world that
// cannot be made to fit — it drags in another vendor's colour and roundness at
// the exact size where the design is nothing but hairlines. Emoji survives only
// where it is *user data* (a habit's own icon), never in the chrome.

const Mark = ({ d, fill }) => (
  <svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true" style={{ display: 'block' }}>
    <path
      d={d}
      fill={fill ? 'currentColor' : 'none'}
      stroke="currentColor"
      strokeWidth="1.25"
      vectorEffect="non-scaling-stroke"
    />
  </svg>
)

// Today: a pressed block. Habits: a catalogue of ruled entries. Stats: the
// ridgeline. My Day: a graduated time rule. More: the rest of the index.
const MARKS = {
  today: { d: 'M2.5 2.5h11v11h-11z', fill: true },
  habits: { d: 'M2.5 3.5h11M2.5 8h11M2.5 12.5h11' },
  stats: { d: 'M1.5 12C3 12 3.5 5 5.5 5S8 11 10 11s2.5-7 4.5-7' },
  day: { d: 'M8 1.5v13M4.5 4h7M4.5 8h7M4.5 12h7' },
  more: { d: 'M2.5 8h.01M8 8h.01M13.5 8h.01' }
}

export const TABS = [
  { to: '/', mark: 'today', label: 'Today', end: true },
  { to: '/habits', mark: 'habits', label: 'Habits' },
  { to: '/stats', mark: 'stats', label: 'Stats' },
  { to: '/day', mark: 'day', label: 'My Day' },
  { to: '/more', mark: 'more', label: 'More' }
]

export default function BottomTabs() {
  return (
    <div style={S.dock}>
      <nav style={S.bar}>
        {TABS.map((tab) => (
          <NavLink key={tab.to} to={tab.to} end={tab.end} style={S.link}>
            {({ isActive }) => (
              <span style={{ ...S.item, ...(isActive ? S.itemActive : null) }}>
                <Mark {...MARKS[tab.mark]} />
                <span style={S.label}>{tab.label}</span>
              </span>
            )}
          </NavLink>
        ))}
      </nav>
    </div>
  )
}

const S = {
  // The dock is a transparent gutter, not a bar. `pointerEvents: none` is what
  // keeps it from eating taps in the strip of content visible either side of
  // the floating bar — without it there is an invisible dead band across the
  // bottom of every screen.
  dock: {
    position: 'fixed',
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 30,
    padding: `0 12px calc(var(--safe-bottom) + 10px)`,
    pointerEvents: 'none'
  },
  bar: {
    pointerEvents: 'auto',
    display: 'grid',
    gridTemplateColumns: `repeat(${TABS.length}, 1fr)`,
    gap: 4,
    padding: 4,
    maxWidth: 480,
    margin: '0 auto',
    background: 'var(--panel)',
    border: '1px solid var(--border)',
    borderRadius: 'var(--radius-pill)'
  },
  link: { textDecoration: 'none' },
  item: {
    height: 'var(--tab-height)',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderRadius: 'var(--radius-pill)',
    color: 'var(--textMuted)'
  },
  // The selected cell inverts. Same mechanism as a finished habit and a primary
  // button: in this world "committed" always means PULSE ground, VOID ink.
  itemActive: { background: 'var(--text)', color: 'var(--onInk)' },
  label: {
    fontFamily: 'var(--font-mono)',
    fontSize: 'var(--fs-3xs)',
    fontWeight: 600,
    letterSpacing: '0.1em',
    textTransform: 'uppercase',
    lineHeight: 1
  }
}
