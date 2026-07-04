<template>
  <div>
    <section class="ui-section-header">
      <div class="mx-auto max-w-7xl px-4 py-8 sm:px-6">
        <div class="flex flex-wrap items-start justify-between gap-6">
          <div>
            <BrandLogos size="md" class="mb-4" />
            <div class="mb-2 inline-flex items-center gap-2 rounded-full border border-sky-500/30 bg-sky-500/10 px-3 py-1 text-xs text-sky-700 dark:text-sky-300">
          <span class="relative flex h-2 w-2">
            <span class="absolute inline-flex h-full w-full animate-ping rounded-full bg-sky-400 opacity-75" />
            <span class="relative inline-flex h-2 w-2 rounded-full bg-sky-400" />
          </span>
          Live feeds only
            </div>
            <h1 class="text-2xl font-bold text-ui-text sm:text-3xl">Ogun State Live Monitor</h1>
            <p class="mt-2 max-w-2xl text-sm text-ui-muted">
              Active polling unit streams grouped by local government and ward.
            </p>

            <nav v-if="selectedLga" class="mt-4 flex flex-wrap items-center gap-2 text-sm">
              <button type="button" class="text-sky-600 hover:underline dark:text-sky-400" @click="goToLgas">
                All LGAs
              </button>
              <span class="text-ui-muted">/</span>
              <span class="font-medium text-ui-text">{{ selectedLga }}</span>
            </nav>
          </div>
        </div>
      </div>
    </section>

    <div class="mx-auto max-w-7xl space-y-8 px-4 py-8 sm:px-6">
      <p v-if="error" class="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
        {{ error }}
      </p>

      <section v-if="!selectedLga" class="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <div
          v-for="stat in summaryStats"
          :key="stat.label"
          class="rounded-2xl border border-white/10 bg-slate-900/80 p-5"
        >
          <p class="text-xs uppercase tracking-wider text-slate-500">{{ stat.label }}</p>
          <p class="mt-2 text-3xl font-bold text-white">{{ stat.value }}</p>
        </div>
      </section>

      <div v-if="loading && !data" class="py-16 text-center text-slate-500">Loading live feeds…</div>

      <div v-else-if="!liveUnits.length" class="rounded-2xl border border-dashed border-white/10 p-12 text-center">
        <p class="text-slate-400">No live polling unit feeds right now.</p>
        <p class="mt-2 text-sm text-slate-500">
          Feeds appear here when agents start streaming from registered units.
        </p>
      </div>

      <!-- LGA cards -->
      <section v-else-if="!selectedLga">
        <h2 class="mb-4 text-lg font-semibold text-white">Local Government Areas</h2>
        <p class="mb-6 text-sm text-slate-500">Select an LGA to view active ward feeds.</p>
        <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <button
            v-for="lga in lgaSummaries"
            :key="lga.lga"
            type="button"
            class="group rounded-2xl border border-white/10 bg-slate-900/80 p-6 text-left transition hover:border-sky-500/40 hover:bg-slate-900 hover:shadow-lg hover:shadow-sky-950/20"
            @click="openLga(lga.lga)"
          >
            <div class="flex items-start justify-between gap-3">
              <div>
                <p class="text-xs uppercase tracking-wider text-slate-500">LGA</p>
                <h3 class="mt-1 text-xl font-semibold text-white group-hover:text-sky-300">{{ lga.lga }}</h3>
              </div>
              <span class="rounded-full bg-red-600/20 px-2 py-0.5 text-xs font-semibold text-red-400">
                {{ lga.liveUnits }} live
              </span>
            </div>
            <dl class="mt-5 grid grid-cols-2 gap-3 text-sm">
              <div>
                <dt class="text-slate-500">Active wards</dt>
                <dd class="mt-0.5 text-lg font-semibold text-white">{{ lga.activeWards }}</dd>
              </div>
              <div>
                <dt class="text-slate-500">People on site</dt>
                <dd class="mt-0.5 text-lg font-semibold text-emerald-400">{{ lga.totalPeople }}</dd>
              </div>
            </dl>
            <p class="mt-4 text-xs text-sky-400 group-hover:underline">View ward feeds →</p>
          </button>
        </div>
      </section>

      <!-- Ward cards with live feeds -->
      <section v-else>
        <div class="mb-6 flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 class="text-lg font-semibold text-white">{{ selectedLga }}</h2>
            <p class="text-sm text-slate-500">
              {{ wardSummaries.length }} active ward(s) · {{ lgaLiveCount }} live feed(s)
            </p>
          </div>
          <button
            type="button"
            class="rounded-lg border border-white/10 px-4 py-2 text-sm text-slate-300 hover:bg-white/5"
            @click="goToLgas"
          >
            ← Back to LGAs
          </button>
        </div>

        <div class="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
        <article
          v-for="ward in wardSummaries"
          :key="ward.ward"
          class="ui-card overflow-hidden"
        >
          <header class="border-b border-ui-border/40 p-4">
            <div class="flex flex-wrap items-start justify-between gap-2">
              <div class="min-w-0">
                <p class="text-[10px] uppercase tracking-wider text-ui-muted">Ward</p>
                <h3 class="truncate text-base font-semibold text-ui-text">{{ ward.ward }}</h3>
              </div>
              <div class="flex shrink-0 items-center gap-1.5">
                <button
                  v-if="snapsForWard(ward.ward).length"
                  type="button"
                  class="inline-flex items-center gap-1 rounded-full border border-sky-500/30 bg-sky-500/10 px-2 py-1 text-[10px] font-medium text-sky-300 hover:bg-sky-500/20"
                  @click="openGallery(ward.ward)"
                >
                  <svg class="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      stroke-width="2"
                      d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                    />
                  </svg>
                  {{ snapsForWard(ward.ward).length }}
                </button>
                <span class="rounded-full bg-red-600 px-2 py-0.5 text-[10px] font-semibold text-white">LIVE</span>
              </div>
            </div>
            <dl class="mt-3 grid grid-cols-3 gap-2 text-xs">
              <div class="rounded-lg bg-ui-elevated/80 px-2 py-1.5">
                <dt class="text-[9px] uppercase text-ui-muted">Units</dt>
                <dd class="font-bold text-ui-text">{{ ward.units.length }}</dd>
              </div>
              <div class="rounded-lg bg-ui-elevated/80 px-2 py-1.5">
                <dt class="text-[9px] uppercase text-ui-muted">People</dt>
                <dd class="font-bold text-emerald-400">{{ ward.totalPeople }}</dd>
              </div>
              <div class="rounded-lg bg-ui-elevated/80 px-2 py-1.5">
                <dt class="text-[9px] uppercase text-ui-muted">Peak</dt>
                <dd class="font-bold text-ui-text">{{ ward.peakPeople }}</dd>
              </div>
            </dl>

            <div
              v-if="snapsForWard(ward.ward).length"
              class="mt-3 flex items-center gap-1.5"
            >
              <button
                v-for="(snap, idx) in snapsForWard(ward.ward).slice(0, 3)"
                :key="snap.id"
                type="button"
                class="overflow-hidden rounded border border-white/10 hover:border-sky-400/50"
                @click="openGallery(ward.ward, idx)"
              >
                <img
                  :src="feedSnapImageUrl(snapApiBase, snap.id)"
                  :alt="`Saved picture from ${snap.polling_unit_name}`"
                  class="h-8 w-11 object-cover"
                />
              </button>
            </div>
          </header>

          <div
            class="grid flex-1 gap-2 p-3"
            :class="wardFeedGridClass(ward.units.length)"
          >
            <div
              v-for="(unit, unitIdx) in ward.units"
              :key="unit.id"
              class="group overflow-hidden rounded-lg border border-ui-border/40 bg-ui-elevated"
            >
              <div class="relative aspect-video bg-black">
                <button
                  type="button"
                  class="block h-full w-full"
                  :aria-label="`Open ${unit.name} fullscreen`"
                  @click="openFullscreen(ward.units, unitIdx)"
                >
                  <img
                    :src="snapshotUrl(apiBase, unit.code, frameVersions[unit.code])"
                    :alt="`${unit.name} live feed`"
                    class="h-full w-full object-cover"
                  />
                </button>
                <div class="absolute left-1.5 top-1.5 rounded-full bg-red-600 px-1.5 py-0.5 text-[9px] font-bold text-white">
                  LIVE
                </div>
                <div class="absolute bottom-1.5 right-1.5 rounded bg-black/70 px-1.5 py-0.5 text-right backdrop-blur">
                  <p class="text-sm font-bold leading-none text-emerald-400">{{ unit.people_count }}</p>
                </div>
                <button
                  type="button"
                  class="absolute right-1.5 top-1.5 rounded bg-black/60 p-1 text-white opacity-0 transition hover:bg-black/80 group-hover:opacity-100 focus:opacity-100"
                  :aria-label="`Fullscreen ${unit.name}`"
                  @click="openFullscreen(ward.units, unitIdx)"
                >
                  <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      stroke-width="2"
                      d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4"
                    />
                  </svg>
                </button>
              </div>
              <div class="p-2">
                <p class="truncate text-xs font-medium text-ui-text">{{ unit.name }}</p>
              </div>
            </div>
          </div>

          <footer
            v-if="ward.units.length > 1"
            class="border-t border-white/10 px-3 py-2"
          >
            <button
              type="button"
              class="w-full rounded-lg border border-white/10 py-1.5 text-xs text-sky-300 hover:bg-white/5"
              @click="openFullscreen(ward.units, 0)"
            >
              View all {{ ward.units.length }} feeds fullscreen
            </button>
          </footer>
        </article>
        </div>
      </section>
    </div>

    <FeedSnapGalleryModal
      :open="galleryOpen"
      :title="galleryTitle"
      :snaps="gallerySnaps"
      :api-base="snapApiBase"
      :start-index="galleryStartIndex"
      @close="galleryOpen = false"
    />

    <LiveFeedFullscreenModal
      :open="fullscreenOpen"
      :units="fullscreenUnits"
      :start-index="fullscreenStartIndex"
      :api-base="apiBase"
      :frame-versions="frameVersions"
      @close="fullscreenOpen = false"
    />
  </div>
