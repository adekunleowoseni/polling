<script setup lang="ts">
import {
  formatNaira,
  useDisbursements,
  type Beneficiary,
  type CentralDisbursementDashboard,
  type ClusterReport,
  type DisbursementPayment,
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

type LedgerTab = "all" | "major" | "field" | "recurring";

const loading = ref(true);
const reconciling = ref(false);
const dashboard = ref<CentralDisbursementDashboard | null>(null);
const beneficiaries = ref<Beneficiary[]>([]);
const providersMeta = ref<PaymentProviders | null>(null);
const ledgerTab = ref<LedgerTab>("all");
const ledgerQuery = ref("");
const page = ref(1);
const pageSize = 8;
const busyId = ref<string | null>(null);
const rowMenuId = ref<string | null>(null);

async function refresh(opts: { reconcile?: boolean } = {}) {
  if (opts.reconcile) reconciling.value = true;
  else loading.value = true;
  try {
    const [central, bens] = await Promise.all([loadCentral(), loadBeneficiaries()]);
    dashboard.value = central;
    beneficiaries.value = bens;
    if (isSuperAdmin.value) {
      providersMeta.value = await loadPaymentProviders().catch(() => null);
    }
    if (opts.reconcile) {
      const rails = Object.entries(central.providers || {})
        .filter(([, ok]) => ok)
        .map(([name]) => name)
        .join(", ");
      emit(
        "message",
        rails
          ? `Gateway sync reconciled · active rails: ${rails}.`
          : "Gateway sync reconciled · no payment credentials configured yet.",
      );
    }
  } catch {
    emit("error", "Failed to load fundraising & donor capital dashboard.");
  } finally {
    loading.value = false;
    reconciling.value = false;
  }
}

async function verify(id: string) {
  busyId.value = id;
  rowMenuId.value = null;
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
  rowMenuId.value = null;
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
  rowMenuId.value = null;
  try {
    await lockBeneficiary(id);
    emit("message", "Record locked — agents may authorize payment only.");
    await refresh();
  } catch (e: unknown) {
    emit("error", e instanceof Error ? e.message : "Lock failed.");
  } finally {
    busyId.value = null;
  }
}

function exportAuditCsv() {
  const d = dashboard.value;
  if (!d) return;
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
  a.download = `fundraising-audit-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
  emit("message", "Financial audit CSV exported.");
}

onMounted(() => void refresh());

const gatewaysConfigured = computed(() => {
  if (providersMeta.value?.paystack_configured || providersMeta.value?.alat_configured) return true;
  const p = dashboard.value?.providers;
  return Boolean(p?.paystack || p?.alat);
});

const showConfigureGateway = computed(() => isSuperAdmin.value && !gatewaysConfigured.value);

const totalCapital = computed(() => dashboard.value?.total_disbursed ?? 0);
const totalApproved = computed(() => dashboard.value?.total_approved_assistance ?? 0);
const avgGift = computed(() => {
  const payments = dashboard.value?.recent_payments ?? [];
  if (!payments.length) {
    const bens = beneficiaries.value;
    if (!bens.length) return 0;
    return bens.reduce((s, b) => s + b.approved_amount, 0) / bens.length;
  }
  return payments.reduce((s, p) => s + p.amount, 0) / payments.length;
});

const verifiedCount = computed(() => dashboard.value?.verified_beneficiaries ?? 0);
const retentionPct = computed(() => {
  const d = dashboard.value;
  if (!d || !d.total_beneficiaries) return 0;
  return Math.round((d.verified_beneficiaries / d.total_beneficiaries) * 1000) / 10;
});

const fieldVolume = computed(() => {
  const payments = dashboard.value?.recent_payments ?? [];
  return payments.reduce((s, p) => s + (p.status === "success" || p.status === "paid" ? p.amount : 0), 0)
    || totalCapital.value;
});

const microShare = computed(() => {
  const bens = beneficiaries.value;
  if (!bens.length) return { micro: 68, major: 32 };
  const major = bens.filter((b) => b.approved_amount >= 100_000).length;
  const micro = bens.length - major;
  const total = bens.length || 1;
  return {
    micro: Math.round((micro / total) * 100),
    major: Math.round((major / total) * 100),
  };
});

const weekHint = computed(() => {
  const success = dashboard.value?.successful_transactions ?? 0;
  return `${success.toLocaleString()} successful txns`;
});

const matchProgress = computed(() => {
  const d = dashboard.value;
  if (!d || !d.total_approved_assistance) return 0;
  return Math.min(100, Math.round((d.total_disbursed / d.total_approved_assistance) * 100));
});

const matchUnlocked = computed(() => totalCapital.value);
const matchRemaining = computed(() => Math.max(0, totalApproved.value - totalCapital.value));

const cultivationQueue = computed(() =>
  beneficiaries.value
    .filter((b) => b.verification_status !== "verified" || b.schedule_status === "draft" || !b.is_locked)
    .slice(0, 5),
);

const squadLeaders = computed(() =>
  [...(dashboard.value?.cluster_reports ?? [])]
    .sort((a, b) => b.disbursed_amount - a.disbursed_amount)
    .slice(0, 3),
);

const payments = computed(() => dashboard.value?.recent_payments ?? []);

const ledgerRows = computed(() => {
  let rows: Array<{
    id: string;
    kind: "payment" | "beneficiary";
    name: string;
    initials: string;
    meta: string;
    tier: string;
    tierClass: string;
    amount: number;
    rail: string;
    channel: string;
    compliance: string;
    complianceIcon: string;
    beneficiary?: Beneficiary;
  }> = [];

  if (ledgerTab.value === "all" || ledgerTab.value === "field") {
    rows = payments.value.map((p) => ({
      id: p.id,
      kind: "payment" as const,
      name: p.beneficiary_name,
      initials: initials(p.beneficiary_name),
      meta: `#${p.transaction_ref.slice(0, 12)} · ${formatWhen(p.authorized_at || p.created_at)}`,
      tier: tierFromAmount(p.amount),
      tierClass: tierClass(p.amount),
      amount: p.amount,
      rail: providerRail(p),
      channel: p.cluster_name || p.agent_name || "Field transfer",
      compliance: complianceLabel(p.status),
      complianceIcon: p.status === "success" || p.status === "paid" ? "verified" : "pending",
    }));
  }

  if (ledgerTab.value === "major" || ledgerTab.value === "recurring" || (!payments.value.length && ledgerTab.value === "all")) {
    const bens = beneficiaries.value.filter((b) => {
      if (ledgerTab.value === "major") return b.approved_amount >= 100_000;
      if (ledgerTab.value === "recurring") return b.is_locked || b.schedule_status === "approved";
      return true;
    });
    const mapped = bens.map((b) => ({
      id: b.id,
      kind: "beneficiary" as const,
      name: b.name,
      initials: initials(b.name),
      meta: `#${b.reference_code} · ${formatWhen(b.created_at)}`,
      tier: beneficiaryTier(b),
      tierClass: beneficiaryTierClass(b),
      amount: b.approved_amount,
      rail: `${b.bank_name} / ${maskAccount(b.account_number)}`,
      channel: b.cluster_name || "Cluster schedule",
      compliance: beneficiaryCompliance(b),
      complianceIcon:
        b.verification_status === "verified" ? "verified" : b.is_locked ? "lock" : "schedule",
      beneficiary: b,
    }));
    if (ledgerTab.value !== "all" || !payments.value.length) rows = mapped;
    else rows = [...rows, ...mapped];
  }

  const q = ledgerQuery.value.trim().toLowerCase();
  if (q) {
    rows = rows.filter(
      (r) =>
        r.name.toLowerCase().includes(q) ||
        r.meta.toLowerCase().includes(q) ||
        r.channel.toLowerCase().includes(q) ||
        r.rail.toLowerCase().includes(q),
    );
  }

  return rows;
});

