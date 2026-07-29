import { useMemo, useState } from 'react'
import { useStore } from '../state/StoreProvider'
import { useToday } from '../state/useToday'
import { addDays, fromDateKey } from '../domain/dates'
import { categoryStats, dailyTrend, habitBreakdown, overview } from '../domain/stats'
import { earnedBadges } from '../domain/xp'
import { Screen, SectionTitle, Card, EmptyState } from '../components/ui'

const RANGES = [
  { days: 7, label: '7d' },
  { days: 30, label: '30d' },
  { days: 90, label: '90d' }
]

export default function Stats() {
  const { doc } = useStore()
  const today = useToday()
  const [days, setDays] = useState(30)

  const from = useMemo(() => addDays(today, -(days - 1)), [today, days])

  const stats = useMemo(() => overview(doc.habits, today, from), [doc.habits, today, from])
  const cats = useMemo(() => categoryStats(doc.habits, from, today), [doc.habits, from, today])
  const trend = useMemo(() => dailyTrend(doc.habits, from, today), [doc.habits, from, today])
  const rows = useMemo(
    () => habitBreakdown(doc.habits, from, today, today),
    [doc.habits, from, today]
  )
  const badges = useMemo(() => earnedBadges(doc.habits, today), [doc.habits, today])

  if (!stats.tracked) {
    return (
      <Screen title="Stats">
        <EmptyState
          icon="📊"
          title="Nothing to measure yet"
          hint="Add a habit and check it off for a few days — the numbers show up here."
        />
      </Screen>
    )
  }

  return (
    <Screen title="Stats" subtitle={`Last ${days} days`} action={<RangePicker value={days} onChange={setDays} />}>
      <div style={S.tiles}>
        <Tile value={`${stats.rate}%`} label="Completion" accent />
        <Tile value={stats.longestCurrent} label="Current streak" />
        <Tile value={stats.allTimeBest} label="Best ever" />
        <Tile value={stats.tracked} label="Habits" />
        <Tile value={stats.completions} label="Completions" />
        <Tile value={stats.xp} label="Total XP" />
      </div>

      <SectionTitle>Trend</SectionTitle>
      <Card style={{ padding: '16px 14px' }}>
        <Trend trend={trend} />
      </Card>

      <SectionTitle>By category</SectionTitle>
      <div style={S.list}>
        {cats.map((cat) => (
          <Bar
            key={cat.key}
            label={cat.label}
            color={cat.color}
            pct={cat.pct}
            note={cat.due ? `${cat.done}/${cat.due}` : 'none due'}
          />
        ))}
      </div>

      <SectionTitle>By habit</SectionTitle>
      <div style={S.list}>
        {rows.map((row) => (
          <Bar
            key={row.id}
            label={`${row.icon ?? '⭐'} ${row.name}`}
            color={row.color}
            pct={row.pct}
            note={row.due ? `${row.done}/${row.due}` : 'none due'}
            trailing={row.streak > 0 ? `${row.streak}🔥` : null}
          />
        ))}
      </div>

      <SectionTitle>Badges</SectionTitle>
      <div style={S.badges}>
        {badges.map((badge) => (
          <div key={badge.id} style={{ ...S.badge, opacity: badge.earned ? 1 : 0.32 }}>
            <div style={{ fontSize: 'var(--fs-xl)' }}>{badge.icon}</div>
            <div style={S.badgeLabel}>{badge.label}</div>
            <div style={S.badgeDesc}>{badge.desc}</div>
          </div>
        ))}
      </div>
    </Screen>
  )
}

function RangePicker({ value, onChange }) {
  return (
    <div style={S.segmented}>
      {RANGES.map((range) => (
        <button
          key={range.days}
          onClick={() => onChange(range.days)}
          aria-pressed={value === range.days}
          style={{
            ...S.segment,
            background: value === range.days ? 'var(--accent)' : 'transparent',
            color: value === range.days ? 'var(--onAccent)' : 'var(--textDim)'
          }}
        >
          {range.label}
        </button>
      ))}
    </div>
  )
}

function Tile({ value, label, accent }) {
  return (
    <div style={S.tile}>
      <div style={{ ...S.tileValue, color: accent ? 'var(--accent)' : 'var(--text)' }}>{value}</div>
      <div style={S.tileLabel}>{label}</div>
    </div>
  )
}

