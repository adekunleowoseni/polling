<script setup lang="ts">
import type { AdminAgentDetail } from "~/components/AdminAgentManageModal.vue";
import { fieldTeamPath, type FieldTeamNode, type FieldTeamWorkspace } from "~/composables/useFieldTeam";

definePageMeta({ layout: "admin" });

const route = useRoute();
const { apiBase, authHeaders, admin, requireAdmin } = useAdminAuth();
const { loadAgent, setSupervisor, setReports, loadTree } = useFieldTeam();
const { setTab } = useAdminShell();
const toast = useToast();

const agentId = computed(() => String(route.params.id || ""));
const ws = ref<FieldTeamWorkspace | null>(null);
const loading = ref(true);
const loadError = ref("");
const saving = ref(false);

const supervisorChoice = ref("");
const teamSearch = ref("");
const teamPick = ref<Set<string>>(new Set());
const voterTab = ref<"assigned" | "add">("assigned");

const showEdit = ref(false);
const editAgent = ref<AdminAgentDetail | null>(null);
const editLoading = ref(false);

const me = computed(() => ws.value?.agent ?? null);
const isCoordinator = computed(() => !!ws.value?.report_rank_label);
const hasParent = computed(() => !!ws.value?.supervisor_rank_label);

const filteredReportOptions = computed(() => {
  const needle = teamSearch.value.trim().toLowerCase();
  const list = ws.value?.report_options ?? [];
  if (!needle) return list;
  return list.filter((n) => [n.name, n.ward, n.lga, n.phone].filter(Boolean).join(" ").toLowerCase().includes(needle));
});

const statCards = computed(() => {
  const a = me.value;
  if (!a) return [];
  const cards = [
    {
      label: isCoordinator.value ? "Voters in team" : "Assigned voters",
      value: a.totals.voters,
      hint: isCoordinator.value ? "Assigned to everyone under this coordinator" : "Voters this agent is responsible for",
    },
    { label: "Contacts added", value: a.totals.contacts, hint: isCoordinator.value ? "Registered by the whole team" : "Registered in the field app" },
  ];
  if (a.rank === "lga_supervisor") {
    cards.push({ label: "Ward Coordinators", value: a.totals.ward_coordinators, hint: "Directly under this LGA Coordinator" });
  }
  if (isCoordinator.value) {
    cards.push({ label: "Field agents", value: a.totals.field_agents, hint: "Field & polling unit agents in the team" });
  }
  return cards;
});

async function refresh() {
  loading.value = !ws.value;
  loadError.value = "";
  try {
    ws.value = await loadAgent(agentId.value);
    supervisorChoice.value = ws.value.supervisor?.id ?? "";
    teamPick.value = new Set();
  } catch (e: unknown) {
    const status = (e as { statusCode?: number })?.statusCode;
    loadError.value = status === 404 ? "This agent no longer exists." : "Could not load this agent.";
  } finally {
    loading.value = false;
  }
}

async function afterChange(next: FieldTeamWorkspace, msg: string) {
  ws.value = next;
  supervisorChoice.value = next.supervisor?.id ?? "";
  teamPick.value = new Set();
  toast.success(msg);
  void loadTree().catch(() => {});
}

function errorText(e: unknown, fallback: string) {
  const detail = (e as { data?: { detail?: unknown } })?.data?.detail;
  return typeof detail === "string" ? detail : fallback;
}

async function saveSupervisor() {
  if (!me.value?.id) return;
  saving.value = true;
  try {
    const next = await setSupervisor(me.value.id, supervisorChoice.value || null);
    await afterChange(next, next.supervisor ? `${me.value.name} now reports to ${next.supervisor.name}.` : `${me.value.name} no longer reports to anyone.`);
  } catch (e: unknown) {
    toast.error(errorText(e, "Could not change the coordinator."));
  } finally {
    saving.value = false;
  }
}

function togglePick(id: string) {
  const next = new Set(teamPick.value);
  if (next.has(id)) next.delete(id);
  else next.add(id);
  teamPick.value = next;
}

async function addToTeam() {
  if (!me.value?.id || !teamPick.value.size) return;
  saving.value = true;
  try {
    const n = teamPick.value.size;
    const next = await setReports(me.value.id, { add: [...teamPick.value] });
    await afterChange(next, `${n} member(s) added to ${me.value.name}'s team.`);
  } catch (e: unknown) {
    toast.error(errorText(e, "Could not add team members."));
  } finally {
    saving.value = false;
  }
}

