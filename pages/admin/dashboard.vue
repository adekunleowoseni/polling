<template>
  <div class="mx-auto max-w-6xl space-y-6 p-4 sm:p-6">
    <header class="flex flex-wrap items-center justify-between gap-4">
      <div>
        <h1 class="text-xl font-semibold text-ui-text">Admin control panel</h1>
        <p v-if="admin" class="mt-1 text-sm text-ui-muted">
          {{ admin.name }} · {{ admin.role }}
        </p>
      </div>
      <AdminProfileMenu :admin="admin" @logout="logout" />
    </header>

    <nav class="flex flex-wrap gap-2 border-b border-ui-border/40 pb-3">
      <button
        v-for="tab in tabs"
        :key="tab.id"
        type="button"
        class="rounded-lg px-3 py-1.5 text-sm transition"
        :class="activeTab === tab.id ? 'bg-violet-600 text-white' : 'text-ui-muted hover:bg-ui-muted/10 hover:text-ui-text'"
        @click="activeTab = tab.id"
      >
        {{ tab.label }}
      </button>
    </nav>

    <p v-if="message" class="rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-4 py-2 text-sm text-emerald-700 dark:text-emerald-300">
      {{ message }}
    </p>
    <p v-if="actionError" class="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-2 text-sm text-red-500 dark:text-red-300">
      {{ actionError }}
    </p>

    <section v-if="activeTab === 'overview'" class="grid grid-cols-2 gap-4 lg:grid-cols-3">
      <div v-for="stat in overviewStats" :key="stat.label" class="ui-card p-5">
        <p class="text-xs uppercase tracking-wider text-ui-muted">{{ stat.label }}</p>
        <p class="mt-2 text-2xl font-bold text-ui-text">{{ stat.value }}</p>
      </div>
    </section>

    <section v-else-if="activeTab === 'feeds'" class="ui-card overflow-hidden">
      <div class="border-b border-ui-border/40 px-5 py-4">
        <h2 class="font-semibold text-ui-text">Polling units & live feeds</h2>
        <p class="text-xs text-ui-muted">Force offline, correct counts, or remove units.</p>
      </div>

      <div v-if="loadingUnits" class="p-8 text-center text-sm text-ui-muted">Loading…</div>

      <div v-else class="overflow-x-auto">
        <table class="w-full text-left text-sm">
          <thead>
            <tr class="border-b border-ui-border/30 text-xs uppercase text-ui-muted">
              <th class="px-4 py-3">Unit</th>
              <th class="px-4 py-3">Location</th>
              <th class="px-4 py-3">Status</th>
              <th class="px-4 py-3 text-right">People</th>
              <th class="px-4 py-3">Actions</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-ui-border/30">
            <tr v-for="unit in units" :key="unit.id">
              <td class="px-4 py-3">
                <p class="font-medium text-ui-text">{{ unit.name }}</p>
                <p class="text-xs text-ui-muted">{{ unit.code }}</p>
              </td>
              <td class="px-4 py-3 text-ui-muted">{{ unit.ward }} · {{ unit.lga }}</td>
              <td class="px-4 py-3">
                <span
                  class="rounded-full px-2 py-0.5 text-xs font-semibold"
                  :class="unit.stream_status === 'live' ? 'bg-red-500/15 text-red-600 dark:text-red-400' : 'bg-ui-elevated text-ui-muted'"
                >
                  {{ unit.stream_status }}
                </span>
              </td>
              <td class="px-4 py-3 text-right">
                <input v-model.number="countEdits[unit.code]" type="number" min="0" class="ui-input w-20 text-right" />
              </td>
              <td class="px-4 py-3">
                <div class="flex flex-wrap gap-2">
                  <button type="button" class="rounded border border-ui-border/50 px-2 py-1 text-xs hover:bg-ui-muted/10" @click="saveCount(unit.code)">
                    Save count
                  </button>
                  <button
                    v-if="unit.stream_status === 'live'"
                    type="button"
                    class="rounded border border-amber-500/40 px-2 py-1 text-xs text-amber-700 hover:bg-amber-500/10 dark:text-amber-300"
                    @click="forceOffline(unit.code)"
                  >
                    Force offline
                  </button>
                  <button type="button" class="rounded border border-red-500/40 px-2 py-1 text-xs text-red-600 hover:bg-red-500/10 dark:text-red-400" @click="deleteUnit(unit.code)">
                    Delete
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>

    <section v-else-if="activeTab === 'snaps'" class="ui-card overflow-hidden">
      <div class="flex flex-wrap items-center justify-between gap-3 border-b border-ui-border/40 px-5 py-4">
        <div>
          <h2 class="font-semibold text-ui-text">Saved feed pictures</h2>
          <p class="text-xs text-ui-muted">{{ snaps.length }} image(s) · grouped by LGA and ward</p>
        </div>
        <button type="button" class="rounded-lg border border-ui-border/50 px-3 py-1.5 text-xs hover:bg-ui-muted/10" @click="loadSnaps">
          Refresh
        </button>
      </div>

      <div v-if="loadingSnaps" class="p-8 text-center text-sm text-ui-muted">Loading…</div>
      <div v-else-if="!snaps.length" class="p-8 text-center text-sm text-ui-muted">No saved pictures.</div>

      <div v-else class="space-y-8 p-5">
        <section v-for="lgaGroup in snapsByLga" :key="lgaGroup.lga">
          <h3 class="text-sm font-semibold text-ui-text">{{ lgaGroup.lga }}</h3>
          <div v-for="wardGroup in lgaGroup.wards" :key="`${lgaGroup.lga}-${wardGroup.ward}`" class="mt-4">
            <p class="mb-2 text-xs font-medium uppercase tracking-wider text-ui-muted">
              {{ wardGroup.ward }} · {{ wardGroup.snaps.length }} picture(s)
            </p>
            <div class="grid gap-3 sm:grid-cols-3 lg:grid-cols-5">
              <article
                v-for="snap in wardGroup.snaps"
                :key="snap.id"
                class="group overflow-hidden rounded-lg border border-ui-border/40 bg-ui-elevated/50"
              >
                <img
                  :src="feedSnapImageUrl(apiBase, snap.id)"
                  :alt="snap.polling_unit_name"
                  :title="snap.polling_unit_name"
                  class="aspect-video w-full object-cover"
                />
                <button
                  type="button"
                  class="w-full py-1 text-[10px] text-red-600 opacity-0 transition group-hover:opacity-100 hover:bg-red-500/10 dark:text-red-400"
                  @click="deleteSnap(snap.id)"
                >
                  Delete
                </button>
              </article>
            </div>
          </div>
        </section>
      </div>
    </section>

    <section v-else class="ui-card overflow-hidden">
      <div class="flex flex-wrap items-center justify-between gap-3 border-b border-ui-border/40 px-5 py-4">
        <div>
          <h2 class="font-semibold text-ui-text">Field agents</h2>
          <p class="text-xs text-ui-muted">{{ filteredAgents.length }} of {{ agents.length }} agent(s)</p>
        </div>
        <input
          v-model="agentSearch"
          type="search"
          placeholder="Search name, email, LGA, ward…"
          class="ui-input w-full max-w-xs text-sm"
        />
      </div>

      <div v-if="loadingAgents" class="p-8 text-center text-sm text-ui-muted">Loading…</div>
      <div v-else-if="!filteredAgents.length" class="p-8 text-center text-sm text-ui-muted">No agents match your search.</div>

      <div v-else class="grid gap-3 p-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        <button
          v-for="agent in filteredAgents"
          :key="agent.id"
          type="button"
          class="rounded-xl border border-ui-border/40 bg-ui-elevated/30 p-4 text-left transition hover:border-violet-500/40 hover:bg-ui-elevated/50"
          @click="openAgentModal(agent.id)"
        >
          <p class="truncate font-medium text-ui-text">{{ agent.name }}</p>
          <p class="truncate text-xs text-ui-muted">{{ agent.email }}</p>
          <p v-if="agent.lga && agent.ward" class="mt-2 truncate text-xs text-emerald-600 dark:text-emerald-400">
            {{ agent.ward }} · {{ agent.lga }}
          </p>
          <p v-else class="mt-2 text-xs text-amber-600 dark:text-amber-400">Unassigned</p>
          <dl class="mt-3 grid grid-cols-2 gap-2 text-xs">
            <div class="rounded bg-ui-surface/50 px-2 py-1">
              <dt class="text-ui-muted">Units</dt>
              <dd class="font-semibold text-ui-text">{{ agent.polling_unit_count }}</dd>
            </div>
            <div class="rounded bg-ui-surface/50 px-2 py-1">
              <dt class="text-ui-muted">Live</dt>
              <dd class="font-semibold text-red-600 dark:text-red-400">{{ agent.live_unit_count }}</dd>
            </div>
          </dl>
          <p class="mt-3 text-[10px] text-violet-600 dark:text-violet-400">Manage →</p>
        </button>
      </div>
    </section>

    <AdminAgentManageModal
      :open="agentModalOpen"
      :loading="loadingAgentDetail"
      :agent="selectedAgent"
      :lgas="lgas"
      :api-base="apiBase"
      :auth-headers="authHeaders"
      @close="agentModalOpen = false"
      @updated="onAgentUpdated"
      @deleted="onAgentDeleted"
    />
  </div>
