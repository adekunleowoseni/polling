<script setup lang="ts">
type AirtimeAmount = { amount: number; enabled: boolean };

type AirtimeCredit = {
  id: string;
  phone: string;
  network: string;
  amount: number;
  request_id: string;
  status: string;
  created_at: string;
  agent_name?: string | null;
  agent_email?: string | null;
};

const emit = defineEmits<{ (e: "error", msg: string): void; (e: "message", msg: string): void }>();

const { authHeaders, apiBase } = useAdminAuth();

const vtpassConfigured = ref(false);
const vtpassBalance = ref<number | null>(null);
const loadingBalance = ref(false);
const airtimeAmounts = ref<AirtimeAmount[]>([]);
const airtimeCredits = ref<AirtimeCredit[]>([]);
const newAirtimeAmount = ref<number | null>(null);
const loadingAirtime = ref(false);
const savingAirtime = ref(false);
const savingSettings = ref(false);
const strictOnce = ref(false);

const enabledCount = computed(() => airtimeAmounts.value.filter((a) => a.enabled).length);

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

async function loadAirtimeAmounts() {
  loadingAirtime.value = true;
  try {
    airtimeAmounts.value = await $fetch<AirtimeAmount[]>(`${apiBase}/admin/airtime/amounts`, {
      headers: authHeaders(),
    });
  } catch {
    airtimeAmounts.value = [];
  } finally {
    loadingAirtime.value = false;
  }
}

function addAirtimeAmount() {
  const value = Number(newAirtimeAmount.value);
  if (!value || value <= 0) {
    emit("error", "Enter a valid airtime amount.");
    return;
  }
  if (airtimeAmounts.value.some((a) => a.amount === value)) {
    emit("error", "That amount already exists.");
    return;
  }
  airtimeAmounts.value = [...airtimeAmounts.value, { amount: value, enabled: true }].sort(
    (a, b) => a.amount - b.amount,
  );
  newAirtimeAmount.value = null;
}

function removeAirtimeAmount(amount: number) {
  airtimeAmounts.value = airtimeAmounts.value.filter((a) => a.amount !== amount);
}

async function saveAirtimeAmounts() {
  savingAirtime.value = true;
  try {
    airtimeAmounts.value = await $fetch<AirtimeAmount[]>(`${apiBase}/admin/airtime/amounts`, {
      method: "PUT",
      headers: authHeaders(),
      body: { plans: airtimeAmounts.value },
    });
    emit(
      "message",
      `Saved ${airtimeAmounts.value.length} amount(s), ${enabledCount.value} enabled for agents.`,
    );
  } catch (err: unknown) {
    const detail = (err as { data?: { detail?: string } })?.data?.detail;
    emit("error", typeof detail === "string" ? detail : "Failed to save airtime amounts.");
  } finally {
    savingAirtime.value = false;
  }
}

async function loadAirtimeCredits() {
  try {
    airtimeCredits.value = await $fetch<AirtimeCredit[]>(`${apiBase}/admin/airtime/credits`, {
      headers: authHeaders(),
    });
  } catch {
    airtimeCredits.value = [];
  }
}

async function loadSettings() {
  try {
    const s = await $fetch<{ strict_one_airtime_claim_per_phone?: boolean }>(`${apiBase}/admin/settings`, {
      headers: authHeaders(),
    });
    strictOnce.value = !!s.strict_one_airtime_claim_per_phone;
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
      body: { strict_one_airtime_claim_per_phone: checked },
    });
    strictOnce.value = checked;
    emit("message", checked ? "One-claim-per-phone airtime rule active." : "Airtime one-claim rule turned off.");
  } catch {
    emit("error", "Failed to save settings.");
  } finally {
    savingSettings.value = false;
  }
}

onMounted(async () => {
  await Promise.all([loadVtpassBalance(), loadAirtimeAmounts(), loadAirtimeCredits(), loadSettings()]);
});
</script>

