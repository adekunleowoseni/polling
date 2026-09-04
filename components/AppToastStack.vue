<script setup lang="ts">
const { toasts, dismiss } = useToast();

function tone(kind: string) {
  if (kind === "success") {
    return {
      bar: "bg-action-green",
      wrap: "border-action-green/30 bg-surface-container-lowest text-deep-navy dark:text-pure-white",
      icon: "check_circle",
      iconClass: "text-action-green",
    };
  }
  if (kind === "error") {
    return {
      bar: "bg-error",
      wrap: "border-error/30 bg-surface-container-lowest text-deep-navy dark:text-pure-white",
      icon: "error",
      iconClass: "text-error",
    };
  }
  return {
    bar: "bg-deep-navy",
    wrap: "border-outline-variant/40 bg-surface-container-lowest text-deep-navy dark:text-pure-white",
    icon: "info",
    iconClass: "text-outline",
  };
}
</script>

<template>
  <Teleport to="body">
    <div
      class="pointer-events-none fixed inset-x-0 top-0 z-[100] flex flex-col items-end gap-2 p-4 sm:p-6"
      aria-live="polite"
      aria-relevant="additions"
    >
      <TransitionGroup
        enter-active-class="transition duration-300 ease-out"
        enter-from-class="translate-y-[-8px] opacity-0"
        enter-to-class="translate-y-0 opacity-100"
        leave-active-class="transition duration-200 ease-in"
        leave-from-class="translate-y-0 opacity-100"
        leave-to-class="translate-y-[-6px] opacity-0"
        move-class="transition duration-200"
        tag="div"
        class="flex w-full max-w-md flex-col items-stretch gap-2 sm:ml-auto"
      >
        <div
          v-for="toast in toasts"
          :key="toast.id"
          class="pointer-events-auto overflow-hidden rounded-xl border shadow-lg backdrop-blur-md"
          :class="tone(toast.kind).wrap"
          role="status"
        >
          <div class="flex items-start gap-3 px-4 py-3">
            <span class="material-symbols-outlined mt-0.5 shrink-0 text-[20px]" :class="tone(toast.kind).iconClass">
              {{ tone(toast.kind).icon }}
            </span>
            <p class="min-w-0 flex-1 font-body-md text-sm leading-snug">{{ toast.message }}</p>
            <button
              type="button"
              class="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-outline transition hover:bg-surface-container hover:text-on-surface"
              aria-label="Dismiss"
              @click="dismiss(toast.id)"
            >
              <span class="material-symbols-outlined text-[18px]">close</span>
            </button>
          </div>
          <div class="h-0.5 w-full" :class="tone(toast.kind).bar" />
        </div>
      </TransitionGroup>
    </div>
  </Teleport>
</template>
