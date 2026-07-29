import { useRef, useState } from 'react'
import { useStore } from '../state/StoreProvider'
import { applyTheme, THEMES } from '../theme/tokens'
import { describeBackup, exportBackup, parseBackup, readFile } from '../platform/backup'
import { platform } from '../platform/storage'
import { Screen, SectionTitle, Button, Sheet, Card } from '../components/ui'

const VERSION = __APP_VERSION__

export default function Settings() {
  const { doc, dispatch } = useStore()
  const fileInput = useRef(null)

  const [status, setStatus] = useState(null) // { tone: 'ok' | 'bad', text }
  const [pending, setPending] = useState(null) // parsed doc awaiting confirmation
  const [confirmReset, setConfirmReset] = useState(false)

  const theme = doc.settings.theme ?? 'dark'

  const setTheme = (next) => {
    applyTheme(next)
    dispatch({ type: 'settings/set', changes: { theme: next } })
  }

  const onExport = async () => {
    setStatus(null)
    try {
      const { name, shared } = await exportBackup(doc)
      setStatus({
        tone: 'ok',
        text: shared ? `Shared ${name}.` : `Saved ${name}.`
      })
    } catch (err) {
      setStatus({ tone: 'bad', text: err.message || "Couldn't save the backup." })
    }
  }

  const onPickFile = async (event) => {
    const file = event.target.files?.[0]
    // Reset the input so choosing the same file twice still fires a change.
    event.target.value = ''
    if (!file) return

    setStatus(null)
    try {
      setPending(parseBackup(await readFile(file)))
    } catch (err) {
      setStatus({ tone: 'bad', text: err.message })
    }
  }

  return (
    <Screen title="Settings" subtitle={`LifeRPG ${VERSION} · ${platform}`}>
      <SectionTitle>Appearance</SectionTitle>
      <div style={S.segmented}>
        {THEMES.map((mode) => (
          <button
            key={mode}
            onClick={() => setTheme(mode)}
            aria-pressed={theme === mode}
            style={{
              ...S.segment,
              background: theme === mode ? 'var(--accent)' : 'transparent',
              color: theme === mode ? 'var(--onAccent)' : 'var(--textDim)'
            }}
          >
            {mode}
          </button>
        ))}
      </div>

      <SectionTitle>Your data</SectionTitle>
      <Card>
        <p style={S.body}>
          Everything lives on this phone and nowhere else. Uninstalling the app, or losing the
          device, loses it all — so export a backup somewhere safe now and then.
        </p>
        <div style={S.actions}>
          <Button onClick={onExport} style={{ flex: 1 }}>
            Export backup
          </Button>
          <Button variant="ghost" onClick={() => fileInput.current?.click()} style={{ flex: 1 }}>
            Restore
          </Button>
        </div>
        <input
          ref={fileInput}
          type="file"
          accept="application/json,.json"
          onChange={onPickFile}
          style={{ display: 'none' }}
        />
      </Card>

      {status && (
        <p style={{ ...S.status, color: status.tone === 'ok' ? 'var(--accent)' : 'var(--danger)' }}>
          {status.text}
        </p>
      )}

      <SectionTitle>Danger zone</SectionTitle>
      <Card>
        <p style={S.body}>
          Deletes every habit, medicine, routine block and day of history on this device. There is
          no undo.
        </p>
        <Button variant="danger" onClick={() => setConfirmReset(true)} style={{ width: '100%' }}>
          Erase everything
        </Button>
      </Card>

      {pending && (
        <Sheet
          open
          title="Restore backup"
          onClose={() => setPending(null)}
          footer={
            <>
              <Button
                onClick={() => {
                  dispatch({ type: 'doc/replace', doc: pending })
                  applyTheme(pending.settings?.theme ?? 'dark')
                  setPending(null)
                  setStatus({ tone: 'ok', text: 'Backup restored.' })
                }}
                style={{ flex: 1 }}
              >
                Replace my data
              </Button>
              <Button variant="ghost" onClick={() => setPending(null)}>
                Cancel
              </Button>
            </>
          }
        >
          <p style={S.body}>This backup contains:</p>
          <p style={S.summary}>{describeBackup(pending)}</p>
          <p style={S.body}>
            Restoring <strong>replaces</strong> everything currently on this device. Your present
            data is not merged and cannot be recovered afterwards.
          </p>
        </Sheet>
      )}

      {confirmReset && (
        <Sheet
          open
          title="Erase everything"
          onClose={() => setConfirmReset(false)}
          footer={
            <>
              <Button
                variant="danger"
                onClick={() => {
                  dispatch({ type: 'doc/reset' })
                  applyTheme('dark')
                  setConfirmReset(false)
                  setStatus({ tone: 'ok', text: 'All data erased.' })
                }}
                style={{ flex: 1 }}
              >
                Erase everything
              </Button>
              <Button variant="ghost" onClick={() => setConfirmReset(false)}>
                Cancel
              </Button>
            </>
          }
        >
          <p style={S.body}>
            This deletes {doc.habits.length} habit{doc.habits.length === 1 ? '' : 's'} and all of
            their history. Export a backup first if you are not certain.
          </p>
        </Sheet>
      )}
    </Screen>
  )
}

const S = {
  segmented: { display: 'flex', border: '1px solid var(--border)' },
  segment: {
    flex: 1,
    padding: '12px 4px',
    fontSize: 'var(--fs-xs)',
    fontWeight: 700,
    textTransform: 'uppercase',
    letterSpacing: '0.06em'
  },
  body: { fontSize: 'var(--fs-md)', color: 'var(--textDim)', lineHeight: 1.6, marginBottom: 14 },
  summary: {
    fontSize: 'var(--fs-base)',
    fontWeight: 600,
    color: 'var(--text)',
    marginBottom: 14
  },
  actions: { display: 'flex', gap: 8 },
  status: { fontSize: 'var(--fs-md)', marginTop: 12, lineHeight: 1.5 }
}
