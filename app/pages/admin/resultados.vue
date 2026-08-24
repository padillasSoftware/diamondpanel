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
  type TeamBranch,
  type TeamCategory
} from '~/utils/league'

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
}

type ResultsResponse = {
  season: {
    id: string
    name: string
    year: number
  } | null
  games: AdminResultGame[]
}

type HighlightForm = {
  playerName: string
  atBats: number
  hits: number
  homeRuns: number
}

const emptyHighlight = (): HighlightForm => ({
  playerName: '',
  atBats: 0,
  hits: 0,
  homeRuns: 0
})

const toast = useToast()
const { data, pending, refresh } = await useFetch<ResultsResponse>('/api/admin/results')

const selectedGameId = ref<string | null>(null)
const isSavingResult = ref(false)
const isDeletingResult = ref(false)
const editingResultId = ref<string | null>(null)
const search = ref('')
const selectedStatus = ref<'ALL' | 'PENDING' | 'FINAL'>('ALL')
const showBattingHighlights = ref(false)

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

const games = computed(() => data.value?.games ?? [])
const selectedGame = computed(() => games.value.find(game => game.id === selectedGameId.value) ?? null)
const showResultForm = computed(() => Boolean(
  selectedGame.value && (!selectedGame.value.result || editingResultId.value === selectedGame.value.id)
))
const finalGames = computed(() => games.value.filter(game => game.result).length)
const pendingGames = computed(() => games.value.filter(game => !game.result).length)
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
    && (
      resultForm.isForfeit
      || (resultForm.winningPitcherName.trim() && resultForm.losingPitcherName.trim())
    )
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
  showBattingHighlights.value = Boolean(game?.result?.battingHighlights.length)
}, { immediate: true })

