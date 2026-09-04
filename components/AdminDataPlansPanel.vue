<script setup lang="ts">
type DataPlan = {
  network: string;
  service_id: string;
  variation_code: string;
  name: string;
  amount: number;
  enabled: boolean;
};

type DataCredit = {
  id: string;
  phone: string;
  network: string;
  plan_name: string;
  variation_code: string;
  amount: number;
  request_id: string;
  status: string;
  created_at: string;
  agent_name?: string | null;
  agent_email?: string | null;
};

const emit = defineEmits<{ (e: "error", msg: string): void; (e: "message", msg: string): void }>();

const { authHeaders, apiBase } = useAdminAuth();

const dataNetworks = [
  { id: "mtn", label: "MTN" },
  { id: "airtel", label: "Airtel" },
  { id: "glo", label: "Glo" },
  { id: "9mobile", label: "9mobile" },
];

const vtpassConfigured = ref(false);
const vtpassBalance = ref<number | null>(null);
const loadingBalance = ref(false);
const dataNetwork = ref("mtn");
const catalogPlans = ref<DataPlan[]>([]);
const enabledPlanKeys = ref<string[]>([]);
const savedPlans = ref<DataPlan[]>([]);
const dataCredits = ref<DataCredit[]>([]);
const loadingCatalog = ref(false);
const savingPlans = ref(false);
const savingSettings = ref(false);
const strictOnce = ref(false);

function planKey(plan: Pick<DataPlan, "network" | "variation_code">) {
  return `${plan.network}::${plan.variation_code}`;
}

function creditStatusClass(status?: string | null) {
  if (status === "delivered" || status === "successful") return "bg-action-green/15 text-action-green";
  if (status === "failed") return "bg-error/15 text-error";
  return "bg-electric-pink/15 text-electric-pink";
}

