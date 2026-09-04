<script setup lang="ts">
import {
  formatNaira,
  useDisbursements,
  type Beneficiary,
  type CentralDisbursementDashboard,
} from "~/composables/useDisbursements";
import { useAdminCrm, type AdminCrmSmsDispatchSummary } from "~/composables/useAdminCrm";
import { usePackages, type PackageDistribution } from "~/composables/usePackages";
import { useChapterConfig, type ChapterConfig } from "~/composables/useChapterConfig";

const emit = defineEmits<{
  (e: "error", msg: string): void;
  (e: "message", msg: string): void;
}>();

const { admin, isSuperAdmin } = useAdminAuth();
const { setTab } = useAdminShell();
const { loadCentral, loadBeneficiaries, verifyBeneficiary, approveSchedule, lockBeneficiary } =
  useDisbursements();
const { listSmsDispatches } = useAdminCrm();
const { loadDistributions } = usePackages();
const { loadChapterConfig, saveChapterConfig } = useChapterConfig();

const loading = ref(true);
const saving = ref(false);
const busyId = ref<string | null>(null);
const dashboard = ref<CentralDisbursementDashboard | null>(null);
const beneficiaries = ref<Beneficiary[]>([]);
const dispatches = ref<AdminCrmSmsDispatchSummary[]>([]);
const packages = ref<PackageDistribution[]>([]);
const chapterConfig = ref<ChapterConfig | null>(null);

const frozen = ref(false);
const trancheTarget = ref(0);
const savedTranche = ref(0);
const autonomyThreshold = ref(250_000);
const smsQuotaCap = ref(20_000);
const voterExportRestricted = ref(true);
const envelopeWeights = reactive({
  field: 35,
  media: 20,
  stipend: 18,
  hardware: 12,
  contingency: 15,
});

const chapterState = "Ogun State";
const chapterCode = "CHP-OG: OGUN STATE";
const chapterTitle = "Ogun State Chapter Treasury";

const syncedAt = computed(() => {
  const iso = dashboard.value?.updated_at;
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString(undefined, {
    hour: "2-digit",
    minute: "2-digit",
    day: "numeric",
    month: "short",
  });
});

const totalCap = computed(() => Math.max(dashboard.value?.total_approved_assistance || 0, 1));
const totalUsed = computed(() => dashboard.value?.total_disbursed || 0);
const usedPct = computed(() => Math.min(100, Math.round((totalUsed.value / totalCap.value) * 100)));
const liquidBalance = computed(() => Math.max(0, totalCap.value - totalUsed.value));

const weekBurn = computed(() => {
  const success = dashboard.value?.successful_transactions || 0;
  const avg = success ? totalUsed.value / Math.max(success, 1) : totalUsed.value / 8;
  return Math.round(avg);
});

const runwayWeeks = computed(() => {
  if (!weekBurn.value) return "—";
  return Math.max(1, Math.round(liquidBalance.value / weekBurn.value));
});

const providerVault = computed(() => {
  const p = dashboard.value?.providers;
  if (p?.paystack) return "Paystack Connect Sub-Vault";
  if (p?.alat) return "ALAT Instant Pay Sub-Vault";
  return "Configure payment rails";
});

const sparkHeights = computed(() => {
  const base = [40, 55, 48, 70, 100, 62];
  const scale = Math.min(1.2, Math.max(0.4, usedPct.value / 100 + 0.3));
  return base.map((h) => Math.round(h * scale));
});

type EnvelopeId = "field" | "media" | "stipend" | "hardware" | "contingency";

type Envelope = {
  id: EnvelopeId;
  icon: string;
  title: string;
  badge: string;
  badgeClass: string;
  blurb: string;
  spent: number;
  cap: number;
  weight: number;
  barClass: string;
  limitLabel: string;
  navyIcon?: boolean;
};

const envelopes = computed<Envelope[]>(() => {
  const cap = totalCap.value;
  const spent = totalUsed.value;
  const w = envelopeWeights;
  const fieldCap = Math.round((cap * w.field) / 100);
  const mediaCap = Math.round((cap * w.media) / 100);
  const stipendCap = Math.round((cap * w.stipend) / 100);
  const hardwareCap = Math.round((cap * w.hardware) / 100);
  const contingencyCap = Math.round((cap * w.contingency) / 100);

  const fieldSpent = Math.round((spent * w.field) / 100);
  const mediaSpent = Math.round((spent * w.media) / 100);
  const stipendSpent = Math.round((spent * w.stipend) / 100);
  const hardwareSpent = Math.round((spent * w.hardware) / 100);
  const contingencySpent = Math.round((spent * w.contingency) / 100);

  const pending = beneficiaries.value.filter((b) => !b.is_locked).length;
  const pkgCount = packages.value.reduce((s, p) => s + p.package_count, 0);

  return [
    {
      id: "field",
      icon: "directions_walk",
      title: "Field Operations & Canvassing Turf",
      badge: `Lead: ${admin.value?.name || "HQ"}`,
      badgeClass: "bg-surface-container-lowest text-on-surface-variant shadow-sm",
      blurb: "Door-to-door packets, precinct transport, street rally kits",
      spent: fieldSpent,
      cap: fieldCap || 1,
      weight: w.field,
      barClass: "bg-action-green",
      limitLabel: `AUTONOMOUS LIMIT: ${formatNaira(autonomyThreshold.value)} SINGLE EXPENSE`,
    },
    {
      id: "media",
      icon: "newspaper",
      title: "Local Paid Media & Print Literature",
      badge: "Pre-Clearance Req.",
      badgeClass: "bg-secondary-fixed text-on-secondary-fixed font-semibold",
      blurb: "Ward GOTV flyers, Ogun press inserts, digital ad boosts",
      spent: mediaSpent,
      cap: mediaCap || 1,
      weight: w.media,
      barClass: "bg-electric-pink",
      limitLabel: "AUTONOMOUS LIMIT: ₦500,000 W/ AD COMPLIANCE TAG",
    },
    {
      id: "stipend",
      icon: "badge",
      title: "Precinct Organizer Stipends & Travel",
      badge: "Per-Diem Standard",
      badgeClass: "bg-surface-container-lowest text-on-surface-variant shadow-sm",
      blurb: "Volunteer mileage, ward captains, transit stipends",
      spent: stipendSpent,
      cap: stipendCap || 1,
      weight: w.stipend,
      barClass: "bg-action-green",
      limitLabel: "PER-DIEM CAP: ₦15,000 / DAY PER MOBILIZER",
    },
    {
      id: "hardware",
      icon: "contactless",
      title: "Tap-to-Give Mobile Terminal Hardware",
      badge: `${pkgCount || pending || 0} Units`,
      badgeClass: "bg-surface-container-lowest text-primary font-bold",
      blurb: "Paystack / ALAT card readers, street pop-up battery banks",
      spent: hardwareSpent,
      cap: hardwareCap || 1,
      weight: w.hardware,
      barClass: "bg-action-green",
      limitLabel: "FIRMWARE FLEET: 100% ENCRYPTED",
    },
    {
      id: "contingency",
      icon: "emergency",
      title: "Emergency Rapid Response Contingency",
      badge: "2FA Mandatory",
      badgeClass: "bg-error-container text-error font-bold",
      blurb: "Immediate legal injunction defense, crisis refutations, flash assemblies",
      spent: contingencySpent,
      cap: contingencyCap || 1,
      weight: w.contingency,
      barClass: "bg-outline",
      limitLabel: "REQUIRES 2 OF 3 SECURITY TRUSTEE KEYS",
      navyIcon: true,
    },
  ];
});