</template>

<script setup lang="ts">
import { feedSnapImageUrl, groupSnapsByLgaAndWard } from "~/composables/useFeedSnaps";
import type { PollingUnit } from "~/composables/useVideoFeeds";
import type { AdminOverview } from "~/composables/useAdminAuth";
import type { FeedSnap } from "~/composables/useFeedSnaps";

import type { AdminAgentDetail } from "~/components/AdminAgentManageModal";

type AdminAgentSummary = {
  id: string;
  name: string;
  email: string;
  lga: string | null;
  ward: string | null;
  created_at: string;
  polling_unit_count: number;
  live_unit_count: number;
};

definePageMeta({ layout: "default" });

const router = useRouter();
const { admin, authHeaders, requireAdmin, clear, apiBase } = useAdminAuth();
const { lgas, loadLgas } = useOgunGeo();

const tabs = [
  { id: "overview", label: "Overview" },
  { id: "feeds", label: "Live feeds" },
  { id: "snaps", label: "Pictures" },
  { id: "agents", label: "Agents" },
] as const;

type TabId = (typeof tabs)[number]["id"];

const activeTab = ref<TabId>("overview");
const overview = ref<AdminOverview | null>(null);
const units = ref<PollingUnit[]>([]);
const snaps = ref<FeedSnap[]>([]);
const agents = ref<AdminAgentSummary[]>([]);
const agentSearch = ref("");
const agentModalOpen = ref(false);
const selectedAgent = ref<AdminAgentDetail | null>(null);
const loadingAgentDetail = ref(false);
const countEdits = ref<Record<string, number>>({});

