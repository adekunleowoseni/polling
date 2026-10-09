<template>
  <Teleport to="body">
    <div
      v-if="open"
      class="fixed inset-0 z-[70] flex items-end justify-center bg-deep-navy/60 p-0 backdrop-blur-sm sm:items-center sm:p-4"
      @click.self="close"
    >
      <div
        v-if="loading || !agent"
        class="rounded-2xl bg-surface-container-lowest px-10 py-12 text-center shadow-2xl"
        role="status"
      >
        <span class="material-symbols-outlined animate-spin text-[28px] text-outline">progress_activity</span>
        <p class="mt-2 text-sm text-outline">Loading agent…</p>
      </div>

      <div
        v-else
        ref="dialogEl"
        class="flex max-h-[92vh] w-full flex-col overflow-hidden rounded-t-2xl bg-surface-container-lowest shadow-2xl sm:h-[min(660px,92vh)] sm:max-w-3xl sm:rounded-2xl"
        role="dialog"
        aria-modal="true"
        :aria-labelledby="titleId"
        tabindex="-1"
        @keydown.esc="close"
      >
        <!-- Header -->
        <header class="flex items-start gap-4 bg-deep-navy px-5 py-4 text-pure-white sm:px-6">
          <div class="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-electric-pink font-button-text text-base font-bold">
            {{ initials }}
          </div>
          <div class="min-w-0 flex-1">
            <h2 :id="titleId" class="truncate font-headline-md text-lg font-bold leading-tight">{{ agent.name }}</h2>
            <p class="truncate text-xs text-on-navy">{{ agent.email }}</p>
            <div class="mt-2 flex flex-wrap items-center gap-1.5">
              <span class="rounded-full bg-pure-white/15 px-2.5 py-0.5 font-label-caps text-[10px] font-bold uppercase tracking-wider">
                {{ agent.rank_label || rankLabel(agent.rank) }}
              </span>
              <span v-if="agent.lga" class="rounded-full bg-pure-white/10 px-2.5 py-0.5 text-[11px]">
                {{ [agent.ward, agent.lga].filter(Boolean).join(", ") }}
              </span>
              <span v-else class="rounded-full bg-electric-pink/30 px-2.5 py-0.5 text-[11px]">No turf assigned</span>
            </div>
          </div>
          <button
            type="button"
            class="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-on-navy hover:bg-pure-white/10 hover:text-pure-white"
            aria-label="Close"
            @click="close"
          >
            <span class="material-symbols-outlined text-[22px]">close</span>
          </button>
        </header>

        <div class="flex min-h-0 flex-1 flex-col sm:flex-row">
          <!-- Tabs -->
          <nav
            class="flex shrink-0 gap-1 overflow-x-auto border-b border-surface-container-high bg-surface-container-low p-2 sm:w-52 sm:flex-col sm:overflow-visible sm:border-b-0 sm:border-r"
            role="tablist"
            aria-label="Agent settings"
          >
            <button
              v-for="tab in tabs"
              :key="tab.id"
              type="button"
              role="tab"
              :aria-selected="activeTab === tab.id"
              class="flex shrink-0 items-center gap-2.5 rounded-xl px-3 py-2.5 text-left text-sm transition-colors"
              :class="[
                activeTab === tab.id
                  ? 'bg-surface-container-lowest font-semibold text-primary shadow-sm'
                  : 'text-on-surface-variant hover:bg-surface-container hover:text-primary',
                tab.id === 'danger' ? 'sm:mt-auto' : '',
              ]"
              @click="activeTab = tab.id"
            >
              <span class="material-symbols-outlined text-[19px]" :class="tab.id === 'danger' ? 'text-error' : ''">{{ tab.icon }}</span>
              <span class="whitespace-nowrap">{{ tab.label }}</span>
              <span
                v-if="tab.badge !== undefined"
                class="ml-auto rounded-full bg-surface-container-high px-1.5 font-label-caps text-[10px] text-on-surface"
              >
                {{ tab.badge }}
              </span>
            </button>
          </nav>

          <!-- Panels -->
          <div class="min-h-0 flex-1 overflow-y-auto p-5 sm:p-6">
            <!-- Rank & turf -->
            <section v-if="activeTab === 'turf'" class="flex flex-col gap-5">
              <div>
                <h3 class="font-button-text text-base font-bold text-primary">Rank &amp; turf</h3>
                <p class="mt-1 text-xs text-outline">
                  The rank decides where this person sits in the hierarchy; the turf decides which LGA, ward and polling
                  unit they work in.
                </p>
              </div>

              <fieldset>
                <legend class="mb-2 font-label-caps text-[11px] font-semibold uppercase tracking-wider text-outline">Rank</legend>
                <div class="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  <label
                    v-for="opt in RANK_OPTIONS"
                    :key="opt.value"
                    class="flex cursor-pointer items-start gap-3 rounded-xl border-2 p-3 transition-colors"
                    :class="editRank === opt.value ? 'border-deep-navy bg-deep-navy/5' : 'border-surface-container-high hover:border-outline-variant'"
                  >
                    <input v-model="editRank" type="radio" name="agent-rank" :value="opt.value" class="mt-0.5" />
                    <span>
                      <span class="block text-sm font-semibold text-primary">{{ opt.label }}</span>
                      <span class="block text-[11px] text-outline">{{ opt.hint }}</span>
                    </span>
                  </label>
                </div>
              </fieldset>

              <div class="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <label class="flex flex-col gap-1">
                  <span class="font-label-caps text-[11px] font-semibold uppercase tracking-wider text-outline">State</span>
                  <select v-model="editState" :class="inputClass" :disabled="!!lockedState" @change="onStateChange">
                    <option value="" disabled>Select state</option>
                    <option v-for="opt in stateOptions" :key="opt.value" :value="opt.value">{{ opt.label }}</option>
                  </select>
                </label>
                <label class="flex flex-col gap-1">
                  <span class="font-label-caps text-[11px] font-semibold uppercase tracking-wider text-outline">LGA</span>
                  <select v-model="editLga" :class="inputClass" :disabled="!editState" @change="onLgaChange">
                    <option value="" disabled>Select LGA</option>
                    <option v-for="lga in lgas" :key="lga" :value="lga">{{ lga }}</option>
                  </select>
                </label>
                <label v-if="editRank !== 'lga_supervisor'" class="flex flex-col gap-1">
                  <span class="font-label-caps text-[11px] font-semibold uppercase tracking-wider text-outline">Ward</span>
                  <select v-model="editWard" :class="inputClass" :disabled="!editLga">
                    <option value="" disabled>{{ editLga ? "Select ward" : "Pick an LGA first" }}</option>
                    <option v-for="ward in wards" :key="ward" :value="ward">{{ ward }}</option>
                  </select>
                </label>
                <label v-if="editRank === 'polling_unit_agent'" class="flex flex-col gap-1">
                  <span class="font-label-caps text-[11px] font-semibold uppercase tracking-wider text-outline">Polling unit code</span>
                  <input v-model.trim="editPuCode" type="text" :class="inputClass" placeholder="e.g. 27-03-05-001 (optional)" />
                </label>
              </div>

              <p
                v-if="rankChanged"
                class="flex items-start gap-2 rounded-xl bg-secondary/10 px-3 py-2 text-xs text-secondary"
              >
                <span class="material-symbols-outlined text-[16px]">info</span>
                Changing rank can take this person out of their current team in the hierarchy. Re-link them on their
                page afterwards.
              </p>

              <div class="flex items-center justify-end gap-3">
                <SaveStatus :state="status.turf" />
                <button
                  type="button"
                  :class="primaryBtn"
                  :disabled="!turfDirty || !turfValid || busy === 'turf'"
                  @click="saveAssignment"
                >
                  {{ busy === "turf" ? "Saving…" : "Save rank & turf" }}
                </button>
              </div>
            </section>

            <!-- Claims -->
            <section v-else-if="activeTab === 'claims'" class="flex flex-col gap-5">
              <div>
                <h3 class="font-button-text text-base font-bold text-primary">Data &amp; airtime claims</h3>
                <p class="mt-1 text-xs text-outline">
                  How many top-ups this person may claim in the mobile app. The default is 1 of each.
                </p>
              </div>

              <div v-for="claim in claimRows" :key="claim.key" class="rounded-2xl border border-surface-container-high p-4">
                <div class="flex items-center gap-3">
                  <span class="flex h-10 w-10 items-center justify-center rounded-xl" :class="claim.tone">
                    <span class="material-symbols-outlined text-[20px]">{{ claim.icon }}</span>
                  </span>
                  <div class="min-w-0 flex-1">
                    <p class="text-sm font-semibold text-primary">{{ claim.label }}</p>
                    <p class="text-xs text-outline">{{ claim.used }} of {{ claim.limit }} used</p>
                  </div>
                  <span class="font-label-caps text-[11px] font-bold" :class="claim.used >= claim.limit ? 'text-error' : 'text-action-green'">
                    {{ claim.used >= claim.limit ? "Limit reached" : `${claim.limit - claim.used} left` }}
                  </span>
                </div>
                <div class="mt-3 h-2 overflow-hidden rounded-full bg-surface-container-high" role="progressbar" :aria-valuenow="claim.used" :aria-valuemax="claim.limit">
                  <div class="h-full rounded-full" :class="claim.bar" :style="{ width: `${claim.limit ? Math.min(100, (claim.used / claim.limit) * 100) : 100}%` }" />
                </div>
                <div class="mt-4 flex flex-wrap items-end gap-3">
                  <label class="flex flex-col gap-1">
                    <span class="font-label-caps text-[11px] font-semibold uppercase tracking-wider text-outline">Allowed claims</span>
                    <div class="flex items-center rounded-xl bg-off-white">
                      <button type="button" class="h-10 w-10 text-lg text-primary disabled:opacity-40" :disabled="claim.model.value <= 0" aria-label="Decrease" @click="claim.model.value = Math.max(0, claim.model.value - 1)">−</button>
                      <input v-model.number="claim.model.value" type="number" min="0" max="1000" class="h-10 w-16 bg-transparent text-center text-sm font-semibold text-on-surface focus:outline-none" :aria-label="`${claim.label} allowed`" />
                      <button type="button" class="h-10 w-10 text-lg text-primary" aria-label="Increase" @click="claim.model.value = Math.min(1000, claim.model.value + 1)">+</button>
                    </div>
                  </label>
                  <div class="ml-auto flex items-center gap-3">
                    <SaveStatus :state="status[claim.key]" />
                    <button
                      type="button"
                      :class="primaryBtn"
                      :disabled="claim.model.value === claim.limit || claim.model.value < 0 || busy === claim.key"
                      @click="claim.save"
                    >
                      {{ busy === claim.key ? "Saving…" : "Save" }}
                    </button>
                  </div>
                </div>
              </div>
            </section>

            <!-- Messaging -->
            <section v-else-if="activeTab === 'messaging'" class="flex flex-col gap-5">
              <div>
                <h3 class="font-button-text text-base font-bold text-primary">Messaging permissions</h3>
                <p class="mt-1 text-xs text-outline">What this person may send to voters and members from the mobile app inbox.</p>
              </div>
              <ul class="divide-y divide-surface-container-high rounded-2xl border border-surface-container-high">
                <li v-for="perm in permissionRows" :key="perm.label" class="flex items-center gap-4 p-4">
                  <span class="material-symbols-outlined text-[20px] text-outline">{{ perm.icon }}</span>
                  <div class="min-w-0 flex-1">
                    <p class="text-sm font-semibold text-primary">{{ perm.label }}</p>
                    <p class="text-xs text-outline">{{ perm.hint }}</p>
                  </div>
                  <button
                    type="button"
                    role="switch"
                    :aria-checked="perm.model.value"
                    :aria-label="perm.label"
                    class="relative h-6 w-11 shrink-0 rounded-full transition-colors"
                    :class="perm.model.value ? 'bg-action-green' : 'bg-surface-container-highest'"
                    @click="perm.model.value = !perm.model.value"
                  >
                    <span
                      class="absolute top-0.5 h-5 w-5 rounded-full bg-pure-white shadow transition-transform"
                      :class="perm.model.value ? 'translate-x-[22px]' : 'translate-x-0.5'"
                    />
                  </button>
                </li>
              </ul>
              <div class="flex items-center justify-end gap-3">
                <SaveStatus :state="status.messaging" />
                <button type="button" :class="primaryBtn" :disabled="!permsDirty || busy === 'messaging'" @click="saveInboxPermissions">
                  {{ busy === "messaging" ? "Saving…" : "Save permissions" }}
                </button>
              </div>
            </section>

            <!-- Polling units -->
            <section v-else-if="activeTab === 'units'" class="flex flex-col gap-4">
              <div>
                <h3 class="font-button-text text-base font-bold text-primary">Polling units &amp; live feeds</h3>
                <p class="mt-1 text-xs text-outline">Units this person registered, with the ingest token their device streams with.</p>
              </div>
              <p v-if="!agent.polling_units.length" class="rounded-2xl bg-surface-container-low p-6 text-center text-sm text-outline">
                No polling units registered by this agent yet.
              </p>
              <ul v-else class="flex flex-col gap-2">
                <li v-for="unit in agent.polling_units" :key="unit.id" class="rounded-2xl border border-surface-container-high p-4">
                  <div class="flex flex-wrap items-start justify-between gap-2">
                    <div class="min-w-0">
                      <p class="truncate text-sm font-semibold text-primary">{{ unit.name }}</p>
                      <p class="text-xs text-outline">{{ unit.code }} · {{ unit.ward }}, {{ unit.lga }}</p>
                    </div>
                    <span
                      class="inline-flex items-center gap-1 rounded-full px-2 py-0.5 font-label-caps text-[10px] font-bold uppercase"
                      :class="unit.stream_status === 'live' ? 'bg-error-container text-error' : 'bg-surface-container text-outline'"
                    >
                      <span v-if="unit.stream_status === 'live'" class="h-1.5 w-1.5 animate-pulse rounded-full bg-error" />
                      {{ unit.stream_status }}
                    </span>
                  </div>
                  <div class="mt-3 flex items-center gap-2 rounded-xl bg-off-white px-3 py-2">
                    <span class="font-label-caps text-[10px] uppercase text-outline">Ingest</span>
                    <code class="min-w-0 flex-1 truncate font-mono text-[11px] text-on-surface">{{ unit.ingest_token }}</code>
                    <button
                      type="button"
                      class="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-[11px] font-semibold text-primary hover:bg-surface-container"
                      @click="copyToken(unit.ingest_token)"
                    >
                      <span class="material-symbols-outlined text-[14px]">{{ copied === unit.ingest_token ? "check" : "content_copy" }}</span>
                      {{ copied === unit.ingest_token ? "Copied" : "Copy" }}
                    </button>
                  </div>
                </li>
              </ul>
            </section>

            <!-- Danger zone -->
            <section v-else-if="activeTab === 'danger'" class="flex flex-col gap-4">
              <div>
                <h3 class="font-button-text text-base font-bold text-error">Delete this agent</h3>
                <p class="mt-1 text-xs text-outline">This cannot be undone.</p>
              </div>
              <ul class="flex flex-col gap-2 rounded-2xl bg-error-container/40 p-4 text-sm text-on-surface">
                <li class="flex gap-2"><span class="material-symbols-outlined text-[18px] text-error">person_off</span>Their login stops working immediately.</li>
                <li class="flex gap-2"><span class="material-symbols-outlined text-[18px] text-error">videocam_off</span>Their {{ agent.polling_units.length }} polling unit(s) and feeds are removed.</li>
                <li class="flex gap-2"><span class="material-symbols-outlined text-[18px] text-error">group_off</span>Their voters become unassigned and their team members become unplaced in the hierarchy.</li>
              </ul>
              <label class="flex flex-col gap-1">
                <span class="text-xs text-on-surface">Type <strong>{{ agent.name }}</strong> to confirm</span>
                <input v-model="deleteConfirm" type="text" :class="inputClass" autocomplete="off" />
              </label>
              <div class="flex items-center justify-end gap-3">
                <SaveStatus :state="status.danger" />
                <button
                  type="button"
                  class="inline-flex h-10 items-center gap-1.5 rounded-xl bg-error px-4 text-sm font-semibold text-pure-white disabled:opacity-40"
                  :disabled="deleteConfirm.trim() !== agent.name.trim() || busy === 'danger'"
                  @click="onDelete"
                >
                  <span class="material-symbols-outlined text-[18px]">delete_forever</span>
                  {{ busy === "danger" ? "Deleting…" : "Delete agent" }}
                </button>
              </div>
            </section>
          </div>
        </div>

        <footer class="flex items-center justify-between gap-3 border-t border-surface-container-high px-5 py-3 sm:px-6">
          <p class="text-[11px] text-outline">Joined {{ joined }}</p>
          <button type="button" class="h-10 rounded-xl bg-surface-container-low px-4 text-sm font-semibold text-primary hover:bg-surface-container" @click="close">
            Done
          </button>
        </footer>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import type { PropType } from "vue";

