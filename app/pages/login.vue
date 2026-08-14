<script setup lang="ts">
useSeoMeta({
  title: 'Login | DiamondPanel',
  description: 'Acceso administrativo de DiamondPanel.'
})

const route = useRoute()
const { user, initialized, login, fetchSession } = useAuth()

const email = ref('')
const password = ref('')
const isSubmitting = ref(false)
const errorMessage = ref('')

if (!initialized.value) {
  await fetchSession().catch(() => null)
}

const redirectPath = computed(() => {
  const redirect = route.query.redirect

  return typeof redirect === 'string' && redirect.startsWith('/')
    ? redirect
    : '/admin'
})

if (user.value) {
  await navigateTo(user.value.role === 'ADMIN' ? redirectPath.value : '/')
}

const emailError = computed(() => {
  if (!email.value) return ''

  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.value)
    ? ''
    : 'Ingresa un email válido.'
})

const passwordError = computed(() => {
  if (!password.value) return ''

  return password.value.length >= 8
    ? ''
    : 'La contraseña debe tener al menos 8 caracteres.'
})

const canSubmit = computed(() => Boolean(email.value && password.value && !emailError.value && !passwordError.value))

async function handleLogin() {
  errorMessage.value = ''

  if (!canSubmit.value) {
    errorMessage.value = 'Revisa el email y la contraseña antes de continuar.'

    return
  }

  isSubmitting.value = true

  try {
    const loggedInUser = await login({
      email: email.value,
      password: password.value
    })

    await navigateTo(loggedInUser?.role === 'ADMIN' ? redirectPath.value : '/')
  } catch {
    errorMessage.value = 'El correo o la contraseña no son correctos.'
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
          icon="i-lucide-shield-check"
        >
          Administrador
        </UBadge>
        <h1 class="mt-3 text-3xl font-bold tracking-normal text-highlighted">
          Acceso a DiamondPanel
        </h1>
        <p class="mt-2 text-sm text-muted">
          Ingresa con tu cuenta para administrar la liga.
        </p>
      </div>

      <form
        class="grid gap-4 rounded-lg border border-default bg-default p-4 shadow-sm sm:p-5"
        @submit.prevent="handleLogin"
      >
        <label class="grid gap-1.5 text-sm">
          <span class="font-medium text-highlighted">Email</span>
          <UInput
            v-model="email"
            type="email"
            autocomplete="email"
            placeholder="admin@diamondpanel.app"
            :color="emailError ? 'error' : 'neutral'"
            required
          />
          <span
            v-if="emailError"
            class="text-xs font-medium text-error"
          >
            {{ emailError }}
          </span>
        </label>

        <label class="grid gap-1.5 text-sm">
          <span class="font-medium text-highlighted">Contraseña</span>
          <UInput
            v-model="password"
            type="password"
            autocomplete="current-password"
            placeholder="Tu contraseña"
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

        <UAlert
          v-if="errorMessage"
          color="error"
          variant="subtle"
          icon="i-lucide-circle-alert"
          :description="errorMessage"
        />

        <UButton
          type="submit"
          icon="i-lucide-log-in"
          label="Entrar"
          color="primary"
          :disabled="!canSubmit"
          :loading="isSubmitting"
          block
        />
      </form>
    </div>
  </UContainer>
</template>
