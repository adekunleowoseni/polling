<script setup lang="ts">
import {
  useAdminCrm,
  type AdminCrmSmsAnalytics,
  type AdminCrmSmsAuditRow,
} from "~/composables/useAdminCrm";

const props = defineProps<{
  dispatchId: string;
}>();

const emit = defineEmits<{
  (e: "back"): void;
  (e: "error", msg: string): void;
  (e: "message", msg: string): void;
  (e: "followUp"): void;
}>();

const { loadSmsAnalytics, crmError } = useAdminCrm();

const loading = ref(true);
const data = ref<AdminCrmSmsAnalytics | null>(null);
const query = ref("");
const chip = ref<"all" | "action" | "positive" | "optout">("all");
const page = ref(1);
const pageSize = 25;

watch(
  () => props.dispatchId,
  () => {
    page.value = 1;
    chip.value = "all";
    query.value = "";
    void refresh();
  },
  { immediate: true },
);

watch([query, chip], () => {
  page.value = 1;
});

const filteredAudit = computed(() => {
  const rows = data.value?.audit_rows || [];
  const q = query.value.trim().toLowerCase();
  return rows.filter((row) => {
    if (chip.value === "action" && !row.needs_action) return false;
    if (chip.value === "positive" && row.intent !== "Committed Voter" && row.intent !== "Donated / Shared") return false;
    if (chip.value === "optout" && row.intent !== "Auto-Suppressed (DNC)") return false;
    if (!q) return true;
    const hay = [row.name, row.phone, row.precinct_label, row.inbound_reply, row.intent, row.carrier]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();
    return hay.includes(q);
  });
});

const pageCount = computed(() => Math.max(1, Math.ceil(filteredAudit.value.length / pageSize)));
const pagedAudit = computed(() => {
  const start = (page.value - 1) * pageSize;
  return filteredAudit.value.slice(start, start + pageSize);
});

const chipCounts = computed(() => {
  const rows = data.value?.audit_rows || [];
  return {
    all: rows.filter((r) => r.inbound_reply).length || rows.length,
    action: rows.filter((r) => r.needs_action).length,
    positive: rows.filter((r) => r.intent === "Committed Voter" || r.intent === "Donated / Shared").length,
    optout: rows.filter((r) => r.intent === "Auto-Suppressed (DNC)").length,
  };
});

const deliveredWidth = computed(() => Math.max(0, Math.min(100, data.value?.delivery_pct || 0)));
const filteredWidth = computed(() => {
  const d = data.value;
  if (!d) return 0;
  const total = Math.max(1, d.queued + d.carrier_filtered + d.unreachable);
  return (d.carrier_filtered / total) * 100;
});
const unreachableWidth = computed(() => {
  const d = data.value;
  if (!d) return 0;
  const total = Math.max(1, d.queued + d.carrier_filtered + d.unreachable);
  return (d.unreachable / total) * 100;
});

async function refresh() {
  loading.value = true;
  try {
    data.value = await loadSmsAnalytics(props.dispatchId);
  } catch (e: unknown) {
    emit("error", crmError(e, "Could not load SMS analytics."));
    data.value = null;
  } finally {
    loading.value = false;
  }
}

function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}

function contactRef(id: string) {
  const raw = id.replace(/^(voter|crm|agent):/, "").replace(/[^a-zA-Z0-9]/g, "");
  return `#VTR-${raw.slice(-5).toUpperCase() || "00000"}`;
}

