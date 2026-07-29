import { useRef, useState } from 'react'
import { useStore } from '../state/StoreProvider'
import { useToday } from '../state/useToday'
import { applyTheme, THEMES } from '../theme/tokens'
import { describeBackup, exportBackup, parseBackup, readFile } from '../platform/backup'
import { convertDesktopSave, describeImport, isDesktopSave } from '../platform/importDesktop'
import { exportExcel } from '../platform/excel'
import { platform } from '../platform/storage'
import { Screen, SectionTitle, Button, Sheet, Card } from '../components/ui'

const VERSION = __APP_VERSION__

export default function Settings() {
  const { doc, dispatch } = useStore()
  const today = useToday()
  const fileInput = useRef(null)

  const [status, setStatus] = useState(null) // { tone: 'ok' | 'bad', text }
  const [pending, setPending] = useState(null) // { doc, kind, summary } awaiting confirmation
  const [confirmReset, setConfirmReset] = useState(false)
  const [busy, setBusy] = useState(false)

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

  const onExportExcel = async () => {
    setStatus(null)
    setBusy(true)
    try {
      const { name, shared } = await exportExcel(doc, today)
      setStatus({ tone: 'ok', text: shared ? `Shared ${name}.` : `Saved ${name}.` })
    } catch (err) {
      setStatus({ tone: 'bad', text: err.message || "Couldn't build the spreadsheet." })
    } finally {
      setBusy(false)
    }
  }

  /**
   * One picker for both file kinds. A desktop save and a LifeRPG backup are
   * both "a JSON file with my habits in it" as far as the user is concerned,
   * so making them choose the right button first is a trap.
   */
  const onPickFile = async (event) => {
    const file = event.target.files?.[0]
    // Reset the input so choosing the same file twice still fires a change.
    event.target.value = ''
    if (!file) return

    setStatus(null)
    try {
      const text = await readFile(file)
      const parsed = JSON.parse(text)

      if (isDesktopSave(parsed)) {
        const next = convertDesktopSave(parsed)
        setPending({ doc: next, kind: 'desktop', summary: describeImport(parsed, next) })
      } else {
        const next = parseBackup(text)
        setPending({ doc: next, kind: 'backup', summary: describeBackup(next) })
      }
    } catch (err) {
      setStatus({
        tone: 'bad',
        text: err instanceof SyntaxError ? "That file isn't valid JSON." : err.message
      })
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

      <SectionTitle>Spreadsheet</SectionTitle>
      <Card>
        <p style={S.body}>
          A colour-coded grid of every habit against every day, plus per-habit stats — the
          same three sheets the desktop app produced.
        </p>
        <Button variant="ghost" onClick={onExportExcel} disabled={busy} style={{ width: '100%' }}>
          {busy ? 'Building…' : 'Export Excel'}
        </Button>
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
          title={pending.kind === 'desktop' ? 'Import from desktop' : 'Restore backup'}
          onClose={() => setPending(null)}
          footer={
            <>
              <Button
                onClick={() => {
                  dispatch({ type: 'doc/replace', doc: pending.doc })
                  applyTheme(pending.doc.settings?.theme ?? 'dark')
                  setStatus({
                    tone: 'ok',
                    text: pending.kind === 'desktop' ? 'Desktop data imported.' : 'Backup restored.'
                  })
                  setPending(null)
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
          {pending.kind === 'desktop' ? (
            <DesktopSummary summary={pending.summary} />
          ) : (
            <>
              <p style={S.body}>This backup contains:</p>
              <p style={S.summary}>{pending.summary}</p>
            </>
          )}
          <p style={S.body}>
            This <strong>replaces</strong> everything currently on this device. Your present data
            is not merged and cannot be recovered afterwards.
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

/**
 * The XP correction is explained here rather than left to be discovered. The
 * desktop app's counter only ever went up, so its number is almost always
 * higher than the completions justify, and an unexplained drop reads as the
 * import having lost something.
 */
function DesktopSummary({ summary }) {
  return (
    <>
      <p style={S.body}>Found in this file:</p>
      <p style={S.summary}>
        {summary.habits} habit{summary.habits === 1 ? '' : 's'} · {summary.completions} completions
      </p>
      {summary.xpDrifted ? (
        <p style={S.body}>
          The file records <strong>{summary.storedXp} XP</strong>, but {summary.completions}{' '}
          completions earn <strong>{summary.derivedXp} XP</strong>. The desktop app added XP on
          every tick and never took it back when you unticked, so its total drifted. LifeRPG works
          the number out from your history instead, so it can&apos;t drift again.
        </p>
      ) : (
        <p style={S.body}>
          That works out to <strong>{summary.derivedXp} XP</strong>.
        </p>
      )}
    </>
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
