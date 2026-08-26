<script setup lang="ts">
import {
  branchColor,
  branchLabel,
  categoryColor,
  categoryLabel,
  formatGameDate,
  gameStatusColor,
  gameStatusLabel,
  roundLabel,
  type PlayoffEligibilityMode,
  type TeamBranch,
  type TeamCategory
} from '~/utils/league'
import {
  isOfflineResultSyncError,
  useOfflineAdminResults,
  type OfflineAdminResultDraft
} from '~/composables/useOfflineAdminResults'

definePageMeta({
  middleware: 'admin'
})

useSeoMeta({
  title: 'Resultados | DiamondPanel',
  description: 'Captura de marcadores, pitchers y bateadores destacados.'
})

type AdminResultPlayer = {
  id: string
  firstName: string
  lastName: string
  number: number | null
  position: string | null
  status: string
  memberRole: string
  teamId: string
}

type AdminResultTeam = {
  id: string
  name: string
  shortName: string | null
  slug: string
  logoUrl: string | null
  primaryColor: string | null
  secondaryColor: string | null
  category: TeamCategory
  branch: TeamBranch
  players: AdminResultPlayer[]
}

type AdminResultHighlight = {
  id: string
  side: 'WINNER' | 'LOSER'
  order: number
  atBats: number
  hits: number
  homeRuns: number
  teamId: string
  playerId: string | null
  playerName: string
  player: AdminResultPlayer | null
}

type AdminResultLineupEntry = {
  id: string
  teamId: string
  playerId: string
  battingOrder: number | null
  player: AdminResultPlayer
}

type AdminResultGame = {
  id: string
  round: number | null
  scheduledAt: string
  status: string
  notes: string | null
  field: {
    id: string
    name: string
  } | null
  homeTeam: AdminResultTeam
  awayTeam: AdminResultTeam
  result: {
    id: string
    homeScore: number
    awayScore: number
    innings: number | null
    isForfeit: boolean
    recordedAt: string
    notes: string | null
    winningPitcherId: string | null
    losingPitcherId: string | null
    winningPitcherName: string | null
    losingPitcherName: string | null
    winningPitcher: AdminResultPlayer | null
    losingPitcher: AdminResultPlayer | null
    battingHighlights: AdminResultHighlight[]
  } | null
  lineupEntries: AdminResultLineupEntry[]
}

type ResultsResponse = {
  season: {
    id: string
    name: string
    year: number
  } | null
  games: AdminResultGame[]
}

type PlayoffEligibilityPlayer = AdminResultPlayer & {
  lineupGames: number
  isPlayoffEligible: boolean
}

type PlayoffEligibilityTeam = {
  id: string
  name: string
  shortName: string | null
  slug: string
  category: TeamCategory
  branch: TeamBranch
  players: PlayoffEligibilityPlayer[]
}

type PlayoffEligibilityResponse = {
  season: {
    id: string
    name: string
    year: number
  } | null
  eligibilityMode: PlayoffEligibilityMode
  isOpenRoster: boolean
  minimumGames: number
  teams: PlayoffEligibilityTeam[]
}

type HighlightForm = {
  playerName: string
  atBats: number
  hits: number
  homeRuns: number
}

type LineupPlayerForm = {
  playerId: string
  selected: boolean
  battingOrder: number | null
}

const emptyHighlight = (): HighlightForm => ({
  playerName: '',
  atBats: 0,
  hits: 0,
  homeRuns: 0
})

const toast = useToast()
const { data, pending, refresh } = await useFetch<ResultsResponse>('/api/admin/results')
const { data: eligibilityData, refresh: refreshEligibility } = await useFetch<PlayoffEligibilityResponse>('/api/admin/playoff-eligibility')
const {
  drafts: offlineDrafts,
  isOnline,
  isSyncing: isSyncingOfflineDrafts,
  lastSyncResult,
  pendingCount: offlineDraftCount,
  queueDraft: queueOfflineDraft,
  removeDraft: removeOfflineDraft,
  draftForGame,
  syncPendingDrafts
} = useOfflineAdminResults()

const selectedGameId = ref<string | null>(null)
const isSavingResult = ref(false)
const isDeletingResult = ref(false)
const isSavingLineup = ref(false)
const editingResultId = ref<string | null>(null)
const search = ref('')
const selectedStatus = ref<'ALL' | 'PENDING' | 'FINAL'>('ALL')
const showBattingHighlights = ref(false)
const showLineupEditor = ref(false)
const resultPanelRef = ref<HTMLElement | null>(null)
const mobileSection = ref<'GAMES' | 'CAPTURE'>('GAMES')
const isResultCardModalOpen = ref(false)
const isSharingResultCard = ref(false)
const isDownloadingResultCard = ref(false)

const resultForm = reactive({
  homeScore: 0,
  awayScore: 0,
  innings: 7,
  isForfeit: false,
  winningPitcherName: '',
  losingPitcherName: '',
  notes: '',
  winnerHighlights: [emptyHighlight(), emptyHighlight(), emptyHighlight()],
  loserHighlights: [emptyHighlight(), emptyHighlight(), emptyHighlight()]
})
const lineupForm = reactive({
  home: [] as LineupPlayerForm[],
  away: [] as LineupPlayerForm[]
})

const games = computed(() => data.value?.games ?? [])
const selectedGame = computed(() => games.value.find(game => game.id === selectedGameId.value) ?? null)
const resultCardHref = computed(() =>
  selectedGame.value?.result ? `/api/admin/results/${selectedGame.value.id}/card.png` : ''
)
const selectedGameOfflineDrafts = computed(() =>
  selectedGame.value ? offlineDrafts.value.filter(draft => draft.gameId === selectedGame.value?.id) : []
)
const showResultForm = computed(() => Boolean(
  selectedGame.value && (!selectedGame.value.result || editingResultId.value === selectedGame.value.id)
))
const finalGames = computed(() => games.value.filter(game => game.result).length)
const pendingGames = computed(() => games.value.filter(game => !game.result).length)
const minimumLineupGames = computed(() => eligibilityData.value?.minimumGames ?? 5)
const isOpenRoster = computed(() => eligibilityData.value?.isOpenRoster ?? false)
const playoffPlayerMap = computed(() => {
  const map = new Map<string, PlayoffEligibilityPlayer>()

  for (const team of eligibilityData.value?.teams ?? []) {
    for (const player of team.players) {
      map.set(player.id, player)
    }
  }

  return map
})
const winnerSide = computed<'home' | 'away' | null>(() => {
  if (resultForm.homeScore === resultForm.awayScore) return null

  return resultForm.homeScore > resultForm.awayScore ? 'home' : 'away'
})
const winnerTeam = computed(() => {
  const game = selectedGame.value

  if (!game || !winnerSide.value) return null

  return winnerSide.value === 'home' ? game.homeTeam : game.awayTeam
})
const loserTeam = computed(() => {
  const game = selectedGame.value

  if (!game || !winnerSide.value) return null

  return winnerSide.value === 'home' ? game.awayTeam : game.homeTeam
})
const canSaveResult = computed(() =>
  Boolean(
    selectedGame.value
    && winnerTeam.value
    && loserTeam.value
    && resultForm.winningPitcherName.trim()
    && resultForm.losingPitcherName.trim()
  )
)
const filteredGames = computed(() => {
  const term = search.value.trim().toLowerCase()

  return games.value.filter((game) => {
    const matchesSearch = !term
      || game.homeTeam.name.toLowerCase().includes(term)
      || game.awayTeam.name.toLowerCase().includes(term)
      || (game.field?.name ?? '').toLowerCase().includes(term)
    const matchesStatus = selectedStatus.value === 'ALL'
      || (selectedStatus.value === 'FINAL' && Boolean(game.result))
      || (selectedStatus.value === 'PENDING' && !game.result)

    return matchesSearch && matchesStatus
  })
})

watch(games, (availableGames) => {
  if (!selectedGameId.value && availableGames.length) {
    selectedGameId.value = availableGames[0]?.id ?? null
  }
}, { immediate: true })

watch(selectedGame, (game) => {
  editingResultId.value = null
  hydrateResultForm(game)
  hydrateLineupForm(game)
  showBattingHighlights.value = Boolean(game?.result?.battingHighlights.length)
  showLineupEditor.value = !game?.lineupEntries.length
}, { immediate: true })

watch(() => resultForm.isForfeit, (isForfeit) => {
  if (!isForfeit) return

  setForfeitWinner(winnerSide.value ?? 'home')
  showBattingHighlights.value = false
})

const lastObservedSyncResultAt = ref(0)

