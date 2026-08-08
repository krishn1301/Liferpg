import { useState } from 'react'
import { logFor } from '../domain/daily'
import { LOG_SCALE, WATER_TARGET, WATER_MAX } from '../domain/constants'
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
      {/* A radiogroup, not five toggles. The fill is cumulative — at mood 3 the
          first three squares are filled — so `aria-pressed` announced three
          separate buttons as "pressed" and left a screen-reader user counting
          them to work out the value. One radio is checked; the rest are not. */}
      <div style={S.marks} role="radiogroup" aria-label={label}>
        {Array.from({ length: LOG_SCALE }, (_, i) => {
          const point = i + 1
          const on = value !== null && point <= value
          return (
            <button
              key={point}
              role="radio"
              onClick={() => onChange(value === point ? null : point)}
              aria-label={`${point} of ${LOG_SCALE}${point === 1 ? `, ${low}` : point === LOG_SCALE ? `, ${high}` : ''}`}
              aria-checked={value === point}
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
      {/* Five identical squares say nothing about which way is up. The value
          line above only names an end once you have already picked one, which
          is too late to be an affordance. */}
      <div style={S.anchors} aria-hidden="true">
        <Data style={S.anchor}>{low}</Data>
        <Data style={S.anchor}>{high}</Data>
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
        {/* Tappable. Eight presses of `+` to log an ordinary day is a lot of
            friction on the screen people open last thing at night, and the
            boxes were sitting right there looking pressable. Tapping the nth
            sets n; tapping the one you are already on clears back to n-1, so
            the row can go down as well as up without reaching for the stepper. */}
        <div style={S.glasses}>
          {Array.from({ length: Math.max(WATER_TARGET, value) }, (_, i) => (
            <button
              key={i}
              onClick={() => onChange(value === i + 1 ? i : i + 1)}
              aria-label={`${i + 1} glass${i ? 'es' : ''}`}
              aria-pressed={i < value}
              style={S.glassHit}
            >
              <span
                style={{
                  ...S.glass,
                  background: i < value ? 'var(--text)' : 'transparent',
                  borderColor: i < value ? 'var(--text)' : 'var(--rule)'
                }}
              />
            </button>
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
          {/* Capped. `+` was unbounded and the row renders one box per glass,
              so a leaning thumb grew the panel until it wrapped over several
              lines. Nothing is scored against this number; it does not need to
              go to a hundred. */}
          <button
            onClick={() => onChange(Math.min(WATER_MAX, value + 1))}
            style={S.step}
            disabled={value >= WATER_MAX}
            aria-label="One glass more"
          >
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
      {/* A real label, not a span that happens to sit above the field. Without
          it the textarea's only accessible name was its placeholder, which
          disappears the moment anything is typed into it. */}
      <label htmlFor="daily-note" style={S.noteLabel}>
        Note
      </label>
      <textarea
        id="daily-note"
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
  // The others are wrapped in `Data`, which supplies the mono face. A real
  // <label> cannot be, so it carries the face itself.
  noteLabel: {
    display: 'block',
    fontFamily: 'var(--font-mono)',
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
  // Sits under the row, spanning it, so the two ends are labelled where the
  // scale actually ends. --fs-3xs and muted: an anchor is a legend, not content.
  anchors: {
    display: 'flex',
    justifyContent: 'space-between',
    marginTop: -6,
    paddingRight: 14
  },
  anchor: {
    fontSize: 'var(--fs-3xs)',
    letterSpacing: '0.12em',
    textTransform: 'uppercase',
    color: 'var(--textMuted)'
  },
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
  glasses: { display: 'flex', flexWrap: 'wrap', flex: 1, minWidth: 0, marginLeft: -4 },
  // Same compromise the seven-across day picker makes, and for the same reason:
  // eight 48px-wide targets do not fit beside the stepper on a 411px screen, so
  // width shrinks and height carries the touch target. See DESIGN.md.
  glassHit: {
    height: 'var(--touch)',
    width: 20,
    minWidth: 0,
    padding: 0,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center'
  },
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
