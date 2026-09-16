<script setup lang="ts">
type PlayerPhotoModalPlayer = {
  firstName: string
  lastName: string
  photoUrl?: string | null
}

const open = defineModel<boolean>('open', { default: false })
const props = defineProps<{
  player: PlayerPhotoModalPlayer | null
}>()

const imageFailed = ref(false)
const fullName = computed(() => {
  if (!props.player) return 'Jugador'

  return `${props.player.firstName} ${props.player.lastName}`.trim() || 'Jugador'
})
const initials = computed(() => {
  if (!props.player) return 'DP'

  const first = props.player.firstName.trim().charAt(0)
  const last = props.player.lastName.trim().charAt(0)

  return `${first}${last}`.toUpperCase() || 'DP'
})
const photoUrl = computed(() => props.player?.photoUrl || null)
const showPhoto = computed(() => Boolean(photoUrl.value && !imageFailed.value))

watch(photoUrl, () => {
  imageFailed.value = false
})
</script>

<template>
  <UModal
    v-model:open="open"
    title="Foto del jugador"
    :description="fullName"
  >
    <template #body>
      <div class="grid gap-3">
        <div class="overflow-hidden rounded-lg border border-default bg-muted/30">
          <img
            v-if="showPhoto"
            :src="photoUrl ?? ''"
            :alt="`Foto de ${fullName}`"
            class="max-h-[70vh] w-full object-contain"
            @error="imageFailed = true"
          >
          <div
            v-else
            class="grid min-h-72 place-items-center gap-3 p-8 text-center"
          >
            <div class="grid size-32 place-items-center rounded-full border border-primary/40 bg-primary/10 text-4xl font-black text-primary">
              {{ initials }}
            </div>
            <p class="text-sm text-muted">
              {{ photoUrl ? 'No se pudo cargar la foto.' : 'Sin foto registrada.' }}
            </p>
          </div>
        </div>

        <p class="text-xs text-muted">
          Vista previa de la foto registrada para este jugador.
        </p>
      </div>
    </template>

    <template #footer="{ close }">
      <div class="grid w-full gap-2 sm:flex sm:items-center sm:justify-end">
        <UButton
          label="Cerrar"
          color="neutral"
          variant="ghost"
          @click="close"
        />
        <UButton
          v-if="photoUrl"
          :href="photoUrl"
          target="_blank"
          rel="noopener"
          label="Abrir"
          icon="i-lucide-external-link"
          color="neutral"
          variant="outline"
        />
      </div>
    </template>
  </UModal>
</template>
