import { useState } from 'react'
import { useStore } from '../state/StoreProvider'
import { useToday } from '../state/useToday'
import { describeSchedule, DAY_LABELS } from '../domain/schedule'
import { CATEGORIES, ICONS, categoryOf, MAX_HABITS } from '../domain/constants'
import { Screen, Button, Sheet, Field, EmptyState, QuestNumber, inputStyle } from '../components/ui'
import { CodeStrip, stripDays } from '../components/catalog'

const BLANK = {
  name: '',
  icon: '⭐',
  category: 'fitness',
  schedule: { type: 'daily' }
}

export default function Habits() {
  const { doc, dispatch } = useStore()
  const today = useToday()
  const [editing, setEditing] = useState(null) // habit being edited, or BLANK for new

  const save = (draft) => {
    if (!draft.name.trim()) return
    if (draft.id) {
      dispatch({ type: 'habit/update', id: draft.id, changes: draft })
    } else {
      // The screen owns the clock, not the reducer — `today` here already
      // survives a midnight rollover with the app left open.
      dispatch({ type: 'habit/add', habit: draft, todayKey: today })
    }
    setEditing(null)
  }

  const atCap = doc.habits.length >= MAX_HABITS

  return (
    <Screen
      title="Habits"
      subtitle={`${doc.habits.length} of ${MAX_HABITS} catalogued`}
      action={
        <Button onClick={() => setEditing({ ...BLANK })} disabled={atCap}>
          + Add
        </Button>
      }
    >
      {doc.habits.length === 0 ? (
        <EmptyState
          title="No habits yet"
          hint="Start with one you can actually do tomorrow."
          action={<Button onClick={() => setEditing({ ...BLANK })}>Add a habit</Button>}
        />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {doc.habits.map((habit, i) => {
            const cat = categoryOf(habit.category)
            return (
              <button key={habit.id} onClick={() => setEditing({ ...habit })} style={S.row}>
                <QuestNumber n={i + 1} />
                <span style={{ fontSize: 'var(--fs-xl)' }}>{habit.icon}</span>
                <div style={{ flex: 1, minWidth: 0, textAlign: 'left' }}>
                  <div style={S.name}>{habit.name}</div>
                  {/* Category and schedule only. The streak lives on Today and
                      in Stats; adding it here wrapped the line on any habit
                      with a named-days schedule and left the rows ragged. */}
                  <div style={S.meta}>
                    {cat.label} · {describeSchedule(habit.schedule)}
                  </div>
                </div>
                <CodeStrip days={stripDays(habit, today)} color={cat.color} size={9} gap={2} />
              </button>
            )
          })}
        </div>
      )}

      {atCap && <p style={S.capNote}>You&apos;ve reached the {MAX_HABITS} habit limit.</p>}

      {editing && (
        <HabitSheet
          // Remounting on identity change is what resets the draft. Deriving it
          // during render instead silently failed for new habits, where the old
          // and new ids are both undefined.
          key={editing.id ?? 'new'}
          draft={editing}
          onClose={() => setEditing(null)}
          onSave={save}
          onDelete={
            editing.id
              ? () => {
                  dispatch({ type: 'habit/delete', id: editing.id })
                  setEditing(null)
                }
              : null
          }
        />
      )}
    </Screen>
  )
}

function HabitSheet({ draft, onClose, onSave, onDelete }) {
  const [local, setLocal] = useState(draft)
  const set = (changes) => setLocal((p) => ({ ...p, ...changes }))
  const schedule = local.schedule ?? { type: 'daily' }

  return (
    <Sheet
      open
      title={local.id ? 'Edit habit' : 'New habit'}
      onClose={onClose}
      footer={
        <>
          <Button onClick={() => onSave(local)} disabled={!local.name.trim()} style={{ flex: 1 }}>
            {local.id ? 'Save' : 'Add habit'}
          </Button>
          {onDelete && (
            <Button variant="danger" onClick={onDelete}>
              Delete
            </Button>
          )}
        </>
      }
    >
      <Field label="Name">
        <input
          style={inputStyle}
          value={local.name}
          autoFocus
          placeholder="e.g. Morning run"
          onChange={(e) => set({ name: e.target.value })}
        />
      </Field>

      <Field label="Icon">
        <div style={S.iconGrid}>
          {ICONS.map((icon) => (
            <button
              key={icon}
              onClick={() => set({ icon })}
              aria-pressed={local.icon === icon}
              style={{ ...S.iconBtn, ...(local.icon === icon ? S.selected : null) }}
            >
              {icon}
            </button>
          ))}
        </div>
      </Field>

      <Field label="Category">
        <select
          style={inputStyle}
          value={local.category}
          onChange={(e) => set({ category: e.target.value })}
        >
          {Object.entries(CATEGORIES).map(([key, cat]) => (
            <option key={key} value={key}>
              {cat.label}
            </option>
          ))}
        </select>
      </Field>

      <Field label="Repeat">
        <ScheduleEditor schedule={schedule} onChange={(s) => set({ schedule: s })} />
      </Field>
    </Sheet>
  )
}

