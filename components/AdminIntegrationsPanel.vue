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
  sms_preferred_provider: string;
  sendchamp_configured: boolean;
  sendchamp_api_key_masked: string | null;
  sendchamp_sender_id: string | null;
  kudisms_configured: boolean;
  kudisms_username: string | null;
  kudisms_password_configured: boolean;
  kudisms_sender_id: string | null;
  sms_configured: boolean;
  email_preferred_provider: string;
  resend_configured: boolean;
  resend_api_key_masked: string | null;
  resend_from_email: string | null;
  resend_from_name: string | null;
  mailchimp_configured: boolean;
  mailchimp_api_key_masked: string | null;
  mailchimp_from_email: string | null;
  mailchimp_from_name: string | null;
  smtp_configured: boolean;
  smtp_host: string | null;
  smtp_port: number;
  smtp_username: string | null;
  smtp_password_configured: boolean;
  smtp_from_email: string | null;
  smtp_from_name: string | null;
  smtp_use_tls: boolean;
  email_configured: boolean;
  config_source: string;
};

type Section = "vtpass" | "livekit" | "ipfs" | "anchors" | "maps" | "social" | "sms" | "email";

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

// SMS
const smsPreferredProvider = ref("sendchamp");
const sendchampApiKey = ref("");
const sendchampSenderId = ref("");
const kudismsUsername = ref("");
const kudismsPassword = ref("");
const kudismsSenderId = ref("");

// Email
const emailPreferredProvider = ref("resend");
const resendApiKey = ref("");
const resendFromEmail = ref("");
const resendFromName = ref("");
const mailchimpApiKey = ref("");
const mailchimpFromEmail = ref("");
const mailchimpFromName = ref("");
const smtpHost = ref("");
const smtpPort = ref(587);
const smtpUsername = ref("");
const smtpPassword = ref("");
const smtpFromEmail = ref("");
const smtpFromName = ref("");
const smtpUseTls = ref(true);

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
    smsPreferredProvider.value = creds.value.sms_preferred_provider || "sendchamp";
    sendchampSenderId.value = creds.value.sendchamp_sender_id ?? "";
    kudismsUsername.value = creds.value.kudisms_username ?? "";
    kudismsSenderId.value = creds.value.kudisms_sender_id ?? "";
    emailPreferredProvider.value = creds.value.email_preferred_provider || "resend";
    resendFromEmail.value = creds.value.resend_from_email ?? "";
    resendFromName.value = creds.value.resend_from_name ?? "";
    mailchimpFromEmail.value = creds.value.mailchimp_from_email ?? "";
    mailchimpFromName.value = creds.value.mailchimp_from_name ?? "";
    smtpHost.value = creds.value.smtp_host ?? "";
    smtpPort.value = creds.value.smtp_port ?? 587;
    smtpUsername.value = creds.value.smtp_username ?? "";
    smtpFromEmail.value = creds.value.smtp_from_email ?? "";
    smtpFromName.value = creds.value.smtp_from_name ?? "";
    smtpUseTls.value = creds.value.smtp_use_tls ?? true;
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
  if (section === "sms") {
    const patch: Record<string, string> = {
      sms_preferred_provider: smsPreferredProvider.value.trim() || "sendchamp",
      sendchamp_sender_id: sendchampSenderId.value.trim(),
      kudisms_username: kudismsUsername.value.trim(),
      kudisms_sender_id: kudismsSenderId.value.trim(),
    };
    if (sendchampApiKey.value.trim()) patch.sendchamp_api_key = sendchampApiKey.value.trim();
    if (kudismsPassword.value.trim()) patch.kudisms_password = kudismsPassword.value.trim();
    return patch;
  }
  if (section === "email") {
    const patch: Record<string, string | boolean | number> = {
      email_preferred_provider: emailPreferredProvider.value.trim() || "resend",
      resend_from_email: resendFromEmail.value.trim(),
      resend_from_name: resendFromName.value.trim(),
      mailchimp_from_email: mailchimpFromEmail.value.trim(),
      mailchimp_from_name: mailchimpFromName.value.trim(),
      smtp_host: smtpHost.value.trim(),
      smtp_port: Number(smtpPort.value) || 587,
      smtp_username: smtpUsername.value.trim(),
      smtp_from_email: smtpFromEmail.value.trim(),
      smtp_from_name: smtpFromName.value.trim(),
      smtp_use_tls: smtpUseTls.value,
    };
    if (resendApiKey.value.trim()) patch.resend_api_key = resendApiKey.value.trim();
    if (mailchimpApiKey.value.trim()) patch.mailchimp_api_key = mailchimpApiKey.value.trim();
    if (smtpPassword.value.trim()) patch.smtp_password = smtpPassword.value.trim();
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
  } else if (section === "sms") {
    sendchampApiKey.value = "";
    kudismsPassword.value = "";
  } else if (section === "email") {
    resendApiKey.value = "";
    mailchimpApiKey.value = "";
    smtpPassword.value = "";
  }
}

