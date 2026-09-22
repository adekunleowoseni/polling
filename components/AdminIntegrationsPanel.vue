<script setup lang="ts">
export type IntegrationCredentials = {
  vtpass_configured: boolean;
  vtpass_api_key_masked: string | null;
  vtpass_public_key_masked: string | null;
  vtpass_secret_configured: boolean;
  vtpass_base_url: string | null;
  livekit_configured: boolean;
  livekit_url: string | null;
  livekit_api_key_masked: string | null;
  livekit_api_secret_configured: boolean;
  pinata_configured: boolean;
  pinata_jwt_masked: string | null;
  ipfs_gateway: string | null;
  opentimestamps_enabled: boolean;
  polygon_configured: boolean;
  polygon_rpc_url: string | null;
  polygon_private_key_configured: boolean;
  polygon_chain_id: number;
  polygon_contract_address: string | null;
  polygon_explorer_base: string | null;
  google_maps_configured: boolean;
  google_maps_api_key_masked: string | null;
  config_source: string;
};

type Section = "vtpass" | "livekit" | "ipfs" | "anchors" | "maps";

const emit = defineEmits<{
  (e: "error", msg: string): void;
  (e: "message", msg: string): void;
}>();

const { isSuperAdmin, authHeaders, apiBase } = useAdminAuth();

const loading = ref(true);
const savingSection = ref<Section | null>(null);
const creds = ref<IntegrationCredentials | null>(null);

const vtpassApiKey = ref("");
const vtpassPublicKey = ref("");
const vtpassSecretKey = ref("");
const vtpassBaseUrl = ref("");

const livekitUrl = ref("");
const livekitApiKey = ref("");
const livekitApiSecret = ref("");

const pinataJwt = ref("");
const ipfsGateway = ref("");

const otsEnabled = ref(true);
const polygonRpc = ref("");
const polygonPrivateKey = ref("");
const polygonChainId = ref(80002);
const polygonContract = ref("");
const polygonExplorer = ref("");

const mapsApiKey = ref("");

onMounted(() => void refresh());

async function refresh() {
  if (!isSuperAdmin.value) {
    loading.value = false;
    return;
  }
  loading.value = true;
  try {
    creds.value = await $fetch<IntegrationCredentials>(`${apiBase}/admin/integrations`, {
      headers: authHeaders(),
    });
    vtpassBaseUrl.value = creds.value.vtpass_base_url ?? "";
    livekitUrl.value = creds.value.livekit_url ?? "";
    ipfsGateway.value = creds.value.ipfs_gateway ?? "";
    otsEnabled.value = creds.value.opentimestamps_enabled;
    polygonRpc.value = creds.value.polygon_rpc_url ?? "";
    polygonChainId.value = creds.value.polygon_chain_id ?? 80002;
    polygonContract.value = creds.value.polygon_contract_address ?? "";
    polygonExplorer.value = creds.value.polygon_explorer_base ?? "";
  } catch (e: unknown) {
    emit("error", e instanceof Error ? e.message : "Failed to load integration credentials.");
  } finally {
    loading.value = false;
  }
}

function patchFor(section: Section): Record<string, string | boolean | number> {
  if (section === "vtpass") {
    const patch: Record<string, string> = {};
    if (vtpassBaseUrl.value.trim()) patch.vtpass_base_url = vtpassBaseUrl.value.trim();
    if (vtpassApiKey.value.trim()) patch.vtpass_api_key = vtpassApiKey.value.trim();
    if (vtpassPublicKey.value.trim()) patch.vtpass_public_key = vtpassPublicKey.value.trim();
    if (vtpassSecretKey.value.trim()) patch.vtpass_secret_key = vtpassSecretKey.value.trim();
    return patch;
  }
  if (section === "livekit") {
    const patch: Record<string, string> = {};
    if (livekitUrl.value.trim()) patch.livekit_url = livekitUrl.value.trim();
    if (livekitApiKey.value.trim()) patch.livekit_api_key = livekitApiKey.value.trim();
    if (livekitApiSecret.value.trim()) patch.livekit_api_secret = livekitApiSecret.value.trim();
    return patch;
  }
  if (section === "ipfs") {
    const patch: Record<string, string> = {};
    if (ipfsGateway.value.trim()) patch.ipfs_gateway = ipfsGateway.value.trim();
    if (pinataJwt.value.trim()) patch.pinata_jwt = pinataJwt.value.trim();
    return patch;
  }
  if (section === "anchors") {
    const patch: Record<string, string | boolean | number> = {
      opentimestamps_enabled: otsEnabled.value,
      polygon_chain_id: Number(polygonChainId.value) || 80002,
    };
    if (polygonRpc.value.trim()) patch.polygon_rpc_url = polygonRpc.value.trim();
    if (polygonPrivateKey.value.trim()) patch.polygon_private_key = polygonPrivateKey.value.trim();
    if (polygonContract.value.trim()) patch.polygon_contract_address = polygonContract.value.trim();
    if (polygonExplorer.value.trim()) patch.polygon_explorer_base = polygonExplorer.value.trim();
    return patch;
  }
  const patch: Record<string, string> = {};
  if (mapsApiKey.value.trim()) patch.google_maps_api_key = mapsApiKey.value.trim();
  return patch;
}

