import { useState } from 'react'
import { useStore } from '../state/StoreProvider'
import { useToday } from '../state/useToday'
import { currentStreak } from '../domain/streaks'
import { describeSchedule, DAY_LABELS } from '../domain/schedule'
import { CATEGORIES, ICONS, categoryOf, MAX_HABITS } from '../domain/constants'
import { Screen, Button, Sheet, Field, EmptyState, inputStyle } from '../components/ui'

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
      dispatch({ type: 'habit/add', habit: draft })
    }
    setEditing(null)
  }

  const atCap = doc.habits.length >= MAX_HABITS

  return (
    <Screen
      title="Habits"
      subtitle={`${doc.habits.length} of ${MAX_HABITS}`}
      action={
        <Button onClick={() => setEditing({ ...BLANK })} disabled={atCap}>
          + Add
        </Button>
      }
    >
      {doc.habits.length === 0 ? (
        <EmptyState
          icon="📋"
          title="No habits yet"
          hint="Start with one you can actually do tomorrow."
          action={<Button onClick={() => setEditing({ ...BLANK })}>Add a habit</Button>}
        />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {doc.habits.map((habit) => {
            const cat = categoryOf(habit.category)
            const { streak } = currentStreak(habit, today)
            return (
              <button
                key={habit.id}
                onClick={() => setEditing({ ...habit })}
                style={{ ...S.row, borderLeft: `3px solid ${cat.color}` }}
              >
                <span style={{ fontSize: 20 }}>{habit.icon}</span>
                <div style={{ flex: 1, minWidth: 0, textAlign: 'left' }}>
                  <div style={S.name}>{habit.name}</div>
                  <div style={S.meta}>
                    <span style={{ color: cat.color }}>{cat.label}</span>
                    <span> · {describeSchedule(habit.schedule)}</span>
                  </div>
                </div>
                {streak > 0 && <span style={S.streak}>{streak}🔥</span>}
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
              style={{
                ...S.iconBtn,
                borderColor: local.icon === icon ? 'var(--accent)' : 'var(--border)'
              }}
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
            onClick={() =>
              onChange(
                opt.key === 'daily'
                  ? { type: 'daily' }
                  : opt.key === 'weekdays'
                    ? { type: 'weekdays', days: schedule.days ?? [1, 3, 5] }
                    : { type: 'weekly', timesPerWeek: schedule.timesPerWeek ?? 3 }
              )
            }
            style={{
              ...S.segment,
              background: type === opt.key ? 'var(--accent)' : 'transparent',
              color: type === opt.key ? '#04140a' : 'var(--textDim)'
            }}
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
                onClick={() => {
                  const days = new Set(schedule.days ?? [])
                  if (on) days.delete(day)
                  else days.add(day)
                  onChange({ type: 'weekdays', days: [...days].sort() })
                }}
                style={{
                  ...S.dayBtn,
                  background: on ? 'var(--accent)' : 'transparent',
                  color: on ? '#04140a' : 'var(--textDim)',
                  borderColor: on ? 'var(--accent)' : 'var(--border)'
                }}
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
              onClick={() => onChange({ type: 'weekly', timesPerWeek: n })}
              style={{
                ...S.dayBtn,
                background: schedule.timesPerWeek === n ? 'var(--accent)' : 'transparent',
                color: schedule.timesPerWeek === n ? '#04140a' : 'var(--textDim)',
                borderColor: schedule.timesPerWeek === n ? 'var(--accent)' : 'var(--border)'
              }}
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
    gap: 12,
    background: 'var(--card)',
    border: '1px solid var(--border)',
    padding: '12px 14px',
    width: '100%'
  },
  name: { fontSize: 15, fontWeight: 600, color: 'var(--text)' },
  meta: { fontSize: 11, color: 'var(--textDim)', marginTop: 3 },
  streak: { fontSize: 13, fontWeight: 700, color: 'var(--warn)' },
  capNote: { color: 'var(--textMuted)', fontSize: 12, marginTop: 14, textAlign: 'center' },
  iconGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(46px, 1fr))', gap: 6 },
  iconBtn: {
    height: 46,
    fontSize: 20,
    border: '1px solid',
    background: 'var(--input)'
  },
  segmented: { display: 'flex', border: '1px solid var(--border)' },
  segment: {
    flex: 1,
    padding: '11px 4px',
    fontSize: 11,
    fontWeight: 700,
    textTransform: 'uppercase',
    letterSpacing: '0.04em'
  },
  dayRow: { display: 'flex', gap: 6, marginTop: 10 },
  dayBtn: {
    flex: 1,
    height: 44,
    border: '1px solid',
    fontSize: 13,
    fontWeight: 700
  },
  scheduleHint: { fontSize: 12, color: 'var(--textDim)', marginTop: 10 }
}
