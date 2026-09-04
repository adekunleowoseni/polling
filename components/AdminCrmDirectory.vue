<script setup lang="ts">
import {
  useAdminCrm,
  type AdminCrmContactCreate,
  type AdminCrmDirectory,
  type AdminCrmRow,
  type AdminCrmSmsDispatchSummary,
} from "~/composables/useAdminCrm";

const props = withDefaults(
  defineProps<{
    stateScope?: string;
  }>(),
  { stateScope: "all" },
);

const emit = defineEmits<{
  (e: "error", msg: string): void;
  (e: "message", msg: string): void;
  (e: "openAgent", agentId: string): void;
}>();

const { loadDirectory, createContact, listSmsDispatches, crmError } = useAdminCrm();
const { searchQuery, openSmsAnalytics: goToSmsAnalytics } = useAdminShell();
const { lgas, wards, loadLgas, loadWards } = useOgunGeo();
const {
  loading: crmMapLoading,
  data: crmMapData,
  markers: crmMapMarkers,
  center: crmMapCenter,
  load: loadCrmMap,
} = useMapPollingUnits();

const loading = ref(true);
const saving = ref(false);
const directory = ref<AdminCrmDirectory | null>(null);
const rows = ref<AdminCrmRow[]>([]);

const query = ref("");
const segment = ref<"all" | "turnout" | "undecided" | "donors" | "followup">("all");
const view = ref<"table" | "map" | "grid">("table");
const precinct = ref("");
const scoreBand = ref<"all" | "strong" | "persuadable" | "oppose">("all");
const tagFilter = ref("");
const lastContact = ref<"all" | "24h" | "7d" | "30d">("all");
const openMenu = ref<"" | "precinct" | "score" | "tags" | "contact" | "row">("");
const rowMenuId = ref<string | null>(null);

const page = ref(1);
const pageSize = ref(25);
const selected = ref<Set<string>>(new Set());

const showCreate = ref(false);
const showBroadcast = ref(false);
const recentDispatches = ref<AdminCrmSmsDispatchSummary[]>([]);
const form = reactive<AdminCrmContactCreate>({
  name: "",
  phone: "",
  email: "",
  contact_type: "voter",
  lga: "",
  ward: "",
  address: "",
  tags: [],
});
const formTag = ref("");

const scopedRows = computed(() => {
  if (!props.stateScope || props.stateScope === "all") return rows.value;
  return rows.value.filter((row) => (row.state || "").trim() === props.stateScope);
});

const metrics = computed(() => {
  const list = scopedRows.value;
  if (!list.length && directory.value && props.stateScope === "all") {
    return {
      total: directory.value.total,
      identified: directory.value.identified,
      persuadable: directory.value.persuadable,
      donors: directory.value.donors,
      volunteers: directory.value.volunteers,
      follow_up: directory.value.follow_up,
      high_turnout: directory.value.high_turnout,
    };
  }
  return {
    total: list.length,
    identified: list.filter((r) => r.support_score >= 62).length,
    persuadable: list.filter((r) => r.support_score >= 40 && r.support_score < 62).length,
    donors: list.filter((r) => isDonor(r)).length,
    volunteers: list.filter((r) => r.source === "agent" || r.account_type === "member").length,
    follow_up: list.filter((r) => r.support_score < 55 || !r.sms_ok).length,
    high_turnout: list.filter((r) => r.support_score > 80).length,
  };
});

const precinctOptions = computed(() => {
  const set = new Set<string>();
  for (const row of scopedRows.value) {
    const label = precinctLabel(row);
    if (label) set.add(label);
  }
  return [...set].sort((a, b) => a.localeCompare(b));
});

const tagOptions = computed(() => {
  const set = new Set<string>();
  for (const row of scopedRows.value) {
    for (const tag of row.tags) if (tag) set.add(tag);
  }
  return [...set].sort((a, b) => a.localeCompare(b));
});