const sectionLabels: Record<Section, string> = {
  vtpass: "VTpass",
  livekit: "LiveKit",
  ipfs: "IPFS / Pinata",
  anchors: "Public-chain anchors",
  maps: "Google Maps",
  social: "Social sign-in",
  sms: "SMS gateways",
  email: "Email providers",
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

function statusLabel(ok: boolean | undefined) {
  return ok ? "CONFIGURED" : "NOT SET";
}

const activeTab = ref<Section>("sms");

const tabs = computed(() => {
  const c = creds.value;
  return [
    { id: "sms" as const, label: "SMS", configured: c?.sms_configured },
    { id: "email" as const, label: "Email", configured: c?.email_configured },
    { id: "vtpass" as const, label: "VTpass", configured: c?.vtpass_configured },
    { id: "livekit" as const, label: "LiveKit", configured: c?.livekit_configured },
    { id: "ipfs" as const, label: "IPFS", configured: c?.pinata_configured },
    { id: "anchors" as const, label: "Anchors", configured: c?.polygon_configured },
    { id: "maps" as const, label: "Maps", configured: c?.google_maps_configured },
    {
      id: "social" as const,
      label: "Sign-in",
      configured: Boolean(c?.google_login_configured || c?.apple_login_configured),
    },
  ];
});
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
      <div class="flex flex-wrap gap-2 border-b border-outline-variant/20 pb-3">
        <button
          v-for="tab in tabs"
          :key="tab.id"
          type="button"
          class="inline-flex items-center gap-2 rounded-full px-3.5 py-1.5 text-xs font-semibold transition"
          :class="
            activeTab === tab.id
              ? 'bg-electric-pink text-pure-white'
              : 'bg-surface-container-high text-on-surface-variant hover:bg-surface-container'
          "
          @click="activeTab = tab.id"
        >
          {{ tab.label }}
          <span
            class="h-1.5 w-1.5 rounded-full"
            :class="tab.configured ? (activeTab === tab.id ? 'bg-pure-white' : 'bg-action-green') : 'bg-outline/50'"
            :title="statusLabel(tab.configured)"
          />
        </button>
      </div>

      <div class="rounded-2xl bg-surface-container-lowest p-6 shadow-sm">
        <!-- SMS -->
        <div v-show="activeTab === 'sms'" class="space-y-3">
          <div class="flex flex-wrap items-end justify-between gap-2">
            <div>
              <h2 class="font-headline-md text-lg font-bold text-primary">SMS gateways</h2>
              <p class="mt-1 text-xs text-outline">
                Sendchamp {{ statusLabel(creds?.sendchamp_configured) }} · KudiSMS
                {{ statusLabel(creds?.kudisms_configured) }}
              </p>
            </div>
            <p class="text-[11px] text-outline">Preferred: {{ creds?.sms_preferred_provider || "—" }}</p>
          </div>
          <div class="space-y-1">
            <p class="font-label-caps text-[10px] uppercase text-outline">Preferred provider</p>
            <select
              v-model="smsPreferredProvider"
              class="w-full max-w-md rounded-xl bg-off-white px-3 py-2.5 text-sm text-on-surface outline-none"
            >
              <option value="sendchamp">Sendchamp</option>
              <option value="kudisms">KudiSMS</option>
            </select>
          </div>
          <div class="grid gap-3 md:grid-cols-2">
            <div class="space-y-1">
              <p class="font-label-caps text-[10px] uppercase text-outline">
                Sendchamp API key ({{ creds?.sendchamp_api_key_masked || "not set" }})
              </p>
              <input
                v-model="sendchampApiKey"
                type="password"
                placeholder="Leave blank to keep existing"
                class="w-full rounded-xl bg-off-white px-3 py-2.5 text-sm text-on-surface outline-none"
              />
            </div>
            <div class="space-y-1">
              <p class="font-label-caps text-[10px] uppercase text-outline">Sendchamp sender ID</p>
              <input
                v-model="sendchampSenderId"
                type="text"
                placeholder="e.g. LADO"
                class="w-full rounded-xl bg-off-white px-3 py-2.5 text-sm text-on-surface outline-none"
              />
            </div>
          </div>
          <div class="grid gap-3 md:grid-cols-3">
            <div class="space-y-1">
              <p class="font-label-caps text-[10px] uppercase text-outline">KudiSMS username</p>
              <input
                v-model="kudismsUsername"
                type="text"
                class="w-full rounded-xl bg-off-white px-3 py-2.5 text-sm text-on-surface outline-none"
              />
            </div>
            <div class="space-y-1">
              <p class="font-label-caps text-[10px] uppercase text-outline">
                KudiSMS password ({{ creds?.kudisms_password_configured ? "set" : "not set" }})
              </p>
              <input
                v-model="kudismsPassword"
                type="password"
                placeholder="Leave blank to keep existing"
                class="w-full rounded-xl bg-off-white px-3 py-2.5 text-sm text-on-surface outline-none"
              />
            </div>
            <div class="space-y-1">
              <p class="font-label-caps text-[10px] uppercase text-outline">KudiSMS sender ID</p>
              <input
                v-model="kudismsSenderId"
                type="text"
                placeholder="e.g. LADO"
                class="w-full rounded-xl bg-off-white px-3 py-2.5 text-sm text-on-surface outline-none"
              />
            </div>
          </div>
          <div class="flex justify-end pt-1">
            <button
              type="button"
              class="rounded-xl bg-electric-pink px-4 py-2 text-sm font-semibold text-pure-white disabled:opacity-50"
              :disabled="savingSection === 'sms'"
              @click="saveSection('sms')"
            >
              {{ savingSection === "sms" ? "Saving…" : "Save SMS settings" }}
            </button>
          </div>
        </div>

        <!-- Email -->
        <div v-show="activeTab === 'email'" class="space-y-3">
          <div class="flex flex-wrap items-end justify-between gap-2">
            <div>
              <h2 class="font-headline-md text-lg font-bold text-primary">Email providers</h2>
              <p class="mt-1 text-xs text-outline">
                Resend {{ statusLabel(creds?.resend_configured) }} · Mailchimp
                {{ statusLabel(creds?.mailchimp_configured) }} · SMTP
                {{ statusLabel(creds?.smtp_configured) }}
              </p>
            </div>
            <p class="text-[11px] text-outline">Preferred: {{ creds?.email_preferred_provider || "—" }}</p>
          </div>
          <div class="space-y-1">
            <p class="font-label-caps text-[10px] uppercase text-outline">Preferred provider</p>
            <select
              v-model="emailPreferredProvider"
              class="w-full max-w-md rounded-xl bg-off-white px-3 py-2.5 text-sm text-on-surface outline-none"
            >
              <option value="resend">Resend</option>
              <option value="mailchimp">Mailchimp Transactional</option>
              <option value="smtp">SMTP</option>
            </select>
          </div>
          <div class="grid gap-3 md:grid-cols-3">
            <div class="space-y-1">
              <p class="font-label-caps text-[10px] uppercase text-outline">
                Resend API key ({{ creds?.resend_api_key_masked || "not set" }})
              </p>
              <input
                v-model="resendApiKey"
                type="password"
                placeholder="Leave blank to keep existing"
                class="w-full rounded-xl bg-off-white px-3 py-2.5 text-sm text-on-surface outline-none"
              />
            </div>
            <div class="space-y-1">
              <p class="font-label-caps text-[10px] uppercase text-outline">Resend from email</p>
              <input
                v-model="resendFromEmail"
                type="email"
                placeholder="noreply@yourdomain.com"
                class="w-full rounded-xl bg-off-white px-3 py-2.5 text-sm text-on-surface outline-none"
              />
            </div>
            <div class="space-y-1">
              <p class="font-label-caps text-[10px] uppercase text-outline">Resend from name</p>
              <input
                v-model="resendFromName"
                type="text"
                placeholder="Lado"
                class="w-full rounded-xl bg-off-white px-3 py-2.5 text-sm text-on-surface outline-none"
              />
            </div>
          </div>
          <div class="grid gap-3 md:grid-cols-3">
            <div class="space-y-1">
              <p class="font-label-caps text-[10px] uppercase text-outline">
                Mailchimp / Mandrill key ({{ creds?.mailchimp_api_key_masked || "not set" }})
              </p>
              <input
                v-model="mailchimpApiKey"
                type="password"
                placeholder="Transactional API key"
                class="w-full rounded-xl bg-off-white px-3 py-2.5 text-sm text-on-surface outline-none"
              />
            </div>
            <div class="space-y-1">
              <p class="font-label-caps text-[10px] uppercase text-outline">Mailchimp from email</p>
              <input
                v-model="mailchimpFromEmail"
                type="email"
                class="w-full rounded-xl bg-off-white px-3 py-2.5 text-sm text-on-surface outline-none"
              />
            </div>
            <div class="space-y-1">
              <p class="font-label-caps text-[10px] uppercase text-outline">Mailchimp from name</p>
              <input
                v-model="mailchimpFromName"
                type="text"
                class="w-full rounded-xl bg-off-white px-3 py-2.5 text-sm text-on-surface outline-none"
              />
            </div>
          </div>
          <div class="grid gap-3 md:grid-cols-2">
            <div class="space-y-1">
              <p class="font-label-caps text-[10px] uppercase text-outline">SMTP host</p>
              <input
                v-model="smtpHost"
                type="text"
                placeholder="smtp.example.com"
                class="w-full rounded-xl bg-off-white px-3 py-2.5 text-sm text-on-surface outline-none"
              />
            </div>
            <div class="space-y-1">
              <p class="font-label-caps text-[10px] uppercase text-outline">SMTP port</p>
              <input
                v-model.number="smtpPort"
                type="number"
                class="w-full rounded-xl bg-off-white px-3 py-2.5 text-sm text-on-surface outline-none"
              />
            </div>
            <div class="space-y-1">
              <p class="font-label-caps text-[10px] uppercase text-outline">SMTP username</p>
              <input
                v-model="smtpUsername"
                type="text"
                class="w-full rounded-xl bg-off-white px-3 py-2.5 text-sm text-on-surface outline-none"
              />
            </div>
            <div class="space-y-1">
              <p class="font-label-caps text-[10px] uppercase text-outline">
                SMTP password ({{ creds?.smtp_password_configured ? "set" : "not set" }})
              </p>
              <input
                v-model="smtpPassword"
                type="password"
                placeholder="Leave blank to keep existing"
                class="w-full rounded-xl bg-off-white px-3 py-2.5 text-sm text-on-surface outline-none"
              />
            </div>
            <div class="space-y-1">
              <p class="font-label-caps text-[10px] uppercase text-outline">SMTP from email</p>
              <input
                v-model="smtpFromEmail"
                type="email"
                class="w-full rounded-xl bg-off-white px-3 py-2.5 text-sm text-on-surface outline-none"
              />
            </div>
            <div class="space-y-1">
              <p class="font-label-caps text-[10px] uppercase text-outline">SMTP from name</p>
              <input
                v-model="smtpFromName"
                type="text"
                class="w-full rounded-xl bg-off-white px-3 py-2.5 text-sm text-on-surface outline-none"
              />
            </div>
          </div>
          <label class="flex items-center gap-2 text-sm text-on-surface">
            <input v-model="smtpUseTls" type="checkbox" class="rounded border-outline" />
            Use STARTTLS (recommended for port 587)
          </label>
          <div class="flex justify-end pt-1">
            <button
              type="button"
              class="rounded-xl bg-electric-pink px-4 py-2 text-sm font-semibold text-pure-white disabled:opacity-50"
              :disabled="savingSection === 'email'"
              @click="saveSection('email')"
            >
              {{ savingSection === "email" ? "Saving…" : "Save email settings" }}
            </button>
          </div>
        </div>

        <!-- VTpass -->
        <div v-show="activeTab === 'vtpass'" class="space-y-3">
          <h2 class="font-headline-md text-lg font-bold text-primary">VTpass</h2>
          <p class="text-xs text-outline">
            Masked: {{ creds?.vtpass_api_key_masked || "—" }} /
            {{ creds?.vtpass_public_key_masked || "—" }}
          </p>
          <input
            v-model="vtpassBaseUrl"
            type="url"
            placeholder="Base URL (sandbox or live)"
            class="w-full max-w-xl rounded-xl bg-off-white px-3 py-2.5 text-sm text-on-surface outline-none"
          />
          <input
            v-model="vtpassApiKey"
            type="password"
            placeholder="New API key"
            class="w-full max-w-xl rounded-xl bg-off-white px-3 py-2.5 text-sm text-on-surface outline-none"
          />
          <input
            v-model="vtpassPublicKey"
            type="password"
            placeholder="New public key"
            class="w-full max-w-xl rounded-xl bg-off-white px-3 py-2.5 text-sm text-on-surface outline-none"
          />
          <input
            v-model="vtpassSecretKey"
            type="password"
            placeholder="New secret key"
            class="w-full max-w-xl rounded-xl bg-off-white px-3 py-2.5 text-sm text-on-surface outline-none"
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

        <!-- LiveKit -->
        <div v-show="activeTab === 'livekit'" class="space-y-3">
          <h2 class="font-headline-md text-lg font-bold text-primary">LiveKit WebRTC</h2>
          <p class="text-xs text-outline">Masked key: {{ creds?.livekit_api_key_masked || "—" }}</p>
          <input
            v-model="livekitUrl"
            type="url"
            placeholder="wss://…livekit.cloud"
            class="w-full max-w-xl rounded-xl bg-off-white px-3 py-2.5 text-sm text-on-surface outline-none"
          />
          <input
            v-model="livekitApiKey"
            type="password"
            placeholder="New API key"
            class="w-full max-w-xl rounded-xl bg-off-white px-3 py-2.5 text-sm text-on-surface outline-none"
          />
          <input
            v-model="livekitApiSecret"
            type="password"
            placeholder="New API secret"
            class="w-full max-w-xl rounded-xl bg-off-white px-3 py-2.5 text-sm text-on-surface outline-none"
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

        <!-- IPFS -->
        <div v-show="activeTab === 'ipfs'" class="space-y-3">
          <h2 class="font-headline-md text-lg font-bold text-primary">IPFS / Pinata</h2>
          <p class="text-xs text-outline">JWT: {{ creds?.pinata_jwt_masked || "—" }}</p>
          <input
            v-model="ipfsGateway"
            type="url"
            placeholder="IPFS gateway (…/ipfs)"
            class="w-full max-w-xl rounded-xl bg-off-white px-3 py-2.5 text-sm text-on-surface outline-none"
          />
          <input
            v-model="pinataJwt"
            type="password"
            placeholder="New Pinata JWT"
            class="w-full max-w-xl rounded-xl bg-off-white px-3 py-2.5 text-sm text-on-surface outline-none"
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

        <!-- Anchors -->
        <div v-show="activeTab === 'anchors'" class="space-y-3">
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
            class="w-full max-w-xl rounded-xl bg-off-white px-3 py-2.5 text-sm text-on-surface outline-none"
          />
          <input
            v-model="polygonPrivateKey"
            type="password"
            placeholder="New Polygon private key"
            class="w-full max-w-xl rounded-xl bg-off-white px-3 py-2.5 text-sm text-on-surface outline-none"
          />
          <div class="grid max-w-xl grid-cols-2 gap-2">
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
            class="w-full max-w-xl rounded-xl bg-off-white px-3 py-2.5 text-sm text-on-surface outline-none"
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

        <!-- Maps -->
        <div v-show="activeTab === 'maps'" class="space-y-3">
          <h2 class="font-headline-md text-lg font-bold text-primary">Google Maps API key</h2>
          <p class="text-xs text-outline">
            Current: {{ creds?.google_maps_api_key_masked || "—" }}. Source:
            {{ creds?.config_source || "—" }}. Apps fetch this from
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

        <!-- Social -->
        <div v-show="activeTab === 'social'" class="space-y-3">
          <h2 class="font-headline-md text-lg font-bold text-primary">Google &amp; Apple sign-in</h2>
          <p class="text-xs text-outline">
            Controls "Continue with Google / Apple" on mobile login and signup. Client IDs are public
            identifiers published through <code class="text-secondary">GET /public/client-config</code>.
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
