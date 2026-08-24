<script setup lang="ts">
import {
  branchColor,
  branchLabel,
  categoryColor,
  categoryLabel,
  type PlayoffEligibilityMode,
  type TeamBranch,
  type TeamCategory
} from '~/utils/league'

definePageMeta({
  middleware: 'admin'
})

useSeoMeta({
  title: 'Configuración | DiamondPanel',
  description: 'Configuración administrativa de la temporada activa.'
})

type SettingsConfig = {
  id: string | null
  category: TeamCategory
  branch: TeamBranch
  rounds: number
  teamCount: number
}

type SettingsResponse = {
  season: {
    id: string
    name: string
    year: number
    playoffEligibilityMode: PlayoffEligibilityMode
    playoffMinimumLineupGames: number
  } | null
  configs: SettingsConfig[]
}

const toast = useToast()
const { data, pending, refresh } = await useFetch<SettingsResponse>('/api/admin/settings')

const settingsForm = reactive({
  playoffEligibilityMode: 'LINEUP_GAMES' as PlayoffEligibilityMode,
  playoffMinimumLineupGames: 5
})
const editableConfigs = ref<SettingsConfig[]>([])
const isSaving = ref(false)

const isOpenRoster = computed(() => settingsForm.playoffEligibilityMode === 'OPEN_ROSTER')
const seasonTitle = computed(() =>
  data.value?.season ? `${data.value.season.name} ${data.value.season.year}` : 'Temporada activa requerida'
)

watch(data, (settings) => {
  if (!settings?.season) {
    editableConfigs.value = []

    return
  }

  settingsForm.playoffEligibilityMode = settings.season.playoffEligibilityMode
  settingsForm.playoffMinimumLineupGames = settings.season.playoffMinimumLineupGames
  editableConfigs.value = settings.configs.map(config => ({ ...config }))
}, { immediate: true })

function showFeedback(message: string) {
  toast.add({
    title: message,
    color: 'success',
    icon: 'i-lucide-check-circle-2'
  })
}

function showError(message: string) {
  toast.add({
    title: 'No se pudo guardar',
    description: message,
    color: 'error',
    icon: 'i-lucide-circle-alert'
  })
}

function setPlayoffEligibilityMode(mode: PlayoffEligibilityMode) {
  settingsForm.playoffEligibilityMode = mode
}

async function saveSettings() {
  if (!data.value?.season) return

  isSaving.value = true

  try {
    await $fetch('/api/admin/settings', {
      method: 'PATCH',
      body: {
        playoffEligibilityMode: settingsForm.playoffEligibilityMode,
        playoffMinimumLineupGames: Number(settingsForm.playoffMinimumLineupGames) || 5,
        configs: editableConfigs.value.map(config => ({
          category: config.category,
          branch: config.branch,
          rounds: Number(config.rounds)
        }))
      }
    })

    await refresh()
    await refreshNuxtData('navbar-active-season')
    showFeedback('Configuración actualizada.')
  } catch (error) {
    const statusMessage = typeof error === 'object' && error && 'data' in error
      ? String((error as { data?: { statusMessage?: unknown } }).data?.statusMessage ?? '')
      : ''

    showError(statusMessage || 'Revisa la regla de playoffs y las vueltas por grupo.')
  } finally {
    isSaving.value = false
  }
}
</script>

