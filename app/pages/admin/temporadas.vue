<script setup lang="ts">
import { seasonStatusColor, seasonStatusLabel } from '~/utils/league'

definePageMeta({
  middleware: 'admin'
})

useSeoMeta({
  title: 'Temporadas | DiamondPanel',
  description: 'Administración de temporadas de la liga.'
})

type Season = {
  id: string
  name: string
  year: number
  startsAt: string | null
  endsAt: string | null
  status: 'DRAFT' | 'ACTIVE' | 'ARCHIVED'
  createdAt: string
  updatedAt: string
}

const { data: seasons, refresh } = await useFetch<Season[]>('/api/admin/seasons')

const statusOptions = [
  { label: 'Borrador', value: 'DRAFT' },
  { label: 'Activa', value: 'ACTIVE' },
  { label: 'Archivada', value: 'ARCHIVED' }
]

const seasonForm = reactive({
  name: '',
  year: new Date().getFullYear().toString(),
  startsAt: '',
  endsAt: '',
  status: 'DRAFT'
})

const editingSeasonId = ref<string | null>(null)
const isSavingSeason = ref(false)
const isDeletingSeason = ref(false)
const activatingSeasonId = ref<string | null>(null)
const seasonPendingDelete = ref<Season | null>(null)
const toast = useToast()

const editingSeason = computed(() => seasons.value?.find(season => season.id === editingSeasonId.value) ?? null)
const canSaveSeason = computed(() => Boolean(seasonForm.name.trim() && seasonForm.year && seasonForm.startsAt))

const minStartDate = computed(() => {
  const boundaries = (seasons.value ?? [])
    .filter(season => season.id !== editingSeasonId.value)
    .map(season => season.endsAt ?? season.startsAt)
    .filter((value): value is string => Boolean(value))

  if (!boundaries.length) return undefined

  const latestBoundary = boundaries.reduce((latest, value) => value > latest ? value : latest)
  const nextDay = new Date(latestBoundary)
  nextDay.setUTCDate(nextDay.getUTCDate() + 1)

  return nextDay.toISOString().slice(0, 10)
})

const startsAtError = computed(() => {
  if (!seasonForm.startsAt || !minStartDate.value) return ''

  return seasonForm.startsAt >= minStartDate.value
    ? ''
    : `La fecha de inicio debe ser posterior al ${minStartDate.value}.`
})

const isDeleteModalOpen = computed({
  get: () => seasonPendingDelete.value !== null,
  set: (value) => {
    if (!value) seasonPendingDelete.value = null
  }
})

function showFeedback(message: string) {
  toast.add({
    title: message,
    color: 'success',
    icon: 'i-lucide-check-circle-2'
  })
}

function showError(message: string) {
  toast.add({
    title: 'No se pudo completar la acción',
    description: message,
    color: 'error',
    icon: 'i-lucide-circle-alert'
  })
}

function resetSeasonForm() {
  editingSeasonId.value = null
  seasonForm.name = ''
  seasonForm.year = new Date().getFullYear().toString()
  seasonForm.startsAt = ''
  seasonForm.endsAt = ''
  seasonForm.status = 'DRAFT'
}

function editSeason(season: Season) {
  editingSeasonId.value = season.id
  seasonForm.name = season.name
  seasonForm.year = season.year.toString()
  seasonForm.startsAt = season.startsAt?.slice(0, 10) ?? ''
  seasonForm.endsAt = season.endsAt?.slice(0, 10) ?? ''
  seasonForm.status = season.status
}

function seasonPayload() {
  return {
    name: seasonForm.name,
    year: Number(seasonForm.year),
    startsAt: seasonForm.startsAt || null,
    endsAt: seasonForm.endsAt || null,
    status: seasonForm.status
  }
}

async function saveSeason() {
  if (!canSaveSeason.value) {
    showError('Completa el nombre, el año y la fecha de inicio de la temporada.')

    return
  }

  if (startsAtError.value) {
    showError(startsAtError.value)

    return
  }

  isSavingSeason.value = true

  try {
    if (editingSeasonId.value) {
      await $fetch(`/api/admin/seasons/${editingSeasonId.value}`, {
        method: 'PATCH',
        body: seasonPayload()
      })
      showFeedback('Temporada actualizada.')
    } else {
      await $fetch('/api/admin/seasons', {
        method: 'POST',
        body: seasonPayload()
      })
      showFeedback('Temporada creada.')
    }

    await refresh()
    resetSeasonForm()
  } catch (error) {
    const statusMessage = typeof error === 'object' && error && 'data' in error
      ? String((error as { data?: { statusMessage?: unknown } }).data?.statusMessage ?? '')
      : ''

    showError(statusMessage || 'No se pudo guardar la temporada. Revisa los datos e inténtalo de nuevo.')
  } finally {
    isSavingSeason.value = false
  }
}

