import { CATEGORIES, categoryOf } from './constants'
import { activeHabits } from './streaks'
import { isVow, cleanDaysTotal } from './quit'
import { highestTitle } from './xp'

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
 * Everything the STATUS window needs, in one call.
 *
 * There used to be a `job` here, hardcoded to "Human". It was a joke about the
 * source material and it was also a constant rendered as content in the most
 * valuable space on the screen — the same six letters for every user forever.
 * It is gone.
 *
 * `title` used to be the strongest *category*, which meant the panel printed
 * "Fitness" as though a category name were an achievement, directly above a
 * stat grid that already showed Fitness was the highest number. It is now the
 * highest badge held, so it says something the rest of the panel does not.
 */
export function status(habits, todayKey) {
  return { block: statBlock(habits, todayKey), title: highestTitle(habits, todayKey) }
}
