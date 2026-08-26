type BeforeInstallPromptChoice = {
  outcome: 'accepted' | 'dismissed'
  platform: string
}

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>
  userChoice: Promise<BeforeInstallPromptChoice>
}

type NavigatorWithStandalone = Navigator & {
  standalone?: boolean
}

const installPrompt = shallowRef<BeforeInstallPromptEvent | null>(null)
const isStandalone = ref(false)
const isSupported = ref(false)
const isServiceWorkerReady = ref(false)
const isIos = ref(false)
const isInstalling = ref(false)
const updateRegistration = shallowRef<ServiceWorkerRegistration | null>(null)
const isUpdateAvailable = ref(false)
const isRefreshingForUpdate = ref(false)
let listenersRegistered = false

function detectStandaloneMode() {
  if (!import.meta.client) return false

  return window.matchMedia('(display-mode: standalone)').matches
    || Boolean((window.navigator as NavigatorWithStandalone).standalone)
}

function detectIos() {
  if (!import.meta.client) return false

  const platform = window.navigator.platform
  const userAgent = window.navigator.userAgent
  const isTouchMac = platform === 'MacIntel' && window.navigator.maxTouchPoints > 1

  return /iphone|ipad|ipod/i.test(userAgent) || isTouchMac
}

export function registerPwaInstallListeners() {
  if (!import.meta.client || listenersRegistered) return

  listenersRegistered = true
  isSupported.value = 'serviceWorker' in navigator
  isStandalone.value = detectStandaloneMode()
  isIos.value = detectIos()

  const displayModeQuery = window.matchMedia('(display-mode: standalone)')

  displayModeQuery.addEventListener('change', () => {
    isStandalone.value = detectStandaloneMode()
  })

  window.addEventListener('beforeinstallprompt', (event) => {
    event.preventDefault()
    installPrompt.value = event as BeforeInstallPromptEvent
  })

  window.addEventListener('appinstalled', () => {
    installPrompt.value = null
    isStandalone.value = true
  })
}

export function setPwaServiceWorkerReady(value: boolean) {
  isServiceWorkerReady.value = value
}

export function setPwaUpdateAvailable(registration: ServiceWorkerRegistration) {
  updateRegistration.value = registration
  isUpdateAvailable.value = true
}

export function dismissPwaUpdate() {
  isUpdateAvailable.value = false
}

export function usePwaInstall() {
  registerPwaInstallListeners()

  const canInstall = computed(() =>
    isSupported.value
    && Boolean(installPrompt.value)
    && !isStandalone.value
  )
  const canShowManualInstallHelp = computed(() =>
    isIos.value
    && !isStandalone.value
  )

  const installApp = async () => {
    const prompt = installPrompt.value

    if (!prompt || isInstalling.value) return

    isInstalling.value = true

    try {
      await prompt.prompt()
      await prompt.userChoice.catch(() => null)
      installPrompt.value = null
    } finally {
      isInstalling.value = false
    }
  }

  const applyPwaUpdate = () => {
    if (!import.meta.client || isRefreshingForUpdate.value) return

    const worker = updateRegistration.value?.waiting

    if (!worker) {
      isUpdateAvailable.value = false

      return
    }

    let didReload = false

    isRefreshingForUpdate.value = true
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (didReload) return

      didReload = true
      window.location.reload()
    }, { once: true })

    worker.postMessage({ type: 'SKIP_WAITING' })

    window.setTimeout(() => {
      if (!didReload) {
        window.location.reload()
      }
    }, 1500)
  }

  return {
    applyPwaUpdate,
    canInstall,
    canShowManualInstallHelp,
    dismissPwaUpdate,
    installApp,
    isPwaUpdateAvailable: readonly(isUpdateAvailable),
    isRefreshingForUpdate: readonly(isRefreshingForUpdate),
    isInstalling,
    isIos: readonly(isIos),
    isPwaStandalone: readonly(isStandalone),
    isPwaSupported: readonly(isSupported),
    isPwaServiceWorkerReady: readonly(isServiceWorkerReady)
  }
}
