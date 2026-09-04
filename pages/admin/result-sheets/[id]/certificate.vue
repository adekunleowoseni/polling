<template>
  <div class="mx-auto max-w-3xl px-4 py-8 sm:px-6">
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

    <article v-else-if="cert" class="space-y-6 rounded-2xl border border-ui-border/50 bg-ui-surface p-8 text-sm leading-relaxed text-ui-text">
      <div class="rounded-lg border-2 border-amber-500/50 bg-amber-500/10 p-4 text-xs text-amber-800 dark:text-amber-300">
        <p class="font-semibold uppercase tracking-wide">Draft — for review and signature</p>
        <p class="mt-1">
          This document is auto-generated from the platform's records to support a Certificate of
          Compliance under the Evidence Act 2011, s.84. It is <strong>not</strong> itself a valid
          certificate: s.84(4) requires the certificate to be signed by a person occupying a
          responsible position in relation to the operation of the device/records, and typically
          deposed before a Commissioner for Oaths. Have counsel review the facts below before the
          named person signs.
        </p>
      </div>

      <header class="border-b border-ui-border/40 pb-4">
        <h1 class="text-lg font-bold">Certificate of Compliance — Draft</h1>
        <p class="text-xs text-ui-muted">Electronic record: EC8A result-sheet capture</p>
        <p class="mt-1 text-xs text-ui-muted">Generated {{ formatWhen(cert.generated_at) }}</p>
      </header>

      <section>
        <h2 class="font-semibold">1. The electronic device and record</h2>
        <dl class="mt-2 grid grid-cols-2 gap-x-4 gap-y-2 text-xs">
          <dt class="text-ui-muted">Polling unit</dt>
          <dd>{{ cert.result_sheet.polling_unit_name }} ({{ cert.result_sheet.code }})</dd>
          <dt class="text-ui-muted">Location</dt>
          <dd>{{ cert.result_sheet.ward }}, {{ cert.result_sheet.lga }}, {{ cert.result_sheet.state }}</dd>
          <dt class="text-ui-muted">Device id</dt>
          <dd>{{ cert.result_sheet.device_id || "not recorded" }}</dd>
          <dt class="text-ui-muted">App version</dt>
          <dd>{{ cert.result_sheet.app_version || "not recorded" }}</dd>
          <dt class="text-ui-muted">Device-reported capture time</dt>
          <dd>{{ cert.result_sheet.device_captured_at ? formatWhen(cert.result_sheet.device_captured_at) : "not recorded" }}</dd>
          <dt class="text-ui-muted">Server receipt time</dt>
          <dd>{{ formatWhen(cert.result_sheet.received_at) }}</dd>
          <dt class="text-ui-muted">GPS coordinates</dt>
          <dd>
            <span v-if="cert.result_sheet.captured_lat !== null">
              {{ cert.result_sheet.captured_lat }}, {{ cert.result_sheet.captured_lng }}
              (±{{ cert.result_sheet.captured_accuracy_m }}m)
            </span>
            <span v-else>not recorded</span>
          </dd>
          <dt class="text-ui-muted">SHA-256 of the photographed record</dt>
          <dd class="break-all font-mono">{{ cert.result_sheet.sha256 }}</dd>
          <dt class="text-ui-muted">IPFS CID</dt>
          <dd class="break-all font-mono">{{ cert.result_sheet.ipfs_cid || "pending" }}</dd>
          <dt class="text-ui-muted">Public-chain commitment</dt>
          <dd class="break-all font-mono">{{ cert.result_sheet.commitment_sha256 || "pending" }}</dd>
          <dt class="text-ui-muted">Anchor</dt>
          <dd>
            {{ cert.result_sheet.anchor_status || "pending" }}
            <span v-if="cert.result_sheet.tx_hash"> · {{ cert.result_sheet.tx_hash }}</span>
          </dd>
        </dl>
      </section>

      <section>
        <h2 class="font-semibold">2. Capturing agent</h2>
        <dl class="mt-2 grid grid-cols-2 gap-x-4 gap-y-2 text-xs">
          <dt class="text-ui-muted">Name</dt>
          <dd>{{ cert.agent_name || "unknown" }}</dd>
          <dt class="text-ui-muted">Email</dt>
          <dd>{{ cert.agent_email || "unknown" }}</dd>
          <dt class="text-ui-muted">Accreditation number</dt>
          <dd>{{ cert.result_sheet.agent_accreditation_number || "not recorded" }}</dd>
          <dt class="text-ui-muted">Party</dt>
          <dd>{{ cert.result_sheet.agent_party_name || "not recorded" }}</dd>
          <dt class="text-ui-muted">Claimed EC8A signatory</dt>
          <dd>{{ cert.result_sheet.agent_is_ec8a_signatory ? "Yes" : "No / not recorded" }}</dd>
        </dl>
      </section>

      <section>
        <h2 class="font-semibold">3. Tamper-evidence (hash-chain ledger)</h2>
        <p class="mt-1 text-xs text-ui-muted">
          Every capture is appended to an internal cryptographic hash chain; each entry depends on
          every entry before it, so altering or reordering any past record breaks the chain from
          that point forward.
        </p>
        <dl v-if="cert.ledger_entry" class="mt-2 grid grid-cols-2 gap-x-4 gap-y-2 text-xs">
          <dt class="text-ui-muted">Ledger sequence #</dt>
          <dd>{{ cert.ledger_entry.seq }}</dd>
          <dt class="text-ui-muted">Ledger hash</dt>
          <dd class="break-all font-mono">{{ cert.ledger_entry.ledger_hash }}</dd>
          <dt class="text-ui-muted">Previous entry's hash</dt>
          <dd class="break-all font-mono">{{ cert.ledger_entry.prev_ledger_hash }}</dd>
        </dl>
        <p v-else class="mt-2 text-xs text-red-500">No ledger entry found for this record.</p>
        <p class="no-print mt-3 text-xs">
          <NuxtLink :to="`/verify?q=${cert.result_sheet.sha256}`" class="text-emerald-600 hover:underline">
            Open public verify page →
          </NuxtLink>
          ·
          <a :href="packHref" class="text-emerald-600 hover:underline">Download tribunal pack</a>
        </p>
      </section>

      <section>
        <h2 class="font-semibold">4. Access log</h2>
        <p class="mt-1 text-xs text-ui-muted">Every view or edit of this record since capture.</p>
        <table v-if="cert.access_log.length" class="mt-2 w-full text-left text-xs">
          <thead>
            <tr class="border-b border-ui-border/40 text-ui-muted">
              <th class="py-1 pr-3">When</th>
              <th class="py-1 pr-3">Who</th>
              <th class="py-1 pr-3">Action</th>
              <th class="py-1">IP</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(entry, idx) in cert.access_log" :key="idx" class="border-b border-ui-border/20">
              <td class="py-1 pr-3">{{ formatWhen(entry.created_at) }}</td>
              <td class="py-1 pr-3">{{ entry.actor_name }} ({{ entry.actor_type }})</td>
              <td class="py-1 pr-3">{{ entry.action }}</td>
              <td class="py-1">{{ entry.ip || "—" }}</td>
            </tr>
          </tbody>
        </table>
        <p v-else class="mt-2 text-xs text-ui-muted">No access recorded yet.</p>
      </section>

      <section class="border-t border-ui-border/40 pt-6">
        <h2 class="font-semibold">Certification (to be completed by hand)</h2>
        <p class="mt-1 text-xs text-ui-muted">
          I certify that the above particulars are correct to the best of my knowledge, and that I
          occupy a responsible position in relation to the operation of the device/system that
          produced this record.
        </p>
        <div class="mt-6 grid gap-6 sm:grid-cols-2">
          <div>
            <p class="border-b border-ui-text/40 pb-8"></p>
            <p class="mt-1 text-xs text-ui-muted">Signature</p>
          </div>
          <div>
            <p class="border-b border-ui-text/40 pb-8"></p>
            <p class="mt-1 text-xs text-ui-muted">Full name and position</p>
          </div>
          <div>
            <p class="border-b border-ui-text/40 pb-8"></p>
            <p class="mt-1 text-xs text-ui-muted">Date</p>
          </div>
          <div>
            <p class="border-b border-ui-text/40 pb-8"></p>
            <p class="mt-1 text-xs text-ui-muted">Commissioner for Oaths (if deposed)</p>
          </div>
        </div>
      </section>
    </article>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ layout: "default" });

