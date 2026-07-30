import { useEffect, useMemo, useState } from 'react'
import { useStore } from '../state/StoreProvider'
import { formatTime, minutesOfDay } from '../domain/dates'
import { ROUTINE_CATS } from '../domain/constants'
import { Screen, Button, Sheet, Field, EmptyState, Data, inputStyle } from '../components/ui'

const BLANK = { label: '', start: '08:00', end: '09:00', category: 'morning', note: '' }

export default function MyDay() {
  const { doc, dispatch } = useStore()
  const [editing, setEditing] = useState(null)

  const blocks = doc.routineBlocks
  const minutes = useNowMinutes()

  const totalMinutes = useMemo(
    () => blocks.reduce((sum, b) => sum + Math.max(0, minutesOfDay(b.end) - minutesOfDay(b.start)), 0),
    [blocks]
  )

  const save = (draft) => {
    if (!draft.label.trim()) return
    if (draft.id) dispatch({ type: 'block/update', id: draft.id, changes: draft })
    else dispatch({ type: 'block/add', block: draft })
    setEditing(null)
  }

  const dateLabel = new Date().toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long' })

  return (
    <Screen
      title="My Day"
      subtitle={blocks.length ? `${dateLabel} · ${formatDuration(totalMinutes)} planned` : dateLabel}
      action={<Button onClick={() => setEditing({ ...BLANK })}>+ Add</Button>}
    >
      {blocks.length === 0 ? (
        <EmptyState
          title="No routine yet"
          hint="Block out the shape of your day — work, meals, training, wind-down."
          action={<Button onClick={() => setEditing({ ...BLANK })}>Add a block</Button>}
        />
      ) : (
        <div style={S.timeline}>
          {blocks.map((block, i) => {
            const prev = blocks[i - 1]
            const gap = prev ? minutesOfDay(block.start) - minutesOfDay(prev.end) : 0
            return (
              <div key={block.id}>
                {gap > 0 && <Gap minutes={gap} />}
                <BlockRow
                  block={block}
                  now={minutes}
                  onClick={() => setEditing({ ...block })}
                />
              </div>
            )
          })}
        </div>
      )}

      {editing && (
        <BlockSheet
          key={editing.id ?? 'new'}
          draft={editing}
          onClose={() => setEditing(null)}
          onSave={save}
          onDelete={
            editing.id
              ? () => {
                  dispatch({ type: 'block/delete', id: editing.id })
                  setEditing(null)
                }
              : null
          }
        />
      )}
    </Screen>
  )
}

/**
 * Minutes since midnight, refreshed every minute. The "now" marker is the only
 * reason this screen needs a clock — a stale one would quietly point at the
 * wrong block all day.
 */
function useNowMinutes() {
  const [minutes, setMinutes] = useState(nowMinutes)

  useEffect(() => {
    const id = setInterval(() => setMinutes(nowMinutes()), 60_000)
    return () => clearInterval(id)
  }, [])

  return minutes
}

function nowMinutes() {
  const d = new Date()
  return d.getHours() * 60 + d.getMinutes()
}

function BlockRow({ block, now, onClick }) {
  const cat = ROUTINE_CATS[block.category] ?? ROUTINE_CATS.personal
  const start = minutesOfDay(block.start)
  const end = minutesOfDay(block.end)
  const isNow = now >= start && now < end
  const isPast = now >= end

  return (
    <button
      onClick={onClick}
      style={{
        ...S.block,
        opacity: isPast ? 0.5 : 1,
        borderColor: isNow ? 'var(--accent)' : 'var(--border)'
      }}
    >
      <div style={S.blockTime}>
        <Data style={S.blockStart}>{formatTime(block.start)}</Data>
        <Data style={S.blockEnd}>{formatTime(block.end)}</Data>
      </div>
      <div style={{ flex: 1, minWidth: 0, textAlign: 'left' }}>
        <div style={S.blockLabel}>{block.label}</div>
        <div style={S.blockMeta}>
          {/* The colour is a block beside its own label, never the label's
              own colour — a category has to survive being read in greyscale. */}
          <span style={{ ...S.catBlock, background: cat.color }} aria-hidden="true" />
          {cat.label} · {formatDuration(end - start)}
        </div>
        {block.note && <div style={S.blockNote}>{block.note}</div>}
      </div>
      {isNow && <Data style={S.nowTag}>Now</Data>}
    </button>
  )
}

function Gap({ minutes }) {
  return (
    <div style={S.gap}>
      <span style={S.gapRule} />
      <Data style={S.gapLabel}>{formatDuration(minutes)} free</Data>
      <span style={S.gapRule} />
    </div>
  )
}

