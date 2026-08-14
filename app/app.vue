<script setup lang="ts">
const navigation = [
  { label: 'Inicio', to: '/', icon: 'i-lucide-house' },
  { label: 'Posiciones', to: '/posiciones', icon: 'i-lucide-trophy' },
  { label: 'Rol', to: '/rol', icon: 'i-lucide-calendar-days' },
  { label: 'Resultados', to: '/resultados', icon: 'i-lucide-table-2' },
  { label: 'Equipos', to: '/equipos', icon: 'i-lucide-users' }
]

const route = useRoute()
const isActive = (to: string) => to === '/'
  ? route.path === '/'
  : route.path === to || route.path.startsWith(`${to}/`)

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

const title = 'DiamondPanel'
const description = 'Panel público para consultar posiciones, rol de juegos, resultados y equipos de una liga de softball.'

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
    <UHeader
      :toggle="false"
      class="league-header max-w-full overflow-hidden"
    >
      <template #left>
        <NuxtLink
          to="/"
          aria-label="Ir al inicio de DiamondPanel"
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

        <ColorModeButton />

        <UButton
          icon="i-lucide-user-round"
          aria-label="Login"
          color="neutral"
          variant="ghost"
          size="sm"
          disabled
          class="rounded-full bg-white/95 text-[#005f3d] ring-1 ring-white/30 hover:bg-white disabled:opacity-90"
        />
      </template>
    </UHeader>

    <div class="league-mobile-nav max-w-full overflow-hidden lg:hidden">
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
          Softball league control
        </p>
      </template>
    </UFooter>
  </UApp>
</template>
