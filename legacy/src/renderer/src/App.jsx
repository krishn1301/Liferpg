import { useState, useEffect, useCallback } from 'react'
import HabitRPG from './HabitRPG'

// Check if running in Electron
const isElectron = typeof window !== 'undefined' && window.api

export default function App() {
  const [habits, setHabits] = useState([])
  const [xp, setXp] = useState(0)
  const [loaded, setLoaded] = useState(false)
  const [toast, setToast] = useState(null)

  const showToast = useCallback((msg, type = 'success') => {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 3000)
  }, [])

  // Load from store on mount
  useEffect(() => {
    async function load() {
      if (isElectron) {
        const data = await window.api.store.get()
        if (data.habits?.length) setHabits(data.habits)
        if (data.xp) setXp(data.xp)
      }
      setLoaded(true)
    }
    load()
  }, [])

  // Auto-save to store on changes
  useEffect(() => {
    if (!loaded) return
    if (isElectron) {
      window.api.store.set('habits', habits)
      window.api.store.set('xp', xp)
    }
  }, [habits, xp, loaded])

  const handleExcelExport = async () => {
    if (!isElectron) { showToast('Excel export requires the desktop app', 'error'); return }
    const result = await window.api.excel.export(habits, xp)
    if (result.success) showToast(`Exported to ${result.filePath}`)
    else if (result.reason !== 'cancelled') showToast(result.reason, 'error')
  }

  const handleExcelImport = async () => {
    if (!isElectron) { showToast('Excel import requires the desktop app', 'error'); return }
    const result = await window.api.excel.import()
    if (result.success) {
      setHabits(result.habits)
      setXp(result.xp)
      showToast(`Imported ${result.habits.length} habits from Excel!`)
    } else if (result.reason !== 'cancelled') {
      showToast(result.reason, 'error')
    }
  }

  const handleReset = async () => {
    setHabits([])
    setXp(0)
    if (isElectron) await window.api.store.reset()
    showToast('All data has been reset')
  }

  if (!loaded) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: '#111118', color: '#a1a1aa' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>⚔️</div>
          <div style={{ fontSize: 14, fontWeight: 600 }}>Loading LifeRPG...</div>
        </div>
      </div>
    )
  }

  return (
    <>
      {toast && (
        <div style={{
          position: 'fixed', bottom: 24, left: '50%', transform: 'translateX(-50%)',
          background: toast.type === 'error' ? '#7f1d1d' : '#14532d',
          border: `1px solid ${toast.type === 'error' ? '#dc2626' : '#22c55e'}`,
          color: toast.type === 'error' ? '#fca5a5' : '#86efac',
          padding: '12px 28px', borderRadius: 12, fontWeight: 600, fontSize: 13,
          zIndex: 9999, boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
          animation: 'fadeIn 0.2s ease-out'
        }}>
          {toast.msg}
        </div>
      )}
      <HabitRPG
        habits={habits} setHabits={setHabits}
        xp={xp} setXp={setXp}
        showToast={showToast}
        onExcelExport={handleExcelExport}
        onExcelImport={handleExcelImport}
        onReset={handleReset}
      />
    </>
  )
}
