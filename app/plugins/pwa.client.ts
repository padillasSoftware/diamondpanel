import { registerPwaInstallListeners, setPwaServiceWorkerReady } from '~/composables/usePwaInstall'

export default defineNuxtPlugin(() => {
  registerPwaInstallListeners()

  if (!('serviceWorker' in navigator) || import.meta.dev) return

  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('/sw.js', { scope: '/' })
      .then(() => {
        setPwaServiceWorkerReady(true)
      })
      .catch(() => {
        setPwaServiceWorkerReady(false)
      })
  })
})
