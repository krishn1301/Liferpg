import { useMemo, useState } from 'react'
import { useStore } from '../state/StoreProvider'
import { useToday } from '../state/useToday'
import { addMonths, fromDateKey, leadingBlanks, monthKeys } from '../domain/dates'
import { dailyTrend } from '../domain/stats'
import { dueToday } from '../domain/streaks'
import { categoryOf } from '../domain/constants'
import { describeSchedule } from '../domain/schedule'
import { tap } from '../platform/haptics'
import { Screen, Button, Sheet, EmptyState } from '../components/ui'

const WEEKDAYS = ['M', 'T', 'W', 'T', 'F', 'S', 'S']

export default function Calendar() {
  const { doc, dispatch } = useStore()
  const today = useToday()
  const now = fromDateKey(today)

  const [view, setView] = useState({ year: now.getFullYear(), monthIndex: now.getMonth() })
  const [selected, setSelected] = useState(null)

  const keys = useMemo(() => monthKeys(view.year, view.monthIndex), [view])
  const blanks = leadingBlanks(view.year, view.monthIndex)

  // dailyTrend already knows how to count a day against each habit's own
  // schedule. Reusing it keeps the calendar and the Stats trend from ever
  // disagreeing about what a given day was worth.
  const byKey = useMemo(() => {
    const trend = dailyTrend(doc.habits, keys[0], keys[keys.length - 1])
    return new Map(trend.map((d) => [d.dateKey, d]))
  }, [doc.habits, keys])

  const monthLabel = fromDateKey(keys[0]).toLocaleDateString(undefined, {
    month: 'long',
    year: 'numeric'
  })

  const shift = (delta) => setView((v) => addMonths(v.year, v.monthIndex, delta))

  return (
    <Screen
      title="Calendar"
      subtitle={monthLabel}
      action={
        <div style={S.nav}>
          <Button variant="ghost" onClick={() => shift(-1)} aria-label="Previous month">
            ‹
          </Button>
          <Button variant="ghost" onClick={() => shift(1)} aria-label="Next month">
            ›
          </Button>
        </div>
      }
    >
      {doc.habits.length === 0 ? (
        <EmptyState
          icon="🗓️"
          title="Nothing to show"
          hint="Add a habit and your history fills in here."
        />
      ) : (
        <>
          <div style={S.weekRow}>
            {WEEKDAYS.map((label, i) => (
              <span key={i} style={S.weekLabel}>
                {label}
              </span>
            ))}
          </div>

          <div style={S.grid}>
            {Array.from({ length: blanks }, (_, i) => (
              <div key={`blank-${i}`} />
            ))}
            {keys.map((key) => (
              <DayCell
                key={key}
                dateKey={key}
                day={byKey.get(key)}
                isToday={key === today}
                isFuture={key > today}
                onClick={() => setSelected(key)}
              />
            ))}
          </div>

          <Legend />
        </>
      )}

      {selected && (
        <DaySheet
          dateKey={selected}
          habits={dueToday(doc.habits, selected)}
          isFuture={selected > today}
          onToggle={(habit) => {
            tap(habit.completions?.[selected] ? 'light' : 'medium')
            dispatch({ type: 'habit/toggle', id: habit.id, dateKey: selected })
          }}
          onClose={() => setSelected(null)}
        />
      )}
    </Screen>
  )
}

function DayCell({ dateKey, day, isToday, isFuture, onClick }) {
  const due = day?.due ?? 0
  const pct = day?.pct ?? 0

  return (
    <button
      onClick={onClick}
      aria-label={`${dateKey}, ${day?.done ?? 0} of ${due} done`}
      style={{
        ...S.cell,
        // Green means progress. A day that was due and got nothing done is not
        // 25% of a good day, so it stays on the card colour — otherwise a fresh
        // month reads as uniformly green when nothing has been done at all.
        // A future day is not a failed day either: flat and dim, not a hole.
        background: !isFuture && pct > 0 ? 'var(--accent)' : 'var(--card)',
        opacity: isFuture ? 0.4 : pct > 0 ? 0.3 + (pct / 100) * 0.7 : 1,
        borderColor: isToday ? 'var(--accent)' : 'var(--border)',
        color: !isFuture && pct > 55 ? 'var(--onAccent)' : due ? 'var(--text)' : 'var(--textMuted)'
      }}
    >
      <span style={S.cellNum}>{Number(dateKey.slice(8))}</span>
    </button>
  )
}

