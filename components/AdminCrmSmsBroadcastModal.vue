<script setup lang="ts">
import {
  useAdminCrm,
  type AdminCrmRow,
  type AdminCrmSmsBroadcastIn,
} from "~/composables/useAdminCrm";

const props = defineProps<{
  open: boolean;
  selectedRows: AdminCrmRow[];
  filterRows: AdminCrmRow[];
}>();

const emit = defineEmits<{
  (e: "close"): void;
  (e: "error", msg: string): void;
  (e: "message", msg: string): void;
  (e: "dispatched", dispatchId: string): void;
}>();

const { dispatchSms, crmError } = useAdminCrm();
const { admin } = useAdminAuth();

const CREDIT_NGN = 8;
const MAX_BODY = 480;

const TEMPLATES: Record<string, { label: string; body: string }> = {
  gotv: {
    label: "GOTV Urgency",
    body: "Hi {First_Name}, your precinct vote center at {Polling_Location} opens tomorrow at 7:00 AM! Check your personalized ballot guide here: {Custom_Link}. {Opt_Out_Text}.",
  },
  rally: {
    label: "Rally RSVP Reminder",
    body: "Hi {First_Name}, reminder: e-mobilize rally in {Ward_Name} starts soon. Confirm your seat: {Custom_Link}. {Opt_Out_Text}.",
  },
  turf: {
    label: "Volunteer Turf Check-in",
    body: "Hi {First_Name}, time to check in for your {Ward_Name} turf. Open your field packet: {Custom_Link}. {Opt_Out_Text}.",
  },
  donate: {
    label: "Micro-Donation Push",
    body: "Hi {First_Name}, a quick ₦500 keeps {Ward_Name} organizers in the field. Give here: {Custom_Link}. {Opt_Out_Text}.",
  },
};

const TAGS = ["{First_Name}", "{Polling_Location}", "{Ward_Name}", "{Custom_Link}", "{Opt_Out_Text}"] as const;

const scope = ref<"selected" | "filter">("selected");
const channel = ref<"shortcode" | "longcode" | "alphanumeric">("shortcode");
const template = ref("gotv");
const body = ref(TEMPLATES.gotv.body);
const timing = ref<"now" | "schedule">("now");
const scheduleAt = ref("");
const busy = ref(false);
const messageBox = ref<HTMLTextAreaElement | null>(null);

const selectedReachable = computed(() => props.selectedRows.filter((r) => r.phone && r.sms_ok));
const filterReachable = computed(() => props.filterRows.filter((r) => r.phone && r.sms_ok));

const audience = computed(() => (scope.value === "selected" ? selectedReachable.value : filterReachable.value));

const wardSummary = computed(() => {
  const wards = [...new Set(audience.value.map((r) => r.ward || r.lga).filter(Boolean))] as string[];
  if (!wards.length) return "unassigned precincts";
  if (wards.length <= 3) return wards.join(", ");
  return `${wards.slice(0, 3).join(", ")} +${wards.length - 3} more`;
});

const selectedNames = computed(() => {
  const names = selectedReachable.value.map((r) => {
    const parts = r.name.trim().split(/\s+/);
    if (parts.length === 1) return parts[0];
    return `${parts[0]} ${parts[parts.length - 1][0]}.`;
  });
  if (!names.length) return "No SMS-ready contacts selected";
  if (names.length <= 3) return names.join(", ");
  return `${names.slice(0, 3).join(", ")} +${names.length - 3}`;
});

const previewContact = computed(() => audience.value[0] || selectedReachable.value[0] || null);

const charCount = computed(() => body.value.length);
const isGsm7 = computed(() => !/[^\x00-\x7F]/.test(body.value));
const segments = computed(() => {
  const len = charCount.value;
  if (len <= 160) return 1;
  return Math.max(1, Math.ceil(len / 153));
});

const creditsSelected = computed(() => Math.max(0, selectedReachable.value.length) * segments.value);
const creditsAudience = computed(() => Math.max(0, audience.value.length) * segments.value);
const costSelected = computed(() => creditsSelected.value * CREDIT_NGN);
const costAudience = computed(() => creditsAudience.value * CREDIT_NGN);

