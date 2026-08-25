<script setup lang="ts">
definePageMeta({
  layout: 'auth'
})

useSeoMeta({
  title: 'Cambiar contraseña | DiamondPanel',
  description: 'Crea una nueva contraseña con tu enlace de recuperación.'
})

const route = useRoute()
const toast = useToast()
const token = computed(() => typeof route.query.token === 'string' ? route.query.token : '')
const newPassword = ref('')
const confirmPassword = ref('')
const isSubmitting = ref(false)

const passwordError = computed(() => {
  if (!newPassword.value) return ''

  return newPassword.value.length >= 8
    ? ''
    : 'La contraseña debe tener al menos 8 caracteres.'
})
const confirmPasswordError = computed(() => {
  if (!confirmPassword.value) return ''

  return newPassword.value === confirmPassword.value
    ? ''
    : 'Las contraseñas no coinciden.'
})
const canSubmit = computed(() => Boolean(
  token.value
  && newPassword.value
  && confirmPassword.value
  && !passwordError.value
  && !confirmPasswordError.value
))

async function resetPassword() {
  if (!canSubmit.value) {
    toast.add({
      title: 'Revisa la contraseña',
      description: 'Confirma que el enlace sea válido y que ambas contraseñas coincidan.',
      color: 'error',
      icon: 'i-lucide-circle-alert'
    })

    return
  }

  isSubmitting.value = true

  try {
    await $fetch('/api/auth/reset-password', {
      method: 'POST',
      body: {
        token: token.value,
        newPassword: newPassword.value
      }
    })
    toast.add({
      title: 'Contraseña actualizada',
      description: 'Ya puedes iniciar sesión con tu nueva contraseña.',
      color: 'success',
      icon: 'i-lucide-check-circle-2'
    })
    await navigateTo('/login')
  } catch {
    toast.add({
      title: 'No se pudo actualizar la contraseña',
      description: 'El enlace puede estar vencido o ya fue utilizado.',
      color: 'error',
      icon: 'i-lucide-circle-alert'
    })
  } finally {
    isSubmitting.value = false
  }
}
</script>

<template>
  <UContainer class="py-8 sm:py-12">
    <div class="mx-auto grid max-w-md gap-5">
      <div class="flex justify-end">
        <ColorModeButton />
      </div>

      <div>
        <UBadge
          color="primary"
          variant="subtle"
          icon="i-lucide-key-round"
        >
          Recuperación
        </UBadge>
        <h1 class="mt-3 text-3xl font-bold tracking-normal text-highlighted">
          Nueva contraseña
        </h1>
        <p class="mt-2 text-sm text-muted">
          Usa una contraseña de al menos 8 caracteres.
        </p>
      </div>

      <form
        class="grid gap-4 rounded-lg border border-default bg-default p-4 shadow-sm sm:p-5"
        @submit.prevent="resetPassword"
      >
        <div
          v-if="!token"
          class="rounded-md border border-error/30 bg-error/10 p-3 text-sm text-error"
        >
          El enlace de recuperación no es válido.
        </div>

        <label class="grid gap-1.5 text-sm">
          <span class="font-medium text-highlighted">Nueva contraseña</span>
          <UInput
            v-model="newPassword"
            type="password"
            autocomplete="new-password"
            placeholder="Nueva contraseña"
            :color="passwordError ? 'error' : 'neutral'"
            required
          />
          <span
            v-if="passwordError"
            class="text-xs font-medium text-error"
          >
            {{ passwordError }}
          </span>
        </label>

        <label class="grid gap-1.5 text-sm">
          <span class="font-medium text-highlighted">Confirmar contraseña</span>
          <UInput
            v-model="confirmPassword"
            type="password"
            autocomplete="new-password"
            placeholder="Confirma la contraseña"
            :color="confirmPasswordError ? 'error' : 'neutral'"
            required
          />
          <span
            v-if="confirmPasswordError"
            class="text-xs font-medium text-error"
          >
            {{ confirmPasswordError }}
          </span>
        </label>

        <UButton
          type="submit"
          icon="i-lucide-save"
          label="Guardar contraseña"
          color="primary"
          :disabled="!canSubmit"
          :loading="isSubmitting"
          block
        />
      </form>
    </div>
  </UContainer>
</template>
