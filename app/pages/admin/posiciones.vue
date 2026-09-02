<script setup lang="ts">
import {
  TEAM_BRANCH_OPTIONS,
  branchColor,
  branchLabel,
  categoryColor,
  categoryLabel,
  formatRunDifferential,
  streakColor,
  streakLabel,
  teamInitials,
  type Season,
  type Standing,
  type TeamBranch,
  type TeamCategory
} from '~/utils/league'

definePageMeta({
  middleware: 'admin'
})

useSeoMeta({
  title: 'Posiciones | Admin | DiamondPanel',
  description: 'Tabla de posiciones administrativa por categoría y rama.'
})

const { categoryOptions, firstActiveCategory } = useLeagueCategories()
const selectedCategory = ref<TeamCategory>('A')
const selectedBranch = ref<'ALL' | TeamBranch>('ALL')

const standingsQuery = computed(() => ({
  category: selectedCategory.value,
  ...(selectedBranch.value === 'ALL' ? {} : { branch: selectedBranch.value })
}))

const { data: season } = await useFetch<Season>('/api/seasons/active')
const { data: standings, pending, refresh } = await useFetch<Standing[]>('/api/standings', {
  query: standingsQuery
})

const standingRows = computed(() => standings.value ?? [])
const selectedCategoryLabel = computed(() => categoryLabel(selectedCategory.value))
const selectedBranchLabel = computed(() => selectedBranch.value === 'ALL' ? 'Ambas ramas' : branchLabel(selectedBranch.value))
const selectedScopeLabel = computed(() => `${selectedCategoryLabel.value} • ${selectedBranchLabel.value}`)
const leader = computed(() => standingRows.value[0])
const totalTeams = computed(() => standingRows.value.length)
const totalGames = computed(() => standingRows.value.reduce((total, standing) => total + standing.played, 0) / 2)
const bestOffense = computed(() => [...standingRows.value].sort((a, b) => b.runsFor - a.runsFor)[0])
const bestDefense = computed(() => [...standingRows.value].sort((a, b) => a.runsAgainst - b.runsAgainst)[0])

watch(categoryOptions, (options) => {
  if (!options.some(option => option.value === selectedCategory.value)) {
    selectedCategory.value = options[0]?.value ?? firstActiveCategory.value
  }
}, { immediate: true })