const previewText = computed(() => {
  const row = previewContact.value;
  if (!row) {
    return personalize(body.value, {
      name: "Supporter",
      polling: "your polling unit",
      ward: "your ward",
      id: "preview",
    });
  }
  return personalize(body.value, {
    name: row.name,
    polling: row.polling_unit || row.address || "your polling unit",
    ward: row.ward || row.lga || "your ward",
    id: row.id,
  });
});

const channelLabel = computed(() => {
  if (channel.value === "longcode") return "Local Campaign Long Code";
  if (channel.value === "alphanumeric") return "CIVIC-VOTE";
  return "CIVIC-VOTE (88022)";
});

watch(
  () => props.open,
  (open) => {
    if (!open) return;
    scope.value = selectedReachable.value.length ? "selected" : "filter";
    template.value = "gotv";
    body.value = TEMPLATES.gotv.body;
    channel.value = "shortcode";
    timing.value = "now";
    scheduleAt.value = "";
  },
);

function onKeydown(e: KeyboardEvent) {
  if (e.key === "Escape" && props.open && !busy.value) emit("close");
}

onMounted(() => window.addEventListener("keydown", onKeydown));
onBeforeUnmount(() => window.removeEventListener("keydown", onKeydown));

function personalize(
  text: string,
  ctx: { name: string; polling: string; ward: string; id: string },
) {
  const first = ctx.name.trim().split(/\s+/)[0] || "friend";
  const short = ctx.id.replace(/^(voter|crm|agent):/, "").replace(/[^a-zA-Z0-9]/g, "").slice(-6) || "000000";
  return text
    .replaceAll("{First_Name}", first)
    .replaceAll("{Polling_Location}", ctx.polling)
    .replaceAll("{Ward_Name}", ctx.ward)
    .replaceAll("{Custom_Link}", `https://pulse.vote/v/${short}`)
    .replaceAll("{Opt_Out_Text}", "Reply STOP to quit");
}

function applyTemplate(key: string) {
  template.value = key;
  const t = TEMPLATES[key];
  if (t) body.value = t.body;
}

function insertTag(tag: string) {
  const el = messageBox.value;
  if (!el) {
    body.value = `${body.value}${tag}`.slice(0, MAX_BODY);
    return;
  }
  const start = el.selectionStart ?? body.value.length;
  const end = el.selectionEnd ?? start;
  const next = `${body.value.slice(0, start)}${tag}${body.value.slice(end)}`.slice(0, MAX_BODY);
  body.value = next;
  nextTick(() => {
    el.focus();
    const pos = Math.min(start + tag.length, next.length);
    el.setSelectionRange(pos, pos);
  });
}

function condenseBody() {
  let text = body.value.trim().replace(/\s+/g, " ");
  if (text.length > 160) text = `${text.slice(0, 157)}...`;
  body.value = text;
}

function naira(amount: number) {
  return `₦${amount.toLocaleString()}`;
}

async function runDispatch(sendTest: boolean) {
  const ids = audience.value.map((r) => r.id);
  if (!ids.length) {
    emit("error", "No reachable SMS contacts in this audience.");
    return;
  }
  if (!body.value.trim()) {
    emit("error", "Message body is required.");
    return;
  }
  if (timing.value === "schedule" && !scheduleAt.value) {
    emit("error", "Pick a schedule time or send immediately.");
    return;
  }

  const payload: AdminCrmSmsBroadcastIn = {
    contact_ids: ids.slice(0, 500),
    scope: scope.value,
    body: body.value.trim(),
    channel: channel.value,
    template: template.value,
    timing: timing.value,
    schedule_at: timing.value === "schedule" ? new Date(scheduleAt.value).toISOString() : null,
    send_test: sendTest,
  };

  busy.value = true;
  try {
    const result = await dispatchSms(payload);
    if (sendTest) {
      emit(
        "message",
        `Test queued for ${result.queued} contact(s) · ${result.credits} credit(s). No inbox delivery.`,
      );
    } else {
      emit(
        "message",
        `Broadcast queued for ${result.queued} contact(s)` +
          (result.skipped_dnc ? ` · ${result.skipped_dnc} DNC skipped` : "") +
          (result.skipped_no_phone ? ` · ${result.skipped_no_phone} missing phone` : "") +
          ` · ${result.inbox_delivered} inbox copies · ${result.credits} credit(s).`,
      );
      emit("dispatched", result.id);
      emit("close");
    }
  } catch (e: unknown) {
    emit("error", crmError(e, "Could not dispatch SMS broadcast."));
  } finally {
    busy.value = false;
  }
}
</script>

