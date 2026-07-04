<template>
  <div class="mx-auto max-w-5xl space-y-6 p-4 sm:p-6">
    <header class="flex flex-wrap items-start justify-between gap-4">
      <div class="flex items-center gap-4">
        <BrandLogos size="sm" :show-divider="false" />
        <div>
          <h1 class="text-xl font-semibold text-ui-text">Agent dashboard</h1>
          <p v-if="agent" class="mt-1 text-sm text-ui-muted">{{ agent.name }}</p>
          <span
            v-if="agent?.lga && agent?.ward"
            class="mt-2 inline-flex items-center rounded-full bg-emerald-500/15 px-2.5 py-0.5 text-xs font-medium text-emerald-700 dark:text-emerald-300"
          >
            {{ agent.ward }} · {{ agent.lga }}
          </span>
          <span
            v-else-if="agent"
            class="mt-2 inline-flex items-center rounded-full bg-amber-500/15 px-2.5 py-0.5 text-xs font-medium text-amber-700 dark:text-amber-300"
          >
            No LGA/ward assigned — contact admin
          </span>
        </div>
      </div>
      <button
        type="button"
        class="rounded-lg border border-ui-border/50 px-3 py-1.5 text-sm text-ui-muted transition hover:bg-ui-muted/10 hover:text-ui-text"
        @click="logout"
      >
        Sign out
      </button>
    </header>

    <section class="grid grid-cols-2 gap-3 sm:grid-cols-4">
      <div
        v-for="stat in dashboardStats"
        :key="stat.label"
        class="ui-card p-4"
      >
        <p class="text-[10px] font-semibold uppercase tracking-wider text-ui-muted sm:text-xs">
          {{ stat.label }}
        </p>
        <p class="mt-1 text-2xl font-bold" :class="stat.valueClass">
          {{ stat.value }}
        </p>
        <p v-if="stat.hint" class="mt-0.5 text-[10px] text-ui-muted sm:text-xs">{{ stat.hint }}</p>
      </div>
    </section>

    <nav class="flex flex-wrap gap-2 border-b border-ui-border/40 pb-3">
      <button
        v-for="tab in tabsWithBadges"
        :key="tab.id"
        type="button"
        class="rounded-lg px-3 py-1.5 text-sm transition"
        :class="activeTab === tab.id
          ? 'bg-sky-600 text-white'
          : 'text-ui-muted hover:bg-ui-muted/10 hover:text-ui-text'"
        @click="activeTab = tab.id"
      >
        {{ tab.label }}
        <span
          v-if="tab.badge"
          class="ml-1.5 rounded-full px-1.5 py-0.5 text-[10px] font-semibold"
          :class="activeTab === tab.id ? 'bg-white/20' : 'bg-ui-muted/15'"
        >
          {{ tab.badge }}
        </span>
      </button>
    </nav>

    <!-- Units -->
    <section v-if="activeTab === 'units'" class="space-y-4">
      <div class="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 class="font-semibold text-ui-text">Your polling units</h2>
          <p class="text-xs text-ui-muted">Stream live feeds and manage people counts.</p>
        </div>
        <button
          type="button"
          class="rounded-lg border border-ui-border/50 px-3 py-1.5 text-xs hover:bg-ui-muted/10"
          :disabled="loading"
          @click="loadUnits"
        >
          Refresh
        </button>
      </div>

      <div v-if="loading" class="ui-card p-10 text-center text-sm text-ui-muted">Loading units…</div>

      <div
        v-else-if="!units.length"
        class="ui-card flex flex-col items-center gap-4 p-10 text-center"
      >
        <div class="flex h-14 w-14 items-center justify-center rounded-2xl bg-sky-500/10 text-2xl">📍</div>
        <div>
          <p class="font-medium text-ui-text">No polling units yet</p>
          <p class="mt-1 text-sm text-ui-muted">Register your first unit to start streaming.</p>
        </div>
        <button
          type="button"
          class="rounded-lg bg-emerald-600 px-4 py-2 text-sm text-white hover:bg-emerald-500"
          @click="activeTab = 'register'"
        >
          Register polling unit
        </button>
      </div>

      <div v-else class="grid gap-4 sm:grid-cols-2">
        <article
          v-for="unit in units"
          :key="unit.id"
          class="ui-card overflow-hidden"
        >
          <div class="border-b border-ui-border/40 px-4 py-3 flex items-center justify-between gap-2">
            <span
              class="rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide"
              :class="unit.stream_status === 'live'
                ? 'bg-red-500/15 text-red-600 dark:text-red-400'
                : 'bg-ui-elevated text-ui-muted'"
            >
              {{ unit.stream_status === 'live' ? '● Live' : 'Offline' }}
            </span>
            <span class="truncate text-[10px] font-mono text-ui-muted">{{ unit.code }}</span>
          </div>

          <div class="p-4">
            <h3 class="font-semibold text-ui-text">{{ unit.name }}</h3>
            <p class="mt-1 text-xs text-ui-muted">
              {{ unit.ward }} · {{ unit.lga }}
            </p>

            <dl class="mt-4 grid grid-cols-2 gap-3">
              <div class="rounded-lg bg-ui-elevated/50 px-3 py-2">
                <dt class="text-[10px] uppercase tracking-wider text-ui-muted">People</dt>
                <dd class="text-xl font-bold text-emerald-600 dark:text-emerald-400">
                  {{ unit.people_count }}
                </dd>
              </div>
              <div class="rounded-lg bg-ui-elevated/50 px-3 py-2">
                <dt class="text-[10px] uppercase tracking-wider text-ui-muted">Peak</dt>
                <dd class="text-xl font-bold text-ui-text">{{ unit.peak_people_count }}</dd>
              </div>
            </dl>

            <div class="mt-4 flex flex-wrap gap-2">
              <NuxtLink
                :to="`/relay/${unit.code}`"
                class="inline-flex flex-1 items-center justify-center rounded-lg bg-sky-600 px-3 py-2 text-sm font-medium text-white hover:bg-sky-500"
              >
                {{ unit.stream_status === 'live' ? 'Open stream' : 'Start stream' }}
              </NuxtLink>
              <button
                type="button"
                class="rounded-lg border border-ui-border/50 px-3 py-2 text-xs hover:bg-ui-muted/10"
                @click="toggleToken(unit.code)"
              >
                {{ visibleTokens.has(unit.code) ? 'Hide token' : 'Show token' }}
              </button>
            </div>

            <p
              v-if="visibleTokens.has(unit.code)"
              class="mt-3 break-all rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 font-mono text-[10px] text-amber-800 dark:text-amber-200"
            >
              {{ unit.ingest_token }}
            </p>

            <div
              v-if="editingCode === unit.code"
              class="mt-3 flex flex-wrap items-end gap-2 rounded-lg border border-ui-border/40 bg-ui-elevated/30 p-3"
            >
              <label class="min-w-[100px] flex-1">
                <span class="text-xs text-ui-muted">Correct count</span>
                <input
                  v-model.number="editCount"
                  type="number"
                  min="0"
                  class="ui-input mt-1"
                />
              </label>
              <button
                type="button"
                class="rounded-lg bg-emerald-600 px-3 py-2 text-xs text-white hover:bg-emerald-500 disabled:opacity-50"
                :disabled="savingEdit"
                @click="saveUnitCount(unit.code)"
              >
                {{ savingEdit ? 'Saving…' : 'Save' }}
              </button>
              <button
                type="button"
                class="rounded-lg px-3 py-2 text-xs text-ui-muted hover:text-ui-text"
                @click="editingCode = null"
              >
                Cancel
              </button>
            </div>
            <button
              v-else
              type="button"
              class="mt-3 text-xs text-ui-muted hover:text-emerald-600 dark:hover:text-emerald-400"
              @click="startEditCount(unit)"
            >
              Correct unique people count
            </button>
          </div>
        </article>
      </div>
    </section>

    <!-- Register -->
    <section v-else-if="activeTab === 'register'" class="ui-card overflow-hidden">
      <div class="border-b border-ui-border/40 px-5 py-4">
        <h2 class="font-semibold text-ui-text">Register polling unit</h2>
        <p class="mt-1 text-xs text-ui-muted">
          <template v-if="agent?.lga && agent?.ward">
            Select a unit in your assigned area: {{ agent.ward }}, {{ agent.lga }}.
          </template>
          <template v-else>
            Select LGA, ward, then polling unit — no typing required.
          </template>
        </p>
      </div>

      <form class="space-y-4 p-5" @submit.prevent="createUnit">
        <div class="grid gap-4 sm:grid-cols-2">
          <label class="block sm:col-span-2">
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
              <option value="" disabled>{{ loadingLgas ? 'Loading LGAs…' : 'Select LGA' }}</option>
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
                {{ !form.lga ? 'Select LGA first' : loadingWards ? 'Loading wards…' : 'Select ward' }}
              </option>
              <option v-for="ward in wards" :key="ward" :value="ward">{{ ward }}</option>
            </select>
          </label>

          <label class="block sm:col-span-2">
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
                    ? 'Select ward first'
                    : loadingPollingUnits
                      ? 'Loading polling units…'
                      : 'Select polling unit'
                }}
              </option>
              <option v-for="pu in pollingUnits" :key="pu.code" :value="pu.code">
                {{ pu.code }} — {{ pu.name }}
              </option>
            </select>
          </label>

          <label class="block">
            <span class="text-xs text-ui-muted">Device</span>
            <select v-model="form.device_type" class="ui-input mt-1">
              <option value="meta_rayban">Meta Ray-Ban AI Glasses</option>
              <option value="phone_camera">Phone camera (testing)</option>
            </select>
          </label>

          <div v-if="previewCode" class="flex items-end">
            <div class="rounded-lg border border-ui-border/40 bg-ui-elevated/30 px-3 py-2">
              <p class="text-[10px] uppercase tracking-wider text-ui-muted">Unit code</p>
              <p class="font-mono text-sm font-medium text-ui-text">{{ previewCode }}</p>
            </div>
          </div>
        </div>

        <button
          type="submit"
          class="rounded-lg bg-emerald-600 px-4 py-2 text-sm text-white hover:bg-emerald-500 disabled:opacity-50"
          :disabled="creating || !form.lga || !form.ward || !form.pu_code"
        >
          {{ creating ? 'Creating…' : 'Register polling unit' }}
        </button>
        <p v-if="createError" class="text-sm text-red-500">{{ createError }}</p>
      </form>

      <div
        v-if="newUnit"
        class="mx-5 mb-5 rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 text-sm"
      >
        <p class="font-medium text-amber-800 dark:text-amber-200">Save your ingest token — shown once</p>
        <p class="mt-2 break-all font-mono text-xs text-amber-900 dark:text-amber-100">
          {{ newUnit.ingest_token }}
        </p>
        <NuxtLink
          :to="`/relay/${newUnit.code}?token=${newUnit.ingest_token}`"
          class="mt-3 inline-flex rounded-lg bg-sky-600 px-4 py-2 text-sm text-white hover:bg-sky-500"
        >
          Start streaming →
        </NuxtLink>
      </div>
    </section>

    <!-- Data credit -->
    <section v-else-if="activeTab === 'data'" class="space-y-4">
      <div class="grid gap-4 sm:grid-cols-3">
        <div class="ui-card p-4 sm:col-span-1">
          <p class="text-xs uppercase tracking-wider text-ui-muted">Claim allowance</p>
          <template v-if="dataQuota">
            <p class="mt-2 text-3xl font-bold text-violet-600 dark:text-violet-400">
              {{ dataQuota.data_claims_remaining }}
            </p>
            <p class="mt-1 text-xs text-ui-muted">
              remaining · used {{ dataQuota.data_claims_used }} of {{ dataQuota.data_claim_limit }}
            </p>
          </template>
          <p v-else class="mt-2 text-sm text-ui-muted">Loading…</p>
        </div>

        <div class="ui-card overflow-hidden sm:col-span-2">
          <div class="border-b border-ui-border/40 px-5 py-4">
            <h2 class="font-semibold text-ui-text">Claim data credit</h2>
            <p class="mt-1 text-xs text-ui-muted">
              Enter your phone and network. Only admin-enabled plans are available.
            </p>
          </div>

          <form class="space-y-4 p-5" @submit.prevent="creditData">
            <div class="grid gap-4 sm:grid-cols-2">
              <label class="block sm:col-span-2">
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
                <select
                  v-model="dataForm.network"
                  required
                  class="ui-input mt-1"
                  @change="onDataNetworkChange"
                >
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
                        ? 'Select network first'
                        : loadingDataPlans
                          ? 'Loading plans…'
                          : agentDataPlans.length
                            ? 'Select plan'
                            : 'No plans enabled'
                    }}
                  </option>
                  <option
                    v-for="plan in agentDataPlans"
                    :key="plan.variation_code"
                    :value="plan.variation_code"
                  >
                    {{ plan.name }} — ₦{{ plan.amount.toLocaleString() }}
                  </option>
                </select>
              </label>
            </div>

            <button
              type="submit"
              class="rounded-lg bg-violet-600 px-4 py-2 text-sm text-white hover:bg-violet-500 disabled:opacity-50"
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
                  ? 'No claims left'
                  : creditingData
                    ? 'Crediting…'
                    : 'Credit data'
              }}
            </button>
            <p v-if="dataMessage" class="text-sm text-emerald-600 dark:text-emerald-400">{{ dataMessage }}</p>
            <p v-if="dataError" class="text-sm text-red-500">{{ dataError }}</p>
          </form>
        </div>
      </div>

      <div class="ui-card overflow-hidden">
        <div class="border-b border-ui-border/40 px-5 py-3">
          <h3 class="text-sm font-semibold text-ui-text">Credit history</h3>
        </div>
        <div v-if="!dataCredits.length" class="p-8 text-center text-sm text-ui-muted">
          No data credits claimed yet.
        </div>
        <ul v-else class="divide-y divide-ui-border/30">
          <li
            v-for="credit in dataCredits"
            :key="credit.id"
            class="flex flex-wrap items-center justify-between gap-3 px-5 py-3"
          >
            <div>
              <p class="text-sm font-medium text-ui-text">{{ credit.plan_name }}</p>
              <p class="text-xs text-ui-muted">
                {{ credit.phone }} · {{ credit.network }} · ₦{{ credit.amount.toLocaleString() }}
              </p>
              <p class="mt-0.5 text-[10px] text-ui-muted">{{ formatWhen(credit.created_at) }}</p>
            </div>
            <span
              class="rounded-full px-2 py-0.5 text-xs font-semibold"
              :class="creditStatusClass(credit.status)"
            >
              {{ credit.status || 'unknown' }}
            </span>
          </li>
        </ul>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import type { PollingUnit } from "~/composables/useVideoFeeds";

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

