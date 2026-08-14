<script setup lang="ts">
import {
  TEAM_BRANCH_OPTIONS,
  TEAM_CATEGORY_OPTIONS,
  branchColor,
  branchLabel,
  categoryColor,
  categoryLabel,
  formatGameDate,
  formatGameTime,
  formatScheduleDay,
  gameStatusColor,
  gameStatusLabel,
  roundLabel,
  scheduleDateKey,
  teamInitials,
  type Game,
  type Season,
  type TeamBranch,
  type TeamCategory
} from '~/utils/league'

type GameGroup = {
  key: string
  title: string
  games: Game[]
}

useSeoMeta({
  title: 'Rol | DiamondPanel',
  description: 'Rol de juegos de la temporada activa de DiamondPanel.'
})

const selectedCategory = ref<'ALL' | TeamCategory>('ALL')
const selectedBranch = ref<'ALL' | TeamBranch>('ALL')
const gamesQuery = computed(() => ({
  limit: 50,
  ...(selectedCategory.value === 'ALL' ? {} : { category: selectedCategory.value }),
  ...(selectedBranch.value === 'ALL' ? {} : { branch: selectedBranch.value })
}))

const { data: season } = await useFetch<Season>('/api/seasons/active')
const { data: games } = await useFetch<Game[]>('/api/games/upcoming', {
  query: gamesQuery
})

const upcomingGames = computed(() =>
  [...(games.value ?? [])].sort((a, b) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime())
)
const nextGame = computed(() => upcomingGames.value[0])
const postponedGames = computed(() => upcomingGames.value.filter(game => game.status === 'POSTPONED').length)
const gamesByDate = computed(() => {
  const groups = new Map<string, GameGroup>()

  for (const game of upcomingGames.value) {
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
    games: group.games.sort((a, b) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime())
  }))
})
</script>

