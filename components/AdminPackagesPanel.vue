<script setup lang="ts">
import {
  usePackages,
  type PackageDistribution,
  type PackageDistributionCreate,
  type PackageKit,
} from "~/composables/usePackages";

const emit = defineEmits<{ (e: "error", msg: string): void; (e: "message", msg: string): void }>();

const { loadDistributions, createDistribution, loadKits, createKit, deleteKit } = usePackages();
const { admin } = useAdminAuth();

const loading = ref(true);
const syncing = ref(false);
const exporting = ref(false);
const busy = ref(false);
const kitBusy = ref(false);
const items = ref<PackageDistribution[]>([]);
const customKits = ref<PackageKit[]>([]);
const builderRef = ref<HTMLElement | null>(null);
const builderHighlight = ref(false);
const showAddKit = ref(false);
const showManageKits = ref(false);
const deletingKitId = ref<string | null>(null);
const statusFilter = ref<"all" | "active" | "completed" | "accepted">("all");
const lastSyncedAt = ref<Date | null>(null);

const form = reactive<PackageDistributionCreate>({
  title: "GOTV door leaflet pack",
  state: admin.value?.state ?? "Ogun State",
  lga: "",
  ward: "",
  polling_unit_code: "",
  polling_unit_name: "",
  audience: "both",
  package_count: undefined,
  auto_count: true,
});

type BundleOption = {
  id: string;
  title: string;
  detail: string;
  formTitle: string;
  stockLabel: string;
  custom?: boolean;
};

const DEFAULT_BUNDLES: BundleOption[] = [
  {
    id: "leaflets",
    title: "GOTV Direct Door Leaflet Pack",
    detail: "High-gloss leaflets + walk clipboards + rain sleeves for ward drops",
    formTitle: "GOTV door leaflet pack",
    stockLabel: "Field ready",
  },
  {
    id: "signs",
    title: "High-Impact Yard Sign Bundle",
    detail: "Weather-sealed coroplast signs + stakes for roadside and compound display",
    formTitle: "Yard sign & stake bundle",
    stockLabel: "Chapter stocked",
  },
  {
    id: "relief",
    title: "Relief / Material Claim Pack",
    detail: "Ward relief packages for voter & member QR claim at agent stations",
    formTitle: "Relief package distribution",
    stockLabel: "Claim workflow",
  },
];

const bundleId = ref("leaflets");
const dispatchMode = ref<"express" | "hub" | "print">("hub");

const kitForm = reactive({
  title: "",
  detail: "",
  form_title: "",
  stock_label: "Custom stock",
  default_audience: "both" as "voter" | "member" | "both",
});

/** Built-in archetypes the admin removed from this list (session). */
const hiddenDefaultIds = ref<string[]>([]);

const bundleOptions = computed<BundleOption[]>(() => [
  ...DEFAULT_BUNDLES.filter((b) => !hiddenDefaultIds.value.includes(b.id)),
  ...customKits.value.map((k) => ({
    id: `custom:${k.id}`,
    title: k.title,
    detail: k.detail || "Custom collateral kit",
    formTitle: k.form_title || k.title,
    stockLabel: k.stock_label || "Custom stock",
    custom: true,
  })),
]);

function selectFallbackBundle(removedId: string) {
  if (bundleId.value !== removedId) return;
  const next = bundleOptions.value[0];
  if (next) {
    bundleId.value = next.id;
    form.title = next.formTitle;
  }
}

const dispatchOptions: { id: "express" | "hub" | "print"; title: string; detail: string; eta: string }[] = [
  {
    id: "express",
    title: "Depot Express Courier",
    detail: "Next-morning delivery to ward captain",
    eta: "4–6 hrs",
  },
  {
    id: "hub",
    title: "Volunteer Hub Staging",
    detail: "Drop-off at LGA field office for agent pickup",
    eta: "Free",
  },
  {
    id: "print",
    title: "Commercial POD Drop-ship",
    detail: "Direct from print partner to chapter depot",
    eta: "24–48 hrs",
  },
];

const lgas = ref<string[]>([]);
const wards = ref<string[]>([]);
const stateCode = computed(() => "ogun");

const totalPackages = computed(() => items.value.reduce((s, i) => s + i.package_count, 0));
const totalClaimed = computed(() => items.value.reduce((s, i) => s + i.packages_claimed, 0));
const activeCount = computed(() => items.value.filter((i) => i.status === "active").length);
const acceptedCount = computed(() => items.value.filter((i) => i.status === "accepted" || !!i.accepted_at).length);
const completedCount = computed(() => items.value.filter((i) => i.status === "completed").length);
const pendingCount = computed(() => items.value.filter((i) => i.status === "active" && !i.agent_id).length);
const inTransitCount = computed(() =>
  items.value.filter((i) => i.status === "active" && !!i.agent_id).length,
);
const claimPct = computed(() =>
  totalPackages.value ? Math.round((totalClaimed.value / totalPackages.value) * 100) : 0,
);
const remainingPct = computed(() => Math.max(0, 100 - claimPct.value));
const uniqueWards = computed(() => new Set(items.value.map((i) => `${i.lga}::${i.ward}`)).size);
const chapterHeadroom = computed(() => {
  const remaining = Math.max(0, totalPackages.value - totalClaimed.value);
  return remaining * 2500 + uniqueWards.value * 75000 + 500_000;
});

const filteredItems = computed(() => {
  if (statusFilter.value === "all") return items.value;
  if (statusFilter.value === "accepted") {
    return items.value.filter((i) => i.status === "accepted" || (!!i.agent_id && i.status === "active"));
  }
  return items.value.filter((i) => i.status === statusFilter.value);
});

const pageSize = 8;
const page = ref(1);
const totalPages = computed(() => Math.max(1, Math.ceil(filteredItems.value.length / pageSize)));
const pageItems = computed(() => {
  const start = (page.value - 1) * pageSize;
  return filteredItems.value.slice(start, start + pageSize);
});

watch(statusFilter, () => {
  page.value = 1;
});

const orderEstimateNaira = computed(() => {
  if (dispatchMode.value === "hub") return 0;
  if (dispatchMode.value === "express") return 42000;
  return 18500;
});

const stockRows = computed(() => {
  const byAudience = {
    both: items.value.filter((i) => i.audience === "both"),
    voter: items.value.filter((i) => i.audience === "voter"),
    member: items.value.filter((i) => i.audience === "member"),
  };
  const sum = (list: PackageDistribution[]) => ({
    total: list.reduce((s, i) => s + i.package_count, 0),
    claimed: list.reduce((s, i) => s + i.packages_claimed, 0),
  });
  const leaflets = sum(items.value);
  const signs = sum(byAudience.member.length ? byAudience.member : items.value.slice(0, Math.ceil(items.value.length / 2)));
  const badges = sum(byAudience.voter.length ? byAudience.voter : items.value);
  return [
    {
      label: "GOTV leaflets / door packs",
      used: leaflets.claimed,
      total: Math.max(leaflets.total, 1),
      warn: false,
    },
    {
      label: "Chapter yard / stake kits",
      used: signs.claimed,
      total: Math.max(signs.total, 1),
      warn: signs.total > 0 && signs.claimed / signs.total > 0.75,
    },
    {
      label: "Claim-ready relief packs",
      used: badges.claimed,
      total: Math.max(badges.total, 1),
      warn: false,
    },
  ];
});

