import { normalizeSchedule } from '../domain/schedule'
import { HABIT_KINDS } from '../domain/quit'
import { todayKey } from '../domain/dates'
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
    habits: (raw.habits ?? []).map(normalizeHabit),
    medicines: (raw.medicines ?? []).map(normalizeMedicine),
    routineBlocks: sortBlocks((raw.routineBlocks ?? []).map(normalizeBlock)),
    dailyLogs: raw.dailyLogs ?? {}
  }
}

function normalizeHabit(habit) {
  return {
    // Every habit written before vows existed is one you build. Defaulting here
    // is what lets the new field land without touching a single stored record.
    kind: HABIT_KINDS.build,
    relapses: {},
    xpBonus: 1,
    archived: false,
    completions: {},
    skips: {},
    reminders: [],
    createdKey: null,
    ...habit,
    // Habits written before schedules existed have no `schedule` field at all.
    schedule: normalizeSchedule(habit.schedule)
  }
}

function normalizeMedicine(med) {
  return {
    dose: '',
    icon: '💊',
    archived: false,
    startKey: null,
    endKey: null,
    ...med,
    // Deduped and ordered so two medicines with the same times compare equal,
    // and so the UI never renders the same dose twice.
    times: [...new Set(med.times ?? [])],
    schedule: normalizeSchedule(med.schedule)
  }
}

function normalizeBlock(block) {
  const start = block.start ?? '08:00'
  let end = block.end ?? '09:00'
  // A block that ends before it starts renders as negative height and sorts
  // wrongly. Clamp rather than reject — the user is mid-edit, not wrong.
  if (end < start) end = start
  return { category: 'personal', note: '', ...block, start, end }
}

const sortBlocks = (blocks) =>
  [...blocks].sort((a, b) => a.start.localeCompare(b.start) || a.end.localeCompare(b.end))

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
      return {
        ...doc,
        habits: [
          ...doc.habits,
          normalizeHabit({
            id: newId(),
            createdKey: action.todayKey ?? todayKey(),
            ...action.habit
          })
        ]
      }
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

    /**
     * Break one or more vows on a given day.
     *
     * Takes a list of ids because one slip usually breaks more than one thing at
     * once, and making someone confirm the same bad evening three times over is
     * a punishment the app has no business handing out.
     */
    case 'habit/relapse': {
      const ids = new Set(action.ids ?? [])
      const dateKey = action.dateKey ?? todayKey()
      return {
        ...doc,
        habits: doc.habits.map((h) =>
          ids.has(h.id) ? { ...h, relapses: { ...h.relapses, [dateKey]: true } } : h
        )
      }
    }

    /**
     * Take a relapse back. A mis-tap that permanently destroys a sixty-day run
     * with no way to undo it would make the button too frightening to press —
     * and a relapse nobody dares log is a streak that quietly stops being true.
     */
    case 'habit/unrelapse':
      return {
        ...doc,
        habits: doc.habits.map((h) => {
          if (h.id !== action.id) return h
          const relapses = { ...h.relapses }
          delete relapses[action.dateKey]
          return { ...h, relapses }
        })
      }

    case 'habits/addMany':
      return {
        ...doc,
        habits: [
          ...doc.habits,
          ...action.habits
            .slice(0, Math.max(0, MAX_HABITS - doc.habits.length))
            .map((h) =>
              normalizeHabit({ id: newId(), createdKey: action.todayKey ?? todayKey(), ...h })
            )
        ]
      }

    case 'med/add':
      return {
        ...doc,
        medicines: [
          ...doc.medicines,
          normalizeMedicine({
            id: newId(),
            ...action.medicine,
            // A medicine added today has not missed yesterday's dose. The course
            // starts today unless the user says otherwise, which keeps the days
            // before it existed out of the adherence denominator.
            startKey: action.medicine.startKey ?? action.todayKey ?? todayKey()
          })
        ]
      }

    case 'med/update':
      return {
        ...doc,
        medicines: doc.medicines.map((m) =>
          m.id === action.id ? normalizeMedicine({ ...m, ...action.changes }) : m
        )
      }

    case 'med/delete':
      return { ...doc, medicines: doc.medicines.filter((m) => m.id !== action.id) }

    case 'med/toggleDose': {
      const log = doc.dailyLogs[action.dateKey] ?? {}
      const meds = { ...(log.meds ?? {}) }
      // Same rule as habit completions: absent means not taken. Storing `false`
      // would create two spellings of the same fact.
      if (meds[action.doseId]) delete meds[action.doseId]
      else meds[action.doseId] = true
      return {
        ...doc,
        dailyLogs: { ...doc.dailyLogs, [action.dateKey]: { ...log, meds } }
      }
    }

    case 'block/add':
      return {
        ...doc,
        routineBlocks: sortBlocks([
          ...doc.routineBlocks,
          normalizeBlock({ id: newId(), ...action.block })
        ])
      }

    case 'block/update':
      return {
        ...doc,
        routineBlocks: sortBlocks(
          doc.routineBlocks.map((b) =>
            b.id === action.id ? normalizeBlock({ ...b, ...action.changes }) : b
          )
        )
      }

    case 'block/delete':
      return { ...doc, routineBlocks: doc.routineBlocks.filter((b) => b.id !== action.id) }

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
