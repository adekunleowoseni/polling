<script setup lang="ts">
type TelecomStatus = {
  org_id: string;
  org_name: string | null;
  airtime_enabled: boolean;
  data_enabled: boolean;
  airtime_wallet_ngn: number;
  data_wallet_ngn: number;
};

type TelecomOrder = {
  id: string;
  org_id: string;
  org_name?: string | null;
  kind: string;
  status: string;
  line_items: {
    kind: string;
    label: string;
    quantity: number;
    unit_price: number;
    line_total: number;
  }[];
  total_ngn: number;
  notes: string;
  payment_ref?: string | null;
  created_at?: string;
  quoted_at?: string | null;
  paid_at?: string | null;
};

const emit = defineEmits<{ (e: "error", msg: string): void; (e: "message", msg: string): void }>();
const { authHeaders, apiBase, isSuperAdmin, admin } = useAdminAuth();

const loading = ref(true);
const busy = ref(false);
const status = ref<TelecomStatus | null>(null);
const orders = ref<TelecomOrder[]>([]);

const form = reactive({
  kind: "airtime" as "airtime" | "data",
  label: "",
  quantity: 100,
  unit_price: 500,
  notes: "",
});

const quoteDrafts = reactive<Record<string, number>>({});
const payRefs = reactive<Record<string, string>>({});

const canManage = computed(() => Boolean(admin.value?.org_id) || isSuperAdmin.value);

async function refresh() {
  if (!canManage.value && !isSuperAdmin.value) {
    loading.value = false;
    return;
  }
  loading.value = true;
  try {
    const tasks: Promise<unknown>[] = [
      $fetch<TelecomOrder[]>(`${apiBase}/admin/org-telecom/orders`, { headers: authHeaders() }).then(
        (rows) => {
          orders.value = rows;
        },
      ),
    ];
    if (admin.value?.org_id || !isSuperAdmin.value) {
      tasks.push(
        $fetch<TelecomStatus>(`${apiBase}/admin/org-telecom/status`, { headers: authHeaders() }).then(
          (s) => {
            status.value = s;
          },
        ),
      );
    } else {
      status.value = null;
    }
    await Promise.all(tasks);
  } catch (e: unknown) {
    emit("error", e instanceof Error ? e.message : "Failed to load telecom packs.");
  } finally {
    loading.value = false;
  }
}

async function toggleEnable(kind: "airtime" | "data", enabled: boolean) {
  busy.value = true;
  try {
    status.value = await $fetch<TelecomStatus>(`${apiBase}/admin/org-telecom/enable`, {
      method: "PATCH",
      headers: authHeaders(),
      body: kind === "airtime" ? { airtime_enabled: enabled } : { data_enabled: enabled },
    });
    emit("message", `${kind === "airtime" ? "Airtime" : "Data"} ${enabled ? "enabled" : "disabled"} for agents.`);
  } catch (e: unknown) {
    emit("error", e instanceof Error ? e.message : "Failed to update enablement.");
  } finally {
    busy.value = false;
  }
}

async function submitOrder() {
  if (!form.label.trim()) {
    emit("error", "Enter a pack label (e.g. ₦500 airtime x100).");
    return;
  }
  busy.value = true;
  try {
    await $fetch(`${apiBase}/admin/org-telecom/orders`, {
      method: "POST",
      headers: authHeaders(),
      body: {
        kind: form.kind,
        notes: form.notes.trim(),
        line_items: [
          {
            kind: form.kind,
            label: form.label.trim(),
            quantity: Number(form.quantity) || 1,
            unit_price: Number(form.unit_price) || 0,
            amount: Number(form.unit_price) || 0,
          },
        ],
      },
    });
    emit("message", "Pack request submitted. Super admin will quote / confirm payment.");
    form.notes = "";
    await refresh();
  } catch (e: unknown) {
    emit("error", e instanceof Error ? e.message : "Failed to submit pack request.");
  } finally {
    busy.value = false;
  }
}

async function quoteOrder(order: TelecomOrder) {
  const total = Number(quoteDrafts[order.id] ?? order.total_ngn);
  busy.value = true;
  try {
    await $fetch(`${apiBase}/admin/org-telecom/orders/${order.id}/quote`, {
      method: "PATCH",
      headers: authHeaders(),
      body: { total_ngn: total },
    });
    emit("message", "Order quoted. Org can mark paid after transfer.");
    await refresh();
  } catch (e: unknown) {
    emit("error", e instanceof Error ? e.message : "Failed to quote order.");
  } finally {
    busy.value = false;
  }
}

