<template>
  <Teleport to="body">
    <div
      v-if="open"
      class="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm"
      @click.self="emit('close')"
    >
      <div
        class="relative flex max-h-[90vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl border border-white/10 bg-slate-900 shadow-2xl"
        role="dialog"
        aria-modal="true"
        :aria-label="title"
      >
        <header class="flex items-start justify-between gap-4 border-b border-white/10 px-5 py-4">
          <div>
            <h2 class="text-lg font-semibold text-white">{{ title }}</h2>
            <p v-if="snaps.length" class="mt-1 text-xs text-slate-400">
              {{ activeIndex + 1 }} of {{ snaps.length }}
              <span v-if="activeSnap"> · {{ formatTime(activeSnap.created_at) }}</span>
            </p>
          </div>
          <button
            type="button"
            class="rounded-lg p-2 text-slate-400 hover:bg-white/5 hover:text-white"
            aria-label="Close gallery"
            @click="emit('close')"
          >
            <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </header>

        <div v-if="!snaps.length" class="px-5 py-16 text-center text-slate-500">
          No pictures saved for this ward yet.
        </div>

        <template v-else>
          <div class="relative flex min-h-0 flex-1 items-center justify-center bg-black">
            <button
              type="button"
              class="absolute left-3 z-10 rounded-full bg-black/60 p-2 text-white hover:bg-black/80 disabled:opacity-30"
              :disabled="activeIndex <= 0"
              aria-label="Previous picture"
              @click="prev"
            >
              <svg class="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
              </svg>
            </button>

            <img
              :key="activeSnap?.id"
              :src="feedSnapImageUrl(apiBase, activeSnap!.id)"
              :alt="activeSnap?.polling_unit_name ?? 'Saved feed picture'"
              class="max-h-[60vh] w-full object-contain"
            />

            <button
              type="button"
              class="absolute right-3 z-10 rounded-full bg-black/60 p-2 text-white hover:bg-black/80 disabled:opacity-30"
              :disabled="activeIndex >= snaps.length - 1"
              aria-label="Next picture"
              @click="next"
            >
              <svg class="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>

          <footer class="border-t border-white/10 px-5 py-4">
            <p v-if="activeSnap" class="text-sm font-medium text-white">{{ activeSnap.polling_unit_name }}</p>
            <p v-if="activeSnap" class="text-xs text-slate-500">
              {{ activeSnap.code }} · {{ activeSnap.people_count }} unique people at capture
            </p>

            <div
              v-if="snaps.length > 1"
              class="mt-4 flex gap-2 overflow-x-auto pb-1"
            >
              <button
                v-for="(snap, idx) in snaps"
                :key="snap.id"
                type="button"
                class="shrink-0 overflow-hidden rounded-lg border-2 transition"
                :class="idx === activeIndex ? 'border-sky-400' : 'border-transparent opacity-60 hover:opacity-100'"
                @click="activeIndex = idx"
              >
                <img
                  :src="feedSnapImageUrl(apiBase, snap.id)"
                  :alt="`Thumbnail ${idx + 1}`"
                  class="h-14 w-20 object-cover"
                />
              </button>
            </div>
          </footer>
        </template>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { feedSnapImageUrl, type FeedSnap } from "~/composables/useFeedSnaps";

const props = defineProps<{
  open: boolean;
  title: string;
  snaps: FeedSnap[];
  apiBase: string;
  startIndex?: number;
}>();

const emit = defineEmits<{ close: [] }>();

const activeIndex = ref(0);

watch(
  () => [props.open, props.startIndex] as const,
  ([isOpen, start]) => {
    if (isOpen) activeIndex.value = start ?? 0;
  },
);

const activeSnap = computed(() => props.snaps[activeIndex.value] ?? null);

function prev() {
  if (activeIndex.value > 0) activeIndex.value -= 1;
}

function next() {
  if (activeIndex.value < props.snaps.length - 1) activeIndex.value += 1;
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleString();
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
