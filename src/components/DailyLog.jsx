import { useState } from 'react'
import { logFor } from '../domain/daily'
import { LOG_SCALE, WATER_TARGET } from '../domain/constants'
import { Overline, Panel, Rule, Data } from './ui'

// The end-of-day log. Lives here rather than on a screen because Today and the
// Calendar's day sheet both need it — Today for tonight, the Calendar for the
// evening you forgot.
//
// Every mark below is square. Mood points, energy points and water glasses are
// notation, not furniture, and DESIGN.md's rule is that containers round and
// data does not. The panel around them has the corners.

/**
 * @param dateKey the day being logged — the Calendar passes a past one
 * @param onSet   (field, value) => void, straight into the `log/set` action
 */
export default function DailyLog({ dailyLogs, dateKey, onSet, title = 'End of day' }) {
  const log = logFor(dailyLogs, dateKey)

  return (
    <>
      <Overline>{title}</Overline>
      <Panel flush>
        <Scale
          label="Mood"
          value={log.mood}
          onChange={(v) => onSet('mood', v)}
          low="Rough"
          high="Great"
        />
        <Rule />
        <Scale
          label="Energy"
          value={log.energy}
          onChange={(v) => onSet('energy', v)}
          low="Drained"
          high="Wired"
        />
        <Rule />
        <Water value={log.water} onChange={(v) => onSet('water', v)} />
        <Rule />
        {/* Keyed on the day: the Calendar reuses this component across days,
            and remounting is how the draft resets. Syncing it in an effect
            instead means a cascading render on every keystroke. */}
        <Note key={dateKey} value={log.note} onChange={(v) => onSet('note', v)} />
      </Panel>
    </>
  )
}

/**
 * Five marks, tap one. Tapping the mark that is already set clears the whole
 * row — otherwise a mis-tap is permanent, because there is no "unset" value to
 * pick and the field would be stuck at whatever was hit first.
 */
function Scale({ label, value, onChange, low, high }) {
  return (
    <div style={S.row}>
      <div style={S.head}>
        <Data style={S.label}>{label}</Data>
        <Data style={S.value}>
          {value === null
            ? 'Not set'
            : `${value} / ${LOG_SCALE} · ${value >= 4 ? high : value <= 2 ? low : 'OK'}`}
        </Data>
      </div>
      <div style={S.marks}>
        {Array.from({ length: LOG_SCALE }, (_, i) => {
          const point = i + 1
          const on = value !== null && point <= value
          return (
            <button
              key={point}
              onClick={() => onChange(value === point ? null : point)}
              aria-label={`${label} ${point} of ${LOG_SCALE}`}
              aria-pressed={on}
              style={S.markHit}
            >
              <span
                style={{
                  ...S.mark,
                  background: on ? 'var(--text)' : 'transparent',
                  borderColor: on ? 'var(--text)' : 'var(--border)'
                }}
              />
            </button>
          )
        })}
      </div>
    </div>
  )
}

function Water({ value, onChange }) {
  return (
    <div style={S.row}>
      <div style={S.head}>
        <Data style={S.label}>Water</Data>
        <Data style={S.value}>
          {value} of {WATER_TARGET} glasses
        </Data>
      </div>
      <div style={S.waterRow}>
        <div style={S.glasses} role="img" aria-label={`${value} of ${WATER_TARGET} glasses`}>
          {Array.from({ length: Math.max(WATER_TARGET, value) }, (_, i) => (
            <span
              key={i}
              style={{
                ...S.glass,
                background: i < value ? 'var(--text)' : 'transparent',
                borderColor: i < value ? 'var(--text)' : 'var(--rule)'
              }}
            />
          ))}
        </div>
        <div style={S.stepper}>
          <button
            onClick={() => onChange(Math.max(0, value - 1))}
            style={S.step}
            aria-label="One glass fewer"
          >
            −
          </button>
          <button onClick={() => onChange(value + 1)} style={S.step} aria-label="One glass more">
            +
          </button>
        </div>
      </div>
    </div>
  )
}

/**
 * One line about the day.
 *
 * Kept in local state and written on blur rather than on every keystroke: the
 * store autosaves on change, and dispatching per character would serialise the
 * whole document dozens of times while someone types a sentence.
 */
function Note({ value, onChange }) {
  const [draft, setDraft] = useState(value)

  return (
    <div style={S.row}>
      <Data style={S.label}>Note</Data>
      <textarea
        rows={2}
        style={S.note}
        value={draft}
        placeholder="Anything worth remembering about today"
        onChange={(e) => setDraft(e.target.value)}
        onBlur={() => draft !== value && onChange(draft)}
      />
    </div>
  )
}

const S = {
  row: { padding: '13px 16px' },
  head: { display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 12 },
  label: {
    fontSize: 'var(--fs-2xs)',
    fontWeight: 600,
    letterSpacing: '0.14em',
    textTransform: 'uppercase',
    color: 'var(--textMuted)'
  },
  value: {
    fontSize: 'var(--fs-2xs)',
    letterSpacing: '0.1em',
    textTransform: 'uppercase',
    color: 'var(--textDim)',
    textAlign: 'right'
  },
  marks: { display: 'flex', marginTop: 4, marginLeft: -12 },
  // The 48dp target is the invisible button; the visible mark is small. Made
  // the other way round — a full-width 48px block per point — five filled
  // rectangles ended up the loudest thing on the screen, shouting over the
  // level numeral and every completion state for a number nobody earned.
  markHit: {
    width: 'var(--touch)',
    height: 'var(--touch)',
    minWidth: 0,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'transparent'
  },
  // PULSE, not ENERGY. The accent means live, next, or just earned; a mood
  // rating is none of those, and spending the signal colour on it devalues it
  // everywhere else.
  mark: {
    width: 20,
    height: 20,
    border: '1px solid',
    borderRadius: 0
  },
  waterRow: { display: 'flex', alignItems: 'center', gap: 12, marginTop: 10 },
  glasses: { display: 'flex', flexWrap: 'wrap', gap: 4, flex: 1, minWidth: 0 },
  glass: { width: 12, height: 18, border: '1px solid', flexShrink: 0 },
  stepper: { display: 'flex', gap: 6, flexShrink: 0 },
  step: {
    width: 'var(--touch)',
    height: 'var(--touch)',
    border: '1px solid var(--border)',
    borderRadius: 'var(--radius-pill)',
    color: 'var(--text)',
    fontSize: 'var(--fs-lg)',
    fontWeight: 700
  },
  note: {
    width: '100%',
    marginTop: 10,
    background: 'var(--input)',
    border: '1px solid var(--border)',
    borderRadius: 'var(--radius-sm)',
    color: 'var(--text)',
    fontSize: 'var(--fs-base)',
    fontFamily: 'var(--font-sans)',
    padding: '10px 12px',
    resize: 'vertical',
    outline: 'none'
  }
}
