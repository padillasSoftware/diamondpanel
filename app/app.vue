<script setup lang="ts">
import { branchLabel, categoryLabel } from '~/utils/league'
import type { AuthUser } from '~/composables/useAuth'

const baseNavigation = [
  { label: 'Inicio', to: '/', icon: 'i-lucide-house' },
  { label: 'Posiciones', to: '/posiciones', icon: 'i-lucide-trophy' },
  { label: 'Rol', to: '/rol', icon: 'i-lucide-calendar-days' },
  { label: 'Resultados', to: '/resultados', icon: 'i-lucide-table-2' },
  { label: 'Equipos', to: '/equipos', icon: 'i-lucide-users' }
]

const route = useRoute()
const router = useRouter()
const isActive = (to: string) => to === '/'
  ? route.path === '/'
  : route.path === to || route.path.startsWith(`${to}/`)

const { user, initialized, isAdmin, fetchSession, logout } = useAuth()
const { public: { leagueName } } = useRuntimeConfig()
const managedTeams = computed(() => user.value?.managedTeams ?? [])
const hasMultipleManagedTeams = computed(() => managedTeams.value.length > 1)
const isSwitchingTeam = ref(false)
const navigation = computed(() => [
  ...baseNavigation,
  ...(managedTeams.value.length
    ? [{ label: 'Mi equipo', to: '/mi-equipo', icon: 'i-lucide-clipboard-pen' }]
    : [])
])

if (!initialized.value) {
  await fetchSession().catch(() => null)
}

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

useHead({
  meta: [
    { name: 'viewport', content: 'width=device-width, initial-scale=1' }
  ],
  link: [
    { rel: 'icon', href: '/favicon.ico' }
  ],
  htmlAttrs: {
    lang: 'es'
  }
})

const title = `${leagueName} | DiamondPanel`
const description = `Panel privado para manejadores registrados de ${leagueName}.`
const showSplash = ref(true)
const isRouteLoading = ref(false)
let splashTimer: ReturnType<typeof setTimeout> | undefined
let routeStartTimer: ReturnType<typeof setTimeout> | undefined
let routeEndTimer: ReturnType<typeof setTimeout> | undefined
let removeRouteStart: (() => void) | undefined
let removeRouteEnd: (() => void) | undefined
let removeRouteError: (() => void) | undefined

function startRouteLoading() {
  if (routeEndTimer) clearTimeout(routeEndTimer)
  if (routeStartTimer) clearTimeout(routeStartTimer)

  routeStartTimer = setTimeout(() => {
    isRouteLoading.value = true
  }, 120)
}

function finishRouteLoading() {
  if (routeStartTimer) clearTimeout(routeStartTimer)
  if (routeEndTimer) clearTimeout(routeEndTimer)

  routeEndTimer = setTimeout(() => {
    isRouteLoading.value = false
  }, 220)
}

onMounted(() => {
  splashTimer = setTimeout(() => {
    showSplash.value = false
  }, 1500)

  removeRouteStart = router.beforeEach((to, from) => {
    if (to.fullPath !== from.fullPath) {
      startRouteLoading()
    }
  })
  removeRouteEnd = router.afterEach(() => {
    finishRouteLoading()
  })
  removeRouteError = router.onError(() => {
    isRouteLoading.value = false
  })
})

onBeforeUnmount(() => {
  if (splashTimer) clearTimeout(splashTimer)
  if (routeStartTimer) clearTimeout(routeStartTimer)
  if (routeEndTimer) clearTimeout(routeEndTimer)
  removeRouteStart?.()
  removeRouteEnd?.()
  removeRouteError?.()
})

useSeoMeta({
  title,
  description,
  ogTitle: title,
  ogDescription: description,
  twitterCard: 'summary_large_image'
})
</script>

<template>
  <UApp class="min-w-0 overflow-x-hidden">
    <NuxtLoadingIndicator
      color="#ff9800"
      :height="3"
      :throttle="100"
    />

    <AppSplash
      :visible="showSplash"
      :league-name="leagueName"
    />

    <ClientOnly>
      <AppRouteLoading :visible="isRouteLoading" />
    </ClientOnly>

    <UHeader
      v-if="user"
      :toggle="false"
      class="league-header max-w-full overflow-hidden"
    >
      <template #left>
        <NuxtLink
          to="/"
          :aria-label="`Ir al inicio de ${leagueName}`"
        >
          <AppLogo class="shrink-0" />
        </NuxtLink>
      </template>

      <template #right>
        <nav class="hidden items-center gap-1 lg:flex">
          <NuxtLink
            v-for="item in navigation"
            :key="item.to"
            :to="item.to"
            :class="['league-nav-link', { 'is-active': isActive(item.to) }]"
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

        <ColorModeButton tone="navbar" />

        <UButton
          v-if="isAdmin"
          to="/admin"
          icon="i-lucide-layout-dashboard"
          label="Admin"
          color="neutral"
          variant="ghost"
          size="sm"
          class="hidden rounded-full bg-white/95 text-green-700 ring-1 ring-white/30 hover:bg-white sm:inline-flex"
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
      v-if="user"
      class="league-mobile-nav max-w-full overflow-hidden lg:hidden"
    >
      <UContainer class="min-w-0 py-2">
        <label
          v-if="hasMultipleManagedTeams"
          class="mb-2 grid gap-1 rounded-lg border border-default bg-default p-2 text-sm"
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
            class="h-10 w-full rounded-md border border-default bg-default px-3 text-sm text-highlighted outline-none focus:border-primary"
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

        <nav class="flex max-w-full gap-1 overflow-x-auto pb-1 scrollbar-none [&::-webkit-scrollbar]:hidden">
          <NuxtLink
            v-for="item in navigation"
            :key="item.to"
            :to="item.to"
            :class="['league-nav-link league-nav-link--mobile shrink-0', { 'is-active': isActive(item.to) }]"
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

    <UMain class="min-w-0 overflow-x-hidden">
      <NuxtPage />
    </UMain>

    <USeparator icon="i-lucide-diamond" />

    <UFooter>
      <template #left>
        <p class="text-sm text-muted">
          DiamondPanel • © {{ new Date().getFullYear() }}
        </p>
      </template>

      <template #right>
        <p class="text-sm text-muted">
          {{ leagueName }}
        </p>
      </template>
    </UFooter>
  </UApp>
</template>
