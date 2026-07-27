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

export const ROUTINE_CATS = {
  morning: { label: 'Morning', color: '#fbbf24' },
  work: { label: 'Work', color: '#3b82f6' },
  exercise: { label: 'Exercise', color: '#f97316' },
  meal: { label: 'Meal', color: '#22c55e' },
  personal: { label: 'Personal', color: '#ec4899' },
  evening: { label: 'Evening', color: '#8b5cf6' }
}

export const MAX_HABITS = 99

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
      { name: 'Journal', icon: '✍️', category: 'personal', schedule: { type: 'weekly', timesPerWeek: 3 } },
      { name: 'Lights out by 11', icon: '💤', category: 'health', schedule: { type: 'daily' } }
    ]
  }
]