function BlockSheet({ draft, onClose, onSave, onDelete }) {
  const [local, setLocal] = useState(draft)
  const set = (changes) => setLocal((p) => ({ ...p, ...changes }))
  const invalidRange = local.end < local.start

  return (
    <Sheet
      open
      title={local.id ? 'Edit block' : 'New block'}
      onClose={onClose}
      footer={
        <>
          <Button
            onClick={() => onSave(local)}
            disabled={!local.label.trim() || invalidRange}
            style={{ flex: 1 }}
          >
            {local.id ? 'Save' : 'Add block'}
          </Button>
          {onDelete && (
            <Button variant="danger" onClick={onDelete}>
              Delete
            </Button>
          )}
        </>
      }
    >
      <Field label="What is it">
        <input
          style={inputStyle}
          value={local.label}
          autoFocus
          placeholder="e.g. Deep work"
          onChange={(e) => set({ label: e.target.value })}
        />
      </Field>

      <Field label="Time">
        <div style={S.timeRow}>
          <input
            type="time"
            style={inputStyle}
            value={local.start}
            onChange={(e) => set({ start: e.target.value })}
          />
          <input
            type="time"
            style={inputStyle}
            value={local.end}
            onChange={(e) => set({ end: e.target.value })}
          />
        </div>
        {invalidRange && <p style={S.warn}>The end time is before the start time.</p>}
      </Field>

      <Field label="Category">
        <div style={S.catGrid}>
          {Object.entries(ROUTINE_CATS).map(([key, cat]) => {
            const on = local.category === key
            return (
              <button
                key={key}
                onClick={() => set({ category: key })}
                aria-pressed={on}
                style={{
                  ...S.catBtn,
                  ...(on
                    ? { background: 'var(--text)', color: 'var(--onInk)', borderColor: 'var(--text)' }
                    : null)
                }}
              >
                <span style={{ ...S.catBlock, background: cat.color }} aria-hidden="true" />
                {cat.label}
              </button>
            )
          })}
        </div>
      </Field>

      <Field label="Note (optional)">
        <input
          style={inputStyle}
          value={local.note}
          placeholder="Anything to remember"
          onChange={(e) => set({ note: e.target.value })}
        />
      </Field>
    </Sheet>
  )
}

function formatDuration(minutes) {
  if (minutes <= 0) return '0m'
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  if (!h) return `${m}m`
  if (!m) return `${h}h`
  return `${h}h ${m}m`
}

const S = {
  timeline: { display: 'flex', flexDirection: 'column', gap: 8 },
  block: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: 12,
    background: 'transparent',
    border: '1px solid var(--border)',
    padding: '12px 14px',
    width: '100%'
  },
  // A departure column: times in mono so the digits line up down the page.
  blockTime: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'flex-start',
    gap: 3,
    flexShrink: 0,
    width: 72
  },
  blockStart: { fontSize: 'var(--fs-sm)', fontWeight: 700, color: 'var(--text)' },
  blockEnd: { fontSize: 'var(--fs-3xs)', color: 'var(--textMuted)' },
  blockLabel: { fontSize: 'var(--fs-base)', fontWeight: 600, color: 'var(--text)' },
  blockMeta: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    fontFamily: 'var(--font-mono)',
    fontSize: 'var(--fs-2xs)',
    letterSpacing: '0.1em',
    textTransform: 'uppercase',
    color: 'var(--textDim)',
    marginTop: 5
  },
  catBlock: { width: 8, height: 8, flexShrink: 0, display: 'inline-block' },
  blockNote: { fontSize: 'var(--fs-xs)', color: 'var(--textMuted)', marginTop: 6, lineHeight: 1.5 },
  nowTag: {
    fontSize: 'var(--fs-3xs)',
    fontWeight: 700,
    textTransform: 'uppercase',
    letterSpacing: '0.12em',
    background: 'var(--accent)',
    color: 'var(--onAccent)',
    padding: '3px 6px',
    flexShrink: 0
  },
  gap: { display: 'flex', alignItems: 'center', gap: 10, padding: '7px 0' },
  gapRule: { flex: 1, height: 1, background: 'var(--rule)' },
  gapLabel: {
    fontSize: 'var(--fs-3xs)',
    color: 'var(--textMuted)',
    letterSpacing: '0.12em',
    textTransform: 'uppercase'
  },
  timeRow: { display: 'flex', gap: 8 },
  catGrid: { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 6 },
  catBtn: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    minWidth: 0,
    padding: '10px 4px',
    border: '1px solid var(--border)',
    background: 'transparent',
    color: 'var(--textDim)',
    fontSize: 'var(--fs-xs)',
    fontWeight: 700
  },
  warn: { fontSize: 'var(--fs-sm)', color: 'var(--warn)', marginTop: 8 }
}