</template>

<script setup lang="ts">
import { groupByLga, groupByWard, liveUnitsOnly } from "~/composables/useFeedGroups";
import { feedSnapImageUrl, useFeedSnaps } from "~/composables/useFeedSnaps";
import { snapshotUrl, useVideoFeeds, type PollingUnit } from "~/composables/useVideoFeeds";
import type { FeedSnap } from "~/composables/useFeedSnaps";

definePageMeta({ layout: "default" });

const route = useRoute();
const router = useRouter();
const { data, loading, error, apiBase, frameVersions } = useVideoFeeds(3000);

const selectedLga = computed(() => {
  const q = route.query.lga;
  return typeof q === "string" && q.length ? q : null;
});

const { refresh: refreshSnaps, snapsForWard, apiBase: snapApiBase } = useFeedSnaps(selectedLga);

const galleryOpen = ref(false);
const gallerySnaps = ref<FeedSnap[]>([]);
const galleryTitle = ref("");
const galleryStartIndex = ref(0);

const fullscreenOpen = ref(false);
const fullscreenUnits = ref<PollingUnit[]>([]);
const fullscreenStartIndex = ref(0);

let snapRefreshTimer: ReturnType<typeof setInterval> | null = null;

function wardFeedGridClass(count: number): string {
  if (count <= 1) return "grid-cols-1";
  if (count <= 4) return "grid-cols-2";
  if (count <= 6) return "grid-cols-2 sm:grid-cols-3";
  return "grid-cols-2 sm:grid-cols-3 max-h-80 overflow-y-auto";
}