watch(lastSyncResult, async (result) => {
  if (!result || result.completedAt === lastObservedSyncResultAt.value) return

  lastObservedSyncResultAt.value = result.completedAt

  if (result.synced) {
    await Promise.all([refresh(), refreshEligibility()])
    showFeedback(result.synced === 1 ? 'Borrador sincronizado.' : `${result.synced} borradores sincronizados.`)
  }

  if (result.failed) {
    showError(result.failed === 1
      ? 'Un borrador no se pudo sincronizar. Revisa si hubo cambios en el servidor.'
      : `${result.failed} borradores no se pudieron sincronizar. Revisa si hubo cambios en el servidor.`)
  }
})

function playerLabel(player: AdminResultPlayer) {
  const number = player.number === null ? '' : `#${player.number} `

  return `${number}${player.firstName} ${player.lastName}`
}

function savedPlayerName(name: string | null | undefined, player?: AdminResultPlayer | null) {
  return name?.trim() || (player ? playerLabel(player) : '')
}

function adminTeamInitials(team: AdminResultTeam) {
  return team.shortName ?? team.name.slice(0, 2).toUpperCase()
}

function battingLine(highlight: AdminResultHighlight) {
  const hrText = highlight.homeRuns ? `, ${highlight.homeRuns} HR` : ''

  return `${savedPlayerName(highlight.playerName, highlight.player)} ${highlight.hits}-${highlight.atBats}${hrText}`
}

function lineupText(entry: AdminResultLineupEntry) {
  const order = entry.battingOrder ? `${entry.battingOrder}. ` : ''

  return `${order}${playerLabel(entry.player)}`
}

function lineupFormPlayerLabel(team: AdminResultTeam, playerId: string) {
  const player = team.players.find(item => item.id === playerId)

  return player ? playerLabel(player) : 'Jugador'
}

function lineupRowsForTeam(game: AdminResultGame, teamId: string) {
  return game.lineupEntries
    .filter(entry => entry.teamId === teamId)
    .sort((left, right) => {
      const leftOrder = left.battingOrder ?? 999
      const rightOrder = right.battingOrder ?? 999

      return leftOrder - rightOrder || playerLabel(left.player).localeCompare(playerLabel(right.player))
    })
}

function selectedLineupCount(side: 'home' | 'away') {
  return lineupForm[side].filter(player => player.selected).length
}

function gameLabel(game: AdminResultGame) {
  return `${game.homeTeam.name} vs ${game.awayTeam.name}`
}

function resultCardFilename() {
  const game = selectedGame.value

  if (!game) return 'resultado.png'

  return `${slugifyFilename(gameLabel(game))}.png`
}

function slugifyFilename(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/gi, '-')
    .replace(/^-|-$/g, '')
    .toLowerCase()
    .slice(0, 80) || 'resultado'
}

function openResultCardModal() {
  if (!resultCardHref.value) return

  isResultCardModalOpen.value = true
}

async function fetchResultCardBlob() {
  if (!resultCardHref.value) {
    throw new Error('Result card is not available')
  }

  const response = await fetch(resultCardHref.value)

  if (!response.ok) {
    throw new Error('Result card could not be loaded')
  }

  return await response.blob()
}

function triggerResultCardDownload(blob: Blob) {
  const objectUrl = URL.createObjectURL(blob)
  const link = document.createElement('a')

  link.href = objectUrl
  link.download = resultCardFilename()
  document.body.append(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(objectUrl)
}

async function downloadResultCard(options: { quiet?: boolean } = {}) {
  if (!import.meta.client) return

  isDownloadingResultCard.value = true

  try {
    const blob = await fetchResultCardBlob()

    triggerResultCardDownload(blob)
    if (!options.quiet) showFeedback('Imagen descargada.')
  } catch {
    showError('No se pudo descargar la imagen. Intenta abrirla en otra pestaña.')
  } finally {
    isDownloadingResultCard.value = false
  }
}

async function shareResultCard() {
  if (!import.meta.client || !selectedGame.value) return

  isSharingResultCard.value = true

  try {
    const blob = await fetchResultCardBlob()
    const file = new File([blob], resultCardFilename(), { type: 'image/png' })
    const shareData: ShareData = {
      title: 'Resultado de juego',
      text: gameLabel(selectedGame.value),
      files: [file]
    }

    if (navigator.share && (!navigator.canShare || navigator.canShare(shareData))) {
      await navigator.share(shareData)

      return
    }

    triggerResultCardDownload(blob)
    showFeedback('Tu dispositivo no permite compartir directo; descargué la imagen.')
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') return

    showError('No se pudo compartir la imagen. Intenta descargarla.')
  } finally {
    isSharingResultCard.value = false
  }
}

function hasOfflineDraft(gameId: string, type?: OfflineAdminResultDraft['type']) {
  return Boolean(draftForGame(gameId, type))
}

function offlineDraftTypeLabel(draft: OfflineAdminResultDraft) {
  return draft.type === 'RESULT' ? 'Resultado' : 'Lineup'
}

function offlineDraftUpdatedText(draft: OfflineAdminResultDraft) {
  return new Intl.DateTimeFormat('es-MX', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit'
  }).format(new Date(draft.updatedAt))
}

function discardOfflineDraft(draft: OfflineAdminResultDraft) {
  removeOfflineDraft(draft.id)
  toast.add({
    title: 'Borrador descartado',
    description: draft.gameLabel,
    color: 'neutral',
    icon: 'i-lucide-trash-2'
  })
}

async function syncOfflineDraftsManually() {
  if (!isOnline.value) {
    showError('Todavía no hay conexión. Los borradores se guardan en este dispositivo.')

    return
  }

  const result = await syncPendingDrafts()

  if (!result.synced && !result.failed) {
    toast.add({
      title: 'Sin borradores pendientes',
      color: 'neutral',
      icon: 'i-lucide-check'
    })
  }
}

function selectGame(gameId: string) {
  selectedGameId.value = gameId
  mobileSection.value = 'CAPTURE'

  if (!import.meta.client || !window.matchMedia('(max-width: 1279px)').matches) return

  void nextTick(() => {
    resultPanelRef.value?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  })
}

function clampNumber(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max)
}

function adjustScore(side: 'home' | 'away', amount: number) {
  if (resultForm.isForfeit) return

  if (side === 'home') {
    resultForm.homeScore = clampNumber(Number(resultForm.homeScore || 0) + amount, 0, 999)
  } else {
    resultForm.awayScore = clampNumber(Number(resultForm.awayScore || 0) + amount, 0, 999)
  }
}

function adjustInnings(amount: number) {
  if (resultForm.isForfeit) return

  resultForm.innings = clampNumber(Number(resultForm.innings || 7) + amount, 1, 20)
}

function playoffStatus(playerId: string) {
  const player = playoffPlayerMap.value.get(playerId)
  const lineupGames = player?.lineupGames ?? 0
  const missingGames = Math.max(minimumLineupGames.value - lineupGames, 0)

  return {
    lineupGames,
    missingGames,
    isEligible: isOpenRoster.value || lineupGames >= minimumLineupGames.value
  }
}

function eligibilityRowsForTeam(teamId: string) {
  return eligibilityData.value?.teams.find(team => team.id === teamId)?.players ?? []
}

function scoreText(game: AdminResultGame) {
  if (!game.result) return 'Pendiente'

  return `${game.result.homeScore}-${game.result.awayScore}`
}

function resultWinner(game: AdminResultGame) {
  if (!game.result) return 'Sin resultado'
  if (game.result.homeScore === game.result.awayScore) return 'Empate'

  return game.result.homeScore > game.result.awayScore
    ? game.homeTeam.name
    : game.awayTeam.name
}

function resultLoser(game: AdminResultGame) {
  if (!game.result || game.result.homeScore === game.result.awayScore) return ''

  return game.result.homeScore > game.result.awayScore
    ? game.awayTeam.name
    : game.homeTeam.name
}

function normalizeHighlights(highlights: AdminResultHighlight[], side: 'WINNER' | 'LOSER') {
  const rows = highlights
    .filter(highlight => highlight.side === side)
    .sort((left, right) => left.order - right.order)
    .slice(0, 3)
    .map(highlight => ({
      playerName: savedPlayerName(highlight.playerName, highlight.player),
      atBats: highlight.atBats,
      hits: highlight.hits,
      homeRuns: highlight.homeRuns
    }))

  while (rows.length < 3) {
    rows.push(emptyHighlight())
  }

  return rows
}

