import { registerPwaInstallListeners, setPwaRefreshAvailable, setPwaServiceWorkerReady, setPwaUpdateAvailable } from '~/composables/usePwaInstall'

export default defineNuxtPlugin(() => {
  registerPwaInstallListeners()

  if (!('serviceWorker' in navigator) || import.meta.dev) return

  const hadController = Boolean(navigator.serviceWorker.controller)
  let didHandleControllerChange = false

  const watchRegistration = (registration: ServiceWorkerRegistration) => {
    if (registration.waiting && navigator.serviceWorker.controller) {
      setPwaUpdateAvailable(registration)
    }

    registration.addEventListener('updatefound', () => {
      const worker = registration.installing

      if (!worker) return

      worker.addEventListener('statechange', () => {
        if (worker.state === 'installed' && navigator.serviceWorker.controller) {
          setPwaUpdateAvailable(registration)
        }
      })
    })
  }

  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (!hadController || didHandleControllerChange) return

    didHandleControllerChange = true
    setPwaRefreshAvailable()
  })

  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('/sw.js', { scope: '/', updateViaCache: 'none' })
      .then((registration) => {
        setPwaServiceWorkerReady(true)
        watchRegistration(registration)

        window.setInterval(() => {
          void registration.update()
        }, 60 * 60 * 1000)
      })
      .catch(() => {
        setPwaServiceWorkerReady(false)
      })
  })
})
