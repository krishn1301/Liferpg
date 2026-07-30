import { useMemo, useState } from 'react'
import { useStore } from '../state/StoreProvider'
import { useToday } from '../state/useToday'
import { addMonths, fromDateKey, leadingBlanks, monthKeys } from '../domain/dates'
import { dailyTrend } from '../domain/stats'
import { dueToday } from '../domain/streaks'
import { categoryOf } from '../domain/constants'
import { describeSchedule } from '../domain/schedule'
import { tap } from '../platform/haptics'
import { Screen, Button, Sheet, EmptyState, Data } from '../components/ui'

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
        <EmptyState title="Nothing to show" hint="Add a habit and your history fills in here." />
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

/**
 * One block in the month's code sheet. Three states, and no opacity ramp
 * behind the numeral: a continuous fade puts the date on a mid-grey somewhere
 * around 50%, where neither ink colour clears AA. So the fill is discrete —
 * empty, part-pressed, pressed — and the *degree* is carried by a bar along
 * the bottom edge, which nothing has to be read on top of.
 */
function DayCell({ dateKey, day, isToday, isFuture, onClick }) {
  const due = day?.due ?? 0
  const pct = isFuture ? 0 : (day?.pct ?? 0)
  const full = pct >= 100
  const part = pct > 0 && !full

  return (
    <button
      onClick={onClick}
      aria-label={`${dateKey}, ${day?.done ?? 0} of ${due} done`}
      style={{
        ...S.cell,
        background: full ? 'var(--text)' : 'transparent',
        borderColor: isToday ? 'var(--accent)' : 'var(--border)',
        opacity: isFuture ? 0.45 : 1
      }}
    >
      {part && <span style={S.cellPart} aria-hidden="true" />}
      <span
        style={{
          ...S.cellNum,
          color: full ? 'var(--onInk)' : due ? 'var(--text)' : 'var(--textMuted)'
        }}
      >
        {Number(dateKey.slice(8))}
      </span>
      {part && (
        <span
          style={{ ...S.cellBar, transform: `scaleX(${pct / 100})` }}
          aria-hidden="true"
        />
      )}
    </button>
  )
}

function Legend() {
  const items = [
    { label: 'None', fill: 'transparent', bar: false },
    { label: 'Part', fill: 'transparent', bar: true },
    { label: 'All', fill: 'var(--text)', bar: false }
  ]
  return (
    <div style={S.legend}>
      {items.map((item) => (
        <span key={item.label} style={S.legendItem}>
          <span style={{ ...S.legendSwatch, background: item.fill }}>
            {item.bar && <span style={S.legendBar} />}
          </span>
          <Data style={S.legendLabel}>{item.label}</Data>
        </span>
      ))}
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
            <DayRow key={habit.id} habit={habit} dateKey={dateKey} onToggle={() => onToggle(habit)} />
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
      style={{ ...S.dayRow, ...(done ? S.dayRowDone : null) }}
    >
      <span style={{ fontSize: 'var(--fs-xl)' }}>{habit.icon ?? '⭐'}</span>
      <div style={{ flex: 1, minWidth: 0, textAlign: 'left' }}>
        <div style={S.dayName}>{habit.name}</div>
        <div style={S.dayMeta}>
          {cat.label} · {describeSchedule(habit.schedule)}
        </div>
      </div>
      <span
        style={{
          ...S.check,
          borderColor: done ? 'currentColor' : 'var(--border)',
          color: done ? 'currentColor' : 'transparent'
        }}
      >
        ✓
      </span>
    </button>
  )
}

const S = {
  nav: { display: 'flex', gap: 6 },
  weekRow: { display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4, marginBottom: 8 },
  weekLabel: {
    textAlign: 'center',
    fontFamily: 'var(--font-mono)',
    fontSize: 'var(--fs-2xs)',
    fontWeight: 600,
    color: 'var(--textMuted)',
    letterSpacing: '0.1em'
  },
  grid: { display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4 },
  cell: {
    position: 'relative',
    aspectRatio: '1',
    border: '1px solid',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    padding: 0,
    // Seven per row on a 411px screen; the global 48px min-width would overflow.
    minWidth: 0,
    minHeight: 0
  },
  // A fixed, safe tint for part-done days — never a continuous ramp.
  cellPart: {
    position: 'absolute',
    inset: 0,
    background: 'var(--text)',
    opacity: 0.28
  },
  cellNum: {
    position: 'relative',
    fontFamily: 'var(--font-mono)',
    fontVariantNumeric: 'tabular-nums',
    fontSize: 'var(--fs-sm)',
    fontWeight: 600
  },
  // How far through the day got. Scaled, never resized.
  cellBar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: 3,
    background: 'var(--accent)',
    transformOrigin: 'left'
  },
  legend: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 14,
    marginTop: 16
  },
  legendItem: { display: 'inline-flex', alignItems: 'center', gap: 6 },
  legendSwatch: {
    position: 'relative',
    width: 12,
    height: 12,
    border: '1px solid var(--border)',
    overflow: 'hidden'
  },
  legendBar: {
    position: 'absolute',
    left: 0,
    bottom: 0,
    width: '55%',
    height: 3,
    background: 'var(--accent)'
  },
  legendLabel: {
    fontSize: 'var(--fs-3xs)',
    letterSpacing: '0.12em',
    textTransform: 'uppercase',
    color: 'var(--textMuted)'
  },
  sheetNote: { fontSize: 'var(--fs-md)', color: 'var(--textDim)', marginBottom: 12 },
  sheetList: { display: 'flex', flexDirection: 'column', gap: 8 },
  dayRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    background: 'transparent',
    border: '1px solid var(--border)',
    padding: '10px 12px',
    width: '100%'
  },
  dayRowDone: { background: 'var(--text)', color: 'var(--onInk)', borderColor: 'var(--text)' },
  dayName: { fontSize: 'var(--fs-base)', fontWeight: 600 },
  dayMeta: {
    fontFamily: 'var(--font-mono)',
    fontSize: 'var(--fs-2xs)',
    letterSpacing: '0.1em',
    textTransform: 'uppercase',
    color: 'currentColor',
    opacity: 0.62,
    marginTop: 4
  },
  check: {
    width: 32,
    height: 32,
    flexShrink: 0,
    background: 'transparent',
    border: '1px solid',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: 'var(--fs-md)',
    fontWeight: 800
  }
}
