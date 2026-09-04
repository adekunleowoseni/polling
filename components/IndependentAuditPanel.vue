<script setup lang="ts">
type VoteUnitStat = {
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

type VotePlaceStat = {
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

type VoteResultsSummary = {
  total_votes: number;
  units_with_results: number;
  total_people_counted: number;
  overall_difference: number;
  overall_note: string;
  plain_summary: string;
  by_polling_unit: VoteUnitStat[];
  by_lga: VotePlaceStat[];
  by_ward: VotePlaceStat[];
  highest_unit: VoteUnitStat | null;
  lowest_unit: VoteUnitStat | null;
  highest_lga: VotePlaceStat | null;
  lowest_lga: VotePlaceStat | null;
};

type ResultSheet = {
  id: string;
  code: string;
  polling_unit_name: string;
  state: string;
  ward: string;
  lga: string;
  votes: number;
  accredited_voters: number | null;
  registered_voters: number | null;
  people_count_at_capture: number;
  official_votes: number | null;
  official_source: string | null;
  official_diff: number | null;
  discrepancy_note: string | null;
  over_accreditation: boolean;
  irev_image_uploaded: boolean | null;
  external_pvt_votes: number | null;
  received_at: string;
};

type FlaggedUnit = {
  code: string;
  polling_unit_name: string;
  state: string;
  ward: string;
  lga: string;
  flags: string[];
};

type AuditTab = "standings" | "collation" | "matrix";
type StandingView = "lgas" | "wards" | "units";

const props = withDefaults(
  defineProps<{
    apiBase: string;
    authHeaders: () => Record<string, string>;
  }>(),
  {},
);

const activeTab = ref<AuditTab>("standings");
const standingView = ref<StandingView>("lgas");
const loading = ref(false);
const error = ref("");
const summary = ref<VoteResultsSummary | null>(null);
const sheets = ref<ResultSheet[]>([]);
const flagged = ref<FlaggedUnit[]>([]);

const tabs = [
  { id: "standings" as const, label: "Standings" },
  { id: "collation" as const, label: "Collation" },
  { id: "matrix" as const, label: "Matrix" },
];

async function load() {
  loading.value = true;
  error.value = "";
  try {
    const headers = props.authHeaders();
    const [voteRes, sheetRes, flagRes] = await Promise.all([
      $fetch<VoteResultsSummary>(`${props.apiBase}/admin/results/summary`, { headers }),
      $fetch<ResultSheet[]>(`${props.apiBase}/admin/result-sheets`, { headers }).catch(() => []),
      $fetch<FlaggedUnit[]>(`${props.apiBase}/admin/tribunal-reports/flagged`, { headers }).catch(() => []),
    ]);
    summary.value = voteRes;
    sheets.value = sheetRes;
    flagged.value = flagRes;
  } catch {
    error.value = "Could not load independent audit data. Sign in as an admin and try again.";
    summary.value = null;
    sheets.value = [];
    flagged.value = [];
  } finally {
    loading.value = false;
  }
}

onMounted(() => {
  void load();
});

const rankedLgas = computed(() =>
  [...(summary.value?.by_lga ?? [])].sort((a, b) => b.votes - a.votes),
);
const rankedWards = computed(() =>
  [...(summary.value?.by_ward ?? [])].sort((a, b) => b.votes - a.votes),
);
const rankedUnits = computed(() =>
  [...(summary.value?.by_polling_unit ?? [])].sort((a, b) => b.votes - a.votes),
);

type CollationRow = {
  key: string;
  lga: string;
  ward: string;
  units: number;
  agent_votes: number;
  official_votes: number;
  official_units: number;
  accredited: number;
  flagged: number;
};

const collationRows = computed<CollationRow[]>(() => {
  const map = new Map<string, CollationRow>();
  for (const sheet of sheets.value) {
    const key = `${sheet.lga}||${sheet.ward}`;
    const row = map.get(key) ?? {
      key,
      lga: sheet.lga,
      ward: sheet.ward,
      units: 0,
      agent_votes: 0,
      official_votes: 0,
      official_units: 0,
      accredited: 0,
      flagged: 0,
    };
    row.units += 1;
    row.agent_votes += sheet.votes;
    if (sheet.official_votes != null) {
      row.official_votes += sheet.official_votes;
      row.official_units += 1;
    }
    row.accredited += sheet.accredited_voters ?? 0;
    if (sheet.discrepancy_note || sheet.over_accreditation) row.flagged += 1;
    map.set(key, row);
  }
  return [...map.values()].sort((a, b) => a.lga.localeCompare(b.lga) || a.ward.localeCompare(b.ward));
});

const collationTotals = computed(() =>
  collationRows.value.reduce(
    (acc, row) => {
      acc.units += row.units;
      acc.agent_votes += row.agent_votes;
      acc.official_votes += row.official_votes;
      acc.official_units += row.official_units;
      acc.flagged += row.flagged;
      return acc;
    },
    { units: 0, agent_votes: 0, official_votes: 0, official_units: 0, flagged: 0 },
  ),
);

type MatrixRow = {
  code: string;
  name: string;
  lga: string;
  ward: string;
  agent_votes: number | null;
  people: number | null;
  official: number | null;
  accredited: number | null;
  irev: string;
  flags: string[];
};

const matrixRows = computed<MatrixRow[]>(() => {
  const byCode = new Map<string, MatrixRow>();
  for (const unit of summary.value?.by_polling_unit ?? []) {
    byCode.set(unit.code, {
      code: unit.code,
      name: unit.name,
      lga: unit.lga,
      ward: unit.ward,
      agent_votes: unit.votes,
      people: unit.people_count,
      official: null,
      accredited: null,
      irev: "—",
      flags: unit.difference !== 0 ? ["votes vs people"] : [],
    });
  }
  for (const sheet of sheets.value) {
    const existing = byCode.get(sheet.code);
    const flags = existing?.flags ?? [];
    if (sheet.over_accreditation) flags.push("over-accreditation");
    if (sheet.discrepancy_note) flags.push("official mismatch");
    byCode.set(sheet.code, {
      code: sheet.code,
      name: existing?.name || sheet.polling_unit_name,
      lga: sheet.lga,
      ward: sheet.ward,
      agent_votes: existing?.agent_votes ?? sheet.votes,
      people: existing?.people ?? sheet.people_count_at_capture,
      official: sheet.official_votes,
      accredited: sheet.accredited_voters,
      irev: sheet.irev_image_uploaded == null ? "—" : sheet.irev_image_uploaded ? "Uploaded" : "Missing",
      flags: [...new Set(flags)],
    });
  }
  for (const unit of flagged.value) {
    const existing = byCode.get(unit.code) ?? {
      code: unit.code,
      name: unit.polling_unit_name,
      lga: unit.lga,
      ward: unit.ward,
      agent_votes: null,
      people: null,
      official: null,
      accredited: null,
      irev: "—",
      flags: [],
    };
    existing.flags = [...new Set([...existing.flags, ...unit.flags.map((f) => f.replaceAll("_", " "))])];
    byCode.set(unit.code, existing);
  }
  return [...byCode.values()].sort((a, b) => a.lga.localeCompare(b.lga) || a.ward.localeCompare(b.ward) || a.name.localeCompare(b.name));
});

function formatNum(value: number | null | undefined) {
  if (value == null) return "—";
  return value.toLocaleString();
}

function rankClass(index: number) {
  if (index === 0) return "text-amber-600 dark:text-amber-400";
  if (index === 1) return "text-slate-500";
  if (index === 2) return "text-orange-700 dark:text-orange-400";
  return "text-ui-muted";
}
</script>

<template>
  <div class="space-y-5">
    <div class="flex flex-wrap items-start justify-between gap-3">
      <div>
        <p class="text-xs font-semibold uppercase tracking-[0.2em] text-violet-600 dark:text-violet-400">
          Independent Audit
        </p>
        <h1 class="mt-1 text-2xl font-bold text-ui-text">Ogun State result audit</h1>
        <p class="mt-1 max-w-2xl text-sm text-ui-muted">
          Compare field standings, ward-level collation, and the unit matrix of agent figures, people counts, and official returns.
        </p>
      </div>
      <button
        type="button"
        class="rounded-lg border border-ui-border/50 px-3 py-1.5 text-xs hover:bg-ui-muted/10"
        :disabled="loading"
        @click="load"
      >
        {{ loading ? "Loading…" : "Refresh" }}
      </button>
    </div>

    <nav class="flex flex-wrap gap-2 border-b border-ui-border/40 pb-3">
      <button
        v-for="tab in tabs"
        :key="tab.id"
        type="button"
        class="rounded-lg px-4 py-2 text-sm font-medium transition"
        :class="activeTab === tab.id ? 'bg-violet-600 text-white' : 'text-ui-muted hover:bg-ui-muted/10 hover:text-ui-text'"
        @click="activeTab = tab.id"
      >
        {{ tab.label }}
      </button>
    </nav>

    <p v-if="error" class="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-2 text-sm text-red-500">
      {{ error }}
    </p>
    <p v-else-if="loading && !summary" class="text-sm text-ui-muted">Loading audit tables…</p>

    <section v-else-if="activeTab === 'standings'" class="space-y-4">
      <div class="grid gap-3 sm:grid-cols-3">
        <div class="ui-card p-4">
          <p class="text-[10px] uppercase tracking-wider text-ui-muted">Total votes</p>
          <p class="mt-1 text-2xl font-bold text-violet-600 dark:text-violet-400">
            {{ formatNum(summary?.total_votes ?? 0) }}
          </p>
        </div>
        <div class="ui-card p-4">
          <p class="text-[10px] uppercase tracking-wider text-ui-muted">Units reporting</p>
          <p class="mt-1 text-2xl font-bold text-ui-text">{{ formatNum(summary?.units_with_results ?? 0) }}</p>
        </div>
        <div class="ui-card p-4">
          <p class="text-[10px] uppercase tracking-wider text-ui-muted">Leading LGA</p>
          <p class="mt-1 text-lg font-semibold text-ui-text">{{ summary?.highest_lga?.lga || "—" }}</p>
          <p class="text-xs text-ui-muted">{{ formatNum(summary?.highest_lga?.votes) }} votes</p>
        </div>
      </div>

      <div class="ui-card overflow-hidden">
        <div class="flex flex-wrap gap-2 border-b border-ui-border/40 px-5 py-3">
          <button
            v-for="opt in [
              { id: 'lgas', label: 'By LGA' },
              { id: 'wards', label: 'By ward' },
              { id: 'units', label: 'By polling unit' },
            ] as const"
            :key="opt.id"
            type="button"
            class="rounded-lg px-3 py-1.5 text-xs font-medium transition"
            :class="standingView === opt.id ? 'bg-violet-600 text-white' : 'text-ui-muted hover:bg-ui-muted/10'"
            @click="standingView = opt.id"
          >
            {{ opt.label }}
          </button>
        </div>

        <div v-if="standingView === 'lgas'" class="overflow-x-auto">
          <table class="w-full text-left text-sm">
            <thead>
              <tr class="border-b border-ui-border/30 text-xs uppercase text-ui-muted">
                <th class="px-4 py-2">#</th>
                <th class="px-4 py-2">Local government</th>
                <th class="px-4 py-2 text-right">Units</th>
                <th class="px-4 py-2 text-right">Votes</th>
                <th class="px-4 py-2 text-right">People</th>
                <th class="px-4 py-2 text-right">Gap</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-ui-border/30">
              <tr v-for="(row, index) in rankedLgas" :key="`${row.state}-${row.lga}`">
                <td class="px-4 py-2 font-semibold" :class="rankClass(index)">{{ index + 1 }}</td>
                <td class="px-4 py-2 font-medium text-ui-text">{{ row.lga }}</td>
                <td class="px-4 py-2 text-right text-ui-muted">{{ row.unit_count }}</td>
                <td class="px-4 py-2 text-right font-semibold text-ui-text">{{ formatNum(row.votes) }}</td>
                <td class="px-4 py-2 text-right text-ui-muted">{{ formatNum(row.people_count) }}</td>
                <td class="px-4 py-2 text-right" :class="row.difference === 0 ? 'text-emerald-600' : 'text-amber-600'">
                  {{ row.difference > 0 ? "+" : "" }}{{ formatNum(row.difference) }}
                </td>
              </tr>
              <tr v-if="!rankedLgas.length">
                <td colspan="6" class="px-4 py-8 text-center text-ui-muted">No standings yet.</td>
              </tr>
            </tbody>
          </table>
        </div>

        <div v-else-if="standingView === 'wards'" class="overflow-x-auto">
          <table class="w-full text-left text-sm">
            <thead>
              <tr class="border-b border-ui-border/30 text-xs uppercase text-ui-muted">
                <th class="px-4 py-2">#</th>
                <th class="px-4 py-2">Ward</th>
                <th class="px-4 py-2">LGA</th>
                <th class="px-4 py-2 text-right">Votes</th>
                <th class="px-4 py-2 text-right">People</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-ui-border/30">
              <tr v-for="(row, index) in rankedWards" :key="`${row.state}-${row.label}`">
                <td class="px-4 py-2 font-semibold" :class="rankClass(index)">{{ index + 1 }}</td>
                <td class="px-4 py-2 font-medium text-ui-text">{{ row.ward || row.label }}</td>
                <td class="px-4 py-2 text-ui-muted">{{ row.lga }}</td>
                <td class="px-4 py-2 text-right font-semibold text-ui-text">{{ formatNum(row.votes) }}</td>
                <td class="px-4 py-2 text-right text-ui-muted">{{ formatNum(row.people_count) }}</td>
              </tr>
              <tr v-if="!rankedWards.length">
                <td colspan="5" class="px-4 py-8 text-center text-ui-muted">No ward standings yet.</td>
              </tr>
            </tbody>
          </table>
        </div>

        <div v-else class="overflow-x-auto">
          <table class="w-full text-left text-sm">
            <thead>
              <tr class="border-b border-ui-border/30 text-xs uppercase text-ui-muted">
                <th class="px-4 py-2">#</th>
                <th class="px-4 py-2">Polling unit</th>
                <th class="px-4 py-2">Ward</th>
                <th class="px-4 py-2">LGA</th>
                <th class="px-4 py-2 text-right">Votes</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-ui-border/30">
              <tr v-for="(row, index) in rankedUnits" :key="row.code">
                <td class="px-4 py-2 font-semibold" :class="rankClass(index)">{{ index + 1 }}</td>
                <td class="px-4 py-2">
                  <p class="font-medium text-ui-text">{{ row.name }}</p>
                  <p class="text-xs text-ui-muted">{{ row.code }}</p>
                </td>
                <td class="px-4 py-2 text-ui-muted">{{ row.ward }}</td>
                <td class="px-4 py-2 text-ui-muted">{{ row.lga }}</td>
                <td class="px-4 py-2 text-right font-semibold text-ui-text">{{ formatNum(row.votes) }}</td>
              </tr>
              <tr v-if="!rankedUnits.length">
                <td colspan="5" class="px-4 py-8 text-center text-ui-muted">No polling-unit results yet.</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </section>

    <section v-else-if="activeTab === 'collation'" class="space-y-4">
      <div class="grid gap-3 sm:grid-cols-4">
        <div class="ui-card p-4">
          <p class="text-[10px] uppercase tracking-wider text-ui-muted">Sheets collated</p>
          <p class="mt-1 text-2xl font-bold text-ui-text">{{ formatNum(collationTotals.units) }}</p>
        </div>
        <div class="ui-card p-4">
          <p class="text-[10px] uppercase tracking-wider text-ui-muted">Agent votes</p>
          <p class="mt-1 text-2xl font-bold text-violet-600 dark:text-violet-400">{{ formatNum(collationTotals.agent_votes) }}</p>
        </div>
        <div class="ui-card p-4">
          <p class="text-[10px] uppercase tracking-wider text-ui-muted">Official votes</p>
          <p class="mt-1 text-2xl font-bold text-ui-text">{{ formatNum(collationTotals.official_votes) }}</p>
          <p class="text-xs text-ui-muted">{{ collationTotals.official_units }} unit(s) confirmed</p>
        </div>
        <div class="ui-card p-4">
          <p class="text-[10px] uppercase tracking-wider text-ui-muted">Flagged wards</p>
          <p class="mt-1 text-2xl font-bold text-red-600">{{ formatNum(collationTotals.flagged) }}</p>
        </div>
      </div>

      <div class="ui-card overflow-hidden">
        <div class="border-b border-ui-border/40 px-5 py-4">
          <h2 class="font-semibold text-ui-text">Ward collation</h2>
          <p class="mt-1 text-xs text-ui-muted">
            Agent EC8A totals rolled up by ward, against official / IReV figures when they have been entered.
          </p>
        </div>
        <div class="overflow-x-auto">
          <table class="w-full text-left text-sm">
            <thead>
              <tr class="border-b border-ui-border/30 text-xs uppercase text-ui-muted">
                <th class="px-4 py-2">LGA</th>
                <th class="px-4 py-2">Ward</th>
                <th class="px-4 py-2 text-right">Units</th>
                <th class="px-4 py-2 text-right">Agent votes</th>
                <th class="px-4 py-2 text-right">Official votes</th>
                <th class="px-4 py-2 text-right">Gap</th>
                <th class="px-4 py-2 text-right">Accredited</th>
                <th class="px-4 py-2 text-right">Flags</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-ui-border/30">
              <tr v-for="row in collationRows" :key="row.key">
                <td class="px-4 py-2 font-medium text-ui-text">{{ row.lga }}</td>
                <td class="px-4 py-2 text-ui-text">{{ row.ward }}</td>
                <td class="px-4 py-2 text-right text-ui-muted">{{ row.units }}</td>
                <td class="px-4 py-2 text-right font-semibold text-ui-text">{{ formatNum(row.agent_votes) }}</td>
                <td class="px-4 py-2 text-right text-ui-muted">
                  {{ row.official_units ? formatNum(row.official_votes) : "—" }}
                </td>
                <td
                  class="px-4 py-2 text-right"
                  :class="row.official_units && row.official_votes !== row.agent_votes ? 'text-amber-600' : 'text-emerald-600'"
                >
                  {{ row.official_units ? formatNum(row.official_votes - row.agent_votes) : "—" }}
                </td>
                <td class="px-4 py-2 text-right text-ui-muted">{{ formatNum(row.accredited) }}</td>
                <td class="px-4 py-2 text-right" :class="row.flagged ? 'text-red-600' : 'text-ui-muted'">
                  {{ row.flagged }}
                </td>
              </tr>
              <tr v-if="!collationRows.length">
                <td colspan="8" class="px-4 py-8 text-center text-ui-muted">No result sheets to collate yet.</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </section>

    <section v-else class="space-y-4">
      <div class="ui-card overflow-hidden">
        <div class="border-b border-ui-border/40 px-5 py-4">
          <h2 class="font-semibold text-ui-text">Comparison matrix</h2>
          <p class="mt-1 text-xs text-ui-muted">
            Agent votes, people counted on site, official / IReV figures, and accreditation in one grid.
          </p>
        </div>
        <div class="overflow-x-auto">
          <table class="w-full text-left text-sm">
            <thead>
              <tr class="border-b border-ui-border/30 text-xs uppercase text-ui-muted">
                <th class="px-4 py-2">Polling unit</th>
                <th class="px-4 py-2">Ward</th>
                <th class="px-4 py-2">LGA</th>
                <th class="px-4 py-2 text-right">Agent votes</th>
                <th class="px-4 py-2 text-right">People</th>
                <th class="px-4 py-2 text-right">Official</th>
                <th class="px-4 py-2 text-right">Accredited</th>
                <th class="px-4 py-2">IReV</th>
                <th class="px-4 py-2">Flags</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-ui-border/30">
              <tr v-for="row in matrixRows" :key="row.code">
                <td class="px-4 py-2">
                  <p class="font-medium text-ui-text">{{ row.name }}</p>
                  <p class="text-xs text-ui-muted">{{ row.code }}</p>
                </td>
                <td class="px-4 py-2 text-ui-muted">{{ row.ward }}</td>
                <td class="px-4 py-2 text-ui-muted">{{ row.lga }}</td>
                <td class="px-4 py-2 text-right font-semibold text-ui-text">{{ formatNum(row.agent_votes) }}</td>
                <td class="px-4 py-2 text-right text-ui-muted">{{ formatNum(row.people) }}</td>
                <td class="px-4 py-2 text-right text-ui-text">{{ formatNum(row.official) }}</td>
                <td class="px-4 py-2 text-right text-ui-muted">{{ formatNum(row.accredited) }}</td>
                <td class="px-4 py-2" :class="row.irev === 'Missing' ? 'text-red-600' : 'text-ui-muted'">
                  {{ row.irev }}
                </td>
                <td class="px-4 py-2">
                  <div v-if="row.flags.length" class="flex flex-wrap gap-1">
                    <span
                      v-for="flag in row.flags"
                      :key="flag"
                      class="rounded-full bg-red-500/15 px-2 py-0.5 text-[10px] font-semibold text-red-600"
                    >
                      {{ flag }}
                    </span>
                  </div>
                  <span v-else class="text-xs text-emerald-600">Clear</span>
                </td>
              </tr>
              <tr v-if="!matrixRows.length">
                <td colspan="9" class="px-4 py-8 text-center text-ui-muted">No matrix rows yet.</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </section>
  </div>
</template>
