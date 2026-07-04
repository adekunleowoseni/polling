<template>
  <Teleport to="body">
    <div
      v-if="open && unit"
      class="fixed inset-0 z-50 flex flex-col bg-black"
      role="dialog"
      aria-modal="true"
      :aria-label="`${unit.name} live feed`"
    >
      <header class="flex shrink-0 items-center justify-between gap-4 border-b border-white/10 bg-slate-950/90 px-4 py-3">
        <div class="min-w-0">
          <p class="truncate text-sm font-semibold text-white">{{ unit.name }}</p>
          <p class="truncate text-xs text-slate-400">
            {{ unit.ward }} · {{ unit.lga }} · {{ unit.code }}
          </p>
        </div>
        <div class="flex items-center gap-2">
          <span class="rounded-full bg-red-600 px-2 py-0.5 text-[10px] font-bold text-white">LIVE</span>
          <span class="rounded-lg bg-black/60 px-2 py-1 text-sm font-bold text-emerald-400">
            {{ unit.people_count }} unique
          </span>
          <button
            type="button"
            class="rounded-lg p-2 text-slate-400 hover:bg-white/10 hover:text-white"
            aria-label="Close fullscreen"
            @click="emit('close')"
          >
            <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </header>

      <div class="relative flex min-h-0 flex-1 items-center justify-center">
        <button
          v-if="units.length > 1"
          type="button"
          class="absolute left-3 z-10 rounded-full bg-black/60 p-3 text-white hover:bg-black/80 disabled:opacity-30"
          :disabled="activeIndex <= 0"
          aria-label="Previous feed"
          @click="prev"
        >
          <svg class="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
          </svg>
        </button>

        <div class="h-full w-full max-w-6xl">
          <LiveFeedPlayer
            :key="unit.code"
            :code="unit.code"
            :api-base="apiBase"
            :people-count="unit.people_count"
            :start-muted="false"
          />
        </div>

        <button
          v-if="units.length > 1"
          type="button"
          class="absolute right-3 z-10 rounded-full bg-black/60 p-3 text-white hover:bg-black/80 disabled:opacity-30"
          :disabled="activeIndex >= units.length - 1"
          aria-label="Next feed"
          @click="next"
        >
          <svg class="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>

      <footer
        v-if="units.length > 1"
        class="shrink-0 border-t border-white/10 bg-slate-950/90 px-4 py-3 text-center text-xs text-slate-400"
      >
        Feed {{ activeIndex + 1 }} of {{ units.length }} · use speaker button to mute/unmute audio
      </footer>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import type { PollingUnit } from "~/composables/useVideoFeeds";

const props = defineProps<{
  open: boolean;
  units: PollingUnit[];
  startIndex?: number;
  apiBase: string;
  frameVersions?: Record<string, number>;
}>();

const emit = defineEmits<{ close: [] }>();

const activeIndex = ref(0);

watch(
  () => [props.open, props.startIndex] as const,
  ([isOpen, start]) => {
    if (isOpen) activeIndex.value = start ?? 0;
  },
);

const unit = computed(() => props.units[activeIndex.value] ?? null);

function prev() {
  if (activeIndex.value > 0) activeIndex.value -= 1;
}

function next() {
  if (activeIndex.value < props.units.length - 1) activeIndex.value += 1;
}

function onKeydown(e: KeyboardEvent) {
  if (!props.open) return;
  if (e.key === "ArrowLeft") prev();
  if (e.key === "ArrowRight") next();
  if (e.key === "Escape") emit("close");
}

onMounted(() => window.addEventListener("keydown", onKeydown));
onUnmounted(() => window.removeEventListener("keydown", onKeydown));
</script>
