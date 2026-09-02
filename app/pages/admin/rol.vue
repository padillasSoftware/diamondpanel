<script setup lang="ts">
import {
  TEAM_BRANCH_OPTIONS,
  branchColor,
  branchLabel,
  categoryColor,
  categoryLabel,
  formatGameTime,
  formatScheduleDay,
  gameStatusColor,
  gameStatusLabel,
  roundLabel,
  scheduleDateKey,
  teamInitials,
  type TeamBranch,
  type TeamCategory,
  type TeamSummary
} from '~/utils/league'

definePageMeta({
  middleware: 'admin'
})

useSeoMeta({
  title: 'Rol de juegos | DiamondPanel',
  description: 'Administración del rol semanal de juegos.'
})

type GameStatus = 'SCHEDULED' | 'POSTPONED' | 'CANCELLED' | 'FINAL'

type ScheduleTeam = TeamSummary & {
  status: string
}

type ScheduleField = {
  id: string
  name: string
  address: string | null
}

type ScheduleGame = {
  id: string
  round: number | null
  scheduledAt: string
  status: GameStatus
  notes: string | null
  field: ScheduleField | null
  homeTeam: ScheduleTeam
  awayTeam: ScheduleTeam
  result: {
    id: string
  } | null
}

type ScheduleConfig = {
  id: string | null
  category: TeamCategory
  branch: TeamBranch
  rounds: number
  teamCount: number
}

type ScheduleResponse = {
  season: {
    id: string
    name: string
    year: number
    startsAt: string | null
    endsAt: string | null
  }
  weekStart: string
  weekEnd: string
  suggestedRound: number
  games: ScheduleGame[]
  teams: ScheduleTeam[]
  fields: ScheduleField[]
  configs: ScheduleConfig[]
}

type GenerateScheduleResponse = {
  success: boolean
  createdCount: number
  round: number
}

type GameGroup = {
  key: string
  title: string
  games: ScheduleGame[]
}

type MatchupCellState = 'SELF' | 'PENDING' | 'SCHEDULED' | 'POSTPONED' | 'WON' | 'TIED' | 'LOST' | 'DEFAULT' | 'CANCELLED'

type MatchupMatrixCell = {
  state: MatchupCellState
  label: string
  gameId: string | null
  title: string
  column: number
  opponentId: string
  opponentName: string
}

type MatchupMatrixGroup = {
  id: string
  label: string
  category: TeamCategory
  branch: TeamBranch
  teams: TeamSummary[]
  rows: {
    team: TeamSummary
    index: number
    cells: MatchupMatrixCell[]
  }[]
}

type MatchupMatrixResponse = {
  season: {
    id: string
    name: string
    year: number
  }
  groups: MatchupMatrixGroup[]
}

type MatchupMatrixRow = MatchupMatrixGroup['rows'][number]

const toast = useToast()
const weekStart = ref(getWeekStartInput(getLeagueDateInput(new Date())))
const editableConfigs = ref<ScheduleConfig[]>([])
const mobileSection = ref<'WEEK' | 'FORM'>('WEEK')
const matchupCategoryFilter = ref<'ALL' | TeamCategory>('A')
const matchupBranchFilter = ref<'ALL' | TeamBranch>('ALL')
const { categoryOptions, categoryOptionsWithAll, firstActiveCategory } = useLeagueCategories()

const { data, pending, refresh } = await useFetch<ScheduleResponse>('/api/admin/schedule', {
  query: computed(() => ({
    weekStart: weekStart.value
  }))
})
const {
  data: matchupMatrix,
  pending: isLoadingMatchupMatrix,
  refresh: refreshMatchupMatrix
} = await useFetch<MatchupMatrixResponse>('/api/matchups/matrix', {
  query: computed(() => ({
    category: matchupCategoryFilter.value === 'ALL' ? undefined : matchupCategoryFilter.value,
    branch: matchupBranchFilter.value === 'ALL' ? undefined : matchupBranchFilter.value
  }))
})

const gameForm = reactive({
  round: 1,
  scheduledAt: '',
  category: 'A' as TeamCategory,
  branch: 'VARONIL' as TeamBranch,
  homeTeamId: '',
  awayTeamId: '',
  fieldId: '',
  status: 'SCHEDULED' as GameStatus,
  notes: ''
})

const editingGameId = ref<string | null>(null)
const isSavingGame = ref(false)
const isGeneratingSchedule = ref(false)
const isDeletingGame = ref(false)
const isReleasingGame = ref(false)
const gamePendingDelete = ref<ScheduleGame | null>(null)
const gamePendingRelease = ref<ScheduleGame | null>(null)

const branchOptions = TEAM_BRANCH_OPTIONS.filter(
  (option): option is { label: string, value: TeamBranch } => option.value !== 'ALL'
)
const matchupCategoryOptions = categoryOptionsWithAll
const matchupBranchOptions = TEAM_BRANCH_OPTIONS
const statusOptions = [
  { label: 'Programado', value: 'SCHEDULED' },
  { label: 'Suspendido', value: 'POSTPONED' },
  { label: 'Cancelado / pendiente', value: 'CANCELLED' },
  { label: 'Final', value: 'FINAL' }
] satisfies { label: string, value: GameStatus }[]

