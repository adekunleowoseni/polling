<template>
  <div class="mx-auto max-w-3xl space-y-8 p-6">
    <section class="flex flex-wrap items-center justify-between gap-4">
      <div class="flex items-center gap-4">
        <BrandLogos size="sm" :show-divider="false" />
        <div>
          <h1 class="text-xl font-semibold text-ui-text">Agent dashboard</h1>
          <p v-if="agent" class="mt-1 text-sm text-ui-muted">Signed in as {{ agent.name }}</p>
          <p v-if="agent?.lga && agent?.ward" class="mt-1 text-xs font-medium text-emerald-600 dark:text-emerald-400">
            Assigned: {{ agent.ward }} · {{ agent.lga }}
          </p>
          <p v-else-if="agent" class="mt-1 text-xs text-amber-600 dark:text-amber-400">
            No LGA/ward assigned yet — contact admin.
          </p>
        </div>
      </div>
      <button class="text-sm text-ui-muted hover:text-ui-text" @click="logout">Sign out</button>
    </section>

    <section class="ui-card p-6">
      <h2 class="font-semibold text-ui-text">Claim data credit</h2>
      <p class="mt-1 text-xs text-ui-muted">
        Enter your phone number and network. You can only claim plans enabled by admin.
      </p>
      <p
        class="mt-2 text-xs font-medium"
        :class="dataQuota && dataQuota.data_claims_remaining > 0
          ? 'text-emerald-600 dark:text-emerald-400'
          : 'text-amber-600 dark:text-amber-400'"
      >
        <template v-if="dataQuota">
          Claims remaining: {{ dataQuota.data_claims_remaining }}
          (used {{ dataQuota.data_claims_used }} of {{ dataQuota.data_claim_limit }})
        </template>
        <template v-else>Loading claim allowance…</template>
      </p>

      <form class="mt-4 space-y-4" @submit.prevent="creditData">
        <label class="block">
          <span class="text-xs text-ui-muted">Phone number</span>
          <input
            v-model="dataForm.phone"
            type="tel"
            required
            placeholder="08012345678"
            class="ui-input mt-1"
          />
        </label>

        <label class="block">
          <span class="text-xs text-ui-muted">Network</span>
          <select v-model="dataForm.network" required class="ui-input mt-1" @change="onDataNetworkChange">
            <option value="" disabled>Select network</option>
            <option value="mtn">MTN</option>
            <option value="airtel">Airtel</option>
            <option value="glo">Glo</option>
            <option value="9mobile">9mobile</option>
          </select>
        </label>

        <label class="block">
          <span class="text-xs text-ui-muted">Data plan</span>
          <select
            v-model="dataForm.variation_code"
            required
            class="ui-input mt-1"
            :disabled="!dataForm.network || !agentDataPlans.length"
          >
            <option value="" disabled>
              {{
                !dataForm.network
                  ? "Select network first"
                  : loadingDataPlans
                    ? "Loading plans…"
                    : agentDataPlans.length
                      ? "Select plan"
                      : "No plans enabled for this network"
              }}
            </option>
            <option v-for="plan in agentDataPlans" :key="plan.variation_code" :value="plan.variation_code">
              {{ plan.name }} — ₦{{ plan.amount.toLocaleString() }}
            </option>
          </select>
        </label>

        <button
          type="submit"
          class="rounded-lg bg-sky-600 px-4 py-2 text-sm text-white hover:bg-sky-500 disabled:opacity-50"
          :disabled="
            creditingData
              || !dataForm.phone
              || !dataForm.network
              || !dataForm.variation_code
              || (dataQuota !== null && dataQuota.data_claims_remaining <= 0)
          "
        >
          {{
            dataQuota && dataQuota.data_claims_remaining <= 0
              ? "No claims left"
              : creditingData
                ? "Crediting…"
                : "Credit data"
          }}
        </button>
        <p v-if="dataMessage" class="text-sm text-emerald-600 dark:text-emerald-400">{{ dataMessage }}</p>
        <p v-if="dataError" class="text-sm text-red-500">{{ dataError }}</p>
      </form>

      <div v-if="dataCredits.length" class="mt-5 border-t border-ui-border/40 pt-4">
        <h3 class="text-xs font-semibold uppercase tracking-wider text-ui-muted">Your recent credits</h3>
        <ul class="mt-2 space-y-2">
          <li
            v-for="c in dataCredits"
            :key="c.id"
            class="rounded-lg border border-ui-border/40 bg-ui-elevated/30 px-3 py-2 text-xs"
          >
            <div class="flex flex-wrap items-center justify-between gap-2">
              <span class="font-medium text-ui-text">{{ c.plan_name }}</span>
              <span
                class="rounded-full px-2 py-0.5 font-semibold"
                :class="c.status === 'delivered' || c.status === 'successful'
                  ? 'bg-emerald-500/15 text-emerald-600'
                  : c.status === 'failed'
                    ? 'bg-red-500/15 text-red-600'
                    : 'bg-amber-500/15 text-amber-600'"
              >
                {{ c.status }}
              </span>
            </div>
            <p class="mt-1 text-ui-muted">{{ c.phone }} · {{ c.network }} · ₦{{ c.amount.toLocaleString() }}</p>
          </li>
        </ul>
      </div>
    </section>

    <section class="ui-card p-6">
      <h2 class="font-semibold text-ui-text">Register polling unit</h2>
      <p class="mt-1 text-xs text-ui-muted">
        <template v-if="agent?.lga && agent?.ward">
          Select a polling unit in your assigned area: {{ agent.ward }}, {{ agent.lga }}.
        </template>
        <template v-else>
          Select LGA, ward, then polling unit — no typing required.
        </template>
      </p>

      <form class="mt-4 space-y-4" @submit.prevent="createUnit">
        <label class="block">
          <span class="text-xs text-ui-muted">State</span>
          <select v-model="form.state" class="ui-input mt-1" disabled>
            <option value="Ogun State">Ogun State</option>
          </select>
        </label>

        <label class="block">
          <span class="text-xs text-ui-muted">Local Government Area (LGA)</span>
          <select
            v-model="form.lga"
            required
            class="ui-input mt-1"
            :disabled="loadingLgas || !lgas.length || locationLocked"
            @change="onLgaChange"
          >
            <option value="" disabled>{{ loadingLgas ? "Loading LGAs…" : "Select LGA" }}</option>
            <option v-for="lga in lgas" :key="lga" :value="lga">{{ lga }}</option>
          </select>
        </label>

        <label class="block">
          <span class="text-xs text-ui-muted">Ward</span>
          <select
            v-model="form.ward"
            required
            class="ui-input mt-1"
            :disabled="!form.lga || loadingWards || !wards.length || locationLocked"
            @change="onWardChange"
          >
            <option value="" disabled>
              {{ !form.lga ? "Select LGA first" : loadingWards ? "Loading wards…" : "Select ward" }}
            </option>
            <option v-for="ward in wards" :key="ward" :value="ward">{{ ward }}</option>
          </select>
        </label>

        <label class="block">
          <span class="text-xs text-ui-muted">Polling unit</span>
          <select
            v-model="form.pu_code"
            required
            class="ui-input mt-1"
            :disabled="!form.ward || loadingPollingUnits || !pollingUnits.length"
          >
            <option value="" disabled>
              {{
                !form.ward
                  ? "Select ward first"
                  : loadingPollingUnits
                    ? "Loading polling units…"
                    : "Select polling unit"
              }}
            </option>
            <option v-for="pu in pollingUnits" :key="pu.code" :value="pu.code">
              {{ pu.code }} — {{ pu.name }}
            </option>
          </select>
        </label>

        <p v-if="previewCode" class="text-xs text-ui-muted">
          Unit code: <span class="font-mono text-ui-text">{{ previewCode }}</span>
        </p>

        <label class="block">
          <span class="text-xs text-ui-muted">Device</span>
          <select v-model="form.device_type" class="ui-input mt-1">
            <option value="meta_rayban">Meta Ray-Ban AI Glasses</option>
            <option value="phone_camera">Phone camera (testing)</option>
          </select>
        </label>

        <button
          type="submit"
          class="rounded-lg bg-emerald-600 px-4 py-2 text-sm text-white hover:bg-emerald-500 disabled:opacity-50"
          :disabled="creating || !form.lga || !form.ward || !form.pu_code"
        >
          {{ creating ? "Creating…" : "Register polling unit" }}
        </button>
        <p v-if="createError" class="text-sm text-red-400">{{ createError }}</p>
      </form>

      <div v-if="newUnit" class="mt-4 rounded-lg border border-amber-500/30 bg-amber-500/10 p-4 text-sm">
        <p class="font-medium text-amber-200">Save your ingest token — shown once</p>
        <p class="mt-2 break-all font-mono text-xs text-amber-100">{{ newUnit.ingest_token }}</p>
        <NuxtLink
          :to="`/relay/${newUnit.code}?token=${newUnit.ingest_token}`"
          class="mt-3 inline-block text-emerald-400 hover:underline"
        >
          Start streaming →
        </NuxtLink>
      </div>
    </section>

    <section class="rounded-2xl border border-white/10 bg-slate-900/80 p-6">
      <h2 class="font-semibold text-white">Your polling units</h2>
      <p v-if="loading" class="mt-4 text-sm text-slate-500">Loading…</p>
      <ul v-else-if="!units.length" class="mt-4 text-sm text-slate-500">No units yet.</ul>
      <ul v-else class="mt-4 divide-y divide-white/5">
        <li v-for="unit in units" :key="unit.id" class="py-4">
          <div class="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p class="font-medium text-white">{{ unit.name }}</p>
              <p class="text-xs text-slate-500">
                {{ unit.state || "Ogun State" }} · {{ unit.lga }} · {{ unit.ward }} · {{ unit.code }}
              </p>
              <p class="mt-1 text-xs text-emerald-400">{{ unit.people_count }} unique people counted</p>
              <p class="mt-2 break-all font-mono text-[10px] text-ui-muted">
                Ingest token: {{ unit.ingest_token }}
              </p>
            </div>
            <NuxtLink
              :to="`/relay/${unit.code}`"
              class="rounded-lg border border-white/10 px-3 py-1.5 text-xs text-sky-300 hover:bg-white/5"
            >
              Stream
            </NuxtLink>
          </div>
          <div v-if="editingCode === unit.code" class="mt-3 flex flex-wrap items-end gap-2 rounded-lg border border-white/10 bg-slate-950/50 p-3">
            <label class="min-w-[100px] flex-1">
              <span class="text-xs text-slate-500">Correct count</span>
              <input
                v-model.number="editCount"
                type="number"
                min="0"
                class="mt-1 w-full rounded border border-white/10 bg-slate-950 px-2 py-1.5 text-sm text-white"
              />
            </label>
            <button
              type="button"
              class="rounded bg-emerald-600 px-3 py-1.5 text-xs text-white hover:bg-emerald-500 disabled:opacity-50"
              :disabled="savingEdit"
              @click="saveUnitCount(unit.code)"
            >
              {{ savingEdit ? "Saving…" : "Save" }}
            </button>
            <button type="button" class="rounded px-3 py-1.5 text-xs text-slate-400 hover:text-white" @click="editingCode = null">
              Cancel
            </button>
          </div>
          <button
            v-else
            type="button"
            class="mt-2 text-xs text-slate-500 hover:text-emerald-400"
            @click="startEditCount(unit)"
          >
            Correct unique people count
          </button>
        </li>
      </ul>
    </section>
  </div>
