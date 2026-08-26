<script setup lang="ts">
import { branchLabel, categoryLabel, type PlayoffEligibilityMode } from '~/utils/league'
import type { AuthUser } from '~/composables/useAuth'

type NavigationItem = {
  label: string
  to: string
  icon: string
  requiresEligibility?: boolean
}

type NavigationSeason = {
  playoffEligibilityMode?: PlayoffEligibilityMode
}

const baseNavigation: NavigationItem[] = [
  { label: 'Inicio', to: '/', icon: 'i-lucide-house' },
  { label: 'Posiciones', to: '/posiciones', icon: 'i-lucide-trophy' },
  { label: 'Rol', to: '/rol', icon: 'i-lucide-calendar-days' },
  { label: 'Resultados', to: '/resultados', icon: 'i-lucide-table-2' },
  { label: 'Elegibles', to: '/elegibles', icon: 'i-lucide-badge-check', requiresEligibility: true },
  { label: 'Equipos', to: '/equipos', icon: 'i-lucide-users' }
]

const adminNavigation: NavigationItem[] = [
  { label: 'Resumen', to: '/admin', icon: 'i-lucide-layout-dashboard' },
  { label: 'Equipos', to: '/admin/equipos', icon: 'i-lucide-shield-plus' },
  { label: 'Rol', to: '/admin/rol', icon: 'i-lucide-calendar-plus' },
  { label: 'Resultados', to: '/admin/resultados', icon: 'i-lucide-clipboard-check' },
  { label: 'Elegibles', to: '/admin/elegibles', icon: 'i-lucide-badge-check', requiresEligibility: true },
  { label: 'Posiciones', to: '/admin/posiciones', icon: 'i-lucide-trophy' },
  { label: 'Temporadas', to: '/admin/temporadas', icon: 'i-lucide-calendar-range' },
  { label: 'Ajustes', to: '/admin/configuracion', icon: 'i-lucide-settings' }
]

const route = useRoute()
const { user, isAdmin, logout } = useAuth()
const { public: { leagueName } } = useRuntimeConfig()
const { data: activeSeason } = await useFetch<NavigationSeason>('/api/seasons/active', {
  key: 'navbar-active-season',
  immediate: Boolean(user.value)
})
const managedTeams = computed(() => isAdmin.value ? [] : (user.value?.managedTeams ?? []))
const hasMultipleManagedTeams = computed(() => managedTeams.value.length > 1)
const isSwitchingTeam = ref(false)
const showEligibilityNavigation = computed(() => activeSeason.value?.playoffEligibilityMode !== 'OPEN_ROSTER')
const filterNavigation = (items: NavigationItem[]) =>
  items.filter(item => !item.requiresEligibility || showEligibilityNavigation.value)
const navigation = computed(() => [
  ...filterNavigation(baseNavigation),
  ...(managedTeams.value.length
    ? [{ label: 'Mi equipo', to: '/mi-equipo', icon: 'i-lucide-clipboard-pen' }]
    : [])
])

const isActive = (to: string) => to === '/'
  ? route.path === '/'
  : route.path === to || route.path.startsWith(`${to}/`)

const isAdminSection = computed(() => route.path === '/admin' || route.path.startsWith('/admin/'))
const visibleNavigation = computed(() =>
  isAdmin.value || isAdminSection.value ? filterNavigation(adminNavigation) : navigation.value
)

const isNavigationItemActive = (to: string) => to === '/admin'
  ? route.path === '/admin'
  : isActive(to)

const handleLogout = async () => {
  await logout()
  await navigateTo('/login')
}

const switchActiveTeam = async (teamId: string) => {
  if (!teamId || teamId === user.value?.activeTeamId) return

  isSwitchingTeam.value = true

  try {
    const session = await $fetch<{ user: AuthUser }>('/api/manager/active-team', {
      method: 'PATCH',
      body: { teamId }
    })

    user.value = session.user
    await refreshNuxtData()
  } finally {
    isSwitchingTeam.value = false
  }
}

const handleActiveTeamChange = (event: Event) => {
  const target = event.target

  if (!(target instanceof HTMLSelectElement)) return

  void switchActiveTeam(target.value)
}
</script>

