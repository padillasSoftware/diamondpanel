<script setup lang="ts">
import {
  TEAM_BRANCH_OPTIONS,
  TEAM_CATEGORY_OPTIONS,
  branchColor,
  branchLabel,
  categoryColor,
  categoryLabel,
  playerPositionLabel,
  type PlayoffEligibilityMode,
  type TeamBranch,
  type TeamCategory
} from '~/utils/league'

definePageMeta({
  middleware: 'admin'
})

useSeoMeta({
  title: 'Elegibles | DiamondPanel',
  description: 'Jugadores elegibles para playoffs por lineups capturados.'
})

type EligibilityPlayer = {
  id: string
  firstName: string
  lastName: string
  number: number | null
  position: string | null
  teamId: string
  lineupGames: number
  isPlayoffEligible: boolean
}

type EligibilityTeam = {
  id: string
  name: string
  shortName: string | null
  slug: string
  category: TeamCategory
  branch: TeamBranch
  players: EligibilityPlayer[]
}

type EligibilityResponse = {
  season: {
    id: string
    name: string
    year: number
  } | null
  eligibilityMode: PlayoffEligibilityMode
  isOpenRoster: boolean
  minimumGames: number
  teams: EligibilityTeam[]
}

type FilteredTeam = EligibilityTeam & {
  players: EligibilityPlayer[]
}

const { data, pending, refresh } = await useFetch<EligibilityResponse>('/api/admin/playoff-eligibility')

if (data.value?.isOpenRoster) {
  await navigateTo('/admin/configuracion')
}

const search = ref('')
const selectedCategory = ref<'ALL' | TeamCategory>('ALL')
const selectedBranch = ref<'ALL' | TeamBranch>('ALL')
const selectedStatus = ref<'ALL' | 'ELIGIBLE' | 'PENDING'>('ALL')

const categoryOptions = TEAM_CATEGORY_OPTIONS
const branchOptions = TEAM_BRANCH_OPTIONS
const minimumGames = computed(() => data.value?.minimumGames ?? 5)
const teams = computed(() => data.value?.teams ?? [])
const allPlayers = computed(() => teams.value.flatMap(team => team.players))
const eligiblePlayers = computed(() => allPlayers.value.filter(player => player.isPlayoffEligible))
const pendingPlayers = computed(() => allPlayers.value.filter(player => !player.isPlayoffEligible))
const teamsWithEligiblePlayers = computed(() =>
  teams.value.filter(team => team.players.some(player => player.isPlayoffEligible)).length
)

const filteredTeams = computed<FilteredTeam[]>(() => {
  const term = search.value.trim().toLowerCase()

  return teams.value
    .filter(team =>
      (selectedCategory.value === 'ALL' || team.category === selectedCategory.value)
      && (selectedBranch.value === 'ALL' || team.branch === selectedBranch.value)
    )
    .map((team) => {
      const players = team.players.filter((player) => {
        const fullName = playerName(player).toLowerCase()
        const matchesSearch = !term
          || team.name.toLowerCase().includes(term)
          || fullName.includes(term)
          || (player.position ?? '').toLowerCase().includes(term)
        const matchesStatus = selectedStatus.value === 'ALL'
          || (selectedStatus.value === 'ELIGIBLE' && player.isPlayoffEligible)
          || (selectedStatus.value === 'PENDING' && !player.isPlayoffEligible)

        return matchesSearch && matchesStatus
      })

      return {
        ...team,
        players
      }
    })
    .filter(team => team.players.length > 0)
})

function playerName(player: EligibilityPlayer) {
  const number = player.number === null ? '' : `#${player.number} `

  return `${number}${player.firstName} ${player.lastName}`
}

function missingGames(player: EligibilityPlayer) {
  return Math.max(minimumGames.value - player.lineupGames, 0)
}

function progressWidth(player: EligibilityPlayer) {
  return `${Math.min((player.lineupGames / minimumGames.value) * 100, 100)}%`
}

