<script setup lang="ts">
import type { AdminCrmDirectory, AdminCrmRow } from "~/composables/useAdminCrm";

const props = defineProps<{
  agentId: string;
  agentName: string;
  /** "assigned" lists this agent's voters; "add" lists voters that can be given to them. */
  mode: "assigned" | "add";
  defaultLga?: string | null;
  defaultWard?: string | null;
}>();

const emit = defineEmits<{
  (e: "changed", agentVoters: number): void;
  (e: "error", msg: string): void;
  (e: "message", msg: string): void;
}>();

const { loadDirectory, crmError } = useAdminCrm();
const { assignVoters } = useFieldTeam();

const q = ref("");
const lga = ref(props.mode === "add" ? props.defaultLga || "" : "");
const ward = ref(props.mode === "add" ? props.defaultWard || "" : "");
const pollingUnit = ref("");
const phone = ref("");
/** add mode: hide voters that already belong to another agent */
const onlyUnassigned = ref(true);
const page = ref(1);
const pageSize = ref(25);

const loading = ref(false);
const busy = ref(false);
const data = ref<AdminCrmDirectory | null>(null);
const selected = ref<Set<string>>(new Set());
let seq = 0;

const rows = computed<AdminCrmRow[]>(() => data.value?.rows ?? []);
const total = computed(() => data.value?.filtered_total ?? 0);
const pageCount = computed(() => Math.max(1, Math.ceil(total.value / pageSize.value)));
const allOnPage = computed(() => rows.value.length > 0 && rows.value.every((r) => selected.value.has(r.id)));
const hasFilter = computed(() => !!(q.value.trim() || lga.value || ward.value || pollingUnit.value || phone.value.trim()));

function filterBody() {
  return {
    q: q.value.trim(),
    lga: lga.value,
    ward: ward.value,
    polling_unit: pollingUnit.value,
    phone: phone.value.replace(/\D/g, ""),
  };
}

async function refresh() {
  const mine = ++seq;
  loading.value = true;
  try {
    const result = await loadDirectory({
      audience: "voters",
      q: q.value.trim() || undefined,
      lga: lga.value || undefined,
      ward: ward.value || undefined,
      polling_unit: pollingUnit.value || undefined,
      phone: phone.value.replace(/\D/g, "") || undefined,
      assigned_agent: props.mode === "assigned" ? props.agentId : onlyUnassigned.value ? "none" : undefined,
      page: page.value,
      page_size: pageSize.value,
    });
    if (mine !== seq) return;
    data.value = result;
    if (result.page !== page.value) page.value = result.page;
  } catch (e: unknown) {
    if (mine === seq) emit("error", crmError(e, "Could not load voters."));
  } finally {
    if (mine === seq) loading.value = false;
  }
}

let timer: ReturnType<typeof setTimeout> | undefined;
watch([q, phone], () => {
  clearTimeout(timer);
  timer = setTimeout(() => (page.value === 1 ? refresh() : (page.value = 1)), 300);
});
watch(lga, () => {
  ward.value = "";
  pollingUnit.value = "";
});
watch(ward, () => {
  pollingUnit.value = "";
});
watch([lga, ward, pollingUnit, onlyUnassigned, pageSize], () => {
  selected.value = new Set();
  if (page.value === 1) void refresh();
  else page.value = 1;
});
watch(page, () => void refresh());
watch(() => props.agentId, () => {
  selected.value = new Set();
  void refresh();
});
onMounted(() => void refresh());
onBeforeUnmount(() => clearTimeout(timer));

function toggle(id: string) {
  const next = new Set(selected.value);
  if (next.has(id)) next.delete(id);
  else next.add(id);
  selected.value = next;
}

function togglePage() {
  const next = new Set(selected.value);
  if (allOnPage.value) for (const r of rows.value) next.delete(r.id);
  else for (const r of rows.value) next.add(r.id);
  selected.value = next;
}

