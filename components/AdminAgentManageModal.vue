<template>
  <Teleport to="body">
    <div
      v-if="open"
      class="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
      @click.self="emit('close')"
    >
      <div
        v-if="loading"
        class="rounded-2xl border border-ui-border/60 bg-ui-surface px-10 py-12 text-center shadow-2xl"
      >
        <p class="text-sm text-ui-muted">Loading agent…</p>
      </div>
      <div
        v-else-if="agent"
        class="flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-ui-border/60 bg-ui-surface shadow-2xl"
      >
        <header class="flex items-start justify-between gap-4 border-b border-ui-border/40 px-5 py-4">
          <div>
            <h2 class="text-lg font-semibold text-ui-text">{{ agent.name }}</h2>
            <p class="text-sm text-ui-muted">{{ agent.email }}</p>
            <p v-if="agent.lga && agent.ward" class="mt-1 text-xs font-medium text-emerald-600 dark:text-emerald-400">
              {{ agent.ward }} · {{ agent.lga }}
            </p>
            <p v-else class="mt-1 text-xs text-amber-600 dark:text-amber-400">No LGA/ward assigned</p>
          </div>
          <button type="button" class="rounded-lg p-2 text-ui-muted hover:bg-ui-muted/10" @click="emit('close')">
            <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </header>

        <div class="min-h-0 flex-1 space-y-5 overflow-y-auto px-5 py-4">
          <section class="rounded-lg border border-ui-border/40 bg-ui-elevated/30 p-4">
            <h3 class="text-xs font-semibold uppercase tracking-wider text-ui-muted">Data claim allowance</h3>
            <p class="mt-1 text-xs text-ui-muted">
              Used {{ agent.data_claims_used }} of {{ agent.data_claim_limit }} claim(s).
              Default is 1; increase to allow more credits.
            </p>
            <div class="mt-3 flex flex-wrap items-end gap-3">
              <label class="min-w-[120px]">
                <span class="text-[10px] uppercase text-ui-muted">Allowed claims</span>
                <input
                  v-model.number="editClaimLimit"
                  type="number"
                  min="0"
                  max="1000"
                  class="ui-input mt-1 text-sm"
                />
              </label>
              <button
                type="button"
                class="rounded-lg bg-sky-600 px-4 py-2 text-xs font-medium text-white hover:bg-sky-500 disabled:opacity-50"
                :disabled="savingClaims || editClaimLimit < 0"
                @click="saveClaimLimit"
              >
                {{ savingClaims ? "Saving…" : "Save claims" }}
              </button>
            </div>
          </section>

          <section class="rounded-lg border border-ui-border/40 bg-ui-elevated/30 p-4">
            <h3 class="text-xs font-semibold uppercase tracking-wider text-ui-muted">Airtime claim allowance</h3>
            <p class="mt-1 text-xs text-ui-muted">
              Used {{ agent.airtime_claims_used }} of {{ agent.airtime_claim_limit }} claim(s).
              Default is 1; increase to allow more airtime top-ups.
            </p>
            <div class="mt-3 flex flex-wrap items-end gap-3">
              <label class="min-w-[120px]">
                <span class="text-[10px] uppercase text-ui-muted">Allowed claims</span>
                <input
                  v-model.number="editAirtimeLimit"
                  type="number"
                  min="0"
                  max="1000"
                  class="ui-input mt-1 text-sm"
                />
              </label>
              <button
                type="button"
                class="rounded-lg bg-amber-600 px-4 py-2 text-xs font-medium text-white hover:bg-amber-500 disabled:opacity-50"
                :disabled="savingAirtime || editAirtimeLimit < 0"
                @click="saveAirtimeLimit"
              >
                {{ savingAirtime ? "Saving…" : "Save claims" }}
              </button>
            </div>
          </section>

          <section class="rounded-lg border border-ui-border/40 bg-ui-elevated/30 p-4">
            <h3 class="text-xs font-semibold uppercase tracking-wider text-ui-muted">LGA / ward assignment</h3>
            <div class="mt-3 flex flex-wrap items-end gap-3">
              <label class="min-w-[140px] flex-1">
                <span class="text-[10px] uppercase text-ui-muted">LGA</span>
                <select v-model="editLga" class="ui-input mt-1 text-sm" @change="onLgaChange">
                  <option value="" disabled>Select LGA</option>
                  <option v-for="lga in lgas" :key="lga" :value="lga">{{ lga }}</option>
                </select>
              </label>
              <label class="min-w-[140px] flex-1">
                <span class="text-[10px] uppercase text-ui-muted">Ward</span>
                <select v-model="editWard" class="ui-input mt-1 text-sm" :disabled="!editLga">
                  <option value="" disabled>Select ward</option>
                  <option v-for="ward in wards" :key="ward" :value="ward">{{ ward }}</option>
                </select>
              </label>
              <button
                type="button"
                class="rounded-lg bg-violet-600 px-4 py-2 text-xs font-medium text-white hover:bg-violet-500 disabled:opacity-50"
                :disabled="!editLga || !editWard || saving"
                @click="saveAssignment"
              >
                {{ saving ? "Saving…" : "Save assignment" }}
              </button>
            </div>
          </section>

          <section>
            <h3 class="text-xs font-semibold uppercase tracking-wider text-ui-muted">
              Polling units & ingest tokens ({{ agent.polling_units.length }})
            </h3>
            <p v-if="!agent.polling_units.length" class="mt-3 text-sm text-ui-muted">No polling units.</p>
            <ul v-else class="mt-3 space-y-2">
              <li
                v-for="unit in agent.polling_units"
                :key="unit.id"
                class="rounded-lg border border-ui-border/40 bg-ui-elevated/20 px-3 py-2 text-xs"
              >
                <div class="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p class="font-medium text-ui-text">{{ unit.name }}</p>
                    <p class="text-ui-muted">{{ unit.code }} · {{ unit.ward }}, {{ unit.lga }}</p>
                  </div>
                  <span
                    class="rounded-full px-2 py-0.5 text-[10px] font-semibold"
                    :class="unit.stream_status === 'live' ? 'bg-red-500/15 text-red-600' : 'bg-ui-muted/20 text-ui-muted'"
                  >
                    {{ unit.stream_status }}
                  </span>
                </div>
                <p class="mt-2 break-all font-mono text-[10px] text-ui-muted">Ingest: {{ unit.ingest_token }}</p>
              </li>
            </ul>
          </section>
        </div>

        <footer class="flex justify-between gap-3 border-t border-ui-border/40 px-5 py-4">
          <button
            type="button"
            class="rounded-lg border border-red-500/40 px-4 py-2 text-sm text-red-600 hover:bg-red-500/10 dark:text-red-400"
            :disabled="deleting"
            @click="onDelete"
          >
            {{ deleting ? "Deleting…" : "Delete agent" }}
          </button>
          <button type="button" class="rounded-lg border border-ui-border/50 px-4 py-2 text-sm hover:bg-ui-muted/10" @click="emit('close')">
            Close
          </button>
        </footer>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