function clearSecrets(section: Section) {
  if (section === "vtpass") {
    vtpassApiKey.value = "";
    vtpassPublicKey.value = "";
    vtpassSecretKey.value = "";
  } else if (section === "livekit") {
    livekitApiKey.value = "";
    livekitApiSecret.value = "";
  } else if (section === "ipfs") {
    pinataJwt.value = "";
  } else if (section === "anchors") {
    polygonPrivateKey.value = "";
  } else if (section === "maps") {
    mapsApiKey.value = "";
  }
}

const sectionLabels: Record<Section, string> = {
  vtpass: "VTpass",
  livekit: "LiveKit",
  ipfs: "IPFS / Pinata",
  anchors: "Public-chain anchors",
  maps: "Google Maps",
};

async function saveSection(section: Section) {
  const patch = patchFor(section);
  if (!Object.keys(patch).length) {
    emit("error", `Enter at least one ${sectionLabels[section]} field to save.`);
    return;
  }
  savingSection.value = section;
  try {
    creds.value = await $fetch<IntegrationCredentials>(`${apiBase}/admin/integrations`, {
      method: "PATCH",
      headers: authHeaders(),
      body: patch,
    });
    clearSecrets(section);
    emit("message", `${sectionLabels[section]} credentials saved.`);
    await refresh();
  } catch (e: unknown) {
    emit("error", e instanceof Error ? e.message : `Failed to save ${sectionLabels[section]}.`);
  } finally {
    savingSection.value = null;
  }
}

function statusClass(ok: boolean | undefined) {
  return ok ? "text-action-green" : "text-outline";
}

function statusLabel(ok: boolean | undefined) {
  return ok ? "CONFIGURED" : "NOT SET";
}
</script>

