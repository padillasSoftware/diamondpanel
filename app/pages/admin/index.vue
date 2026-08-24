<script setup lang="ts">
definePageMeta({
  middleware: 'admin'
})

useSeoMeta({
  title: 'Admin | DiamondPanel',
  description: 'Panel administrativo de DiamondPanel.'
})

type AdminSummary = {
  user: {
    id: string
    email: string
    name: string | null
    role: 'ADMIN' | 'USER'
    managedTeamId: string | null
    managedTeam: {
      id: string
      name: string
      slug: string
      category: string
      branch: string
    } | null
    managedTeams: {
      id: string
      name: string
      slug: string
      category: string
      branch: string
    }[]
    activeTeamId: string | null
  }
  activeSeason: {
    id: string
    name: string
    year: number
    playoffEligibilityMode: 'LINEUP_GAMES' | 'OPEN_ROSTER'
    playoffMinimumLineupGames: number
  } | null
  metrics: {
    activeTeams: number
    activePlayers: number
    scheduledGames: number
    finalGames: number
    fields: number
  }
}

const { data: summary } = await useFetch<AdminSummary>('/api/admin/summary')

const metricCards = computed(() => [
  {
    label: 'Equipos activos',
    value: summary.value?.metrics.activeTeams ?? 0,
    icon: 'i-lucide-users'
  },
  {
    label: 'Jugadores activos',
    value: summary.value?.metrics.activePlayers ?? 0,
    icon: 'i-lucide-user-round'
  },
  {
    label: 'Partidos en rol',
    value: summary.value?.metrics.scheduledGames ?? 0,
    icon: 'i-lucide-calendar-days'
  },
  {
    label: 'Resultados',
    value: summary.value?.metrics.finalGames ?? 0,
    icon: 'i-lucide-table-2'
  }
])

const adminModules = computed(() => [
  {
    title: 'Equipos',
    description: 'Crear clubes, asignar categoría, rama, colores y manager.',
    icon: 'i-lucide-shield-plus',
    to: '/admin/equipos',
    status: 'Disponible'
  },
  {
    title: 'Rol de juegos',
    description: 'Programar partidos por semana y generar el rol automático.',
    icon: 'i-lucide-calendar-plus',
    to: '/admin/rol',
    status: 'Disponible'
  },
  {
    title: 'Resultados',
    description: 'Capturar marcadores, pitchers y bateadores destacados.',
    icon: 'i-lucide-clipboard-check',
    to: '/admin/resultados',
    status: 'Disponible'
  },
  ...(summary.value?.activeSeason?.playoffEligibilityMode === 'OPEN_ROSTER'
    ? []
    : [{
        title: 'Elegibles',
        description: `Revisar jugadores con ${summary.value?.activeSeason?.playoffMinimumLineupGames ?? 5} juegos de lineup para playoffs.`,
        icon: 'i-lucide-badge-check',
        to: '/admin/elegibles',
        status: 'Disponible'
      }]),
  {
    title: 'Posiciones',
    description: 'Consultar standings por categoría y rama.',
    icon: 'i-lucide-trophy',
    to: '/admin/posiciones',
    status: 'Disponible'
  },
  {
    title: 'Temporadas',
    description: 'Crear temporadas, activar la vigente y archivar anteriores.',
    icon: 'i-lucide-calendar-range',
    to: '/admin/temporadas',
    status: 'Disponible'
  },
  {
    title: 'Configuración',
    description: 'Ajustar vueltas, elegibilidad y reglas de playoffs.',
    icon: 'i-lucide-settings',
    to: '/admin/configuracion',
    status: 'Disponible'
  }
])
</script>

<template>
  <UContainer class="py-6 sm:py-8">
    <div class="mb-6 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
      <div>
        <UBadge
          color="primary"
          variant="subtle"
          icon="i-lucide-layout-dashboard"
        >
          Panel administrativo
        </UBadge>
        <h1 class="mt-3 text-3xl font-bold tracking-normal text-highlighted sm:text-4xl">
          Operación de la liga
        </h1>
        <p class="mt-2 max-w-2xl text-base text-muted">
          {{ summary?.activeSeason ? `${summary.activeSeason.name} ${summary.activeSeason.year}` : 'Temporada por configurar' }}
        </p>
      </div>

      <div class="rounded-lg border border-default bg-default p-3 shadow-sm">
        <p class="text-sm font-semibold text-highlighted">
          {{ summary?.user.name ?? 'Administrador' }}
        </p>
        <p class="text-xs text-muted">
          {{ summary?.user.email }}
        </p>
      </div>
    </div>

    <div class="mb-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      <div
        v-for="metric in metricCards"
        :key="metric.label"
        class="rounded-lg border border-default bg-default p-4 shadow-sm"
      >
        <div class="mb-3 flex items-center justify-between gap-3">
          <p class="text-sm font-medium text-muted">
            {{ metric.label }}
          </p>
          <UIcon
            :name="metric.icon"
            class="size-5 text-primary"
          />
        </div>
        <p class="text-3xl font-bold text-highlighted">
          {{ metric.value }}
        </p>
      </div>
    </div>

    <section class="rounded-lg border border-default bg-default p-4 shadow-sm sm:p-5">
      <div class="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 class="text-xl font-bold text-highlighted">
            Módulos administrativos
          </h2>
          <p class="text-sm text-muted">
            Accesos principales para operar la temporada.
          </p>
        </div>
      </div>

      <div class="grid gap-3 md:grid-cols-2">
        <NuxtLink
          v-for="adminModule in adminModules"
          :key="adminModule.title"
          :to="adminModule.to"
          class="rounded-lg border border-default p-4 transition-colors hover:border-primary hover:bg-primary/5"
        >
          <div class="mb-3 flex items-start justify-between gap-3">
            <div class="flex items-center gap-3">
              <span class="flex size-10 items-center justify-center rounded-md bg-primary/10 text-primary">
                <UIcon
                  :name="adminModule.icon"
                  class="size-5"
                />
              </span>
              <div>
                <h3 class="font-semibold text-highlighted">
                  {{ adminModule.title }}
                </h3>
                <p class="text-sm text-muted">
                  {{ adminModule.description }}
                </p>
              </div>
            </div>
            <UBadge
              :color="adminModule.status === 'Disponible' ? 'success' : 'neutral'"
              variant="outline"
            >
              {{ adminModule.status }}
            </UBadge>
          </div>
        </NuxtLink>
      </div>
    </section>
  </UContainer>
</template>
