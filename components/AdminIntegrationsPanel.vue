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
  social_login_enabled: boolean;
  google_oauth_web_client_id: string | null;
  google_oauth_ios_client_id: string | null;
  google_oauth_android_client_id: string | null;
  google_oauth_client_secret_configured: boolean;
  google_oauth_client_secret_masked: string | null;
  google_login_configured: boolean;
  apple_oauth_client_id: string | null;
  apple_oauth_service_id: string | null;
  apple_login_configured: boolean;
  config_source: string;
};

type Section = "vtpass" | "livekit" | "ipfs" | "anchors" | "maps" | "social";

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

// Social sign-in (mobile Google / Apple login + signup)
const socialLoginEnabled = ref(true);
const googleWebClientId = ref("");
const googleIosClientId = ref("");
const googleAndroidClientId = ref("");
const googleClientSecret = ref("");
const appleClientId = ref("");
const appleServiceId = ref("");

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
    socialLoginEnabled.value = creds.value.social_login_enabled ?? true;
    googleWebClientId.value = creds.value.google_oauth_web_client_id ?? "";
    googleIosClientId.value = creds.value.google_oauth_ios_client_id ?? "";
    googleAndroidClientId.value = creds.value.google_oauth_android_client_id ?? "";
    appleClientId.value = creds.value.apple_oauth_client_id ?? "";
    appleServiceId.value = creds.value.apple_oauth_service_id ?? "";
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
  if (section === "social") {
    // Client IDs are public identifiers: send them even when cleared so admins can unset a platform.
    const patch: Record<string, string | boolean> = {
      social_login_enabled: socialLoginEnabled.value,
      google_oauth_web_client_id: googleWebClientId.value.trim(),
      google_oauth_ios_client_id: googleIosClientId.value.trim(),
      google_oauth_android_client_id: googleAndroidClientId.value.trim(),
      apple_oauth_client_id: appleClientId.value.trim(),
      apple_oauth_service_id: appleServiceId.value.trim(),
    };
    if (googleClientSecret.value.trim()) patch.google_oauth_client_secret = googleClientSecret.value.trim();
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
  } else if (section === "social") {
    googleClientSecret.value = "";
  }
}

const sectionLabels: Record<Section, string> = {
  vtpass: "VTpass",
  livekit: "LiveKit",
  ipfs: "IPFS / Pinata",
  anchors: "Public-chain anchors",
  maps: "Google Maps",
  social: "Social sign-in",
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
        <div class="rounded-2xl bg-surface-container-lowest p-4 shadow-sm">
          <p class="font-label-caps text-[10px] uppercase text-outline">Google sign-in</p>
          <p class="mt-1 text-sm font-bold" :class="statusClass(creds?.google_login_configured)">
            {{ statusLabel(creds?.google_login_configured) }}
          </p>
        </div>
        <div class="rounded-2xl bg-surface-container-lowest p-4 shadow-sm">
          <p class="font-label-caps text-[10px] uppercase text-outline">Apple sign-in</p>
          <p class="mt-1 text-sm font-bold" :class="statusClass(creds?.apple_login_configured)">
            {{ statusLabel(creds?.apple_login_configured) }}
          </p>
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

        <div class="space-y-3 rounded-2xl bg-surface-container-lowest p-6 shadow-sm lg:col-span-2">
          <h2 class="font-headline-md text-lg font-bold text-primary">Google &amp; Apple sign-in</h2>
          <p class="text-xs text-outline">
            Controls "Continue with Google / Apple" on mobile login and signup. Client IDs are public
            identifiers published through <code class="text-secondary">GET /public/client-config</code>; tokens are
            verified server-side against these IDs.
          </p>

          <label class="flex items-center gap-2 text-sm text-on-surface">
            <input v-model="socialLoginEnabled" type="checkbox" class="h-4 w-4 accent-electric-pink" />
            Enable social sign-in for all apps
          </label>

          <div class="grid gap-3 md:grid-cols-3">
            <div class="space-y-1">
              <p class="font-label-caps text-[10px] uppercase text-outline">Google web client ID</p>
              <input
                v-model="googleWebClientId"
                type="text"
                placeholder="xxxx.apps.googleusercontent.com"
                class="w-full rounded-xl bg-off-white px-3 py-2.5 text-sm text-on-surface outline-none"
              />
            </div>
            <div class="space-y-1">
              <p class="font-label-caps text-[10px] uppercase text-outline">Google iOS client ID</p>
              <input
                v-model="googleIosClientId"
                type="text"
                placeholder="xxxx.apps.googleusercontent.com"
                class="w-full rounded-xl bg-off-white px-3 py-2.5 text-sm text-on-surface outline-none"
              />
            </div>
            <div class="space-y-1">
              <p class="font-label-caps text-[10px] uppercase text-outline">Google Android client ID</p>
              <input
                v-model="googleAndroidClientId"
                type="text"
                placeholder="xxxx.apps.googleusercontent.com"
                class="w-full rounded-xl bg-off-white px-3 py-2.5 text-sm text-on-surface outline-none"
              />
            </div>
          </div>

          <div class="grid gap-3 md:grid-cols-3">
            <div class="space-y-1">
              <p class="font-label-caps text-[10px] uppercase text-outline">
                Google client secret ({{ creds?.google_oauth_client_secret_masked || "not set" }})
              </p>
              <input
                v-model="googleClientSecret"
                type="password"
                placeholder="Only needed for web code exchange"
                class="w-full rounded-xl bg-off-white px-3 py-2.5 text-sm text-on-surface outline-none"
              />
            </div>
            <div class="space-y-1">
              <p class="font-label-caps text-[10px] uppercase text-outline">Apple bundle ID (native)</p>
              <input
                v-model="appleClientId"
                type="text"
                placeholder="com.emobilize.app"
                class="w-full rounded-xl bg-off-white px-3 py-2.5 text-sm text-on-surface outline-none"
              />
            </div>
            <div class="space-y-1">
              <p class="font-label-caps text-[10px] uppercase text-outline">Apple services ID (web)</p>
              <input
                v-model="appleServiceId"
                type="text"
                placeholder="com.emobilize.web"
                class="w-full rounded-xl bg-off-white px-3 py-2.5 text-sm text-on-surface outline-none"
              />
            </div>
          </div>

          <div class="flex justify-end pt-1">
            <button
              type="button"
              class="rounded-xl bg-electric-pink px-4 py-2 text-sm font-semibold text-pure-white disabled:opacity-50"
              :disabled="savingSection === 'social'"
              @click="saveSection('social')"
            >
              {{ savingSection === "social" ? "Saving…" : "Save sign-in settings" }}
            </button>
          </div>
        </div>
      </div>
    </template>
  </div>
</template>
