<template>
  <div class="mx-auto max-w-4xl px-4 py-8 sm:px-6">
    <div class="no-print mb-6 flex flex-wrap items-center justify-between gap-3">
      <NuxtLink to="/admin/dashboard" class="text-sm text-ui-muted hover:text-ui-text">← Back to dashboard</NuxtLink>
      <button
        type="button"
        class="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-500"
        @click="window.print()"
      >
        Print / Save as PDF
      </button>
    </div>

    <div v-if="loading" class="text-sm text-ui-muted">Loading…</div>
    <p v-else-if="error" class="text-sm text-red-500">{{ error }}</p>

    <article v-else-if="report" class="space-y-6 rounded-2xl border border-ui-border/50 bg-ui-surface p-8 text-sm leading-relaxed text-ui-text">
      <header class="border-b border-ui-border/40 pb-4">
        <h1 class="text-lg font-bold">Polling unit report — {{ report.polling_unit_name }}</h1>
        <p class="text-xs text-ui-muted">{{ report.code }} · {{ report.ward }}, {{ report.lga }}, {{ report.state }}</p>
        <p class="mt-1 text-xs text-ui-muted">Generated {{ formatWhen(report.generated_at) }}</p>
      </header>

      <section v-if="report.irregularity_summary.length">
        <h2 class="font-semibold text-red-600">Irregularities identified</h2>
        <ul class="mt-2 list-inside list-disc space-y-1 text-xs">
          <li v-for="(note, idx) in report.irregularity_summary" :key="idx">{{ note }}</li>
        </ul>
      </section>
      <p v-else class="rounded-lg border border-emerald-500/30 bg-emerald-500/5 p-3 text-xs text-emerald-700">
        No irregularities flagged for this unit at time of generation.
      </p>

      <section>
        <h2 class="font-semibold">Figures at a glance</h2>
        <table class="mt-2 w-full text-left text-xs">
          <thead>
            <tr class="border-b border-ui-border/40 text-ui-muted">
              <th class="py-1 pr-3">Registered</th>
              <th class="py-1 pr-3">Accredited</th>
              <th class="py-1 pr-3">Agent figure</th>
              <th class="py-1 pr-3">Official figure</th>
              <th class="py-1 pr-3">IReV image</th>
              <th class="py-1">External PVT</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td class="py-1 pr-3">{{ report.registered_voters?.toLocaleString() ?? "—" }}</td>
              <td class="py-1 pr-3">{{ report.accredited_voters?.toLocaleString() ?? "—" }}</td>
              <td class="py-1 pr-3 font-semibold">{{ report.agent_votes?.toLocaleString() ?? "—" }}</td>
              <td class="py-1 pr-3">
                {{ report.official_votes?.toLocaleString() ?? "not yet checked" }}
                <span v-if="report.official_source" class="text-[10px] text-ui-muted">({{ report.official_source }})</span>
              </td>
              <td class="py-1 pr-3">
                <span v-if="report.irev_image_uploaded === true" class="text-emerald-600">Uploaded</span>
                <span v-else-if="report.irev_image_uploaded === false" class="text-red-600">Missing</span>
                <span v-else class="text-ui-muted">Not checked</span>
              </td>
              <td class="py-1">
                <span v-if="report.external_pvt_votes !== null">
                  {{ report.external_pvt_votes?.toLocaleString() }} ({{ report.external_pvt_source }})
                </span>
                <span v-else class="text-ui-muted">Not entered</span>
              </td>
            </tr>
          </tbody>
        </table>
      </section>

      <section>
        <h2 class="font-semibold">Result-sheet submissions ({{ report.result_sheets.length }})</h2>
        <ul class="mt-2 space-y-2 text-xs">
          <li v-for="rs in report.result_sheets" :key="rs.id" class="rounded-lg border border-ui-border/30 p-3">
            <p>
              Version {{ rs.version }} · {{ rs.votes.toLocaleString() }} votes · captured
              {{ formatWhen(rs.received_at) }}
            </p>
            <p class="mt-1 break-all font-mono text-[10px] text-ui-muted">SHA-256: {{ rs.sha256 }}</p>
            <NuxtLink :to="`/admin/result-sheets/${rs.id}/certificate`" target="_blank" class="no-print text-emerald-600 hover:underline">
              View certificate →
            </NuxtLink>
          </li>
        </ul>
      </section>

      <section>
        <h2 class="font-semibold">Witness statements ({{ report.witness_statements.length }})</h2>
        <div v-if="!report.witness_statements.length" class="mt-2 text-xs text-ui-muted">
          No witness statements recorded for this unit.
        </div>
        <ul v-else class="mt-2 space-y-3 text-xs">
          <li v-for="ws in report.witness_statements" :key="ws.id" class="rounded-lg border border-ui-border/30 p-3">
            <p class="font-medium">
              {{ ws.agent_name || "Agent" }} — {{ ws.incident_category.replace("_", " ") }}
              <span class="text-ui-muted">({{ formatWhen(ws.submitted_at) }})</span>
            </p>
            <p class="mt-1 whitespace-pre-wrap">{{ ws.narrative }}</p>
            <div v-if="ws.people_present.length" class="mt-2">
              <p class="text-[10px] font-semibold uppercase tracking-wide text-ui-muted">Others present</p>
              <ul class="mt-1 list-inside list-disc">
                <li v-for="(p, idx) in ws.people_present" :key="idx">
                  {{ p.name }}<span v-if="p.role"> — {{ p.role }}</span><span v-if="p.phone"> ({{ p.phone }})</span>
                </li>
              </ul>
            </div>
          </li>
        </ul>
      </section>
    </article>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ layout: "default" });

type ResultSheetBrief = {
  id: string;
  version: number;
  votes: number;
  sha256: string;
  received_at: string;
};

type WitnessPersonPresent = { name: string; role: string | null; phone: string | null };

type WitnessStatement = {
  id: string;
  agent_name: string | null;
  incident_category: string;
  narrative: string;
  people_present: WitnessPersonPresent[];
  submitted_at: string;
};

type TribunalReport = {
  code: string;
  polling_unit_name: string;
  state: string;
  ward: string;
  lga: string;
  registered_voters: number | null;
  accredited_voters: number | null;
  agent_votes: number | null;
  official_votes: number | null;
  official_source: string | null;
  irev_image_uploaded: boolean | null;
  external_pvt_source: string | null;
  external_pvt_votes: number | null;
  result_sheets: ResultSheetBrief[];
  witness_statements: WitnessStatement[];
  irregularity_summary: string[];
  generated_at: string;
};

const route = useRoute();
const config = useRuntimeConfig();
const apiBase = config.public.apiBase;
const { authHeaders, requireAdmin } = useAdminAuth();

const report = ref<TribunalReport | null>(null);
const loading = ref(true);
const error = ref("");

function formatWhen(iso: string) {
  try {
    return new Date(iso).toLocaleString();
  } catch {
    return iso;
  }
}

onMounted(async () => {
  if (!requireAdmin()) return;
  try {
    report.value = await $fetch<TribunalReport>(
      `${apiBase}/admin/polling-units/${route.params.code}/tribunal-report`,
      { headers: authHeaders() },
    );
  } catch {
    error.value = "Could not load a report for this polling unit.";
  } finally {
    loading.value = false;
  }
});
</script>
