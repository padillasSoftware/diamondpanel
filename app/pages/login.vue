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
const rememberMe = ref(false)
const isSubmitting = ref(false)
const isForgotPasswordOpen = ref(false)
const forgotEmail = ref('')
const forgotResetUrl = ref('')
const resetExpiresInMinutes = ref(30)
const isRequestingReset = ref(false)
const showSplash = useState('app:show-splash')
const toast = useToast()
const rememberedEmailKey = 'diamondpanel:remembered-email'

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

onMounted(() => {
  const savedEmail = localStorage.getItem(rememberedEmailKey)

  if (savedEmail && !email.value) {
    email.value = savedEmail
    rememberMe.value = true
  }
})

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
const forgotEmailError = computed(() => {
  if (!forgotEmail.value) return ''

  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(forgotEmail.value)
    ? ''
    : 'Ingresa un email válido.'
})
const canRequestReset = computed(() => Boolean(forgotEmail.value && !forgotEmailError.value))

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
      password: password.value,
      rememberMe: rememberMe.value
    })

    syncRememberedEmail()
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

function syncRememberedEmail() {
  if (!import.meta.client) return

  if (rememberMe.value) {
    localStorage.setItem(rememberedEmailKey, email.value.trim().toLowerCase())

    return
  }

  localStorage.removeItem(rememberedEmailKey)
}

function openForgotPassword() {
  forgotEmail.value = email.value
  forgotResetUrl.value = ''
  isForgotPasswordOpen.value = true
}

async function requestPasswordReset() {
  if (!canRequestReset.value) {
    toast.add({
      title: 'Revisa el correo',
      description: 'Necesitamos un correo válido para generar la recuperación.',
      color: 'error',
      icon: 'i-lucide-circle-alert'
    })

    return
  }

  isRequestingReset.value = true

  try {
    const response = await $fetch<{ resetUrl: string | null, expiresInMinutes: number, emailSent: boolean }>('/api/auth/forgot-password', {
      method: 'POST',
      body: { email: forgotEmail.value }
    })

    forgotResetUrl.value = response.resetUrl ?? ''
    resetExpiresInMinutes.value = response.expiresInMinutes
    toast.add({
      title: 'Solicitud generada',
      description: response.resetUrl
        ? 'Se generó el enlace temporal. También se intentó enviar por correo.'
        : 'Si el correo existe, enviaremos instrucciones para cambiar la contraseña.',
      color: 'success',
      icon: 'i-lucide-check-circle-2'
    })
  } catch {
    toast.add({
      title: 'No se pudo generar la recuperación',
      description: 'Revisa el correo e inténtalo de nuevo.',
      color: 'error',
      icon: 'i-lucide-circle-alert'
    })
  } finally {
    isRequestingReset.value = false
  }
}

async function copyResetUrl() {
  if (!forgotResetUrl.value || !import.meta.client) return

  await navigator.clipboard.writeText(forgotResetUrl.value)
  toast.add({
    title: 'Enlace copiado',
    color: 'success',
    icon: 'i-lucide-copy-check'
  })
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
      <div class="flex justify-end gap-2">
        <PwaInstallButton />
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

        <div class="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <label class="inline-flex items-center gap-2 text-sm text-muted">
            <input
              v-model="rememberMe"
              type="checkbox"
              class="size-4 rounded border border-default accent-primary"
            >
            <span>Recordarme</span>
          </label>

          <button
            type="button"
            class="w-fit text-left text-sm font-medium text-primary hover:underline"
            @click="openForgotPassword"
          >
            Olvidé mi contraseña
          </button>
        </div>

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

      <UModal
        v-model:open="isForgotPasswordOpen"
        title="Recuperar contraseña"
        description="Ingresa tu correo y te enviaremos un enlace temporal para cambiar la contraseña."
      >
        <template #body>
          <div class="grid gap-4">
            <label class="grid gap-1.5 text-sm">
              <span class="font-medium text-highlighted">Email</span>
              <UInput
                v-model="forgotEmail"
                type="email"
                autocomplete="email"
                placeholder="tu@correo.com"
                :color="forgotEmailError ? 'error' : 'neutral'"
              />
              <span
                v-if="forgotEmailError"
                class="text-xs font-medium text-error"
              >
                {{ forgotEmailError }}
              </span>
            </label>

            <div
              v-if="forgotResetUrl"
              class="grid gap-2 rounded-md border border-default bg-muted/30 p-3"
            >
              <p class="text-sm text-muted">
                Enlace válido por {{ resetExpiresInMinutes }} minutos.
              </p>
              <UInput
                :model-value="forgotResetUrl"
                readonly
              />
              <UButton
                type="button"
                icon="i-lucide-copy"
                label="Copiar enlace"
                color="neutral"
                variant="outline"
                @click="copyResetUrl"
              />
            </div>
          </div>
        </template>

        <template #footer="{ close }">
          <UButton
            label="Cancelar"
            color="neutral"
            variant="ghost"
            :disabled="isRequestingReset"
            @click="close"
          />
          <UButton
            label="Enviar enlace"
            icon="i-lucide-key-round"
            color="primary"
            :disabled="!canRequestReset"
            :loading="isRequestingReset"
            @click="requestPasswordReset"
          />
        </template>
      </UModal>
    </div>
  </UContainer>
</template>