async function run(body: Parameters<typeof assignVoters>[1], confirmText?: string) {
  if (confirmText && !window.confirm(confirmText)) return;
  busy.value = true;
  try {
    const res = await assignVoters(props.agentId, body);
    const verb = body.action === "unassign" ? "removed from" : "assigned to";
    emit("message", `${res.changed.toLocaleString()} voter(s) ${verb} ${props.agentName}.`);
    emit("changed", res.agent_voters);
    selected.value = new Set();
    await refresh();
  } catch (e: unknown) {
    emit("error", crmError(e, "Could not update voters."));
  } finally {
    busy.value = false;
  }
}

function actOnSelected() {
  const ids = [...selected.value];
  if (!ids.length) return;
  void run({ action: props.mode === "assigned" ? "unassign" : "assign", voter_ids: ids });
}

function actOnAll() {
  const n = total.value.toLocaleString();
  if (props.mode === "assigned") {
    void run(
      { action: "unassign", filter: filterBody() },
      `Remove all ${n} ${hasFilter.value ? "matching " : ""}voter(s) from ${props.agentName}?`,
    );
  } else {
    void run(
      { action: "assign", filter: filterBody(), include_assigned_elsewhere: !onlyUnassigned.value },
      `Assign all ${n} matching voter(s) to ${props.agentName}?` +
        (onlyUnassigned.value ? "" : "\nVoters already assigned to other agents will be moved."),
    );
  }
}

defineExpose({ refresh });
</script>

