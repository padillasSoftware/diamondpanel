<script setup lang="ts">
const {
  applyPwaUpdate,
  dismissPwaUpdate,
  isPwaUpdateAvailable,
  isRefreshingForUpdate
} = usePwaInstall()
</script>

<template>
  <ClientOnly>
    <Transition
      enter-active-class="transition duration-200 ease-out"
      enter-from-class="translate-y-4 opacity-0"
      enter-to-class="translate-y-0 opacity-100"
      leave-active-class="transition duration-150 ease-in"
      leave-from-class="translate-y-0 opacity-100"
      leave-to-class="translate-y-4 opacity-0"
    >
      <div
        v-if="isPwaUpdateAvailable"
        class="fixed inset-x-3 bottom-[calc(1rem+env(safe-area-inset-bottom))] z-[10001] mx-auto max-w-md rounded-lg border border-default bg-default p-3 shadow-2xl"
        role="status"
        aria-live="polite"
      >
        <div class="flex gap-3">
          <span class="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary/15 text-primary">
            <UIcon
              name="i-lucide-refresh-cw"
              class="size-5"
            />
          </span>

          <div class="min-w-0 flex-1">
            <p class="font-semibold text-highlighted">
              Nueva version disponible
            </p>
            <p class="mt-0.5 text-sm text-muted">
              Actualiza para cargar los cambios mas recientes.
            </p>

            <div class="mt-3 flex flex-wrap justify-end gap-2">
              <UButton
                type="button"
                label="Luego"
                color="neutral"
                variant="ghost"
                size="sm"
                :disabled="isRefreshingForUpdate"
                @click="dismissPwaUpdate"
              />
              <UButton
                type="button"
                icon="i-lucide-rotate-cw"
                label="Actualizar"
                color="primary"
                size="sm"
                :loading="isRefreshingForUpdate"
                @click="applyPwaUpdate"
              />
            </div>
          </div>
        </div>
      </div>
    </Transition>
  </ClientOnly>
</template>
