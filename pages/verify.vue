<template>
  <div class="mx-auto max-w-3xl space-y-6 px-4 py-10 sm:px-6">
    <header>
      <p class="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-600">Independent provenance</p>
      <h1 class="mt-2 text-2xl font-bold text-ui-text">Verify election evidence</h1>
      <p class="mt-2 text-sm text-ui-muted">
        Paste a SHA-256 hash, IPFS CID, or record id. This checks the file bytes against the stored
        hash and shows any public-chain timestamp. It proves the file has not been altered since
        capture — not that the original scene was genuine.
      </p>
    </header>

    <form class="flex flex-col gap-3 sm:flex-row" @submit.prevent="lookup">
      <input
        v-model="query"
        class="ui-input flex-1"
        placeholder="SHA-256, IPFS CID, or record id"
        autocomplete="off"
      />
      <button
        type="submit"
        class="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-500 disabled:opacity-50"
        :disabled="loading || !query.trim()"
      >
        {{ loading ? "Checking…" : "Verify" }}
      </button>
    </form>

    <p v-if="error" class="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-600">
      {{ error }}
    </p>

    <article v-if="result" class="space-y-4 rounded-2xl border border-ui-border/50 bg-ui-surface p-6 text-sm">
      <div class="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p class="text-xs font-semibold uppercase tracking-wide text-ui-muted">{{ result.kind }}</p>
          <h2 class="text-lg font-semibold text-ui-text">
            {{ result.polling_unit_name || result.code || result.id }}
          </h2>
          <p v-if="result.code" class="text-xs text-ui-muted">{{ result.code }}</p>
        </div>
        <span
          class="rounded-full px-3 py-1 text-xs font-semibold"
          :class="matchClass"
        >
          {{ matchLabel }}
        </span>
      </div>

      <dl class="grid gap-x-4 gap-y-2 text-xs sm:grid-cols-2">
        <dt class="text-ui-muted">SHA-256</dt>
        <dd class="break-all font-mono">{{ result.sha256 || "—" }}</dd>
        <dt class="text-ui-muted">IPFS CID</dt>
        <dd class="break-all font-mono">{{ result.ipfs_cid || "—" }}</dd>
        <dt class="text-ui-muted">Commitment</dt>
        <dd class="break-all font-mono">{{ result.commitment_sha256 || "—" }}</dd>
        <dt class="text-ui-muted">Anchor</dt>
        <dd>{{ result.anchor_status || "pending" }}{{ result.chain ? ` · ${result.chain}` : "" }}</dd>
        <dt class="text-ui-muted">Device capture</dt>
        <dd>{{ result.device_captured_at ? formatWhen(result.device_captured_at) : "—" }}</dd>
        <dt class="text-ui-muted">Server received</dt>
        <dd>{{ result.received_at ? formatWhen(result.received_at) : "—" }}</dd>
        <dt class="text-ui-muted">On-chain time</dt>
        <dd>{{ result.anchored_at ? formatWhen(result.anchored_at) : "not yet mined" }}</dd>
        <template v-if="result.kind === 'recording'">
          <dt class="text-ui-muted">Merkle root</dt>
          <dd class="break-all font-mono">{{ result.merkle_root || "—" }}</dd>
          <dt class="text-ui-muted">Frames</dt>
          <dd>{{ result.frame_count ?? "—" }}</dd>
        </template>
        <template v-if="result.votes != null">
          <dt class="text-ui-muted">Votes</dt>
          <dd>{{ result.votes.toLocaleString() }}</dd>
        </template>
      </dl>

      <div class="flex flex-wrap gap-2">
        <a
          v-if="result.ipfs_url"
          :href="ipfsHref"
          target="_blank"
          rel="noreferrer"
          class="rounded-lg border border-ui-border/50 px-3 py-1.5 text-xs font-semibold hover:bg-ui-muted/10"
        >
          Open IPFS file
        </a>
        <a
          v-if="result.tx_url"
          :href="result.tx_url"
          target="_blank"
          rel="noreferrer"
          class="rounded-lg border border-ui-border/50 px-3 py-1.5 text-xs font-semibold hover:bg-ui-muted/10"
        >
          Open chain transaction
        </a>
        <a
          :href="packHref"
          class="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-500"
        >
          Download tribunal pack
        </a>
      </div>

      <section>
        <h3 class="font-semibold text-ui-text">How to check this in court</h3>
        <ol class="mt-2 list-decimal space-y-1 pl-5 text-xs text-ui-muted">
          <li v-for="(step, idx) in result.verify_steps" :key="idx">{{ step }}</li>
        </ol>
      </section>
    </article>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ layout: "default" });

useHead({ title: "Verify evidence" });

type EvidenceLookup = {
  kind: string;
  id: string;
  code: string | null;
  polling_unit_name: string | null;
  sha256: string | null;
  ipfs_cid: string | null;
  ipfs_url: string | null;
  merkle_root: string | null;
  commitment_sha256: string | null;
  file_matches_hash: boolean | null;
  chain: string | null;
  tx_hash: string | null;
  tx_url: string | null;
  block_number: number | null;
  anchored_at: string | null;
  anchor_status: string | null;
  device_captured_at: string | null;
  received_at: string | null;
  votes: number | null;
  frame_count: number | null;
  verify_steps: string[];
};

const route = useRoute();
const router = useRouter();
const config = useRuntimeConfig();
const apiBase = config.public.apiBase;

const query = ref(typeof route.query.q === "string" ? route.query.q : "");
const loading = ref(false);
const error = ref("");
const result = ref<EvidenceLookup | null>(null);

const matchLabel = computed(() => {
  if (!result.value) return "";
  if (result.value.file_matches_hash === true) return "File matches hash";
  if (result.value.file_matches_hash === false) return "Hash mismatch";
  return result.value.anchor_status === "anchored" ? "Anchored" : "Record found";
});

const matchClass = computed(() => {
  if (result.value?.file_matches_hash === true) return "bg-emerald-500/15 text-emerald-700";
  if (result.value?.file_matches_hash === false) return "bg-red-500/15 text-red-600";
  return "bg-sky-500/15 text-sky-700";
});

const packHref = computed(() => {
  if (!result.value) return "#";
  return `${apiBase}/public/evidence/${encodeURIComponent(result.value.kind)}/${encodeURIComponent(result.value.id)}/pack`;
});

const ipfsHref = computed(() => {
  const url = result.value?.ipfs_url;
  if (!url) return "#";
  if (url.startsWith("http")) return url;
  return `${apiBase}${url}`;
});

function formatWhen(iso: string) {
  try {
    return new Date(iso).toLocaleString();
  } catch {
    return iso;
  }
}

async function lookup() {
  const q = query.value.trim();
  if (!q) return;
  loading.value = true;
  error.value = "";
  result.value = null;
  await router.replace({ query: { q } });
  try {
    result.value = await $fetch<EvidenceLookup>(`${apiBase}/public/evidence/lookup`, {
      query: { q },
    });
  } catch (e: unknown) {
    const detail = (e as { data?: { detail?: string } })?.data?.detail;
    error.value = typeof detail === "string" ? detail : "No matching evidence found.";
  } finally {
    loading.value = false;
  }
}

onMounted(() => {
  if (query.value.trim()) void lookup();
});
</script>
