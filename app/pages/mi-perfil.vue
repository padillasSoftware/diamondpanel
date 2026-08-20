<script setup lang="ts">
useSeoMeta({
  title: 'Mi perfil | DiamondPanel',
  description: 'Actualiza tu contraseña de acceso a DiamondPanel.'
})

const { user, changePassword } = useAuth()
const toast = useToast()

const currentPassword = ref('')
const newPassword = ref('')
const confirmPassword = ref('')
const isSubmitting = ref(false)

const newPasswordError = computed(() => {
  if (!newPassword.value) return ''

  return newPassword.value.length >= 8
    ? ''
    : 'La nueva contraseña debe tener al menos 8 caracteres.'
})

const confirmPasswordError = computed(() => {
  if (!confirmPassword.value) return ''

  return confirmPassword.value === newPassword.value
    ? ''
    : 'Las contraseñas no coinciden.'
})

const canSubmit = computed(() => Boolean(
  currentPassword.value
  && newPassword.value
  && confirmPassword.value
  && !newPasswordError.value
  && !confirmPasswordError.value
))

async function handleSubmit() {
  if (!canSubmit.value) {
    toast.add({
      title: 'Revisa el formulario',
      description: 'Completa los tres campos y verifica que las contraseñas coincidan.',
      color: 'error',
      icon: 'i-lucide-circle-alert'
    })

    return
  }

  isSubmitting.value = true

  try {
    await changePassword({
      currentPassword: currentPassword.value,
      newPassword: newPassword.value
    })

    toast.add({
      title: 'Contraseña actualizada',
      color: 'success',
      icon: 'i-lucide-check-circle-2'
    })

    currentPassword.value = ''
    newPassword.value = ''
    confirmPassword.value = ''

    await navigateTo(user.value?.role === 'ADMIN' ? '/admin' : '/')
  } catch (error) {
    const statusMessage = typeof error === 'object' && error && 'data' in error
      ? String((error as { data?: { statusMessage?: unknown } }).data?.statusMessage ?? '')
      : ''

    toast.add({
      title: 'No se pudo actualizar la contraseña',
      description: statusMessage || 'Verifica tu contraseña actual e inténtalo de nuevo.',
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
      <div>
        <UBadge
          color="primary"
          variant="subtle"
          icon="i-lucide-user-round"
        >
          Mi perfil
        </UBadge>
        <h1 class="mt-3 text-3xl font-bold tracking-normal text-highlighted">
          {{ user?.name ?? user?.email }}
        </h1>
        <p class="mt-2 text-sm text-muted">
          Actualiza tu contraseña de acceso a DiamondPanel.
        </p>
      </div>

      <UAlert
        v-if="user?.mustChangePassword"
        color="warning"
        variant="subtle"
        icon="i-lucide-shield-alert"
        description="Se te asignó una contraseña temporal. Debes cambiarla antes de continuar."
      />

      <form
        class="grid gap-4 rounded-lg border border-default bg-default p-4 shadow-sm sm:p-5"
        @submit.prevent="handleSubmit"
      >
        <label class="grid gap-1.5 text-sm">
          <span class="font-medium text-highlighted">Contraseña actual</span>
          <UInput
            v-model="currentPassword"
            type="password"
            autocomplete="current-password"
            required
          />
        </label>

        <label class="grid gap-1.5 text-sm">
          <span class="font-medium text-highlighted">Nueva contraseña</span>
          <UInput
            v-model="newPassword"
            type="password"
            autocomplete="new-password"
            :color="newPasswordError ? 'error' : 'neutral'"
            required
          />
          <span
            v-if="newPasswordError"
            class="text-xs font-medium text-error"
          >
            {{ newPasswordError }}
          </span>
        </label>

        <label class="grid gap-1.5 text-sm">
          <span class="font-medium text-highlighted">Confirmar nueva contraseña</span>
          <UInput
            v-model="confirmPassword"
            type="password"
            autocomplete="new-password"
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
          label="Actualizar contraseña"
          color="primary"
          :disabled="!canSubmit"
          :loading="isSubmitting"
          block
        />
      </form>
    </div>
  </UContainer>
</template>