<template>
  <div class="flex flex-col gap-3">
    <div class="grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-5">
      <div class="relative sm:col-span-2">
        <span class="material-symbols-outlined absolute left-3 top-2.5 text-[18px] text-outline">search</span>
        <input
          v-model="q"
          type="search"
          class="h-10 w-full rounded-xl bg-off-white pl-9 pr-3 text-sm text-on-surface placeholder:text-outline focus:outline-none"
          placeholder="Search name, VIN, phone or polling unit…"
          aria-label="Search voters"
        />
      </div>
      <select v-model="lga" class="h-10 rounded-xl bg-off-white px-3 text-sm text-on-surface focus:outline-none" aria-label="LGA">
        <option value="">All LGAs</option>
        <option v-for="opt in data?.lga_options ?? []" :key="opt" :value="opt">{{ opt }}</option>
      </select>
      <select v-model="ward" class="h-10 rounded-xl bg-off-white px-3 text-sm text-on-surface focus:outline-none" aria-label="Ward">
        <option value="">All wards</option>
        <option v-for="opt in data?.ward_options ?? []" :key="opt" :value="opt">{{ opt }}</option>
      </select>
      <select v-model="pollingUnit" class="h-10 rounded-xl bg-off-white px-3 text-sm text-on-surface focus:outline-none" aria-label="Polling unit">
        <option value="">All polling units</option>
        <option v-for="opt in (data?.polling_unit_options ?? []).slice(0, 1500)" :key="opt" :value="opt">{{ opt }}</option>
      </select>
    </div>
    <div class="flex flex-wrap items-center gap-3">
      <input
        v-model="phone"
        type="tel"
        inputmode="tel"
        class="h-9 w-44 rounded-xl bg-off-white px-3 text-xs text-on-surface placeholder:text-outline focus:outline-none"
        placeholder="Phone number…"
        aria-label="Filter by phone number"
      />
      <label v-if="mode === 'add'" class="flex items-center gap-2 text-xs text-on-surface">
        <input v-model="onlyUnassigned" type="checkbox" class="rounded" />
        Only voters not yet assigned to any agent
      </label>
      <span class="ml-auto text-xs text-outline">
        {{ loading ? "Loading…" : `${total.toLocaleString()} voter(s)` }}
      </span>
    </div>

    <div class="flex flex-wrap items-center gap-2 rounded-xl bg-surface-container-low px-3 py-2">
      <span class="text-xs font-semibold text-primary">{{ selected.size.toLocaleString() }} selected</span>
      <button
        type="button"
        class="inline-flex h-8 items-center gap-1.5 rounded-lg px-3 text-xs font-semibold disabled:opacity-50"
        :class="mode === 'assigned' ? 'bg-error-container text-error' : 'bg-deep-navy text-pure-white'"
        :disabled="busy || !selected.size"
        @click="actOnSelected"
      >
        <span class="material-symbols-outlined text-[16px]">{{ mode === "assigned" ? "person_remove" : "person_add" }}</span>
        {{ mode === "assigned" ? "Remove selected" : "Assign selected" }}
      </button>
      <button
        type="button"
        class="inline-flex h-8 items-center gap-1.5 rounded-lg bg-surface-container-lowest px-3 text-xs font-semibold text-primary shadow-sm disabled:opacity-50"
        :disabled="busy || !total"
        @click="actOnAll"
      >
        <span class="material-symbols-outlined text-[16px]">{{ mode === "assigned" ? "group_remove" : "group_add" }}</span>
        {{ mode === "assigned" ? `Remove all ${total.toLocaleString()}` : `Assign all ${total.toLocaleString()} matching` }}
      </button>
      <span v-if="busy" class="text-xs text-outline">Saving…</span>
    </div>

    <div class="overflow-x-auto rounded-xl bg-surface-container-lowest shadow-sm" :class="loading ? 'opacity-60' : ''">
      <table class="w-full border-collapse text-left text-xs">
        <thead class="bg-surface-container-low font-label-caps text-[11px] uppercase tracking-wider text-outline">
          <tr>
            <th class="w-10 px-3 py-3 text-center">
              <input type="checkbox" class="rounded" :checked="allOnPage" :disabled="!rows.length" aria-label="Select this page" @change="togglePage" />
            </th>
            <th class="px-3 py-3">Voter</th>
            <th class="px-3 py-3">VIN</th>
            <th class="px-3 py-3">Polling unit</th>
            <th class="px-3 py-3">Ward · LGA</th>
            <th class="px-3 py-3">Phone</th>
            <th v-if="mode === 'add'" class="px-3 py-3">Assigned to</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-surface-container-low">
          <tr v-if="!rows.length">
            <td :colspan="mode === 'add' ? 7 : 6" class="px-3 py-8 text-center text-sm text-outline">
              {{ loading ? "Loading voters…" : mode === "assigned" ? `No voters assigned to ${agentName}${hasFilter ? " match this filter" : " yet"}.` : "No voters match this filter." }}
            </td>
          </tr>
          <tr v-for="row in rows" :key="row.id" :class="selected.has(row.id) ? 'bg-secondary/5' : 'hover:bg-off-white/60'">
            <td class="px-3 py-2.5 text-center">
              <input type="checkbox" class="rounded" :checked="selected.has(row.id)" :aria-label="`Select ${row.name}`" @change="toggle(row.id)" />
            </td>
            <td class="px-3 py-2.5 font-semibold text-primary">{{ row.name }}</td>
            <td class="px-3 py-2.5 font-mono text-[11px] text-on-surface">{{ row.vin || "—" }}</td>
            <td class="px-3 py-2.5">{{ row.polling_unit || "—" }}</td>
            <td class="px-3 py-2.5 text-outline">{{ [row.ward, row.lga].filter(Boolean).join(" · ") || "—" }}</td>
            <td class="px-3 py-2.5">{{ row.phone || "—" }}</td>
            <td v-if="mode === 'add'" class="px-3 py-2.5">
              <span v-if="row.assigned_agent_name" class="rounded-full bg-secondary/10 px-2 py-0.5 font-semibold text-secondary">{{ row.assigned_agent_name }}</span>
              <span v-else class="text-outline">Unassigned</span>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <div class="flex flex-wrap items-center justify-between gap-2 text-xs">
      <select v-model.number="pageSize" class="rounded bg-surface-container-low px-2 py-1 text-xs text-primary focus:outline-none" aria-label="Rows per page">
        <option :value="25">25 per page</option>
        <option :value="50">50 per page</option>
        <option :value="100">100 per page</option>
      </select>
      <div class="flex items-center gap-2">
        <button type="button" class="rounded bg-surface-container-low px-3 py-1 disabled:opacity-50" :disabled="page <= 1 || loading" @click="page -= 1">Previous</button>
        <span class="text-outline">Page {{ page.toLocaleString() }} of {{ pageCount.toLocaleString() }}</span>
        <button type="button" class="rounded bg-deep-navy px-3 py-1 text-pure-white disabled:opacity-50" :disabled="page >= pageCount || loading" @click="page += 1">Next</button>
      </div>
    </div>
  </div>
</template>
