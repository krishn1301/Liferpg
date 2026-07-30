# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

Phone-first, delivered two ways from one codebase: an installed PWA on iPhone (Share → Add
to Home Screen; there is no install prompt on iOS) and a Capacitor-wrapped APK on Android,
sideloaded from a GitHub Release. Not published to either app store. The Capacitor wrapper
does not make this a native app — one web design language serves both.

## Users

The author and two people he knows personally — friends or family. Not a public product and
not a beta programme; there is no acquisition problem to solve, no onboarding funnel, and no
stranger who has to be convinced.

The situation is domestic and repetitive: a phone, one hand, twice a day. Once in the morning
to see what the day asks for, once later to tick things off. Sessions are measured in seconds,
not minutes.

## Product Purpose

One screen for the whole day. The confirmed job is *everything in one place* — habits,
medicines, and the day's shape — so that keeping a routine does not require four apps and the
discipline to open all of them.

Success is that the day's obligations are visible at a glance and closing them out is quick
enough that it happens even on a bad morning.

## Positioning

Everything is derived, nothing is stored as a counter. XP, levels, streaks and completion
rates are computed from the completion history every time they are shown, so they cannot drift
from the facts that justify them. The desktop predecessor stored `xp` as its own number, added
to it on each tick and never subtracted on untick; by the time it was retired it claimed 190 XP
against a history worth 100.

Every rate is measured against the days a habit was actually scheduled and actually existed —
not against the calendar. A Mon/Wed/Fri habit kept perfectly reads 100%, not 43%.

Fully offline and on-device. No account, no server, no sync, nothing leaves the phone.

## Operating Context

- **Morning:** open, read what is due today, act on it later.
- **Evening:** tick off what got done; occasionally backfill a missed day from the calendar.
- **Rarely:** add or edit a habit, log medicines, export a backup.

Data lives only on the device it was entered on. The Android APK and the iPhone PWA are
separate installs with separate data; there is no sync between them and none is planned.

A one-time import exists for the Electron desktop predecessor's save file
(`%APPDATA%/life-rpg/liferpg-data.json`).

## Capabilities and Constraints

**Core, confirmed:**
- Habits with schedules (daily, chosen weekdays, or *n* times per week), streaks, skips.
- XP, levels, badges — the reward layer.
- Medicines: doses per named time slot, courses with a start and end, adherence.

**Present but explicitly not core** — retained, not load-bearing, and not entitled to prominence:
- My Day routine blocks (the time-block timeline).
- Excel export.

**Constraints:**
- Offline-only, single-device, no backend.
- Storage is the device's own. On iPhone this is less durable than on Android, so export
  matters more there.
- **Reminders can only work on Android.** iOS Safari has no scheduled-local-notification API,
  and Web Push needs a server, which contradicts offline-only. This must be stated honestly in
  the interface rather than shown as a toggle that silently does nothing.
- No haptics on iPhone. Any feedback that relies on vibration needs a visual equivalent.
- Android 7.0+; the author's test device is a Galaxy S9+ on Android 10, which cannot exercise
  the Android 13+ notification-permission prompt that newer phones will show.

**Terminology (binding):** habits, quests, streaks, XP, levels, badges, medicines, doses.

## Brand Commitments

- **Name: LifeRPG.** Confirmed to stay regardless of the visual direction. The Android package
  id `com.liferpg.app` is already published and installed.
- **The RPG vocabulary stays** — XP, levels, quests, badges. A future visual world may be
  anything, but it has to make these words feel native rather than bolted on.
- No logo, wordmark, brand palette or typeface has ever been commissioned. The current look is
  inherited from the desktop build and is explicitly *not* a commitment — it is being replaced.

## Evidence on Hand

- Real user data: `%APPDATA%/life-rpg/liferpg-data.json` — 4 habits (Tuition, Supradyn,
  4L Water, Gym), 10 completions between 2026-04-30 and 2026-05-07.
- Shipped and installed: `v0.1.0`, signed APK, verified surviving a force-stop on real hardware.
- 194 passing tests.
- **No** testimonials, reviews, user counts, benchmarks, press or case studies exist, and none
  may be invented. There are three users and two of them have not opened it yet.

## Product Principles

1. **Derived, never stored.** Any number the interface shows is computed from history. A
   counter that can be incremented is a counter that will eventually lie.
2. **Judge people only on what they signed up for.** Rates, streaks and badges count the days a
   habit was scheduled and existed — never the raw calendar.
3. **The whole day on one screen.** Splitting the day across screens is the failure this
   product exists to fix.
4. **Seconds, not minutes.** The common path is read-and-tick, one-handed, half awake. Anything
   that slows that down is a regression however good it looks.
5. **Say what is true about the platform.** Where a feature cannot work — reminders on iPhone —
   the interface says so plainly instead of pretending.

## Accessibility & Inclusion

- Text sizes are `rem`, never `px`, so a system text-size preference actually scales the
  interface.
- 48dp minimum for anything tappable.
- WCAG AA (4.5:1) on every foreground/background pair, in both themes, measured against the
  lightest surface the text sits on.
- Colour is never the only carrier of meaning; category colour is always paired with a label.
- `prefers-reduced-motion` is honoured.
