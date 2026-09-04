<script setup lang="ts">
import {
  formatNaira,
  useDisbursements,
  type Beneficiary,
  type CentralDisbursementDashboard,
  type PaymentProviders,
} from "~/composables/useDisbursements";

const emit = defineEmits<{ (e: "error", msg: string): void; (e: "message", msg: string): void }>();

const { isSuperAdmin } = useAdminAuth();

const {
  loadCentral,
  loadBeneficiaries,
  verifyBeneficiary,
  approveSchedule,
  lockBeneficiary,
  loadPaymentProviders,
  savePaymentProviders,
} = useDisbursements();

type SubTab = "overview" | "beneficiaries" | "payments" | "clusters" | "audit" | "credentials";

const loading = ref(true);
const dashboard = ref<CentralDisbursementDashboard | null>(null);
const beneficiaries = ref<Beneficiary[]>([]);
const providers = ref<PaymentProviders | null>(null);
const subTab = ref<SubTab>("overview");
const busyId = ref<string | null>(null);
const savingProviders = ref(false);

const paystackSecret = ref("");
const paystackWebhook = ref("");
const alatKey = ref("");
const alatSecret = ref("");
const alatBaseUrl = ref("");
const paystackPreferred = ref(true);
const alatPreferred = ref(false);

const subTabs = computed(() => {
  const tabs = [
    { id: "overview" as const, label: "Overview" },
    { id: "beneficiaries" as const, label: "Beneficiaries" },
    { id: "payments" as const, label: "Payments" },
    { id: "clusters" as const, label: "Cluster reports" },
    { id: "audit" as const, label: "Audit trail" },
  ];
  if (isSuperAdmin.value) {
    tabs.push({ id: "credentials", label: "Payment providers" });
  }
  return tabs;
});

async function loadProviders() {
  if (!isSuperAdmin.value) return;
  try {
    providers.value = await loadPaymentProviders();
    paystackPreferred.value = providers.value.paystack_preferred;
    alatPreferred.value = providers.value.alat_preferred;
    alatBaseUrl.value = providers.value.alat_base_url ?? "";
  } catch {
    // super admin only — ignore for state admin
  }
}

async function refresh() {
  loading.value = true;
  try {
    dashboard.value = await loadCentral();
    beneficiaries.value = await loadBeneficiaries();
    await loadProviders();
  } catch {
    emit("error", "Failed to load disbursement central dashboard.");
  } finally {
    loading.value = false;
  }
}

async function saveProviders() {
  savingProviders.value = true;
  try {
    const patch: Record<string, string | boolean> = {
      paystack_preferred: paystackPreferred.value,
      alat_preferred: alatPreferred.value,
    };
    if (paystackSecret.value.trim()) patch.paystack_secret_key = paystackSecret.value.trim();
    if (paystackWebhook.value.trim()) patch.paystack_webhook_secret = paystackWebhook.value.trim();
    if (alatKey.value.trim()) patch.alat_api_key = alatKey.value.trim();
    if (alatSecret.value.trim()) patch.alat_api_secret = alatSecret.value.trim();
    if (alatBaseUrl.value.trim()) patch.alat_base_url = alatBaseUrl.value.trim();
    providers.value = await savePaymentProviders(patch);
    paystackSecret.value = "";
    paystackWebhook.value = "";
    alatKey.value = "";
    alatSecret.value = "";
    emit("message", "Payment provider credentials saved.");
    await refresh();
  } catch (e: unknown) {
    emit("error", e instanceof Error ? e.message : "Failed to save credentials.");
  } finally {
    savingProviders.value = false;
  }
}

async function verify(id: string) {
  busyId.value = id;
  try {
    await verifyBeneficiary(id);
    emit("message", "Beneficiary verified.");
    await refresh();
  } catch (e: unknown) {
    emit("error", e instanceof Error ? e.message : "Verification failed.");
  } finally {
    busyId.value = null;
  }
}

async function approve(id: string) {
  busyId.value = id;
  try {
    await approveSchedule(id);
    emit("message", "Disbursement schedule approved.");
    await refresh();
  } catch (e: unknown) {
    emit("error", e instanceof Error ? e.message : "Approval failed.");
  } finally {
    busyId.value = null;
  }
}

async function lock(id: string) {
  busyId.value = id;
  try {
    await lockBeneficiary(id);
    emit("message", "Record locked — agents may view and authorize payment only.");
    await refresh();
  } catch (e: unknown) {
    emit("error", e instanceof Error ? e.message : "Lock failed.");
  } finally {
    busyId.value = null;
  }
}

onMounted(() => void refresh());