function ScheduleEditor({ schedule, onChange }) {
  const type = schedule.type

  return (
    <div>
      <div style={S.segmented}>
        {[
          { key: 'daily', label: 'Every day' },
          { key: 'weekdays', label: 'Certain days' },
          { key: 'weekly', label: 'X per week' }
        ].map((opt) => (
          <button
            key={opt.key}
            aria-pressed={type === opt.key}
            onClick={() =>
              onChange(
                opt.key === 'daily'
                  ? { type: 'daily' }
                  : opt.key === 'weekdays'
                    ? { type: 'weekdays', days: schedule.days ?? [1, 3, 5] }
                    : { type: 'weekly', timesPerWeek: schedule.timesPerWeek ?? 3 }
              )
            }
            style={{ ...S.segment, ...(type === opt.key ? S.selected : null) }}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {type === 'weekdays' && (
        <div style={S.dayRow}>
          {/* Monday-first, matching how the rest of the app shows a week */}
          {[1, 2, 3, 4, 5, 6, 0].map((day) => {
            const on = (schedule.days ?? []).includes(day)
            return (
              <button
                key={day}
                aria-pressed={on}
                onClick={() => {
                  const days = new Set(schedule.days ?? [])
                  if (on) days.delete(day)
                  else days.add(day)
                  onChange({ type: 'weekdays', days: [...days].sort() })
                }}
                style={{ ...S.dayBtn, ...(on ? S.selected : null) }}
              >
                {DAY_LABELS[day][0]}
              </button>
            )
          })}
        </div>
      )}

      {type === 'weekly' && (
        <div style={S.dayRow}>
          {[1, 2, 3, 4, 5, 6, 7].map((n) => (
            <button
              key={n}
              aria-pressed={schedule.timesPerWeek === n}
              onClick={() => onChange({ type: 'weekly', timesPerWeek: n })}
              style={{ ...S.dayBtn, ...(schedule.timesPerWeek === n ? S.selected : null) }}
            >
              {n}
            </button>
          ))}
        </div>
      )}

      <p style={S.scheduleHint}>{describeSchedule(schedule)}</p>
    </div>
  )
}

const S = {
  row: {
    display: 'flex',
    alignItems: 'center',
    gap: 11,
    background: 'transparent',
    border: '1px solid var(--border)',
    padding: '12px 12px 12px 14px',
    width: '100%'
  },
  name: {
    fontSize: 'var(--fs-base)',
    fontWeight: 600,
    color: 'var(--text)',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap'
  },
  meta: {
    fontFamily: 'var(--font-mono)',
    fontSize: 'var(--fs-2xs)',
    letterSpacing: '0.1em',
    textTransform: 'uppercase',
    color: 'var(--textDim)',
    marginTop: 5
  },
  capNote: {
    color: 'var(--textMuted)',
    fontSize: 'var(--fs-sm)',
    marginTop: 14,
    textAlign: 'center'
  },
  // Selection is inversion, everywhere — the same mechanism as a finished
  // habit, a primary button and the current tab. One idea, learned once.
  selected: {
    background: 'var(--text)',
    color: 'var(--onInk)',
    borderColor: 'var(--text)'
  },
  // Track floor matches --touch so the 48dp button can't overflow its cell.
  iconGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(var(--touch), 1fr))',
    gap: 6
  },
  iconBtn: {
    height: 'var(--touch)',
    fontSize: 'var(--fs-xl)',
    border: '1px solid var(--border)',
    background: 'var(--input)'
  },
  segmented: { display: 'flex', border: '1px solid var(--border)' },
  segment: {
    flex: 1,
    minWidth: 0,
    padding: '11px 4px',
    fontSize: 'var(--fs-xs)',
    fontWeight: 700,
    textTransform: 'uppercase',
    letterSpacing: '0.06em',
    color: 'var(--textDim)',
    background: 'transparent'
  },
  dayRow: { display: 'flex', gap: 6, marginTop: 10 },
  dayBtn: {
    flex: 1,
    // Seven of these sit in one row; min-width has to yield or they overflow
    // the sheet. Height still carries the 48dp target.
    minWidth: 0,
    height: 'var(--touch)',
    border: '1px solid var(--border)',
    background: 'transparent',
    color: 'var(--textDim)',
    fontFamily: 'var(--font-mono)',
    fontSize: 'var(--fs-md)',
    fontWeight: 700
  },
  scheduleHint: {
    fontFamily: 'var(--font-mono)',
    fontSize: 'var(--fs-2xs)',
    letterSpacing: '0.1em',
    textTransform: 'uppercase',
    color: 'var(--textDim)',
    marginTop: 12
  }
}
