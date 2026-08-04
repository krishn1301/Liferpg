import { useMemo, useState } from 'react'
import { useStore } from '../state/StoreProvider'
import { useToday } from '../state/useToday'
import { addDays, formatTime } from '../domain/dates'
import { MED_TIMES } from '../domain/constants'
import { DAY_LABELS, describeSchedule } from '../domain/schedule'
import { adherence, describeDoses, doseId, dosesForDay, isCourseActive } from '../domain/medicines'
import { tap } from '../platform/haptics'
import {
  Screen,
  Overline,
  Panel,
  Rule,
  Button,
  Sheet,
  Field,
  EmptyState,
  Data,
  Segmented,
  inputStyle
} from '../components/ui'

const BLANK = {
  name: '',
  dose: '',
  icon: '💊',
  times: ['08:00'],
  schedule: { type: 'daily' },
  startKey: null,
  endKey: null
}

export default function Medicines() {
  const { doc, dispatch } = useStore()
  const today = useToday()
  const [editing, setEditing] = useState(null)

  const doses = useMemo(
    () => dosesForDay(doc.medicines, doc.dailyLogs, today),
    [doc.medicines, doc.dailyLogs, today]
  )
  const week = useMemo(
    () => adherence(doc.medicines, doc.dailyLogs, addDays(today, -6), today),
    [doc.medicines, doc.dailyLogs, today]
  )

  const takenToday = doses.filter((d) => d.taken).length

  const save = (draft) => {
    if (!draft.name.trim() || !draft.times.length) return
    if (draft.id) dispatch({ type: 'med/update', id: draft.id, changes: draft })
    else dispatch({ type: 'med/add', medicine: draft, todayKey: today })
    setEditing(null)
  }

  return (
    <Screen
      title="Medicines"
      subtitle={doses.length ? `${takenToday} of ${doses.length} taken today` : 'Nothing due today'}
      action={<Button onClick={() => setEditing({ ...BLANK })}>+ Add</Button>}
    >
      {doc.medicines.length === 0 ? (
        <EmptyState
          title="No medicines yet"
          hint="Track a prescription or a daily supplement, with the times you take it."
          action={<Button onClick={() => setEditing({ ...BLANK })}>Add a medicine</Button>}
        />
      ) : (
        <>
          <Overline>Today</Overline>
          {doses.length === 0 ? (
            <p style={S.note}>Nothing scheduled today.</p>
          ) : (
            // A timetable: each slot is a departure time with its doses under it.
            <Panel flush>
              {MED_TIMES.filter((slot) => doses.some((d) => d.time === slot.key)).map((slot, i) => (
                <div key={slot.key}>
                  {i > 0 && <Rule />}
                  <div style={S.slotHead}>
                    <Data style={S.slotTime}>{formatTime(slot.key)}</Data>
                    <Data style={S.slotLabel}>{slot.label}</Data>
                  </div>
                  {doses
                    .filter((d) => d.time === slot.key)
                    .map((dose) => (
                      <DoseRow
                        key={dose.id}
                        dose={dose}
                        onToggle={() => {
                          tap(dose.taken ? 'light' : 'medium')
                          dispatch({
                            type: 'med/toggleDose',
                            dateKey: today,
                            doseId: doseId(dose.med.id, dose.time)
                          })
                        }}
                      />
                    ))}
                </div>
              ))}
            </Panel>
          )}

          <Overline>Last 7 days</Overline>
          <Panel flush>
            <div style={S.adherence}>
              <Data style={S.adherenceLabel}>Adherence</Data>
              <Data style={S.adherencePct}>{week.pct}%</Data>
            </div>
            <Rule />
            <div style={S.adherence}>
              <Data style={S.adherenceLabel}>Doses taken</Data>
              <Data style={S.adherenceNote}>
                {week.taken} of {week.due}
              </Data>
            </div>
          </Panel>

          <Overline>All medicines</Overline>
          <Panel flush>
            {doc.medicines.map((med, i) => (
              <div key={med.id}>
                {i > 0 && <Rule />}
                <MedRow med={med} today={today} onClick={() => setEditing({ ...med })} />
              </div>
            ))}
          </Panel>
        </>
      )}

      {editing && (
        <MedSheet
          key={editing.id ?? 'new'}
          draft={editing}
          onClose={() => setEditing(null)}
          onSave={save}
          onDelete={
            editing.id
              ? () => {
                  dispatch({ type: 'med/delete', id: editing.id })
                  setEditing(null)
                }
              : null
          }
        />
      )}
    </Screen>
  )
}

