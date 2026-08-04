// Aggregations for the Stats screen. Pure — no React, no platform imports — so
// the arithmetic can be tested directly.
//
// The desktop app's Analytics screen divided *every* category's completions by
// habit #0's history, so a category whose habits were all created last week
// showed a rate computed against months of someone else's days. Every number
// here accumulates per habit, over that habit's own scheduled days, and only
// then sums into a bucket. `categoryStats` has a regression test pinning this.

import { rangeKeys } from './dates'
import { isDueOn } from './schedule'
import { CATEGORIES, categoryOf } from './constants'
import { activeHabits, currentStreak, bestStreak } from './streaks'
import { totalXp } from './xp'
import { isVow, cleanDaysTotal, relapseCount, lastRelapse } from './quit'

// Re-exported so callers that think of this as a stats concern keep working.
export { activeHabits }

/** A day counts against a habit only if it was scheduled and not deliberately skipped. */
const counts = (habit, dateKey) => isDueOn(habit, dateKey) && !habit.skips?.[dateKey]

/**
 * Habits with completions to measure. Vows are excluded everywhere a rate is
 * computed: they have no due days by construction, so leaving them in would put
 * a permanent 0% row at the top of every worst-first list and drop any category
 * that holds one to zero. They get their own breakdown below.
 */
const measurable = (habits) => activeHabits(habits).filter((h) => !isVow(h))

/**
 * Completion rate per category over [fromKey, toKey].
 *
 * Each habit contributes only the days *it* was due, so a Mon/Wed/Fri habit and
 * a daily one can both sit at 100% in the same bucket.
 */
export function categoryStats(habits, fromKey, toKey) {
  const days = rangeKeys(fromKey, toKey)
  const buckets = new Map()

  for (const habit of measurable(habits)) {
    const key = CATEGORIES[habit.category] ? habit.category : 'personal'
    let bucket = buckets.get(key)
    if (!bucket) {
      const cat = categoryOf(key)
      bucket = { key, label: cat.label, color: cat.color, habits: 0, due: 0, done: 0 }
      buckets.set(key, bucket)
    }

    bucket.habits++
    for (const dateKey of days) {
      if (!counts(habit, dateKey)) continue
      bucket.due++
      if (habit.completions?.[dateKey]) bucket.done++
    }
  }

  return [...buckets.values()]
    .map((b) => ({ ...b, pct: b.due ? Math.round((b.done / b.due) * 100) : 0 }))
    .sort((a, b) => b.pct - a.pct || a.label.localeCompare(b.label))
}

/** Per-day totals across all habits, for the trend strip. */
export function dailyTrend(habits, fromKey, toKey) {
  const active = measurable(habits)
  return rangeKeys(fromKey, toKey).map((dateKey) => {
    let due = 0
    let done = 0
    for (const habit of active) {
      if (!counts(habit, dateKey)) continue
      due++
      if (habit.completions?.[dateKey]) done++
    }
    return { dateKey, due, done, pct: due ? Math.round((done / due) * 100) : 0 }
  })
}

/** Headline numbers for the top of the screen. */
export function overview(habits, todayKey, fromKey) {
  const active = activeHabits(habits)
  const streaks = active.map((h) => currentStreak(h, todayKey).streak)
  const trend = dailyTrend(habits, fromKey, todayKey)

  const due = trend.reduce((n, d) => n + d.due, 0)
  const done = trend.reduce((n, d) => n + d.done, 0)

  return {
    tracked: active.length,
    longestCurrent: streaks.length ? Math.max(...streaks) : 0,
    allTimeBest: active.reduce((best, h) => Math.max(best, bestStreak(h, todayKey)), 0),
    completions: active.reduce(
      (sum, h) => sum + Object.values(h.completions ?? {}).filter(Boolean).length,
      0
    ),
    xp: totalXp(active, todayKey),
    rate: due ? Math.round((done / due) * 100) : 0
  }
}

/** Per-habit rows, worst rate first — the ones worth attention are at the top. */
export function habitBreakdown(habits, fromKey, toKey, todayKey) {
  const days = rangeKeys(fromKey, toKey)

  return measurable(habits)
    .map((habit) => {
      let due = 0
      let done = 0
      for (const dateKey of days) {
        if (!counts(habit, dateKey)) continue
        due++
        if (habit.completions?.[dateKey]) done++
      }
      return {
        id: habit.id,
        name: habit.name,
        icon: habit.icon,
        color: categoryOf(habit.category).color,
        due,
        done,
        pct: due ? Math.round((done / due) * 100) : 0,
        streak: currentStreak(habit, todayKey).streak
      }
    })
    .sort((a, b) => a.pct - b.pct || a.name.localeCompare(b.name))
}

/**
 * Per-vow rows, longest clean run first. Vows have no rate to sort by, and the
 * question they answer is the opposite of habitBreakdown's — not "which am I
 * neglecting" but "how long have I held".
 */
export function vowBreakdown(habits, todayKey) {
  return activeHabits(habits)
    .filter(isVow)
    .map((habit) => ({
      id: habit.id,
      name: habit.name,
      icon: habit.icon,
      color: categoryOf(habit.category).color,
      streak: currentStreak(habit, todayKey).streak,
      best: bestStreak(habit, todayKey),
      cleanDays: cleanDaysTotal(habit, todayKey),
      relapses: relapseCount(habit),
      lastRelapse: lastRelapse(habit, todayKey)
    }))
    .sort((a, b) => b.streak - a.streak || a.name.localeCompare(b.name))
}