function refreshEligibility() {
  void refresh()
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
            icon="i-lucide-badge-check"
          >
            Elegibles
          </UBadge>
          <UBadge
            color="neutral"
            variant="outline"
          >
            {{ data?.season ? `${data.season.name} ${data.season.year}` : 'Temporada activa requerida' }}
          </UBadge>
        </div>
        <h1 class="text-2xl font-bold leading-tight tracking-normal text-highlighted sm:text-4xl">
          Elegibles para playoffs
        </h1>
        <p class="mt-2 max-w-2xl text-sm text-muted sm:text-base">
          Jugadores con al menos {{ minimumGames }} partidos registrados en lineup.
        </p>
      </div>

      <div class="grid gap-2 sm:flex sm:flex-wrap">
        <UButton
          to="/admin/resultados"
          icon="i-lucide-list-plus"
          label="Capturar lineups"
          color="primary"
          variant="subtle"
          class="justify-center"
        />
        <UButton
          type="button"
          icon="i-lucide-refresh-cw"
          label="Actualizar"
          color="neutral"
          variant="outline"
          class="justify-center"
          :loading="pending"
          @click="refreshEligibility"
        />
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
        Activa una temporada para calcular elegibles.
      </p>
    </section>

    <template v-else>
      <div class="mb-4 grid grid-cols-2 gap-2 sm:gap-3 xl:grid-cols-4">
        <div class="rounded-lg border border-default bg-default p-3 shadow-sm sm:p-4">
          <p class="text-xs text-muted sm:text-sm">
            Elegibles
          </p>
          <p class="mt-1 text-2xl font-bold text-highlighted sm:text-3xl">
            {{ eligiblePlayers.length }}
          </p>
          <p class="hidden text-sm text-muted sm:block">
            Listos para playoffs
          </p>
        </div>

        <div class="rounded-lg border border-default bg-default p-3 shadow-sm sm:p-4">
          <p class="text-xs text-muted sm:text-sm">
            Pendientes
          </p>
          <p class="mt-1 text-2xl font-bold text-highlighted sm:text-3xl">
            {{ pendingPlayers.length }}
          </p>
          <p class="hidden text-sm text-muted sm:block">
            Aún no llegan a {{ minimumGames }}
          </p>
        </div>

        <div class="rounded-lg border border-default bg-default p-3 shadow-sm sm:p-4">
          <p class="text-xs text-muted sm:text-sm">
            Equipos
          </p>
          <p class="mt-1 text-2xl font-bold text-highlighted sm:text-3xl">
            {{ teamsWithEligiblePlayers }}
          </p>
          <p class="hidden text-sm text-muted sm:block">
            De {{ teams.length }} equipos
          </p>
        </div>

        <div class="rounded-lg border border-default bg-default p-3 shadow-sm sm:p-4">
          <p class="text-xs text-muted sm:text-sm">
            Regla
          </p>
          <p class="mt-1 text-2xl font-bold text-highlighted sm:text-3xl">
            {{ minimumGames }}
          </p>
          <p class="hidden text-sm text-muted sm:block">
            Juegos en lineup
          </p>
        </div>
      </div>

      <section class="mb-4 min-w-0 rounded-lg border border-default bg-default p-3 shadow-sm">
        <div class="grid gap-3 lg:grid-cols-[1.2fr_1fr_1fr_1fr]">
          <UInput
            v-model="search"
            icon="i-lucide-search"
            placeholder="Buscar jugador o equipo"
          />

          <select
            v-model="selectedCategory"
            class="h-10 w-full rounded-md border border-default bg-default px-3 text-sm text-highlighted outline-none focus:border-primary"
          >
            <option
              v-for="option in categoryOptions"
              :key="option.value"
              :value="option.value"
            >
              {{ option.label }}
            </option>
          </select>

          <select
            v-model="selectedBranch"
            class="h-10 w-full rounded-md border border-default bg-default px-3 text-sm text-highlighted outline-none focus:border-primary"
          >
            <option
              v-for="option in branchOptions"
              :key="option.value"
              :value="option.value"
            >
              {{ option.label }}
            </option>
          </select>

          <select
            v-model="selectedStatus"
            class="h-10 w-full rounded-md border border-default bg-default px-3 text-sm text-highlighted outline-none focus:border-primary"
          >
            <option value="ALL">
              Todos
            </option>
            <option value="ELIGIBLE">
              Elegibles
            </option>
            <option value="PENDING">
              Por completar
            </option>
          </select>
        </div>
      </section>

      <section class="grid min-w-0 gap-3">
        <div
          v-if="pending"
          class="rounded-lg border border-dashed border-default bg-default p-8 text-center"
        >
          <UIcon
            name="i-lucide-loader-circle"
            class="mx-auto mb-3 size-8 animate-spin text-muted"
          />
          <p class="font-semibold text-highlighted">
            Cargando elegibles...
          </p>
        </div>

        <div
          v-else-if="!filteredTeams.length"
          class="rounded-lg border border-dashed border-default bg-default p-8 text-center"
        >
          <UIcon
            name="i-lucide-circle-alert"
            class="mx-auto mb-3 size-8 text-muted"
          />
          <p class="font-semibold text-highlighted">
            No hay jugadores con esos filtros.
          </p>
        </div>

        <template v-else>
          <article
            v-for="team in filteredTeams"
            :key="team.id"
            class="min-w-0 overflow-hidden rounded-lg border border-default bg-default p-3 shadow-sm"
          >
            <div class="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div class="min-w-0">
                <h2 class="truncate text-lg font-bold text-highlighted">
                  {{ team.name }}
                </h2>
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
              <UBadge
                color="neutral"
                variant="outline"
                class="w-fit"
              >
                {{ team.players.filter(player => player.isPlayoffEligible).length }} elegibles
              </UBadge>
            </div>

            <div class="grid gap-2 sm:hidden">
              <article
                v-for="player in team.players"
                :key="player.id"
                class="rounded-lg border border-default p-3"
              >
                <div class="mb-3 flex items-start justify-between gap-3">
                  <div class="min-w-0">
                    <p class="truncate font-bold text-highlighted">
                      {{ playerName(player) }}
                    </p>
                    <p class="text-sm text-muted">
                      {{ playerPositionLabel(player.position) }}
                    </p>
                  </div>
                  <UBadge
                    :color="player.isPlayoffEligible ? 'success' : 'neutral'"
                    variant="subtle"
                    class="shrink-0"
                  >
                    {{ player.isPlayoffEligible ? 'Elegible' : `${missingGames(player)} faltan` }}
                  </UBadge>
                </div>

                <div class="mb-2 flex items-center justify-between gap-3 text-sm">
                  <span class="text-muted">Juegos en lineup</span>
                  <span class="font-bold text-highlighted">{{ player.lineupGames }}/{{ minimumGames }}</span>
                </div>
                <div class="h-2 overflow-hidden rounded-full bg-muted">
                  <div
                    class="h-full rounded-full"
                    :class="player.isPlayoffEligible ? 'bg-success' : 'bg-primary'"
                    :style="{ width: progressWidth(player) }"
                  />
                </div>
              </article>
            </div>

            <div class="hidden max-w-full overflow-x-auto overscroll-x-contain sm:block [-webkit-overflow-scrolling:touch]">
              <table class="w-full min-w-[44rem] text-sm">
                <thead>
                  <tr class="border-b border-default text-left text-xs uppercase text-muted">
                    <th class="py-3 pr-3">
                      Jugador
                    </th>
                    <th class="py-3 pr-3">
                      Posición
                    </th>
                    <th class="py-3 pr-3 text-right">
                      Juegos
                    </th>
                    <th class="py-3 pr-3">
                      Avance
                    </th>
                    <th class="py-3 text-right">
                      Estado
                    </th>
                  </tr>
                </thead>
                <tbody>
                  <tr
                    v-for="player in team.players"
                    :key="player.id"
                    class="border-b border-muted last:border-0"
                  >
                    <td class="py-3 pr-3">
                      <p class="font-semibold text-highlighted">
                        {{ playerName(player) }}
                      </p>
                    </td>
                    <td class="py-3 pr-3 text-muted">
                      {{ playerPositionLabel(player.position) }}
                    </td>
                    <td class="py-3 pr-3 text-right font-semibold text-highlighted">
                      {{ player.lineupGames }}/{{ minimumGames }}
                    </td>
                    <td class="py-3 pr-3">
                      <div class="h-2 min-w-28 overflow-hidden rounded-full bg-muted">
                        <div
                          class="h-full rounded-full"
                          :class="player.isPlayoffEligible ? 'bg-success' : 'bg-primary'"
                          :style="{ width: progressWidth(player) }"
                        />
                      </div>
                    </td>
                    <td class="py-3 text-right">
                      <UBadge
                        :color="player.isPlayoffEligible ? 'success' : 'neutral'"
                        variant="subtle"
                      >
                        {{ player.isPlayoffEligible ? 'Elegible' : `${missingGames(player)} faltan` }}
                      </UBadge>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </article>
        </template>
      </section>
    </template>
  </UContainer>
</template>