const stats = computed(() => {
  const d = dashboard.value;
  if (!d) return [];
  return [
    { label: "Cluster capacity", value: d.cluster_capacity.toLocaleString(), hint: `${d.total_clusters} active` },
    { label: "Beneficiaries", value: d.total_beneficiaries.toLocaleString(), hint: `${d.verified_beneficiaries} verified` },
    { label: "Approved assistance", value: formatNaira(d.total_approved_assistance) },
    { label: "Disbursed", value: formatNaira(d.total_disbursed) },
    { label: "Clusters completed", value: d.clusters_completed.toLocaleString(), hint: `${d.clusters_pending} pending` },
    { label: "Successful txns", value: d.successful_transactions.toLocaleString() },
    { label: "Pending txns", value: d.pending_transactions.toLocaleString() },
    { label: "Failed txns", value: d.failed_transactions.toLocaleString() },
  ];
});

const providerLabel = computed(() => {
  const p = dashboard.value?.providers;
  if (!p) return "—";
  if (p.paystack) return "Paystack";
  if (p.alat) return "ALAT by Wema";
  return "Simulated (configure Paystack / ALAT keys)";
});
</script>

<template>
  <div class="space-y-4">
    <div class="flex flex-wrap items-center justify-between gap-3">
      <div>
        <h2 class="text-lg font-semibold text-ui-text">Central disbursement monitoring</h2>
        <p class="text-xs text-ui-muted">
          Verify beneficiaries, approve schedules, lock records, and monitor payments across all clusters.
          Provider: <span class="font-medium text-ui-text">{{ providerLabel }}</span>
        </p>
      </div>
      <button type="button" class="ui-btn-secondary text-sm" :disabled="loading" @click="refresh">Refresh</button>
    </div>

    <div v-if="loading && !dashboard" class="ui-card p-8 text-center text-sm text-ui-muted">Loading central dashboard…</div>

    <template v-else-if="dashboard">
      <div class="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <div v-for="stat in stats" :key="stat.label" class="ui-card p-4">
          <p class="text-[10px] uppercase tracking-wider text-ui-muted">{{ stat.label }}</p>
          <p class="mt-1 text-xl font-bold text-ui-text">{{ stat.value }}</p>
          <p v-if="stat.hint" class="mt-0.5 text-xs text-ui-muted">{{ stat.hint }}</p>
        </div>
      </div>

      <div v-if="dashboard.alerts.length" class="ui-card border-amber-500/30 bg-amber-500/5 p-4">
        <p class="text-sm font-semibold text-amber-700 dark:text-amber-300">Alerts</p>
        <ul class="mt-2 space-y-1 text-sm">
          <li v-for="alert in dashboard.alerts.slice(0, 5)" :key="alert.id" class="text-ui-muted">
            <span class="font-medium text-ui-text">{{ alert.severity }}:</span> {{ alert.message }}
          </li>
        </ul>
      </div>

      <nav class="flex flex-wrap gap-2">
        <button
          v-for="tab in subTabs"
          :key="tab.id"
          type="button"
          class="rounded-lg px-3 py-1.5 text-xs font-medium transition"
          :class="subTab === tab.id ? 'bg-violet-600 text-white' : 'border border-ui-border/50 text-ui-muted'"
          @click="subTab = tab.id"
        >
          {{ tab.label }}
        </button>
      </nav>

      <section v-if="subTab === 'beneficiaries'" class="ui-card overflow-hidden">
        <div class="border-b border-ui-border/40 px-5 py-4">
          <h3 class="font-semibold text-ui-text">Beneficiary records</h3>
          <p class="text-xs text-ui-muted">Verify → approve schedule → lock before agents can pay.</p>
        </div>
        <div class="overflow-x-auto">
          <table class="w-full text-left text-sm">
            <thead>
              <tr class="border-b border-ui-border/30 text-xs uppercase text-ui-muted">
                <th class="px-4 py-3">Name</th>
                <th class="px-4 py-3">Cluster</th>
                <th class="px-4 py-3">Amount</th>
                <th class="px-4 py-3">Verification</th>
                <th class="px-4 py-3">Schedule</th>
                <th class="px-4 py-3">Payment</th>
                <th class="px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-ui-border/30">
              <tr v-for="b in beneficiaries" :key="b.id">
                <td class="px-4 py-3">
                  <p class="font-medium text-ui-text">{{ b.name }}</p>
                  <p class="text-xs text-ui-muted">{{ b.reference_code }}</p>
                </td>
                <td class="px-4 py-3 text-ui-muted">{{ b.cluster_name ?? "—" }}</td>
                <td class="px-4 py-3 font-medium">{{ formatNaira(b.approved_amount) }}</td>
                <td class="px-4 py-3 capitalize">{{ b.verification_status }}</td>
                <td class="px-4 py-3 capitalize">{{ b.schedule_status }}{{ b.is_locked ? " 🔒" : "" }}</td>
                <td class="px-4 py-3 capitalize">{{ b.payment_status }}</td>
                <td class="px-4 py-3">
                  <div class="flex flex-wrap gap-1">
                    <button
                      v-if="b.verification_status !== 'verified'"
                      type="button"
                      class="rounded bg-emerald-600/90 px-2 py-1 text-xs text-white disabled:opacity-50"
                      :disabled="busyId === b.id"
                      @click="verify(b.id)"
                    >
                      Verify
                    </button>
                    <button
                      v-if="b.verification_status === 'verified' && b.schedule_status === 'draft'"
                      type="button"
                      class="rounded bg-violet-600 px-2 py-1 text-xs text-white disabled:opacity-50"
                      :disabled="busyId === b.id"
                      @click="approve(b.id)"
                    >
                      Approve
                    </button>
                    <button
                      v-if="b.schedule_status === 'approved' && !b.is_locked"
                      type="button"
                      class="rounded bg-slate-700 px-2 py-1 text-xs text-white disabled:opacity-50"
                      :disabled="busyId === b.id"
                      @click="lock(b.id)"
                    >
                      Lock
                    </button>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <section v-else-if="subTab === 'payments'" class="ui-card overflow-hidden">
        <div class="border-b border-ui-border/40 px-5 py-4">
          <h3 class="font-semibold text-ui-text">Payment authorization ledger</h3>
        </div>
        <div class="overflow-x-auto">
          <table class="w-full text-left text-sm">
            <thead>
              <tr class="border-b border-ui-border/30 text-xs uppercase text-ui-muted">
                <th class="px-4 py-3">Ref</th>
                <th class="px-4 py-3">Beneficiary</th>
                <th class="px-4 py-3">Agent</th>
                <th class="px-4 py-3">Cluster</th>
                <th class="px-4 py-3">Amount</th>
                <th class="px-4 py-3">Status</th>
                <th class="px-4 py-3">Provider</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-ui-border/30">
              <tr v-for="p in dashboard.recent_payments" :key="p.id">
                <td class="px-4 py-3 font-mono text-xs">{{ p.transaction_ref }}</td>
                <td class="px-4 py-3">{{ p.beneficiary_name }}</td>
                <td class="px-4 py-3">{{ p.agent_name }}</td>
                <td class="px-4 py-3 text-ui-muted">{{ p.cluster_name ?? "—" }}</td>
                <td class="px-4 py-3 font-medium">{{ formatNaira(p.amount) }}</td>
                <td class="px-4 py-3 capitalize">{{ p.status }}</td>
                <td class="px-4 py-3 text-xs text-ui-muted">{{ p.provider ?? "—" }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <section v-else-if="subTab === 'clusters'" class="ui-card overflow-hidden">
        <div class="border-b border-ui-border/40 px-5 py-4">
          <h3 class="font-semibold text-ui-text">Cluster-by-cluster reports</h3>
        </div>
        <div class="overflow-x-auto">
          <table class="w-full text-left text-sm">
            <thead>
              <tr class="border-b border-ui-border/30 text-xs uppercase text-ui-muted">
                <th class="px-4 py-3">Cluster</th>
                <th class="px-4 py-3">State</th>
                <th class="px-4 py-3">Beneficiaries</th>
                <th class="px-4 py-3">Approved</th>
                <th class="px-4 py-3">Disbursed</th>
                <th class="px-4 py-3">Pending</th>
                <th class="px-4 py-3">Status</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-ui-border/30">
              <tr v-for="c in dashboard.cluster_reports" :key="c.cluster_id">
                <td class="px-4 py-3">
                  <p class="font-medium text-ui-text">{{ c.cluster_name }}</p>
                  <p class="text-xs text-ui-muted">{{ c.cluster_code }}</p>
                </td>
                <td class="px-4 py-3 text-ui-muted">{{ c.state ?? "—" }}</td>
                <td class="px-4 py-3">{{ c.total_beneficiaries }} / {{ c.verified_beneficiaries }} verified</td>
                <td class="px-4 py-3">{{ formatNaira(c.approved_amount) }}</td>
                <td class="px-4 py-3">{{ formatNaira(c.disbursed_amount) }}</td>
                <td class="px-4 py-3">{{ formatNaira(c.pending_amount) }}</td>
                <td class="px-4 py-3">
                  <span
                    class="rounded-full px-2 py-0.5 text-xs font-semibold"
                    :class="c.completed ? 'bg-emerald-500/15 text-emerald-600' : 'bg-amber-500/15 text-amber-700'"
                  >
                    {{ c.completed ? "Complete" : "In progress" }}
                  </span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <section v-else-if="subTab === 'audit'" class="ui-card overflow-hidden">
        <div class="border-b border-ui-border/40 px-5 py-4">
          <h3 class="font-semibold text-ui-text">Audit trail</h3>
          <p class="text-xs text-ui-muted">Every verification, approval, lock, and payment authorization is recorded.</p>
        </div>
        <div class="divide-y divide-ui-border/30">
          <div v-for="a in dashboard.recent_audit" :key="a.id" class="flex flex-wrap items-start justify-between gap-2 px-5 py-3 text-sm">
            <div>
              <p class="font-medium text-ui-text">{{ a.action.replace(/_/g, " ") }}</p>
              <p class="text-xs text-ui-muted">{{ a.actor_type }} · {{ a.actor_name }}</p>
            </div>
            <div class="text-right text-xs text-ui-muted">
              <p v-if="a.amount">{{ formatNaira(a.amount) }}</p>
              <p>{{ new Date(a.created_at).toLocaleString() }}</p>
            </div>
          </div>
        </div>
      </section>

      <section v-else-if="subTab === 'credentials' && isSuperAdmin" class="ui-card p-5 space-y-6">
        <div>
          <h3 class="font-semibold text-ui-text">Paystack & ALAT credentials</h3>
          <p class="mt-1 text-xs text-ui-muted">
            Super admin only. Secrets are stored encrypted-at-rest in the database and shown masked. Leave fields blank to keep existing values.
          </p>
          <p v-if="providers" class="mt-2 text-xs text-ui-muted">
            Active provider: <span class="font-medium text-ui-text">{{ providers.active_provider }}</span>
            · Source: {{ providers.config_source }}
          </p>
        </div>

        <div class="grid gap-6 lg:grid-cols-2">
          <div class="space-y-3 rounded-lg border border-ui-border/40 p-4">
            <div class="flex items-center justify-between">
              <h4 class="font-medium text-ui-text">Paystack</h4>
              <label class="flex items-center gap-2 text-xs text-ui-muted">
                <input v-model="paystackPreferred" type="checkbox" class="rounded" />
                Prefer Paystack
              </label>
            </div>
            <p v-if="providers?.paystack_secret_masked" class="text-xs text-emerald-600">
              Secret configured: {{ providers.paystack_secret_masked }}
            </p>
            <input v-model="paystackSecret" type="password" placeholder="New secret key (sk_live_…)" class="ui-input w-full text-sm" />
            <input v-model="paystackWebhook" type="password" placeholder="Webhook secret (optional)" class="ui-input w-full text-sm" />
          </div>

          <div class="space-y-3 rounded-lg border border-ui-border/40 p-4">
            <div class="flex items-center justify-between">
              <h4 class="font-medium text-ui-text">ALAT by Wema</h4>
              <label class="flex items-center gap-2 text-xs text-ui-muted">
                <input v-model="alatPreferred" type="checkbox" class="rounded" />
                Prefer ALAT
              </label>
            </div>
            <p v-if="providers?.alat_api_key_masked" class="text-xs text-emerald-600">
              API key configured: {{ providers.alat_api_key_masked }}
            </p>
            <input v-model="alatBaseUrl" type="url" placeholder="API base URL" class="ui-input w-full text-sm" />
            <input v-model="alatKey" type="password" placeholder="New API key" class="ui-input w-full text-sm" />
            <input v-model="alatSecret" type="password" placeholder="New API secret" class="ui-input w-full text-sm" />
          </div>
        </div>

        <button type="button" class="ui-btn-primary text-sm" :disabled="savingProviders" @click="saveProviders">
          {{ savingProviders ? "Saving…" : "Save payment credentials" }}
        </button>
      </section>

      <section v-else class="ui-card p-5 text-sm text-ui-muted">
        <p>
          Programme target: <strong class="text-ui-text">{{ dashboard.cluster_capacity.toLocaleString() }}</strong> clusters nationwide.
          Use the tabs above to manage beneficiary verification, schedule approval, locking, and monitor payment activity.
        </p>
        <p v-if="isSuperAdmin" class="mt-3">
          Configure live transfers under the <strong class="text-ui-text">Payment providers</strong> tab.
        </p>
      </section>
    </template>
  </div>
</template>