const filteredRows = computed(() => {
  const q = query.value.trim().toLowerCase();
  return scopedRows.value.filter((row) => {
    if (segment.value === "turnout" && row.support_score <= 80) return false;
    if (segment.value === "undecided" && (row.support_score < 40 || row.support_score >= 62) && !row.tags.some((t) => t.toLowerCase().includes("undecided"))) {
      return false;
    }
    if (segment.value === "donors" && !isDonor(row)) return false;
    if (segment.value === "followup" && row.support_score >= 55 && row.sms_ok) return false;
    if (precinct.value && precinctLabel(row) !== precinct.value) return false;
    if (scoreBand.value === "strong" && row.support_score < 75) return false;
    if (scoreBand.value === "persuadable" && (row.support_score < 40 || row.support_score >= 62)) return false;
    if (scoreBand.value === "oppose" && row.support_score >= 40) return false;
    if (tagFilter.value && !row.tags.includes(tagFilter.value)) return false;
    if (lastContact.value !== "all" && !matchesLastContact(row, lastContact.value)) return false;
    if (!q) return true;
    const hay = [
      row.name,
      row.email,
      row.phone,
      row.id,
      row.lga,
      row.ward,
      row.address,
      row.polling_unit,
      row.tags.join(" "),
      contactRef(row),
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();
    return hay.includes(q);
  });
});

const verifiedInView = computed(
  () =>
    filteredRows.value.filter(
      (row) =>
        row.kyc_status === "verified" ||
        row.tags.some((t) => /kyc|pvc/i.test(t)),
    ).length,
);

const pageCount = computed(() => Math.max(1, Math.ceil(filteredRows.value.length / pageSize.value)));

const pagedRows = computed(() => {
  const start = (page.value - 1) * pageSize.value;
  return filteredRows.value.slice(start, start + pageSize.value);
});

const pageNumbers = computed(() => {
  const last = pageCount.value;
  if (last <= 5) return Array.from({ length: last }, (_, i) => i + 1);
  const set = new Set([1, 2, 3, last, page.value, page.value - 1, page.value + 1]);
  return [...set].filter((n) => n >= 1 && n <= last).sort((a, b) => a - b);
});

const selectedCount = computed(() => selected.value.size);
const selectedRows = computed(() => filteredRows.value.filter((row) => selected.value.has(row.id)));
const allPageSelected = computed(
  () => pagedRows.value.length > 0 && pagedRows.value.every((row) => selected.value.has(row.id)),
);

const identifiedShare = computed(() => {
  const total = metrics.value.total;
  if (!total) return "0%";
  return `${((metrics.value.identified / total) * 100).toFixed(1)}% of universe`;
});

const persuadableShare = computed(() => {
  const total = metrics.value.total;
  if (!total) return "0% of total";
  return `${((metrics.value.persuadable / total) * 100).toFixed(1)}% of total`;
});

const mapClusters = computed(() => {
  const map = new Map<string, { label: string; count: number; strong: number }>();
  for (const row of filteredRows.value) {
    const label = row.lga || row.state || "Unassigned";
    const cur = map.get(label) || { label, count: 0, strong: 0 };
    cur.count += 1;
    if (row.support_score >= 62) cur.strong += 1;
    map.set(label, cur);
  }
  return [...map.values()].sort((a, b) => b.count - a.count);
});

const matrixGroups = computed(() => {
  const order = ["Strong", "Likely", "Supporter", "Soft Support", "Undecided", "Oppose Lean"];
  const map = new Map<string, AdminCrmRow[]>();
  for (const row of filteredRows.value) {
    const key = row.support_label || "Unscored";
    const list = map.get(key) || [];
    list.push(row);
    map.set(key, list);
  }
  const keys = [...map.keys()].sort((a, b) => {
    const ia = order.indexOf(a);
    const ib = order.indexOf(b);
    return (ia === -1 ? 99 : ia) - (ib === -1 ? 99 : ib);
  });
  return keys.map((label) => ({ label, rows: map.get(label) || [] }));
});

watch(searchQuery, (value) => {
  if (value) query.value = value;
});

watch([query, segment, precinct, scoreBand, tagFilter, lastContact, pageSize], () => {
  page.value = 1;
});

async function refreshCrmMap() {
  const top = mapClusters.value[0];
  const lga =
    top?.label && top.label !== "Unassigned" && !/state/i.test(top.label) ? top.label : undefined;
  await loadCrmMap({
    state: props.stateScope !== "all" ? props.stateScope : "Ogun State",
    ...(lga ? { lga } : {}),
  });
}

watch(view, (v) => {
  if (v === "map") void refreshCrmMap();
});

watch(
  () => mapClusters.value[0]?.label,
  () => {
    if (view.value === "map") void refreshCrmMap();
  },
);

watch(pageCount, (count) => {
  if (page.value > count) page.value = count;
});

watch(
  () => form.lga,
  async (lga) => {
    form.ward = "";
    await loadWards(lga || "");
  },
);

onMounted(async () => {
  await Promise.all([refresh(), loadLgas(), refreshDispatches()]);
});

async function refreshDispatches() {
  try {
    recentDispatches.value = await listSmsDispatches();
  } catch {
    recentDispatches.value = [];
  }
}

function openSmsAnalytics(id: string) {
  openMenu.value = "";
  goToSmsAnalytics(id);
}

function onBroadcastDispatched(id: string) {
  deselectAll();
  void refreshDispatches();
  goToSmsAnalytics(id);
}

function isDonor(row: AdminCrmRow) {
  return row.account_type === "donor" || row.tags.some((t) => t.toLowerCase().includes("donor"));
}

function precinctLabel(row: AdminCrmRow) {
  if (row.ward && row.lga) return `${row.ward}, ${row.lga}`;
  return row.ward || row.lga || row.polling_unit || "";
}

function contactRef(row: AdminCrmRow) {
  const raw = row.id.replace(/^(voter|crm|agent):/, "").replace(/[^a-zA-Z0-9]/g, "");
  const short = raw.slice(-5).toUpperCase() || "00000";
  const prefix = row.source === "voter" ? "VTR" : row.source === "agent" ? "AGT" : "CRM";
  return `#${prefix}-${short}`;
}

function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}

function matchesLastContact(row: AdminCrmRow, band: "24h" | "7d" | "30d") {
  const stamp = row.last_touch_at || row.created_at;
  if (!stamp) return false;
  const then = new Date(stamp).getTime();
  if (Number.isNaN(then)) return false;
  const hours = (Date.now() - then) / 36e5;
  if (band === "24h") return hours <= 24;
  if (band === "7d") return hours <= 24 * 7;
  return hours <= 24 * 30;
}

function supportBarClass(score: number) {
  if (score >= 62) return "bg-action-green";
  if (score >= 40) return "bg-secondary";
  return "bg-outline";
}

function supportTextClass(score: number) {
  if (score >= 62) return "text-action-green";
  if (score >= 40) return "text-secondary";
  return "text-outline";
}

function tagClass(tag: string) {
  const t = tag.toLowerCase();
  if (t.includes("donor") || t.includes("undecided")) return "bg-secondary-fixed/50 text-secondary";
  if (t.includes("refus") || t.includes("oppose") || t.includes("dnc")) return "bg-error-container text-error";
  if (t.includes("agent") || t.includes("member") || t.includes("canvass") || t.includes("volunteer") || t.includes("captain")) {
    return "bg-tertiary-fixed/40 text-on-tertiary-fixed";
  }
  return "bg-surface-container-low text-on-surface";
}

function avatarClass(row: AdminCrmRow) {
  if (selected.value.has(row.id)) return "bg-deep-navy text-pure-white";
  if (row.support_score >= 90) return "bg-secondary text-pure-white";
  return "bg-surface-container-high text-primary";
}

function toggleMenu(id: typeof openMenu.value) {
  openMenu.value = openMenu.value === id ? "" : id;
  if (id !== "row") rowMenuId.value = null;
}

function toggleRowMenu(id: string) {
  if (rowMenuId.value === id) {
    rowMenuId.value = null;
    openMenu.value = "";
    return;
  }
  rowMenuId.value = id;
  openMenu.value = "row";
}

function toggleSelect(id: string) {
  const next = new Set(selected.value);
  if (next.has(id)) next.delete(id);
  else next.add(id);
  selected.value = next;
}

function toggleSelectPage() {
  const next = new Set(selected.value);
  if (allPageSelected.value) {
    for (const row of pagedRows.value) next.delete(row.id);
  } else {
    for (const row of pagedRows.value) next.add(row.id);
  }
  selected.value = next;
}

function deselectAll() {
  selected.value = new Set();
}

function bulkSelectPage() {
  if (!selectedCount.value) toggleSelectPage();
}

async function refresh() {
  loading.value = true;
  try {
    const data = await loadDirectory();
    directory.value = data;
    rows.value = data.rows;
    const keep = new Set(data.rows.map((row) => row.id));
    selected.value = new Set([...selected.value].filter((id) => keep.has(id)));
  } catch (e: unknown) {
    emit("error", crmError(e, "Could not load supporter directory."));
  } finally {
    loading.value = false;
  }
}

function exportRows(list: AdminCrmRow[], filename: string) {
  if (!list.length) {
    emit("error", "Nothing to export for the current selection.");
    return;
  }
  const header = ["Name", "ID", "Type", "Email", "Phone", "State", "LGA", "Ward", "Support", "Score", "Tags", "Activity"];
  const lines = [
    header.join(","),
    ...list.map((row) =>
      [
        row.name,
        contactRef(row),
        row.contact_type,
        row.email || "",
        row.phone || "",
        row.state || "",
        row.lga || "",
        row.ward || "",
        row.support_label,
        row.support_score,
        row.tags.join("|"),
        row.recent_activity,
      ]
        .map((value) => `"${String(value).replaceAll('"', '""')}"`)
        .join(","),
    ),
  ];
  const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
  emit("message", `Exported ${list.length} contact(s).`);
}