</template>

<script setup lang="ts">
import type { PollingUnit } from "~/composables/useVideoFeeds";
import { buildPollingUnitCode } from "~/composables/useOgunGeo";

type AgentPollingUnit = PollingUnit & { ingest_token: string };

definePageMeta({ layout: "default" });

const config = useRuntimeConfig();
const apiBase = config.public.apiBase;
const { agent, authHeaders, requireAgent, clear, fetchMe } = useAgentAuth();
const {
  lgas,
  wards,
  pollingUnits,
  loadingLgas,
  loadingWards,
  loadingPollingUnits,
  loadLgas,
  loadWards,
  loadPollingUnits,
} = useOgunGeo();

const units = ref<AgentPollingUnit[]>([]);
const loading = ref(true);
const creating = ref(false);
const createError = ref("");
const newUnit = ref<{ code: string; ingest_token: string } | null>(null);
const editingCode = ref<string | null>(null);
const editCount = ref(0);
const savingEdit = ref(false);

type AgentDataPlan = {
  network: string;
  variation_code: string;
  name: string;
  amount: number;
};

type AgentDataCredit = {
  id: string;
  phone: string;
  network: string;
  plan_name: string;
  amount: number;
  status: string;
  created_at: string;
};

const dataForm = reactive({
  phone: "",
  network: "",
  variation_code: "",
});
const agentDataPlans = ref<AgentDataPlan[]>([]);
const dataCredits = ref<AgentDataCredit[]>([]);
const dataQuota = ref<{
  data_claim_limit: number;
  data_claims_used: number;
  data_claims_remaining: number;
} | null>(null);
const loadingDataPlans = ref(false);
const creditingData = ref(false);
const dataMessage = ref("");
const dataError = ref("");

