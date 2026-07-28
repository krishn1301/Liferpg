import { useEffect, useState } from 'react'
import { todayKey, msUntilNextLocalMidnight } from '../domain/dates'

/**
 * Today's date key, which rolls over on its own at local midnight.
 *
 * The desktop app captured `const TODAY = new Date()` at module load. A window
 * left open overnight kept writing to the previous day — and a phone app is
 * left open far more often than a desktop one.
 */
export function useToday() {
  const [key, setKey] = useState(() => todayKey())

  useEffect(() => {
    let timer

    const schedule = () => {
      // +1s of slack so we're safely past midnight when the timer fires
      timer = setTimeout(() => {
        setKey(todayKey())
        schedule()
      }, msUntilNextLocalMidnight() + 1000)
    }
    schedule()

    // Timers don't fire reliably while an app is backgrounded, so re-check
    // whenever we come back to the foreground.
    const recheck = () => setKey(todayKey())
    document.addEventListener('visibilitychange', recheck)

    return () => {
      clearTimeout(timer)
      document.removeEventListener('visibilitychange', recheck)
    }
  }, [])

  return key
}
