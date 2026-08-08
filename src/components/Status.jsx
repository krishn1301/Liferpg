import { status } from '../domain/status'
import { xpSummary } from '../domain/xp'
import { Panel, Data } from './ui'

// The STATUS window: level, title, and one stat per category.
//
// Centred, unlike everything else in this app. That is deliberate and it is the
// only place it happens — the System's windows announce themselves down the
// middle, and a screen that does it everywhere loses the effect and the
// scannability of a left edge at the same time.

export default function Status({ habits, todayKey }) {
  const xp = xpSummary(habits, todayKey)
  const { block, title } = status(habits, todayKey)

  return (
    <Panel style={S.panel}>
      <Data style={S.label}>Level</Data>
      <div className="glow" style={S.level}>
        {xp.level}
      </div>

      {/* One row, not two. The other was "Job: Human". */}
      <div style={S.identity}>
        <Data style={S.idRow}>
          <span style={S.idKey}>Title</span> {title}
        </Data>
      </div>

      <div style={S.grid}>
        {block.map((stat) => (
          <div key={stat.key} style={S.stat}>
            <div style={S.statRow}>
              {/* The category's own colour, as a mark rather than as text —
                  these hues are pinned to clear 3:1 as fills, not 4.5:1 as
                  type. This is where category colour still lives now that the
                  code strip is monochrome. */}
              <span style={{ ...S.mark, background: stat.color }} aria-hidden="true" />
              <Data style={S.statName}>{stat.label}</Data>
              <Data style={S.statValue}>{stat.value}</Data>
            </div>
            {/* Progress toward the next point. Without it a stat that has not
                moved in three weeks looks identical to one that ticks over
                tomorrow, which is most of why this panel read as decoration. */}
            <span style={S.track} aria-hidden="true">
              <span style={{ ...S.trackFill, transform: `scaleX(${stat.progress})` }} />
            </span>
          </div>
        ))}
      </div>

      <Data style={S.foot}>Total {xp.total} XP · every stat derived</Data>
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
  stat: { padding: '6px 0 7px' },
  statRow: { display: 'flex', alignItems: 'center', gap: 8 },
  mark: { width: 8, height: 8, flexShrink: 0 },
  // Square, 2px, and only as wide as its own row. Same reasoning as the code
  // strip: this is a mark in a notation, so it does not get a corner radius.
  track: {
    display: 'block',
    height: 2,
    marginTop: 5,
    background: 'var(--rule)',
    overflow: 'hidden'
  },
  // scaleX rather than width — compositor-only, and there are eight of these.
  trackFill: {
    display: 'block',
    height: '100%',
    background: 'var(--textMuted)',
    transformOrigin: 'left'
  },
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
