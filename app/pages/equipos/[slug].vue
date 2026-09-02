<script setup lang="ts">
import {
  type BadgeColor,
  branchColor,
  branchLabel,
  categoryColor,
  categoryLabel,
  playerPositionLabel,
  playerName,
  teamStatusColor,
  teamStatusLabel,
  type TeamDetail
} from '~/utils/league'

const route = useRoute()
const slug = String(route.params.slug)

const { data: team } = await useFetch<TeamDetail>(`/api/teams/${slug}`)

useSeoMeta({
  title: () => `${team.value?.name ?? 'Equipo'} | DiamondPanel`,
  description: () => `Roster y datos internos de ${team.value?.name ?? 'equipo'} en DiamondPanel.`
})

const activePlayers = computed(() => team.value?.players.filter(player => player.status === 'ACTIVE') ?? [])

function playerEligibilityColor(player: TeamDetail['players'][number]): BadgeColor {
  return player.isPlayoffEligible ? 'success' : 'warning'
}

function playerEligibilityLabel(player: TeamDetail['players'][number]) {
  return player.isPlayoffEligible ? 'Elegible' : 'No elegible'
}

function playerEligibilityDetail(player: TeamDetail['players'][number]) {
  if (team.value?.playoffEligibilityMode === 'OPEN_ROSTER') return 'Cédula abierta'

  return `${player.lineupGames ?? 0}/${team.value?.playoffMinimumLineupGames ?? 5} juegos`
}
</script>

<template>
  <UContainer class="py-6 sm:py-8">
    <div
      v-if="team"
      class="grid gap-4 lg:grid-cols-[0.9fr_1.1fr]"
    >
      <aside class="rounded-lg border border-default bg-default p-5 shadow-sm">
        <UButton
          to="/equipos"
          icon="i-lucide-arrow-left"
          label="Equipos"
          color="neutral"
          variant="ghost"
          size="sm"
          class="mb-4"
        />

        <TeamAvatar
          :team="team"
          class="mb-4 size-24 text-3xl font-bold"
        />

        <div class="mb-4">
          <div class="mb-2 flex flex-wrap items-center gap-2">
            <UBadge
              :color="teamStatusColor(team.status)"
              variant="subtle"
            >
              {{ teamStatusLabel(team.status) }}
            </UBadge>
            <UBadge
              color="neutral"
              variant="outline"
            >
              {{ team.shortName ?? team.slug }}
            </UBadge>
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
          <h1 class="text-3xl font-bold tracking-normal text-highlighted">
            {{ team.name }}
          </h1>
          <p class="mt-2 text-muted">
            {{ team.managerName ?? 'Manager por definir' }}
          </p>
        </div>

        <div class="grid grid-cols-2 gap-2 text-sm sm:grid-cols-4">
          <div class="rounded-md bg-muted/30 px-3 py-2">
            <p class="text-xl font-bold text-highlighted">
              {{ activePlayers.length }}
            </p>
            <p class="text-xs text-muted">
              Jugadores
            </p>
          </div>
          <div class="rounded-md bg-muted/30 px-3 py-2">
            <p class="text-xl font-bold text-highlighted">
              {{ team.seasons.length }}
            </p>
            <p class="text-xs text-muted">
              Temporadas
            </p>
          </div>
          <div class="rounded-md bg-muted/30 px-3 py-2">
            <p class="text-xl font-bold text-highlighted">
              {{ team.category }}
            </p>
            <p class="text-xs text-muted">
              Categoría
            </p>
          </div>
          <div class="rounded-md bg-muted/30 px-3 py-2">
            <p class="text-xl font-bold text-highlighted">
              {{ team.branch === 'FEMENIL' ? 'F' : 'V' }}
            </p>
            <p class="text-xs text-muted">
              Rama
            </p>
          </div>
        </div>
      </aside>

      <section class="rounded-lg border border-default bg-default p-5 shadow-sm">
        <div class="mb-4 flex items-center justify-between gap-3">
          <div>
            <h2 class="text-xl font-bold text-highlighted">
              Roster
            </h2>
            <p class="text-sm text-muted">
              Jugadores activos registrados para el equipo.
            </p>
          </div>
          <UIcon
            name="i-lucide-list"
            class="size-5 text-muted"
          />
        </div>

        <div class="overflow-x-auto">
          <table class="w-full min-w-125 text-sm">
            <thead>
              <tr class="border-b border-default text-left text-xs uppercase text-muted">
                <th class="py-3 pr-3">
                  #
                </th>
                <th class="py-3 pr-3">
                  Jugador
                </th>
                <th class="py-3 pr-3">
                  Posición
                </th>
                <th class="py-3 text-right">
                  Elegibilidad
                </th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="player in activePlayers"
                :key="player.id"
                class="border-b border-muted last:border-0"
              >
                <td class="py-3 pr-3 font-semibold text-muted">
                  {{ player.number ?? '-' }}
                </td>
                <td class="py-3 pr-3 font-semibold text-highlighted">
                  {{ playerName(player) }}
                </td>
                <td class="py-3 pr-3 text-muted">
                  {{ playerPositionLabel(player.position) }}
                </td>
                <td class="py-3 text-right">
                  <div class="flex flex-col items-end gap-1">
                    <UBadge
                      :color="playerEligibilityColor(player)"
                      variant="subtle"
                      :icon="player.isPlayoffEligible ? 'i-lucide-badge-check' : 'i-lucide-clock-3'"
                    >
                      {{ playerEligibilityLabel(player) }}
                    </UBadge>
                    <span class="text-xs text-muted">
                      {{ playerEligibilityDetail(player) }}
                    </span>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>
    </div>
  </UContainer>
</template>
