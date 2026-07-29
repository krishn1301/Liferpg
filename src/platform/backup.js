import { Filesystem, Directory, Encoding } from '@capacitor/filesystem'
import { Share } from '@capacitor/share'
import { isNative } from './storage'
import { migrate } from '../state/reducer'
import { toDateKey } from '../domain/dates'

// On-device-only storage means an uninstall, a wipe or a lost phone is total
// data loss. This file is the entire safety net, so it errs toward being
// boring: plain JSON, no compression, no schema of its own beyond a header.

export const BACKUP_VERSION = 1

export function buildBackup(doc) {
  return JSON.stringify(
    {
      app: 'liferpg',
      backupVersion: BACKUP_VERSION,
      exportedAt: new Date().toISOString(),
      doc
    },
    null,
    2
  )
}

export const backupFilename = (now = new Date()) => `liferpg-backup-${toDateKey(now)}.json`

/**
 * Write the backup somewhere the user can actually get at it.
 *
 * On Android that means Documents plus a share sheet — a file sitting in the
 * app's sandbox would be deleted along with the app, which defeats the point.
 * On web it is a normal download.
 */
export async function exportBackup(doc) {
  const data = buildBackup(doc)
  const name = backupFilename()

  if (!isNative) {
    const url = URL.createObjectURL(new Blob([data], { type: 'application/json' }))
    const a = document.createElement('a')
    a.href = url
    a.download = name
    a.click()
    URL.revokeObjectURL(url)
    return { name, shared: false }
  }

  const { uri } = await Filesystem.writeFile({
    path: name,
    data,
    directory: Directory.Documents,
    encoding: Encoding.UTF8,
    recursive: true
  })

  // Sharing is best-effort: the file is already saved, so a device with no
  // share targets should not surface as a failed backup.
  try {
    await Share.share({ title: 'LifeRPG backup', url: uri, dialogTitle: 'Save your backup' })
    return { name, uri, shared: true }
  } catch {
    return { name, uri, shared: false }
  }
}

/**
 * Parse a backup file's text into a document.
 *
 * Throws with a message meant to be shown to the user. Everything that comes
 * back goes through `migrate`, so a file written by an older build — or a
 * hand-edited one — still lands in the shape the UI expects.
 */
export function parseBackup(text) {
  let parsed
  try {
    parsed = JSON.parse(text)
  } catch {
    throw new Error("That file isn't valid JSON.")
  }

  if (!parsed || typeof parsed !== 'object') {
    throw new Error("That file doesn't look like a LifeRPG backup.")
  }

  // Accept both the wrapped export and a bare document, so a user who pulls
  // `doc` out of a backup by hand is not punished for it.
  const doc = parsed.app === 'liferpg' && parsed.doc ? parsed.doc : parsed

  if (!Array.isArray(doc.habits)) {
    throw new Error("That file doesn't look like a LifeRPG backup — no habits in it.")
  }

  return migrate(doc)
}

/** Read a File chosen from an <input type="file">. */
export function readFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result))
    reader.onerror = () => reject(new Error("Couldn't read that file."))
    reader.readAsText(file)
  })
}

/** One-line summary used to confirm an import before it overwrites anything. */
export function describeBackup(doc) {
  const habits = doc.habits?.length ?? 0
  const meds = doc.medicines?.length ?? 0
  const completions = (doc.habits ?? []).reduce(
    (sum, h) => sum + Object.keys(h.completions ?? {}).length,
    0
  )
  const parts = [`${habits} habit${habits === 1 ? '' : 's'}`, `${completions} completions`]
  if (meds) parts.push(`${meds} medicine${meds === 1 ? '' : 's'}`)
  return parts.join(' · ')
}
