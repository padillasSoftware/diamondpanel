<script setup lang="ts">
const route = useRoute()
const { isAdmin, isTeamManager } = useAuth()
const hasMobileBottomNav = computed(() =>
  isAdmin.value
  || (
    isTeamManager.value
    && !isAdmin.value
    && !route.path.startsWith('/admin')
  )
)
</script>

<template>
  <div class="flex min-h-screen flex-col">
    <AppNavbar />
    <UMain
      class="min-w-0 flex-1 overflow-x-hidden"
      :class="hasMobileBottomNav ? 'pb-24 lg:pb-0' : ''"
    >
      <slot />
    </UMain>
    <AppFooter />
  </div>
</template>
