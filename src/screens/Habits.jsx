import { useState } from 'react'
import { useStore } from '../state/StoreProvider'
import { useToday } from '../state/useToday'
import { describeSchedule, DAY_LABELS } from '../domain/schedule'
import { HABIT_KINDS, isVow, cleanStreak, relapseKeys } from '../domain/quit'
import { formatTime, fromDateKey } from '../domain/dates'
import { CATEGORIES, ICONS, categoryOf, MAX_HABITS } from '../domain/constants'
import { canRemind, isIOS } from '../platform/device'
import { requestReminderPermission } from '../platform/reminders'
import {
  Screen,
  Button,
  Sheet,
  Field,
  EmptyState,
  QuestNumber,
  Segmented,
  Data,
  inputStyle
} from '../components/ui'
import { CodeStrip, stripDays, vowStripDays } from '../components/catalog'

const BLANK = {
  name: '',
  icon: '⭐',
  category: 'fitness',
  kind: HABIT_KINDS.build,
  schedule: { type: 'daily' }
}

/** "14 days clean" — a vow's line where a build habit prints its schedule. */
function cleanRun(habit, todayKey) {
  const n = cleanStreak(habit, todayKey)
  return n === 1 ? '1 day clean' : `${n} days clean`
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
            const vow = isVow(habit)
            return (
              <button key={habit.id} onClick={() => setEditing({ ...habit })} style={S.row}>
                <QuestNumber n={i + 1} />
                <span style={{ fontSize: 'var(--fs-xl)' }}>{habit.icon}</span>
                <div style={{ flex: 1, minWidth: 0, textAlign: 'left' }}>
                  <div style={S.name}>{habit.name}</div>
                  {/* Category and schedule only. The streak lives on Today and
                      in Stats; adding it here wrapped the line on any habit
                      with a named-days schedule and left the rows ragged. A vow
                      has no schedule to print, so its run goes here instead. */}
                  <div style={S.meta}>
                    {cat.label} · {vow ? cleanRun(habit, today) : describeSchedule(habit.schedule)}
                  </div>
                </div>
                <CodeStrip
                  days={vow ? vowStripDays(habit, today) : stripDays(habit, today)}
                  color={cat.color}
                  size={9}
                  gap={2}
                />
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
          today={today}
          onClose={() => setEditing(null)}
          onSave={save}
          onUnrelapse={(dateKey) => dispatch({ type: 'habit/unrelapse', id: editing.id, dateKey })}
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

function HabitSheet({ draft, today, onClose, onSave, onUnrelapse, onDelete }) {
  const [local, setLocal] = useState(draft)
  const set = (changes) => setLocal((p) => ({ ...p, ...changes }))
  const schedule = local.schedule ?? { type: 'daily' }
  const vow = isVow(local)

  // Removing a slip writes through immediately *and* updates the draft. Only
  // dispatching would let Save write the stale `relapses` straight back over it.
  const removeRelapse = (dateKey) => {
    const relapses = { ...local.relapses }
    delete relapses[dateKey]
    set({ relapses })
    onUnrelapse(dateKey)
  }

  return (
    <Sheet
      open
      title={local.id ? (vow ? 'Edit vow' : 'Edit habit') : 'New habit'}
      onClose={onClose}
      footer={
        <>
          <Button onClick={() => onSave(local)} disabled={!local.name.trim()} style={{ flex: 1 }}>
            {local.id ? 'Save' : vow ? 'Add vow' : 'Add habit'}
          </Button>
          {onDelete && (
            <Button variant="danger" onClick={onDelete}>
              Delete
            </Button>
          )}
        </>
      }
    >
      {/* Type comes first because it changes what the rest of the sheet asks
          for. Switching an existing habit would silently reinterpret its whole
          history — completions on a vow, relapses on a build habit — so the
          control is only offered while the record is still new. */}
      {!local.id && (
        <Field label="Type">
          <Segmented
            options={[
              { key: HABIT_KINDS.build, label: 'Build a habit' },
              { key: HABIT_KINDS.quit, label: 'Quit something' }
            ]}
            value={local.kind ?? HABIT_KINDS.build}
            onChange={(kind) => set({ kind })}
          />
        </Field>
      )}

      <Field label="Name">
        <input
          style={inputStyle}
          value={local.name}
          autoFocus
          placeholder={vow ? 'e.g. No smoking' : 'e.g. Morning run'}
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

      {vow ? (
        <VowEditor local={local} today={today} set={set} onRemoveRelapse={removeRelapse} />
      ) : (
        <>
          <Field label="Repeat">
            <ScheduleEditor schedule={schedule} onChange={(s) => set({ schedule: s })} />
          </Field>

          {/* Not offered for a vow: there is nothing to be nudged to do, and a
              notification saying "No smoking" at 8pm every day is a reminder of
              the thing you are trying not to think about. */}
          <ReminderEditor
            times={local.reminders ?? []}
            onChange={(reminders) => set({ reminders })}
          />
        </>
      )}
    </Sheet>
  )
}

/**
 * Reminder times for one habit.
 *
 * Permission is asked the first time a time is added — not at launch, and not
 * when the sheet opens. A notification prompt fired before the user has asked
 * for notifications is how an app collects a permanent Deny it can never
 * recover from.
 */
function ReminderEditor({ times, onChange }) {
  const [draft, setDraft] = useState('08:00')
  const [denied, setDenied] = useState(false)

  if (!canRemind) {
    return (
      <Field label="Remind me">
        {/* Said plainly rather than shown as a control that quietly does
            nothing — see DESIGN.md, "Platform truth". */}
        <p style={S.scheduleHint}>
          Reminders need the installed app. {isIOS ? 'Safari on iPhone' : 'A browser'} cannot
          schedule a notification without a server.
        </p>
      </Field>
    )
  }

  const add = async () => {
    if (!draft || times.includes(draft)) return
    const granted = await requestReminderPermission()
    setDenied(!granted)
    // The time is stored either way. Permission can be turned back on in system
    // settings later, and throwing away what the user typed because the OS said
    // no is punishing them for the platform's answer.
    onChange([...times, draft].sort())
  }

  return (
    <Field label="Remind me">
      <div style={S.remindRow}>
        <input
          type="time"
          style={{ ...inputStyle, flex: 1 }}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
        />
        <Button variant="ghost" onClick={add} disabled={!draft || times.includes(draft)}>
          Add
        </Button>
      </div>

      {times.length > 0 && (
        <div style={S.timePills}>
          {times.map((time) => (
            <button
              key={time}
              onClick={() => onChange(times.filter((t) => t !== time))}
              style={S.timePill}
              aria-label={`Remove the ${formatTime(time)} reminder`}
            >
              <Data>{formatTime(time)}</Data>
              <span aria-hidden="true">✕</span>
            </button>
          ))}
        </div>
      )}

      {denied && (
        <p style={{ ...S.scheduleHint, color: 'var(--danger)' }}>
          Notifications are turned off for LifeRPG. These times are saved, but nothing will be
          posted until you allow notifications in system settings.
        </p>
      )}
    </Field>
  )
}

/**
 * A vow has no schedule — it asks for the date the run started instead.
 *
 * That date is editable rather than pinned to the day you added the habit,
 * because "I have already been clean for sixty days" is true, and an app that
 * makes you start from zero to use it is one you stop using.
 */
function VowEditor({ local, today, set, onRemoveRelapse }) {
  const slips = relapseKeys(local)
    .filter((k) => k <= today)
    .reverse()

  return (
    <>
      <Field label="Clean since">
        <input
          type="date"
          style={inputStyle}
          // Not before this, and not in the future: a run that starts tomorrow
          // has nothing to count, and `cleanStreak` would read 0 forever.
          max={today}
          value={local.createdKey ?? today}
          onChange={(e) => set({ createdKey: e.target.value || today })}
        />
      </Field>

      <p style={S.scheduleHint}>{cleanRun({ ...local, kind: HABIT_KINDS.quit }, today)}</p>

      {slips.length > 0 && (
        <Field label={`Relapses (${slips.length})`}>
          <div style={S.slipList}>
            {slips.map((key) => (
              <div key={key} style={S.slipRow}>
                <span style={S.slipDate}>
                  {fromDateKey(key).toLocaleDateString(undefined, {
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric'
                  })}
                </span>
                <button
                  onClick={() => onRemoveRelapse(key)}
                  style={S.slipRemove}
                  aria-label={`Remove the relapse on ${key}`}
                >
                  Undo
                </button>
              </div>
            ))}
          </div>
        </Field>
      )}
    </>
  )
}

function ScheduleEditor({ schedule, onChange }) {
  const type = schedule.type

  return (
    <div>
      <Segmented
        options={[
          { key: 'daily', label: 'Every day' },
          { key: 'weekdays', label: 'Certain days' },
          { key: 'weekly', label: 'X per week' }
        ]}
        value={type}
        onChange={(key) =>
          onChange(
            key === 'daily'
              ? { type: 'daily' }
              : key === 'weekdays'
                ? { type: 'weekdays', days: schedule.days ?? [1, 3, 5] }
                : { type: 'weekly', timesPerWeek: schedule.timesPerWeek ?? 3 }
          )
        }
      />

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
    background: 'var(--panel)',
    border: '1px solid var(--border)',
    borderRadius: 'var(--radius)',
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
    borderRadius: 'var(--radius-sm)',
    background: 'var(--input)'
  },
  remindRow: { display: 'flex', gap: 8, alignItems: 'stretch' },
  timePills: { display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 10 },
  timePill: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    // Under the 48dp floor on purpose: these sit in a wrapping row inside a
    // sheet, and full-size targets would push the form below the keyboard.
    minHeight: 34,
    minWidth: 0,
    padding: '0 12px',
    border: '1px solid var(--border)',
    borderRadius: 'var(--radius-pill)',
    color: 'var(--textDim)',
    fontSize: 'var(--fs-2xs)'
  },
  slipList: { display: 'flex', flexDirection: 'column' },
  slipRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    borderTop: '1px solid var(--rule)'
  },
  slipDate: {
    fontFamily: 'var(--font-mono)',
    fontSize: 'var(--fs-xs)',
    letterSpacing: '0.08em',
    textTransform: 'uppercase',
    color: 'var(--danger)'
  },
  slipRemove: {
    fontFamily: 'var(--font-mono)',
    fontSize: 'var(--fs-2xs)',
    fontWeight: 600,
    letterSpacing: '0.14em',
    textTransform: 'uppercase',
    color: 'var(--textDim)',
    padding: '0 4px'
  },
  dayRow: { display: 'flex', gap: 6, marginTop: 10 },
  dayBtn: {
    flex: 1,
    // Seven of these sit in one row; min-width has to yield or they overflow
    // the sheet. Height still carries the 48dp target.
    minWidth: 0,
    height: 'var(--touch)',
    border: '1px solid var(--border)',
    borderRadius: 'var(--radius-pill)',
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
