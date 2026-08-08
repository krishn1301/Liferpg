import { Link } from 'react-router-dom'
import { useStore } from '../state/StoreProvider'
import { useToday } from '../state/useToday'
import { xpSummary, earnedBadges } from '../domain/xp'
import { dosesForDay } from '../domain/medicines'
import { Screen, Overline, Panel, Rule, Data } from '../components/ui'

export default function More() {
  const { doc } = useStore()
  const today = useToday()

  // `today` matters: without it a vow's clean-day count is measured against an
  // undefined date, which is how this screen used to show vow owners a
  // different level from the one Today was showing.
  const xp = xpSummary(doc.habits, today)
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
    // The level panel used to render here too, a third copy of the same fact
    // after Today's and Stats'. Today needs it because it is the daily hit and
    // Stats needs it because it is the record; More is a hub and owns neither.
    // The subtitle carries the number, which is all this screen ever needed.
    <Screen title="More" subtitle={`Level ${xp.level} · total ${xp.total} XP`}>
      <Overline style={{ marginTop: 0 }}>Everything else</Overline>
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

      <Overline>
        Badges · {earned} of {badges.length}
      </Overline>
      <Panel flush>
        {badges.map((badge, i) => (
          <div key={badge.id}>
            {i > 0 && <Rule />}
            {/* No row opacity. Dimming the whole row to 0.45 took the badge's
                own label down to 3.9:1 on the dark ground and 3.0:1 on the
                light one — under the AA floor, to say something the hollow
                block and the word LOCKED already say. */}
            <div style={S.badge}>
              <span
                style={{
                  ...S.badgeBlock,
                  background: badge.earned ? 'var(--accent)' : 'transparent',
                  borderColor: badge.earned ? 'var(--accent)' : 'var(--border)'
                }}
              />
              <span
                style={{ ...S.badgeLabel, color: badge.earned ? 'var(--text)' : 'var(--textDim)' }}
              >
                {badge.label}
              </span>
              <Data style={S.badgeState}>{badge.earned ? 'Earned' : 'Locked'}</Data>
            </div>
          </div>
        ))}
      </Panel>
    </Screen>
  )
}

const S = {
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
