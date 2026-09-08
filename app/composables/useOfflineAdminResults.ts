type OfflineAdminResultHighlight = {
  playerName: string
  atBats: number
  hits: number
  homeRuns: number
}

type OfflineAdminResultPayload = {
  homeScore: number
  awayScore: number
  innings: number
  isForfeit: boolean
  winningPitcherName: string
  losingPitcherName: string
  notes: string
  winnerHighlights: OfflineAdminResultHighlight[]
  loserHighlights: OfflineAdminResultHighlight[]
  offlineExpectedResult?: {
    id: string | null
    recordedAt: string | null
  }
}

type OfflineAdminLineupPayload = {
  homeLineup: {
    playerId: string
    battingOrder: number | null
  }[]
  awayLineup: {
    playerId: string
    battingOrder: number | null
  }[]
  offlineExpectedLineupEntryIds?: string[]
}

export type OfflineAdminResultDraft = {
  id: string
  gameId: string
  gameLabel: string
  type: 'RESULT' | 'LINEUP'
  payload: OfflineAdminResultPayload | OfflineAdminLineupPayload
  attempts: number
  lastError: string | null
  createdAt: string
  updatedAt: string
}

type QueueDraftInput = {
  gameId: string
  gameLabel: string
} & ({
  type: 'RESULT'
  payload: OfflineAdminResultPayload
} | {
  type: 'LINEUP'
  payload: OfflineAdminLineupPayload
})

type OfflineSyncResult = {
  synced: number
  failed: number
  completedAt: number
}

const storageKey = 'diamondpanel:offline-admin-results:v1'
let listenersAttached = false

export function useOfflineAdminResults() {
  const drafts = useState<OfflineAdminResultDraft[]>('offline-admin-results:drafts', () => [])
  const isLoaded = useState('offline-admin-results:loaded', () => false)
  const isOnline = useState('offline-admin-results:online', () => true)
  const isSyncing = useState('offline-admin-results:syncing', () => false)
  const lastSyncResult = useState<OfflineSyncResult | null>('offline-admin-results:last-sync-result', () => null)

  const sortedDrafts = computed(() =>
    [...drafts.value].sort((left, right) => new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime())
  )

  const pendingCount = computed(() => drafts.value.length)

  function loadDrafts() {
    if (!import.meta.client || isLoaded.value) return

    try {
      const stored = localStorage.getItem(storageKey)
      const parsed = stored ? JSON.parse(stored) : []

      drafts.value = normalizeStoredDrafts(parsed)
    } catch {
      drafts.value = []
    } finally {
      isLoaded.value = true
    }
  }

  function persistDrafts() {
    if (!import.meta.client) return

    try {
      localStorage.setItem(storageKey, JSON.stringify(drafts.value))
    } catch {
      // If storage is unavailable, keep the in-memory queue for this session.
    }
  }

  function queueDraft(input: QueueDraftInput) {
    loadDrafts()

    const now = new Date().toISOString()
    const id = `${input.type}:${input.gameId}`
    const existing = drafts.value.find(draft => draft.id === id)
    const draft: OfflineAdminResultDraft = {
      id,
      type: input.type,
      gameId: input.gameId,
      gameLabel: input.gameLabel,
      payload: cloneDraftPayload(input.payload),
      attempts: existing?.attempts ?? 0,
      lastError: null,
      createdAt: existing?.createdAt ?? now,
      updatedAt: now
    }

    drafts.value = [
      draft,
      ...drafts.value.filter(item => item.id !== id)
    ]
    persistDrafts()

    return draft
  }

  function removeDraft(id: string) {
    loadDrafts()
    drafts.value = drafts.value.filter(draft => draft.id !== id)
    persistDrafts()
  }

  function draftForGame(gameId: string, type?: OfflineAdminResultDraft['type']) {
    loadDrafts()

    return drafts.value.find(draft => draft.gameId === gameId && (!type || draft.type === type)) ?? null
  }

  async function syncDraft(draft: OfflineAdminResultDraft) {
    if (draft.type === 'RESULT') {
      await $fetch(`/api/admin/results/${draft.gameId}`, {
        method: 'PATCH',
        body: draft.payload
      })

      return
    }

    await $fetch(`/api/admin/results/${draft.gameId}/lineup`, {
      method: 'PATCH',
      body: draft.payload
    })
  }

  async function syncPendingDrafts() {
    loadDrafts()

    if (!import.meta.client || isSyncing.value || !isOnline.value || !drafts.value.length) {
      return { synced: 0, failed: 0, completedAt: Date.now() }
    }

    isSyncing.value = true
    let synced = 0
    let failed = 0

    try {
      const queue = [...drafts.value].sort((left, right) => new Date(left.createdAt).getTime() - new Date(right.createdAt).getTime())

      for (const draft of queue) {
        if (!isOnline.value) break

        try {
          await syncDraft(draft)
          synced += 1
          drafts.value = drafts.value.filter(item => item.id !== draft.id)
          persistDrafts()
        } catch (error) {
          failed += 1
          markDraftError(draft.id, readSyncError(error))

          if (isOfflineResultSyncError(error)) {
            isOnline.value = false
            break
          }
        }
      }
    } finally {
      isSyncing.value = false
      const result = { synced, failed, completedAt: Date.now() }
      lastSyncResult.value = result
    }

    return lastSyncResult.value
  }

  function markDraftError(id: string, message: string) {
    drafts.value = drafts.value.map((draft) => {
      if (draft.id !== id) return draft

      return {
        ...draft,
        attempts: draft.attempts + 1,
        lastError: message,
        updatedAt: new Date().toISOString()
      }
    })
    persistDrafts()
  }

  function updateOnlineState() {
    if (!import.meta.client) return

    isOnline.value = navigator.onLine
  }

  function attachListeners() {
    if (!import.meta.client || listenersAttached) return

    listenersAttached = true
    window.addEventListener('online', () => {
      isOnline.value = true
      void syncPendingDrafts()
    })
    window.addEventListener('offline', () => {
      isOnline.value = false
    })
  }

  onMounted(() => {
    loadDrafts()
    updateOnlineState()
    attachListeners()

    if (isOnline.value && drafts.value.length) {
      window.setTimeout(() => {
        void syncPendingDrafts()
      }, 500)
    }
  })

  return {
    drafts: sortedDrafts,
    isOnline,
    isSyncing,
    lastSyncResult,
    pendingCount,
    loadDrafts,
    queueDraft,
    removeDraft,
    draftForGame,
    syncPendingDrafts
  }
}

