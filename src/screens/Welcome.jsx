import { useState } from 'react'
import { useStore } from '../state/StoreProvider'
import { useToday } from '../state/useToday'
import { TEMPLATES, categoryOf } from '../domain/constants'
import { describeSchedule } from '../domain/schedule'
import { Screen, Overline, Panel, Button, Data } from '../components/ui'

// First run. Shown once, then never again.
//
// `TEMPLATES` and the `habits/addMany` action were written and tested a long
// time before anything called them, and `settings.onboarded` was stored and
// never read. This is the screen that was missing.
//
// Its whole job is to get past the empty state: someone who has to invent five
// habits before seeing anything usually invents zero and closes the app. Every
// pack is a starting point, not a commitment — the habits it creates are
// ordinary habits, editable and deletable like any other.

export default function Welcome() {
  const { dispatch } = useStore()
  const today = useToday()
  const [picked, setPicked] = useState(null)

  const finish = (habits) => {
    if (habits?.length) dispatch({ type: 'habits/addMany', habits, todayKey: today })
    dispatch({ type: 'settings/set', changes: { onboarded: true } })
  }

  return (
    <Screen title="LifeRPG" subtitle="Pick a starting point">
      <p style={S.intro}>
        Habits, streaks and XP — all on this phone, nothing uploaded anywhere. Start with a pack
        below, or skip and build your own. Either way you can change everything later.
      </p>

      <Overline>Starter packs</Overline>
      <div style={S.list}>
        {TEMPLATES.map((pack) => {
          const open = picked === pack.id
          return (
            <Panel key={pack.id} style={S.pack}>
              <button
                onClick={() => setPicked(open ? null : pack.id)}
                aria-expanded={open}
                style={S.packHead}
              >
                <div style={{ flex: 1, minWidth: 0, textAlign: 'left' }}>
                  <div style={S.packLabel}>{pack.label}</div>
                  <Data style={S.packDesc}>{pack.desc}</Data>
                </div>
                <Data style={S.packCount}>{pack.habits.length}</Data>
              </button>

              {/* The habits are listed before anything is created. A pack that
                  drops three unexplained rows into someone's day is a pack they
                  spend their first minute deleting. */}
              {open && (
                <div style={S.packBody}>
                  {pack.habits.map((h) => {
                    const cat = categoryOf(h.category)
                    return (
                      <div key={h.name} style={S.packRow}>
                        <span style={{ fontSize: 'var(--fs-md)' }}>{h.icon}</span>
                        <span style={S.packHabit}>{h.name}</span>
                        {/* Category and schedule, not a code strip. A strip of
                            seven hollow blocks reads as "you missed a week" for
                            a habit that does not exist yet. */}
                        <Data style={S.packMeta}>
                          {cat.label} · {describeSchedule(h.schedule)}
                        </Data>
                      </div>
                    )
                  })}
                  <Button onClick={() => finish(pack.habits)} style={S.packAdd}>
                    Start with these
                  </Button>
                </div>
              )}
            </Panel>
          )
        })}
      </div>

      <Button variant="ghost" onClick={() => finish(null)} style={S.skip}>
        Skip — I&apos;ll add my own
      </Button>
    </Screen>
  )
}

const S = {
  intro: {
    fontSize: 'var(--fs-base)',
    color: 'var(--textDim)',
    lineHeight: 1.6,
    marginTop: 4
  },
  list: { display: 'flex', flexDirection: 'column', gap: 8 },
  pack: { padding: 0 },
  packHead: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    width: '100%',
    padding: '14px 16px',
    background: 'transparent',
    color: 'var(--text)'
  },
  packLabel: { fontSize: 'var(--fs-base)', fontWeight: 600 },
  packDesc: {
    display: 'block',
    marginTop: 5,
    fontSize: 'var(--fs-2xs)',
    letterSpacing: '0.1em',
    textTransform: 'uppercase',
    color: 'var(--textDim)'
  },
  packCount: {
    fontSize: 'var(--fs-xl)',
    fontWeight: 700,
    color: 'var(--textMuted)',
    flexShrink: 0
  },
  packBody: { padding: '0 16px 16px', borderTop: '1px solid var(--rule)' },
  packRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    padding: '11px 0',
    borderBottom: '1px solid var(--rule)'
  },
  packHabit: { flex: 1, minWidth: 0, fontSize: 'var(--fs-md)' },
  packMeta: {
    fontSize: 'var(--fs-3xs)',
    letterSpacing: '0.1em',
    textTransform: 'uppercase',
    color: 'var(--textMuted)',
    flexShrink: 0
  },
  packAdd: { width: '100%', marginTop: 14 },
  skip: { width: '100%', marginTop: 20 }
}
