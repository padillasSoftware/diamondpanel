<script setup lang="ts">
import { teamInitials } from '~/utils/league'

type TeamAvatarTeam = {
  name: string
  shortName?: string | null
  logoUrl?: string | null
  primaryColor?: string | null
}

const props = defineProps<{
  team: TeamAvatarTeam
}>()

const imageFailed = ref(false)
const showLogo = computed(() => Boolean(props.team.logoUrl && !imageFailed.value))

watch(() => props.team.logoUrl, () => {
  imageFailed.value = false
})
</script>

<template>
  <span
    class="inline-flex shrink-0 items-center justify-center overflow-hidden"
    :class="showLogo ? 'bg-transparent' : 'rounded-full text-white shadow-sm'"
    :style="showLogo ? undefined : { backgroundColor: team.primaryColor ?? '#025a60' }"
  >
    <img
      v-if="showLogo"
      :src="team.logoUrl ?? ''"
      :alt="`Logo de ${team.name}`"
      class="size-full object-contain"
      @error="imageFailed = true"
    >
    <span v-else>
      {{ teamInitials(team) }}
    </span>
  </span>
</template>
