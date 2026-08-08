import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useStore } from '../state/StoreProvider'
import { useToday } from '../state/useToday'
import { dueToday, currentStreak, activeHabits } from '../domain/streaks'
import { describeSchedule, completionsThisWeek } from '../domain/schedule'
import { isVow, cleanStreak } from '../domain/quit'
import { categoryOf } from '../domain/constants'
import { xpSummary } from '../domain/xp'
import { fromDateKey } from '../domain/dates'
import { tap } from '../platform/haptics'
import {
  Screen,
  Overline,
  EmptyState,
  Button,
  Panel,
  Rule,
  Sheet,
  Field,
  Data,
  QuestNumber,
  inputStyle
} from '../components/ui'
import { CodeStrip, TickScale, YearStrip, stripDays, vowStripDays } from '../components/catalog'
import DailyLog from '../components/DailyLog'

export default function Today() {
  const { doc, dispatch } = useStore()
  const today = useToday()

  const habits = useMemo(() => dueToday(doc.habits, today), [doc.habits, today])
  const vows = useMemo(() => activeHabits(doc.habits).filter(isVow), [doc.habits])
  const done = habits.filter((h) => h.completions?.[today]).length
  const nextUp = habits.find((h) => !h.completions?.[today])
  const xp = xpSummary(doc.habits, today)

  // The id of the vow whose relapse is being recorded, or null. It used to be a
  // boolean behind a single button in the Vows header; the control lives on the
  // rows now, so opening the sheet already names a vow.
  const [relapsing, setRelapsing] = useState(null)

  const dateLabel = fromDateKey(today).toLocaleDateString(undefined, {
    weekday: 'long',
    day: 'numeric',
    month: 'long'
  })

  const toggle = (habit) => {
    tap(habit.completions?.[today] ? 'light' : 'medium')
    dispatch({ type: 'habit/toggle', id: habit.id, dateKey: today })
  }

  return (
    <Screen title={greeting()} subtitle={dateLabel}>
      <YearStrip dateKey={today} />

      <Panel flush>
        <div style={S.levelBlock}>
          <div style={S.levelHead}>
            <Data style={S.levelLabel}>Level</Data>
            <Data style={S.xpText}>Total {xp.total} XP</Data>
          </div>
          <div className="glow" style={S.levelNumber}>
            {String(xp.level).padStart(2, '0')}
          </div>
          <TickScale
            value={xp.current / xp.needed}
            label={`Level ${xp.level}, ${xp.current} of ${xp.needed} XP to level ${xp.level + 1}`}
          />
          {/* Same sentence as everywhere else. The scale above is within-level,
              so the caption under it has to be too — this used to count down
              the remainder while More counted up the progress, from the same
              two numbers. */}
          <Data style={S.levelSub}>
            {xp.current} / {xp.needed} XP to level {xp.level + 1}
          </Data>
        </div>

        {habits.length > 0 && (
          <>
            <Rule />
            {/* The day as a single code strip: one block per habit due today,
                filled as it is pressed. This is what the completion percentage
                used to be, and it is faster to read — five blocks answer "how
                much is left" without anyone doing arithmetic. */}
            <div style={S.dayBlock}>
              <CodeStrip
                size={13}
                gap={4}
                days={habits.map((h) => ({
                  key: h.id,
                  state: h.completions?.[today] ? 'done' : 'missed'
                }))}
                label={`${done} of ${habits.length} quests done today`}
              />
              <Data style={S.dayCount}>
                [ {done} / {habits.length} ]
              </Data>
            </div>

            {/* The System's caution line. It states what is left, not what will
                happen — the app forgives two missed days a month, so "this will
                break your streak" would be a threat it does not carry out. */}
            {done < habits.length && (
              <>
                <Rule />
                <Data style={S.caution}>
                  Caution · {habits.length - done} quest
                  {habits.length - done === 1 ? '' : 's'} unfinished
                </Data>
              </>
            )}
          </>
        )}
      </Panel>

      <Overline>Today&apos;s quests</Overline>

      {habits.length === 0 ? (
        <EmptyState
          title={doc.habits.length ? 'Nothing scheduled today' : 'No habits yet'}
          hint={
            doc.habits.length
              ? 'Enjoy the day off — your streaks are safe.'
              : 'Add your first habit and start a streak.'
          }
          action={
            !doc.habits.length && (
              <Link to="/habits" style={{ textDecoration: 'none' }}>
                <Button>Add a habit</Button>
              </Link>
            )
          }
        />
      ) : (
        <div style={S.list}>
          {habits.map((habit) => (
            <HabitRow
              key={habit.id}
              habit={habit}
              questNumber={doc.habits.findIndex((h) => h.id === habit.id) + 1}
              today={today}
              // The first thing still outstanding, and the only row that gets
              // the live edge. Computed here rather than in the row because a
              // row cannot see its siblings.
              isNext={habit.id === nextUp?.id}
              onToggle={() => toggle(habit)}
            />
          ))}
        </div>
      )}

      {vows.length > 0 && (
        <>
          <Overline>Vows</Overline>

          <div style={S.list}>
            {vows.map((vow) => (
              <VowRow key={vow.id} vow={vow} today={today} onRelapse={() => setRelapsing(vow.id)} />
            ))}
          </div>
        </>
      )}

      {/* Last on the screen on purpose: the day's obligations come first, and
          this is the thing you fill in once they are behind you. */}
      <DailyLog
        dailyLogs={doc.dailyLogs}
        dateKey={today}
        onSet={(field, value) => dispatch({ type: 'log/set', dateKey: today, field, value })}
      />

      {relapsing && (
        <RelapseSheet
          vows={vows}
          today={today}
          // The vow whose row was tapped starts picked, so the common case is
          // one tap to open and one to confirm. The sheet stays multi-select —
          // see its own note on why.
          initial={relapsing}
          onClose={() => setRelapsing(null)}
          onConfirm={(ids, dateKey) => {
            tap('heavy')
            dispatch({ type: 'habit/relapse', ids, dateKey })
            setRelapsing(null)
          }}
        />
      )}
    </Screen>
  )
}