export type AdminAgentDetail = {
  id: string;
  name: string;
  email: string;
  rank?: string;
  rank_label?: string;
  lga: string | null;
  ward: string | null;
  state?: string | null;
  polling_unit_code?: string | null;
  created_at: string;
  data_claim_limit: number;
  data_claims_used: number;
  airtime_claim_limit: number;
  airtime_claims_used: number;
  can_message_voters?: boolean;
  can_post_invites?: boolean;
  can_post_materials?: boolean;
  polling_units: {
    id: string;
    name: string;
    code: string;
    lga: string;
    ward: string;
    ingest_token: string;
    stream_status: string;
    people_count: number;
  }[];
};

export type AgentModalTab = "turf" | "claims" | "messaging" | "units" | "danger";

type SaveState = { kind: "ok" | "error"; text: string } | null;

const STATE_OPTIONS = [{ value: "Ogun State", label: "Ogun State", code: "ogun" }] as const;

const RANK_OPTIONS = [
  { value: "lga_supervisor", label: "LGA Coordinator", hint: "Leads the ward coordinators in one LGA" },
  { value: "ward_supervisor", label: "Ward Coordinator", hint: "Leads the agents in one ward" },
  { value: "polling_unit_agent", label: "Polling unit agent", hint: "Holds voters at a polling unit" },
  { value: "field_agent", label: "Field agent", hint: "Canvasses; does not hold voters" },
] as const;