function deleteSeason(season: Season) {
  seasonPendingDelete.value = season
}
async function activateSeason(season: Season) {
  if (season.status === 'ACTIVE') return

  activatingSeasonId.value = season.id

  try {
    await $fetch(`/api/admin/seasons/${season.id}`, {
      method: 'PATCH',
      body: { status: 'ACTIVE' }
    })
    await refresh()
    showFeedback(`${season.name} ${season.year} ahora es la temporada activa.`)
  } catch (error) {
    const statusMessage = typeof error === 'object' && error && 'data' in error
      ? String((error as { data?: { statusMessage?: unknown } }).data?.statusMessage ?? '')
      : ''

    showError(statusMessage || 'No se pudo activar la temporada.')
  } finally {
    activatingSeasonId.value = null
  }
}

async function confirmDeleteSeason() {
  const season = seasonPendingDelete.value

  if (!season) return

  isDeletingSeason.value = true

  try {
    await $fetch(`/api/admin/seasons/${season.id}`, {
      method: 'DELETE'
    })
    await refresh()

    if (editingSeasonId.value === season.id) {
      resetSeasonForm()
    }

    showFeedback('Temporada eliminada.')
    seasonPendingDelete.value = null
  } catch (error) {
    const statusMessage = typeof error === 'object' && error && 'data' in error
      ? String((error as { data?: { statusMessage?: unknown } }).data?.statusMessage ?? '')
      : ''

    showError(statusMessage || 'No se pudo eliminar la temporada.')
  } finally {
    isDeletingSeason.value = false
  }
}
</script>