/**
 * A vow on Today. No checkbox: there is nothing to tick, and a control that
 * looks like the completion box but resets a streak instead is the one mis-tap
 * this screen cannot afford.
 */
function VowRow({ vow, today, onRelapse }) {
  const cat = categoryOf(vow.category)
  const streak = cleanStreak(vow, today)

  return (
    <div style={S.row}>
      <div style={S.rowBody}>
        <span style={S.rowIcon}>{vow.icon ?? '🚫'}</span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={S.rowTop}>
            <span style={S.rowName}>{vow.name}</span>
          </div>
          <div style={S.rowMeta}>
            {cat.label} · {streak === 1 ? '1 day clean' : `${streak} days clean`}
          </div>
          <div style={{ marginTop: 9 }}>
            <CodeStrip
              days={vowStripDays(vow, today)}
              label={`${vow.name}: ${streak} days clean`}
            />
          </div>
        </div>
        <div style={S.vowSide}>
          <Data style={S.vowCount}>{streak}</Data>
          {/* Text, not an outlined DANGER pill in the section header. It used to
              be the loudest control in its section and the first thing the eye
              found above a list of streaks, which is the wrong thing to
              advertise. Still two taps, and still full-size to the thumb. */}
          <button onClick={onRelapse} style={S.relapseBtn}>
            Relapse
          </button>
        </div>
      </div>
    </div>
  )
}

/**
 * Record a relapse against one or more vows.
 *
 * Multi-select because one bad evening usually breaks more than one thing at
 * once, and making someone confirm the same evening three times over is a
 * punishment the app has no business handing out. The date is editable: nobody
 * reaches for a habit tracker in the middle of it.
 */
