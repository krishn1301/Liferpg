import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useStore } from '../state/StoreProvider'
import { useToday } from '../state/useToday'
import { dueToday, currentStreak } from '../domain/streaks'
import { describeSchedule, completionsThisWeek } from '../domain/schedule'
import { categoryOf } from '../domain/constants'
import { totalXp, levelFromXp } from '../domain/xp'
import { fromDateKey } from '../domain/dates'
import { tap } from '../platform/haptics'
import { Screen, Overline, EmptyState, Button, Panel, Rule, Data, QuestNumber } from '../components/ui'
import { CodeStrip, TickScale, stripDays } from '../components/catalog'

export default function Today() {
  const { doc, dispatch } = useStore()
  const today = useToday()

  const habits = useMemo(() => dueToday(doc.habits, today), [doc.habits, today])
  const done = habits.filter((h) => h.completions?.[today]).length
  const xp = totalXp(doc.habits)
  const level = levelFromXp(xp)

  const dateLabel = fromDateKey(today).toLocaleDateString(undefined, {
    weekday: 'long',
    day: 'numeric',
    month: 'long'
  })

  const toggle = (habit) => {
    tap(habit.completions?.[today] ? 'light' : 'medium')
    dispatch({ type: 'habit/toggle', id: habit.id, dateKey: today })
  }

  return (
    <Screen title={greeting()} subtitle={dateLabel}>
      <Panel flush>
        <div style={S.levelBlock}>
          <div style={S.levelHead}>
            <Data style={S.levelLabel}>Level</Data>
            <Data style={S.xpText}>{xp} XP</Data>
          </div>
          <div style={S.levelNumber}>{String(level.level).padStart(2, '0')}</div>
          <TickScale
            value={level.current / level.needed}
            label={`Level ${level.level}, ${level.current} of ${level.needed} XP to level ${level.level + 1}`}
          />
          <Data style={S.levelSub}>
            {level.needed - level.current} XP to level {level.level + 1}
          </Data>
        </div>

        {habits.length > 0 && (
          <>
            <Rule />
            {/* The day as a single code strip: one block per habit due today,
                filled as it is pressed. This is what the completion percentage
                used to be, and it is faster to read — five blocks answer "how
                much is left" without anyone doing arithmetic. */}
            <div style={S.dayBlock}>
              <CodeStrip
                size={13}
                gap={4}
                days={habits.map((h) => ({
                  key: h.id,
                  state: h.completions?.[today] ? 'done' : 'missed'
                }))}
                color="var(--accent)"
                label={`${done} of ${habits.length} quests done today`}
              />
              <Data style={S.dayCount}>
                {done} / {habits.length} done
              </Data>
            </div>
          </>
        )}
      </Panel>

      <Overline>Today&apos;s quests</Overline>

      {habits.length === 0 ? (
        <EmptyState
          title={doc.habits.length ? 'Nothing scheduled today' : 'No habits yet'}
          hint={
            doc.habits.length
              ? 'Enjoy the day off — your streaks are safe.'
              : 'Add your first habit and start a streak.'
          }
          action={
            !doc.habits.length && (
              <Link to="/habits" style={{ textDecoration: 'none' }}>
                <Button>Add a habit</Button>
              </Link>
            )
          }
        />
      ) : (
        <div style={S.list}>
          {habits.map((habit) => (
            <HabitRow
              key={habit.id}
              habit={habit}
              questNumber={doc.habits.findIndex((h) => h.id === habit.id) + 1}
              today={today}
              onToggle={() => toggle(habit)}
            />
          ))}
        </div>
      )}
    </Screen>
  )
}

function HabitRow({ habit, questNumber, today, onToggle }) {
  const cat = categoryOf(habit.category)
  const isDone = Boolean(habit.completions?.[today])
  const { streak } = currentStreak(habit, today)
  const weekly = habit.schedule?.type === 'weekly'

  // The sweep fires on a real completion and nowhere else — not on mount, not
  // on un-completing, not when the list re-renders. An animation that plays
  // when you undo something is telling you a lie about what happened.
  const [sweeping, setSweeping] = useState(false)

  const meta = weekly
    ? `${completionsThisWeek(habit, today)}/${habit.schedule.timesPerWeek} this week`
    : describeSchedule(habit.schedule)

  const press = () => {
    if (!isDone) setSweeping(true)
    onToggle()
  }

  return (
    <div style={{ ...S.row, ...(isDone ? S.rowDone : null) }}>
      {sweeping && (
        <span
          className="sweep-off"
          aria-hidden="true"
          onAnimationEnd={() => setSweeping(false)}
          style={S.sweep}
        />
      )}

      <div style={S.rowBody}>
        <span style={S.rowIcon}>{habit.icon ?? '⭐'}</span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={S.rowTop}>
            <span style={S.rowName}>{habit.name}</span>
            <QuestNumber n={questNumber} style={isDone ? S.questDone : null} />
          </div>
          <div style={S.rowMeta}>
            {cat.label} · {meta}
            {streak > 0 && ` · run ${streak}`}
          </div>
          <div style={{ marginTop: 9 }}>
            <CodeStrip days={stripDays(habit, today)} color={cat.color} />
          </div>
        </div>

        <button
          onClick={press}
          aria-label={isDone ? `Mark ${habit.name} not done` : `Mark ${habit.name} done`}
          aria-pressed={isDone}
          style={{
            ...S.check,
            // The box never changes; only the tick appears. Filling it as well
            // put a heavy solid square on an already-inverted row, and the
            // loudest thing on the screen ended up being the control rather
            // than the record it belongs to.
            borderColor: isDone ? 'currentColor' : 'var(--border)',
            color: isDone ? 'currentColor' : 'transparent'
          }}
        >
          ✓
        </button>
      </div>
    </div>
  )
}

