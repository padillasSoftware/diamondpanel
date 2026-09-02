<script setup lang="ts">
import {
  battingHighlightLabel,
  branchColor,
  branchLabel,
  categoryColor,
  categoryLabel,
  formatGameDate,
  formatShortDate,
  resultPersonName,
  resultWinnerLabel,
  roundLabel,
  scoreClass,
  type GameBattingHighlightSide,
  type ResultGame,
  type Season
} from '~/utils/league'

type ResultScope = 'TEAM' | 'GROUP'

useSeoMeta({
  title: 'Resultados | DiamondPanel',
  description: 'Resultados recientes de la temporada activa de DiamondPanel.'
})

const { user } = useAuth()
const selectedScope = ref<ResultScope>('TEAM')
const managedTeam = computed(() => user.value?.role === 'ADMIN' ? null : user.value?.activeTeam ?? null)
const canFilterByManagedTeam = computed(() => Boolean(managedTeam.value))
const resultsQuery = computed(() => {
  const query: Record<string, string | number> = { limit: 50 }
  const team = managedTeam.value

  if (!team) return query

  if (selectedScope.value === 'TEAM') {
    query.scope = 'mine'
  } else {
    query.category = team.category
    query.branch = team.branch
  }

  return query
})
const [
  { data: season },
  { data: results, pending }
] = await Promise.all([
  useFetch<Season>('/api/seasons/active'),
  useFetch<ResultGame[]>('/api/results/recent', { query: resultsQuery })
])

const resultRows = computed(() => results.value ?? [])
const totalRuns = computed(() => resultRows.value.reduce((total, game) => total + game.result.homeScore + game.result.awayScore, 0))
const averageRuns = computed(() => resultRows.value.length ? (totalRuns.value / resultRows.value.length).toFixed(1) : '0.0')
const latestResult = computed(() => resultRows.value[0])
const scopeDescription = computed(() => {
  const team = managedTeam.value

  if (!team) return 'Ordenados del más reciente al más antiguo.'
  if (selectedScope.value === 'TEAM') return `Solo partidos de ${team.name}.`

  return `${categoryLabel(team.category)} • ${branchLabel(team.branch)}.`
})

function battingHighlightsBySide(game: ResultGame, side: GameBattingHighlightSide) {
  return game.result.battingHighlights.filter(highlight => highlight.side === side)
}

function loserTeamName(game: ResultGame) {
  if (game.result.homeScore === game.result.awayScore) return 'Empate'

  return game.result.homeScore < game.result.awayScore
    ? game.homeTeam.name
    : game.awayTeam.name
}
</script>

