<script setup lang="ts">
export type VoteUnitStat = {
  code: string;
  name: string;
  lga: string;
  ward: string;
  state?: string;
  votes: number;
  people_count: number;
  difference: number;
  comparison_note: string;
};

export type VotePlaceStat = {
  label: string;
  state?: string;
  lga: string;
  ward?: string;
  votes: number;
  people_count: number;
  unit_count: number;
  difference: number;
  comparison_note: string;
};

export type VoteResultsSummary = {
  total_votes: number;
  units_with_results: number;
  total_people_counted: number;
  overall_difference: number;
  overall_note: string;
  plain_summary: string;
  by_polling_unit: VoteUnitStat[];
  by_lga: VotePlaceStat[];
  by_ward: VotePlaceStat[];
  by_state?: VotePlaceStat[];
  highest_unit: VoteUnitStat | null;
  lowest_unit: VoteUnitStat | null;
  highest_lga: VotePlaceStat | null;
  lowest_lga: VotePlaceStat | null;
  highest_ward: VotePlaceStat | null;
  lowest_ward: VotePlaceStat | null;
};

type FlaggedUnit = {
  code: string;
  polling_unit_name: string;
  state: string;
  ward: string;
  lga: string;
  flags: string[];
  severity: number;
};

const props = withDefaults(
  defineProps<{
    stateScope?: string;
    showStateScope?: boolean;
  }>(),
  { stateScope: "all", showStateScope: false },
);

const emit = defineEmits<{
  (e: "error", msg: string): void;
  (e: "loaded", summary: VoteResultsSummary | null): void;
}>();

const { authHeaders, apiBase } = useAdminAuth();

const loading = ref(true);
const summary = ref<VoteResultsSummary | null>(null);
const flaggedUnits = ref<FlaggedUnit[]>([]);
const detailTab = ref<"units" | "lgas" | "wards">("units");

function rebuildVoteSummary(units: VoteUnitStat[]): VoteResultsSummary {
  const total_votes = units.reduce((s, u) => s + u.votes, 0);
  const total_people = units.reduce((s, u) => s + u.people_count, 0);
  const overall_difference = total_votes - total_people;
  const by_lga_map = new Map<string, VotePlaceStat>();
  const by_ward_map = new Map<string, VotePlaceStat>();
  const by_state_map = new Map<string, VotePlaceStat>();

  for (const u of units) {
    const state = u.state || "Unknown";
    const lgaKey = `${state}::${u.lga}`;
    const wardKey = `${state}::${u.lga}::${u.ward}`;

    const st = by_state_map.get(state) || {
      label: state,
      state,
      lga: "",
      votes: 0,
      people_count: 0,
      unit_count: 0,
      difference: 0,
      comparison_note: "",
    };
    st.votes += u.votes;
    st.people_count += u.people_count;
    st.unit_count += 1;
    st.difference = st.votes - st.people_count;
    by_state_map.set(state, st);

    const lg = by_lga_map.get(lgaKey) || {
      label: `${u.lga} (${state})`,
      state,
      lga: u.lga,
      votes: 0,
      people_count: 0,
      unit_count: 0,
      difference: 0,
      comparison_note: "",
    };
    lg.votes += u.votes;
    lg.people_count += u.people_count;
    lg.unit_count += 1;
    lg.difference = lg.votes - lg.people_count;
    by_lga_map.set(lgaKey, lg);

    const wd = by_ward_map.get(wardKey) || {
      label: `${u.ward}, ${u.lga} (${state})`,
      state,
      lga: u.lga,
      ward: u.ward,
      votes: 0,
      people_count: 0,
      unit_count: 0,
      difference: 0,
      comparison_note: "",
    };
    wd.votes += u.votes;
    wd.people_count += u.people_count;
    wd.unit_count += 1;
    wd.difference = wd.votes - wd.people_count;
    by_ward_map.set(wardKey, wd);
  }

  const sorted = [...units].sort((a, b) => b.votes - a.votes);
  const by_lga = [...by_lga_map.values()].sort((a, b) => b.votes - a.votes);
  const by_ward = [...by_ward_map.values()].sort((a, b) => b.votes - a.votes);
  const by_state = [...by_state_map.values()].sort((a, b) => b.votes - a.votes);

  return {
    total_votes,
    units_with_results: units.length,
    total_people_counted: total_people,
    overall_difference,
    overall_note:
      overall_difference === 0
        ? "Votes match people counted on site."
        : overall_difference > 0
          ? "More votes than people counted on site — review accreditation."
          : "Fewer votes than people counted — possible under-reporting.",
    plain_summary: `${total_votes.toLocaleString()} vote(s) from ${units.length} polling unit(s).`,
    by_polling_unit: units,
    by_lga,
    by_ward,
    by_state,
    highest_unit: sorted[0] || null,
    lowest_unit: sorted[sorted.length - 1] || null,
    highest_lga: by_lga[0] || null,
    lowest_lga: by_lga[by_lga.length - 1] || null,
    highest_ward: by_ward[0] || null,
    lowest_ward: by_ward[by_ward.length - 1] || null,
  };
}