const loadingUnits = ref(false);
const loadingSnaps = ref(false);
const loadingAgents = ref(false);
const message = ref("");
const actionError = ref("");

const snapsByLga = computed(() => groupSnapsByLgaAndWard(snaps.value));

const filteredAgents = computed(() => {
  const q = agentSearch.value.trim().toLowerCase();
  if (!q) return agents.value;
  return agents.value.filter((a) => {
    const haystack = [a.name, a.email, a.lga ?? "", a.ward ?? ""].join(" ").toLowerCase();
    return haystack.includes(q);
  });
});

const overviewStats = computed(() => [
  { label: "Live feeds", value: overview.value?.live_feeds ?? "—" },
  { label: "Registered units", value: overview.value?.registered_units ?? "—" },
  { label: "People on site", value: overview.value?.total_people_on_site ?? "—" },
  { label: "Saved pictures", value: overview.value?.feed_snapshots ?? "—" },
  { label: "Agents", value: overview.value?.agents ?? "—" },
  { label: "Forms scanned", value: overview.value?.form_registrations ?? "—" },
]);

onMounted(async () => {
  if (!requireAdmin()) return;
  await loadLgas();
  await Promise.all([loadOverview(), loadUnits(), loadSnaps(), loadAgents()]);
});

watch(activeTab, (tab) => {
  if (tab === "feeds" && !units.value.length) loadUnits();
  if (tab === "snaps" && !snaps.value.length) loadSnaps();
  if (tab === "agents" && !agents.value.length) loadAgents();
});

function logout() {
  clear();
  router.push("/admin/login");
}

async function loadOverview() {
  try {
    overview.value = await $fetch<AdminOverview>(`${apiBase}/admin/overview`, { headers: authHeaders() });
  } catch {
    actionError.value = "Failed to load overview.";
  }
}

