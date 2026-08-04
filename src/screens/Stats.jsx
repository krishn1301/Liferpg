import { useMemo, useState } from 'react'
import { useStore } from '../state/StoreProvider'
import { useToday } from '../state/useToday'
import { addDays, startOfWeek, dayOfWeek } from '../domain/dates'
import { categoryStats, dailyTrend, habitBreakdown, overview, vowBreakdown } from '../domain/stats'
import { logAverages, moodByCompletion } from '../domain/daily'
import { earnedBadges } from '../domain/xp'
import { LOG_SCALE } from '../domain/constants'
import { Screen, Overline, Panel, Rule, EmptyState, Data, Segmented } from '../components/ui'
import { Pulsar } from '../components/catalog'

const RANGES = [
  { days: 7, label: '7d' },
  { days: 30, label: '30d' },
  { days: 90, label: '90d' }
]

const WEEKDAYS = ['M', 'T', 'W', 'T', 'F', 'S', 'S']

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
  const vows = useMemo(() => vowBreakdown(doc.habits, today), [doc.habits, today])
  const log = useMemo(() => logAverages(doc.dailyLogs, from, today), [doc.dailyLogs, from, today])
  const split = useMemo(
    () => moodByCompletion(doc.habits, doc.dailyLogs, from, today),
    [doc.habits, doc.dailyLogs, from, today]
  )
  const badges = useMemo(() => earnedBadges(doc.habits, today), [doc.habits, today])

  // The pulsar plot wants one ridge per week, weekday across. A day with
  // nothing scheduled contributes 0 rather than being dropped, so the ridges
  // stay aligned to real weekdays instead of sliding.
  const weeks = useMemo(() => {
    const byWeek = new Map()
    for (const day of trend) {
      const wk = startOfWeek(day.dateKey)
      if (!byWeek.has(wk)) byWeek.set(wk, Array(7).fill(0))
      const dow = dayOfWeek(day.dateKey)
      byWeek.get(wk)[dow === 0 ? 6 : dow - 1] = day.due ? day.pct / 100 : 0
    }
    return [...byWeek.entries()].sort(([a], [b]) => (a < b ? -1 : 1)).map(([, v]) => v)
  }, [trend])

  // Vows are outside every rate in this screen — see stats.js. If they are all
  // there is, the whole completion half of the page has no data to stand on.
  const measurable = rows.length > 0

  if (!stats.tracked) {
    return (
      <Screen title="Stats">
        <EmptyState
          title="Nothing to measure yet"
          hint="Add a habit and check it off for a few days — the numbers show up here."
        />
      </Screen>
    )
  }

  return (
    <Screen
      title="Stats"
      subtitle={`Last ${days} days`}
      action={<RangePicker value={days} onChange={setDays} />}
    >
      {/* A spec sheet, not a grid of tiles. Six numbers in a ruled column are
          read top-to-bottom in one pass; six centred cards make the eye hop. */}
      <Panel flush>
        {/* A completion rate needs something with due days behind it. Someone
            tracking only vows would otherwise read a permanent 0% for a month
            they never missed a single thing. */}
        {measurable && (
          <>
            <Spec label="Completion" value={`${stats.rate}%`} lead />
            <Rule />
          </>
        )}
        <Spec label="Current streak" value={stats.longestCurrent} lead={!measurable} />
        <Rule />
        <Spec label="Best ever" value={stats.allTimeBest} />
        <Rule />
        <Spec label="Habits" value={stats.tracked} />
        {measurable && (
          <>
            <Rule />
            <Spec label="Completions" value={stats.completions} />
          </>
        )}
        <Rule />
        <Spec label="Total XP" value={stats.xp} />
      </Panel>

      {measurable && (
        <>
          <Overline>Trend</Overline>
          <Panel style={{ padding: '18px 14px 12px' }}>
            <Pulsar weeks={weeks} />
            <div style={S.axis} aria-hidden="true">
              {WEEKDAYS.map((d, i) => (
                <span key={i} style={S.axisTick}>
                  {d}
                </span>
              ))}
            </div>
            <p style={S.plotNote}>One ridge per week, oldest at the back. Front is this week.</p>
          </Panel>

          <Overline>By category</Overline>
          <Panel flush>
            {cats.map((cat, i) => (
              <div key={cat.key}>
                {i > 0 && <Rule />}
                <Bar
                  label={cat.label}
                  color={cat.color}
                  pct={cat.pct}
                  note={cat.due ? `${cat.done} of ${cat.due}` : 'none due'}
                />
              </div>
            ))}
          </Panel>

          <Overline>By habit</Overline>
          <Panel flush>
            {rows.map((row, i) => (
              <div key={row.id}>
                {i > 0 && <Rule />}
                <Bar
                  label={`${row.icon ?? '⭐'} ${row.name}`}
                  color={row.color}
                  pct={row.pct}
                  note={row.due ? `${row.done} of ${row.due}` : 'none due'}
                  trailing={row.streak > 0 ? `run ${row.streak}` : null}
                />
              </div>
            ))}
          </Panel>
        </>
      )}

      {vows.length > 0 && (
        <>
          <Overline>Vows</Overline>
          {/* Deliberately outside every aggregate above. A vow has no due days
              and so no rate to sort by; the question it answers is the opposite
              of "By habit"'s — not which am I neglecting, but how long have I
              held. Longest run first. */}
          <Panel flush>
            {vows.map((vow, i) => (
              <div key={vow.id}>
                {i > 0 && <Rule />}
                <div style={S.vow}>
                  <div style={S.vowTop}>
                    <span style={S.vowName}>
                      {vow.icon ?? '🚫'} {vow.name}
                    </span>
                    <Data style={S.vowStreak}>{vow.streak} d</Data>
                  </div>
                  <Data style={S.vowNote}>
                    Best {vow.best} · {vow.cleanDays} clean days ·{' '}
                    {vow.relapses === 0
                      ? 'never broken'
                      : `${vow.relapses} ${vow.relapses === 1 ? 'relapse' : 'relapses'}`}
                  </Data>
                </div>
              </div>
            ))}
          </Panel>
        </>
      )}

      {log.logged > 0 && (
        <>
          <Overline>How you felt</Overline>
          <Panel flush>
            {/* Either can be absent on its own: logging energy and skipping
                mood is a normal evening. An em dash, never a zero. */}
            <Spec
              label="Average mood"
              value={log.mood === null ? '—' : `${log.mood} / ${LOG_SCALE}`}
              lead
            />
            <Rule />
            <Spec
              label="Average energy"
              value={log.energy === null ? '—' : `${log.energy} / ${LOG_SCALE}`}
            />
            <Rule />
            <Spec label="Water a day" value={`${log.water} glasses`} />
            <Rule />
            <Spec label="Days logged" value={`${log.logged} of ${log.days}`} />
          </Panel>

          {/* Two averages, deliberately — not a correlation coefficient. A
              month of data from one person cannot support one, and printing
              "r = 0.62" would dress up noise as a finding. */}
          {split.perfect !== null && split.other !== null && (
            <Panel style={{ marginTop: 8 }}>
              <p style={S.plotNote}>
                Mood averaged <strong>{split.perfect}</strong> on the {split.perfectDays} day
                {split.perfectDays === 1 ? '' : 's'} you finished everything, against{' '}
                <strong>{split.other}</strong> on the {split.otherDays} day
                {split.otherDays === 1 ? '' : 's'} you did not.
              </p>
            </Panel>
          )}
        </>
      )}

      <Overline>Badges</Overline>
      <Panel flush>
        {badges.map((badge, i) => (
          <div key={badge.id}>
            {i > 0 && <Rule />}
            <div style={{ ...S.badge, opacity: badge.earned ? 1 : 0.45 }}>
              {/* Earned reads as a pressed block, unearned as an empty one —
                  the same alphabet as every code strip in the app. */}
              <span
                style={{
                  ...S.badgeBlock,
                  background: badge.earned ? 'var(--accent)' : 'transparent',
                  borderColor: badge.earned ? 'var(--accent)' : 'var(--border)'
                }}
              />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={S.badgeLabel}>{badge.label}</div>
                <div style={S.badgeDesc}>{badge.desc}</div>
              </div>
              <Data style={S.badgeState}>{badge.earned ? 'Earned' : 'Locked'}</Data>
            </div>
          </div>
        ))}
      </Panel>
    </Screen>
  )
}

