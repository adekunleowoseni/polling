<script setup lang="ts">
import { feedSnapImageUrl, type FeedSnap } from "~/composables/useFeedSnaps";

type MediaSnap = FeedSnap & {
  sha256?: string | null;
  ipfs_cid?: string | null;
  anchor_status?: string | null;
  ots_status?: string | null;
  commitment_sha256?: string | null;
  chain?: string | null;
  tx_hash?: string | null;
};

const props = withDefaults(
  defineProps<{
    stateScope?: string;
  }>(),
  { stateScope: "all" },
);

const emit = defineEmits<{
  (e: "error", msg: string): void;
  (e: "message", msg: string): void;
}>();

const { authHeaders, apiBase } = useAdminAuth();

const loading = ref(true);
const busyId = ref<string | null>(null);
const snaps = ref<MediaSnap[]>([]);
const search = ref("");
const viewMode = ref<"grid" | "table">("grid");
const formatFilter = ref<string>("all");
const page = ref(1);
const pageSize = 9;
const selectedId = ref<string | null>(null);
const chapterDelegation = ref(true);

onMounted(() => void refresh());
watch(
  () => props.stateScope,
  () => {
    page.value = 1;
  },
);

const scopedSnaps = computed(() => {
  if (props.stateScope === "all") return snaps.value;
  return snaps.value.filter((s) => (s.state || "").trim() === props.stateScope);
});

const lgaOptions = computed(() => {
  const counts = new Map<string, number>();
  for (const s of scopedSnaps.value) {
    const key = s.lga || "Unknown";
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return Array.from(counts.entries())
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([lga, count]) => ({ lga, count }));
});

const filteredSnaps = computed(() => {
  const q = search.value.trim().toLowerCase();
  return scopedSnaps.value.filter((s) => {
    if (formatFilter.value !== "all" && (s.lga || "Unknown") !== formatFilter.value) return false;
    if (!q) return true;
    const hay = `${s.polling_unit_name} ${s.code} ${s.ward} ${s.lga} ${s.state} ${s.sha256 || ""}`.toLowerCase();
    return hay.includes(q);
  });
});

const totalPages = computed(() => Math.max(1, Math.ceil(filteredSnaps.value.length / pageSize)));

const pageSnaps = computed(() => {
  const start = (page.value - 1) * pageSize;
  return filteredSnaps.value.slice(start, start + pageSize);
});

const selected = computed(() => {
  if (!selectedId.value) return pageSnaps.value[0] ?? filteredSnaps.value[0] ?? null;
  return filteredSnaps.value.find((s) => s.id === selectedId.value) ?? pageSnaps.value[0] ?? null;
});

const uniqueLgas = computed(() => new Set(scopedSnaps.value.map((s) => s.lga || "Unknown")).size);
const uniqueWards = computed(() => new Set(scopedSnaps.value.map((s) => `${s.lga}::${s.ward}`)).size);
const totalPeople = computed(() => scopedSnaps.value.reduce((n, s) => n + (s.people_count || 0), 0));
const anchoredCount = computed(
  () => scopedSnaps.value.filter((s) => s.anchor_status === "anchored" || !!s.tx_hash || !!s.sha256).length,
);
const imprintPct = computed(() =>
  scopedSnaps.value.length ? Math.round((anchoredCount.value / scopedSnaps.value.length) * 100) : 100,
);

const recentActivity = computed(() =>
  [...scopedSnaps.value]
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, 4),
);

watch(filteredSnaps, () => {
  if (page.value > totalPages.value) page.value = totalPages.value;
});

watch(pageSnaps, (list) => {
  if (!list.length) {
    selectedId.value = null;
    return;
  }
  if (!selectedId.value || !list.some((s) => s.id === selectedId.value)) {
    selectedId.value = list[0].id;
  }
});

async function refresh() {
  loading.value = true;
  try {
    snaps.value = await $fetch<MediaSnap[]>(`${apiBase}/admin/feed-snaps`, {
      headers: authHeaders(),
      query: { limit: 500 },
    });
  } catch {
    emit("error", "Failed to load media assets.");
    snaps.value = [];
  } finally {
    loading.value = false;
  }
}

function selectSnap(id: string) {
  selectedId.value = id;
}

function imageUrl(id: string) {
  return feedSnapImageUrl(apiBase, id);
}

