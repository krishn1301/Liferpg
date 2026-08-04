// Picking up a new deploy without making anyone reinstall.
//
// The service worker is generated with `skipWaiting` and `clientsClaim`, so a
// new version activates and takes over open pages as soon as it downloads. What
// it cannot do is change the HTML and JS already running — so the session that
// triggered the update keeps showing the old app until it is relaunched.
//
// That was observed, not theorised: the first load of the Pages site after a
// deploy served the previous bundle, and only the load after that showed the
// new one. On an installed PWA "the load after that" means closing the app from
// the app switcher, which nobody thinks to do.

/**
 * Reload once when a new service worker takes over — but only at launch.
 *
 * Two guards, both load-bearing:
 *
 *   1. `controllerchange` also fires the first time *any* worker claims the
 *      page, which on a first visit would reload an app the user just opened
 *      for no reason. Only an update has a controller already in place.
 *   2. Reloading someone mid-tap is worse than showing them yesterday's build.
 *      An update that lands while the app is genuinely in use is left alone —
 *      the worker has already claimed the page, so the next launch gets the new
 *      version with no further help.
 *
 * @param reload  injected so this can be tested without a real navigation
 */
export function watchForUpdates(reload = () => window.location.reload()) {
  const sw = typeof navigator !== 'undefined' ? navigator.serviceWorker : undefined
  if (!sw?.addEventListener) return () => {}

  // Captured now, before registration: null here means a first visit.
  const wasControlled = Boolean(sw.controller)
  const openedAt = Date.now()
  let reloading = false

  const onChange = () => {
    if (reloading || !wasControlled) return
    // Still settling into the launch, rather than in the middle of a session.
    if (Date.now() - openedAt > 10_000) return
    reloading = true
    reload()
  }

  sw.addEventListener('controllerchange', onChange)
  return () => sw.removeEventListener('controllerchange', onChange)
}