function RangePicker({ value, onChange }) {
  return (
    <Segmented
      options={RANGES.map((r) => ({ key: r.days, label: r.label }))}
      value={value}
      onChange={onChange}
    />
  )
}

function Spec({ label, value, lead }) {
  return (
    <div style={S.spec}>
      <Data style={S.specLabel}>{label}</Data>
      <span style={{ ...S.specValue, ...(lead ? S.specLead : null) }}>{value}</span>
    </div>
  )
}

function Bar({ label, color, pct, note, trailing }) {
  return (
    <div style={S.barRow}>
      <div style={S.barHead}>
        <span style={S.barLabel}>{label}</span>
        <Data style={S.barPct}>{pct}%</Data>
      </div>
      <div style={S.barTrack}>
        <div style={{ ...S.barFill, transform: `scaleX(${pct / 100})`, background: color }} />
      </div>
      <Data style={S.barNote}>
        {note}
        {trailing && ` · ${trailing}`}
      </Data>
    </div>
  )
}

const S = {
  vow: { padding: '12px 16px' },
  vowTop: {
    display: 'flex',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    gap: 12
  },
  vowName: {
    fontSize: 'var(--fs-base)',
    fontWeight: 600,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap'
  },
  vowStreak: { fontSize: 'var(--fs-base)', fontWeight: 700, flexShrink: 0 },
  vowNote: {
    display: 'block',
    marginTop: 6,
    fontSize: 'var(--fs-2xs)',
    letterSpacing: '0.1em',
    textTransform: 'uppercase',
    color: 'var(--textMuted)'
  },
  spec: {
    display: 'flex',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    gap: 12,
    padding: '11px 16px'
  },
  specLabel: {
    fontSize: 'var(--fs-2xs)',
    letterSpacing: '0.14em',
    textTransform: 'uppercase',
    color: 'var(--textMuted)'
  },
  specValue: {
    fontFamily: 'var(--font-mono)',
    fontVariantNumeric: 'tabular-nums',
    fontSize: 'var(--fs-base)',
    fontWeight: 700
  },
  // The one figure worth reading first gets the signal colour and the size.
  specLead: { fontSize: 'var(--fs-xl)', color: 'var(--accent)' },
  axis: { display: 'flex', marginTop: 8 },
  axisTick: {
    flex: 1,
    fontFamily: 'var(--font-mono)',
    fontSize: 'var(--fs-3xs)',
    letterSpacing: '0.1em',
    color: 'var(--textMuted)',
    textAlign: 'center'
  },
  plotNote: {
    fontSize: 'var(--fs-2xs)',
    color: 'var(--textMuted)',
    marginTop: 10,
    lineHeight: 1.5
  },
  barRow: { padding: '12px 16px' },
  barHead: { display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 10 },
  barLabel: {
    fontSize: 'var(--fs-md)',
    fontWeight: 600,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap'
  },
  barPct: { fontSize: 'var(--fs-sm)', fontWeight: 700, flexShrink: 0 },
  barTrack: { height: 4, background: 'var(--rule)', margin: '9px 0 6px', overflow: 'hidden' },
  // Scaled, not resized: animating `width` relayouts every row on a range switch.
  barFill: { height: '100%', width: '100%', transformOrigin: 'left', transition: 'transform 0.4s' },
  barNote: {
    fontSize: 'var(--fs-2xs)',
    letterSpacing: '0.08em',
    textTransform: 'uppercase',
    color: 'var(--textMuted)'
  },
  badge: { display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px' },
  badgeBlock: { width: 12, height: 12, flexShrink: 0, border: '1px solid' },
  badgeLabel: { fontSize: 'var(--fs-md)', fontWeight: 600 },
  badgeDesc: { fontSize: 'var(--fs-2xs)', color: 'var(--textDim)', marginTop: 3 },
  badgeState: {
    fontSize: 'var(--fs-3xs)',
    letterSpacing: '0.12em',
    textTransform: 'uppercase',
    color: 'var(--textMuted)',
    flexShrink: 0
  }
}