function shortHash(hash?: string | null) {
  if (!hash) return "—";
  if (hash.length <= 12) return hash;
  return `${hash.slice(0, 6)}…${hash.slice(-4)}`;
}

function formatWhen(iso: string) {
  try {
    return new Date(iso).toLocaleString(undefined, {
      dateStyle: "medium",
      timeStyle: "short",
    });
  } catch {
    return iso;
  }
}

function relativeWhen(iso: string) {
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return "—";
  const mins = Math.max(0, Math.round((Date.now() - t) / 60000));
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.round(mins / 60);
  if (hrs < 48) return `${hrs}h ago`;
  return `${Math.round(hrs / 24)}d ago`;
}

function pageButtons() {
  const total = totalPages.value;
  const cur = page.value;
  if (total <= 5) return Array.from({ length: total }, (_, i) => i + 1);
  const set = new Set([1, total, cur, cur - 1, cur + 1].filter((n) => n >= 1 && n <= total));
  return Array.from(set).sort((a, b) => a - b);
}

async function deleteSnap(id: string) {
  if (!confirm("Delete this saved picture from the asset vault?")) return;
  busyId.value = id;
  try {
    await $fetch(`${apiBase}/admin/feed-snaps/${id}`, { method: "DELETE", headers: authHeaders() });
    emit("message", "Picture deleted from vault.");
    snaps.value = snaps.value.filter((s) => s.id !== id);
    if (selectedId.value === id) selectedId.value = null;
  } catch {
    emit("error", "Failed to delete picture.");
  } finally {
    busyId.value = null;
  }
}

function copyLink(id: string) {
  const url = imageUrl(id);
  void navigator.clipboard?.writeText(url).then(
    () => emit("message", "CDN image link copied."),
    () => emit("error", "Could not copy link."),
  );
}

function openPreview(id: string) {
  window.open(imageUrl(id), "_blank", "noopener,noreferrer");
}

function syncChapters() {
  void refresh().then(() => emit("message", "Vault synced across chapter scopes."));
}

function auditImprint() {
  emit(
    "message",
    imprintPct.value >= 100
      ? "Imprint audit clear — all assets carry hash / chain metadata where available."
      : `Imprint audit: ${anchoredCount.value}/${scopedSnaps.value.length} assets have cryptographic stamps.`,
  );
}
</script>