const form = reactive({
  pu_code: "",
  state: "Ogun State",
  ward: "",
  lga: "",
  device_type: "meta_rayban",
});

const selectedPu = computed(() => pollingUnits.value.find((p) => p.code === form.pu_code) ?? null);

const previewCode = computed(() => {
  if (!form.lga || !form.ward || !form.pu_code) return "";
  return buildPollingUnitCode(form.lga, form.ward, form.pu_code);
});

const locationLocked = computed(() => !!(agent.value?.lga && agent.value?.ward));

onMounted(async () => {
  if (!requireAgent()) return;
  await loadLgas();
  await fetchMe();
  await applyAgentLocation();
  await Promise.all([loadUnits(), loadDataCredits(), loadDataQuota()]);
});

async function loadDataQuota() {
  try {
    dataQuota.value = await $fetch(`${apiBase}/agents/me/data/quota`, {
      headers: authHeaders(),
    });
  } catch {
    dataQuota.value = { data_claim_limit: 1, data_claims_used: 0, data_claims_remaining: 1 };
  }
}

async function onDataNetworkChange() {
  dataForm.variation_code = "";
  dataMessage.value = "";
  dataError.value = "";
  if (!dataForm.network) {
    agentDataPlans.value = [];
    return;
  }
  loadingDataPlans.value = true;
  try {
    agentDataPlans.value = await $fetch<AgentDataPlan[]>(`${apiBase}/agents/me/data/plans`, {
      headers: authHeaders(),
      query: { network: dataForm.network },
    });
  } catch {
    agentDataPlans.value = [];
    dataError.value = "Could not load data plans. Ask admin to enable plans.";
  } finally {
    loadingDataPlans.value = false;
  }
}