const props = defineProps<{
  open: boolean;
  loading?: boolean;
  agent: AdminAgentDetail | null;
  apiBase: string;
  authHeaders: () => Record<string, string>;
  /** When set (state admin), assignment stays inside that state only. */
  lockedState?: string | null;
  /** Tab shown when the dialog opens. */
  initialTab?: AgentModalTab;
}>();

const emit = defineEmits<{
  close: [];
  updated: [];
  deleted: [id: string];
}>();

/** Inline "Saved" / error text next to a Save button. */
const SaveStatus = defineComponent({
  props: { state: { type: Object as PropType<SaveState>, default: null } },
  setup(p) {
    return () =>
      p.state
        ? h(
            "span",
            {
              class: `inline-flex items-center gap-1 text-xs ${p.state.kind === "ok" ? "text-action-green" : "text-error"}`,
              role: p.state.kind === "error" ? "alert" : "status",
            },
            [
              h("span", { class: "material-symbols-outlined text-[16px]" }, p.state.kind === "ok" ? "check_circle" : "error"),
              p.state.text,
            ],
          )
        : null;
  },
});

const inputClass =
  "h-10 w-full rounded-xl bg-off-white px-3 text-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-secondary/40 disabled:opacity-60";
const primaryBtn =
  "inline-flex h-10 items-center justify-center rounded-xl bg-deep-navy px-4 text-sm font-semibold text-pure-white transition hover:bg-primary disabled:cursor-not-allowed disabled:opacity-40";