function RelapseSheet({ vows, today, initial, onClose, onConfirm }) {
  const [picked, setPicked] = useState(initial ? [initial] : [])
  const [dateKey, setDateKey] = useState(today)

  const toggle = (id) => setPicked((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]))

  return (
    <Sheet
      open
      title="Record a relapse"
      onClose={onClose}
      footer={
        <>
          <Button
            variant="danger"
            disabled={picked.length === 0}
            onClick={() => onConfirm(picked, dateKey)}
            style={{ flex: 1 }}
          >
            {picked.length === 0
              ? 'Reset streaks'
              : picked.length === 1
                ? 'Reset 1 streak'
                : `Reset ${picked.length} streaks`}
          </Button>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
        </>
      }
    >
      <Field label="When">
        <input
          type="date"
          style={inputStyle}
          max={today}
          value={dateKey}
          onChange={(e) => setDateKey(e.target.value || today)}
        />
      </Field>

      <Field label="Which">
        <div style={S.pickList}>
          {vows.map((vow) => {
            const on = picked.includes(vow.id)
            return (
              <button
                key={vow.id}
                onClick={() => toggle(vow.id)}
                aria-pressed={on}
                style={{ ...S.pickRow, ...(on ? S.pickRowOn : null) }}
              >
                {/* An empty ring, not empty space. Rendering nothing until a
                    row is picked left a blank gutter that read as decoration
                    rather than as three things you can select. */}
                <span
                  style={{
                    ...S.pickBox,
                    borderColor: on ? 'currentColor' : 'var(--border)',
                    color: on ? 'currentColor' : 'transparent'
                  }}
                >
                  ✓
                </span>
                <span style={{ flex: 1, minWidth: 0, textAlign: 'left' }}>{vow.name}</span>
                <Data style={S.pickDays}>{cleanStreak(vow, dateKey)} d</Data>
              </button>
            )
          })}
        </div>
      </Field>
    </Sheet>
  )
}

function HabitRow({ habit, questNumber, today, isNext, onToggle }) {
  const cat = categoryOf(habit.category)
  const isDone = Boolean(habit.completions?.[today])
  const { streak } = currentStreak(habit, today)
  const weekly = habit.schedule?.type === 'weekly'

  // The sweep fires on a real completion and nowhere else — not on mount, not
  // on un-completing, not when the list re-renders. An animation that plays
  // when you undo something is telling you a lie about what happened.
  //
  // It doubles as the timer for the two-phase done state below: while it runs
  // the row is inverted, and when it ends the row settles. A row that is
  // already done when it mounts never sets this, so it renders settled with no
  // flash of celebration for something you finished yesterday.
  const [sweeping, setSweeping] = useState(false)

  const meta = weekly
    ? `${completionsThisWeek(habit, today)}/${habit.schedule.timesPerWeek} this week`
    : describeSchedule(habit.schedule)

  const press = () => {
    if (!isDone) setSweeping(true)
    onToggle()
  }

  // Three states, not two. Inversion is the *moment* of completion and it
  // stays — it is the reward. But leaving the row inverted made every finished
  // habit the brightest object on the screen, so a day with three of five done
  // showed you the three you had already dealt with. Today's job is what is
  // left, so the row settles onto the ground once the sweep is over: still
  // legibly done, no longer shouting.
  const settled = isDone && !sweeping
  const rowState = !isDone ? null : sweeping ? S.rowFlash : S.rowDone

  return (
    <div
      // Only the next thing outstanding is lit. `.glow-edge` is inert in
      // daylight, so this costs nothing there.
      className={isNext ? 'glow-edge' : undefined}
      style={{ ...S.row, ...rowState }}
    >
      {sweeping && (
        <span
          className="sweep-off"
          aria-hidden="true"
          onAnimationEnd={() => setSweeping(false)}
          style={S.sweep}
        />
      )}

      <div style={S.rowBody}>
        <span style={S.rowIcon}>{habit.icon ?? '⭐'}</span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={S.rowTop}>
            <span style={S.rowName}>{habit.name}</span>
            <QuestNumber n={questNumber} style={isDone && !settled ? S.questDone : null} />
          </div>
          <div style={{ ...S.rowMeta, ...(settled ? S.rowMetaSettled : null) }}>
            {cat.label} · {meta}
            {streak > 0 && ` · run ${streak}`}
          </div>
          <div style={{ marginTop: 9 }}>
            <CodeStrip days={stripDays(habit, today)} />
          </div>
        </div>

        <button
          onClick={press}
          aria-label={isDone ? `Mark ${habit.name} not done` : `Mark ${habit.name} done`}
          aria-pressed={isDone}
          style={{
            ...S.check,
            // The box never changes; only the tick appears. Filling it as well
            // put a heavy solid square on an already-inverted row, and the
            // loudest thing on the screen ended up being the control rather
            // than the record it belongs to.
            borderColor: isDone ? 'currentColor' : 'var(--border)',
            color: isDone ? 'currentColor' : 'transparent'
          }}
        >
          ✓
        </button>
      </div>
    </div>
  )
}

