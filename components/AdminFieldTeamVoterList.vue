<script setup lang="ts">
import { fieldTeamPath, type FieldTeamVoters } from "~/composables/useFieldTeam";

const props = withDefaults(
  defineProps<{
    /** Whose team to list: this person and everyone under them. */
    agentId: string;
    pageSize?: number;
    /** Hide the "Agent" column when every voter belongs to one polling unit agent. */
    showAgent?: boolean;
  }>(),
  { pageSize: 25, showAgent: true },
);

const { loadTeamVoters } = useFieldTeam();
const q = ref("");
const page = ref(1);
const loading = ref(false);
const error = ref("");
const data = ref<FieldTeamVoters | null>(null);
let seq = 0;

const pageCount = computed(() => Math.max(1, Math.ceil((data.value?.total ?? 0) / props.pageSize)));

async function load() {
  const mine = ++seq;
  loading.value = true;
  error.value = "";
  try {
    const res = await loadTeamVoters(props.agentId, { q: q.value.trim(), page: page.value, page_size: props.pageSize });
    if (mine !== seq) return;
    data.value = res;
    if (res.page !== page.value) page.value = res.page;
  } catch {
    if (mine === seq) error.value = "Could not load voters.";
  } finally {
    if (mine === seq) loading.value = false;
  }
}

let timer: ReturnType<typeof setTimeout> | undefined;
watch(q, () => {
  clearTimeout(timer);
  timer = setTimeout(() => (page.value === 1 ? load() : (page.value = 1)), 300);
});
watch(page, () => void load());
watch(() => props.agentId, () => {
  page.value = 1;
  void load();
});
onMounted(() => void load());
onBeforeUnmount(() => clearTimeout(timer));
</script>

<template>
  <div class="flex flex-col gap-2 rounded-xl bg-off-white p-3">
    <div class="flex flex-wrap items-center gap-2">
      <div class="relative min-w-[200px] flex-1">
        <span class="material-symbols-outlined absolute left-2.5 top-2 text-[18px] text-outline">search</span>
        <input
          v-model="q"
          type="search"
          class="h-9 w-full rounded-lg bg-surface-container-lowest pl-8 pr-3 text-xs text-on-surface placeholder:text-outline focus:outline-none"
          placeholder="Search name, VIN, phone or polling unit…"
          aria-label="Search these voters"
        />
      </div>
      <span class="text-xs text-outline">
        <template v-if="data">
          {{ data.total.toLocaleString() }} voter(s)
          <template v-if="data.agents_in_scope > 1"> across {{ data.agents_in_scope }} people</template>
        </template>
        <template v-else-if="loading">Loading…</template>
      </span>
    </div>

    <p v-if="error" class="text-xs text-error">{{ error }}</p>
    <div v-else class="overflow-x-auto rounded-lg bg-surface-container-lowest" :class="loading ? 'opacity-60' : ''">
      <table class="w-full border-collapse text-left text-xs">
        <thead class="bg-surface-container-low font-label-caps text-[10px] uppercase tracking-wider text-outline">
          <tr>
            <th class="px-3 py-2">Name</th>
            <th class="px-3 py-2">VIN</th>
            <th class="px-3 py-2">Phone</th>
            <th class="px-3 py-2">Polling unit</th>
            <th class="px-3 py-2">Ward · LGA</th>
            <th v-if="showAgent" class="px-3 py-2">Polling unit agent</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-surface-container-low">
          <tr v-if="data && !data.rows.length">
            <td :colspan="showAgent ? 6 : 5" class="px-3 py-6 text-center text-outline">
              {{ q ? "No voters match this search." : "No voters assigned here yet." }}
            </td>
          </tr>
          <tr v-for="v in data?.rows ?? []" :key="v.id">
            <td class="px-3 py-2 font-semibold text-primary">{{ v.name }}</td>
            <td class="px-3 py-2 font-mono text-[11px]">{{ v.vin || "—" }}</td>
            <td class="px-3 py-2">
              <a v-if="v.phone" :href="`tel:${v.phone}`" class="text-primary hover:underline">{{ v.phone }}</a>
              <span v-else class="text-outline">—</span>
            </td>
            <td class="px-3 py-2">{{ v.polling_unit || "—" }}</td>
            <td class="px-3 py-2 text-outline">{{ [v.ward, v.lga].filter(Boolean).join(" · ") || "—" }}</td>
            <td v-if="showAgent" class="px-3 py-2">
              <NuxtLink v-if="v.assigned_agent_id" :to="fieldTeamPath(v.assigned_agent_id)" class="font-semibold text-secondary hover:underline">
                {{ v.assigned_agent_name || "Agent" }}
              </NuxtLink>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <div v-if="pageCount > 1" class="flex items-center justify-end gap-2 text-xs">
      <button type="button" class="rounded bg-surface-container-low px-3 py-1 disabled:opacity-50" :disabled="page <= 1 || loading" @click="page -= 1">Previous</button>
      <span class="text-outline">Page {{ page.toLocaleString() }} of {{ pageCount.toLocaleString() }}</span>
      <button type="button" class="rounded bg-deep-navy px-3 py-1 text-pure-white disabled:opacity-50" :disabled="page >= pageCount || loading" @click="page += 1">Next</button>
    </div>
  </div>
</template>