async function markPaid(order: TelecomOrder) {
  if (!confirm(`Confirm payment of ₦${order.total_ngn.toLocaleString()} for this pack? Wallet will be credited.`)) {
    return;
  }
  busy.value = true;
  try {
    await $fetch(`${apiBase}/admin/org-telecom/orders/${order.id}/mark-paid`, {
      method: "PATCH",
      headers: authHeaders(),
      body: { payment_ref: payRefs[order.id] || "" },
    });
    emit("message", "Payment recorded. Wallet credited — org can now enable for agents.");
    await refresh();
  } catch (e: unknown) {
    emit("error", e instanceof Error ? e.message : "Failed to mark paid.");
  } finally {
    busy.value = false;
  }
}

async function cancelOrder(order: TelecomOrder) {
  if (!confirm("Cancel this pack request?")) return;
  busy.value = true;
  try {
    await $fetch(`${apiBase}/admin/org-telecom/orders/${order.id}/cancel`, {
      method: "PATCH",
      headers: authHeaders(),
    });
    emit("message", "Order cancelled.");
    await refresh();
  } catch (e: unknown) {
    emit("error", e instanceof Error ? e.message : "Failed to cancel.");
  } finally {
    busy.value = false;
  }
}

function formatWhen(iso?: string | null) {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString(undefined, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
}

onMounted(() => void refresh());
</script>

<template>
  <div class="flex w-full flex-col gap-6 pb-10">
    <header class="flex flex-col justify-between gap-3 xl:flex-row xl:items-end">
      <div>
        <h1 class="font-headline-md text-2xl font-bold tracking-tight text-primary">Airtime &amp; Data Packs</h1>
        <p v-if="status?.org_name || admin?.org_name" class="mt-1 text-sm font-semibold text-deep-navy">
          {{ status?.org_name || admin?.org_name }}
        </p>
        <p class="mt-1 max-w-2xl text-sm text-on-surface-variant">
          Request or pay for prepaid airtime/data packs for field agents and members. After payment, enable claims — they debit your org wallet.
        </p>
      </div>
      <button
        type="button"
        class="inline-flex items-center gap-2 rounded-xl bg-surface-container px-4 py-2.5 text-sm hover:bg-surface-container-high disabled:opacity-50"
        :disabled="loading"
        @click="refresh"
      >
        Refresh
      </button>
    </header>

    <div v-if="loading" class="rounded-2xl bg-surface-container-lowest p-10 text-center text-sm text-outline">
      Loading…
    </div>

    <template v-else>
      <div v-if="status" class="grid gap-4 md:grid-cols-2">
        <div class="rounded-2xl bg-surface-container-lowest p-5 shadow-sm">
          <p class="font-label-caps text-[10px] uppercase text-outline">Airtime wallet</p>
          <p class="mt-1 font-hanken text-3xl text-deep-navy">₦{{ status.airtime_wallet_ngn.toLocaleString() }}</p>
          <label class="mt-4 flex items-center gap-2 text-sm text-on-surface">
            <input
              type="checkbox"
              class="h-4 w-4 accent-electric-pink"
              :checked="status.airtime_enabled"
              :disabled="busy || status.airtime_wallet_ngn <= 0"
              @change="toggleEnable('airtime', ($event.target as HTMLInputElement).checked)"
            />
            Enable airtime for agents
          </label>
          <p v-if="status.airtime_wallet_ngn <= 0" class="mt-2 text-xs text-outline">
            Pay for an airtime pack before enabling.
          </p>
        </div>
        <div class="rounded-2xl bg-surface-container-lowest p-5 shadow-sm">
          <p class="font-label-caps text-[10px] uppercase text-outline">Data wallet</p>
          <p class="mt-1 font-hanken text-3xl text-deep-navy">₦{{ status.data_wallet_ngn.toLocaleString() }}</p>
          <label class="mt-4 flex items-center gap-2 text-sm text-on-surface">
            <input
              type="checkbox"
              class="h-4 w-4 accent-electric-pink"
              :checked="status.data_enabled"
              :disabled="busy || status.data_wallet_ngn <= 0"
              @change="toggleEnable('data', ($event.target as HTMLInputElement).checked)"
            />
            Enable data for agents
          </label>
          <p v-if="status.data_wallet_ngn <= 0" class="mt-2 text-xs text-outline">
            Pay for a data pack before enabling.
          </p>
        </div>
      </div>

      <div
        v-if="admin?.org_id || !isSuperAdmin"
        class="space-y-3 rounded-2xl bg-surface-container-lowest p-6 shadow-sm"
      >
        <h2 class="font-headline-md text-lg font-bold text-primary">Request a pack</h2>
        <div class="grid gap-3 md:grid-cols-4">
          <select v-model="form.kind" class="rounded-xl bg-off-white px-3 py-2.5 text-sm outline-none">
            <option value="airtime">Airtime</option>
            <option value="data">Data</option>
          </select>
          <input
            v-model="form.label"
            type="text"
            placeholder="Label (e.g. Field agent ₦500)"
            class="rounded-xl bg-off-white px-3 py-2.5 text-sm outline-none md:col-span-2"
          />
          <input
            v-model.number="form.quantity"
            type="number"
            min="1"
            placeholder="Qty"
            class="rounded-xl bg-off-white px-3 py-2.5 text-sm outline-none"
          />
          <input
            v-model.number="form.unit_price"
            type="number"
            min="0"
            placeholder="Unit ₦"
            class="rounded-xl bg-off-white px-3 py-2.5 text-sm outline-none"
          />
          <input
            v-model="form.notes"
            type="text"
            placeholder="Notes for HQ / payment"
            class="rounded-xl bg-off-white px-3 py-2.5 text-sm outline-none md:col-span-2"
          />
          <button
            type="button"
            class="rounded-xl bg-electric-pink px-4 py-2.5 text-sm font-semibold text-on-brand disabled:opacity-50 md:col-span-1"
            :disabled="busy"
            @click="submitOrder"
          >
            Submit request
          </button>
        </div>
        <p class="text-xs text-outline">
          Estimated total: ₦{{ ((Number(form.quantity) || 0) * (Number(form.unit_price) || 0)).toLocaleString() }}
        </p>
      </div>

      <div class="rounded-2xl bg-surface-container-lowest p-6 shadow-sm">
        <h2 class="mb-4 font-headline-md text-lg font-bold text-primary">Pack orders</h2>
        <p v-if="!orders.length" class="py-8 text-center text-sm text-outline">No pack orders yet.</p>
        <div v-else class="space-y-3">
          <div
            v-for="order in orders"
            :key="order.id"
            class="rounded-xl border border-outline-variant/40 bg-off-white p-4"
          >
            <div class="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p class="font-hanken-semibold text-base text-deep-navy">
                  {{ order.org_name || "Organization" }} · {{ order.kind }}
                </p>
                <p class="mt-1 text-xs text-outline">
                  {{ formatWhen(order.created_at) }} ·
                  <span class="uppercase">{{ order.status }}</span>
                  · ₦{{ order.total_ngn.toLocaleString() }}
                </p>
                <ul class="mt-2 space-y-1 text-sm text-on-surface-variant">
                  <li v-for="(line, idx) in order.line_items" :key="idx">
                    {{ line.quantity }} × {{ line.label }} @ ₦{{ line.unit_price.toLocaleString() }}
                  </li>
                </ul>
                <p v-if="order.notes" class="mt-2 text-xs text-outline">{{ order.notes }}</p>
              </div>
              <div class="flex flex-col gap-2">
                <template v-if="isSuperAdmin && (order.status === 'requested' || order.status === 'quoted')">
                  <input
                    v-model.number="quoteDrafts[order.id]"
                    type="number"
                    class="w-36 rounded-lg bg-surface-container-lowest px-2 py-1.5 text-sm"
                    :placeholder="String(order.total_ngn)"
                  />
                  <button
                    type="button"
                    class="rounded-lg bg-deep-navy px-3 py-1.5 text-xs font-semibold text-pure-white disabled:opacity-50"
                    :disabled="busy"
                    @click="quoteOrder(order)"
                  >
                    Set quote
                  </button>
                </template>
                <template v-if="order.status === 'requested' || order.status === 'quoted'">
                  <input
                    v-model="payRefs[order.id]"
                    type="text"
                    placeholder="Payment ref"
                    class="w-40 rounded-lg bg-surface-container-lowest px-2 py-1.5 text-sm"
                  />
                  <button
                    type="button"
                    class="rounded-lg bg-action-green px-3 py-1.5 text-xs font-semibold text-deep-navy disabled:opacity-50"
                    :disabled="busy"
                    @click="markPaid(order)"
                  >
                    Mark paid
                  </button>
                  <button
                    type="button"
                    class="rounded-lg bg-error-container/60 px-3 py-1.5 text-xs font-semibold text-error disabled:opacity-50"
                    :disabled="busy"
                    @click="cancelOrder(order)"
                  >
                    Cancel
                  </button>
                </template>
              </div>
            </div>
          </div>
        </div>
      </div>
    </template>
  </div>
</template>
