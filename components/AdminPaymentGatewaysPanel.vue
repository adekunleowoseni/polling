<script setup lang="ts">
import {
  useDisbursements,
  type PaymentProviders,
} from "~/composables/useDisbursements";

const emit = defineEmits<{
  (e: "error", msg: string): void;
  (e: "message", msg: string): void;
}>();

const { isSuperAdmin } = useAdminAuth();
const { loadPaymentProviders, savePaymentProviders, loadCentral } = useDisbursements();

const loading = ref(true);
const saving = ref(false);
const providers = ref<PaymentProviders | null>(null);
const providerFlags = ref<Record<string, boolean>>({});

const paystackSecret = ref("");
const paystackWebhook = ref("");
const alatKey = ref("");
const alatSecret = ref("");
const alatBaseUrl = ref("");
const paystackPreferred = ref(true);
const alatPreferred = ref(false);

onMounted(() => void refresh());

async function refresh() {
  if (!isSuperAdmin.value) {
    loading.value = false;
    return;
  }
  loading.value = true;
  try {
    providers.value = await loadPaymentProviders();
    paystackPreferred.value = providers.value.paystack_preferred;
    alatPreferred.value = providers.value.alat_preferred;
    alatBaseUrl.value = providers.value.alat_base_url ?? "";
    const central = await loadCentral().catch(() => null);
    providerFlags.value = central?.providers ?? {};
  } catch (e: unknown) {
    emit("error", e instanceof Error ? e.message : "Failed to load payment gateways.");
  } finally {
    loading.value = false;
  }
}

async function save() {
  saving.value = true;
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
    emit("message", "Payment gateway credentials saved.");
    await refresh();
  } catch (e: unknown) {
    emit("error", e instanceof Error ? e.message : "Failed to save credentials.");
  } finally {
    saving.value = false;
  }
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
            Settlement Rails
          </span>
        </div>
        <h1 class="font-headline-md text-2xl font-bold tracking-tight text-primary sm:text-headline-md">
          Payment Gateway Configuration
        </h1>
        <p class="mt-1 max-w-2xl text-sm text-on-surface-variant">
          Configure Paystack and ALAT by Wema settlement credentials for chapter disbursements and field Tap-to-Give rails.
        </p>
      </div>
      <button
        type="button"
        class="inline-flex items-center gap-2 rounded-xl bg-surface-container px-4 py-2.5 text-sm text-on-surface hover:bg-surface-container-high disabled:opacity-50"
        :disabled="loading"
        @click="refresh"
      >
        <span class="material-symbols-outlined text-[18px]">sync</span>
        Refresh status
      </button>
    </header>

    <div
      v-if="!isSuperAdmin"
      class="rounded-2xl bg-surface-container-lowest p-8 text-center text-sm text-outline shadow-sm"
    >
      Payment gateway credentials are restricted to super admins.
    </div>

    <div v-else-if="loading" class="rounded-2xl bg-surface-container-lowest p-10 text-center text-sm text-outline shadow-sm">
      Loading payment gateways…
    </div>

    <template v-else>
      <div class="grid grid-cols-1 gap-4 md:grid-cols-3">
        <div class="rounded-2xl bg-surface-container-lowest p-5 shadow-sm">
          <div class="flex items-center justify-between">
            <span class="font-label-caps text-xs uppercase text-outline">Active rail</span>
            <span class="h-2 w-2 rounded-full bg-action-green" />
          </div>
          <p class="mt-2 text-xl font-bold text-primary">{{ providers?.active_provider || "—" }}</p>
          <p class="mt-1 text-xs text-outline">Source: {{ providers?.config_source || "—" }}</p>
        </div>
        <div class="rounded-2xl bg-surface-container-lowest p-5 shadow-sm">
          <div class="flex items-center justify-between">
            <span class="font-label-caps text-xs uppercase text-outline">Paystack</span>
            <span
              class="font-label-caps text-[10px] font-bold"
              :class="providerFlags.paystack || providers?.paystack_configured ? 'text-action-green' : 'text-outline'"
            >
              {{ providerFlags.paystack || providers?.paystack_configured ? "HEALTHY" : "NOT CONFIGURED" }}
            </span>
          </div>
          <p class="mt-2 text-sm text-on-surface">
            {{ providers?.paystack_secret_masked || "No secret on file" }}
          </p>
        </div>
        <div class="rounded-2xl bg-surface-container-lowest p-5 shadow-sm">
          <div class="flex items-center justify-between">
            <span class="font-label-caps text-xs uppercase text-outline">ALAT by Wema</span>
            <span
              class="font-label-caps text-[10px] font-bold"
              :class="providerFlags.alat || providers?.alat_configured ? 'text-action-green' : 'text-outline'"
            >
              {{ providerFlags.alat || providers?.alat_configured ? "SYNC ACTIVE" : "STANDBY" }}
            </span>
          </div>
          <p class="mt-2 text-sm text-on-surface">
            {{ providers?.alat_api_key_masked || "No API key on file" }}
          </p>
        </div>
      </div>

      <div class="grid gap-4 lg:grid-cols-2">
        <div class="space-y-3 rounded-2xl bg-surface-container-lowest p-6 shadow-sm">
          <div class="flex items-center justify-between">
            <h2 class="font-headline-md text-lg font-bold text-primary">Paystack Connect</h2>
            <label class="flex items-center gap-2 text-xs text-outline">
              <input v-model="paystackPreferred" type="checkbox" class="rounded" />
              Prefer Paystack
            </label>
          </div>
          <p class="text-xs text-outline">Leave secret fields blank to keep existing values.</p>
          <input
            v-model="paystackSecret"
            type="password"
            placeholder="New secret key (sk_live_…)"
            class="w-full rounded-xl bg-off-white px-3 py-2.5 text-sm text-on-surface outline-none"
          />
          <input
            v-model="paystackWebhook"
            type="password"
            placeholder="Webhook secret (optional)"
            class="w-full rounded-xl bg-off-white px-3 py-2.5 text-sm text-on-surface outline-none"
          />
        </div>

        <div class="space-y-3 rounded-2xl bg-surface-container-lowest p-6 shadow-sm">
          <div class="flex items-center justify-between">
            <h2 class="font-headline-md text-lg font-bold text-primary">ALAT by Wema</h2>
            <label class="flex items-center gap-2 text-xs text-outline">
              <input v-model="alatPreferred" type="checkbox" class="rounded" />
              Prefer ALAT
            </label>
          </div>
          <p class="text-xs text-outline">API base URL and secrets for instant bank payouts.</p>
          <input
            v-model="alatBaseUrl"
            type="url"
            placeholder="API base URL"
            class="w-full rounded-xl bg-off-white px-3 py-2.5 text-sm text-on-surface outline-none"
          />
          <input
            v-model="alatKey"
            type="password"
            placeholder="New API key"
            class="w-full rounded-xl bg-off-white px-3 py-2.5 text-sm text-on-surface outline-none"
          />
          <input
            v-model="alatSecret"
            type="password"
            placeholder="New API secret"
            class="w-full rounded-xl bg-off-white px-3 py-2.5 text-sm text-on-surface outline-none"
          />
        </div>
      </div>

      <div class="flex justify-end">
        <button
          type="button"
          class="rounded-xl bg-electric-pink px-5 py-2.5 text-sm font-semibold text-pure-white disabled:opacity-50"
          :disabled="saving"
          @click="save"
        >
          {{ saving ? "Saving…" : "Save payment credentials" }}
        </button>
      </div>
    </template>
  </div>
</template>
