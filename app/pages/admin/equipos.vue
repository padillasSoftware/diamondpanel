<script setup lang="ts">
import {
  TEAM_BRANCH_OPTIONS,
  TEAM_CATEGORY_OPTIONS,
  branchLabel,
  categoryColor,
  categoryLabel,
  teamInitials,
  teamStatusColor,
  teamStatusLabel,
  type TeamBranch,
  type TeamCategory
} from '~/utils/league'

definePageMeta({
  middleware: 'admin'
})

useSeoMeta({
  title: 'Equipos | DiamondPanel',
  description: 'Administración de equipos, categorías, ramas y manejadores.'
})

type TeamStatus = 'ACTIVE' | 'INACTIVE'

type ManagerOption = {
  id: string
  email: string
  name: string | null
}

type AdminTeam = {
  id: string
  name: string
  shortName: string | null
  slug: string
  logoUrl: string | null
  primaryColor: string | null
  secondaryColor: string | null
  managerName: string | null
  category: TeamCategory
  branch: TeamBranch
  status: TeamStatus
  managerAssignments: {
    user: ManagerOption
  }[]
  _count: {
    players: number
    homeGames: number
    awayGames: number
    managerAssignments: number
  }
}

type TeamsResponse = {
  teams: AdminTeam[]
  managerOptions: ManagerOption[]
}

const { data, refresh } = await useFetch<TeamsResponse>('/api/admin/teams')
const toast = useToast()

const teamForm = reactive({
  name: '',
  shortName: '',
  slug: '',
  logoUrl: '',
  primaryColor: '#047857',
  secondaryColor: '#0F172A',
  managerName: '',
  category: 'A' as TeamCategory,
  branch: 'VARONIL' as TeamBranch,
  status: 'ACTIVE' as TeamStatus,
  managerUserIds: [] as string[],
  newManagerName: '',
  newManagerEmail: ''
})

const statusOptions = [
  { label: 'Activo', value: 'ACTIVE' },
  { label: 'Inactivo', value: 'INACTIVE' }
] satisfies { label: string, value: TeamStatus }[]

const categoryOptions = TEAM_CATEGORY_OPTIONS.filter(
  (option): option is { label: string, value: TeamCategory } => option.value !== 'ALL'
)
const branchOptions = TEAM_BRANCH_OPTIONS.filter(
  (option): option is { label: string, value: TeamBranch } => option.value !== 'ALL'
)

const editingTeamId = ref<string | null>(null)
const isSavingTeam = ref(false)
const isDeletingTeam = ref(false)
const teamPendingDelete = ref<AdminTeam | null>(null)
const isSlugDirty = ref(false)
const search = ref('')
const selectedStatus = ref<'ALL' | TeamStatus>('ALL')
const selectedCategory = ref<'ALL' | TeamCategory>('ALL')
const selectedBranch = ref<'ALL' | TeamBranch>('ALL')

const teams = computed(() => data.value?.teams ?? [])
const managerOptions = computed(() => data.value?.managerOptions ?? [])
const editingTeam = computed(() => teams.value.find(team => team.id === editingTeamId.value) ?? null)
const activeTeams = computed(() => teams.value.filter(team => team.status === 'ACTIVE').length)
const teamsWithManagers = computed(() => teams.value.filter(team => team.managerAssignments.length).length)
const hasNewManagerData = computed(() => Boolean(
  teamForm.newManagerName.trim()
  || teamForm.newManagerEmail.trim()
))
const hasValidNewManager = computed(() => !hasNewManagerData.value || Boolean(
  teamForm.newManagerEmail.trim()
))
const canSaveTeam = computed(() => Boolean(teamForm.name.trim() && teamForm.slug.trim() && hasValidNewManager.value))
const filteredTeams = computed(() => {
  const term = search.value.trim().toLowerCase()

  return teams.value.filter((team) => {
    const matchesSearch = !term
      || team.name.toLowerCase().includes(term)
      || team.slug.toLowerCase().includes(term)
      || (team.shortName ?? '').toLowerCase().includes(term)
    const matchesStatus = selectedStatus.value === 'ALL' || team.status === selectedStatus.value
    const matchesCategory = selectedCategory.value === 'ALL' || team.category === selectedCategory.value
    const matchesBranch = selectedBranch.value === 'ALL' || team.branch === selectedBranch.value

    return matchesSearch && matchesStatus && matchesCategory && matchesBranch
  })
})

