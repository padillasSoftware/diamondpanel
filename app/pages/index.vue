<script setup lang="ts">
import {
  branchColor,
  branchLabel,
  categoryColor,
  categoryLabel,
  formatGameDate,
  formatRunDifferential,
  scoreClass,
  teamInitials,
  type Game,
  type ResultGame,
  type Season,
  type Standing,
  type Team
} from '~/utils/league'

type MatchupCellState = 'SELF' | 'PENDING' | 'SCHEDULED' | 'POSTPONED' | 'WON' | 'TIED' | 'LOST' | 'DEFAULT' | 'CANCELLED'

type MatchupMatrixTeam = Pick<Team, 'id' | 'name' | 'shortName' | 'slug' | 'logoUrl' | 'primaryColor' | 'secondaryColor' | 'category' | 'branch'>

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
  category: string
  branch: string
  teams: MatchupMatrixTeam[]
  rows: {
    team: MatchupMatrixTeam
    index: number
    cells: MatchupMatrixCell[]
  }[]
}

type MatchupMatrixResponse = {
  season: Season
  groups: MatchupMatrixGroup[]
}

const [
  { data: season },
  { data: standings },
  { data: upcomingGames },
  { data: recentResults },
  { data: teams },
  { data: matchupMatrix }
] = await Promise.all([
  useFetch<Season>('/api/seasons/active'),
  useFetch<Standing[]>('/api/standings'),
  useFetch<Game[]>('/api/games/upcoming', { query: { limit: 4 } }),
  useFetch<ResultGame[]>('/api/results/recent', { query: { limit: 4 } }),
  useFetch<Team[]>('/api/teams'),
  useFetch<MatchupMatrixResponse>('/api/matchups/matrix')
])

const topStandings = computed(() => standings.value?.slice(0, 5) ?? [])
const nextGame = computed(() => upcomingGames.value?.[0])
const completedGames = computed(() => recentResults.value?.length ?? 0)
const featuredTeams = computed(() => teams.value?.slice(0, 6) ?? [])
const matchupGroups = computed(() => matchupMatrix.value?.groups ?? [])
const selectedMatchupGroupId = ref('')
const showMatchupMatrix = ref(false)
const selectedMatchupGroup = computed(() =>
  matchupGroups.value.find(group => group.id === selectedMatchupGroupId.value) ?? matchupGroups.value[0] ?? null
)
const { public: { leagueName } } = useRuntimeConfig()

const matchupLegend = [
  { label: 'pendiente', state: 'PENDING' },
  { label: 'programado', state: 'SCHEDULED' },
  { label: 'ganado', state: 'WON' },
  { label: 'empatado', state: 'TIED' },
  { label: 'perdido', state: 'LOST' },
  { label: 'p. default', state: 'DEFAULT' }
] satisfies { label: string, state: MatchupCellState }[]

watch(matchupGroups, (groups) => {
  if (!groups.length) {
    selectedMatchupGroupId.value = ''
    return
  }

  if (!groups.some(group => group.id === selectedMatchupGroupId.value)) {
    selectedMatchupGroupId.value = groups[0]?.id ?? ''
  }
}, { immediate: true })

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
</script>

