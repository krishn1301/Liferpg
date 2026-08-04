import { LocalNotifications } from '@capacitor/local-notifications'
import { canRemind } from './device'
import { plannedReminders } from '../domain/reminders'

// The only file that talks to the notification scheduler. Everything about
// *what* to schedule is pure and lives in domain/reminders.js.
//
// Every function here is safe to call on any platform: in a browser `canRemind`
// is false and they no-op, so callers never have to guard.

/** Notification channel id — Android 8+ groups and lets the user mute by channel. */
const CHANNEL = 'habits'

/**
 * Ask for permission.
 *
 * Called when someone saves their first reminder time, never at launch. A
 * notification prompt fired before the user has asked for notifications is how
 * an app collects a permanent Deny it can never recover from.
 *
 * On Android 13+ this is the POST_NOTIFICATIONS runtime prompt; below 13 it is
 * granted automatically. On iOS it is the standard alert authorisation.
 */
export async function requestReminderPermission() {
  if (!canRemind) return false
  try {
    const { display } = await LocalNotifications.requestPermissions()
    return display === 'granted'
  } catch {
    return false
  }
}

/** Has permission already been granted, without prompting for it? */
export async function reminderPermission() {
  if (!canRemind) return 'unavailable'
  try {
    const { display } = await LocalNotifications.checkPermissions()
    return display
  } catch {
    return 'unavailable'
  }
}

/**
 * Bring the OS queue in line with the document.
 *
 * Cancel everything pending, then schedule the plan. Diffing would be cleverer
 * and worse: cancel-and-reschedule is idempotent, and it means notification ids
 * only have to be unique within one batch — so there is no hashing habit ids
 * into 32-bit integers and no collision class of bug to chase. At ~56 items the
 * cost is irrelevant.
 *
 * Returns how many are now pending, which Settings reports.
 */
export async function syncReminders(habits, todayKey) {
  if (!canRemind) return 0

  try {
    if ((await reminderPermission()) !== 'granted') {
      // Not allowed to post. Clear anything left over from before the user
      // revoked permission rather than leaving a stale queue behind.
      await cancelAll()
      return 0
    }

    await ensureChannel()
    await cancelAll()

    const plan = plannedReminders(habits, todayKey)
    if (!plan.length) return 0

    await LocalNotifications.schedule({
      notifications: plan.map((r, i) => ({
        // Unique within this batch only — see above.
        id: i + 1,
        title: r.title,
        body: r.body,
        channelId: CHANNEL,
        schedule: {
          at: r.at,
          // Let Android batch these with other wakeups. A habit reminder is not
          // an alarm, and asking for exact delivery pulls in SCHEDULE_EXACT_ALARM,
          // which Google Play restricts to apps that genuinely need it.
          allowWhileIdle: false
        },
        extra: { habitId: r.habitId, dateKey: r.dateKey }
      }))
    })

    return plan.length
  } catch (err) {
    // A failure here must never take the app down with it — the habit tracker
    // still works perfectly without notifications.
    console.error('Failed to sync reminders:', err)
    return 0
  }
}

/** Drop every pending notification this app owns. */
export async function cancelAll() {
  if (!canRemind) return
  try {
    const { notifications } = await LocalNotifications.getPending()
    if (notifications.length) await LocalNotifications.cancel({ notifications })
  } catch {
    // Nothing pending, or the platform does not implement it. Either way there
    // is nothing to clean up.
  }
}

/** How many are currently queued with the OS. */
export async function pendingCount() {
  if (!canRemind) return 0
  try {
    const { notifications } = await LocalNotifications.getPending()
    return notifications.length
  } catch {
    return 0
  }
}

/**
 * Android 8+ refuses to post a notification that has no channel. Creating one
 * is also what gives the user a named toggle in system settings rather than an
 * all-or-nothing switch on the whole app.
 */
async function ensureChannel() {
  if (!LocalNotifications.createChannel) return
  try {
    await LocalNotifications.createChannel({
      id: CHANNEL,
      name: 'Habit reminders',
      description: 'Nudges for the habits you asked to be reminded about',
      importance: 4,
      visibility: 1
    })
  } catch {
    // iOS has no channels, and the method is absent there.
  }
}
