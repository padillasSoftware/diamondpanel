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
  number: '',
  memberRole: 'PLAYER',
  position: '',
  bats: 'UNKNOWN',
  throws: 'UNKNOWN',
  status: 'ACTIVE'
})

const editingMemberId = ref<string | null>(null)
const isSavingTeam = ref(false)
const isSavingMember = ref(false)
const feedback = ref('')
const errorMessage = ref('')

const handOptions = [
  { label: 'No especificado', value: 'UNKNOWN' },
  { label: 'Derecha', value: 'RIGHT' },
  { label: 'Izquierda', value: 'LEFT' },
  { label: 'Ambos', value: 'SWITCH' }
]

const throwOptions = handOptions.filter(option => option.value !== 'SWITCH')

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

  return hasBase && hasPosition
})

function clearMessages() {
  feedback.value = ''
  errorMessage.value = ''
}

function showFeedback(message: string) {
  feedback.value = message
  errorMessage.value = ''
}

function showError(message: string) {
  errorMessage.value = message
  feedback.value = ''
}

function resetMemberForm() {
  editingMemberId.value = null
  memberForm.firstName = ''
  memberForm.lastName = ''
  memberForm.number = ''
  memberForm.memberRole = 'PLAYER'
  memberForm.position = ''
  memberForm.bats = 'UNKNOWN'
  memberForm.throws = 'UNKNOWN'
  memberForm.status = 'ACTIVE'
}

function editMember(member: Player) {
  clearMessages()
  editingMemberId.value = member.id
  memberForm.firstName = member.firstName
  memberForm.lastName = member.lastName
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
    number: memberForm.number ? Number(memberForm.number) : null,
    memberRole: memberForm.memberRole,
    position: memberForm.memberRole === 'PLAYER' ? memberForm.position : null,
    bats: memberForm.bats,
    throws: memberForm.throws,
    status: memberForm.status
  }
}

