<script setup lang="ts">
import {
  PLAYER_POSITION_OPTIONS,
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
  type Player,
  type Team
} from '~/utils/league'

definePageMeta({
  middleware: 'manager'
})

useSeoMeta({
  title: 'Mi equipo | DiamondPanel',
  description: 'Edición del equipo e integrantes para manejadores registrados.'
})

type ManagerTeam = Team & {
  players: Player[]
}

const { data: team, refresh } = await useFetch<ManagerTeam>('/api/manager/team')

const teamForm = reactive({
  name: '',
  shortName: '',
  logoUrl: '',
  primaryColor: '#047857',
  secondaryColor: '#0F172A',
  managerName: ''
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

const editingMemberId = ref<string | null>(null)
const isSavingTeam = ref(false)
const isUploadingTeamLogo = ref(false)
const isSavingMember = ref(false)
const isDeletingMember = ref(false)
const memberPendingDelete = ref<Player | null>(null)
const toast = useToast()

const statusOptions = [
  { label: 'Activo', value: 'ACTIVE' },
  { label: 'Inactivo', value: 'INACTIVE' }
]

watch(team, (value) => {
  if (!value) return

  teamForm.name = value.name
  teamForm.shortName = value.shortName ?? ''
  teamForm.logoUrl = value.logoUrl ?? ''
  teamForm.primaryColor = value.primaryColor ?? '#047857'
  teamForm.secondaryColor = value.secondaryColor ?? '#0F172A'
  teamForm.managerName = value.managerName ?? ''
}, { immediate: true })

watch(() => memberForm.memberRole, (role) => {
  if (role !== 'PLAYER') {
    memberForm.position = ''
    memberForm.number = ''
    memberForm.bats = 'UNKNOWN'
    memberForm.throws = 'UNKNOWN'
  }
})

const members = computed(() => team.value?.players ?? [])
const activePlayers = computed(() => members.value.filter(member => member.memberRole === 'PLAYER' && member.status === 'ACTIVE'))
const staffMembers = computed(() => members.value.filter(member => member.memberRole !== 'PLAYER'))
const editingMember = computed(() => members.value.find(member => member.id === editingMemberId.value) ?? null)
const canSaveMember = computed(() => {
  const hasBase = Boolean(memberForm.firstName.trim() && memberForm.lastName.trim())
  const hasPosition = memberForm.memberRole !== 'PLAYER' || Boolean(memberForm.position.trim())
  const hasIdentity = Boolean(memberForm.curp.trim() && memberForm.birthDate)

  return hasBase && hasPosition && hasIdentity && !curpError.value
})

const hasDuplicateMemberNumber = computed(() => {
  if (memberForm.memberRole !== 'PLAYER' || !memberForm.number) return false

  return members.value.some(member =>
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

const isDeleteModalOpen = computed({
  get: () => memberPendingDelete.value !== null,
  set: (value) => {
    if (!value) memberPendingDelete.value = null
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

function teamFormInitials() {
  return teamForm.shortName.trim() || teamForm.name.trim().slice(0, 2).toUpperCase() || 'DP'
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
  isSavingTeam.value = true

  try {
    team.value = await $fetch<ManagerTeam>('/api/manager/team', {
      method: 'PATCH',
      body: teamForm
    })
    showFeedback('Equipo actualizado.')
  } catch {
    showError('No se pudo actualizar el equipo. Revisa que el nombre no esté repetido y que los colores usen formato válido.')
  } finally {
    isSavingTeam.value = false
  }
}

async function uploadTeamLogo(event: Event) {
  const input = event.target

  if (!(input instanceof HTMLInputElement)) return

  const file = input.files?.[0]

  if (!file) return

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

    const response = await $fetch<{ logoUrl: string, team: ManagerTeam }>('/api/manager/team/logo', {
      method: 'POST',
      body: formData
    })

    team.value = response.team
    teamForm.logoUrl = response.logoUrl
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

  isSavingMember.value = true

  try {
    if (editingMemberId.value) {
      await $fetch(`/api/manager/team/members/${editingMemberId.value}`, {
        method: 'PATCH',
        body: memberPayload()
      })
      toast.add({
        title: 'Integrante actualizado',
        color: 'success',
        icon: 'i-lucide-check-circle-2'
      })
    } else {
      await $fetch('/api/manager/team/members', {
        method: 'POST',
        body: memberPayload()
      })
      toast.add({
        title: 'Integrante agregado',
        color: 'success',
        icon: 'i-lucide-check-circle-2'
      })
    }

    await refresh()
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

async function deleteMember(member: Player) {
  memberPendingDelete.value = member
}

async function confirmDeleteMember() {
  const member = memberPendingDelete.value

  if (!member) return

  isDeletingMember.value = true

  try {
    await $fetch(`/api/manager/team/members/${member.id}`, {
      method: 'DELETE'
    })
    await refresh()

    if (editingMemberId.value === member.id) {
      resetMemberForm()
    }

    showFeedback('Integrante eliminado.')
    memberPendingDelete.value = null
  } catch {
    showError('No se pudo eliminar el integrante. Inténtalo de nuevo.')
  } finally {
    isDeletingMember.value = false
  }
}
</script>

<template>
  <UContainer class="min-w-0 max-w-full overflow-x-hidden py-6 sm:py-8">
    <div
      v-if="team"
      class="grid min-w-0 gap-5"
    >
      <div class="flex min-w-0 flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div class="min-w-0">
          <div class="mb-3 flex flex-wrap items-center gap-2">
            <UBadge
              color="primary"
              variant="subtle"
              icon="i-lucide-clipboard-pen"
            >
              Mi equipo
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

          <h1 class="max-w-full text-2xl font-bold leading-tight tracking-normal text-highlighted break-words sm:text-4xl">
            Administración de {{ team.name }}
          </h1>
          <p class="mt-2 max-w-full text-base text-muted break-words sm:max-w-2xl">
            Actualiza los datos visibles del equipo y administra jugadores, manejadores y coaches.
          </p>
        </div>

        <div class="grid min-w-0 grid-cols-2 gap-2 rounded-lg border border-default bg-muted/30 p-2 text-center sm:grid-cols-3">
          <div class="min-w-0 rounded-md bg-default px-3 py-2">
            <p class="text-xl font-bold text-highlighted">
              {{ activePlayers.length }}
            </p>
            <p class="text-xs text-muted">
              Jugadores
            </p>
          </div>
          <div class="min-w-0 rounded-md bg-default px-3 py-2">
            <p class="text-xl font-bold text-highlighted">
              {{ staffMembers.length }}
            </p>
            <p class="text-xs text-muted">
              Staff
            </p>
          </div>
          <div class="col-span-2 min-w-0 rounded-md bg-default px-3 py-2 sm:col-auto">
            <p class="truncate text-xl font-bold text-highlighted">
              {{ team.shortName ?? teamInitials(team) }}
            </p>
            <p class="text-xs text-muted">
              Siglas
            </p>
          </div>
        </div>
      </div>

      <section class="min-w-0 overflow-hidden rounded-lg border border-default bg-default p-4 shadow-sm sm:p-5">
        <div class="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div class="flex min-w-0 items-center gap-3">
            <img
              v-if="teamForm.logoUrl"
              :src="teamForm.logoUrl"
              :alt="`Logo de ${team.name}`"
              class="size-12 shrink-0 object-contain"
            >
            <span
              v-else
              class="flex size-12 shrink-0 items-center justify-center rounded-full text-sm font-bold text-white"
              :style="{ backgroundColor: teamForm.primaryColor || '#047857' }"
            >
              {{ teamInitials(team) }}
            </span>
            <div class="min-w-0">
              <h2 class="text-xl font-bold text-highlighted">
                Datos del equipo
              </h2>
              <p class="text-sm text-muted break-words">
                Categoría y rama las define la liga.
              </p>
            </div>
          </div>

          <UButton
            icon="i-lucide-save"
            label="Guardar equipo"
            color="primary"
            class="w-full justify-center sm:w-auto"
            :loading="isSavingTeam"
            @click="saveTeam"
          />
        </div>

        <div class="grid min-w-0 gap-3 md:grid-cols-2">
          <label class="grid min-w-0 gap-1.5 text-sm">
            <span class="font-medium text-highlighted">Nombre del equipo</span>
            <UInput
              v-model="teamForm.name"
              class="min-w-0"
              placeholder="Nombre"
            />
          </label>

          <label class="grid min-w-0 gap-1.5 text-sm">
            <span class="font-medium text-highlighted">Siglas</span>
            <UInput
              v-model="teamForm.shortName"
              class="min-w-0"
              placeholder="TR"
            />
          </label>

          <label class="grid min-w-0 gap-1.5 text-sm">
            <span class="font-medium text-highlighted">Manejador principal</span>
            <UInput
              v-model="teamForm.managerName"
              class="min-w-0"
              placeholder="Nombre del manejador"
            />
          </label>

          <div class="grid min-w-0 gap-2 overflow-hidden rounded-md border border-default bg-muted/20 p-2 text-sm md:col-span-2">
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
                  class="block min-w-0 max-w-full text-sm text-muted file:mr-3 file:rounded-md file:border-0 file:bg-primary file:px-3 file:py-2 file:text-sm file:font-medium file:text-white disabled:opacity-60"
                  :disabled="isUploadingTeamLogo"
                  @change="uploadTeamLogo"
                >
                <p class="mt-1 text-xs text-muted">
                  PNG, JPG o WebP. Máximo 3 MB.
                </p>
              </div>
            </div>
          </div>

          <label class="grid min-w-0 gap-1.5 text-sm">
            <span class="font-medium text-highlighted">Color primario</span>
            <div class="grid min-w-0 grid-cols-[3rem_minmax(0,1fr)] gap-2">
              <input
                v-model="teamForm.primaryColor"
                type="color"
                class="h-10 w-12 rounded-md border border-default bg-default"
              >
              <UInput
                v-model="teamForm.primaryColor"
                class="min-w-0"
              />
            </div>
          </label>

          <label class="grid min-w-0 gap-1.5 text-sm">
            <span class="font-medium text-highlighted">Color secundario</span>
            <div class="grid min-w-0 grid-cols-[3rem_minmax(0,1fr)] gap-2">
              <input
                v-model="teamForm.secondaryColor"
                type="color"
                class="h-10 w-12 rounded-md border border-default bg-default"
              >
              <UInput
                v-model="teamForm.secondaryColor"
                class="min-w-0"
              />
            </div>
          </label>
        </div>
      </section>

      <section class="grid min-w-0 gap-4 lg:grid-cols-[0.95fr_1.05fr]">
        <form
          class="min-w-0 overflow-hidden rounded-lg border border-default bg-default p-2.5 shadow-sm sm:p-3 lg:h-96"
          @submit.prevent="saveMember"
        >
          <div class="mb-2.5 flex items-center justify-between gap-2">
            <div>
              <h2 class="text-base font-bold text-highlighted">
                {{ editingMember ? 'Editar integrante' : 'Nuevo integrante' }}
              </h2>
              <p class="text-xs text-muted">
                Selecciona si es jugador, manejador o coach.
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

          <div class="grid min-w-0 gap-2 sm:grid-cols-2">
            <label class="grid min-w-0 gap-1.5 text-sm">
              <span class="font-medium text-highlighted">Nombre</span>
              <UInput
                v-model="memberForm.firstName"
                class="min-w-0"
                required
              />
            </label>

            <label class="grid min-w-0 gap-1.5 text-sm">
              <span class="font-medium text-highlighted">Apellido</span>
              <UInput
                v-model="memberForm.lastName"
                class="min-w-0"
                required
              />
            </label>

            <label class="grid min-w-0 gap-1.5 text-sm">
              <span class="font-medium text-highlighted">CURP</span>
              <UInput
                v-model="memberForm.curp"
                class="min-w-0 uppercase"
                autocomplete="off"
                maxlength="18"
                placeholder="ABCD010101HDFXXX01"
                :color="curpError ? 'error' : 'neutral'"
                required
              />
              <span
                v-if="curpError"
                class="text-xs font-medium text-error"
              >
                {{ curpError }}
              </span>
            </label>

            <label class="grid min-w-0 gap-1.5 text-sm">
              <span class="font-medium text-highlighted">Fecha de nacimiento</span>
              <UInput
                v-model="memberForm.birthDate"
                class="min-w-0"
                type="date"
                :max="new Date().toISOString().slice(0, 10)"
                required
              />
            </label>

            <label class="grid min-w-0 gap-1.5 text-sm">
              <span class="font-medium text-highlighted">Tipo</span>
              <select
                v-model="memberForm.memberRole"
                class="h-10 min-w-0 max-w-full rounded-md border border-default bg-default px-3 text-sm text-highlighted outline-none focus:border-primary"
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

            <label class="grid min-w-0 gap-1.5 text-sm">
              <span class="font-medium text-highlighted">Estado</span>
              <select
                v-model="memberForm.status"
                class="h-10 min-w-0 max-w-full rounded-md border border-default bg-default px-3 text-sm text-highlighted outline-none focus:border-primary"
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
              class="grid min-w-0 gap-1.5 text-sm"
            >
              <span class="font-medium text-highlighted">Número</span>
              <UInput
                v-model="memberForm.number"
                class="min-w-0"
                type="number"
                min="0"
                max="999"
                placeholder="24"
              />
            </label>

            <label
              v-if="memberForm.memberRole === 'PLAYER'"
              class="grid min-w-0 gap-1.5 text-sm"
            >
              <span class="font-medium text-highlighted">Posición</span>
              <select
                v-model="memberForm.position"
                required
                class="h-10 min-w-0 max-w-full rounded-md border border-default bg-default px-3 text-sm text-highlighted outline-none focus:border-primary"
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

        <section class="min-w-0 overflow-hidden rounded-lg border border-default bg-default p-2.5 shadow-sm sm:p-3 lg:flex lg:h-96 lg:flex-col">
          <div class="mb-2.5 flex items-center justify-between gap-2">
            <div>
              <h2 class="text-base font-bold text-highlighted">
                Integrantes
              </h2>
              <p class="text-xs text-muted">
                Roster completo del equipo.
              </p>
            </div>
            <UBadge
              color="neutral"
              variant="outline"
            >
              {{ members.length }} registros
            </UBadge>
          </div>

          <div class="grid max-h-80 gap-2 overflow-y-auto pr-1 lg:max-h-none lg:min-h-0 lg:flex-1">
            <article
              v-for="member in members"
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
                  <p class="text-xs text-muted break-words">
                    <span v-if="member.memberRole === 'PLAYER'">
                      #{{ member.number ?? '-' }} • {{ playerPositionLabel(member.position) }} • CURP {{ member.curp ?? '-' }} • Batea {{ handLabel(member.bats) }} • Lanza {{ handLabel(member.throws) }}
                    </span>
                    <span v-else>
                      Staff del equipo
                    </span>
                  </p>
                </div>

                <div class="flex shrink-0 gap-1.5">
                  <UButton
                    icon="i-lucide-pencil"
                    aria-label="Editar integrante"
                    color="neutral"
                    variant="outline"
                    size="sm"
                    @click="editMember(member)"
                  />
                  <UButton
                    icon="i-lucide-trash-2"
                    aria-label="Eliminar integrante"
                    color="error"
                    variant="subtle"
                    size="sm"
                    @click="deleteMember(member)"
                  />
                </div>
              </div>
            </article>
          </div>
        </section>
      </section>
    </div>

    <UModal
      v-model:open="isDeleteModalOpen"
      title="Eliminar integrante"
      :description="memberPendingDelete ? `¿Seguro que deseas eliminar a ${playerName(memberPendingDelete)} del equipo? Esta acción no se puede deshacer.` : ''"
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
