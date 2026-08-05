import { Link } from 'react-router-dom'
import { useStore } from '../state/StoreProvider'
import { useToday } from '../state/useToday'
import { totalXp, levelFromXp, earnedBadges } from '../domain/xp'
import { dosesForDay } from '../domain/medicines'
import { Screen, Overline, Panel, Rule, Data } from '../components/ui'
import { TickScale } from '../components/catalog'

export default function More() {
  const { doc } = useStore()
  const today = useToday()

  const xp = totalXp(doc.habits)
  const level = levelFromXp(xp)
  const badges = earnedBadges(doc.habits, today)
  const earned = badges.filter((b) => b.earned).length
  const dosesLeft = dosesForDay(doc.medicines, doc.dailyLogs, today).filter((d) => !d.taken).length

  const links = [
    {
      to: '/calendar',
      label: 'Calendar',
      note: 'Month view and backfilling missed days'
    },
    {
      to: '/medicines',
      label: 'Medicines',
      note: dosesLeft
        ? `${dosesLeft} dose${dosesLeft === 1 ? '' : 's'} left today`
        : 'Doses and adherence'
    },
    {
      to: '/settings',
      label: 'Settings',
      note: 'Theme, backup and restore'
    }
  ]

  return (
    <Screen title="More" subtitle={`Level ${level.level} · ${xp} XP`}>
      <Panel style={{ padding: '14px 16px 16px' }}>
        <div style={S.heroTop}>
          <Data style={S.heroLabel}>Level</Data>
          <Data style={S.heroBadges}>
            {earned} of {badges.length} badges
          </Data>
        </div>
        <div className="glow" style={S.heroLevel}>
          {String(level.level).padStart(2, '0')}
        </div>
        <TickScale
          value={level.current / level.needed}
          label={`Level ${level.level}, ${level.current} of ${level.needed} XP to level ${level.level + 1}`}
        />
        <Data style={S.heroSub}>
          {level.current} / {level.needed} to level {level.level + 1}
        </Data>
      </Panel>

      <Overline>Everything else</Overline>
      <Panel flush>
        {links.map((link, i) => (
          <div key={link.to}>
            {i > 0 && <Rule />}
            <Link to={link.to} style={S.link}>
              <span style={{ flex: 1, minWidth: 0 }}>
                <span style={S.linkLabel}>{link.label}</span>
                <span style={S.linkNote}>{link.note}</span>
              </span>
              <span style={S.chevron} aria-hidden="true">
                →
              </span>
            </Link>
          </div>
        ))}
      </Panel>

      <Overline>Badges</Overline>
      <Panel flush>
        {badges.map((badge, i) => (
          <div key={badge.id}>
            {i > 0 && <Rule />}
            <div style={{ ...S.badge, opacity: badge.earned ? 1 : 0.45 }}>
              <span
                style={{
                  ...S.badgeBlock,
                  background: badge.earned ? 'var(--accent)' : 'transparent',
                  borderColor: badge.earned ? 'var(--accent)' : 'var(--border)'
                }}
              />
              <span style={S.badgeLabel}>{badge.label}</span>
              <Data style={S.badgeState}>{badge.earned ? 'Earned' : 'Locked'}</Data>
            </div>
          </div>
        ))}
      </Panel>
    </Screen>
  )
}

const S = {
  heroTop: { display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' },
  heroLabel: {
    fontSize: 'var(--fs-2xs)',
    letterSpacing: '0.14em',
    textTransform: 'uppercase',
    color: 'var(--textMuted)'
  },
  heroBadges: {
    fontSize: 'var(--fs-2xs)',
    letterSpacing: '0.1em',
    textTransform: 'uppercase',
    color: 'var(--textDim)'
  },
  heroLevel: {
    fontFamily: 'var(--font-mono)',
    fontSize: 'var(--fs-3xl)',
    fontWeight: 800,
    fontStretch: '78%',
    letterSpacing: '0.02em',
    lineHeight: 1,
    margin: '6px 0 12px'
  },
  heroSub: {
    display: 'block',
    marginTop: 8,
    fontSize: 'var(--fs-3xs)',
    letterSpacing: '0.12em',
    textTransform: 'uppercase',
    color: 'var(--textMuted)'
  },
  link: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    padding: '14px 16px',
    textDecoration: 'none',
    color: 'var(--text)',
    minHeight: 'var(--touch)'
  },
  linkLabel: { display: 'block', fontSize: 'var(--fs-base)', fontWeight: 600 },
  linkNote: {
    display: 'block',
    fontFamily: 'var(--font-mono)',
    fontSize: 'var(--fs-2xs)',
    letterSpacing: '0.08em',
    textTransform: 'uppercase',
    color: 'var(--textDim)',
    marginTop: 5
  },
  chevron: { color: 'var(--textMuted)', fontSize: 'var(--fs-md)', flexShrink: 0 },
  badge: { display: 'flex', alignItems: 'center', gap: 12, padding: '13px 16px' },
  badgeBlock: { width: 12, height: 12, flexShrink: 0, border: '1px solid' },
  badgeLabel: { flex: 1, minWidth: 0, fontSize: 'var(--fs-md)', fontWeight: 600 },
  badgeState: {
    fontSize: 'var(--fs-3xs)',
    letterSpacing: '0.12em',
    textTransform: 'uppercase',
    color: 'var(--textMuted)',
    flexShrink: 0
  }
}