function DoseRow({ dose, onToggle }) {
  return (
    <button
      onClick={onToggle}
      aria-pressed={dose.taken}
      aria-label={dose.taken ? `Mark ${dose.med.name} not taken` : `Mark ${dose.med.name} taken`}
      style={{ ...S.doseRow, ...(dose.taken ? S.taken : null) }}
    >
      <span style={{ fontSize: 'var(--fs-xl)' }}>{dose.med.icon}</span>
      <div style={{ flex: 1, minWidth: 0, textAlign: 'left' }}>
        <div style={S.doseName}>{dose.med.name}</div>
        {dose.med.dose && <div style={S.doseMeta}>{dose.med.dose}</div>}
      </div>
      <span
        style={{
          ...S.check,
          borderColor: dose.taken ? 'currentColor' : 'var(--border)',
          color: dose.taken ? 'currentColor' : 'transparent'
        }}
      >
        ✓
      </span>
    </button>
  )
}

function MedRow({ med, today, onClick }) {
  const ended = med.endKey && today > med.endKey
  const notStarted = med.startKey && today < med.startKey

  return (
    <button
      onClick={onClick}
      style={{ ...S.medRow, opacity: isCourseActive(med, today) ? 1 : 0.5 }}
    >
      <span style={{ fontSize: 'var(--fs-xl)' }}>{med.icon}</span>
      <div style={{ flex: 1, minWidth: 0, textAlign: 'left' }}>
        <div style={S.doseName}>{med.name}</div>
        <div style={S.doseMeta}>
          {med.dose && `${med.dose} · `}
          {describeDoses(med)} · {describeSchedule(med.schedule)}
        </div>
      </div>
      {ended && <Data style={S.tag}>Finished</Data>}
      {notStarted && <Data style={S.tag}>Not started</Data>}
    </button>
  )
}

function MedSheet({ draft, onClose, onSave, onDelete }) {
  const [local, setLocal] = useState(draft)
  const set = (changes) => setLocal((p) => ({ ...p, ...changes }))
  const schedule = local.schedule ?? { type: 'daily' }

  const toggleTime = (key) => {
    const times = new Set(local.times ?? [])
    if (times.has(key)) times.delete(key)
    else times.add(key)
    set({ times: [...times] })
  }

  const valid = local.name.trim() && local.times.length > 0

  return (
    <Sheet
      open
      title={local.id ? 'Edit medicine' : 'New medicine'}
      onClose={onClose}
      footer={
        <>
          <Button onClick={() => onSave(local)} disabled={!valid} style={{ flex: 1 }}>
            {local.id ? 'Save' : 'Add medicine'}
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
          placeholder="e.g. Vitamin D"
          onChange={(e) => set({ name: e.target.value })}
        />
      </Field>

      <Field label="Dose (optional)">
        <input
          style={inputStyle}
          value={local.dose}
          placeholder="e.g. 500mg, 2 tablets"
          onChange={(e) => set({ dose: e.target.value })}
        />
      </Field>

      <Field label="Times of day">
        <div style={S.timeGrid}>
          {MED_TIMES.map((slot) => {
            const on = (local.times ?? []).includes(slot.key)
            return (
              <button
                key={slot.key}
                onClick={() => toggleTime(slot.key)}
                aria-pressed={on}
                style={{ ...S.timeBtn, ...(on ? S.selected : null) }}
              >
                <span>{slot.label}</span>
                <Data style={S.timeBtnClock}>{formatTime(slot.key)}</Data>
              </button>
            )
          })}
        </div>
        {!local.times.length && <p style={S.warn}>Pick at least one time.</p>}
      </Field>

      <Field label="Repeat">
        <Segmented
          options={[
            { key: 'daily', label: 'Every day' },
            { key: 'weekdays', label: 'Certain days' }
          ]}
          value={schedule.type}
          onChange={(key) =>
            set({
              schedule:
                key === 'daily'
                  ? { type: 'daily' }
                  : { type: 'weekdays', days: schedule.days ?? [1, 3, 5] }
            })
          }
        />

        {schedule.type === 'weekdays' && (
          <div style={S.dayRow}>
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
                    set({ schedule: { type: 'weekdays', days: [...days].sort() } })
                  }}
                  style={{ ...S.dayBtn, ...(on ? S.selected : null) }}
                >
                  {DAY_LABELS[day][0]}
                </button>
              )
            })}
          </div>
        )}
      </Field>

      <Field label="Course (optional)">
        <div style={S.courseRow}>
          <input
            type="date"
            style={inputStyle}
            value={local.startKey ?? ''}
            onChange={(e) => set({ startKey: e.target.value || null })}
          />
          <input
            type="date"
            style={inputStyle}
            value={local.endKey ?? ''}
            onChange={(e) => set({ endKey: e.target.value || null })}
          />
        </div>
        <p style={S.hint}>
          Leave blank for an ongoing medicine. A course stops counting against you once it ends.
        </p>
      </Field>
    </Sheet>
  )
}

