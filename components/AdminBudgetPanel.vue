<script setup lang="ts">
import {
  formatBudgetNaira,
  useBudget,
  type BudgetCampaign,
  type BudgetDonation,
} from "~/composables/useBudget";

const emit = defineEmits<{
  (e: "error", msg: string): void;
  (e: "message", msg: string): void;
}>();

const { admin, isSuperAdmin, isImpersonating } = useAdminAuth();
const { selectedOrg, selectedOrgId, organizations, loadOrganizations, selectOrganization } = useAdminOrgContext();
const { listCampaigns, createCampaign, setCampaignStatus, listDonations } = useBudget();

const loading = ref(true);
const saving = ref(false);
const statusBusyId = ref<string | null>(null);
const campaigns = ref<BudgetCampaign[]>([]);
const selectedId = ref<string | null>(null);
const donations = ref<BudgetDonation[]>([]);
const loadingDonations = ref(false);

const form = reactive({
  title: "",
  description: "",
  goal_amount: 1_000_000,
  threshold_amount: 250_000,
  status: "active" as "draft" | "active" | "paused" | "stopped",
});

const orgLabel = computed(() => {
  if (admin.value?.org_name) return admin.value.org_name;
  if (selectedOrg.value) return selectedOrg.value.legal_name || selectedOrg.value.name;
  return null;
});

const needsOrgPick = computed(
  () => isSuperAdmin.value && !isImpersonating.value && !selectedOrgId.value,
);

const selected = computed(() => campaigns.value.find((c) => c.id === selectedId.value) || null);

const totals = computed(() => {
  const goal = campaigns.value.reduce((s, c) => s + c.goal_amount, 0);
  const raised = campaigns.value.reduce((s, c) => s + c.raised_amount, 0);
  const active = campaigns.value.filter((c) => c.status === "active").length;
  const donors = campaigns.value.reduce((s, c) => s + c.donor_count, 0);
  return { goal, raised, active, donors };
});

async function refresh() {
  if (needsOrgPick.value) {
    campaigns.value = [];
    selectedId.value = null;
    donations.value = [];
    loading.value = false;
    return;
  }
  loading.value = true;
  try {
    campaigns.value = await listCampaigns();
    if (selectedId.value && !campaigns.value.some((c) => c.id === selectedId.value)) {
      selectedId.value = null;
      donations.value = [];
    }
    if (!selectedId.value && campaigns.value.length) {
      selectedId.value = campaigns.value[0].id;
      await loadDonations(selectedId.value);
    } else if (selectedId.value) {
      await loadDonations(selectedId.value);
    }
  } catch (e: unknown) {
    emit("error", e instanceof Error ? e.message : "Could not load budget campaigns.");
  } finally {
    loading.value = false;
  }
}

async function loadDonations(id: string) {
  loadingDonations.value = true;
  try {
    donations.value = await listDonations(id);
  } catch {
    donations.value = [];
  } finally {
    loadingDonations.value = false;
  }
}

async function selectCampaign(id: string) {
  selectedId.value = id;
  await loadDonations(id);
}

async function create() {
  if (!form.title.trim()) {
    emit("error", "Add a campaign title.");
    return;
  }
  if (form.threshold_amount > form.goal_amount) {
    emit("error", "Threshold cannot be higher than the goal.");
    return;
  }
  if (needsOrgPick.value) {
    emit("error", "Select an organization first.");
    return;
  }
  saving.value = true;
  try {
    const created = await createCampaign({
      title: form.title.trim(),
      description: form.description.trim() || undefined,
      goal_amount: Number(form.goal_amount) || 0,
      threshold_amount: Number(form.threshold_amount) || 0,
      status: form.status,
    });
    emit("message", `Campaign “${created.title}” created.`);
    form.title = "";
    form.description = "";
    form.goal_amount = 1_000_000;
    form.threshold_amount = 250_000;
    form.status = "active";
    await refresh();
    selectedId.value = created.id;
    await loadDonations(created.id);
  } catch (e: unknown) {
    const detail =
      e && typeof e === "object" && "data" in e
        ? String((e as { data?: { detail?: string } }).data?.detail || "")
        : "";
    emit("error", detail || (e instanceof Error ? e.message : "Could not create campaign."));
  } finally {
    saving.value = false;
  }
}

async function setStatus(id: string, status: "active" | "paused" | "stopped") {
  statusBusyId.value = id;
  try {
    await setCampaignStatus(id, status);
    const label = status === "active" ? "resumed" : status === "paused" ? "paused" : "stopped";
    emit("message", `Campaign ${label}.`);
    await refresh();
  } catch (e: unknown) {
    const detail =
      e && typeof e === "object" && "data" in e
        ? String((e as { data?: { detail?: string } }).data?.detail || "")
        : "";
    emit("error", detail || (e instanceof Error ? e.message : "Could not update campaign status."));
  } finally {
    statusBusyId.value = null;
  }
}