async function removeFromTeam(member: FieldTeamNode) {
  if (!me.value?.id || !member.id) return;
  if (!window.confirm(`Remove ${member.name} from ${me.value.name}'s team?`)) return;
  saving.value = true;
  try {
    const next = await setReports(me.value.id, { remove: [member.id] });
    await afterChange(next, `${member.name} removed from the team.`);
  } catch (e: unknown) {
    toast.error(errorText(e, "Could not remove the team member."));
  } finally {
    saving.value = false;
  }
}

function onVotersChanged() {
  void refresh();
  void loadTree().catch(() => {});
}

async function openEdit() {
  showEdit.value = true;
  editLoading.value = true;
  try {
    editAgent.value = await $fetch<AdminAgentDetail>(`${apiBase}/admin/agents/${agentId.value}`, { headers: authHeaders() });
  } catch {
    toast.error("Could not load agent details.");
    showEdit.value = false;
  } finally {
    editLoading.value = false;
  }
}

async function onEdited() {
  toast.success("Agent updated.");
  await openEdit();
  await refresh();
  void loadTree().catch(() => {});
}

function onDeleted() {
  showEdit.value = false;
  toast.success("Agent deleted.");
  void loadTree().catch(() => {});
  setTab("field-agents");
}

function goBack() {
  setTab("hierarchy");
}

watch(agentId, () => {
  ws.value = null;
  voterTab.value = "assigned";
  void refresh();
});

onMounted(() => {
  if (!requireAdmin(route.fullPath)) return;
  void refresh();
});

useHead(() => ({ title: me.value ? `${me.value.name} · Field team` : "Field team" }));
</script>

