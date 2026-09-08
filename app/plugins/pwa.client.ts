import { registerPwaInstallListeners, setPwaRefreshAvailable, setPwaServiceWorkerReady, setPwaUpdateAvailable } from '~/composables/usePwaInstall'

export default defineNuxtPlugin(() => {
  registerPwaInstallListeners()

  if (!('serviceWorker' in navigator) || import.meta.dev) return

  const { public: { pwaBuildId } } = useRuntimeConfig()
  const currentBuildId = String(pwaBuildId || 'local')
  const updateCheckIntervalMs = 60 * 1000
  const hadController = Boolean(navigator.serviceWorker.controller)
  let didHandleControllerChange = false
  let isCheckingForUpdate = false
  let hasDetectedNewBuild = false

  const watchRegistration = (registration: ServiceWorkerRegistration, buildId: string | null = null) => {
    if (registration.waiting && navigator.serviceWorker.controller) {
      setPwaUpdateAvailable(registration, buildId)
    }

    registration.addEventListener('updatefound', () => {
      const worker = registration.installing

      if (!worker) return

      worker.addEventListener('statechange', () => {
        if (worker.state === 'installed' && navigator.serviceWorker.controller) {
          setPwaUpdateAvailable(registration, buildId)
        }
      })
    })
  }

  const checkForWaitingUpdate = (registration: ServiceWorkerRegistration, buildId: string | null = null) => {
    if (registration.waiting && navigator.serviceWorker.controller) {
      setPwaUpdateAvailable(registration, buildId)
    }
  }

  const getLatestBuildId = async () => {
    const response = await fetch('/api/pwa/version', {
      cache: 'no-store',
      headers: {
        'cache-control': 'no-cache'
      }
    })

    if (!response.ok) return null

    const body = await response.json() as { buildId?: unknown }
    const buildId = typeof body.buildId === 'string' ? body.buildId.trim() : ''

    return buildId || null
  }

  const checkForAppUpdate = async (registration: ServiceWorkerRegistration) => {
    if (isCheckingForUpdate || navigator.onLine === false) return

    isCheckingForUpdate = true

    try {
      const latestBuildId = await getLatestBuildId()

      if (latestBuildId && latestBuildId !== currentBuildId) {
        hasDetectedNewBuild = true
        await registration.update().catch(() => undefined)

        if (registration.waiting && navigator.serviceWorker.controller) {
          setPwaUpdateAvailable(registration, latestBuildId)

          return
        }

        setPwaRefreshAvailable(latestBuildId)

        return
      }

      if (!hasDetectedNewBuild) {
        await registration.update().catch(() => undefined)
      }

      checkForWaitingUpdate(registration, latestBuildId)
    } finally {
      isCheckingForUpdate = false
    }
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
        void checkForAppUpdate(registration)

        window.setInterval(() => {
          if (document.visibilityState === 'visible') {
            void checkForAppUpdate(registration)
          }
        }, updateCheckIntervalMs)

        document.addEventListener('visibilitychange', () => {
          if (document.visibilityState === 'visible') {
            void checkForAppUpdate(registration)
          }
        })

        window.addEventListener('focus', () => {
          void checkForAppUpdate(registration)
        })

        window.addEventListener('online', () => {
          void checkForAppUpdate(registration)
        })
      })
      .catch(() => {
        setPwaServiceWorkerReady(false)
      })
  })
})
