<script setup lang="ts">
definePageMeta({
  layout: 'auth'
})

useSeoMeta({
  title: 'Login | DiamondPanel',
  description: 'Acceso de administradores y manejadores de DiamondPanel.'
})

const route = useRoute()
const { user, initialized, login, fetchSession } = useAuth()

const email = ref('')
const password = ref('')
const isSubmitting = ref(false)
const showSplash = useState('app:show-splash')
const toast = useToast()

if (!initialized.value) {
  await fetchSession().catch(() => null)
}

const redirectPath = computed(() => {
  const redirect = route.query.redirect

  return typeof redirect === 'string' && redirect.startsWith('/')
    ? redirect
    : '/admin'
})
const adminRedirectPath = computed(() => getAdminRedirectPath(redirectPath.value))

if (user.value) {
  await navigateTo(user.value.role === 'ADMIN' ? adminRedirectPath.value : '/')
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
  if (!canSubmit.value) {
    toast.add({
      title: 'Revisa tus datos',
      description: 'Revisa el email y la contraseña antes de continuar.',
      color: 'error',
      icon: 'i-lucide-circle-alert'
    })

    return
  }

  isSubmitting.value = true

  try {
    const loggedInUser = await login({
      email: email.value,
      password: password.value
    })

    showSplash.value = true
    await navigateTo(loggedInUser?.role === 'ADMIN' ? adminRedirectPath.value : '/')
  } catch {
    toast.add({
      title: 'No se pudo iniciar sesión',
      description: 'El correo o la contraseña no son correctos.',
      color: 'error',
      icon: 'i-lucide-circle-alert'
    })
  } finally {
    isSubmitting.value = false
  }
}

function getAdminRedirectPath(path: string) {
  if (path === '/mi-perfil') return path
  if (path === '/admin' || path.startsWith('/admin/')) return path
  if (path === '/posiciones') return '/admin/posiciones'
  if (path === '/rol') return '/admin/rol'
  if (path === '/resultados') return '/admin/resultados'
  if (path === '/equipos' || path.startsWith('/equipos/')) return '/admin/equipos'
  if (path === '/mi-equipo') return '/admin/equipos'

  return '/admin'
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
          Liga y manejadores
        </UBadge>
        <h1 class="mt-3 text-3xl font-bold tracking-normal text-highlighted">
          Acceso a DiamondPanel
        </h1>
        <p class="mt-2 text-sm text-muted">
          Ingresa con tu cuenta para entrar al panel de la liga.
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
            aria-label="Email"
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
            aria-label="Contraseña"
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