type ResultSheetOut = {
  polling_unit_name: string;
  code: string;
  state: string;
  ward: string;
  lga: string;
  device_id: string | null;
  app_version: string | null;
  device_captured_at: string | null;
  received_at: string;
  captured_lat: number | null;
  captured_lng: number | null;
  captured_accuracy_m: number | null;
  sha256: string;
  ipfs_cid: string | null;
  commitment_sha256: string | null;
  tx_hash: string | null;
  anchor_status: string | null;
  agent_accreditation_number: string | null;
  agent_party_name: string | null;
  agent_is_ec8a_signatory: boolean | null;
};

type LedgerEntry = {
  seq: number;
  ledger_hash: string;
  prev_ledger_hash: string;
};

type AccessLogEntry = {
  action: string;
  actor_type: string;
  actor_name: string;
  ip: string | null;
  created_at: string;
};

type Certificate = {
  result_sheet: ResultSheetOut;
  ledger_entry: LedgerEntry | null;
  access_log: AccessLogEntry[];
  agent_name: string | null;
  agent_email: string | null;
  generated_at: string;
};

const route = useRoute();
const config = useRuntimeConfig();
const apiBase = config.public.apiBase;
const { authHeaders, requireAdmin } = useAdminAuth();

const cert = ref<Certificate | null>(null);
const loading = ref(true);
const error = ref("");

const packHref = computed(() => {
  const id = route.params.id;
  if (!id || Array.isArray(id)) return "#";
  return `${apiBase}/public/evidence/result-sheet/${id}/pack`;
});

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
    cert.value = await $fetch<Certificate>(
      `${apiBase}/admin/result-sheets/${route.params.id}/certificate`,
      { headers: authHeaders() },
    );
  } catch {
    error.value = "Could not load this certificate.";
  } finally {
    loading.value = false;
  }
});
</script>