const S = {
  note: { fontSize: 'var(--fs-md)', color: 'var(--textDim)' },
  slotHead: {
    display: 'flex',
    alignItems: 'baseline',
    gap: 10,
    padding: '11px 16px 9px'
  },
  slotTime: { fontSize: 'var(--fs-xs)', fontWeight: 700, color: 'var(--text)' },
  slotLabel: {
    fontSize: 'var(--fs-2xs)',
    letterSpacing: '0.14em',
    textTransform: 'uppercase',
    color: 'var(--textMuted)'
  },
  doseRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    background: 'transparent',
    border: 'none',
    borderTop: '1px solid var(--rule)',
    padding: '10px 14px',
    width: '100%'
  },
  taken: { background: 'var(--text)', color: 'var(--onInk)' },
  medRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    background: 'transparent',
    padding: '12px 16px',
    width: '100%'
  },
  doseName: { fontSize: 'var(--fs-base)', fontWeight: 600 },
  doseMeta: {
    fontFamily: 'var(--font-mono)',
    fontSize: 'var(--fs-2xs)',
    letterSpacing: '0.1em',
    textTransform: 'uppercase',
    color: 'currentColor',
    opacity: 0.62,
    marginTop: 4
  },
  tag: {
    fontSize: 'var(--fs-3xs)',
    fontWeight: 600,
    textTransform: 'uppercase',
    letterSpacing: '0.12em',
    color: 'var(--textMuted)',
    border: '1px solid var(--border)',
    borderRadius: 'var(--radius-pill)',
    padding: '3px 8px',
    flexShrink: 0
  },
  check: {
    width: 32,
    height: 32,
    flexShrink: 0,
    background: 'transparent',
    border: '1px solid',
    borderRadius: 'var(--radius-pill)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: 'var(--fs-md)',
    fontWeight: 800
  },
  adherence: {
    display: 'flex',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    gap: 12,
    padding: '11px 16px'
  },
  adherenceLabel: {
    fontSize: 'var(--fs-2xs)',
    letterSpacing: '0.14em',
    textTransform: 'uppercase',
    color: 'var(--textMuted)'
  },
  adherencePct: { fontSize: 'var(--fs-xl)', fontWeight: 700, color: 'var(--accent)' },
  adherenceNote: { fontSize: 'var(--fs-base)', fontWeight: 700 },
  selected: { background: 'var(--text)', color: 'var(--onInk)', borderColor: 'var(--text)' },
  timeGrid: { display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 6 },
  timeBtn: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    minWidth: 0,
    padding: '10px 4px',
    border: '1px solid var(--border)',
    borderRadius: 'var(--radius-sm)',
    background: 'transparent',
    color: 'var(--textDim)',
    fontSize: 'var(--fs-xs)',
    fontWeight: 700
  },
  timeBtnClock: { fontSize: 'var(--fs-3xs)', opacity: 0.75 },
  dayRow: { display: 'flex', gap: 6, marginTop: 10 },
  dayBtn: {
    flex: 1,
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
  courseRow: { display: 'flex', gap: 8 },
  hint: { fontSize: 'var(--fs-sm)', color: 'var(--textDim)', marginTop: 8, lineHeight: 1.5 },
  warn: { fontSize: 'var(--fs-sm)', color: 'var(--warn)', marginTop: 8 }
}