async function loadDataCredits() {
  try {
    dataCredits.value = await $fetch<AgentDataCredit[]>(`${apiBase}/agents/me/data/credits`, {
      headers: authHeaders(),
    });
  } catch {
    dataCredits.value = [];
  }
}

async function creditData() {
  dataMessage.value = "";
  dataError.value = "";
  creditingData.value = true;
  try {
    const res = await $fetch<AgentDataCredit>(`${apiBase}/agents/me/data/credit`, {
      method: "POST",
      headers: authHeaders(),
      body: {
        phone: dataForm.phone,
        network: dataForm.network,
        variation_code: dataForm.variation_code,
      },
    });
    dataMessage.value = `Data credited successfully (${res.plan_name}). Status: ${res.status}.`;
    await Promise.all([loadDataCredits(), loadDataQuota()]);
  } catch (err: unknown) {
    const detail = (err as { data?: { detail?: string } })?.data?.detail;
    dataError.value = typeof detail === "string" ? detail : "Failed to credit data.";
    await loadDataQuota();
  } finally {
    creditingData.value = false;
  }
}

async function applyAgentLocation() {
  if (!agent.value?.lga || !agent.value?.ward) return;
  form.lga = agent.value.lga;
  await loadWards(agent.value.lga);
  form.ward = agent.value.ward;
  form.pu_code = "";
  await loadPollingUnits(form.lga, form.ward);
}

