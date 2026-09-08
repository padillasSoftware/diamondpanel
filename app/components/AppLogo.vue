<script setup lang="ts">
const { public: { leagueName } } = useRuntimeConfig()
</script>

<template>
  <div class="flex min-w-0 items-center gap-2 text-white sm:gap-3">
    <div class="flex size-9 shrink-0 items-center justify-center rounded-lg bg-white text-green-700 shadow-sm ring-1 ring-white/25">
      <UIcon
        name="i-lucide-diamond"
        class="size-5"
      />
    </div>

    <div class="min-w-0 leading-tight">
      <p class="truncate text-sm font-bold tracking-normal text-white">
        DiamondPanel
      </p>
      <p class="truncate text-xs text-emerald-100">
        {{ leagueName }}
      </p>
    </div>
  </div>
</template>
