import { emptyDoc, migrate, newId } from '../state/reducer'
import { XP_PER_COMPLETION } from '../domain/xp'

// One-time import of the Electron desktop app's save file, normally found at
// %APPDATA%/life-rpg/liferpg-data.json. The phone cannot read a PC's APPDATA,
// so this runs off a file the user picks.
//
// The two shapes differ in more than field names: the desktop app stored
// `false` completions, a `streak` counter and an `xp` counter, all of which are
// derived here and so are dropped rather than trusted.

/** Does this look like a desktop save rather than a LifeRPG backup? */
export function isDesktopSave(parsed) {
  if (!parsed || typeof parsed !== 'object' || !Array.isArray(parsed.habits)) return false
  // A backup is wrapped; a desktop save is not, and carries `target` on habits
  // or a top-level `xp` counter that the new format never writes.
  if (parsed.app === 'liferpg') return false
  return parsed.habits.some((h) => 'target' in h) || 'xp' in parsed || 'lastUpdated' in parsed
}

const TARGET_TO_SCHEDULE = {
  daily: { type: 'daily' },
  weekly: { type: 'weekly', timesPerWeek: 3 }
}

/**
 * Keep only the days actually completed.
 *
 * The desktop app wrote `false` when you unticked something, so an absent key
 * and a `false` key both meant "not done" and drifted apart. The reducer
 * deletes keys instead, and every count in the app assumes that.
 */
function liveCompletions(completions) {
  const out = {}
  for (const [key, done] of Object.entries(completions ?? {})) {
    if (done === true) out[key] = true
  }
  return out
}

function convertHabit(raw) {
  const completions = liveCompletions(raw.completions)

  return {
    // Desktop ids were Date.now() numbers. Regenerating keeps ids uniformly
    // strings, so nothing downstream has to cope with both.
    id: newId(),
    name: String(raw.name ?? '').trim() || 'Untitled',
    icon: raw.icon || '⭐',
    category: raw.category || 'personal',
    xpBonus: raw.xpBonus ?? 1,
    schedule: TARGET_TO_SCHEDULE[raw.target] ?? { type: 'daily' },
    completions,
    skips: {},
    archived: false,
    reminders: [],
    // These habits genuinely existed back then, so they stay unbounded rather
    // than being stamped with today and losing their history from every rate.
    createdKey: null
  }
}

/**
 * Convert a parsed desktop save into a LifeRPG document.
 *
 * Throws with a message meant for the user. Runs the result through `migrate`
 * so it lands in exactly the shape the reducer would have produced.
 */
export function convertDesktopSave(parsed) {
  if (!parsed || typeof parsed !== 'object' || !Array.isArray(parsed.habits)) {
    throw new Error("That file doesn't look like a LifeRPG desktop save.")
  }

  return migrate({
    ...emptyDoc(),
    habits: parsed.habits.map(convertHabit)
  })
}

/**
 * What the user is about to accept, including the XP correction.
 *
 * The desktop app incremented `xp` on every tap and never decremented it on
 * untick, so the stored number drifts above what the history supports. Showing
 * both values before the import is the difference between an explained change
 * and a number that looks silently wrong afterwards.
 */
export function describeImport(parsed, doc) {
  const habits = doc.habits.length
  const completions = doc.habits.reduce(
    (sum, h) => sum + Object.keys(h.completions).length,
    0
  )
  const derivedXp = doc.habits.reduce(
    (sum, h) => sum + Object.keys(h.completions).length * XP_PER_COMPLETION * (h.xpBonus ?? 1),
    0
  )
  const storedXp = Number(parsed?.xp)

  return {
    habits,
    completions,
    derivedXp,
    storedXp: Number.isFinite(storedXp) ? storedXp : null,
    // Only worth explaining when the two actually disagree.
    xpDrifted: Number.isFinite(storedXp) && storedXp !== derivedXp
  }
}