<template>
  <UContainer class="py-6 sm:py-8">
    <div class="mb-6">
      <UBadge
        color="primary"
        variant="subtle"
        icon="i-lucide-calendar-range"
      >
        Temporadas
      </UBadge>
      <h1 class="mt-3 text-3xl font-bold tracking-normal text-highlighted sm:text-4xl">
        Administración de temporadas
      </h1>
      <p class="mt-2 max-w-2xl text-base text-muted">
        Crea temporadas, márcalas como activas y archiva las que ya concluyeron. Solo puede haber una temporada activa a la vez.
      </p>
    </div>

    <section class="grid gap-4 lg:grid-cols-[0.95fr_1.05fr]">
      <form
        class="rounded-lg border border-default bg-default p-2.5 shadow-sm sm:p-3 lg:h-96"
        @submit.prevent="saveSeason"
      >
        <div class="mb-2.5 flex items-center justify-between gap-2">
          <div>
            <h2 class="text-base font-bold text-highlighted">
              {{ editingSeason ? 'Editar temporada' : 'Nueva temporada' }}
            </h2>
            <p class="text-xs text-muted">
              Define el nombre, año y estado de la temporada.
            </p>
          </div>

          <UButton
            v-if="editingSeason"
            icon="i-lucide-plus"
            label="Nueva"
            color="neutral"
            variant="outline"
            size="sm"
            @click="resetSeasonForm"
          />
        </div>

        <div class="grid gap-2 sm:grid-cols-2">
          <label class="grid gap-1.5 text-sm">
            <span class="font-medium text-highlighted">Nombre</span>
            <UInput
              v-model="seasonForm.name"
              placeholder="Temporada de Verano"
              required
            />
          </label>

          <label class="grid gap-1.5 text-sm">
            <span class="font-medium text-highlighted">Año</span>
            <UInput
              v-model="seasonForm.year"
              type="number"
              min="2000"
              max="2100"
              required
            />
          </label>

          <label class="grid gap-1.5 text-sm">
            <span class="font-medium text-highlighted">Inicio</span>
            <UInput
              v-model="seasonForm.startsAt"
              type="date"
              :min="minStartDate"
              :color="startsAtError ? 'error' : 'neutral'"
              required
            />
            <span
              v-if="startsAtError"
              class="text-xs font-medium text-error"
            >
              {{ startsAtError }}
            </span>
          </label>

          <label class="grid gap-1.5 text-sm">
            <span class="font-medium text-highlighted">Fin</span>
            <UInput
              v-model="seasonForm.endsAt"
              type="date"
            />
          </label>

          <label class="grid gap-1.5 text-sm sm:col-span-2">
            <span class="font-medium text-highlighted">Estado</span>
            <select
              v-model="seasonForm.status"
              class="h-10 w-full rounded-md border border-default bg-default px-3 text-sm text-highlighted outline-none focus:border-primary"
            >
              <option
                v-for="option in statusOptions"
                :key="option.value"
                :value="option.value"
              >
                {{ option.label }}
              </option>
            </select>
          </label>
        </div>

        <UButton
          type="submit"
          icon="i-lucide-save"
          :label="editingSeason ? 'Actualizar temporada' : 'Crear temporada'"
          color="primary"
          class="mt-2.5"
          :disabled="!canSaveSeason"
          :loading="isSavingSeason"
          block
        />
      </form>

      <section class="rounded-lg border border-default bg-default p-2.5 shadow-sm sm:p-3 lg:flex lg:h-96 lg:flex-col">
        <div class="mb-2.5 flex items-center justify-between gap-2">
          <div>
            <h2 class="text-base font-bold text-highlighted">
              Temporadas
            </h2>
            <p class="text-xs text-muted">
              Historial completo de temporadas registradas.
            </p>
          </div>
          <UBadge
            color="neutral"
            variant="outline"
          >
            {{ seasons?.length ?? 0 }} registros
          </UBadge>
        </div>

        <div class="grid gap-2 overflow-y-auto pr-1 lg:min-h-0 lg:flex-1">
          <article
            v-for="season in seasons"
            :key="season.id"
            class="rounded-lg border border-default p-2"
          >
            <div class="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
              <div class="min-w-0">
                <div class="mb-1 flex flex-wrap items-center gap-1.5">
                  <UBadge
                    :color="seasonStatusColor(season.status)"
                    variant="subtle"
                  >
                    {{ seasonStatusLabel(season.status) }}
                  </UBadge>
                </div>

                <h3 class="truncate font-bold text-highlighted">
                  {{ season.name }} {{ season.year }}
                </h3>
                <p class="text-xs text-muted">
                  {{ season.startsAt ? new Date(season.startsAt).toLocaleDateString('es-MX') : 'Sin inicio' }}
                  ·
                  {{ season.endsAt ? new Date(season.endsAt).toLocaleDateString('es-MX') : 'Sin fin' }}
                </p>
              </div>

              <div class="flex shrink-0 gap-1.5">
                <UButton
                  v-if="season.status !== 'ACTIVE'"
                  icon="i-lucide-shield-check"
                  aria-label="Activar temporada"
                  color="success"
                  variant="subtle"
                  size="sm"
                  :loading="activatingSeasonId === season.id"
                  @click="activateSeason(season)"
                />
                <UButton
                  icon="i-lucide-pencil"
                  aria-label="Editar temporada"
                  color="neutral"
                  variant="outline"
                  size="sm"
                  @click="editSeason(season)"
                />
                <UButton
                  icon="i-lucide-trash-2"
                  aria-label="Eliminar temporada"
                  color="error"
                  variant="subtle"
                  size="sm"
                  @click="deleteSeason(season)"
                />
              </div>
            </div>
          </article>
        </div>
      </section>
    </section>

    <UModal
      v-model:open="isDeleteModalOpen"
      title="Eliminar temporada"
      :description="seasonPendingDelete ? `¿Seguro que deseas eliminar ${seasonPendingDelete.name} ${seasonPendingDelete.year}? Esta acción no se puede deshacer.` : ''"
    >
      <template #footer="{ close }">
        <UButton
          label="Cancelar"
          color="neutral"
          variant="ghost"
          :disabled="isDeletingSeason"
          @click="close"
        />
        <UButton
          label="Eliminar"
          color="error"
          icon="i-lucide-trash-2"
          :loading="isDeletingSeason"
          @click="confirmDeleteSeason"
        />
      </template>
    </UModal>
  </UContainer>
</template>
