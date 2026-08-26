<script setup lang="ts">
import {
  PLAYER_POSITION_OPTIONS,
  TEAM_BRANCH_OPTIONS,
  TEAM_CATEGORY_OPTIONS,
  TEAM_MEMBER_ROLE_OPTIONS,
  branchLabel,
  categoryColor,
  categoryLabel,
  handLabel,
  memberRoleColor,
  memberRoleLabel,
  playerPositionLabel,
  playerName,
  teamInitials,
  teamStatusColor,
  teamStatusLabel,
  type Player,
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

type TeamMembersResponse = {
  members: Player[]
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

const memberForm = reactive({
  firstName: '',
  lastName: '',
  curp: '',
  birthDate: '',
  number: '',
  memberRole: 'PLAYER',
  position: '',
  bats: 'UNKNOWN',
  throws: 'UNKNOWN',
  status: 'ACTIVE'
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
const isUploadingTeamLogo = ref(false)
const isLoadingMembers = ref(false)
const isSavingMember = ref(false)
const isDeletingMember = ref(false)
const togglingTeamId = ref<string | null>(null)
const isDeletingTeam = ref(false)
const teamPendingDelete = ref<AdminTeam | null>(null)
const memberPendingDelete = ref<Player | null>(null)
const teamMembers = ref<Player[]>([])
const editingMemberId = ref<string | null>(null)
const isSlugDirty = ref(false)
const showAdvancedTeamOptions = ref(false)
const search = ref('')
const selectedStatus = ref<'ALL' | TeamStatus>('ALL')
const selectedCategory = ref<'ALL' | TeamCategory>('ALL')
const selectedBranch = ref<'ALL' | TeamBranch>('ALL')
const mobileSection = ref<'LIST' | 'FORM' | 'MEMBERS'>('LIST')

const teams = computed(() => data.value?.teams ?? [])
const managerOptions = computed(() => data.value?.managerOptions ?? [])
const editingTeam = computed(() => teams.value.find(team => team.id === editingTeamId.value) ?? null)
const editingMember = computed(() => teamMembers.value.find(member => member.id === editingMemberId.value) ?? null)
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
const canSaveMember = computed(() => {
  const hasBase = Boolean(memberForm.firstName.trim() && memberForm.lastName.trim())
  const hasPosition = memberForm.memberRole !== 'PLAYER' || Boolean(memberForm.position.trim())
  const hasIdentity = Boolean(memberForm.curp.trim() && memberForm.birthDate)

  return Boolean(editingTeamId.value && hasBase && hasPosition && hasIdentity && !curpError.value)
})
const hasDuplicateMemberNumber = computed(() => {
  if (memberForm.memberRole !== 'PLAYER' || !memberForm.number) return false

  return teamMembers.value.some(member =>
    member.id !== editingMemberId.value
    && member.number === Number(memberForm.number)
  )
})
const curpError = computed(() => {
  if (!memberForm.curp) return ''

  return /^[A-Z]{4}\d{6}[HM][A-Z]{5}[A-Z0-9]\d$/.test(memberForm.curp.trim().toUpperCase())
    ? ''
    : 'Ingresa una CURP válida de 18 caracteres.'
})
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

const isMemberDeleteModalOpen = computed({
  get: () => memberPendingDelete.value !== null,
  set: (value) => {
    if (!value) memberPendingDelete.value = null
  }
})

watch(() => teamForm.name, (name) => {
  if (editingTeamId.value || isSlugDirty.value) return

  teamForm.slug = slugify(name)
})

watch(() => memberForm.memberRole, (role) => {
  if (role !== 'PLAYER') {
    memberForm.position = ''
    memberForm.number = ''
    memberForm.bats = 'UNKNOWN'
    memberForm.throws = 'UNKNOWN'
  }
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

function teamFormInitials() {
  return teamForm.shortName.trim() || teamForm.name.trim().slice(0, 2).toUpperCase() || 'DP'
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

function handleManagerSelection(managerId: string, event: Event) {
  const target = event.target

  if (!(target instanceof HTMLInputElement)) return

  if (target.checked) {
    if (!teamForm.managerUserIds.includes(managerId)) {
      teamForm.managerUserIds.push(managerId)
    }

    return
  }

  teamForm.managerUserIds = teamForm.managerUserIds.filter(id => id !== managerId)
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

function resetMemberForm() {
  editingMemberId.value = null
  memberForm.firstName = ''
  memberForm.lastName = ''
  memberForm.curp = ''
  memberForm.birthDate = ''
  memberForm.number = ''
  memberForm.memberRole = 'PLAYER'
  memberForm.position = ''
  memberForm.bats = 'UNKNOWN'
  memberForm.throws = 'UNKNOWN'
  memberForm.status = 'ACTIVE'
}

function resetTeamForm() {
  editingTeamId.value = null
  teamMembers.value = []
  memberPendingDelete.value = null
  isLoadingMembers.value = false
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
  showAdvancedTeamOptions.value = false
  resetMemberForm()
}

function startNewTeam() {
  resetTeamForm()
  mobileSection.value = 'FORM'
}

function editTeam(team: AdminTeam) {
  editingTeamId.value = team.id
  teamMembers.value = []
  resetMemberForm()
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
  mobileSection.value = 'FORM'
  void loadTeamMembers(team.id)
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

async function loadTeamMembers(teamId: string) {
  isLoadingMembers.value = true

  try {
    const response = await $fetch<TeamMembersResponse>(`/api/admin/teams/${teamId}/members`)

    if (editingTeamId.value === teamId) {
      teamMembers.value = response.members
    }
  } catch {
    if (editingTeamId.value === teamId) {
      showError('No se pudieron cargar los integrantes del equipo.')
    }
  } finally {
    if (editingTeamId.value === teamId) {
      isLoadingMembers.value = false
    }
  }
}

function editMember(member: Player) {
  editingMemberId.value = member.id
  memberForm.firstName = member.firstName
  memberForm.lastName = member.lastName
  memberForm.curp = member.curp ?? ''
  memberForm.birthDate = member.birthDate?.slice(0, 10) ?? ''
  memberForm.number = member.number?.toString() ?? ''
  memberForm.memberRole = member.memberRole
  memberForm.position = member.position ?? ''
  memberForm.bats = member.bats
  memberForm.throws = member.throws
  memberForm.status = member.status
  mobileSection.value = 'MEMBERS'
}

function memberPayload() {
  return {
    firstName: memberForm.firstName,
    lastName: memberForm.lastName,
    curp: memberForm.curp,
    birthDate: memberForm.birthDate,
    number: memberForm.number ? Number(memberForm.number) : null,
    memberRole: memberForm.memberRole,
    position: memberForm.memberRole === 'PLAYER' ? memberForm.position : null,
    bats: memberForm.bats,
    throws: memberForm.throws,
    status: memberForm.status
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
    mobileSection.value = 'LIST'
  } catch (error) {
    const statusMessage = typeof error === 'object' && error && 'data' in error
      ? String((error as { data?: { statusMessage?: unknown } }).data?.statusMessage ?? '')
      : ''

    showError(statusMessage || 'No se pudo guardar el equipo. Revisa los datos e inténtalo de nuevo.')
  } finally {
    isSavingTeam.value = false
  }
}

async function uploadTeamLogo(event: Event) {
  const input = event.target

  if (!(input instanceof HTMLInputElement)) return

  const file = input.files?.[0]

  if (!file) return

  if (!editingTeamId.value) {
    showError('Guarda el equipo antes de subir su logo.')
    input.value = ''

    return
  }

  if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type)) {
    showError('El logo debe ser PNG, JPG o WebP.')
    input.value = ''

    return
  }

  if (file.size > 3 * 1024 * 1024) {
    showError('El logo debe pesar máximo 3 MB.')
    input.value = ''

    return
  }

  isUploadingTeamLogo.value = true

  try {
    const formData = new FormData()

    formData.append('logo', file)

    const response = await $fetch<{ logoUrl: string, team: AdminTeam }>(`/api/admin/teams/${editingTeamId.value}/logo`, {
      method: 'POST',
      body: formData
    })

    teamForm.logoUrl = response.logoUrl
    await refresh()
    showFeedback('Logo actualizado.')
  } catch (error) {
    const statusMessage = typeof error === 'object' && error && 'data' in error
      ? String((error as { data?: { statusMessage?: unknown } }).data?.statusMessage ?? '')
      : ''

    showError(statusMessage || 'No se pudo subir el logo del equipo.')
  } finally {
    isUploadingTeamLogo.value = false
    input.value = ''
  }
}

async function saveMember() {
  if (!editingTeamId.value) {
    showError('Primero selecciona un equipo.')

    return
  }

  if (!canSaveMember.value) {
    showError('Completa nombre, apellido, CURP, fecha de nacimiento y posición si el integrante es jugador.')

    return
  }

  if (hasDuplicateMemberNumber.value) {
    showError('Ese número ya está registrado para otro integrante de este equipo.')

    return
  }

  if (curpError.value) {
    showError(curpError.value)

    return
  }

  const teamId = editingTeamId.value
  isSavingMember.value = true

  try {
    if (editingMemberId.value) {
      await $fetch(`/api/admin/teams/${teamId}/members/${editingMemberId.value}`, {
        method: 'PATCH',
        body: memberPayload()
      })
      showFeedback('Integrante actualizado.')
    } else {
      await $fetch(`/api/admin/teams/${teamId}/members`, {
        method: 'POST',
        body: memberPayload()
      })
      showFeedback('Integrante agregado.')
    }

    await Promise.all([
      loadTeamMembers(teamId),
      refresh()
    ])
    resetMemberForm()
  } catch (error) {
    const statusMessage = typeof error === 'object' && error && 'data' in error
      ? String((error as { data?: { statusMessage?: unknown } }).data?.statusMessage ?? '')
      : ''

    showError(statusMessage || 'No se pudo guardar el integrante. Revisa los datos e inténtalo de nuevo.')
  } finally {
    isSavingMember.value = false
  }
}

function deleteMember(member: Player) {
  memberPendingDelete.value = member
}

async function confirmDeleteMember() {
  const member = memberPendingDelete.value
  const teamId = editingTeamId.value

  if (!member || !teamId) return

  isDeletingMember.value = true

  try {
    await $fetch(`/api/admin/teams/${teamId}/members/${member.id}`, {
      method: 'DELETE'
    })
    await Promise.all([
      loadTeamMembers(teamId),
      refresh()
    ])

    if (editingMemberId.value === member.id) {
      resetMemberForm()
    }

    showFeedback('Integrante eliminado.')
    memberPendingDelete.value = null
  } catch (error) {
    const statusMessage = typeof error === 'object' && error && 'data' in error
      ? String((error as { data?: { statusMessage?: unknown } }).data?.statusMessage ?? '')
      : ''

    showError(statusMessage || 'No se pudo eliminar el integrante.')
  } finally {
    isDeletingMember.value = false
  }
}

async function toggleTeamStatus(team: AdminTeam) {
  if (togglingTeamId.value) return

  const nextStatus = team.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE'
  togglingTeamId.value = team.id

  try {
    await $fetch(`/api/admin/teams/${team.id}`, {
      method: 'PATCH',
      body: { status: nextStatus }
    })
    await refresh()
    showFeedback(nextStatus === 'ACTIVE' ? 'Equipo activado.' : 'Equipo inactivado.')
  } catch {
    showError('No se pudo cambiar el estado del equipo.')
  } finally {
    togglingTeamId.value = null
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
  <UContainer class="min-w-0 pb-6 pt-4 sm:py-8">
    <div class="mb-6 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
      <div class="min-w-0">
        <UBadge
          color="primary"
          variant="subtle"
          icon="i-lucide-shield-plus"
        >
          Equipos
        </UBadge>
        <h1 class="mt-3 text-2xl font-bold leading-tight tracking-normal text-highlighted sm:text-4xl">
          Administración de equipos
        </h1>
        <p class="mt-2 max-w-2xl text-sm text-muted sm:text-base">
          Crea equipos, define categoría y rama, asigna manejadores y controla si están activos.
        </p>
      </div>

      <div class="grid grid-cols-3 gap-2 rounded-lg border border-default bg-default p-2 text-center shadow-sm">
        <div class="min-w-0 rounded-md bg-muted/40 px-2 py-2 sm:px-3">
          <p class="text-xl font-bold text-highlighted">
            {{ teams.length }}
          </p>
          <p class="text-xs text-muted">
            Equipos
          </p>
        </div>
        <div class="min-w-0 rounded-md bg-muted/40 px-2 py-2 sm:px-3">
          <p class="text-xl font-bold text-highlighted">
            {{ activeTeams }}
          </p>
          <p class="text-xs text-muted">
            Activos
          </p>
        </div>
        <div class="min-w-0 rounded-md bg-muted/40 px-2 py-2 sm:px-3">
          <p class="text-xl font-bold text-highlighted">
            {{ teamsWithManagers }}
          </p>
          <p class="text-xs text-muted">
            Con manager
          </p>
        </div>
      </div>
    </div>

    <div class="mb-4 grid grid-cols-3 gap-1 rounded-lg bg-muted/40 p-1 text-sm xl:hidden">
      <button
        type="button"
        class="inline-flex h-10 items-center justify-center gap-1.5 rounded-md font-bold transition"
        :class="mobileSection === 'LIST' ? 'bg-default text-highlighted shadow-sm' : 'text-muted'"
        @click="mobileSection = 'LIST'"
      >
        <UIcon
          name="i-lucide-shield"
          class="size-4"
        />
        Equipos
      </button>
      <button
        type="button"
        class="inline-flex h-10 items-center justify-center gap-1.5 rounded-md font-bold transition"
        :class="mobileSection === 'FORM' ? 'bg-default text-highlighted shadow-sm' : 'text-muted'"
        @click="startNewTeam"
      >
        <UIcon
          name="i-lucide-plus"
          class="size-4"
        />
        Nuevo
      </button>
      <button
        type="button"
        class="inline-flex h-10 items-center justify-center gap-1.5 rounded-md font-bold transition disabled:opacity-45"
        :class="mobileSection === 'MEMBERS' ? 'bg-default text-highlighted shadow-sm' : 'text-muted'"
        :disabled="!editingTeam"
        @click="mobileSection = 'MEMBERS'"
      >
        <UIcon
          name="i-lucide-users-round"
          class="size-4"
        />
        Roster
      </button>
    </div>

    <section class="grid gap-4 xl:grid-cols-[0.9fr_1.1fr]">
      <form
        class="rounded-lg border border-default bg-default p-2.5 shadow-sm sm:p-3"
        :class="mobileSection === 'FORM' ? '' : 'hidden xl:block'"
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
            <span class="font-medium text-highlighted">Nombre público del manejador</span>
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

          <div class="grid gap-1.5 text-sm sm:col-span-2">
            <span class="font-medium text-highlighted">Manejadores con acceso</span>
            <div class="grid max-h-40 gap-2 overflow-y-auto rounded-md border border-default bg-default p-2">
              <label
                v-for="manager in managerOptions"
                :key="manager.id"
                class="flex items-center gap-2 rounded-md bg-muted/30 px-2 py-2"
              >
                <input
                  type="checkbox"
                  class="size-4"
                  :checked="teamForm.managerUserIds.includes(manager.id)"
                  @change="handleManagerSelection(manager.id, $event)"
                >
                <span class="min-w-0">
                  <span class="block truncate font-medium text-highlighted">
                    {{ manager.name ?? manager.email }}
                  </span>
                  <span class="block truncate text-xs text-muted">
                    {{ manager.email }}
                  </span>
                </span>
              </label>

              <p
                v-if="!managerOptions.length"
                class="px-2 py-3 text-sm text-muted"
              >
                Aún no hay manejadores registrados.
              </p>
            </div>
          </div>

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

          <div class="grid gap-2 border-t border-default pt-2 sm:col-span-2">
            <UButton
              type="button"
              :icon="showAdvancedTeamOptions ? 'i-lucide-chevron-up' : 'i-lucide-chevron-down'"
              :label="showAdvancedTeamOptions ? 'Ocultar opciones avanzadas' : 'Opciones avanzadas'"
              color="neutral"
              variant="ghost"
              class="w-fit"
              @click="showAdvancedTeamOptions = !showAdvancedTeamOptions"
            />

            <div
              v-if="showAdvancedTeamOptions"
              class="grid gap-2 sm:grid-cols-2"
            >
              <label class="grid gap-1.5 text-sm">
                <span class="font-medium text-highlighted">Slug</span>
                <UInput
                  v-model="teamForm.slug"
                  placeholder="tigres"
                  required
                  @input="isSlugDirty = true"
                />
              </label>

              <div class="grid gap-2 rounded-md border border-default bg-muted/20 p-2 text-sm sm:col-span-2">
                <span class="font-medium text-highlighted">Logo del equipo</span>
                <div class="flex flex-col gap-3 sm:flex-row sm:items-center">
                  <img
                    v-if="teamForm.logoUrl"
                    :src="teamForm.logoUrl"
                    :alt="`Logo de ${teamForm.name}`"
                    class="size-20 shrink-0 object-contain"
                  >
                  <span
                    v-else
                    class="flex size-16 shrink-0 items-center justify-center rounded-md text-sm font-bold text-white"
                    :style="{ backgroundColor: teamForm.primaryColor || '#047857' }"
                  >
                    {{ teamFormInitials() }}
                  </span>
                  <div class="min-w-0 flex-1">
                    <input
                      type="file"
                      accept="image/png,image/jpeg,image/webp"
                      class="block w-full text-sm text-muted file:mr-3 file:rounded-md file:border-0 file:bg-primary file:px-3 file:py-2 file:text-sm file:font-medium file:text-white disabled:opacity-60"
                      :disabled="!editingTeamId || isUploadingTeamLogo"
                      @change="uploadTeamLogo"
                    >
                    <p class="mt-1 text-xs text-muted">
                      {{ editingTeamId ? 'PNG, JPG o WebP. Máximo 3 MB.' : 'Primero guarda el equipo para poder subir su logo.' }}
                    </p>
                  </div>
                </div>
              </div>

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
            </div>
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

      <section
        class="rounded-lg border border-default bg-default p-2.5 shadow-sm sm:p-3 xl:flex xl:max-h-168 xl:flex-col"
        :class="mobileSection === 'LIST' ? '' : 'hidden xl:flex'"
      >
        <div class="mb-2.5 grid gap-2 lg:grid-cols-[1fr_auto] lg:items-end">
          <div class="flex items-center justify-between gap-2 xl:hidden">
            <div>
              <h2 class="text-base font-bold text-highlighted">
                Equipos registrados
              </h2>
              <p class="text-xs text-muted">
                {{ filteredTeams.length }} de {{ teams.length }} equipos visibles.
              </p>
            </div>
            <UButton
              type="button"
              icon="i-lucide-plus"
              label="Nuevo"
              color="primary"
              variant="subtle"
              size="sm"
              class="xl:hidden"
              @click="startNewTeam"
            />
          </div>

          <div class="hidden xl:block">
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
                <img
                  v-if="team.logoUrl"
                  :src="team.logoUrl"
                  :alt="`Logo de ${team.name}`"
                  class="size-10 shrink-0 object-contain"
                >
                <span
                  v-else
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
                <UTooltip :text="team.status === 'ACTIVE' ? 'Inactivar equipo' : 'Activar equipo'">
                  <UButton
                    :icon="team.status === 'ACTIVE' ? 'i-lucide-eye-off' : 'i-lucide-eye'"
                    :aria-label="team.status === 'ACTIVE' ? 'Inactivar equipo' : 'Activar equipo'"
                    :color="team.status === 'ACTIVE' ? 'warning' : 'success'"
                    variant="subtle"
                    size="sm"
                    :loading="togglingTeamId === team.id"
                    :disabled="Boolean(togglingTeamId)"
                    @click="toggleTeamStatus(team)"
                  />
                </UTooltip>
                <UTooltip text="Editar equipo">
                  <UButton
                    icon="i-lucide-pencil"
                    aria-label="Editar equipo"
                    color="neutral"
                    variant="outline"
                    size="sm"
                    @click="editTeam(team)"
                  />
                </UTooltip>
                <UTooltip :text="canDeleteTeam(team) ? 'Eliminar equipo' : 'No se puede eliminar porque ya tiene integrantes o juegos'">
                  <UButton
                    icon="i-lucide-trash-2"
                    aria-label="Eliminar equipo"
                    color="error"
                    variant="subtle"
                    size="sm"
                    :disabled="!canDeleteTeam(team)"
                    @click="deleteTeam(team)"
                  />
                </UTooltip>
              </div>
            </div>
          </article>
        </div>
      </section>
    </section>

    <section
      v-if="editingTeam"
      class="mt-4 min-w-0 gap-4 xl:grid xl:grid-cols-[0.85fr_1.15fr]"
      :class="mobileSection === 'MEMBERS' ? 'grid' : 'hidden xl:grid'"
    >
      <form
        class="rounded-lg border border-default bg-default p-2.5 shadow-sm sm:p-3"
        @submit.prevent="saveMember"
      >
        <div class="mb-2.5 flex items-center justify-between gap-2">
          <div>
            <h2 class="text-base font-bold text-highlighted">
              {{ editingMember ? 'Editar integrante' : 'Nuevo integrante' }}
            </h2>
            <p class="text-xs text-muted">
              {{ editingTeam.name }}
            </p>
          </div>

          <UButton
            v-if="editingMember"
            icon="i-lucide-plus"
            label="Nuevo"
            color="neutral"
            variant="outline"
            size="sm"
            @click="resetMemberForm"
          />
        </div>

        <div class="grid gap-2 sm:grid-cols-2">
          <label class="grid gap-1.5 text-sm">
            <span class="font-medium text-highlighted">Nombre</span>
            <UInput
              v-model="memberForm.firstName"
              required
            />
          </label>

          <label class="grid gap-1.5 text-sm">
            <span class="font-medium text-highlighted">Apellido</span>
            <UInput
              v-model="memberForm.lastName"
              required
            />
          </label>

          <label class="grid gap-1.5 text-sm">
            <span class="font-medium text-highlighted">CURP</span>
            <UInput
              v-model="memberForm.curp"
              autocomplete="off"
              maxlength="18"
              placeholder="ABCD010101HDFXXX01"
              :color="curpError ? 'error' : 'neutral'"
              class="uppercase"
              required
            />
            <span
              v-if="curpError"
              class="text-xs font-medium text-error"
            >
              {{ curpError }}
            </span>
          </label>

          <label class="grid gap-1.5 text-sm">
            <span class="font-medium text-highlighted">Fecha de nacimiento</span>
            <UInput
              v-model="memberForm.birthDate"
              type="date"
              :max="new Date().toISOString().slice(0, 10)"
              required
            />
          </label>

          <label class="grid gap-1.5 text-sm">
            <span class="font-medium text-highlighted">Tipo</span>
            <select
              v-model="memberForm.memberRole"
              class="h-10 w-full rounded-md border border-default bg-default px-3 text-sm text-highlighted outline-none focus:border-primary"
            >
              <option
                v-for="option in TEAM_MEMBER_ROLE_OPTIONS"
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
              v-model="memberForm.status"
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

          <label
            v-if="memberForm.memberRole === 'PLAYER'"
            class="grid gap-1.5 text-sm"
          >
            <span class="font-medium text-highlighted">Número</span>
            <UInput
              v-model="memberForm.number"
              type="number"
              min="0"
              max="999"
              placeholder="24"
            />
          </label>

          <label
            v-if="memberForm.memberRole === 'PLAYER'"
            class="grid gap-1.5 text-sm"
          >
            <span class="font-medium text-highlighted">Posición</span>
            <select
              v-model="memberForm.position"
              required
              class="h-10 w-full rounded-md border border-default bg-default px-3 text-sm text-highlighted outline-none focus:border-primary"
            >
              <option value="">
                Selecciona posición
              </option>
              <option
                v-for="position in PLAYER_POSITION_OPTIONS"
                :key="position"
                :value="position"
              >
                {{ playerPositionLabel(position) }}
              </option>
            </select>
          </label>
        </div>

        <UButton
          type="submit"
          icon="i-lucide-save"
          :label="editingMember ? 'Actualizar integrante' : 'Agregar integrante'"
          color="primary"
          class="mt-2.5"
          :disabled="!canSaveMember"
          :loading="isSavingMember"
          block
        />
      </form>

      <section class="rounded-lg border border-default bg-default p-2.5 shadow-sm sm:p-3 xl:flex xl:max-h-140 xl:flex-col">
        <div class="mb-2.5 flex items-center justify-between gap-2">
          <div>
            <h2 class="text-base font-bold text-highlighted">
              Integrantes
            </h2>
            <p class="text-xs text-muted">
              {{ categoryLabel(editingTeam.category) }} · {{ branchLabel(editingTeam.branch) }}
            </p>
          </div>
          <UBadge
            color="neutral"
            variant="outline"
          >
            {{ teamMembers.length }} registros
          </UBadge>
        </div>

        <div
          v-if="isLoadingMembers"
          class="rounded-lg border border-dashed border-default px-3 py-8 text-center text-sm text-muted"
        >
          Cargando integrantes...
        </div>

        <div
          v-else
          class="grid gap-2 overflow-y-auto pr-1 xl:min-h-0 xl:flex-1"
        >
          <article
            v-for="member in teamMembers"
            :key="member.id"
            class="rounded-lg border border-default p-2"
          >
            <div class="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
              <div class="min-w-0">
                <div class="mb-1 flex flex-wrap items-center gap-1.5">
                  <UBadge
                    :color="memberRoleColor(member.memberRole)"
                    variant="subtle"
                  >
                    {{ memberRoleLabel(member.memberRole) }}
                  </UBadge>
                  <UBadge
                    :color="member.status === 'ACTIVE' ? 'success' : 'neutral'"
                    variant="outline"
                  >
                    {{ member.status === 'ACTIVE' ? 'Activo' : 'Inactivo' }}
                  </UBadge>
                </div>

                <h3 class="truncate font-bold text-highlighted">
                  {{ playerName(member) }}
                </h3>
                <p class="text-xs text-muted">
                  <span v-if="member.memberRole === 'PLAYER'">
                    #{{ member.number ?? '-' }} · {{ playerPositionLabel(member.position) }} · CURP {{ member.curp ?? '-' }} · Batea {{ handLabel(member.bats) }} · Lanza {{ handLabel(member.throws) }}
                  </span>
                  <span v-else>
                    Staff del equipo · CURP {{ member.curp ?? '-' }}
                  </span>
                </p>
              </div>

              <div class="flex shrink-0 gap-1.5">
                <UTooltip text="Editar integrante">
                  <UButton
                    icon="i-lucide-pencil"
                    aria-label="Editar integrante"
                    color="neutral"
                    variant="outline"
                    size="sm"
                    @click="editMember(member)"
                  />
                </UTooltip>
                <UTooltip text="Eliminar integrante">
                  <UButton
                    icon="i-lucide-trash-2"
                    aria-label="Eliminar integrante"
                    color="error"
                    variant="subtle"
                    size="sm"
                    @click="deleteMember(member)"
                  />
                </UTooltip>
              </div>
            </div>
          </article>

          <p
            v-if="!teamMembers.length"
            class="rounded-lg border border-dashed border-default px-3 py-8 text-center text-sm text-muted"
          >
            Este equipo todavía no tiene integrantes.
          </p>
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

    <UModal
      v-model:open="isMemberDeleteModalOpen"
      title="Eliminar integrante"
      :description="memberPendingDelete ? `¿Seguro que deseas eliminar a ${playerName(memberPendingDelete)}? Esta acción no se puede deshacer.` : ''"
    >
      <template #footer="{ close }">
        <UButton
          label="Cancelar"
          color="neutral"
          variant="ghost"
          :disabled="isDeletingMember"
          @click="close"
        />
        <UButton
          label="Eliminar"
          color="error"
          icon="i-lucide-trash-2"
          :loading="isDeletingMember"
          @click="confirmDeleteMember"
        />
      </template>
    </UModal>
  </UContainer>
</template>
