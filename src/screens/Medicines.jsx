import { useMemo, useState } from 'react'
import { useStore } from '../state/StoreProvider'
import { useToday } from '../state/useToday'
import { addDays, formatTime } from '../domain/dates'
import { MED_TIMES } from '../domain/constants'
import { DAY_LABELS, describeSchedule } from '../domain/schedule'
import { adherence, describeDoses, doseId, dosesForDay, isCourseActive } from '../domain/medicines'
import { tap } from '../platform/haptics'
import { Screen, SectionTitle, Button, Sheet, Field, EmptyState, inputStyle } from '../components/ui'

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
          icon="💊"
          title="No medicines yet"
          hint="Track a prescription or a daily supplement, with the times you take it."
          action={<Button onClick={() => setEditing({ ...BLANK })}>Add a medicine</Button>}
        />
      ) : (
        <>
          <SectionTitle>Today</SectionTitle>
          {doses.length === 0 ? (
            <p style={S.note}>Nothing scheduled today.</p>
          ) : (
            <div style={S.list}>
              {MED_TIMES.filter((slot) => doses.some((d) => d.time === slot.key)).map((slot) => (
                <div key={slot.key}>
                  <div style={S.slotHead}>
                    <span>{slot.icon}</span>
                    <span>{slot.label}</span>
                    <span style={S.slotTime}>{formatTime(slot.key)}</span>
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
            </div>
          )}

          <SectionTitle>Last 7 days</SectionTitle>
          <div style={S.adherence}>
            <span style={S.adherencePct}>{week.pct}%</span>
            <span style={S.adherenceNote}>
              {week.taken} of {week.due} doses taken
            </span>
          </div>

          <SectionTitle>All medicines</SectionTitle>
          <div style={S.list}>
            {doc.medicines.map((med) => (
              <MedRow
                key={med.id}
                med={med}
                today={today}
                onClick={() => setEditing({ ...med })}
              />
            ))}
          </div>
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
    <button onClick={onToggle} aria-pressed={dose.taken} style={S.doseRow}>
      <span style={{ fontSize: 'var(--fs-xl)' }}>{dose.med.icon}</span>
      <div style={{ flex: 1, minWidth: 0, textAlign: 'left' }}>
        <div style={{ ...S.doseName, textDecoration: dose.taken ? 'line-through' : 'none' }}>
          {dose.med.name}
        </div>
        {dose.med.dose && <div style={S.doseMeta}>{dose.med.dose}</div>}
      </div>
      <span
        style={{
          ...S.check,
          background: dose.taken ? 'var(--accent)' : 'transparent',
          borderColor: dose.taken ? 'var(--accent)' : 'var(--border)',
          color: dose.taken ? 'var(--onAccent)' : 'transparent'
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
    <button onClick={onClick} style={{ ...S.medRow, opacity: isCourseActive(med, today) ? 1 : 0.5 }}>
      <span style={{ fontSize: 'var(--fs-xl)' }}>{med.icon}</span>
      <div style={{ flex: 1, minWidth: 0, textAlign: 'left' }}>
        <div style={S.doseName}>{med.name}</div>
        <div style={S.doseMeta}>
          {med.dose && <span>{med.dose} · </span>}
          <span>{describeDoses(med)}</span>
          <span> · {describeSchedule(med.schedule)}</span>
        </div>
      </div>
      {ended && <span style={S.tag}>Finished</span>}
      {notStarted && <span style={S.tag}>Not started</span>}
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
                style={{
                  ...S.timeBtn,
                  background: on ? 'var(--accent)' : 'transparent',
                  color: on ? 'var(--onAccent)' : 'var(--textDim)',
                  borderColor: on ? 'var(--accent)' : 'var(--border)'
                }}
              >
                <span style={{ fontSize: 'var(--fs-base)' }}>{slot.icon}</span>
                <span>{slot.label}</span>
              </button>
            )
          })}
        </div>
        {!local.times.length && <p style={S.warn}>Pick at least one time.</p>}
      </Field>

      <Field label="Repeat">
        <div style={S.segmented}>
          {[
            { key: 'daily', label: 'Every day' },
            { key: 'weekdays', label: 'Certain days' }
          ].map((opt) => (
            <button
              key={opt.key}
              onClick={() =>
                set({
                  schedule:
                    opt.key === 'daily'
                      ? { type: 'daily' }
                      : { type: 'weekdays', days: schedule.days ?? [1, 3, 5] }
                })
              }
              style={{
                ...S.segment,
                background: schedule.type === opt.key ? 'var(--accent)' : 'transparent',
                color: schedule.type === opt.key ? 'var(--onAccent)' : 'var(--textDim)'
              }}
            >
              {opt.label}
            </button>
          ))}
        </div>

        {schedule.type === 'weekdays' && (
          <div style={S.dayRow}>
            {[1, 2, 3, 4, 5, 6, 0].map((day) => {
              const on = (schedule.days ?? []).includes(day)
              return (
                <button
                  key={day}
                  onClick={() => {
                    const days = new Set(schedule.days ?? [])
                    if (on) days.delete(day)
                    else days.add(day)
                    set({ schedule: { type: 'weekdays', days: [...days].sort() } })
                  }}
                  style={{
                    ...S.dayBtn,
                    background: on ? 'var(--accent)' : 'transparent',
                    color: on ? 'var(--onAccent)' : 'var(--textDim)',
                    borderColor: on ? 'var(--accent)' : 'var(--border)'
                  }}
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
  list: { display: 'flex', flexDirection: 'column', gap: 8 },
  slotHead: {
    display: 'flex',
    alignItems: 'center',
    gap: 7,
    fontSize: 'var(--fs-2xs)',
    fontWeight: 700,
    textTransform: 'uppercase',
    letterSpacing: '0.08em',
    color: 'var(--textDim)',
    margin: '10px 0 6px'
  },
  slotTime: { marginLeft: 'auto', color: 'var(--textMuted)', letterSpacing: 0 },
  doseRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    background: 'var(--card)',
    border: '1px solid var(--border)',
    padding: '10px 12px',
    width: '100%',
    marginBottom: 6
  },
  medRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    background: 'var(--card)',
    border: '1px solid var(--border)',
    padding: '12px 14px',
    width: '100%'
  },
  doseName: { fontSize: 'var(--fs-base)', fontWeight: 600, color: 'var(--text)' },
  doseMeta: { fontSize: 'var(--fs-xs)', color: 'var(--textDim)', marginTop: 3 },
  tag: {
    fontSize: 'var(--fs-3xs)',
    fontWeight: 700,
    textTransform: 'uppercase',
    letterSpacing: '0.06em',
    color: 'var(--textMuted)',
    border: '1px solid var(--border)',
    padding: '3px 6px',
    flexShrink: 0
  },
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
  },
  adherence: {
    background: 'var(--card)',
    border: '1px solid var(--border)',
    padding: 14,
    display: 'flex',
    alignItems: 'baseline',
    gap: 10
  },
  adherencePct: { fontSize: 'var(--fs-3xl)', fontWeight: 800, color: 'var(--accent)' },
  adherenceNote: { fontSize: 'var(--fs-sm)', color: 'var(--textDim)' },
  timeGrid: { display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 6 },
  timeBtn: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
    padding: '10px 4px',
    border: '1px solid',
    fontSize: 'var(--fs-xs)',
    fontWeight: 700
  },
  segmented: { display: 'flex', border: '1px solid var(--border)' },
  segment: {
    flex: 1,
    padding: '11px 4px',
    fontSize: 'var(--fs-xs)',
    fontWeight: 700,
    textTransform: 'uppercase',
    letterSpacing: '0.04em'
  },
  dayRow: { display: 'flex', gap: 6, marginTop: 10 },
  dayBtn: {
    flex: 1,
    minWidth: 0,
    height: 'var(--touch)',
    border: '1px solid',
    fontSize: 'var(--fs-md)',
    fontWeight: 700
  },
  courseRow: { display: 'flex', gap: 8 },
  hint: { fontSize: 'var(--fs-sm)', color: 'var(--textDim)', marginTop: 8, lineHeight: 1.5 },
  warn: { fontSize: 'var(--fs-sm)', color: 'var(--warn)', marginTop: 8 }
}
