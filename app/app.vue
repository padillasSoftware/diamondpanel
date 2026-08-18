<script setup lang="ts">
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
const navigation = computed(() => [
  ...baseNavigation,
  ...(user.value?.managedTeamId
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
