<script setup lang="ts">
import {
  useAdminCrm,
  type AdminCrmContactCreate,
  type AdminCrmDirectory,
  type AdminCrmDirectoryQuery,
  type AdminCrmRow,
  type AdminCrmSmsDispatchSummary,
} from "~/composables/useAdminCrm";

const props = withDefaults(
  defineProps<{
    stateScope?: string;
    /** voters = exclude field-agent accounts; all = mixed directory */
    audience?: "voters" | "all";
  }>(),
  { stateScope: "all", audience: "voters" },
);

const emit = defineEmits<{
  (e: "error", msg: string): void;
  (e: "message", msg: string): void;
  (e: "openAgent", agentId: string): void;
}>();

const {
  loadDirectory,
  createContact,
  importVoters,
  deleteContact,
  deleteContacts,
  deleteAllContacts,
  listSmsDispatches,
  crmError,
} = useAdminCrm();
const { selectedOrg } = useAdminOrgContext();
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
const phoneFilter = ref("");
const pollingUnit = ref("");
const puSearch = ref("");
const scoreBand = ref<"all" | "strong" | "persuadable" | "oppose">("all");
const tagFilter = ref("");
const lastContact = ref<"all" | "24h" | "7d" | "30d">("all");
const openMenu = ref<"" | "precinct" | "pu" | "score" | "tags" | "contact" | "row">("");
const rowMenuId = ref<string | null>(null);

const page = ref(1);
const pageSize = ref(25);
// Selected rows keyed by id, kept across pages so batch actions work on everything ticked.
const selected = ref<Map<string, AdminCrmRow>>(new Map());
const fetching = ref(false);
let requestSeq = 0;

const showCreate = ref(false);
const showBroadcast = ref(false);
const importing = ref(false);
const importInput = ref<HTMLInputElement | null>(null);
const recentDispatches = ref<AdminCrmSmsDispatchSummary[]>([]);
const deleting = ref(false);
const pendingDelete = ref<null | { mode: "one"; row: AdminCrmRow } | { mode: "selected" } | { mode: "all" }>(null);
const deleteAllConfirmText = ref("");
const deleteAllImportsOnly = ref(false);
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

const emptyMetrics = {
  total: 0,
  identified: 0,
  persuadable: 0,
  donors: 0,
  volunteers: 0,
  follow_up: 0,
  high_turnout: 0,
};

// Metrics, filter options, clusters and the matrix all come from the server, computed over
// the full scoped directory — the browser only ever holds one page of rows.
const metrics = computed(() => {
  const d = directory.value;
  if (!d) return emptyMetrics;
  return {
    total: d.total,
    identified: d.identified,
    persuadable: d.persuadable,
    donors: d.donors,
    volunteers: d.volunteers,
    follow_up: d.follow_up,
    high_turnout: d.high_turnout,
  };
});

const precinctOptions = computed(() => directory.value?.precinct_options ?? []);
// A precinct can hold hundreds of units, so the menu has its own search and shows the first 200 matches.
const pollingUnitOptions = computed(() => {
  const needle = puSearch.value.trim().toLowerCase();
  const all = directory.value?.polling_unit_options ?? [];
  return (needle ? all.filter((pu) => pu.toLowerCase().includes(needle)) : all).slice(0, 200);
});
const tagOptions = computed(() => directory.value?.tag_options ?? []);
const filteredTotal = computed(() => directory.value?.filtered_total ?? 0);
const verifiedInView = computed(() => directory.value?.verified_in_view ?? 0);
const mapClusters = computed(() => directory.value?.clusters ?? []);
const matrixGroups = computed(() => directory.value?.matrix ?? []);

const pageCount = computed(() => Math.max(1, Math.ceil(filteredTotal.value / pageSize.value)));

const pagedRows = computed(() => rows.value);