const titleId = `agent-modal-${Math.random().toString(36).slice(2, 8)}`;
const dialogEl = ref<HTMLElement | null>(null);
const activeTab = ref<AgentModalTab>("turf");
const busy = ref<"" | AgentModalTab | "data" | "airtime">("");
const status = reactive<Record<string, SaveState>>({ turf: null, data: null, airtime: null, messaging: null, danger: null });
const copied = ref("");
const deleteConfirm = ref("");

const editState = ref("");
const editLga = ref("");
const editWard = ref("");
const editRank = ref("field_agent");
const editPuCode = ref("");
const editClaimLimit = ref(1);
const editAirtimeLimit = ref(1);
const editCanMessage = ref(false);
const editCanInvites = ref(false);
const editCanMaterials = ref(false);
const lgas = ref<string[]>([]);
const wards = ref<string[]>([]);

const stateOptions = computed(() =>
  props.lockedState ? STATE_OPTIONS.filter((s) => s.value === props.lockedState) : [...STATE_OPTIONS],
);

const initials = computed(() => {
  const parts = (props.agent?.name || "").trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return "?";
  return parts.length === 1 ? parts[0].slice(0, 2).toUpperCase() : `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
});

const joined = computed(() => {
  const d = props.agent?.created_at ? new Date(props.agent.created_at) : null;
  return d && !Number.isNaN(d.getTime()) ? d.toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" }) : "—";
});

const tabs = computed(() => [
  { id: "turf" as const, label: "Rank & turf", icon: "badge", badge: undefined },
  { id: "claims" as const, label: "Claims", icon: "sim_card", badge: undefined },
  { id: "messaging" as const, label: "Messaging", icon: "forum", badge: undefined },
  { id: "units" as const, label: "Polling units", icon: "how_to_vote", badge: props.agent?.polling_units.length ?? 0 },
  { id: "danger" as const, label: "Danger zone", icon: "warning", badge: undefined },
]);

const rankChanged = computed(() => !!props.agent && editRank.value !== (props.agent.rank || "field_agent"));
const turfDirty = computed(() => {
  const a = props.agent;
  if (!a) return false;
  return (
    rankChanged.value ||
    editLga.value !== (a.lga ?? "") ||
    (editRank.value !== "lga_supervisor" && editWard.value !== (a.ward ?? "")) ||
    (editRank.value === "polling_unit_agent" && editPuCode.value !== (a.polling_unit_code || ""))
  );
});
const turfValid = computed(() => !!editState.value && !!editLga.value && (editRank.value === "lga_supervisor" || !!editWard.value));
const permsDirty = computed(() => {
  const a = props.agent;
  if (!a) return false;
  return (
    editCanMessage.value !== !!a.can_message_voters ||
    editCanInvites.value !== !!a.can_post_invites ||
    editCanMaterials.value !== !!a.can_post_materials
  );
});

const claimRows = computed(() => {
  const a = props.agent;
  if (!a) return [];
  return [
    {
      key: "data" as const,
      label: "Data bundles",
      icon: "sim_card",
      tone: "bg-secondary/10 text-secondary",
      bar: "bg-secondary",
      used: a.data_claims_used,
      limit: a.data_claim_limit,
      model: editClaimLimit,
      save: saveClaimLimit,
    },
    {
      key: "airtime" as const,
      label: "Airtime",
      icon: "phone_iphone",
      tone: "bg-action-green/20 text-on-tertiary-fixed",
      bar: "bg-action-green",
      used: a.airtime_claims_used,
      limit: a.airtime_claim_limit,
      model: editAirtimeLimit,
      save: saveAirtimeLimit,
    },
  ];
});

const permissionRows = [
  { label: "Send messages", hint: "Message voters and members directly", icon: "sms", model: editCanMessage },
  { label: "Post action invites", hint: "Invite voters to rallies, canvasses and events", icon: "event", model: editCanInvites },
  { label: "Post materials", hint: "Share flyers, manifestos and campaign media", icon: "attach_file", model: editCanMaterials },
];

function rankLabel(rank?: string) {
  return RANK_OPTIONS.find((r) => r.value === rank)?.label ?? "Field agent";
}

function errorText(e: unknown, fallback: string) {
  const detail = (e as { data?: { detail?: unknown } })?.data?.detail;
  if (typeof detail === "string") return detail;
  if (Array.isArray(detail) && detail[0]?.msg) return String(detail[0].msg);
  return fallback;
}

function close() {
  if (busy.value) return;
  emit("close");
}

function geoCodeForState(stateName: string) {
  return STATE_OPTIONS.find((s) => s.value === stateName)?.code ?? "ogun";
}

async function loadLgasForState(stateName: string) {
  lgas.value = stateName ? await $fetch<string[]>(`${props.apiBase}/geo/states/${geoCodeForState(stateName)}/lgas`) : [];
}

async function loadWardsForLga(stateName: string, lga: string) {
  wards.value =
    stateName && lga
      ? await $fetch<string[]>(`${props.apiBase}/geo/states/${geoCodeForState(stateName)}/lgas/${encodeURIComponent(lga)}/wards`)
      : [];
}

function resetForm(agent: AdminAgentDetail) {
  editState.value = props.lockedState || agent.state || "Ogun State";
  editLga.value = agent.lga ?? "";
  editWard.value = agent.ward ?? "";
  editRank.value = agent.rank || "field_agent";
  editPuCode.value = agent.polling_unit_code || "";
  editClaimLimit.value = agent.data_claim_limit ?? 1;
  editAirtimeLimit.value = agent.airtime_claim_limit ?? 1;
  editCanMessage.value = !!agent.can_message_voters;
  editCanInvites.value = !!agent.can_post_invites;
  editCanMaterials.value = !!agent.can_post_materials;
}

// Fresh form + first tab when the dialog opens or a different agent is shown.
watch(
  () => [props.open, props.agent?.id] as const,
  async ([isOpen, id], prev) => {
    const agent = props.agent;
    if (!isOpen || !agent) return;
    const reopened = !prev || !prev[0] || prev[1] !== id;
    if (reopened) {
      activeTab.value = props.initialTab || "turf";
      deleteConfirm.value = "";
      for (const k of Object.keys(status)) status[k] = null;
    }
    resetForm(agent);
    await nextTick();
    if (reopened) dialogEl.value?.focus();
    try {
      await loadLgasForState(editState.value);
      if (editState.value && editLga.value) await loadWardsForLga(editState.value, editLga.value);
      else wards.value = [];
    } catch {
      status.turf = { kind: "error", text: "Could not load LGAs and wards." };
    }
  },
  { immediate: true },
);

// Refreshed agent after a save (same id): keep the tab, refresh the form values.
watch(
  () => props.agent,
  (agent) => {
    if (props.open && agent) resetForm(agent);
  },
);

async function onStateChange() {
  editLga.value = "";
  editWard.value = "";
  wards.value = [];
  await loadLgasForState(editState.value);
}

async function onLgaChange() {
  editWard.value = "";
  await loadWardsForLga(editState.value, editLga.value);
}

async function run(key: keyof typeof status, okText: string, fallback: string, fn: () => Promise<unknown>) {
  busy.value = key as typeof busy.value;
  status[key] = null;
  try {
    await fn();
    status[key] = { kind: "ok", text: okText };
    emit("updated");
  } catch (e: unknown) {
    status[key] = { kind: "error", text: errorText(e, fallback) };
  } finally {
    busy.value = "";
  }
}

function saveAssignment() {
  if (!props.agent || !turfValid.value) return;
  const body: Record<string, string> = { lga: editLga.value, rank: editRank.value };
  if (editRank.value !== "lga_supervisor") body.ward = editWard.value;
  if (editRank.value === "polling_unit_agent" && editPuCode.value) body.polling_unit_code = editPuCode.value;
  const id = props.agent.id;
  return run("turf", "Rank & turf saved", "Could not save the assignment.", () =>
    $fetch(`${props.apiBase}/admin/agents/${id}/assignment`, { method: "PATCH", headers: props.authHeaders(), body }),
  );
}

function saveClaimLimit() {
  if (!props.agent) return;
  const id = props.agent.id;
  return run("data", "Saved", "Could not save data claims.", () =>
    $fetch(`${props.apiBase}/admin/agents/${id}/data-claims`, {
      method: "PATCH",
      headers: props.authHeaders(),
      body: { data_claim_limit: editClaimLimit.value },
    }),
  );
}

function saveAirtimeLimit() {
  if (!props.agent) return;
  const id = props.agent.id;
  return run("airtime", "Saved", "Could not save airtime claims.", () =>
    $fetch(`${props.apiBase}/admin/agents/${id}/airtime-claims`, {
      method: "PATCH",
      headers: props.authHeaders(),
      body: { airtime_claim_limit: editAirtimeLimit.value },
    }),
  );
}

function saveInboxPermissions() {
  if (!props.agent) return;
  const id = props.agent.id;
  return run("messaging", "Permissions saved", "Could not save permissions.", () =>
    $fetch(`${props.apiBase}/admin/agents/${id}/inbox-permissions`, {
      method: "PATCH",
      headers: props.authHeaders(),
      body: {
        can_message_voters: editCanMessage.value,
        can_post_invites: editCanInvites.value,
        can_post_materials: editCanMaterials.value,
      },
    }),
  );
}

async function onDelete() {
  if (!props.agent || deleteConfirm.value.trim() !== props.agent.name.trim()) return;
  const id = props.agent.id;
  busy.value = "danger";
  status.danger = null;
  try {
    await $fetch(`${props.apiBase}/admin/agents/${id}`, { method: "DELETE", headers: props.authHeaders() });
    busy.value = "";
    emit("deleted", id);
    emit("close");
  } catch (e: unknown) {
    status.danger = { kind: "error", text: errorText(e, "Could not delete this agent.") };
    busy.value = "";
  }
}

async function copyToken(token: string) {
  try {
    await navigator.clipboard.writeText(token);
    copied.value = token;
    setTimeout(() => {
      if (copied.value === token) copied.value = "";
    }, 1500);
  } catch {
    /* clipboard blocked: the token is still visible to copy by hand */
  }
}
</script>
