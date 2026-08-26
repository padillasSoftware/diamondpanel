<script setup lang="ts">
import {
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
  middleware: 'manager'
})

useSeoMeta({
  title: 'Elegibles | DiamondPanel',
  description: 'Jugadores elegibles para playoffs de tu equipo.'
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
  team: EligibilityTeam | null
}

const { data, pending, refresh } = await useFetch<EligibilityResponse>('/api/manager/playoff-eligibility')

if (data.value?.isOpenRoster) {
  await navigateTo('/')
}

const search = ref('')
const selectedStatus = ref<'ALL' | 'ELIGIBLE' | 'PENDING'>('ALL')

const team = computed(() => data.value?.team ?? null)
const minimumGames = computed(() => data.value?.minimumGames ?? 5)
const players = computed(() => team.value?.players ?? [])
const eligiblePlayers = computed(() => players.value.filter(player => player.isPlayoffEligible))
const pendingPlayers = computed(() => players.value.filter(player => !player.isPlayoffEligible))
const filteredPlayers = computed(() => {
  const term = search.value.trim().toLowerCase()

  return players.value.filter((player) => {
    const matchesSearch = !term
      || playerName(player).toLowerCase().includes(term)
      || (player.position ?? '').toLowerCase().includes(term)
    const matchesStatus = selectedStatus.value === 'ALL'
      || (selectedStatus.value === 'ELIGIBLE' && player.isPlayoffEligible)
      || (selectedStatus.value === 'PENDING' && !player.isPlayoffEligible)

    return matchesSearch && matchesStatus
  })
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
  <UContainer class="py-6 sm:py-8">
    <div class="mb-6 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
      <div>
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
        <h1 class="text-3xl font-bold tracking-normal text-highlighted sm:text-4xl">
          Elegibles para playoffs
        </h1>
        <p class="mt-2 max-w-2xl text-base text-muted">
          Cada jugador necesita {{ minimumGames }} partidos registrados en lineup.
        </p>
      </div>

      <UButton
        type="button"
        icon="i-lucide-refresh-cw"
        label="Actualizar"
        color="neutral"
        variant="outline"
        :loading="pending"
        @click="refreshEligibility"
      />
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
        Aún no hay temporada activa.
      </p>
    </section>

    <section
      v-else-if="!team"
      class="rounded-lg border border-dashed border-default p-8 text-center"
    >
      <UIcon
        name="i-lucide-users-round"
        class="mx-auto mb-3 size-8 text-muted"
      />
      <p class="font-semibold text-highlighted">
        No hay equipo activo para revisar.
      </p>
    </section>

    <template v-else>
      <section class="mb-4 rounded-lg border border-default bg-default p-4 shadow-sm">
        <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 class="text-xl font-bold text-highlighted">
              {{ team.name }}
            </h2>
            <div class="mt-2 flex flex-wrap gap-1">
              <UBadge
                :color="categoryColor(team.category)"
                variant="subtle"
              >
                {{ categoryLabel(team.category) }}
              </UBadge>
              <UBadge
                :color="branchColor(team.branch)"
                variant="subtle"
              >
                {{ branchLabel(team.branch) }}
              </UBadge>
            </div>
          </div>

          <UButton
            to="/mi-equipo"
            icon="i-lucide-clipboard-pen"
            label="Mi equipo"
            color="primary"
            variant="subtle"
          />
        </div>
      </section>

      <div class="mb-4 grid gap-3 sm:grid-cols-3">
        <div class="rounded-lg border border-default bg-default p-4 shadow-sm">
          <p class="text-sm text-muted">
            Elegibles
          </p>
          <p class="mt-1 text-3xl font-bold text-highlighted">
            {{ eligiblePlayers.length }}
          </p>
          <p class="text-sm text-muted">
            Listos para playoffs
          </p>
        </div>

        <div class="rounded-lg border border-default bg-default p-4 shadow-sm">
          <p class="text-sm text-muted">
            Por completar
          </p>
          <p class="mt-1 text-3xl font-bold text-highlighted">
            {{ pendingPlayers.length }}
          </p>
          <p class="text-sm text-muted">
            Aún no llegan a {{ minimumGames }}
          </p>
        </div>

        <div class="rounded-lg border border-default bg-default p-4 shadow-sm">
          <p class="text-sm text-muted">
            Regla
          </p>
          <p class="mt-1 text-3xl font-bold text-highlighted">
            {{ minimumGames }}
          </p>
          <p class="text-sm text-muted">
            Juegos en lineup
          </p>
        </div>
      </div>

      <section class="mb-4 rounded-lg border border-default bg-default p-3 shadow-sm">
        <div class="grid gap-3 sm:grid-cols-[1fr_auto]">
          <UInput
            v-model="search"
            icon="i-lucide-search"
            placeholder="Buscar jugador"
          />

          <select
            v-model="selectedStatus"
            class="h-10 w-full rounded-md border border-default bg-default px-3 text-sm text-highlighted outline-none focus:border-primary sm:w-44"
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

      <section class="rounded-lg border border-default bg-default p-3 shadow-sm sm:p-5">
        <div
          v-if="pending"
          class="rounded-lg border border-dashed border-default p-8 text-center"
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
          v-else-if="!filteredPlayers.length"
          class="rounded-lg border border-dashed border-default p-8 text-center"
        >
          <UIcon
            name="i-lucide-circle-alert"
            class="mx-auto mb-3 size-8 text-muted"
          />
          <p class="font-semibold text-highlighted">
            No hay jugadores con esos filtros.
          </p>
        </div>

        <div
          v-else
          class="overflow-x-auto"
        >
          <table class="w-full min-w-155 text-sm">
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
                v-for="player in filteredPlayers"
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
      </section>
    </template>
  </UContainer>
</template>
