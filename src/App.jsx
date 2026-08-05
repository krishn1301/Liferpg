import { useEffect } from 'react'
import { HashRouter, Routes, Route, useNavigate, useLocation } from 'react-router-dom'
import { App as CapApp } from '@capacitor/app'
import { StoreProvider, useStore } from './state/StoreProvider'
import { useReminders } from './state/useReminders'
import { requestPersistentStorage } from './platform/device'
import BottomTabs, { TABS } from './components/BottomTabs'
import { CatalogCard } from './components/catalog'
import { useToday } from './state/useToday'
import { totalXp, levelFromXp, earnedBadges } from './domain/xp'
import Today from './screens/Today'
import Habits from './screens/Habits'
import Stats from './screens/Stats'
import MyDay from './screens/MyDay'
import More from './screens/More'
import Calendar from './screens/Calendar'
import Medicines from './screens/Medicines'
import Settings from './screens/Settings'
import Welcome from './screens/Welcome'
import Placeholder from './screens/Placeholder'

export default function App() {
  // Ask once per launch for durable storage. Everything lives in localStorage,
  // and on iOS that is evictable for a site the user hasn't engaged with — for
  // a habit tracker, eviction means losing months of history. Best-effort and
  // deliberately unreported: a refusal is not something to interrupt anyone
  // with, and export is the real answer either way.
  useEffect(() => {
    requestPersistentStorage()
  }, [])

  return (
    <StoreProvider>
      <HashRouter>
        <AndroidBackButton />
        <Shell />
      </HashRouter>
    </StoreProvider>
  )
}

function Shell() {
  const { doc, ready } = useStore()

  // Mounted at the shell, above the router, so the notification queue tracks
  // the document no matter which screen a habit was edited from.
  useReminders(doc.habits, ready)

  // Rendering the app against an empty document and then swapping in the real
  // one makes every list flash. Waiting one frame for storage is cheaper.
  if (!ready) {
    return (
      <div style={S.splash}>
        <div style={S.wordmark}>LifeRPG</div>
      </div>
    )
  }

  // First run only, and only for a genuinely empty document. `onboarded` is set
  // by finishing *or* skipping, so this never reappears — and the habit check
  // means anyone restoring a backup goes straight to their data instead of
  // being asked to pick a starter pack they do not need.
  if (!doc.settings.onboarded && doc.habits.length === 0) {
    return (
      <main>
        <Welcome />
      </main>
    )
  }

  return (
    <>
      <main>
        <Routes>
          <Route path="/" element={<Today />} />
          <Route path="/habits" element={<Habits />} />
          <Route path="/stats" element={<Stats />} />
          <Route path="/day" element={<MyDay />} />
          <Route path="/more" element={<More />} />
          <Route path="/calendar" element={<Calendar />} />
          <Route path="/medicines" element={<Medicines />} />
          <Route path="/settings" element={<Settings />} />
          <Route
            path="*"
            element={<Placeholder title="Not found" note="That screen doesn't exist." />}
          />
        </Routes>
      </main>
      <BottomTabs />
      <Rewards />
    </>
  )
}

/**
 * The reward moments live at the shell, not on Today, because a habit can also
 * be completed from the Calendar's day sheet. Anchoring them to one screen
 * meant backfilling yesterday could silently push you up a level.
 */
function Rewards() {
  const { doc } = useStore()
  const today = useToday()
  const badges = earnedBadges(doc.habits, today)

  return (
    <CatalogCard
      level={levelFromXp(totalXp(doc.habits)).level}
      badgeCount={badges.filter((b) => b.earned).length}
      badges={badges}
    />
  )
}

/**
 * Android's hardware back button does nothing in a WebView unless you wire it
 * up. From a sub-screen it should go back; from a root tab it should leave the
 * app, not strand the user on a blank history entry.
 */
function AndroidBackButton() {
  const navigate = useNavigate()
  const location = useLocation()

  useEffect(() => {
    let remove
    CapApp.addListener('backButton', ({ canGoBack }) => {
      const atRoot = TABS.some((tab) => tab.to === location.pathname)
      if (atRoot || !canGoBack) CapApp.exitApp()
      else navigate(-1)
    })
      .then((handle) => {
        remove = () => handle.remove()
      })
      .catch(() => {
        // Web build — the browser's own back button already does the right thing.
      })

    return () => remove?.()
  }, [navigate, location.pathname])

  return null
}

const S = {
  splash: {
    height: '100%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center'
  },
  // The wordmark, engraved. There is no logo and none was ever commissioned;
  // in this world the name set in the display face *is* the mark.
  wordmark: {
    fontSize: 'var(--fs-2xl)',
    fontWeight: 800,
    fontStretch: '78%',
    letterSpacing: '0.22em',
    textTransform: 'uppercase',
    // Tracking adds a trailing gap after the last letter; this pulls the
    // optical centre back to the real one.
    textIndent: '0.22em'
  }
}
