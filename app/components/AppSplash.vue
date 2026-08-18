<script setup lang="ts">
defineProps<{
  visible: boolean
  leagueName: string
}>()
</script>

<template>
  <Transition name="app-splash">
    <div
      v-if="visible"
      class="app-splash"
      role="status"
      aria-live="polite"
    >
      <div class="app-splash__panel">
        <div class="app-splash__mark">
          <span class="app-splash__ring" />
          <UIcon
            name="i-lucide-diamond"
            class="app-splash__icon"
          />
        </div>

        <div class="app-splash__copy">
          <p class="app-splash__eyebrow">
            DiamondPanel
          </p>
          <h1 class="app-splash__title">
            {{ leagueName }}
          </h1>
          <p class="app-splash__text">
            Cargando liga
          </p>
        </div>

        <div
          class="app-splash__progress"
          aria-hidden="true"
        >
          <span />
        </div>
      </div>
    </div>
  </Transition>
</template>

<style scoped>
.app-splash {
  position: fixed;
  inset: 0;
  z-index: 10000;
  display: grid;
  place-items: center;
  padding: 1.5rem;
  background:
    linear-gradient(180deg, rgb(0 106 67 / 0.94), rgb(0 56 32 / 0.98)),
    #004a31;
  color: #fff;
}

.app-splash__panel {
  display: grid;
  justify-items: center;
  width: min(100%, 24rem);
  gap: 1.25rem;
  text-align: center;
}

.app-splash__mark {
  position: relative;
  display: grid;
  place-items: center;
  width: 5rem;
  height: 5rem;
}

.app-splash__ring {
  position: absolute;
  inset: 0;
  border: 3px solid rgb(255 255 255 / 0.22);
  border-top-color: #ff9800;
  border-radius: 999px;
  animation: app-splash-spin 900ms linear infinite;
}

.app-splash__icon {
  width: 2.25rem;
  height: 2.25rem;
  color: #fff;
}

.app-splash__copy {
  display: grid;
  gap: 0.35rem;
  min-width: 0;
}

.app-splash__eyebrow {
  margin: 0;
  color: rgb(255 255 255 / 0.72);
  font-size: 0.78rem;
  font-weight: 700;
  letter-spacing: 0;
  text-transform: uppercase;
}

.app-splash__title {
  margin: 0;
  max-width: 100%;
  overflow-wrap: anywhere;
  color: #fff;
  font-size: clamp(1.8rem, 5vw, 3rem);
  font-weight: 800;
  letter-spacing: 0;
  line-height: 1.05;
}

.app-splash__text {
  margin: 0;
  color: rgb(255 255 255 / 0.78);
  font-size: 0.95rem;
}

.app-splash__progress {
  width: min(15rem, 80vw);
  height: 0.35rem;
  overflow: hidden;
  border-radius: 999px;
  background: rgb(255 255 255 / 0.16);
}

.app-splash__progress span {
  display: block;
  width: 42%;
  height: 100%;
  border-radius: inherit;
  background: #ff9800;
  animation: app-splash-progress 1.15s ease-in-out infinite;
}

.app-splash-enter-active,
.app-splash-leave-active {
  transition:
    opacity 260ms ease,
    transform 260ms ease;
}

.app-splash-enter-from,
.app-splash-leave-to {
  opacity: 0;
}

.app-splash-enter-from .app-splash__panel,
.app-splash-leave-to .app-splash__panel {
  transform: translateY(0.5rem) scale(0.98);
}

@keyframes app-splash-spin {
  to {
    transform: rotate(360deg);
  }
}

@keyframes app-splash-progress {
  0% {
    transform: translateX(-120%);
  }

  50% {
    transform: translateX(70%);
  }

  100% {
    transform: translateX(260%);
  }
}

@media (prefers-reduced-motion: reduce) {
  .app-splash__ring,
  .app-splash__progress span {
    animation: none;
  }

  .app-splash-enter-active,
  .app-splash-leave-active {
    transition: opacity 120ms ease;
  }
}
</style>