function exportAudience() {
  exportRows(filteredRows.value, "e-mobilize-audience.csv");
}

function exportSelected() {
  exportRows(selectedRows.value, "e-mobilize-target-list.csv");
}

function smsRow(row: AdminCrmRow) {
  if (!row.phone) {
    emit("error", `${row.name} has no phone on file.`);
    return;
  }
  if (!row.sms_ok) {
    emit("error", `${row.name} is marked do-not-contact.`);
    return;
  }
  emit("message", `SMS ready for ${row.name} at ${row.phone}. Dispatch from Field Canvassing.`);
}

function isAgentRow(row: AdminCrmRow) {
  return row.source === "agent";
}

function agentIdFromRow(row: AdminCrmRow) {
  return row.id.replace(/^agent:/, "");
}

function assignRow(row: AdminCrmRow) {
  if (!isAgentRow(row)) {
    emit("error", "Only field agents can be assigned to a turf / polling unit.");
    return;
  }
  emit("openAgent", agentIdFromRow(row));
}

function assignSelected() {
  const agents = selectedRows.value.filter(isAgentRow);
  if (!agents.length) {
    emit("error", "Select one or more field agents to assign to a turf / polling unit.");
    return;
  }
  if (agents.length === 1) {
    emit("openAgent", agentIdFromRow(agents[0]));
    return;
  }
  emit("openAgent", agentIdFromRow(agents[0]));
  emit(
    "message",
    `Opening assignment for ${agents[0].name}. ${agents.length - 1} other selected agent(s) — open each from the directory to set their polling unit turf.`,
  );
}

function broadcastSms() {
  const ready = selectedRows.value.filter((row) => row.phone && row.sms_ok);
  const filterReady = filteredRows.value.filter((row) => row.phone && row.sms_ok);
  if (!ready.length && !filterReady.length) {
    emit("error", "No SMS-ready contacts in selection or active filter.");
    return;
  }
  if (!ready.length) {
    emit("message", "No selection is SMS-ready — open the dispatch engine on the active filter.");
  }
  openMenu.value = "";
  showBroadcast.value = true;
}

function copyText(value: string | null, label: string) {
  if (!value) {
    emit("error", `No ${label} on file.`);
    return;
  }
  void navigator.clipboard.writeText(value);
  emit("message", `${label} copied.`);
  rowMenuId.value = null;
}

function openCreate() {
  showCreate.value = true;
  openMenu.value = "";
}

function addFormTag() {
  const tag = formTag.value.trim();
  if (!tag) return;
  const current = form.tags || [];
  if (!current.includes(tag)) form.tags = [...current, tag];
  formTag.value = "";
}

function removeFormTag(tag: string) {
  form.tags = (form.tags || []).filter((item) => item !== tag);
}

async function submitCreate() {
  if (!form.name.trim()) {
    emit("error", "Name is required.");
    return;
  }
  saving.value = true;
  try {
    const payload: AdminCrmContactCreate = {
      name: form.name.trim(),
      contact_type: form.contact_type,
      phone: form.phone?.trim() || null,
      email: form.email?.trim() || null,
      lga: form.lga || null,
      ward: form.ward || null,
      address: form.address?.trim() || null,
      tags: form.tags || [],
    };
    const created = await createContact(payload);
    rows.value = [created, ...rows.value];
    if (directory.value) directory.value.total += 1;
    showCreate.value = false;
    form.name = "";
    form.phone = "";
    form.email = "";
    form.contact_type = "voter";
    form.lga = "";
    form.ward = "";
    form.address = "";
    form.tags = [];
    emit("message", `${created.name} added to the directory.`);
  } catch (e: unknown) {
    emit("error", crmError(e, "Could not add supporter."));
  } finally {
    saving.value = false;
  }
}

function showingLabel() {
  if (!filteredRows.value.length) return "Showing 0 contacts in active filter";
  const start = (page.value - 1) * pageSize.value + 1;
  const end = Math.min(page.value * pageSize.value, filteredRows.value.length);
  return `Showing ${start}–${end} of ${filteredRows.value.length.toLocaleString()} contacts in active filter`;
}
</script>

