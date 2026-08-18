<script setup lang="ts">
const { user } = useAuth()
const { public: { leagueName } } = useRuntimeConfig()
</script>

<template>
  <template v-if="user">
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
  </template>
</template>