const pageNumbers = computed(() => {
  const last = pageCount.value;
  if (last <= 5) return Array.from({ length: last }, (_, i) => i + 1);
  const set = new Set([1, 2, 3, last, page.value, page.value - 1, page.value + 1]);
  return [...set].filter((n) => n >= 1 && n <= last).sort((a, b) => a - b);
});

const selectedCount = computed(() => selected.value.size);
const selectedRows = computed(() => [...selected.value.values()]);
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

function directoryQuery(): AdminCrmDirectoryQuery {
  return {
    audience: props.audience,
    state: props.stateScope && props.stateScope !== "all" ? props.stateScope : undefined,
    q: query.value.trim() || undefined,
    segment: segment.value,
    precinct: precinct.value || undefined,
    phone: phoneFilter.value.replace(/\D/g, "") || undefined,
    polling_unit: pollingUnit.value || undefined,
    score_band: scoreBand.value,
    tag: tagFilter.value || undefined,
    last_contact: lastContact.value,
  };
}

/** Every row matching the active filter (server-capped), for export / select-all / broadcast. */
async function loadAllFiltered() {
  const data = await loadDirectory({ ...directoryQuery(), all_rows: true });
  if (data.truncated) {
    emit("message", `Only the first ${data.rows.length.toLocaleString()} of ${data.filtered_total.toLocaleString()} matching contacts were loaded — narrow the filter to reach the rest.`);
  }
  return data.rows;
}

watch(searchQuery, (value) => {
  if (value) query.value = value;
});

let searchTimer: ReturnType<typeof setTimeout> | undefined;
watch([query, phoneFilter], () => {
  clearTimeout(searchTimer);
  searchTimer = setTimeout(() => {
    if (page.value === 1) void refresh();
    else page.value = 1;
  }, 300);
});

watch([segment, precinct, pollingUnit, scoreBand, tagFilter, lastContact, pageSize], () => {
  if (page.value === 1) void refresh();
  else page.value = 1;
});

watch(page, () => {
  void refresh();
});

onBeforeUnmount(() => clearTimeout(searchTimer));

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

watch(
  () => selectedOrg.value?.id,
  () => {
    deselectAll();
    if (page.value === 1) void refresh();
    else page.value = 1;
  },
);

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

function toggleSelect(row: AdminCrmRow) {
  const next = new Map(selected.value);
  if (next.has(row.id)) next.delete(row.id);
  else next.set(row.id, row);
  selected.value = next;
}

function toggleSelectPage() {
  const next = new Map(selected.value);
  if (allPageSelected.value) {
    for (const row of pagedRows.value) next.delete(row.id);
  } else {
    for (const row of pagedRows.value) next.set(row.id, row);
  }
  selected.value = next;
}

function deselectAll() {
  selected.value = new Map();
}

const selectingAll = ref(false);

async function selectAllFiltered() {
  selectingAll.value = true;
  try {
    const all = await loadAllFiltered();
    selected.value = new Map(all.map((row) => [row.id, row]));
  } catch (e: unknown) {
    emit("error", crmError(e, "Could not select every matching contact."));
  } finally {
    selectingAll.value = false;
  }
}

function bulkSelectPage() {
  if (!selectedCount.value) toggleSelectPage();
}

async function refresh() {
  const seq = ++requestSeq;
  fetching.value = true;
  try {
    const data = await loadDirectory({ ...directoryQuery(), page: page.value, page_size: pageSize.value });
    if (seq !== requestSeq) return; // a newer filter/page request superseded this one
    directory.value = data;
    rows.value = data.rows;
    // The server clamps the page when the result set shrinks (e.g. after deletes).
    if (data.page !== page.value) page.value = data.page;
  } catch (e: unknown) {
    if (seq === requestSeq) emit("error", crmError(e, "Could not load supporter directory."));
  } finally {
    if (seq === requestSeq) {
      fetching.value = false;
      loading.value = false;
    }
  }
}