const games = computed(() => data.value?.games ?? [])
const teams = computed(() => data.value?.teams ?? [])
const fields = computed(() => data.value?.fields ?? [])
const editingGame = computed(() => games.value.find(game => game.id === editingGameId.value) ?? null)
const weekEndInclusive = computed(() => addDays(weekStart.value, 6))
const selectedConfig = computed(() =>
  editableConfigs.value.find(config => config.category === gameForm.category && config.branch === gameForm.branch)
)
const selectedGroupTeams = computed(() =>
  teams.value.filter(team => team.category === gameForm.category && team.branch === gameForm.branch)
)
const awayTeamOptions = computed(() =>
  selectedGroupTeams.value.filter(team => team.id !== gameForm.homeTeamId)
)
const canSaveGame = computed(() =>
  Boolean(
    gameForm.round
    && gameForm.scheduledAt
    && gameForm.homeTeamId
    && gameForm.awayTeamId
    && gameForm.homeTeamId !== gameForm.awayTeamId
  )
)
const scheduledGamesCount = computed(() =>
  games.value.filter(game => game.status === 'SCHEDULED' || game.status === 'POSTPONED').length
)
const finalGamesCount = computed(() =>
  games.value.filter(game => game.status === 'FINAL').length
)
const matchupGroups = computed(() => matchupMatrix.value?.groups ?? [])
const gamesByDate = computed(() => {
  const groups = new Map<string, GameGroup>()

  for (const game of games.value) {
    const key = scheduleDateKey(game.scheduledAt)

    if (!groups.has(key)) {
      groups.set(key, {
        key,
        title: formatScheduleDay(game.scheduledAt),
        games: []
      })
    }

    groups.get(key)?.games.push(game)
  }

  return [...groups.values()].map(group => ({
    ...group,
    games: group.games.sort((left, right) => new Date(left.scheduledAt).getTime() - new Date(right.scheduledAt).getTime())
  }))
})
const isDeleteModalOpen = computed({
  get: () => gamePendingDelete.value !== null,
  set: (value) => {
    if (!value) gamePendingDelete.value = null
  }
})
const isReleaseModalOpen = computed({
  get: () => gamePendingRelease.value !== null,
  set: (value) => {
    if (!value) gamePendingRelease.value = null
  }
})
const matchupLegend = [
  { label: 'pendiente', state: 'PENDING' },
  { label: 'programado', state: 'SCHEDULED' },
  { label: 'suspendido', state: 'POSTPONED' },
  { label: 'ganado', state: 'WON' },
  { label: 'empatado', state: 'TIED' },
  { label: 'perdido', state: 'LOST' },
  { label: 'p. default', state: 'DEFAULT' }
] satisfies { label: string, state: MatchupCellState }[]

watch(() => data.value?.weekStart, (normalizedWeekStart) => {
  if (normalizedWeekStart && normalizedWeekStart !== weekStart.value) {
    weekStart.value = normalizedWeekStart
  }
})

watch(() => data.value?.configs, (configs) => {
  editableConfigs.value = (configs ?? []).map(config => ({ ...config }))
}, { immediate: true })

watch(categoryOptions, (options) => {
  if (!options.some(option => option.value === gameForm.category)) {
    gameForm.category = options[0]?.value ?? 'A'
  }

  if (matchupCategoryFilter.value !== 'ALL' && !options.some(option => option.value === matchupCategoryFilter.value)) {
    matchupCategoryFilter.value = options[0]?.value ?? 'ALL'
  }
}, { immediate: true })

watch(() => data.value?.suggestedRound, (suggestedRound) => {
  if (!editingGameId.value && suggestedRound) {
    gameForm.round = suggestedRound
  }
}, { immediate: true })

watch(weekStart, () => {
  if (!editingGameId.value) {
    gameForm.scheduledAt = defaultScheduledAt()
  }
})

watch([() => gameForm.category, () => gameForm.branch], () => {
  const currentTeamIds = new Set(selectedGroupTeams.value.map(team => team.id))

  if (!currentTeamIds.has(gameForm.homeTeamId)) gameForm.homeTeamId = ''
  if (!currentTeamIds.has(gameForm.awayTeamId)) gameForm.awayTeamId = ''
})

watch(() => gameForm.homeTeamId, () => {
  if (gameForm.homeTeamId === gameForm.awayTeamId) {
    gameForm.awayTeamId = ''
  }
})

onMounted(() => {
  if (!gameForm.scheduledAt) {
    gameForm.scheduledAt = defaultScheduledAt()
  }
})

function getLeagueDateInput(value: Date) {
  const formatter = new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    timeZone: 'America/Tijuana'
  })
  const parts = Object.fromEntries(
    formatter.formatToParts(value).map(part => [part.type, part.value])
  )

  return `${parts.year}-${parts.month}-${parts.day}`
}

function getWeekStartInput(value: string) {
  const date = new Date(`${value}T12:00:00Z`)
  const daysSinceMonday = (date.getUTCDay() + 6) % 7

  date.setUTCDate(date.getUTCDate() - daysSinceMonday)

  return date.toISOString().slice(0, 10)
}

function addDays(value: string, days: number) {
  const date = new Date(`${value}T12:00:00Z`)

  date.setUTCDate(date.getUTCDate() + days)

  return date.toISOString().slice(0, 10)
}

function formatDateInput(value: string) {
  return new Intl.DateTimeFormat('es-MX', {
    weekday: 'short',
    day: '2-digit',
    month: 'short',
    timeZone: 'UTC'
  }).format(new Date(`${value}T12:00:00Z`))
}

function toLeagueDateTimeInput(value: string) {
  const formatter = new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
    timeZone: 'America/Tijuana'
  })
  const parts = Object.fromEntries(
    formatter.formatToParts(new Date(value)).map(part => [part.type, part.value])
  )

  return `${parts.year}-${parts.month}-${parts.day}T${parts.hour}:${parts.minute}`
}

function defaultScheduledAt() {
  return `${addDays(weekStart.value, 5)}T10:00`
}

function previousWeek() {
  weekStart.value = addDays(weekStart.value, -7)
}

