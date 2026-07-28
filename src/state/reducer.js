import { normalizeSchedule } from '../domain/schedule'
import { MAX_HABITS } from '../domain/constants'

// The entire app is one plain document. Every change goes through this reducer,
// which is pure — no storage, no Date.now() side effects the caller can't see —
// so the state layer is testable without a browser.

export const DOC_VERSION = 1

export function emptyDoc() {
  return {
    version: DOC_VERSION,
    habits: [],
    medicines: [],
    routineBlocks: [],
    dailyLogs: {},
    settings: { theme: 'dark', onboarded: false }
  }
}

/**
 * Bring any stored document up to the current shape. Runs on every load, so a
 * document written by an older build never reaches the UI in a shape the UI
 * doesn't expect.
 */
export function migrate(raw) {
  const base = emptyDoc()
  if (!raw || typeof raw !== 'object') return base

  return {
    ...base,
    ...raw,
    version: DOC_VERSION,
    settings: { ...base.settings, ...(raw.settings ?? {}) },
    habits: (raw.habits ?? []).map(normalizeHabit)
  }
}

function normalizeHabit(habit) {
  return {
    xpBonus: 1,
    archived: false,
    completions: {},
    skips: {},
    reminders: [],
    ...habit,
    // Habits written before schedules existed have no `schedule` field at all.
    schedule: normalizeSchedule(habit.schedule)
  }
}

/** Ids only need to be unique within one device's document. */
export function newId() {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`
}

export function reducer(doc, action) {
  switch (action.type) {
    case 'doc/replace':
      return migrate(action.doc)

    case 'habit/add': {
      if (doc.habits.length >= MAX_HABITS) return doc
      return { ...doc, habits: [...doc.habits, normalizeHabit({ id: newId(), ...action.habit })] }
    }

    case 'habit/update':
      return {
        ...doc,
        habits: doc.habits.map((h) =>
          h.id === action.id ? normalizeHabit({ ...h, ...action.changes }) : h
        )
      }

    case 'habit/delete':
      return { ...doc, habits: doc.habits.filter((h) => h.id !== action.id) }

    case 'habit/toggle':
      return {
        ...doc,
        habits: doc.habits.map((h) => {
          if (h.id !== action.id) return h
          const done = Boolean(h.completions?.[action.dateKey])
          const completions = { ...h.completions }
          if (done) {
            // Delete rather than store `false` — an absent key and a false key
            // would otherwise both mean "not done" and drift apart.
            delete completions[action.dateKey]
          } else {
            completions[action.dateKey] = true
          }
          // Completing a day supersedes any skip on it.
          const skips = { ...h.skips }
          delete skips[action.dateKey]
          return { ...h, completions, skips }
        })
      }

    case 'habit/skip':
      return {
        ...doc,
        habits: doc.habits.map((h) => {
          if (h.id !== action.id) return h
          const skips = { ...h.skips }
          if (skips[action.dateKey]) delete skips[action.dateKey]
          else skips[action.dateKey] = true
          return { ...h, skips }
        })
      }

    case 'habits/addMany':
      return {
        ...doc,
        habits: [
          ...doc.habits,
          ...action.habits
            .slice(0, Math.max(0, MAX_HABITS - doc.habits.length))
            .map((h) => normalizeHabit({ id: newId(), ...h }))
        ]
      }

    case 'log/set':
      return {
        ...doc,
        dailyLogs: {
          ...doc.dailyLogs,
          [action.dateKey]: { ...doc.dailyLogs[action.dateKey], [action.field]: action.value }
        }
      }

    case 'settings/set':
      return { ...doc, settings: { ...doc.settings, ...action.changes } }

    case 'doc/reset':
      return emptyDoc()

    default:
      return doc
  }
}
