<script setup lang="ts">
const props = withDefaults(defineProps<{
  compact?: boolean
  tone?: 'default' | 'navbar'
}>(), {
  compact: false,
  tone: 'default'
})

const { canInstall, canShowManualInstallHelp, installApp, isInstalling, isIos } = usePwaInstall()
const isHelpOpen = ref(false)
const buttonColor = computed(() => props.tone === 'navbar' ? 'neutral' : 'primary')
const buttonVariant = computed(() => props.tone === 'navbar' ? 'ghost' : 'solid')
const buttonClasses = computed(() => props.tone === 'navbar'
  ? 'rounded-full text-white hover:bg-white/10 hover:text-white'
  : 'rounded-md')
const shouldRender = computed(() => canInstall.value || canShowManualInstallHelp.value)
const buttonLabel = computed(() => props.compact ? undefined : 'Instalar app')

async function handleInstallClick() {
  if (canInstall.value) {
    await installApp()

    return
  }

  isHelpOpen.value = true
}
</script>

<template>
  <ClientOnly>
    <UButton
      v-if="shouldRender"
      type="button"
      icon="i-lucide-smartphone"
      :label="buttonLabel"
      aria-label="Instalar app"
      :color="buttonColor"
      :variant="buttonVariant"
      size="sm"
      :class="buttonClasses"
      :loading="isInstalling"
      @click="handleInstallClick"
    />

    <UModal
      v-model:open="isHelpOpen"
      title="Agregar a pantalla de inicio"
      description="En iPhone y iPad se instala desde el menu de compartir de Safari."
    >
      <template #body>
        <div class="grid gap-3 text-sm text-muted">
          <p v-if="isIos">
            Abre DiamondPanel en Safari y sigue estos pasos:
          </p>
          <ol class="grid list-decimal gap-2 pl-5">
            <li>Toca el boton de compartir.</li>
            <li>Elige "Agregar a pantalla de inicio".</li>
            <li>Activa "Abrir como app web" si aparece la opcion.</li>
            <li>Toca "Agregar".</li>
          </ol>
        </div>
      </template>
    </UModal>
  </ClientOnly>
</template>
