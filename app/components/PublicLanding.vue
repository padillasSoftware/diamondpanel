<script setup lang="ts">
const { public: { leagueName } } = useRuntimeConfig()

const productHighlights = [
  {
    icon: 'i-lucide-calendar-days',
    title: 'Rol semanal sin enredos',
    text: 'Genera jornadas por categoría, rama y vueltas configuradas.'
  },
  {
    icon: 'i-lucide-clipboard-check',
    title: 'Resultados con historia',
    text: 'Marcadores, pitchers, bateadores destacados y lineups en un mismo flujo.'
  },
  {
    icon: 'i-lucide-shield-user',
    title: 'Manejadores con acceso propio',
    text: 'Cada equipo ve y edita lo que le corresponde, sin tocar la operación del admin.'
  },
  {
    icon: 'i-lucide-badge-check',
    title: 'Playoffs bajo control',
    text: 'Elegibilidad por lineups o cédula abierta, según la regla de la liga.'
  }
]

const liveCards = [
  { label: 'Rol #4', value: '12 juegos', icon: 'i-lucide-sparkles' },
  { label: 'Finales', value: '8 capturados', icon: 'i-lucide-table-2' },
  { label: 'Equipos', value: '32 activos', icon: 'i-lucide-users-round' }
]

const flowSteps = [
  'Configura equipos',
  'Genera rol',
  'Captura resultado',
  'Calcula posiciones',
  'Revisa playoffs'
]

const matrixTeams = ['Astros', 'Bravos', 'Suterm', 'Dspm', 'Swing']
const matrixCells = [
  ['self', 'win', 'scheduled', 'loss', 'pending'],
  ['loss', 'self', 'win', 'pending', 'scheduled'],
  ['pending', 'loss', 'self', 'win', 'win'],
  ['win', 'scheduled', 'loss', 'self', 'pending'],
  ['scheduled', 'pending', 'loss', 'win', 'self']
]

function matrixCellClass(state: string) {
  const classes: Record<string, string> = {
    self: 'bg-neutral-300 dark:bg-neutral-700',
    win: 'bg-lime-300 text-lime-950',
    loss: 'bg-red-300 text-red-950',
    scheduled: 'bg-cyan-200 text-cyan-950',
    pending: 'bg-white/85 text-neutral-700'
  }

  return classes[state] ?? classes.pending
}
</script>

