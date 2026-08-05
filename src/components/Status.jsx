import { status } from '../domain/status'
import { levelFromXp, totalXp } from '../domain/xp'
import { Panel, Data } from './ui'

// The STATUS window: level, job, title, and one stat per category.
//
// Centred, unlike everything else in this app. That is deliberate and it is the
// only place it happens — the System's windows announce themselves down the
// middle, and a screen that does it everywhere loses the effect and the
// scannability of a left edge at the same time.

export default function Status({ habits, todayKey }) {
  const xp = totalXp(habits, todayKey)
  const level = levelFromXp(xp)
  const { block, job, title } = status(habits, todayKey)

  return (
    <Panel style={S.panel}>
      <Data style={S.label}>Level</Data>
      <div className="glow" style={S.level}>
        {level.level}
      </div>

      <div style={S.identity}>
        <Data style={S.idRow}>
          <span style={S.idKey}>Job</span> {job}
        </Data>
        <Data style={S.idRow}>
          <span style={S.idKey}>Title</span> {title}
        </Data>
      </div>

      <div style={S.grid}>
        {block.map((stat) => (
          <div key={stat.key} style={S.stat}>
            {/* The category's own colour, as a mark rather than as text — these
                hues are pinned to clear 3:1 as fills, not 4.5:1 as type. */}
            <span style={{ ...S.mark, background: stat.color }} aria-hidden="true" />
            <Data style={S.statName}>{stat.label}</Data>
            <Data style={S.statValue}>{stat.value}</Data>
          </div>
        ))}
      </div>

      <Data style={S.foot}>{xp} XP banked · every stat derived</Data>
    </Panel>
  )
}

const S = {
  panel: { padding: '20px 16px 16px', textAlign: 'center' },
  label: {
    display: 'block',
    fontSize: 'var(--fs-2xs)',
    fontWeight: 600,
    letterSpacing: '0.24em',
    textTransform: 'uppercase',
    color: 'var(--textMuted)'
  },
  // The one hero numeral on this screen. Not zero-padded like Today's: this is
  // the character's level, and "8" is what a status window says.
  level: {
    fontFamily: 'var(--font-mono)',
    fontSize: 'var(--fs-4xl)',
    fontWeight: 700,
    lineHeight: 1,
    letterSpacing: '0.02em',
    margin: '2px 0 16px'
  },
  identity: {
    display: 'flex',
    justifyContent: 'center',
    gap: 20,
    flexWrap: 'wrap',
    padding: '11px 0',
    borderTop: '1px solid var(--rule)',
    borderBottom: '1px solid var(--rule)'
  },
  idRow: { fontSize: 'var(--fs-md)', color: 'var(--text)' },
  idKey: {
    color: 'var(--textMuted)',
    letterSpacing: '0.14em',
    textTransform: 'uppercase',
    fontSize: 'var(--fs-2xs)',
    marginRight: 6
  },
  // Two columns, matching the source material's stat block. Eight rows in one
  // column would push the whole thing below the fold on a 411px screen.
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, 1fr)',
    gap: '2px 16px',
    margin: '16px 0 4px',
    textAlign: 'left'
  },
  stat: { display: 'flex', alignItems: 'center', gap: 8, padding: '7px 0' },
  mark: { width: 8, height: 8, flexShrink: 0 },
  statName: {
    flex: 1,
    minWidth: 0,
    fontSize: 'var(--fs-2xs)',
    letterSpacing: '0.1em',
    textTransform: 'uppercase',
    color: 'var(--textDim)',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap'
  },
  statValue: { fontSize: 'var(--fs-base)', fontWeight: 700, flexShrink: 0 },
  foot: {
    display: 'block',
    marginTop: 12,
    fontSize: 'var(--fs-3xs)',
    letterSpacing: '0.08em',
    textTransform: 'uppercase',
    color: 'var(--textMuted)'
  }
}