/**
 * A bar per day. Deliberately hand-drawn rather than a charting library: 30–90
 * bars on a 412 px screen is a strip, not a plot, and it keeps the bundle small
 * enough to open instantly on a cheap phone.
 */
function Trend({ trend }) {
  const labelEvery = Math.ceil(trend.length / 5)

  return (
    <div>
      <div style={S.trendRow}>
        {trend.map((day) => (
          <div key={day.dateKey} style={S.trendCol} title={`${day.dateKey}: ${day.done}/${day.due}`}>
            <div
              style={{
                ...S.trendBar,
                // A day with nothing scheduled is not a 0% day — show it hollow.
                transform: `scaleY(${day.due ? Math.max(day.pct, 3) / 100 : 0.03})`,
                background: day.due ? 'var(--accent)' : 'var(--border)',
                opacity: day.due ? 0.35 + (day.pct / 100) * 0.65 : 1
              }}
            />
          </div>
        ))}
      </div>
      <div style={S.trendAxis}>
        {trend.map((day, i) => (
          <span key={day.dateKey} style={S.trendTick}>
            {i % labelEvery === 0 ? fromDateKey(day.dateKey).getDate() : ''}
          </span>
        ))}
      </div>
    </div>
  )
}

function Bar({ label, color, pct, note, trailing }) {
  return (
    <div style={S.barRow}>
      <div style={S.barHead}>
        <span style={S.barLabel}>{label}</span>
        <span style={S.barPct}>
          {trailing && <span style={S.barStreak}>{trailing} </span>}
          {pct}%
        </span>
      </div>
      <div style={S.barTrack}>
        <div style={{ ...S.barFill, transform: `scaleX(${pct / 100})`, background: color }} />
      </div>
      <div style={S.barNote}>{note}</div>
    </div>
  )
}

const S = {
  segmented: { display: 'flex', border: '1px solid var(--border)' },
  segment: {
    padding: '8px 10px',
    fontSize: 'var(--fs-xs)',
    fontWeight: 700,
    letterSpacing: '0.04em'
  },
  tiles: { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 },
  tile: {
    background: 'var(--card)',
    border: '1px solid var(--border)',
    padding: '14px 10px',
    textAlign: 'center'
  },
  tileValue: { fontSize: 'var(--fs-xl)', fontWeight: 800, lineHeight: 1.1 },
  tileLabel: {
    fontSize: 'var(--fs-3xs)',
    fontWeight: 600,
    textTransform: 'uppercase',
    letterSpacing: '0.06em',
    color: 'var(--textMuted)',
    marginTop: 6
  },
  trendRow: { display: 'flex', alignItems: 'flex-end', gap: 2, height: 72 },
  trendCol: { flex: 1, height: '100%', display: 'flex', alignItems: 'flex-end' },
  // Full-height bar scaled down from its base, rather than a short bar grown
  // taller: animating `height` relayouts all 90 columns on every range switch.
  trendBar: { width: '100%', height: '100%', transformOrigin: 'bottom', transition: 'transform 0.3s' },
  trendAxis: { display: 'flex', gap: 2, marginTop: 6 },
  trendTick: {
    flex: 1,
    fontSize: 'var(--fs-3xs)',
    color: 'var(--textMuted)',
    textAlign: 'center',
    overflow: 'hidden'
  },
  list: { display: 'flex', flexDirection: 'column', gap: 12 },
  barRow: {
    background: 'var(--card)',
    border: '1px solid var(--border)',
    padding: '11px 13px'
  },
  barHead: { display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 10 },
  barLabel: {
    fontSize: 'var(--fs-md)',
    fontWeight: 600,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap'
  },
  barPct: { fontSize: 'var(--fs-sm)', fontWeight: 700, flexShrink: 0 },
  barStreak: { color: 'var(--warn)' },
  barTrack: { height: 4, background: 'var(--bg)', margin: '8px 0 5px', overflow: 'hidden' },
  barFill: { height: '100%', width: '100%', transformOrigin: 'left', transition: 'transform 0.4s' },
  barNote: { fontSize: 'var(--fs-2xs)', color: 'var(--textMuted)' },
  badges: { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 },
  badge: {
    background: 'var(--card)',
    border: '1px solid var(--border)',
    padding: '14px 8px',
    textAlign: 'center'
  },
  badgeLabel: { fontSize: 'var(--fs-2xs)', fontWeight: 700, marginTop: 7 },
  badgeDesc: { fontSize: 'var(--fs-3xs)', color: 'var(--textMuted)', marginTop: 3 }
}
