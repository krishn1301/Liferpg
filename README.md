# LifeRPG

A gamified, offline-first habit tracker for **Android** and the **web**.
Track habits with streaks and XP, log medicines, plan your day, and see where your
time actually goes — with no account, no server, and no internet connection.

Distributed as a sideloaded APK (not on the Play Store) plus an installable web app.

---

## Status

Feature-complete for its three users. All eight screens work, the data is real, and the
visual language is the one described in [DESIGN.md](DESIGN.md) — a record catalogue, not
the desktop app's inherited grey. See [PRODUCT.md](PRODUCT.md) for what the product is
actually for.

## Install

**Android** — download the APK from the latest [Release] and open it. You will have to
allow install from unknown sources once; it is not on the Play Store.

**iPhone** — open the Pages URL in Safari, then **Share → Add to Home Screen**. iOS has no
install prompt, so nothing will offer this to you. Running it from the home screen rather
than a browser tab matters: iOS is much more willing to clear a tab's storage to reclaim
space, and that storage is your entire history.

The two installs are separate apps with separate data. There is no sync, and none is
planned. Export a backup from Settings if you want to move between them.

**Reminders only work on Android.** iOS Safari cannot schedule a local notification, and
Web Push would need a server this app deliberately does not have. Settings says so.

[Release]: ../../releases/latest

## Stack

| | |
|---|---|
| UI | React 19 + Vite 8 |
| Android shell | Capacitor 8 (`android/` is committed) |
| Web app | `vite-plugin-pwa` — installable, offline |
| Storage | `@capacitor/preferences` (native storage on Android, `localStorage` on web) |
| Type | Archivo + JetBrains Mono, self-hosted via `@fontsource-variable` |
| Charts | none — the trend plot and code strips are hand-drawn SVG and divs |
| Tests | Vitest |
| CI | GitHub Actions — signed APK on tag, Pages deploy on `main` |

Nothing here needs Android Studio or the Android SDK locally. CI does the Gradle build.

## Develop

```bash
npm install
npm run dev      # http://localhost:5173 — use device toolbar at phone dimensions
npm test
npm run lint
npm run icons    # regenerate the app icons from the design system
```

Local notifications and haptics are **native-only** and cannot be exercised in a browser.
Test those on a real device using a CI-built APK.

## Ship a release

```bash
# bump "version" in package.json first
git tag v0.1.0
git push origin main --tags
```

The `Android Release` workflow builds, signs, verifies and attaches
`LifeRPG-v0.1.0.apk` to a GitHub Release. Send testers that Release page.

`workflow_dispatch` builds a signed APK as a workflow artifact without cutting a release —
useful for testing a change on a device.

## One-time repo setup

Create the GitHub repo, then add these four **repository secrets**
(Settings → Secrets and variables → Actions):

| Secret | Value |
|---|---|
| `KEYSTORE_BASE64` | base64 of `liferpg-release.jks` |
| `KEYSTORE_PASSWORD` | the store password |
| `KEY_ALIAS` | `liferpg` |
| `KEY_PASSWORD` | same as `KEYSTORE_PASSWORD` (PKCS12 keystores can't have a separate key password) |

Then enable Pages: Settings → Pages → Source = **GitHub Actions**.

### About the keystore

`liferpg-release.jks` in the repo root is **gitignored and irreplaceable**. Android
identifies an app by its signature, so if you lose this file you cannot ship an update
that installs over an existing copy — every tester would have to uninstall first and lose
their data. Back it up somewhere permanent and offline.

`android/keystore.properties` (also gitignored) points local release builds at it.

## Project layout

```
src/
  platform/     the only code that knows whether it's on Android or the web
  domain/       pure logic — dates, schedules, streaks, XP. No React, no plugins.
  state/        one document, one reducer, debounced autosave
  screens/      one file per screen
  components/   shared UI — ui.jsx is the primitives, catalog.jsx the world's own devices
  theme/        design tokens, light + dark
scripts/        build tooling (icon generation)
android/        Capacitor's native project (committed)
legacy/         the original Electron desktop app, kept for reference during the port
```

`domain/` is deliberately dependency-free so the rules that matter — what counts as a
streak, which day a completion belongs to — are testable without a browser or a phone.
