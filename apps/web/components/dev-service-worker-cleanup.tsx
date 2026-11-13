"use client"

// Development only. The offline service worker (spike 02) is built for production: in
// `next dev` it intercepts the development server's own files and the page loads with
// no styles. The layout no longer registers it in development; this removes any worker
// and caches a production build or an earlier session left on this address, so a
// developer's browser recovers by itself.
import { useEffect } from "react"

export function DevServiceWorkerCleanup(): null {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return
    void (async () => {
      const registrations = await navigator.serviceWorker.getRegistrations()
      if (registrations.length === 0) return
      await Promise.all(
        registrations.map((registration) => registration.unregister())
      )
      if ("caches" in window) {
        const keys = await caches.keys()
        await Promise.all(keys.map((key) => caches.delete(key)))
      }
      // Load the page again without the worker in the way.
      window.location.reload()
    })()
  }, [])
  return null
}