<template>
  <div
    v-if="open"
    class="fixed inset-0 z-[70] flex items-center justify-center overflow-y-auto bg-primary/70 p-4 backdrop-blur-sm sm:p-6"
    role="dialog"
    aria-modal="true"
    aria-labelledby="sms-broadcast-title"
    @click.self="!busy && emit('close')"
  >
    <div class="relative my-auto flex w-full max-w-5xl flex-col overflow-hidden rounded-2xl border border-surface-container-high bg-surface-container-lowest shadow-2xl">
      <!-- Header -->
      <div class="flex items-center justify-between border-b border-surface-container-lowest/10 bg-deep-navy px-6 py-5 text-pure-white">
        <div class="flex items-center gap-3.5">
          <div class="flex h-10 w-10 items-center justify-center rounded-xl border border-electric-pink/40 bg-electric-pink/20 text-electric-pink">
            <span class="material-symbols-outlined text-[24px]">cell_tower</span>
          </div>
          <div>
            <div class="flex flex-wrap items-center gap-2.5">
              <h2 id="sms-broadcast-title" class="font-headline-md text-[20px] font-bold leading-snug tracking-tight text-pure-white">
                Broadcast SMS Dispatch Engine
              </h2>
              <span class="flex items-center gap-1.5 rounded-full border border-action-green/30 bg-action-green/20 px-2.5 py-0.5 font-label-caps text-[11px] font-bold tracking-wide text-action-green">
                <span class="h-1.5 w-1.5 animate-pulse rounded-full bg-action-green" />
                10DLC / SOC-2 Compliant Carrier Route
              </span>
            </div>
            <p class="mt-0.5 font-body-md text-xs text-on-primary-container">
              Targeting {{ audience.length.toLocaleString() }} SMS-ready contact{{ audience.length === 1 ? "" : "s" }}
              <template v-if="scope === 'selected'">
                (or expand to active filter: {{ filterReachable.length.toLocaleString() }})
              </template>
              across {{ wardSummary }}.
            </p>
          </div>
        </div>
        <div class="flex items-center gap-2">
          <span class="hidden rounded bg-surface-container-lowest/10 px-2 py-1 font-label-caps text-[10px] uppercase tracking-wider text-on-primary-container sm:inline-block">ESC</span>
          <button
            type="button"
            class="flex h-8 w-8 items-center justify-center rounded-lg text-on-primary-container transition-colors hover:bg-surface-container-lowest/10 hover:text-pure-white"
            aria-label="Close modal"
            :disabled="busy"
            @click="emit('close')"
          >
            <span class="material-symbols-outlined text-[20px]">close</span>
          </button>
        </div>
      </div>

      <!-- Body -->
      <div class="grid max-h-[75vh] grid-cols-1 gap-0 overflow-y-auto lg:grid-cols-12">
        <div class="flex flex-col gap-5 border-b border-surface-container-low bg-surface-container-lowest p-6 lg:col-span-7 lg:border-b-0 lg:border-r">
          <!-- Audience -->
          <div class="flex flex-col gap-2">
            <label class="flex items-center justify-between font-label-caps text-xs font-semibold uppercase tracking-wider text-outline">
              <span>Audience Scope</span>
              <span class="flex items-center gap-1 font-bold normal-case text-action-green">
                <span class="material-symbols-outlined text-[14px]">verified</span>
                Consent Verified
              </span>
            </label>
            <div class="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
              <label
                class="flex cursor-pointer items-start gap-2.5 rounded-xl border-2 p-3 transition-all"
                :class="scope === 'selected' ? 'border-secondary bg-secondary/5' : 'border-surface-container-high bg-surface-container-lowest hover:border-outline-variant'"
              >
                <input v-model="scope" class="mt-0.5 text-secondary focus:ring-secondary" type="radio" value="selected" />
                <div class="flex flex-col">
                  <span class="font-button-text text-xs font-bold text-primary">
                    {{ selectedReachable.length.toLocaleString() }} Selected Contacts
                  </span>
                  <span class="mt-0.5 font-body-md text-[11px] text-outline">{{ selectedNames }}</span>
                </div>
              </label>
              <label
                class="flex cursor-pointer items-start gap-2.5 rounded-xl border-2 p-3 transition-all"
                :class="scope === 'filter' ? 'border-secondary bg-secondary/5' : 'border-surface-container-high bg-surface-container-lowest hover:border-outline-variant'"
              >
                <input v-model="scope" class="mt-0.5 text-secondary focus:ring-secondary" type="radio" value="filter" />
                <div class="flex flex-col">
                  <div class="flex items-center gap-1.5">
                    <span class="font-button-text text-xs font-bold text-primary">Entire Active Filter</span>
                    <span class="rounded-full bg-secondary-fixed px-1.5 font-label-caps text-[10px] font-bold text-secondary">
                      {{ filterReachable.length.toLocaleString() }}
                    </span>
                  </div>
                  <span class="mt-0.5 font-body-md text-[11px] text-outline">Full CRM segment matching view</span>
                </div>
              </label>
            </div>
            <div class="flex items-center gap-2 rounded-lg border border-surface-container-high bg-surface-container-low p-2 text-[11px] text-on-surface-variant">
              <span class="material-symbols-outlined text-[16px] text-action-green">shield</span>
              <span>Consent check applied. DNC and missing-phone contacts are automatically bypassed.</span>
            </div>
          </div>

          <!-- Channel -->
          <div class="flex flex-col gap-1.5">
            <label class="font-label-caps text-xs font-semibold uppercase tracking-wider text-outline">Sender Channel / Sender ID</label>
            <div class="relative">
              <select
                v-model="channel"
                class="w-full appearance-none rounded-xl border border-surface-container-high bg-surface-container-low py-2 pl-3 pr-8 text-xs font-medium text-primary transition-colors focus:bg-surface-container-lowest focus:outline-none"
              >
                <option value="shortcode">e-mobilize Verified Shortcode (88022) — Tier 1 High Throughput</option>
                <option value="longcode">Local Campaign Long Code — High Trust Local</option>
                <option value="alphanumeric">Alphanumeric Sender ID (CIVIC-VOTE) — Official Notice</option>
              </select>
              <span class="material-symbols-outlined pointer-events-none absolute right-2.5 top-2 text-[18px] text-outline">expand_more</span>
            </div>
          </div>

          <!-- Templates -->
          <div class="flex flex-col gap-2">
            <div class="flex items-center justify-between">
              <label class="font-label-caps text-xs font-semibold uppercase tracking-wider text-outline">Template Library</label>
              <span class="font-label-caps text-[11px] font-bold text-secondary">{{ Object.keys(TEMPLATES).length }} templates</span>
            </div>
            <div class="flex flex-wrap items-center gap-1.5">
              <button
                v-for="(t, key) in TEMPLATES"
                :key="key"
                type="button"
                class="rounded-lg px-2.5 py-1 font-label-caps text-[11px] transition-colors"
                :class="template === key ? 'bg-deep-navy font-bold text-pure-white' : 'bg-surface-container-low font-medium text-on-surface hover:bg-surface-container'"
                @click="applyTemplate(key)"
              >
                {{ t.label }}
              </button>
            </div>
          </div>

          <!-- Tags -->
          <div class="flex flex-col gap-1.5">
            <span class="font-label-caps text-[10px] font-semibold uppercase tracking-wider text-outline">Click to Insert Dynamic Tag:</span>
            <div class="flex flex-wrap items-center gap-1.5">
              <button
                v-for="tag in TAGS"
                :key="tag"
                type="button"
                class="rounded-md px-2 py-0.5 font-label-caps text-[10px] font-bold transition-colors"
                :class="tag === '{First_Name}' ? 'bg-secondary-fixed/50 text-secondary hover:bg-secondary-fixed' : 'bg-surface-container-low text-primary hover:bg-surface-container'"
                @click="insertTag(tag)"
              >
                +{{ tag }}
              </button>
            </div>
          </div>

          <!-- Body -->
          <div class="flex flex-col gap-1.5">
            <div class="flex items-center justify-between">
              <label class="font-label-caps text-xs font-semibold uppercase tracking-wider text-outline">Message Body</label>
              <button
                type="button"
                class="flex items-center gap-1 font-label-caps text-[11px] font-bold text-secondary transition-colors hover:text-electric-pink"
                @click="condenseBody"
              >
                <span class="material-symbols-outlined text-[14px]">auto_awesome</span>
                <span>e-mobilize AI: Condense to 1 Segment</span>
              </button>
            </div>
            <div class="rounded-xl border border-surface-container-high bg-surface-container-lowest p-2.5 shadow-sm transition-all focus-within:border-secondary">
              <textarea
                ref="messageBox"
                v-model="body"
                class="w-full resize-none bg-transparent font-body-md text-xs leading-relaxed text-primary focus:outline-none"
                rows="4"
                :maxlength="MAX_BODY"
                placeholder="Compose outbound broadcast SMS..."
              />
              <div class="mt-1 flex items-center justify-between border-t border-surface-container-low pt-2 font-label-caps text-[11px]">
                <span class="text-outline">
                  Encoding: <strong class="text-primary">{{ isGsm7 ? "GSM-7" : "Unicode" }}</strong>
                </span>
                <span class="font-bold" :class="charCount > 160 ? 'text-secondary' : 'text-action-green'">
                  {{ charCount }} / {{ isGsm7 ? 160 : 70 }} characters · {{ segments }} SMS segment{{ segments === 1 ? "" : "s" }}
                </span>
              </div>
            </div>
          </div>

          <!-- Timing -->
          <div class="flex flex-col gap-2">
            <label class="font-label-caps text-xs font-semibold uppercase tracking-wider text-outline">Dispatch Timing</label>
            <div class="flex flex-wrap items-center gap-3">
              <label class="flex cursor-pointer items-center gap-2 text-xs font-medium text-primary">
                <input v-model="timing" class="text-secondary focus:ring-secondary" type="radio" value="now" />
                <span>Send Immediately (Real-time queue)</span>
              </label>
              <label class="flex cursor-pointer items-center gap-2 text-xs font-medium text-outline hover:text-primary">
                <input v-model="timing" class="text-secondary focus:ring-secondary" type="radio" value="schedule" />
                <span>Schedule Dispatch</span>
              </label>
            </div>
            <input
              v-if="timing === 'schedule'"
              v-model="scheduleAt"
              type="datetime-local"
              class="w-full max-w-xs rounded-xl border border-surface-container-high bg-surface-container-low px-3 py-2 text-xs text-primary focus:outline-none"
            />
            <p class="flex items-center gap-1.5 font-body-md text-[11px] text-outline">
              <span class="material-symbols-outlined text-[14px] text-action-green">schedule</span>
              <span>Smart Quiet-Hours Protection: Auto-delays deliveries outside 9:00 AM – 8:00 PM in voter's local ward timezone.</span>
            </p>
          </div>
        </div>

        <!-- Preview + cost -->
        <div class="flex flex-col justify-between gap-5 bg-surface-container-low p-6 lg:col-span-5">
          <div class="flex flex-col gap-3.5">
            <div class="flex items-center justify-between">
              <span class="flex items-center gap-1.5 font-label-caps text-xs font-semibold uppercase tracking-wider text-outline">
                <span class="material-symbols-outlined text-[16px] text-primary">smartphone</span>
                <span>Live Device Preview</span>
              </span>
              <span class="rounded bg-surface-container px-2 py-0.5 font-label-caps text-[10px] font-bold text-on-surface-variant">
                Recipient: {{ previewContact?.name || "—" }}
              </span>
            </div>

            <div class="relative mx-auto flex w-full max-w-[280px] flex-col gap-3 rounded-[28px] border-4 border-deep-navy bg-surface-container-lowest p-3.5 shadow-lg">
              <div class="-mt-3.5 mx-auto flex h-4 w-24 items-center justify-center rounded-b-xl bg-deep-navy">
                <div class="h-1 w-10 rounded-full bg-surface-container-lowest/30" />
              </div>
              <div class="border-b border-surface-container-low pb-2 text-center">
                <div class="mx-auto flex h-8 w-8 items-center justify-center rounded-full bg-deep-navy font-label-caps text-xs font-bold text-pure-white">AP</div>
                <span class="mt-1 block font-button-text text-xs font-bold text-primary">{{ channelLabel }}</span>
                <span class="font-label-caps text-[10px] text-outline">SMS / Verified Campaign</span>
              </div>
              <div class="flex flex-col gap-2 py-1">
                <span class="text-center font-label-caps text-[9px] uppercase text-outline">Today · Preview</span>
                <div class="rounded-2xl rounded-tl-sm bg-surface-container-high p-3 font-body-md text-[11px] leading-relaxed text-primary shadow-sm">
                  <p class="whitespace-pre-wrap">{{ previewText }}</p>
                  <div class="mt-1 flex justify-end">
                    <span class="font-label-caps text-[9px] text-outline">Queued · Preview</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div class="flex flex-col gap-2.5 rounded-xl border border-surface-container-high bg-surface-container-lowest p-4 shadow-sm">
            <div class="flex items-center justify-between border-b border-surface-container-low pb-2">
              <span class="flex items-center gap-1.5 font-label-caps text-xs font-bold uppercase tracking-wider text-primary">
                <span class="material-symbols-outlined text-[16px] text-action-green">speed</span>
                <span>Delivery &amp; Cost Telemetry</span>
              </span>
              <span class="rounded bg-tertiary-fixed/40 px-1.5 font-label-caps text-[10px] font-bold text-on-tertiary-fixed">Tier A+ Route</span>
            </div>
            <div class="grid grid-cols-2 gap-2 font-body-md text-xs">
              <div class="flex flex-col">
                <span class="text-[11px] text-outline">Est. Delivery Time</span>
                <span class="font-bold text-primary">&lt; 45 seconds</span>
              </div>
              <div class="flex flex-col">
                <span class="text-[11px] text-outline">Throughput Rate</span>
                <span class="font-bold text-primary">250 msg / sec</span>
              </div>
              <div class="flex flex-col">
                <span class="text-[11px] text-outline">Carrier Pass Rate</span>
                <span class="font-bold text-action-green">99.4% est.</span>
              </div>
              <div class="flex flex-col">
                <span class="text-[11px] text-outline">Sender Reputation</span>
                <span class="font-bold text-primary">98/100 (High)</span>
              </div>
            </div>
            <div class="flex items-center justify-between border-t border-surface-container-low pt-2 text-xs">
              <span class="text-outline">Immediate Total ({{ selectedReachable.length }} msgs):</span>
              <span class="font-headline-md text-sm font-extrabold text-secondary">
                {{ naira(costSelected) }}
                <span class="text-[10px] font-normal text-outline">({{ creditsSelected }} credits)</span>
              </span>
            </div>
            <div class="flex items-center justify-between rounded-lg bg-surface-container-low p-2 text-[11px]">
              <span class="text-outline">Active Audience ({{ audience.length.toLocaleString() }}):</span>
              <span class="font-bold text-primary">{{ naira(costAudience) }}</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Footer -->
      <div class="flex flex-col items-center justify-between gap-3 border-t border-surface-container-low bg-surface-container-lowest px-6 py-4 sm:flex-row">
        <div class="flex items-center gap-2">
          <button
            type="button"
            class="flex items-center gap-1.5 font-button-text text-xs text-primary transition-colors hover:text-secondary disabled:opacity-50"
            :disabled="busy || !audience.length"
            @click="runDispatch(true)"
          >
            <span class="material-symbols-outlined text-[16px] text-outline">send_to_mobile</span>
            <span>Send Test SMS{{ admin?.name ? ` (as ${admin.name})` : "" }}</span>
          </button>
        </div>
        <div class="flex w-full items-center justify-end gap-3 sm:w-auto">
          <button
            type="button"
            class="rounded-xl border border-surface-container-high bg-surface-container-lowest px-4 py-2.5 font-button-text text-xs font-bold text-primary transition-all hover:bg-surface-container-low disabled:opacity-50"
            :disabled="busy"
            @click="emit('close')"
          >
            Cancel / Save Draft
          </button>
          <button
            type="button"
            class="flex items-center gap-2 rounded-xl bg-electric-pink px-5 py-2.5 font-button-text text-xs font-bold text-on-primary shadow-md shadow-electric-pink/30 transition-all hover:bg-secondary hover:shadow-lg disabled:opacity-50"
            :disabled="busy || !audience.length"
            @click="runDispatch(false)"
          >
            <span class="material-symbols-outlined text-[18px]">rocket_launch</span>
            <span>{{ busy ? "Dispatching…" : "Review & Dispatch Broadcast" }}</span>
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