<template>
  <UContainer class="min-w-0 py-5 sm:py-8">
    <div class="mb-6 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
      <div class="min-w-0">
        <div class="mb-3 flex flex-wrap items-center gap-2">
          <UBadge
            color="primary"
            variant="subtle"
            icon="i-lucide-leaf"
          >
            {{ season?.name }} {{ season?.year }}
          </UBadge>
          <UBadge
            color="neutral"
            variant="outline"
            icon="i-lucide-radio"
          >
            Datos en vivo
          </UBadge>
        </div>

        <h1 class="wrap-break-word text-3xl font-bold tracking-normal text-highlighted sm:text-4xl">
          {{ leagueName }}
        </h1>
        <p class="mt-2 max-w-2xl text-base text-muted">
          Consulta posiciones, rol de juegos, resultados recientes y equipos desde un panel rápido para la temporada activa.
        </p>
      </div>

      <div class="grid w-full min-w-0 grid-cols-3 gap-2 rounded-lg border border-default bg-muted/30 p-2 text-center lg:w-auto">
        <div class="min-w-0 rounded-md bg-default px-2 py-2 sm:px-3">
          <p class="text-xl font-bold text-highlighted">
            {{ teams?.length ?? 0 }}
          </p>
          <p class="text-xs text-muted">
            Equipos
          </p>
        </div>
        <div class="min-w-0 rounded-md bg-default px-2 py-2 sm:px-3">
          <p class="text-xl font-bold text-highlighted">
            {{ upcomingGames?.length ?? 0 }}
          </p>
          <p class="text-xs text-muted">
            En rol
          </p>
        </div>
        <div class="min-w-0 rounded-md bg-default px-2 py-2 sm:px-3">
          <p class="text-xl font-bold text-highlighted">
            {{ completedGames }}
          </p>
          <p class="text-xs text-muted">
            Finales
          </p>
        </div>
      </div>
    </div>

    <section class="mb-4 min-w-0 rounded-lg border border-default bg-default p-4 shadow-sm sm:p-5">
      <div class="mb-4 flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p class="text-sm font-semibold text-primary">
            Etapa: Regular
          </p>
          <h2 class="text-xl font-bold text-highlighted">
            Matriz de cruces
          </h2>
        </div>

        <div class="flex flex-col gap-2 sm:flex-row sm:items-end">
          <label
            v-if="showMatchupMatrix && matchupGroups.length > 1"
            class="grid gap-1.5 text-sm sm:min-w-56"
          >
            <span class="font-medium text-highlighted">Grupo</span>
            <select
              v-model="selectedMatchupGroupId"
              class="h-10 w-full rounded-md border border-default bg-default px-3 text-sm text-highlighted outline-none focus:border-primary"
            >
              <option
                v-for="group in matchupGroups"
                :key="group.id"
                :value="group.id"
              >
                {{ group.label }}
              </option>
            </select>
          </label>

          <UButton
            type="button"
            :icon="showMatchupMatrix ? 'i-lucide-chevron-up' : 'i-lucide-chevron-down'"
            :label="showMatchupMatrix ? 'Ocultar cruces' : 'Ver cruces'"
            color="neutral"
            variant="outline"
            @click="showMatchupMatrix = !showMatchupMatrix"
          />
        </div>
      </div>

      <template v-if="showMatchupMatrix">
        <div class="mb-4 grid gap-2 text-xs sm:grid-cols-3 lg:grid-cols-6">
          <div
            v-for="item in matchupLegend"
            :key="item.state"
            class="rounded-md border-t-4 bg-muted/20 px-2 py-1.5 text-center text-muted"
            :class="{
              'border-neutral-300': item.state === 'PENDING',
              'border-cyan-400': item.state === 'SCHEDULED',
              'border-lime-400': item.state === 'WON',
              'border-yellow-400': item.state === 'TIED',
              'border-red-400': item.state === 'LOST',
              'border-orange-400': item.state === 'DEFAULT'
            }"
          >
            {{ item.label }}
          </div>
        </div>

        <div
          v-if="selectedMatchupGroup"
          class="max-w-full overflow-x-auto pb-1"
        >
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
                  v-for="(team, index) in selectedMatchupGroup.teams"
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
                v-for="row in selectedMatchupGroup.rows"
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

        <div
          v-else
          class="rounded-lg border border-dashed border-default p-6 text-center text-sm text-muted"
        >
          Aún no hay equipos suficientes para mostrar cruces.
        </div>
      </template>
    </section>

    <div class="grid min-w-0 gap-4 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
      <section
        id="rol"
        class="min-w-0 rounded-lg border border-default bg-default p-4 shadow-sm sm:p-5"
      >
        <div class="mb-4 flex items-center justify-between gap-3">
          <div>
            <p class="text-sm font-semibold text-primary">
              Próximo partido
            </p>
            <h2 class="text-xl font-bold text-highlighted">
              Rol de juegos
            </h2>
          </div>
          <UIcon
            name="i-lucide-calendar-days"
            class="size-5 text-muted"
          />
        </div>

        <div
          v-if="nextGame"
          class="rounded-lg border border-default bg-muted/30 p-3 sm:p-4"
        >
          <div class="mb-4 flex flex-col gap-1 text-sm text-muted sm:flex-row sm:items-center sm:justify-between sm:gap-2">
            <span>{{ formatGameDate(nextGame.scheduledAt) }}</span>
            <span>{{ nextGame.field?.name ?? 'Campo por definir' }}</span>
          </div>

          <div class="grid gap-3 sm:grid-cols-[1fr_auto_1fr] sm:items-center">
            <div class="flex min-w-0 items-center gap-3 rounded-md bg-default p-3 sm:block sm:bg-transparent sm:p-0 sm:text-center">
              <div
                class="flex size-12 shrink-0 items-center justify-center rounded-full text-sm font-bold text-white shadow-sm sm:mx-auto sm:size-16 sm:text-lg"
                :style="{ backgroundColor: nextGame.homeTeam.primaryColor ?? '#047857' }"
              >
                {{ teamInitials(nextGame.homeTeam) }}
              </div>
              <div class="min-w-0 sm:mt-2">
                <p class="truncate font-semibold text-highlighted sm:overflow-visible sm:text-clip sm:whitespace-normal">
                  {{ nextGame.homeTeam.name }}
                </p>
                <p class="text-xs text-muted sm:hidden">
                  Local
                </p>
              </div>
            </div>

            <div class="mx-auto rounded-md border border-default bg-default px-3 py-2 text-sm font-bold text-muted sm:mx-0">
              vs
            </div>

            <div class="flex min-w-0 items-center gap-3 rounded-md bg-default p-3 sm:block sm:bg-transparent sm:p-0 sm:text-center">
              <div
                class="flex size-12 shrink-0 items-center justify-center rounded-full text-sm font-bold text-white shadow-sm sm:mx-auto sm:size-16 sm:text-lg"
                :style="{ backgroundColor: nextGame.awayTeam.primaryColor ?? '#f97316' }"
              >
                {{ teamInitials(nextGame.awayTeam) }}
              </div>
              <div class="min-w-0 sm:mt-2">
                <p class="truncate font-semibold text-highlighted sm:overflow-visible sm:text-clip sm:whitespace-normal">
                  {{ nextGame.awayTeam.name }}
                </p>
                <p class="text-xs text-muted sm:hidden">
                  Visitante
                </p>
              </div>
            </div>
          </div>
        </div>

        <div class="mt-4 grid gap-2">
          <div
            v-for="game in upcomingGames?.slice(1)"
            :key="game.id"
            class="grid gap-2 rounded-md border border-default px-3 py-2 sm:grid-cols-[1fr_auto] sm:items-center"
          >
            <div class="min-w-0">
              <p class="truncate text-sm font-semibold text-highlighted">
                {{ game.homeTeam.name }} vs {{ game.awayTeam.name }}
              </p>
              <p class="text-xs text-muted">
                Rol #{{ game.round ?? '-' }} • {{ game.field?.name ?? 'Campo por definir' }}
              </p>
            </div>
            <UBadge
              :color="game.status === 'POSTPONED' ? 'warning' : 'primary'"
              variant="subtle"
              class="w-fit sm:justify-self-end"
            >
              {{ game.status === 'POSTPONED' ? 'Suspendido' : formatGameDate(game.scheduledAt) }}
            </UBadge>
          </div>
        </div>
      </section>

      <section
        id="posiciones"
        class="min-w-0 rounded-lg border border-default bg-default p-4 shadow-sm sm:p-5"
      >
        <div class="mb-4 flex items-center justify-between">
          <div>
            <p class="text-sm font-semibold text-primary">
              Temporada activa
            </p>
            <h2 class="text-xl font-bold text-highlighted">
              Tabla de posiciones
            </h2>
          </div>
          <UIcon
            name="i-lucide-trophy"
            class="size-5 text-muted"
          />
        </div>

        <div class="max-w-full overflow-x-auto">
          <table class="w-full min-w-130 text-sm">
            <thead>
              <tr class="border-b border-default text-left text-xs uppercase text-muted">
                <th class="py-2 pr-3">
                  #
                </th>
                <th class="py-2 pr-3">
                  Equipo
                </th>
                <th class="py-2 pr-3 text-right">
                  JJ
                </th>
                <th class="py-2 pr-3 text-right">
                  G
                </th>
                <th class="py-2 pr-3 text-right">
                  P
                </th>
                <th class="py-2 pr-3 text-right">
                  %
                </th>
                <th class="py-2 text-right">
                  Dif.
                </th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="standing in topStandings"
                :key="standing.team.id"
                class="border-b border-muted last:border-0"
              >
                <td class="py-3 pr-3 font-semibold text-muted">
                  {{ standing.rank }}
                </td>
                <td class="py-3 pr-3">
                  <div class="flex items-center gap-2">
                    <span
                      class="flex size-7 items-center justify-center rounded-full text-xs font-bold text-white"
                      :style="{ backgroundColor: standing.team.primaryColor ?? '#047857' }"
                    >
                      {{ teamInitials(standing.team) }}
                    </span>
                    <span class="font-semibold text-highlighted">{{ standing.team.name }}</span>
                  </div>
                </td>
                <td class="py-3 pr-3 text-right text-muted">
                  {{ standing.played }}
                </td>
                <td class="py-3 pr-3 text-right text-muted">
                  {{ standing.wins }}
                </td>
                <td class="py-3 pr-3 text-right text-muted">
                  {{ standing.losses }}
                </td>
                <td class="py-3 pr-3 text-right font-semibold text-highlighted">
                  {{ standing.winPercentageText }}
                </td>
                <td class="py-3 text-right font-semibold text-highlighted">
                  {{ formatRunDifferential(standing.runDifferential) }}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>
    </div>

    <div class="mt-4 grid min-w-0 gap-4 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
      <section
        id="resultados"
        class="min-w-0 rounded-lg border border-default bg-default p-4 shadow-sm sm:p-5"
      >
        <div class="mb-4 flex items-center justify-between">
          <div>
            <p class="text-sm font-semibold text-primary">
              Últimos marcadores
            </p>
            <h2 class="text-xl font-bold text-highlighted">
              Resultados
            </h2>
          </div>
          <UIcon
            name="i-lucide-table-2"
            class="size-5 text-muted"
          />
        </div>

        <div class="grid gap-3">
          <div
            v-for="game in recentResults"
            :key="game.id"
            class="rounded-md border border-default p-3"
          >
            <div class="mb-2 flex items-center justify-between text-xs text-muted">
              <span>Rol #{{ game.round ?? '-' }}</span>
              <span>{{ game.field?.name ?? 'Campo por definir' }}</span>
            </div>
            <div class="grid grid-cols-[1fr_auto] items-center gap-3">
              <div class="min-w-0">
                <p
                  class="truncate text-sm font-semibold"
                  :class="scoreClass(game, 'home')"
                >
                  {{ game.homeTeam.name }}
                </p>
                <p
                  class="truncate text-sm font-semibold"
                  :class="scoreClass(game, 'away')"
                >
                  {{ game.awayTeam.name }}
                </p>
              </div>
              <div class="text-right text-lg font-bold leading-tight text-highlighted">
                <p>{{ game.result.homeScore }}</p>
                <p>{{ game.result.awayScore }}</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section
        id="equipos"
        class="min-w-0 rounded-lg border border-default bg-default p-4 shadow-sm sm:p-5"
      >
        <div class="mb-4 flex items-center justify-between">
          <div>
            <p class="text-sm font-semibold text-primary">
              Clubes registrados
            </p>
            <h2 class="text-xl font-bold text-highlighted">
              Equipos
            </h2>
          </div>
          <UIcon
            name="i-lucide-users"
            class="size-5 text-muted"
          />
        </div>

        <div class="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          <div
            v-for="team in featuredTeams"
            :key="team.id"
            class="rounded-lg border border-default p-3"
          >
            <div class="flex items-center gap-3">
              <span
                class="flex size-11 shrink-0 items-center justify-center rounded-full text-sm font-bold text-white"
                :style="{ backgroundColor: team.primaryColor ?? '#047857' }"
              >
                {{ teamInitials(team) }}
              </span>
              <div class="min-w-0">
                <p class="truncate font-semibold text-highlighted">
                  {{ team.name }}
                </p>
                <p class="truncate text-xs text-muted">
                  {{ team.managerName ?? 'Manager por definir' }}
                </p>
                <div class="mt-1 flex flex-wrap gap-1">
                  <UBadge
                    :color="categoryColor(team.category)"
                    variant="subtle"
                    size="sm"
                  >
                    {{ categoryLabel(team.category) }}
                  </UBadge>
                  <UBadge
                    :color="branchColor(team.branch)"
                    variant="subtle"
                    size="sm"
                  >
                    {{ branchLabel(team.branch) }}
                  </UBadge>
                </div>
              </div>
            </div>
          </div>
        </div>

        <UButton
          to="/equipos"
          icon="i-lucide-users"
          label="Ver todos"
          color="neutral"
          variant="ghost"
          size="sm"
          class="mt-4"
        />
      </section>
    </div>
  </UContainer>
</template>
