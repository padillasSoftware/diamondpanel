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
  <main class="landing-shell min-h-screen bg-[#effbfb] text-[#071e22] dark:bg-[#025a60] dark:text-white">
    <section class="landing-hero relative isolate overflow-hidden">
      <img
        src="/images/landing-softball-dashboard.png"
        alt="Campo de softball de noche con tablero digital de gestión"
        class="landing-hero-image absolute inset-0 -z-20 size-full object-cover"
      >
      <div class="absolute inset-0 -z-10 bg-[#01282c]/72" />
      <div class="absolute inset-y-0 left-0 -z-10 w-full bg-[linear-gradient(90deg,rgb(1_40_44/0.96),rgb(2_90_96/0.72),rgb(2_90_96/0.16))]" />

      <UContainer class="flex min-h-[84svh] flex-col px-4 py-4 sm:min-h-[88svh] sm:py-6">
        <header class="flex min-w-0 items-center justify-between gap-3">
          <NuxtLink
            to="/"
            class="flex min-w-0 items-center gap-3 text-white"
            :aria-label="leagueName"
          >
            <span class="flex size-9 shrink-0 items-center justify-center rounded-lg bg-white text-[#025a60] shadow-sm ring-1 ring-white/25 sm:size-10">
              <UIcon
                name="i-lucide-diamond"
                class="size-5"
              />
            </span>
            <span class="min-w-0 leading-tight">
              <span class="block text-sm font-bold">DiamondPanel</span>
              <span class="block text-xs text-cyan-100">{{ leagueName }}</span>
            </span>
          </NuxtLink>

          <div class="flex shrink-0 items-center gap-1.5 sm:gap-2">
            <PwaInstallButton
              tone="navbar"
              compact
            />
            <ColorModeButton tone="navbar" />
            <UButton
              to="/login"
              icon="i-lucide-log-in"
              label="Entrar"
              color="neutral"
              variant="solid"
              class="bg-white px-2.5 text-[#025a60] hover:bg-[#effbfb] sm:px-4"
            />
          </div>
        </header>

        <div class="grid flex-1 items-center gap-6 py-8 sm:py-12 lg:grid-cols-[0.95fr_1.05fr]">
          <div class="max-w-2xl">
            <UBadge
              color="warning"
              variant="solid"
              icon="i-lucide-radio"
            >
              Operación viva de softball
            </UBadge>
            <h1 class="mt-4 text-4xl font-black leading-none tracking-normal text-white sm:mt-5 sm:text-6xl">
              DiamondPanel
            </h1>
            <p class="mt-4 max-w-xl text-base leading-7 text-cyan-50 sm:mt-5 sm:text-lg sm:leading-8">
              Una app privada para convertir el rol, los resultados, las posiciones y la comunicación con manejadores en una sola mesa de control.
            </p>

            <div class="mt-6 flex flex-col gap-3 sm:mt-7 sm:flex-row">
              <UButton
                to="/login"
                icon="i-lucide-shield-check"
                label="Iniciar sesión"
                color="primary"
                size="xl"
                class="justify-center sm:justify-start"
              />
              <div class="[&>button]:w-full sm:[&>button]:w-auto">
                <PwaInstallButton />
              </div>
              <UButton
                to="#modulos"
                icon="i-lucide-chevron-down"
                label="Ver lo que hace"
                color="neutral"
                variant="outline"
                size="xl"
                class="justify-center border-white/45 text-white hover:bg-white/10 sm:justify-start"
              />
            </div>

            <div class="mt-6 grid gap-2 rounded-lg border border-white/15 bg-black/25 p-3 text-white shadow-xl backdrop-blur-sm lg:hidden">
              <div class="grid grid-cols-3 gap-2">
                <div
                  v-for="card in liveCards"
                  :key="card.label"
                  class="min-w-0 rounded-md border border-white/10 bg-white/10 p-2"
                >
                  <div class="mb-1 flex items-center justify-between gap-1 text-cyan-100">
                    <span class="truncate text-[11px] font-medium">{{ card.label }}</span>
                    <UIcon
                      :name="card.icon"
                      class="size-3.5 shrink-0"
                    />
                  </div>
                  <p class="truncate text-sm font-black">
                    {{ card.value }}
                  </p>
                </div>
              </div>

              <div class="rounded-md border border-white/10 bg-white/10 p-2">
                <div class="mb-2 flex items-center justify-between gap-2">
                  <p class="text-xs font-bold">
                    Vista rápida
                  </p>
                  <span class="text-[11px] text-orange-200">Liga activa</span>
                </div>
                <div class="grid grid-cols-[1fr_auto_1fr] items-center gap-2">
                  <div class="rounded-md bg-white/10 p-2 text-center">
                    <p class="truncate text-xs text-cyan-100">
                      Local
                    </p>
                    <p class="text-xl font-black">
                      7
                    </p>
                  </div>
                  <span class="rounded-md bg-orange-400 px-2 py-1 text-sm font-black text-orange-950">VS</span>
                  <div class="rounded-md bg-white/10 p-2 text-center">
                    <p class="truncate text-xs text-cyan-100">
                      Visitante
                    </p>
                    <p class="text-xl font-black">
                      4
                    </p>
                  </div>
                </div>
              </div>
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
                  <div class="mb-2 flex items-center justify-between gap-2 text-cyan-100">
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
                    class="truncate rounded-sm bg-white/10 px-1 py-1 text-cyan-50"
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
      class="border-y border-[#025a60]/10 bg-white py-10 dark:border-white/10 dark:bg-[#01343a]"
    >
      <UContainer>
        <div class="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-5">
          <div
            v-for="(step, index) in flowSteps"
            :key="step"
            class="rounded-lg border border-default bg-default p-3 shadow-sm sm:p-4"
          >
            <p class="text-sm font-black text-primary">
              {{ String(index + 1).padStart(2, '0') }}
            </p>
            <p class="mt-2 text-sm font-bold text-highlighted sm:text-base">
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

    <section class="bg-[#02464c] py-12 text-white sm:py-16">
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
            <p class="mt-4 text-base leading-7 text-cyan-50">
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
              <p class="mt-2 text-sm text-cyan-100">
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
              <p class="mt-2 text-sm text-cyan-100">
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
              <p class="mt-2 text-sm text-cyan-100">
                Vueltas por grupo y playoffs por juegos o cédula abierta.
              </p>
            </div>
          </div>
        </div>
      </UContainer>
    </section>

    <section class="bg-[#f7fdfd] py-10 dark:bg-[#021d20]">
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
  background-color: #01282c;
}

.landing-hero-image {
  object-position: 62% center;
}

.landing-control-panel {
  transform: perspective(1200px) rotateY(-7deg) rotateX(2deg);
  transform-origin: center;
}

@media (max-width: 1023px) {
  .landing-hero-image {
    object-position: 68% center;
    opacity: 0.92;
  }
}

@media (max-width: 430px) {
  .landing-hero-image {
    object-position: 72% center;
  }
}
</style>