export type AdminAgentDetail = {
  id: string;
  name: string;
  email: string;
  lga: string | null;
  ward: string | null;
  created_at: string;
  data_claim_limit: number;
  data_claims_used: number;
  airtime_claim_limit: number;
  airtime_claims_used: number;
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

const props = defineProps<{
  open: boolean;
  loading?: boolean;
  agent: AdminAgentDetail | null;
  lgas: string[];
  apiBase: string;
  authHeaders: () => Record<string, string>;
}>();

const emit = defineEmits<{
  close: [];
  updated: [];
  deleted: [id: string];
}>();

const editLga = ref("");
const editWard = ref("");
const editClaimLimit = ref(1);
const editAirtimeLimit = ref(1);
const wards = ref<string[]>([]);
const saving = ref(false);
const savingClaims = ref(false);
const savingAirtime = ref(false);
const deleting = ref(false);

watch(
  () => [props.open, props.agent] as const,
  async ([isOpen, agent]) => {
    if (!isOpen || !agent) return;
    editLga.value = agent.lga ?? "";
    editWard.value = agent.ward ?? "";
    editClaimLimit.value = agent.data_claim_limit ?? 1;
    editAirtimeLimit.value = agent.airtime_claim_limit ?? 1;
    if (editLga.value) {
      wards.value = await $fetch<string[]>(
        `${props.apiBase}/geo/states/ogun/lgas/${encodeURIComponent(editLga.value)}/wards`,
      );
    } else {
      wards.value = [];
    }
  },
);

async function onLgaChange() {
  editWard.value = "";
  if (!editLga.value) {
    wards.value = [];
    return;
  }
  wards.value = await $fetch<string[]>(
    `${props.apiBase}/geo/states/ogun/lgas/${encodeURIComponent(editLga.value)}/wards`,
  );
}

async function saveAssignment() {
  if (!props.agent || !editLga.value || !editWard.value) return;
  saving.value = true;
  try {
    await $fetch(`${props.apiBase}/admin/agents/${props.agent.id}/assignment`, {
      method: "PATCH",
      headers: props.authHeaders(),
      body: { lga: editLga.value, ward: editWard.value },
    });
    emit("updated");
  } finally {
    saving.value = false;
  }
}

async function saveClaimLimit() {
  if (!props.agent || editClaimLimit.value < 0) return;
  savingClaims.value = true;
  try {
    await $fetch(`${props.apiBase}/admin/agents/${props.agent.id}/data-claims`, {
      method: "PATCH",
      headers: props.authHeaders(),
      body: { data_claim_limit: editClaimLimit.value },
    });
    emit("updated");
  } finally {
    savingClaims.value = false;
  }
}

async function saveAirtimeLimit() {
  if (!props.agent || editAirtimeLimit.value < 0) return;
  savingAirtime.value = true;
  try {
    await $fetch(`${props.apiBase}/admin/agents/${props.agent.id}/airtime-claims`, {
      method: "PATCH",
      headers: props.authHeaders(),
      body: { airtime_claim_limit: editAirtimeLimit.value },
    });
    emit("updated");
  } finally {
    savingAirtime.value = false;
  }
}

async function onDelete() {
  if (!props.agent || !confirm(`Delete ${props.agent.name} and all their polling units?`)) return;
  deleting.value = true;
  try {
    await $fetch(`${props.apiBase}/admin/agents/${props.agent.id}`, {
      method: "DELETE",
      headers: props.authHeaders(),
    });
    emit("deleted", props.agent.id);
    emit("close");
  } finally {
    deleting.value = false;
  }
}
</script>
