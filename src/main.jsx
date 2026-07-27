import React from 'react'
import ReactDOM from 'react-dom/client'
import '@fontsource-variable/inter'
import './theme/global.css'
import { applyTheme } from './theme/tokens'
import App from './App'

applyTheme('dark')

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)