async function loadUnits() {
  loadingUnits.value = true;
  try {
    units.value = await $fetch<PollingUnit[]>(`${apiBase}/admin/polling-units`, { headers: authHeaders() });
    const edits: Record<string, number> = {};
    for (const u of units.value) edits[u.code] = u.people_count;
    countEdits.value = edits;
  } catch {
    actionError.value = "Failed to load polling units.";
  } finally {
    loadingUnits.value = false;
  }
}

async function loadSnaps() {
  loadingSnaps.value = true;
  try {
    snaps.value = await $fetch<FeedSnap[]>(`${apiBase}/admin/feed-snaps`, { headers: authHeaders() });
  } catch {
    actionError.value = "Failed to load pictures.";
  } finally {
    loadingSnaps.value = false;
  }
}

async function loadAgents() {
  loadingAgents.value = true;
  try {
    agents.value = await $fetch<AdminAgentSummary[]>(`${apiBase}/admin/agents`, { headers: authHeaders() });
  } catch {
    actionError.value = "Failed to load agents.";
  } finally {
    loadingAgents.value = false;
  }
}

async function openAgentModal(agentId: string) {
  loadingAgentDetail.value = true;
  agentModalOpen.value = true;
  selectedAgent.value = null;
  try {
    selectedAgent.value = await $fetch<AdminAgentDetail>(`${apiBase}/admin/agents/${agentId}`, {
      headers: authHeaders(),
    });
  } catch {
    actionError.value = "Failed to load agent details.";
    agentModalOpen.value = false;
  } finally {
    loadingAgentDetail.value = false;
  }
}

async function onAgentUpdated() {
  message.value = "Agent updated.";
  if (selectedAgent.value) {
    selectedAgent.value = await $fetch<AdminAgentDetail>(
      `${apiBase}/admin/agents/${selectedAgent.value.id}`,
      { headers: authHeaders() },
    );
  }
  await loadAgents();
}

async function onAgentDeleted(id: string) {
  message.value = "Agent deleted.";
  agents.value = agents.value.filter((a) => a.id !== id);
  selectedAgent.value = null;
  agentModalOpen.value = false;
  await loadUnits();
  await loadSnaps();
  await loadOverview();
}

function clearFeedback() {
  message.value = "";
  actionError.value = "";
}

async function saveCount(code: string) {
  clearFeedback();
  try {
    await $fetch(`${apiBase}/admin/polling-units/${code}/people-count`, {
      method: "PATCH",
      headers: authHeaders(),
      body: { people_count: countEdits.value[code] ?? 0 },
    });
    message.value = `Count updated for ${code}.`;
    await loadUnits();
    await loadOverview();
  } catch (err: unknown) {
    const detail = (err as { data?: { detail?: string } })?.data?.detail;
    actionError.value = typeof detail === "string" ? detail : "Failed to update count.";
  }
}

async function forceOffline(code: string) {
  if (!confirm(`Force ${code} offline?`)) return;
  clearFeedback();
  try {
    await $fetch(`${apiBase}/admin/polling-units/${code}/force-offline`, { method: "POST", headers: authHeaders() });
    message.value = `${code} forced offline.`;
    await loadUnits();
    await loadOverview();
  } catch {
    actionError.value = "Failed to force offline.";
  }
}

async function deleteUnit(code: string) {
  if (!confirm(`Delete polling unit ${code} and all its data?`)) return;
  clearFeedback();
  try {
    await $fetch(`${apiBase}/admin/polling-units/${code}`, { method: "DELETE", headers: authHeaders() });
    message.value = `${code} deleted.`;
    await loadUnits();
    await loadSnaps();
    await loadOverview();
  } catch {
    actionError.value = "Failed to delete unit.";
  }
}

async function deleteSnap(id: string) {
  if (!confirm("Delete this saved picture?")) return;
  clearFeedback();
  try {
    await $fetch(`${apiBase}/admin/feed-snaps/${id}`, { method: "DELETE", headers: authHeaders() });
    message.value = "Picture deleted.";
    await loadSnaps();
    await loadOverview();
  } catch {
    actionError.value = "Failed to delete picture.";
  }
}
</script>