async function saveTeam() {
  clearMessages()
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

async function saveMember() {
  clearMessages()

  if (!canSaveMember.value) {
    showError('Completa nombre, apellido y posición si el integrante es jugador.')

    return
  }

  isSavingMember.value = true

  try {
    if (editingMemberId.value) {
      await $fetch(`/api/manager/team/members/${editingMemberId.value}`, {
        method: 'PATCH',
        body: memberPayload()
      })
      showFeedback('Integrante actualizado.')
    } else {
      await $fetch('/api/manager/team/members', {
        method: 'POST',
        body: memberPayload()
      })
      showFeedback('Integrante agregado.')
    }

    await refresh()
    resetMemberForm()
  } catch {
    showError('No se pudo guardar el integrante. Revisa que el número no esté repetido.')
  } finally {
    isSavingMember.value = false
  }
}

async function deleteMember(member: Player) {
  clearMessages()

  if (!window.confirm(`¿Eliminar a ${playerName(member)} del equipo?`)) return

  await $fetch(`/api/manager/team/members/${member.id}`, {
    method: 'DELETE'
  })
  await refresh()

  if (editingMemberId.value === member.id) {
    resetMemberForm()
  }

  showFeedback('Integrante eliminado.')
}
</script>

<template>
  <UContainer class="py-6 sm:py-8">
    <div
      v-if="team"
      class="grid gap-5"
    >
      <div class="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
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

          <h1 class="text-3xl font-bold tracking-normal text-highlighted sm:text-4xl">
            Administración de {{ team.name }}
          </h1>
          <p class="mt-2 max-w-2xl text-base text-muted">
            Actualiza los datos visibles del equipo y administra jugadores, manejadores y coaches.
          </p>
        </div>

        <div class="grid grid-cols-2 gap-2 rounded-lg border border-default bg-muted/30 p-2 text-center sm:grid-cols-3">
          <div class="rounded-md bg-default px-3 py-2">
            <p class="text-xl font-bold text-highlighted">
              {{ activePlayers.length }}
            </p>
            <p class="text-xs text-muted">
              Jugadores
            </p>
          </div>
          <div class="rounded-md bg-default px-3 py-2">
            <p class="text-xl font-bold text-highlighted">
              {{ staffMembers.length }}
            </p>
            <p class="text-xs text-muted">
              Staff
            </p>
          </div>
          <div class="col-span-2 rounded-md bg-default px-3 py-2 sm:col-auto">
            <p class="text-xl font-bold text-highlighted">
              {{ team.shortName ?? teamInitials(team) }}
            </p>
            <p class="text-xs text-muted">
              Siglas
            </p>
          </div>
        </div>
      </div>

      <UAlert
        v-if="feedback"
        color="success"
        variant="subtle"
        icon="i-lucide-check-circle-2"
        :description="feedback"
      />

      <UAlert
        v-if="errorMessage"
        color="error"
        variant="subtle"
        icon="i-lucide-circle-alert"
        :description="errorMessage"
      />

      <section class="rounded-lg border border-default bg-default p-4 shadow-sm sm:p-5">
        <div class="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div class="flex min-w-0 items-center gap-3">
            <span
              class="flex size-12 shrink-0 items-center justify-center rounded-full text-sm font-bold text-white"
              :style="{ backgroundColor: teamForm.primaryColor || '#047857' }"
            >
              {{ teamInitials(team) }}
            </span>
            <div class="min-w-0">
              <h2 class="text-xl font-bold text-highlighted">
                Datos del equipo
              </h2>
              <p class="truncate text-sm text-muted">
                Categoría y rama las define la liga.
              </p>
            </div>
          </div>

          <UButton
            icon="i-lucide-save"
            label="Guardar equipo"
            color="primary"
            :loading="isSavingTeam"
            @click="saveTeam"
          />
        </div>

        <div class="grid gap-3 md:grid-cols-2">
          <label class="grid gap-1.5 text-sm">
            <span class="font-medium text-highlighted">Nombre del equipo</span>
            <UInput
              v-model="teamForm.name"
              placeholder="Nombre"
            />
          </label>

          <label class="grid gap-1.5 text-sm">
            <span class="font-medium text-highlighted">Siglas</span>
            <UInput
              v-model="teamForm.shortName"
              placeholder="TR"
            />
          </label>

          <label class="grid gap-1.5 text-sm">
            <span class="font-medium text-highlighted">Manejador principal</span>
            <UInput
              v-model="teamForm.managerName"
              placeholder="Nombre del manejador"
            />
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
        </div>
      </section>

      <section class="grid gap-4 lg:grid-cols-[0.95fr_1.05fr]">
        <form
          class="rounded-lg border border-default bg-default p-4 shadow-sm sm:p-5"
          @submit.prevent="saveMember"
        >
          <div class="mb-4 flex items-center justify-between gap-3">
            <div>
              <h2 class="text-xl font-bold text-highlighted">
                {{ editingMember ? 'Editar integrante' : 'Nuevo integrante' }}
              </h2>
              <p class="text-sm text-muted">
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

          <div class="grid gap-3 sm:grid-cols-2">
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
                  {{ position }}
                </option>
              </select>
            </label>

            <label
              v-if="memberForm.memberRole === 'PLAYER'"
              class="grid gap-1.5 text-sm"
            >
              <span class="font-medium text-highlighted">Batea</span>
              <select
                v-model="memberForm.bats"
                class="h-10 w-full rounded-md border border-default bg-default px-3 text-sm text-highlighted outline-none focus:border-primary"
              >
                <option
                  v-for="option in handOptions"
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
              <span class="font-medium text-highlighted">Lanza</span>
              <select
                v-model="memberForm.throws"
                class="h-10 w-full rounded-md border border-default bg-default px-3 text-sm text-highlighted outline-none focus:border-primary"
              >
                <option
                  v-for="option in throwOptions"
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
            :label="editingMember ? 'Actualizar integrante' : 'Agregar integrante'"
            color="primary"
            class="mt-4"
            :disabled="!canSaveMember"
            :loading="isSavingMember"
            block
          />
        </form>

        <section class="rounded-lg border border-default bg-default p-4 shadow-sm sm:p-5">
          <div class="mb-4 flex items-center justify-between gap-3">
            <div>
              <h2 class="text-xl font-bold text-highlighted">
                Integrantes
              </h2>
              <p class="text-sm text-muted">
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

          <div class="grid gap-3">
            <article
              v-for="member in members"
              :key="member.id"
              class="rounded-lg border border-default p-3"
            >
              <div class="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div class="min-w-0">
                  <div class="mb-2 flex flex-wrap items-center gap-2">
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

                  <h3 class="truncate text-lg font-bold text-highlighted">
                    {{ playerName(member) }}
                  </h3>
                  <p class="text-sm text-muted">
                    <span v-if="member.memberRole === 'PLAYER'">
                      #{{ member.number ?? '-' }} • {{ member.position }} • Batea {{ handLabel(member.bats) }} • Lanza {{ handLabel(member.throws) }}
                    </span>
                    <span v-else>
                      Staff del equipo
                    </span>
                  </p>
                </div>

                <div class="flex shrink-0 gap-2">
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
  </UContainer>
</template>
