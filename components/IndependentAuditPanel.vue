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
  { id: "standings" as const, label: "Standings", full: "State Standings" },
  { id: "explorer" as const, label: "Explorer", full: "Collation Explorer" },
  { id: "matrix" as const, label: "Matrix", full: "Collation Matrix" },
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
  if (!total) return { background: "conic-gradient(#1e293b 0 100%)" };
  let cursor = 0;
  const stops: string[] = [];
  for (const row of rows) {
    if (row.votes <= 0) continue;
    const start = cursor;
    cursor += (row.votes / total) * 100;
    stops.push(`${row.color} ${start}% ${cursor}%`);
  }
  if (!stops.length) return { background: "conic-gradient(#1e293b 0 100%)" };
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
  <div class="audit-dash" :class="embedded ? 'audit-embedded' : 'audit-page'">
    <header class="audit-header">
      <div class="flex min-w-0 items-center gap-3">
        <div class="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#4ade80] text-sm font-black tracking-tight text-[#052e16] shadow-[0_0_24px_rgba(74,222,128,0.25)]">
          OG
        </div>
        <div class="min-w-0">
          <p class="truncate text-[11px] font-semibold uppercase tracking-[0.18em] text-emerald-300/80">
            Ogun State 2026
          </p>
          <h1 class="truncate text-base font-semibold text-white sm:text-lg">
            Governorship collation
          </h1>
        </div>
      </div>

      <div class="flex items-center gap-2">
        <span class="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2.5 py-1 text-[11px] font-semibold text-emerald-300">
          <span class="relative flex h-2 w-2">
            <span class="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#4ade80] opacity-60" />
            <span class="relative inline-flex h-2 w-2 rounded-full bg-[#4ade80]" />
          </span>
          Live
        </span>
        <span class="hidden rounded-full bg-sky-500/15 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-sky-300 sm:inline">
          Unofficial
        </span>
        <NuxtLink
          to="/monitor"
          class="inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/10 text-slate-300 hover:bg-white/5 hover:text-[#4ade80]"
          aria-label="Live monitoring"
          title="Live monitoring"
        >
          <svg class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
            <path stroke-linecap="round" stroke-linejoin="round" d="M15.75 10.5l4.72-4.72a.75.75 0 011.28.53v11.38a.75.75 0 01-1.28.53l-4.72-4.72M4.5 18.75h9a2.25 2.25 0 002.25-2.25v-9a2.25 2.25 0 00-2.25-2.25h-9A2.25 2.25 0 002.25 7.5v9a2.25 2.25 0 002.25 2.25z" />
          </svg>
        </NuxtLink>
        <button
          type="button"
          class="inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/10 text-slate-300 hover:bg-white/5 disabled:opacity-50"
          :disabled="loading"
          aria-label="Refresh collation"
          @click="loadBoard"
        >
          <svg class="h-4 w-4" :class="loading ? 'animate-spin' : ''" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M21 12a9 9 0 1 1-3-6.7" stroke-linecap="round" />
            <path d="M21 3v6h-6" stroke-linecap="round" stroke-linejoin="round" />
          </svg>
        </button>
      </div>
    </header>

    <nav class="mt-4 hidden w-fit max-w-full gap-1 rounded-full border border-white/10 bg-[#0b1220] p-1 lg:flex" aria-label="Audit views">
      <button
        v-for="tab in tabs"
        :key="tab.id"
        type="button"
        class="rounded-full px-3.5 py-2 text-sm font-semibold text-slate-300"
        :class="activeTab === tab.id ? 'bg-[#4ade80] text-slate-950' : 'hover:text-white'"
        @click="activeTab = tab.id"
      >
        {{ tab.full }}
      </button>
    </nav>

    <p class="audit-banner">
      Unofficial independent audit from Form EC8A uploads. Not an INEC declaration.
      <span class="mt-1 block text-sky-300/70 sm:mt-0 sm:inline sm:before:content-['·_']">
        Updated {{ formatStamp(board?.updated_at) }}
      </span>
    </p>

    <p v-if="error" class="mt-3 rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
      {{ error }}
    </p>

    <section class="mt-4 grid grid-cols-2 gap-2 lg:grid-cols-4 lg:gap-3">
      <article class="audit-stat">
        <p class="audit-kicker">Polling units</p>
        <p class="audit-metric">{{ formatNum(board?.totals.polling_units ?? 0) }}</p>
        <p class="audit-sub">{{ board?.lgas.length ?? 0 }} LGAs</p>
      </article>
      <article class="audit-stat">
        <p class="audit-kicker">Upload progress</p>
        <p class="audit-metric">{{ formatPct(board?.totals.upload_pct ?? 0, 1) }}</p>
        <p class="audit-sub">{{ formatNum(board?.totals.uploaded ?? 0) }} / {{ formatNum(board?.totals.polling_units ?? 0) }}</p>
        <div class="mt-2 h-1 overflow-hidden rounded-full bg-slate-800">
          <div class="h-full rounded-full bg-[#4ade80]" :style="{ width: `${Math.min(board?.totals.upload_pct ?? 0, 100)}%` }" />
        </div>
      </article>
      <article class="audit-stat">
        <p class="audit-kicker">Sheets collated</p>
        <p class="audit-metric">{{ formatNum(board?.totals.collated ?? 0) }}</p>
        <p class="audit-sub">Observer verified</p>
      </article>
      <article class="audit-stat">
        <p class="audit-kicker">Collated votes</p>
        <p class="audit-metric">{{ formatNum(board?.totals.total_votes ?? 0) }}</p>
        <p class="audit-sub">
          <span v-if="board?.totals.leading_code">{{ board.totals.leading_code }} {{ formatPct(board.totals.leading_share, 1) }}</span>
          <span v-else>Breakdown pending</span>
        </p>
      </article>
    </section>

    <section v-if="activeTab === 'standings'" class="mt-4 grid gap-3 xl:grid-cols-[minmax(0,1fr)_320px]">
      <div class="space-y-3">
        <div class="audit-panel p-4 sm:p-5">
          <div class="flex flex-wrap items-start justify-between gap-2">
            <div>
              <p class="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                {{ standingsLga || "Ogun State" }}
              </p>
              <h2 class="mt-1 text-base font-semibold text-white">
                {{ standingsLga ? "LGA party standings" : "State party standings" }}
              </h2>
            </div>
            <button
              v-if="standingsLga"
              type="button"
              class="rounded-full border border-white/10 px-3 py-1.5 text-[11px] font-semibold text-slate-300"
              @click="standingsLga = ''"
            >
              All LGAs
            </button>
          </div>

          <div class="mt-5 flex flex-col items-center gap-5 sm:flex-row sm:items-start">
            <div class="relative h-44 w-44 shrink-0 sm:h-48 sm:w-48">
              <div class="h-full w-full rounded-full" :style="donutStyle" />
              <div class="absolute inset-7 flex flex-col items-center justify-center rounded-full bg-[#0e1624] text-center shadow-inner">
                <p class="text-[10px] uppercase tracking-wider text-slate-500">Votes</p>
                <p class="text-base font-bold text-white">{{ formatNum(scopedTotal) }}</p>
              </div>
            </div>
            <div class="min-w-0 flex-1">
              <p class="text-center text-xs font-semibold uppercase tracking-[0.16em] text-slate-500 sm:text-left">Leading candidate</p>
              <p class="mt-1 text-center text-xl font-semibold text-white sm:text-left">
                {{ leader ? displayName(leader) : "Awaiting party totals" }}
              </p>
              <p class="mt-1 text-center text-sm text-slate-400 sm:text-left">
                <span v-if="leader">
                  {{ leader.code }} · {{ leader.name }} · {{ formatNum(leader.votes) }} · {{ formatPct(leader.share, 1) }}
                </span>
                <span v-else>Select an LGA or wait for transcribed EC8A party boxes.</span>
              </p>
              <ul class="mt-4 space-y-2">
                <li v-for="row in (donutLegend.length ? donutLegend : scopedStandings.slice(0, 6))" :key="`legend-${row.code}`" class="flex items-center gap-2 text-xs">
                  <span class="h-2.5 w-2.5 shrink-0 rounded-full" :style="{ background: row.color }" />
                  <span class="min-w-0 flex-1 truncate font-medium text-slate-200">{{ displayName(row) }}</span>
                  <span class="tabular-nums text-slate-400">{{ formatPct(row.share, 1) }}</span>
                </li>
              </ul>
            </div>
          </div>
        </div>

        <div class="audit-panel p-4 sm:p-5">
          <h3 class="text-sm font-semibold text-white">Votes bar chart</h3>
          <p class="mt-1 text-[11px] text-slate-500">
            {{ scopedStandings.length }} parties
            <span v-if="standingsLga"> in {{ standingsLga }}</span>
          </p>
          <div class="mt-4 space-y-3">
            <div v-for="row in scopedStandings" :key="`bar-${row.code}`" class="grid grid-cols-[4.5rem_1fr] items-center gap-2 sm:grid-cols-[7.5rem_1fr]">
              <div class="min-w-0 text-right">
                <p class="truncate text-[11px] font-bold" :style="{ color: row.color }">{{ row.code }}</p>
                <p class="hidden truncate text-[10px] text-slate-500 sm:block">{{ displayName(row) }}</p>
              </div>
              <div>
                <div class="h-3 overflow-hidden rounded-full bg-slate-800 sm:h-3.5">
                  <div
                    class="h-full rounded-full"
                    :style="{ width: `${(row.votes / barMax) * 100}%`, background: row.color }"
                  />
                </div>
                <p class="mt-0.5 truncate text-[10px] text-slate-500 sm:hidden">{{ displayName(row) }} · {{ formatNum(row.votes) }}</p>
              </div>
            </div>
          </div>
        </div>

        <div class="space-y-2">
          <article
            v-for="(row, index) in scopedStandings"
            :key="row.code"
            class="rounded-2xl border border-white/5 bg-[#101826] px-3 py-2.5"
          >
            <div class="flex items-center gap-3">
              <span class="w-5 text-xs font-bold text-slate-500">{{ index + 1 }}</span>
              <span class="min-w-[3.1rem] rounded-md px-1.5 py-1 text-center text-[11px] font-black text-slate-950" :style="{ background: row.color }">
                {{ row.code }}
              </span>
              <div class="min-w-0 flex-1">
                <p class="truncate text-sm font-medium text-white">{{ displayName(row) }}</p>
                <p class="truncate text-[11px] text-slate-500">{{ row.name }}</p>
              </div>
              <div class="text-right">
                <p class="text-sm font-bold tabular-nums text-white">{{ formatNum(row.votes) }}</p>
                <p class="text-[11px] text-slate-500">{{ formatPct(row.share, 1) }}</p>
              </div>
            </div>
            <div class="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-800">
              <div class="h-full rounded-full" :style="{ width: `${(row.votes / barMax) * 100}%`, background: row.color }" />
            </div>
          </article>
        </div>
      </div>

      <aside class="audit-panel overflow-hidden">
        <div class="border-b border-white/5 px-4 py-3">
          <h2 class="text-sm font-semibold text-white">Local governments</h2>
          <p class="text-[11px] text-slate-500">Tap an LGA to load its pie and bar charts</p>
          <input
            v-model="lgaQuery"
            type="search"
            placeholder="Search LGA"
            class="audit-input mt-3"
          />
        </div>
        <div class="lg:max-h-[70vh] lg:overflow-y-auto lg:overscroll-contain">
          <button
            type="button"
            class="flex min-h-12 w-full items-center justify-between gap-3 border-b border-white/5 px-4 py-3 text-left"
            :class="!standingsLga ? 'bg-emerald-500/10' : 'active:bg-white/5'"
            @click="standingsLga = ''"
          >
            <div>
              <p class="text-sm font-medium text-white">All Ogun State</p>
              <p class="text-[11px] text-slate-500">Statewide totals</p>
            </div>
          </button>
          <div
            v-for="row in filteredLgas"
            :key="row.name"
            class="flex min-h-12 w-full items-center justify-between gap-3 border-b border-white/5 px-4 py-3"
            :class="standingsLga === row.name ? 'bg-emerald-500/10' : ''"
          >
            <button type="button" class="min-w-0 flex-1 text-left" @click="selectStandingLga(row.name)">
              <p class="truncate text-sm font-medium text-slate-100">{{ row.name }}</p>
              <p class="text-[11px] text-slate-500">{{ row.uploaded }}/{{ row.pu_total }} PUs · {{ formatNum(row.total_votes) }} votes</p>
            </button>
            <div class="flex shrink-0 flex-col items-end gap-1">
              <span
                class="rounded-full px-2 py-0.5 text-[11px] font-bold"
                :class="row.progress_pct >= 100 ? 'bg-emerald-500/15 text-[#4ade80]' : 'bg-amber-500/15 text-amber-300'"
              >
                {{ formatPct(row.progress_pct) }}
              </span>
              <button
                type="button"
                class="text-[10px] font-semibold text-sky-300"
                @click="openLgaInExplorer(row.name)"
              >
                Explorer
              </button>
            </div>
          </div>
          <p v-if="!filteredLgas.length" class="px-4 py-8 text-center text-sm text-slate-500">No matching LGA.</p>
        </div>
      </aside>
    </section>

    <section v-else-if="activeTab === 'explorer'" class="mt-4 grid gap-3 xl:grid-cols-[minmax(0,1fr)_minmax(280px,360px)]">
      <div class="space-y-3">
        <div class="audit-panel p-4">
          <label class="audit-kicker">Local government</label>
          <select v-model="selectedLga" class="audit-input mt-2">
            <option v-for="row in board?.lgas ?? []" :key="row.name" :value="row.name">
              {{ row.name }} · {{ formatPct(row.progress_pct) }}
            </option>
          </select>
          <p class="mt-2 text-[11px] text-slate-500">
            {{ explorer?.uploaded ?? 0 }} of {{ explorer?.pu_total ?? selectedLgaMeta?.pu_total ?? 0 }} PUs uploaded
          </p>
          <div class="mt-3 flex gap-2 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            <button
              v-for="ward in explorer?.wards ?? []"
              :key="ward.name"
              type="button"
              class="shrink-0 rounded-full border px-3 py-2 text-xs font-semibold"
              :class="selectedWard === ward.name ? 'border-emerald-400/40 bg-emerald-500/15 text-emerald-200' : 'border-white/10 text-slate-300'"
              @click="selectWard(ward.name)"
            >
              {{ ward.name }}
              <span class="ml-1 text-[10px] opacity-70">{{ formatPct(ward.progress_pct) }}</span>
            </button>
          </div>
        </div>

        <div class="audit-panel overflow-hidden">
          <div class="flex flex-col gap-3 border-b border-white/5 px-4 py-3 sm:flex-row sm:items-start sm:justify-between">
            <div class="min-w-0">
              <h2 class="truncate text-sm font-semibold text-white">{{ selectedWard || "Select a ward" }}</h2>
              <p class="text-[11px] text-slate-500">
                {{ selectedWardMeta?.uploaded ?? 0 }}/{{ selectedWardMeta?.pu_total ?? 0 }} uploaded
              </p>
            </div>
            <input v-model="puQuery" type="search" placeholder="Search PU" class="audit-input sm:max-w-[12rem]" />
          </div>
          <div class="lg:max-h-[58vh] lg:overflow-y-auto lg:overscroll-contain">
            <button
              v-for="unit in wardUnits"
              :key="unit.code"
              type="button"
              class="flex min-h-14 w-full items-center justify-between gap-3 border-b border-white/5 px-4 py-3 text-left"
              :class="selectedUnit?.code === unit.code ? 'bg-emerald-500/10' : 'active:bg-white/5'"
              @click="selectUnit(unit.code)"
            >
              <div class="min-w-0">
                <p class="truncate text-sm font-medium text-white">{{ unit.name }}</p>
                <p class="text-[11px] text-slate-500">{{ unit.code }}</p>
              </div>
              <span
                class="shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold"
                :class="unit.uploaded ? 'bg-emerald-500/15 text-[#4ade80]' : 'bg-slate-800 text-slate-400'"
              >
                {{ unit.uploaded ? "Uploaded" : "Pending" }}
              </span>
            </button>
            <p v-if="explorerLoading" class="px-4 py-8 text-center text-sm text-slate-500">Loading polling units…</p>
            <p v-else-if="!wardUnits.length" class="px-4 py-8 text-center text-sm text-slate-500">No polling units in this ward.</p>
          </div>
        </div>
      </div>

      <aside class="audit-sheet" :class="sheetOpen ? 'audit-sheet-open' : ''">
        <div class="audit-sheet-backdrop lg:hidden" @click="closeSheet" />
        <div class="audit-sheet-panel">
          <div class="flex items-start justify-between gap-3 border-b border-white/5 px-4 py-3">
            <div class="min-w-0">
              <p class="truncate text-sm font-semibold text-white">{{ selectedUnit?.name || "Select a polling unit" }}</p>
              <p class="truncate text-[11px] text-slate-500">
                {{ selectedUnit?.code || "—" }} · {{ selectedWard || "—" }} · {{ selectedLga }}
              </p>
            </div>
            <button type="button" class="rounded-full p-2 text-slate-400 lg:hidden" aria-label="Close" @click="closeSheet">
              <svg class="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 6l12 12M18 6L6 18" /></svg>
            </button>
          </div>
          <div class="relative flex h-48 items-center justify-center overflow-hidden bg-[#070b14] sm:h-56">
            <img
              v-if="photoSrc(selectedUnit)"
              :src="photoSrc(selectedUnit)"
              alt="EC8A result sheet"
              class="max-h-full max-w-full object-contain transition-transform"
              :style="{ transform: `scale(${zoom})` }"
            />
            <p v-else class="px-6 text-center text-xs text-slate-500">No EC8A image uploaded for this unit yet.</p>
            <div class="absolute bottom-2 left-1/2 flex -translate-x-1/2 gap-1.5">
              <button type="button" class="audit-zoom" @click="zoom = Math.max(1, zoom - 0.25)">−</button>
              <button type="button" class="audit-zoom" @click="zoom = Math.min(3, zoom + 0.25)">+</button>
              <button type="button" class="audit-zoom" :disabled="!selectedUnit?.photo_url" @click="openOriginal(selectedUnit)">
                Open
              </button>
            </div>
          </div>
          <div class="px-4 py-3">
            <h3 class="text-[11px] font-bold uppercase tracking-wider text-slate-400">Transcribed results</h3>
            <div class="mt-3 grid grid-cols-4 gap-2 sm:grid-cols-4">
              <div v-for="party in transcribedParties" :key="party.code" class="rounded-xl bg-[#0b1220] px-1 py-2 text-center">
                <span class="block text-[10px] font-bold" :style="{ color: party.color }">{{ party.code }}</span>
                <span class="mt-1 block text-xs font-semibold tabular-nums text-white">
                  {{ selectedUnit?.party_votes[party.code] ?? 0 }}
                </span>
              </div>
            </div>
            <div
              v-if="verification"
              class="mt-3 rounded-xl px-3 py-2 text-[11px] leading-relaxed"
              :class="verification.ok ? 'bg-emerald-500/10 text-[#4ade80]' : 'bg-amber-500/10 text-amber-200'"
            >
              <span v-if="verification.ok">
                Sum matches Box #7 ({{ verification.box7 ?? verification.sum }}) and the bottom box ({{ verification.bottom }}).
              </span>
              <span v-else>
                Party sum {{ verification.sum }}. Box #7 {{ verification.box7 ?? "—" }}. Bottom box {{ verification.bottom }}.
              </span>
            </div>
          </div>
        </div>
      </aside>
    </section>

    <section v-else class="mt-4 space-y-3">
      <div class="audit-panel flex flex-wrap items-start justify-between gap-3 px-4 py-4">
        <div>
          <h2 class="text-base font-semibold text-white">LGA collation matrix</h2>
          <p class="mt-1 text-xs text-slate-500">Votes by party across {{ board?.lgas.length ?? 0 }} local governments.</p>
        </div>
        <button type="button" class="rounded-full border border-white/10 px-4 py-2 text-xs font-semibold text-slate-200" @click="exportCsv">
          Export CSV
        </button>
      </div>

      <div class="space-y-2 lg:hidden">
        <article v-for="row in board?.lgas ?? []" :key="row.name" class="audit-panel overflow-hidden">
          <button type="button" class="flex min-h-14 w-full items-start justify-between gap-3 px-4 py-3 text-left" @click="toggleMatrix(row.name)">
            <div class="min-w-0">
              <p class="font-medium text-white">{{ row.name }}</p>
              <p class="mt-0.5 text-[11px] text-slate-500">
                {{ row.uploaded }}/{{ row.pu_total }} · {{ formatPct(row.progress_pct) }} · {{ formatNum(row.total_votes) }} votes
              </p>
            </div>
            <span
              class="mt-0.5 shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold"
              :class="row.clean ? 'bg-emerald-500/15 text-[#4ade80]' : row.uploaded ? 'bg-sky-500/15 text-sky-300' : 'bg-slate-800 text-slate-400'"
            >
              {{ row.clean ? "Clean" : row.uploaded ? "Verified" : "Pending" }}
            </span>
          </button>
          <div v-if="expandedMatrix === row.name" class="border-t border-white/5 px-4 py-3">
            <div class="flex flex-wrap gap-2">
              <span v-for="party in topParties(row, standingParties.length)" :key="party.code" class="rounded-lg bg-[#0b1220] px-2 py-1 text-[11px]">
                <span class="font-bold" :style="{ color: party.color }">{{ party.code }}</span>
                <span class="ml-1 tabular-nums text-slate-300">{{ formatNum(party.votes) }}</span>
              </span>
            </div>
          </div>
        </article>
      </div>

      <div class="audit-panel hidden overflow-hidden lg:block">
        <div class="overflow-x-auto">
          <table class="min-w-full text-left text-xs">
            <thead>
              <tr class="border-b border-white/5 text-[10px] uppercase tracking-wider text-slate-500">
                <th class="sticky left-0 bg-[#101826] px-3 py-3">LGA</th>
                <th class="px-3 py-3">Progress</th>
                <th class="px-3 py-3">Status</th>
                <th v-for="party in matrixParties" :key="party.code" class="px-2 py-3 text-right" :style="{ color: party.color }">
                  {{ party.code }}
                </th>
                <th class="px-3 py-3 text-right text-[#4ade80]">Total</th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="(row, index) in board?.lgas ?? []"
                :key="row.name"
                class="border-b border-white/5"
                :class="index % 2 ? 'bg-[#0d1524]' : 'bg-transparent'"
              >
                <td class="sticky left-0 px-3 py-2 font-semibold text-slate-100" :class="index % 2 ? 'bg-[#0d1524]' : 'bg-[#101826]'">
                  {{ row.name }}
                </td>
                <td class="whitespace-nowrap px-3 py-2 text-slate-300">{{ row.uploaded }}/{{ row.pu_total }}</td>
                <td class="px-3 py-2">
                  <span
                    class="rounded-full px-2 py-0.5 text-[10px] font-bold"
                    :class="row.clean ? 'bg-emerald-500/15 text-[#4ade80]' : row.uploaded ? 'bg-sky-500/15 text-sky-300' : 'bg-slate-700 text-slate-400'"
                  >
                    {{ row.clean ? "Clean" : row.uploaded ? "Verified" : "Pending" }}
                  </span>
                </td>
                <td v-for="party in matrixParties" :key="`${row.name}-${party.code}`" class="px-2 py-2 text-right tabular-nums text-slate-300">
                  {{ formatNum(row.party_votes[party.code] || 0) }}
                </td>
                <td class="px-3 py-2 text-right font-bold tabular-nums text-[#4ade80]">{{ formatNum(row.total_votes) }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </section>

    <nav
      v-if="!embedded"
      class="fixed inset-x-0 bottom-0 z-40 grid grid-cols-3 gap-1 border-t border-white/10 bg-[#070b14]/95 px-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-2 backdrop-blur-lg lg:hidden"
      aria-label="Audit views"
    >
      <button
        v-for="tab in tabs"
        :key="tab.id"
        type="button"
        class="flex min-h-12 flex-col items-center justify-center gap-1 text-[11px] font-bold uppercase tracking-wide"
        :class="activeTab === tab.id ? 'text-[#4ade80]' : 'text-slate-400'"
        @click="activeTab = tab.id"
      >
        <span class="h-1 w-8 rounded-full" :class="activeTab === tab.id ? 'bg-[#4ade80]' : 'bg-transparent'" />
        {{ tab.label }}
      </button>
    </nav>
  </div>
</template>

<style scoped>
.audit-dash {
  min-height: 100%;
  background:
    radial-gradient(1200px 400px at 10% -10%, rgb(16 185 129 / 0.12), transparent 50%),
    #070b14;
  color: #e2e8f0;
  font-family: Inter, ui-sans-serif, system-ui, sans-serif;
}
.audit-page {
  padding: 0.85rem 0.85rem calc(5.75rem + env(safe-area-inset-bottom));
}
@media (min-width: 1024px) {
  .audit-page {
    padding-bottom: 1.5rem;
  }
}
.audit-embedded {
  padding: 0.5rem 0 1rem;
}
.audit-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  position: sticky;
  top: 0;
  z-index: 20;
  margin: -0.85rem -0.85rem 0;
  padding: 0.85rem;
  background: rgb(7 11 20 / 0.92);
  backdrop-filter: blur(16px);
  border-bottom: 1px solid rgb(255 255 255 / 0.06);
}
.audit-embedded .audit-header {
  margin: 0;
  position: relative;
  background: transparent;
  border-bottom: 0;
  padding: 0 0 0.75rem;
}
.audit-banner {
  margin-top: 0.85rem;
  border-radius: 1rem;
  border: 1px solid rgb(56 189 248 / 0.18);
  background: rgb(8 47 73 / 0.35);
  padding: 0.7rem 0.9rem;
  font-size: 0.72rem;
  line-height: 1.45;
  color: rgb(186 230 253 / 0.9);
}
.audit-stat,
.audit-panel {
  border: 1px solid rgb(255 255 255 / 0.07);
  background: rgb(16 24 38 / 0.92);
  border-radius: 1.1rem;
}
.audit-stat {
  padding: 0.7rem 0.75rem;
}
.audit-kicker {
  font-size: 10px;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: #94a3b8;
}
.audit-metric {
  margin-top: 0.2rem;
  font-size: 1.2rem;
  line-height: 1.1;
  font-weight: 800;
  color: #fff;
}
@media (min-width: 640px) {
  .audit-metric {
    font-size: 1.6rem;
  }
}
.audit-sub {
  margin-top: 0.25rem;
  font-size: 11px;
  color: #64748b;
}
.audit-input {
  width: 100%;
  min-height: 2.75rem;
  border-radius: 0.9rem;
  border: 1px solid rgb(255 255 255 / 0.1);
  background: #0b1220;
  padding: 0.55rem 0.8rem;
  font-size: 16px;
  color: #fff;
}
.audit-zoom {
  border-radius: 999px;
  border: 1px solid rgb(51 65 85);
  background: rgb(15 23 42 / 0.92);
  min-width: 2.1rem;
  padding: 0.25rem 0.55rem;
  font-size: 12px;
  color: #cbd5e1;
}
.audit-zoom:disabled {
  opacity: 0.4;
}
.audit-sheet-backdrop {
  display: none;
}
.audit-sheet-panel {
  border: 1px solid rgb(255 255 255 / 0.07);
  background: rgb(16 24 38 / 0.96);
  border-radius: 1.1rem;
  overflow: hidden;
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
    background: rgb(0 0 0 / 0.55);
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
