<script setup lang="ts">
type AuditParty = {
  code: string;
  name: string;
  color: string;
  candidate?: string;
  sort_order: number;
};

type AuditStanding = {
  code: string;
  name: string;
  candidate?: string;
  color: string;
  votes: number;
  share: number;
};

type AuditLgaRow = {
  name: string;
  pu_total: number;
  uploaded: number;
  collated: number;
  progress_pct: number;
  party_votes: Record<string, number>;
  total_votes: number;
  write_in: number;
  clean: boolean;
};

type AuditBoard = {
  state: string;
  election: string;
  unofficial: boolean;
  updated_at: string | null;
  parties: AuditParty[];
  totals: {
    polling_units: number;
    uploaded: number;
    pending: number;
    upload_pct: number;
    collated: number;
    total_votes: number;
    leading_code: string | null;
    leading_name: string | null;
    leading_share: number | null;
  };
  standings: AuditStanding[];
  lgas: AuditLgaRow[];
};

type AuditWard = {
  name: string;
  pu_total: number;
  uploaded: number;
  progress_pct: number;
};

type AuditUnit = {
  code: string;
  name: string;
  ward: string;
  uploaded: boolean;
  auto: boolean;
  sheet_id: string | null;
  photo_url: string | null;
  party_votes: Record<string, number>;
  votes: number;
  accredited_voters: number | null;
  registered_voters: number | null;
  irev: boolean | null;
};

type AuditExplorer = {
  lga: string;
  pu_total: number;
  uploaded: number;
  progress_pct: number;
  wards: AuditWard[];
  units: AuditUnit[];
};

type AuditTab = "standings" | "explorer" | "matrix";

const props = withDefaults(
  defineProps<{
    apiBase: string;
    embedded?: boolean;
  }>(),
  { embedded: false },
);

const activeTab = ref<AuditTab>("standings");
const loading = ref(false);
const explorerLoading = ref(false);
const error = ref("");
const board = ref<AuditBoard | null>(null);
const explorer = ref<AuditExplorer | null>(null);
const selectedLga = ref("");
const standingsLga = ref("");
const selectedWard = ref("");
const selectedUnitCode = ref("");
const puQuery = ref("");
const lgaQuery = ref("");
const zoom = ref(1);
const sheetOpen = ref(false);
const expandedMatrix = ref("");

const tabs = [
  { id: "standings" as const, label: "Standings", full: "State Standings", icon: "leaderboard" },
  { id: "explorer" as const, label: "Explorer", full: "Collation Explorer", icon: "travel_explore" },
  { id: "matrix" as const, label: "Matrix", full: "Collation Matrix", icon: "grid_on" },
];

const standingParties = computed(() =>
  (board.value?.parties ?? []).filter((party) => party.code !== "WRITE-IN"),
);
const matrixParties = computed(() => board.value?.parties ?? []);

const scopedStandings = computed<AuditStanding[]>(() => {
  const parties = standingParties.value;
  const lga = standingsLga.value
    ? (board.value?.lgas ?? []).find((row) => row.name === standingsLga.value)
    : null;
  if (!lga) {
    return (board.value?.standings ?? []).map((row) => ({
      ...row,
      candidate: row.candidate || parties.find((party) => party.code === row.code)?.candidate || "",
    }));
  }
  const total = parties.reduce((sum, party) => sum + (lga.party_votes[party.code] || 0), 0);
  return [...parties]
    .map((party) => {
      const votes = lga.party_votes[party.code] || 0;
      return {
        code: party.code,
        name: party.name,
        candidate: party.candidate || "",
        color: party.color,
        votes,
        share: total ? Math.round((votes / total) * 1000) / 10 : 0,
      };
    })
    .sort((a, b) => b.votes - a.votes || a.code.localeCompare(b.code));
});

const scopedTotal = computed(() => {
  const lga = standingsLga.value
    ? (board.value?.lgas ?? []).find((row) => row.name === standingsLga.value)
    : null;
  if (lga) return lga.total_votes || scopedStandings.value.reduce((sum, row) => sum + row.votes, 0);
  return board.value?.totals.total_votes ?? scopedStandings.value.reduce((sum, row) => sum + row.votes, 0);
});

const leader = computed(() => scopedStandings.value.find((row) => row.votes > 0) || null);

const donutStyle = computed(() => {
  const rows = scopedStandings.value;
  const total = rows.reduce((sum, row) => sum + row.votes, 0);
  if (!total) return { background: "conic-gradient(#E4E2E6 0 100%)" };
  let cursor = 0;
  const stops: string[] = [];
  for (const row of rows) {
    if (row.votes <= 0) continue;
    const start = cursor;
    cursor += (row.votes / total) * 100;
    stops.push(`${row.color} ${start}% ${cursor}%`);
  }
  if (!stops.length) return { background: "conic-gradient(#E4E2E6 0 100%)" };
  return { background: `conic-gradient(${stops.join(", ")})` };
});

const barMax = computed(() => Math.max(1, ...scopedStandings.value.map((row) => row.votes)));
const donutLegend = computed(() => scopedStandings.value.filter((row) => row.votes > 0).slice(0, 6));

function displayName(row: { candidate?: string; name: string }) {
  return row.candidate?.trim() || row.name;
}

const filteredLgas = computed(() => {
  const query = lgaQuery.value.trim().toLowerCase();
  const rows = board.value?.lgas ?? [];
  if (!query) return rows;
  return rows.filter((row) => row.name.toLowerCase().includes(query));
});

const selectedLgaMeta = computed(
  () => (board.value?.lgas ?? []).find((row) => row.name === selectedLga.value) || null,
);

