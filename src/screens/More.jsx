import { Link } from 'react-router-dom'
import { useStore } from '../state/StoreProvider'
import { useToday } from '../state/useToday'
import { totalXp, levelFromXp, earnedBadges } from '../domain/xp'
import { dosesForDay } from '../domain/medicines'
import { Screen, SectionTitle, Card } from '../components/ui'

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
      icon: '🗓️',
      label: 'Calendar',
      note: 'Month view and backfilling missed days'
    },
    {
      to: '/medicines',
      icon: '💊',
      label: 'Medicines',
      note: dosesLeft ? `${dosesLeft} dose${dosesLeft === 1 ? '' : 's'} left today` : 'Doses and adherence'
    },
    {
      to: '/settings',
      icon: '⚙️',
      label: 'Settings',
      note: 'Theme, backup and restore'
    }
  ]

  return (
    <Screen title="More" subtitle={`Level ${level.level} · ${xp} XP`}>
      <Card style={S.hero}>
        <div style={S.heroTop}>
          <span style={S.heroLevel}>Lv.{level.level}</span>
          <span style={S.heroBadges}>
            {earned} of {badges.length} badges
          </span>
        </div>
        <div style={S.barTrack}>
          <div style={{ ...S.barFill, transform: `scaleX(${level.current / level.needed})` }} />
        </div>
        <div style={S.heroSub}>
          {level.current} / {level.needed} to level {level.level + 1}
        </div>
      </Card>

      <SectionTitle>Everything else</SectionTitle>
      <div style={S.list}>
        {links.map((link) => (
          <Link key={link.to} to={link.to} style={S.link}>
            <span style={S.linkIcon}>{link.icon}</span>
            <span style={{ flex: 1, minWidth: 0 }}>
              <span style={S.linkLabel}>{link.label}</span>
              <span style={S.linkNote}>{link.note}</span>
            </span>
            <span style={S.chevron}>›</span>
          </Link>
        ))}
      </div>

      <SectionTitle>Badges</SectionTitle>
      <div style={S.badges}>
        {badges.map((badge) => (
          <div key={badge.id} style={{ ...S.badge, opacity: badge.earned ? 1 : 0.32 }}>
            <div style={{ fontSize: 'var(--fs-xl)' }}>{badge.icon}</div>
            <div style={S.badgeLabel}>{badge.label}</div>
          </div>
        ))}
      </div>
    </Screen>
  )
}

const S = {
  hero: { padding: 14, marginBottom: 4 },
  heroTop: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  heroLevel: {
    color: 'var(--accent)',
    border: '1px solid var(--accent)',
    padding: '2px 9px',
    fontSize: 'var(--fs-xs)',
    fontWeight: 700,
    letterSpacing: '0.05em'
  },
  heroBadges: {
    color: 'var(--textDim)',
    fontSize: 'var(--fs-2xs)',
    textTransform: 'uppercase',
    letterSpacing: '0.08em'
  },
  barTrack: {
    height: 4,
    background: 'var(--bg)',
    margin: '10px 0 6px',
    overflow: 'hidden'
  },
  barFill: {
    height: '100%',
    width: '100%',
    background: 'var(--accent)',
    transformOrigin: 'left',
    transition: 'transform 0.4s'
  },
  heroSub: { color: 'var(--textMuted)', fontSize: 'var(--fs-2xs)' },
  list: { display: 'flex', flexDirection: 'column', gap: 8 },
  link: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    background: 'var(--card)',
    border: '1px solid var(--border)',
    padding: '14px',
    textDecoration: 'none',
    color: 'var(--text)',
    minHeight: 'var(--touch)'
  },
  linkIcon: { fontSize: 'var(--fs-xl)', flexShrink: 0 },
  linkLabel: { display: 'block', fontSize: 'var(--fs-base)', fontWeight: 600 },
  linkNote: { display: 'block', fontSize: 'var(--fs-xs)', color: 'var(--textDim)', marginTop: 3 },
  chevron: { color: 'var(--textMuted)', fontSize: 'var(--fs-xl)', flexShrink: 0 },
  badges: { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 },
  badge: {
    background: 'var(--card)',
    border: '1px solid var(--border)',
    padding: '14px 8px',
    textAlign: 'center'
  },
  badgeLabel: { fontSize: 'var(--fs-2xs)', fontWeight: 700, marginTop: 7 }
}
