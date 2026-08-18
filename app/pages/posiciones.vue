<script setup lang="ts">
import {
  TEAM_BRANCH_OPTIONS,
  TEAM_CATEGORY_OPTIONS,
  branchColor,
  branchLabel,
  categoryColor,
  categoryLabel,
  formatRunDifferential,
  streakColor,
  streakLabel,
  teamInitials,
  type TeamBranch,
  type TeamCategory,
  type Season,
  type Standing
} from '~/utils/league'

const { user } = useAuth()

useSeoMeta({
  title: 'Posiciones | DiamondPanel',
  description: 'Tabla de posiciones de la temporada activa de DiamondPanel.'
})

const managedTeamCategory = computed(() => user.value?.managedTeam?.category ?? null)
const managedTeamBranch = computed(() => user.value?.managedTeam?.branch ?? null)
const showStandingsFilters = computed(() => user.value?.role === 'ADMIN')
const categoryOptions = computed(() =>
  TEAM_CATEGORY_OPTIONS.filter(
    (option): option is { label: string, value: TeamCategory } =>
      option.value !== 'ALL'
      && (showStandingsFilters.value || !managedTeamCategory.value || option.value === managedTeamCategory.value)
  )
)
const selectedCategory = ref<TeamCategory>(managedTeamCategory.value ?? 'A')
const selectedBranch = ref<'ALL' | TeamBranch>(managedTeamBranch.value ?? 'ALL')

watch(managedTeamCategory, (category) => {
  if (category) {
    selectedCategory.value = category
  }
}, { immediate: true })

watch(managedTeamBranch, (branch) => {
  if (branch) {
    selectedBranch.value = branch
  }
}, { immediate: true })

watch(categoryOptions, (options) => {
  if (!options.some(option => option.value === selectedCategory.value) && options[0]) {
    selectedCategory.value = options[0].value
  }
})

const standingsQuery = computed(() => ({
  category: selectedCategory.value,
  ...(selectedBranch.value === 'ALL' ? {} : { branch: selectedBranch.value })
}))

const { data: season } = await useFetch<Season>('/api/seasons/active')
const { data: standings } = await useFetch<Standing[]>('/api/standings', {
  query: standingsQuery
})

const standingRows = computed(() => standings.value ?? [])
const selectedCategoryLabel = computed(() => categoryLabel(selectedCategory.value))
const selectedBranchLabel = computed(() => selectedBranch.value === 'ALL' ? 'Ambas ramas' : branchLabel(selectedBranch.value))
const selectedScopeLabel = computed(() => `${selectedCategoryLabel.value} • ${selectedBranchLabel.value}`)
const leader = computed(() => standingRows.value[0])
const totalGames = computed(() => standingRows.value.reduce((total, standing) => total + standing.played, 0) / 2)
const bestOffense = computed(() => [...standingRows.value].sort((a, b) => b.runsFor - a.runsFor)[0])
const bestDefense = computed(() => [...standingRows.value].sort((a, b) => a.runsAgainst - b.runsAgainst)[0])
</script>

