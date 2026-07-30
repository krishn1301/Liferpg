// The catalogue's signature devices — see DESIGN.md, "The three signature
// devices". Everything here encodes real data; none of it is ornament, and
// none of it may be reused for decoration.

import { useEffect, useMemo, useRef, useState } from 'react'
import { addDays } from '../domain/dates'
import { isDueOn, normalizeSchedule, SCHEDULE_TYPES } from '../domain/schedule'
import { levelCost } from '../domain/xp'

/**
 * Build the last `n` days of a habit as code-strip cells, oldest first.
 *
 * Three states, and the distinction matters: a day the habit was not scheduled
 * (or did not exist yet) is *not* a miss. That is the same rule every
 * denominator in the app runs on — see domain/schedule.js.
 *
 * `weekly` habits ("3 times a week") need the extra clause. `isDueOn` returns
 * true for them every day, because you *may* do them on any day — but a
 * Tuesday you chose not to use is not a Tuesday you failed, and marking four
 * of seven blocks as missed every single week is a lie the strip would tell
 * more loudly than any number could.
 */
export function stripDays(habit, todayKey, n = 7) {
  const flexible = normalizeSchedule(habit?.schedule).type === SCHEDULE_TYPES.weekly

  return Array.from({ length: n }, (_, i) => {
    const key = addDays(todayKey, i - (n - 1))
    if (habit?.completions?.[key]) return { key, state: 'done' }
    if (flexible || !isDueOn(habit, key)) return { key, state: 'off' }
    return { key, state: 'missed' }
  })
}

/**
 * The code strip. A run of blocks reading left→right over recent days:
 *
 *   solid block   done
 *   hollow outline missed
 *   centre dot    not scheduled
 *
 * State is carried by *shape* first and hue second, so the strip survives
 * colour blindness, a greyscale screenshot, and the light theme. Colour says
 * which category; shape says what happened.
 *
 * The whole strip is one `img` with a spoken summary — seven separate blocks
 * announced individually is noise, not information.
 */
export function CodeStrip({ days, color, size = 11, gap = 3, label }) {
  const done = days.filter((d) => d.state === 'done').length
  const missed = days.filter((d) => d.state === 'missed').length
  const off = days.length - done - missed

  const summary =
    label ??
    `Last ${days.length} days: ${done} done, ${missed} missed` +
      (off ? `, ${off} not scheduled` : '')

  return (
    <span style={{ display: 'inline-flex', gap }} role="img" aria-label={summary}>
      {days.map((d) => (
        <span
          key={d.key}
          style={{
            width: size,
            height: size,
            flexShrink: 0,
            display: 'inline-block',
            position: 'relative',
            background: d.state === 'done' ? color : 'transparent',
            border: `1px solid ${
              d.state === 'done' ? color : d.state === 'missed' ? 'var(--border)' : 'var(--rule)'
            }`
          }}
        >
          {d.state === 'off' && (
            <span
              style={{
                position: 'absolute',
                inset: 0,
                margin: 'auto',
                width: 2,
                height: 2,
                background: 'var(--textMuted)'
              }}
            />
          )}
        </span>
      ))}
    </span>
  )
}

/**
 * The pulsar plot: stacked ridgelines, one per week, drawn back-to-front so
 * the near ridges genuinely occlude the far ones. That occlusion is the whole
 * mechanic — it is why each path is *filled with the ground colour* rather
 * than left transparent, and it is why no charting library can draw this.
 *
 * x is the day of the week, y is that day's completion rate. A good month is
 * tall and even; a bad week is a flat line you can spot without reading a
 * number.
 *
 * @param weeks  Array of weeks, oldest first. Each week is 7 numbers in 0..1.
 */
