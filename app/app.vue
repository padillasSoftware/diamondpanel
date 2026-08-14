<script setup lang="ts">
const navigation = [
  { label: 'Inicio', to: '/', icon: 'i-lucide-house' },
  { label: 'Posiciones', to: '/posiciones', icon: 'i-lucide-trophy' },
  { label: 'Rol', to: '/rol', icon: 'i-lucide-calendar-days' },
  { label: 'Resultados', to: '/resultados', icon: 'i-lucide-table-2' },
  { label: 'Equipos', to: '/equipos', icon: 'i-lucide-users' }
]

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
  <UApp>
    <UHeader class="border-b border-default bg-default/95 backdrop-blur">
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
          <UButton
            v-for="item in navigation"
            :key="item.to"
            :to="item.to"
            :icon="item.icon"
            :label="item.label"
            color="neutral"
            variant="ghost"
            size="sm"
          />
        </nav>

        <UColorModeButton />

        <UButton
          icon="i-lucide-log-in"
          label="Login"
          color="primary"
          variant="subtle"
          size="sm"
          disabled
          class="hidden sm:inline-flex"
        />
      </template>
    </UHeader>

    <div class="border-b border-default bg-default lg:hidden">
      <UContainer class="py-2">
        <nav class="flex gap-1 overflow-x-auto">
          <UButton
            v-for="item in navigation"
            :key="item.to"
            :to="item.to"
            :icon="item.icon"
            :label="item.label"
            color="neutral"
            variant="ghost"
            size="sm"
            class="shrink-0"
          />
        </nav>
      </UContainer>
    </div>

    <UMain>
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