<template>
  <UContainer class="py-6 sm:py-8">
    <div class="mb-6 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
      <div>
        <div class="mb-3 flex flex-wrap items-center gap-2">
          <UBadge
            color="primary"
            variant="subtle"
            icon="i-lucide-calendar-days"
          >
            Rol de juegos
          </UBadge>
          <UBadge
            color="neutral"
            variant="outline"
          >
            {{ season?.name }} {{ season?.year }}
          </UBadge>
        </div>
        <h1 class="text-3xl font-bold tracking-normal text-highlighted sm:text-4xl">
          Próximos partidos
        </h1>
        <p class="mt-2 max-w-2xl text-base text-muted">
          Consulta el calendario por jornada, campo, horario y estado del partido.
        </p>
      </div>

      <div class="grid grid-cols-2 gap-2 rounded-lg border border-default bg-muted/30 p-2 text-center">
        <div class="rounded-md bg-default px-3 py-2">
          <p class="text-xl font-bold text-highlighted">
            {{ upcomingGames.length }}
          </p>
          <p class="text-xs text-muted">
            En rol
          </p>
        </div>
        <div class="rounded-md bg-default px-3 py-2">
          <p class="text-xl font-bold text-highlighted">
            {{ postponedGames }}
          </p>
          <p class="text-xs text-muted">
            Suspendidos
          </p>
        </div>
      </div>
    </div>

    <div class="mb-4 grid gap-3 rounded-lg border border-default bg-default p-3 shadow-sm sm:grid-cols-2">
      <label class="grid gap-1 text-sm">
        <span class="font-medium text-highlighted">Categoría</span>
        <select
          v-model="selectedCategory"
          class="h-10 w-full rounded-md border border-default bg-default px-3 text-sm text-highlighted outline-none focus:border-primary"
        >
          <option
            v-for="option in TEAM_CATEGORY_OPTIONS"
            :key="option.value"
            :value="option.value"
          >
            {{ option.label }}
          </option>
        </select>
      </label>

      <label class="grid gap-1 text-sm">
        <span class="font-medium text-highlighted">Rama</span>
        <select
          v-model="selectedBranch"
          class="h-10 w-full rounded-md border border-default bg-default px-3 text-sm text-highlighted outline-none focus:border-primary"
        >
          <option
            v-for="option in TEAM_BRANCH_OPTIONS"
            :key="option.value"
            :value="option.value"
          >
            {{ option.label }}
          </option>
        </select>
      </label>
    </div>

    <section
      v-if="nextGame"
      class="mb-4 rounded-lg border border-default bg-default p-5 shadow-sm"
    >
      <div class="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p class="text-sm font-semibold text-primary">
            Siguiente juego
          </p>
          <h2 class="text-xl font-bold text-highlighted">
            {{ roundLabel(nextGame.round) }}
          </h2>
        </div>
        <div class="flex flex-wrap gap-2">
          <UBadge
            :color="categoryColor(nextGame.homeTeam.category)"
            variant="subtle"
          >
            {{ categoryLabel(nextGame.homeTeam.category) }}
          </UBadge>
          <UBadge
            :color="branchColor(nextGame.homeTeam.branch)"
            variant="subtle"
          >
            {{ branchLabel(nextGame.homeTeam.branch) }}
          </UBadge>
          <UBadge
            :color="gameStatusColor(nextGame.status)"
            variant="subtle"
          >
            {{ gameStatusLabel(nextGame.status) }}
          </UBadge>
        </div>
      </div>

      <div class="grid gap-4 lg:grid-cols-[1fr_auto_1fr] lg:items-center">
        <div class="flex items-center gap-3 rounded-lg border border-default bg-muted/30 p-4">
          <span
            class="flex size-14 shrink-0 items-center justify-center rounded-full text-sm font-bold text-white"
            :style="{ backgroundColor: nextGame.homeTeam.primaryColor ?? '#047857' }"
          >
            {{ teamInitials(nextGame.homeTeam) }}
          </span>
          <div class="min-w-0">
            <p class="text-sm text-muted">
              Local
            </p>
            <p class="truncate text-lg font-bold text-highlighted">
              {{ nextGame.homeTeam.name }}
            </p>
          </div>
        </div>

        <div class="rounded-md border border-default bg-muted/30 px-4 py-3 text-center">
          <p class="text-xs font-semibold uppercase text-muted">
            {{ formatGameDate(nextGame.scheduledAt) }}
          </p>
          <p class="mt-1 text-sm text-highlighted">
            {{ nextGame.field?.name ?? 'Campo por definir' }}
          </p>
        </div>

        <div class="flex items-center gap-3 rounded-lg border border-default bg-muted/30 p-4 lg:flex-row-reverse lg:text-right">
          <span
            class="flex size-14 shrink-0 items-center justify-center rounded-full text-sm font-bold text-white"
            :style="{ backgroundColor: nextGame.awayTeam.primaryColor ?? '#f97316' }"
          >
            {{ teamInitials(nextGame.awayTeam) }}
          </span>
          <div class="min-w-0">
            <p class="text-sm text-muted">
              Visitante
            </p>
            <p class="truncate text-lg font-bold text-highlighted">
              {{ nextGame.awayTeam.name }}
            </p>
          </div>
        </div>
      </div>
    </section>

    <section class="rounded-lg border border-default bg-default p-5 shadow-sm">
      <div class="mb-4 flex items-center justify-between gap-3">
        <div>
          <h2 class="text-xl font-bold text-highlighted">
            Calendario
          </h2>
          <p class="text-sm text-muted">
            Partidos pendientes ordenados por fecha y hora.
          </p>
        </div>
        <UIcon
          name="i-lucide-list-checks"
          class="size-5 text-muted"
        />
      </div>

      <div
        v-if="gamesByDate.length"
        class="grid gap-5"
      >
        <div
          v-for="group in gamesByDate"
          :key="group.key"
        >
          <h3 class="mb-2 text-sm font-semibold uppercase text-muted">
            {{ group.title }}
          </h3>

          <div class="grid gap-2">
            <div
              v-for="game in group.games"
              :key="game.id"
              class="grid gap-3 rounded-lg border border-default p-3 md:grid-cols-[1fr_auto_1fr] md:items-center"
            >
              <div class="flex min-w-0 items-center gap-3">
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
                  {{ formatGameDate(game.scheduledAt) }}
                </p>
                <p class="mt-1 text-xs text-muted">
                  {{ game.field?.name ?? 'Campo por definir' }}
                </p>
                <div class="mt-2 flex flex-wrap justify-center gap-1">
                  <UBadge
                    :color="categoryColor(game.homeTeam.category)"
                    variant="subtle"
                    size="sm"
                  >
                    {{ categoryLabel(game.homeTeam.category) }}
                  </UBadge>
                  <UBadge
                    :color="branchColor(game.homeTeam.branch)"
                    variant="subtle"
                    size="sm"
                  >
                    {{ branchLabel(game.homeTeam.branch) }}
                  </UBadge>
                  <UBadge
                    :color="gameStatusColor(game.status)"
                    variant="subtle"
                    size="sm"
                  >
                    {{ gameStatusLabel(game.status) }}
                  </UBadge>
                </div>
              </div>

              <div class="flex min-w-0 items-center gap-3 md:flex-row-reverse md:text-right">
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
          No hay partidos pendientes.
        </p>
      </div>
    </section>
  </UContainer>
</template>