function refreshStandings() {
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
        <h1 class="text-2xl font-bold leading-tight tracking-normal text-highlighted sm:text-4xl">
          Tabla de posiciones
        </h1>
        <p class="mt-2 max-w-2xl text-sm text-muted sm:text-base">
          Consulta el acomodo de equipos por categoría y rama.
        </p>
      </div>

      <div class="grid gap-2 sm:flex sm:flex-wrap">
        <UButton
          to="/admin/resultados"
          icon="i-lucide-clipboard-check"
          label="Resultados"
          color="neutral"
          variant="subtle"
          class="justify-center"
        />
        <UButton
          to="/admin/rol"
          icon="i-lucide-calendar-days"
          label="Rol"
          color="primary"
          variant="subtle"
          class="justify-center"
        />
      </div>
    </div>

    <section class="mb-4 rounded-lg border border-default bg-default p-3 shadow-sm">
      <div class="grid gap-3 lg:grid-cols-[1fr_1fr_auto] lg:items-end">
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

        <UButton
          type="button"
          icon="i-lucide-refresh-cw"
          label="Actualizar"
          color="neutral"
          variant="outline"
          :loading="pending"
          class="justify-center"
          @click="refreshStandings"
        />
      </div>
    </section>

    <div class="mb-4 grid grid-cols-2 gap-2 sm:gap-3 xl:grid-cols-4">
      <div class="min-w-0 rounded-lg border border-default bg-default p-3 shadow-sm sm:p-4">
        <p class="text-xs text-muted sm:text-sm">
          Equipos
        </p>
        <p class="mt-1 text-xl font-bold text-highlighted sm:text-2xl">
          {{ totalTeams }}
        </p>
        <p class="hidden text-sm text-muted sm:block">
          {{ selectedScopeLabel }}
        </p>
      </div>

      <div class="min-w-0 rounded-lg border border-default bg-default p-3 shadow-sm sm:p-4">
        <p class="text-xs text-muted sm:text-sm">
          Líder actual
        </p>
        <p class="mt-1 truncate text-xl font-bold text-highlighted sm:text-2xl">
          {{ leader?.team.name ?? '-' }}
        </p>
        <p class="hidden text-sm text-muted sm:block">
          {{ leader?.wins ?? 0 }}G - {{ leader?.losses ?? 0 }}P
        </p>
      </div>

      <div class="min-w-0 rounded-lg border border-default bg-default p-3 shadow-sm sm:p-4">
        <p class="text-xs text-muted sm:text-sm">
          Finales
        </p>
        <p class="mt-1 text-xl font-bold text-highlighted sm:text-2xl">
          {{ totalGames }}
        </p>
        <p class="hidden text-sm text-muted sm:block">
          En temporada activa
        </p>
      </div>

      <div class="min-w-0 rounded-lg border border-default bg-default p-3 shadow-sm sm:p-4">
        <p class="text-xs text-muted sm:text-sm">
          Mejor defensa
        </p>
        <p class="mt-1 truncate text-xl font-bold text-highlighted sm:text-2xl">
          {{ bestDefense?.team.name ?? '-' }}
        </p>
        <p class="hidden text-sm text-muted sm:block">
          {{ bestDefense?.runsAgainst ?? 0 }} carreras permitidas
        </p>
      </div>
    </div>

    <section class="rounded-lg border border-default bg-default p-3 shadow-sm sm:p-5">
      <div class="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 class="text-lg font-bold text-highlighted sm:text-xl">
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
          {{ bestOffense?.team.name ?? '-' }} lidera ofensiva
        </UBadge>
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
          Cargando posiciones...
        </p>
      </div>

      <div
        v-else-if="!standingRows.length"
        class="rounded-lg border border-dashed border-default p-8 text-center"
      >
        <UIcon
          name="i-lucide-circle-alert"
          class="mx-auto mb-3 size-8 text-muted"
        />
        <p class="font-semibold text-highlighted">
          No hay equipos para este filtro.
        </p>
      </div>

      <template v-else>
        <div class="grid gap-2 sm:hidden">
          <article
            v-for="standing in standingRows"
            :key="standing.team.id"
            class="rounded-lg border border-default p-3"
          >
            <div class="mb-3 flex items-start gap-3">
              <span class="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-black text-primary">
                {{ standing.rank }}
              </span>
              <div class="min-w-0 flex-1">
                <div class="mb-1 flex items-center gap-2">
                  <span
                    class="flex size-9 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white"
                    :style="{ backgroundColor: standing.team.primaryColor ?? '#047857' }"
                  >
                    {{ teamInitials(standing.team) }}
                  </span>
                  <div class="min-w-0">
                    <p class="truncate font-bold text-highlighted">
                      {{ standing.team.name }}
                    </p>
                    <p class="text-xs text-muted">
                      {{ standing.team.shortName ?? standing.team.slug }}
                    </p>
                  </div>
                </div>
                <div class="flex flex-wrap gap-1">
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
                  <UBadge
                    :color="streakColor(standing.streak)"
                    variant="subtle"
                    size="sm"
                  >
                    {{ streakLabel(standing.streak) }}
                  </UBadge>
                </div>
              </div>
            </div>

            <div class="grid grid-cols-4 gap-2 rounded-md bg-muted/30 p-2 text-center text-sm">
              <div>
                <p class="font-bold text-highlighted">
                  {{ standing.wins }}
                </p>
                <p class="text-xs text-muted">
                  G
                </p>
              </div>
              <div>
                <p class="font-bold text-highlighted">
                  {{ standing.losses }}
                </p>
                <p class="text-xs text-muted">
                  P
                </p>
              </div>
              <div>
                <p class="font-bold text-highlighted">
                  {{ formatRunDifferential(standing.runDifferential) }}
                </p>
                <p class="text-xs text-muted">
                  Dif
                </p>
              </div>
              <div>
                <p class="font-bold text-highlighted">
                  {{ standing.winPercentageText }}
                </p>
                <p class="text-xs text-muted">
                  %
                </p>
              </div>
            </div>
          </article>
        </div>

        <div class="hidden overflow-x-auto sm:block">
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
      </template>
    </section>
  </UContainer>
</template>