const isDeleteModalOpen = computed({
  get: () => teamPendingDelete.value !== null,
  set: (value) => {
    if (!value) teamPendingDelete.value = null
  }
})

watch(() => teamForm.name, (name) => {
  if (editingTeamId.value || isSlugDirty.value) return

  teamForm.slug = slugify(name)
})

function slugify(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80)
}

function managerNames(team: AdminTeam) {
  if (!team.managerAssignments.length) return 'Sin manejador asignado'

  return team.managerAssignments
    .map(assignment => assignment.user.name ?? assignment.user.email)
    .join(', ')
}

function managerIds(team: AdminTeam) {
  return team.managerAssignments.map(assignment => assignment.user.id)
}

function gameCount(team: AdminTeam) {
  return team._count.homeGames + team._count.awayGames
}

function canDeleteTeam(team: AdminTeam) {
  return team._count.players === 0 && gameCount(team) === 0
}

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

function resetTeamForm() {
  editingTeamId.value = null
  isSlugDirty.value = false
  teamForm.name = ''
  teamForm.shortName = ''
  teamForm.slug = ''
  teamForm.logoUrl = ''
  teamForm.primaryColor = '#047857'
  teamForm.secondaryColor = '#0F172A'
  teamForm.managerName = ''
  teamForm.category = 'A'
  teamForm.branch = 'VARONIL'
  teamForm.status = 'ACTIVE'
  teamForm.managerUserIds = []
  teamForm.newManagerName = ''
  teamForm.newManagerEmail = ''
}

function editTeam(team: AdminTeam) {
  editingTeamId.value = team.id
  isSlugDirty.value = true
  teamForm.name = team.name
  teamForm.shortName = team.shortName ?? ''
  teamForm.slug = team.slug
  teamForm.logoUrl = team.logoUrl ?? ''
  teamForm.primaryColor = team.primaryColor ?? '#047857'
  teamForm.secondaryColor = team.secondaryColor ?? '#0F172A'
  teamForm.managerName = team.managerName ?? ''
  teamForm.category = team.category
  teamForm.branch = team.branch
  teamForm.status = team.status
  teamForm.managerUserIds = managerIds(team)
  teamForm.newManagerName = ''
  teamForm.newManagerEmail = ''
}

function teamPayload() {
  const newManager = hasNewManagerData.value
    ? {
        name: teamForm.newManagerName,
        email: teamForm.newManagerEmail
      }
    : undefined

  return {
    name: teamForm.name,
    shortName: teamForm.shortName,
    slug: teamForm.slug,
    logoUrl: teamForm.logoUrl,
    primaryColor: teamForm.primaryColor,
    secondaryColor: teamForm.secondaryColor,
    managerName: teamForm.managerName,
    category: teamForm.category,
    branch: teamForm.branch,
    status: teamForm.status,
    managerUserIds: teamForm.managerUserIds,
    newManager
  }
}

async function saveTeam() {
  if (!canSaveTeam.value) {
    showError(hasNewManagerData.value
      ? 'Completa el correo del manejador.'
      : 'Completa el nombre y el slug del equipo.')

    return
  }

  isSavingTeam.value = true

  try {
    if (editingTeamId.value) {
      await $fetch(`/api/admin/teams/${editingTeamId.value}`, {
        method: 'PATCH',
        body: teamPayload()
      })
      showFeedback('Equipo actualizado.')
    } else {
      await $fetch('/api/admin/teams', {
        method: 'POST',
        body: teamPayload()
      })
      showFeedback('Equipo creado.')
    }

    await refresh()
    resetTeamForm()
  } catch (error) {
    const statusMessage = typeof error === 'object' && error && 'data' in error
      ? String((error as { data?: { statusMessage?: unknown } }).data?.statusMessage ?? '')
      : ''

    showError(statusMessage || 'No se pudo guardar el equipo. Revisa los datos e inténtalo de nuevo.')
  } finally {
    isSavingTeam.value = false
  }
}