const filtered = computed(() => {
  if (!summary.value) return null;
  if (!props.showStateScope || props.stateScope === "all") return summary.value;
  const units = summary.value.by_polling_unit.filter((u) => u.state === props.stateScope);
  return rebuildVoteSummary(units);
});

const scopedFlagged = computed(() => {
  if (!props.showStateScope || props.stateScope === "all") return flaggedUnits.value;
  return flaggedUnits.value.filter((u) => u.state === props.stateScope);
});

async function refresh() {
  loading.value = true;
  try {
    const [sum, flagged] = await Promise.all([
      $fetch<VoteResultsSummary>(`${apiBase}/admin/results/summary`, { headers: authHeaders() }),
      $fetch<FlaggedUnit[]>(`${apiBase}/admin/tribunal-reports/flagged`, { headers: authHeaders() }).catch(() => []),
    ]);
    summary.value = sum;
    flaggedUnits.value = flagged;
    emit("loaded", sum);
  } catch {
    summary.value = null;
    emit("error", "Failed to load vote results.");
    emit("loaded", null);
  } finally {
    loading.value = false;
  }
}

watch(
  () => props.stateScope,
  () => {
    /* recomputed */
  },
);

onMounted(() => void refresh());

defineExpose({ refresh });
</script>

<template>
  <div class="flex w-full flex-col gap-6 pb-6">
    <section class="flex flex-col gap-4">
      <div class="flex flex-wrap items-center gap-2">
        <span class="font-label-caps text-label-caps uppercase tracking-wider text-outline">HQ Central Command</span>
        <span class="text-outline">/</span>
        <span class="font-label-caps text-label-caps font-bold uppercase tracking-wider text-secondary">
          Field Operations · Vote Results
        </span>
      </div>
      <div class="flex flex-col justify-between gap-4 xl:flex-row xl:items-end">
        <div>
          <h1 class="font-headline-md text-2xl font-bold tracking-tight text-primary sm:text-headline-md">
            Vote Results Command
          </h1>
          <p class="mt-1 max-w-2xl text-sm text-on-surface-variant">
            Agent-submitted polling unit results compared against people counted on site.
          </p>
        </div>
        <button
          type="button"
          class="inline-flex items-center gap-2 rounded-xl bg-surface-container px-4 py-2.5 text-sm text-on-surface hover:bg-surface-container-high disabled:opacity-50"
          :disabled="loading"
          @click="refresh"
        >
          <span class="material-symbols-outlined text-[18px]">sync</span>
          {{ loading ? "Loading…" : "Refresh" }}
        </button>
      </div>
    </section>

    <div v-if="loading && !filtered" class="rounded-2xl bg-surface-container-lowest p-10 text-center text-sm text-outline shadow-sm">
      Loading vote results…
    </div>

    <template v-else-if="filtered">
      <div class="rounded-2xl bg-deep-navy p-5 text-pure-white shadow-sm">
        <span class="font-label-caps text-[11px] uppercase text-action-green">Plain-language summary</span>
        <p class="mt-2 text-sm leading-relaxed text-surface-dim">{{ filtered.plain_summary }}</p>
      </div>

      <section
        v-if="showStateScope && stateScope === 'all' && filtered.by_state?.length"
        class="grid gap-4 sm:grid-cols-2"
      >
        <div
          v-for="st in filtered.by_state"
          :key="st.state"
          class="rounded-2xl bg-surface-container-lowest p-5 shadow-sm"
        >
          <p class="font-label-caps text-[11px] uppercase text-outline">{{ st.state }}</p>
          <p class="mt-2 text-3xl font-extrabold tracking-tight text-primary">{{ st.votes.toLocaleString() }}</p>
          <p class="mt-1 text-xs text-on-surface-variant">
            {{ st.unit_count }} unit(s) · {{ st.people_count.toLocaleString() }} people counted
          </p>
        </div>
      </section>

      <section class="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <div class="rounded-2xl bg-surface-container-lowest p-5 shadow-sm">
          <span class="font-label-caps text-xs uppercase text-outline">Total votes</span>
          <p class="mt-2 text-3xl font-extrabold text-primary">{{ filtered.total_votes.toLocaleString() }}</p>
        </div>
        <div class="rounded-2xl bg-surface-container-lowest p-5 shadow-sm">
          <span class="font-label-caps text-xs uppercase text-outline">Units with results</span>
          <p class="mt-2 text-3xl font-extrabold text-primary">{{ filtered.units_with_results.toLocaleString() }}</p>
        </div>
        <div class="rounded-2xl bg-surface-container-lowest p-5 shadow-sm">
          <span class="font-label-caps text-xs uppercase text-outline">People counted</span>
          <p class="mt-2 text-3xl font-extrabold text-primary">{{ filtered.total_people_counted.toLocaleString() }}</p>
        </div>
        <div class="rounded-2xl bg-surface-container-lowest p-5 shadow-sm">
          <span class="font-label-caps text-xs uppercase text-outline">Votes vs people</span>
          <p
            class="mt-2 text-3xl font-extrabold"
            :class="filtered.overall_difference === 0 ? 'text-action-green' : 'text-electric-pink'"
          >
            {{ filtered.overall_difference > 0 ? "+" : "" }}{{ filtered.overall_difference.toLocaleString() }}
          </p>
        </div>
      </section>
      <p class="text-xs text-on-surface-variant">{{ filtered.overall_note }}</p>

      <section class="grid gap-4 sm:grid-cols-2">
        <div class="rounded-2xl bg-action-green/10 p-5">
          <p class="font-label-caps text-xs font-bold uppercase text-tertiary-container dark:text-action-green">Highest votes</p>
          <p v-if="filtered.highest_unit" class="mt-2 text-sm text-on-surface">
            <strong>{{ filtered.highest_unit.name }}</strong>
            ({{ filtered.highest_unit.state }}, {{ filtered.highest_unit.ward }}, {{ filtered.highest_unit.lga }}) —
            {{ filtered.highest_unit.votes.toLocaleString() }} votes vs
            {{ filtered.highest_unit.people_count.toLocaleString() }} people
          </p>
          <p v-if="filtered.highest_ward" class="mt-1 text-xs text-outline">
            Highest ward: {{ filtered.highest_ward.label }} — {{ filtered.highest_ward.votes.toLocaleString() }}
          </p>
          <p v-if="filtered.highest_lga" class="mt-1 text-xs text-outline">
            Highest LGA: {{ filtered.highest_lga.lga }}
            <span v-if="filtered.highest_lga.state">({{ filtered.highest_lga.state }})</span>
            — {{ filtered.highest_lga.votes.toLocaleString() }}
          </p>
        </div>
        <div class="rounded-2xl bg-electric-pink/10 p-5">
          <p class="font-label-caps text-xs font-bold uppercase text-electric-pink">Lowest votes</p>
          <p v-if="filtered.lowest_unit" class="mt-2 text-sm text-on-surface">
            <strong>{{ filtered.lowest_unit.name }}</strong>
            ({{ filtered.lowest_unit.state }}, {{ filtered.lowest_unit.ward }}, {{ filtered.lowest_unit.lga }}) —
            {{ filtered.lowest_unit.votes.toLocaleString() }} votes vs
            {{ filtered.lowest_unit.people_count.toLocaleString() }} people
          </p>
          <p v-if="filtered.lowest_ward" class="mt-1 text-xs text-outline">
            Lowest ward: {{ filtered.lowest_ward.label }} — {{ filtered.lowest_ward.votes.toLocaleString() }}
          </p>
          <p v-if="filtered.lowest_lga" class="mt-1 text-xs text-outline">
            Lowest LGA: {{ filtered.lowest_lga.lga }}
            <span v-if="filtered.lowest_lga.state">({{ filtered.lowest_lga.state }})</span>
            — {{ filtered.lowest_lga.votes.toLocaleString() }}
          </p>
        </div>
      </section>

      <section class="overflow-hidden rounded-2xl bg-surface-container-lowest shadow-sm">
        <div class="flex flex-wrap gap-1 border-b border-outline-variant/30 bg-surface-container p-1.5">
          <button
            v-for="opt in [
              { id: 'units' as const, label: 'By polling unit' },
              { id: 'lgas' as const, label: 'By local government' },
              { id: 'wards' as const, label: 'By ward' },
            ]"
            :key="opt.id"
            type="button"
            class="rounded-lg px-3 py-1.5 text-xs font-medium transition"
            :class="detailTab === opt.id ? 'bg-surface-container-lowest font-semibold text-on-surface shadow-sm' : 'text-on-surface-variant hover:text-on-surface'"
            @click="detailTab = opt.id"
          >
            {{ opt.label }}
          </button>
        </div>

        <div v-if="!filtered.by_polling_unit?.length" class="p-10 text-center text-sm text-outline">
          Waiting for agents to submit results.
        </div>

        <div v-else-if="detailTab === 'units'" class="overflow-x-auto">
          <table class="w-full text-left text-sm">
            <thead>
              <tr class="bg-surface-container-low font-label-caps text-[11px] uppercase text-on-surface-variant">
                <th class="px-4 py-3">Polling unit</th>
                <th class="px-4 py-3">State</th>
                <th class="px-4 py-3">Ward</th>
                <th class="px-4 py-3">LGA</th>
                <th class="px-4 py-3 text-right">Votes</th>
                <th class="px-4 py-3 text-right">People</th>
                <th class="px-4 py-3 text-right">Diff</th>
                <th class="px-4 py-3">Note</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="row in filtered.by_polling_unit" :key="`${row.state}-${row.code}`" class="hover:bg-surface-container-low/50">
                <td class="px-4 py-3">
                  <p class="font-medium text-on-surface">{{ row.name }}</p>
                  <p class="text-xs text-outline">{{ row.code }}</p>
                </td>
                <td class="px-4 py-3">{{ row.state || "—" }}</td>
                <td class="px-4 py-3 text-on-surface-variant">{{ row.ward || "—" }}</td>
                <td class="px-4 py-3 text-on-surface-variant">{{ row.lga || "—" }}</td>
                <td class="px-4 py-3 text-right font-semibold">{{ row.votes.toLocaleString() }}</td>
                <td class="px-4 py-3 text-right text-on-surface-variant">{{ row.people_count.toLocaleString() }}</td>
                <td class="px-4 py-3 text-right" :class="row.difference === 0 ? 'text-action-green' : 'text-electric-pink'">
                  {{ row.difference > 0 ? "+" : "" }}{{ row.difference.toLocaleString() }}
                </td>
                <td class="max-w-xs px-4 py-3 text-xs text-outline">{{ row.comparison_note }}</td>
              </tr>
            </tbody>
          </table>
        </div>

        <div v-else-if="detailTab === 'lgas'" class="overflow-x-auto">
          <table class="w-full text-left text-sm">
            <thead>
              <tr class="bg-surface-container-low font-label-caps text-[11px] uppercase text-on-surface-variant">
                <th class="px-4 py-3">State</th>
                <th class="px-4 py-3">LGA</th>
                <th class="px-4 py-3 text-right">Units</th>
                <th class="px-4 py-3 text-right">Votes</th>
                <th class="px-4 py-3 text-right">People</th>
                <th class="px-4 py-3 text-right">Diff</th>
                <th class="px-4 py-3">Note</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="row in filtered.by_lga" :key="`${row.state}-${row.lga}`" class="hover:bg-surface-container-low/50">
                <td class="px-4 py-3">{{ row.state || "—" }}</td>
                <td class="px-4 py-3 font-medium">{{ row.lga }}</td>
                <td class="px-4 py-3 text-right text-on-surface-variant">{{ row.unit_count }}</td>
                <td class="px-4 py-3 text-right font-semibold">{{ row.votes.toLocaleString() }}</td>
                <td class="px-4 py-3 text-right text-on-surface-variant">{{ row.people_count.toLocaleString() }}</td>
                <td class="px-4 py-3 text-right" :class="row.difference === 0 ? 'text-action-green' : 'text-electric-pink'">
                  {{ row.difference > 0 ? "+" : "" }}{{ row.difference.toLocaleString() }}
                </td>
                <td class="max-w-xs px-4 py-3 text-xs text-outline">{{ row.comparison_note }}</td>
              </tr>
            </tbody>
          </table>
        </div>

        <div v-else class="overflow-x-auto">
          <table class="w-full text-left text-sm">
            <thead>
              <tr class="bg-surface-container-low font-label-caps text-[11px] uppercase text-on-surface-variant">
                <th class="px-4 py-3">State</th>
                <th class="px-4 py-3">Ward</th>
                <th class="px-4 py-3">LGA</th>
                <th class="px-4 py-3 text-right">Units</th>
                <th class="px-4 py-3 text-right">Votes</th>
                <th class="px-4 py-3 text-right">People</th>
                <th class="px-4 py-3 text-right">Diff</th>
                <th class="px-4 py-3">Note</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="row in filtered.by_ward" :key="`${row.state}-${row.label}`" class="hover:bg-surface-container-low/50">
                <td class="px-4 py-3">{{ row.state || "—" }}</td>
                <td class="px-4 py-3 font-medium">{{ row.ward }}</td>
                <td class="px-4 py-3 text-on-surface-variant">{{ row.lga }}</td>
                <td class="px-4 py-3 text-right text-on-surface-variant">{{ row.unit_count }}</td>
                <td class="px-4 py-3 text-right font-semibold">{{ row.votes.toLocaleString() }}</td>
                <td class="px-4 py-3 text-right text-on-surface-variant">{{ row.people_count.toLocaleString() }}</td>
                <td class="px-4 py-3 text-right" :class="row.difference === 0 ? 'text-action-green' : 'text-electric-pink'">
                  {{ row.difference > 0 ? "+" : "" }}{{ row.difference.toLocaleString() }}
                </td>
                <td class="max-w-xs px-4 py-3 text-xs text-outline">{{ row.comparison_note }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <section
        v-if="scopedFlagged.length"
        class="overflow-hidden rounded-2xl border border-error/30 bg-surface-container-lowest shadow-sm"
      >
        <div class="border-b border-outline-variant/30 px-5 py-4">
          <h2 class="font-headline-md text-lg font-bold text-primary">
            Flagged for review ({{ scopedFlagged.length }})
          </h2>
          <p class="mt-1 text-xs text-outline">
            Over-voting, figure mismatch, or missing IReV — prioritized for tribunal prep.
          </p>
        </div>
        <ul class="divide-y divide-outline-variant/20">
          <li
            v-for="unit in scopedFlagged"
            :key="unit.code"
            class="flex flex-wrap items-center justify-between gap-3 px-5 py-3"
          >
            <div>
              <p class="text-sm font-medium text-on-surface">{{ unit.polling_unit_name }}</p>
              <p class="text-xs text-outline">{{ unit.code }} · {{ unit.state }} · {{ unit.ward }}, {{ unit.lga }}</p>
              <p class="mt-1 flex flex-wrap gap-1">
                <span
                  v-for="flag in unit.flags"
                  :key="flag"
                  class="rounded-full bg-error/15 px-2 py-0.5 text-[10px] font-semibold text-error"
                >
                  {{ flag.replace("_", " ") }}
                </span>
              </p>
            </div>
            <NuxtLink
              :to="`/admin/polling-units/${unit.code}/tribunal-report`"
              target="_blank"
              class="rounded-xl bg-error px-3 py-1.5 text-xs font-semibold text-on-error"
            >
              Open report
            </NuxtLink>
          </li>
        </ul>
      </section>
    </template>

    <p v-else class="rounded-2xl bg-surface-container-lowest p-8 text-center text-sm text-outline shadow-sm">
      No vote results yet.
    </p>
  </div>
</template>