const weightTotal = computed(
  () =>
    envelopeWeights.field +
    envelopeWeights.media +
    envelopeWeights.stipend +
    envelopeWeights.hardware +
    envelopeWeights.contingency,
);

const trancheMin = computed(() => Math.round(totalUsed.value || totalCap.value * 0.7));
const trancheMax = computed(() => Math.round(totalCap.value * 1.25) || trancheMin.value + 1);
const headroom = computed(() => Math.max(0, trancheMax.value - trancheMin.value));

const pendingQueue = computed(() => {
  const pending = beneficiaries.value.filter(
    (b) => b.verification_status !== "verified" || b.schedule_status === "draft" || !b.is_locked,
  );
  const autoCleared = beneficiaries.value
    .filter((b) => b.is_locked && b.payment_status !== "pending")
    .slice(0, 2);
  return { pending: pending.slice(0, 4), autoCleared };
});

const smsQuota = computed(() => {
  const used = dispatches.value.reduce((s, d) => s + (d.queued || 0), 0);
  const cap = Math.max(smsQuotaCap.value, used);
  return { used, cap, pct: Math.min(100, Math.round((used / Math.max(cap, 1)) * 100)) };
});

const signatories = computed(() => {
  const list: Array<{ initials: string; name: string; role: string; key: string; tone: string }> = [];
  if (admin.value) {
    list.push({
      initials: initials(admin.value.name),
      name: admin.value.name,
      role: isSuperAdmin.value ? "Lead Organizer · Primary Key" : "Ogun State Admin · Primary Key",
      key: "SESSION",
      tone: "bg-secondary text-pure-white",
    });
  }
  const verified = beneficiaries.value.filter((b) => b.verification_status === "verified").slice(0, 2);
  for (const [i, b] of verified.entries()) {
    list.push({
      initials: initials(b.name),
      name: b.name,
      role: i === 0 ? "Regional Treasurer · Co-Signer" : "Compliance Custodian · Electoral Liaison",
      key: i === 0 ? "TOTP 2FA" : "AUDITOR",
      tone: i === 0 ? "bg-action-green text-tertiary" : "bg-deep-navy text-pure-white",
    });
  }
  while (list.length < 2) {
    list.push({
      initials: "OG",
      name: "Ogun Custody Desk",
      role: "Chapter Co-Signer · Standby",
      key: "ENCLAVE",
      tone: "bg-deep-navy text-pure-white",
    });
  }
  return list.slice(0, 3);
});

const auditTrail = computed(() => {
  const rows = dashboard.value?.recent_audit ?? [];
  if (rows.length) {
    return rows.slice(0, 5).map((a) => ({
      id: a.id,
      icon: auditIcon(a.action),
      tone: a.action.includes("fail") ? "bg-error-container text-error" : "bg-surface-container text-primary",
      title: formatAuditTitle(a.action, a.amount, a.actor_name),
      when: formatAuditWhen(a.created_at),
    }));
  }
  return [
    {
      id: "empty",
      icon: "history",
      tone: "bg-surface-container text-primary",
      title: "Awaiting first Ogun chapter treasury event",
      when: "LIVE · PULSE LOG",
    },
  ];
});

function applyConfig(cfg: ChapterConfig) {
  chapterConfig.value = cfg;
  frozen.value = cfg.frozen;
  autonomyThreshold.value = cfg.autonomy_threshold;
  smsQuotaCap.value = cfg.sms_quota_cap;
  voterExportRestricted.value = cfg.voter_export_restricted;
  envelopeWeights.field = cfg.envelope_field_pct;
  envelopeWeights.media = cfg.envelope_media_pct;
  envelopeWeights.stipend = cfg.envelope_stipend_pct;
  envelopeWeights.hardware = cfg.envelope_hardware_pct;
  envelopeWeights.contingency = cfg.envelope_contingency_pct;
}

onMounted(() => void refresh());

async function refresh() {
  loading.value = true;
  try {
    const [d, bens, sms, pkgs, cfg] = await Promise.all([
      loadCentral(),
      loadBeneficiaries(),
      listSmsDispatches().catch(() => [] as AdminCrmSmsDispatchSummary[]),
      loadDistributions().catch(() => [] as PackageDistribution[]),
      loadChapterConfig(),
    ]);
    dashboard.value = d;
    beneficiaries.value = bens;
    dispatches.value = sms;
    packages.value = pkgs;
    applyConfig(cfg);
    const min = Math.round(d.total_disbursed || d.total_approved_assistance * 0.7 || 0);
    const max = Math.round((d.total_approved_assistance || min || 1) * 1.25);
    const saved = cfg.tranche_target > 0 ? cfg.tranche_target : Math.round((min + max) / 2);
    trancheTarget.value = Math.min(max, Math.max(min, saved));
    savedTranche.value = trancheTarget.value;
  } catch {
    emit("error", "Failed to load Ogun chapter treasury.");
  } finally {
    loading.value = false;
  }
}