async function onLgaChange() {
  if (locationLocked.value) return;
  form.ward = "";
  form.pu_code = "";
  pollingUnits.value = [];
  await loadWards(form.lga);
}

async function onWardChange() {
  form.pu_code = "";
  await loadPollingUnits(form.lga, form.ward);
}

async function loadUnits() {
  loading.value = true;
  try {
    units.value = await $fetch<AgentPollingUnit[]>(`${apiBase}/agents/me/polling-units`, {
      headers: authHeaders(),
    });
  } finally {
    loading.value = false;
  }
}

async function createUnit() {
  if (!selectedPu.value) {
    createError.value = "Select a polling unit.";
    return;
  }
  creating.value = true;
  createError.value = "";
  const code = buildPollingUnitCode(form.lga, form.ward, form.pu_code);
  try {
    const res = await $fetch<PollingUnit & { ingest_token: string }>(`${apiBase}/polling-units`, {
      method: "POST",
      headers: authHeaders(),
      body: {
        name: selectedPu.value.name,
        state: form.state,
        lga: form.lga,
        ward: form.ward,
        code,
        device_type: form.device_type,
      },
    });
    newUnit.value = { code: res.code, ingest_token: res.ingest_token };
    if (import.meta.client) {
      localStorage.setItem(`ingest_token_${res.code}`, res.ingest_token);
    }
    form.pu_code = "";
    if (!locationLocked.value) {
      form.ward = "";
      form.lga = "";
      wards.value = [];
      pollingUnits.value = [];
    } else {
      await loadPollingUnits(form.lga, form.ward);
    }
    await loadUnits();
  } catch (err: unknown) {
    const detail = (err as { data?: { detail?: string } })?.data?.detail;
    createError.value = typeof detail === "string" ? detail : "Failed to create polling unit.";
  } finally {
    creating.value = false;
  }
}

function logout() {
  clear();
  navigateTo("/agent/login");
}

function startEditCount(unit: AgentPollingUnit) {
  editingCode.value = unit.code;
  editCount.value = unit.people_count;
}

async function saveUnitCount(unitCode: string) {
  savingEdit.value = true;
  try {
    await $fetch(`${apiBase}/polling-units/${unitCode}/people-count`, {
      method: "PATCH",
      headers: authHeaders(),
      body: { people_count: editCount.value },
    });
    editingCode.value = null;
    await loadUnits();
  } catch (err: unknown) {
    const status = (err as { statusCode?: number })?.statusCode;
    const detail = (err as { data?: { detail?: string } })?.data?.detail;
    if (status === 404) {
      createError.value = "Update endpoint not found — restart the backend server, then try again.";
    } else if (typeof detail === "string") {
      createError.value = detail;
    } else {
      createError.value = "Failed to update count.";
    }
  } finally {
    savingEdit.value = false;
  }
}
</script>