watch(() => resultForm.isForfeit, (isForfeit) => {
  if (!isForfeit) return

  setForfeitWinner(winnerSide.value ?? 'home')
  showBattingHighlights.value = false
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
  resultForm.winningPitcherName = resultForm.isForfeit ? '' : savedPlayerName(game.result?.winningPitcherName, game.result?.winningPitcher)
  resultForm.losingPitcherName = resultForm.isForfeit ? '' : savedPlayerName(game.result?.losingPitcherName, game.result?.losingPitcher)
  resultForm.notes = game.result?.notes ?? ''
  resultForm.winnerHighlights = resultForm.isForfeit ? emptyHighlights() : normalizeHighlights(game.result?.battingHighlights ?? [], 'WINNER')
  resultForm.loserHighlights = resultForm.isForfeit ? emptyHighlights() : normalizeHighlights(game.result?.battingHighlights ?? [], 'LOSER')
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

function resultPayload() {
  return {
    homeScore: resultForm.homeScore,
    awayScore: resultForm.awayScore,
    innings: resultForm.innings,
    isForfeit: resultForm.isForfeit,
    winningPitcherName: resultForm.isForfeit ? null : resultForm.winningPitcherName,
    losingPitcherName: resultForm.isForfeit ? null : resultForm.losingPitcherName,
    notes: resultForm.notes,
    winnerHighlights: resultForm.isForfeit ? [] : resultForm.winnerHighlights,
    loserHighlights: resultForm.isForfeit ? [] : resultForm.loserHighlights
  }
}

async function saveResult() {
  const game = selectedGame.value

  if (!game || !canSaveResult.value) {
    showError(resultForm.isForfeit
      ? 'El resultado por default debe quedar 7-0 para el ganador.'
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
    showFeedback('Resultado guardado.')
  } catch (error) {
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

function editSelectedResult() {
  const game = selectedGame.value

  if (!game?.result) return

  editingResultId.value = game.id
}
</script>

<template>
  <UContainer class="py-6 sm:py-8">
    <div class="mb-6 flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
      <div>
        <UBadge
          color="primary"
          variant="subtle"
          icon="i-lucide-clipboard-check"
        >
          Resultados
        </UBadge>
        <h1 class="mt-3 text-3xl font-bold tracking-normal text-highlighted sm:text-4xl">
          Captura de resultados
        </h1>
        <p class="mt-2 max-w-2xl text-base text-muted">
          {{ data?.season ? `${data.season.name} ${data.season.year}` : 'Temporada activa requerida' }}
        </p>
      </div>

      <div class="grid grid-cols-3 gap-2 rounded-lg border border-default bg-default p-2 text-center shadow-sm">
        <div class="rounded-md bg-muted/40 px-3 py-2">
          <p class="text-xl font-bold text-highlighted">
            {{ games.length }}
          </p>
          <p class="text-xs text-muted">
            Juegos
          </p>
        </div>
        <div class="rounded-md bg-muted/40 px-3 py-2">
          <p class="text-xl font-bold text-highlighted">
            {{ finalGames }}
          </p>
          <p class="text-xs text-muted">
            Capturados
          </p>
        </div>
        <div class="rounded-md bg-muted/40 px-3 py-2">
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

    <section
      v-else
      class="grid gap-4 xl:grid-cols-[0.9fr_1.1fr]"
    >
      <section class="rounded-lg border border-default bg-default p-2.5 shadow-sm sm:p-3 xl:flex xl:max-h-[48rem] xl:flex-col">
        <div class="mb-2.5 grid gap-2 lg:grid-cols-[1fr_auto] lg:items-end">
          <div>
            <h2 class="text-base font-bold text-highlighted">
              Partidos del rol
            </h2>
            <p class="text-xs text-muted">
              {{ pending ? 'Cargando...' : `${filteredGames.length} visibles` }}
            </p>
          </div>

          <div class="grid gap-2 sm:grid-cols-2 lg:min-w-90">
            <UInput
              v-model="search"
              icon="i-lucide-search"
              placeholder="Buscar"
            />
            <select
              v-model="selectedStatus"
              class="h-10 w-full rounded-md border border-default bg-default px-3 text-sm text-highlighted outline-none focus:border-primary"
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
            class="rounded-lg border p-2 text-left transition-colors"
            :class="selectedGameId === game.id ? 'border-primary bg-primary/5' : 'border-default hover:border-primary'"
            @click="selectedGameId = game.id"
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
          <template v-if="!selectedGame.result.isForfeit">
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
          </template>
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
        class="rounded-lg border border-default bg-default p-2.5 shadow-sm sm:p-3"
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

        <div class="mb-3 grid gap-2 sm:grid-cols-2">
          <div class="rounded-lg border border-default p-2">
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
            <UInput
              v-model.number="resultForm.homeScore"
              type="number"
              min="0"
              max="999"
              required
              :disabled="resultForm.isForfeit"
              aria-label="Carreras local"
            />
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

          <div class="rounded-lg border border-default p-2">
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
            <UInput
              v-model.number="resultForm.awayScore"
              type="number"
              min="0"
              max="999"
              required
              :disabled="resultForm.isForfeit"
              aria-label="Carreras visitante"
            />
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

        <div class="mb-3 grid gap-2 sm:grid-cols-3">
          <label class="grid gap-1.5 text-sm">
            <span class="font-medium text-highlighted">Innings</span>
            <UInput
              v-model.number="resultForm.innings"
              type="number"
              min="1"
              max="20"
              required
              :disabled="resultForm.isForfeit"
            />
          </label>

          <label class="grid gap-1.5 text-sm sm:col-span-2">
            <span class="font-medium text-highlighted">Forfeit</span>
            <label class="flex h-10 items-center gap-2 rounded-md border border-default px-3 text-sm">
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
          Se guardará {{ winnerTeam.name }} 7, {{ loserTeam.name }} 0. No se capturan estadísticas individuales.
        </div>

        <div
          v-else-if="winnerTeam && loserTeam"
          class="mb-3 grid gap-2 lg:grid-cols-2"
        >
          <label class="grid gap-1.5 text-sm">
            <span class="font-medium text-highlighted">Pitcher ganador · {{ winnerTeam.name }}</span>
            <UInput
              v-model="resultForm.winningPitcherName"
              required
              maxlength="80"
              placeholder="Nombre del pitcher ganador"
            />
          </label>

          <label class="grid gap-1.5 text-sm">
            <span class="font-medium text-highlighted">Pitcher derrotado · {{ loserTeam.name }}</span>
            <UInput
              v-model="resultForm.losingPitcherName"
              required
              maxlength="80"
              placeholder="Nombre del pitcher derrotado"
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
            class="w-fit"
            @click="showBattingHighlights = !showBattingHighlights"
          />
        </div>

        <div
          v-if="!resultForm.isForfeit && showBattingHighlights"
          class="mb-3 grid gap-3 lg:grid-cols-2"
        >
          <section class="rounded-lg border border-default p-2">
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
                class="grid gap-2 rounded-md bg-muted/30 p-2 sm:grid-cols-[1fr_4rem_4rem_4rem]"
              >
                <UInput
                  v-model="highlight.playerName"
                  maxlength="80"
                  :placeholder="`Bateador ${index + 1}`"
                  aria-label="Bateador ganador"
                />
                <UInput
                  v-model.number="highlight.atBats"
                  type="number"
                  min="0"
                  max="20"
                  aria-label="Turnos"
                />
                <UInput
                  v-model.number="highlight.hits"
                  type="number"
                  min="0"
                  max="20"
                  aria-label="Hits"
                />
                <UInput
                  v-model.number="highlight.homeRuns"
                  type="number"
                  min="0"
                  max="20"
                  aria-label="Home runs"
                />
              </div>
            </div>
          </section>

          <section class="rounded-lg border border-default p-2">
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
                class="grid gap-2 rounded-md bg-muted/30 p-2 sm:grid-cols-[1fr_4rem_4rem_4rem]"
              >
                <UInput
                  v-model="highlight.playerName"
                  maxlength="80"
                  :placeholder="`Bateador ${index + 1}`"
                  aria-label="Bateador derrotado"
                />
                <UInput
                  v-model.number="highlight.atBats"
                  type="number"
                  min="0"
                  max="20"
                  aria-label="Turnos"
                />
                <UInput
                  v-model.number="highlight.hits"
                  type="number"
                  min="0"
                  max="20"
                  aria-label="Hits"
                />
                <UInput
                  v-model.number="highlight.homeRuns"
                  type="number"
                  min="0"
                  max="20"
                  aria-label="Home runs"
                />
              </div>
            </div>
          </section>
        </div>

        <label class="grid gap-1.5 text-sm">
          <span class="font-medium text-highlighted">Notas</span>
          <textarea
            v-model="resultForm.notes"
            rows="3"
            class="w-full rounded-md border border-default bg-default px-3 py-2 text-sm text-highlighted outline-none focus:border-primary"
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
          label="Guardar resultado"
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
    </section>
  </UContainer>
</template>
