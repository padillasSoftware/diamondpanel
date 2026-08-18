<script setup lang="ts">
useSeoMeta({
  title: 'Equipo requerido | DiamondPanel',
  description: 'Tu cuenta necesita estar ligada a un equipo registrado.'
})

const { user, logout } = useAuth()

const handleLogout = async () => {
  await logout()
  await navigateTo('/login')
}
</script>

<template>
  <UContainer class="py-8 sm:py-12">
    <div class="mx-auto max-w-lg rounded-lg border border-default bg-default p-5 shadow-sm">
      <UBadge
        color="warning"
        variant="subtle"
        icon="i-lucide-shield-alert"
      >
        Equipo requerido
      </UBadge>

      <h1 class="mt-4 text-3xl font-bold tracking-normal text-highlighted">
        Tu cuenta aún no tiene equipo asignado
      </h1>

      <p class="mt-3 text-sm text-muted">
        Para ver la liga, tu usuario debe estar registrado como manejador de uno o más equipos activos. Pide al administrador que ligue tu cuenta a tus equipos.
      </p>

      <div class="mt-5 rounded-md bg-muted/40 p-3 text-sm">
        <p class="font-semibold text-highlighted">
          {{ user?.name ?? 'Usuario' }}
        </p>
        <p class="text-muted">
          {{ user?.email }}
        </p>
      </div>

      <div class="mt-5 flex flex-wrap gap-2">
        <UButton
          icon="i-lucide-log-out"
          label="Cerrar sesión"
          color="neutral"
          variant="outline"
          @click="handleLogout"
        />
      </div>
    </div>
  </UContainer>
</template>
