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
const { setTab } = useAdminShell();

const {
  loadCentral,
  loadBeneficiaries,
  loadPaymentProviders,
  verifyBeneficiary,
  approveSchedule,
  lockBeneficiary,
} = useDisbursements();

type StatusFilter = "all" | "needs_action" | "verified" | "approved" | "locked" | "paid";

const loading = ref(true);
const refreshing = ref(false);
const dashboard = ref<CentralDisbursementDashboard | null>(null);
const beneficiaries = ref<Beneficiary[]>([]);
const providersMeta = ref<PaymentProviders | null>(null);
const statusFilter = ref<StatusFilter>("all");
const search = ref("");
const page = ref(1);
const pageSize = 10;
const busyId = ref<string | null>(null);

async function refresh(opts: { quiet?: boolean } = {}) {
  if (opts.quiet) refreshing.value = true;
  else loading.value = true;
  try {
    const [central, bens] = await Promise.all([loadCentral(), loadBeneficiaries()]);
    dashboard.value = central;
    beneficiaries.value = bens;
    if (isSuperAdmin.value) {
      providersMeta.value = await loadPaymentProviders().catch(() => null);
    }
    if (opts.quiet) emit("message", "Fundraising data updated.");
  } catch {
    emit("error", "Could not load fundraising data.");
  } finally {
    loading.value = false;
    refreshing.value = false;
  }
}

async function verify(id: string) {
  busyId.value = id;
  try {
    await verifyBeneficiary(id);
    emit("message", "Person verified.");
    await refresh({ quiet: true });
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
    emit("message", "Payout schedule approved.");
    await refresh({ quiet: true });
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
    emit("message", "Record locked for field payment.");
    await refresh({ quiet: true });
  } catch (e: unknown) {
    emit("error", e instanceof Error ? e.message : "Lock failed.");
  } finally {
    busyId.value = null;
  }
}

