import { createContext, useContext, useEffect, useMemo, useReducer, useRef, useState } from 'react'
import { App as CapApp } from '@capacitor/app'
import { load, createDebouncedSaver } from '../platform/storage'
import { reducer, emptyDoc, migrate } from './reducer'

const StoreContext = createContext(null)

export function StoreProvider({ children }) {
  const [doc, dispatch] = useReducer(reducer, null, emptyDoc)
  const [ready, setReady] = useState(false)
  const saver = useRef(null)
  if (saver.current == null) saver.current = createDebouncedSaver()

  // Load once, before anything renders real content.
  useEffect(() => {
    let cancelled = false
    load()
      .then((stored) => {
        if (cancelled) return
        if (stored) dispatch({ type: 'doc/replace', doc: migrate(stored) })
      })
      .catch((err) => console.error('Failed to load store:', err))
      .finally(() => {
        if (!cancelled) setReady(true)
      })
    return () => {
      cancelled = true
    }
  }, [])

  // Autosave, but never before the initial load has landed — otherwise the
  // empty starting document would overwrite real data during the first tick.
  useEffect(() => {
    if (!ready) return
    saver.current.queue(doc)
  }, [doc, ready])

  // Android can kill a backgrounded app without warning, and a browser tab can
  // close mid-debounce. Flush pending writes the moment we lose the foreground.
  useEffect(() => {
    const flush = () => saver.current.flush()

    const onVisibility = () => {
      if (document.visibilityState === 'hidden') flush()
    }
    document.addEventListener('visibilitychange', onVisibility)
    window.addEventListener('pagehide', flush)

    let remove
    CapApp.addListener('appStateChange', ({ isActive }) => {
      if (!isActive) flush()
    })
      .then((handle) => {
        remove = () => handle.remove()
      })
      .catch(() => {
        // Not on a native platform — the DOM listeners above are enough.
      })

    return () => {
      document.removeEventListener('visibilitychange', onVisibility)
      window.removeEventListener('pagehide', flush)
      remove?.()
      // Last line of defence: anything still sitting in the debounce window
      // when the tree goes away would otherwise be lost.
      flush()
    }
  }, [])

  const value = useMemo(() => ({ doc, dispatch, ready }), [doc, ready])
  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>
}

export function useStore() {
  const ctx = useContext(StoreContext)
  if (!ctx) throw new Error('useStore must be used inside <StoreProvider>')
  return ctx
}

/** Convenience: the habits array on its own. */
export function useHabits() {
  return useStore().doc.habits
}