function hydrateResultForm(game: AdminResultGame | null) {
  if (!game) return

  resultForm.homeScore = game.result?.homeScore ?? 0
  resultForm.awayScore = game.result?.awayScore ?? 0
  resultForm.innings = game.result?.innings ?? 7
  resultForm.isForfeit = game.result?.isForfeit ?? false
  resultForm.winningPitcherName = savedPlayerName(game.result?.winningPitcherName, game.result?.winningPitcher)
  resultForm.losingPitcherName = savedPlayerName(game.result?.losingPitcherName, game.result?.losingPitcher)
  resultForm.notes = game.result?.notes ?? ''
  resultForm.winnerHighlights = resultForm.isForfeit ? emptyHighlights() : normalizeHighlights(game.result?.battingHighlights ?? [], 'WINNER')
  resultForm.loserHighlights = resultForm.isForfeit ? emptyHighlights() : normalizeHighlights(game.result?.battingHighlights ?? [], 'LOSER')
}

function hydrateLineupForm(game: AdminResultGame | null) {
  if (!game) {
    lineupForm.home = []
    lineupForm.away = []

    return
  }

  const entriesByPlayerId = new Map(game.lineupEntries.map(entry => [entry.playerId, entry]))

  lineupForm.home = game.homeTeam.players.map((player) => {
    const entry = entriesByPlayerId.get(player.id)

    return {
      playerId: player.id,
      selected: Boolean(entry),
      battingOrder: entry?.battingOrder ?? null
    }
  })
  lineupForm.away = game.awayTeam.players.map((player) => {
    const entry = entriesByPlayerId.get(player.id)

    return {
      playerId: player.id,
      selected: Boolean(entry),
      battingOrder: entry?.battingOrder ?? null
    }
  })
}

function emptyHighlights() {
  return [emptyHighlight(), emptyHighlight(), emptyHighlight()]
}

function setForfeitWinner(side: 'home' | 'away') {
  resultForm.homeScore = side === 'home' ? 7 : 0
  resultForm.awayScore = side === 'away' ? 7 : 0
  resultForm.innings = 7
  resultForm.winningPitcherName = ''
  resultForm.losingPitcherName = ''
  resultForm.winnerHighlights = emptyHighlights()
  resultForm.loserHighlights = emptyHighlights()
}

function showFeedback(message: string) {
  toast.add({
    title: message,
    color: 'success',
    icon: 'i-lucide-check-circle-2'
  })
}

function showError(message: string) {
  toast.add({
    title: 'No se pudo completar la acción',
    description: message,
    color: 'error',
    icon: 'i-lucide-circle-alert'
  })
}

function resultPayload(options: { offlineGuard?: boolean } = {}) {
  const payload = {
    homeScore: resultForm.homeScore,
    awayScore: resultForm.awayScore,
    innings: resultForm.innings,
    isForfeit: resultForm.isForfeit,
    winningPitcherName: resultForm.winningPitcherName,
    losingPitcherName: resultForm.losingPitcherName,
    notes: resultForm.notes,
    winnerHighlights: resultForm.isForfeit ? [] : resultForm.winnerHighlights,
    loserHighlights: resultForm.isForfeit ? [] : resultForm.loserHighlights
  }

  if (!options.offlineGuard || !selectedGame.value) return payload

  return {
    ...payload,
    offlineExpectedResult: {
      id: selectedGame.value.result?.id ?? null,
      recordedAt: selectedGame.value.result?.recordedAt ?? null
    }
  }
}

function lineupPayload(options: { offlineGuard?: boolean } = {}) {
  const payload = {
    homeLineup: normalizedLineupRows(lineupForm.home),
    awayLineup: normalizedLineupRows(lineupForm.away)
  }

  if (!options.offlineGuard || !selectedGame.value) return payload

  return {
    ...payload,
    offlineExpectedLineupEntryIds: selectedGame.value.lineupEntries.map(entry => entry.id)
  }
}

function normalizedLineupRows(rows: LineupPlayerForm[]) {
  return rows
    .filter(row => row.selected)
    .map(row => ({
      playerId: row.playerId,
      battingOrder: normalizeLineupOrder(row.battingOrder)
    }))
}

function normalizeLineupOrder(value: unknown) {
  const order = Number(value)

  return Number.isInteger(order) && order > 0 ? order : null
}

function hasDuplicateLineupOrders(rows: LineupPlayerForm[]) {
  const orders = rows
    .filter(row => row.selected)
    .map(row => normalizeLineupOrder(row.battingOrder))
    .filter((order): order is number => order !== null)

  return new Set(orders).size !== orders.length
}

function handleLineupSelectionChange(row: LineupPlayerForm) {
  if (!row.selected) {
    row.battingOrder = null
  }
}

async function saveResult() {
  const game = selectedGame.value

  if (!game || !canSaveResult.value) {
    showError(resultForm.isForfeit
      ? 'El resultado por default debe quedar 7-0 y llevar pitcher ganador y derrotado.'
      : 'Captura marcador, pitcher ganador y pitcher derrotado.')

    return
  }

  isSavingResult.value = true

  try {
    await $fetch(`/api/admin/results/${game.id}`, {
      method: 'PATCH',
      body: resultPayload()
    })
    await refresh()
    editingResultId.value = null
    showFeedback('Resultado guardado. Imagen lista para compartir.')
  } catch (error) {
    if (isOfflineResultSyncError(error)) {
      queueOfflineDraft({
        type: 'RESULT',
        gameId: game.id,
        gameLabel: gameLabel(game),
        payload: resultPayload({ offlineGuard: true })
      })
      showFeedback('Sin conexión. Resultado guardado como borrador en este dispositivo.')

      return
    }

    const statusMessage = typeof error === 'object' && error && 'data' in error
      ? String((error as { data?: { statusMessage?: unknown } }).data?.statusMessage ?? '')
      : ''

    showError(statusMessage || 'Revisa el marcador, pitchers y bateadores.')
  } finally {
    isSavingResult.value = false
  }
}

async function deleteResult() {
  const game = selectedGame.value

  if (!game?.result) return

  isDeletingResult.value = true

  try {
    await $fetch(`/api/admin/results/${game.id}`, {
      method: 'DELETE'
    })
    await refresh()
    editingResultId.value = null
    showFeedback('Captura eliminada.')
  } catch (error) {
    const statusMessage = typeof error === 'object' && error && 'data' in error
      ? String((error as { data?: { statusMessage?: unknown } }).data?.statusMessage ?? '')
      : ''

    showError(statusMessage || 'No se pudo eliminar la captura.')
  } finally {
    isDeletingResult.value = false
  }
}

async function saveLineup() {
  const game = selectedGame.value

  if (!game) return

  if (hasDuplicateLineupOrders(lineupForm.home) || hasDuplicateLineupOrders(lineupForm.away)) {
    showError('El orden al bat no se puede repetir dentro del mismo equipo.')

    return
  }

  isSavingLineup.value = true

  try {
    await $fetch(`/api/admin/results/${game.id}/lineup`, {
      method: 'PATCH',
      body: lineupPayload()
    })
    await Promise.all([refresh(), refreshEligibility()])
    showLineupEditor.value = false
    showFeedback('Lineups guardados.')
  } catch (error) {
    if (isOfflineResultSyncError(error)) {
      queueOfflineDraft({
        type: 'LINEUP',
        gameId: game.id,
        gameLabel: gameLabel(game),
        payload: lineupPayload({ offlineGuard: true })
      })
      showLineupEditor.value = false
      showFeedback('Sin conexión. Lineup guardado como borrador en este dispositivo.')

      return
    }

    const statusMessage = typeof error === 'object' && error && 'data' in error
      ? String((error as { data?: { statusMessage?: unknown } }).data?.statusMessage ?? '')
      : ''

    showError(statusMessage || 'Revisa los jugadores seleccionados.')
  } finally {
    isSavingLineup.value = false
  }
}

function editSelectedResult() {
  const game = selectedGame.value

  if (!game?.result) return

  editingResultId.value = game.id
}
</script>

