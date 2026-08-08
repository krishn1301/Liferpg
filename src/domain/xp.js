import { activeHabits, bestStreak, dueToday } from './streaks'
import { isVow, cleanDaysTotal } from './quit'

export const XP_PER_COMPLETION = 10

/** Level n costs n × 100 XP: 100 for level 2, 200 for level 3, and so on. */
export const levelCost = (level) => level * 100

/**
 * Total XP earned, derived from history rather than stored as a counter.
 *
 * A vow pays the same rate per clean day that a habit pays per completion —
 * getting through a day without smoking is not worth less than ticking a box.
 * It is paid on *every* clean day ever banked, not the current run, so breaking
 * a vow costs you the streak and nothing else. XP that has been earned is never
 * taken back; a relapse that also knocked you down three levels is the kind of
 * punishment that gets an app deleted rather than reopened.
 */
export function totalXp(habits, todayKey) {
  return habits.reduce((sum, habit) => {
    const days = isVow(habit)
      ? cleanDaysTotal(habit, todayKey)
      : Object.values(habit.completions ?? {}).filter(Boolean).length
    return sum + days * XP_PER_COMPLETION * (habit.xpBonus ?? 1)
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

/**
 * Everything any screen needs to talk about XP, from one place.
 *
 * There used to be four sentences for the same two numbers — Today said
 * "130 XP" and "90 XP to level 2", More said "Level 2 · 130 XP" and
 * "30 / 200 to level 3", Status said "130 XP banked". Two of those are lifetime
 * and two are within-level, both are arithmetically right, and nothing on
 * screen distinguished them, so the pair read as a bug.
 *
 * One frame now: **progress is always `current / needed` within the level, and
 * a lifetime figure is always labelled TOTAL.** Both come from here so they
 * cannot drift apart again.
 *
 * `todayKey` is not optional. Two callers used to omit it, which handed
 * `cleanDaysTotal` an undefined "today" and quietly gave vow owners a different
 * level on More than on Today.
 */
export function xpSummary(habits, todayKey) {
  const total = totalXp(habits, todayKey)
  const { level, current, needed } = levelFromXp(total)
  return { total, level, current, needed, remaining: needed - current }
}

export const BADGES = [
  { id: 'week-warrior', icon: '🔥', label: 'Week Warrior', desc: '7-day streak' },
  { id: 'diamond', icon: '💎', label: 'Diamond Habit', desc: '30-day streak' },
  { id: 'perfect-day', icon: '⚡', label: 'Perfect Day', desc: 'Everything done today' },
  { id: 'centurion', icon: '🏅', label: 'XP Centurion', desc: '100 XP earned' },
  { id: 'master', icon: '🎯', label: 'Habit Master', desc: '5 habits tracked' },
  { id: 'century', icon: '💯', label: 'Century', desc: '100 total completions' }
]

/**
 * Which badges are unlocked.
 *
 * Streak badges key off `bestStreak`, not the current one: a badge is a record
 * of something you did, and Stats prints "Best ever" directly above this grid.
 * Keying off the current streak made a lapsed 42-day run show "Best ever: 42"
 * next to a locked 30-day badge, which reads as a bug.
 *
 * Everything here runs over `activeHabits`, matching `overview` in stats.js.
 * Archiving a habit used to change the Stats tiles but not the badges.
 */
export function earnedBadges(habits, todayKey) {
  const active = activeHabits(habits)

  const xp = totalXp(active, todayKey)
  const best = active.reduce((max, h) => Math.max(max, bestStreak(h, todayKey)), 0)
  const completions = active.reduce(
    (sum, h) => sum + Object.values(h.completions ?? {}).filter(Boolean).length,
    0
  )

  // Only what is actually scheduled today can make a day perfect. Counting
  // every active habit meant a single Mon/Wed/Fri habit made Tuesday
  // unwinnable — the habit nobody was asked to do still sat in the denominator.
  const due = dueToday(active, todayKey)
  const doneToday = due.filter((h) => h.completions?.[todayKey]).length

  const unlocked = {
    'week-warrior': best >= 7,
    diamond: best >= 30,
    'perfect-day': due.length > 0 && doneToday === due.length,
    centurion: xp >= 100,
    master: active.length >= 5,
    century: completions >= 100
  }

  return BADGES.map((badge) => ({ ...badge, earned: Boolean(unlocked[badge.id]) }))
}

/**
 * Badge ids from easiest to hardest, which is *not* the order `BADGES` is
 * declared in — that one is display order and exists to make the grid read
 * well. Ranking has to be stated separately, or "the highest badge you hold"
 * silently becomes "whichever happens to be last in the array".
 *
 * The ordering is by what each actually costs: five habits is a setup step, a
 * perfect day is available on day one, 100 XP is ten completions, a 7-day
 * streak needs a week of not missing, 100 completions is about a month at
 * three a day, and a 30-day streak is the only one you cannot rush.
 */
export const TITLE_RANK = [
  'master',
  'perfect-day',
  'centurion',
  'week-warrior',
  'century',
  'diamond'
]

/**
 * The strongest badge currently held, as a title.
 *
 * `perfect-day` un-earns itself the next morning, so a title can be lost — that
 * is honest. It reflects where you are, not a trophy cabinet, and the cabinet
 * is already on screen twelve rows below this.
 */
export function highestTitle(habits, todayKey) {
  const earned = new Set(
    earnedBadges(habits, todayKey)
      .filter((b) => b.earned)
      .map((b) => b.id)
  )

  for (let i = TITLE_RANK.length - 1; i >= 0; i--) {
    if (earned.has(TITLE_RANK[i])) {
      return BADGES.find((b) => b.id === TITLE_RANK[i]).label
    }
  }
  return 'Unranked'
}