<template>
  <div class="flex w-full flex-col gap-6" @click.self="openMenu = ''">
    <header class="flex flex-col gap-4 pb-1 lg:flex-row lg:items-center lg:justify-between">
      <div class="min-w-0 flex-1 flex flex-col gap-1.5">
        <div class="flex flex-wrap items-center gap-2">
          <span class="font-label-caps text-label-caps uppercase tracking-wider text-outline">HQ Central Command</span>
          <span class="text-xs text-outline">/</span>
          <span class="font-label-caps text-label-caps font-bold uppercase tracking-wider text-secondary">
            Supporter CRM &amp; Voter Intelligence
          </span>
        </div>
        <div class="flex flex-wrap items-center gap-3">
          <h1 class="font-headline-md text-2xl font-bold tracking-tight text-primary sm:text-headline-md">
            Supporter &amp; Voter Directory
          </h1>
          <div class="inline-flex items-center gap-2 rounded-full bg-surface-container-low px-3 py-1 shadow-sm">
            <span class="h-2 w-2 animate-ping rounded-full bg-action-green" />
            <span class="font-label-caps text-[11px] font-semibold text-on-surface">
              {{ metrics.total.toLocaleString() }} total · {{ verifiedInView.toLocaleString() }} verified in view
            </span>
          </div>
        </div>
      </div>
      <div class="grid w-full grid-cols-1 gap-2 sm:grid-cols-3 lg:w-auto lg:shrink-0">
        <button
          class="inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-surface-container-lowest px-4 font-button-text text-sm font-semibold text-primary shadow-sm transition hover:bg-surface-container-low"
          type="button"
          @click="bulkSelectPage"
        >
          <span class="material-symbols-outlined shrink-0 text-[18px] text-outline">checklist</span>
          <span class="truncate">Bulk actions</span>
        </button>
        <button
          class="inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-surface-container-lowest px-4 font-button-text text-sm font-semibold text-primary shadow-sm transition hover:bg-surface-container-low"
          type="button"
          @click="exportAudience"
        >
          <span class="material-symbols-outlined shrink-0 text-[18px] text-outline">file_download</span>
          <span class="truncate">Export CSV</span>
        </button>
        <button
          class="inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-electric-pink px-4 font-button-text text-sm font-semibold text-pure-white shadow-sm shadow-electric-pink/25 transition hover:opacity-95"
          type="button"
          @click="openCreate"
        >
          <span class="material-symbols-outlined shrink-0 text-[18px]">person_add</span>
          <span class="truncate">New supporter</span>
        </button>
      </div>
    </header>

      <div
        v-if="recentDispatches.length"
        class="flex flex-col gap-3 rounded-xl bg-surface-container-lowest px-4 py-3 shadow-sm sm:flex-row sm:items-center sm:justify-between"
      >
        <div class="flex min-w-0 flex-wrap items-center gap-2">
          <span class="font-label-caps text-[11px] font-semibold uppercase tracking-wider text-outline">
            SMS Broadcast Analytics
          </span>
          <button
            v-for="item in recentDispatches.slice(0, 3)"
            :key="item.id"
            type="button"
            class="inline-flex h-8 items-center rounded-lg bg-surface-container px-3 font-button-text text-xs font-semibold text-primary transition hover:bg-surface-container-high"
            @click="openSmsAnalytics(item.id)"
          >
            {{ item.title }} · {{ item.queued.toLocaleString() }}
          </button>
        </div>
        <button
          type="button"
          class="inline-flex h-8 shrink-0 items-center justify-center rounded-lg bg-deep-navy px-3 font-button-text text-xs font-semibold text-pure-white transition hover:bg-primary"
          @click="openSmsAnalytics(recentDispatches[0].id)"
        >
          Open latest report
        </button>
      </div>

      <section aria-label="CRM Metrics Summary" class="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <div class="relative flex flex-col justify-between overflow-hidden rounded-xl bg-surface-container-lowest p-5 shadow-sm">
        <div class="flex items-start justify-between">
          <div>
            <p class="font-label-caps text-label-caps font-semibold uppercase tracking-wider text-outline">Identified Supporters</p>
            <h2 class="mt-1 font-headline-md text-3xl font-extrabold tracking-tight text-primary">{{ metrics.identified.toLocaleString() }}</h2>
          </div>
          <div class="flex h-10 w-10 items-center justify-center rounded-xl bg-action-green/20 text-action-green">
            <span class="material-symbols-outlined text-[20px]">verified</span>
          </div>
        </div>
        <div class="mt-3 flex items-center justify-between">
          <span class="flex items-center gap-1 font-label-caps text-label-caps font-bold text-action-green">
            <span class="material-symbols-outlined text-[16px]">trending_up</span>
            {{ identifiedShare }}
          </span>
          <span class="font-label-caps text-xs text-outline">Live directory</span>
        </div>
      </div>

      <div class="relative flex flex-col justify-between overflow-hidden rounded-xl bg-surface-container-lowest p-5 shadow-sm">
        <div class="flex items-start justify-between gap-3">
          <div class="min-w-0">
            <p class="font-label-caps text-label-caps font-semibold uppercase tracking-wider text-outline">Persuadable / Undecided</p>
            <h2 class="mt-1 font-headline-md text-3xl font-extrabold tracking-tight text-primary">{{ metrics.persuadable.toLocaleString() }}</h2>
          </div>
          <div class="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-secondary/10 text-secondary">
            <span class="material-symbols-outlined text-[20px]">help_outline</span>
          </div>
        </div>
        <div class="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <span class="font-label-caps text-xs text-outline">{{ persuadableShare }}</span>
          <button
            type="button"
            class="inline-flex h-9 w-full shrink-0 items-center justify-center gap-1.5 rounded-lg bg-deep-navy px-3 font-button-text text-xs font-semibold text-pure-white transition hover:bg-primary sm:w-auto"
            @click="scoreBand = 'persuadable'; segment = 'undecided'"
          >
            <span>Targeted for canvass</span>
            <span class="material-symbols-outlined text-[16px]">arrow_forward</span>
          </button>
        </div>
      </div>

      <div class="relative flex flex-col justify-between overflow-hidden rounded-xl bg-surface-container-lowest p-5 shadow-sm">
        <div class="flex items-start justify-between">
          <div>
            <p class="font-label-caps text-label-caps font-semibold uppercase tracking-wider text-outline">High Donor Propensity</p>
            <h2 class="mt-1 font-headline-md text-3xl font-extrabold tracking-tight text-primary">{{ metrics.donors.toLocaleString() }}</h2>
          </div>
          <div class="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/5 text-primary">
            <span class="material-symbols-outlined text-[20px]">volunteer_activism</span>
          </div>
        </div>
        <div class="mt-3 flex items-center justify-between">
          <span class="font-label-caps text-label-caps font-bold text-primary">Donor contacts</span>
          <span class="font-label-caps text-xs font-bold text-action-green">From live records</span>
        </div>
      </div>

      <div class="relative flex flex-col justify-between overflow-hidden rounded-xl bg-surface-container-lowest p-5 shadow-sm">
        <div class="flex items-start justify-between">
          <div>
            <p class="font-label-caps text-label-caps font-semibold uppercase tracking-wider text-outline">Active Field Volunteers</p>
            <h2 class="mt-1 font-headline-md text-3xl font-extrabold tracking-tight text-primary">{{ metrics.volunteers.toLocaleString() }}</h2>
          </div>
          <div class="flex h-10 w-10 items-center justify-center rounded-xl bg-tertiary-fixed/40 text-on-tertiary-fixed">
            <span class="material-symbols-outlined text-[20px]">directions_walk</span>
          </div>
        </div>
        <div class="mt-3 flex items-center justify-between">
          <div class="flex items-center gap-1.5">
            <span class="h-2 w-2 animate-pulse rounded-full bg-action-green" />
            <span class="font-label-caps text-label-caps font-semibold text-primary">Agents &amp; members</span>
          </div>
          <span class="font-label-caps text-xs text-outline">{{ metrics.follow_up.toLocaleString() }} follow-up</span>
        </div>
      </div>
    </section>

    <div class="flex flex-col gap-3 rounded-xl bg-surface-container-lowest p-4 shadow-sm">
      <div class="flex flex-col items-stretch justify-between gap-3 lg:flex-row lg:items-center">
        <div class="relative flex-1">
          <span class="material-symbols-outlined absolute left-3 top-2.5 text-[18px] text-outline">search</span>
          <input
            v-model="query"
            class="w-full rounded-xl bg-off-white py-2 pl-9 pr-4 font-body-md text-xs text-on-surface transition-colors placeholder:text-outline focus:bg-surface-container-lowest focus:outline-none"
            placeholder="Filter by name, phone, voter ID, precinct, or tag..."
            type="text"
          />
        </div>
        <div class="flex flex-wrap items-center gap-2">
          <div class="relative">
            <button
              class="flex items-center gap-1.5 rounded-xl bg-surface-container-low px-3 py-2 font-label-caps text-xs font-bold text-primary transition-colors hover:bg-surface-container"
              type="button"
              @click.stop="toggleMenu('precinct')"
            >
              <span class="material-symbols-outlined text-[16px]">pin_drop</span>
              <span>{{ precinct || "Precinct / Ward" }}</span>
              <span class="material-symbols-outlined text-[16px]">expand_more</span>
            </button>
            <div
              v-if="openMenu === 'precinct'"
              class="absolute right-0 z-20 mt-2 max-h-64 w-64 overflow-y-auto rounded-xl bg-surface-container-lowest p-2 shadow-lg"
            >
              <button class="block w-full rounded-lg px-3 py-2 text-left text-xs hover:bg-surface-container-low" type="button" @click="precinct = ''; openMenu = ''">All precincts</button>
              <button
                v-for="opt in precinctOptions"
                :key="opt"
                class="block w-full rounded-lg px-3 py-2 text-left text-xs hover:bg-surface-container-low"
                type="button"
                @click="precinct = opt; openMenu = ''"
              >
                {{ opt }}
              </button>
            </div>
          </div>
          <div class="relative">
            <button
              class="flex items-center gap-1.5 rounded-xl bg-surface-container-low px-3 py-2 font-label-caps text-xs font-bold text-primary transition-colors hover:bg-surface-container"
              type="button"
              @click.stop="toggleMenu('score')"
            >
              <span class="material-symbols-outlined text-[16px]">stars</span>
              <span>Support Score</span>
              <span class="material-symbols-outlined text-[16px]">expand_more</span>
            </button>
            <div v-if="openMenu === 'score'" class="absolute right-0 z-20 mt-2 w-48 rounded-xl bg-surface-container-lowest p-2 shadow-lg">
              <button class="block w-full rounded-lg px-3 py-2 text-left text-xs hover:bg-surface-container-low" type="button" @click="scoreBand = 'all'; openMenu = ''">All scores</button>
              <button class="block w-full rounded-lg px-3 py-2 text-left text-xs hover:bg-surface-container-low" type="button" @click="scoreBand = 'strong'; openMenu = ''">Strong / likely</button>
              <button class="block w-full rounded-lg px-3 py-2 text-left text-xs hover:bg-surface-container-low" type="button" @click="scoreBand = 'persuadable'; openMenu = ''">Persuadable</button>
              <button class="block w-full rounded-lg px-3 py-2 text-left text-xs hover:bg-surface-container-low" type="button" @click="scoreBand = 'oppose'; openMenu = ''">Oppose lean</button>
            </div>
          </div>
          <div class="relative">
            <button
              class="flex items-center gap-1.5 rounded-xl bg-surface-container-low px-3 py-2 font-label-caps text-xs font-bold text-primary transition-colors hover:bg-surface-container"
              type="button"
              @click.stop="toggleMenu('tags')"
            >
              <span class="material-symbols-outlined text-[16px]">label</span>
              <span>{{ tagFilter || "Tags" }}</span>
              <span class="material-symbols-outlined text-[16px]">expand_more</span>
            </button>
            <div v-if="openMenu === 'tags'" class="absolute right-0 z-20 mt-2 max-h-64 w-52 overflow-y-auto rounded-xl bg-surface-container-lowest p-2 shadow-lg">
              <button class="block w-full rounded-lg px-3 py-2 text-left text-xs hover:bg-surface-container-low" type="button" @click="tagFilter = ''; openMenu = ''">All tags</button>
              <button
                v-for="tag in tagOptions"
                :key="tag"
                class="block w-full rounded-lg px-3 py-2 text-left text-xs hover:bg-surface-container-low"
                type="button"
                @click="tagFilter = tag; openMenu = ''"
              >
                {{ tag }}
              </button>
            </div>
          </div>
          <div class="relative">
            <button
              class="flex items-center gap-1.5 rounded-xl bg-surface-container-low px-3 py-2 font-label-caps text-xs font-bold text-primary transition-colors hover:bg-surface-container"
              type="button"
              @click.stop="toggleMenu('contact')"
            >
              <span class="material-symbols-outlined text-[16px]">calendar_today</span>
              <span>Last Contacted</span>
              <span class="material-symbols-outlined text-[16px]">expand_more</span>
            </button>
            <div v-if="openMenu === 'contact'" class="absolute right-0 z-20 mt-2 w-44 rounded-xl bg-surface-container-lowest p-2 shadow-lg">
              <button class="block w-full rounded-lg px-3 py-2 text-left text-xs hover:bg-surface-container-low" type="button" @click="lastContact = 'all'; openMenu = ''">Any time</button>
              <button class="block w-full rounded-lg px-3 py-2 text-left text-xs hover:bg-surface-container-low" type="button" @click="lastContact = '24h'; openMenu = ''">Last 24 hours</button>
              <button class="block w-full rounded-lg px-3 py-2 text-left text-xs hover:bg-surface-container-low" type="button" @click="lastContact = '7d'; openMenu = ''">Last 7 days</button>
              <button class="block w-full rounded-lg px-3 py-2 text-left text-xs hover:bg-surface-container-low" type="button" @click="lastContact = '30d'; openMenu = ''">Last 30 days</button>
            </div>
          </div>
          <div class="ml-1 flex items-center rounded-xl bg-surface-container-low p-0.5">
            <button class="rounded-lg p-1.5" :class="view === 'table' ? 'bg-surface-container-lowest text-primary shadow-sm' : 'text-outline hover:text-primary'" title="Table View" type="button" @click="view = 'table'">
              <span class="material-symbols-outlined text-[18px]">table_rows</span>
            </button>
            <button class="rounded-lg p-1.5" :class="view === 'map' ? 'bg-surface-container-lowest text-primary shadow-sm' : 'text-outline hover:text-primary'" title="Map Split View" type="button" @click="view = 'map'">
              <span class="material-symbols-outlined text-[18px]">map</span>
            </button>
            <button class="rounded-lg p-1.5" :class="view === 'grid' ? 'bg-surface-container-lowest text-primary shadow-sm' : 'text-outline hover:text-primary'" title="Segment Matrix" type="button" @click="view = 'grid'">
              <span class="material-symbols-outlined text-[18px]">grid_view</span>
            </button>
          </div>
        </div>
      </div>

      <div class="flex items-center gap-2 overflow-x-auto pb-1 text-xs">
        <span class="mr-1 shrink-0 font-label-caps text-[10px] font-semibold uppercase tracking-wider text-outline">Segments:</span>
        <button
          class="inline-flex h-8 shrink-0 items-center gap-1.5 rounded-lg px-3 font-button-text text-xs font-semibold shadow-sm"
          :class="segment === 'all' ? 'bg-deep-navy text-pure-white' : 'bg-surface-container text-on-surface hover:bg-surface-container-high'"
          type="button"
          @click="segment = 'all'"
        >
          <span>All voters</span>
          <span class="text-[10px] opacity-80">{{ metrics.total.toLocaleString() }}</span>
        </button>
        <button
          class="inline-flex h-8 shrink-0 items-center gap-1.5 rounded-lg px-3 font-button-text text-xs font-semibold transition"
          :class="segment === 'turnout' ? 'bg-deep-navy text-pure-white' : 'bg-surface-container text-on-surface hover:bg-surface-container-high'"
          type="button"
          @click="segment = 'turnout'"
        >
          <span>High turnout</span>
          <span class="text-[10px] opacity-80">{{ metrics.high_turnout.toLocaleString() }}</span>
        </button>
        <button
          class="inline-flex h-8 shrink-0 items-center gap-1.5 rounded-lg px-3 font-button-text text-xs font-semibold transition"
          :class="segment === 'undecided' ? 'bg-deep-navy text-pure-white' : 'bg-surface-container text-on-surface hover:bg-surface-container-high'"
          type="button"
          @click="segment = 'undecided'"
        >
          <span>Undecided</span>
          <span class="text-[10px] opacity-80">{{ metrics.persuadable.toLocaleString() }}</span>
        </button>
        <button
          class="inline-flex h-8 shrink-0 items-center gap-1.5 rounded-lg px-3 font-button-text text-xs font-semibold transition"
          :class="segment === 'donors' ? 'bg-deep-navy text-pure-white' : 'bg-surface-container text-on-surface hover:bg-surface-container-high'"
          type="button"
          @click="segment = 'donors'"
        >
          <span>Donors</span>
          <span class="text-[10px] opacity-80">{{ metrics.donors.toLocaleString() }}</span>
        </button>
        <button
          class="inline-flex h-8 shrink-0 items-center gap-1.5 rounded-lg px-3 font-button-text text-xs font-semibold transition"
          :class="segment === 'followup' ? 'bg-deep-navy text-pure-white' : 'bg-surface-container text-on-surface hover:bg-surface-container-high'"
          type="button"
          @click="segment = 'followup'"
        >
          <span>Follow-up</span>
          <span class="text-[10px] opacity-80">{{ metrics.follow_up.toLocaleString() }}</span>
        </button>
        <button
          class="inline-flex h-8 shrink-0 items-center gap-1 rounded-lg bg-surface-container px-3 font-button-text text-xs font-semibold text-primary transition hover:bg-surface-container-high"
          type="button"
          @click="toggleMenu('tags')"
        >
          <span class="material-symbols-outlined text-[14px]">add</span>
          <span>Add filter</span>
        </button>
      </div>
    </div>

    <div v-if="view === 'map'" class="grid gap-4 lg:grid-cols-12">
      <div class="relative h-80 overflow-hidden rounded-xl bg-deep-navy lg:col-span-5">
        <GoogleMapPanel
          class="absolute inset-0"
          :center="crmMapCenter"
          :zoom="11"
          :markers="crmMapMarkers"
          :loading="crmMapLoading"
        />
        <div class="pointer-events-none absolute left-4 top-4 z-10 rounded-xl bg-deep-navy/90 px-3 py-2 text-pure-white shadow-lg">
          <p class="font-label-caps text-label-caps text-action-green">LGA clusters</p>
          <p class="text-sm font-bold">{{ mapClusters[0]?.label || crmMapData?.lga || "No contacts in view" }}</p>
          <p class="text-xs text-on-navy">
            <template v-if="crmMapData">
              {{ crmMapData.live_count }} live · {{ crmMapData.registered_count }} registered ·
              {{ filteredRows.length.toLocaleString() }} contact(s)
            </template>
            <template v-else>{{ filteredRows.length.toLocaleString() }} contact(s) after filters</template>
          </p>
        </div>
      </div>
      <div class="lg:col-span-7">
        <div v-if="!mapClusters.length" class="rounded-xl bg-surface-container-lowest p-8 text-center text-sm text-outline">No precinct clusters for this filter.</div>
        <div v-else class="grid gap-3 sm:grid-cols-2">
          <div v-for="cluster in mapClusters" :key="cluster.label" class="rounded-xl bg-surface-container-lowest p-4 shadow-sm">
            <p class="font-button-text text-sm font-bold text-primary">{{ cluster.label }}</p>
            <p class="mt-1 text-xs text-outline">{{ cluster.count.toLocaleString() }} contacts · {{ cluster.strong.toLocaleString() }} identified</p>
          </div>
        </div>
      </div>
    </div>

    <div v-else-if="view === 'grid'" class="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      <div v-for="group in matrixGroups" :key="group.label" class="rounded-xl bg-surface-container-lowest p-4 shadow-sm">
        <div class="mb-3 flex items-center justify-between">
          <h3 class="font-button-text text-sm font-bold text-primary">{{ group.label }}</h3>
          <span class="font-label-caps text-xs text-outline">{{ group.rows.length }}</span>
        </div>
        <ul class="space-y-2">
          <li v-for="row in group.rows.slice(0, 8)" :key="row.id" class="flex items-center justify-between gap-2 text-xs">
            <span class="truncate font-medium text-primary">{{ row.name }}</span>
            <span class="font-label-caps text-outline">{{ row.lga || "—" }}</span>
          </li>
        </ul>
      </div>
    </div>

    <div v-else class="flex flex-col overflow-hidden rounded-xl bg-surface-container-lowest shadow-sm">
      <div v-if="loading" class="p-10 text-center text-sm text-outline">Loading directory…</div>
      <div v-else class="w-full overflow-x-auto">
        <table class="w-full border-collapse text-left text-xs">
          <thead class="bg-surface-container-low font-label-caps text-[11px] uppercase tracking-wider text-outline">
            <tr class="border-b border-surface-container-low">
              <th class="w-10 px-4 py-3.5 text-center">
                <input class="rounded" type="checkbox" :checked="allPageSelected" :disabled="!pagedRows.length" @change="toggleSelectPage" />
              </th>
              <th class="px-4 py-3.5 font-semibold">Supporter / Voter</th>
              <th class="px-4 py-3.5 font-semibold">Precinct &amp; Address</th>
              <th class="px-4 py-3.5 font-semibold">Contact &amp; Reachability</th>
              <th class="px-4 py-3.5 font-semibold">Support Model</th>
              <th class="px-4 py-3.5 font-semibold">Civic Tags &amp; Roles</th>
              <th class="px-4 py-3.5 font-semibold">Recent Activity</th>
              <th class="px-4 py-3.5 text-right font-semibold">Actions</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-surface-container-low font-body-md text-on-surface">
            <tr v-if="!filteredRows.length">
              <td colspan="8" class="px-4 py-10 text-center text-sm text-outline">
                No supporters or voters match the current filter.
              </td>
            </tr>
            <tr
              v-for="row in pagedRows"
              :key="row.id"
              class="transition-colors hover:bg-off-white/60"
              :class="selected.has(row.id) ? 'bg-secondary/5' : ''"
            >
              <td class="px-4 py-3.5 text-center">
                <input class="rounded" type="checkbox" :checked="selected.has(row.id)" @change="toggleSelect(row.id)" />
              </td>
              <td class="px-4 py-3.5">
                <div class="flex items-center gap-3">
                  <div class="flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold" :class="avatarClass(row)">
                    {{ initials(row.name) }}
                  </div>
                  <div class="flex flex-col">
                    <span class="font-button-text text-sm font-bold text-primary">{{ row.name }}</span>
                    <div class="flex items-center gap-1.5 font-label-caps text-[11px] text-outline">
                      <span class="font-semibold text-primary">{{ contactRef(row) }}</span>
                      <span>·</span>
                      <span class="capitalize">{{ row.contact_type }}</span>
                    </div>
                  </div>
                </div>
              </td>
              <td class="px-4 py-3.5">
                <div class="flex flex-col">
                  <span class="font-medium text-primary">{{ precinctLabel(row) || "Unassigned precinct" }}</span>
                  <span class="text-[11px] text-outline">{{ row.address || row.polling_unit || row.state || "—" }}</span>
                </div>
              </td>
              <td class="px-4 py-3.5">
                <div class="flex flex-col gap-0.5">
                  <div class="flex items-center gap-1.5">
                    <span class="font-label-caps font-semibold text-primary">{{ row.phone || "No phone" }}</span>
                    <span
                      class="rounded px-1.5 font-label-caps text-[10px] font-bold"
                      :class="row.sms_ok && row.phone ? 'bg-action-green/20 text-on-tertiary-fixed' : 'bg-error-container text-error'"
                    >
                      {{ row.sms_ok && row.phone ? "SMS OK" : "DNC Phone" }}
                    </span>
                  </div>
                  <span class="max-w-[140px] truncate text-[11px] text-outline">{{ row.email || "No email" }}</span>
                </div>
              </td>
              <td class="px-4 py-3.5">
                <div class="flex w-28 flex-col gap-1">
                  <div class="flex items-center justify-between font-label-caps text-[11px]">
                    <span class="font-bold text-primary">{{ row.support_label }}</span>
                    <span class="font-bold" :class="supportTextClass(row.support_score)">{{ row.support_score }}%</span>
                  </div>
                  <div class="h-1.5 w-full overflow-hidden rounded-full bg-surface-container-high">
                    <div class="h-full rounded-full" :class="supportBarClass(row.support_score)" :style="{ width: `${row.support_score}%` }" />
                  </div>
                </div>
              </td>
              <td class="px-4 py-3.5">
                <div class="flex max-w-xs flex-wrap items-center gap-1.5">
                  <span
                    v-for="tag in row.tags.slice(0, 3)"
                    :key="tag"
                    class="rounded-full px-2 py-0.5 font-label-caps text-[10px] font-bold"
                    :class="tagClass(tag)"
                  >
                    {{ tag }}
                  </span>
                </div>
              </td>
              <td class="px-4 py-3.5">
                <div class="flex flex-col">
                  <span class="text-[11px] font-medium text-primary">{{ row.recent_activity }}</span>
                  <span class="font-label-caps text-[10px] text-outline">{{ row.recent_when || "—" }}</span>
                </div>
              </td>
              <td class="px-4 py-3.5 text-right">
                <div class="relative flex flex-wrap items-center justify-end gap-1.5">
                  <button
                    class="inline-flex h-8 items-center justify-center rounded-lg bg-surface-container px-2.5 text-primary transition hover:bg-surface-container-high"
                    title="Send Direct SMS"
                    type="button"
                    @click="smsRow(row)"
                  >
                    <span class="material-symbols-outlined text-[18px]">sms</span>
                  </button>
                  <button
                    v-if="isAgentRow(row)"
                    class="inline-flex h-8 items-center justify-center rounded-lg bg-surface-container px-2.5 text-primary transition hover:bg-surface-container-high"
                    title="Assign to turf / polling unit"
                    type="button"
                    @click="assignRow(row)"
                  >
                    <span class="material-symbols-outlined text-[18px]">person_pin</span>
                  </button>
                  <button
                    class="inline-flex h-8 items-center justify-center rounded-lg bg-surface-container px-2.5 text-primary transition hover:bg-surface-container-high"
                    title="More Options"
                    type="button"
                    @click.stop="toggleRowMenu(row.id)"
                  >
                    <span class="material-symbols-outlined text-[18px]">more_vert</span>
                  </button>
                  <div
                    v-if="rowMenuId === row.id"
                    class="absolute right-0 top-9 z-20 w-40 rounded-xl bg-surface-container-lowest p-2 text-left shadow-lg"
                  >
                    <button class="block w-full rounded-lg px-3 py-2 text-left text-xs hover:bg-surface-container-low" type="button" @click="copyText(row.phone, 'Phone')">Copy phone</button>
                    <button class="block w-full rounded-lg px-3 py-2 text-left text-xs hover:bg-surface-container-low" type="button" @click="copyText(row.email, 'Email')">Copy email</button>
                  </div>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div
        v-if="selectedCount"
        class="flex flex-col items-center justify-between gap-2 border-t border-surface-container-lowest/10 bg-deep-navy px-5 py-2.5 text-pure-white sm:flex-row"
      >
        <div class="flex items-center gap-3">
          <div class="flex items-center gap-2">
            <span class="h-2 w-2 animate-pulse rounded-full bg-electric-pink" />
            <span class="font-label-caps text-xs font-bold text-pure-white">{{ selectedCount }} Contact{{ selectedCount === 1 ? "" : "s" }} Selected</span>
          </div>
          <span class="hidden text-xs text-on-primary-container sm:inline">| Ready for operational batch dispatch</span>
        </div>
        <div class="flex flex-wrap items-center gap-2">
          <button
            class="inline-flex h-8 items-center justify-center gap-1.5 rounded-lg bg-pure-white/15 px-3 font-button-text text-xs font-semibold text-pure-white transition hover:bg-pure-white/25"
            type="button"
            @click="assignSelected"
          >
            <span class="material-symbols-outlined text-[16px]">pin_drop</span>
            <span>Assign polling unit</span>
          </button>
          <button
            class="inline-flex h-8 items-center justify-center gap-1.5 rounded-lg bg-pure-white/15 px-3 font-button-text text-xs font-semibold text-pure-white transition hover:bg-pure-white/25"
            type="button"
            @click="broadcastSms"
          >
            <span class="material-symbols-outlined text-[16px]">sms</span>
            <span>Broadcast SMS</span>
          </button>
          <button
            class="inline-flex h-8 items-center justify-center gap-1.5 rounded-lg bg-pure-white/15 px-3 font-button-text text-xs font-semibold text-pure-white transition hover:bg-pure-white/25"
            type="button"
            @click="exportSelected"
          >
            <span class="material-symbols-outlined text-[16px]">download</span>
            <span>Export list</span>
          </button>
          <button
            class="inline-flex h-8 items-center justify-center rounded-lg bg-pure-white/10 px-3 font-button-text text-xs font-semibold text-on-primary-container transition hover:bg-pure-white/20 hover:text-pure-white"
            type="button"
            @click="deselectAll"
          >
            Deselect
          </button>
        </div>
      </div>

      <div v-if="!loading" class="flex flex-col items-center justify-between gap-3 border-t border-surface-container-low bg-surface-container-lowest p-4 sm:flex-row">
        <div class="flex items-center gap-4 text-xs">
          <span class="font-label-caps text-outline">{{ showingLabel() }}</span>
          <div class="flex items-center gap-1.5">
            <span class="font-label-caps text-[10px] text-outline">Rows:</span>
            <select v-model.number="pageSize" class="rounded bg-surface-container-low px-2 py-0.5 text-xs text-primary focus:outline-none">
              <option :value="25">25 per page</option>
              <option :value="50">50 per page</option>
              <option :value="100">100 per page</option>
            </select>
          </div>
        </div>
        <div class="flex items-center gap-1.5 text-xs">
          <button
            class="rounded bg-surface-container-low px-3 py-1 text-on-surface transition-colors hover:bg-surface-container disabled:opacity-50"
            type="button"
            :disabled="page <= 1"
            @click="page -= 1"
          >
            Previous
          </button>
          <template v-for="(n, idx) in pageNumbers" :key="n">
            <span v-if="idx && n - pageNumbers[idx - 1] > 1" class="px-1 text-outline">...</span>
            <button
              class="h-7 rounded font-label-caps"
              :class="n === page ? 'w-7 bg-deep-navy font-bold text-pure-white' : 'min-w-7 bg-surface-container-low px-2 text-on-surface hover:bg-surface-container'"
              type="button"
              @click="page = n"
            >
              {{ n.toLocaleString() }}
            </button>
          </template>
          <button
            class="rounded bg-deep-navy px-3 py-1 text-pure-white transition-colors hover:bg-primary disabled:opacity-50"
            type="button"
            :disabled="page >= pageCount"
            @click="page += 1"
          >
            Next
          </button>
        </div>
      </div>
    </div>

    <AdminCrmSmsBroadcastModal
      :open="showBroadcast"
      :selected-rows="selectedRows"
      :filter-rows="filteredRows"
      @close="showBroadcast = false"
      @error="(msg: string) => emit('error', msg)"
      @message="(msg: string) => emit('message', msg)"
      @dispatched="onBroadcastDispatched"
    />

    <div v-if="showCreate" class="fixed inset-0 z-[60] flex items-center justify-center bg-deep-navy/50 p-4" @click.self="showCreate = false">
      <div class="w-full max-w-lg rounded-2xl bg-surface-container-lowest p-6 shadow-xl">
        <h2 class="font-headline-md text-xl font-bold text-primary">New supporter / voter</h2>
        <p class="mt-1 text-xs text-outline">Adds a HQ CRM contact. This is not a login account.</p>
        <div class="mt-4 grid gap-3 sm:grid-cols-2">
          <label class="sm:col-span-2">
            <span class="font-label-caps text-[11px] uppercase text-outline">Name</span>
            <input v-model="form.name" class="mt-1 w-full rounded-xl bg-off-white px-3 py-2 text-sm text-on-surface focus:outline-none" type="text" />
          </label>
          <label>
            <span class="font-label-caps text-[11px] uppercase text-outline">Phone</span>
            <input v-model="form.phone" class="mt-1 w-full rounded-xl bg-off-white px-3 py-2 text-sm text-on-surface focus:outline-none" type="tel" />
          </label>
          <label>
            <span class="font-label-caps text-[11px] uppercase text-outline">Email</span>
            <input v-model="form.email" class="mt-1 w-full rounded-xl bg-off-white px-3 py-2 text-sm text-on-surface focus:outline-none" type="email" />
          </label>
          <label>
            <span class="font-label-caps text-[11px] uppercase text-outline">Type</span>
            <select v-model="form.contact_type" class="mt-1 w-full rounded-xl bg-off-white px-3 py-2 text-sm text-on-surface focus:outline-none">
              <option value="voter">Voter</option>
              <option value="member">Member</option>
              <option value="donor">Donor</option>
            </select>
          </label>
          <label>
            <span class="font-label-caps text-[11px] uppercase text-outline">LGA</span>
            <select v-model="form.lga" class="mt-1 w-full rounded-xl bg-off-white px-3 py-2 text-sm text-on-surface focus:outline-none">
              <option value="">Select LGA</option>
              <option v-for="lga in lgas" :key="lga" :value="lga">{{ lga }}</option>
            </select>
          </label>
          <label>
            <span class="font-label-caps text-[11px] uppercase text-outline">Ward</span>
            <select v-model="form.ward" class="mt-1 w-full rounded-xl bg-off-white px-3 py-2 text-sm text-on-surface focus:outline-none" :disabled="!form.lga">
              <option value="">Select ward</option>
              <option v-for="ward in wards" :key="ward" :value="ward">{{ ward }}</option>
            </select>
          </label>
          <label class="sm:col-span-2">
            <span class="font-label-caps text-[11px] uppercase text-outline">Address</span>
            <input v-model="form.address" class="mt-1 w-full rounded-xl bg-off-white px-3 py-2 text-sm text-on-surface focus:outline-none" type="text" />
          </label>
          <label class="sm:col-span-2">
            <span class="font-label-caps text-[11px] uppercase text-outline">Tags</span>
            <div class="mt-1 flex gap-2">
              <input v-model="formTag" class="w-full rounded-xl bg-off-white px-3 py-2 text-sm text-on-surface focus:outline-none" type="text" @keydown.enter.prevent="addFormTag" />
              <button class="rounded-xl bg-surface-container-low px-3 text-xs font-bold text-primary" type="button" @click="addFormTag">Add</button>
            </div>
            <div class="mt-2 flex flex-wrap gap-1.5">
              <button
                v-for="tag in form.tags"
                :key="tag"
                class="rounded-full bg-surface-container-low px-2 py-0.5 font-label-caps text-[10px] text-on-surface"
                type="button"
                @click="removeFormTag(tag)"
              >
                {{ tag }} ×
              </button>
            </div>
          </label>
        </div>
        <div class="mt-5 flex justify-end gap-2">
          <button class="rounded-xl bg-surface-container-low px-4 py-2 text-sm text-primary" type="button" @click="showCreate = false">Cancel</button>
          <button class="rounded-xl bg-electric-pink px-4 py-2 text-sm text-on-primary disabled:opacity-50" type="button" :disabled="saving" @click="submitCreate">
            {{ saving ? "Saving…" : "Save contact" }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