const liveRouteLabel = computed(() => {
  const hit = items.value.find((i) => i.status === "active" && i.agent_name);
  if (!hit) return form.lga ? `${form.lga} hub` : "Ogun field mesh";
  return `${hit.ward} · ${hit.lga}`;
});

watch(bundleId, (id) => {
  const opt = bundleOptions.value.find((b) => b.id === id);
  if (opt) {
    form.title = opt.formTitle;
    const custom = customKits.value.find((k) => `custom:${k.id}` === id);
    if (custom?.default_audience === "voter" || custom?.default_audience === "member" || custom?.default_audience === "both") {
      form.audience = custom.default_audience;
    }
  }
});

async function loadGeo() {
  const config = useRuntimeConfig();
  lgas.value = await $fetch<string[]>(`${config.public.apiBase}/geo/states/${stateCode.value}/lgas`);
}

watch(
  () => form.state,
  async () => {
    form.lga = "";
    form.ward = "";
    wards.value = [];
    await loadGeo();
  },
  { immediate: true },
);

watch(
  () => form.lga,
  async (lga) => {
    form.ward = "";
    if (!lga) {
      wards.value = [];
      return;
    }
    const config = useRuntimeConfig();
    wards.value = await $fetch<string[]>(
      `${config.public.apiBase}/geo/states/${stateCode.value}/lgas/${encodeURIComponent(lga)}/wards`,
    );
  },
);

async function refreshKits() {
  try {
    customKits.value = await loadKits();
  } catch {
    customKits.value = [];
  }
}

async function refresh(opts: { quiet?: boolean } = {}) {
  if (!opts.quiet) loading.value = true;
  try {
    const [dists] = await Promise.all([loadDistributions(), refreshKits()]);
    items.value = dists;
    lastSyncedAt.value = new Date();
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Failed to load distributions.";
    emit("error", msg);
  } finally {
    loading.value = false;
  }
}

async function syncWarehouseInventory() {
  syncing.value = true;
  try {
    await refresh({ quiet: true });
    const remaining = Math.max(0, totalPackages.value - totalClaimed.value);
    emit(
      "message",
      `Warehouse inventory synced · ${items.value.length} batch(es) · ${totalPackages.value.toLocaleString()} packs · ${totalClaimed.value.toLocaleString()} claimed · ${remaining.toLocaleString()} remaining across ${uniqueWards.value} ward hub(s).`,
    );
  } finally {
    syncing.value = false;
  }
}

function scrollToBuilder() {
  builderHighlight.value = true;
  nextTick(() => {
    builderRef.value?.scrollIntoView({ behavior: "smooth", block: "start" });
  });
  window.setTimeout(() => {
    builderHighlight.value = false;
  }, 2200);
}

async function triggerDistributionBatch() {
  scrollToBuilder();
  if (!form.lga || !form.ward) {
    emit("message", "Select LGA and ward in the builder, then confirm the batch pack order.");
    return;
  }
  await submit();
}

async function submit() {
  if (!form.lga || !form.ward) {
    emit("error", "Select LGA and ward turf.");
    scrollToBuilder();
    return;
  }
  if (!form.auto_count && (!form.package_count || form.package_count < 1)) {
    emit("error", "Enter a package count or enable auto-count from eligible recipients.");
    scrollToBuilder();
    return;
  }
  busy.value = true;
  try {
    const bundle = bundleOptions.value.find((b) => b.id === bundleId.value);
    const modeNote =
      dispatchMode.value === "express"
        ? " · express courier"
        : dispatchMode.value === "print"
          ? " · POD drop-ship"
          : " · hub staging";
    const body: PackageDistributionCreate = {
      title: `${(form.title.trim() || bundle?.formTitle || "Field pack")}${modeNote}`,
      state: form.state || "Ogun State",
      lga: form.lga,
      ward: form.ward,
      audience: form.audience,
      auto_count: form.auto_count,
    };
    if (form.polling_unit_code?.trim()) body.polling_unit_code = form.polling_unit_code.trim();
    if (form.polling_unit_name?.trim()) body.polling_unit_name = form.polling_unit_name.trim();
    if (!form.auto_count && form.package_count) body.package_count = form.package_count;

    const created = await createDistribution(body);
    emit(
      "message",
      `Batch ${shortId(created.id)} transmitted to ${created.ward}, ${created.lga} · ${created.package_count.toLocaleString()} pack(s). Agents in this ward can accept it.`,
    );
    statusFilter.value = "all";
    page.value = 1;
    await refresh({ quiet: true });
  } catch (e: unknown) {
    emit("error", e instanceof Error ? e.message : "Create failed.");
  } finally {
    busy.value = false;
  }
}

function statusLabel(item: PackageDistribution) {
  if (item.status === "completed") return "Delivered & Handed";
  if (item.status === "accepted" || (item.status === "active" && item.agent_id)) {
    return item.packages_claimed > 0 ? "Sorting at Hub" : "En Route (Field)";
  }
  return "Queued for Pack";
}

function statusTone(item: PackageDistribution) {
  if (item.status === "completed") return "outline";
  if (item.status === "accepted" || (item.status === "active" && item.agent_id)) {
    return item.packages_claimed > 0 ? "green" : "pink";
  }
  return "navy";
}

function shortId(id: string) {
  return `#PKG-${id.slice(-4).toUpperCase()}`;
}

function agentInitials(name: string | null) {
  if (!name) return "HQ";
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() || "")
    .join("");
}

function stockPct(used: number, total: number) {
  if (!total) return 0;
  return Math.min(100, Math.round((used / total) * 100));
}

function csvCell(value: string | number | null | undefined) {
  return `"${String(value ?? "").replace(/"/g, '""')}"`;
}