function cloneDraftPayload<T>(payload: T) {
  return JSON.parse(JSON.stringify(payload)) as T
}

export function isOfflineResultSyncError(error: unknown) {
  if (import.meta.client && !navigator.onLine) return true

  const status = readErrorStatus(error)

  if (status) return false

  const message = String((error as { message?: unknown })?.message ?? '').toLowerCase()

  return message.includes('fetch') || message.includes('network') || message.includes('failed') || message.includes('load failed')
}

function normalizeStoredDrafts(value: unknown) {
  if (!Array.isArray(value)) return []

  return value.filter(isOfflineDraft)
}

function isOfflineDraft(value: unknown): value is OfflineAdminResultDraft {
  if (!value || typeof value !== 'object') return false

  const draft = value as Partial<OfflineAdminResultDraft>

  return typeof draft.id === 'string'
    && typeof draft.gameId === 'string'
    && typeof draft.gameLabel === 'string'
    && (draft.type === 'RESULT' || draft.type === 'LINEUP')
    && typeof draft.payload === 'object'
    && Boolean(draft.payload)
    && typeof draft.createdAt === 'string'
    && typeof draft.updatedAt === 'string'
}

function readErrorStatus(error: unknown) {
  if (!error || typeof error !== 'object') return 0

  const possibleError = error as {
    status?: unknown
    statusCode?: unknown
    response?: { status?: unknown }
    data?: { statusCode?: unknown }
  }
  const status = possibleError.status
    ?? possibleError.statusCode
    ?? possibleError.response?.status
    ?? possibleError.data?.statusCode

  return typeof status === 'number' ? status : 0
}

function readSyncError(error: unknown) {
  if (!error || typeof error !== 'object') return 'No se pudo sincronizar el borrador.'

  const possibleError = error as {
    data?: { statusMessage?: unknown, message?: unknown }
    statusMessage?: unknown
    message?: unknown
  }
  const message = possibleError.data?.statusMessage
    ?? possibleError.data?.message
    ?? possibleError.statusMessage
    ?? possibleError.message

  return typeof message === 'string' && message.trim()
    ? message
    : 'No se pudo sincronizar el borrador.'
}