function exportPaymentsCsv() {
  const d = dashboard.value;
  if (!d?.recent_payments.length) {
    emit("error", "No payments to export yet.");
    return;
  }
  const lines = [
    "ref,beneficiary,agent,cluster,amount,status,provider,created_at",
    ...d.recent_payments.map((p) =>
      [
        p.transaction_ref,
        JSON.stringify(p.beneficiary_name),
        JSON.stringify(p.agent_name),
        JSON.stringify(p.cluster_name ?? ""),
        p.amount,
        p.status,
        p.provider ?? "",
        p.created_at,
      ].join(","),
    ),
  ];
  const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `fundraising-payments-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
  emit("message", "Payments CSV downloaded.");
}

onMounted(() => void refresh());

const gatewaysConfigured = computed(() => {
  if (providersMeta.value?.paystack_configured || providersMeta.value?.alat_configured) return true;
  const p = dashboard.value?.providers;
  return Boolean(p?.paystack || p?.alat);
});

const paidOut = computed(() => dashboard.value?.total_disbursed ?? 0);
const approved = computed(() => dashboard.value?.total_approved_assistance ?? 0);
const remaining = computed(() => Math.max(0, approved.value - paidOut.value));
const paidPct = computed(() => {
  if (!approved.value) return 0;
  return Math.min(100, Math.round((paidOut.value / approved.value) * 100));
});

const needsAction = computed(() =>
  beneficiaries.value.filter(
    (b) => b.verification_status !== "verified" || b.schedule_status === "draft" || !b.is_locked,
  ),
);

const filterCounts = computed(() => {
  const bens = beneficiaries.value;
  return {
    all: bens.length,
    needs_action: needsAction.value.length,
    verified: bens.filter((b) => b.verification_status === "verified" && b.schedule_status === "draft" && !b.is_locked)
      .length,
    approved: bens.filter((b) => b.schedule_status === "approved" && !b.is_locked).length,
    locked: bens.filter((b) => b.is_locked).length,
    paid: dashboard.value?.successful_transactions ?? 0,
  };
});

function matchesFilter(b: Beneficiary, filter: StatusFilter) {
  if (filter === "all") return true;
  if (filter === "needs_action") {
    return b.verification_status !== "verified" || b.schedule_status === "draft" || !b.is_locked;
  }
  if (filter === "verified") {
    return b.verification_status === "verified" && b.schedule_status === "draft" && !b.is_locked;
  }
  if (filter === "approved") return b.schedule_status === "approved" && !b.is_locked;
  if (filter === "locked") return b.is_locked;
  return true;
}

const filteredBeneficiaries = computed(() => {
  const q = search.value.trim().toLowerCase();
  return beneficiaries.value.filter((b) => {
    if (statusFilter.value === "paid") return false;
    if (!matchesFilter(b, statusFilter.value)) return false;
    if (!q) return true;
    return (
      b.name.toLowerCase().includes(q) ||
      b.reference_code.toLowerCase().includes(q) ||
      (b.cluster_name || "").toLowerCase().includes(q) ||
      b.bank_name.toLowerCase().includes(q) ||
      b.account_number.includes(q)
    );
  });
});

const pageCount = computed(() => Math.max(1, Math.ceil(filteredBeneficiaries.value.length / pageSize)));
const pagedBeneficiaries = computed(() => {
  const start = (page.value - 1) * pageSize;
  return filteredBeneficiaries.value.slice(start, start + pageSize);
});

watch([statusFilter, search], () => {
  page.value = 1;
});

const recentPayments = computed(() => (dashboard.value?.recent_payments ?? []).slice(0, 8));
const topClusters = computed(() =>
  [...(dashboard.value?.cluster_reports ?? [])]
    .sort((a, b) => b.disbursed_amount - a.disbursed_amount)
    .slice(0, 5),
);

function formatWhen(iso: string | null) {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString(undefined, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
}

function maskAccount(acct: string) {
  if (!acct || acct.length < 4) return acct || "—";
  return `••••${acct.slice(-4)}`;
}

function statusLabel(b: Beneficiary) {
  if (b.is_locked) return "Ready for payout";
  if (b.schedule_status === "approved") return "Schedule approved";
  if (b.verification_status === "verified") return "Verified — approve next";
  return "Needs verification";
}

function statusClass(b: Beneficiary) {
  if (b.is_locked) return "bg-action-green/15 text-action-green";
  if (b.schedule_status === "approved") return "bg-secondary/15 text-secondary";
  if (b.verification_status === "verified") return "bg-electric-pink/15 text-electric-pink";
  return "bg-surface-container-high text-on-surface-variant";
}

function nextAction(b: Beneficiary): "verify" | "approve" | "lock" | null {
  if (b.verification_status !== "verified") return "verify";
  if (b.schedule_status !== "approved") return "approve";
  if (!b.is_locked) return "lock";
  return null;
}

function paymentStatusClass(status: string) {
  if (status === "success" || status === "paid") return "bg-action-green/15 text-action-green";
  if (status === "failed") return "bg-error/15 text-error";
  return "bg-electric-pink/15 text-electric-pink";
}
</script>

<template>
  <div class="flex w-full flex-col gap-6 pb-10">
    <header class="flex flex-col justify-between gap-4 xl:flex-row xl:items-end">
      <div>
        <div class="mb-2 flex flex-wrap items-center gap-2">
          <span class="font-label-caps text-label-caps uppercase tracking-wider text-outline">HQ Central Command</span>
          <span class="text-outline">/</span>
          <span class="font-label-caps text-label-caps font-bold uppercase tracking-wider text-secondary">
            Fundraising
          </span>
        </div>
        <h1 class="font-headline-md text-2xl font-bold tracking-tight text-primary sm:text-headline-md">
          Fundraising
        </h1>
        <p class="mt-1 max-w-2xl text-sm text-on-surface-variant">
          See how much has been approved and paid, then verify people and release payouts.
        </p>
      </div>
      <div class="flex flex-wrap gap-2">
        <button
          type="button"
          class="inline-flex items-center gap-2 rounded-xl bg-surface-container px-4 py-2.5 text-sm font-semibold text-on-surface hover:bg-surface-container-high disabled:opacity-50"
          :disabled="loading || refreshing || !dashboard?.recent_payments.length"
          @click="exportPaymentsCsv"
        >
          <span class="material-symbols-outlined text-[18px]">download</span>
          Export payments
        </button>
        <button
          type="button"
          class="inline-flex items-center gap-2 rounded-xl bg-surface-container px-4 py-2.5 text-sm font-semibold text-on-surface hover:bg-surface-container-high disabled:opacity-50"
          :disabled="loading || refreshing"
          @click="refresh({ quiet: true })"
        >
          <span class="material-symbols-outlined text-[18px]">refresh</span>
          {{ refreshing ? "Refreshing…" : "Refresh" }}
        </button>
        <button
          v-if="isSuperAdmin && !gatewaysConfigured"
          type="button"
          class="inline-flex items-center gap-2 rounded-xl bg-electric-pink px-4 py-2.5 text-sm font-semibold text-pure-white"
          @click="setTab('payment-gateways')"
        >
          <span class="material-symbols-outlined text-[18px]">payments</span>
          Set up payment gateways
        </button>
      </div>
    </header>

    <div v-if="loading && !dashboard" class="rounded-2xl bg-surface-container-lowest p-10 text-center text-sm text-outline shadow-sm">
      Loading fundraising…
    </div>

    <template v-else-if="dashboard">
      <div class="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <div class="rounded-2xl bg-surface-container-lowest p-5 shadow-sm">
          <p class="text-xs font-semibold uppercase tracking-wide text-outline">Paid out</p>
          <p class="mt-2 text-3xl font-extrabold tracking-tight text-primary">{{ formatNaira(paidOut) }}</p>
          <p class="mt-2 text-xs text-on-surface-variant">
            {{ dashboard.successful_transactions.toLocaleString() }} successful payments
          </p>
        </div>
        <div class="rounded-2xl bg-surface-container-lowest p-5 shadow-sm">
          <p class="text-xs font-semibold uppercase tracking-wide text-outline">Approved to pay</p>
          <p class="mt-2 text-3xl font-extrabold tracking-tight text-primary">{{ formatNaira(approved) }}</p>
          <p class="mt-2 text-xs text-on-surface-variant">
            {{ formatNaira(remaining) }} still waiting
          </p>
        </div>
        <div class="rounded-2xl bg-surface-container-lowest p-5 shadow-sm">
          <p class="text-xs font-semibold uppercase tracking-wide text-outline">People verified</p>
          <p class="mt-2 text-3xl font-extrabold tracking-tight text-primary">
            {{ dashboard.verified_beneficiaries.toLocaleString() }}
            <span class="text-lg font-semibold text-outline">/ {{ dashboard.total_beneficiaries.toLocaleString() }}</span>
          </p>
          <div class="mt-3 h-1.5 overflow-hidden rounded-full bg-surface-container-high">
            <div
              class="h-full rounded-full bg-action-green"
              :style="{
                width: `${dashboard.total_beneficiaries ? Math.round((dashboard.verified_beneficiaries / dashboard.total_beneficiaries) * 100) : 0}%`,
              }"
            />
          </div>
        </div>
        <div class="rounded-2xl bg-surface-container-lowest p-5 shadow-sm">
          <p class="text-xs font-semibold uppercase tracking-wide text-outline">Payout progress</p>
          <p class="mt-2 text-3xl font-extrabold tracking-tight text-primary">{{ paidPct }}%</p>
          <p class="mt-2 text-xs text-on-surface-variant">
            {{ dashboard.pending_transactions + dashboard.processing_transactions }} pending ·
            {{ dashboard.failed_transactions }} failed
          </p>
        </div>
      </div>

      <div
        v-if="dashboard.alerts.length"
        class="rounded-2xl border border-error/25 bg-error-container/25 px-4 py-3"
      >
        <p class="text-xs font-bold uppercase tracking-wide text-error">Needs attention</p>
        <ul class="mt-2 space-y-1 text-sm text-on-surface">
          <li v-for="alert in dashboard.alerts.slice(0, 4)" :key="alert.id">
            <span class="font-semibold capitalize">{{ alert.severity }}:</span>
            {{ alert.message }}
          </li>
        </ul>
      </div>

      <div
        v-if="isSuperAdmin && !gatewaysConfigured"
        class="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-secondary-fixed/40 px-4 py-3"
      >
        <div>
          <p class="text-sm font-semibold text-primary">Payment gateways are not set up</p>
          <p class="text-xs text-on-surface-variant">Add Paystack or ALAT so field payouts can settle for real.</p>
        </div>
        <button
          type="button"
          class="rounded-xl bg-electric-pink px-4 py-2 text-sm font-semibold text-pure-white"
          @click="setTab('payment-gateways')"
        >
          Open payment gateways
        </button>
      </div>

      <section v-if="needsAction.length" class="rounded-2xl bg-surface-container-lowest p-5 shadow-sm">
        <div class="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 class="font-headline-md text-lg font-bold text-primary">Work queue</h2>
            <p class="mt-0.5 text-sm text-on-surface-variant">
              {{ needsAction.length }} people waiting for the next step
            </p>
          </div>
          <button
            type="button"
            class="text-sm font-semibold text-electric-pink"
            @click="statusFilter = 'needs_action'"
          >
            View all in table
          </button>
        </div>
        <div class="mt-4 divide-y divide-outline-variant/25">
          <div
            v-for="b in needsAction.slice(0, 5)"
            :key="`queue-${b.id}`"
            class="flex flex-col gap-3 py-3 sm:flex-row sm:items-center sm:justify-between"
          >
            <div class="min-w-0">
              <p class="truncate font-semibold text-on-surface">{{ b.name }}</p>
              <p class="text-xs text-outline">
                {{ b.cluster_name || "No cluster" }} · {{ b.bank_name }} {{ maskAccount(b.account_number) }} ·
                {{ formatNaira(b.approved_amount) }}
              </p>
              <span class="mt-1 inline-flex rounded-full px-2 py-0.5 text-[11px] font-semibold" :class="statusClass(b)">
                {{ statusLabel(b) }}
              </span>
            </div>
            <div class="flex flex-wrap gap-2">
              <button
                v-if="nextAction(b) === 'verify'"
                type="button"
                class="rounded-lg bg-electric-pink px-3 py-1.5 text-xs font-semibold text-pure-white disabled:opacity-50"
                :disabled="busyId === b.id"
                @click="verify(b.id)"
              >
                Verify
              </button>
              <button
                v-else-if="nextAction(b) === 'approve'"
                type="button"
                class="rounded-lg bg-deep-navy px-3 py-1.5 text-xs font-semibold text-pure-white disabled:opacity-50"
                :disabled="busyId === b.id"
                @click="approve(b.id)"
              >
                Approve schedule
              </button>
              <button
                v-else-if="nextAction(b) === 'lock'"
                type="button"
                class="rounded-lg bg-action-green px-3 py-1.5 text-xs font-semibold text-pure-white disabled:opacity-50"
                :disabled="busyId === b.id"
                @click="lock(b.id)"
              >
                Lock for payout
              </button>
            </div>
          </div>
        </div>
      </section>

      <section class="overflow-hidden rounded-2xl bg-surface-container-lowest shadow-sm">
        <div class="flex flex-col gap-3 border-b border-outline-variant/30 px-5 py-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 class="font-headline-md text-lg font-bold text-primary">People to pay</h2>
            <p class="text-sm text-on-surface-variant">Verify → approve schedule → lock, then field agents can pay.</p>
          </div>
          <div class="flex flex-wrap items-center gap-2">
            <input
              v-model="search"
              type="search"
              placeholder="Search name, bank, cluster…"
              class="w-52 rounded-xl bg-off-white px-3 py-2 text-sm text-on-surface outline-none ring-1 ring-outline-variant/40 focus:ring-electric-pink"
            />
          </div>
        </div>

        <div class="flex flex-wrap gap-2 border-b border-outline-variant/20 px-5 py-3">
          <button
            v-for="tab in [
              { id: 'all', label: 'All' },
              { id: 'needs_action', label: 'Needs action' },
              { id: 'verified', label: 'Verified' },
              { id: 'approved', label: 'Approved' },
              { id: 'locked', label: 'Locked' },
            ] as const"
            :key="tab.id"
            type="button"
            class="rounded-full px-3 py-1.5 text-xs font-semibold transition"
            :class="
              statusFilter === tab.id
                ? 'bg-electric-pink text-pure-white'
                : 'bg-surface-container-high text-on-surface-variant hover:bg-surface-container'
            "
            @click="statusFilter = tab.id"
          >
            {{ tab.label }}
            <span class="ml-1 opacity-80">{{ filterCounts[tab.id] }}</span>
          </button>
        </div>

        <div class="overflow-x-auto">
          <table class="min-w-full text-left text-sm">
            <thead class="bg-surface-container-low text-xs uppercase tracking-wide text-outline">
              <tr>
                <th class="px-5 py-3 font-semibold">Person</th>
                <th class="px-5 py-3 font-semibold">Bank</th>
                <th class="px-5 py-3 font-semibold">Amount</th>
                <th class="px-5 py-3 font-semibold">Status</th>
                <th class="px-5 py-3 font-semibold">Next step</th>
              </tr>
            </thead>
            <tbody>
              <tr v-if="!pagedBeneficiaries.length">
                <td colspan="5" class="px-5 py-10 text-center text-on-surface-variant">
                  No people match this filter.
                </td>
              </tr>
              <tr
                v-for="b in pagedBeneficiaries"
                :key="b.id"
                class="border-t border-outline-variant/20 hover:bg-surface-container-low/50"
              >
                <td class="px-5 py-3">
                  <p class="font-semibold text-on-surface">{{ b.name }}</p>
                  <p class="text-xs text-outline">
                    {{ b.reference_code }} · {{ b.cluster_name || "No cluster" }}
                  </p>
                </td>
                <td class="px-5 py-3 text-on-surface-variant">
                  {{ b.bank_name }}
                  <span class="block font-mono text-xs">{{ maskAccount(b.account_number) }}</span>
                </td>
                <td class="px-5 py-3 font-semibold text-on-surface">{{ formatNaira(b.approved_amount) }}</td>
                <td class="px-5 py-3">
                  <span class="inline-flex rounded-full px-2.5 py-1 text-xs font-semibold" :class="statusClass(b)">
                    {{ statusLabel(b) }}
                  </span>
                </td>
                <td class="px-5 py-3">
                  <button
                    v-if="nextAction(b) === 'verify'"
                    type="button"
                    class="rounded-lg bg-electric-pink px-3 py-1.5 text-xs font-semibold text-pure-white disabled:opacity-50"
                    :disabled="busyId === b.id"
                    @click="verify(b.id)"
                  >
                    Verify
                  </button>
                  <button
                    v-else-if="nextAction(b) === 'approve'"
                    type="button"
                    class="rounded-lg bg-deep-navy px-3 py-1.5 text-xs font-semibold text-pure-white disabled:opacity-50"
                    :disabled="busyId === b.id"
                    @click="approve(b.id)"
                  >
                    Approve
                  </button>
                  <button
                    v-else-if="nextAction(b) === 'lock'"
                    type="button"
                    class="rounded-lg bg-action-green px-3 py-1.5 text-xs font-semibold text-pure-white disabled:opacity-50"
                    :disabled="busyId === b.id"
                    @click="lock(b.id)"
                  >
                    Lock
                  </button>
                  <span v-else class="text-xs text-outline">Done — field can pay</span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <div
          v-if="pageCount > 1"
          class="flex items-center justify-between border-t border-outline-variant/25 px-5 py-3 text-sm"
        >
          <p class="text-outline">
            Page {{ page }} of {{ pageCount }} · {{ filteredBeneficiaries.length }} people
          </p>
          <div class="flex gap-2">
            <button
              type="button"
              class="rounded-lg bg-surface-container px-3 py-1.5 disabled:opacity-40"
              :disabled="page <= 1"
              @click="page -= 1"
            >
              Previous
            </button>
            <button
              type="button"
              class="rounded-lg bg-surface-container px-3 py-1.5 disabled:opacity-40"
              :disabled="page >= pageCount"
              @click="page += 1"
            >
              Next
            </button>
          </div>
        </div>
      </section>

      <div class="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <section class="overflow-hidden rounded-2xl bg-surface-container-lowest shadow-sm">
          <div class="border-b border-outline-variant/30 px-5 py-4">
            <h2 class="font-headline-md text-lg font-bold text-primary">Recent payments</h2>
            <p class="text-sm text-on-surface-variant">Latest transfers from the field.</p>
          </div>
          <div class="overflow-x-auto">
            <table class="min-w-full text-left text-sm">
              <thead class="bg-surface-container-low text-xs uppercase tracking-wide text-outline">
                <tr>
                  <th class="px-5 py-3 font-semibold">When</th>
                  <th class="px-5 py-3 font-semibold">To</th>
                  <th class="px-5 py-3 font-semibold">Amount</th>
                  <th class="px-5 py-3 font-semibold">Status</th>
                </tr>
              </thead>
              <tbody>
                <tr v-if="!recentPayments.length">
                  <td colspan="4" class="px-5 py-8 text-center text-on-surface-variant">No payments yet.</td>
                </tr>
                <tr
                  v-for="p in recentPayments"
                  :key="p.id"
                  class="border-t border-outline-variant/20"
                >
                  <td class="whitespace-nowrap px-5 py-3 text-on-surface-variant">
                    {{ formatWhen(p.paid_at || p.authorized_at || p.created_at) }}
                  </td>
                  <td class="px-5 py-3">
                    <p class="font-medium text-on-surface">{{ p.beneficiary_name }}</p>
                    <p class="text-xs text-outline">{{ p.agent_name }} · {{ p.cluster_name || "—" }}</p>
                  </td>
                  <td class="px-5 py-3 font-semibold">{{ formatNaira(p.amount) }}</td>
                  <td class="px-5 py-3">
                    <span
                      class="inline-flex rounded-full px-2.5 py-1 text-xs font-semibold capitalize"
                      :class="paymentStatusClass(p.status)"
                    >
                      {{ p.status }}
                    </span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        <section class="overflow-hidden rounded-2xl bg-surface-container-lowest shadow-sm">
          <div class="border-b border-outline-variant/30 px-5 py-4">
            <h2 class="font-headline-md text-lg font-bold text-primary">Clusters</h2>
            <p class="text-sm text-on-surface-variant">
              {{ dashboard.clusters_completed }} complete · {{ dashboard.clusters_pending }} still open
            </p>
          </div>
          <ul class="divide-y divide-outline-variant/20">
            <li v-if="!topClusters.length" class="px-5 py-8 text-center text-sm text-on-surface-variant">
              No clusters yet.
            </li>
            <li
              v-for="c in topClusters"
              :key="c.cluster_id"
              class="flex items-center justify-between gap-3 px-5 py-3"
            >
              <div class="min-w-0">
                <p class="truncate font-semibold text-on-surface">{{ c.cluster_name }}</p>
                <p class="text-xs text-outline">
                  {{ c.verified_beneficiaries }}/{{ c.total_beneficiaries }} verified ·
                  {{ c.locked_beneficiaries }} locked
                </p>
              </div>
              <div class="shrink-0 text-right">
                <p class="font-semibold text-on-surface">{{ formatNaira(c.disbursed_amount) }}</p>
                <p class="text-xs text-outline">of {{ formatNaira(c.approved_amount) }}</p>
              </div>
            </li>
          </ul>
        </section>
      </div>
    </template>
  </div>
</template>
