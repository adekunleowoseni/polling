<script setup lang="ts">
import type { AdminAgentDetail, AgentModalTab } from "~/components/AdminAgentManageModal.vue";
import { fieldTeamPath, type FieldTeamNode, type FieldTeamWorkspace } from "~/composables/useFieldTeam";

definePageMeta({ layout: "admin" });

const route = useRoute();
const { apiBase, authHeaders, admin, requireAdmin } = useAdminAuth();
const { loadAgent, setSupervisor, setReports, loadTree } = useFieldTeam();
const { setTab } = useAdminShell();
const toast = useToast();

const agentId = computed(() => String(route.params.id || ""));
const ws = ref<FieldTeamWorkspace | null>(null);
const detail = ref<AdminAgentDetail | null>(null);
const loading = ref(true);
const loadError = ref("");
const saving = ref(false);

const supervisorChoice = ref("");
const editingSupervisor = ref(false);
const showPicker = ref(false);
const teamSearch = ref("");
const teamPick = ref<Set<string>>(new Set());
const voterTab = ref<"assigned" | "add">("assigned");

const modalOpen = ref(false);
const modalTab = ref<AgentModalTab>("turf");

const me = computed(() => ws.value?.agent ?? null);
const isCoordinator = computed(() => !!ws.value?.report_rank_label);
const hasParent = computed(() => !!ws.value?.supervisor_rank_label);
const initials = computed(() => initialsOf(me.value?.name || ""));

const voterTabs = computed(() => [
  { id: "assigned" as const, label: `Assigned · ${(me.value?.direct_voters ?? 0).toLocaleString()}`, icon: "how_to_reg" },
  { id: "add" as const, label: "Add voters", icon: "person_add" },
]);

const filteredReportOptions = computed(() => {
  const needle = teamSearch.value.trim().toLowerCase();
  const list = ws.value?.report_options ?? [];
  if (!needle) return list;
  return list.filter((n) => [n.name, n.ward, n.lga, n.phone].filter(Boolean).join(" ").toLowerCase().includes(needle));
});

const stats = computed(() => {
  const a = me.value;
  if (!a) return [];
  const out: { label: string; value: string; hint: string }[] = [
    {
      label: isCoordinator.value ? "Voters in team" : "Assigned voters",
      value: a.totals.voters.toLocaleString(),
      hint: isCoordinator.value
        ? "Held by polling unit agents below"
        : ws.value?.can_hold_voters
          ? "This agent's responsibility"
          : "Only PU agents hold voters",
    },
    {
      label: "Contacts added",
      value: a.totals.contacts.toLocaleString(),
      hint: isCoordinator.value ? "Registered by the whole team" : "Registered in the field app",
    },
  ];
  if (a.rank === "lga_supervisor") {
    out.push({ label: "Ward coordinators", value: a.totals.ward_coordinators.toLocaleString(), hint: "Reporting to this LGA" });
  }
  if (isCoordinator.value) {
    out.push({ label: "Agents", value: a.totals.field_agents.toLocaleString(), hint: "Polling unit & field agents" });
  } else {
    out.push({ label: "Polling units", value: String(detail.value?.polling_units.length ?? 0), hint: "Registered by this agent" });
  }
  return out;
});

const turfRows = computed(() => {
  const a = me.value;
  if (!a) return [];
  return [
    { icon: "map", label: "State", value: detail.value?.state || "Ogun State", hidden: false },
    { icon: "location_city", label: "LGA", value: a.lga, hidden: false },
    { icon: "pin_drop", label: "Ward", value: a.ward, hidden: a.rank === "lga_supervisor" },
    { icon: "how_to_vote", label: "Polling unit", value: a.polling_unit_code, hidden: a.rank !== "polling_unit_agent" },
  ].filter((r) => !r.hidden);
});

const claimSummary = computed(() => {
  const d = detail.value;
  if (!d) return [];
  return [
    { label: "Data", used: d.data_claims_used, limit: d.data_claim_limit, bar: "bg-secondary" },
    { label: "Airtime", used: d.airtime_claims_used, limit: d.airtime_claim_limit, bar: "bg-action-green" },
  ];
});

