<script setup lang="ts">
defineOptions({
  inheritAttrs: false
})

type PlayerAvatarPlayer = {
  firstName: string
  lastName: string
  photoUrl?: string | null
}

const props = defineProps<{
  player: PlayerAvatarPlayer
  preview?: boolean
}>()
const emit = defineEmits<{
  preview: [player: PlayerAvatarPlayer]
}>()

const attrs = useAttrs()
const imageFailed = ref(false)
const showPhoto = computed(() => Boolean(props.player.photoUrl && !imageFailed.value))
const canPreview = computed(() => props.preview !== false)
const fullName = computed(() => `${props.player.firstName} ${props.player.lastName}`.trim())
const initials = computed(() => {
  const first = props.player.firstName.trim().charAt(0)
  const last = props.player.lastName.trim().charAt(0)

  return `${first}${last}`.toUpperCase() || 'DP'
})

watch(() => props.player.photoUrl, () => {
  imageFailed.value = false
})

function openPreview() {
  if (!canPreview.value) return

  emit('preview', props.player)
}
</script>

<template>
  <button
    v-if="canPreview"
    v-bind="attrs"
    type="button"
    :aria-label="`Ver foto de ${fullName}`"
    :title="`Ver foto de ${fullName}`"
    class="inline-flex shrink-0 cursor-pointer items-center justify-center overflow-hidden rounded-full border border-default bg-muted text-xs font-bold text-muted shadow-sm transition hover:scale-105 hover:border-primary focus:outline-none focus:ring-2 focus:ring-primary/50"
    @click.stop.prevent="openPreview"
  >
    <img
      v-if="showPhoto"
      :src="player.photoUrl ?? ''"
      :alt="`Foto de ${fullName}`"
      class="size-full object-cover"
      @error="imageFailed = true"
    >
    <span v-else>
      {{ initials }}
    </span>
  </button>

  <span
    v-else
    v-bind="attrs"
    class="inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full border border-default bg-muted text-xs font-bold text-muted shadow-sm"
  >
    <img
      v-if="showPhoto"
      :src="player.photoUrl ?? ''"
      :alt="`Foto de ${fullName}`"
      class="size-full object-cover"
      @error="imageFailed = true"
    >
    <span v-else>
      {{ initials }}
    </span>
  </span>
</template>
