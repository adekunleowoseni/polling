<script setup lang="ts">
import {
  useAdminCrm,
  type AdminCrmSmsDispatchSummary,
} from "~/composables/useAdminCrm";

const emit = defineEmits<{
  (e: "error", msg: string): void;
  (e: "message", msg: string): void;
}>();

const { listSmsDispatches, crmError } = useAdminCrm();
const { setTab, smsAnalyticsDispatchId, openSmsAnalytics } = useAdminShell();

const loading = ref(true);
const items = ref<AdminCrmSmsDispatchSummary[]>([]);

const selectedId = computed({
  get: () => smsAnalyticsDispatchId.value,
  set: (value: string | null) => {
    smsAnalyticsDispatchId.value = value;
  },
});

watch(
  () => selectedId.value,
  async (id) => {
    if (!id && items.value.length) {
      // keep list view
    }
  },
);

onMounted(refresh);

async function refresh() {
  loading.value = true;
  try {
    items.value = await listSmsDispatches();
    if (!selectedId.value && items.value.length) {
      selectedId.value = items.value[0].id;
    }
    if (selectedId.value && !items.value.some((item) => item.id === selectedId.value)) {
      selectedId.value = items.value[0]?.id ?? null;
    }
  } catch (e: unknown) {
    emit("error", crmError(e, "Could not load SMS dispatches."));
    items.value = [];
  } finally {
    loading.value = false;
  }
}

function formatWhen(iso: string | null) {
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

function goDirectory() {
  setTab("agents");
}

function onFollowUp() {
  setTab("agents");
  emit("message", "Open Broadcast SMS from the directory batch bar to deploy a follow-up.");
}
</script>

<template>
  <div class="flex w-full flex-col gap-6">
    <AdminCrmSmsAnalytics
      v-if="selectedId"
      :dispatch-id="selectedId"
      @back="selectedId = null"
      @error="(msg: string) => emit('error', msg)"
      @message="(msg: string) => emit('message', msg)"
      @follow-up="onFollowUp"
    />

    <template v-else>
      <header class="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div class="min-w-0 flex-1 flex flex-col gap-1.5">
          <div class="flex flex-wrap items-center gap-2">
            <span class="font-label-caps text-label-caps uppercase tracking-wider text-outline">HQ Central Command</span>
            <span class="text-xs text-outline">/</span>
            <span class="font-label-caps text-label-caps font-bold uppercase tracking-wider text-secondary">
              SMS Broadcast Analytics
            </span>
          </div>
          <h1 class="font-headline-md text-2xl font-bold tracking-tight text-primary sm:text-headline-md">
            SMS Delivery &amp; Response Analytics
          </h1>
          <p class="text-sm text-on-surface-variant">
            Open a completed dispatch to review delivery, carrier funnel, and inbound replies.
          </p>
        </div>
        <div class="grid w-full grid-cols-1 gap-2 sm:grid-cols-2 lg:w-auto lg:shrink-0">
          <button
            type="button"
            class="inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-surface-container-lowest px-4 font-button-text text-sm font-semibold text-primary shadow-sm transition hover:bg-surface-container-low"
            @click="refresh"
          >
            <span class="material-symbols-outlined shrink-0 text-[18px] text-outline">sync</span>
            <span>Refresh</span>
          </button>
          <button
            type="button"
            class="inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-electric-pink px-4 font-button-text text-sm font-semibold text-pure-white shadow-sm shadow-electric-pink/25 transition hover:opacity-95"
            @click="goDirectory"
          >
            <span class="material-symbols-outlined shrink-0 text-[18px]">group</span>
            <span class="truncate">Voter directory</span>
          </button>
        </div>
      </header>

      <div v-if="loading" class="rounded-xl bg-surface-container-lowest p-10 text-center text-sm text-outline shadow-sm">
        Loading SMS dispatches…
      </div>

      <div
        v-else-if="!items.length"
        class="rounded-xl bg-surface-container-lowest p-10 text-center shadow-sm"
      >
        <div class="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-electric-pink/15 text-electric-pink">
          <span class="material-symbols-outlined text-[28px]">cell_tower</span>
        </div>
        <p class="font-button-text text-sm font-bold text-primary">No SMS broadcasts yet</p>
        <p class="mt-1 text-sm text-outline">
          Dispatch a broadcast from Supporter CRM, then return here for delivery analytics.
        </p>
        <button
          type="button"
          class="mt-4 rounded-xl bg-deep-navy px-4 py-2 text-sm font-bold text-pure-white"
          @click="goDirectory"
        >
          Go to Voter Directory
        </button>
      </div>

      <div v-else class="overflow-hidden rounded-xl bg-surface-container-lowest shadow-sm">
        <div class="border-b border-outline-variant/30 px-5 py-4">
          <h2 class="font-semibold text-primary">Recent dispatches</h2>
          <p class="text-xs text-outline">{{ items.length }} completed broadcast{{ items.length === 1 ? "" : "s" }}</p>
        </div>
        <ul class="divide-y divide-surface-container-low">
          <li v-for="item in items" :key="item.id">
            <button
              type="button"
              class="flex w-full items-center justify-between gap-4 px-5 py-4 text-left transition-colors hover:bg-surface-container-low"
              @click="openSmsAnalytics(item.id)"
            >
              <div class="min-w-0">
                <p class="truncate font-button-text text-sm font-bold text-primary">{{ item.title }}</p>
                <p class="mt-0.5 font-label-caps text-[11px] text-outline">
                  {{ formatWhen(item.created_at) }} · {{ item.channel }} · {{ item.queued.toLocaleString() }} queued ·
                  {{ item.credits }} credits
                </p>
              </div>
              <span class="material-symbols-outlined text-outline">chevron_right</span>
            </button>
          </li>
        </ul>
      </div>
    </template>
  </div>
</template>