const permissionSummary = computed(() => {
  const d = detail.value;
  if (!d) return [];
  return [
    { label: "Messages", on: !!d.can_message_voters },
    { label: "Invites", on: !!d.can_post_invites },
    { label: "Materials", on: !!d.can_post_materials },
  ];
});

function initialsOf(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return "?";
  return parts.length === 1 ? parts[0].slice(0, 2).toUpperCase() : `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}

function errorText(e: unknown, fallback: string) {
  const msg = (e as { data?: { detail?: unknown } })?.data?.detail;
  return typeof msg === "string" ? msg : fallback;
}

async function loadDetail() {
  try {
    detail.value = await $fetch<AdminAgentDetail>(`${apiBase}/admin/agents/${agentId.value}`, { headers: authHeaders() });
  } catch {
    detail.value = null;
  }
}

async function refresh() {
  loading.value = !ws.value;
  loadError.value = "";
  try {
    const [next] = await Promise.all([loadAgent(agentId.value), loadDetail()]);
    ws.value = next;
    supervisorChoice.value = next.supervisor?.id ?? "";
    teamPick.value = new Set();
  } catch (e: unknown) {
    const status = (e as { statusCode?: number })?.statusCode;
    loadError.value = status === 404 ? "This agent no longer exists." : "Could not load this agent.";
  } finally {
    loading.value = false;
  }
}

function applyWorkspace(next: FieldTeamWorkspace, msg: string) {
  ws.value = next;
  supervisorChoice.value = next.supervisor?.id ?? "";
  teamPick.value = new Set();
  editingSupervisor.value = false;
  toast.success(msg);
  void loadTree().catch(() => {});
}

async function saveSupervisor() {
  if (!me.value?.id) return;
  saving.value = true;
  try {
    const next = await setSupervisor(me.value.id, supervisorChoice.value || null);
    applyWorkspace(
      next,
      next.supervisor ? `${me.value.name} now reports to ${next.supervisor.name}.` : `${me.value.name} no longer reports to anyone.`,
    );
  } catch (e: unknown) {
    toast.error(errorText(e, "Could not change the coordinator."));
  } finally {
    saving.value = false;
  }
}

function cancelSupervisor() {
  editingSupervisor.value = false;
  supervisorChoice.value = ws.value?.supervisor?.id ?? "";
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
    applyWorkspace(next, `${n} member(s) added to ${me.value.name}'s team.`);
    showPicker.value = false;
    teamSearch.value = "";
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
    applyWorkspace(next, `${member.name} removed from the team.`);
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

function openModal(tab: AgentModalTab) {
  modalTab.value = tab;
  modalOpen.value = true;
  if (!detail.value) void loadDetail();
}

async function onEdited() {
  await refresh();
  void loadTree().catch(() => {});
}

function onDeleted() {
  modalOpen.value = false;
  toast.success("Agent deleted.");
  void loadTree().catch(() => {});
  setTab("field-agents");
}

function goBack() {
  setTab("hierarchy");
}

watch(agentId, () => {
  ws.value = null;
  detail.value = null;
  voterTab.value = "assigned";
  showPicker.value = false;
  editingSupervisor.value = false;
  void refresh();
});

onMounted(() => {
  if (!requireAdmin(route.fullPath)) return;
  void refresh();
});

useHead(() => ({ title: me.value ? `${me.value.name} · Field team` : "Field team" }));

const card = "rounded-2xl bg-surface-container-lowest shadow-sm";
const capsLabel = "font-label-caps text-[11px] font-semibold uppercase tracking-wider text-outline";
const sectionIcon = "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-deep-navy/5 text-primary";
</script>

<template>
  <div class="mx-auto flex w-full max-w-7xl flex-col gap-5 p-4 sm:p-6 md:p-8">
    <!-- Breadcrumb -->
    <nav class="flex flex-wrap items-center gap-1 text-xs text-outline" aria-label="Breadcrumb">
      <button
        type="button"
        class="inline-flex items-center gap-1 rounded-lg px-1.5 py-1 font-semibold text-primary hover:bg-surface-container-low"
        @click="goBack"
      >
        <span class="material-symbols-outlined text-[16px]">account_tree</span>
        Team hierarchy
      </button>
      <template v-if="ws?.supervisor?.id">
        <span class="material-symbols-outlined text-[14px]">chevron_right</span>
        <NuxtLink :to="fieldTeamPath(ws.supervisor.id)" class="rounded-lg px-1.5 py-1 hover:bg-surface-container-low hover:text-primary">
          {{ ws.supervisor.name }}
        </NuxtLink>
      </template>
      <template v-if="me">
        <span class="material-symbols-outlined text-[14px]">chevron_right</span>
        <span class="px-1.5 font-semibold text-on-surface">{{ me.name }}</span>
      </template>
    </nav>

    <!-- Loading -->
    <div v-if="loading" :class="card" class="p-6" role="status" aria-label="Loading agent">
      <div class="flex animate-pulse items-center gap-4">
        <div class="h-16 w-16 rounded-full bg-surface-container-high" />
        <div class="flex-1 space-y-2">
          <div class="h-5 w-1/3 rounded bg-surface-container-high" />
          <div class="h-3 w-1/4 rounded bg-surface-container-high" />
        </div>
      </div>
    </div>

    <!-- Error -->
    <div v-else-if="loadError || !ws || !me" :class="card" class="flex flex-col items-center gap-3 p-10 text-center">
      <span class="material-symbols-outlined text-[36px] text-outline">person_off</span>
      <p class="text-sm text-on-surface">{{ loadError || "Agent not found." }}</p>
      <button type="button" class="h-10 rounded-xl bg-deep-navy px-4 text-sm font-semibold text-pure-white" @click="goBack">
        Back to the hierarchy
      </button>
    </div>

    <template v-else>
      <!-- Profile header -->
      <header :class="card" class="overflow-hidden">
        <div class="relative overflow-hidden bg-deep-navy px-5 py-6 text-pure-white sm:px-7">
          <div class="pointer-events-none absolute -right-16 -top-24 h-64 w-64 rounded-full bg-electric-pink/25 blur-3xl" />
          <div class="relative flex flex-col gap-5 md:flex-row md:items-center">
            <div
              class="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-electric-pink font-headline-md text-xl font-bold ring-4 ring-pure-white/10"
              aria-hidden="true"
            >
              {{ initials }}
            </div>
            <div class="min-w-0 flex-1">
              <div class="flex flex-wrap items-center gap-2">
                <h1 class="truncate font-headline-md text-2xl font-bold leading-tight">{{ me.name }}</h1>
                <span class="rounded-full bg-pure-white/15 px-2.5 py-0.5 font-label-caps text-[10px] font-bold uppercase tracking-wider">
                  {{ me.rank_label }}
                </span>
              </div>
              <div class="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-on-navy">
                <span v-if="me.lga || me.ward" class="inline-flex items-center gap-1">
                  <span class="material-symbols-outlined text-[16px]">location_on</span>
                  {{ [me.ward, me.lga].filter(Boolean).join(", ") }}
                </span>
                <span v-else class="inline-flex items-center gap-1 text-electric-pink">
                  <span class="material-symbols-outlined text-[16px]">location_off</span>No turf assigned
                </span>
                <a v-if="me.phone" :href="`tel:${me.phone}`" class="inline-flex items-center gap-1 hover:text-pure-white">
                  <span class="material-symbols-outlined text-[16px]">call</span>{{ me.phone }}
                </a>
                <a v-if="me.email" :href="`mailto:${me.email}`" class="inline-flex min-w-0 items-center gap-1 hover:text-pure-white">
                  <span class="material-symbols-outlined text-[16px]">mail</span><span class="truncate">{{ me.email }}</span>
                </a>
              </div>
            </div>
            <button
              type="button"
              class="inline-flex h-10 shrink-0 items-center justify-center gap-1.5 rounded-xl bg-pure-white px-4 text-sm font-semibold text-deep-navy shadow-sm hover:bg-off-white"
              @click="openModal('turf')"
            >
              <span class="material-symbols-outlined text-[18px]">manage_accounts</span>
              Manage agent
            </button>
          </div>
        </div>
        <dl class="grid grid-cols-2" :class="stats.length === 4 ? 'sm:grid-cols-4' : 'sm:grid-cols-3'">
          <div
            v-for="(s, i) in stats"
            :key="s.label"
            class="border-surface-container-high px-5 py-4 sm:px-6"
            :class="[i % 2 ? 'border-l' : '', i >= 2 ? 'border-t sm:border-t-0' : '', i ? 'sm:border-l' : '', stats.length === 3 && i === 2 ? 'col-span-2 sm:col-span-1' : '']"
          >
            <dt :class="capsLabel">{{ s.label }}</dt>
            <dd class="mt-1 font-headline-md text-2xl font-extrabold leading-none text-primary">{{ s.value }}</dd>
            <dd class="mt-1.5 text-[11px] text-outline">{{ s.hint }}</dd>
          </div>
        </dl>
      </header>

      <div class="grid grid-cols-1 items-start gap-5 xl:grid-cols-3">
        <!-- Main column -->
        <div class="flex min-w-0 flex-col gap-5 xl:col-span-2">
          <!-- Polling unit agent: voters -->
          <section v-if="ws.can_hold_voters" :class="card" class="p-5 sm:p-6">
            <div class="flex flex-wrap items-center justify-between gap-3">
              <div class="flex items-center gap-3">
                <span :class="sectionIcon"><span class="material-symbols-outlined text-[20px]">groups</span></span>
                <div>
                  <h2 class="font-button-text text-base font-bold text-primary">Voters</h2>
                  <p class="text-xs text-outline">Voters {{ me.name }} is responsible for at the polling unit.</p>
                </div>
              </div>
              <div class="flex rounded-xl bg-surface-container-low p-1" role="tablist" aria-label="Voters">
                <button
                  v-for="t in voterTabs"
                  :key="t.id"
                  type="button"
                  role="tab"
                  :aria-selected="voterTab === t.id"
                  class="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors"
                  :class="voterTab === t.id ? 'bg-surface-container-lowest text-primary shadow-sm' : 'text-outline hover:text-primary'"
                  @click="voterTab = t.id"
                >
                  <span class="material-symbols-outlined text-[16px]">{{ t.icon }}</span>{{ t.label }}
                </button>
              </div>
            </div>
            <div class="mt-5">
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

          <!-- Coordinator: team -->
          <template v-else-if="isCoordinator">
            <section :class="card" class="p-5 sm:p-6">
              <div class="flex flex-wrap items-center justify-between gap-3">
                <div class="flex items-center gap-3">
                  <span :class="sectionIcon"><span class="material-symbols-outlined text-[20px]">diversity_3</span></span>
                  <div>
                    <h2 class="font-button-text text-base font-bold text-primary">Team · {{ ws.reports.length }}</h2>
                    <p class="text-xs text-outline">{{ ws.report_rank_label }}s reporting to {{ me.name }}</p>
                  </div>
                </div>
                <button
                  type="button"
                  class="inline-flex h-9 items-center gap-1.5 rounded-xl px-3 text-sm font-semibold transition-colors"
                  :class="showPicker ? 'bg-surface-container text-primary' : 'bg-deep-navy text-pure-white hover:bg-primary'"
                  :aria-expanded="showPicker"
                  @click="showPicker = !showPicker"
                >
                  <span class="material-symbols-outlined text-[18px]">{{ showPicker ? "close" : "group_add" }}</span>
                  {{ showPicker ? "Close" : "Add members" }}
                </button>
              </div>

              <!-- Add-members picker -->
              <div v-if="showPicker" class="mt-4 rounded-2xl border border-surface-container-high bg-off-white p-4">
                <div class="flex flex-col gap-2 sm:flex-row sm:items-center">
                  <div class="relative flex-1">
                    <span class="material-symbols-outlined absolute left-3 top-2.5 text-[18px] text-outline">search</span>
                    <input
                      v-model="teamSearch"
                      type="search"
                      class="h-10 w-full rounded-xl bg-surface-container-lowest pl-9 pr-3 text-sm text-on-surface placeholder:text-outline focus:outline-none focus:ring-2 focus:ring-secondary/30"
                      :placeholder="`Search ${ws.report_rank_label}s in ${me.lga || 'this organization'}…`"
                      aria-label="Search people to add"
                    />
                  </div>
                  <button
                    type="button"
                    class="inline-flex h-10 items-center justify-center gap-1.5 rounded-xl bg-electric-pink px-4 text-sm font-semibold text-pure-white disabled:opacity-40"
                    :disabled="saving || !teamPick.size"
                    @click="addToTeam"
                  >
                    Add {{ teamPick.size || "" }} to team
                  </button>
                </div>
                <ul class="mt-3 grid max-h-72 grid-cols-1 gap-1.5 overflow-y-auto sm:grid-cols-2">
                  <li v-if="!filteredReportOptions.length" class="p-3 text-xs text-outline sm:col-span-2">
                    {{ teamSearch ? "Nobody matches this search." : `No other ${ws.report_rank_label}s in ${me.lga || "this organization"}.` }}
                  </li>
                  <li v-for="opt in filteredReportOptions" :key="opt.id!">
                    <label
                      class="flex cursor-pointer items-center gap-3 rounded-xl border px-3 py-2 transition-colors"
                      :class="teamPick.has(opt.id!) ? 'border-deep-navy bg-surface-container-lowest' : 'border-transparent bg-surface-container-lowest/70 hover:border-outline-variant'"
                    >
                      <input type="checkbox" class="rounded" :checked="teamPick.has(opt.id!)" @change="togglePick(opt.id!)" />
                      <span class="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-surface-container-high text-[11px] font-bold text-primary">
                        {{ initialsOf(opt.name) }}
                      </span>
                      <span class="min-w-0 flex-1">
                        <span class="block truncate text-sm font-semibold text-primary">{{ opt.name }}</span>
                        <span class="block truncate text-[11px] text-outline">
                          {{ [opt.ward, opt.lga].filter(Boolean).join(", ") || "No turf" }}
                          <template v-if="opt.reports_to_name"> · under {{ opt.reports_to_name }}</template>
                        </span>
                      </span>
                    </label>
                  </li>
                </ul>
              </div>

              <!-- Members -->
              <div v-if="!ws.reports.length" class="mt-4 flex flex-col items-center gap-2 rounded-2xl bg-surface-container-low p-8 text-center">
                <span class="material-symbols-outlined text-[32px] text-outline">group</span>
                <p class="text-sm text-on-surface">Nobody reports to {{ me.name }} yet.</p>
                <button v-if="!showPicker" type="button" class="text-sm font-semibold text-secondary hover:underline" @click="showPicker = true">
                  Add {{ ws.report_rank_label }}s
                </button>
              </div>
              <ul v-else class="mt-4 divide-y divide-surface-container-high">
                <li v-for="member in ws.reports" :key="member.id!" class="group flex items-center gap-3 py-3">
                  <span class="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-surface-container-high text-xs font-bold text-primary">
                    {{ initialsOf(member.name) }}
                  </span>
                  <NuxtLink :to="fieldTeamPath(member.id!)" class="min-w-0 flex-1">
                    <span class="block truncate text-sm font-bold text-primary group-hover:underline">{{ member.name }}</span>
                    <span class="block truncate text-xs text-outline">
                      {{ member.rank_label }} · {{ [member.ward, member.lga].filter(Boolean).join(", ") || "No turf" }}
                    </span>
                  </NuxtLink>
                  <div class="hidden flex-wrap items-center justify-end gap-1.5 font-label-caps text-[11px] sm:flex">
                    <span v-if="member.totals.field_agents" class="rounded-full bg-action-green/20 px-2 py-0.5 font-bold text-on-tertiary-fixed">
                      {{ member.totals.field_agents.toLocaleString() }} agent{{ member.totals.field_agents === 1 ? '' : 's' }}
                    </span>
                    <span class="rounded-full bg-deep-navy/5 px-2 py-0.5 font-bold text-primary">{{ member.totals.voters.toLocaleString() }} voters</span>
                    <span v-if="member.totals.contacts" class="rounded-full bg-surface-container px-2 py-0.5 font-bold">
                      {{ member.totals.contacts.toLocaleString() }} added
                    </span>
                  </div>
                  <button
                    type="button"
                    class="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-outline hover:bg-error-container hover:text-error disabled:opacity-40"
                    :disabled="saving"
                    :aria-label="`Remove ${member.name} from the team`"
                    title="Remove from team"
                    @click="removeFromTeam(member)"
                  >
                    <span class="material-symbols-outlined text-[18px]">person_remove</span>
                  </button>
                </li>
              </ul>
            </section>

            <section v-if="ws.reports.some((r) => r.children.length)" :class="card" class="p-5 sm:p-6">
              <div class="flex items-center gap-3">
                <span :class="sectionIcon"><span class="material-symbols-outlined text-[20px]">account_tree</span></span>
                <div>
                  <h2 class="font-button-text text-base font-bold text-primary">Full team tree</h2>
                  <p class="text-xs text-outline">Click anyone's voter count to see their voters.</p>
                </div>
              </div>
              <div class="mt-4">
                <AdminFieldTeamTree :nodes="ws.reports" :expand-depth="1" />
              </div>
            </section>

            <section :class="card" class="p-5 sm:p-6">
              <div class="flex items-center gap-3">
                <span :class="sectionIcon"><span class="material-symbols-outlined text-[20px]">groups</span></span>
                <div>
                  <h2 class="font-button-text text-base font-bold text-primary">All voters in this team · {{ me.totals.voters.toLocaleString() }}</h2>
                  <p class="text-xs text-outline">Every voter held by a polling unit agent under {{ me.name }}.</p>
                </div>
              </div>
              <div class="mt-4">
                <AdminFieldTeamVoterList :agent-id="me.id!" />
              </div>
            </section>
          </template>

          <!-- Field agent -->
          <section v-else :class="card" class="flex flex-col items-center gap-3 p-8 text-center">
            <span class="flex h-12 w-12 items-center justify-center rounded-2xl bg-secondary/10 text-secondary">
              <span class="material-symbols-outlined text-[24px]">info</span>
            </span>
            <h2 class="font-button-text text-base font-bold text-primary">Field agents don't hold voters</h2>
            <p class="max-w-md text-sm text-outline">
              Voters are assigned to polling unit agents only. To give {{ me.name }} voters, change their rank to Polling unit agent.
            </p>
            <button type="button" class="h-10 rounded-xl bg-deep-navy px-4 text-sm font-semibold text-pure-white hover:bg-primary" @click="openModal('turf')">
              Change rank
            </button>
          </section>
        </div>

        <!-- Side panel -->
        <aside class="flex flex-col gap-5">
          <!-- Reports to -->
          <section v-if="hasParent" :class="card" class="p-5">
            <div class="flex items-center justify-between">
              <h2 :class="capsLabel">Reports to</h2>
              <button v-if="!editingSupervisor" type="button" class="text-xs font-semibold text-secondary hover:underline" @click="editingSupervisor = true">
                {{ ws.supervisor ? "Change" : "Assign" }}
              </button>
            </div>
            <template v-if="!editingSupervisor">
              <NuxtLink
                v-if="ws.supervisor?.id"
                :to="fieldTeamPath(ws.supervisor.id)"
                class="mt-3 flex items-center gap-3 rounded-xl bg-surface-container-low p-3 hover:bg-surface-container"
              >
                <span class="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-deep-navy text-xs font-bold text-pure-white">
                  {{ initialsOf(ws.supervisor.name) }}
                </span>
                <span class="min-w-0 flex-1">
                  <span class="block truncate text-sm font-bold text-primary">{{ ws.supervisor.name }}</span>
                  <span class="block truncate text-xs text-outline">
                    {{ ws.supervisor.rank_label }}<template v-if="ws.supervisor.reports_to_name"> · under {{ ws.supervisor.reports_to_name }}</template>
                  </span>
                </span>
                <span class="material-symbols-outlined text-[18px] text-outline">chevron_right</span>
              </NuxtLink>
              <p v-else class="mt-3 flex items-start gap-2 rounded-xl bg-error-container/40 p-3 text-xs text-on-surface">
                <span class="material-symbols-outlined text-[16px] text-error">warning</span>
                Not placed in the hierarchy yet. Assign a {{ ws.supervisor_rank_label }}.
              </p>
            </template>
            <div v-else class="mt-3 flex flex-col gap-2">
              <select
                v-model="supervisorChoice"
                class="h-10 w-full rounded-xl bg-off-white px-3 text-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-secondary/30"
                :aria-label="ws.supervisor_rank_label || 'Coordinator'"
              >
                <option value="">— Not assigned —</option>
                <option v-for="opt in ws.supervisor_options" :key="opt.id!" :value="opt.id">
                  {{ opt.name }} · {{ [opt.ward, opt.lga].filter(Boolean).join(", ") || "no turf" }}
                </option>
              </select>
              <p v-if="!ws.supervisor_options.length" class="text-xs text-secondary">
                No {{ ws.supervisor_rank_label }} exists yet — onboard one from Field Agents first.
              </p>
              <div class="flex justify-end gap-2">
                <button type="button" class="h-9 rounded-xl px-3 text-sm text-primary hover:bg-surface-container-low" @click="cancelSupervisor">Cancel</button>
                <button
                  type="button"
                  class="h-9 rounded-xl bg-deep-navy px-4 text-sm font-semibold text-pure-white disabled:opacity-40"
                  :disabled="saving || supervisorChoice === (ws.supervisor?.id ?? '')"
                  @click="saveSupervisor"
                >
                  Save
                </button>
              </div>
            </div>
          </section>

          <!-- Turf -->
          <section :class="card" class="p-5">
            <div class="flex items-center justify-between">
              <h2 :class="capsLabel">Turf</h2>
              <button type="button" class="text-xs font-semibold text-secondary hover:underline" @click="openModal('turf')">Edit</button>
            </div>
            <dl class="mt-3 flex flex-col gap-2.5">
              <div v-for="row in turfRows" :key="row.label" class="flex items-center gap-3">
                <span class="material-symbols-outlined text-[18px] text-outline">{{ row.icon }}</span>
                <dt class="w-24 shrink-0 text-xs text-outline">{{ row.label }}</dt>
                <dd class="min-w-0 flex-1 truncate text-sm font-semibold" :class="row.value ? 'text-primary' : 'text-outline'">
                  {{ row.value || "Not set" }}
                </dd>
              </div>
            </dl>
          </section>

          <!-- Claims -->
          <section v-if="detail" :class="card" class="p-5">
            <div class="flex items-center justify-between">
              <h2 :class="capsLabel">Top-up claims</h2>
              <button type="button" class="text-xs font-semibold text-secondary hover:underline" @click="openModal('claims')">Manage</button>
            </div>
            <div class="mt-3 flex flex-col gap-3">
              <div v-for="c in claimSummary" :key="c.label">
                <div class="flex items-center justify-between text-xs">
                  <span class="font-semibold text-primary">{{ c.label }}</span>
                  <span :class="c.used >= c.limit ? 'text-error' : 'text-outline'">{{ c.used }} / {{ c.limit }} used</span>
                </div>
                <div class="mt-1.5 h-1.5 overflow-hidden rounded-full bg-surface-container-high">
                  <div class="h-full rounded-full" :class="c.bar" :style="{ width: `${c.limit ? Math.min(100, (c.used / c.limit) * 100) : 100}%` }" />
                </div>
              </div>
            </div>
          </section>

          <!-- Messaging -->
          <section v-if="detail" :class="card" class="p-5">
            <div class="flex items-center justify-between">
              <h2 :class="capsLabel">Messaging</h2>
              <button type="button" class="text-xs font-semibold text-secondary hover:underline" @click="openModal('messaging')">Manage</button>
            </div>
            <div class="mt-3 flex flex-wrap gap-1.5">
              <span
                v-for="p in permissionSummary"
                :key="p.label"
                class="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold"
                :class="p.on ? 'bg-action-green/20 text-on-tertiary-fixed' : 'bg-surface-container text-outline'"
              >
                <span class="material-symbols-outlined text-[14px]">{{ p.on ? "check" : "block" }}</span>{{ p.label }}
              </span>
            </div>
          </section>
        </aside>
      </div>
    </template>

    <AdminAgentManageModal
      :open="modalOpen"
      :loading="!detail"
      :agent="detail"
      :initial-tab="modalTab"
      :api-base="apiBase"
      :auth-headers="authHeaders"
      :locked-state="admin?.role === 'state_admin' ? admin.state ?? null : null"
      @close="modalOpen = false"
      @updated="onEdited"
      @deleted="onDeleted"
    />
  </div>
</template>