export function Pulsar({ weeks, height = 170, stroke = 'var(--text)' }) {
  const paths = useMemo(() => {
    if (!weeks.length) return []

    const W = 300
    const PAD = 8
    // Amplitude first, step second — the opposite of the obvious order, and it
    // matters. Sizing the step first leaves a peak shorter than the gap to the
    // ridge behind it, nothing ever overlaps, and the plot degenerates into a
    // smear of parallel lines. A full week has to be tall enough to climb over
    // several ridges; that overlap is the entire point of the form.
    const amp = height * 0.55
    const step = weeks.length > 1 ? (height - amp - PAD * 2) / (weeks.length - 1) : 0

    return weeks.map((week, i) => {
      const baseline = PAD + amp + step * i
      const samples = upsample(week, 49)
      // x is categorical: point j is the *centre* of weekday column j, so the
      // curve lines up with the M T W T F S S axis under it.
      const inner = samples.map((v, j, arr) => {
        const day = (j / (arr.length - 1)) * (week.length - 1)
        return [((day + 0.5) / week.length) * W, baseline - v * amp]
      })
      // Run flat out to both edges. Stopping at the first and last column
      // centres leaves a notch of bare ground at each end of every ridge,
      // which breaks the illusion that these are stacked slices of one field.
      const pts = [[0, inner[0][1]], ...inner, [W, inner[inner.length - 1][1]]]

      const line = pts
        .map(([x, y], j) => (j === 0 ? `M${x.toFixed(1)} ${y.toFixed(1)}` : smooth(pts, j)))
        .join(' ')

      return {
        // Closed back along the baseline so the fill has a floor to occlude with.
        fill: `${line} L${W} ${baseline.toFixed(1)} L0 ${baseline.toFixed(1)} Z`,
        line,
        // Older weeks recede. The front ridge is the current week, full strength.
        opacity: 0.35 + (0.65 * i) / Math.max(1, weeks.length - 1)
      }
    })
  }, [weeks, height])

  if (!paths.length) return null

  return (
    <svg
      viewBox={`0 0 300 ${height}`}
      preserveAspectRatio="none"
      style={{ width: '100%', height, display: 'block' }}
      role="img"
      aria-label={`Completion by weekday over the last ${weeks.length} weeks`}
    >
      {paths.map((p, i) => (
        <g key={i}>
          {/* Ground-coloured fill first: this is what hides the ridge behind. */}
          <path d={p.fill} fill="var(--bg)" />
          <path
            d={p.line}
            fill="none"
            stroke={stroke}
            strokeWidth="1"
            strokeOpacity={p.opacity}
            vectorEffect="non-scaling-stroke"
          />
        </g>
      ))}
    </svg>
  )
}

const C = {
  scrim: {
    position: 'fixed',
    inset: 0,
    zIndex: 50,
    background: 'var(--bg)',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 34,
    padding: `calc(var(--safe-top) + 24px) 24px calc(var(--safe-bottom) + 24px)`
  },
  body: { textAlign: 'center', maxWidth: 420 },
  kicker: {
    fontFamily: 'var(--font-mono)',
    fontSize: 'var(--fs-2xs)',
    fontWeight: 600,
    letterSpacing: '0.24em',
    textTransform: 'uppercase',
    color: 'var(--accent)'
  },
  figure: {
    fontSize: 'var(--fs-4xl)',
    fontWeight: 800,
    fontStretch: '78%',
    letterSpacing: '0.04em',
    textTransform: 'uppercase',
    lineHeight: 1,
    margin: '18px 0 0'
  },
  // A badge name is words, not a numeral; the display size that suits `07`
  // would wrap "Diamond Habit" across three lines.
  figureSmall: { fontSize: 'var(--fs-2xl)', letterSpacing: '0.06em' },
  note: {
    fontSize: 'var(--fs-md)',
    color: 'var(--textDim)',
    lineHeight: 1.6,
    marginTop: 16
  },
  strip: { display: 'flex', gap: 5, justifyContent: 'center', marginTop: 30 },
  block: { width: 14, height: 14, background: 'var(--accent)' },
  dismiss: {
    border: '1px solid var(--border)',
    background: 'transparent',
    color: 'var(--text)',
    padding: '12px 30px',
    fontSize: 'var(--fs-sm)',
    fontWeight: 700,
    textTransform: 'uppercase',
    letterSpacing: '0.1em'
  }
}

/** Cosine interpolation. Seven weekday points make an angular zigzag; the
 *  ridgeline needs to read as a signal, so it is resampled up. */
function upsample(values, n) {
  if (values.length < 2) return values
  return Array.from({ length: n }, (_, i) => {
    const t = (i / (n - 1)) * (values.length - 1)
    const a = Math.floor(t)
    const b = Math.min(values.length - 1, a + 1)
    const f = (1 - Math.cos((t - a) * Math.PI)) / 2
    return values[a] * (1 - f) + values[b] * f
  })
}