const tabs = [
  { id: "units", label: "My units" },
  { id: "register", label: "Register" },
  { id: "data", label: "Data credit" },
] as const;

type TabId = (typeof tabs)[number]["id"];

const activeTab = ref<TabId>("units");
const visibleTokens = ref(new Set<string>());

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

const previewCode = computed(() => form.pu_code || "");

const locationLocked = computed(() => !!(agent.value?.lga && agent.value?.ward));

const liveUnitCount = computed(() => units.value.filter((u) => u.stream_status === "live").length);

const totalPeopleCount = computed(() =>
  units.value.reduce((sum, u) => sum + (u.people_count ?? 0), 0),
);

const dashboardStats = computed(() => [
  {
    label: "Polling units",
    value: loading.value ? "—" : units.value.length,
    valueClass: "text-ui-text",
    hint: null,
  },
  {
    label: "Live now",
    value: loading.value ? "—" : liveUnitCount.value,
    valueClass: liveUnitCount.value > 0 ? "text-red-600 dark:text-red-400" : "text-ui-text",
    hint: liveUnitCount.value > 0 ? "Streaming" : null,
  },
  {
    label: "People counted",
    value: loading.value ? "—" : totalPeopleCount.value,
    valueClass: "text-emerald-600 dark:text-emerald-400",
    hint: "Unique total",
  },
  {
    label: "Data claims",
    value: dataQuota.value?.data_claims_remaining ?? "—",
    valueClass: "text-violet-600 dark:text-violet-400",
    hint: dataQuota.value
      ? `${dataQuota.value.data_claims_used}/${dataQuota.value.data_claim_limit} used`
      : null,
  },
]);

const tabsWithBadges = computed(() =>
  tabs.map((tab) => {
    if (tab.id === "units") return { ...tab, badge: units.value.length || undefined };
    if (tab.id === "data") return { ...tab, badge: dataCredits.value.length || undefined };
    return { ...tab, badge: undefined as number | undefined };
  }),
);

function formatWhen(iso: string) {
  try {
    return new Date(iso).toLocaleString();
  } catch {
    return iso;
  }
}

function creditStatusClass(status?: string | null) {
  if (status === "delivered" || status === "successful") {
    return "bg-emerald-500/15 text-emerald-600";
  }
  if (status === "failed") {
    return "bg-red-500/15 text-red-600";
  }
  return "bg-amber-500/15 text-amber-600";
}

function toggleToken(code: string) {
  const next = new Set(visibleTokens.value);
  if (next.has(code)) next.delete(code);
  else next.add(code);
  visibleTokens.value = next;
}

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
  const code = form.pu_code.toLowerCase();
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
    activeTab.value = "units";
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