<template>
  <UContainer class="min-w-0 max-w-full overflow-x-hidden pb-6 pt-4 sm:py-8">
    <div class="mb-6 flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
      <div class="min-w-0">
        <UBadge
          color="primary"
          variant="subtle"
          icon="i-lucide-clipboard-check"
        >
          Resultados
        </UBadge>
        <h1 class="mt-3 text-2xl font-bold leading-tight tracking-normal text-highlighted sm:text-4xl">
          Captura de resultados
        </h1>
        <p class="mt-2 max-w-2xl text-sm text-muted sm:text-base">
          {{ data?.season ? `${data.season.name} ${data.season.year}` : 'Temporada activa requerida' }}
        </p>
      </div>

      <div class="grid min-w-0 grid-cols-3 gap-2 rounded-lg border border-default bg-default p-2 text-center shadow-sm">
        <div class="min-w-0 rounded-md bg-muted/40 px-2 py-2 sm:px-3">
          <p class="text-xl font-bold text-highlighted">
            {{ games.length }}
          </p>
          <p class="text-xs text-muted">
            Juegos
          </p>
        </div>
        <div class="min-w-0 rounded-md bg-muted/40 px-2 py-2 sm:px-3">
          <p class="text-xl font-bold text-highlighted">
            {{ finalGames }}
          </p>
          <p class="text-xs text-muted">
            Capturados
          </p>
        </div>
        <div class="min-w-0 rounded-md bg-muted/40 px-2 py-2 sm:px-3">
          <p class="text-xl font-bold text-highlighted">
            {{ pendingGames }}
          </p>
          <p class="text-xs text-muted">
            Pendientes
          </p>
        </div>
      </div>
    </div>

    <section
      v-if="offlineDraftCount"
      class="mb-4 rounded-lg border border-warning/30 bg-warning/10 p-3 shadow-sm"
    >
      <div class="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div class="min-w-0">
          <div class="mb-1 flex flex-wrap items-center gap-2">
            <UBadge
              :color="isOnline ? 'warning' : 'error'"
              variant="subtle"
              :icon="isOnline ? 'i-lucide-cloud-upload' : 'i-lucide-wifi-off'"
            >
              {{ isOnline ? 'Borradores pendientes' : 'Sin conexión' }}
            </UBadge>
            <UBadge
              color="neutral"
              variant="outline"
            >
              {{ offlineDraftCount }} en este dispositivo
            </UBadge>
          </div>
          <p class="text-sm text-highlighted">
            Estos cambios todavía no están en el servidor. Se sincronizarán automáticamente cuando vuelva la conexión.
          </p>
        </div>

        <UButton
          type="button"
          icon="i-lucide-refresh-cw"
          label="Sincronizar ahora"
          color="warning"
          variant="solid"
          size="sm"
          class="w-full justify-center lg:w-fit"
          :disabled="!isOnline"
          :loading="isSyncingOfflineDrafts"
          @click="syncOfflineDraftsManually"
        />
      </div>

      <div class="mt-3 grid gap-2">
        <article
          v-for="draft in offlineDrafts"
          :key="draft.id"
          class="grid gap-2 rounded-md border border-warning/25 bg-default/75 p-2 text-sm sm:grid-cols-[auto_minmax(0,1fr)_auto] sm:items-center"
        >
          <UBadge
            color="warning"
            variant="subtle"
          >
            {{ offlineDraftTypeLabel(draft) }}
          </UBadge>
          <div class="min-w-0">
            <p class="truncate font-semibold text-highlighted">
              {{ draft.gameLabel }}
            </p>
            <p class="text-xs text-muted">
              {{ draft.lastError || `Guardado ${offlineDraftUpdatedText(draft)}` }}
            </p>
          </div>
          <UButton
            type="button"
            icon="i-lucide-trash-2"
            label="Descartar"
            color="neutral"
            variant="ghost"
            size="xs"
            class="w-fit"
            @click="discardOfflineDraft(draft)"
          />
        </article>
      </div>
    </section>

    <section
      v-if="!data?.season"
      class="rounded-lg border border-dashed border-default p-8 text-center"
    >
      <UIcon
        name="i-lucide-calendar-x"
        class="mx-auto mb-3 size-8 text-muted"
      />
      <p class="font-semibold text-highlighted">
        Crea y activa una temporada para capturar resultados.
      </p>
    </section>

    <div
      v-if="data?.season"
      class="mb-4 grid grid-cols-2 gap-1 rounded-lg bg-muted/40 p-1 text-sm xl:hidden"
    >
      <button
        type="button"
        class="inline-flex h-10 items-center justify-center gap-2 rounded-md font-bold transition"
        :class="mobileSection === 'GAMES' ? 'bg-default text-highlighted shadow-sm' : 'text-muted'"
        @click="mobileSection = 'GAMES'"
      >
        <UIcon
          name="i-lucide-list-checks"
          class="size-4"
        />
        Juegos
      </button>
      <button
        type="button"
        class="inline-flex h-10 items-center justify-center gap-2 rounded-md font-bold transition disabled:opacity-45"
        :class="mobileSection === 'CAPTURE' ? 'bg-default text-highlighted shadow-sm' : 'text-muted'"
        :disabled="!selectedGame"
        @click="mobileSection = 'CAPTURE'"
      >
        <UIcon
          name="i-lucide-clipboard-pen"
          class="size-4"
        />
        Captura
      </button>
    </div>

    <section
      v-if="data?.season"
      class="grid min-w-0 gap-4 xl:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]"
    >
      <section
        class="min-w-0 overflow-hidden rounded-lg border border-default bg-default p-2.5 shadow-sm sm:p-3 xl:flex xl:max-h-192 xl:flex-col"
        :class="mobileSection === 'GAMES' ? '' : 'hidden xl:flex'"
      >
        <div class="mb-2.5 grid gap-2 lg:grid-cols-[1fr_auto] lg:items-end">
          <div>
            <h2 class="text-base font-bold text-highlighted">
              Partidos del rol
            </h2>
            <p class="text-xs text-muted">
              {{ pending ? 'Cargando...' : `${filteredGames.length} visibles` }}
            </p>
          </div>

          <div class="grid min-w-0 gap-2 sm:grid-cols-2 lg:min-w-90">
            <UInput
              v-model="search"
              icon="i-lucide-search"
              placeholder="Buscar"
              class="min-w-0"
            />
            <select
              v-model="selectedStatus"
              class="h-10 min-w-0 max-w-full rounded-md border border-default bg-default px-3 text-sm text-highlighted outline-none focus:border-primary"
            >
              <option value="ALL">
                Todos
              </option>
              <option value="PENDING">
                Pendientes
              </option>
              <option value="FINAL">
                Capturados
              </option>
            </select>
          </div>
        </div>

        <div class="grid gap-2 overflow-y-auto pr-1 xl:min-h-0 xl:flex-1">
          <button
            v-for="game in filteredGames"
            :key="game.id"
            type="button"
            class="min-w-0 rounded-lg border p-2 text-left transition-colors"
            :class="selectedGameId === game.id ? 'border-primary bg-primary/5' : 'border-default hover:border-primary'"
            @click="selectGame(game.id)"
          >
            <div class="mb-2 flex flex-wrap items-center justify-between gap-2">
              <div class="flex flex-wrap gap-1.5">
                <UBadge
                  :color="game.result ? 'success' : 'neutral'"
                  variant="subtle"
                >
                  {{ game.result ? 'Capturado' : 'Pendiente' }}
                </UBadge>
                <UBadge
                  color="primary"
                  variant="outline"
                >
                  {{ roundLabel(game.round) }}
                </UBadge>
                <UBadge
                  :color="gameStatusColor(game.status)"
                  variant="subtle"
                >
                  {{ gameStatusLabel(game.status) }}
                </UBadge>
                <UBadge
                  v-if="hasOfflineDraft(game.id, 'RESULT')"
                  color="warning"
                  variant="subtle"
                  icon="i-lucide-cloud-off"
                >
                  Resultado offline
                </UBadge>
                <UBadge
                  v-if="hasOfflineDraft(game.id, 'LINEUP')"
                  color="warning"
                  variant="outline"
                  icon="i-lucide-list-checks"
                >
                  Lineup offline
                </UBadge>
              </div>
              <p class="text-sm font-bold text-highlighted">
                {{ scoreText(game) }}
              </p>
            </div>

            <div class="grid grid-cols-[1fr_auto_1fr] items-center gap-2">
              <div class="min-w-0">
                <p class="truncate font-semibold text-highlighted">
                  {{ game.homeTeam.name }}
                </p>
                <p class="text-xs text-muted">
                  Local
                </p>
              </div>
              <span class="text-xs font-bold text-muted">vs</span>
              <div class="min-w-0 text-right">
                <p class="truncate font-semibold text-highlighted">
                  {{ game.awayTeam.name }}
                </p>
                <p class="text-xs text-muted">
                  Visitante
                </p>
              </div>
            </div>

            <p class="mt-2 text-xs text-muted">
              {{ formatGameDate(game.scheduledAt) }} · {{ game.field?.name ?? 'Campo por definir' }}
            </p>
          </button>
        </div>
      </section>

      <div
        ref="resultPanelRef"
        class="min-w-0 scroll-mt-4 gap-4 xl:grid"
        :class="mobileSection === 'CAPTURE' ? 'grid' : 'hidden xl:grid'"
      >
        <section
          v-if="selectedGameOfflineDrafts.length"
          class="rounded-lg border border-warning/30 bg-warning/10 p-3 text-sm"
        >
          <div class="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p class="font-semibold text-highlighted">
                Cambios pendientes de sincronizar
              </p>
              <p class="text-muted">
                {{ selectedGameOfflineDrafts.map(offlineDraftTypeLabel).join(' y ') }} guardado en este dispositivo.
              </p>
            </div>
            <UBadge
              :color="isOnline ? 'warning' : 'error'"
              variant="subtle"
            >
              {{ isOnline ? 'Pendiente' : 'Offline' }}
            </UBadge>
          </div>
        </section>

        <section
          v-if="selectedGame && selectedGame.result && !showResultForm"
          class="rounded-lg border border-default bg-default p-2.5 shadow-sm sm:p-3"
        >
          <div class="mb-3 flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <div class="mb-2 flex flex-wrap gap-1.5">
                <UBadge
                  color="success"
                  variant="subtle"
                  icon="i-lucide-check-circle-2"
                >
                  Resultado capturado
                </UBadge>
                <UBadge
                  :color="categoryColor(selectedGame.homeTeam.category)"
                  variant="subtle"
                >
                  {{ categoryLabel(selectedGame.homeTeam.category) }}
                </UBadge>
                <UBadge
                  :color="branchColor(selectedGame.homeTeam.branch)"
                  variant="subtle"
                >
                  {{ branchLabel(selectedGame.homeTeam.branch) }}
                </UBadge>
                <UBadge
                  color="primary"
                  variant="outline"
                >
                  {{ roundLabel(selectedGame.round) }}
                </UBadge>
              </div>
              <h2 class="text-base font-bold text-highlighted">
                {{ selectedGame.homeTeam.name }} vs {{ selectedGame.awayTeam.name }}
              </h2>
              <p class="text-xs text-muted">
                {{ formatGameDate(selectedGame.scheduledAt) }} · {{ selectedGame.field?.name ?? 'Campo por definir' }}
              </p>
            </div>

            <div class="flex flex-wrap gap-2">
              <UButton
                v-if="resultCardHref"
                type="button"
                icon="i-lucide-image"
                label="Imagen"
                color="warning"
                variant="subtle"
                size="sm"
                @click="openResultCardModal"
              />
              <UButton
                type="button"
                icon="i-lucide-pencil"
                label="Editar resultado"
                color="primary"
                variant="subtle"
                size="sm"
                @click="editSelectedResult"
              />
              <UButton
                type="button"
                icon="i-lucide-trash-2"
                label="Quitar resultado"
                color="error"
                variant="subtle"
                size="sm"
                :loading="isDeletingResult"
                @click="deleteResult"
              />
            </div>
          </div>

          <div class="mb-3 grid gap-2 sm:grid-cols-[1fr_auto_1fr] sm:items-center">
            <div class="rounded-lg border border-default p-3">
              <div class="mb-3 flex items-center gap-2">
                <span
                  class="flex size-10 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white"
                  :style="{ backgroundColor: selectedGame.homeTeam.primaryColor ?? '#047857' }"
                >
                  {{ adminTeamInitials(selectedGame.homeTeam) }}
                </span>
                <div class="min-w-0">
                  <p class="truncate font-semibold text-highlighted">
                    {{ selectedGame.homeTeam.name }}
                  </p>
                  <p class="text-xs text-muted">
                    Local
                  </p>
                </div>
              </div>
              <p class="text-4xl font-bold text-highlighted">
                {{ selectedGame.result.homeScore }}
              </p>
            </div>

            <div class="hidden text-center text-xs font-bold text-muted sm:block">
              VS
            </div>

            <div class="rounded-lg border border-default p-3">
              <div class="mb-3 flex items-center gap-2">
                <span
                  class="flex size-10 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white"
                  :style="{ backgroundColor: selectedGame.awayTeam.primaryColor ?? '#f97316' }"
                >
                  {{ adminTeamInitials(selectedGame.awayTeam) }}
                </span>
                <div class="min-w-0">
                  <p class="truncate font-semibold text-highlighted">
                    {{ selectedGame.awayTeam.name }}
                  </p>
                  <p class="text-xs text-muted">
                    Visitante
                  </p>
                </div>
              </div>
              <p class="text-4xl font-bold text-highlighted">
                {{ selectedGame.result.awayScore }}
              </p>
            </div>
          </div>

          <div class="grid gap-2 rounded-lg border border-default p-3 text-sm sm:grid-cols-2">
            <div>
              <p class="text-xs font-semibold uppercase text-muted">
                Ganador
              </p>
              <p class="font-semibold text-highlighted">
                {{ resultWinner(selectedGame) }}
              </p>
            </div>
            <div v-if="resultLoser(selectedGame)">
              <p class="text-xs font-semibold uppercase text-muted">
                Derrotado
              </p>
              <p class="font-semibold text-highlighted">
                {{ resultLoser(selectedGame) }}
              </p>
            </div>
            <div>
              <p class="text-xs font-semibold uppercase text-muted">
                Tipo
              </p>
              <p class="font-semibold text-highlighted">
                {{ selectedGame.result.isForfeit ? 'Resultado por default' : 'Resultado regular' }}
              </p>
            </div>
            <div>
              <p class="text-xs font-semibold uppercase text-muted">
                Innings
              </p>
              <p class="font-semibold text-highlighted">
                {{ selectedGame.result.innings ?? 7 }}
              </p>
            </div>
            <div>
              <p class="text-xs font-semibold uppercase text-muted">
                Pitcher ganador
              </p>
              <p class="font-semibold text-highlighted">
                {{ savedPlayerName(selectedGame.result.winningPitcherName, selectedGame.result.winningPitcher) || 'Sin captura' }}
              </p>
            </div>
            <div>
              <p class="text-xs font-semibold uppercase text-muted">
                Pitcher derrotado
              </p>
              <p class="font-semibold text-highlighted">
                {{ savedPlayerName(selectedGame.result.losingPitcherName, selectedGame.result.losingPitcher) || 'Sin captura' }}
              </p>
            </div>
          </div>

          <div
            v-if="!selectedGame.result.isForfeit && selectedGame.result.battingHighlights.length"
            class="mt-3 grid gap-2 rounded-lg border border-default p-3 text-sm sm:grid-cols-2"
          >
            <div>
              <p class="mb-1 font-semibold text-highlighted">
                Bateadores · ganador
              </p>
              <p
                v-for="highlight in selectedGame.result.battingHighlights.filter(item => item.side === 'WINNER')"
                :key="highlight.id"
                class="text-muted"
              >
                {{ battingLine(highlight) }}
              </p>
            </div>
            <div>
              <p class="mb-1 font-semibold text-highlighted">
                Bateadores · derrotado
              </p>
              <p
                v-for="highlight in selectedGame.result.battingHighlights.filter(item => item.side === 'LOSER')"
                :key="highlight.id"
                class="text-muted"
              >
                {{ battingLine(highlight) }}
              </p>
            </div>
          </div>

          <div
            v-if="selectedGame.result.notes"
            class="mt-3 rounded-lg border border-default p-3 text-sm"
          >
            <p class="mb-1 text-xs font-semibold uppercase text-muted">
              Notas
            </p>
            <p class="text-highlighted">
              {{ selectedGame.result.notes }}
            </p>
          </div>
        </section>

        <form
          v-else-if="selectedGame && showResultForm"
          class="min-w-0 overflow-hidden rounded-lg border border-default bg-default p-2.5 shadow-sm sm:p-3"
          @submit.prevent="saveResult"
        >
          <div class="mb-3 flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <div class="mb-2 flex flex-wrap gap-1.5">
                <UBadge
                  :color="categoryColor(selectedGame.homeTeam.category)"
                  variant="subtle"
                >
                  {{ categoryLabel(selectedGame.homeTeam.category) }}
                </UBadge>
                <UBadge
                  :color="branchColor(selectedGame.homeTeam.branch)"
                  variant="subtle"
                >
                  {{ branchLabel(selectedGame.homeTeam.branch) }}
                </UBadge>
                <UBadge
                  color="primary"
                  variant="outline"
                >
                  {{ roundLabel(selectedGame.round) }}
                </UBadge>
              </div>
              <h2 class="text-base font-bold text-highlighted">
                {{ selectedGame.homeTeam.name }} vs {{ selectedGame.awayTeam.name }}
              </h2>
              <p class="text-xs text-muted">
                {{ formatGameDate(selectedGame.scheduledAt) }} · {{ selectedGame.field?.name ?? 'Campo por definir' }}
              </p>
            </div>

            <div
              v-if="selectedGame.result"
              class="flex flex-wrap gap-2"
            >
              <UButton
                type="button"
                icon="i-lucide-x"
                label="Cancelar edición"
                color="neutral"
                variant="subtle"
                size="sm"
                @click="editingResultId = null"
              />
              <UButton
                type="button"
                icon="i-lucide-trash-2"
                label="Quitar resultado"
                color="error"
                variant="subtle"
                size="sm"
                :loading="isDeletingResult"
                @click="deleteResult"
              />
            </div>
          </div>

          <div class="mb-3 grid min-w-0 gap-2 sm:grid-cols-2">
            <div class="min-w-0 rounded-lg border border-default p-2">
              <div class="mb-2 flex items-center gap-2">
                <span
                  class="flex size-10 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white"
                  :style="{ backgroundColor: selectedGame.homeTeam.primaryColor ?? '#047857' }"
                >
                  {{ adminTeamInitials(selectedGame.homeTeam) }}
                </span>
                <div class="min-w-0">
                  <p class="truncate font-semibold text-highlighted">
                    {{ selectedGame.homeTeam.name }}
                  </p>
                  <p class="text-xs text-muted">
                    Local
                  </p>
                </div>
              </div>
              <div class="grid grid-cols-[2.75rem_minmax(0,1fr)_2.75rem] gap-2">
                <UButton
                  type="button"
                  icon="i-lucide-minus"
                  aria-label="Restar carrera local"
                  color="neutral"
                  variant="outline"
                  :disabled="resultForm.isForfeit || resultForm.homeScore <= 0"
                  @click="adjustScore('home', -1)"
                />
                <UInput
                  v-model.number="resultForm.homeScore"
                  type="number"
                  min="0"
                  max="999"
                  required
                  :disabled="resultForm.isForfeit"
                  aria-label="Carreras local"
                  class="min-w-0 text-center"
                  :ui="{ base: 'text-center text-2xl font-bold' }"
                />
                <UButton
                  type="button"
                  icon="i-lucide-plus"
                  aria-label="Sumar carrera local"
                  color="primary"
                  variant="subtle"
                  :disabled="resultForm.isForfeit"
                  @click="adjustScore('home', 1)"
                />
              </div>
              <UButton
                v-if="resultForm.isForfeit"
                type="button"
                icon="i-lucide-check"
                label="Gana por default"
                :color="winnerSide === 'home' ? 'primary' : 'neutral'"
                :variant="winnerSide === 'home' ? 'solid' : 'subtle'"
                size="sm"
                class="mt-2 w-full justify-center"
                @click="setForfeitWinner('home')"
              />
            </div>

            <div class="min-w-0 rounded-lg border border-default p-2">
              <div class="mb-2 flex items-center gap-2">
                <span
                  class="flex size-10 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white"
                  :style="{ backgroundColor: selectedGame.awayTeam.primaryColor ?? '#f97316' }"
                >
                  {{ adminTeamInitials(selectedGame.awayTeam) }}
                </span>
                <div class="min-w-0">
                  <p class="truncate font-semibold text-highlighted">
                    {{ selectedGame.awayTeam.name }}
                  </p>
                  <p class="text-xs text-muted">
                    Visitante
                  </p>
                </div>
              </div>
              <div class="grid grid-cols-[2.75rem_minmax(0,1fr)_2.75rem] gap-2">
                <UButton
                  type="button"
                  icon="i-lucide-minus"
                  aria-label="Restar carrera visitante"
                  color="neutral"
                  variant="outline"
                  :disabled="resultForm.isForfeit || resultForm.awayScore <= 0"
                  @click="adjustScore('away', -1)"
                />
                <UInput
                  v-model.number="resultForm.awayScore"
                  type="number"
                  min="0"
                  max="999"
                  required
                  :disabled="resultForm.isForfeit"
                  aria-label="Carreras visitante"
                  class="min-w-0 text-center"
                  :ui="{ base: 'text-center text-2xl font-bold' }"
                />
                <UButton
                  type="button"
                  icon="i-lucide-plus"
                  aria-label="Sumar carrera visitante"
                  color="primary"
                  variant="subtle"
                  :disabled="resultForm.isForfeit"
                  @click="adjustScore('away', 1)"
                />
              </div>
              <UButton
                v-if="resultForm.isForfeit"
                type="button"
                icon="i-lucide-check"
                label="Gana por default"
                :color="winnerSide === 'away' ? 'primary' : 'neutral'"
                :variant="winnerSide === 'away' ? 'solid' : 'subtle'"
                size="sm"
                class="mt-2 w-full justify-center"
                @click="setForfeitWinner('away')"
              />
            </div>
          </div>

          <div class="mb-3 grid min-w-0 gap-2 sm:grid-cols-3">
            <label class="grid min-w-0 gap-1.5 text-sm">
              <span class="font-medium text-highlighted">Innings</span>
              <div class="grid grid-cols-[2.75rem_minmax(0,1fr)_2.75rem] gap-2">
                <UButton
                  type="button"
                  icon="i-lucide-minus"
                  aria-label="Restar inning"
                  color="neutral"
                  variant="outline"
                  :disabled="resultForm.isForfeit || resultForm.innings <= 1"
                  @click="adjustInnings(-1)"
                />
                <UInput
                  v-model.number="resultForm.innings"
                  type="number"
                  min="1"
                  max="20"
                  required
                  :disabled="resultForm.isForfeit"
                  class="min-w-0 text-center"
                  :ui="{ base: 'text-center font-bold' }"
                />
                <UButton
                  type="button"
                  icon="i-lucide-plus"
                  aria-label="Sumar inning"
                  color="primary"
                  variant="subtle"
                  :disabled="resultForm.isForfeit"
                  @click="adjustInnings(1)"
                />
              </div>
            </label>

            <label class="grid min-w-0 gap-1.5 text-sm sm:col-span-2">
              <span class="font-medium text-highlighted">Forfeit</span>
              <label class="flex min-h-10 items-center gap-2 rounded-md border border-default px-3 py-2 text-sm">
                <input
                  v-model="resultForm.isForfeit"
                  type="checkbox"
                  class="size-4"
                >
                <span class="text-highlighted">Resultado por default</span>
              </label>
            </label>
          </div>

          <div
            v-if="resultForm.isForfeit && winnerTeam && loserTeam"
            class="mb-3 rounded-lg border border-primary/30 bg-primary/10 p-3 text-sm text-highlighted"
          >
            Se guardará {{ winnerTeam.name }} 7, {{ loserTeam.name }} 0. Captura únicamente pitchers; sin bateadores destacados.
          </div>

          <div
            v-if="winnerTeam && loserTeam"
            class="mb-3 grid min-w-0 gap-2 lg:grid-cols-2"
          >
            <label class="grid min-w-0 gap-1.5 text-sm">
              <span class="font-medium text-highlighted">Pitcher ganador · {{ winnerTeam.name }}</span>
              <UInput
                v-model="resultForm.winningPitcherName"
                required
                maxlength="80"
                placeholder="Nombre del pitcher ganador"
                class="min-w-0"
              />
            </label>

            <label class="grid min-w-0 gap-1.5 text-sm">
              <span class="font-medium text-highlighted">Pitcher derrotado · {{ loserTeam.name }}</span>
              <UInput
                v-model="resultForm.losingPitcherName"
                required
                maxlength="80"
                placeholder="Nombre del pitcher derrotado"
                class="min-w-0"
              />
            </label>
          </div>

          <div
            v-else
            class="mb-3 rounded-lg border border-warning/30 bg-warning/10 p-3 text-sm text-highlighted"
          >
            Define un marcador con ganador para capturar pitchers y bateadores.
          </div>

          <div
            v-if="!resultForm.isForfeit && winnerTeam && loserTeam"
            class="mb-3 flex flex-col gap-2 rounded-lg border border-default p-2 sm:flex-row sm:items-center sm:justify-between"
          >
            <div>
              <h3 class="text-sm font-bold text-highlighted">
                Bateadores destacados
              </h3>
              <p class="text-xs text-muted">
                Máximo 3 por equipo.
              </p>
            </div>
            <UButton
              type="button"
              :icon="showBattingHighlights ? 'i-lucide-chevron-up' : 'i-lucide-plus'"
              :label="showBattingHighlights ? 'Ocultar bateadores' : 'Agregar bateadores'"
              color="neutral"
              variant="outline"
              size="sm"
              class="w-full justify-center sm:w-fit"
              @click="showBattingHighlights = !showBattingHighlights"
            />
          </div>

          <div
            v-if="!resultForm.isForfeit && showBattingHighlights"
            class="mb-3 grid min-w-0 gap-3 lg:grid-cols-2"
          >
            <section class="min-w-0 rounded-lg border border-default p-2">
              <h3 class="mb-2 text-sm font-bold text-highlighted">
                Bateadores destacados · {{ winnerTeam?.name ?? 'Ganador' }}
              </h3>
              <div class="grid gap-2">
                <div class="hidden grid-cols-[1fr_4rem_4rem_4rem] gap-2 px-2 text-xs font-semibold text-muted sm:grid">
                  <span>Jugador</span>
                  <span>Turnos</span>
                  <span>Hits</span>
                  <span>HR</span>
                </div>
                <div
                  v-for="(highlight, index) in resultForm.winnerHighlights"
                  :key="`winner-${index}`"
                  class="grid min-w-0 gap-2 rounded-md bg-muted/30 p-2 sm:grid-cols-[1fr_4rem_4rem_4rem]"
                >
                  <label class="grid min-w-0 gap-1 text-xs font-medium text-muted sm:block">
                    <span class="sm:hidden">Jugador</span>
                    <UInput
                      v-model="highlight.playerName"
                      maxlength="80"
                      :placeholder="`Bateador ${index + 1}`"
                      aria-label="Bateador ganador"
                      class="min-w-0"
                    />
                  </label>
                  <label class="grid min-w-0 gap-1 text-xs font-medium text-muted sm:block">
                    <span class="sm:hidden">Turnos</span>
                    <UInput
                      v-model.number="highlight.atBats"
                      type="number"
                      min="0"
                      max="20"
                      aria-label="Turnos"
                      class="min-w-0"
                    />
                  </label>
                  <label class="grid min-w-0 gap-1 text-xs font-medium text-muted sm:block">
                    <span class="sm:hidden">Hits</span>
                    <UInput
                      v-model.number="highlight.hits"
                      type="number"
                      min="0"
                      max="20"
                      aria-label="Hits"
                      class="min-w-0"
                    />
                  </label>
                  <label class="grid min-w-0 gap-1 text-xs font-medium text-muted sm:block">
                    <span class="sm:hidden">HR</span>
                    <UInput
                      v-model.number="highlight.homeRuns"
                      type="number"
                      min="0"
                      max="20"
                      aria-label="Home runs"
                      class="min-w-0"
                    />
                  </label>
                </div>
              </div>
            </section>

            <section class="min-w-0 rounded-lg border border-default p-2">
              <h3 class="mb-2 text-sm font-bold text-highlighted">
                Bateadores destacados · {{ loserTeam?.name ?? 'Derrotado' }}
              </h3>
              <div class="grid gap-2">
                <div class="hidden grid-cols-[1fr_4rem_4rem_4rem] gap-2 px-2 text-xs font-semibold text-muted sm:grid">
                  <span>Jugador</span>
                  <span>Turnos</span>
                  <span>Hits</span>
                  <span>HR</span>
                </div>
                <div
                  v-for="(highlight, index) in resultForm.loserHighlights"
                  :key="`loser-${index}`"
                  class="grid min-w-0 gap-2 rounded-md bg-muted/30 p-2 sm:grid-cols-[1fr_4rem_4rem_4rem]"
                >
                  <label class="grid min-w-0 gap-1 text-xs font-medium text-muted sm:block">
                    <span class="sm:hidden">Jugador</span>
                    <UInput
                      v-model="highlight.playerName"
                      maxlength="80"
                      :placeholder="`Bateador ${index + 1}`"
                      aria-label="Bateador derrotado"
                      class="min-w-0"
                    />
                  </label>
                  <label class="grid min-w-0 gap-1 text-xs font-medium text-muted sm:block">
                    <span class="sm:hidden">Turnos</span>
                    <UInput
                      v-model.number="highlight.atBats"
                      type="number"
                      min="0"
                      max="20"
                      aria-label="Turnos"
                      class="min-w-0"
                    />
                  </label>
                  <label class="grid min-w-0 gap-1 text-xs font-medium text-muted sm:block">
                    <span class="sm:hidden">Hits</span>
                    <UInput
                      v-model.number="highlight.hits"
                      type="number"
                      min="0"
                      max="20"
                      aria-label="Hits"
                      class="min-w-0"
                    />
                  </label>
                  <label class="grid min-w-0 gap-1 text-xs font-medium text-muted sm:block">
                    <span class="sm:hidden">HR</span>
                    <UInput
                      v-model.number="highlight.homeRuns"
                      type="number"
                      min="0"
                      max="20"
                      aria-label="Home runs"
                      class="min-w-0"
                    />
                  </label>
                </div>
              </div>
            </section>
          </div>

          <label class="grid min-w-0 gap-1.5 text-sm">
            <span class="font-medium text-highlighted">Notas</span>
            <textarea
              v-model="resultForm.notes"
              rows="3"
              class="min-w-0 max-w-full rounded-md border border-default bg-default px-3 py-2 text-sm text-highlighted outline-none focus:border-primary"
              placeholder="Opcional"
            />
          </label>

          <div
            v-if="!resultForm.isForfeit && selectedGame.result?.battingHighlights.length"
            class="mt-3 grid gap-2 rounded-lg border border-default p-2 text-xs text-muted sm:grid-cols-2"
          >
            <div>
              <p class="mb-1 font-semibold text-highlighted">
                Ganador: {{ resultWinner(selectedGame) }}
              </p>
              <p
                v-for="highlight in selectedGame.result.battingHighlights.filter(item => item.side === 'WINNER')"
                :key="highlight.id"
              >
                {{ battingLine(highlight) }}
              </p>
            </div>
            <div>
              <p class="mb-1 font-semibold text-highlighted">
                Derrotado
              </p>
              <p
                v-for="highlight in selectedGame.result.battingHighlights.filter(item => item.side === 'LOSER')"
                :key="highlight.id"
              >
                {{ battingLine(highlight) }}
              </p>
            </div>
          </div>

          <UButton
            type="submit"
            icon="i-lucide-save"
            :label="isOnline ? 'Guardar resultado' : 'Guardar borrador offline'"
            color="primary"
            class="mt-3"
            :disabled="!canSaveResult"
            :loading="isSavingResult"
            block
          />
        </form>

        <section
          v-else
          class="rounded-lg border border-dashed border-default p-8 text-center"
        >
          <UIcon
            name="i-lucide-clipboard-x"
            class="mx-auto mb-3 size-8 text-muted"
          />
          <p class="font-semibold text-highlighted">
            No hay partidos disponibles para capturar.
          </p>
        </section>

        <section
          v-if="selectedGame"
          class="rounded-lg border border-default bg-default p-2.5 shadow-sm sm:p-3"
        >
          <div class="mb-3 flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h2 class="text-base font-bold text-highlighted">
                Lineups del partido
              </h2>
              <p class="text-xs text-muted">
                {{ isOpenRoster ? 'Lineups registrados como parte del partido.' : 'Cada jugador registrado aquí suma un juego para elegibilidad de playoffs.' }}
              </p>
            </div>
            <UButton
              type="button"
              :icon="showLineupEditor ? 'i-lucide-chevron-up' : 'i-lucide-list-plus'"
              :label="showLineupEditor ? 'Ocultar captura' : 'Editar lineups'"
              color="neutral"
              variant="outline"
              size="sm"
              class="w-fit"
              @click="showLineupEditor = !showLineupEditor"
            />
          </div>

          <div class="mb-3 grid gap-2 lg:grid-cols-2">
            <div class="rounded-lg border border-default p-2">
              <div class="mb-2 flex items-center justify-between gap-2">
                <p class="font-semibold text-highlighted">
                  {{ selectedGame.homeTeam.name }}
                </p>
                <UBadge
                  color="neutral"
                  variant="outline"
                >
                  {{ lineupRowsForTeam(selectedGame, selectedGame.homeTeam.id).length }} jugadores
                </UBadge>
              </div>

              <div
                v-if="lineupRowsForTeam(selectedGame, selectedGame.homeTeam.id).length"
                class="grid gap-1.5 text-sm"
              >
                <div
                  v-for="entry in lineupRowsForTeam(selectedGame, selectedGame.homeTeam.id)"
                  :key="entry.id"
                  class="flex items-center justify-between gap-2 rounded-md bg-muted/30 px-2 py-1.5"
                >
                  <span class="min-w-0 truncate text-highlighted">{{ lineupText(entry) }}</span>
                  <UBadge
                    v-if="!isOpenRoster"
                    :color="playoffStatus(entry.playerId).isEligible ? 'success' : 'neutral'"
                    variant="subtle"
                    size="sm"
                    class="shrink-0"
                  >
                    {{ playoffStatus(entry.playerId).lineupGames }}/{{ minimumLineupGames }}
                  </UBadge>
                </div>
              </div>
              <p
                v-else
                class="rounded-md bg-muted/30 p-3 text-sm text-muted"
              >
                Sin lineup capturado.
              </p>
            </div>

            <div class="rounded-lg border border-default p-2">
              <div class="mb-2 flex items-center justify-between gap-2">
                <p class="font-semibold text-highlighted">
                  {{ selectedGame.awayTeam.name }}
                </p>
                <UBadge
                  color="neutral"
                  variant="outline"
                >
                  {{ lineupRowsForTeam(selectedGame, selectedGame.awayTeam.id).length }} jugadores
                </UBadge>
              </div>

              <div
                v-if="lineupRowsForTeam(selectedGame, selectedGame.awayTeam.id).length"
                class="grid gap-1.5 text-sm"
              >
                <div
                  v-for="entry in lineupRowsForTeam(selectedGame, selectedGame.awayTeam.id)"
                  :key="entry.id"
                  class="flex items-center justify-between gap-2 rounded-md bg-muted/30 px-2 py-1.5"
                >
                  <span class="min-w-0 truncate text-highlighted">{{ lineupText(entry) }}</span>
                  <UBadge
                    v-if="!isOpenRoster"
                    :color="playoffStatus(entry.playerId).isEligible ? 'success' : 'neutral'"
                    variant="subtle"
                    size="sm"
                    class="shrink-0"
                  >
                    {{ playoffStatus(entry.playerId).lineupGames }}/{{ minimumLineupGames }}
                  </UBadge>
                </div>
              </div>
              <p
                v-else
                class="rounded-md bg-muted/30 p-3 text-sm text-muted"
              >
                Sin lineup capturado.
              </p>
            </div>
          </div>

          <div
            v-if="showLineupEditor"
            class="grid gap-3 border-t border-default pt-3"
          >
            <div class="grid gap-3 lg:grid-cols-2">
              <section class="rounded-lg border border-default p-2">
                <div class="mb-2 flex items-center justify-between gap-2">
                  <h3 class="text-sm font-bold text-highlighted">
                    Capturar lineup · {{ selectedGame.homeTeam.name }}
                  </h3>
                  <UBadge
                    color="primary"
                    variant="subtle"
                  >
                    {{ selectedLineupCount('home') }}
                  </UBadge>
                </div>

                <div class="grid gap-2">
                  <label
                    v-for="row in lineupForm.home"
                    :key="row.playerId"
                    class="grid gap-2 rounded-md border border-default p-2 sm:grid-cols-[1fr_5rem] sm:items-center"
                  >
                    <span class="flex min-w-0 items-center gap-2">
                      <input
                        v-model="row.selected"
                        type="checkbox"
                        class="size-4 shrink-0"
                        @change="handleLineupSelectionChange(row)"
                      >
                      <span class="min-w-0">
                        <span class="block truncate text-sm font-medium text-highlighted">
                          {{ lineupFormPlayerLabel(selectedGame.homeTeam, row.playerId) }}
                        </span>
                        <span
                          v-if="!isOpenRoster"
                          class="text-xs text-muted"
                        >
                          {{ playoffStatus(row.playerId).lineupGames }}/{{ minimumLineupGames }} juegos
                        </span>
                      </span>
                    </span>
                    <UInput
                      v-model.number="row.battingOrder"
                      type="number"
                      min="1"
                      max="10"
                      placeholder="Orden"
                      aria-label="Orden al bat"
                      :disabled="!row.selected"
                    />
                  </label>
                </div>
              </section>

              <section class="rounded-lg border border-default p-2">
                <div class="mb-2 flex items-center justify-between gap-2">
                  <h3 class="text-sm font-bold text-highlighted">
                    Capturar lineup · {{ selectedGame.awayTeam.name }}
                  </h3>
                  <UBadge
                    color="primary"
                    variant="subtle"
                  >
                    {{ selectedLineupCount('away') }}
                  </UBadge>
                </div>

                <div class="grid gap-2">
                  <label
                    v-for="row in lineupForm.away"
                    :key="row.playerId"
                    class="grid gap-2 rounded-md border border-default p-2 sm:grid-cols-[1fr_5rem] sm:items-center"
                  >
                    <span class="flex min-w-0 items-center gap-2">
                      <input
                        v-model="row.selected"
                        type="checkbox"
                        class="size-4 shrink-0"
                        @change="handleLineupSelectionChange(row)"
                      >
                      <span class="min-w-0">
                        <span class="block truncate text-sm font-medium text-highlighted">
                          {{ lineupFormPlayerLabel(selectedGame.awayTeam, row.playerId) }}
                        </span>
                        <span
                          v-if="!isOpenRoster"
                          class="text-xs text-muted"
                        >
                          {{ playoffStatus(row.playerId).lineupGames }}/{{ minimumLineupGames }} juegos
                        </span>
                      </span>
                    </span>
                    <UInput
                      v-model.number="row.battingOrder"
                      type="number"
                      min="1"
                      max="99"
                      placeholder="Orden"
                      aria-label="Orden al bat"
                      :disabled="!row.selected"
                    />
                  </label>
                </div>
              </section>
            </div>

            <UButton
              type="button"
              icon="i-lucide-save"
              :label="isOnline ? 'Guardar lineups' : 'Guardar borrador offline'"
              color="primary"
              :loading="isSavingLineup"
              block
              @click="saveLineup"
            />
          </div>

          <div
            v-if="!isOpenRoster"
            class="mt-3 grid gap-2 border-t border-default pt-3 lg:grid-cols-2"
          >
            <section class="rounded-lg bg-muted/30 p-2">
              <h3 class="mb-2 text-sm font-bold text-highlighted">
                Elegibilidad · {{ selectedGame.homeTeam.name }}
              </h3>
              <div class="grid gap-1 text-xs">
                <div
                  v-for="player in eligibilityRowsForTeam(selectedGame.homeTeam.id)"
                  :key="player.id"
                  class="flex items-center justify-between gap-2"
                >
                  <span class="min-w-0 truncate text-muted">{{ playerLabel(player) }}</span>
                  <UBadge
                    :color="player.isPlayoffEligible ? 'success' : 'neutral'"
                    variant="subtle"
                    size="sm"
                    class="shrink-0"
                  >
                    {{ player.isPlayoffEligible ? 'Elegible' : `${Math.max(minimumLineupGames - player.lineupGames, 0)} faltan` }}
                  </UBadge>
                </div>
              </div>
            </section>

            <section class="rounded-lg bg-muted/30 p-2">
              <h3 class="mb-2 text-sm font-bold text-highlighted">
                Elegibilidad · {{ selectedGame.awayTeam.name }}
              </h3>
              <div class="grid gap-1 text-xs">
                <div
                  v-for="player in eligibilityRowsForTeam(selectedGame.awayTeam.id)"
                  :key="player.id"
                  class="flex items-center justify-between gap-2"
                >
                  <span class="min-w-0 truncate text-muted">{{ playerLabel(player) }}</span>
                  <UBadge
                    :color="player.isPlayoffEligible ? 'success' : 'neutral'"
                    variant="subtle"
                    size="sm"
                    class="shrink-0"
                  >
                    {{ player.isPlayoffEligible ? 'Elegible' : `${Math.max(minimumLineupGames - player.lineupGames, 0)} faltan` }}
                  </UBadge>
                </div>
              </div>
            </section>
          </div>
        </section>
      </div>
    </section>

    <UModal
      v-model:open="isResultCardModalOpen"
      title="Imagen del resultado"
      :description="selectedGame ? gameLabel(selectedGame) : ''"
    >
      <template #body>
        <div class="grid gap-3">
          <div class="overflow-hidden rounded-lg border border-default bg-muted/30">
            <img
              v-if="resultCardHref"
              :src="resultCardHref"
              :alt="selectedGame ? `Resultado ${gameLabel(selectedGame)}` : 'Resultado de juego'"
              class="max-h-[70vh] w-full object-contain"
            >
          </div>
          <p class="text-xs text-muted">
            Vista previa lista para compartir o guardar como PNG.
          </p>
        </div>
      </template>

      <template #footer="{ close }">
        <div class="grid w-full gap-2 sm:flex sm:items-center sm:justify-end">
          <UButton
            label="Cerrar"
            color="neutral"
            variant="ghost"
            :disabled="isSharingResultCard || isDownloadingResultCard"
            @click="close"
          />
          <UButton
            v-if="resultCardHref"
            :href="resultCardHref"
            target="_blank"
            rel="noopener"
            label="Abrir"
            icon="i-lucide-external-link"
            color="neutral"
            variant="outline"
          />
          <UButton
            type="button"
            label="Descargar"
            icon="i-lucide-download"
            color="neutral"
            variant="subtle"
            :loading="isDownloadingResultCard"
            :disabled="isSharingResultCard"
            @click="downloadResultCard()"
          />
          <UButton
            type="button"
            label="Compartir"
            icon="i-lucide-share-2"
            color="primary"
            :loading="isSharingResultCard"
            :disabled="isDownloadingResultCard"
            @click="shareResultCard"
          />
        </div>
      </template>
    </UModal>
  </UContainer>
</template>
