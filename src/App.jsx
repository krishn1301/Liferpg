import { useEffect } from 'react'
import { HashRouter, Routes, Route, useNavigate, useLocation } from 'react-router-dom'
import { App as CapApp } from '@capacitor/app'
import { StoreProvider, useStore } from './state/StoreProvider'
import BottomTabs, { TABS } from './components/BottomTabs'
import Today from './screens/Today'
import Habits from './screens/Habits'
import Stats from './screens/Stats'
import MyDay from './screens/MyDay'
import More from './screens/More'
import Calendar from './screens/Calendar'
import Medicines from './screens/Medicines'
import Settings from './screens/Settings'
import Placeholder from './screens/Placeholder'

export default function App() {
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
  const { ready } = useStore()

  // Rendering the app against an empty document and then swapping in the real
  // one makes every list flash. Waiting one frame for storage is cheaper.
  if (!ready) {
    return (
      <div style={S.splash}>
        <div style={{ fontSize: 'var(--fs-4xl)' }}>⚔️</div>
      </div>
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
            element={<Placeholder title="Not found" icon="🧭" note="That screen doesn't exist." />}
          />
        </Routes>
      </main>
      <BottomTabs />
    </>
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
  }
}
