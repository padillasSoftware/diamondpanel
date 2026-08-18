<script setup lang="ts">
defineProps<{
  visible: boolean
}>()
</script>

<template>
  <Transition name="route-loading">
    <div
      v-if="visible"
      class="route-loading"
      role="status"
      aria-live="polite"
    >
      <span
        class="route-loading__spinner"
        aria-hidden="true"
      />
      <span>Cargando</span>
    </div>
  </Transition>
</template>

<style scoped>
.route-loading {
  position: fixed;
  top: max(0.75rem, env(safe-area-inset-top));
  right: 0.75rem;
  z-index: 9999;
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  min-height: 2.5rem;
  padding: 0.5rem 0.8rem;
  border: 1px solid rgb(255 255 255 / 0.2);
  border-radius: 999px;
  background: rgb(0 74 49 / 0.94);
  color: #fff;
  box-shadow: 0 12px 28px rgb(0 32 18 / 0.26);
  font-size: 0.8125rem;
  font-weight: 700;
  backdrop-filter: blur(12px);
}

.route-loading__spinner {
  width: 0.9rem;
  height: 0.9rem;
  border: 2px solid rgb(255 255 255 / 0.28);
  border-top-color: #ff9800;
  border-radius: 999px;
  animation: route-loading-spin 700ms linear infinite;
}

.route-loading-enter-active,
.route-loading-leave-active {
  transition:
    opacity 180ms ease,
    transform 180ms ease;
}

.route-loading-enter-from,
.route-loading-leave-to {
  opacity: 0;
  transform: translateY(-0.35rem);
}

@keyframes route-loading-spin {
  to {
    transform: rotate(360deg);
  }
}

@media (prefers-reduced-motion: reduce) {
  .route-loading__spinner {
    animation: none;
  }
}
</style>