const wardUnits = computed(() => {
  const units = explorer.value?.units ?? [];
  const ward = selectedWard.value;
  const query = puQuery.value.trim().toLowerCase();
  return units.filter((unit) => {
    if (ward && unit.ward !== ward) return false;
    if (!query) return true;
    return unit.name.toLowerCase().includes(query) || unit.code.toLowerCase().includes(query);
  });
});

const selectedUnit = computed(() => {
  const units = explorer.value?.units ?? [];
  return units.find((unit) => unit.code === selectedUnitCode.value) || wardUnits.value[0] || null;
});

const transcribedParties = computed(() => standingParties.value);
const transcribedSum = computed(() => {
  const unit = selectedUnit.value;
  if (!unit) return 0;
  return transcribedParties.value.reduce((sum, party) => sum + (unit.party_votes[party.code] || 0), 0);
});
const verification = computed(() => {
  const unit = selectedUnit.value;
  if (!unit) return null;
  const sum = transcribedSum.value;
  const box7 = unit.accredited_voters;
  const bottom = unit.votes;
  const matchesBox7 = box7 == null || sum === box7;
  const matchesBottom = bottom === 0 || sum === bottom || (sum === 0 && bottom === 0);
  const ok = matchesBox7 && (box7 != null ? matchesBottom || sum === bottom : matchesBottom);
  return { sum, box7, bottom, ok: Boolean(unit.uploaded) && ok && (sum > 0 || bottom === 0) };
});

const selectedWardMeta = computed(
  () => (explorer.value?.wards ?? []).find((ward) => ward.name === selectedWard.value) || null,
);

function auditUrl(path: string, query?: Record<string, string>) {
  const base = String(props.apiBase || "http://127.0.0.1:8000").replace(/\/+$/, "");
  const url = new URL(path, `${base}/`);
  if (query) {
    for (const [key, value] of Object.entries(query)) url.searchParams.set(key, value);
  }
  return url.toString();
}

async function fetchJson<T>(path: string, query?: Record<string, string>): Promise<T> {
  const response = await fetch(auditUrl(path, query));
  if (!response.ok) throw new Error(`Request failed (${response.status})`);
  return (await response.json()) as T;
}

watch(activeTab, (tab) => {
  sheetOpen.value = false;
  if (tab === "explorer") void ensureExplorer();
});

watch(selectedLga, (name, previous) => {
  if (!name || name === previous) return;
  if (activeTab.value === "explorer") void loadExplorer(name);
});

async function loadBoard() {
  loading.value = true;
  error.value = "";
  try {
    const data = await fetchJson<AuditBoard>("/public/audit/board");
    board.value = data;
    if (!selectedLga.value && data.lgas.length) selectedLga.value = data.lgas[0].name;
  } catch {
    error.value = "Could not load the Ogun collation dashboard. Try again shortly.";
    board.value = null;
  } finally {
    loading.value = false;
  }
}

async function ensureExplorer() {
  if (!selectedLga.value && board.value?.lgas.length) selectedLga.value = board.value.lgas[0].name;
  if (!selectedLga.value) return;
  if (explorer.value?.lga === selectedLga.value) return;
  await loadExplorer(selectedLga.value);
}

async function loadExplorer(lga: string) {
  explorerLoading.value = true;
  sheetOpen.value = false;
  try {
    const data = await fetchJson<AuditExplorer>("/public/audit/explorer", { lga });
    explorer.value = data;
    selectedLga.value = data.lga;
    const firstWard = data.wards[0]?.name || "";
    selectedWard.value = firstWard;
    const firstUnit =
      data.units.find((unit) => unit.ward === firstWard && unit.uploaded) ||
      data.units.find((unit) => unit.ward === firstWard);
    selectedUnitCode.value = firstUnit?.code || "";
    puQuery.value = "";
    zoom.value = 1;
  } catch {
    explorer.value = null;
  } finally {
    explorerLoading.value = false;
  }
}

function selectStandingLga(name: string) {
  standingsLga.value = standingsLga.value === name ? "" : name;
}

function openLgaInExplorer(name: string) {
  selectedLga.value = name;
  standingsLga.value = name;
  activeTab.value = "explorer";
  void loadExplorer(name);
}

function selectWard(name: string) {
  selectedWard.value = name;
  sheetOpen.value = false;
  const first =
    (explorer.value?.units ?? []).find((unit) => unit.ward === name && unit.uploaded) ||
    (explorer.value?.units ?? []).find((unit) => unit.ward === name);
  selectedUnitCode.value = first?.code || "";
  zoom.value = 1;
}

function selectUnit(code: string) {
  selectedUnitCode.value = code;
  sheetOpen.value = true;
  zoom.value = 1;
}

function closeSheet() {
  sheetOpen.value = false;
}

function toggleMatrix(name: string) {
  expandedMatrix.value = expandedMatrix.value === name ? "" : name;
}

function formatNum(value: number | null | undefined) {
  if (value == null) return "—";
  return value.toLocaleString();
}

function formatPct(value: number | null | undefined, digits = 0) {
  if (value == null) return "0%";
  return `${value.toFixed(digits)}%`;
}

