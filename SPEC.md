# LifeRPG — Complete Project Specification

> A gamified, offline-first desktop habit tracker with medicine tracking, daily routine planning, Excel integration, and an Android APK version. Built with Electron + React.

---

## Table of Contents

1. [Overview](#overview)
2. [Tech Stack](#tech-stack)
3. [Project Structure](#project-structure)
4. [Architecture](#architecture)
5. [Design System](#design-system)
6. [Data Models](#data-models)
7. [Features Specification](#features-specification)
8. [File-by-File Implementation Guide](#file-by-file-implementation-guide)
9. [Build & Package](#build--package)
10. [Android APK (Capacitor)](#android-apk-capacitor)

---

## Overview

**LifeRPG** is a standalone Windows desktop application (with planned Android APK support) that gamifies daily life management. Users can:

- Track up to 99 daily habits with automatic streaks and XP/leveling
- Track medicines with dosage, time slots, take/skip logging, and pill count warnings
- Plan their entire day with a vertical timeline of time blocks
- Log daily water intake, mood, and journal notes
- View analytics charts (weekly trends, category breakdowns, leaderboards)
- See monthly calendar heatmaps per habit
- Earn achievement badges
- Export/import everything to/from color-coded Excel spreadsheets
- All data persists locally — zero internet required

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Desktop shell | Electron (v39+) via `electron-vite` |
| Frontend | React 19 (JSX, no TypeScript) |
| Charts | recharts |
| Styling | Inline JS style objects (no CSS framework) |
| Font | Inter (Google Fonts, loaded via CSS `@import`) |
| Data persistence | Custom JSON file store using Node.js `fs` (stored in Electron's `userData` path) |
| Excel | exceljs library |
| Build/package | electron-builder (NSIS installer for Windows) |
| Android (planned) | Capacitor wrapping the web renderer |

### Key Dependencies

```json
{
  "dependencies": {
    "@electron-toolkit/preload": "^3.0.2",
    "@electron-toolkit/utils": "^4.0.0",
    "exceljs": "^4.4.0",
    "recharts": "^3.8.1"
  },
  "devDependencies": {
    "@vitejs/plugin-react": "^5.1.1",
    "electron": "^39.2.6",
    "electron-builder": "^26.0.12",
    "electron-vite": "^5.0.0",
    "react": "^19.2.1",
    "react-dom": "^19.2.1"
  }
}
```

---

## Project Structure

```
Life.rpg/
├── package.json
├── electron-builder.yml          # Windows installer config
├── electron.vite.config.mjs      # Electron-vite build config
├── resources/
│   └── icon.png                  # App icon
├── src/
│   ├── main/
│   │   ├── index.js              # Electron main process (window, IPC handlers)
│   │   ├── store.js              # JSON file-based local data persistence
│   │   └── excel.js              # Excel export/import with exceljs
│   ├── preload/
│   │   └── index.js              # Secure IPC bridge (contextBridge)
│   └── renderer/
│       ├── index.html
│       └── src/
│           ├── main.jsx          # React entry point
│           ├── App.jsx           # Data bridge, toast system, Electron IPC
│           ├── HabitRPG.jsx      # Main UI component (ALL views in one file)
│           ├── styles.js         # Complete inline style object
│           └── assets/
└── dist/                         # Built output
    ├── life-rpg-1.0.0-setup.exe  # NSIS installer
    └── win-unpacked/             # Portable version
```

---

## Architecture

```
┌──────────────────────────────────────────────────┐
│                 MAIN PROCESS                      │
│                 (src/main/)                        │
│                                                    │
│  index.js ─── BrowserWindow + IPC Handlers         │
│  store.js ─── JSON file read/write (userData/)     │
│  excel.js ─── exceljs export/import + dialogs      │
└──────────────────┬───────────────────────────────┘
                   │ IPC (invoke/handle)
┌──────────────────┴───────────────────────────────┐
│              PRELOAD SCRIPT                        │
│              (src/preload/)                        │
│                                                    │
│  contextBridge.exposeInMainWorld('api', {           │
│    store: { get, set, reset },                     │
│    excel: { export, import }                       │
│  })                                                │
└──────────────────┬───────────────────────────────┘
                   │ window.api
┌──────────────────┴───────────────────────────────┐
│              RENDERER PROCESS                      │
│              (src/renderer/src/)                   │
│                                                    │
│  App.jsx ──── Loads data from store on mount       │
│              ├── Auto-saves habits+xp on change    │
│              ├── Excel export/import callbacks     │
│              └── Toast notification system          │
│                                                    │
│  HabitRPG.jsx ── Single component with ALL views   │
│              ├── Dashboard (stats + widgets)        │
│              ├── My Habits (weekly grid)            │
│              ├── Analytics (charts)                 │
│              ├── Calendar (monthly per-habit)       │
│              ├── Medicines (time-based tracking)    │
│              ├── My Day (vertical timeline)         │
│              ├── Rewards (badges + XP)              │
│              └── Settings (data management)         │
│                                                    │
│  styles.js ── Exported `s` object with all styles  │
└──────────────────────────────────────────────────┘
```

### Data Flow

1. **On app launch**: `App.jsx` calls `window.api.store.get()` via IPC → main process reads `liferpg-data.json` from `userData` → returns data → React state initialized
2. **On any change**: `useEffect` in `App.jsx` calls `window.api.store.set(key, value)` → main process writes to JSON file
3. **Medicines/Routine/DailyLogs**: Managed inside `HabitRPG.jsx` with their own `localStorage` fallback (for web/mobile compatibility) + `window.api.store` for Electron

---

## Design System

### Philosophy
- **Premium, blocky, minimal** — NO rounded corners (borderRadius: 0)
- **Monochromatic dark grey** — no gradients on cards, no shadows
- **Sharp rectangular** — buttons, cards, inputs are all crisp rectangles
- **Uppercase section headers** with wide letter-spacing
- **Single accent color** — emerald green `#22c55e` for success/completions only

### Color Palette

| Token | Hex | Usage |
|-------|-----|-------|
| Deepest BG | `#0e0e0e` | Root background, XP bar track |
| Sidebar BG | `#141414` | Sidebar, grid headers |
| Card BG | `#1a1a1a` | Cards, panels, habit rows |
| Input BG | `#222222` | Inputs, selects, calendar cells |
| Border | `#2a2a2a` | All borders (1px solid) |
| Text Primary | `#e0e0e0` | Headings, habit names |
| Text Secondary | `#888888` | Labels, nav items, muted text |
| Text Muted | `#555555` | Section titles, timestamps |
| Accent Green | `#22c55e` | Completions, XP bar, active nav border, take button |
| Category Colors | See below | Per-habit color coding |

### Category Colors

```javascript
const CATEGORIES = {
  fitness:      { label: 'Fitness',      color: '#f97316' },  // orange
  education:    { label: 'Education',    color: '#8b5cf6' },  // purple
  health:       { label: 'Health',       color: '#22c55e' },  // green
  productivity: { label: 'Productivity', color: '#3b82f6' },  // blue
  personal:     { label: 'Personal',     color: '#ec4899' },  // pink
  mindfulness:  { label: 'Mindfulness',  color: '#14b8a6' },  // teal
  social:       { label: 'Social',       color: '#fbbf24' },  // amber
  creative:     { label: 'Creative',     color: '#e11d48' },  // rose
}
```

### Typography

- Font: **Inter** (loaded via Google Fonts CSS import)
- Page titles: 24px, weight 800, letter-spacing -0.3px
- Section titles: 10px, weight 700, uppercase, letter-spacing 0.1em, color `#555555`
- Body text: 12-13px, weight 500-600
- Labels: 10-11px, uppercase, letter-spacing 0.05em

### Layout

- **Root**: `display: flex`, `height: 100vh`, `overflow: hidden`
- **Sidebar**: Fixed 230px width, full height, sticky, `overflowY: auto`
- **Main content**: `flex: 1`, `overflowY: auto`, `maxWidth: 920px`, `padding: 28px 36px`
- Active nav item has `borderLeft: 2px solid #22c55e` and `background: #1a1a1a`

---

## Data Models

### Habit

```javascript
{
  id: 1717777777777,        // Date.now() at creation
  name: "Morning Run",
  category: "fitness",      // key from CATEGORIES
  icon: "🏃",              // emoji
  streak: 0,                // auto-calculated
  target: "daily",
  xpBonus: 1,               // multiplier
  completions: {
    "2026-07-16": true,
    "2026-07-15": true
  }
}
```

### Medicine

```javascript
{
  id: 1717777777777,
  name: "Vitamin D",
  dosage: "1000IU",
  times: ["08:00", "22:00"],       // keys from MED_TIMES
  pillsRemaining: 30,
  history: {
    "2026-07-16": {
      "08:00": "taken",
      "22:00": "skipped"
    }
  }
}
```

### Routine Block

```javascript
{
  id: 1717777777777,
  name: "Deep Work",
  startTime: "09:00",        // 24h format
  duration: 60,              // minutes (options: 15, 30, 45, 60, 90, 120)
  category: "work",          // key from ROUTINE_CATS
  icon: "💻",
  completions: {
    "2026-07-16": true
  }
}
```

### Daily Log (keyed by date string)

```javascript
{
  "2026-07-16": {
    mood: 4,              // 1-5 (😢😕😐🙂😄)
    waterGlasses: 6,      // 0-8
    notes: "Great day!",
    wakeTime: "06:30",
    sleepTime: "22:30"
  }
}
```

### Store Defaults (persisted JSON file)

```javascript
{
  habits: [],
  xp: 0,
  settings: { excelPath: '', autoSaveInterval: 30 },
  lastUpdated: '',
  medicines: [],
  routineBlocks: [],
  dailyLogs: {}
}
```

---

## Features Specification

### 1. Sidebar Navigation

8 nav items with emoji icons:
- 🏠 Dashboard, ✅ My Habits, 📊 Analytics, 📅 Calendar
- 💊 Medicines, 📋 My Day, 🏆 Rewards, ⚙️ Settings

Plus: XP card (level badge + progress bar), Export/Import Excel buttons, streak counter at bottom.

### 2. Dashboard

- **Greeting**: "Good morning/afternoon/evening, Champion 👋" with today's date
- **4 stat cards** (2x2 or 4-column grid): Today's Progress %, Total XP, Best Streak, Total Done
- **3 widget cards**: Water tracker (8 clickable dots), Mood tracker (5 emoji buttons), Daily Notes (textarea)
- **Today's Quests**: List of all habits with check buttons
- **This Week**: Bar chart (recharts) showing daily completion %

### 3. My Habits (Weekly Grid)

- Header: "My Habits" with count (X/99) and "+ Add Habit" button
- Add form: name input, icon selector (20 emojis), category dropdown, Add button
- **Weekly grid table**: rows = habits, columns = Mon-Sun + Streak
  - Each cell is a clickable checkbox colored with category color
  - Today's column highlighted
  - Streak count with 🔥 emoji
  - Delete (✕) button per row

### 4. Analytics

- **Category completion bar chart** (horizontal, recharts)
- **Weekly trend line chart** (completion % over Mon-Sun)
- **Habit leaderboard** (sorted by total completions, with medals 🥇🥈🥉)

### 5. Calendar

- Monthly grid per habit (7 columns for days of week)
- Navigation arrows to switch months
- Days colored with category color when completed
- Today highlighted with colored border
- Click any day to toggle completion

### 6. Medicine Tracker

- "+ Add Medicine" form: name, dosage, pills remaining, multi-select time slots
- **4 time slots**: 🌅 Morning (08:00), ☀️ Afternoon (14:00), 🌆 Evening (18:00), 🌙 Night (22:00)
- Today's schedule grouped by time slot, showing each medicine with:
  - "✓ Taken" / "✗ Skip" buttons (or status label if already marked)
  - Dosage and pills remaining (⚠️ warning at ≤5 pills)
- Stats section at bottom: per-medicine streak + low pill warnings
- Marking "taken" auto-decrements `pillsRemaining`

### 7. Daily Routine (My Day)

- "+ Add Block" form: name, time (input type="time"), duration dropdown, category, icon
- **Vertical timeline** sorted by startTime:
  - Each block shows: formatted time (AM/PM), colored left border, icon, name, duration, category, checkbox
  - Completed blocks have strikethrough + reduced opacity
- **Current time indicator**: Red horizontal line with dot, positioned proportionally between first and last block
- **6 routine categories**: Morning (amber), Work (blue), Exercise (orange), Meal (green), Personal (pink), Evening (purple)

### 8. Rewards & Badges

- **Level card**: Current level, XP progress bar, XP to next level
- **6 achievement badges** (3-column grid):
  - 🔥 Week Warrior (7-day streak)
  - 💎 Diamond Habit (30-day streak)
  - ⚡ Perfect Week (100% today)
  - 🏅 XP Centurion (100 XP)
  - 🎯 Habit Master (5+ habits)
  - 🌅 Early Bird (before 8am)
- Unearned badges are grayscale + low opacity
- **XP by Category**: Horizontal progress bars per category

### 9. Settings

- Export All Data to Excel button
- Import Data from Excel button
- Reset All Data button (with warning text)
- About section (version info)

### 10. Excel Export/Import

**Export creates 3 sheets:**

1. **Daily Habits**: Grid with habit rows × date columns. Completion cells color-coded by category. Bottom row shows daily completion %. Total and Rate columns.
2. **Statistics**: Per-habit stats (streak, total completions, rate, XP earned). Summary row at bottom.
3. **Config**: Habit definitions (ID, name, category, icon, xpBonus, target) for re-import.

**Import reads:**
- Config sheet for habit definitions
- Daily Habits sheet for completion data (✓/✔/Y/y/1 = completed)
- Recalculates XP from completions

---

## File-by-File Implementation Guide

### `electron.vite.config.mjs`

Standard electron-vite config with `externalizeDepsPlugin()` for main and preload, and `@vitejs/plugin-react` for renderer. Alias `@renderer` → `src/renderer/src`.

### `electron-builder.yml`

```yaml
appId: com.liferpg.app
productName: LifeRPG
win:
  executableName: LifeRPG
nsis:
  shortcutName: LifeRPG
  createDesktopShortcut: always
npmRebuild: false
```

### `src/main/store.js`

- Uses `app.getPath('userData')` for the storage directory
- Reads/writes `liferpg-data.json` using Node.js `fs.readFileSync`/`writeFileSync`
- In-memory cache for performance
- Exports: `getStoreData()`, `setStoreData(key, value)`, `resetStore()`

### `src/main/index.js`

- Creates `BrowserWindow` (1280×820, min 1000×650, dark background `#1a1a2e`)
- Registers 5 IPC handlers: `store:get`, `store:set`, `store:reset`, `excel:export`, `excel:import`
- Sets app user model ID to `com.liferpg.app`

### `src/preload/index.js`

Exposes `window.api` via `contextBridge` with:
- `store.get()`, `store.set(key, value)`, `store.reset()`
- `excel.export(habits, xp)`, `excel.import()`

### `src/renderer/src/App.jsx`

- Detects Electron via `window.api` existence
- Loads habits/xp from store on mount, auto-saves on change
- Provides toast notification system (success/error, 3s auto-dismiss)
- Passes everything to `<HabitRPG>` as props
- Shows loading screen until data is ready

### `src/renderer/src/HabitRPG.jsx`

Single 490-line component containing ALL views. Key architectural decisions:

- **State management**: `habits`/`xp` from props (managed by App.jsx), `medicines`/`routineBlocks`/`dailyLogs` managed internally with localStorage fallback
- **Dual storage**: Writes to both `window.api.store` (Electron) and `localStorage` (web fallback) simultaneously
- **Navigation**: Simple `view` state string, conditional rendering based on `view==='dashboard'`, etc.
- **XP System**: 10 XP per habit completion × xpBonus multiplier. Level formula: `lvl * 100` XP per level (Level 1 = 100 XP, Level 2 = 200 XP, etc.)
- **Streak calculation**: Counts consecutive days backward from today with completions

### `src/renderer/src/styles.js`

Single exported `s` object with ~80 style definitions. ALL borderRadius values are 0. Uses strict grey palette. New v2 styles include: `medCard`, `medTime`, `medPill`, `medTakeBtn`, `medSkipBtn`, `timelineWrap`, `timelineBlock`, `timelineTime`, `timelineNow`, `widgetRow`, `widgetCard`, `waterDot`, `moodBtn`, `noteInput`.

### `src/main/excel.js`

Uses `exceljs` to create formatted `.xlsx` files:
- `exportToExcel(habits, xp)`: Opens save dialog, creates 3-sheet workbook with styled headers, color-coded cells, and completion percentages
- `importFromExcel()`: Opens file dialog, reads Config + Daily Habits sheets, reconstructs habit objects with completions, recalculates XP

---

## Build & Package

### Development

```bash
npm install
npm run dev          # Launches Electron with hot-reload
```

### Windows Installer

```bash
npm run build:win    # Builds + packages as NSIS installer
```

Output: `dist/life-rpg-1.0.0-setup.exe` (~103 MB)
Portable: `dist/win-unpacked/LifeRPG.exe`

> **Important**: Close any running LifeRPG instance before building — the old process locks `app.asar` and causes build failures.

---

## Android APK (Capacitor)

### Planned approach

Use **Capacitor** to wrap the React renderer as a native Android app:

1. Create a separate web project with the same React source (HabitRPG.jsx, styles.js, App.jsx)
2. Use `localStorage` for persistence (no Electron IPC)
3. Make the UI responsive for mobile (bottom tab bar instead of sidebar, 2-column stat grid, etc.)
4. Install `@capacitor/core` and `@capacitor/cli`
5. Add Android platform
6. Build web → sync → generate APK

The renderer code already has a `localStorage` fallback (`storeGet`/`storeSet` helpers), so it works outside Electron without modification.

### Required responsive adaptations for mobile

- Sidebar → bottom tab navigation bar
- 4-column stat grid → 2-column
- Weekly habit grid → horizontal scroll
- Calendar cells → smaller
- Font sizes → slightly larger for touch targets
- Add `viewport-fit: cover` for notch/safe area support

---

## Constants Reference

```javascript
// 20 selectable icons
const ICONS = ['⭐','💪','📚','💧','📖','🎯','🧘','🏃','✍️','🎨','🎵','🍎','💤','🧠','🌿','☕','🔥','💡','📝','🏋️']

// 4 medicine time slots
const MED_TIMES = [
  { key: '08:00', label: 'Morning',   icon: '🌅' },
  { key: '14:00', label: 'Afternoon', icon: '☀️' },
  { key: '18:00', label: 'Evening',   icon: '🌆' },
  { key: '22:00', label: 'Night',     icon: '🌙' }
]

// 6 routine categories
const ROUTINE_CATS = {
  morning:  { label: 'Morning',  color: '#fbbf24' },
  work:     { label: 'Work',     color: '#3b82f6' },
  exercise: { label: 'Exercise', color: '#f97316' },
  meal:     { label: 'Meal',     color: '#22c55e' },
  personal: { label: 'Personal', color: '#ec4899' },
  evening:  { label: 'Evening',  color: '#8b5cf6' }
}

// 6 achievement badges
const BADGES = [
  { id: 'w', icon: '🔥', label: 'Week Warrior',  desc: '7-day streak',  req: 7 },
  { id: 'm', icon: '💎', label: 'Diamond Habit',  desc: '30-day streak', req: 30 },
  { id: 'p', icon: '⚡', label: 'Perfect Week',   desc: '100% today',    req: 'perfect' },
  { id: 'x', icon: '🏅', label: 'XP Centurion',   desc: '100 XP',       req: 'xp100' },
  { id: 'h', icon: '🎯', label: 'Habit Master',   desc: '5+ habits',    req: 'habits5' },
  { id: 'e', icon: '🌅', label: 'Early Bird',     desc: 'Before 8am',   req: 'early' }
]
```

---

## Scaffolding Command

To create the initial project from scratch:

```bash
npx -y create-electron-vite@latest ./Life.rpg -- --template react
cd Life.rpg
npm install exceljs recharts
```

Then replace the generated source files with the implementations described above.