function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function pct(spent: number, cap: number) {
  if (!cap) return 0;
  return Math.min(100, Math.round((spent / cap) * 1000) / 10);
}

function remainingLabel(spent: number, cap: number) {
  const left = Math.max(0, cap - spent);
  if (spent <= 0) return `${formatNaira(cap)} (100% UNTOUCHED)`;
  return `${formatNaira(left)} REMAINING`;
}

function remainingClass(spent: number, cap: number) {
  const p = pct(spent, cap);
  if (p >= 80) return "text-electric-pink";
  return "text-action-green";
}

function auditIcon(action: string) {
  if (action.includes("verify")) return "verified";
  if (action.includes("approve")) return "check_circle";
  if (action.includes("lock")) return "lock";
  if (action.includes("pay") || action.includes("disburse")) return "payments";
  if (action.includes("fail")) return "flag";
  return "history_edu";
}

function formatAuditTitle(action: string, amount: number | null, actor: string) {
  const label = action.replace(/_/g, " ");
  const money = amount != null ? ` ${formatNaira(amount)}` : "";
  return `${label}${money} · ${actor}`;
}

function formatAuditWhen(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return (
    d.toLocaleString(undefined, {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }) + " · PULSE LOG"
  );
}

function exportLedger() {
  const d = dashboard.value;
  if (!d?.recent_audit?.length) {
    emit("error", "No audit rows to export yet.");
    return;
  }
  const lines = [
    "created_at,action,actor,amount,beneficiary_id,payment_id",
    ...d.recent_audit.map((a) =>
      [
        a.created_at,
        a.action,
        JSON.stringify(a.actor_name),
        a.amount ?? "",
        a.beneficiary_id ?? "",
        a.payment_id ?? "",
      ].join(","),
    ),
  ];
  const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `ogun-chapter-audit-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
  emit("message", "Ogun chapter audit ledger exported.");
}

async function persistConfig(patch: Parameters<typeof saveChapterConfig>[0], okMsg: string) {
  saving.value = true;
  try {
    const cfg = await saveChapterConfig(patch);
    applyConfig(cfg);
    emit("message", okMsg);
  } catch (e: unknown) {
    emit("error", e instanceof Error ? e.message : "Failed to save chapter config.");
  } finally {
    saving.value = false;
  }
}

async function toggleFreeze() {
  const next = !frozen.value;
  await persistConfig(
    { frozen: next },
    next
      ? "Emergency freeze engaged — Ogun chapter disbursements paused."
      : "Emergency freeze lifted for Ogun chapter.",
  );
}

async function authorizeTranche() {
  if (frozen.value) {
    emit("error", "Chapter is frozen. Lift the emergency freeze before authorizing.");
    return;
  }
  await persistConfig(
    { tranche_target: Math.round(trancheTarget.value) },
    `Tranche target saved at ${formatNaira(trancheTarget.value)}. Opening Fundraising Command…`,
  );
  savedTranche.value = trancheTarget.value;
  setTab("disbursements");
}

async function saveEnvelopeAllocation() {
  if (frozen.value) {
    emit("error", "Chapter is frozen.");
    return;
  }
  if (weightTotal.value !== 100) {
    emit("error", `Envelope weights must total 100% (currently ${weightTotal.value}%).`);
    return;
  }
  await persistConfig(
    {
      tranche_target: Math.round(trancheTarget.value),
      envelope_field_pct: envelopeWeights.field,
      envelope_media_pct: envelopeWeights.media,
      envelope_stipend_pct: envelopeWeights.stipend,
      envelope_hardware_pct: envelopeWeights.hardware,
      envelope_contingency_pct: envelopeWeights.contingency,
      autonomy_threshold: Math.round(autonomyThreshold.value),
      sms_quota_cap: Math.round(smsQuotaCap.value),
      voter_export_restricted: voterExportRestricted.value,
    },
    `Saved Ogun envelope allocation · tranche ${formatNaira(trancheTarget.value)}.`,
  );
  savedTranche.value = trancheTarget.value;
}

function reweightAll() {
  envelopeWeights.field = 35;
  envelopeWeights.media = 20;
  envelopeWeights.stipend = 18;
  envelopeWeights.hardware = 12;
  envelopeWeights.contingency = 15;
  trancheTarget.value = Math.round((trancheMin.value + trancheMax.value) / 2);
  emit("message", "Envelope weights reset to balanced Ogun defaults. Click Save to persist.");
}

async function saveAutonomySettings() {
  if (frozen.value) {
    emit("error", "Chapter is frozen.");
    return;
  }
  await persistConfig(
    {
      autonomy_threshold: Math.round(autonomyThreshold.value),
      sms_quota_cap: Math.round(smsQuotaCap.value),
      voter_export_restricted: voterExportRestricted.value,
    },
    "Autonomy matrix saved for Ogun chapter.",
  );
}

async function signBeneficiary(b: Beneficiary) {
  if (frozen.value) {
    emit("error", "Chapter is frozen.");
    return;
  }
  busyId.value = b.id;
  try {
    if (b.verification_status !== "verified") {
      await verifyBeneficiary(b.id);
      emit("message", `Verified ${b.name}.`);
    } else if (b.schedule_status === "draft") {
      await approveSchedule(b.id);
      emit("message", `Approved schedule for ${b.name}.`);
    } else if (!b.is_locked) {
      await lockBeneficiary(b.id);
      emit("message", `Locked ${b.name} for field payment.`);
    }
    await refresh();
  } catch (e: unknown) {
    emit("error", e instanceof Error ? e.message : "Authorization failed.");
  } finally {
    busyId.value = null;
  }
}

function queueStatus(b: Beneficiary) {
  if (b.verification_status !== "verified") return { label: "Awaiting verification", cls: "text-secondary font-semibold" };
  if (b.schedule_status === "draft") return { label: "Awaiting 2nd signature", cls: "text-secondary font-semibold" };
  if (!b.is_locked) return { label: "Compliant · Ready to lock", cls: "text-action-green font-semibold" };
  return { label: "Locked", cls: "text-action-green font-semibold" };
}

function queueActionLabel(b: Beneficiary) {
  if (b.verification_status !== "verified") return "Approve First Key";
  if (b.schedule_status === "draft") return "Sign & Disburse";
  if (!b.is_locked) return "Lock Record";
  return "Done";
}

function queueIcon(b: Beneficiary) {
  if (b.approved_amount >= 500_000) return "print";
  if (b.approved_amount >= 200_000) return "holiday_village";
  return "ads_click";
}

const runwayImpact = computed(() => {
  const delta = trancheTarget.value - savedTranche.value;
  if (!weekBurn.value) return "—";
  const weeks = (delta / weekBurn.value).toFixed(1);
  const sign = Number(weeks) >= 0 ? "+" : "";
  return `${sign}${weeks} weeks`;
});
</script>

<template>
  <div class="flex w-full flex-col pb-16">
    <!-- Breadcrumb -->
    <div class="mb-2 flex flex-col justify-between gap-4 py-4 md:flex-row md:items-center">
      <div class="flex flex-wrap items-center gap-2">
        <span class="font-label-caps text-on-surface-variant">HQ CENTRAL COMMAND</span>
        <span class="font-label-caps text-outline-variant">/</span>
        <span class="font-label-caps text-on-surface-variant">OGUN OPERATIONS</span>
        <span class="font-label-caps text-outline-variant">/</span>
        <span class="font-label-caps font-semibold text-primary">CHAPTER BUDGET &amp; CONFIG</span>
        <div class="ml-1 flex items-center gap-1.5 rounded bg-surface-container-high px-2 py-0.5">
          <span class="h-1.5 w-1.5 rounded-full bg-action-green" />
          <span class="font-label-caps text-xs font-semibold text-primary">{{ chapterCode }}</span>
        </div>
      </div>
      <div class="flex flex-wrap items-center gap-3">
        <div class="flex items-center gap-2 rounded-full bg-surface-container-low px-3 py-1 shadow-sm">
          <span class="material-symbols-outlined text-[16px] text-action-green">verified_user</span>
          <span class="font-label-caps text-[11px] font-medium text-on-surface">
            OGUN TREASURY · {{ frozen ? "FROZEN" : "ACTIVE" }}
          </span>
        </div>
        <span class="font-label-caps text-xs text-outline">SYNCED {{ syncedAt }}</span>
      </div>
    </div>

    <!-- Header -->
    <div class="flex flex-col justify-between gap-6 pb-6 xl:flex-row xl:items-end">
      <div class="max-w-3xl">
        <div class="mb-2 flex flex-wrap items-center gap-3">
          <span class="rounded-full bg-primary px-2.5 py-0.5 font-label-caps text-[11px] uppercase tracking-wider text-pure-white">
            Ogun State Hub
          </span>
          <span class="rounded-full bg-secondary-fixed px-2.5 py-0.5 font-label-caps text-[11px] font-medium text-on-secondary-fixed">
            Dual-Custody Active
          </span>
          <span
            v-if="frozen"
            class="rounded-full bg-error-container px-2.5 py-0.5 font-label-caps text-[11px] font-bold text-error"
          >
            Emergency Freeze On
          </span>
        </div>
        <h1 class="font-headline-lg text-2xl tracking-tight text-primary sm:text-headline-md lg:text-[40px] lg:leading-[48px]">
          {{ chapterTitle }}
        </h1>
        <p class="mt-1.5 font-body-md leading-relaxed text-on-surface-variant">
          Ogun chapter financial controls — budget envelopes, dual-custody authorization, SMS quota, and autonomy guardrails.
        </p>
      </div>
      <div class="grid w-full grid-cols-1 gap-2 sm:grid-cols-3 xl:w-auto xl:shrink-0">
        <button
          type="button"
          class="inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-surface-container-lowest px-4 font-button-text text-sm font-semibold text-primary shadow-sm transition hover:bg-surface-container-low"
          @click="exportLedger"
        >
          <span class="material-symbols-outlined shrink-0 text-[18px] text-outline">download</span>
          <span class="truncate">Audit Ledger</span>
        </button>
        <button
          type="button"
          class="inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl px-4 font-button-text text-sm font-semibold shadow-sm transition disabled:opacity-60"
          :class="frozen ? 'bg-action-green/20 text-deep-navy' : 'bg-error-container/40 text-error hover:bg-error hover:text-on-error'"
          :disabled="saving"
          @click="toggleFreeze"
        >
          <span class="material-symbols-outlined shrink-0 text-[18px]">lock_reset</span>
          <span class="truncate">{{ frozen ? "Lift Freeze" : "Emergency Freeze" }}</span>
        </button>
        <button
          type="button"
          class="inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-electric-pink px-4 font-button-text text-sm font-semibold text-pure-white shadow-sm shadow-electric-pink/25 transition hover:opacity-95 disabled:opacity-60"
          :disabled="saving || frozen"
          @click="authorizeTranche"
        >
          <span class="material-symbols-outlined shrink-0 text-[18px]">add_task</span>
          <span class="truncate">Authorize Tranche</span>
        </button>
      </div>
    </div>

    <div v-if="loading && !dashboard" class="rounded-2xl bg-surface-container-lowest p-10 text-center text-sm text-outline shadow-sm">
      Loading chapter treasury…
    </div>

    <template v-else-if="dashboard">
      <!-- KPI strip -->
      <div class="mb-8 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        <div class="flex flex-col justify-between rounded-2xl bg-surface-container-lowest p-5 shadow-sm">
          <div>
            <div class="mb-3 flex items-center justify-between">
              <span class="font-label-caps text-on-surface-variant">TOTAL ALLOCATION &amp; CAP</span>
              <span class="rounded bg-surface-container px-2 py-0.5 font-label-caps text-xs font-semibold text-primary">
                {{ usedPct }}% USED
              </span>
            </div>
            <div class="mb-2 flex items-baseline gap-1.5">
              <span class="font-headline-md text-2xl font-bold tracking-tight text-primary sm:text-[28px]">
                {{ formatNaira(totalUsed) }}
              </span>
              <span class="font-body-md text-outline">/ {{ formatNaira(totalCap) }}</span>
            </div>
            <div class="h-2 w-full overflow-hidden rounded-full bg-surface-container-high">
              <div class="h-full rounded-full bg-primary transition-all duration-500" :style="{ width: `${usedPct}%` }" />
            </div>
          </div>
          <div class="mt-4 flex items-center justify-between pt-3">
            <span class="font-label-caps font-semibold text-action-green">
              {{ formatNaira(liquidBalance) }} headroom
            </span>
            <span class="material-symbols-outlined text-[16px] text-outline">pie_chart</span>
          </div>
        </div>

        <div class="flex flex-col justify-between rounded-2xl bg-surface-container-lowest p-5 shadow-sm">
          <div>
            <div class="mb-3 flex items-center justify-between">
              <span class="font-label-caps text-on-surface-variant">LIVE LIQUID OPERATING TREASURY</span>
              <span class="inline-flex items-center gap-1 rounded-full bg-action-green/15 px-2 py-0.5 font-label-caps text-[10px] font-bold text-tertiary-container">
                <span class="h-1.5 w-1.5 animate-ping rounded-full bg-action-green" />
                {{ frozen ? "FROZEN" : "HEALTHY" }}
              </span>
            </div>
            <div class="mb-2 flex items-baseline gap-2">
              <span class="font-headline-md text-2xl font-bold tracking-tight text-primary sm:text-[28px]">
                {{ formatNaira(liquidBalance) }}
              </span>
              <span class="font-label-caps text-xs text-outline">AVAILABLE CASH</span>
            </div>
            <div class="flex items-center gap-1.5 rounded-lg bg-surface-container-low px-2 py-1">
              <span class="material-symbols-outlined text-[14px] text-outline">account_balance</span>
              <span class="font-label-caps text-[11px] text-on-surface-variant">{{ providerVault }}</span>
            </div>
          </div>
          <div class="mt-4 flex items-center justify-between pt-3">
            <span class="font-body-md text-xs text-on-surface-variant">
              {{ dashboard.pending_transactions }} pending · {{ dashboard.successful_transactions }} settled
            </span>
            <span class="material-symbols-outlined text-[18px] text-action-green">payments</span>
          </div>
        </div>

        <div class="flex flex-col justify-between rounded-2xl bg-surface-container-lowest p-5 shadow-sm">
          <div>
            <div class="mb-3 flex items-center justify-between">
              <span class="font-label-caps text-on-surface-variant">SPENDING VELOCITY &amp; BURN</span>
              <span class="font-label-caps text-xs font-semibold text-electric-pink">ON SCHEDULE</span>
            </div>
            <div class="mb-2 flex items-baseline gap-1.5">
              <span class="font-headline-md text-2xl font-bold tracking-tight text-primary sm:text-[28px]">
                {{ formatNaira(weekBurn) }}
              </span>
              <span class="font-body-md text-outline">/ txn avg</span>
            </div>
            <div class="flex h-6 items-end gap-1.5 pt-1">
              <div
                v-for="(h, i) in sparkHeights"
                :key="i"
                class="w-full rounded-t"
                :class="i === sparkHeights.length - 2 ? 'bg-electric-pink' : i === sparkHeights.length - 1 ? 'bg-primary' : 'bg-surface-container-high'"
                :style="{ height: `${h}%` }"
              />
            </div>
          </div>
          <div class="mt-4 flex items-center justify-between pt-3">
            <span class="font-label-caps font-semibold text-primary">
              {{ runwayWeeks }} WEEKS RUNWAY REMAINING
            </span>
            <span class="material-symbols-outlined text-[16px] text-outline">speed</span>
          </div>
        </div>

        <div class="flex flex-col justify-between rounded-2xl bg-deep-navy p-5 text-on-primary shadow-sm">
          <div>
            <div class="mb-3 flex items-center justify-between">
              <span class="font-label-caps text-primary-fixed-dim">COMPLIANCE STATUTORY STATUS</span>
              <span class="rounded bg-primary px-2 py-0.5 font-label-caps text-[10px] font-bold text-action-green">EC TIER 1</span>
            </div>
            <div class="mb-2 font-headline-md text-[20px] font-bold tracking-tight text-pure-white">
              Dual-Signatory Mandate
            </div>
            <div class="mt-2 flex items-center gap-2">
              <div class="flex -space-x-2">
                <div
                  v-for="s in signatories.slice(0, 2)"
                  :key="s.name"
                  class="flex h-7 w-7 items-center justify-center rounded-full font-label-caps text-[10px] font-bold"
                  :class="s.tone"
                >
                  {{ s.initials }}
                </div>
              </div>
              <span class="font-label-caps text-xs text-primary-fixed-dim">
                {{ signatories.slice(0, 2).map((s) => s.name.split(" ")[0]).join(" & ") }} (Active)
              </span>
            </div>
          </div>
          <div class="mt-4 flex items-center justify-between pt-3 text-primary-fixed-dim">
            <span class="font-label-caps text-[11px]">
              Clusters: {{ dashboard.clusters_completed }}/{{ dashboard.total_clusters }} complete
            </span>
            <span class="material-symbols-outlined text-[18px] text-action-green">verified</span>
          </div>
        </div>
      </div>

      <!-- Workspace -->
      <div class="grid grid-cols-1 gap-8 lg:grid-cols-12">
        <div class="flex flex-col gap-8 lg:col-span-8">
          <!-- Envelopes -->
          <div class="rounded-2xl bg-surface-container-lowest p-6 shadow-sm">
            <div class="flex flex-col justify-between gap-4 pb-5 sm:flex-row sm:items-center">
              <div>
                <div class="flex flex-wrap items-center gap-2">
                  <h2 class="font-headline-md text-xl font-bold text-primary">Territorial Budget Envelopes</h2>
                  <span class="rounded-full bg-surface-container-high px-2 py-0.5 font-label-caps text-[10px] font-bold text-on-surface-variant">
                    {{ envelopes.length }} CATEGORIES
                  </span>
                </div>
                <p class="mt-0.5 font-body-md text-sm text-on-surface-variant">
                  Fine-tuned autonomy ceilings for regional field mobilization, procurement, and precinct teams.
                </p>
              </div>
              <button
                type="button"
                class="flex shrink-0 items-center gap-1.5 rounded-lg bg-surface-container px-3 py-1.5 font-label-caps text-xs text-on-surface transition-colors hover:bg-surface-container-high"
                @click="reweightAll"
              >
                <span class="material-symbols-outlined text-[16px]">tune</span>
                Re-weight All
              </button>
            </div>

            <div class="flex flex-col gap-4">
              <div
                v-for="env in envelopes"
                :key="env.id"
                class="rounded-xl bg-surface-container-low p-4 transition-all hover:bg-surface-container"
              >
                <div class="mb-2 flex flex-col justify-between gap-2 sm:flex-row sm:items-center">
                  <div class="flex items-center gap-3">
                    <div
                      class="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-pure-white"
                      :class="env.navyIcon ? 'bg-deep-navy' : 'bg-primary'"
                    >
                      <span class="material-symbols-outlined text-[18px]">{{ env.icon }}</span>
                    </div>
                    <div>
                      <div class="flex flex-wrap items-center gap-2">
                        <span class="font-headline-md text-base font-bold text-primary">{{ env.title }}</span>
                        <span class="rounded px-1.5 py-0.5 font-label-caps text-[10px]" :class="env.badgeClass">
                          {{ env.badge }}
                        </span>
                      </div>
                      <span class="font-body-md text-xs text-on-surface-variant">{{ env.blurb }}</span>
                    </div>
                  </div>
                  <div class="shrink-0 text-right">
                    <div class="font-headline-md text-base font-bold text-primary">
                      {{ formatNaira(env.spent) }}
                      <span class="font-body-md text-xs font-normal text-outline">/ {{ formatNaira(env.cap) }}</span>
                    </div>
                    <span class="font-label-caps text-xs font-semibold" :class="remainingClass(env.spent, env.cap)">
                      {{ remainingLabel(env.spent, env.cap) }}
                    </span>
                  </div>
                </div>
                <div class="my-2 h-2 w-full overflow-hidden rounded-full bg-surface-container-high">
                  <div class="h-full rounded-full" :class="env.barClass" :style="{ width: `${pct(env.spent, env.cap)}%` }" />
                </div>
                <div class="flex flex-wrap items-center justify-between gap-2 pt-1 text-xs text-on-surface-variant">
                  <span class="font-label-caps">{{ env.limitLabel }}</span>
                  <label class="inline-flex items-center gap-1.5 font-label-caps text-outline">
                    Weight
                    <input
                      v-model.number="envelopeWeights[env.id]"
                      type="number"
                      min="0"
                      max="100"
                      class="w-14 rounded-lg bg-surface-container-lowest px-2 py-1 text-right text-xs font-bold text-primary outline-none disabled:opacity-50"
                      :disabled="frozen"
                    />
                    %
                  </label>
                </div>
              </div>
            </div>

            <div class="mt-6 flex flex-col gap-4 rounded-xl bg-surface-container-high p-5">
              <div class="flex flex-col justify-between gap-2 sm:flex-row sm:items-center">
                <div>
                  <span class="font-label-caps font-bold text-primary">OGUN MOBILIZATION TRANCHE</span>
                  <p class="mt-0.5 font-body-md text-xs text-on-surface-variant">
                    Tune Ogun spend headroom against the approved assistance pool.
                    Weights total:
                    <strong :class="weightTotal === 100 ? 'text-action-green' : 'text-error'">{{ weightTotal }}%</strong>
                  </p>
                </div>
                <span class="self-start rounded bg-surface-container-lowest px-2.5 py-1 font-label-caps text-xs font-bold text-primary shadow-sm sm:self-auto">
                  Headroom: +{{ formatNaira(headroom) }}
                </span>
              </div>
              <div class="flex items-center gap-4">
                <span class="shrink-0 font-label-caps text-xs text-outline">{{ formatNaira(trancheMin) }}</span>
                <input
                  v-model.number="trancheTarget"
                  class="h-2 w-full cursor-pointer appearance-none rounded-lg bg-surface-container-lowest accent-electric-pink"
                  type="range"
                  :min="trancheMin"
                  :max="trancheMax"
                  :step="Math.max(1000, Math.round((trancheMax - trancheMin) / 50))"
                  :disabled="frozen"
                />
                <span class="shrink-0 font-label-caps text-xs font-bold text-primary">
                  {{ formatNaira(trancheTarget) }} Target
                </span>
              </div>
              <div class="flex flex-wrap items-center justify-between gap-2 pt-1">
                <span class="font-label-caps text-xs text-on-surface-variant">
                  Projected runway impact:
                  <strong class="text-primary">{{ runwayImpact }}</strong>
                </span>
                <button
                  type="button"
                  class="inline-flex h-9 items-center rounded-xl bg-primary px-4 font-button-text text-xs font-semibold text-pure-white shadow-sm transition hover:bg-deep-navy disabled:opacity-50"
                  :disabled="frozen || saving"
                  @click="saveEnvelopeAllocation"
                >
                  {{ saving ? "Saving…" : "Save Envelope Allocation" }}
                </button>
              </div>
            </div>
          </div>

          <!-- Dual-signatory queue -->
          <div class="rounded-2xl bg-surface-container-lowest p-6 shadow-sm">
            <div class="flex flex-col justify-between gap-4 pb-5 sm:flex-row sm:items-center">
              <div>
                <div class="flex items-center gap-2">
                  <h2 class="font-headline-md text-xl font-bold text-primary">Dual-Signatory Authorization Queue</h2>
                  <span
                    v-if="pendingQueue.pending.length"
                    class="h-2 w-2 animate-pulse rounded-full bg-electric-pink"
                  />
                </div>
                <p class="mt-0.5 font-body-md text-sm text-on-surface-variant">
                  High-value disbursements requiring multi-sig execution before automated bank dispatch.
                </p>
              </div>
              <span class="self-start rounded-full bg-secondary-fixed px-2.5 py-1 font-label-caps text-xs font-semibold text-on-secondary-fixed sm:self-auto">
                {{ pendingQueue.pending.length }} PENDING REVIEW
              </span>
            </div>

            <div v-if="!pendingQueue.pending.length && !pendingQueue.autoCleared.length" class="rounded-xl bg-surface-container-low p-4 text-xs text-outline">
              No pending authorizations — all beneficiaries verified, approved, and locked.
            </div>

            <div class="flex flex-col gap-3">
              <div
                v-for="b in pendingQueue.pending"
                :key="b.id"
                class="flex flex-col justify-between gap-4 rounded-xl bg-surface-container-low p-4 transition-shadow hover:shadow-sm md:flex-row md:items-center"
              >
                <div class="flex items-start gap-3.5">
                  <div
                    class="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl"
                    :class="b.approved_amount >= 500_000 ? 'bg-secondary-fixed text-secondary' : 'bg-surface-container-high text-primary'"
                  >
                    <span class="material-symbols-outlined text-[20px]">{{ queueIcon(b) }}</span>
                  </div>
                  <div>
                    <div class="flex flex-wrap items-center gap-2">
                      <span class="font-headline-md text-base font-bold text-primary">{{ b.name }}</span>
                      <span class="rounded bg-surface-container-high px-2 py-0.5 font-label-caps text-[10px] text-on-surface-variant">
                        {{ b.cluster_name || b.reference_code }}
                      </span>
                    </div>
                    <div class="mt-1 flex flex-wrap items-center gap-3 font-body-md text-xs text-on-surface-variant">
                      <span>
                        Bank: <strong class="text-on-surface">{{ b.bank_name }}</strong>
                      </span>
                      <span>•</span>
                      <span>Ref: {{ b.reference_code }}</span>
                      <span>•</span>
                      <span class="font-label-caps" :class="queueStatus(b).cls">{{ queueStatus(b).label }}</span>
                    </div>
                  </div>
                </div>
                <div class="flex shrink-0 flex-row items-center justify-between gap-2 pt-2 md:flex-col md:items-end md:justify-center md:pt-0">
                  <span class="font-headline-md text-lg font-bold text-primary">{{ formatNaira(b.approved_amount) }}</span>
                  <div class="flex items-center gap-1.5">
                    <button
                      type="button"
                      class="rounded-lg bg-surface-container px-2.5 py-1.5 font-label-caps text-xs text-on-surface transition-colors hover:bg-surface-container-high"
                      @click="setTab('disbursements')"
                    >
                      Review Proof
                    </button>
                    <button
                      type="button"
                      class="flex items-center gap-1 rounded-lg bg-electric-pink px-3 py-1.5 font-button-text text-xs text-pure-white shadow-sm transition-all hover:bg-secondary disabled:opacity-50"
                      :disabled="frozen || busyId === b.id || (b.is_locked && b.schedule_status === 'approved')"
                      @click="signBeneficiary(b)"
                    >
                      <span class="material-symbols-outlined text-[14px]">draw</span>
                      {{ busyId === b.id ? "…" : queueActionLabel(b) }}
                    </button>
                  </div>
                </div>
              </div>

              <div
                v-for="b in pendingQueue.autoCleared"
                :key="`auto-${b.id}`"
                class="flex flex-col justify-between gap-4 rounded-xl bg-surface-container-low/60 p-4 opacity-75 md:flex-row md:items-center"
              >
                <div class="flex items-start gap-3.5">
                  <div class="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-surface-container-high text-outline">
                    <span class="material-symbols-outlined text-[20px]">ads_click</span>
                  </div>
                  <div>
                    <div class="flex flex-wrap items-center gap-2">
                      <span class="font-headline-md text-base font-bold text-on-surface">{{ b.name }}</span>
                      <span class="rounded bg-surface-container-high px-2 py-0.5 font-label-caps text-[10px] text-on-surface-variant">
                        {{ b.cluster_name || "Cluster" }}
                      </span>
                    </div>
                    <div class="mt-1 flex flex-wrap items-center gap-3 font-body-md text-xs text-on-surface-variant">
                      <span>Authorized by Policy</span>
                      <span>•</span>
                      <span>Direct settlement</span>
                      <span>•</span>
                      <span class="font-label-caps font-semibold text-action-green">
                        Auto-Cleared (Under {{ formatNaira(autonomyThreshold) }} Cap)
                      </span>
                    </div>
                  </div>
                </div>
                <div class="flex shrink-0 flex-row items-center justify-between gap-1 pt-2 md:flex-col md:items-end md:justify-center md:pt-0">
                  <span class="font-headline-md text-base font-medium text-on-surface-variant">
                    {{ formatNaira(b.approved_amount) }}
                  </span>
                  <span class="font-label-caps text-[11px] text-outline">{{ b.payment_status.toUpperCase() }}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Right column -->
        <div class="flex flex-col gap-8 lg:col-span-4">
          <div class="rounded-2xl bg-surface-container-lowest p-6 shadow-sm">
            <div class="flex items-center justify-between pb-4">
              <h2 class="font-headline-md text-lg font-bold text-primary">Autonomy Matrix</h2>
              <span class="material-symbols-outlined text-[20px] text-outline">admin_panel_settings</span>
            </div>
            <div class="flex flex-col gap-4">
              <div class="rounded-xl bg-surface-container-low p-3.5">
                <div class="mb-1.5 flex items-center justify-between gap-2">
                  <span class="font-label-caps text-xs font-bold text-primary">LOCAL AUTONOMOUS THRESHOLD</span>
                  <input
                    v-model.number="autonomyThreshold"
                    type="number"
                    min="0"
                    step="1000"
                    class="w-28 rounded-lg bg-surface-container-lowest px-2 py-1 text-right text-xs font-bold text-primary outline-none disabled:opacity-50"
                    :disabled="frozen"
                  />
                </div>
                <p class="font-body-md text-xs text-on-surface-variant">
                  Disbursements below this amount require only single organizer approval.
                </p>
              </div>
              <div class="rounded-xl bg-surface-container-low p-3.5">
                <div class="mb-1.5 flex items-center justify-between">
                  <span class="font-label-caps text-xs font-bold text-primary">VOTER EXPORT PERMISSION</span>
                  <button
                    type="button"
                    class="rounded px-2 py-0.5 font-label-caps text-[10px] font-bold transition"
                    :class="voterExportRestricted ? 'bg-error-container text-error' : 'bg-action-green/20 text-deep-navy'"
                    :disabled="frozen"
                    @click="voterExportRestricted = !voterExportRestricted"
                  >
                    {{ voterExportRestricted ? "RESTRICTED" : "ALLOWED" }}
                  </button>
                </div>
                <p class="font-body-md text-xs text-on-surface-variant">
                  When restricted, only redacted field sheets are permitted — raw voter CSV export is blocked.
                </p>
              </div>
              <div class="rounded-xl bg-surface-container-low p-3.5">
                <div class="mb-1 flex items-center justify-between gap-2">
                  <span class="font-label-caps text-xs font-bold text-primary">LOCAL SMS BROADCAST QUOTA</span>
                  <input
                    v-model.number="smsQuotaCap"
                    type="number"
                    min="0"
                    step="100"
                    class="w-24 rounded-lg bg-surface-container-lowest px-2 py-1 text-right text-xs font-bold text-primary outline-none disabled:opacity-50"
                    :disabled="frozen"
                  />
                </div>
                <div class="my-1.5 h-1.5 w-full overflow-hidden rounded-full bg-surface-container-high">
                  <div class="h-full rounded-full bg-primary" :style="{ width: `${smsQuota.pct}%` }" />
                </div>
                <p class="font-body-md text-[11px] text-on-surface-variant">
                  Used {{ smsQuota.used.toLocaleString() }} of {{ smsQuota.cap.toLocaleString() }} this cycle.
                </p>
              </div>
              <button
                type="button"
                class="inline-flex h-10 w-full items-center justify-center rounded-xl bg-deep-navy font-button-text text-xs font-semibold text-pure-white transition hover:bg-primary disabled:opacity-50"
                :disabled="frozen || saving"
                @click="saveAutonomySettings"
              >
                {{ saving ? "Saving…" : "Save Autonomy Matrix" }}
              </button>
            </div>

            <div class="mt-6 pt-5">
              <div class="mb-3 flex items-center justify-between">
                <span class="font-label-caps text-xs font-bold text-on-surface-variant">STATUTORY TREASURY SIGNATORIES</span>
                <span class="font-label-caps text-[11px] font-semibold text-primary">{{ signatories.length }} OFFICERS</span>
              </div>
              <div class="flex flex-col gap-2.5">
                <div
                  v-for="s in signatories"
                  :key="s.name"
                  class="flex items-center justify-between rounded-xl bg-surface-container-low p-3"
                >
                  <div class="flex items-center gap-2.5">
                    <div
                      class="flex h-8 w-8 items-center justify-center rounded-full font-headline-md text-xs font-bold"
                      :class="s.tone"
                    >
                      {{ s.initials }}
                    </div>
                    <div>
                      <div class="font-headline-md text-xs font-bold text-primary">{{ s.name }}</div>
                      <div class="font-body-md text-[11px] text-on-surface-variant">{{ s.role }}</div>
                    </div>
                  </div>
                  <span class="rounded bg-surface-container px-2 py-0.5 font-label-caps text-[10px] font-semibold text-outline">
                    {{ s.key }}
                  </span>
                </div>
              </div>
              <button
                type="button"
                class="mt-3 flex w-full items-center justify-center gap-1.5 rounded-xl bg-surface-container py-2 font-button-text text-xs text-primary transition-colors hover:bg-surface-container-high"
                @click="setTab('agents')"
              >
                <span class="material-symbols-outlined text-[16px]">person_add</span>
                + Appoint Additional Signatory
              </button>
            </div>
          </div>

          <div class="flex flex-col justify-between rounded-2xl bg-surface-container-lowest p-6 shadow-sm">
            <div>
              <div class="flex items-center justify-between pb-4">
                <div class="flex items-center gap-2">
                  <h2 class="font-headline-md text-lg font-bold text-primary">Statutory Audit Trail</h2>
                  <span class="h-2 w-2 rounded-full bg-action-green" />
                </div>
                <span class="font-label-caps text-[10px] text-outline">PULSE LOG</span>
              </div>
              <div class="flex flex-col gap-4">
                <div v-for="row in auditTrail" :key="row.id" class="flex items-start gap-3">
                  <div
                    class="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full"
                    :class="row.tone"
                  >
                    <span class="material-symbols-outlined text-[14px]">{{ row.icon }}</span>
                  </div>
                  <div>
                    <div class="font-body-md text-xs font-semibold text-primary">{{ row.title }}</div>
                    <span class="font-label-caps text-[10px] text-outline">{{ row.when }}</span>
                  </div>
                </div>
              </div>
            </div>
            <div class="mt-6 flex items-center gap-3 rounded-xl bg-surface-container-low p-3.5 pt-4">
              <span class="material-symbols-outlined text-[22px] text-action-green">shield_with_heart</span>
              <div>
                <div class="font-headline-md text-xs font-bold text-primary">Ogun Sub-Treasury Isolation</div>
                <div class="font-body-md text-[11px] leading-tight text-on-surface-variant">
                  Cryptographic separation between HQ pool and Ogun chapter liquid assets.
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </template>
  </div>
</template>
