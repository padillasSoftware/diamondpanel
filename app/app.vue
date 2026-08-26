<script setup lang="ts">
const router = useRouter()
const { initialized, fetchSession } = useAuth()
const { public: { leagueName } } = useRuntimeConfig()

if (!initialized.value) {
  await fetchSession().catch(() => null)
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
const showSplash = useState('app:show-splash', () => true)
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

function scheduleSplashDismissal() {
  if (splashTimer) clearTimeout(splashTimer)

  splashTimer = setTimeout(() => {
    showSplash.value = false
  }, 900)
}

watch(showSplash, (visible) => {
  if (visible) scheduleSplashDismissal()
})

onMounted(() => {
  scheduleSplashDismissal()

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
    <UToaster />

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

    <NuxtLayout>
      <NuxtPage />
    </NuxtLayout>
  </UApp>
</template>