<template>
  <UContainer class="py-6 sm:py-8">
    <div class="mb-6 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
      <div>
        <div class="mb-3 flex flex-wrap items-center gap-2">
          <UBadge
            color="primary"
            variant="subtle"
            icon="i-lucide-trophy"
          >
            Posiciones
          </UBadge>
          <UBadge
            color="neutral"
            variant="outline"
          >
            {{ season?.name }} {{ season?.year }}
          </UBadge>
        </div>
        <h1 class="text-3xl font-bold tracking-normal text-highlighted sm:text-4xl">
          Tabla de posiciones
        </h1>
        <p class="mt-2 max-w-2xl text-base text-muted">
          Ranking completo por juegos jugados, ganados, carreras y porcentaje de victoria.
        </p>
      </div>

      <UButton
        to="/rol"
        icon="i-lucide-calendar-days"
        label="Ver rol"
        color="primary"
        variant="subtle"
      />
    </div>

    <div
      v-if="showStandingsFilters"
      class="mb-4 grid gap-3 rounded-lg border border-default bg-default p-3 shadow-sm"
    >
      <label class="grid gap-1 text-sm">
        <span class="font-medium text-highlighted">Categoría</span>
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

    <div class="mb-4 grid gap-3 md:grid-cols-3">
      <div class="rounded-lg border border-default bg-default p-4 shadow-sm">
        <p class="text-sm text-muted">
          Líder actual
        </p>
        <p class="mt-1 truncate text-2xl font-bold text-highlighted">
          {{ leader?.team.name ?? '-' }}
        </p>
        <p class="text-sm text-muted">
          {{ selectedScopeLabel }} • {{ leader?.wins ?? 0 }}G - {{ leader?.losses ?? 0 }}P
        </p>
      </div>

      <div class="rounded-lg border border-default bg-default p-4 shadow-sm">
        <p class="text-sm text-muted">
          Juegos finalizados
        </p>
        <p class="mt-1 text-2xl font-bold text-highlighted">
          {{ totalGames }}
        </p>
        <p class="text-sm text-muted">
          En temporada activa
        </p>
      </div>

      <div class="rounded-lg border border-default bg-default p-4 shadow-sm">
        <p class="text-sm text-muted">
          Mejor defensa
        </p>
        <p class="mt-1 truncate text-2xl font-bold text-highlighted">
          {{ bestDefense?.team.name ?? '-' }}
        </p>
        <p class="text-sm text-muted">
          {{ bestDefense?.runsAgainst ?? 0 }} carreras permitidas
        </p>
      </div>
    </div>

    <section class="rounded-lg border border-default bg-default p-5 shadow-sm">
      <div class="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 class="text-xl font-bold text-highlighted">
            {{ selectedScopeLabel }}
          </h2>
          <p class="text-sm text-muted">
            Criterios: porcentaje, ganados, diferencial y carreras a favor.
          </p>
        </div>
        <UBadge
          color="neutral"
          variant="outline"
          icon="i-lucide-activity"
        >
          {{ bestOffense?.team.name ?? '-' }} lidera en ofensiva
        </UBadge>
      </div>

      <div class="overflow-x-auto">
        <table class="w-full min-w-205 text-sm">
          <thead>
            <tr class="border-b border-default text-left text-xs uppercase text-muted">
              <th class="py-3 pr-3">
                #
              </th>
              <th class="py-3 pr-3">
                Equipo
              </th>
              <th class="py-3 pr-3 text-right">
                JJ
              </th>
              <th class="py-3 pr-3 text-right">
                G
              </th>
              <th class="py-3 pr-3 text-right">
                P
              </th>
              <th class="py-3 pr-3 text-right">
                E
              </th>
              <th class="py-3 pr-3 text-right">
                CF
              </th>
              <th class="py-3 pr-3 text-right">
                CC
              </th>
              <th class="py-3 pr-3 text-right">
                Dif.
              </th>
              <th class="py-3 pr-3 text-right">
                %
              </th>
              <th class="py-3 text-right">
                Racha
              </th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="standing in standingRows"
              :key="standing.team.id"
              class="border-b border-muted last:border-0"
            >
              <td class="py-4 pr-3 font-semibold text-muted">
                {{ standing.rank }}
              </td>
              <td class="py-4 pr-3">
                <div class="flex items-center gap-3">
                  <span
                    class="flex size-9 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white"
                    :style="{ backgroundColor: standing.team.primaryColor ?? '#047857' }"
                  >
                    {{ teamInitials(standing.team) }}
                  </span>
                  <div class="min-w-0">
                    <p class="truncate font-semibold text-highlighted">
                      {{ standing.team.name }}
                    </p>
                    <div class="mt-1 flex flex-wrap items-center gap-1">
                      <UBadge
                        :color="categoryColor(standing.team.category)"
                        variant="subtle"
                        size="sm"
                      >
                        {{ categoryLabel(standing.team.category) }}
                      </UBadge>
                      <UBadge
                        :color="branchColor(standing.team.branch)"
                        variant="subtle"
                        size="sm"
                      >
                        {{ branchLabel(standing.team.branch) }}
                      </UBadge>
                      <span class="text-xs text-muted">{{ standing.team.shortName ?? standing.team.slug }}</span>
                    </div>
                  </div>
                </div>
              </td>
              <td class="py-4 pr-3 text-right text-muted">
                {{ standing.played }}
              </td>
              <td class="py-4 pr-3 text-right text-muted">
                {{ standing.wins }}
              </td>
              <td class="py-4 pr-3 text-right text-muted">
                {{ standing.losses }}
              </td>
              <td class="py-4 pr-3 text-right text-muted">
                {{ standing.ties }}
              </td>
              <td class="py-4 pr-3 text-right text-muted">
                {{ standing.runsFor }}
              </td>
              <td class="py-4 pr-3 text-right text-muted">
                {{ standing.runsAgainst }}
              </td>
              <td class="py-4 pr-3 text-right font-semibold text-highlighted">
                {{ formatRunDifferential(standing.runDifferential) }}
              </td>
              <td class="py-4 pr-3 text-right font-semibold text-highlighted">
                {{ standing.winPercentageText }}
              </td>
              <td class="py-4 text-right">
                <UBadge
                  :color="streakColor(standing.streak)"
                  variant="subtle"
                >
                  {{ streakLabel(standing.streak) }}
                </UBadge>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>
  </UContainer>
</template>