<template>
  <div class="flex w-full flex-col gap-6 pb-10">
    <section class="flex flex-col gap-4">
      <div class="flex flex-wrap items-center gap-2">
        <span class="font-label-caps text-label-caps uppercase tracking-wider text-outline">HQ Central Command</span>
        <span class="text-outline">/</span>
        <span class="font-label-caps text-label-caps font-bold uppercase tracking-wider text-secondary">
          System · Airtime
        </span>
      </div>
      <div class="flex flex-col justify-between gap-4 xl:flex-row xl:items-end">
        <div>
          <h1 class="font-headline-md text-2xl font-bold tracking-tight text-primary sm:text-headline-md">
            Agent Airtime Command
          </h1>
          <p class="mt-1 max-w-2xl text-sm text-on-surface-variant">
            Control which airtime amounts agents can buy via VTpass, then monitor recent settlements.
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
        <span class="font-label-caps text-xs uppercase text-outline">Configured amounts</span>
        <p class="mt-2 text-3xl font-extrabold text-primary">{{ airtimeAmounts.length }}</p>
      </div>
      <div class="rounded-2xl bg-surface-container-lowest p-5 shadow-sm">
        <span class="font-label-caps text-xs uppercase text-outline">Enabled for agents</span>
        <p class="mt-2 text-3xl font-extrabold text-action-green">{{ enabledCount }}</p>
      </div>
      <div class="flex items-center justify-between rounded-2xl bg-surface-container-lowest p-5 shadow-sm">
        <div>
          <span class="font-label-caps text-xs uppercase text-outline">One claim per phone</span>
          <p class="mt-1 text-sm text-on-surface-variant">Strict airtime rule</p>
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
        <label class="min-w-[160px]">
          <span class="font-label-caps text-[11px] uppercase text-outline">Add amount (₦)</span>
          <input
            v-model.number="newAirtimeAmount"
            type="number"
            min="1"
            step="50"
            placeholder="e.g. 750"
            class="mt-1 w-full rounded-xl bg-off-white px-3 py-2.5 text-sm outline-none"
            @keyup.enter="addAirtimeAmount"
          />
        </label>
        <button
          type="button"
          class="rounded-xl bg-surface-container px-4 py-2.5 text-sm text-on-surface hover:bg-surface-container-high"
          @click="addAirtimeAmount"
        >
          Add amount
        </button>
        <button
          type="button"
          class="rounded-xl bg-electric-pink px-4 py-2.5 text-sm font-semibold text-pure-white disabled:opacity-50"
          :disabled="savingAirtime"
          @click="saveAirtimeAmounts"
        >
          {{ savingAirtime ? "Saving…" : "Save amounts" }}
        </button>
      </div>
    </section>

    <section class="overflow-hidden rounded-2xl bg-surface-container-lowest shadow-sm">
      <div class="border-b border-outline-variant/30 px-5 py-4">
        <h2 class="font-headline-md text-lg font-bold text-primary">Airtime amounts</h2>
        <p class="text-xs text-outline">Tick to enable for agents</p>
      </div>
      <div v-if="loadingAirtime" class="p-10 text-center text-sm text-outline">Loading amounts…</div>
      <div v-else-if="!airtimeAmounts.length" class="p-10 text-center text-sm text-outline">
        No amounts yet. Add one above.
      </div>
      <ul v-else class="max-h-[28rem] divide-y divide-outline-variant/20 overflow-y-auto">
        <li v-for="opt in airtimeAmounts" :key="opt.amount" class="flex items-center gap-3 px-5 py-3">
          <input :id="`airtime-${opt.amount}`" v-model="opt.enabled" type="checkbox" class="h-4 w-4 rounded" />
          <label :for="`airtime-${opt.amount}`" class="min-w-0 flex-1 cursor-pointer">
            <p class="text-sm font-medium text-on-surface">₦{{ opt.amount.toLocaleString() }}</p>
            <p class="text-xs text-outline">{{ opt.enabled ? "Enabled" : "Disabled" }}</p>
          </label>
          <button
            type="button"
            class="rounded-lg bg-error/10 px-2.5 py-1 text-xs text-error"
            @click="removeAirtimeAmount(opt.amount)"
          >
            Remove
          </button>
        </li>
      </ul>
    </section>

    <section class="overflow-hidden rounded-2xl bg-surface-container-lowest shadow-sm">
      <div class="flex items-center justify-between border-b border-outline-variant/30 px-5 py-4">
        <div>
          <h2 class="font-headline-md text-lg font-bold text-primary">Recent airtime</h2>
          <p class="text-xs text-outline">Agent settlements</p>
        </div>
        <button type="button" class="text-xs font-semibold text-electric-pink hover:underline" @click="loadAirtimeCredits">
          Refresh
        </button>
      </div>
      <div v-if="!airtimeCredits.length" class="p-8 text-center text-sm text-outline">No airtime yet.</div>
      <div v-else class="overflow-x-auto">
        <table class="w-full text-left text-sm">
          <thead>
            <tr class="bg-surface-container-low font-label-caps text-[11px] uppercase text-on-surface-variant">
              <th class="px-4 py-3">Agent</th>
              <th class="px-4 py-3">Phone</th>
              <th class="px-4 py-3">Amount</th>
              <th class="px-4 py-3">Status</th>
              <th class="px-4 py-3">When</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="credit in airtimeCredits" :key="credit.id" class="hover:bg-surface-container-low/50">
              <td class="px-4 py-3">
                <p class="text-on-surface">{{ credit.agent_name || "—" }}</p>
                <p class="text-xs text-outline">{{ credit.agent_email || "—" }}</p>
              </td>
              <td class="px-4 py-3 text-on-surface-variant">{{ credit.phone || "—" }} · {{ credit.network || "—" }}</td>
              <td class="px-4 py-3 text-on-surface">₦{{ (credit.amount ?? 0).toLocaleString() }}</td>
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