const pageCount = computed(() => Math.max(1, Math.ceil(ledgerRows.value.length / pageSize)));
const pagedRows = computed(() => {
  const start = (page.value - 1) * pageSize;
  return ledgerRows.value.slice(start, start + pageSize);
});

watch(ledgerTab, () => {
  page.value = 1;
});
watch(ledgerQuery, () => {
  page.value = 1;
});

const tabCounts = computed(() => {
  const all = Math.max(payments.value.length, beneficiaries.value.length, dashboard.value?.total_beneficiaries ?? 0);
  const major = beneficiaries.value.filter((b) => b.approved_amount >= 100_000).length;
  const field = payments.value.length || dashboard.value?.successful_transactions || 0;
  const recurring = beneficiaries.value.filter((b) => b.is_locked || b.schedule_status === "approved").length;
  return { all, major, field, recurring };
});

const providerLabel = computed(() => {
  const p = dashboard.value?.providers;
  if (!p) return "Simulated gateway";
  if (p.paystack) return "Paystack Connect";
  if (p.alat) return "ALAT by Wema";
  return "Simulated (configure keys)";
});

const chartPeak = computed(() => {
  const peak = Math.max(...(payments.value.map((p) => p.amount) || [0]), avgGift.value * 3, 1);
  return formatNaira(peak);
});

function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

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

function tierFromAmount(amount: number) {
  if (amount >= 500_000) return "High-Net Major Gift";
  if (amount >= 100_000) return "Major Giver Tier";
  if (amount >= 25_000) return "Sustaining Pillar";
  return "Grassroots Micro";
}

function tierClass(amount: number) {
  if (amount >= 100_000) return "bg-electric-pink/10 text-electric-pink font-bold";
  if (amount >= 25_000) return "bg-deep-navy text-pure-white font-medium";
  return "bg-surface-container-high text-on-surface font-medium";
}

function beneficiaryTier(b: Beneficiary) {
  if (b.approved_amount >= 100_000) return "Major Giver Tier";
  if (b.is_locked) return "Sustaining Pillar";
  if (b.verification_status === "verified") return "Field Supporter";
  return "Pending Cultivation";
}

function beneficiaryTierClass(b: Beneficiary) {
  return tierClass(b.approved_amount);
}

function beneficiaryCompliance(b: Beneficiary) {
  if (b.is_locked) return "Schedule Locked";
  if (b.schedule_status === "approved") return "Schedule Approved";
  if (b.verification_status === "verified") return "Verified Identity";
  return "Awaiting Verify";
}

function providerRail(p: DisbursementPayment) {
  const name = (p.provider || "").toLowerCase();
  if (name.includes("paystack")) return "Paystack Transfer";
  if (name.includes("alat")) return "ALAT Instant Pay";
  return p.provider ? `${p.provider} rail` : `${p.bank_name} transfer`;
}

function complianceLabel(status: string) {
  if (status === "success" || status === "paid") return "Verified & Settled";
  if (status === "pending" || status === "processing") return "Settlement Pending";
  if (status === "failed") return "Failed — Review";
  return status;
}

