<script setup lang="ts">
import {
  TEAM_BRANCH_OPTIONS,
  TEAM_CATEGORY_OPTIONS,
  branchColor,
  branchLabel,
  categoryColor,
  categoryLabel,
  teamInitials,
  teamStatusColor,
  teamStatusLabel,
  type Season,
  type Team
} from '~/utils/league'

useSeoMeta({
  title: 'Equipos | DiamondPanel',
  description: 'Equipos registrados en la temporada activa de DiamondPanel.'
})

const [
  { data: season },
  { data: teams }
] = await Promise.all([
  useFetch<Season>('/api/seasons/active'),
  useFetch<Team[]>('/api/teams')
])

const teamRows = computed(() => teams.value ?? [])
const playerCount = computed(() => teamRows.value.reduce((total, team) => total + (team.players?.length ?? 0), 0))
const activeTeams = computed(() => teamRows.value.filter(team => team.status === 'ACTIVE').length)
const categoryGroups = computed(() =>
  TEAM_CATEGORY_OPTIONS
    .filter(option => option.value !== 'ALL')
    .map((category) => {
      const branches = TEAM_BRANCH_OPTIONS
        .filter(option => option.value !== 'ALL')
        .map(branch => ({
          ...branch,
          teams: teamRows.value.filter(team => team.category === category.value && team.branch === branch.value)
        }))

      return {
        ...category,
        branches,
        teamCount: branches.reduce((total, branch) => total + branch.teams.length, 0)
      }
    })
)
</script>

<template>
  <UContainer class="py-6 sm:py-8">
    <div class="mb-6 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
      <div>
        <div class="mb-3 flex flex-wrap items-center gap-2">
          <UBadge
            color="primary"
            variant="subtle"
            icon="i-lucide-users"
          >
            Equipos
          </UBadge>
          <UBadge
            color="neutral"
            variant="outline"
          >
            {{ season?.name }} {{ season?.year }}
          </UBadge>
        </div>
        <h1 class="text-3xl font-bold tracking-normal text-highlighted sm:text-4xl">
          Clubes registrados
        </h1>
        <p class="mt-2 max-w-2xl text-base text-muted">
          Directorio público de equipos, managers y jugadores activos de la liga.
        </p>
      </div>

      <div class="grid grid-cols-2 gap-2 rounded-lg border border-default bg-muted/30 p-2 text-center sm:grid-cols-3">
        <div class="rounded-md bg-default px-3 py-2">
          <p class="text-xl font-bold text-highlighted">
            {{ activeTeams }}
          </p>
          <p class="text-xs text-muted">
            Activos
          </p>
        </div>
        <div class="rounded-md bg-default px-3 py-2">
          <p class="text-xl font-bold text-highlighted">
            {{ playerCount }}
          </p>
          <p class="text-xs text-muted">
            Jugadores
          </p>
        </div>
        <div class="rounded-md bg-default px-3 py-2 sm:col-auto col-span-2">
          <p class="text-xl font-bold text-highlighted">
            {{ categoryGroups.length }}
          </p>
          <p class="text-xs text-muted">
            Categorías
          </p>
        </div>
      </div>
    </div>

    <section class="rounded-lg border border-default bg-default p-5 shadow-sm">
      <div class="mb-4 flex items-center justify-between gap-3">
        <div>
          <h2 class="text-xl font-bold text-highlighted">
            Lista de equipos
          </h2>
          <p class="text-sm text-muted">
            Abre un club para revisar su roster.
          </p>
        </div>
        <UIcon
          name="i-lucide-shirt"
          class="size-5 text-muted"
        />
      </div>

      <div class="grid gap-6">
        <div
          v-for="group in categoryGroups"
          :key="group.value"
        >
          <div class="mb-3 flex flex-wrap items-center justify-between gap-2">
            <h3 class="text-sm font-semibold uppercase text-muted">
              {{ group.label }}
            </h3>
            <UBadge
              :color="categoryColor(group.value)"
              variant="subtle"
            >
              {{ group.teamCount }} equipos
            </UBadge>
          </div>

          <div class="grid gap-4">
            <div
              v-for="branch in group.branches"
              :key="branch.value"
            >
              <div class="mb-2 flex flex-wrap items-center gap-2">
                <UBadge
                  :color="branchColor(branch.value)"
                  variant="subtle"
                >
                  {{ branchLabel(branch.value) }}
                </UBadge>
                <span class="text-xs text-muted">{{ branch.teams.length }} equipos</span>
              </div>

              <div class="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                <NuxtLink
                  v-for="team in branch.teams"
                  :key="team.id"
                  :to="`/equipos/${team.slug}`"
                  class="rounded-lg border border-default p-4 transition hover:border-primary hover:bg-muted/30"
                >
                  <div class="mb-4 flex items-start justify-between gap-3">
                    <div class="flex min-w-0 items-center gap-3">
                      <span
                        class="flex size-12 shrink-0 items-center justify-center rounded-full text-sm font-bold text-white"
                        :style="{ backgroundColor: team.primaryColor ?? '#047857' }"
                      >
                        {{ teamInitials(team) }}
                      </span>
                      <div class="min-w-0">
                        <p class="truncate text-lg font-bold text-highlighted">
                          {{ team.name }}
                        </p>
                        <p class="truncate text-sm text-muted">
                          {{ team.managerName ?? 'Manager por definir' }}
                        </p>
                      </div>
                    </div>
                    <UBadge
                      :color="teamStatusColor(team.status)"
                      variant="subtle"
                    >
                      {{ teamStatusLabel(team.status) }}
                    </UBadge>
                  </div>

                  <div class="grid grid-cols-2 gap-2 text-sm sm:grid-cols-3">
                    <div class="rounded-md bg-muted/30 px-3 py-2">
                      <p class="font-semibold text-highlighted">
                        {{ team.players?.length ?? 0 }}
                      </p>
                      <p class="text-xs text-muted">
                        Jugadores
                      </p>
                    </div>
                    <div class="rounded-md bg-muted/30 px-3 py-2">
                      <p class="font-semibold text-highlighted">
                        {{ categoryLabel(team.category).replace('Categoría ', '') }}
                      </p>
                      <p class="text-xs text-muted">
                        Categoría
                      </p>
                    </div>
                    <div class="rounded-md bg-muted/30 px-3 py-2 sm:col-auto col-span-2">
                      <p class="font-semibold text-highlighted">
                        {{ branchLabel(team.branch) }}
                      </p>
                      <p class="text-xs text-muted">
                        Rama
                      </p>
                    </div>
                  </div>
                </NuxtLink>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  </UContainer>
</template>