<template>
  <UContainer class="min-w-0 pb-6 pt-4 sm:py-8">
    <div class="mb-6 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
      <div class="min-w-0">
        <div class="mb-3 flex flex-wrap items-center gap-2">
          <UBadge
            color="primary"
            variant="subtle"
            icon="i-lucide-table-2"
          >
            Resultados
          </UBadge>
          <UBadge
            color="neutral"
            variant="outline"
          >
            {{ season?.name }} {{ season?.year }}
          </UBadge>
        </div>
        <h1 class="text-2xl font-bold leading-tight tracking-normal text-highlighted sm:text-4xl">
          Marcadores finales
        </h1>
        <p class="mt-2 max-w-2xl text-sm text-muted sm:text-base">
          {{ scopeDescription }}
        </p>
      </div>

      <UButton
        to="/posiciones"
        icon="i-lucide-trophy"
        label="Ver posiciones"
        color="primary"
        variant="subtle"
        class="w-full justify-center sm:w-auto"
      />
    </div>

    <div class="mb-4 grid grid-cols-3 gap-2 sm:gap-3">
      <div class="min-w-0 rounded-lg border border-default bg-default p-3 text-center shadow-sm sm:p-4 sm:text-left">
        <p class="truncate text-xs text-muted sm:text-sm">
          Finales
        </p>
        <p class="mt-1 text-xl font-bold text-highlighted sm:text-2xl">
          {{ resultRows.length }}
        </p>
        <p class="hidden text-sm text-muted sm:block">
          Con resultado capturado
        </p>
      </div>

      <div class="min-w-0 rounded-lg border border-default bg-default p-3 text-center shadow-sm sm:p-4 sm:text-left">
        <p class="truncate text-xs text-muted sm:text-sm">
          Carreras
        </p>
        <p class="mt-1 text-xl font-bold text-highlighted sm:text-2xl">
          {{ totalRuns }}
        </p>
        <p class="hidden text-sm text-muted sm:block">
          {{ averageRuns }} por partido
        </p>
      </div>

      <div class="min-w-0 rounded-lg border border-default bg-default p-3 text-center shadow-sm sm:p-4 sm:text-left">
        <p class="truncate text-xs text-muted sm:text-sm">
          Reciente
        </p>
        <p class="mt-1 truncate text-lg font-bold text-highlighted sm:text-2xl">
          {{ latestResult ? resultWinnerLabel(latestResult) : '-' }}
        </p>
        <p class="hidden text-sm text-muted sm:block">
          {{ latestResult ? formatShortDate(latestResult.scheduledAt) : '-' }}
        </p>
      </div>
    </div>

    <section class="rounded-lg border border-default bg-default p-3 shadow-sm sm:p-5">
      <div class="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h2 class="text-lg font-bold text-highlighted sm:text-xl">
            Juegos completados
          </h2>
          <p class="text-sm text-muted">
            {{ scopeDescription }}
          </p>
        </div>
        <div
          v-if="canFilterByManagedTeam"
          class="grid grid-cols-2 gap-1 rounded-md bg-muted/40 p-1 text-sm"
        >
          <button
            type="button"
            class="inline-flex h-9 items-center justify-center gap-1.5 rounded-md px-3 font-medium transition"
            :class="selectedScope === 'TEAM' ? 'bg-default text-highlighted shadow-sm' : 'text-muted hover:text-highlighted'"
            @click="selectedScope = 'TEAM'"
          >
            <UIcon
              name="i-lucide-shield"
              class="size-4"
            />
            Mi equipo
          </button>
          <button
            type="button"
            class="inline-flex h-9 items-center justify-center gap-1.5 rounded-md px-3 font-medium transition"
            :class="selectedScope === 'GROUP' ? 'bg-default text-highlighted shadow-sm' : 'text-muted hover:text-highlighted'"
            @click="selectedScope = 'GROUP'"
          >
            <UIcon
              name="i-lucide-users"
              class="size-4"
            />
            Mi categoría
          </button>
        </div>
      </div>

      <div
        v-if="pending"
        class="rounded-lg border border-dashed border-default p-8 text-center"
      >
        <UIcon
          name="i-lucide-loader-circle"
          class="mx-auto mb-3 size-8 animate-spin text-muted"
        />
        <p class="font-semibold text-highlighted">
          Cargando resultados...
        </p>
      </div>

      <div
        v-else-if="resultRows.length"
        class="grid gap-3"
      >
        <article
          v-for="game in resultRows"
          :key="game.id"
          class="rounded-lg border border-default p-3 sm:p-4"
        >
          <div class="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div class="min-w-0 text-sm text-muted">
              <p class="font-semibold text-highlighted">
                {{ roundLabel(game.round) }}
              </p>
              <p class="truncate">
                {{ formatGameDate(game.scheduledAt) }} · {{ game.field?.name ?? 'Campo por definir' }}
              </p>
            </div>
            <div class="flex flex-wrap gap-1">
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
                color="success"
                variant="subtle"
              >
                {{ resultWinnerLabel(game) }}
              </UBadge>
            </div>
          </div>

          <div class="grid gap-2">
            <div class="grid grid-cols-[1fr_auto] items-center gap-3 rounded-md bg-muted/30 px-3 py-2">
              <div class="flex min-w-0 items-center gap-3">
                <TeamAvatar
                  :team="game.homeTeam"
                  class="size-9 text-xs font-bold"
                />
                <p
                  class="truncate font-semibold"
                  :class="scoreClass(game, 'home')"
                >
                  {{ game.homeTeam.name }}
                </p>
              </div>
              <p
                class="text-2xl font-black"
                :class="scoreClass(game, 'home')"
              >
                {{ game.result.homeScore }}
              </p>
            </div>

            <div class="grid grid-cols-[1fr_auto] items-center gap-3 rounded-md bg-muted/30 px-3 py-2">
              <div class="flex min-w-0 items-center gap-3">
                <TeamAvatar
                  :team="game.awayTeam"
                  class="size-9 text-xs font-bold"
                />
                <p
                  class="truncate font-semibold"
                  :class="scoreClass(game, 'away')"
                >
                  {{ game.awayTeam.name }}
                </p>
              </div>
              <p
                class="text-2xl font-black"
                :class="scoreClass(game, 'away')"
              >
                {{ game.result.awayScore }}
              </p>
            </div>
          </div>

          <p class="mt-3 text-xs font-medium uppercase text-muted sm:text-sm">
            {{ game.result.innings ?? 7 }} innings{{ game.result.isForfeit ? ' • Forfeit' : '' }}
          </p>

          <div
            v-if="!game.result.isForfeit || game.result.notes"
            class="mt-3 grid gap-2 rounded-lg border border-default bg-muted/20 p-3 text-sm md:grid-cols-2"
          >
            <div
              v-if="!game.result.isForfeit"
              class="grid gap-1"
            >
              <p class="font-semibold text-highlighted">
                Pitchers
              </p>
              <p class="text-muted">
                PG: {{ resultPersonName(game.result.winningPitcherName, game.result.winningPitcher) }}
              </p>
              <p class="text-muted">
                PD: {{ resultPersonName(game.result.losingPitcherName, game.result.losingPitcher) }}
              </p>
            </div>

            <div
              v-if="game.result.notes"
              class="text-sm text-muted"
            >
              <p class="font-semibold text-highlighted">
                Notas
              </p>
              <p>{{ game.result.notes }}</p>
            </div>
          </div>

          <div
            v-if="game.result.battingHighlights.length"
            class="mt-3 grid gap-2 md:grid-cols-2"
          >
            <div class="rounded-lg border border-default p-3">
              <p class="mb-2 text-sm font-semibold text-highlighted">
                Bateadores ganador
              </p>
              <div class="grid gap-1 text-sm text-muted">
                <p
                  v-for="highlight in battingHighlightsBySide(game, 'WINNER')"
                  :key="highlight.id"
                >
                  {{ battingHighlightLabel(highlight) }}
                </p>
              </div>
            </div>

            <div class="rounded-lg border border-default p-3">
              <p class="mb-2 text-sm font-semibold text-highlighted">
                Bateadores derrotado · {{ loserTeamName(game) }}
              </p>
              <div class="grid gap-1 text-sm text-muted">
                <p
                  v-for="highlight in battingHighlightsBySide(game, 'LOSER')"
                  :key="highlight.id"
                >
                  {{ battingHighlightLabel(highlight) }}
                </p>
              </div>
            </div>
          </div>
        </article>
      </div>

      <div
        v-else
        class="rounded-lg border border-dashed border-default p-8 text-center"
      >
        <UIcon
          name="i-lucide-clipboard-x"
          class="mx-auto mb-3 size-8 text-muted"
        />
        <p class="font-semibold text-highlighted">
          Aún no hay resultados capturados.
        </p>
      </div>
    </section>
  </UContainer>
</template>