function nextWeek() {
  weekStart.value = addDays(weekStart.value, 7)
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

function matchupCellClass(state: MatchupCellState) {
  const classes: Record<MatchupCellState, string> = {
    SELF: 'bg-neutral-300 text-transparent dark:bg-neutral-700',
    PENDING: 'border border-default bg-default text-muted',
    SCHEDULED: 'bg-cyan-100 text-cyan-900 dark:bg-cyan-900/40 dark:text-cyan-100',
    POSTPONED: 'bg-amber-100 text-amber-900 dark:bg-amber-900/40 dark:text-amber-100',
    WON: 'bg-lime-200 text-lime-950 dark:bg-lime-700 dark:text-lime-50',
    TIED: 'bg-yellow-200 text-yellow-950 dark:bg-yellow-700 dark:text-yellow-50',
    LOST: 'bg-red-300 text-red-950 dark:bg-red-800 dark:text-red-50',
    DEFAULT: 'bg-orange-200 text-orange-950 dark:bg-orange-800 dark:text-orange-50',
    CANCELLED: 'bg-neutral-200 text-neutral-700 dark:bg-neutral-800 dark:text-neutral-200'
  }

  return classes[state]
}

function matchupLegendClass(state: MatchupCellState) {
  const classes: Record<MatchupCellState, string> = {
    SELF: 'bg-neutral-300',
    PENDING: 'bg-neutral-300 dark:bg-neutral-500',
    SCHEDULED: 'bg-cyan-400',
    POSTPONED: 'bg-amber-400',
    WON: 'bg-lime-400',
    TIED: 'bg-yellow-400',
    LOST: 'bg-red-400',
    DEFAULT: 'bg-orange-400',
    CANCELLED: 'bg-neutral-400'
  }

  return classes[state]
}

function matchupBadgeClass(state: MatchupCellState) {
  const classes: Record<MatchupCellState, string> = {
    SELF: 'bg-neutral-200 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-300',
    PENDING: 'bg-muted text-muted',
    SCHEDULED: 'bg-cyan-100 text-cyan-900 dark:bg-cyan-900/40 dark:text-cyan-100',
    POSTPONED: 'bg-amber-100 text-amber-900 dark:bg-amber-900/40 dark:text-amber-100',
    WON: 'bg-lime-200 text-lime-950 dark:bg-lime-700 dark:text-lime-50',
    TIED: 'bg-yellow-200 text-yellow-950 dark:bg-yellow-700 dark:text-yellow-50',
    LOST: 'bg-red-300 text-red-950 dark:bg-red-800 dark:text-red-50',
    DEFAULT: 'bg-orange-200 text-orange-950 dark:bg-orange-800 dark:text-orange-50',
    CANCELLED: 'bg-neutral-200 text-neutral-700 dark:bg-neutral-800 dark:text-neutral-200'
  }

  return classes[state]
}

function matchupStatusLabel(state: MatchupCellState) {
  const labels: Record<MatchupCellState, string> = {
    SELF: 'Mismo equipo',
    PENDING: 'Pendiente',
    SCHEDULED: 'Programado',
    POSTPONED: 'Suspendido',
    WON: 'Ganado',
    TIED: 'Empatado',
    LOST: 'Perdido',
    DEFAULT: 'Default',
    CANCELLED: 'Cancelado'
  }

  return labels[state]
}

function matchupCellsForRow(row: MatchupMatrixRow) {
  return row.cells.filter(cell => cell.state !== 'SELF')
}

function uniqueMatchupCells(group: MatchupMatrixGroup) {
  return group.rows.flatMap(row =>
    row.cells.filter(cell => cell.state !== 'SELF' && cell.column > row.index)
  )
}

function matchupCountByState(group: MatchupMatrixGroup, states: MatchupCellState[]) {
  const stateSet = new Set(states)

  return uniqueMatchupCells(group).filter(cell => stateSet.has(cell.state)).length
}

function matchupPendingCount(group: MatchupMatrixGroup) {
  return matchupCountByState(group, ['PENDING', 'CANCELLED'])
}

function matchupScheduledCount(group: MatchupMatrixGroup) {
  return matchupCountByState(group, ['SCHEDULED', 'POSTPONED'])
}

function matchupFinalCount(group: MatchupMatrixGroup) {
  return matchupCountByState(group, ['WON', 'TIED', 'LOST', 'DEFAULT'])
}

function refreshMatrix() {
  void refreshMatchupMatrix()
}

function resetGameForm() {
  editingGameId.value = null
  gameForm.round = data.value?.suggestedRound ?? 1
  gameForm.scheduledAt = defaultScheduledAt()
  gameForm.category = editableConfigs.value[0]?.category ?? firstActiveCategory.value
  gameForm.branch = selectedConfig.value?.branch ?? 'VARONIL'
  gameForm.homeTeamId = ''
  gameForm.awayTeamId = ''
  gameForm.fieldId = ''
  gameForm.status = 'SCHEDULED'
  gameForm.notes = ''
  mobileSection.value = 'FORM'
}

function editGame(game: ScheduleGame) {
  editingGameId.value = game.id
  gameForm.round = game.round ?? data.value?.suggestedRound ?? 1
  gameForm.scheduledAt = toLeagueDateTimeInput(game.scheduledAt)
  gameForm.category = game.homeTeam.category
  gameForm.branch = game.homeTeam.branch
  gameForm.homeTeamId = game.homeTeam.id
  gameForm.awayTeamId = game.awayTeam.id
  gameForm.fieldId = game.field?.id ?? ''
  gameForm.status = game.status
  gameForm.notes = game.notes ?? ''
  mobileSection.value = 'FORM'
}

function gamePayload() {
  return {
    weekStart: weekStart.value,
    round: gameForm.round,
    scheduledAt: gameForm.scheduledAt,
    homeTeamId: gameForm.homeTeamId,
    awayTeamId: gameForm.awayTeamId,
    fieldId: gameForm.fieldId || null,
    status: gameForm.status,
    notes: gameForm.notes
  }
}

async function saveGame() {
  if (!canSaveGame.value) {
    showError('Completa rol, fecha, equipo local y visitante.')

    return
  }

  isSavingGame.value = true

  try {
    if (editingGameId.value) {
      await $fetch(`/api/admin/schedule/games/${editingGameId.value}`, {
        method: 'PATCH',
        body: gamePayload()
      })
      showFeedback('Partido actualizado.')
    } else {
      await $fetch('/api/admin/schedule/games', {
        method: 'POST',
        body: gamePayload()
      })
      showFeedback('Partido agregado al rol.')
    }

    await Promise.all([
      refresh(),
      refreshMatchupMatrix()
    ])
    resetGameForm()
    mobileSection.value = 'WEEK'
  } catch (error) {
    const statusMessage = typeof error === 'object' && error && 'data' in error
      ? String((error as { data?: { statusMessage?: unknown } }).data?.statusMessage ?? '')
      : ''

    showError(statusMessage || 'Revisa que no se repita el cruce, campo u horario.')
  } finally {
    isSavingGame.value = false
  }
}

async function generateSchedule() {
  isGeneratingSchedule.value = true

  try {
    const result = await $fetch<GenerateScheduleResponse>('/api/admin/schedule/generate', {
      method: 'POST',
      body: {
        weekStart: weekStart.value,
        round: gameForm.round || data.value?.suggestedRound || 1,
        configs: editableConfigs.value.map(config => ({
          category: config.category,
          branch: config.branch,
          rounds: Number(config.rounds)
        }))
      }
    })
    const gameWord = result.createdCount === 1 ? 'partido' : 'partidos'

    await Promise.all([
      refresh(),
      refreshMatchupMatrix()
    ])
    showFeedback(`Rol #${result.round} generado con ${result.createdCount} ${gameWord}.`)
  } catch (error) {
    const statusMessage = typeof error === 'object' && error && 'data' in error
      ? String((error as { data?: { statusMessage?: unknown } }).data?.statusMessage ?? '')
      : ''

    showError(statusMessage || 'No se pudo generar el rol automáticamente.')
  } finally {
    isGeneratingSchedule.value = false
  }
}

function deleteGame(game: ScheduleGame) {
  if (game.result) {
    showError('Este partido ya tiene resultado capturado.')

    return
  }

  gamePendingDelete.value = game
}

function canReleaseGame(game: ScheduleGame) {
  return game.status !== 'CANCELLED' && game.status !== 'FINAL' && !game.result
}

function releaseGame(game: ScheduleGame) {
  if (!canReleaseGame(game)) {
    showError(
      game.status === 'CANCELLED'
        ? 'Este partido ya está cancelado y el cruce quedó pendiente.'
        : 'Este partido ya tiene resultado capturado.'
    )

    return
  }

  gamePendingRelease.value = game
}

function releasedGameNotes(game: ScheduleGame) {
  const note = 'Cancelado. Cruce pendiente para reprogramar.'
  const currentNotes = game.notes?.trim()

  if (!currentNotes) return note
  if (currentNotes.includes(note)) return currentNotes

  return `${currentNotes}\n${note}`
}

async function confirmReleaseGame() {
  const game = gamePendingRelease.value

  if (!game) return

  isReleasingGame.value = true

  try {
    await $fetch(`/api/admin/schedule/games/${game.id}`, {
      method: 'PATCH',
      body: {
        weekStart: weekStart.value,
        round: game.round ?? data.value?.suggestedRound ?? 1,
        scheduledAt: toLeagueDateTimeInput(game.scheduledAt),
        homeTeamId: game.homeTeam.id,
        awayTeamId: game.awayTeam.id,
        fieldId: game.field?.id ?? null,
        status: 'CANCELLED',
        notes: releasedGameNotes(game)
      }
    })
    await Promise.all([
      refresh(),
      refreshMatchupMatrix()
    ])

    if (editingGameId.value === game.id) {
      resetGameForm()
    }

    gamePendingRelease.value = null
    showFeedback('Juego cancelado. El cruce quedó pendiente para otro rol.')
  } catch (error) {
    const statusMessage = typeof error === 'object' && error && 'data' in error
      ? String((error as { data?: { statusMessage?: unknown } }).data?.statusMessage ?? '')
      : ''

    showError(statusMessage || 'No se pudo cancelar el partido.')
  } finally {
    isReleasingGame.value = false
  }
}

async function confirmDeleteGame() {
  const game = gamePendingDelete.value

  if (!game) return

  isDeletingGame.value = true

  try {
    await $fetch(`/api/admin/schedule/games/${game.id}`, {
      method: 'DELETE'
    })
    await Promise.all([
      refresh(),
      refreshMatchupMatrix()
    ])

    if (editingGameId.value === game.id) {
      resetGameForm()
    }

    gamePendingDelete.value = null
    showFeedback('Partido eliminado.')
  } catch (error) {
    const statusMessage = typeof error === 'object' && error && 'data' in error
      ? String((error as { data?: { statusMessage?: unknown } }).data?.statusMessage ?? '')
      : ''

    showError(statusMessage || 'No se pudo eliminar el partido.')
  } finally {
    isDeletingGame.value = false
  }
}
</script>

<template>
  <UContainer class="min-w-0 pb-6 pt-4 sm:py-8">
    <div class="mb-6 flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
      <div class="min-w-0">
        <UBadge
          color="primary"
          variant="subtle"
          icon="i-lucide-calendar-plus"
        >
          Rol de juegos
        </UBadge>
        <h1 class="mt-3 text-2xl font-bold leading-tight tracking-normal text-highlighted sm:text-4xl">
          Administración del rol
        </h1>
        <p class="mt-2 max-w-2xl text-sm text-muted sm:text-base">
          {{ data?.season ? `${data.season.name} ${data.season.year}` : 'Temporada activa' }}
        </p>
      </div>

      <div class="grid grid-cols-3 gap-2 rounded-lg border border-default bg-default p-2 text-center shadow-sm">
        <div class="rounded-md bg-muted/40 px-3 py-2">
          <p class="text-xl font-bold text-highlighted">
            {{ games.length }}
          </p>
          <p class="text-xs text-muted">
            Semana
          </p>
        </div>
        <div class="rounded-md bg-muted/40 px-3 py-2">
          <p class="text-xl font-bold text-highlighted">
            {{ scheduledGamesCount }}
          </p>
          <p class="text-xs text-muted">
            En rol
          </p>
        </div>
        <div class="rounded-md bg-muted/40 px-3 py-2">
          <p class="text-xl font-bold text-highlighted">
            {{ finalGamesCount }}
          </p>
          <p class="text-xs text-muted">
            Finales
          </p>
        </div>
      </div>
    </div>

    <section class="mb-4 grid min-w-0 gap-3 overflow-hidden rounded-lg border border-default bg-default p-3 shadow-sm lg:grid-cols-[auto_minmax(0,1fr)_auto_auto_auto] lg:items-end">
      <div class="flex items-center gap-1.5">
        <UButton
          type="button"
          icon="i-lucide-chevron-left"
          aria-label="Semana anterior"
          color="neutral"
          variant="outline"
          @click="previousWeek"
        />
        <UButton
          type="button"
          icon="i-lucide-chevron-right"
          aria-label="Semana siguiente"
          color="neutral"
          variant="outline"
          @click="nextWeek"
        />
      </div>

      <label class="grid min-w-0 gap-1.5 text-sm">
        <span class="font-medium text-highlighted">Semana</span>
        <input
          v-model="weekStart"
          type="date"
          class="box-border h-10 min-w-0 max-w-full appearance-none rounded-md border border-default bg-default px-3 text-sm text-highlighted outline-none focus:border-primary"
        >
      </label>

      <div class="min-w-0 rounded-md bg-muted/30 px-3 py-2 text-sm text-highlighted">
        {{ formatDateInput(weekStart) }} - {{ formatDateInput(weekEndInclusive) }}
      </div>

      <UButton
        type="button"
        icon="i-lucide-sparkles"
        label="Generar rol"
        color="primary"
        variant="soft"
        class="w-full justify-center lg:w-fit"
        :loading="isGeneratingSchedule"
        :disabled="pending"
        @click="generateSchedule"
      />

      <UButton
        to="/admin/configuracion"
        icon="i-lucide-settings"
        label="Ajustes"
        color="neutral"
        variant="outline"
        class="w-full justify-center lg:w-fit"
      />
    </section>

    <section class="mb-4 min-w-0 rounded-lg border border-default bg-default p-3 shadow-sm sm:p-4">
      <div class="mb-4 flex flex-col gap-3 xl:flex-row xl:items-end xl:justify-between">
        <div class="min-w-0">
          <p class="text-sm font-semibold text-primary">
            Cruces por grupo
          </p>
          <h2 class="text-xl font-bold text-highlighted">
            Matriz de cruces
          </h2>
          <p class="mt-1 text-sm text-muted">
            Revisa qué equipos ya se enfrentaron, cuáles están programados y qué cruces siguen pendientes para generar rol.
          </p>
        </div>

        <div class="grid min-w-0 gap-2 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto] xl:min-w-[34rem]">
          <label class="grid min-w-0 gap-1.5 text-sm">
            <span class="font-medium text-highlighted">Categoría</span>
            <select
              v-model="matchupCategoryFilter"
              class="h-10 min-w-0 max-w-full rounded-md border border-default bg-default px-3 text-sm text-highlighted outline-none focus:border-primary"
            >
              <option
                v-for="option in matchupCategoryOptions"
                :key="option.value"
                :value="option.value"
              >
                {{ option.label }}
              </option>
            </select>
          </label>

          <label class="grid min-w-0 gap-1.5 text-sm">
            <span class="font-medium text-highlighted">Rama</span>
            <select
              v-model="matchupBranchFilter"
              class="h-10 min-w-0 max-w-full rounded-md border border-default bg-default px-3 text-sm text-highlighted outline-none focus:border-primary"
            >
              <option
                v-for="option in matchupBranchOptions"
                :key="option.value"
                :value="option.value"
              >
                {{ option.label }}
              </option>
            </select>
          </label>

          <UButton
            type="button"
            icon="i-lucide-refresh-cw"
            label="Actualizar"
            color="neutral"
            variant="outline"
            class="self-end justify-center"
            :loading="isLoadingMatchupMatrix"
            @click="refreshMatrix"
          />
        </div>
      </div>

      <div class="mb-4 flex max-w-full gap-2 overflow-x-auto pb-1 text-xs sm:grid sm:grid-cols-3 sm:overflow-visible lg:grid-cols-7">
        <div
          v-for="item in matchupLegend"
          :key="item.state"
          class="flex min-w-fit items-center justify-center gap-2 rounded-md border border-default bg-muted/20 px-2.5 py-1.5 text-muted"
        >
          <span
            class="size-2 rounded-full"
            :class="matchupLegendClass(item.state)"
          />
          <span>{{ item.label }}</span>
        </div>
      </div>

      <div
        v-if="isLoadingMatchupMatrix"
        class="rounded-lg border border-dashed border-default p-8 text-center text-sm text-muted"
      >
        Cargando cruces...
      </div>

      <div
        v-else-if="matchupGroups.length"
        class="grid gap-4"
      >
        <article
          v-for="group in matchupGroups"
          :key="group.id"
          class="min-w-0 rounded-lg border border-default bg-muted/20 p-3"
        >
          <div class="mb-3 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div class="min-w-0">
              <div class="mb-1.5 flex flex-wrap items-center gap-1.5">
                <UBadge
                  :color="categoryColor(group.category)"
                  variant="subtle"
                >
                  {{ categoryLabel(group.category) }}
                </UBadge>
                <UBadge
                  :color="branchColor(group.branch)"
                  variant="subtle"
                >
                  {{ branchLabel(group.branch) }}
                </UBadge>
              </div>
              <h3 class="text-base font-bold text-highlighted">
                {{ group.label }}
              </h3>
              <p class="text-xs text-muted">
                {{ group.teams.length }} equipos registrados en este grupo.
              </p>
            </div>

            <div class="grid grid-cols-3 gap-2 text-center text-xs sm:w-fit">
              <div class="rounded-md border border-default bg-default px-2.5 py-1.5">
                <p class="font-bold text-highlighted">
                  {{ matchupPendingCount(group) }}
                </p>
                <p class="text-muted">
                  Pendientes
                </p>
              </div>
              <div class="rounded-md border border-default bg-default px-2.5 py-1.5">
                <p class="font-bold text-highlighted">
                  {{ matchupScheduledCount(group) }}
                </p>
                <p class="text-muted">
                  En rol
                </p>
              </div>
              <div class="rounded-md border border-default bg-default px-2.5 py-1.5">
                <p class="font-bold text-highlighted">
                  {{ matchupFinalCount(group) }}
                </p>
                <p class="text-muted">
                  Finales
                </p>
              </div>
            </div>
          </div>

          <div class="grid gap-2 sm:hidden">
            <article
              v-for="row in group.rows"
              :key="row.team.id"
              class="rounded-lg border border-default bg-default p-3"
            >
              <div class="mb-3 flex items-start justify-between gap-3">
                <div class="min-w-0">
                  <h4 class="truncate font-bold text-highlighted">
                    {{ row.team.name }}
                  </h4>
                  <p class="text-xs text-muted">
                    Equipo #{{ row.index }} · {{ matchupCellsForRow(row).length }} cruces
                  </p>
                </div>
              </div>

              <div class="grid gap-1.5">
                <div
                  v-for="cell in matchupCellsForRow(row)"
                  :key="`${row.team.id}-${cell.opponentId}`"
                  class="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2 rounded-md border border-default bg-muted/20 px-2.5 py-2"
                >
                  <div class="min-w-0">
                    <p class="truncate text-sm font-semibold text-highlighted">
                      vs {{ cell.opponentName }}
                    </p>
                    <p class="truncate text-xs text-muted">
                      {{ matchupStatusLabel(cell.state) }}{{ cell.title && cell.title !== cell.label ? ` · ${cell.title}` : '' }}
                    </p>
                  </div>
                  <span
                    class="rounded-md px-2 py-1 text-xs font-bold"
                    :class="matchupBadgeClass(cell.state)"
                  >
                    {{ cell.label || matchupStatusLabel(cell.state) }}
                  </span>
                </div>
              </div>
            </article>
          </div>

          <div class="hidden max-w-full overflow-x-auto pb-1 sm:block">
            <table class="w-max border-separate border-spacing-1 text-xs">
              <thead>
                <tr class="text-muted">
                  <th class="sticky left-0 z-10 min-w-44 bg-default px-2 py-1 text-right font-bold">
                    Equipos
                  </th>
                  <th class="w-8 px-1 py-1 text-center font-bold">
                    #
                  </th>
                  <th
                    v-for="(team, index) in group.teams"
                    :key="team.id"
                    class="w-16 px-1 py-1 text-center font-bold"
                    :title="team.name"
                  >
                    {{ index + 1 }}
                  </th>
                </tr>
              </thead>
              <tbody>
                <tr
                  v-for="row in group.rows"
                  :key="row.team.id"
                >
                  <th class="sticky left-0 z-10 max-w-44 bg-default px-2 py-1 text-right font-semibold text-primary">
                    <span class="block truncate">
                      {{ row.team.name }}
                    </span>
                  </th>
                  <td class="px-1 py-1 text-center font-semibold text-muted">
                    {{ row.index }}
                  </td>
                  <td
                    v-for="cell in row.cells"
                    :key="`${row.team.id}-${cell.opponentId}`"
                    class="h-8 w-16 rounded-md px-1 text-center text-[11px] font-semibold"
                    :class="matchupCellClass(cell.state)"
                    :title="`${row.team.name} vs ${cell.opponentName}: ${cell.title}`"
                  >
                    {{ cell.label }}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </article>
      </div>

      <div
        v-else
        class="rounded-lg border border-dashed border-default p-8 text-center text-sm text-muted"
      >
        No hay equipos suficientes para mostrar cruces con esos filtros.
      </div>
    </section>

    <div class="mb-4 grid grid-cols-2 gap-1 rounded-lg bg-muted/40 p-1 text-sm xl:hidden">
      <button
        type="button"
        class="inline-flex h-10 items-center justify-center gap-2 rounded-md font-bold transition"
        :class="mobileSection === 'WEEK' ? 'bg-default text-highlighted shadow-sm' : 'text-muted'"
        @click="mobileSection = 'WEEK'"
      >
        <UIcon
          name="i-lucide-calendar-days"
          class="size-4"
        />
        Semana
      </button>
      <button
        type="button"
        class="inline-flex h-10 items-center justify-center gap-2 rounded-md font-bold transition"
        :class="mobileSection === 'FORM' ? 'bg-default text-highlighted shadow-sm' : 'text-muted'"
        @click="resetGameForm"
      >
        <UIcon
          name="i-lucide-plus"
          class="size-4"
        />
        Partido
      </button>
    </div>

    <section class="grid gap-4 xl:grid-cols-[0.95fr_1.05fr]">
      <div class="grid gap-4">
        <form
          class="min-w-0 rounded-lg border border-default bg-default p-2.5 shadow-sm sm:p-3"
          :class="mobileSection === 'FORM' ? '' : 'hidden xl:block'"
          @submit.prevent="saveGame"
        >
          <div class="mb-2.5 flex items-center justify-between gap-2">
            <div>
              <h2 class="text-base font-bold text-highlighted">
                {{ editingGame ? 'Editar partido' : 'Nuevo partido' }}
              </h2>
              <p class="text-xs text-muted">
                {{ selectedConfig?.rounds ?? 1 }} vuelta{{ (selectedConfig?.rounds ?? 1) === 1 ? '' : 's' }} permitida{{ (selectedConfig?.rounds ?? 1) === 1 ? '' : 's' }} para este grupo.
              </p>
            </div>

            <UButton
              v-if="editingGame"
              type="button"
              icon="i-lucide-plus"
              label="Nuevo"
              color="neutral"
              variant="outline"
              size="sm"
              @click="resetGameForm"
            />
          </div>

          <div class="grid min-w-0 gap-2 sm:grid-cols-2">
            <label class="grid min-w-0 gap-1.5 text-sm">
              <span class="font-medium text-highlighted">Rol</span>
              <UInput
                v-model.number="gameForm.round"
                type="number"
                min="1"
                max="999"
                required
              />
            </label>

            <label class="grid min-w-0 gap-1.5 text-sm">
              <span class="font-medium text-highlighted">Fecha y hora</span>
              <input
                v-model="gameForm.scheduledAt"
                type="datetime-local"
                required
                class="box-border h-10 min-w-0 max-w-full appearance-none rounded-md border border-default bg-default px-3 text-sm text-highlighted outline-none focus:border-primary"
              >
            </label>

            <label class="grid min-w-0 gap-1.5 text-sm">
              <span class="font-medium text-highlighted">Categoría</span>
              <select
                v-model="gameForm.category"
                class="h-10 min-w-0 max-w-full rounded-md border border-default bg-default px-3 text-sm text-highlighted outline-none focus:border-primary"
              >
                <option
                  v-for="option in categoryOptions"
                  :key="option.value"
                  :value="option.value"
                >
                  {{ option.label }}
                </option>
              </select>
            </label>

            <label class="grid min-w-0 gap-1.5 text-sm">
              <span class="font-medium text-highlighted">Rama</span>
              <select
                v-model="gameForm.branch"
                class="h-10 min-w-0 max-w-full rounded-md border border-default bg-default px-3 text-sm text-highlighted outline-none focus:border-primary"
              >
                <option
                  v-for="option in branchOptions"
                  :key="option.value"
                  :value="option.value"
                >
                  {{ option.label }}
                </option>
              </select>
            </label>

            <label class="grid min-w-0 gap-1.5 text-sm">
              <span class="font-medium text-highlighted">Local</span>
              <select
                v-model="gameForm.homeTeamId"
                required
                class="h-10 min-w-0 max-w-full rounded-md border border-default bg-default px-3 text-sm text-highlighted outline-none focus:border-primary"
              >
                <option value="">
                  Seleccionar
                </option>
                <option
                  v-for="team in selectedGroupTeams"
                  :key="team.id"
                  :value="team.id"
                >
                  {{ team.name }}
                </option>
              </select>
            </label>

            <label class="grid min-w-0 gap-1.5 text-sm">
              <span class="font-medium text-highlighted">Visitante</span>
              <select
                v-model="gameForm.awayTeamId"
                required
                class="h-10 min-w-0 max-w-full rounded-md border border-default bg-default px-3 text-sm text-highlighted outline-none focus:border-primary"
              >
                <option value="">
                  Seleccionar
                </option>
                <option
                  v-for="team in awayTeamOptions"
                  :key="team.id"
                  :value="team.id"
                >
                  {{ team.name }}
                </option>
              </select>
            </label>

            <label class="grid min-w-0 gap-1.5 text-sm">
              <span class="font-medium text-highlighted">Campo</span>
              <select
                v-model="gameForm.fieldId"
                class="h-10 min-w-0 max-w-full rounded-md border border-default bg-default px-3 text-sm text-highlighted outline-none focus:border-primary"
              >
                <option value="">
                  Por definir
                </option>
                <option
                  v-for="field in fields"
                  :key="field.id"
                  :value="field.id"
                >
                  {{ field.name }}
                </option>
              </select>
            </label>

            <label class="grid min-w-0 gap-1.5 text-sm">
              <span class="font-medium text-highlighted">Estado</span>
              <select
                v-model="gameForm.status"
                class="h-10 min-w-0 max-w-full rounded-md border border-default bg-default px-3 text-sm text-highlighted outline-none focus:border-primary"
              >
                <option
                  v-for="option in statusOptions"
                  :key="option.value"
                  :value="option.value"
                >
                  {{ option.label }}
                </option>
              </select>
            </label>

            <label class="grid min-w-0 gap-1.5 text-sm sm:col-span-2">
              <span class="font-medium text-highlighted">Notas</span>
              <textarea
                v-model="gameForm.notes"
                rows="3"
                class="min-w-0 max-w-full rounded-md border border-default bg-default px-3 py-2 text-sm text-highlighted outline-none focus:border-primary"
                placeholder="Opcional"
              />
            </label>
          </div>

          <UButton
            type="submit"
            icon="i-lucide-save"
            :label="editingGame ? 'Actualizar partido' : 'Agregar al rol'"
            color="primary"
            class="mt-2.5"
            :disabled="!canSaveGame"
            :loading="isSavingGame"
            block
          />
        </form>
      </div>

      <section
        class="rounded-lg border border-default bg-default p-2.5 shadow-sm sm:p-3 xl:flex xl:max-h-192 xl:flex-col"
        :class="mobileSection === 'WEEK' ? '' : 'hidden xl:flex'"
      >
        <div class="mb-2.5 flex items-center justify-between gap-2">
          <div>
            <h2 class="text-base font-bold text-highlighted">
              Semana seleccionada
            </h2>
            <p class="text-xs text-muted">
              {{ pending ? 'Cargando rol...' : `${games.length} partido${games.length === 1 ? '' : 's'} programado${games.length === 1 ? '' : 's'}` }}
            </p>
          </div>
          <UIcon
            name="i-lucide-list-checks"
            class="size-5 text-muted"
          />
          <UButton
            type="button"
            icon="i-lucide-plus"
            label="Agregar"
            color="primary"
            variant="subtle"
            size="sm"
            class="xl:hidden"
            @click="resetGameForm"
          />
        </div>

        <div
          v-if="gamesByDate.length"
          class="grid gap-4 overflow-y-auto pr-1 xl:min-h-0 xl:flex-1"
        >
          <div
            v-for="group in gamesByDate"
            :key="group.key"
          >
            <h3 class="mb-2 text-sm font-semibold uppercase text-muted">
              {{ group.title }}
            </h3>

            <div class="grid gap-2">
              <article
                v-for="game in group.games"
                :key="game.id"
                class="rounded-lg border border-default p-2"
              >
                <div class="mb-2 flex flex-wrap items-center justify-between gap-2">
                  <div class="flex flex-wrap gap-1.5">
                    <UBadge
                      color="primary"
                      variant="subtle"
                    >
                      {{ roundLabel(game.round) }}
                    </UBadge>
                    <UBadge
                      :color="categoryColor(game.homeTeam.category)"
                      variant="subtle"
                    >
                      {{ categoryLabel(game.homeTeam.category) }}
                    </UBadge>
                    <UBadge
                      :color="branchColor(game.homeTeam.branch)"
                      variant="subtle"
                    >
                      {{ branchLabel(game.homeTeam.branch) }}
                    </UBadge>
                    <UBadge
                      :color="gameStatusColor(game.status)"
                      variant="subtle"
                    >
                      {{ gameStatusLabel(game.status) }}
                    </UBadge>
                  </div>

                  <div class="flex shrink-0 gap-1.5">
                    <UButton
                      type="button"
                      icon="i-lucide-calendar-x"
                      aria-label="Cancelar y dejar pendiente"
                      color="warning"
                      variant="subtle"
                      size="sm"
                      :disabled="isReleasingGame || !canReleaseGame(game)"
                      @click="releaseGame(game)"
                    />
                    <UButton
                      type="button"
                      icon="i-lucide-pencil"
                      aria-label="Editar partido"
                      color="neutral"
                      variant="outline"
                      size="sm"
                      @click="editGame(game)"
                    />
                    <UButton
                      type="button"
                      icon="i-lucide-trash-2"
                      aria-label="Eliminar partido"
                      color="error"
                      variant="subtle"
                      size="sm"
                      :disabled="Boolean(game.result)"
                      @click="deleteGame(game)"
                    />
                  </div>
                </div>

                <div class="grid gap-2 md:grid-cols-[1fr_auto_1fr] md:items-center">
                  <div class="flex min-w-0 items-center gap-3 rounded-md bg-muted/30 p-2">
                    <span
                      class="flex size-10 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white"
                      :style="{ backgroundColor: game.homeTeam.primaryColor ?? '#047857' }"
                    >
                      {{ teamInitials(game.homeTeam) }}
                    </span>
                    <div class="min-w-0">
                      <p class="truncate font-semibold text-highlighted">
                        {{ game.homeTeam.name }}
                      </p>
                      <p class="text-xs text-muted">
                        Local
                      </p>
                    </div>
                  </div>

                  <div class="rounded-md bg-muted/30 px-3 py-2 text-center">
                    <p class="text-sm font-semibold text-highlighted">
                      {{ formatGameTime(game.scheduledAt) }}
                    </p>
                    <p class="text-xs text-muted">
                      {{ game.field?.name ?? 'Campo por definir' }}
                    </p>
                  </div>

                  <div class="flex min-w-0 items-center gap-3 rounded-md bg-muted/30 p-2 md:flex-row-reverse md:text-right">
                    <span
                      class="flex size-10 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white"
                      :style="{ backgroundColor: game.awayTeam.primaryColor ?? '#f97316' }"
                    >
                      {{ teamInitials(game.awayTeam) }}
                    </span>
                    <div class="min-w-0">
                      <p class="truncate font-semibold text-highlighted">
                        {{ game.awayTeam.name }}
                      </p>
                      <p class="text-xs text-muted">
                        Visitante
                      </p>
                    </div>
                  </div>
                </div>

                <p
                  v-if="game.notes"
                  class="mt-2 text-xs text-muted"
                >
                  {{ game.notes }}
                </p>
              </article>
            </div>
          </div>
        </div>

        <div
          v-else
          class="rounded-lg border border-dashed border-default p-8 text-center"
        >
          <UIcon
            name="i-lucide-calendar-x"
            class="mx-auto mb-3 size-8 text-muted"
          />
          <p class="font-semibold text-highlighted">
            No hay partidos en esta semana.
          </p>
        </div>
      </section>
    </section>

    <UModal
      v-model:open="isReleaseModalOpen"
      title="Cancelar juego"
      :description="gamePendingRelease ? `¿Deseas cancelar ${gamePendingRelease.homeTeam.name} vs ${gamePendingRelease.awayTeam.name}? El cruce quedará pendiente para generarse en otro rol.` : ''"
    >
      <template #footer="{ close }">
        <UButton
          type="button"
          label="Mantener"
          color="neutral"
          variant="ghost"
          :disabled="isReleasingGame"
          @click="close"
        />
        <UButton
          type="button"
          label="Cancelar y liberar"
          color="warning"
          icon="i-lucide-calendar-x"
          :loading="isReleasingGame"
          @click="confirmReleaseGame"
        />
      </template>
    </UModal>

    <UModal
      v-model:open="isDeleteModalOpen"
      title="Eliminar partido"
      :description="gamePendingDelete ? `¿Seguro que deseas eliminar ${gamePendingDelete.homeTeam.name} vs ${gamePendingDelete.awayTeam.name}?` : ''"
    >
      <template #footer="{ close }">
        <UButton
          type="button"
          label="Cancelar"
          color="neutral"
          variant="ghost"
          :disabled="isDeletingGame"
          @click="close"
        />
        <UButton
          type="button"
          label="Eliminar"
          color="error"
          icon="i-lucide-trash-2"
          :loading="isDeletingGame"
          @click="confirmDeleteGame"
        />
      </template>
    </UModal>
  </UContainer>
</template>