function greeting() {
  const h = new Date().getHours()
  if (h < 12) return 'Good morning'
  if (h < 17) return 'Good afternoon'
  return 'Good evening'
}

const S = {
  levelBlock: { padding: '14px 16px 16px' },
  levelHead: { display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' },
  levelLabel: {
    fontSize: 'var(--fs-2xs)',
    fontWeight: 600,
    letterSpacing: '0.14em',
    textTransform: 'uppercase',
    color: 'var(--textMuted)'
  },
  xpText: { fontSize: 'var(--fs-xs)', color: 'var(--textDim)' },
  // The one hero numeral on this screen, engraved. Two digits always, because
  // a level that changes width as it grows makes the whole panel twitch.
  levelNumber: {
    fontFamily: 'var(--font-mono)',
    fontSize: 'var(--fs-3xl)',
    fontWeight: 800,
    fontStretch: '78%',
    letterSpacing: '0.02em',
    lineHeight: 1,
    margin: '6px 0 12px'
  },
  levelSub: {
    display: 'block',
    marginTop: 8,
    fontSize: 'var(--fs-3xs)',
    letterSpacing: '0.12em',
    textTransform: 'uppercase',
    color: 'var(--textMuted)'
  },
  dayBlock: {
    padding: '13px 16px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    flexWrap: 'wrap'
  },
  dayCount: {
    fontSize: 'var(--fs-2xs)',
    letterSpacing: '0.12em',
    textTransform: 'uppercase',
    color: 'var(--textDim)'
  },
  caution: {
    display: 'block',
    padding: '11px 16px',
    fontSize: 'var(--fs-2xs)',
    fontWeight: 600,
    letterSpacing: '0.14em',
    textTransform: 'uppercase',
    color: 'var(--danger)'
  },
  list: { display: 'flex', flexDirection: 'column', gap: 8 },
  // The vow row's trailing column: the day count, and the way out under it.
  vowSide: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    flexShrink: 0
  },
  // Text, and muted. It was a --danger-outlined pill in the section header,
  // which the global 48dp floor turned into a 48px-tall control next to a 10px
  // label — the biggest, reddest thing on a screen otherwise reporting how long
  // you have held on. It keeps the full 48dp target because it is still a real
  // control on a phone; it just stops advertising.
  relapseBtn: {
    color: 'var(--textMuted)',
    fontFamily: 'var(--font-mono)',
    fontSize: 'var(--fs-3xs)',
    fontWeight: 600,
    letterSpacing: '0.14em',
    textTransform: 'uppercase',
    padding: '0 6px'
  },
  vowCount: {
    fontSize: 'var(--fs-xl)',
    fontWeight: 700,
    color: 'var(--textDim)',
    flexShrink: 0,
    lineHeight: 1
  },
  pickList: { display: 'flex', flexDirection: 'column', gap: 6 },
  pickRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    width: '100%',
    padding: '0 14px',
    background: 'transparent',
    border: '1px solid var(--border)',
    borderRadius: 'var(--radius)',
    color: 'var(--text)',
    fontSize: 'var(--fs-base)',
    fontWeight: 600
  },
  pickRowOn: { borderColor: 'var(--danger)', color: 'var(--danger)' },
  pickBox: {
    width: 22,
    height: 22,
    flexShrink: 0,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    border: '1px solid',
    borderRadius: 'var(--radius-pill)',
    fontSize: 'var(--fs-sm)',
    fontWeight: 800,
    lineHeight: 1
  },
  pickDays: { fontSize: 'var(--fs-2xs)', color: 'var(--textMuted)', flexShrink: 0 },
  row: {
    position: 'relative',
    background: 'var(--panel)',
    border: '1px solid var(--border)',
    borderRadius: 'var(--radius)',
    overflow: 'hidden',
    // The settle, below. Only the two painted properties move, and both are
    // killed by the global reduced-motion rule.
    transition: 'background-color 220ms ease, border-color 220ms ease, color 220ms ease'
  },
  // The moment of completion: the record is pressed. Same inversion as a
  // primary button and the selected tab — see DESIGN.md. It lasts as long as
  // the sweep and no longer.
  rowFlash: { background: 'var(--text)', color: 'var(--onInk)', borderColor: 'var(--text)' },
  // Where the row lands. Done is a settled fact, not an ongoing announcement,
  // so it recedes to the page's own ground and keeps only a decorative
  // hairline. What is left over stays on --panel and holds the eye.
  //
  // --textDim, not --textMuted: muted is specified against --panel and drops to
  // 4.35:1 on --bg in daylight, under the AA floor. Dim measures 8.3:1 dark and
  // 6.9:1 light here. The meta line gives up colour as its way of being
  // subordinate and keeps size instead.
  rowDone: {
    background: 'var(--bg)',
    color: 'var(--textDim)',
    borderColor: 'var(--rule)'
  },
  // The sweep is the row's *previous* ground travelling off it, so it has to be
  // the panel fill now, not the page black — otherwise finishing a habit flashes
  // a dark band that was never there.
  sweep: {
    position: 'absolute',
    inset: 0,
    background: 'var(--panel)',
    pointerEvents: 'none',
    zIndex: 1
  },
  rowBody: {
    position: 'relative',
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    padding: '12px 12px 12px 14px'
  },
  rowIcon: { fontSize: 'var(--fs-xl)', flexShrink: 0, alignSelf: 'flex-start', marginTop: 1 },
  rowTop: { display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 },
  // Mono, but sentence case with normal tracking. The System sets everything as
  // terminal type and a habit name should read the same way — what a name must
  // never become is a tracked-out capital code, because it has to be legible
  // before it is stylish.
  rowName: {
    fontFamily: 'var(--font-mono)',
    fontSize: 'var(--fs-base)',
    fontWeight: 600,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap'
  },
  // Both of these dim `currentColor` so they work on the normal and the
  // inverted row without a second palette. The opacities are floors, not
  // taste: 0.7 and 0.62 are where each still clears 4.5:1 on PULSE ground,
  // which is the harsher of the two directions.
  questDone: { color: 'var(--onInk)', borderColor: 'var(--onInk)', opacity: 0.7 },
  rowMeta: {
    fontFamily: 'var(--font-mono)',
    fontSize: 'var(--fs-2xs)',
    letterSpacing: '0.1em',
    textTransform: 'uppercase',
    color: 'currentColor',
    opacity: 0.62,
    marginTop: 5
  },
  // 0.62 was measured against --panel and PULSE. The settled row sits on --bg
  // with currentColor already at --textDim, and dimming that again lands near
  // 3:1. Full strength here; the size difference still ranks it below the name.
  rowMetaSettled: { opacity: 1 },
  check: {
    // The single most-tapped control in the app — it gets the full 48dp box.
    width: 'var(--touch)',
    height: 'var(--touch)',
    flexShrink: 0,
    alignSelf: 'center',
    background: 'transparent',
    border: '1px solid',
    // A circle. It is the one control on the busiest screen and the only place
    // the rounding is doing work rather than following a rule — a ring reads as
    // "tick me" from further away than a box does.
    borderRadius: 'var(--radius-pill)',
    fontSize: 'var(--fs-lg)',
    fontWeight: 800,
    // `all` would sweep in width/height too; only the painted properties move.
    transition: 'border-color 0.15s, color 0.15s'
  }
}