function formatStamp(iso: string | null | undefined) {
  if (!iso) return "Awaiting first return";
  return new Date(iso).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function photoSrc(unit: AuditUnit | null) {
  if (!unit?.photo_url) return "";
  const base = String(props.apiBase || "http://127.0.0.1:8000").replace(/\/+$/, "");
  return `${base}${unit.photo_url}`;
}

function openOriginal(unit: AuditUnit | null) {
  const src = photoSrc(unit);
  if (!src) return;
  window.open(src, "_blank", "noopener");
}

function exportCsv() {
  if (!board.value) return;
  const parties = matrixParties.value;
  const headers = [
    "LOCAL GOVERNMENT AREA",
    "PROGRESS",
    "AUDIT STATUS",
    ...parties.map((party) => party.code),
    "TOTAL VOTES",
  ];
  const lines = [headers.join(",")];
  for (const row of board.value.lgas) {
    const status = row.clean ? "100% Clean" : row.uploaded ? "Verified" : "Pending";
    lines.push(
      [
        `"${row.name}"`,
        `${row.uploaded}/${row.pu_total} (${row.progress_pct}%)`,
        status,
        ...parties.map((party) => String(row.party_votes[party.code] || 0)),
        String(row.total_votes),
      ].join(","),
    );
  }
  const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "ogun-lga-collation-matrix.csv";
  link.click();
  URL.revokeObjectURL(url);
}

function topParties(row: AuditLgaRow, count = 3) {
  return standingParties.value
    .map((party) => ({ ...party, votes: row.party_votes[party.code] || 0 }))
    .sort((a, b) => b.votes - a.votes)
    .slice(0, count);
}

onMounted(() => {
  void loadBoard();
});
</script>

<template>
  <div class="flex w-full flex-col pb-16" :class="embedded ? '' : 'min-h-screen bg-background px-4 pt-4 sm:px-6 lg:px-8'">
    <!-- Breadcrumb -->
    <div class="mb-2 flex flex-col justify-between gap-4 py-4 md:flex-row md:items-center">
      <div class="flex flex-wrap items-center gap-2">
        <span class="font-label-caps text-on-surface-variant">HQ CENTRAL COMMAND</span>
        <span class="font-label-caps text-outline-variant">/</span>
        <span class="font-label-caps text-on-surface-variant">OGUN OPERATIONS</span>
        <span class="font-label-caps text-outline-variant">/</span>
        <span class="font-label-caps font-semibold text-primary">TELEMETRY &amp; SECURITY</span>
        <div class="ml-1 flex items-center gap-1.5 rounded bg-surface-container-high px-2 py-0.5">
          <span class="relative flex h-1.5 w-1.5">
            <span class="absolute inline-flex h-full w-full animate-ping rounded-full bg-action-green opacity-60" />
            <span class="relative inline-flex h-1.5 w-1.5 rounded-full bg-action-green" />
          </span>
          <span class="font-label-caps text-xs font-semibold text-primary">LIVE AUDIT</span>
        </div>
      </div>
      <div class="flex flex-wrap items-center gap-3">
        <div class="flex items-center gap-2 rounded-full bg-surface-container-low px-3 py-1 shadow-sm">
          <span class="material-symbols-outlined text-[16px] text-action-green">verified_user</span>
          <span class="font-label-caps text-[11px] font-medium text-on-surface">
            {{ board?.unofficial !== false ? "UNOFFICIAL · EC8A" : "OFFICIAL FEED" }}
          </span>
        </div>
        <span class="font-label-caps text-xs text-outline">UPDATED {{ formatStamp(board?.updated_at) }}</span>
      </div>
    </div>

    <!-- Header -->
    <div class="flex flex-col justify-between gap-6 pb-6 xl:flex-row xl:items-end">
      <div class="max-w-3xl">
        <div class="mb-2 flex flex-wrap items-center gap-3">
          <span class="rounded-full bg-primary px-2.5 py-0.5 font-label-caps text-[11px] uppercase tracking-wider text-pure-white">
            Ogun State 2026
          </span>
          <span class="rounded-full bg-secondary-fixed px-2.5 py-0.5 font-label-caps text-[11px] font-medium text-on-secondary-fixed">
            Independent Collation
          </span>
        </div>
        <h1 class="font-headline-lg text-2xl tracking-tight text-primary sm:text-headline-md lg:text-[40px] lg:leading-[48px]">
          Telemetry &amp; Security
        </h1>
        <p class="mt-1.5 font-body-md leading-relaxed text-on-surface-variant">
          Unofficial independent audit from Form EC8A uploads — standings, ward explorer, and LGA matrix. Not an INEC declaration.
        </p>
      </div>
      <div class="grid w-full grid-cols-1 gap-2 sm:grid-cols-3 xl:w-auto xl:shrink-0">
        <NuxtLink
          to="/monitor"
          class="inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-surface-container-lowest px-4 font-button-text text-sm font-semibold text-primary shadow-sm transition hover:bg-surface-container-low"
        >
          <span class="material-symbols-outlined shrink-0 text-[18px] text-outline">videocam</span>
          <span class="truncate">Live Monitoring</span>
        </NuxtLink>
        <button
          type="button"
          class="inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-surface-container-lowest px-4 font-button-text text-sm font-semibold text-primary shadow-sm transition hover:bg-surface-container-low disabled:opacity-60"
          :disabled="loading"
          @click="loadBoard"
        >
          <span class="material-symbols-outlined shrink-0 text-[18px] text-outline" :class="loading ? 'animate-spin' : ''">
            refresh
          </span>
          <span class="truncate">Refresh Board</span>
        </button>
        <button
          type="button"
          class="inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-electric-pink px-4 font-button-text text-sm font-semibold text-pure-white shadow-sm shadow-electric-pink/25 transition hover:opacity-95"
          @click="exportCsv"
        >
          <span class="material-symbols-outlined shrink-0 text-[18px]">download</span>
          <span class="truncate">Export Matrix CSV</span>
        </button>
      </div>
    </div>

    <p
      v-if="error"
      class="mb-4 rounded-2xl bg-error-container/40 px-4 py-3 font-body-md text-sm text-error"
    >
      {{ error }}
    </p>

    <!-- KPI strip -->
    <div class="mb-6 grid grid-cols-2 gap-3 xl:grid-cols-4">
      <div class="flex flex-col justify-between rounded-2xl bg-surface-container-lowest p-4 shadow-sm sm:p-5">
        <div class="mb-2 flex items-center justify-between">
          <span class="font-label-caps text-on-surface-variant">Polling units</span>
          <span class="material-symbols-outlined text-[18px] text-outline">how_to_vote</span>
        </div>
        <p class="font-headline-md text-2xl font-bold tracking-tight text-primary sm:text-[28px]">
          {{ formatNum(board?.totals.polling_units ?? 0) }}
        </p>
        <p class="mt-1 font-label-caps text-xs text-outline">{{ board?.lgas.length ?? 0 }} LGAs</p>
      </div>
      <div class="flex flex-col justify-between rounded-2xl bg-surface-container-lowest p-4 shadow-sm sm:p-5">
        <div class="mb-2 flex items-center justify-between">
          <span class="font-label-caps text-on-surface-variant">Upload progress</span>
          <span class="rounded bg-surface-container px-2 py-0.5 font-label-caps text-xs font-semibold text-primary">
            {{ formatPct(board?.totals.upload_pct ?? 0, 1) }}
          </span>
        </div>
        <p class="font-headline-md text-2xl font-bold tracking-tight text-primary sm:text-[28px]">
          {{ formatNum(board?.totals.uploaded ?? 0) }}
          <span class="font-body-md text-base font-normal text-outline">/ {{ formatNum(board?.totals.polling_units ?? 0) }}</span>
        </p>
        <div class="mt-3 h-2 w-full overflow-hidden rounded-full bg-surface-container-high">
          <div
            class="h-full rounded-full bg-action-green transition-all duration-500"
            :style="{ width: `${Math.min(board?.totals.upload_pct ?? 0, 100)}%` }"
          />
        </div>
      </div>
      <div class="flex flex-col justify-between rounded-2xl bg-surface-container-lowest p-4 shadow-sm sm:p-5">
        <div class="mb-2 flex items-center justify-between">
          <span class="font-label-caps text-on-surface-variant">Sheets collated</span>
          <span class="material-symbols-outlined text-[18px] text-outline">fact_check</span>
        </div>
        <p class="font-headline-md text-2xl font-bold tracking-tight text-primary sm:text-[28px]">
          {{ formatNum(board?.totals.collated ?? 0) }}
        </p>
        <p class="mt-1 font-label-caps text-xs text-outline">Observer verified</p>
      </div>
      <div class="flex flex-col justify-between rounded-2xl bg-surface-container-lowest p-4 shadow-sm sm:p-5">
        <div class="mb-2 flex items-center justify-between">
          <span class="font-label-caps text-on-surface-variant">Collated votes</span>
          <span class="material-symbols-outlined text-[18px] text-outline">insights</span>
        </div>
        <p class="font-headline-md text-2xl font-bold tracking-tight text-primary sm:text-[28px]">
          {{ formatNum(board?.totals.total_votes ?? 0) }}
        </p>
        <p class="mt-1 font-label-caps text-xs text-outline">
          <span v-if="board?.totals.leading_code">
            Lead {{ board.totals.leading_code }} · {{ formatPct(board.totals.leading_share, 1) }}
          </span>
          <span v-else>Breakdown pending</span>
        </p>
      </div>
    </div>

    <!-- View tabs -->
    <div class="mb-6 flex flex-wrap gap-2" role="tablist" aria-label="Audit views">
      <button
        v-for="tab in tabs"
        :key="tab.id"
        type="button"
        role="tab"
        class="inline-flex h-11 items-center gap-2 rounded-xl px-4 font-button-text text-sm font-semibold transition"
        :class="
          activeTab === tab.id
            ? 'bg-primary text-pure-white shadow-sm'
            : 'bg-surface-container-lowest text-primary shadow-sm hover:bg-surface-container-low'
        "
        :aria-selected="activeTab === tab.id"
        @click="activeTab = tab.id"
      >
        <span class="material-symbols-outlined text-[18px]">{{ tab.icon }}</span>
        <span class="hidden sm:inline">{{ tab.full }}</span>
        <span class="sm:hidden">{{ tab.label }}</span>
      </button>
    </div>

    <!-- Standings -->
    <section v-if="activeTab === 'standings'" class="grid gap-4 xl:grid-cols-[minmax(0,1fr)_340px]">
      <div class="space-y-4">
        <div class="rounded-2xl bg-surface-container-lowest p-5 shadow-sm sm:p-6">
          <div class="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p class="font-label-caps text-on-surface-variant">
                {{ standingsLga || "Ogun State" }}
              </p>
              <h2 class="mt-1 font-headline-md text-xl font-bold text-primary">
                {{ standingsLga ? "LGA party standings" : "State party standings" }}
              </h2>
            </div>
            <button
              v-if="standingsLga"
              type="button"
              class="rounded-xl bg-surface-container px-3 py-1.5 font-label-caps text-[11px] font-semibold text-primary transition hover:bg-surface-container-high"
              @click="standingsLga = ''"
            >
              All LGAs
            </button>
          </div>

          <div class="mt-6 flex flex-col items-center gap-6 sm:flex-row sm:items-start">
            <div class="relative h-44 w-44 shrink-0 sm:h-48 sm:w-48">
              <div class="h-full w-full rounded-full shadow-inner" :style="donutStyle" />
              <div
                class="absolute inset-7 flex flex-col items-center justify-center rounded-full bg-surface-container-lowest text-center shadow-sm ring-1 ring-outline-variant/20"
              >
                <p class="font-label-caps text-[10px] text-outline">Votes</p>
                <p class="font-headline-md text-lg font-bold text-primary">{{ formatNum(scopedTotal) }}</p>
              </div>
            </div>
            <div class="min-w-0 flex-1">
              <p class="text-center font-label-caps text-on-surface-variant sm:text-left">Leading candidate</p>
              <p class="mt-1 text-center font-headline-md text-xl font-bold text-primary sm:text-left">
                {{ leader ? displayName(leader) : "Awaiting party totals" }}
              </p>
              <p class="mt-1 text-center font-body-md text-sm text-on-surface-variant sm:text-left">
                <span v-if="leader">
                  {{ leader.code }} · {{ leader.name }} · {{ formatNum(leader.votes) }} · {{ formatPct(leader.share, 1) }}
                </span>
                <span v-else>Select an LGA or wait for transcribed EC8A party boxes.</span>
              </p>
              <ul class="mt-4 space-y-2">
                <li
                  v-for="row in donutLegend.length ? donutLegend : scopedStandings.slice(0, 6)"
                  :key="`legend-${row.code}`"
                  class="flex items-center gap-2 text-sm"
                >
                  <span class="h-2.5 w-2.5 shrink-0 rounded-full" :style="{ background: row.color }" />
                  <span class="min-w-0 flex-1 truncate font-medium text-on-surface">{{ displayName(row) }}</span>
                  <span class="tabular-nums text-outline">{{ formatPct(row.share, 1) }}</span>
                </li>
              </ul>
            </div>
          </div>
        </div>

        <div class="rounded-2xl bg-surface-container-lowest p-5 shadow-sm sm:p-6">
          <h3 class="font-headline-md text-lg font-bold text-primary">Vote share by party</h3>
          <p class="mt-1 font-body-md text-sm text-on-surface-variant">
            {{ scopedStandings.length }} parties
            <span v-if="standingsLga"> in {{ standingsLga }}</span>
          </p>
          <div class="mt-5 space-y-4">
            <div
              v-for="row in scopedStandings"
              :key="`bar-${row.code}`"
              class="grid grid-cols-[4.5rem_1fr] items-center gap-3 sm:grid-cols-[7.5rem_1fr]"
            >
              <div class="min-w-0 text-right">
                <p class="truncate text-[11px] font-bold" :style="{ color: row.color }">{{ row.code }}</p>
                <p class="hidden truncate text-[10px] text-outline sm:block">{{ displayName(row) }}</p>
              </div>
              <div>
                <div class="h-3 overflow-hidden rounded-full bg-surface-container-high sm:h-3.5">
                  <div
                    class="h-full rounded-full transition-all duration-500"
                    :style="{ width: `${(row.votes / barMax) * 100}%`, background: row.color }"
                  />
                </div>
                <p class="mt-0.5 truncate text-[10px] text-outline sm:hidden">
                  {{ displayName(row) }} · {{ formatNum(row.votes) }}
                </p>
              </div>
            </div>
          </div>
        </div>

        <div class="space-y-2">
          <article
            v-for="(row, index) in scopedStandings"
            :key="row.code"
            class="rounded-2xl bg-surface-container-lowest px-4 py-3 shadow-sm"
          >
            <div class="flex items-center gap-3">
              <span class="w-5 font-label-caps text-xs font-bold text-outline">{{ index + 1 }}</span>
              <span
                class="min-w-[3.1rem] rounded-md px-1.5 py-1 text-center text-[11px] font-black text-pure-white"
                :style="{ background: row.color }"
              >
                {{ row.code }}
              </span>
              <div class="min-w-0 flex-1">
                <p class="truncate font-button-text text-sm font-semibold text-on-surface">{{ displayName(row) }}</p>
                <p class="truncate text-[11px] text-outline">{{ row.name }}</p>
              </div>
              <div class="text-right">
                <p class="text-sm font-bold tabular-nums text-primary">{{ formatNum(row.votes) }}</p>
                <p class="text-[11px] text-outline">{{ formatPct(row.share, 1) }}</p>
              </div>
            </div>
            <div class="mt-2 h-1.5 overflow-hidden rounded-full bg-surface-container-high">
              <div
                class="h-full rounded-full"
                :style="{ width: `${(row.votes / barMax) * 100}%`, background: row.color }"
              />
            </div>
          </article>
        </div>
      </div>

      <aside class="overflow-hidden rounded-2xl bg-surface-container-lowest shadow-sm">
        <div class="border-b border-outline-variant/20 px-4 py-4">
          <h2 class="font-headline-md text-lg font-bold text-primary">Local governments</h2>
          <p class="mt-0.5 font-body-md text-sm text-on-surface-variant">Tap an LGA to scope standings</p>
          <div class="relative mt-3">
            <span class="material-symbols-outlined pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[18px] text-outline">
              search
            </span>
            <input
              v-model="lgaQuery"
              type="search"
              placeholder="Search LGA"
              class="h-11 w-full rounded-xl border-0 bg-surface-container-low pl-10 pr-3 font-body-md text-sm text-on-surface outline-none ring-1 ring-outline-variant/30 placeholder:text-outline focus:ring-2 focus:ring-primary/30"
            />
          </div>
        </div>
        <div class="lg:max-h-[70vh] lg:overflow-y-auto lg:overscroll-contain">
          <button
            type="button"
            class="flex min-h-12 w-full items-center justify-between gap-3 border-b border-outline-variant/15 px-4 py-3 text-left transition"
            :class="!standingsLga ? 'bg-action-green/10' : 'hover:bg-surface-container-low'"
            @click="standingsLga = ''"
          >
            <div>
              <p class="font-button-text text-sm font-semibold text-on-surface">All Ogun State</p>
              <p class="text-[11px] text-outline">Statewide totals</p>
            </div>
          </button>
          <div
            v-for="row in filteredLgas"
            :key="row.name"
            class="flex min-h-12 w-full items-center justify-between gap-3 border-b border-outline-variant/15 px-4 py-3"
            :class="standingsLga === row.name ? 'bg-action-green/10' : ''"
          >
            <button type="button" class="min-w-0 flex-1 text-left" @click="selectStandingLga(row.name)">
              <p class="truncate font-button-text text-sm font-semibold text-on-surface">{{ row.name }}</p>
              <p class="text-[11px] text-outline">
                {{ row.uploaded }}/{{ row.pu_total }} PUs · {{ formatNum(row.total_votes) }} votes
              </p>
            </button>
            <div class="flex shrink-0 flex-col items-end gap-1">
              <span
                class="rounded-full px-2 py-0.5 font-label-caps text-[10px] font-bold"
                :class="
                  row.progress_pct >= 100
                    ? 'bg-action-green/15 text-deep-navy'
                    : 'bg-secondary-fixed text-on-secondary-fixed'
                "
              >
                {{ formatPct(row.progress_pct) }}
              </span>
              <button
                type="button"
                class="font-label-caps text-[10px] font-semibold text-electric-pink hover:underline"
                @click="openLgaInExplorer(row.name)"
              >
                Explorer →
              </button>
            </div>
          </div>
          <p v-if="!filteredLgas.length" class="px-4 py-8 text-center text-sm text-outline">No matching LGA.</p>
        </div>
      </aside>
    </section>

    <!-- Explorer -->
    <section v-else-if="activeTab === 'explorer'" class="grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(280px,360px)]">
      <div class="space-y-4">
        <div class="rounded-2xl bg-surface-container-lowest p-5 shadow-sm">
          <label class="font-label-caps text-on-surface-variant">Local government</label>
          <select
            v-model="selectedLga"
            class="mt-2 h-11 w-full rounded-xl border-0 bg-surface-container-low px-3 font-body-md text-sm text-on-surface outline-none ring-1 ring-outline-variant/30 focus:ring-2 focus:ring-primary/30"
          >
            <option v-for="row in board?.lgas ?? []" :key="row.name" :value="row.name">
              {{ row.name }} · {{ formatPct(row.progress_pct) }}
            </option>
          </select>
          <p class="mt-2 font-body-md text-xs text-outline">
            {{ explorer?.uploaded ?? 0 }} of {{ explorer?.pu_total ?? selectedLgaMeta?.pu_total ?? 0 }} PUs uploaded
          </p>
          <div class="mt-4 flex gap-2 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            <button
              v-for="ward in explorer?.wards ?? []"
              :key="ward.name"
              type="button"
              class="shrink-0 rounded-xl px-3 py-2 font-button-text text-xs font-semibold transition"
              :class="
                selectedWard === ward.name
                  ? 'bg-primary text-pure-white'
                  : 'bg-surface-container-low text-primary hover:bg-surface-container'
              "
              @click="selectWard(ward.name)"
            >
              {{ ward.name }}
              <span class="ml-1 opacity-70">{{ formatPct(ward.progress_pct) }}</span>
            </button>
          </div>
        </div>

        <div class="overflow-hidden rounded-2xl bg-surface-container-lowest shadow-sm">
          <div class="flex flex-col gap-3 border-b border-outline-variant/20 px-4 py-4 sm:flex-row sm:items-start sm:justify-between">
            <div class="min-w-0">
              <h2 class="truncate font-headline-md text-lg font-bold text-primary">
                {{ selectedWard || "Select a ward" }}
              </h2>
              <p class="text-[11px] text-outline">
                {{ selectedWardMeta?.uploaded ?? 0 }}/{{ selectedWardMeta?.pu_total ?? 0 }} uploaded
              </p>
            </div>
            <div class="relative w-full sm:max-w-[12rem]">
              <span class="material-symbols-outlined pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[18px] text-outline">
                search
              </span>
              <input
                v-model="puQuery"
                type="search"
                placeholder="Search PU"
                class="h-11 w-full rounded-xl border-0 bg-surface-container-low pl-10 pr-3 font-body-md text-sm text-on-surface outline-none ring-1 ring-outline-variant/30 focus:ring-2 focus:ring-primary/30"
              />
            </div>
          </div>
          <div class="lg:max-h-[58vh] lg:overflow-y-auto lg:overscroll-contain">
            <button
              v-for="unit in wardUnits"
              :key="unit.code"
              type="button"
              class="flex min-h-14 w-full items-center justify-between gap-3 border-b border-outline-variant/15 px-4 py-3 text-left transition"
              :class="selectedUnit?.code === unit.code ? 'bg-action-green/10' : 'hover:bg-surface-container-low'"
              @click="selectUnit(unit.code)"
            >
              <div class="min-w-0">
                <p class="truncate font-button-text text-sm font-semibold text-on-surface">{{ unit.name }}</p>
                <p class="text-[11px] text-outline">{{ unit.code }}</p>
              </div>
              <span
                class="shrink-0 rounded-full px-2 py-0.5 font-label-caps text-[10px] font-bold"
                :class="
                  unit.uploaded
                    ? 'bg-action-green/15 text-deep-navy'
                    : 'bg-surface-container-high text-outline'
                "
              >
                {{ unit.uploaded ? "Uploaded" : "Pending" }}
              </span>
            </button>
            <p v-if="explorerLoading" class="px-4 py-8 text-center text-sm text-outline">Loading polling units…</p>
            <p v-else-if="!wardUnits.length" class="px-4 py-8 text-center text-sm text-outline">
              No polling units in this ward.
            </p>
          </div>
        </div>
      </div>

      <aside class="audit-sheet" :class="sheetOpen ? 'audit-sheet-open' : ''">
        <div class="audit-sheet-backdrop lg:hidden" @click="closeSheet" />
        <div class="audit-sheet-panel overflow-hidden rounded-2xl bg-surface-container-lowest shadow-sm">
          <div class="flex items-start justify-between gap-3 border-b border-outline-variant/20 px-4 py-4">
            <div class="min-w-0">
              <p class="truncate font-button-text text-sm font-semibold text-on-surface">
                {{ selectedUnit?.name || "Select a polling unit" }}
              </p>
              <p class="truncate text-[11px] text-outline">
                {{ selectedUnit?.code || "—" }} · {{ selectedWard || "—" }} · {{ selectedLga }}
              </p>
            </div>
            <button
              type="button"
              class="rounded-full p-2 text-outline transition hover:bg-surface-container lg:hidden"
              aria-label="Close"
              @click="closeSheet"
            >
              <span class="material-symbols-outlined text-[20px]">close</span>
            </button>
          </div>
          <div class="relative flex h-48 items-center justify-center overflow-hidden bg-surface-container sm:h-56">
            <img
              v-if="photoSrc(selectedUnit)"
              :src="photoSrc(selectedUnit)"
              alt="EC8A result sheet"
              class="max-h-full max-w-full object-contain transition-transform"
              :style="{ transform: `scale(${zoom})` }"
            />
            <p v-else class="px-6 text-center text-xs text-outline">No EC8A image uploaded for this unit yet.</p>
            <div class="absolute bottom-2 left-1/2 flex -translate-x-1/2 gap-1.5">
              <button
                type="button"
                class="min-w-[2.1rem] rounded-full bg-surface-container-lowest px-2.5 py-1 text-xs font-semibold text-primary shadow-sm"
                @click="zoom = Math.max(1, zoom - 0.25)"
              >
                −
              </button>
              <button
                type="button"
                class="min-w-[2.1rem] rounded-full bg-surface-container-lowest px-2.5 py-1 text-xs font-semibold text-primary shadow-sm"
                @click="zoom = Math.min(3, zoom + 0.25)"
              >
                +
              </button>
              <button
                type="button"
                class="rounded-full bg-surface-container-lowest px-2.5 py-1 text-xs font-semibold text-primary shadow-sm disabled:opacity-40"
                :disabled="!selectedUnit?.photo_url"
                @click="openOriginal(selectedUnit)"
              >
                Open
              </button>
            </div>
          </div>
          <div class="px-4 py-4">
            <h3 class="font-label-caps text-on-surface-variant">Transcribed results</h3>
            <div class="mt-3 grid grid-cols-4 gap-2">
              <div
                v-for="party in transcribedParties"
                :key="party.code"
                class="rounded-xl bg-surface-container-low px-1 py-2 text-center"
              >
                <span class="block text-[10px] font-bold" :style="{ color: party.color }">{{ party.code }}</span>
                <span class="mt-1 block text-xs font-semibold tabular-nums text-on-surface">
                  {{ selectedUnit?.party_votes[party.code] ?? 0 }}
                </span>
              </div>
            </div>
            <div
              v-if="verification"
              class="mt-3 rounded-xl px-3 py-2 text-[11px] leading-relaxed"
              :class="
                verification.ok
                  ? 'bg-action-green/15 text-deep-navy'
                  : 'bg-secondary-fixed/80 text-on-secondary-fixed'
              "
            >
              <span v-if="verification.ok">
                Sum matches Box #7 ({{ verification.box7 ?? verification.sum }}) and the bottom box
                ({{ verification.bottom }}).
              </span>
              <span v-else>
                Party sum {{ verification.sum }}. Box #7 {{ verification.box7 ?? "—" }}. Bottom box
                {{ verification.bottom }}.
              </span>
            </div>
          </div>
        </div>
      </aside>
    </section>

    <!-- Matrix -->
    <section v-else class="space-y-4">
      <div class="flex flex-wrap items-start justify-between gap-3 rounded-2xl bg-surface-container-lowest px-5 py-5 shadow-sm">
        <div>
          <h2 class="font-headline-md text-xl font-bold text-primary">LGA collation matrix</h2>
          <p class="mt-1 font-body-md text-sm text-on-surface-variant">
            Votes by party across {{ board?.lgas.length ?? 0 }} local governments.
          </p>
        </div>
        <button
          type="button"
          class="inline-flex h-11 items-center gap-2 rounded-xl bg-primary px-4 font-button-text text-sm font-semibold text-pure-white shadow-sm transition hover:opacity-95"
          @click="exportCsv"
        >
          <span class="material-symbols-outlined text-[18px]">download</span>
          Export CSV
        </button>
      </div>

      <div class="space-y-2 lg:hidden">
        <article
          v-for="row in board?.lgas ?? []"
          :key="row.name"
          class="overflow-hidden rounded-2xl bg-surface-container-lowest shadow-sm"
        >
          <button
            type="button"
            class="flex min-h-14 w-full items-start justify-between gap-3 px-4 py-3 text-left"
            @click="toggleMatrix(row.name)"
          >
            <div class="min-w-0">
              <p class="font-button-text font-semibold text-on-surface">{{ row.name }}</p>
              <p class="mt-0.5 text-[11px] text-outline">
                {{ row.uploaded }}/{{ row.pu_total }} · {{ formatPct(row.progress_pct) }} ·
                {{ formatNum(row.total_votes) }} votes
              </p>
            </div>
            <span
              class="mt-0.5 shrink-0 rounded-full px-2 py-0.5 font-label-caps text-[10px] font-bold"
              :class="
                row.clean
                  ? 'bg-action-green/15 text-deep-navy'
                  : row.uploaded
                    ? 'bg-secondary-fixed text-on-secondary-fixed'
                    : 'bg-surface-container-high text-outline'
              "
            >
              {{ row.clean ? "Clean" : row.uploaded ? "Verified" : "Pending" }}
            </span>
          </button>
          <div v-if="expandedMatrix === row.name" class="border-t border-outline-variant/20 px-4 py-3">
            <div class="flex flex-wrap gap-2">
              <span
                v-for="party in topParties(row, standingParties.length)"
                :key="party.code"
                class="rounded-lg bg-surface-container-low px-2 py-1 text-[11px]"
              >
                <span class="font-bold" :style="{ color: party.color }">{{ party.code }}</span>
                <span class="ml-1 tabular-nums text-on-surface-variant">{{ formatNum(party.votes) }}</span>
              </span>
            </div>
          </div>
        </article>
      </div>

      <div class="hidden overflow-hidden rounded-2xl bg-surface-container-lowest shadow-sm lg:block">
        <div class="overflow-x-auto">
          <table class="min-w-full text-left text-xs">
            <thead>
              <tr class="border-b border-outline-variant/20 font-label-caps text-[10px] text-outline">
                <th class="sticky left-0 bg-surface-container-lowest px-4 py-3">LGA</th>
                <th class="px-3 py-3">Progress</th>
                <th class="px-3 py-3">Status</th>
                <th
                  v-for="party in matrixParties"
                  :key="party.code"
                  class="px-2 py-3 text-right"
                  :style="{ color: party.color }"
                >
                  {{ party.code }}
                </th>
                <th class="px-4 py-3 text-right text-action-green">Total</th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="(row, index) in board?.lgas ?? []"
                :key="row.name"
                class="border-b border-outline-variant/10"
                :class="index % 2 ? 'bg-surface-container-low/50' : 'bg-transparent'"
              >
                <td
                  class="sticky left-0 px-4 py-2.5 font-semibold text-on-surface"
                  :class="index % 2 ? 'bg-surface-container-low/50' : 'bg-surface-container-lowest'"
                >
                  {{ row.name }}
                </td>
                <td class="whitespace-nowrap px-3 py-2.5 text-on-surface-variant">
                  {{ row.uploaded }}/{{ row.pu_total }}
                </td>
                <td class="px-3 py-2.5">
                  <span
                    class="rounded-full px-2 py-0.5 font-label-caps text-[10px] font-bold"
                    :class="
                      row.clean
                        ? 'bg-action-green/15 text-deep-navy'
                        : row.uploaded
                          ? 'bg-secondary-fixed text-on-secondary-fixed'
                          : 'bg-surface-container-high text-outline'
                    "
                  >
                    {{ row.clean ? "Clean" : row.uploaded ? "Verified" : "Pending" }}
                  </span>
                </td>
                <td
                  v-for="party in matrixParties"
                  :key="`${row.name}-${party.code}`"
                  class="px-2 py-2.5 text-right tabular-nums text-on-surface-variant"
                >
                  {{ formatNum(row.party_votes[party.code] || 0) }}
                </td>
                <td class="px-4 py-2.5 text-right font-bold tabular-nums text-primary">
                  {{ formatNum(row.total_votes) }}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </section>

    <!-- Mobile bottom nav (standalone page only) -->
    <nav
      v-if="!embedded"
      class="fixed inset-x-0 bottom-0 z-40 grid grid-cols-3 gap-1 border-t border-outline-variant/20 bg-surface-container-lowest/95 px-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-2 backdrop-blur-lg lg:hidden"
      aria-label="Audit views"
    >
      <button
        v-for="tab in tabs"
        :key="tab.id"
        type="button"
        class="flex min-h-12 flex-col items-center justify-center gap-0.5 font-label-caps text-[10px] font-bold"
        :class="activeTab === tab.id ? 'text-primary' : 'text-outline'"
        @click="activeTab = tab.id"
      >
        <span class="material-symbols-outlined text-[20px]">{{ tab.icon }}</span>
        {{ tab.label }}
      </button>
    </nav>
  </div>
</template>

<style scoped>
.audit-sheet-backdrop {
  display: none;
}
@media (max-width: 1023px) {
  .audit-sheet-panel {
    display: none;
  }
  .audit-sheet-open {
    position: fixed;
    inset: 0;
    z-index: 50;
    display: block;
  }
  .audit-sheet-open .audit-sheet-backdrop {
    display: block;
    position: absolute;
    inset: 0;
    background: rgb(34 34 48 / 0.45);
  }
  .audit-sheet-open .audit-sheet-panel {
    display: block;
    position: absolute;
    left: 0;
    right: 0;
    bottom: 0;
    max-height: 88vh;
    overflow-y: auto;
    border-radius: 1.25rem 1.25rem 0 0;
    padding-bottom: env(safe-area-inset-bottom);
  }
}
</style>