function Legend() {
  return (
    <div style={S.legend}>
      <span style={S.legendLabel}>Less</span>
      {[0, 0.35, 0.6, 0.8, 1].map((o) => (
        <span
          key={o}
          style={{
            ...S.legendSwatch,
            background: o ? 'var(--accent)' : 'var(--card)',
            opacity: o || 1
          }}
        />
      ))}
      <span style={S.legendLabel}>More</span>
    </div>
  )
}

function DaySheet({ dateKey, habits, isFuture, onToggle, onClose }) {
  const label = fromDateKey(dateKey).toLocaleDateString(undefined, {
    weekday: 'long',
    day: 'numeric',
    month: 'long'
  })

  return (
    <Sheet
      open
      title={label}
      onClose={onClose}
      footer={
        <Button variant="ghost" onClick={onClose} style={{ flex: 1 }}>
          Done
        </Button>
      }
    >
      {habits.length === 0 ? (
        <p style={S.sheetNote}>Nothing was scheduled on this day.</p>
      ) : isFuture ? (
        <>
          <p style={S.sheetNote}>Scheduled for this day. You can tick these off once it arrives.</p>
          <div style={S.sheetList}>
            {habits.map((habit) => (
              <DayRow key={habit.id} habit={habit} dateKey={dateKey} disabled />
            ))}
          </div>
        </>
      ) : (
        <div style={S.sheetList}>
          {habits.map((habit) => (
            <DayRow
              key={habit.id}
              habit={habit}
              dateKey={dateKey}
              onToggle={() => onToggle(habit)}
            />
          ))}
        </div>
      )}
    </Sheet>
  )
}

function DayRow({ habit, dateKey, onToggle, disabled }) {
  const cat = categoryOf(habit.category)
  const done = Boolean(habit.completions?.[dateKey])

  return (
    <button
      onClick={onToggle}
      disabled={disabled}
      aria-pressed={done}
      style={{ ...S.dayRow, borderLeft: `3px solid ${cat.color}` }}
    >
      <span style={{ fontSize: 'var(--fs-xl)' }}>{habit.icon ?? '⭐'}</span>
      <div style={{ flex: 1, minWidth: 0, textAlign: 'left' }}>
        <div style={{ ...S.dayName, textDecoration: done ? 'line-through' : 'none' }}>
          {habit.name}
        </div>
        <div style={S.dayMeta}>
          <span style={{ color: cat.color }}>{cat.label}</span>
          <span> · {describeSchedule(habit.schedule)}</span>
        </div>
      </div>
      <span
        style={{
          ...S.check,
          background: done ? 'var(--accent)' : 'transparent',
          borderColor: done ? 'var(--accent)' : 'var(--border)',
          color: done ? 'var(--onAccent)' : 'transparent'
        }}
      >
        ✓
      </span>
    </button>
  )
}

const S = {
  nav: { display: 'flex', gap: 6 },
  weekRow: { display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4, marginBottom: 6 },
  weekLabel: {
    textAlign: 'center',
    fontSize: 'var(--fs-2xs)',
    fontWeight: 700,
    color: 'var(--textMuted)',
    letterSpacing: '0.06em'
  },
  grid: { display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4 },
  cell: {
    aspectRatio: '1',
    border: '1px solid',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 0
  },
  cellNum: { fontSize: 'var(--fs-sm)', fontWeight: 600 },
  legend: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 4,
    marginTop: 14
  },
  legendLabel: { fontSize: 'var(--fs-3xs)', color: 'var(--textMuted)' },
  legendSwatch: { width: 12, height: 12, border: '1px solid var(--border)' },
  sheetNote: { fontSize: 'var(--fs-md)', color: 'var(--textDim)', marginBottom: 12 },
  sheetList: { display: 'flex', flexDirection: 'column', gap: 8 },
  dayRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    background: 'var(--card)',
    border: '1px solid var(--border)',
    padding: '10px 12px',
    width: '100%'
  },
  dayName: { fontSize: 'var(--fs-base)', fontWeight: 600, color: 'var(--text)' },
  dayMeta: { fontSize: 'var(--fs-xs)', color: 'var(--textDim)', marginTop: 3 },
  check: {
    width: 32,
    height: 32,
    flexShrink: 0,
    border: '2px solid',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: 'var(--fs-md)',
    fontWeight: 800
  }
}