function formatWhen(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString(undefined, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
}

const enabledCount = computed(() => savedPlans.value.filter((p) => p.enabled).length);

async function loadVtpassBalance() {
  loadingBalance.value = true;
  try {
    const res = await $fetch<{ configured: boolean; balance: number | null }>(`${apiBase}/admin/vtpass/balance`, {
      headers: authHeaders(),
    });
    vtpassConfigured.value = res.configured;
    vtpassBalance.value = res.balance;
  } catch {
    vtpassBalance.value = null;
  } finally {
    loadingBalance.value = false;
  }
}

async function loadSavedPlans() {
  try {
    savedPlans.value = await $fetch<DataPlan[]>(`${apiBase}/admin/data/plans`, { headers: authHeaders() });
    enabledPlanKeys.value = savedPlans.value.filter((p) => p.enabled).map((p) => planKey(p));
  } catch {
    savedPlans.value = [];
  }
}

async function loadCatalog() {
  loadingCatalog.value = true;
  try {
    catalogPlans.value = await $fetch<DataPlan[]>(`${apiBase}/admin/data/catalog/${dataNetwork.value}`, {
      headers: authHeaders(),
    });
    const enabled = new Set(enabledPlanKeys.value);
    for (const p of savedPlans.value) {
      if (p.network === dataNetwork.value && p.enabled) enabled.add(planKey(p));
    }
    enabledPlanKeys.value = [...enabled];
  } catch (err: unknown) {
    const detail = (err as { data?: { detail?: string } })?.data?.detail;
    emit("error", typeof detail === "string" ? detail : "Failed to load VTpass catalog.");
    catalogPlans.value = [];
  } finally {
    loadingCatalog.value = false;
  }
}

async function saveDataPlans() {
  savingPlans.value = true;
  try {
    const otherNetworks = savedPlans.value.filter((p) => p.network !== dataNetwork.value && p.enabled);
    const selected = catalogPlans.value.filter((p) => enabledPlanKeys.value.includes(planKey(p)));
    const plans = [
      ...otherNetworks.map((p) => ({
        network: p.network,
        variation_code: p.variation_code,
        name: p.name,
        amount: p.amount,
        enabled: true,
      })),
      ...selected.map((p) => ({
        network: p.network,
        variation_code: p.variation_code,
        name: p.name,
        amount: p.amount,
        enabled: true,
      })),
    ];
    savedPlans.value = await $fetch<DataPlan[]>(`${apiBase}/admin/data/plans`, {
      method: "PUT",
      headers: authHeaders(),
      body: { plans },
    });
    enabledPlanKeys.value = savedPlans.value.filter((p) => p.enabled).map((p) => planKey(p));
    emit("message", `Saved ${savedPlans.value.length} enabled data plan(s).`);
  } catch (err: unknown) {
    const detail = (err as { data?: { detail?: string } })?.data?.detail;
    emit("error", typeof detail === "string" ? detail : "Failed to save data plans.");
  } finally {
    savingPlans.value = false;
  }
}

async function loadDataCredits() {
  try {
    dataCredits.value = await $fetch<DataCredit[]>(`${apiBase}/admin/data/credits`, { headers: authHeaders() });
  } catch {
    dataCredits.value = [];
  }
}

async function loadSettings() {
  try {
    const s = await $fetch<{ strict_one_data_claim_per_phone?: boolean }>(`${apiBase}/admin/settings`, {
      headers: authHeaders(),
    });
    strictOnce.value = !!s.strict_one_data_claim_per_phone;
  } catch {
    /* ignore */
  }
}

async function saveStrict(checked: boolean) {
  savingSettings.value = true;
  try {
    await $fetch(`${apiBase}/admin/settings`, {
      method: "PATCH",
      headers: authHeaders(),
      body: { strict_one_data_claim_per_phone: checked },
    });
    strictOnce.value = checked;
    emit("message", checked ? "One-claim-per-phone rule active." : "One-claim rule turned off.");
  } catch {
    emit("error", "Failed to save settings.");
  } finally {
    savingSettings.value = false;
  }
}

onMounted(async () => {
  await Promise.all([loadVtpassBalance(), loadSavedPlans(), loadDataCredits(), loadSettings()]);
});
</script>

<template>
  <div class="flex w-full flex-col gap-6 pb-10">
    <section class="flex flex-col gap-4">
      <div class="flex flex-wrap items-center gap-2">
        <span class="font-label-caps text-label-caps uppercase tracking-wider text-outline">HQ Central Command</span>
        <span class="text-outline">/</span>
        <span class="font-label-caps text-label-caps font-bold uppercase tracking-wider text-secondary">
          System · Data Plans
        </span>
      </div>
      <div class="flex flex-col justify-between gap-4 xl:flex-row xl:items-end">
        <div>
          <h1 class="font-headline-md text-2xl font-bold tracking-tight text-primary sm:text-headline-md">
            Agent Data Credit Command
          </h1>
          <p class="mt-1 max-w-2xl text-sm text-on-surface-variant">
            Load VTpass catalogs, enable plans for field agents, and monitor recent data credit settlements.
          </p>
        </div>
        <div class="flex flex-wrap items-center gap-2">
          <span
            class="rounded-full px-3 py-1 font-label-caps text-[11px] font-bold"
            :class="vtpassConfigured ? 'bg-action-green/15 text-action-green' : 'bg-electric-pink/15 text-electric-pink'"
          >
            {{ vtpassConfigured ? "VTpass configured" : "VTpass not configured" }}
          </span>
          <button
            type="button"
            class="inline-flex items-center gap-2 rounded-xl bg-surface-container px-4 py-2.5 text-sm text-on-surface hover:bg-surface-container-high"
            @click="loadVtpassBalance"
          >
            <span class="material-symbols-outlined text-[18px]">account_balance_wallet</span>
            {{
              loadingBalance
                ? "…"
                : vtpassBalance !== null
                  ? `₦${vtpassBalance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                  : "Refresh wallet"
            }}
          </button>
        </div>
      </div>
    </section>

    <section class="grid grid-cols-1 gap-4 sm:grid-cols-3">
      <div class="rounded-2xl bg-surface-container-lowest p-5 shadow-sm">
        <span class="font-label-caps text-xs uppercase text-outline">Enabled plans</span>
        <p class="mt-2 text-3xl font-extrabold text-primary">{{ enabledCount }}</p>
      </div>
      <div class="rounded-2xl bg-surface-container-lowest p-5 shadow-sm">
        <span class="font-label-caps text-xs uppercase text-outline">Catalog in view</span>
        <p class="mt-2 text-3xl font-extrabold text-primary">{{ catalogPlans.length }}</p>
      </div>
      <div class="flex items-center justify-between rounded-2xl bg-surface-container-lowest p-5 shadow-sm">
        <div>
          <span class="font-label-caps text-xs uppercase text-outline">One claim per phone</span>
          <p class="mt-1 text-sm text-on-surface-variant">Strict rule for data credits</p>
        </div>
        <label class="inline-flex cursor-pointer items-center gap-2">
          <input
            type="checkbox"
            class="peer sr-only"
            :checked="strictOnce"
            :disabled="savingSettings"
            @change="saveStrict(($event.target as HTMLInputElement).checked)"
          />
          <span
            class="relative h-6 w-11 rounded-full bg-surface-container-high transition peer-checked:bg-action-green after:absolute after:left-0.5 after:top-0.5 after:h-5 after:w-5 after:rounded-full after:bg-pure-white after:transition peer-checked:after:translate-x-5"
          />
        </label>
      </div>
    </section>

    <section class="rounded-2xl bg-surface-container-lowest p-6 shadow-sm">
      <div class="flex flex-wrap items-end gap-3">
        <label class="min-w-[140px]">
          <span class="font-label-caps text-[11px] uppercase text-outline">Network</span>
          <select
            v-model="dataNetwork"
            class="mt-1 w-full rounded-xl bg-off-white px-3 py-2.5 text-sm outline-none"
            @change="loadCatalog"
          >
            <option v-for="n in dataNetworks" :key="n.id" :value="n.id">{{ n.label }}</option>
          </select>
        </label>
        <button
          type="button"
          class="rounded-xl bg-deep-navy px-4 py-2.5 text-sm font-semibold text-pure-white disabled:opacity-50"
          :disabled="loadingCatalog || !vtpassConfigured"
          @click="loadCatalog"
        >
          {{ loadingCatalog ? "Loading…" : "Load VTpass plans" }}
        </button>
        <button
          type="button"
          class="rounded-xl bg-electric-pink px-4 py-2.5 text-sm font-semibold text-pure-white disabled:opacity-50"
          :disabled="savingPlans"
          @click="saveDataPlans"
        >
          {{ savingPlans ? "Saving…" : "Save enabled plans" }}
        </button>
      </div>
    </section>

    <section class="overflow-hidden rounded-2xl bg-surface-container-lowest shadow-sm">
      <div class="border-b border-outline-variant/30 px-5 py-4">
        <h2 class="font-headline-md text-lg font-bold text-primary">
          {{ dataNetwork.toUpperCase() }} plans
        </h2>
        <p class="text-xs text-outline">Tick to enable for agents</p>
      </div>
      <div v-if="loadingCatalog" class="p-10 text-center text-sm text-outline">Loading catalog…</div>
      <div v-else-if="!catalogPlans.length" class="p-10 text-center text-sm text-outline">
        Load plans from VTpass for this network.
      </div>
      <ul v-else class="max-h-[28rem] divide-y divide-outline-variant/20 overflow-y-auto">
        <li v-for="plan in catalogPlans" :key="plan.variation_code" class="flex items-center gap-3 px-5 py-3">
          <input
            :id="`plan-${plan.variation_code}`"
            v-model="enabledPlanKeys"
            type="checkbox"
            class="h-4 w-4 rounded border-outline-variant"
            :value="planKey(plan)"
          />
          <label :for="`plan-${plan.variation_code}`" class="min-w-0 flex-1 cursor-pointer">
            <p class="text-sm font-medium text-on-surface">{{ plan.name }}</p>
            <p class="font-label-caps text-[11px] text-outline">
              {{ plan.variation_code }} · ₦{{ plan.amount.toLocaleString() }}
            </p>
          </label>
        </li>
      </ul>
    </section>

    <section class="overflow-hidden rounded-2xl bg-surface-container-lowest shadow-sm">
      <div class="flex items-center justify-between border-b border-outline-variant/30 px-5 py-4">
        <div>
          <h2 class="font-headline-md text-lg font-bold text-primary">Recent credits</h2>
          <p class="text-xs text-outline">Agent data settlements</p>
        </div>
        <button type="button" class="text-xs font-semibold text-electric-pink hover:underline" @click="loadDataCredits">
          Refresh
        </button>
      </div>
      <div v-if="!dataCredits.length" class="p-8 text-center text-sm text-outline">No credits yet.</div>
      <div v-else class="overflow-x-auto">
        <table class="w-full text-left text-sm">
          <thead>
            <tr class="bg-surface-container-low font-label-caps text-[11px] uppercase text-on-surface-variant">
              <th class="px-4 py-3">Agent</th>
              <th class="px-4 py-3">Phone</th>
              <th class="px-4 py-3">Plan</th>
              <th class="px-4 py-3">Status</th>
              <th class="px-4 py-3">When</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="credit in dataCredits" :key="credit.id" class="hover:bg-surface-container-low/50">
              <td class="px-4 py-3">
                <p class="text-on-surface">{{ credit.agent_name || "—" }}</p>
                <p class="text-xs text-outline">{{ credit.agent_email || "—" }}</p>
              </td>
              <td class="px-4 py-3 text-on-surface-variant">{{ credit.phone || "—" }} · {{ credit.network || "—" }}</td>
              <td class="px-4 py-3">
                <p class="text-on-surface">{{ credit.plan_name || "—" }}</p>
                <p class="text-xs text-outline">₦{{ (credit.amount ?? 0).toLocaleString() }}</p>
              </td>
              <td class="px-4 py-3">
                <span class="rounded-full px-2 py-0.5 text-xs font-semibold" :class="creditStatusClass(credit.status)">
                  {{ credit.status || "unknown" }}
                </span>
              </td>
              <td class="px-4 py-3 text-xs text-outline">{{ formatWhen(credit.created_at) }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>
  </div>
</template>
