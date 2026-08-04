import React from 'react'
import ReactDOM from 'react-dom/client'
// Both self-hosted, because the desktop build's Google Fonts @import was
// CSP-blocked and silently never loaded. Archivo's `wdth` build is the larger
// one on purpose: the condensed width axis is what makes a screen title read
// as engraved rather than merely bold, and it is the single most
// identity-carrying asset in the app.
import '@fontsource-variable/archivo/wdth.css'
import '@fontsource-variable/jetbrains-mono'
import './theme/global.css'
import { applyTheme } from './theme/tokens'
import { watchForUpdates } from './platform/updates'
import App from './App'

applyTheme('dark')

// Registered before React mounts, so the check for "was there already a
// controller" happens before the new worker has a chance to claim the page.
watchForUpdates()

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)