<template>
  <div class="flex w-full flex-col gap-6">
    <nav class="flex flex-wrap items-center gap-2 text-xs text-outline" aria-label="Breadcrumb">
      <button type="button" class="inline-flex items-center gap-1 font-semibold text-primary hover:underline" @click="goBack">
        <span class="material-symbols-outlined text-[16px]">arrow_back</span>
        Team hierarchy
      </button>
      <template v-if="ws?.supervisor?.id">
        <span>/</span>
        <NuxtLink :to="fieldTeamPath(ws.supervisor.id)" class="hover:underline">{{ ws.supervisor.name }}</NuxtLink>
      </template>
      <template v-if="me">
        <span>/</span>
        <span class="font-semibold text-on-surface">{{ me.name }}</span>
      </template>
    </nav>

    <div v-if="loading" class="rounded-xl bg-surface-container-lowest p-10 text-center text-sm text-outline shadow-sm">Loading agent…</div>
    <div v-else-if="loadError || !ws || !me" class="rounded-xl bg-surface-container-lowest p-10 text-center shadow-sm">
      <p class="text-sm text-error">{{ loadError || "Agent not found." }}</p>
      <button type="button" class="mt-3 text-sm font-semibold text-primary underline" @click="goBack">Back to the hierarchy</button>
    </div>

    <template v-else>
      <header class="flex flex-col gap-4 rounded-xl bg-deep-navy p-5 text-pure-white shadow-sm sm:flex-row sm:items-center sm:justify-between">
        <div class="min-w-0">
          <span class="inline-flex rounded-full bg-electric-pink px-2.5 py-0.5 font-label-caps text-[11px] font-bold">{{ me.rank_label }}</span>
          <h1 class="mt-2 truncate font-headline-md text-2xl font-bold">{{ me.name }}</h1>
          <p class="mt-1 text-sm text-on-navy">
            {{ [me.lga, me.ward, me.polling_unit_code].filter(Boolean).join(" · ") || "No turf assigned" }}
          </p>
          <p class="mt-1 text-xs text-on-navy">{{ [me.phone, me.email].filter(Boolean).join(" · ") }}</p>
        </div>
        <div class="flex shrink-0 gap-2">
          <button
            type="button"
            class="inline-flex h-10 items-center gap-1.5 rounded-xl bg-pure-white/15 px-4 text-sm font-semibold hover:bg-pure-white/25"
            @click="openEdit"
          >
            <span class="material-symbols-outlined text-[18px]">edit</span>
            Details, turf &amp; claims
          </button>
        </div>
      </header>

      <section class="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <div v-for="card in statCards" :key="card.label" class="rounded-xl bg-surface-container-lowest p-4 shadow-sm">
          <p class="font-label-caps text-[11px] font-semibold uppercase tracking-wider text-outline">{{ card.label }}</p>
          <p class="mt-1 font-headline-md text-2xl font-extrabold text-primary">{{ card.value.toLocaleString() }}</p>
          <p class="mt-1 text-[11px] text-outline">{{ card.hint }}</p>
        </div>
      </section>

      <!-- Reports to -->
      <section v-if="hasParent" class="rounded-xl bg-surface-container-lowest p-5 shadow-sm">
        <h2 class="font-semibold text-primary">Reports to</h2>
        <p class="mt-1 text-xs text-outline">A {{ me.rank_label }} reports to a {{ ws.supervisor_rank_label }}.</p>
        <div class="mt-3 flex flex-col gap-3 sm:flex-row sm:items-end">
          <label class="flex-1">
            <span class="font-label-caps text-[11px] uppercase text-outline">{{ ws.supervisor_rank_label }}</span>
            <select v-model="supervisorChoice" class="mt-1 h-10 w-full rounded-xl bg-off-white px-3 text-sm text-on-surface focus:outline-none">
              <option value="">— Not assigned —</option>
              <option v-for="opt in ws.supervisor_options" :key="opt.id!" :value="opt.id">
                {{ opt.name }} · {{ [opt.ward, opt.lga].filter(Boolean).join(", ") || "no turf" }}
              </option>
            </select>
          </label>
          <button
            type="button"
            class="inline-flex h-10 items-center justify-center rounded-xl bg-deep-navy px-4 text-sm font-semibold text-pure-white disabled:opacity-50"
            :disabled="saving || supervisorChoice === (ws.supervisor?.id ?? '')"
            @click="saveSupervisor"
          >
            Save
          </button>
        </div>
        <p v-if="!ws.supervisor_options.length" class="mt-2 text-xs text-secondary">
          No {{ ws.supervisor_rank_label }} exists yet — onboard one from Field Agents first.
        </p>
      </section>

      <!-- Team -->
      <section v-if="isCoordinator" class="grid gap-4 xl:grid-cols-5">
        <div class="rounded-xl bg-surface-container-lowest p-5 shadow-sm xl:col-span-3">
          <h2 class="font-semibold text-primary">Team ({{ ws.reports.length }})</h2>
          <p class="mt-1 text-xs text-outline">{{ ws.report_rank_label }}s reporting to {{ me.name }}, with their totals.</p>
          <p v-if="!ws.reports.length" class="mt-4 rounded-xl bg-surface-container-low p-4 text-sm text-outline">
            Nobody in this team yet — add {{ ws.report_rank_label }}s from the list.
          </p>
          <ul v-else class="mt-3 flex flex-col gap-2">
            <li v-for="member in ws.reports" :key="member.id!" class="flex flex-wrap items-center gap-3 rounded-xl bg-surface-container-low px-3 py-2">
              <div class="min-w-0 flex-1">
                <NuxtLink :to="fieldTeamPath(member.id!)" class="block truncate text-sm font-bold text-primary hover:underline">{{ member.name }}</NuxtLink>
                <span class="block truncate text-[11px] text-outline">{{ member.rank_label }} · {{ [member.ward, member.lga].filter(Boolean).join(", ") || "no turf" }}</span>
              </div>
              <span v-if="member.totals.field_agents" class="rounded-full bg-action-green/20 px-2 py-0.5 font-label-caps text-[11px] font-bold text-on-tertiary-fixed">
                {{ member.totals.field_agents }} agents
              </span>
              <span class="rounded-full bg-deep-navy/5 px-2 py-0.5 font-label-caps text-[11px] font-bold text-primary">{{ member.totals.voters.toLocaleString() }} voters</span>
              <span v-if="member.totals.contacts" class="rounded-full bg-surface-container px-2 py-0.5 font-label-caps text-[11px] font-bold">{{ member.totals.contacts.toLocaleString() }} added</span>
              <button
                type="button"
                class="inline-flex h-8 w-8 items-center justify-center rounded-lg text-error hover:bg-error-container disabled:opacity-50"
                :disabled="saving"
                :aria-label="`Remove ${member.name} from the team`"
                @click="removeFromTeam(member)"
              >
                <span class="material-symbols-outlined text-[18px]">person_remove</span>
              </button>
            </li>
          </ul>
        </div>

        <div class="rounded-xl bg-surface-container-lowest p-5 shadow-sm xl:col-span-2">
          <h2 class="font-semibold text-primary">Add to team</h2>
          <p class="mt-1 text-xs text-outline">{{ ws.report_rank_label }}s in {{ me.lga || "this organization" }} not yet in this team.</p>
          <input
            v-model="teamSearch"
            type="search"
            class="mt-3 h-10 w-full rounded-xl bg-off-white px-3 text-sm text-on-surface placeholder:text-outline focus:outline-none"
            placeholder="Search name, ward…"
            aria-label="Search candidates"
          />
          <ul class="mt-2 flex max-h-80 flex-col gap-1 overflow-y-auto">
            <li v-if="!filteredReportOptions.length" class="p-3 text-xs text-outline">No candidates found.</li>
            <li v-for="opt in filteredReportOptions" :key="opt.id!">
              <label class="flex cursor-pointer items-center gap-3 rounded-lg px-2 py-2 hover:bg-surface-container-low">
                <input type="checkbox" class="rounded" :checked="teamPick.has(opt.id!)" @change="togglePick(opt.id!)" />
                <span class="min-w-0 flex-1">
                  <span class="block truncate text-sm font-semibold text-primary">{{ opt.name }}</span>
                  <span class="block truncate text-[11px] text-outline">
                    {{ [opt.ward, opt.lga].filter(Boolean).join(", ") || "no turf" }}
                    <template v-if="opt.reports_to_name"> · now under {{ opt.reports_to_name }}</template>
                  </span>
                </span>
              </label>
            </li>
          </ul>
          <button
            type="button"
            class="mt-3 inline-flex h-10 w-full items-center justify-center gap-1.5 rounded-xl bg-deep-navy text-sm font-semibold text-pure-white disabled:opacity-50"
            :disabled="saving || !teamPick.size"
            @click="addToTeam"
          >
            <span class="material-symbols-outlined text-[18px]">group_add</span>
            Add {{ teamPick.size || "" }} to team
          </button>
        </div>
      </section>

      <!-- Voters -->
      <section v-if="ws.can_hold_voters" class="rounded-xl bg-surface-container-lowest p-5 shadow-sm">
        <div class="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 class="font-semibold text-primary">Voters</h2>
            <p class="mt-1 text-xs text-outline">Voters {{ me.name }} is responsible for in the field.</p>
          </div>
          <div class="flex rounded-xl bg-surface-container-low p-1" role="tablist">
            <button
              type="button"
              role="tab"
              :aria-selected="voterTab === 'assigned'"
              class="rounded-lg px-3 py-1.5 text-xs font-semibold"
              :class="voterTab === 'assigned' ? 'bg-surface-container-lowest text-primary shadow-sm' : 'text-outline'"
              @click="voterTab = 'assigned'"
            >
              Assigned ({{ me.direct_voters.toLocaleString() }})
            </button>
            <button
              type="button"
              role="tab"
              :aria-selected="voterTab === 'add'"
              class="rounded-lg px-3 py-1.5 text-xs font-semibold"
              :class="voterTab === 'add' ? 'bg-surface-container-lowest text-primary shadow-sm' : 'text-outline'"
              @click="voterTab = 'add'"
            >
              Add voters
            </button>
          </div>
        </div>
        <div class="mt-4">
          <AdminFieldTeamVoters
            :key="voterTab"
            :agent-id="me.id!"
            :agent-name="me.name"
            :mode="voterTab"
            :default-lga="me.lga"
            :default-ward="me.ward"
            @changed="onVotersChanged"
            @error="(m: string) => toast.error(m)"
            @message="(m: string) => toast.success(m)"
          />
        </div>
      </section>

      <section v-else-if="isCoordinator && ws.reports.length" class="rounded-xl bg-surface-container-lowest p-5 shadow-sm">
        <h2 class="font-semibold text-primary">Full team tree</h2>
        <p class="mt-1 text-xs text-outline">Voters are assigned to field agents; open a field agent to manage their voters.</p>
        <div class="mt-3">
          <AdminFieldTeamTree :nodes="ws.reports" :expand-depth="1" />
        </div>
      </section>
    </template>

    <AdminAgentManageModal
      :open="showEdit"
      :loading="editLoading"
      :agent="editAgent"
      :api-base="apiBase"
      :auth-headers="authHeaders"
      :locked-state="admin?.role === 'state_admin' ? admin.state ?? null : null"
      @close="showEdit = false"
      @updated="onEdited"
      @deleted="onDeleted"
    />
  </div>
</template>