<template>
  <div class="flex w-full flex-col gap-6 pb-10">
    <header class="flex flex-col justify-between gap-4 xl:flex-row xl:items-end">
      <div>
        <div class="mb-2 flex flex-wrap items-center gap-2">
          <span class="font-label-caps text-label-caps uppercase tracking-wider text-outline">HQ Central Command</span>
          <span class="text-outline">/</span>
          <span class="font-label-caps text-label-caps font-bold uppercase tracking-wider text-secondary">
            Platform Credentials
          </span>
        </div>
        <h1 class="font-headline-md text-2xl font-bold tracking-tight text-primary sm:text-headline-md">
          Integration Credentials
        </h1>
        <p class="mt-1 max-w-2xl text-sm text-on-surface-variant">
          Save each integration independently. Leave secret fields blank to keep existing values.
        </p>
      </div>
      <button
        type="button"
        class="inline-flex items-center gap-2 rounded-xl bg-surface-container px-4 py-2.5 text-sm text-on-surface hover:bg-surface-container-high disabled:opacity-50"
        :disabled="loading"
        @click="refresh"
      >
        <span class="material-symbols-outlined text-[18px]">sync</span>
        Refresh status
      </button>
    </header>

    <div
      v-if="!isSuperAdmin"
      class="rounded-2xl bg-surface-container-lowest p-8 text-center text-sm text-outline shadow-sm"
    >
      Platform credentials are restricted to super admins.
    </div>

    <div v-else-if="loading" class="rounded-2xl bg-surface-container-lowest p-10 text-center text-sm text-outline shadow-sm">
      Loading credentials…
    </div>

    <template v-else>
      <div class="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5">
        <div class="rounded-2xl bg-surface-container-lowest p-4 shadow-sm">
          <p class="font-label-caps text-[10px] uppercase text-outline">VTpass</p>
          <p class="mt-1 text-sm font-bold" :class="statusClass(creds?.vtpass_configured)">
            {{ statusLabel(creds?.vtpass_configured) }}
          </p>
        </div>
        <div class="rounded-2xl bg-surface-container-lowest p-4 shadow-sm">
          <p class="font-label-caps text-[10px] uppercase text-outline">LiveKit</p>
          <p class="mt-1 text-sm font-bold" :class="statusClass(creds?.livekit_configured)">
            {{ statusLabel(creds?.livekit_configured) }}
          </p>
        </div>
        <div class="rounded-2xl bg-surface-container-lowest p-4 shadow-sm">
          <p class="font-label-caps text-[10px] uppercase text-outline">IPFS / Pinata</p>
          <p class="mt-1 text-sm font-bold" :class="statusClass(creds?.pinata_configured)">
            {{ statusLabel(creds?.pinata_configured) }}
          </p>
        </div>
        <div class="rounded-2xl bg-surface-container-lowest p-4 shadow-sm">
          <p class="font-label-caps text-[10px] uppercase text-outline">Polygon</p>
          <p class="mt-1 text-sm font-bold" :class="statusClass(creds?.polygon_configured)">
            {{ statusLabel(creds?.polygon_configured) }}
          </p>
        </div>
        <div class="rounded-2xl bg-surface-container-lowest p-4 shadow-sm">
          <p class="font-label-caps text-[10px] uppercase text-outline">Google Maps</p>
          <p class="mt-1 text-sm font-bold" :class="statusClass(creds?.google_maps_configured)">
            {{ statusLabel(creds?.google_maps_configured) }}
          </p>
          <p class="mt-1 text-[11px] text-outline">Source: {{ creds?.config_source || "—" }}</p>
        </div>
      </div>

      <div class="grid gap-4 lg:grid-cols-2">
        <div class="space-y-3 rounded-2xl bg-surface-container-lowest p-6 shadow-sm">
          <h2 class="font-headline-md text-lg font-bold text-primary">VTpass</h2>
          <p class="text-xs text-outline">
            Masked: {{ creds?.vtpass_api_key_masked || "—" }} /
            {{ creds?.vtpass_public_key_masked || "—" }}
          </p>
          <input
            v-model="vtpassBaseUrl"
            type="url"
            placeholder="Base URL (sandbox or live)"
            class="w-full rounded-xl bg-off-white px-3 py-2.5 text-sm text-on-surface outline-none"
          />
          <input
            v-model="vtpassApiKey"
            type="password"
            placeholder="New API key"
            class="w-full rounded-xl bg-off-white px-3 py-2.5 text-sm text-on-surface outline-none"
          />
          <input
            v-model="vtpassPublicKey"
            type="password"
            placeholder="New public key"
            class="w-full rounded-xl bg-off-white px-3 py-2.5 text-sm text-on-surface outline-none"
          />
          <input
            v-model="vtpassSecretKey"
            type="password"
            placeholder="New secret key"
            class="w-full rounded-xl bg-off-white px-3 py-2.5 text-sm text-on-surface outline-none"
          />
          <div class="flex justify-end pt-1">
            <button
              type="button"
              class="rounded-xl bg-electric-pink px-4 py-2 text-sm font-semibold text-pure-white disabled:opacity-50"
              :disabled="savingSection === 'vtpass'"
              @click="saveSection('vtpass')"
            >
              {{ savingSection === "vtpass" ? "Saving…" : "Save VTpass" }}
            </button>
          </div>
        </div>

        <div class="space-y-3 rounded-2xl bg-surface-container-lowest p-6 shadow-sm">
          <h2 class="font-headline-md text-lg font-bold text-primary">LiveKit WebRTC</h2>
          <p class="text-xs text-outline">Masked key: {{ creds?.livekit_api_key_masked || "—" }}</p>
          <input
            v-model="livekitUrl"
            type="url"
            placeholder="wss://…livekit.cloud"
            class="w-full rounded-xl bg-off-white px-3 py-2.5 text-sm text-on-surface outline-none"
          />
          <input
            v-model="livekitApiKey"
            type="password"
            placeholder="New API key"
            class="w-full rounded-xl bg-off-white px-3 py-2.5 text-sm text-on-surface outline-none"
          />
          <input
            v-model="livekitApiSecret"
            type="password"
            placeholder="New API secret"
            class="w-full rounded-xl bg-off-white px-3 py-2.5 text-sm text-on-surface outline-none"
          />
          <div class="flex justify-end pt-1">
            <button
              type="button"
              class="rounded-xl bg-electric-pink px-4 py-2 text-sm font-semibold text-pure-white disabled:opacity-50"
              :disabled="savingSection === 'livekit'"
              @click="saveSection('livekit')"
            >
              {{ savingSection === "livekit" ? "Saving…" : "Save LiveKit" }}
            </button>
          </div>
        </div>

        <div class="space-y-3 rounded-2xl bg-surface-container-lowest p-6 shadow-sm">
          <h2 class="font-headline-md text-lg font-bold text-primary">IPFS / Pinata</h2>
          <p class="text-xs text-outline">JWT: {{ creds?.pinata_jwt_masked || "—" }}</p>
          <input
            v-model="ipfsGateway"
            type="url"
            placeholder="IPFS gateway (…/ipfs)"
            class="w-full rounded-xl bg-off-white px-3 py-2.5 text-sm text-on-surface outline-none"
          />
          <input
            v-model="pinataJwt"
            type="password"
            placeholder="New Pinata JWT"
            class="w-full rounded-xl bg-off-white px-3 py-2.5 text-sm text-on-surface outline-none"
          />
          <div class="flex justify-end pt-1">
            <button
              type="button"
              class="rounded-xl bg-electric-pink px-4 py-2 text-sm font-semibold text-pure-white disabled:opacity-50"
              :disabled="savingSection === 'ipfs'"
              @click="saveSection('ipfs')"
            >
              {{ savingSection === "ipfs" ? "Saving…" : "Save IPFS" }}
            </button>
          </div>
        </div>

        <div class="space-y-3 rounded-2xl bg-surface-container-lowest p-6 shadow-sm">
          <div class="flex items-center justify-between gap-3">
            <h2 class="font-headline-md text-lg font-bold text-primary">Public-chain anchors</h2>
            <label class="flex items-center gap-2 text-xs text-outline">
              <input v-model="otsEnabled" type="checkbox" class="rounded" />
              OpenTimestamps
            </label>
          </div>
          <input
            v-model="polygonRpc"
            type="url"
            placeholder="Polygon RPC URL"
            class="w-full rounded-xl bg-off-white px-3 py-2.5 text-sm text-on-surface outline-none"
          />
          <input
            v-model="polygonPrivateKey"
            type="password"
            placeholder="New Polygon private key"
            class="w-full rounded-xl bg-off-white px-3 py-2.5 text-sm text-on-surface outline-none"
          />
          <div class="grid grid-cols-2 gap-2">
            <input
              v-model.number="polygonChainId"
              type="number"
              placeholder="Chain ID"
              class="w-full rounded-xl bg-off-white px-3 py-2.5 text-sm text-on-surface outline-none"
            />
            <input
              v-model="polygonContract"
              type="text"
              placeholder="Contract address"
              class="w-full rounded-xl bg-off-white px-3 py-2.5 text-sm text-on-surface outline-none"
            />
          </div>
          <input
            v-model="polygonExplorer"
            type="url"
            placeholder="Explorer base URL"
            class="w-full rounded-xl bg-off-white px-3 py-2.5 text-sm text-on-surface outline-none"
          />
          <div class="flex justify-end pt-1">
            <button
              type="button"
              class="rounded-xl bg-electric-pink px-4 py-2 text-sm font-semibold text-pure-white disabled:opacity-50"
              :disabled="savingSection === 'anchors'"
              @click="saveSection('anchors')"
            >
              {{ savingSection === "anchors" ? "Saving…" : "Save anchors" }}
            </button>
          </div>
        </div>

        <div class="space-y-3 rounded-2xl bg-surface-container-lowest p-6 shadow-sm lg:col-span-2">
          <h2 class="font-headline-md text-lg font-bold text-primary">Google Maps API key</h2>
          <p class="text-xs text-outline">
            Current: {{ creds?.google_maps_api_key_masked || "—" }}. Web and mobile apps fetch this from
            <code class="text-secondary">GET /public/client-config</code>.
          </p>
          <input
            v-model="mapsApiKey"
            type="password"
            placeholder="New Google Maps JavaScript API key"
            class="w-full max-w-xl rounded-xl bg-off-white px-3 py-2.5 text-sm text-on-surface outline-none"
          />
          <div class="flex justify-end pt-1">
            <button
              type="button"
              class="rounded-xl bg-electric-pink px-4 py-2 text-sm font-semibold text-pure-white disabled:opacity-50"
              :disabled="savingSection === 'maps'"
              @click="saveSection('maps')"
            >
              {{ savingSection === "maps" ? "Saving…" : "Save Maps key" }}
            </button>
          </div>
        </div>
      </div>
    </template>
  </div>
</template>
