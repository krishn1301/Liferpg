import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { useStore } from '../state/StoreProvider'
import { useToday } from '../state/useToday'
import { dueToday, currentStreak } from '../domain/streaks'
import { describeSchedule, completionsThisWeek } from '../domain/schedule'
import { categoryOf } from '../domain/constants'
import { totalXp, levelFromXp } from '../domain/xp'
import { fromDateKey } from '../domain/dates'
import { tap } from '../platform/haptics'
import { Screen, SectionTitle, EmptyState, Button, Card } from '../components/ui'

export default function Today() {
  const { doc, dispatch } = useStore()
  const today = useToday()

  const habits = useMemo(() => dueToday(doc.habits, today), [doc.habits, today])
  const done = habits.filter((h) => h.completions?.[today]).length
  const pct = habits.length ? Math.round((done / habits.length) * 100) : 0
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
      <Card style={S.levelCard}>
        <div style={S.levelRow}>
          <span style={S.levelBadge}>Lv.{level.level}</span>
          <span style={S.xpText}>{xp} XP</span>
        </div>
        <div style={S.barTrack}>
          <div style={{ ...S.barFill, width: `${(level.current / level.needed) * 100}%` }} />
        </div>
        <div style={S.levelSub}>
          {level.current} / {level.needed} to level {level.level + 1}
        </div>
      </Card>

      {habits.length > 0 && (
        <Card style={S.progressCard}>
          <div style={S.progressNum}>{pct}%</div>
          <div style={S.progressLabel}>
            {done} of {habits.length} done today
          </div>
        </Card>
      )}

      <SectionTitle>Today&apos;s quests</SectionTitle>

      {habits.length === 0 ? (
        <EmptyState
          icon={doc.habits.length ? '🌙' : '🎯'}
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
            <HabitRow key={habit.id} habit={habit} today={today} onToggle={() => toggle(habit)} />
          ))}
        </div>
      )}
    </Screen>
  )
}

function HabitRow({ habit, today, onToggle }) {
  const cat = categoryOf(habit.category)
  const isDone = Boolean(habit.completions?.[today])
  const { streak } = currentStreak(habit, today)
  const weekly = habit.schedule?.type === 'weekly'

  const meta = weekly
    ? `${completionsThisWeek(habit, today)}/${habit.schedule.timesPerWeek} this week`
    : describeSchedule(habit.schedule)

  return (
    <div style={{ ...S.row, borderLeft: `3px solid ${cat.color}`, opacity: isDone ? 0.55 : 1 }}>
      <span style={S.rowIcon}>{habit.icon ?? '⭐'}</span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ ...S.rowName, textDecoration: isDone ? 'line-through' : 'none' }}>
          {habit.name}
        </div>
        <div style={S.rowMeta}>
          <span style={{ color: cat.color }}>{cat.label}</span>
          <span> · {meta}</span>
          {streak > 0 && <span> · {streak}🔥</span>}
        </div>
      </div>
      <button
        onClick={onToggle}
        aria-label={isDone ? `Mark ${habit.name} not done` : `Mark ${habit.name} done`}
        aria-pressed={isDone}
        style={{
          ...S.check,
          background: isDone ? 'var(--accent)' : 'transparent',
          borderColor: isDone ? 'var(--accent)' : 'var(--border)',
          color: isDone ? '#04140a' : 'transparent'
        }}
      >
        ✓
      </button>
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
  levelCard: { padding: 14, marginBottom: 10 },
  levelRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  levelBadge: {
    color: 'var(--accent)',
    border: '1px solid var(--accent)',
    padding: '2px 9px',
    fontSize: 11,
    fontWeight: 700,
    letterSpacing: '0.05em'
  },
  xpText: {
    color: 'var(--textDim)',
    fontSize: 10,
    textTransform: 'uppercase',
    letterSpacing: '0.08em'
  },
  barTrack: { height: 4, background: 'var(--bg)', margin: '10px 0 6px' },
  barFill: { height: '100%', background: 'var(--accent)', transition: 'width 0.4s' },
  levelSub: { color: 'var(--textMuted)', fontSize: 10 },
  progressCard: { padding: 14, display: 'flex', alignItems: 'baseline', gap: 10 },
  progressNum: { fontSize: 30, fontWeight: 800, color: 'var(--accent)' },
  progressLabel: { fontSize: 12, color: 'var(--textDim)' },
  list: { display: 'flex', flexDirection: 'column', gap: 8 },
  row: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    background: 'var(--card)',
    border: '1px solid var(--border)',
    padding: '12px 14px'
  },
  rowIcon: { fontSize: 20, flexShrink: 0 },
  rowName: { fontSize: 15, fontWeight: 600 },
  rowMeta: { fontSize: 11, color: 'var(--textDim)', marginTop: 3 },
  check: {
    width: 40,
    height: 40,
    flexShrink: 0,
    border: '2px solid',
    fontSize: 17,
    fontWeight: 800,
    transition: 'all 0.15s'
  }
}