function openFullscreen(units: PollingUnit[], startIndex = 0) {
  fullscreenUnits.value = units;
  fullscreenStartIndex.value = startIndex;
  fullscreenOpen.value = true;
}

function openGallery(ward: string, startIndex = 0) {
  gallerySnaps.value = snapsForWard(ward);
  galleryTitle.value = `${ward} — saved pictures`;
  galleryStartIndex.value = startIndex;
  galleryOpen.value = true;
}

watch(selectedLga, (lga) => {
  if (snapRefreshTimer) {
    clearInterval(snapRefreshTimer);
    snapRefreshTimer = null;
  }
  if (lga) {
    snapRefreshTimer = setInterval(refreshSnaps, 15000);
  }
});

onUnmounted(() => {
  if (snapRefreshTimer) clearInterval(snapRefreshTimer);
});

const liveUnits = computed(() => liveUnitsOnly(data.value?.units ?? []));
const lgaSummaries = computed(() => groupByLga(data.value?.units ?? []));
const wardSummaries = computed(() =>
  selectedLga.value ? groupByWard(data.value?.units ?? [], selectedLga.value) : [],
);
const lgaLiveCount = computed(() =>
  selectedLga.value ? liveUnits.value.filter((u) => u.lga === selectedLga.value).length : 0,
);

const summaryStats = computed(() => [
  { label: "Live LGAs", value: lgaSummaries.value.length },
  { label: "Live feeds", value: liveUnits.value.length },
  { label: "People on site", value: liveUnits.value.reduce((s, u) => s + u.people_count, 0) },
  {
    label: "Active wards",
    value: new Set(liveUnits.value.map((u) => `${u.lga}|${u.ward}`)).size,
  },
]);

function openLga(lga: string) {
  router.push({ path: "/feeds", query: { lga } });
}

function goToLgas() {
  router.push({ path: "/feeds" });
}

watch(selectedLga, (lga) => {
  if (lga && !lgaSummaries.value.some((x) => x.lga === lga) && !loading.value && data.value) {
    goToLgas();
  }
});
</script>
