import { CATEGORY_COLORS } from '../theme/tokens'

export const CATEGORIES = {
  fitness: { label: 'Fitness', color: CATEGORY_COLORS.fitness },
  education: { label: 'Education', color: CATEGORY_COLORS.education },
  health: { label: 'Health', color: CATEGORY_COLORS.health },
  productivity: { label: 'Productivity', color: CATEGORY_COLORS.productivity },
  personal: { label: 'Personal', color: CATEGORY_COLORS.personal },
  mindfulness: { label: 'Mindfulness', color: CATEGORY_COLORS.mindfulness },
  social: { label: 'Social', color: CATEGORY_COLORS.social },
  creative: { label: 'Creative', color: CATEGORY_COLORS.creative }
}

export const categoryOf = (key) => CATEGORIES[key] ?? CATEGORIES.personal

// prettier-ignore
// Two rows of ten, laid out the way the picker draws them. One emoji per line
// is twenty lines of noise that says less than this does.
export const ICONS = [
  '⭐', '💪', '📚', '💧', '📖', '🎯', '🧘', '🏃', '✍️', '🎨',
  '🎵', '🍎', '💤', '🧠', '🌿', '☕', '🔥', '💡', '📝', '🏋️'
]

export const MED_TIMES = [
  { key: '08:00', label: 'Morning', icon: '🌅' },
  { key: '14:00', label: 'Afternoon', icon: '☀️' },
  { key: '18:00', label: 'Evening', icon: '🌆' },
  { key: '22:00', label: 'Night', icon: '🌙' }
]

// Routine-block colours. These used to be six hex literals copied out of
// CATEGORY_COLORS, which meant moving a category colour silently left My Day on
// the old value — exactly what happened when fitness moved off red. They are
// references now, so the band can only be left deliberately.
export const ROUTINE_CATS = {
  morning: { label: 'Morning', color: CATEGORY_COLORS.social },
  work: { label: 'Work', color: CATEGORY_COLORS.education },
  exercise: { label: 'Exercise', color: CATEGORY_COLORS.fitness },
  meal: { label: 'Meal', color: CATEGORY_COLORS.health },
  personal: { label: 'Personal', color: CATEGORY_COLORS.personal },
  evening: { label: 'Evening', color: CATEGORY_COLORS.productivity }
}

export const MAX_HABITS = 99

/** The top of the mood and energy scales. Five points, so a tap picks one. */
export const LOG_SCALE = 5

/**
 * Glasses of water a day. A target, not a rule — nothing is scored against it
 * and no badge depends on it; it exists so the counter has something to fill.
 */
export const WATER_TARGET = 8

/**
 * And the ceiling. The counter draws one box per glass, so an unbounded `+`
 * let a leaning thumb wrap the row over several lines and reflow the panel.
 * Well above any honest day, low enough to stay one or two rows.
 */
export const WATER_MAX = 20

/**
 * Starter packs for onboarding. A tester who has to invent five habits before
 * seeing anything usually invents zero and closes the app.
 */
export const TEMPLATES = [
  {
    id: 'starter',
    label: 'Just getting started',
    desc: 'Three small wins, every day',
    habits: [
      { name: 'Drink water', icon: '💧', category: 'health', schedule: { type: 'daily' } },
      { name: 'Read 10 pages', icon: '📖', category: 'education', schedule: { type: 'daily' } },
      { name: 'Walk 20 minutes', icon: '🏃', category: 'fitness', schedule: { type: 'daily' } }
    ]
  },
  {
    id: 'fitness',
    label: 'Get fit',
    desc: 'Realistic training week',
    habits: [
      {
        name: 'Gym session',
        icon: '🏋️',
        category: 'fitness',
        schedule: { type: 'weekdays', days: [1, 3, 5] }
      },
      { name: 'Stretch', icon: '🧘', category: 'fitness', schedule: { type: 'daily' } },
      {
        name: 'Long run',
        icon: '🏃',
        category: 'fitness',
        schedule: { type: 'weekdays', days: [0] }
      }
    ]
  },
  {
    id: 'focus',
    label: 'Study & focus',
    desc: 'For exams and deep work',
    habits: [
      {
        name: 'Deep work block',
        icon: '🧠',
        category: 'productivity',
        schedule: { type: 'weekdays', days: [1, 2, 3, 4, 5] }
      },
      { name: 'Revise notes', icon: '📝', category: 'education', schedule: { type: 'daily' } },
      {
        name: 'No phone before bed',
        icon: '💤',
        category: 'mindfulness',
        schedule: { type: 'daily' }
      }
    ]
  },
  {
    id: 'calm',
    label: 'Wind down',
    desc: 'Sleep, calm, and less screen',
    habits: [
      { name: 'Meditate', icon: '🧘', category: 'mindfulness', schedule: { type: 'daily' } },
      {
        name: 'Journal',
        icon: '✍️',
        category: 'personal',
        schedule: { type: 'weekly', timesPerWeek: 3 }
      },
      { name: 'Lights out by 11', icon: '💤', category: 'health', schedule: { type: 'daily' } }
    ]
  }
]
