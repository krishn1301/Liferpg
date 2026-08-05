import { CATEGORIES, categoryOf } from './constants'
import { activeHabits } from './streaks'
import { isVow, cleanDaysTotal } from './quit'

// The character sheet: one stat per category, derived from what you actually
// did. Nothing here is stored and nothing is incremented — a stat is recomputed
// from history every time it is shown, the same rule XP, levels and streaks
// follow. A counter that can be nudged is a counter that will eventually lie.
//
// Eight stats rather than the source material's four. Folding eight categories
// into STR/AGI/VIT/INT would mean inventing the pairings — is Creative AGI or
// INT? — and an invented number sitting next to eight derived ones is the kind
// of thing nobody remembers is fake six months later.

/** Where every stat starts, before a single completion. */
export const STAT_FLOOR = 10

/** Completions per point. Slow on purpose: a stat that jumps is not a stat. */
export const COMPLETIONS_PER_POINT = 5

/**
 * What one habit contributes.
 *
 * A vow has no completions — it is kept by *not* acting — so it contributes the
 * days it has stayed clean. Same rule `totalXp` uses, and for the same reason:
 * getting through a day without smoking is not worth less than ticking a box.
 */
function contribution(habit, todayKey) {
  return isVow(habit)
    ? cleanDaysTotal(habit, todayKey)
    : Object.values(habit.completions ?? {}).filter(Boolean).length
}

/**
 * One row per category, always all eight, in the order `CATEGORIES` declares.
 *
 * Categories with no habits still appear, sitting at the floor. An absent stat
 * would make the sheet reshuffle as habits come and go, and a character sheet
 * whose rows move is unreadable.
 */
export function statBlock(habits, todayKey) {
  const earned = {}
  for (const habit of activeHabits(habits)) {
    const key = CATEGORIES[habit.category] ? habit.category : 'personal'
    earned[key] = (earned[key] ?? 0) + contribution(habit, todayKey)
  }

  return Object.keys(CATEGORIES).map((key) => {
    const total = earned[key] ?? 0
    return {
      key,
      label: categoryOf(key).label,
      color: categoryOf(key).color,
      total,
      value: STAT_FLOOR + Math.floor(total / COMPLETIONS_PER_POINT),
      // How far into the next point, for the little progress mark.
      progress: (total % COMPLETIONS_PER_POINT) / COMPLETIONS_PER_POINT
    }
  })
}

/**
 * The title, taken from the strongest category.
 *
 * Ties break alphabetically rather than by declaration order, so a brand new
 * document does not silently award "Fitness" for being first in the list.
 * Nothing earned yet gets an honest placeholder instead of a flattering one.
 */
export function title(block) {
  const best = [...block].sort((a, b) => b.total - a.total || a.label.localeCompare(b.label))[0]
  if (!best || best.total === 0) return 'Unranked'
  return best.label
}

/** Job is always Human. It is the joke in the source material and it is true. */
export const JOB = 'Human'

/** Everything the STATUS window needs, in one call. */
export function status(habits, todayKey) {
  const block = statBlock(habits, todayKey)
  return { block, title: title(block), job: JOB }
}