<template>
  <template v-if="user">
    <UHeader
      :toggle="false"
      class="league-header max-w-full overflow-hidden"
    >
      <template #left>
        <NuxtLink
          to="/"
          class="block min-w-0 max-w-[min(54vw,15rem)] sm:max-w-none"
          :aria-label="`Ir al inicio de ${leagueName}`"
        >
          <AppLogo class="min-w-0" />
        </NuxtLink>
      </template>

      <template #right>
        <nav class="hidden items-center gap-1 lg:flex">
          <NuxtLink
            v-for="item in visibleNavigation"
            :key="item.to"
            :to="item.to"
            :class="['league-nav-link', { 'is-active': isNavigationItemActive(item.to) }]"
          >
            <UIcon
              :name="item.icon"
              class="size-4 shrink-0"
            />
            <span>{{ item.label }}</span>
          </NuxtLink>
        </nav>

        <label
          v-if="hasMultipleManagedTeams"
          class="hidden items-center gap-2 rounded-full bg-white/95 px-3 py-1.5 text-sm font-medium text-green-800 ring-1 ring-white/30 md:flex"
        >
          <UIcon
            name="i-lucide-shuffle"
            class="size-4 shrink-0"
          />
          <select
            :value="user.activeTeamId ?? ''"
            :disabled="isSwitchingTeam"
            class="max-w-44 bg-transparent text-sm font-semibold outline-none"
            aria-label="Equipo activo"
            @change="handleActiveTeamChange"
          >
            <option
              v-for="team in managedTeams"
              :key="team.id"
              :value="team.id"
            >
              {{ team.name }}
            </option>
          </select>
        </label>

        <PwaInstallButton
          tone="navbar"
          compact
        />

        <ColorModeButton tone="navbar" />

        <UButton
          to="/mi-perfil"
          icon="i-lucide-user-round"
          aria-label="Mi perfil"
          color="neutral"
          variant="ghost"
          size="sm"
          class="rounded-full text-white hover:bg-white/10 hover:text-white"
        />
        <UButton
          icon="i-lucide-log-out"
          aria-label="Cerrar sesión"
          color="neutral"
          variant="ghost"
          size="sm"
          class="rounded-full text-white hover:bg-white/10 hover:text-white"
          @click="handleLogout"
        />
      </template>
    </UHeader>

    <div
      v-if="visibleNavigation.length || hasMultipleManagedTeams"
      class="league-mobile-nav max-w-full overflow-hidden lg:hidden"
    >
      <UContainer class="min-w-0 max-w-full overflow-hidden py-2">
        <label
          v-if="hasMultipleManagedTeams"
          class="mb-2 grid min-w-0 gap-1 overflow-hidden rounded-lg border border-default bg-default p-2 text-sm"
        >
          <span class="flex items-center gap-2 font-medium text-highlighted">
            <UIcon
              name="i-lucide-shuffle"
              class="size-4"
            />
            Equipo activo
          </span>
          <select
            :value="user.activeTeamId ?? ''"
            :disabled="isSwitchingTeam"
            class="box-border h-10 min-w-0 max-w-full appearance-none truncate rounded-md border border-default bg-default px-3 pr-8 text-sm text-highlighted outline-none focus:border-primary"
            @change="handleActiveTeamChange"
          >
            <option
              v-for="team in managedTeams"
              :key="team.id"
              :value="team.id"
            >
              {{ team.name }} · {{ categoryLabel(team.category) }} · {{ branchLabel(team.branch) }}
            </option>
          </select>
        </label>

        <nav class="flex min-w-0 max-w-full gap-1 overflow-x-auto overscroll-x-contain pb-1 scrollbar-none [&::-webkit-scrollbar]:hidden">
          <NuxtLink
            v-for="item in visibleNavigation"
            :key="item.to"
            :to="item.to"
            :class="['league-nav-link league-nav-link--mobile shrink-0', { 'is-active': isNavigationItemActive(item.to) }]"
          >
            <UIcon
              :name="item.icon"
              class="size-4 shrink-0"
            />
            <span>{{ item.label }}</span>
          </NuxtLink>
        </nav>
      </UContainer>
    </div>
  </template>
</template>
