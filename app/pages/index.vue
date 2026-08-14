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

const [
  { data: season },
  { data: standings },
  { data: upcomingGames },
  { data: recentResults },
  { data: teams }
] = await Promise.all([
  useFetch<Season>('/api/seasons/active'),
  useFetch<Standing[]>('/api/standings'),
  useFetch<Game[]>('/api/games/upcoming', { query: { limit: 4 } }),
  useFetch<ResultGame[]>('/api/results/recent', { query: { limit: 4 } }),
  useFetch<Team[]>('/api/teams')
])

const topStandings = computed(() => standings.value?.slice(0, 5) ?? [])
const nextGame = computed(() => upcomingGames.value?.[0])
const completedGames = computed(() => recentResults.value?.length ?? 0)
const featuredTeams = computed(() => teams.value?.slice(0, 6) ?? [])
</script>

<template>
  <UContainer class="py-6 sm:py-8">
    <div class="mb-6 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
      <div>
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

        <h1 class="text-3xl font-bold tracking-normal text-highlighted sm:text-4xl">
          Control de liga de softball
        </h1>
        <p class="mt-2 max-w-2xl text-base text-muted">
          Consulta posiciones, rol de juegos, resultados recientes y equipos desde un panel rápido para la temporada activa.
        </p>
      </div>

      <div class="grid grid-cols-3 gap-2 rounded-lg border border-default bg-muted/30 p-2 text-center">
        <div class="rounded-md bg-default px-3 py-2">
          <p class="text-xl font-bold text-highlighted">
            {{ teams?.length ?? 0 }}
          </p>
          <p class="text-xs text-muted">
            Equipos
          </p>
        </div>
        <div class="rounded-md bg-default px-3 py-2">
          <p class="text-xl font-bold text-highlighted">
            {{ upcomingGames?.length ?? 0 }}
          </p>
          <p class="text-xs text-muted">
            En rol
          </p>
        </div>
        <div class="rounded-md bg-default px-3 py-2">
          <p class="text-xl font-bold text-highlighted">
            {{ completedGames }}
          </p>
          <p class="text-xs text-muted">
            Finales
          </p>
        </div>
      </div>
    </div>

    <div class="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
      <section
        id="rol"
        class="rounded-lg border border-default bg-default p-5 shadow-sm"
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
          class="rounded-lg border border-default bg-muted/30 p-4"
        >
          <div class="mb-4 flex flex-wrap items-center justify-between gap-2 text-sm text-muted">
            <span>{{ formatGameDate(nextGame.scheduledAt) }}</span>
            <span>{{ nextGame.field?.name ?? 'Campo por definir' }}</span>
          </div>

          <div class="grid grid-cols-[1fr_auto_1fr] items-center gap-3">
            <div class="text-center">
              <div
                class="mx-auto flex size-16 items-center justify-center rounded-full text-lg font-bold text-white shadow-sm"
                :style="{ backgroundColor: nextGame.homeTeam.primaryColor ?? '#047857' }"
              >
                {{ teamInitials(nextGame.homeTeam) }}
              </div>
              <p class="mt-2 font-semibold text-highlighted">
                {{ nextGame.homeTeam.name }}
              </p>
            </div>

            <div class="rounded-md border border-default bg-default px-3 py-2 text-sm font-bold text-muted">
              vs
            </div>

            <div class="text-center">
              <div
                class="mx-auto flex size-16 items-center justify-center rounded-full text-lg font-bold text-white shadow-sm"
                :style="{ backgroundColor: nextGame.awayTeam.primaryColor ?? '#f97316' }"
              >
                {{ teamInitials(nextGame.awayTeam) }}
              </div>
              <p class="mt-2 font-semibold text-highlighted">
                {{ nextGame.awayTeam.name }}
              </p>
            </div>
          </div>
        </div>

        <div class="mt-4 grid gap-2">
          <div
            v-for="game in upcomingGames?.slice(1)"
            :key="game.id"
            class="flex items-center justify-between gap-3 rounded-md border border-default px-3 py-2"
          >
            <div class="min-w-0">
              <p class="truncate text-sm font-semibold text-highlighted">
                {{ game.homeTeam.name }} vs {{ game.awayTeam.name }}
              </p>
              <p class="text-xs text-muted">
                Jornada {{ game.round ?? '-' }} • {{ game.field?.name ?? 'Campo por definir' }}
              </p>
            </div>
            <UBadge
              :color="game.status === 'POSTPONED' ? 'warning' : 'primary'"
              variant="subtle"
            >
              {{ game.status === 'POSTPONED' ? 'Suspendido' : formatGameDate(game.scheduledAt) }}
            </UBadge>
          </div>
        </div>
      </section>

      <section
        id="posiciones"
        class="rounded-lg border border-default bg-default p-5 shadow-sm"
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

        <div class="overflow-x-auto">
          <table class="w-full min-w-[520px] text-sm">
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

    <div class="mt-4 grid gap-4 lg:grid-cols-[0.9fr_1.1fr]">
      <section
        id="resultados"
        class="rounded-lg border border-default bg-default p-5 shadow-sm"
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
              <span>Jornada {{ game.round ?? '-' }}</span>
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
        class="rounded-lg border border-default bg-default p-5 shadow-sm"
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