function exportRows(list: AdminCrmRow[], filename: string) {
  if (!list.length) {
    emit("error", "Nothing to export for the current selection.");
    return;
  }
  const header = ["Name", "ID", "Type", "VIN", "Email", "Phone", "State", "LGA", "Ward", "Polling Unit", "Support", "Score", "Tags", "Activity"];
  const lines = [
    header.join(","),
    ...list.map((row) =>
      [
        row.name,
        contactRef(row),
        row.contact_type,
        row.vin || "",
        row.email || "",
        row.phone || "",
        row.state || "",
        row.lga || "",
        row.ward || "",
        row.polling_unit || "",
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

const exporting = ref(false);

async function exportAudience() {
  exporting.value = true;
  try {
    exportRows(await loadAllFiltered(), "e-mobilize-audience.csv");
  } catch (e: unknown) {
    emit("error", crmError(e, "Could not export the directory."));
  } finally {
    exporting.value = false;
  }
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

const broadcastFilterRows = ref<AdminCrmRow[]>([]);

async function broadcastSms() {
  const ready = selectedRows.value.filter((row) => row.phone && row.sms_ok);
  try {
    broadcastFilterRows.value = await loadAllFiltered();
  } catch (e: unknown) {
    emit("error", crmError(e, "Could not load the active filter for broadcast."));
    return;
  }
  const filterReady = broadcastFilterRows.value.filter((row) => row.phone && row.sms_ok);
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

function pickImportFile() {
  importInput.value?.click();
}

async function onImportFile(event: Event) {
  const input = event.target as HTMLInputElement;
  const file = input.files?.[0];
  input.value = "";
  if (!file) return;
  importing.value = true;
  try {
    const result = await importVoters(file);
    const parts = [
      `${result.created} created`,
      `${result.updated} updated`,
      result.skipped ? `${result.skipped} skipped` : null,
    ].filter(Boolean);
    emit(
      "message",
      `Bulk import complete${result.org_name ? ` for ${result.org_name}` : ""}: ${parts.join(", ")}.`,
    );
    if (result.errors?.length) {
      const more = result.errors.length > 3 ? ` (+${result.errors.length - 3} more)` : "";
      emit("error", `${result.errors.slice(0, 3).join(" · ")}${more}`);
    }
    await refresh();
  } catch (e: unknown) {
    emit("error", crmError(e, "Bulk import failed."));
  } finally {
    importing.value = false;
  }
}

function downloadSampleTemplate() {
  const headers = ["LGA", "Ward", "Polling Unit", "Voter Name", "Phone Number", "Gender", "DOB-Y", "VIN"];
  const sample = [
    "Abeokuta South",
    "Ake I",
    "ST. PETERS SCHOOL AKE",
    "DOE, JANE ADEOLA",
    "08012345678",
    "F",
    "1990",
    "90F5AF5792502445847",
  ];
  const csv = `${headers.join(",")}\n${sample.map((c) => `"${c}"`).join(",")}\n`;
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "bulk-voters-sample.csv";
  a.click();
  URL.revokeObjectURL(url);
  emit("message", "Downloaded CSV sample (same columns as the Excel template).");
}

const deletableSelected = computed(() => selectedRows.value.filter((row) => !isAgentRow(row)));

const deleteDialogTitle = computed(() => {
  const pending = pendingDelete.value;
  if (!pending) return "";
  if (pending.mode === "one") return `Delete ${pending.row.name}?`;
  if (pending.mode === "selected") {
    const n = deletableSelected.value.length;
    return `Delete ${n.toLocaleString()} selected contact${n === 1 ? "" : "s"}?`;
  }
  return deleteAllImportsOnly.value ? "Delete all bulk-imported voters?" : "Delete all voters & contacts?";
});

const deleteAllReady = computed(() => deleteAllConfirmText.value.trim().toUpperCase() === "DELETE");

function askDeleteRow(row: AdminCrmRow) {
  rowMenuId.value = null;
  openMenu.value = "";
  if (isAgentRow(row)) {
    emit("error", "Field agents are removed from Agent Management, not the voter directory.");
    return;
  }
  pendingDelete.value = { mode: "one", row };
}

function askDeleteSelected() {
  if (!deletableSelected.value.length) {
    emit("error", "No deletable voters in the selection (field agents are managed separately).");
    return;
  }
  pendingDelete.value = { mode: "selected" };
}

function askDeleteAll() {
  openMenu.value = "";
  deleteAllConfirmText.value = "";
  deleteAllImportsOnly.value = false;
  pendingDelete.value = { mode: "all" };
}

function closeDeleteDialog() {
  if (deleting.value) return;
  pendingDelete.value = null;
}

async function confirmDelete() {
  const pending = pendingDelete.value;
  if (!pending) return;
  if (pending.mode === "all" && !deleteAllReady.value) return;
  deleting.value = true;
  try {
    let result;
    if (pending.mode === "one") {
      result = await deleteContact(pending.row.id);
    } else if (pending.mode === "selected") {
      result = await deleteContacts(deletableSelected.value.map((row) => row.id));
    } else {
      result = await deleteAllContacts({ bulkImportOnly: deleteAllImportsOnly.value });
    }
    pendingDelete.value = null;
    if (pending.mode === "one") {
      const next = new Map(selected.value);
      next.delete(pending.row.id);
      selected.value = next;
    } else {
      deselectAll();
    }
    emit(
      "message",
      pending.mode === "one"
        ? `${pending.row.name} deleted from the directory.`
        : `Deleted ${result.deleted.toLocaleString()} contact(s)${result.skipped ? `, ${result.skipped} skipped` : ""}.`,
    );
    if (result.errors?.length) emit("error", result.errors.slice(0, 3).join(" · "));
    await refresh();
  } catch (e: unknown) {
    emit("error", crmError(e, "Could not delete contact(s)."));
  } finally {
    deleting.value = false;
  }
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
    showCreate.value = false;
    void refresh();
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
  if (!filteredTotal.value) return "Showing 0 contacts in active filter";
  const start = (page.value - 1) * pageSize.value + 1;
  const end = Math.min(page.value * pageSize.value, filteredTotal.value);
  return `Showing ${start}–${end} of ${filteredTotal.value.toLocaleString()} contacts in active filter`;
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
      <div class="grid w-full grid-cols-1 gap-2 sm:grid-cols-2 lg:w-auto lg:shrink-0 lg:grid-cols-5">
        <button
          class="inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-surface-container-lowest px-4 font-button-text text-sm font-semibold text-primary shadow-sm transition hover:bg-surface-container-low"
          type="button"
          :disabled="importing"
          @click="pickImportFile"
        >
          <span class="material-symbols-outlined shrink-0 text-[18px] text-outline">upload_file</span>
          <span class="truncate">{{ importing ? "Importing…" : "Import Excel" }}</span>
        </button>
        <button
          class="inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-surface-container-lowest px-4 font-button-text text-sm font-semibold text-primary shadow-sm transition hover:bg-surface-container-low"
          type="button"
          :disabled="exporting"
          @click="exportAudience"
        >
          <span class="material-symbols-outlined shrink-0 text-[18px] text-outline">file_download</span>
          <span class="truncate">{{ exporting ? "Exporting…" : "Export CSV" }}</span>
        </button>
        <button
          class="inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-surface-container-lowest px-4 font-button-text text-sm font-semibold text-primary shadow-sm transition hover:bg-surface-container-low"
          type="button"
          @click="downloadSampleTemplate"
        >
          <span class="material-symbols-outlined shrink-0 text-[18px] text-outline">description</span>
          <span class="truncate">Sample CSV</span>
        </button>
        <button
          class="inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-electric-pink px-4 font-button-text text-sm font-semibold text-pure-white shadow-sm shadow-electric-pink/25 transition hover:opacity-95"
          type="button"
          @click="openCreate"
        >
          <span class="material-symbols-outlined shrink-0 text-[18px]">person_add</span>
          <span class="truncate">New supporter</span>
        </button>
        <button
          class="inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-error-container px-4 font-button-text text-sm font-semibold text-error shadow-sm transition hover:opacity-90 disabled:opacity-50"
          type="button"
          :disabled="deleting || loading"
          @click="askDeleteAll"
        >
          <span class="material-symbols-outlined shrink-0 text-[18px]">delete_sweep</span>
          <span class="truncate">Delete all</span>
        </button>
      </div>
      <input
        ref="importInput"
        type="file"
        accept=".xlsx,.xlsm,.csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,text/csv"
        class="hidden"
        @change="onImportFile"
      />
    </header>

    <p v-if="selectedOrg" class="text-xs text-outline">
      Importing into organization:
      <span class="font-semibold text-on-surface">{{ selectedOrg.name }}</span>
      · Columns: LGA, Ward, Polling Unit, Voter Name, Phone Number, Gender, DOB-Y, VIN
    </p>

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
            <span class="font-label-caps text-label-caps font-semibold text-primary">Members &amp; volunteers</span>
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
            placeholder="Filter by name, VIN, voter ID, precinct, or tag..."
            type="text"
          />
        </div>
        <div class="relative lg:w-52">
          <span class="material-symbols-outlined absolute left-3 top-2.5 text-[18px] text-outline">call</span>
          <input
            v-model="phoneFilter"
            class="w-full rounded-xl bg-off-white py-2 pl-9 pr-8 font-body-md text-xs text-on-surface transition-colors placeholder:text-outline focus:bg-surface-container-lowest focus:outline-none"
            placeholder="Phone number..."
            type="tel"
            inputmode="tel"
            aria-label="Filter by phone number"
          />
          <button
            v-if="phoneFilter"
            class="absolute right-2 top-2 text-outline hover:text-primary"
            type="button"
            aria-label="Clear phone filter"
            @click="phoneFilter = ''"
          >
            <span class="material-symbols-outlined text-[16px]">close</span>
          </button>
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
              <button class="block w-full rounded-lg px-3 py-2 text-left text-xs hover:bg-surface-container-low" type="button" @click="precinct = ''; pollingUnit = ''; openMenu = ''">All precincts</button>
              <button
                v-for="opt in precinctOptions"
                :key="opt"
                class="block w-full rounded-lg px-3 py-2 text-left text-xs hover:bg-surface-container-low"
                type="button"
                @click="precinct = opt; pollingUnit = ''; openMenu = ''"
              >
                {{ opt }}
              </button>
            </div>
          </div>
          <div class="relative">
            <button
              class="flex max-w-[220px] items-center gap-1.5 rounded-xl px-3 py-2 font-label-caps text-xs font-bold transition-colors"
              :class="pollingUnit ? 'bg-deep-navy text-pure-white' : 'bg-surface-container-low text-primary hover:bg-surface-container'"
              type="button"
              @click.stop="puSearch = ''; toggleMenu('pu')"
            >
              <span class="material-symbols-outlined text-[16px]">how_to_vote</span>
              <span class="truncate">{{ pollingUnit || "Polling Unit" }}</span>
              <span class="material-symbols-outlined text-[16px]">expand_more</span>
            </button>
            <div
              v-if="openMenu === 'pu'"
              class="absolute right-0 z-20 mt-2 w-72 rounded-xl bg-surface-container-lowest p-2 shadow-lg"
              @click.stop
            >
              <input
                v-model="puSearch"
                class="mb-2 w-full rounded-lg bg-off-white px-3 py-2 text-xs text-on-surface placeholder:text-outline focus:outline-none"
                placeholder="Search polling units..."
                type="text"
                aria-label="Search polling units"
              />
              <div class="max-h-64 overflow-y-auto">
                <button class="block w-full rounded-lg px-3 py-2 text-left text-xs hover:bg-surface-container-low" type="button" @click="pollingUnit = ''; openMenu = ''">All polling units</button>
                <p v-if="!pollingUnitOptions.length" class="px-3 py-2 text-xs text-outline">
                  {{ puSearch ? "No polling unit matches." : precinct ? "No polling units recorded in this precinct." : "No polling units recorded yet." }}
                </p>
                <button
                  v-for="opt in pollingUnitOptions"
                  :key="opt"
                  class="block w-full rounded-lg px-3 py-2 text-left text-xs hover:bg-surface-container-low"
                  :class="opt === pollingUnit ? 'font-bold text-primary' : ''"
                  type="button"
                  @click="pollingUnit = opt; openMenu = ''"
                >
                  {{ opt }}
                </button>
              </div>
              <p v-if="!precinct && (directory?.polling_unit_options.length ?? 0) > 200" class="px-3 pt-2 text-[10px] text-outline">
                Tip: pick a precinct first or search to narrow the list.
              </p>
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
              {{ filteredTotal.toLocaleString() }} contact(s)
            </template>
            <template v-else>{{ filteredTotal.toLocaleString() }} contact(s) after filters</template>
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
          <span class="font-label-caps text-xs text-outline">{{ group.count.toLocaleString() }}</span>
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
      <div v-else class="w-full overflow-x-auto transition-opacity" :class="fetching ? 'pointer-events-none opacity-60' : ''">
        <table class="w-full border-collapse text-left text-xs">
          <thead class="bg-surface-container-low font-label-caps text-[11px] uppercase tracking-wider text-outline">
            <tr class="border-b border-surface-container-low">
              <th class="w-10 px-4 py-3.5 text-center">
                <input class="rounded" type="checkbox" :checked="allPageSelected" :disabled="!pagedRows.length" @change="toggleSelectPage" />
              </th>
              <th class="px-4 py-3.5 font-semibold">Supporter / Voter</th>
              <th class="px-4 py-3.5 font-semibold">Precinct &amp; Address</th>
              <th class="px-4 py-3.5 font-semibold">Contact &amp; Reachability</th>
              <th class="px-4 py-3.5 font-semibold">VIN Number</th>
              <th class="px-4 py-3.5 font-semibold">Polling Unit</th>
              <th class="px-4 py-3.5 font-semibold">Recent Activity</th>
              <th class="px-4 py-3.5 text-right font-semibold">Actions</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-surface-container-low font-body-md text-on-surface">
            <tr v-if="!pagedRows.length">
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
                <input class="rounded" type="checkbox" :checked="selected.has(row.id)" @change="toggleSelect(row)" />
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
                  <span class="text-[11px] text-outline">{{ row.address || row.state || "—" }}</span>
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
                <button
                  v-if="row.vin"
                  class="group inline-flex items-center gap-1 font-mono text-[11px] font-semibold tracking-wide text-primary"
                  title="Copy VIN"
                  type="button"
                  @click="copyText(row.vin, 'VIN')"
                >
                  <span>{{ row.vin }}</span>
                  <span class="material-symbols-outlined text-[14px] text-outline opacity-0 transition group-hover:opacity-100">content_copy</span>
                </button>
                <span v-else class="text-[11px] text-outline">No VIN</span>
              </td>
              <td class="px-4 py-3.5">
                <button
                  v-if="row.polling_unit"
                  class="max-w-[220px] text-left text-[11px] font-medium text-primary hover:underline"
                  title="Filter by this polling unit"
                  type="button"
                  @click="pollingUnit = row.polling_unit"
                >
                  {{ row.polling_unit }}
                </button>
                <span v-else class="text-[11px] text-outline">Unassigned</span>
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
                    v-if="!isAgentRow(row)"
                    class="inline-flex h-8 items-center justify-center rounded-lg bg-surface-container px-2.5 text-error transition hover:bg-error-container"
                    title="Delete voter"
                    type="button"
                    :disabled="deleting"
                    @click="askDeleteRow(row)"
                  >
                    <span class="material-symbols-outlined text-[18px]">delete</span>
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
          <button
            v-if="selectedCount < filteredTotal"
            class="font-label-caps text-xs font-bold text-electric-pink underline-offset-2 hover:underline"
            type="button"
            :disabled="selectingAll"
            @click="selectAllFiltered"
          >
            {{ selectingAll ? "Selecting…" : `Select all ${filteredTotal.toLocaleString()} in filter` }}
          </button>
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
            class="inline-flex h-8 items-center justify-center gap-1.5 rounded-lg bg-error px-3 font-button-text text-xs font-semibold text-pure-white transition hover:opacity-90 disabled:opacity-50"
            type="button"
            :disabled="deleting"
            @click="askDeleteSelected"
          >
            <span class="material-symbols-outlined text-[16px]">delete</span>
            <span>Delete selected</span>
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
      :filter-rows="broadcastFilterRows"
      @close="showBroadcast = false"
      @error="(msg: string) => emit('error', msg)"
      @message="(msg: string) => emit('message', msg)"
      @dispatched="onBroadcastDispatched"
    />

    <div v-if="pendingDelete" class="fixed inset-0 z-[60] flex items-center justify-center bg-deep-navy/50 p-4" @click.self="closeDeleteDialog">
      <div class="w-full max-w-md rounded-2xl bg-surface-container-lowest p-6 shadow-xl" role="alertdialog" aria-modal="true">
        <div class="flex items-start gap-3">
          <div class="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-error-container text-error">
            <span class="material-symbols-outlined text-[20px]">delete_forever</span>
          </div>
          <div class="min-w-0">
            <h2 class="font-headline-md text-lg font-bold text-primary">{{ deleteDialogTitle }}</h2>
            <p v-if="pendingDelete.mode === 'one'" class="mt-1 text-xs text-outline">
              {{ contactRef(pendingDelete.row) }} · {{ precinctLabel(pendingDelete.row) || "Unassigned precinct" }}.
              This permanently removes the record and cannot be undone.
            </p>
            <p v-else-if="pendingDelete.mode === 'selected'" class="mt-1 text-xs text-outline">
              The selected voters and contacts will be permanently removed.
              <template v-if="deletableSelected.length < selectedCount">
                {{ selectedCount - deletableSelected.length }} field agent(s) in the selection will be kept.
              </template>
            </p>
            <p v-else class="mt-1 text-xs text-outline">
              Permanently removes every voter{{ deleteAllImportsOnly ? " created by bulk import" : " and CRM contact" }}
              in <span class="font-semibold text-on-surface">{{ selectedOrg?.name || "this organization" }}</span>
              — including ones not loaded on this page. Field agents are not affected.
            </p>
          </div>
        </div>
        <div v-if="pendingDelete.mode === 'all'" class="mt-4 flex flex-col gap-3">
          <label class="flex items-center gap-2 text-xs text-on-surface">
            <input v-model="deleteAllImportsOnly" class="rounded" type="checkbox" />
            Only bulk-imported voters (keep app sign-ups and CRM contacts)
          </label>
          <label>
            <span class="font-label-caps text-[11px] uppercase text-outline">Type DELETE to confirm</span>
            <input
              v-model="deleteAllConfirmText"
              class="mt-1 w-full rounded-xl bg-off-white px-3 py-2 text-sm text-on-surface focus:outline-none"
              type="text"
              autocomplete="off"
              @keydown.enter.prevent="confirmDelete"
            />
          </label>
        </div>
        <div class="mt-5 flex justify-end gap-2">
          <button class="rounded-xl bg-surface-container-low px-4 py-2 text-sm text-primary" type="button" :disabled="deleting" @click="closeDeleteDialog">Cancel</button>
          <button
            class="rounded-xl bg-error px-4 py-2 text-sm font-semibold text-pure-white disabled:opacity-50"
            type="button"
            :disabled="deleting || (pendingDelete.mode === 'all' && !deleteAllReady)"
            @click="confirmDelete"
          >
            {{ deleting ? "Deleting…" : "Delete" }}
          </button>
        </div>
      </div>
    </div>

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