<template>
  <UContainer class="py-6 sm:py-8">
    <div class="mb-6 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
      <div>
        <UBadge
          color="primary"
          variant="subtle"
          icon="i-lucide-settings"
        >
          Ajustes
        </UBadge>
        <h1 class="mt-3 text-3xl font-bold tracking-normal text-highlighted sm:text-4xl">
          Configuración de liga
        </h1>
        <p class="mt-2 max-w-2xl text-base text-muted">
          {{ seasonTitle }}
        </p>
      </div>

      <UButton
        type="button"
        icon="i-lucide-save"
        label="Guardar cambios"
        color="primary"
        :loading="isSaving"
        :disabled="pending || !data?.season"
        @click="saveSettings"
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
        Activa una temporada para configurar la liga.
      </p>
    </section>

    <div
      v-else
      class="grid gap-4 xl:grid-cols-[0.85fr_1.15fr]"
    >
      <section class="rounded-lg border border-default bg-default p-4 shadow-sm">
        <div class="mb-4 flex items-center justify-between gap-3">
          <div>
            <h2 class="text-lg font-bold text-highlighted">
              Regla de playoffs
            </h2>
            <p class="text-sm text-muted">
              Define cómo se valida la elegibilidad.
            </p>
          </div>
          <UIcon
            name="i-lucide-badge-check"
            class="size-5 text-primary"
          />
        </div>

        <div class="grid gap-2 sm:grid-cols-2">
          <button
            type="button"
            :class="[
              'rounded-lg border p-3 text-left transition-colors',
              settingsForm.playoffEligibilityMode === 'LINEUP_GAMES'
                ? 'border-primary bg-primary/10 text-highlighted'
                : 'border-default hover:border-primary hover:bg-primary/5'
            ]"
            @click="setPlayoffEligibilityMode('LINEUP_GAMES')"
          >
            <span class="mb-2 flex items-center gap-2 font-semibold">
              <UIcon
                name="i-lucide-list-checks"
                class="size-4"
              />
              Por juegos
            </span>
            <span class="text-sm text-muted">
              Usa lineups capturados para contar elegibles.
            </span>
          </button>

          <button
            type="button"
            :class="[
              'rounded-lg border p-3 text-left transition-colors',
              settingsForm.playoffEligibilityMode === 'OPEN_ROSTER'
                ? 'border-primary bg-primary/10 text-highlighted'
                : 'border-default hover:border-primary hover:bg-primary/5'
            ]"
            @click="setPlayoffEligibilityMode('OPEN_ROSTER')"
          >
            <span class="mb-2 flex items-center gap-2 font-semibold">
              <UIcon
                name="i-lucide-lock-open"
                class="size-4"
              />
              Cédula abierta
            </span>
            <span class="text-sm text-muted">
              No usa lista de elegibles por cantidad de juegos.
            </span>
          </button>
        </div>

        <label class="mt-4 grid gap-1.5 text-sm">
          <span class="font-medium text-highlighted">Juegos mínimos en lineup</span>
          <UInput
            v-model.number="settingsForm.playoffMinimumLineupGames"
            type="number"
            min="1"
            max="99"
            :disabled="isOpenRoster"
          />
        </label>

        <div
          v-if="isOpenRoster"
          class="mt-4 rounded-lg border border-default bg-muted/30 p-3 text-sm text-muted"
        >
          Con cédula abierta se oculta Elegibles del menú y no se usa el mínimo de juegos.
        </div>
      </section>

      <section class="rounded-lg border border-default bg-default p-4 shadow-sm">
        <div class="mb-4 flex items-center justify-between gap-3">
          <div>
            <h2 class="text-lg font-bold text-highlighted">
              Vueltas por grupo
            </h2>
            <p class="text-sm text-muted">
              Cada vuelta permite que todos los equipos del grupo se enfrenten entre sí.
            </p>
          </div>
          <UIcon
            name="i-lucide-rotate-cw"
            class="size-5 text-primary"
          />
        </div>

        <div class="grid gap-2 sm:grid-cols-2">
          <div
            v-for="config in editableConfigs"
            :key="`${config.category}-${config.branch}`"
            class="grid grid-cols-[1fr_5.5rem] items-center gap-2 rounded-lg border border-default p-2"
          >
            <div class="min-w-0">
              <div class="mb-1 flex flex-wrap gap-1">
                <UBadge
                  :color="categoryColor(config.category)"
                  variant="subtle"
                  size="sm"
                >
                  {{ categoryLabel(config.category) }}
                </UBadge>
                <UBadge
                  :color="branchColor(config.branch)"
                  variant="subtle"
                  size="sm"
                >
                  {{ branchLabel(config.branch) }}
                </UBadge>
              </div>
              <p class="text-xs text-muted">
                {{ config.teamCount }} equipos
              </p>
            </div>

            <UInput
              v-model.number="config.rounds"
              type="number"
              min="1"
              max="12"
              aria-label="Vueltas"
            />
          </div>
        </div>
      </section>
    </div>
  </UContainer>
</template>
