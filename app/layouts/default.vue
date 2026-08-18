<template>
  <div class="flex min-h-screen flex-col">
    <AppNavbar />
    <UMain class="min-w-0 flex-1 overflow-x-hidden">
      <slot />
    </UMain>
    <AppFooter />
  </div>
</template>
