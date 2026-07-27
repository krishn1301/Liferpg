import { useEffect, useState } from 'react'
import { load, save, clear, isNative, platform } from './platform/storage'

const VERSION = __APP_VERSION__

/**
 * Phase 0 smoke screen.
 *
 * This is deliberately not the real app. Its only job is to prove, on a real
 * device, that the signed APK installs, the WebView boots, the bundle loads,
 * native storage round-trips, and safe-area insets are respected. Phase 1
 * replaces this file with the router and bottom tab shell.
 */
export default function App() {
  const [status, setStatus] = useState('checking…')
  const [count, setCount] = useState(null)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const doc = await load()
        const next = (doc?.launches ?? 0) + 1
        await save({ launches: next, lastOpened: new Date().toISOString() })
        const verify = await load()
        if (cancelled) return
        if (verify?.launches !== next) throw new Error('read-back mismatch')
        setCount(next)
        setStatus('ok')
      } catch (err) {
        if (!cancelled) setStatus(`FAILED: ${err.message}`)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  const ok = status === 'ok'

  return (
    <div style={styles.root}>
      <div style={styles.badge}>⚔️</div>
      <h1 style={styles.title}>LifeRPG</h1>
      <p style={styles.sub}>Phase 0 — pipeline check</p>

      <dl style={styles.list}>
        <Row label="Version" value={VERSION} />
        <Row label="Platform" value={isNative ? `native / ${platform}` : 'web'} />
        <Row
          label="Storage"
          value={ok ? `ok — launch #${count}` : status}
          tone={ok ? 'good' : status.startsWith('FAILED') ? 'bad' : 'dim'}
        />
      </dl>

      <p style={styles.note}>
        {ok
          ? 'Close and reopen the app. If the launch count goes up, storage survives restarts.'
          : 'Storage has not confirmed yet.'}
      </p>

      <button
        style={styles.reset}
        onClick={async () => {
          await clear()
          setCount(0)
          setStatus('cleared — reopen to re-test')
        }}
      >
        Reset counter
      </button>
    </div>
  )
}

function Row({ label, value, tone = 'default' }) {
  const color = { good: 'var(--accent)', bad: 'var(--danger)', dim: 'var(--textDim)' }[tone]
  return (
    <div style={styles.row}>
      <dt style={styles.dt}>{label}</dt>
      <dd style={{ ...styles.dd, color: color || 'var(--text)' }}>{value}</dd>
    </div>
  )
}

const styles = {
  root: {
    minHeight: '100%',
    padding: `calc(var(--safe-top) + 48px) 24px calc(var(--safe-bottom) + 24px)`,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'flex-start'
  },
  badge: { fontSize: 44, marginBottom: 12 },
  title: { fontSize: 28, fontWeight: 800, letterSpacing: '-0.5px' },
  sub: {
    color: 'var(--textMuted)',
    fontSize: 11,
    textTransform: 'uppercase',
    letterSpacing: '0.1em',
    marginTop: 4,
    marginBottom: 28
  },
  list: {
    width: '100%',
    border: '1px solid var(--border)',
    background: 'var(--card)'
  },
  row: {
    display: 'flex',
    justifyContent: 'space-between',
    gap: 16,
    padding: '13px 14px',
    borderBottom: '1px solid var(--border)'
  },
  dt: {
    color: 'var(--textDim)',
    fontSize: 11,
    textTransform: 'uppercase',
    letterSpacing: '0.06em'
  },
  dd: { fontSize: 13, fontWeight: 600, textAlign: 'right', wordBreak: 'break-word' },
  note: { color: 'var(--textDim)', fontSize: 12, lineHeight: 1.6, margin: '20px 0' },
  reset: {
    marginTop: 'auto',
    padding: '12px 18px',
    border: '1px solid var(--border)',
    color: 'var(--textDim)',
    fontSize: 12,
    fontWeight: 600,
    textTransform: 'uppercase',
    letterSpacing: '0.06em'
  }
}