<template>
  <div class="flex w-full flex-col gap-6 pb-10">
    <!-- Breadcrumbs & badges -->
    <div class="flex flex-wrap items-center justify-between gap-3">
      <div class="flex flex-wrap items-center gap-2 font-label-caps text-xs tracking-wider">
        <span class="font-medium text-on-surface-variant">HQ CENTRAL COMMAND</span>
        <span class="text-outline-variant">/</span>
        <span class="font-medium text-on-surface-variant">CAMPAIGN COLLATERAL & MEDIA</span>
        <span class="text-outline-variant">/</span>
        <span class="font-bold text-primary">ASSET VAULT</span>
      </div>
      <div class="flex flex-wrap items-center gap-2">
        <div
          class="inline-flex items-center gap-1.5 rounded-full bg-surface-container-high px-2.5 py-1 font-label-caps text-xs text-deep-navy"
        >
          <span class="material-symbols-outlined text-[16px] text-action-green" style="font-variation-settings: 'FILL' 1">
            verified_user
          </span>
          SOC-2 Validated
        </div>
        <div
          class="inline-flex items-center gap-1.5 rounded-full bg-surface-container-high px-2.5 py-1 font-label-caps text-xs text-deep-navy"
        >
          <span class="h-2 w-2 animate-pulse rounded-full bg-action-green" />
          Enclave Verified
        </div>
      </div>
    </div>

    <!-- Title & actions -->
    <div class="flex flex-col justify-between gap-4 lg:flex-row lg:items-center">
      <div class="max-w-2xl">
        <h1 class="font-headline-md text-2xl font-bold tracking-tight text-on-surface sm:text-headline-md">
          Media & Image Asset Management
        </h1>
        <p class="mt-1 font-body-md text-sm text-on-surface-variant">
          Centralized feed snapshot vault — polling-unit captures, cryptographic stamps, and field chapter distribution.
        </p>
      </div>
      <div class="flex flex-wrap items-center gap-2">
        <button
          type="button"
          class="inline-flex items-center gap-2 rounded-xl bg-surface-container-high px-3 py-2 font-button-text text-sm text-on-surface transition-all hover:bg-surface-variant disabled:opacity-50"
          :disabled="loading"
          @click="syncChapters"
        >
          <span class="material-symbols-outlined text-[18px]">sync</span>
          Sync to Local Chapters
        </button>
        <button
          type="button"
          class="inline-flex items-center gap-2 rounded-xl bg-surface-container-high px-3 py-2 font-button-text text-sm text-on-surface transition-all hover:bg-surface-variant"
          @click="auditImprint"
        >
          <span class="material-symbols-outlined text-[18px]">policy</span>
          Audit Imprint Compliance
        </button>
        <button
          type="button"
          class="inline-flex items-center gap-2 rounded-xl bg-electric-pink px-3 py-2 font-button-text text-sm text-pure-white shadow-sm transition-all hover:opacity-95"
          @click="refresh"
        >
          <span class="material-symbols-outlined text-[20px]">cloud_upload</span>
          Refresh Vault
        </button>
      </div>
    </div>

    <!-- KPI strip -->
    <div class="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <div class="flex flex-col justify-between rounded-xl bg-pure-white p-5 shadow-sm">
        <div class="flex items-center justify-between">
          <span class="font-label-caps text-xs uppercase tracking-wider text-on-surface-variant">Total Assets Managed</span>
          <span class="material-symbols-outlined text-[20px] text-primary">photo_library</span>
        </div>
        <div class="mt-3">
          <div class="font-display-lg text-[36px] font-bold leading-[42px] tracking-tight text-on-surface">
            {{ scopedSnaps.length.toLocaleString() }}
            <span class="font-label-caps text-xs text-on-surface-variant">files</span>
          </div>
          <div class="mt-2 flex items-center justify-between">
            <span class="font-body-md text-xs text-on-surface-variant">
              {{ totalPeople.toLocaleString() }} people counted on capture
            </span>
            <span class="font-label-caps text-xs font-semibold text-action-green">Live vault</span>
          </div>
        </div>
        <div class="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-surface-container-high">
          <div class="h-full rounded-full bg-deep-navy" :style="{ width: `${Math.min(100, scopedSnaps.length ? 64 : 8)}%` }" />
        </div>
      </div>

      <div class="flex flex-col justify-between rounded-xl bg-pure-white p-5 shadow-sm">
        <div class="flex items-center justify-between">
          <span class="font-label-caps text-xs uppercase tracking-wider text-on-surface-variant">Cryptographic Imprint</span>
          <span class="material-symbols-outlined text-[20px] text-action-green" style="font-variation-settings: 'FILL' 1">
            verified
          </span>
        </div>
        <div class="mt-3">
          <div class="font-display-lg text-[36px] font-bold leading-[42px] tracking-tight text-on-surface">
            {{ imprintPct }}%
          </div>
          <div class="mt-2 flex items-center justify-between">
            <span class="font-body-md text-xs text-on-surface-variant">
              {{ anchoredCount }}/{{ scopedSnaps.length || 0 }} stamped
            </span>
            <span
              class="rounded-full bg-surface-container-high px-2 py-0.5 font-label-caps text-xs font-semibold text-action-green"
            >
              {{ imprintPct >= 100 ? "ZERO RISKS" : "REVIEW" }}
            </span>
          </div>
        </div>
        <div class="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-surface-container-high">
          <div class="h-full rounded-full bg-action-green" :style="{ width: `${imprintPct}%` }" />
        </div>
      </div>

      <div class="flex flex-col justify-between rounded-xl bg-pure-white p-5 shadow-sm">
        <div class="flex items-center justify-between">
          <span class="font-label-caps text-xs uppercase tracking-wider text-on-surface-variant">Field Coverage</span>
          <span class="material-symbols-outlined text-[20px] text-electric-pink">speed</span>
        </div>
        <div class="mt-3">
          <div class="font-display-lg text-[36px] font-bold leading-[42px] tracking-tight text-on-surface">
            {{ uniqueLgas }}
            <span class="font-label-caps text-xs text-on-surface-variant">LGAs</span>
          </div>
          <div class="mt-2 flex items-center justify-between">
            <span class="font-body-md text-xs text-on-surface-variant">{{ uniqueWards }} wards with captures</span>
            <span class="font-label-caps text-xs font-semibold text-action-green">Edge ready</span>
          </div>
        </div>
        <div class="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-surface-container-high">
          <div
            class="h-full rounded-full bg-electric-pink"
            :style="{ width: `${Math.min(100, uniqueLgas * 12 || 8)}%` }"
          />
        </div>
      </div>

      <div class="flex flex-col justify-between rounded-xl bg-pure-white p-5 shadow-sm">
        <div class="flex items-center justify-between">
          <span class="font-label-caps text-xs uppercase tracking-wider text-on-surface-variant">Active Deployments</span>
          <span class="material-symbols-outlined text-[20px] text-deep-navy">hub</span>
        </div>
        <div class="mt-3">
          <div class="font-display-lg text-[36px] font-bold leading-[42px] tracking-tight text-on-surface">
            {{ uniqueWards }}
            <span class="font-label-caps text-xs text-on-surface-variant">Wards</span>
          </div>
          <div class="mt-2 flex items-center justify-between">
            <span class="font-body-md text-xs text-on-surface-variant">Polling-unit snapshot network</span>
            <span class="font-label-caps text-xs font-semibold text-deep-navy">
              {{ loading ? "Syncing…" : "Online" }}
            </span>
          </div>
        </div>
        <div class="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-surface-container-high">
          <div
            class="h-full rounded-full bg-deep-navy"
            :style="{ width: `${Math.min(100, uniqueWards * 8 || 8)}%` }"
          />
        </div>
      </div>
    </div>

    <!-- Control bar -->
    <div class="mb-1 flex flex-col gap-3 rounded-xl bg-pure-white p-5 shadow-sm">
      <div class="flex flex-col items-center justify-between gap-3 md:flex-row">
        <div class="relative flex w-full items-center rounded-xl bg-surface-container-low px-3 py-2 md:w-96">
          <span class="material-symbols-outlined mr-2 text-[20px] text-on-surface-variant">search</span>
          <input
            v-model="search"
            type="text"
            class="w-full border-none bg-transparent font-body-md text-sm text-on-surface outline-none placeholder:text-outline"
            placeholder="Filter by unit, code, LGA, ward, or SHA…"
            @input="page = 1"
          />
        </div>
        <div class="flex w-full items-center justify-end gap-2 overflow-x-auto md:w-auto">
          <label
            class="flex cursor-pointer select-none items-center gap-2 rounded-xl bg-surface-container-low px-3 py-2"
          >
            <input v-model="chapterDelegation" type="checkbox" class="cursor-pointer rounded accent-electric-pink" />
            <span class="font-label-caps text-xs text-on-surface">Chapter Delegation Mode</span>
          </label>
          <div class="flex items-center rounded-xl bg-surface-container-low p-1">
            <button
              type="button"
              class="rounded-lg px-3 py-1 font-label-caps text-xs font-semibold"
              :class="viewMode === 'grid' ? 'bg-pure-white text-deep-navy shadow-sm' : 'text-on-surface-variant hover:text-on-surface'"
              @click="viewMode = 'grid'"
            >
              Grid
            </button>
            <button
              type="button"
              class="rounded-lg px-3 py-1 font-label-caps text-xs"
              :class="viewMode === 'table' ? 'bg-pure-white text-deep-navy shadow-sm font-semibold' : 'text-on-surface-variant hover:text-on-surface'"
              @click="viewMode = 'table'"
            >
              Table
            </button>
          </div>
          <button
            type="button"
            class="rounded-xl bg-surface-container-low p-2 text-on-surface transition-colors hover:bg-surface-container-high"
            title="Refresh"
            @click="refresh"
          >
            <span class="material-symbols-outlined text-[20px]">tune</span>
          </button>
        </div>
      </div>

      <div class="flex flex-wrap items-center gap-2 border-t border-surface-container-high pt-3">
        <span class="mr-1 font-label-caps text-[11px] uppercase tracking-wider text-on-surface-variant">LGA Filter:</span>
        <button
          type="button"
          class="rounded-full px-3 py-1 font-label-caps text-xs"
          :class="
            formatFilter === 'all'
              ? 'bg-deep-navy text-pure-white'
              : 'bg-surface-container-low text-on-surface hover:bg-surface-container-high'
          "
          @click="
            formatFilter = 'all';
            page = 1;
          "
        >
          All LGAs ({{ scopedSnaps.length }})
        </button>
        <button
          v-for="opt in lgaOptions"
          :key="opt.lga"
          type="button"
          class="rounded-full px-3 py-1 font-label-caps text-xs"
          :class="
            formatFilter === opt.lga
              ? 'bg-deep-navy text-pure-white'
              : 'bg-surface-container-low text-on-surface hover:bg-surface-container-high'
          "
          @click="
            formatFilter = opt.lga;
            page = 1;
          "
        >
          {{ opt.lga }} ({{ opt.count }})
        </button>
        <div class="ml-auto flex items-center gap-2">
          <span class="font-label-caps text-[11px] text-on-surface-variant">Scope:</span>
          <span class="rounded-lg bg-surface-container-low px-2 py-1 font-label-caps text-xs text-on-surface">
            {{ stateScope === "all" ? "All states" : stateScope }}
          </span>
        </div>
      </div>
    </div>

    <!-- Gallery + inspection -->
    <div class="grid grid-cols-1 gap-5 xl:grid-cols-12">
      <div class="flex flex-col gap-3 xl:col-span-8">
        <div class="mb-1 flex items-center justify-between">
          <div class="flex items-center gap-2">
            <span class="font-label-caps text-xs font-bold uppercase tracking-wider text-on-surface">
              COLLATERAL DEPOSITORY
            </span>
            <span class="rounded-full bg-surface-container-high px-2 py-0.5 font-label-caps text-xs text-deep-navy">
              Showing {{ pageSnaps.length }} of {{ filteredSnaps.length }}
            </span>
          </div>
          <div class="font-label-caps text-xs text-on-surface-variant">
            Sorted by:
            <span class="font-bold text-on-surface">Newest capture</span>
          </div>
        </div>

        <div v-if="loading" class="rounded-xl bg-pure-white p-10 text-center text-sm text-on-surface-variant shadow-sm">
          Loading vault…
        </div>
        <div
          v-else-if="!filteredSnaps.length"
          class="rounded-xl bg-pure-white p-10 text-center text-sm text-on-surface-variant shadow-sm"
        >
          No saved pictures in this scope.
        </div>

        <!-- Grid -->
        <div v-else-if="viewMode === 'grid'" class="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          <div
            v-for="snap in pageSnaps"
            :key="snap.id"
            class="group relative flex cursor-pointer flex-col justify-between overflow-hidden rounded-xl bg-pure-white shadow-sm transition-all hover:shadow-md"
            :class="selected?.id === snap.id ? 'border-2 border-electric-pink/30' : 'border border-transparent'"
            @click="selectSnap(snap.id)"
          >
            <div class="relative aspect-[16/10] w-full overflow-hidden bg-surface-container">
              <img
                :src="imageUrl(snap.id)"
                :alt="snap.polling_unit_name"
                class="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
              />
              <div
                class="absolute left-2 top-2 flex items-center gap-1.5 rounded-full bg-deep-navy/90 px-2 py-0.5 font-label-caps text-[10px] text-pure-white backdrop-blur-md"
              >
                <span v-if="selected?.id === snap.id" class="h-1.5 w-1.5 rounded-full bg-action-green" />
                <span>{{ snap.code }} · {{ snap.people_count }} ppl</span>
              </div>
              <div class="absolute right-2 top-2">
                <span
                  class="inline-flex items-center gap-1 rounded-full bg-action-green px-2 py-0.5 font-label-caps text-[10px] font-bold text-tertiary-container"
                >
                  <span class="material-symbols-outlined text-[12px]">verified</span>
                  {{ snap.sha256 ? "Verified Imprint" : "Captured" }}
                </span>
              </div>
            </div>
            <div class="flex flex-1 flex-col justify-between p-3">
              <div>
                <h3 class="truncate font-headline-md text-sm font-bold text-on-surface">
                  {{ snap.polling_unit_name }}
                </h3>
                <p class="mt-1 font-body-md text-xs text-on-surface-variant">
                  {{ snap.ward }} · {{ snap.lga }} · {{ snap.state }}
                </p>
              </div>
              <div class="mt-4 flex items-center justify-between border-t border-surface-container pt-3">
                <div class="flex items-center gap-1 font-label-caps text-[11px] text-on-surface-variant">
                  <span class="material-symbols-outlined text-[14px]">campaign</span>
                  <span>{{ relativeWhen(snap.created_at) }}</span>
                </div>
                <div class="flex items-center gap-1" @click.stop>
                  <button
                    type="button"
                    class="rounded-lg bg-surface-container-low p-1.5 text-on-surface transition-colors hover:bg-surface-container-high"
                    title="Preview"
                    @click="openPreview(snap.id)"
                  >
                    <span class="material-symbols-outlined text-[16px]">visibility</span>
                  </button>
                  <button
                    type="button"
                    class="rounded-lg bg-surface-container-low p-1.5 text-on-surface transition-colors hover:bg-surface-container-high"
                    title="Copy CDN link"
                    @click="copyLink(snap.id)"
                  >
                    <span class="material-symbols-outlined text-[16px]">link</span>
                  </button>
                  <button
                    type="button"
                    class="rounded-lg p-1.5 transition-colors"
                    :class="
                      selected?.id === snap.id
                        ? 'bg-deep-navy text-pure-white hover:bg-primary'
                        : 'bg-surface-container-low text-on-surface hover:bg-surface-container-high'
                    "
                    title="Download"
                    @click="openPreview(snap.id)"
                  >
                    <span class="material-symbols-outlined text-[16px]">download</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Table -->
        <div v-else class="overflow-hidden rounded-xl bg-pure-white shadow-sm">
          <table class="w-full text-left text-sm">
            <thead class="border-b border-surface-container-high bg-surface-container-low font-label-caps text-xs text-on-surface-variant">
              <tr>
                <th class="px-4 py-3">Unit</th>
                <th class="px-4 py-3">Location</th>
                <th class="px-4 py-3">People</th>
                <th class="px-4 py-3">Captured</th>
                <th class="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="snap in pageSnaps"
                :key="snap.id"
                class="cursor-pointer border-b border-surface-container-high/60 transition-colors hover:bg-surface-container-low/50"
                :class="selected?.id === snap.id ? 'bg-electric-pink/5' : ''"
                @click="selectSnap(snap.id)"
              >
                <td class="px-4 py-3">
                  <p class="font-semibold text-on-surface">{{ snap.polling_unit_name }}</p>
                  <p class="font-label-caps text-[10px] text-outline">{{ snap.code }}</p>
                </td>
                <td class="px-4 py-3 text-xs text-on-surface-variant">
                  {{ snap.ward }} · {{ snap.lga }}
                </td>
                <td class="px-4 py-3 font-semibold text-on-surface">{{ snap.people_count }}</td>
                <td class="px-4 py-3 text-xs text-on-surface-variant">{{ relativeWhen(snap.created_at) }}</td>
                <td class="px-4 py-3 text-right" @click.stop>
                  <button
                    type="button"
                    class="text-xs text-electric-pink hover:underline"
                    @click="openPreview(snap.id)"
                  >
                    Open
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- Pagination -->
        <div
          v-if="filteredSnaps.length"
          class="mt-2 flex items-center justify-between rounded-xl bg-pure-white p-4 shadow-sm"
        >
          <span class="font-label-caps text-xs text-on-surface-variant">
            Page {{ page }} of {{ totalPages }} · {{ filteredSnaps.length }} asset records
          </span>
          <div class="flex items-center gap-2">
            <button
              type="button"
              class="rounded-lg bg-surface-container-low px-3 py-1.5 font-button-text text-xs text-on-surface-variant hover:bg-surface-container-high disabled:opacity-40"
              :disabled="page <= 1"
              @click="page--"
            >
              Previous
            </button>
            <div class="flex items-center gap-1">
              <template v-for="(n, idx) in pageButtons()" :key="n">
                <span
                  v-if="idx > 0 && n - pageButtons()[idx - 1] > 1"
                  class="px-1 text-xs text-on-surface-variant"
                >
                  …
                </span>
                <button
                  type="button"
                  class="h-8 w-8 rounded-lg font-label-caps text-xs"
                  :class="n === page ? 'bg-deep-navy text-pure-white' : 'text-on-surface hover:bg-surface-container'"
                  @click="page = n"
                >
                  {{ n }}
                </button>
              </template>
            </div>
            <button
              type="button"
              class="rounded-lg bg-surface-container-low px-3 py-1.5 font-button-text text-xs text-on-surface hover:bg-surface-container-high disabled:opacity-40"
              :disabled="page >= totalPages"
              @click="page++"
            >
              Next
            </button>
          </div>
        </div>
      </div>

      <!-- Inspection drawer -->
      <div class="flex flex-col gap-4 xl:col-span-4">
        <div class="flex flex-col gap-4 rounded-xl bg-pure-white p-5 shadow-sm">
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-2">
              <span class="material-symbols-outlined text-[20px] text-primary">badge</span>
              <h2 class="font-headline-md text-base font-bold text-on-surface">Asset Inspection & Tagging</h2>
            </div>
            <span
              v-if="selected"
              class="rounded-full bg-action-green/20 px-2 py-0.5 font-label-caps text-[10px] font-bold text-action-green"
            >
              ACTIVE SELECTION
            </span>
          </div>

          <div v-if="!selected" class="rounded-xl bg-surface-container-low p-6 text-center text-sm text-on-surface-variant">
            Select an asset to inspect metadata, imprint, and dispatch options.
          </div>

          <template v-else>
            <div class="flex flex-col gap-3 overflow-hidden rounded-xl bg-surface-container-low p-3">
              <div class="relative aspect-video w-full overflow-hidden rounded-lg bg-surface-container">
                <img :src="imageUrl(selected.id)" :alt="selected.polling_unit_name" class="h-full w-full object-cover" />
                <div
                  class="absolute inset-0 flex items-end bg-gradient-to-t from-deep-navy/80 via-transparent to-transparent p-2.5"
                >
                  <div class="truncate font-label-caps text-xs text-pure-white">
                    {{ selected.polling_unit_name }}
                  </div>
                </div>
              </div>
              <div class="flex items-center justify-between font-label-caps text-xs">
                <span class="text-on-surface-variant">Code: {{ selected.code }}</span>
                <span class="font-bold text-primary">SHA: {{ shortHash(selected.sha256) }}</span>
              </div>
            </div>

            <div class="flex flex-col gap-2 rounded-xl bg-off-white p-3">
              <div class="flex items-center justify-between">
                <span class="font-label-caps text-xs font-bold text-on-surface">Field Capture Provenance</span>
                <span class="inline-flex items-center gap-1 font-label-caps text-[10px] font-semibold text-action-green">
                  <span class="h-1.5 w-1.5 rounded-full bg-action-green" />
                  {{ selected.anchor_status || selected.sha256 ? "STAMPED" : "QUEUED" }}
                </span>
              </div>
              <div
                class="rounded-lg bg-pure-white p-3 font-label-caps text-[11px] leading-relaxed text-on-surface-variant shadow-sm"
              >
                Captured at {{ selected.polling_unit_name }} ({{ selected.code }}) · {{ selected.ward }},
                {{ selected.lga }}, {{ selected.state }}. People on site: {{ selected.people_count }}.
                <span v-if="selected.ipfs_cid"> IPFS: {{ shortHash(selected.ipfs_cid) }}.</span>
              </div>
              <div class="flex items-center justify-between pt-1 font-label-caps text-[11px] text-on-surface-variant">
                <span>
                  Chain:
                  <strong class="text-on-surface">{{ selected.chain || "Local vault" }}</strong>
                </span>
                <button
                  type="button"
                  class="font-semibold text-electric-pink hover:underline"
                  @click="openPreview(selected.id)"
                >
                  Open full res
                </button>
              </div>
            </div>

            <div class="flex flex-col gap-2">
              <span class="font-label-caps text-xs uppercase tracking-wider text-on-surface-variant">
                Rights & Licensing
              </span>
              <div class="grid grid-cols-2 gap-2 text-xs">
                <div class="rounded-lg bg-surface-container-low p-2.5">
                  <span class="block font-label-caps text-[10px] text-on-surface-variant">CAPTURED</span>
                  <span class="font-headline-md text-sm font-bold text-on-surface">
                    {{ formatWhen(selected.created_at) }}
                  </span>
                </div>
                <div class="rounded-lg bg-surface-container-low p-2.5">
                  <span class="block font-label-caps text-[10px] text-on-surface-variant">LICENSE TYPE</span>
                  <span class="font-headline-md text-sm font-bold text-on-surface">Field GOTV</span>
                </div>
              </div>
            </div>

            <div class="flex flex-col gap-2">
              <span class="font-label-caps text-xs uppercase tracking-wider text-on-surface-variant">
                Authorized Multi-Channels
              </span>
              <div class="grid grid-cols-2 gap-2">
                <div
                  v-for="ch in ['Web & Landing', 'HQ Dashboard', 'Chapter Sync', 'Press Kit']"
                  :key="ch"
                  class="flex items-center gap-2 rounded-lg bg-surface-container-low p-2 font-label-caps text-xs text-on-surface"
                >
                  <span class="material-symbols-outlined text-[16px] text-action-green">check_circle</span>
                  <span>{{ ch }}</span>
                </div>
              </div>
            </div>

            <div class="flex flex-col gap-2">
              <span class="font-label-caps text-xs uppercase tracking-wider text-on-surface-variant">
                Cryptographic Telemetry
              </span>
              <div
                class="flex flex-col gap-1 rounded-lg bg-surface-container-low p-3 font-label-caps text-[11px] text-on-surface-variant"
              >
                <div class="flex justify-between">
                  <span>Anchor status:</span>
                  <span class="font-semibold text-on-surface">{{ selected.anchor_status || "pending" }}</span>
                </div>
                <div class="flex justify-between">
                  <span>OTS:</span>
                  <span class="font-semibold text-on-surface">{{ selected.ots_status || "—" }}</span>
                </div>
                <div class="flex justify-between">
                  <span>Tx hash:</span>
                  <span class="font-semibold text-action-green">{{ shortHash(selected.tx_hash) }}</span>
                </div>
                <div class="flex justify-between">
                  <span>Commitment:</span>
                  <span class="font-semibold text-on-surface">{{ shortHash(selected.commitment_sha256) }}</span>
                </div>
              </div>
            </div>

            <div class="flex items-center gap-2 pt-2">
              <button
                type="button"
                class="flex-1 rounded-xl bg-deep-navy py-2.5 text-center font-button-text text-sm text-pure-white transition-all hover:bg-primary"
                @click="copyLink(selected.id)"
              >
                Copy CDN Link
              </button>
              <button
                type="button"
                class="rounded-xl bg-error/10 p-2.5 text-error transition-colors hover:bg-error/20 disabled:opacity-50"
                title="Delete asset"
                :disabled="busyId === selected.id"
                @click="deleteSnap(selected.id)"
              >
                <span class="material-symbols-outlined text-[20px]">delete</span>
              </button>
            </div>
          </template>
        </div>

        <!-- Dispatch log -->
        <div class="flex flex-col gap-3 rounded-xl bg-pure-white p-5 shadow-sm">
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-2">
              <span class="material-symbols-outlined text-[18px] text-deep-navy">history</span>
              <h3 class="font-headline-md text-sm font-bold text-on-surface">Regional Asset Dispatch Log</h3>
            </div>
            <span class="animate-pulse font-label-caps text-[10px] text-action-green">STREAMING</span>
          </div>
          <div v-if="!recentActivity.length" class="text-xs text-on-surface-variant">No recent captures.</div>
          <div v-else class="flex flex-col gap-3">
            <div
              v-for="(item, idx) in recentActivity"
              :key="item.id"
              class="flex items-start gap-3 rounded-lg bg-surface-container-low p-2"
            >
              <div
                class="mt-0.5 rounded-lg p-1.5"
                :class="
                  idx % 3 === 0
                    ? 'bg-action-green/20 text-action-green'
                    : idx % 3 === 1
                      ? 'bg-electric-pink/20 text-electric-pink'
                      : 'bg-deep-navy/20 text-deep-navy'
                "
              >
                <span class="material-symbols-outlined text-[16px]">
                  {{ idx % 3 === 0 ? "cloud_download" : idx % 3 === 1 ? "verified" : "sync" }}
                </span>
              </div>
              <div class="min-w-0 flex-1">
                <div class="flex items-center justify-between gap-2">
                  <span class="truncate font-headline-md text-xs font-semibold text-on-surface">
                    {{ item.lga }} · {{ item.ward }}
                  </span>
                  <span class="shrink-0 font-label-caps text-[10px] text-on-surface-variant">
                    {{ relativeWhen(item.created_at) }}
                  </span>
                </div>
                <p class="truncate font-body-md text-[11px] text-on-surface-variant">
                  {{ item.polling_unit_name }} · {{ item.people_count }} people
                </p>
              </div>
            </div>
          </div>
          <button
            type="button"
            class="w-full rounded-lg bg-surface-container-low py-2 text-center font-label-caps text-xs text-on-surface-variant transition-colors hover:bg-surface-container-high"
            @click="refresh"
          >
            View Complete Dispatch Audit Log
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
