import { currentStreak } from './streaks'

export const XP_PER_COMPLETION = 10

/** Level n costs n × 100 XP: 100 for level 2, 200 for level 3, and so on. */
export const levelCost = (level) => level * 100

/** Total XP earned, derived from history rather than stored as a counter. */
export function totalXp(habits) {
  return habits.reduce((sum, habit) => {
    const done = Object.values(habit.completions ?? {}).filter(Boolean).length
    return sum + done * XP_PER_COMPLETION * (habit.xpBonus ?? 1)
  }, 0)
}

/**
 * XP is derived, not incremented. The desktop app kept `xp` as its own state
 * and added to it on each tap, so unchecking a habit kept the XP and an Excel
 * import had to guess a total. Deriving it means the number can never drift
 * from the completions that justify it.
 */
export function levelFromXp(xp) {
  let level = 1
  let remaining = Math.max(0, xp)
  while (remaining >= levelCost(level)) {
    remaining -= levelCost(level)
    level++
  }
  return { level, current: remaining, needed: levelCost(level) }
}

export const BADGES = [
  { id: 'week-warrior', icon: '🔥', label: 'Week Warrior', desc: '7-day streak' },
  { id: 'diamond', icon: '💎', label: 'Diamond Habit', desc: '30-day streak' },
  { id: 'perfect-day', icon: '⚡', label: 'Perfect Day', desc: 'Everything done today' },
  { id: 'centurion', icon: '🏅', label: 'XP Centurion', desc: '100 XP earned' },
  { id: 'master', icon: '🎯', label: 'Habit Master', desc: '5 habits tracked' },
  { id: 'century', icon: '💯', label: 'Century', desc: '100 total completions' }
]

export function earnedBadges(habits, todayKey) {
  const xp = totalXp(habits)
  const streaks = habits.map((h) => currentStreak(h, todayKey).streak)
  const best = streaks.length ? Math.max(...streaks) : 0
  const completions = habits.reduce(
    (sum, h) => sum + Object.values(h.completions ?? {}).filter(Boolean).length,
    0
  )
  const dueCount = habits.filter((h) => !h.archived).length
  const doneToday = habits.filter((h) => h.completions?.[todayKey]).length

  const unlocked = {
    'week-warrior': best >= 7,
    diamond: best >= 30,
    'perfect-day': dueCount > 0 && doneToday === dueCount,
    centurion: xp >= 100,
    master: dueCount >= 5,
    century: completions >= 100
  }

  return BADGES.map((badge) => ({ ...badge, earned: Boolean(unlocked[badge.id]) }))
}