function greeting() {
  const h = new Date().getHours()
  if (h < 12) return 'Good morning'
  if (h < 17) return 'Good afternoon'
  return 'Good evening'
}

const S = {
  levelBlock: { padding: '14px 16px 16px' },
  levelHead: { display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' },
  levelLabel: {
    fontSize: 'var(--fs-2xs)',
    fontWeight: 600,
    letterSpacing: '0.14em',
    textTransform: 'uppercase',
    color: 'var(--textMuted)'
  },
  xpText: { fontSize: 'var(--fs-xs)', color: 'var(--textDim)' },
  // The one hero numeral on this screen, engraved. Two digits always, because
  // a level that changes width as it grows makes the whole panel twitch.
  levelNumber: {
    fontSize: 'var(--fs-3xl)',
    fontWeight: 800,
    fontStretch: '78%',
    letterSpacing: '0.02em',
    lineHeight: 1,
    margin: '6px 0 12px'
  },
  levelSub: {
    display: 'block',
    marginTop: 8,
    fontSize: 'var(--fs-3xs)',
    letterSpacing: '0.12em',
    textTransform: 'uppercase',
    color: 'var(--textMuted)'
  },
  dayBlock: {
    padding: '13px 16px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    flexWrap: 'wrap'
  },
  dayCount: {
    fontSize: 'var(--fs-2xs)',
    letterSpacing: '0.12em',
    textTransform: 'uppercase',
    color: 'var(--textDim)'
  },
  list: { display: 'flex', flexDirection: 'column', gap: 8 },
  row: {
    position: 'relative',
    border: '1px solid var(--border)',
    overflow: 'hidden'
  },
  // Committed state: the record is pressed. Same inversion as a primary button
  // and the selected tab — see DESIGN.md.
  rowDone: { background: 'var(--text)', color: 'var(--onInk)', borderColor: 'var(--text)' },
  sweep: {
    position: 'absolute',
    inset: 0,
    background: 'var(--bg)',
    pointerEvents: 'none',
    zIndex: 1
  },
  rowBody: {
    position: 'relative',
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    padding: '12px 12px 12px 14px'
  },
  rowIcon: { fontSize: 'var(--fs-xl)', flexShrink: 0, alignSelf: 'flex-start', marginTop: 1 },
  rowTop: { display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 },
  // Sentence case, normal width, readable weight. The world would set this as
  // a tracked-out code; a name has to be legible before it is stylish.
  rowName: {
    fontSize: 'var(--fs-base)',
    fontWeight: 600,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap'
  },
  // Both of these dim `currentColor` so they work on the normal and the
  // inverted row without a second palette. The opacities are floors, not
  // taste: 0.7 and 0.62 are where each still clears 4.5:1 on PULSE ground,
  // which is the harsher of the two directions.
  questDone: { color: 'var(--onInk)', borderColor: 'var(--onInk)', opacity: 0.7 },
  rowMeta: {
    fontFamily: 'var(--font-mono)',
    fontSize: 'var(--fs-2xs)',
    letterSpacing: '0.1em',
    textTransform: 'uppercase',
    color: 'currentColor',
    opacity: 0.62,
    marginTop: 5
  },
  check: {
    // The single most-tapped control in the app — it gets the full 48dp box.
    width: 'var(--touch)',
    height: 'var(--touch)',
    flexShrink: 0,
    alignSelf: 'center',
    background: 'transparent',
    border: '1px solid',
    fontSize: 'var(--fs-lg)',
    fontWeight: 800,
    // `all` would sweep in width/height too; only the painted properties move.
    transition: 'border-color 0.15s, color 0.15s'
  }
}