/** Cubic segment through the midpoints — smooth without overshooting. */
function smooth(pts, j) {
  const [px, py] = pts[j - 1]
  const [x, y] = pts[j]
  const cx = (px + x) / 2
  return `C${cx.toFixed(1)} ${py.toFixed(1)} ${cx.toFixed(1)} ${y.toFixed(1)} ${x.toFixed(1)} ${y.toFixed(1)}`
}

/**
 * Watch a value and report the moment it *increases*, once.
 *
 * The first observation only records a baseline, so loading a document that
 * already says "level 6" is not a level-up. That distinction is the whole
 * reason this is a hook and not a comparison inside a render: a reward that
 * fires when the app reopens stops meaning anything by the third time.
 */
function useIncrease(value) {
  const previous = useRef(null)
  const [reached, setReached] = useState(null)

  useEffect(() => {
    if (previous.current !== null && value > previous.current) setReached(value)
    previous.current = value
  }, [value])

  return [reached, () => setReached(null)]
}

/**
 * The reward moment: a catalogue card for the record you just pressed.
 *
 * Fires on a level gained and on a badge newly earned, and on nothing else.
 * Both are real, rare events — which is the only reason a full-screen
 * interruption is defensible in an app whose whole point is being fast.
 *
 * There are no haptics on iPhone, so this has to carry the entire sense of
 * "something happened" on that platform. Hence: full screen, not a toast.
 */
export function CatalogCard({ level, badgeCount, badges }) {
  const [newLevel, clearLevel] = useIncrease(level)
  const [newBadgeCount, clearBadges] = useIncrease(badgeCount)

  if (newLevel !== null) {
    return (
      <Card
        kicker="Level reached"
        figure={String(newLevel).padStart(2, '0')}
        // levelCost(n) is the price of the level *above* n, so the one just
        // paid for is levelCost(newLevel - 1). Deriving both from the domain
        // rather than restating the formula here is how the two stay in step.
        note={`That level cost ${levelCost(newLevel - 1)} XP. The next one costs ${levelCost(newLevel)}.`}
        onClose={clearLevel}
      />
    )
  }

  if (newBadgeCount !== null) {
    // The most recently unlocked one, by the order BADGES declares.
    const badge = [...badges].reverse().find((b) => b.earned)
    return (
      <Card
        kicker="Badge earned"
        figure={badge?.label ?? 'Badge'}
        small
        note={badge?.desc}
        onClose={clearBadges}
      />
    )
  }

  return null
}

function Card({ kicker, figure, note, small, onClose }) {
  return (
    <div style={C.scrim} role="dialog" aria-modal="true" aria-label={`${kicker}: ${figure}`}>
      <div className="catalog-in" style={C.body}>
        <div style={C.kicker}>{kicker}</div>
        <div style={{ ...C.figure, ...(small ? C.figureSmall : null) }}>{figure}</div>
        {note && <p style={C.note}>{note}</p>}
        <div style={C.strip} aria-hidden="true">
          {Array.from({ length: 6 }, (_, i) => (
            <span key={i} style={C.block} />
          ))}
        </div>
      </div>
      <button onClick={onClose} style={C.dismiss} autoFocus>
        Continue
      </button>
    </div>
  )
}

/**
 * The level scale — a graduated instrument, not a bubbly bar. Ticks mark
 * tenths so the fill can be read as a position rather than just a length.
 *
 * The fill is `scaleX`, never `width`: a transform stays on the compositor,
 * and this sits at the top of the busiest screen.
 */
export function TickScale({ value, label }) {
  const t = Math.max(0, Math.min(1, value))
  return (
    <div
      style={{ position: 'relative', height: 18, border: '1px solid var(--border)' }}
      role="img"
      aria-label={label}
    >
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: 'var(--accent)',
          transformOrigin: 'left',
          transform: `scaleX(${t})`,
          transition: 'transform 0.45s cubic-bezier(0.16, 1, 0.3, 1)'
        }}
      />
      {/* Ticks sit above the fill and use difference blending so they stay
          visible on both the filled and unfilled sides of the boundary. */}
      <div style={{ position: 'absolute', inset: 0, display: 'flex', mixBlendMode: 'difference' }}>
        {Array.from({ length: 10 }, (_, i) => (
          <span
            key={i}
            style={{
              flex: 1,
              borderRight: i < 9 ? '1px solid var(--textMuted)' : 'none',
              // Short ticks: full-height rules would read as a segmented bar.
              transform: 'scaleY(0.4)',
              transformOrigin: 'bottom'
            }}
          />
        ))}
      </div>
    </div>
  )
}