<template>
  <main class="landing-shell min-h-screen bg-[#f6f8f4] text-[#14231b] dark:bg-[#061610] dark:text-white">
    <section class="landing-hero relative isolate min-h-[88svh] overflow-hidden">
      <img
        src="/images/landing-softball-dashboard.png"
        alt="Campo de softball de noche con tablero digital de gestión"
        class="absolute inset-0 -z-20 size-full object-cover"
      >
      <div class="absolute inset-0 -z-10 bg-[#04140f]/72" />
      <div class="absolute inset-y-0 left-0 -z-10 w-full bg-[linear-gradient(90deg,rgb(4_20_15/0.95),rgb(4_20_15/0.72),rgb(4_20_15/0.18))]" />

      <UContainer class="flex min-h-[88svh] flex-col py-5 sm:py-6">
        <header class="flex items-center justify-between gap-4">
          <NuxtLink
            to="/"
            class="flex items-center gap-3 text-white"
            :aria-label="leagueName"
          >
            <span class="flex size-10 items-center justify-center rounded-lg bg-white text-green-700 shadow-sm ring-1 ring-white/25">
              <UIcon
                name="i-lucide-diamond"
                class="size-5"
              />
            </span>
            <span class="leading-tight">
              <span class="block text-sm font-bold">DiamondPanel</span>
              <span class="block text-xs text-emerald-100">{{ leagueName }}</span>
            </span>
          </NuxtLink>

          <div class="flex items-center gap-2">
            <ColorModeButton tone="navbar" />
            <UButton
              to="/login"
              icon="i-lucide-log-in"
              label="Entrar"
              color="neutral"
              variant="solid"
              class="bg-white text-green-800 hover:bg-emerald-50"
            />
          </div>
        </header>

        <div class="grid flex-1 items-center gap-8 py-12 lg:grid-cols-[0.95fr_1.05fr]">
          <div class="max-w-2xl">
            <UBadge
              color="warning"
              variant="solid"
              icon="i-lucide-radio"
            >
              Operación viva de softball
            </UBadge>
            <h1 class="mt-5 text-5xl font-black leading-none tracking-normal text-white sm:text-6xl">
              DiamondPanel
            </h1>
            <p class="mt-5 max-w-xl text-lg leading-8 text-emerald-50">
              Una app privada para convertir el rol, los resultados, las posiciones y la comunicación con manejadores en una sola mesa de control.
            </p>

            <div class="mt-7 flex flex-col gap-3 sm:flex-row">
              <UButton
                to="/login"
                icon="i-lucide-shield-check"
                label="Iniciar sesión"
                color="primary"
                size="xl"
              />
              <UButton
                to="#modulos"
                icon="i-lucide-chevron-down"
                label="Ver lo que hace"
                color="neutral"
                variant="outline"
                size="xl"
                class="border-white/45 text-white hover:bg-white/10"
              />
            </div>
          </div>

          <div class="hidden min-w-0 lg:block">
            <div class="landing-control-panel ml-auto max-w-xl rounded-lg border border-white/20 bg-black/30 p-3 text-white shadow-2xl backdrop-blur-md">
              <div class="mb-3 grid grid-cols-3 gap-2">
                <div
                  v-for="card in liveCards"
                  :key="card.label"
                  class="rounded-md border border-white/15 bg-white/10 p-3"
                >
                  <div class="mb-2 flex items-center justify-between gap-2 text-emerald-100">
                    <span class="text-xs font-medium">{{ card.label }}</span>
                    <UIcon
                      :name="card.icon"
                      class="size-4"
                    />
                  </div>
                  <p class="text-lg font-black">
                    {{ card.value }}
                  </p>
                </div>
              </div>

              <div class="rounded-md border border-white/15 bg-white/10 p-3">
                <div class="mb-3 flex items-center justify-between gap-2">
                  <p class="text-sm font-bold">
                    Matriz de cruces
                  </p>
                  <span class="text-xs text-orange-200">Etapa regular</span>
                </div>
                <div class="grid grid-cols-[5rem_repeat(5,minmax(0,1fr))] gap-1 text-center text-xs">
                  <div />
                  <div
                    v-for="team in matrixTeams"
                    :key="team"
                    class="truncate rounded-sm bg-white/10 px-1 py-1 text-emerald-50"
                  >
                    {{ team.slice(0, 3) }}
                  </div>
                  <template
                    v-for="(row, rowIndex) in matrixCells"
                    :key="rowIndex"
                  >
                    <div class="truncate rounded-sm bg-white/10 px-2 py-2 text-left font-semibold">
                      {{ matrixTeams[rowIndex] }}
                    </div>
                    <div
                      v-for="(cell, cellIndex) in row"
                      :key="`${rowIndex}-${cellIndex}`"
                      :class="['h-8 rounded-sm px-1 py-2 font-bold', matrixCellClass(cell)]"
                    >
                      {{ cell === 'self' ? '' : cell === 'win' ? '7-4' : cell === 'loss' ? '3-8' : cell === 'scheduled' ? 'R' : '-' }}
                    </div>
                  </template>
                </div>
              </div>
            </div>
          </div>
        </div>
      </UContainer>
    </section>

    <section
      id="modulos"
      class="border-y border-green-900/10 bg-white py-10 dark:border-white/10 dark:bg-[#0b2119]"
    >
      <UContainer>
        <div class="grid gap-3 md:grid-cols-5">
          <div
            v-for="(step, index) in flowSteps"
            :key="step"
            class="rounded-lg border border-default bg-default p-4 shadow-sm"
          >
            <p class="text-sm font-black text-primary">
              {{ String(index + 1).padStart(2, '0') }}
            </p>
            <p class="mt-2 font-bold text-highlighted">
              {{ step }}
            </p>
          </div>
        </div>
      </UContainer>
    </section>

    <section class="py-12 sm:py-16">
      <UContainer>
        <div class="mb-8 max-w-2xl">
          <UBadge
            color="primary"
            variant="subtle"
            icon="i-lucide-layout-dashboard"
          >
            Del campo al panel
          </UBadge>
          <h2 class="mt-3 text-3xl font-black tracking-normal text-highlighted sm:text-4xl">
            Todo lo que se mueve en la liga, en una sola vista.
          </h2>
        </div>

        <div class="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <article
            v-for="item in productHighlights"
            :key="item.title"
            class="rounded-lg border border-default bg-default p-5 shadow-sm"
          >
            <div class="mb-4 flex size-10 items-center justify-center rounded-md bg-primary/10 text-primary">
              <UIcon
                :name="item.icon"
                class="size-5"
              />
            </div>
            <h3 class="text-lg font-bold text-highlighted">
              {{ item.title }}
            </h3>
            <p class="mt-2 text-sm leading-6 text-muted">
              {{ item.text }}
            </p>
          </article>
        </div>
      </UContainer>
    </section>

    <section class="bg-[#12251c] py-12 text-white sm:py-16">
      <UContainer>
        <div class="grid gap-8 lg:grid-cols-[0.75fr_1.25fr] lg:items-center">
          <div>
            <UBadge
              color="warning"
              variant="solid"
              icon="i-lucide-trophy"
            >
              Para admin y manejadores
            </UBadge>
            <h2 class="mt-3 text-3xl font-black tracking-normal sm:text-4xl">
              Menos llamadas, menos hojas sueltas, más juego.
            </h2>
            <p class="mt-4 text-base leading-7 text-emerald-50">
              El admin controla la operación completa; cada manejador entra a su equipo, captura integrantes y consulta solo lo que necesita.
            </p>
          </div>

          <div class="grid gap-3 sm:grid-cols-3">
            <div class="rounded-lg border border-white/15 bg-white/10 p-4">
              <UIcon
                name="i-lucide-user-cog"
                class="mb-3 size-6 text-orange-300"
              />
              <p class="font-bold">
                Accesos por rol
              </p>
              <p class="mt-2 text-sm text-emerald-100">
                Admin y manejador viven experiencias separadas.
              </p>
            </div>
            <div class="rounded-lg border border-white/15 bg-white/10 p-4">
              <UIcon
                name="i-lucide-list-plus"
                class="mb-3 size-6 text-lime-300"
              />
              <p class="font-bold">
                Captura rápida
              </p>
              <p class="mt-2 text-sm text-emerald-100">
                Resultado, pitchers, bateadores y lineups sin cambiar de sistema.
              </p>
            </div>
            <div class="rounded-lg border border-white/15 bg-white/10 p-4">
              <UIcon
                name="i-lucide-settings-2"
                class="mb-3 size-6 text-cyan-200"
              />
              <p class="font-bold">
                Reglas flexibles
              </p>
              <p class="mt-2 text-sm text-emerald-100">
                Vueltas por grupo y playoffs por juegos o cédula abierta.
              </p>
            </div>
          </div>
        </div>
      </UContainer>
    </section>

    <section class="bg-white py-10 dark:bg-[#071a14]">
      <UContainer>
        <div class="flex flex-col gap-4 rounded-lg border border-default bg-default p-5 shadow-sm sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p class="text-sm font-semibold text-primary">
              {{ leagueName }}
            </p>
            <h2 class="mt-1 text-2xl font-black tracking-normal text-highlighted">
              La liga lista para operar desde el primer pitch.
            </h2>
          </div>
          <UButton
            to="/login"
            icon="i-lucide-log-in"
            label="Entrar al panel"
            color="primary"
            size="lg"
          />
        </div>
      </UContainer>
    </section>
  </main>
</template>

<style scoped>
.landing-shell {
  overflow-x: hidden;
}

.landing-hero {
  background-color: #04140f;
}

.landing-control-panel {
  transform: perspective(1200px) rotateY(-7deg) rotateX(2deg);
  transform-origin: center;
}

@media (max-width: 1023px) {
  .landing-hero {
    min-height: 86svh;
  }
}
</style>
