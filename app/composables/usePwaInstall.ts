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
const isInstalling = ref(false)
let listenersRegistered = false

function detectStandaloneMode() {
  if (!import.meta.client) return false

  return window.matchMedia('(display-mode: standalone)').matches
    || Boolean((window.navigator as NavigatorWithStandalone).standalone)
}

export function registerPwaInstallListeners() {
  if (!import.meta.client || listenersRegistered) return

  listenersRegistered = true
  isSupported.value = 'serviceWorker' in navigator
  isStandalone.value = detectStandaloneMode()

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

export function usePwaInstall() {
  registerPwaInstallListeners()

  const canInstall = computed(() =>
    isSupported.value
    && Boolean(installPrompt.value)
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

  return {
    canInstall,
    installApp,
    isInstalling,
    isPwaStandalone: readonly(isStandalone),
    isPwaSupported: readonly(isSupported),
    isPwaServiceWorkerReady: readonly(isServiceWorkerReady)
  }
}
