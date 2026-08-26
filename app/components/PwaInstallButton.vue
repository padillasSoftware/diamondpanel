<script setup lang="ts">
const props = withDefaults(defineProps<{
  compact?: boolean
  tone?: 'default' | 'navbar'
}>(), {
  compact: false,
  tone: 'default'
})

const { canInstall, installApp, isInstalling } = usePwaInstall()
const buttonColor = computed(() => props.tone === 'navbar' ? 'neutral' : 'primary')
const buttonVariant = computed(() => props.tone === 'navbar' ? 'ghost' : 'solid')
const buttonClasses = computed(() => props.tone === 'navbar'
  ? 'rounded-full text-white hover:bg-white/10 hover:text-white'
  : 'rounded-md')
</script>

<template>
  <ClientOnly>
    <UButton
      v-if="canInstall"
      type="button"
      icon="i-lucide-smartphone"
      :label="compact ? undefined : 'Instalar app'"
      aria-label="Instalar app"
      :color="buttonColor"
      :variant="buttonVariant"
      size="sm"
      :class="buttonClasses"
      :loading="isInstalling"
      @click="installApp"
    />
  </ClientOnly>
</template>