function exportManifest() {
  const rows = filteredItems.value.length ? filteredItems.value : items.value;
  if (!rows.length) {
    emit("error", "No manifest rows to export. Sync inventory or transmit a batch first.");
    return;
  }
  exporting.value = true;
  try {
    const header = [
      "batch_id",
      "short_ref",
      "title",
      "state",
      "lga",
      "ward",
      "polling_unit_code",
      "polling_unit_name",
      "audience",
      "package_count",
      "packages_claimed",
      "remaining",
      "eligible_count",
      "status",
      "logistics_status",
      "agent_name",
      "accepted_at",
      "created_at",
    ];
    const body = rows.map((i) =>
      [
        csvCell(i.id),
        csvCell(shortId(i.id)),
        csvCell(i.title),
        csvCell(i.state),
        csvCell(i.lga),
        csvCell(i.ward),
        csvCell(i.polling_unit_code),
        csvCell(i.polling_unit_name),
        csvCell(i.audience),
        i.package_count,
        i.packages_claimed,
        Math.max(0, i.package_count - i.packages_claimed),
        i.eligible_count,
        csvCell(i.status),
        csvCell(statusLabel(i)),
        csvCell(i.agent_name),
        csvCell(i.accepted_at),
        csvCell(i.created_at),
      ].join(","),
    );
    const blob = new Blob([[header.join(","), ...body].join("\n")], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `package-dispatch-manifest-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    emit(
      "message",
      `Manifest exported · ${rows.length} shipment${rows.length === 1 ? "" : "s"}${statusFilter.value !== "all" ? ` (filter: ${statusFilter.value})` : ""}.`,
    );
  } finally {
    exporting.value = false;
  }
}

function formatNaira(n: number) {
  return `₦${n.toLocaleString()}`;
}

function formatSynced(at: Date | null) {
  if (!at) return "Never";
  return at.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit", second: "2-digit" });
}

function openAddKit() {
  kitForm.title = "";
  kitForm.detail = "";
  kitForm.form_title = "";
  kitForm.stock_label = "Custom stock";
  kitForm.default_audience = "both";
  showAddKit.value = true;
}

async function saveKit() {
  if (!kitForm.title.trim()) {
    emit("error", "Enter a collateral kit title.");
    return;
  }
  kitBusy.value = true;
  try {
    const created = await createKit({
      title: kitForm.title.trim(),
      detail: kitForm.detail.trim(),
      form_title: (kitForm.form_title || kitForm.title).trim(),
      stock_label: (kitForm.stock_label || "Custom stock").trim(),
      default_audience: kitForm.default_audience,
    });
    await refreshKits();
    bundleId.value = `custom:${created.id}`;
    form.title = created.form_title || created.title;
    if (created.default_audience === "voter" || created.default_audience === "member" || created.default_audience === "both") {
      form.audience = created.default_audience;
    }
    showAddKit.value = false;
    emit("message", `Collateral kit “${created.title}” added.`);
  } catch (e: unknown) {
    emit("error", e instanceof Error ? e.message : "Failed to save collateral kit.");
  } finally {
    kitBusy.value = false;
  }
}

function kitErrorMessage(e: unknown, fallback: string) {
  if (e && typeof e === "object" && "data" in e) {
    const detail = (e as { data?: { detail?: unknown } }).data?.detail;
    if (typeof detail === "string" && detail.trim()) return detail;
  }
  if (e instanceof Error && e.message) return e.message;
  return fallback;
}

async function removeKit(kitId: string) {
  const kit = customKits.value.find((k) => k.id === kitId);
  const label = kit?.title ? `“${kit.title}”` : "this collateral kit";
  if (!confirm(`Delete ${label}? This cannot be undone.`)) return;
  deletingKitId.value = kitId;
  kitBusy.value = true;
  try {
    await deleteKit(kitId);
    await refreshKits();
    selectFallbackBundle(`custom:${kitId}`);
    emit("message", `Collateral kit ${label} deleted.`);
    if (!customKits.value.length) showManageKits.value = false;
  } catch (e: unknown) {
    emit("error", kitErrorMessage(e, "Failed to delete collateral kit."));
  } finally {
    kitBusy.value = false;
    deletingKitId.value = null;
  }
}

async function deleteBundle(b: BundleOption) {
  if (b.custom) {
    await removeKit(b.id.replace(/^custom:/, ""));
    return;
  }
  if (!confirm(`Remove “${b.title}” from the kit list?`)) return;
  deletingKitId.value = b.id;
  hiddenDefaultIds.value = [...hiddenDefaultIds.value, b.id];
  selectFallbackBundle(b.id);
  emit("message", `“${b.title}” removed from the kit list.`);
  deletingKitId.value = null;
}

function openManageKits() {
  showManageKits.value = true;
  void refreshKits();
}

onMounted(() => void refresh());
</script>

<template>
  <div class="flex w-full flex-col gap-6 pb-10">
    <!-- Breadcrumbs & status -->
    <div class="flex flex-wrap items-center justify-between gap-4">
      <div class="flex flex-wrap items-center gap-2 font-label-caps text-xs text-on-surface-variant">
        <span>HQ CENTRAL COMMAND</span>
        <span class="text-outline-variant">/</span>
        <span>FIELD OPERATIONS & LOGISTICS</span>
        <span class="text-outline-variant">/</span>
        <span class="font-semibold text-primary">LITERATURE & PACK DISPATCH</span>
      </div>
      <div class="flex flex-wrap items-center gap-3">
        <div class="flex items-center gap-2 rounded-full bg-surface-container-high px-3 py-1.5">
          <span class="h-2 w-2 animate-ping rounded-full bg-action-green" />
          <span class="font-label-caps text-[11px] text-on-surface">
            Depot mesh · {{ uniqueWards }} turf node{{ uniqueWards === 1 ? "" : "s" }} · synced {{ formatSynced(lastSyncedAt) }}
          </span>
        </div>
        <div class="rounded-full bg-surface-container px-2.5 py-1 font-label-caps text-[10px] font-bold text-on-surface-variant">
          LIVE MANIFEST
        </div>
      </div>
    </div>

    <!-- Header -->
    <div class="flex flex-col justify-between gap-6 pb-2 xl:flex-row xl:items-end">
      <div class="flex max-w-3xl flex-col gap-1.5">
        <h1 class="font-headline-md text-2xl font-bold tracking-tight text-primary sm:text-headline-md">
          Trigger Package & Literature Distribution
        </h1>
        <p class="font-body-md text-sm text-on-surface-variant">
          Automate and dispatch walk packets, GOTV leaflets, yard sign bundles, and relief claim packs to field hubs
          and ward organizers across Ogun LGAs.
        </p>
      </div>
      <div class="grid w-full grid-cols-1 gap-2 sm:grid-cols-3 xl:w-auto xl:shrink-0">
        <button
          type="button"
          class="inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-surface-container-lowest px-4 font-button-text text-sm font-semibold text-primary shadow-sm transition hover:bg-surface-container-low disabled:opacity-60"
          :disabled="loading || syncing"
          @click="syncWarehouseInventory"
        >
          <span class="material-symbols-outlined shrink-0 text-[18px] text-action-green" :class="syncing ? 'animate-spin' : ''">
            sync
          </span>
          <span class="truncate">{{ syncing ? "Syncing…" : "Warehouse Inventory Sync" }}</span>
        </button>
        <button
          type="button"
          class="inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-surface-container-lowest px-4 font-button-text text-sm font-semibold text-primary shadow-sm transition hover:bg-surface-container-low disabled:opacity-60"
          :disabled="exporting || loading"
          @click="exportManifest"
        >
          <span class="material-symbols-outlined shrink-0 text-[18px] text-outline">file_download</span>
          <span class="truncate">{{ exporting ? "Exporting…" : "Export Manifest" }}</span>
        </button>
        <button
          type="button"
          class="inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-electric-pink px-4 font-button-text text-sm font-semibold text-pure-white shadow-sm shadow-electric-pink/25 transition hover:opacity-95 disabled:opacity-60"
          :disabled="busy"
          @click="triggerDistributionBatch"
        >
          <span class="material-symbols-outlined shrink-0 text-[18px]">bolt</span>
          <span class="truncate">{{ busy ? "Transmitting…" : "Trigger Distribution Batch" }}</span>
        </button>
      </div>
    </div>

    <!-- KPI strip -->
    <div class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <div class="group relative flex flex-col justify-between overflow-hidden rounded-xl bg-surface-container-lowest p-5 shadow-sm transition-shadow hover:shadow-md">
        <div class="flex items-center justify-between">
          <span class="font-label-caps text-xs text-on-surface-variant">PENDING BATCH ORDERS</span>
          <span class="flex h-8 w-8 items-center justify-center rounded-lg bg-surface-container-high text-primary">
            <span class="material-symbols-outlined text-[18px]">inventory_2</span>
          </span>
        </div>
        <div class="mt-4 flex flex-col">
          <div class="flex items-baseline gap-2">
            <span class="font-display-lg text-[40px] font-extrabold leading-[48px] text-primary">
              {{ pendingCount || activeCount }}
            </span>
            <span class="font-label-caps text-xs font-semibold text-on-surface-variant">Batches</span>
          </div>
          <span class="mt-1 flex items-center gap-1 font-label-caps text-xs font-semibold text-secondary">
            <span class="material-symbols-outlined text-[14px]">schedule</span>
            {{ (totalPackages - totalClaimed).toLocaleString() }} units queued for claim
          </span>
        </div>
        <div class="mt-4 h-1 w-full overflow-hidden rounded-full bg-surface-container">
          <div
            class="h-full rounded-full bg-secondary"
            :style="{ width: `${Math.min(100, (pendingCount || activeCount) * 12 || 8)}%` }"
          />
        </div>
      </div>

      <div class="group relative flex flex-col justify-between overflow-hidden rounded-xl bg-surface-container-lowest p-5 shadow-sm transition-shadow hover:shadow-md">
        <div class="flex items-center justify-between">
          <span class="font-label-caps text-xs text-on-surface-variant">IN-TRANSIT TO TURF HUBS</span>
          <span class="flex h-8 w-8 items-center justify-center rounded-lg bg-surface-container-high text-primary">
            <span class="material-symbols-outlined text-[18px]">local_shipping</span>
          </span>
        </div>
        <div class="mt-4 flex flex-col">
          <div class="flex items-baseline gap-2">
            <span class="font-display-lg text-[40px] font-extrabold leading-[48px] text-primary">
              {{ inTransitCount || acceptedCount }}
            </span>
            <span class="font-label-caps text-xs font-semibold text-on-surface-variant">Dispatches</span>
          </div>
          <span class="mt-1 flex items-center gap-1 font-label-caps text-xs font-semibold text-on-tertiary-container">
            <span class="material-symbols-outlined text-[14px]">electric_bolt</span>
            {{ uniqueWards }} ward hubs · {{ activeCount }} live
          </span>
        </div>
        <div class="mt-4 h-1 w-full overflow-hidden rounded-full bg-surface-container">
          <div
            class="h-full rounded-full bg-action-green"
            :style="{ width: `${Math.min(100, (inTransitCount || acceptedCount) * 14 || 8)}%` }"
          />
        </div>
      </div>

      <div class="group relative flex flex-col justify-between overflow-hidden rounded-xl bg-surface-container-lowest p-5 shadow-sm transition-shadow hover:shadow-md">
        <div class="flex items-center justify-between">
          <span class="font-label-caps text-xs text-on-surface-variant">DELIVERED & IN-HAND</span>
          <span class="flex h-8 w-8 items-center justify-center rounded-lg bg-surface-container-high text-primary">
            <span class="material-symbols-outlined text-[18px]">how_to_vote</span>
          </span>
        </div>
        <div class="mt-4 flex flex-col">
          <div class="flex items-baseline gap-2">
            <span class="font-display-lg text-[40px] font-extrabold leading-[48px] text-primary">
              {{ totalClaimed.toLocaleString() }}
            </span>
            <span class="font-label-caps text-xs font-semibold text-action-green">▲ {{ claimPct }}%</span>
          </div>
          <span class="mt-1 font-label-caps text-xs text-on-surface-variant">
            {{ totalPackages.toLocaleString() }} published · {{ completedCount }} completed batches
          </span>
        </div>
        <div class="mt-4 h-1 w-full overflow-hidden rounded-full bg-surface-container">
          <div class="h-full rounded-full bg-primary" :style="{ width: `${claimPct || 8}%` }" />
        </div>
      </div>

      <div class="group relative flex flex-col justify-between overflow-hidden rounded-xl bg-surface-container-lowest p-5 shadow-sm transition-shadow hover:shadow-md">
        <div class="flex items-center justify-between">
          <span class="font-label-caps text-xs text-on-surface-variant">DEPOT STOCK CAPACITY</span>
          <span class="flex h-8 w-8 items-center justify-center rounded-lg bg-surface-container-high text-primary">
            <span class="material-symbols-outlined text-[18px]">warehouse</span>
          </span>
        </div>
        <div class="mt-4 flex flex-col">
          <div class="flex items-baseline gap-2">
            <span class="font-display-lg text-[40px] font-extrabold leading-[48px] text-primary">
              {{ remainingPct }}%
            </span>
            <span class="font-label-caps text-xs font-semibold text-action-green">
              {{ remainingPct >= 70 ? "Optimal" : remainingPct >= 40 ? "Watch" : "Low" }}
            </span>
          </div>
          <span class="mt-1 font-label-caps text-xs text-on-surface-variant">
            Remaining claim inventory across open batches
          </span>
        </div>
        <div class="mt-4 h-1 w-full overflow-hidden rounded-full bg-surface-container">
          <div class="h-full rounded-full bg-action-green" :style="{ width: `${remainingPct || 8}%` }" />
        </div>
      </div>
    </div>

    <!-- Builder -->
    <div
      ref="builderRef"
      class="flex flex-col gap-6 rounded-xl bg-surface-container-lowest p-6 shadow-sm transition ring-offset-2"
      :class="builderHighlight ? 'ring-2 ring-electric-pink shadow-md' : ''"
    >
      <div class="flex flex-col justify-between gap-2 pb-2 sm:flex-row sm:items-center">
        <div class="flex items-center gap-3">
          <div
            class="flex h-7 w-7 items-center justify-center rounded-full bg-primary font-label-caps text-xs font-bold text-pure-white"
          >
            01
          </div>
          <h2 class="font-headline-md text-xl font-bold tracking-tight text-primary">
            Autonomous Literature Trigger & Pack Dispatch Builder
          </h2>
        </div>
        <div class="flex items-center gap-2">
          <span class="font-label-caps text-xs text-on-surface-variant">REGIONAL AUTHORIZATION:</span>
          <span class="rounded-full bg-action-green/20 px-2 py-0.5 font-label-caps text-xs font-bold text-tertiary">
            VERIFIED
          </span>
        </div>
      </div>

      <div class="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <!-- Step 1 -->
        <div class="flex flex-col gap-3 rounded-xl bg-off-white p-4">
          <div class="flex items-center justify-between">
            <span class="font-label-caps text-xs font-bold text-primary">STEP 1: SELECT TURF</span>
            <span class="material-symbols-outlined text-[18px] text-outline">map</span>
          </div>
          <p class="font-body-md text-xs text-on-surface-variant">
            Target LGA and ward clusters, then optionally narrow to a polling unit.
          </p>
          <div class="mt-2 flex flex-col gap-2">
            <label class="block">
              <span class="font-label-caps text-[10px] uppercase text-outline">State</span>
              <select
                v-model="form.state"
                class="mt-1 w-full rounded-lg bg-surface-container-lowest px-3 py-2.5 text-sm text-primary outline-none"
              >
                <option>Ogun State</option>
              </select>
            </label>
            <label class="block">
              <span class="font-label-caps text-[10px] uppercase text-outline">LGA</span>
              <select
                v-model="form.lga"
                class="mt-1 w-full rounded-lg bg-surface-container-lowest px-3 py-2.5 text-sm text-primary outline-none"
              >
                <option value="">Select LGA</option>
                <option v-for="g in lgas" :key="g" :value="g">{{ g }}</option>
              </select>
            </label>
            <label class="block">
              <span class="font-label-caps text-[10px] uppercase text-outline">Ward</span>
              <select
                v-model="form.ward"
                class="mt-1 w-full rounded-lg bg-surface-container-lowest px-3 py-2.5 text-sm text-primary outline-none disabled:opacity-50"
                :disabled="!form.lga"
              >
                <option value="">Select ward</option>
                <option v-for="w in wards" :key="w" :value="w">{{ w }}</option>
              </select>
            </label>
            <label class="block">
              <span class="font-label-caps text-[10px] uppercase text-outline">Polling unit (optional)</span>
              <input
                v-model="form.polling_unit_code"
                type="text"
                class="mt-1 w-full rounded-lg bg-surface-container-lowest px-3 py-2.5 text-sm text-primary outline-none"
                placeholder="e.g. 27-01-01-001"
              />
            </label>
            <label class="block">
              <span class="font-label-caps text-[10px] uppercase text-outline">Audience</span>
              <select
                v-model="form.audience"
                class="mt-1 w-full rounded-lg bg-surface-container-lowest px-3 py-2.5 text-sm text-primary outline-none"
              >
                <option value="both">Voters & members</option>
                <option value="voter">Voters only</option>
                <option value="member">Members only</option>
              </select>
            </label>
          </div>
          <div class="mt-2 flex items-center justify-between border-t border-surface-container pt-2">
            <span class="font-label-caps text-[11px] text-on-surface-variant">Assigned HQ:</span>
            <span class="font-button-text text-xs font-bold text-primary">
              {{ admin?.name || "Chapter Ops" }}
            </span>
          </div>
        </div>

        <!-- Step 2 -->
        <div class="flex flex-col gap-3 rounded-xl bg-off-white p-4">
          <div class="flex items-center justify-between gap-2">
            <span class="font-label-caps text-xs font-bold text-primary">STEP 2: BUNDLE ARCHETYPE</span>
            <div class="flex items-center gap-1.5">
              <button
                v-if="customKits.length"
                type="button"
                class="inline-flex h-8 items-center gap-1 rounded-lg bg-surface-container-lowest px-2.5 font-label-caps text-[10px] font-bold text-outline shadow-sm transition hover:bg-surface-container hover:text-error"
                @click="openManageKits"
              >
                <span class="material-symbols-outlined text-[14px]">delete_sweep</span>
                Manage
              </button>
              <button
                type="button"
                class="inline-flex h-8 items-center gap-1 rounded-lg bg-surface-container-lowest px-2.5 font-label-caps text-[10px] font-bold text-electric-pink shadow-sm transition hover:bg-surface-container"
                @click="openAddKit"
              >
                <span class="material-symbols-outlined text-[14px]">add</span>
                Add kit
              </button>
            </div>
          </div>
          <p class="font-body-md text-xs text-on-surface-variant">
            Select a collateral kit; title follows the archetype for the field agent list. Use Delete on any kit to remove it.
          </p>
          <div class="mt-2 flex max-h-64 flex-col gap-2 overflow-y-auto pr-0.5">
            <div
              v-for="b in bundleOptions"
              :key="b.id"
              class="flex items-start gap-2 rounded-lg bg-surface-container-lowest p-3 transition-all hover:bg-surface-container-low"
              :class="bundleId === b.id ? 'ring-2 ring-electric-pink/35' : ''"
            >
              <label class="flex min-w-0 flex-1 cursor-pointer items-start gap-2.5">
                <input v-model="bundleId" type="radio" class="mt-0.5 h-4 w-4 shrink-0 accent-electric-pink" :value="b.id" />
                <div class="min-w-0 flex-1 flex-col">
                  <span class="font-button-text text-sm font-semibold text-primary">{{ b.title }}</span>
                  <span class="block font-body-md text-[11px] text-on-surface-variant">{{ b.detail }}</span>
                  <span class="mt-1 font-label-caps text-[10px] font-bold text-action-green">
                    STOCK: {{ b.stockLabel }}
                  </span>
                </div>
              </label>
              <button
                type="button"
                class="inline-flex h-9 shrink-0 items-center gap-1 self-center rounded-lg bg-error-container/50 px-2.5 font-label-caps text-[10px] font-bold text-error transition hover:bg-error hover:text-on-error disabled:opacity-50"
                title="Delete kit"
                :disabled="kitBusy || deletingKitId === b.id || deletingKitId === b.id.replace(/^custom:/, '')"
                @click="deleteBundle(b)"
              >
                <span class="material-symbols-outlined text-[18px]">delete</span>
                Delete
              </button>
            </div>
          </div>
          <label class="mt-1 block">
            <span class="font-label-caps text-[10px] uppercase text-outline">Distribution title</span>
            <input
              v-model="form.title"
              type="text"
              class="mt-1 w-full rounded-lg bg-surface-container-lowest px-3 py-2 text-sm text-primary outline-none"
            />
          </label>
        </div>

        <!-- Step 3 -->
        <div class="flex flex-col gap-3 rounded-xl bg-off-white p-4">
          <div class="flex items-center justify-between">
            <span class="font-label-caps text-xs font-bold text-primary">STEP 3: DISPATCH & BUDGET</span>
            <span class="material-symbols-outlined text-[18px] text-outline">local_shipping</span>
          </div>
          <p class="font-body-md text-xs text-on-surface-variant">
            Choose logistics priority and package count mode before transmitting the batch.
          </p>
          <div class="mt-2 flex flex-col gap-2">
            <label
              v-for="d in dispatchOptions"
              :key="d.id"
              class="flex cursor-pointer items-center justify-between rounded-lg bg-surface-container-lowest p-3 transition-all hover:bg-surface-container-low"
              :class="dispatchMode === d.id ? 'ring-2 ring-electric-pink/35' : ''"
            >
              <div class="flex items-center gap-2.5">
                <input v-model="dispatchMode" type="radio" class="h-4 w-4 accent-electric-pink" :value="d.id" />
                <div class="flex flex-col">
                  <span class="font-button-text text-sm font-semibold text-primary">{{ d.title }}</span>
                  <span class="font-label-caps text-[11px] text-on-surface-variant">{{ d.detail }}</span>
                </div>
              </div>
              <span
                class="font-label-caps text-[11px] font-bold"
                :class="d.id === 'hub' ? 'text-action-green' : 'text-primary'"
              >
                {{ d.eta }}
              </span>
            </label>
          </div>

          <div class="mt-1 rounded-lg bg-surface-container p-3">
            <label class="flex items-center gap-2 text-xs text-on-surface">
              <input v-model="form.auto_count" type="checkbox" class="rounded accent-electric-pink" />
              Auto-count packages from eligible audience
            </label>
            <input
              v-if="!form.auto_count"
              v-model.number="form.package_count"
              type="number"
              min="1"
              class="mt-2 w-full rounded-lg bg-surface-container-lowest px-3 py-2 text-sm outline-none"
              placeholder="Manual package count"
            />
          </div>

          <div class="mt-1 flex flex-col gap-1.5 rounded-lg bg-surface-container p-3">
            <div class="flex items-center justify-between font-label-caps text-xs">
              <span class="text-on-surface-variant">CHAPTER HEADROOM:</span>
              <span class="font-bold text-primary">{{ formatNaira(chapterHeadroom) }}</span>
            </div>
            <div class="flex items-center justify-between font-button-text text-sm">
              <span class="text-primary">Order Est. Total:</span>
              <span class="text-base font-bold text-electric-pink">{{ formatNaira(orderEstimateNaira) }}</span>
            </div>
            <div class="h-1 w-full overflow-hidden rounded-full bg-surface-container-highest">
              <div
                class="h-full rounded-full bg-primary"
                :style="{ width: `${Math.min(40, Math.round(orderEstimateNaira / 60000) || 4)}%` }"
              />
            </div>
          </div>
        </div>
      </div>

      <div class="flex flex-col items-center justify-between gap-4 pt-2 sm:flex-row">
        <div class="flex items-center gap-2 font-body-md text-xs text-on-surface-variant">
          <span class="material-symbols-outlined text-[18px] text-action-green">verified_user</span>
          <span>
            Automatic dispatch manifest verification passes civic compliance checks for the selected ward turf.
          </span>
        </div>
        <button
          type="button"
          class="inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-primary px-6 font-button-text text-sm font-semibold text-pure-white shadow-sm transition hover:bg-primary-container disabled:opacity-50 sm:w-auto"
          :disabled="busy || !form.lga || !form.ward"
          @click="submit"
        >
          <span class="material-symbols-outlined text-[18px]" :class="busy ? 'animate-spin' : ''">
            {{ busy ? "progress_activity" : "local_shipping" }}
          </span>
          <span>{{ busy ? "Transmitting…" : "Confirm & Transmit Batch Pack Order" }}</span>
        </button>
      </div>
    </div>

    <!-- Pipeline + telemetry -->
    <div class="grid grid-cols-1 gap-6 xl:grid-cols-3">
      <div class="flex flex-col gap-4 rounded-xl bg-surface-container-lowest p-6 shadow-sm xl:col-span-2">
        <div class="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
          <div class="flex items-center gap-2">
            <h2 class="font-headline-md text-xl font-bold text-primary">Active Fulfillment & Dispatch Pipeline</h2>
            <span class="rounded-full bg-surface-container px-2 py-0.5 font-label-caps text-xs font-semibold text-primary">
              {{ filteredItems.length }} listed
            </span>
          </div>
          <div class="flex items-center gap-2">
            <span class="font-label-caps text-xs text-on-surface-variant">FILTER:</span>
            <select
              v-model="statusFilter"
              class="cursor-pointer rounded-lg bg-surface-container-low px-2.5 py-1.5 font-body-md text-xs text-on-surface outline-none"
            >
              <option value="all">All Dispatches</option>
              <option value="active">Queued / Active</option>
              <option value="accepted">En Route / Accepted</option>
              <option value="completed">Delivered to Lead</option>
            </select>
          </div>
        </div>

        <div v-if="loading" class="py-10 text-center text-sm text-on-surface-variant">Loading pipeline…</div>
        <div v-else-if="!pageItems.length" class="py-10 text-center text-sm text-on-surface-variant">
          No package batches yet. Transmit a batch above.
        </div>
        <div v-else class="w-full overflow-x-auto">
          <table class="w-full text-left">
            <thead>
              <tr
                class="bg-surface-container-low font-label-caps text-[11px] uppercase tracking-wider text-on-surface-variant"
              >
                <th class="rounded-l-lg px-3 py-3">Batch ID</th>
                <th class="px-3 py-3">Target Turf</th>
                <th class="px-3 py-3">Collateral Bundle</th>
                <th class="px-3 py-3">Quantity</th>
                <th class="px-3 py-3">Logistics Status</th>
                <th class="px-3 py-3">Ward Lead</th>
                <th class="rounded-r-lg px-3 py-3 text-right">Claimed</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-surface-container-low font-body-md text-sm">
              <tr
                v-for="item in pageItems"
                :key="item.id"
                class="transition-colors hover:bg-surface-container-low/50"
              >
                <td class="px-3 py-3.5">
                  <div class="flex items-center gap-1.5 font-label-caps text-xs font-bold text-primary">
                    <span
                      class="material-symbols-outlined text-[16px]"
                      :class="
                        statusTone(item) === 'pink'
                          ? 'text-electric-pink'
                          : statusTone(item) === 'green'
                            ? 'text-action-green'
                            : 'text-outline'
                      "
                    >
                      {{ item.status === "completed" ? "task_alt" : "package_2" }}
                    </span>
                    {{ shortId(item.id) }}
                  </div>
                </td>
                <td class="px-3 py-3.5">
                  <div class="flex flex-col">
                    <span class="font-button-text text-sm font-semibold text-primary">{{ item.ward }}</span>
                    <span class="font-label-caps text-[11px] text-on-surface-variant">
                      {{ item.lga }} · {{ item.state }}
                    </span>
                  </div>
                </td>
                <td class="px-3 py-3.5">
                  <span
                    class="inline-flex max-w-[180px] items-center gap-1 truncate rounded-full bg-surface-container px-2.5 py-0.5 text-xs font-medium text-primary"
                    :title="item.title"
                  >
                    {{ item.title }}
                  </span>
                </td>
                <td class="px-3 py-3.5 font-label-caps text-xs font-bold text-primary">
                  {{ item.package_count.toLocaleString() }} pcs
                </td>
                <td class="px-3 py-3.5">
                  <div class="flex items-center gap-1.5">
                    <span
                      class="h-2 w-2 rounded-full"
                      :class="{
                        'animate-pulse bg-electric-pink': statusTone(item) === 'pink',
                        'bg-action-green': statusTone(item) === 'green',
                        'bg-outline': statusTone(item) === 'outline',
                        'bg-deep-navy': statusTone(item) === 'navy',
                      }"
                    />
                    <span
                      class="font-label-caps text-xs font-semibold"
                      :class="{
                        'text-electric-pink': statusTone(item) === 'pink',
                        'text-action-green': statusTone(item) === 'green',
                        'text-on-surface-variant': statusTone(item) === 'outline' || statusTone(item) === 'navy',
                      }"
                    >
                      {{ statusLabel(item) }}
                    </span>
                  </div>
                </td>
                <td class="px-3 py-3.5">
                  <div class="flex items-center gap-2">
                    <div
                      class="flex h-6 w-6 items-center justify-center rounded-full bg-secondary-fixed font-label-caps text-[10px] font-bold text-on-secondary-fixed"
                    >
                      {{ agentInitials(item.agent_name) }}
                    </div>
                    <span class="font-button-text text-xs text-primary">
                      {{ item.agent_name || "Unassigned" }}
                    </span>
                  </div>
                </td>
                <td class="px-3 py-3.5 text-right font-label-caps text-xs font-bold text-primary">
                  {{ item.packages_claimed }}/{{ item.package_count }}
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <div v-if="filteredItems.length" class="flex items-center justify-between pt-2">
          <span class="font-label-caps text-xs text-on-surface-variant">
            Showing {{ pageItems.length }} of {{ filteredItems.length }} shipments
          </span>
          <div class="flex items-center gap-2">
            <button
              type="button"
              class="inline-flex h-9 items-center justify-center rounded-lg bg-surface-container px-3 font-button-text text-xs font-semibold text-primary transition hover:bg-surface-container-high disabled:opacity-40"
              :disabled="page <= 1"
              @click="page--"
            >
              Previous
            </button>
            <span class="px-1 font-label-caps text-xs text-on-surface-variant">{{ page }} / {{ totalPages }}</span>
            <button
              type="button"
              class="inline-flex h-9 items-center justify-center rounded-lg bg-primary px-3 font-button-text text-xs font-semibold text-pure-white transition hover:bg-primary-container disabled:opacity-40"
              :disabled="page >= totalPages"
              @click="page++"
            >
              Next
            </button>
          </div>
        </div>
      </div>

      <!-- Telemetry -->
      <div class="flex flex-col gap-5 rounded-xl bg-surface-container-lowest p-6 shadow-sm">
        <div class="flex items-center justify-between">
          <h2 class="font-headline-md text-xl font-bold text-primary">Hub Telemetry & Stock</h2>
          <span class="rounded-full bg-action-green/20 px-2 py-0.5 font-label-caps text-[10px] font-bold text-tertiary">
            FLEET ONLINE
          </span>
        </div>

        <div class="flex flex-col gap-2">
          <div class="flex items-center justify-between">
            <span class="font-label-caps text-xs font-semibold text-on-surface-variant">FIELD HUB DISPATCH (OGUN)</span>
            <span class="font-label-caps text-xs font-bold text-electric-pink">LIVE</span>
          </div>
          <div
            class="relative flex h-44 items-end overflow-hidden rounded-xl bg-gradient-to-br from-deep-navy via-primary to-deep-navy p-3 shadow-inner"
          >
            <div class="absolute inset-0 bg-[radial-gradient(circle_at_30%_40%,rgba(146,216,10,0.25),transparent_55%),radial-gradient(circle_at_70%_60%,rgba(255,56,127,0.2),transparent_50%)]" />
            <div class="absolute left-1/2 top-1/3 z-10 flex -translate-x-1/2 -translate-y-1/2 flex-col items-center">
              <span
                class="flex items-center gap-1 rounded-full bg-deep-navy px-2 py-0.5 font-label-caps text-[10px] text-pure-white shadow-lg"
              >
                <span class="h-1.5 w-1.5 animate-ping rounded-full bg-electric-pink" />
                {{ liveRouteLabel }}
              </span>
              <span class="material-symbols-outlined text-[28px] text-electric-pink drop-shadow-md">local_shipping</span>
            </div>
            <div
              class="relative z-10 flex w-full items-center justify-between rounded-lg bg-deep-navy/90 px-3 py-2 text-xs text-pure-white backdrop-blur-md"
            >
              <span class="font-label-caps text-[10px]">Route OG-PKG-{{ activeCount || 1 }}</span>
              <span class="font-label-caps text-[10px] font-bold text-action-green">On Schedule</span>
            </div>
          </div>
        </div>

        <div class="flex flex-col gap-3 pt-2">
          <div class="flex items-center justify-between">
            <span class="font-label-caps text-xs font-semibold text-on-surface-variant">REGIONAL DEPOT INVENTORY</span>
            <button
              type="button"
              class="inline-flex h-8 items-center rounded-lg px-2 font-label-caps text-xs font-bold text-secondary transition hover:bg-surface-container disabled:opacity-50"
              :disabled="syncing || loading"
              @click="syncWarehouseInventory"
            >
              {{ syncing ? "Syncing…" : "Refresh Specs" }}
            </button>
          </div>
          <div class="flex flex-col gap-2">
            <div
              v-for="row in stockRows"
              :key="row.label"
              class="flex flex-col gap-1 rounded-lg bg-surface-container-low p-2.5"
            >
              <div class="flex items-center justify-between text-xs">
                <span class="font-button-text font-medium text-primary">{{ row.label }}</span>
                <span class="font-label-caps font-bold text-primary">
                  {{ row.used.toLocaleString() }} / {{ row.total.toLocaleString() }}
                </span>
              </div>
              <div class="h-1.5 w-full overflow-hidden rounded-full bg-surface-container">
                <div
                  class="h-full rounded-full"
                  :class="row.warn ? 'bg-secondary' : stockPct(row.used, row.total) > 80 ? 'bg-action-green' : 'bg-primary'"
                  :style="{ width: `${stockPct(row.used, row.total) || 4}%` }"
                />
              </div>
              <span
                v-if="row.warn"
                class="mt-0.5 flex items-center gap-1 font-label-caps text-[10px] font-semibold text-secondary"
              >
                <span class="material-symbols-outlined text-[12px]">warning</span>
                High claim rate — consider a new batch
              </span>
            </div>
          </div>
        </div>

        <div class="flex flex-col gap-2 pt-2">
          <span class="font-label-caps text-xs font-semibold text-on-surface-variant">
            {{ form.lga || "OGUN" }} CENTRAL PACK STAGING
          </span>
          <div class="group relative overflow-hidden rounded-xl bg-deep-navy">
            <div
              class="flex h-28 items-end bg-gradient-to-tr from-deep-navy via-primary-container to-deep-navy p-2.5 transition-transform duration-300 group-hover:scale-[1.02]"
            >
              <div class="absolute inset-0 opacity-40">
                <div class="absolute left-4 top-4 h-10 w-16 rounded bg-action-green/30" />
                <div class="absolute right-8 top-8 h-8 w-12 rounded bg-electric-pink/25" />
                <div class="absolute bottom-10 left-1/3 h-6 w-20 rounded bg-pure-white/10" />
              </div>
              <div class="relative z-10 flex w-full items-center justify-between text-pure-white">
                <span class="font-label-caps text-[11px] font-semibold">
                  Shift Pack Bay · {{ activeCount }} active
                </span>
                <span class="rounded bg-action-green px-2 py-0.5 font-label-caps text-[10px] font-bold text-tertiary">
                  {{ claimPct || 99 }}% QA
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <Teleport to="body">
      <div
        v-if="showManageKits"
        class="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
        @click.self="showManageKits = false"
      >
        <div class="flex w-full max-w-md flex-col overflow-hidden rounded-2xl bg-surface-container-lowest shadow-2xl">
          <header class="flex items-start justify-between gap-3 border-b border-outline-variant/30 px-5 py-4">
            <div>
              <h2 class="font-button-text text-lg font-bold text-primary">Manage collateral kits</h2>
              <p class="mt-1 text-xs text-outline">Remove custom kits you no longer need. Built-in archetypes stay available.</p>
            </div>
            <button type="button" class="rounded-lg p-1.5 text-outline hover:bg-surface-container" @click="showManageKits = false">
              <span class="material-symbols-outlined text-[20px]">close</span>
            </button>
          </header>
          <div class="max-h-[60vh] space-y-2 overflow-y-auto px-5 py-4">
            <p v-if="!customKits.length" class="py-6 text-center text-sm text-outline">No custom kits yet.</p>
            <div
              v-for="kit in customKits"
              :key="kit.id"
              class="flex items-start justify-between gap-3 rounded-xl bg-off-white p-3"
            >
              <div class="min-w-0">
                <p class="truncate font-button-text text-sm font-semibold text-primary">{{ kit.title }}</p>
                <p class="mt-0.5 line-clamp-2 text-xs text-on-surface-variant">
                  {{ kit.detail || "Custom collateral kit" }}
                </p>
              </div>
              <button
                type="button"
                class="inline-flex h-9 shrink-0 items-center gap-1 rounded-xl bg-error-container/50 px-3 font-label-caps text-[10px] font-bold text-error transition hover:bg-error hover:text-on-error disabled:opacity-50"
                :disabled="kitBusy || deletingKitId === kit.id"
                @click="removeKit(kit.id)"
              >
                <span class="material-symbols-outlined text-[16px]">delete</span>
                {{ deletingKitId === kit.id ? "Deleting…" : "Delete" }}
              </button>
            </div>
          </div>
          <footer class="flex justify-end border-t border-outline-variant/30 px-5 py-4">
            <button
              type="button"
              class="inline-flex h-10 items-center rounded-xl bg-surface-container px-4 font-button-text text-sm font-semibold text-on-surface"
              @click="showManageKits = false"
            >
              Done
            </button>
          </footer>
        </div>
      </div>

      <div
        v-if="showAddKit"
        class="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
        @click.self="showAddKit = false"
      >
        <div class="flex w-full max-w-md flex-col overflow-hidden rounded-2xl bg-surface-container-lowest shadow-2xl">
          <header class="flex items-start justify-between gap-3 border-b border-outline-variant/30 px-5 py-4">
            <div>
              <h2 class="font-button-text text-lg font-bold text-primary">Add collateral kit</h2>
              <p class="mt-1 text-xs text-outline">Create a reusable pack archetype for future distribution batches.</p>
            </div>
            <button type="button" class="rounded-lg p-1.5 text-outline hover:bg-surface-container" @click="showAddKit = false">
              <span class="material-symbols-outlined text-[20px]">close</span>
            </button>
          </header>
          <div class="space-y-3 px-5 py-4">
            <label class="block text-xs font-semibold text-outline">
              Kit title
              <input
                v-model="kitForm.title"
                type="text"
                class="mt-1 w-full rounded-xl bg-off-white px-3 py-2.5 text-sm font-normal text-on-surface outline-none"
                placeholder="e.g. Youth rally flag kit"
              />
            </label>
            <label class="block text-xs font-semibold text-outline">
              Description
              <textarea
                v-model="kitForm.detail"
                rows="2"
                class="mt-1 w-full rounded-xl bg-off-white px-3 py-2.5 text-sm font-normal text-on-surface outline-none"
                placeholder="What’s inside the pack?"
              />
            </label>
            <label class="block text-xs font-semibold text-outline">
              Distribution title default
              <input
                v-model="kitForm.form_title"
                type="text"
                class="mt-1 w-full rounded-xl bg-off-white px-3 py-2.5 text-sm font-normal text-on-surface outline-none"
                placeholder="Defaults to kit title"
              />
            </label>
            <div class="grid grid-cols-2 gap-3">
              <label class="block text-xs font-semibold text-outline">
                Stock label
                <input
                  v-model="kitForm.stock_label"
                  type="text"
                  class="mt-1 w-full rounded-xl bg-off-white px-3 py-2.5 text-sm font-normal text-on-surface outline-none"
                />
              </label>
              <label class="block text-xs font-semibold text-outline">
                Default audience
                <select
                  v-model="kitForm.default_audience"
                  class="mt-1 w-full rounded-xl bg-off-white px-3 py-2.5 text-sm font-normal text-on-surface outline-none"
                >
                  <option value="both">Voters & members</option>
                  <option value="voter">Voters only</option>
                  <option value="member">Members only</option>
                </select>
              </label>
            </div>
          </div>
          <footer class="flex justify-end gap-2 border-t border-outline-variant/30 px-5 py-4">
            <button
              type="button"
              class="inline-flex h-10 items-center rounded-xl bg-surface-container px-4 font-button-text text-sm font-semibold text-on-surface"
              @click="showAddKit = false"
            >
              Cancel
            </button>
            <button
              type="button"
              class="inline-flex h-10 items-center rounded-xl bg-electric-pink px-4 font-button-text text-sm font-semibold text-pure-white disabled:opacity-60"
              :disabled="kitBusy"
              @click="saveKit"
            >
              {{ kitBusy ? "Saving…" : "Save kit" }}
            </button>
          </footer>
        </div>
      </div>
    </Teleport>
  </div>
</template>