async function toggleTeamStatus(team: AdminTeam) {
  const nextStatus = team.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE'

  try {
    await $fetch(`/api/admin/teams/${team.id}`, {
      method: 'PATCH',
      body: { status: nextStatus }
    })
    await refresh()
    showFeedback(nextStatus === 'ACTIVE' ? 'Equipo activado.' : 'Equipo inactivado.')
  } catch {
    showError('No se pudo cambiar el estado del equipo.')
  }
}

function deleteTeam(team: AdminTeam) {
  if (!canDeleteTeam(team)) {
    showError('Este equipo ya tiene integrantes o juegos. Puedes marcarlo como inactivo.')

    return
  }

  teamPendingDelete.value = team
}

async function confirmDeleteTeam() {
  const team = teamPendingDelete.value

  if (!team) return

  isDeletingTeam.value = true

  try {
    await $fetch(`/api/admin/teams/${team.id}`, {
      method: 'DELETE'
    })
    await refresh()

    if (editingTeamId.value === team.id) {
      resetTeamForm()
    }

    showFeedback('Equipo eliminado.')
    teamPendingDelete.value = null
  } catch (error) {
    const statusMessage = typeof error === 'object' && error && 'data' in error
      ? String((error as { data?: { statusMessage?: unknown } }).data?.statusMessage ?? '')
      : ''

    showError(statusMessage || 'No se pudo eliminar el equipo.')
  } finally {
    isDeletingTeam.value = false
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
          icon="i-lucide-shield-plus"
        >
          Equipos
        </UBadge>
        <h1 class="mt-3 text-3xl font-bold tracking-normal text-highlighted sm:text-4xl">
          Administración de equipos
        </h1>
        <p class="mt-2 max-w-2xl text-base text-muted">
          Crea equipos, define categoría y rama, asigna manejadores y controla si están activos.
        </p>
      </div>

      <div class="grid grid-cols-3 gap-2 rounded-lg border border-default bg-default p-2 text-center shadow-sm">
        <div class="rounded-md bg-muted/40 px-3 py-2">
          <p class="text-xl font-bold text-highlighted">
            {{ teams.length }}
          </p>
          <p class="text-xs text-muted">
            Equipos
          </p>
        </div>
        <div class="rounded-md bg-muted/40 px-3 py-2">
          <p class="text-xl font-bold text-highlighted">
            {{ activeTeams }}
          </p>
          <p class="text-xs text-muted">
            Activos
          </p>
        </div>
        <div class="rounded-md bg-muted/40 px-3 py-2">
          <p class="text-xl font-bold text-highlighted">
            {{ teamsWithManagers }}
          </p>
          <p class="text-xs text-muted">
            Con manager
          </p>
        </div>
      </div>
    </div>

    <section class="grid gap-4 xl:grid-cols-[0.9fr_1.1fr]">
      <form
        class="rounded-lg border border-default bg-default p-2.5 shadow-sm sm:p-3"
        @submit.prevent="saveTeam"
      >
        <div class="mb-2.5 flex items-center justify-between gap-2">
          <div>
            <h2 class="text-base font-bold text-highlighted">
              {{ editingTeam ? 'Editar equipo' : 'Nuevo equipo' }}
            </h2>
            <p class="text-xs text-muted">
              El equipo se agrega automáticamente a la temporada activa.
            </p>
          </div>

          <UButton
            v-if="editingTeam"
            icon="i-lucide-plus"
            label="Nuevo"
            color="neutral"
            variant="outline"
            size="sm"
            @click="resetTeamForm"
          />
        </div>

        <div class="grid gap-2 sm:grid-cols-2">
          <label class="grid gap-1.5 text-sm">
            <span class="font-medium text-highlighted">Nombre</span>
            <UInput
              v-model="teamForm.name"
              placeholder="Tigres"
              required
            />
          </label>

          <label class="grid gap-1.5 text-sm">
            <span class="font-medium text-highlighted">Siglas</span>
            <UInput
              v-model="teamForm.shortName"
              placeholder="TIG"
            />
          </label>

          <label class="grid gap-1.5 text-sm">
            <span class="font-medium text-highlighted">Slug</span>
            <UInput
              v-model="teamForm.slug"
              placeholder="tigres"
              required
              @input="isSlugDirty = true"
            />
          </label>

          <label class="grid gap-1.5 text-sm">
            <span class="font-medium text-highlighted">Manejador visible</span>
            <UInput
              v-model="teamForm.managerName"
              placeholder="Nombre para mostrar"
            />
          </label>

          <label class="grid gap-1.5 text-sm">
            <span class="font-medium text-highlighted">Categoría</span>
            <select
              v-model="teamForm.category"
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

          <label class="grid gap-1.5 text-sm">
            <span class="font-medium text-highlighted">Rama</span>
            <select
              v-model="teamForm.branch"
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
          </label>

          <label class="grid gap-1.5 text-sm">
            <span class="font-medium text-highlighted">Estado</span>
            <select
              v-model="teamForm.status"
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

          <label class="grid gap-1.5 text-sm">
            <span class="font-medium text-highlighted">Logo URL</span>
            <UInput
              v-model="teamForm.logoUrl"
              placeholder="https://..."
            />
          </label>

          <label class="grid gap-1.5 text-sm">
            <span class="font-medium text-highlighted">Color primario</span>
            <div class="grid grid-cols-[3rem_1fr] gap-2">
              <input
                v-model="teamForm.primaryColor"
                type="color"
                class="h-10 w-12 rounded-md border border-default bg-default"
              >
              <UInput v-model="teamForm.primaryColor" />
            </div>
          </label>

          <label class="grid gap-1.5 text-sm">
            <span class="font-medium text-highlighted">Color secundario</span>
            <div class="grid grid-cols-[3rem_1fr] gap-2">
              <input
                v-model="teamForm.secondaryColor"
                type="color"
                class="h-10 w-12 rounded-md border border-default bg-default"
              >
              <UInput v-model="teamForm.secondaryColor" />
            </div>
          </label>

          <label class="grid gap-1.5 text-sm sm:col-span-2">
            <span class="font-medium text-highlighted">Manejadores con acceso</span>
            <select
              v-model="teamForm.managerUserIds"
              multiple
              class="min-h-28 w-full rounded-md border border-default bg-default px-3 py-2 text-sm text-highlighted outline-none focus:border-primary"
            >
              <option
                v-for="manager in managerOptions"
                :key="manager.id"
                :value="manager.id"
              >
                {{ manager.name ?? manager.email }} · {{ manager.email }}
              </option>
            </select>
            <span class="text-xs text-muted">
              Usa Cmd/Ctrl para seleccionar más de un manejador.
            </span>
          </label>

          <div class="grid gap-2 border-t border-default pt-2 sm:col-span-2 sm:grid-cols-2">
            <label class="grid gap-1.5 text-sm">
              <span class="font-medium text-highlighted">Nuevo manejador</span>
              <UInput
                v-model="teamForm.newManagerName"
                placeholder="Nombre"
              />
            </label>

            <label class="grid gap-1.5 text-sm">
              <span class="font-medium text-highlighted">Correo</span>
              <UInput
                v-model="teamForm.newManagerEmail"
                type="email"
                placeholder="manager@liga.com"
              />
            </label>
            <p class="text-xs text-muted sm:col-span-2">
              El sistema asigna la misma contraseña temporal a todos los manejadores nuevos.
            </p>
          </div>
        </div>

        <UButton
          type="submit"
          icon="i-lucide-save"
          :label="editingTeam ? 'Actualizar equipo' : 'Crear equipo'"
          color="primary"
          class="mt-2.5"
          :disabled="!canSaveTeam"
          :loading="isSavingTeam"
          block
        />
      </form>

      <section class="rounded-lg border border-default bg-default p-2.5 shadow-sm sm:p-3 xl:flex xl:max-h-[42rem] xl:flex-col">
        <div class="mb-2.5 grid gap-2 lg:grid-cols-[1fr_auto] lg:items-end">
          <div>
            <h2 class="text-base font-bold text-highlighted">
              Equipos registrados
            </h2>
            <p class="text-xs text-muted">
              {{ filteredTeams.length }} de {{ teams.length }} equipos visibles.
            </p>
          </div>

          <div class="grid gap-2 sm:grid-cols-4 lg:min-w-175">
            <UInput
              v-model="search"
              icon="i-lucide-search"
              placeholder="Buscar"
            />
            <select
              v-model="selectedCategory"
              class="h-10 w-full rounded-md border border-default bg-default px-3 text-sm text-highlighted outline-none focus:border-primary"
            >
              <option value="ALL">
                Categorías
              </option>
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
              <option value="ALL">
                Ramas
              </option>
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
                Estados
              </option>
              <option
                v-for="option in statusOptions"
                :key="option.value"
                :value="option.value"
              >
                {{ option.label }}
              </option>
            </select>
          </div>
        </div>

        <div class="grid gap-2 overflow-y-auto pr-1 xl:min-h-0 xl:flex-1">
          <article
            v-for="team in filteredTeams"
            :key="team.id"
            class="rounded-lg border border-default p-2"
          >
            <div class="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
              <div class="flex min-w-0 gap-3">
                <span
                  class="flex size-10 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white"
                  :style="{ backgroundColor: team.primaryColor ?? '#047857' }"
                >
                  {{ teamInitials(team) }}
                </span>

                <div class="min-w-0">
                  <div class="mb-1 flex flex-wrap items-center gap-1.5">
                    <UBadge
                      :color="teamStatusColor(team.status)"
                      variant="subtle"
                    >
                      {{ teamStatusLabel(team.status) }}
                    </UBadge>
                    <UBadge
                      :color="categoryColor(team.category)"
                      variant="subtle"
                    >
                      {{ categoryLabel(team.category) }}
                    </UBadge>
                    <UBadge
                      color="neutral"
                      variant="outline"
                    >
                      {{ branchLabel(team.branch) }}
                    </UBadge>
                  </div>

                  <h3 class="truncate font-bold text-highlighted">
                    {{ team.name }}
                  </h3>
                  <p class="text-xs text-muted">
                    {{ team.slug }} · {{ team._count.players }} integrantes · {{ gameCount(team) }} juegos
                  </p>
                  <p class="mt-1 line-clamp-2 text-xs text-muted">
                    {{ managerNames(team) }}
                  </p>
                </div>
              </div>

              <div class="flex shrink-0 gap-1.5">
                <UButton
                  :icon="team.status === 'ACTIVE' ? 'i-lucide-eye-off' : 'i-lucide-eye'"
                  :aria-label="team.status === 'ACTIVE' ? 'Inactivar equipo' : 'Activar equipo'"
                  :color="team.status === 'ACTIVE' ? 'warning' : 'success'"
                  variant="subtle"
                  size="sm"
                  @click="toggleTeamStatus(team)"
                />
                <UButton
                  icon="i-lucide-pencil"
                  aria-label="Editar equipo"
                  color="neutral"
                  variant="outline"
                  size="sm"
                  @click="editTeam(team)"
                />
                <UButton
                  icon="i-lucide-trash-2"
                  aria-label="Eliminar equipo"
                  color="error"
                  variant="subtle"
                  size="sm"
                  :disabled="!canDeleteTeam(team)"
                  @click="deleteTeam(team)"
                />
              </div>
            </div>
          </article>
        </div>
      </section>
    </section>

    <UModal
      v-model:open="isDeleteModalOpen"
      title="Eliminar equipo"
      :description="teamPendingDelete ? `¿Seguro que deseas eliminar ${teamPendingDelete.name}? Esta acción no se puede deshacer.` : ''"
    >
      <template #footer="{ close }">
        <UButton
          label="Cancelar"
          color="neutral"
          variant="ghost"
          :disabled="isDeletingTeam"
          @click="close"
        />
        <UButton
          label="Eliminar"
          color="error"
          icon="i-lucide-trash-2"
          :loading="isDeletingTeam"
          @click="confirmDeleteTeam"
        />
      </template>
    </UModal>
  </UContainer>
</template>