function formatWhen(iso: string | null | undefined) {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function dispatchWindow() {
  const d = data.value;
  if (!d?.dispatch_started_at) return "—";
  const start = formatWhen(d.dispatch_started_at);
  const end = d.dispatch_ended_at ? formatWhen(d.dispatch_ended_at) : start;
  return `${start} → ${end}`;
}

function intentClass(intent: string | null) {
  if (!intent) return "bg-surface-container text-primary";
  if (intent.includes("Committed") || intent.includes("Donated")) return "bg-action-green/20 text-on-tertiary-fixed";
  if (intent.includes("Logistical") || intent.includes("Help")) return "bg-secondary-container/20 text-secondary";
  if (intent.includes("Suppressed") || intent.includes("DNC")) return "bg-error/15 text-error";
  return "bg-surface-container text-primary";
}

function avatarClass(row: AdminCrmSmsAuditRow) {
  if (row.needs_action) return "bg-electric-pink/10 text-electric-pink";
  if (row.intent === "Auto-Suppressed (DNC)") return "bg-outline/20 text-outline";
  return "bg-deep-navy/10 text-primary";
}

function exportCsv() {
  const rows = filteredAudit.value;
  if (!rows.length) {
    emit("error", "Nothing to export.");
    return;
  }
  const header = ["Name", "ID", "Precinct", "Phone", "Carrier", "Status", "Reply", "Intent"];
  const lines = [
    header.join(","),
    ...rows.map((r) =>
      [r.name, contactRef(r.contact_id), r.precinct_label, r.phone || "", r.carrier, r.delivery_status, r.inbound_reply || "", r.intent || ""]
        .map((v) => `"${String(v).replaceAll('"', '""')}"`)
        .join(","),
    ),
  ];
  const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `sms-delivery-${props.dispatchId}.csv`;
  a.click();
  URL.revokeObjectURL(url);
  emit("message", `Exported ${rows.length} recipient row(s).`);
}

function retargetNonResponders() {
  const count = (data.value?.audit_rows || []).filter((r) => !r.inbound_reply).length;
  emit("message", `${count.toLocaleString()} non-responder(s) ready for re-target from the directory filter.`);
  emit("followUp");
}

function assignOpportunity() {
  const ward = data.value?.opportunity_ward || "field turf";
  emit("message", `Opportunity batch flagged for ${ward}. Open Field Canvassing to assign turf.`);
}
</script>

<template>
  <div class="flex w-full flex-col">
    <div class="mb-4 flex flex-wrap items-center justify-between gap-3">
      <button
        type="button"
        class="inline-flex items-center gap-2 font-button-text text-sm text-on-surface-variant transition-colors hover:text-electric-pink"
        @click="emit('back')"
      >
        <span class="material-symbols-outlined text-[18px]">arrow_back</span>
        <span>Back to Supporter CRM Directory</span>
      </button>
      <div class="flex flex-wrap items-center gap-2">
        <span class="rounded-full bg-surface-container px-2.5 py-1 font-label-caps text-[11px] text-on-surface-variant">NODE: HQ-CRM</span>
        <span class="rounded-full bg-action-green/20 px-2.5 py-1 font-label-caps text-[11px] font-semibold text-on-tertiary-fixed">CARRIER ROUTE ACTIVE</span>
      </div>
    </div>

    <div v-if="loading" class="rounded-xl bg-surface-container-lowest p-10 text-center text-sm text-outline shadow-sm">
      Loading SMS delivery analytics…
    </div>

    <div v-else-if="!data" class="rounded-xl bg-surface-container-lowest p-10 text-center text-sm text-outline shadow-sm">
      Dispatch analytics unavailable.
    </div>

    <template v-else>
      <!-- Campaign banner -->
      <div class="mb-6 rounded-xl bg-surface-container-lowest p-6 shadow-sm">
        <div class="-mx-6 -mt-6 mb-6 flex flex-col gap-6 rounded-t-xl bg-surface-container-low/40 p-6 lg:flex-row lg:items-center lg:justify-between">
          <div class="min-w-0 flex-1 space-y-2">
            <div class="flex flex-wrap items-center gap-3">
              <h1 class="font-headline-md text-2xl font-bold tracking-tight text-primary sm:text-headline-md">{{ data.title }}</h1>
              <span class="inline-flex items-center gap-1.5 rounded-full bg-action-green/20 px-3 py-1 font-label-caps text-[11px] font-semibold uppercase text-on-tertiary-fixed">
                <span class="h-2 w-2 rounded-full bg-action-green" />
                {{ data.status_label }}
              </span>
            </div>
            <p class="font-body-md text-sm text-on-surface-variant">{{ data.subtitle }}</p>
          </div>
          <div class="grid w-full grid-cols-1 gap-2 sm:grid-cols-3 lg:w-auto lg:shrink-0">
            <button
              type="button"
              class="inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-surface-container px-4 font-button-text text-sm font-semibold text-primary transition hover:bg-surface-container-high"
              @click="exportCsv"
            >
              <span class="material-symbols-outlined shrink-0 text-[18px]">download</span>
              <span class="truncate">Export CSV</span>
            </button>
            <button
              type="button"
              class="inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-surface-container px-4 font-button-text text-sm font-semibold text-primary transition hover:bg-surface-container-high"
              @click="retargetNonResponders"
            >
              <span class="material-symbols-outlined shrink-0 text-[18px]">sync</span>
              <span class="truncate">Re-target</span>
            </button>
            <button
              type="button"
              class="inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-electric-pink px-4 font-button-text text-sm font-semibold text-pure-white shadow-sm transition hover:opacity-95"
              @click="emit('followUp')"
            >
              <span class="material-symbols-outlined shrink-0 text-[18px]">add_comment</span>
              <span class="truncate">Follow-up SMS</span>
            </button>
          </div>
        </div>

        <div class="grid grid-cols-2 gap-4 pt-2 font-label-caps text-[11px] md:grid-cols-3 lg:grid-cols-5">
          <div class="flex flex-col">
            <span class="uppercase tracking-wider text-on-surface-variant">Target Universe</span>
            <span class="mt-0.5 text-sm font-bold text-primary">{{ data.queued.toLocaleString() }} Verified Contacts</span>
          </div>
          <div class="flex flex-col">
            <span class="uppercase tracking-wider text-on-surface-variant">Sender Channel</span>
            <span class="mt-0.5 text-sm font-bold text-primary">{{ data.channel_label }}</span>
          </div>
          <div class="flex flex-col">
            <span class="uppercase tracking-wider text-on-surface-variant">Dispatch Window</span>
            <span class="mt-0.5 text-sm font-bold text-primary">{{ dispatchWindow() }}</span>
          </div>
          <div class="flex flex-col">
            <span class="uppercase tracking-wider text-on-surface-variant">Elapsed Throughput</span>
            <span class="mt-0.5 text-sm font-bold text-primary">{{ data.duration_label }}</span>
          </div>
          <div class="flex flex-col">
            <span class="uppercase tracking-wider text-on-surface-variant">Settlement Cost</span>
            <span class="mt-0.5 text-sm font-bold text-primary">₦{{ data.cost_ngn.toLocaleString() }} ({{ data.credits }} credits)</span>
          </div>
        </div>
      </div>

      <!-- KPI cards -->
      <div class="mb-8 grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-4">
        <div class="flex flex-col justify-between rounded-xl bg-surface-container-lowest p-6 shadow-sm">
          <div>
            <div class="mb-2 flex items-center justify-between">
              <span class="font-label-caps text-[11px] uppercase tracking-wider text-on-surface-variant">Dispatched &amp; Delivered</span>
              <div class="flex h-8 w-8 items-center justify-center rounded-lg bg-action-green/15">
                <span class="material-symbols-outlined text-[18px] text-action-green">mark_chat_read</span>
              </div>
            </div>
            <div class="flex items-baseline gap-2">
              <span class="font-headline-md text-3xl font-bold text-primary">{{ data.delivered.toLocaleString() }}</span>
              <span class="font-label-caps text-[11px] font-semibold text-action-green">{{ data.delivery_pct }}%</span>
            </div>
            <p class="mt-1 text-sm text-on-surface-variant">From {{ data.queued.toLocaleString() }} queued contacts</p>
          </div>
          <div class="-mx-6 -mb-6 mt-4 flex items-center gap-2 rounded-b-xl bg-surface-container-low/50 p-4 pt-3">
            <span class="h-2 w-2 rounded-full bg-error" />
            <span class="font-label-caps text-[11px] text-on-surface-variant">
              {{ data.carrier_filtered }} DNC skipped · {{ data.unreachable }} missing phone
            </span>
          </div>
        </div>

        <div class="flex flex-col justify-between rounded-xl bg-surface-container-lowest p-6 shadow-sm">
          <div>
            <div class="mb-2 flex items-center justify-between">
              <span class="font-label-caps text-[11px] uppercase tracking-wider text-on-surface-variant">CTR / Link Engagement</span>
              <div class="flex h-8 w-8 items-center justify-center rounded-lg bg-electric-pink/15">
                <span class="material-symbols-outlined text-[18px] text-electric-pink">ads_click</span>
              </div>
            </div>
            <div class="flex items-baseline gap-2">
              <span class="font-headline-md text-3xl font-bold text-primary">{{ data.ctr_clicks.toLocaleString() }}</span>
              <span class="font-label-caps text-[11px] font-semibold text-electric-pink">{{ data.ctr_pct }}% CTR</span>
            </div>
            <p class="mt-1 text-sm text-on-surface-variant">Tokenized pulse.vote links · tracking pending</p>
          </div>
          <div class="-mx-6 -mb-6 mt-4 flex items-center gap-2 rounded-b-xl bg-surface-container-low/50 p-4 pt-3">
            <span class="material-symbols-outlined text-[16px] text-on-surface-variant">timer</span>
            <span class="font-label-caps text-[11px] text-on-surface-variant">Click telemetry connects when link resolver is live</span>
          </div>
        </div>

        <div class="flex flex-col justify-between rounded-xl bg-surface-container-lowest p-6 shadow-sm">
          <div>
            <div class="mb-2 flex items-center justify-between">
              <span class="font-label-caps text-[11px] uppercase tracking-wider text-on-surface-variant">Inbound Replies</span>
              <div class="flex h-8 w-8 items-center justify-center rounded-lg bg-deep-navy/10">
                <span class="material-symbols-outlined text-[18px] text-primary">forum</span>
              </div>
            </div>
            <div class="flex items-baseline gap-2">
              <span class="font-headline-md text-3xl font-bold text-primary">{{ data.replies.toLocaleString() }}</span>
              <span class="font-label-caps text-[11px] font-semibold text-primary">{{ data.reply_pct }}% Rate</span>
            </div>
            <p class="mt-1 text-sm text-on-surface-variant">Live peer-to-peer inbound channel</p>
          </div>
          <div class="-mx-6 -mb-6 mt-4 flex items-center gap-2 rounded-b-xl bg-surface-container-low/50 p-4 pt-3">
            <span class="font-label-caps text-[11px] text-on-surface-variant">
              {{ data.positive_pct }}% Positive · {{ data.inquiry_pct }}% Inquiries · {{ data.opt_out_pct }}% Opt-out
            </span>
          </div>
        </div>

        <div class="flex flex-col justify-between rounded-xl bg-surface-container-lowest p-6 shadow-sm">
          <div>
            <div class="mb-2 flex items-center justify-between">
              <span class="font-label-caps text-[11px] uppercase tracking-wider text-on-surface-variant">Throughput &amp; Latency</span>
              <div class="flex h-8 w-8 items-center justify-center rounded-lg bg-action-green/15">
                <span class="material-symbols-outlined text-[18px] text-action-green">bolt</span>
              </div>
            </div>
            <div class="flex items-baseline gap-2">
              <span class="font-headline-md text-3xl font-bold text-primary">{{ data.peak_throughput }}</span>
              <span class="font-label-caps text-[11px] font-medium text-on-surface-variant">msg / sec peak</span>
            </div>
            <p class="mt-1 text-sm text-on-surface-variant">Avg handover latency: {{ data.avg_latency_s }}s</p>
          </div>
          <div class="-mx-6 -mb-6 mt-4 flex items-center gap-2 rounded-b-xl bg-surface-container-low/50 p-4 pt-3">
            <span class="h-2 w-2 rounded-full bg-action-green" />
            <span class="font-label-caps text-[11px] text-on-surface-variant">0 Queue Backlog · Route clean</span>
          </div>
        </div>
      </div>

      <!-- Two column grid -->
      <div class="mb-8 grid grid-cols-1 gap-8 lg:grid-cols-12">
        <div class="flex flex-col gap-8 lg:col-span-7">
          <div class="rounded-xl bg-surface-container-lowest p-6 shadow-sm">
            <div class="mb-4 flex items-center justify-between gap-3">
              <div>
                <h2 class="font-headline-md text-[20px] font-bold text-primary">Carrier Delivery &amp; Status Funnel</h2>
                <p class="text-sm text-on-surface-variant">Aggregate routing distribution across major cellular networks</p>
              </div>
              <span class="rounded bg-surface-container px-2.5 py-1 font-label-caps text-[11px] text-on-surface-variant">HANDOVER COMPLETED</span>
            </div>

            <div class="mb-4 flex h-4 w-full overflow-hidden rounded-full bg-surface-container">
              <div class="h-full bg-action-green" :style="{ width: `${deliveredWidth}%` }" :title="`Delivered: ${data.delivered}`" />
              <div class="h-full bg-error" :style="{ width: `${filteredWidth}%` }" :title="`Filtered: ${data.carrier_filtered}`" />
              <div class="h-full bg-outline" :style="{ width: `${unreachableWidth}%` }" :title="`Unreachable: ${data.unreachable}`" />
            </div>

            <div class="mb-4 grid grid-cols-3 gap-2 pb-4 text-center">
              <div class="rounded-lg bg-surface-container-low p-3">
                <span class="font-label-caps text-[11px] uppercase text-on-surface-variant">Delivered</span>
                <p class="font-headline-md text-[18px] font-bold text-primary">
                  {{ data.delivered.toLocaleString() }}
                  <span class="text-xs font-normal text-action-green">({{ data.delivery_pct }}%)</span>
                </p>
              </div>
              <div class="rounded-lg bg-surface-container-low p-3">
                <span class="font-label-caps text-[11px] uppercase text-on-surface-variant">DNC Skipped</span>
                <p class="font-headline-md text-[18px] font-bold text-primary">
                  {{ data.carrier_filtered.toLocaleString() }}
                  <span class="text-xs font-normal text-error">(filtered)</span>
                </p>
              </div>
              <div class="rounded-lg bg-surface-container-low p-3">
                <span class="font-label-caps text-[11px] uppercase text-on-surface-variant">No Phone</span>
                <p class="font-headline-md text-[18px] font-bold text-primary">
                  {{ data.unreachable.toLocaleString() }}
                  <span class="text-xs font-normal text-outline">(unreachable)</span>
                </p>
              </div>
            </div>

            <div class="space-y-2">
              <div
                v-for="carrier in data.carriers"
                :key="carrier.name"
                class="flex flex-col gap-2 rounded-lg bg-surface p-3 sm:flex-row sm:items-center sm:justify-between"
              >
                <div class="flex items-center gap-3">
                  <span class="h-3 w-3 rounded-full bg-deep-navy" />
                  <span class="font-button-text text-sm text-primary">{{ carrier.name }}</span>
                </div>
                <div class="flex flex-wrap items-center gap-4 font-label-caps text-[11px] sm:gap-6">
                  <span class="text-on-surface-variant">{{ carrier.messages.toLocaleString() }} Messages</span>
                  <span class="text-on-surface-variant">{{ carrier.latency_s }}s latency</span>
                  <span class="font-bold text-action-green">{{ carrier.success_pct }}% Success</span>
                </div>
              </div>
              <p v-if="!data.carriers.length" class="text-sm text-outline">No carrier breakdown for this dispatch.</p>
            </div>
          </div>

          <div class="rounded-xl bg-surface-container-lowest p-6 shadow-sm">
            <div class="mb-4">
              <div class="flex flex-wrap items-center gap-2">
                <h2 class="font-headline-md text-[20px] font-bold text-primary">Inbound Sentiment &amp; Intent Classification</h2>
                <span class="rounded bg-electric-pink/10 px-2 py-0.5 font-label-caps text-[10px] font-bold uppercase text-electric-pink">e-mobilize AI</span>
              </div>
              <p class="text-sm text-on-surface-variant">
                Semantic triage of {{ data.replies.toLocaleString() }} incoming mobile response{{ data.replies === 1 ? "" : "s" }}
              </p>
            </div>

            <div class="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
              <div v-for="intent in data.intents" :key="intent.label" class="flex flex-col rounded-lg bg-surface-container-low p-3">
                <span class="font-label-caps text-[11px] text-on-surface-variant">{{ intent.label }}</span>
                <span class="mt-1 font-headline-md text-[20px] font-bold text-primary">{{ intent.count.toLocaleString() }}</span>
                <span class="font-label-caps text-[11px] text-action-green">{{ intent.share_pct }}% of replies</span>
              </div>
            </div>

            <div
              v-if="data.opportunity_text"
              class="flex flex-col items-start justify-between gap-4 rounded-xl bg-deep-navy p-4 text-pure-white sm:flex-row sm:items-center"
            >
              <div class="flex items-start gap-3">
                <div class="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-electric-pink">
                  <span class="material-symbols-outlined text-[18px] text-pure-white">psychology</span>
                </div>
                <div>
                  <p class="font-button-text text-sm font-semibold text-pure-white">Urgent Field Opportunity Detected</p>
                  <p class="mt-0.5 text-sm text-on-primary-container">{{ data.opportunity_text }}</p>
                </div>
              </div>
              <button
                type="button"
                class="shrink-0 rounded-lg bg-action-green px-4 py-2 font-button-text text-sm text-on-tertiary-fixed transition-colors hover:bg-action-green/90"
                @click="assignOpportunity"
              >
                Assign to {{ data.opportunity_ward || "Field" }} Turf
              </button>
            </div>
            <p v-else class="rounded-xl bg-surface-container-low p-4 text-sm text-on-surface-variant">
              No urgent field opportunities detected from inbound replies yet.
            </p>
          </div>
        </div>

        <div class="flex flex-col gap-8 lg:col-span-5">
          <div class="flex flex-col rounded-xl bg-surface-container-lowest p-6 shadow-sm">
            <div class="mb-4 flex items-center justify-between">
              <h2 class="font-headline-md text-[20px] font-bold text-primary">Dispatched Message Recap</h2>
              <span class="rounded bg-action-green/20 px-2.5 py-1 font-label-caps text-[11px] font-semibold text-on-tertiary-fixed">10DLC APPROVED</span>
            </div>

            <div class="mb-4 rounded-xl bg-surface-container-low p-4">
              <div class="-mx-4 -mt-4 mb-3 flex items-center justify-between rounded-t-xl bg-surface-container/60 p-3 pb-3">
                <div class="flex items-center gap-2">
                  <span class="material-symbols-outlined text-[16px] text-on-surface-variant">smartphone</span>
                  <span class="font-label-caps text-[11px] font-bold text-primary">{{ data.channel_label }}</span>
                </div>
                <span class="font-label-caps text-[10px] text-on-surface-variant">{{ formatWhen(data.dispatch_started_at) }}</span>
              </div>
              <div class="max-w-[90%] space-y-2 rounded-2xl rounded-bl-sm bg-deep-navy p-4 text-pure-white shadow-sm">
                <p class="whitespace-pre-wrap text-sm leading-relaxed">{{ data.body }}</p>
              </div>
              <div class="mt-2 flex items-center justify-between px-1">
                <span class="font-label-caps text-[11px] text-on-surface-variant">{{ data.body.length }} chars · queued copy</span>
                <span class="font-label-caps text-[11px] font-medium text-action-green">Delivered to recipient handsets</span>
              </div>
            </div>

            <div class="space-y-2">
              <span class="font-label-caps text-[11px] uppercase text-on-surface-variant">Merge Tags Dynamically Injected:</span>
              <div class="flex flex-wrap gap-2">
                <span class="rounded bg-surface-container px-2.5 py-1 font-label-caps text-[11px] font-medium text-primary">{First_Name} · Voter Roll</span>
                <span class="rounded bg-surface-container px-2.5 py-1 font-label-caps text-[11px] font-medium text-primary">{Polling_Location} · Precinct Geo</span>
                <span class="rounded bg-surface-container px-2.5 py-1 font-label-caps text-[11px] font-medium text-primary">{Custom_Link} · Tokenized ID</span>
              </div>
              <div class="flex items-center justify-between pt-3 text-xs text-on-surface-variant">
                <span class="flex items-center gap-1 font-label-caps text-[11px]">
                  <span class="material-symbols-outlined text-[14px] text-action-green">verified</span> Consent Verified
                </span>
                <span class="flex items-center gap-1 font-label-caps text-[11px]">
                  <span class="material-symbols-outlined text-[14px] text-action-green">shield</span> Opt-out Footer Automated
                </span>
              </div>
            </div>
          </div>

          <div class="flex flex-col justify-between rounded-xl bg-surface-container-lowest p-6 shadow-sm">
            <div class="mb-4 flex items-center justify-between">
              <div>
                <h2 class="font-headline-md text-[20px] font-bold text-primary">Velocity &amp; Click Curve</h2>
                <p class="text-sm text-on-surface-variant">First minutes post-dispatch</p>
              </div>
              <span class="rounded bg-surface-container px-2 py-0.5 font-label-caps text-[11px] text-on-surface-variant">Peak window</span>
            </div>
            <div class="relative flex h-36 w-full items-end">
              <svg class="h-full w-full" fill="none" preserveAspectRatio="none" viewBox="0 0 360 120">
                <line stroke="rgb(var(--ap-surface-container))" stroke-width="1" x1="0" x2="360" y1="30" y2="30" />
                <line stroke="rgb(var(--ap-surface-container))" stroke-width="1" x1="0" x2="360" y1="70" y2="70" />
                <line stroke="rgb(var(--ap-surface-container))" stroke-width="1" x1="0" x2="360" y1="110" y2="110" />
                <path d="M0,120 L0,115 C30,112 50,15 80,18 C110,21 130,55 170,62 C210,69 260,78 310,85 C340,89 360,92 360,92 L360,120 Z" fill="rgba(255, 56, 127, 0.08)" />
                <path d="M0,118 L40,25 L80,10 L120,8 L160,8 L200,8 L240,8 L280,8 L320,8 L360,8" stroke="#222230" stroke-linecap="round" stroke-width="2.5" />
                <path d="M0,115 C30,112 50,15 80,18 C110,21 130,55 170,62 C210,69 260,78 310,85 C340,89 360,92 360,92" stroke="#FF387F" stroke-linecap="round" stroke-width="2.5" />
                <circle cx="80" cy="18" fill="#FF387F" r="4.5" />
              </svg>
            </div>
            <div class="flex items-center justify-between pt-3 font-label-caps text-[11px] text-on-surface-variant">
              <span>Dispatch</span>
              <span>+5m</span>
              <span>+10m</span>
              <span>+15m</span>
              <span>+20m</span>
            </div>
            <div class="-mx-6 -mb-6 mt-4 flex items-center justify-center gap-6 rounded-b-xl bg-surface-container-low/60 p-3 pt-3">
              <div class="flex items-center gap-2">
                <span class="h-1 w-3 rounded-full bg-deep-navy" />
                <span class="font-label-caps text-[11px] font-semibold text-primary">Delivery Complete</span>
              </div>
              <div class="flex items-center gap-2">
                <span class="h-1 w-3 rounded-full bg-electric-pink" />
                <span class="font-label-caps text-[11px] font-semibold text-electric-pink">URL Link Clicks</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Audit log -->
      <div class="mb-8 overflow-hidden rounded-xl bg-surface-container-lowest shadow-sm">
        <div class="flex flex-col justify-between gap-4 p-6 pb-4 md:flex-row md:items-center">
          <div>
            <h2 class="font-headline-md text-[20px] font-bold text-primary">Recipient Response &amp; Handover Audit Log</h2>
            <p class="text-sm text-on-surface-variant">Live feed of delivery status, carrier routes, and voter replies</p>
          </div>
          <div class="relative">
            <span class="material-symbols-outlined absolute left-3 top-2.5 text-[18px] text-on-surface-variant">search</span>
            <input
              v-model="query"
              class="w-full rounded-lg bg-surface py-2 pl-9 pr-4 font-body-md text-sm text-on-surface transition-all placeholder:text-on-surface-variant focus:bg-surface-container-lowest focus:outline-none md:w-72"
              placeholder="Filter by voter, phone, or reply keyword..."
              type="text"
            />
          </div>
        </div>

        <div class="flex flex-wrap items-center gap-2 px-6 pb-4">
          <button
            type="button"
            class="rounded-full px-3 py-1 font-label-caps text-[11px] transition-colors"
            :class="chip === 'all' ? 'bg-deep-navy font-semibold text-pure-white' : 'bg-surface-container font-medium text-on-surface hover:bg-surface-container-high'"
            @click="chip = 'all'"
          >
            All Recipients ({{ chipCounts.all.toLocaleString() }})
          </button>
          <button
            type="button"
            class="rounded-full px-3 py-1 font-label-caps text-[11px] transition-colors"
            :class="chip === 'action' ? 'bg-deep-navy font-semibold text-pure-white' : 'bg-surface-container font-medium text-on-surface hover:bg-surface-container-high'"
            @click="chip = 'action'"
          >
            Needs Action ({{ chipCounts.action }})
          </button>
          <button
            type="button"
            class="rounded-full px-3 py-1 font-label-caps text-[11px] transition-colors"
            :class="chip === 'positive' ? 'bg-deep-navy font-semibold text-pure-white' : 'bg-surface-container font-medium text-on-surface hover:bg-surface-container-high'"
            @click="chip = 'positive'"
          >
            Positive RSVP ({{ chipCounts.positive }})
          </button>
          <button
            type="button"
            class="rounded-full px-3 py-1 font-label-caps text-[11px] transition-colors"
            :class="chip === 'optout' ? 'bg-deep-navy font-semibold text-pure-white' : 'bg-surface-container font-medium text-on-surface hover:bg-surface-container-high'"
            @click="chip = 'optout'"
          >
            Opt-Outs ({{ chipCounts.optout }})
          </button>
        </div>

        <div class="w-full overflow-x-auto">
          <table class="w-full text-left font-body-md text-sm">
            <thead>
              <tr class="bg-surface-container-low font-label-caps text-[11px] uppercase tracking-wider text-on-surface-variant">
                <th class="px-6 py-3.5">Recipient &amp; Precinct</th>
                <th class="px-4 py-3.5">Sent Message</th>
                <th class="px-4 py-3.5">Delivery Status</th>
                <th class="px-4 py-3.5">Inbound Reply</th>
                <th class="px-4 py-3.5">Intent / Sentiment</th>
                <th class="px-6 py-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              <tr v-if="!pagedAudit.length">
                <td colspan="6" class="px-6 py-10 text-center text-sm text-outline">
                  No recipient rows match this filter. Inbound replies appear here when SMS replies are logged.
                </td>
              </tr>
              <tr
                v-for="(row, idx) in pagedAudit"
                :key="row.contact_id"
                class="transition-colors hover:bg-surface-container-low/40"
                :class="idx % 2 ? 'bg-surface/30' : ''"
              >
                <td class="px-6 py-4">
                  <div class="flex items-center gap-3">
                    <div class="flex h-9 w-9 items-center justify-center rounded-full font-button-text text-xs font-bold" :class="avatarClass(row)">
                      {{ initials(row.name) }}
                    </div>
                    <div class="flex flex-col">
                      <span class="font-button-text text-sm font-semibold text-primary">{{ row.name }}</span>
                      <span class="font-label-caps text-[11px] text-on-surface-variant">{{ contactRef(row.contact_id) }} · {{ row.precinct_label }}</span>
                    </div>
                  </div>
                </td>
                <td class="max-w-[200px] truncate px-4 py-4 text-on-surface-variant">{{ row.message_preview }}</td>
                <td class="px-4 py-4">
                  <span class="inline-flex items-center gap-1.5 rounded-full bg-action-green/20 px-2.5 py-1 font-label-caps text-[11px] font-semibold text-on-tertiary-fixed">
                    <span class="h-1.5 w-1.5 rounded-full bg-action-green" />
                    {{ row.delivery_status }} ({{ row.carrier }})
                  </span>
                </td>
                <td class="px-4 py-4">
                  <div v-if="row.inbound_reply" class="max-w-xs rounded-lg bg-surface p-2.5 text-sm text-primary">
                    “{{ row.inbound_reply }}”
                  </div>
                  <span v-else class="text-xs text-outline">Awaiting reply</span>
                </td>
                <td class="px-4 py-4">
                  <span v-if="row.intent" class="rounded px-2.5 py-1 font-label-caps text-[11px] font-bold" :class="intentClass(row.intent)">
                    {{ row.intent }}
                  </span>
                  <span v-else class="text-xs text-outline">—</span>
                </td>
                <td class="px-6 py-4 text-right">
                  <div class="flex items-center justify-end gap-2">
                    <button
                      v-if="row.needs_action"
                      type="button"
                      class="rounded-lg bg-electric-pink px-3 py-1.5 font-button-text text-xs text-on-primary transition-colors hover:bg-secondary-container"
                      @click="emit('message', `Task flagged for ${row.name}.`)"
                    >
                      Assign Task
                    </button>
                    <button
                      v-else
                      type="button"
                      class="rounded-lg bg-surface-container px-3 py-1.5 font-button-text text-xs text-primary transition-colors hover:bg-surface-container-high"
                      @click="emit('message', row.phone ? `Direct reply ready for ${row.name} at ${row.phone}.` : `${row.name} has no phone on file.`)"
                    >
                      {{ row.intent === 'Auto-Suppressed (DNC)' ? 'Audit Profile' : 'Reply Directly' }}
                    </button>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <div class="flex items-center justify-between bg-surface-container-low/50 p-4 px-6 font-label-caps text-[11px] text-on-surface-variant">
          <span>
            Showing
            {{ filteredAudit.length ? (page - 1) * pageSize + 1 : 0 }}–{{ Math.min(page * pageSize, filteredAudit.length) }}
            of {{ filteredAudit.length.toLocaleString() }} logged interactions
          </span>
          <div class="flex items-center gap-2">
            <button
              type="button"
              class="rounded bg-surface-container px-3 py-1 font-semibold text-primary transition-colors hover:bg-surface-container-high disabled:opacity-50"
              :disabled="page <= 1"
              @click="page -= 1"
            >
              Previous
            </button>
            <span class="px-2 font-bold text-primary">Page {{ page }} of {{ pageCount }}</span>
            <button
              type="button"
              class="rounded bg-surface-container px-3 py-1 font-semibold text-primary transition-colors hover:bg-surface-container-high disabled:opacity-50"
              :disabled="page >= pageCount"
              @click="page += 1"
            >
              Next
            </button>
          </div>
        </div>
      </div>
    </template>
  </div>
</template>