function cultivationBadge(b: Beneficiary) {
  if (b.verification_status !== "verified") return { label: "Needs Verify", cls: "bg-electric-pink/15 text-electric-pink" };
  if (b.schedule_status === "draft") return { label: "In Review", cls: "bg-electric-pink/15 text-electric-pink" };
  if (!b.is_locked) return { label: "Ready to Lock", cls: "bg-action-green/20 text-deep-navy" };
  return { label: "Queued", cls: "bg-surface-container-highest text-on-surface" };
}

function squadMeta(c: ClusterReport) {
  return `${c.verified_beneficiaries}/${c.total_beneficiaries} verified · ${c.locked_beneficiaries} locked`;
}

function avatarTone(index: number) {
  const tones = [
    "bg-deep-navy text-pure-white",
    "bg-secondary-container text-pure-white",
    "bg-action-green/25 text-deep-navy",
    "bg-surface-container-highest text-on-surface",
    "bg-deep-navy text-action-green",
  ];
  return tones[index % tones.length];
}

function goFieldOps() {
  setTab("recordings");
}
</script>

<template>
  <div class="flex w-full flex-col space-y-8 pb-8" @click="rowMenuId = null">
    <!-- Command Header -->
    <section class="mt-2 flex flex-col gap-4">
      <div class="flex flex-wrap items-center gap-2">
        <span class="font-label-caps text-label-caps uppercase tracking-wider text-on-surface-variant">HQ Central Command</span>
        <span class="font-label-caps text-label-caps text-outline-variant">/</span>
        <span class="font-label-caps text-label-caps font-semibold uppercase tracking-wider text-deep-navy dark:text-pure-white">
          Fundraising &amp; Capital Operations
        </span>
        <span
          class="inline-flex items-center gap-1.5 rounded-full bg-action-green/15 px-2 py-0.5 font-label-caps text-[10px] font-bold text-deep-navy dark:text-action-green"
        >
          <span class="h-1.5 w-1.5 animate-pulse rounded-full bg-action-green" />
          Live treasury
        </span>
      </div>
      <div class="flex flex-col justify-between gap-6 xl:flex-row xl:items-end">
        <div class="space-y-1">
          <h1 class="font-headline-lg text-2xl font-bold tracking-tight text-deep-navy dark:text-pure-white sm:text-headline-md lg:text-[40px] lg:leading-[48px]">
            Fundraising &amp; Donor Capital Command
          </h1>
          <p class="max-w-3xl font-body-md text-sm text-on-surface-variant sm:text-body-md">
            Live mobilization treasury — cluster disbursements, major gift pipeline, and field Tap-to-Give telemetry in Naira.
          </p>
        </div>
        <div
          class="grid w-full gap-2 xl:w-auto xl:shrink-0"
          :class="showConfigureGateway ? 'grid-cols-1 sm:grid-cols-3' : 'grid-cols-1 sm:grid-cols-2'"
        >
          <button
            type="button"
            class="inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-surface-container-lowest px-4 font-button-text text-sm font-semibold text-deep-navy shadow-sm transition hover:bg-surface-container-low dark:text-pure-white"
            @click="exportAuditCsv"
          >
            <span class="material-symbols-outlined shrink-0 text-[18px] text-outline">file_download</span>
            <span class="truncate">Export Financial Audit</span>
          </button>
          <button
            type="button"
            class="inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-surface-container-lowest px-4 font-button-text text-sm font-semibold text-deep-navy shadow-sm transition hover:bg-surface-container-low disabled:opacity-60 dark:text-pure-white"
            :disabled="loading || reconciling"
            @click="refresh({ reconcile: true })"
          >
            <span class="material-symbols-outlined shrink-0 text-[18px] text-action-green">sync</span>
            <span class="truncate">{{ reconciling ? "Reconciling…" : "Reconcile Gateway Sync" }}</span>
          </button>
          <button
            v-if="showConfigureGateway"
            type="button"
            class="inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-electric-pink px-4 font-button-text text-sm font-semibold text-pure-white shadow-sm shadow-electric-pink/25 transition hover:opacity-95"
            @click="setTab('payment-gateways')"
          >
            <span class="material-symbols-outlined shrink-0 text-[18px]">add_circle</span>
            <span class="truncate">Configure Payment Gateways</span>
          </button>
        </div>
      </div>
    </section>

    <div v-if="loading && !dashboard" class="rounded-xl bg-surface-container-lowest p-10 text-center text-sm text-outline shadow-sm">
      Loading capital command…
    </div>

    <template v-else-if="dashboard">
      <!-- KPI Grid -->
      <section class="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-4">
        <div class="group relative flex flex-col justify-between overflow-hidden rounded-xl bg-surface-container-lowest p-5 shadow-sm transition-shadow hover:shadow-md">
          <div class="flex items-start justify-between">
            <div class="space-y-1">
              <span class="block font-label-caps text-label-caps uppercase tracking-wider text-on-surface-variant">Total Mobilized Capital</span>
              <span class="font-display-lg text-[32px] font-extrabold leading-none tracking-tight text-deep-navy dark:text-pure-white sm:text-[36px]">
                {{ formatNaira(totalCapital) }}
              </span>
            </div>
            <div class="flex h-10 w-10 items-center justify-center rounded-lg bg-action-green/15 text-deep-navy dark:text-action-green">
              <span class="material-symbols-outlined text-[22px]">payments</span>
            </div>
          </div>
          <div class="mt-4 flex items-center justify-between border-t border-outline-variant/20 pt-3">
            <div class="flex items-center gap-1.5 font-label-caps text-xs font-semibold text-action-green">
              <span class="material-symbols-outlined text-[16px]">trending_up</span>
              {{ matchProgress }}%
              <span class="font-normal text-outline">of approved</span>
            </div>
            <span class="font-label-caps text-xs font-medium text-on-surface-variant">{{ weekHint }}</span>
          </div>
        </div>

        <div class="group flex flex-col justify-between rounded-xl bg-surface-container-lowest p-5 shadow-sm transition-shadow hover:shadow-md">
          <div class="flex items-start justify-between">
            <div class="space-y-1">
              <span class="block font-label-caps text-label-caps uppercase tracking-wider text-on-surface-variant">Average Gift Size</span>
              <span class="font-display-lg text-[32px] font-extrabold leading-none tracking-tight text-deep-navy dark:text-pure-white sm:text-[36px]">
                {{ formatNaira(avgGift) }}
              </span>
            </div>
            <div class="flex h-10 w-10 items-center justify-center rounded-lg bg-surface-container text-on-surface">
              <span class="material-symbols-outlined text-[22px]">bar_chart</span>
            </div>
          </div>
          <div class="mt-4 flex flex-col gap-1.5 border-t border-outline-variant/20 pt-3">
            <div class="flex h-1.5 w-full overflow-hidden rounded-full bg-surface-container-highest">
              <div class="h-full bg-action-green" :style="{ width: `${microShare.micro}%` }" />
              <div class="h-full bg-electric-pink" :style="{ width: `${microShare.major}%` }" />
            </div>
            <div class="flex justify-between font-label-caps text-[11px] text-on-surface-variant">
              <span>Micro ({{ microShare.micro }}%)</span>
              <span>Major ({{ microShare.major }}%)</span>
            </div>
          </div>
        </div>

        <div class="group flex flex-col justify-between rounded-xl bg-surface-container-lowest p-5 shadow-sm transition-shadow hover:shadow-md">
          <div class="flex items-start justify-between">
            <div class="space-y-1">
              <span class="block font-label-caps text-label-caps uppercase tracking-wider text-on-surface-variant">Verified Beneficiaries</span>
              <span class="font-display-lg text-[32px] font-extrabold leading-none tracking-tight text-deep-navy dark:text-pure-white sm:text-[36px]">
                {{ verifiedCount.toLocaleString() }}
              </span>
            </div>
            <div class="flex h-10 w-10 items-center justify-center rounded-lg bg-electric-pink/10 text-electric-pink">
              <span class="material-symbols-outlined text-[22px]">verified</span>
            </div>
          </div>
          <div class="mt-4 flex items-center justify-between border-t border-outline-variant/20 pt-3">
            <span class="font-label-caps text-xs text-on-surface-variant">
              <strong class="font-semibold text-deep-navy dark:text-pure-white">{{ formatNaira(totalApproved) }}</strong>
              approved
            </span>
            <div class="flex items-center gap-1 font-label-caps text-xs font-semibold text-deep-navy dark:text-action-green">
              <span class="h-2 w-2 rounded-full bg-action-green" />
              {{ retentionPct }}% Verified
            </div>
          </div>
        </div>

        <div class="group flex flex-col justify-between rounded-xl bg-surface-container-lowest p-5 shadow-sm transition-shadow hover:shadow-md">
          <div class="flex items-start justify-between">
            <div class="space-y-1">
              <span class="block font-label-caps text-label-caps uppercase tracking-wider text-on-surface-variant">Field Tap-to-Give Volume</span>
              <span class="font-display-lg text-[32px] font-extrabold leading-none tracking-tight text-deep-navy dark:text-pure-white sm:text-[36px]">
                {{ formatNaira(fieldVolume) }}
              </span>
            </div>
            <div class="flex h-10 w-10 items-center justify-center rounded-lg bg-deep-navy text-pure-white">
              <span class="material-symbols-outlined text-[22px]">contactless</span>
            </div>
          </div>
          <div class="mt-4 flex items-center justify-between border-t border-outline-variant/20 pt-3">
            <span class="font-label-caps text-xs font-medium text-on-surface-variant">
              {{ dashboard.total_clusters }} clusters · {{ dashboard.clusters_pending }} pending
            </span>
            <span class="inline-flex items-center gap-1 font-label-caps text-[11px] font-bold text-action-green">
              <span class="material-symbols-outlined text-[14px]">bolt</span>
              Instant sync
            </span>
          </div>
        </div>
      </section>

      <div
        v-if="dashboard.alerts.length"
        class="rounded-xl border border-error/20 bg-error-container/30 p-4"
      >
        <p class="font-label-caps text-xs font-semibold uppercase text-error">Capital alerts</p>
        <ul class="mt-2 space-y-1 text-sm text-on-surface">
          <li v-for="alert in dashboard.alerts.slice(0, 4)" :key="alert.id">
            <span class="font-semibold">{{ alert.severity }}:</span>
            {{ alert.message }}
          </li>
        </ul>
      </div>

      <!-- Main Grid -->
      <section class="grid grid-cols-1 items-start gap-6 lg:grid-cols-12">
        <div class="flex flex-col gap-6 lg:col-span-8">
          <!-- Velocity Chart -->
          <div class="flex flex-col rounded-xl bg-surface-container-lowest p-5 shadow-sm sm:p-6">
            <div class="mb-5 flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
              <div class="flex flex-col">
                <span class="font-label-caps text-label-caps font-semibold uppercase text-outline">Campaign Cadence</span>
                <h2 class="font-headline-md text-xl font-bold text-deep-navy dark:text-pure-white sm:text-[28px] sm:leading-9">
                  Pledge Velocity &amp; Revenue Trajectory
                </h2>
              </div>
              <div class="flex flex-wrap items-center gap-3">
                <div class="flex flex-wrap items-center gap-4 font-label-caps text-xs text-on-surface-variant">
                  <span class="flex items-center gap-1.5"><span class="h-2.5 w-2.5 rounded-full bg-deep-navy dark:bg-pure-white" /> Digital / HQ</span>
                  <span class="flex items-center gap-1.5"><span class="h-2.5 w-2.5 rounded-full bg-action-green" /> Field Tap-to-Give</span>
                  <span class="flex items-center gap-1.5"><span class="h-2.5 w-2.5 rounded-full bg-electric-pink" /> Major Transfer</span>
                </div>
                <span class="rounded-lg bg-surface-container px-2.5 py-1 font-label-caps text-xs font-semibold text-deep-navy dark:text-pure-white">
                  Live window
                </span>
              </div>
            </div>
            <div class="relative flex h-64 w-full flex-col justify-between overflow-hidden rounded-xl bg-surface-container-low/60 p-4">
              <div
                class="absolute right-4 top-4 z-10 flex items-center gap-1.5 rounded-lg bg-surface-container-lowest/90 px-3 py-1.5 font-label-caps text-xs text-deep-navy shadow-sm backdrop-blur dark:text-pure-white"
              >
                <span class="material-symbols-outlined text-[16px] text-electric-pink">flag</span>
                Peak transfer:
                <strong>{{ chartPeak }}</strong>
              </div>
              <svg class="h-full w-full" fill="none" preserveAspectRatio="none" viewBox="0 0 800 200">
                <line opacity="0.5" stroke="#c8c5cc" stroke-dasharray="4 4" stroke-width="0.5" x1="0" x2="800" y1="40" y2="40" />
                <line opacity="0.5" stroke="#c8c5cc" stroke-dasharray="4 4" stroke-width="0.5" x1="0" x2="800" y1="90" y2="90" />
                <line opacity="0.5" stroke="#c8c5cc" stroke-dasharray="4 4" stroke-width="0.5" x1="0" x2="800" y1="140" y2="140" />
                <path d="M 0 170 Q 120 150 200 130 T 400 110 T 600 70 T 700 45 L 800 65 L 800 190 L 0 190 Z" fill="#222230" fill-opacity="0.08" />
                <path d="M 0 170 Q 120 150 200 130 T 400 110 T 600 70 T 700 45 L 800 65" stroke="#222230" stroke-linecap="round" stroke-width="2.5" />
                <path d="M 0 185 Q 150 175 280 160 T 480 130 T 620 90 T 720 70 L 800 95" stroke="#92D80A" stroke-linecap="round" stroke-width="3" />
                <path d="M 0 195 Q 160 190 320 180 T 520 165 T 660 110 T 710 30 L 750 140 L 800 160" stroke="#FF387F" stroke-linecap="round" stroke-width="2.5" />
                <circle cx="710" cy="30" fill="#FF387F" r="5" />
                <circle class="animate-ping" cx="710" cy="30" r="10" stroke="#FF387F" stroke-opacity="0.4" stroke-width="1.5" />
              </svg>
              <div class="flex items-center justify-between pt-2 font-label-caps text-[11px] text-outline">
                <span>Cycle open</span>
                <span>Mid-window</span>
                <span class="font-bold text-deep-navy dark:text-action-green">Today (Live)</span>
              </div>
            </div>
          </div>

          <!-- Ledger -->
          <div class="flex flex-col rounded-xl bg-surface-container-lowest p-5 shadow-sm sm:p-6">
            <div class="mb-5 flex flex-col justify-between gap-4 md:flex-row md:items-center">
              <div>
                <span class="font-label-caps text-label-caps font-semibold uppercase text-outline">Ledger Terminal</span>
                <h2 class="font-headline-md text-xl font-bold text-deep-navy dark:text-pure-white sm:text-[28px] sm:leading-9">
                  Recent High-Impact Contributions
                </h2>
              </div>
              <div class="flex flex-wrap items-center gap-1 rounded-xl bg-surface-container p-1">
                <button
                  type="button"
                  class="rounded-lg px-3 py-1.5 font-button-text text-xs transition-colors"
                  :class="ledgerTab === 'all' ? 'bg-surface-container-lowest font-semibold text-on-surface shadow-sm' : 'text-on-surface-variant hover:text-on-surface'"
                  @click="ledgerTab = 'all'"
                >
                  All ({{ tabCounts.all.toLocaleString() }})
                </button>
                <button
                  type="button"
                  class="rounded-lg px-3 py-1.5 font-button-text text-xs transition-colors"
                  :class="ledgerTab === 'major' ? 'bg-surface-container-lowest font-semibold text-on-surface shadow-sm' : 'text-on-surface-variant hover:text-on-surface'"
                  @click="ledgerTab = 'major'"
                >
                  Major Gifts ({{ tabCounts.major }})
                </button>
                <button
                  type="button"
                  class="rounded-lg px-3 py-1.5 font-button-text text-xs transition-colors"
                  :class="ledgerTab === 'field' ? 'bg-surface-container-lowest font-semibold text-on-surface shadow-sm' : 'text-on-surface-variant hover:text-on-surface'"
                  @click="ledgerTab = 'field'"
                >
                  Field Payments ({{ tabCounts.field }})
                </button>
                <button
                  type="button"
                  class="rounded-lg px-3 py-1.5 font-button-text text-xs transition-colors"
                  :class="ledgerTab === 'recurring' ? 'bg-surface-container-lowest font-semibold text-on-surface shadow-sm' : 'text-on-surface-variant hover:text-on-surface'"
                  @click="ledgerTab = 'recurring'"
                >
                  Scheduled ({{ tabCounts.recurring }})
                </button>
              </div>
            </div>

            <div class="mb-4 flex flex-wrap items-center justify-between gap-3">
              <div class="relative min-w-[220px] flex-1">
                <span class="material-symbols-outlined absolute left-3 top-2.5 text-[18px] text-outline">search</span>
                <input
                  v-model="ledgerQuery"
                  class="w-full rounded-xl bg-off-white py-2 pl-9 pr-3 font-body-md text-xs text-on-surface outline-none placeholder:text-outline"
                  placeholder="Filter by donor, receipt hash, cluster…"
                  type="search"
                />
              </div>
              <div class="flex items-center gap-2">
                <span class="flex items-center gap-1.5 rounded-xl bg-surface-container px-3 py-2 font-label-caps text-xs font-semibold text-deep-navy dark:text-pure-white">
                  <span class="material-symbols-outlined text-[16px]">tune</span>
                  Rail: {{ providerLabel }}
                </span>
              </div>
            </div>

            <div class="w-full overflow-x-auto">
              <table class="w-full text-left">
                <thead>
                  <tr class="bg-surface-container-low font-label-caps text-[11px] uppercase tracking-wider text-on-surface-variant">
                    <th class="rounded-l-xl px-4 py-3">Donor &amp; Metadata</th>
                    <th class="px-4 py-3">Tier</th>
                    <th class="px-4 py-3">Amount &amp; Rail</th>
                    <th class="px-4 py-3">Channel / Cluster</th>
                    <th class="px-4 py-3">Compliance</th>
                    <th class="rounded-r-xl px-4 py-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody class="font-body-md text-sm">
                  <tr v-if="!pagedRows.length">
                    <td colspan="6" class="px-4 py-10 text-center text-outline">No ledger rows for this filter.</td>
                  </tr>
                  <tr
                    v-for="(row, idx) in pagedRows"
                    :key="row.id"
                    class="transition-colors hover:bg-surface-container-low/60"
                  >
                    <td class="px-4 py-3.5">
                      <div class="flex items-center gap-3">
                        <div
                          class="flex h-9 w-9 items-center justify-center rounded-full text-xs font-bold"
                          :class="avatarTone(idx)"
                        >
                          {{ row.initials }}
                        </div>
                        <div class="flex flex-col">
                          <span class="font-headline-md text-xs font-bold text-on-surface">{{ row.name }}</span>
                          <span class="font-label-caps text-[10px] font-medium text-outline">{{ row.meta }}</span>
                        </div>
                      </div>
                    </td>
                    <td class="px-4 py-3.5">
                      <span class="inline-flex items-center rounded-md px-2 py-0.5 font-label-caps text-[10px]" :class="row.tierClass">
                        {{ row.tier }}
                      </span>
                    </td>
                    <td class="px-4 py-3.5">
                      <div class="flex flex-col">
                        <span class="font-headline-md text-xs font-bold text-on-surface">{{ formatNaira(row.amount) }}</span>
                        <span class="font-label-caps text-[10px] text-outline">{{ row.rail }}</span>
                      </div>
                    </td>
                    <td class="px-4 py-3.5">
                      <span class="font-body-md text-xs font-medium text-on-surface-variant">{{ row.channel }}</span>
                    </td>
                    <td class="px-4 py-3.5">
                      <span class="inline-flex items-center gap-1 font-label-caps text-[10px] font-bold text-action-green">
                        <span class="material-symbols-outlined text-[14px]">{{ row.complianceIcon }}</span>
                        {{ row.compliance }}
                      </span>
                    </td>
                    <td class="relative px-4 py-3.5 text-right" @click.stop>
                      <button
                        type="button"
                        class="inline-flex h-8 w-8 items-center justify-center rounded-lg text-outline transition hover:bg-surface-container hover:text-on-surface"
                        @click="rowMenuId = rowMenuId === row.id ? null : row.id"
                      >
                        <span class="material-symbols-outlined text-[18px]">more_horiz</span>
                      </button>
                      <div
                        v-if="rowMenuId === row.id && row.beneficiary"
                        class="absolute right-4 z-20 mt-1 min-w-[140px] rounded-xl bg-surface-container-lowest p-1 shadow-lg ring-1 ring-outline-variant/40"
                      >
                        <button
                          v-if="row.beneficiary.verification_status !== 'verified'"
                          type="button"
                          class="block w-full rounded-lg px-3 py-2 text-left text-xs hover:bg-surface-container"
                          :disabled="busyId === row.beneficiary.id"
                          @click="verify(row.beneficiary.id)"
                        >
                          Verify
                        </button>
                        <button
                          v-if="row.beneficiary.verification_status === 'verified' && row.beneficiary.schedule_status === 'draft'"
                          type="button"
                          class="block w-full rounded-lg px-3 py-2 text-left text-xs hover:bg-surface-container"
                          :disabled="busyId === row.beneficiary.id"
                          @click="approve(row.beneficiary.id)"
                        >
                          Approve schedule
                        </button>
                        <button
                          v-if="row.beneficiary.schedule_status === 'approved' && !row.beneficiary.is_locked"
                          type="button"
                          class="block w-full rounded-lg px-3 py-2 text-left text-xs hover:bg-surface-container"
                          :disabled="busyId === row.beneficiary.id"
                          @click="lock(row.beneficiary.id)"
                        >
                          Lock record
                        </button>
                      </div>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div class="mt-2 flex items-center justify-between pt-4 font-label-caps text-xs text-outline">
              <span>
                Showing {{ pagedRows.length }} of {{ ledgerRows.length.toLocaleString() }} recorded
                {{ ledgerTab === 'field' ? 'payments' : 'disbursements' }}
              </span>
              <div class="flex items-center gap-1">
                <button
                  type="button"
                  class="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-surface-container text-on-surface transition-colors hover:bg-surface-container-high disabled:opacity-40"
                  :disabled="page <= 1"
                  @click="page -= 1"
                >
                  <span class="material-symbols-outlined text-[16px]">chevron_left</span>
                </button>
                <span class="px-2 py-1 font-semibold text-on-surface">Page {{ page }} of {{ pageCount }}</span>
                <button
                  type="button"
                  class="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-surface-container text-on-surface transition-colors hover:bg-surface-container-high disabled:opacity-40"
                  :disabled="page >= pageCount"
                  @click="page += 1"
                >
                  <span class="material-symbols-outlined text-[16px]">chevron_right</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        <!-- Right column -->
        <div class="flex flex-col gap-6 lg:col-span-4">
          <div class="flex flex-col rounded-xl bg-surface-container-lowest p-5 shadow-sm sm:p-6">
            <div class="mb-4 flex items-center justify-between">
              <div class="flex flex-col">
                <span class="font-label-caps text-label-caps font-semibold uppercase text-outline">Leadership Capital</span>
                <h3 class="font-headline-md text-lg font-bold text-deep-navy dark:text-pure-white">Pledge Match Engine</h3>
              </div>
              <span class="flex h-8 w-8 items-center justify-center rounded-full bg-electric-pink/10 text-electric-pink">
                <span class="material-symbols-outlined text-[18px]">handshake</span>
              </span>
            </div>

            <div class="relative mb-4 overflow-hidden rounded-xl bg-deep-navy p-4 text-pure-white">
              <div class="mb-2 flex items-start justify-between">
                <div>
                  <span class="font-label-caps text-[10px] font-semibold uppercase tracking-wider text-action-green">Active Disbursement Pool</span>
                  <div class="font-headline-md text-base font-bold text-pure-white">
                    {{ formatNaira(totalApproved) }} Approved Capital
                  </div>
                </div>
                <span class="rounded-full bg-pure-white/10 px-2 py-0.5 font-label-caps text-[10px] font-semibold text-pure-white">
                  {{ matchProgress }}% Released
                </span>
              </div>
              <p class="mb-3 font-body-md text-xs text-on-primary-container">
                Every verified field transfer draws down from the approved cluster assistance pool.
              </p>
              <div class="mb-2 h-2 w-full overflow-hidden rounded-full bg-primary">
                <div class="h-full bg-action-green transition-all" :style="{ width: `${matchProgress}%` }" />
              </div>
              <div class="flex items-center justify-between font-label-caps text-[11px]">
                <span class="font-semibold text-action-green">{{ formatNaira(matchUnlocked) }} Unlocked</span>
                <span class="text-on-primary-container">{{ formatNaira(matchRemaining) }} Remaining</span>
              </div>
            </div>

            <div class="flex flex-col gap-2.5">
              <span class="font-label-caps text-[11px] font-semibold uppercase text-outline">Priority Cultivation Queue</span>
              <p v-if="!cultivationQueue.length" class="rounded-xl bg-surface-container-low p-3 text-xs text-outline">
                All beneficiaries verified, approved, and locked.
              </p>
              <div
                v-for="b in cultivationQueue"
                :key="b.id"
                class="flex items-center justify-between rounded-xl bg-surface-container-low p-3"
              >
                <div class="flex min-w-0 items-center gap-2.5">
                  <div class="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-surface-container-highest text-xs font-bold text-deep-navy dark:text-on-surface">
                    {{ initials(b.name) }}
                  </div>
                  <div class="flex min-w-0 flex-col">
                    <span class="truncate font-headline-md text-xs font-bold text-on-surface">{{ b.name }}</span>
                    <span class="font-label-caps text-[10px] text-outline">
                      Target: {{ formatNaira(b.approved_amount) }} · {{ b.cluster_name || "Unassigned" }}
                    </span>
                  </div>
                </div>
                <span
                  class="shrink-0 rounded-md px-2 py-0.5 font-label-caps text-[10px] font-bold"
                  :class="cultivationBadge(b).cls"
                >
                  {{ cultivationBadge(b).label }}
                </span>
              </div>
            </div>
          </div>

          <div class="flex flex-col rounded-xl bg-surface-container-lowest p-5 shadow-sm sm:p-6">
            <div class="mb-4 flex items-center justify-between">
              <div class="flex flex-col">
                <span class="font-label-caps text-label-caps font-semibold uppercase text-outline">Field Operations</span>
                <h3 class="font-headline-md text-lg font-bold text-deep-navy dark:text-pure-white">Tap-to-Give Cluster Leaders</h3>
              </div>
              <span class="rounded bg-action-green/20 px-2 py-1 font-label-caps text-[10px] font-bold text-deep-navy dark:text-action-green">
                {{ dashboard.total_clusters }} CLUSTERS
              </span>
            </div>
            <div class="flex flex-col gap-3">
              <p v-if="!squadLeaders.length" class="text-xs text-outline">No cluster reports yet.</p>
              <div
                v-for="(c, i) in squadLeaders"
                :key="c.cluster_id"
                class="flex items-center justify-between rounded-xl bg-surface-container-low p-3.5 transition-colors hover:bg-surface-container"
              >
                <div class="flex items-center gap-3">
                  <span
                    class="flex h-6 w-6 items-center justify-center rounded-full font-label-caps text-xs font-bold"
                    :class="i === 0 ? 'bg-action-green text-deep-navy' : 'bg-surface-container-high text-on-surface'"
                  >
                    {{ i + 1 }}
                  </span>
                  <div class="flex flex-col">
                    <span class="font-headline-md text-xs font-bold text-on-surface">{{ c.cluster_name }}</span>
                    <span class="font-label-caps text-[10px] text-outline">{{ squadMeta(c) }}</span>
                  </div>
                </div>
                <div class="text-right">
                  <span class="block font-headline-md text-xs font-bold text-deep-navy dark:text-pure-white">
                    {{ formatNaira(c.disbursed_amount) }}
                  </span>
                  <span class="font-label-caps text-[10px] font-semibold text-action-green">
                    {{ c.completed ? "Complete" : "In progress" }}
                  </span>
                </div>
              </div>
            </div>
            <button
              type="button"
              class="mt-4 inline-flex h-10 w-full items-center justify-center gap-1 rounded-xl bg-surface-container font-button-text text-xs font-semibold text-on-surface transition-colors hover:bg-surface-container-high"
              @click="goFieldOps"
            >
              <span>View field canvassing</span>
              <span class="material-symbols-outlined text-[16px]">arrow_forward</span>
            </button>
          </div>

          <div class="flex flex-col rounded-xl bg-surface-container-lowest p-5 shadow-sm sm:p-6">
            <div class="mb-4 flex items-center justify-between">
              <div class="flex flex-col">
                <span class="font-label-caps text-label-caps font-semibold uppercase text-outline">Integrity Shield</span>
                <h3 class="font-headline-md text-lg font-bold text-deep-navy dark:text-pure-white">Settlement Enclaves</h3>
              </div>
              <span class="material-symbols-outlined text-[20px] text-action-green">verified_user</span>
            </div>
            <div class="flex flex-col gap-3">
              <div class="flex items-center justify-between rounded-xl bg-surface-container-low p-3">
                <div class="flex items-center gap-2.5">
                  <span
                    class="h-2 w-2 rounded-full"
                    :class="dashboard.providers?.paystack || providersMeta?.paystack_configured ? 'bg-action-green' : 'bg-outline'"
                  />
                  <span class="font-headline-md text-xs font-semibold text-on-surface">Paystack Connect Treasury</span>
                </div>
                <span
                  class="font-label-caps text-[10px] font-bold"
                  :class="dashboard.providers?.paystack || providersMeta?.paystack_configured ? 'text-action-green' : 'text-outline'"
                >
                  {{ dashboard.providers?.paystack || providersMeta?.paystack_configured ? "HEALTHY" : "NOT CONFIGURED" }}
                </span>
              </div>
              <div class="flex items-center justify-between rounded-xl bg-surface-container-low p-3">
                <div class="flex items-center gap-2.5">
                  <span
                    class="h-2 w-2 rounded-full"
                    :class="dashboard.providers?.alat || providersMeta?.alat_configured ? 'bg-action-green' : 'bg-outline'"
                  />
                  <span class="font-headline-md text-xs font-semibold text-on-surface">ALAT Instant Pay Pool</span>
                </div>
                <span
                  class="font-label-caps text-[10px] font-bold"
                  :class="dashboard.providers?.alat || providersMeta?.alat_configured ? 'text-action-green' : 'text-outline'"
                >
                  {{ dashboard.providers?.alat || providersMeta?.alat_configured ? "SYNC ACTIVE" : "STANDBY" }}
                </span>
              </div>
              <div class="flex items-center justify-between rounded-xl bg-surface-container-low p-3">
                <div class="flex items-center gap-2.5">
                  <span class="h-2 w-2 rounded-full bg-action-green" />
                  <span class="font-headline-md text-xs font-semibold text-on-surface">Failed Transfer Cap</span>
                </div>
                <span class="font-label-caps text-[10px] font-bold text-deep-navy dark:text-pure-white">
                  {{ dashboard.failed_transactions }} FAILURES
                </span>
              </div>
            </div>
            <div class="mt-4 flex items-center justify-between border-t border-outline-variant/20 pt-3 font-label-caps text-[10px] text-outline">
              <span>Active rail: {{ providerLabel }}</span>
              <button
                v-if="isSuperAdmin && gatewaysConfigured"
                type="button"
                class="inline-flex h-8 items-center rounded-lg px-2 font-semibold text-deep-navy transition hover:bg-surface-container dark:text-action-green"
                @click="setTab('payment-gateways')"
              >
                Manage rails →
              </button>
              <button
                v-else-if="showConfigureGateway"
                type="button"
                class="inline-flex h-8 items-center rounded-lg px-2 font-semibold text-electric-pink transition hover:bg-surface-container"
                @click="setTab('payment-gateways')"
              >
                Configure →
              </button>
            </div>
          </div>
        </div>
      </section>
    </template>
  </div>
</template>
