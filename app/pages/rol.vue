<script setup lang="ts">
import {
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
  type Season
} from '~/utils/league'

type GameGroup = {
  key: string
  title: string
  games: Game[]
}

type ScheduleScope = 'TEAM' | 'GROUP'

useSeoMeta({
  title: 'Rol | DiamondPanel',
  description: 'Rol de juegos de la temporada activa de DiamondPanel.'
})

const { user } = useAuth()
const selectedScope = ref<ScheduleScope>('TEAM')
const managedTeam = computed(() => user.value?.role === 'ADMIN' ? null : user.value?.activeTeam ?? null)
const canFilterByManagedTeam = computed(() => Boolean(managedTeam.value))
const gamesQuery = computed(() => ({
  limit: 50,
  ...(managedTeam.value && selectedScope.value === 'TEAM' ? { scope: 'mine' } : {}),
  ...(managedTeam.value && selectedScope.value === 'GROUP'
    ? {
        category: managedTeam.value.category,
        branch: managedTeam.value.branch
      }
    : {})
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
const scopeDescription = computed(() => {
  const team = managedTeam.value

  if (!team) return 'Partidos pendientes ordenados por fecha y hora.'
  if (selectedScope.value === 'TEAM') return `Solo partidos de ${team.name}.`

  return `${categoryLabel(team.category)} • ${branchLabel(team.branch)}.`
})
const scopeCounterLabel = computed(() => selectedScope.value === 'TEAM' ? 'Mi equipo' : 'Mi categoría')
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
  <UContainer class="min-w-0 pb-6 pt-4 sm:py-8">
    <div class="mb-6 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
      <div class="min-w-0">
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
        <h1 class="text-2xl font-bold leading-tight tracking-normal text-highlighted sm:text-4xl">
          Próximos partidos
        </h1>
        <p class="mt-2 max-w-2xl text-sm text-muted sm:text-base">
          {{ scopeDescription }}
        </p>
      </div>

      <div class="grid grid-cols-2 gap-2 rounded-lg border border-default bg-muted/30 p-2 text-center">
        <div class="rounded-md bg-default px-3 py-2">
          <p class="text-xl font-bold text-highlighted">
            {{ upcomingGames.length }}
          </p>
          <p class="text-xs text-muted">
            {{ scopeCounterLabel }}
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

    <section
      v-if="nextGame"
      class="mb-4 rounded-lg border border-default bg-default p-3 shadow-sm sm:p-5"
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

      <div class="grid gap-3 lg:grid-cols-[1fr_auto_1fr] lg:items-center">
        <div class="flex items-center gap-3 rounded-lg border border-default bg-muted/30 p-3 sm:p-4">
          <span
            class="flex size-12 shrink-0 items-center justify-center rounded-full text-sm font-bold text-white sm:size-14"
            :style="{ backgroundColor: nextGame.homeTeam.primaryColor ?? '#047857' }"
          >
            {{ teamInitials(nextGame.homeTeam) }}
          </span>
          <div class="min-w-0">
            <p class="text-sm text-muted">
              Local
            </p>
            <p class="truncate text-base font-bold text-highlighted sm:text-lg">
              {{ nextGame.homeTeam.name }}
            </p>
          </div>
        </div>

        <div class="rounded-md border border-default bg-primary/10 px-4 py-3 text-center">
          <p class="text-sm font-bold text-highlighted">
            {{ formatGameTime(nextGame.scheduledAt) }}
          </p>
          <p class="mt-0.5 text-xs font-semibold uppercase text-muted">
            {{ formatGameDate(nextGame.scheduledAt) }}
          </p>
          <p class="mt-1 text-sm text-highlighted">
            {{ nextGame.field?.name ?? 'Campo por definir' }}
          </p>
        </div>

        <div class="flex items-center gap-3 rounded-lg border border-default bg-muted/30 p-3 sm:p-4 lg:flex-row-reverse lg:text-right">
          <span
            class="flex size-12 shrink-0 items-center justify-center rounded-full text-sm font-bold text-white sm:size-14"
            :style="{ backgroundColor: nextGame.awayTeam.primaryColor ?? '#f97316' }"
          >
            {{ teamInitials(nextGame.awayTeam) }}
          </span>
          <div class="min-w-0">
            <p class="text-sm text-muted">
              Visitante
            </p>
            <p class="truncate text-base font-bold text-highlighted sm:text-lg">
              {{ nextGame.awayTeam.name }}
            </p>
          </div>
        </div>
      </div>
    </section>

    <section class="rounded-lg border border-default bg-default p-3 shadow-sm sm:p-5">
      <div class="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h2 class="text-lg font-bold text-highlighted sm:text-xl">
            Calendario
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
              class="grid gap-3 rounded-lg border border-default p-3"
            >
              <div class="flex flex-wrap items-center justify-between gap-2">
                <div class="min-w-0">
                  <p class="text-sm font-bold text-highlighted">
                    {{ formatGameTime(game.scheduledAt) }}
                  </p>
                  <p class="truncate text-xs text-muted">
                    {{ game.field?.name ?? 'Campo por definir' }}
                  </p>
                </div>
                <UBadge
                  :color="gameStatusColor(game.status)"
                  variant="subtle"
                  size="sm"
                >
                  {{ gameStatusLabel(game.status) }}
                </UBadge>
              </div>

              <div class="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-2">
                <div class="min-w-0 rounded-md bg-muted/30 p-2">
                  <div class="mb-1 flex items-center gap-2">
                    <span
                      class="flex size-8 shrink-0 items-center justify-center rounded-full text-[11px] font-bold text-white"
                      :style="{ backgroundColor: game.homeTeam.primaryColor ?? '#047857' }"
                    >
                      {{ teamInitials(game.homeTeam) }}
                    </span>
                    <p class="min-w-0 truncate font-semibold text-highlighted">
                      {{ game.homeTeam.name }}
                    </p>
                  </div>
                  <p class="text-xs text-muted">
                    Local
                  </p>
                </div>

                <span class="rounded-md bg-primary/10 px-2 py-1 text-xs font-black text-primary">
                  VS
                </span>

                <div class="min-w-0 rounded-md bg-muted/30 p-2 text-right">
                  <div class="mb-1 flex flex-row-reverse items-center gap-2">
                    <span
                      class="flex size-8 shrink-0 items-center justify-center rounded-full text-[11px] font-bold text-white"
                      :style="{ backgroundColor: game.awayTeam.primaryColor ?? '#f97316' }"
                    >
                      {{ teamInitials(game.awayTeam) }}
                    </span>
                    <p class="min-w-0 truncate font-semibold text-highlighted">
                      {{ game.awayTeam.name }}
                    </p>
                  </div>
                  <p class="text-xs text-muted">
                    Visitante
                  </p>
                </div>
              </div>

              <div class="flex flex-wrap items-center gap-1">
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
                  color="primary"
                  variant="outline"
                  size="sm"
                >
                  {{ roundLabel(game.round) }}
                </UBadge>
                <span class="ml-auto text-xs font-medium text-muted">
                  {{ formatGameDate(game.scheduledAt) }}
                </span>
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