function statusLabel(status: string) {
  if (status === "active") return "Active";
  if (status === "paused") return "Paused";
  if (status === "stopped" || status === "closed") return "Stopped";
  if (status === "draft") return "Draft";
  return status;
}

function statusBadgeClass(status: string) {
  if (status === "active") return "bg-action-green/15 text-action-green";
  if (status === "paused") return "bg-electric-pink/15 text-electric-pink";
  if (status === "stopped" || status === "closed") return "bg-error/10 text-error";
  return "bg-surface-container-high text-on-surface-variant";
}

function canResume(status: string) {
  return status === "paused" || status === "stopped" || status === "closed" || status === "draft";
}

function canPause(status: string) {
  return status === "active";
}

function canStop(status: string) {
  return status === "active" || status === "paused" || status === "draft";
}

function formatWhen(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

onMounted(async () => {
  if (isSuperAdmin.value) await loadOrganizations().catch(() => undefined);
  await refresh();
});

watch(selectedOrgId, () => void refresh());
</script>

<template>
  <div class="flex w-full flex-col gap-6 pb-10">
    <header class="flex flex-col justify-between gap-4 xl:flex-row xl:items-end">
      <div>
        <div class="mb-2 flex flex-wrap items-center gap-2">
          <span class="font-label-caps text-label-caps uppercase tracking-wider text-outline">HQ Central Command</span>
          <span class="text-outline">/</span>
          <span class="font-label-caps text-label-caps font-bold uppercase tracking-wider text-secondary">Budget</span>
        </div>
        <h1 class="font-headline-md text-2xl font-bold tracking-tight text-primary sm:text-headline-md">Budget</h1>
        <p class="mt-1 max-w-2xl text-sm text-on-surface-variant">
          Create fundraising scenarios for
          <span class="font-semibold text-on-surface">{{ orgLabel || "your organization" }}</span>.
          After creating one, you can pause or stop it anytime. Supporters only donate while it is active.
        </p>
      </div>
      <button
        type="button"
        class="inline-flex items-center gap-2 rounded-xl bg-surface-container px-4 py-2.5 text-sm font-semibold text-on-surface hover:bg-surface-container-high disabled:opacity-50"
        :disabled="loading"
        @click="refresh"
      >
        <span class="material-symbols-outlined text-[18px]">refresh</span>
        Refresh
      </button>
    </header>

    <div
      v-if="needsOrgPick"
      class="rounded-2xl bg-surface-container-lowest p-6 shadow-sm"
    >
      <p class="text-sm font-semibold text-primary">Choose an organization</p>
      <p class="mt-1 text-sm text-on-surface-variant">
        Budget is per organization. Select one to create and monitor its fundraising campaigns.
      </p>
      <div class="mt-4 flex flex-wrap gap-2">
        <button
          v-for="org in organizations"
          :key="org.id"
          type="button"
          class="rounded-xl border border-outline-variant/40 bg-off-white px-3 py-2 text-sm font-semibold text-on-surface hover:border-electric-pink"
          @click="selectOrganization(org.id)"
        >
          {{ org.legal_name || org.name }}
        </button>
      </div>
      <p v-if="!organizations.length" class="mt-3 text-sm text-outline">No organizations loaded yet.</p>
    </div>

    <template v-else>
      <div v-if="loading" class="rounded-2xl bg-surface-container-lowest p-10 text-center text-sm text-outline shadow-sm">
        Loading budget…
      </div>

      <template v-else>
        <div class="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <div class="rounded-2xl bg-surface-container-lowest p-5 shadow-sm">
            <p class="text-xs font-semibold uppercase tracking-wide text-outline">Raised</p>
            <p class="mt-2 text-3xl font-extrabold text-primary">{{ formatBudgetNaira(totals.raised) }}</p>
            <p class="mt-1 text-xs text-on-surface-variant">across all campaigns</p>
          </div>
          <div class="rounded-2xl bg-surface-container-lowest p-5 shadow-sm">
            <p class="text-xs font-semibold uppercase tracking-wide text-outline">Goal total</p>
            <p class="mt-2 text-3xl font-extrabold text-primary">{{ formatBudgetNaira(totals.goal) }}</p>
          </div>
          <div class="rounded-2xl bg-surface-container-lowest p-5 shadow-sm">
            <p class="text-xs font-semibold uppercase tracking-wide text-outline">Active campaigns</p>
            <p class="mt-2 text-3xl font-extrabold text-primary">{{ totals.active }}</p>
          </div>
          <div class="rounded-2xl bg-surface-container-lowest p-5 shadow-sm">
            <p class="text-xs font-semibold uppercase tracking-wide text-outline">Donors</p>
            <p class="mt-2 text-3xl font-extrabold text-primary">{{ totals.donors }}</p>
          </div>
        </div>

        <div class="grid grid-cols-1 gap-6 xl:grid-cols-12">
          <section class="rounded-2xl bg-surface-container-lowest p-5 shadow-sm xl:col-span-4">
            <h2 class="font-headline-md text-lg font-bold text-primary">New fundraising scenario</h2>
            <p class="mt-1 text-sm text-on-surface-variant">
              Set a goal and a threshold. When gifts cross the threshold, it is marked here.
            </p>
            <div class="mt-4 space-y-3">
              <label class="block text-xs font-semibold uppercase tracking-wide text-outline">
                Title
                <input
                  v-model="form.title"
                  type="text"
                  placeholder="e.g. Ward poll watcher fund"
                  class="mt-1 w-full rounded-xl bg-off-white px-3 py-2.5 text-sm text-on-surface outline-none ring-1 ring-outline-variant/40 focus:ring-electric-pink"
                />
              </label>
              <label class="block text-xs font-semibold uppercase tracking-wide text-outline">
                Description
                <textarea
                  v-model="form.description"
                  rows="3"
                  placeholder="What this money will be used for"
                  class="mt-1 w-full rounded-xl bg-off-white px-3 py-2.5 text-sm text-on-surface outline-none ring-1 ring-outline-variant/40 focus:ring-electric-pink"
                />
              </label>
              <div class="grid grid-cols-2 gap-3">
                <label class="block text-xs font-semibold uppercase tracking-wide text-outline">
                  Goal (₦)
                  <input
                    v-model.number="form.goal_amount"
                    type="number"
                    min="1000"
                    class="mt-1 w-full rounded-xl bg-off-white px-3 py-2.5 text-sm text-on-surface outline-none ring-1 ring-outline-variant/40 focus:ring-electric-pink"
                  />
                </label>
                <label class="block text-xs font-semibold uppercase tracking-wide text-outline">
                  Threshold (₦)
                  <input
                    v-model.number="form.threshold_amount"
                    type="number"
                    min="0"
                    class="mt-1 w-full rounded-xl bg-off-white px-3 py-2.5 text-sm text-on-surface outline-none ring-1 ring-outline-variant/40 focus:ring-electric-pink"
                  />
                </label>
              </div>
              <label class="block text-xs font-semibold uppercase tracking-wide text-outline">
                Start as
                <select
                  v-model="form.status"
                  class="mt-1 w-full rounded-xl bg-off-white px-3 py-2.5 text-sm text-on-surface outline-none ring-1 ring-outline-variant/40 focus:ring-electric-pink"
                >
                  <option value="active">Active — open for donations</option>
                  <option value="draft">Draft — hidden until you resume</option>
                  <option value="paused">Paused</option>
                </select>
              </label>
              <button
                type="button"
                class="w-full rounded-xl bg-electric-pink py-3 text-sm font-semibold text-pure-white disabled:opacity-50"
                :disabled="saving"
                @click="create"
              >
                {{ saving ? "Creating…" : "Create campaign" }}
              </button>
            </div>
          </section>

          <section class="overflow-hidden rounded-2xl bg-surface-container-lowest shadow-sm xl:col-span-8">
            <div class="border-b border-outline-variant/30 px-5 py-4">
              <h2 class="font-headline-md text-lg font-bold text-primary">Manage campaigns</h2>
              <p class="text-sm text-on-surface-variant">
                Pause temporarily or stop permanently. Resume anytime to accept donations again.
              </p>
            </div>

            <div v-if="!campaigns.length" class="px-5 py-10 text-center text-sm text-on-surface-variant">
              No campaigns yet. Create one on the left.
            </div>

            <ul v-else class="divide-y divide-outline-variant/20">
              <li
                v-for="c in campaigns"
                :key="c.id"
                class="cursor-pointer px-5 py-4 transition hover:bg-surface-container-low/60"
                :class="selectedId === c.id ? 'bg-secondary-fixed/30' : ''"
                @click="selectCampaign(c.id)"
              >
                <div class="flex flex-wrap items-start justify-between gap-3">
                  <div class="min-w-0">
                    <div class="flex flex-wrap items-center gap-2">
                      <p class="font-semibold text-on-surface">{{ c.title }}</p>
                      <span
                        class="rounded-full px-2 py-0.5 text-[11px] font-semibold"
                        :class="statusBadgeClass(c.status)"
                      >
                        {{ statusLabel(c.status) }}
                      </span>
                      <span
                        v-if="c.threshold_reached"
                        class="rounded-full bg-deep-navy/10 px-2 py-0.5 text-[11px] font-semibold text-deep-navy"
                      >
                        Threshold reached
                      </span>
                    </div>
                    <p v-if="c.description" class="mt-1 line-clamp-2 text-sm text-on-surface-variant">
                      {{ c.description }}
                    </p>
                    <p class="mt-2 text-xs text-outline">
                      {{ c.donor_count }} donors · Goal {{ formatBudgetNaira(c.goal_amount) }} ·
                      Threshold {{ formatBudgetNaira(c.threshold_amount) }}
                    </p>
                  </div>
                  <div class="text-right">
                    <p class="text-lg font-extrabold text-primary">{{ formatBudgetNaira(c.raised_amount) }}</p>
                    <p class="text-xs text-outline">{{ c.progress_pct }}% of goal</p>
                  </div>
                </div>
                <div class="mt-3 h-2 overflow-hidden rounded-full bg-surface-container-high">
                  <div
                    class="h-full rounded-full bg-electric-pink"
                    :style="{ width: `${Math.min(100, c.progress_pct)}%` }"
                  />
                </div>
                <div class="mt-3 flex flex-wrap gap-2" @click.stop>
                  <button
                    v-if="canResume(c.status)"
                    type="button"
                    class="rounded-lg bg-action-green px-3 py-1.5 text-xs font-semibold text-pure-white disabled:opacity-50"
                    :disabled="statusBusyId === c.id"
                    @click="setStatus(c.id, 'active')"
                  >
                    {{ statusBusyId === c.id ? "…" : "Resume" }}
                  </button>
                  <button
                    v-if="canPause(c.status)"
                    type="button"
                    class="rounded-lg bg-electric-pink/15 px-3 py-1.5 text-xs font-semibold text-electric-pink disabled:opacity-50"
                    :disabled="statusBusyId === c.id"
                    @click="setStatus(c.id, 'paused')"
                  >
                    {{ statusBusyId === c.id ? "…" : "Pause" }}
                  </button>
                  <button
                    v-if="canStop(c.status)"
                    type="button"
                    class="rounded-lg bg-error/10 px-3 py-1.5 text-xs font-semibold text-error disabled:opacity-50"
                    :disabled="statusBusyId === c.id"
                    @click="setStatus(c.id, 'stopped')"
                  >
                    {{ statusBusyId === c.id ? "…" : "Stop" }}
                  </button>
                  <span
                    v-if="c.status === 'stopped' || c.status === 'closed'"
                    class="self-center text-xs text-outline"
                  >
                    Stopped — no new donations
                  </span>
                </div>
              </li>
            </ul>
          </section>
        </div>

        <section v-if="selected" class="overflow-hidden rounded-2xl bg-surface-container-lowest shadow-sm">
          <div class="border-b border-outline-variant/30 px-5 py-4">
            <h2 class="font-headline-md text-lg font-bold text-primary">Donations · {{ selected.title }}</h2>
            <p class="text-sm text-on-surface-variant">
              {{ formatBudgetNaira(selected.raised_amount) }} raised of
              {{ formatBudgetNaira(selected.goal_amount) }}
            </p>
          </div>
          <div class="overflow-x-auto">
            <table class="min-w-full text-left text-sm">
              <thead class="bg-surface-container-low text-xs uppercase tracking-wide text-outline">
                <tr>
                  <th class="px-5 py-3 font-semibold">When</th>
                  <th class="px-5 py-3 font-semibold">Donor</th>
                  <th class="px-5 py-3 font-semibold">Amount</th>
                  <th class="px-5 py-3 font-semibold">Note</th>
                </tr>
              </thead>
              <tbody>
                <tr v-if="loadingDonations">
                  <td colspan="4" class="px-5 py-8 text-center text-on-surface-variant">Loading…</td>
                </tr>
                <tr v-else-if="!donations.length">
                  <td colspan="4" class="px-5 py-8 text-center text-on-surface-variant">
                    No donations yet. Supporters will appear here when they give in the app.
                  </td>
                </tr>
                <tr
                  v-for="d in donations"
                  :key="d.id"
                  class="border-t border-outline-variant/20"
                >
                  <td class="whitespace-nowrap px-5 py-3 text-on-surface-variant">{{ formatWhen(d.created_at) }}</td>
                  <td class="px-5 py-3">
                    <p class="font-medium text-on-surface">{{ d.donor_name }}</p>
                    <p class="text-xs capitalize text-outline">{{ d.donor_kind }}</p>
                  </td>
                  <td class="px-5 py-3 font-semibold">{{ formatBudgetNaira(d.amount) }}</td>
                  <td class="px-5 py-3 text-on-surface-variant">{{ d.note || "—" }}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>
      </template>
    </template>
  </div>
</template>
