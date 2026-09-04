<template>
  <div
    class="flex min-h-screen flex-col justify-between bg-surface font-body-md text-on-surface selection:bg-electric-pink selection:text-pure-white"
  >
    <header class="fixed top-0 z-50 w-full bg-surface/90 shadow-[0_1px_8px_rgba(0,0,0,0.04)] backdrop-blur-xl">
      <div class="mx-auto flex h-16 max-w-container-max items-center justify-between gap-4 px-margin-mobile lg:px-gutter">
        <div class="flex min-w-0 items-center gap-4">
          <NuxtLink to="/" class="flex min-w-0 items-center gap-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary">
            <BrandMark size="sm" />
            <span class="hidden rounded-full bg-deep-navy px-1.5 py-0.5 font-label-caps text-label-caps text-pure-white sm:inline">
              CIVIC OS
            </span>
          </NuxtLink>
          <div class="hidden items-center gap-2 rounded-full bg-surface-container px-3 py-1 lg:flex">
            <span class="h-2 w-2 animate-pulse rounded-full bg-action-green" />
            <span class="font-label-caps text-label-caps font-medium text-on-surface-variant">
              System 99.99% Operational
            </span>
          </div>
        </div>
        <nav class="hidden items-center gap-6 md:flex" aria-label="Portal">
          <span class="font-button-text text-button-text font-bold text-on-surface">Security Portal</span>
          <NuxtLink
            to="/live-monitoring"
            class="font-button-text text-button-text text-on-surface-variant transition-colors hover:text-on-surface"
          >
            System Status
          </NuxtLink>
          <a
            href="mailto:support@e-mobilize.app"
            class="font-button-text text-button-text text-on-surface-variant transition-colors hover:text-on-surface"
          >
            Support Desk
          </a>
        </nav>
        <div class="flex items-center gap-3">
          <div class="hidden items-center gap-2 rounded-full bg-surface-container-low px-2.5 py-1 sm:flex">
            <span class="material-symbols-outlined text-[16px] text-on-surface-variant">lock</span>
            <span class="font-label-caps text-label-caps text-on-surface-variant">256-bit TLS</span>
          </div>
          <div class="flex h-8 w-8 items-center justify-center rounded-full bg-primary">
            <span class="material-symbols-outlined text-[18px] text-on-primary">person</span>
          </div>
        </div>
      </div>
    </header>

    <main class="flex flex-1 flex-col bg-surface pt-16">
      <div class="relative w-full overflow-hidden bg-surface py-8 lg:py-12">
        <div class="pointer-events-none absolute -top-40 right-1/4 h-96 w-96 rounded-full bg-primary-fixed/30 blur-3xl" />
        <div class="pointer-events-none absolute left-10 top-1/2 h-72 w-72 rounded-full bg-secondary-fixed/20 blur-3xl" />

        <div class="relative z-10 mx-auto max-w-container-max px-margin-mobile lg:px-gutter">
          <div class="mb-6 flex flex-wrap items-center justify-between gap-4">
            <div class="flex items-center gap-2.5">
              <span class="inline-flex h-2 w-2 animate-ping rounded-full bg-action-green" />
              <span class="font-label-caps text-label-caps uppercase tracking-wider text-on-surface-variant">
                Gateway :: Ogun Command • High-Security Admin Tier
              </span>
            </div>
            <div class="flex items-center gap-3">
              <span class="font-label-caps text-label-caps text-on-surface-variant">NODE ID:</span>
              <code
                class="rounded bg-surface-container px-2 py-0.5 font-label-caps text-label-caps font-semibold text-deep-navy"
              >
                EM-SEC-7702-HSM
              </code>
            </div>
          </div>

          <div class="grid grid-cols-1 items-stretch gap-6 lg:grid-cols-12 xl:gap-8">
            <!-- Auth panel -->
            <div
              class="flex flex-col justify-between rounded-2xl bg-pure-white p-6 shadow-xl shadow-deep-navy/5 sm:p-10 lg:col-span-7"
            >
              <div>
                <div class="mb-8 flex items-center justify-between rounded-xl bg-surface-container-low p-3">
                  <div class="flex min-w-0 items-center gap-3">
                    <div
                      class="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-deep-navy text-pure-white"
                    >
                      <span class="material-symbols-outlined text-[20px]">account_balance</span>
                    </div>
                    <div class="min-w-0">
                      <p class="font-label-caps text-label-caps uppercase text-on-surface-variant">Command Domain</p>
                      <p class="truncate font-button-text text-button-text text-deep-navy">
                        Ogun State / National Command
                      </p>
                    </div>
                  </div>
                  <NuxtLink
                    to="/agent/login"
                    class="flex flex-shrink-0 items-center gap-1 rounded bg-surface px-2.5 py-1 font-label-caps text-label-caps text-secondary transition-colors hover:bg-surface-container-high hover:text-secondary-container"
                  >
                    <span>Agent portal</span>
                    <span class="material-symbols-outlined text-[14px]">swap_horiz</span>
                  </NuxtLink>
                </div>

                <div class="mb-8">
                  <div
                    class="mb-3 inline-flex items-center gap-2 rounded-full bg-surface-container px-2.5 py-1 text-deep-navy"
                  >
                    <span class="material-symbols-outlined text-[16px] text-electric-pink">fingerprint</span>
                    <span class="font-label-caps text-label-caps font-semibold">Zero-Trust Civic Terminal</span>
                  </div>
                  <h1 class="font-headline-lg text-headline-lg tracking-tight text-deep-navy">
                    Sign In to e-mobilize
                  </h1>
                  <p class="mt-2 font-body-md text-body-md text-on-surface-variant">
                    Access your federated campaign workspace, field canvasser telemetry, and precision voter engagement
                    engines.
                  </p>
                </div>

                <div class="mb-6 flex rounded-xl bg-surface-container p-1">
                  <button
                    type="button"
                    class="flex flex-1 items-center justify-center gap-2 rounded-lg py-2.5 font-button-text text-button-text transition-all"
                    :class="
                      authTab === 'credentials'
                        ? 'bg-pure-white text-deep-navy shadow-sm'
                        : 'text-on-surface-variant hover:text-deep-navy'
                    "
                    @click="authTab = 'credentials'"
                  >
                    <span class="material-symbols-outlined text-[18px]">badge</span>
                    <span class="hidden sm:inline">Work Email &amp; Passkey</span>
                    <span class="sm:hidden">Email</span>
                  </button>
                  <button
                    type="button"
                    class="flex flex-1 items-center justify-center gap-2 rounded-lg py-2.5 font-button-text text-button-text transition-all"
                    :class="
                      authTab === 'sso'
                        ? 'bg-pure-white text-deep-navy shadow-sm'
                        : 'text-on-surface-variant hover:text-deep-navy'
                    "
                    @click="authTab = 'sso'"
                  >
                    <span class="material-symbols-outlined text-[18px]">vpn_key</span>
                    <span class="hidden sm:inline">Enterprise SSO / SAML</span>
                    <span class="sm:hidden">SSO</span>
                  </button>
                </div>

                <form v-if="authTab === 'credentials'" class="space-y-5" @submit.prevent="onSubmit">
                  <div>
                    <label
                      class="mb-1.5 block font-label-caps text-label-caps font-semibold uppercase text-deep-navy"
                      for="admin-email"
                    >
                      Federated Work Email
                    </label>
                    <div class="relative flex items-center">
                      <span class="material-symbols-outlined absolute left-3.5 text-[20px] text-on-surface-variant">
                        alternate_email
                      </span>
                      <input
                        id="admin-email"
                        v-model="email"
                        type="email"
                        required
                        autocomplete="username"
                        placeholder="director@national-campaign.org"
                        class="w-full rounded-xl bg-off-white py-3 pl-11 pr-11 font-body-md text-body-md text-deep-navy transition-all placeholder:text-outline focus:bg-pure-white focus:outline-none focus:shadow-md"
                      />
                      <span
                        class="material-symbols-outlined absolute right-3.5 text-[18px] text-action-green"
                        title="Domain verified"
                      >
                        verified
                      </span>
                    </div>
                  </div>

                  <div>
                    <div class="mb-1.5 flex items-center justify-between">
                      <label
                        class="font-label-caps text-label-caps font-semibold uppercase text-deep-navy"
                        for="admin-password"
                      >
                        Security Passkey / Credential
                      </label>
                      <span class="font-label-caps text-label-caps text-secondary">Admin HQ access</span>
                    </div>
                    <div class="relative flex items-center">
                      <span class="material-symbols-outlined absolute left-3.5 text-[20px] text-on-surface-variant">
                        key
                      </span>
                      <input
                        id="admin-password"
                        v-model="password"
                        :type="showPassword ? 'text' : 'password'"
                        required
                        autocomplete="current-password"
                        placeholder="••••••••••••"
                        class="w-full rounded-xl bg-off-white py-3 pl-11 pr-24 font-body-md text-body-md text-deep-navy transition-all placeholder:text-outline focus:bg-pure-white focus:outline-none focus:shadow-md"
                      />
                      <button
                        type="button"
                        class="absolute right-2 flex items-center gap-1 rounded bg-surface-container px-2 py-1 font-label-caps text-label-caps text-deep-navy transition-colors hover:bg-surface-container-high"
                        @click="showPassword = !showPassword"
                      >
                        <span class="material-symbols-outlined text-[16px]">
                          {{ showPassword ? "visibility_off" : "visibility" }}
                        </span>
                        <span>{{ showPassword ? "Hide" : "Show" }}</span>
                      </button>
                    </div>
                  </div>

                  <div class="flex flex-col justify-between gap-3 pt-1 sm:flex-row sm:items-center">
                    <label class="flex cursor-pointer select-none items-center gap-2">
                      <input
                        v-model="remember"
                        type="checkbox"
                        class="h-4 w-4 rounded bg-surface-container accent-electric-pink text-deep-navy focus:ring-0"
                      />
                      <span class="font-body-md text-body-md text-on-surface-variant">
                        Remember hardware posture for 14 days
                      </span>
                    </label>
                    <div
                      class="flex items-center gap-1.5 self-start rounded-full bg-surface-container px-2 py-0.5 font-label-caps text-label-caps text-on-surface-variant sm:self-auto"
                    >
                      <span class="material-symbols-outlined text-[14px] text-action-green">memory</span>
                      <span>Enclave Enforced</span>
                    </div>
                  </div>

                  <p v-if="error" class="rounded-xl bg-error-container/50 px-3 py-2 text-sm text-error">{{ error }}</p>

                  <div class="pt-2">
                    <button
                      type="submit"
                      class="flex w-full cursor-pointer items-center justify-center gap-3 rounded-xl bg-electric-pink px-6 py-4 font-button-text text-button-text text-pure-white shadow-lg shadow-electric-pink/25 transition-all hover:bg-secondary-container hover:shadow-xl hover:shadow-electric-pink/30 active:scale-[0.99] disabled:opacity-60"
                      :disabled="loading"
                    >
                      <span class="material-symbols-outlined text-[20px]">lock_open</span>
                      <span>{{ loading ? "Authenticating…" : "Authenticate & Enter Civic Terminal" }}</span>
                      <span class="material-symbols-outlined text-[18px]">arrow_forward</span>
                    </button>
                  </div>
                </form>

                <div v-else class="space-y-5 rounded-xl bg-surface-container-low p-6 text-center">
                  <span class="material-symbols-outlined text-[36px] text-electric-pink">vpn_key</span>
                  <h2 class="font-headline-md text-xl font-bold text-deep-navy">Enterprise SSO</h2>
                  <p class="font-body-md text-sm text-on-surface-variant">
                    SAML / OIDC federation for Okta, Google Workspace, and Azure Entra ID is provisioning for chapter
                    tenants. Use work email credentials for now.
                  </p>
                  <button
                    type="button"
                    class="inline-flex h-11 items-center justify-center rounded-xl bg-deep-navy px-5 font-button-text text-sm font-semibold text-pure-white"
                    @click="authTab = 'credentials'"
                  >
                    Back to email sign-in
                  </button>
                </div>

                <div class="relative my-8 text-center">
                  <div class="absolute inset-0 flex items-center">
                    <div class="h-px w-full bg-surface-container-high" />
                  </div>
                  <span
                    class="relative bg-pure-white px-4 font-label-caps text-label-caps text-on-surface-variant"
                  >
                    OR AUTHORIZE VIA FEDERATED IDP
                  </span>
                </div>

                <div class="grid grid-cols-3 gap-3">
                  <button
                    v-for="idp in idps"
                    :key="idp.name"
                    type="button"
                    class="flex flex-col items-center justify-center rounded-xl bg-surface-container-low p-3 transition-all hover:bg-surface-container"
                    @click="authTab = 'sso'"
                  >
                    <span class="font-headline-md text-body-lg font-bold text-deep-navy">{{ idp.name }}</span>
                    <span class="font-label-caps text-label-caps text-on-surface-variant">{{ idp.sub }}</span>
                  </button>
                </div>
              </div>

              <div
                class="mt-8 flex flex-col items-center justify-between gap-4 border-t border-surface-container pt-6 sm:flex-row"
              >
                <p class="font-body-md text-body-md text-on-surface-variant">
                  Need authorized credential?
                  <NuxtLink to="/agent/login" class="font-semibold text-secondary hover:underline">
                    Register as field agent
                  </NuxtLink>
                </p>
                <div class="flex items-center gap-2 font-label-caps text-label-caps text-on-surface-variant">
                  <span class="material-symbols-outlined text-[16px] text-action-green">encrypted</span>
                  <span>256-bit HSM Encrypted</span>
                </div>
              </div>
            </div>

            <!-- Telemetry column -->
            <div class="flex flex-col justify-between gap-6 lg:col-span-5">
              <div
                class="relative flex flex-col justify-between overflow-hidden rounded-2xl bg-deep-navy p-6 text-pure-white shadow-xl sm:p-8"
              >
                <div
                  class="pointer-events-none absolute -bottom-10 -right-10 h-48 w-48 rounded-full bg-electric-pink/15 blur-2xl"
                />
                <div>
                  <div class="mb-4 flex items-center justify-between">
                    <div class="flex items-center gap-2">
                      <span class="h-2.5 w-2.5 animate-pulse rounded-full bg-action-green" />
                      <span class="font-label-caps text-label-caps font-bold uppercase tracking-wide text-action-green">
                        Live Mobilization Pulse
                      </span>
                    </div>
                    <span
                      class="rounded bg-surface-container/20 px-2 py-0.5 font-label-caps text-label-caps text-inverse-on-surface"
                    >
                      v4.18.2
                    </span>
                  </div>
                  <h2 class="font-headline-md text-headline-md font-bold leading-tight text-pure-white">
                    Ogun nodes synchronized
                  </h2>
                  <p class="mt-2 font-body-md text-body-md text-inverse-on-surface/80">
                    Real-time turnout prediction, field crew dispatches, and precinct telemetry operate continuously with
                    cryptographic verifiability.
                  </p>

                  <div class="my-6 rounded-xl bg-surface-container/10 p-4 backdrop-blur-md">
                    <div class="mb-2 flex items-center justify-between">
                      <span class="font-label-caps text-label-caps text-inverse-on-surface/70">
                        INGESTION VELOCITY (VOTERS/SEC)
                      </span>
                      <span class="font-label-caps text-label-caps font-bold text-action-green">+18.4% PEAK</span>
                    </div>
                    <svg class="h-16 w-full overflow-visible" fill="none" viewBox="0 0 320 60" preserveAspectRatio="none">
                      <defs>
                        <linearGradient id="pulseGrad" x1="0%" x2="100%" y1="0%" y2="0%">
                          <stop offset="0%" stop-color="#38bdf8" />
                          <stop offset="65%" stop-color="#92D80A" />
                          <stop offset="100%" stop-color="#FF387F" />
                        </linearGradient>
                      </defs>
                      <path
                        d="M0,45 Q20,38 40,42 T80,30 T120,48 T160,20 T200,35 T240,12 T280,28 T320,10"
                        fill="none"
                        stroke="url(#pulseGrad)"
                        stroke-linecap="round"
                        stroke-width="3"
                      />
                      <circle class="animate-ping" cx="240" cy="12" fill="#FF387F" r="4" />
                      <circle cx="240" cy="12" fill="#FF387F" r="4" />
                      <circle cx="320" cy="10" fill="#92D80A" r="4" />
                    </svg>
                    <div
                      class="mt-3 flex items-center justify-between font-label-caps text-label-caps text-inverse-on-surface/70"
                    >
                      <span>04:00 UTC</span>
                      <span>08:00 UTC</span>
                      <span>12:00 UTC</span>
                      <span class="font-semibold text-pure-white">NOW</span>
                    </div>
                  </div>

                  <div class="grid grid-cols-2 gap-3">
                    <div class="rounded-xl bg-surface-container/10 p-3.5">
                      <div class="font-headline-md text-headline-md font-bold text-pure-white">99.99%</div>
                      <div class="mt-0.5 font-label-caps text-label-caps uppercase text-inverse-on-surface/70">
                        Uptime SLA
                      </div>
                    </div>
                    <div class="rounded-xl bg-surface-container/10 p-3.5">
                      <div class="font-headline-md text-headline-md font-bold text-action-green">14.2M</div>
                      <div class="mt-0.5 font-label-caps text-label-caps uppercase text-inverse-on-surface/70">
                        Audited Records
                      </div>
                    </div>
                  </div>
                </div>

                <div class="mt-6 flex flex-wrap gap-2 border-t border-surface-container/20 pt-5">
                  <span
                    v-for="chip in complianceChips"
                    :key="chip"
                    class="flex items-center gap-1.5 rounded-full bg-surface-container/20 px-2.5 py-1 font-label-caps text-label-caps text-inverse-on-surface"
                  >
                    <span class="material-symbols-outlined text-[14px] text-action-green">check_circle</span>
                    {{ chip }}
                  </span>
                </div>
              </div>

              <div class="flex flex-col justify-between gap-4 rounded-2xl bg-pure-white p-6 shadow-md">
                <div class="flex items-center gap-3">
                  <div
                    class="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-deep-navy text-pure-white"
                  >
                    <span class="material-symbols-outlined text-[22px]">campaign</span>
                  </div>
                  <div class="min-w-0">
                    <h3 class="truncate font-button-text text-button-text font-bold text-deep-navy">Field Operations</h3>
                    <p class="font-label-caps text-label-caps text-on-surface-variant">
                      Ogun State Chapter · e-mobilize HQ
                    </p>
                  </div>
                </div>
                <p class="font-body-md text-body-md italic text-on-surface">
                  “Within 24 hours of cutover, our partition synchronized legacy voter databases and mobilized verified
                  canvassers across target LGAs without a single data collision.”
                </p>
                <div class="flex items-start gap-2.5 rounded-xl bg-surface-container p-3">
                  <span class="material-symbols-outlined mt-0.5 flex-shrink-0 text-[18px] text-deep-navy">policy</span>
                  <p class="font-label-caps text-label-caps leading-relaxed text-on-surface-variant">
                    <span class="font-bold text-deep-navy">Statutory Notice:</span>
                    Access is restricted to certified campaign coordinators. Terminal interactions and telemetry lookups
                    are immutably logged for audit verification.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>

    <footer class="w-full bg-surface-container-low shadow-[0_-1px_8px_rgba(0,0,0,0.02)]">
      <div class="mx-auto max-w-container-max px-margin-mobile py-8 lg:px-gutter">
        <div class="flex flex-col items-center justify-between gap-4 md:flex-row">
          <div class="flex flex-wrap items-center justify-center gap-4 md:justify-start">
            <div class="flex items-center gap-1.5 rounded-full bg-surface px-2.5 py-1">
              <span class="material-symbols-outlined text-[16px] text-action-green">verified_user</span>
              <span class="font-label-caps text-label-caps text-on-surface-variant">SOC-2 Type II Validated</span>
            </div>
            <div class="flex items-center gap-1.5 rounded-full bg-surface px-2.5 py-1">
              <span class="material-symbols-outlined text-[16px] text-deep-navy">shield</span>
              <span class="font-label-caps text-label-caps text-on-surface-variant">FedRAMP Aligned</span>
            </div>
            <span class="hidden font-label-caps text-label-caps text-outline-variant md:inline">|</span>
            <p class="text-center font-label-caps text-label-caps text-on-surface-variant md:text-left">
              e-mobilize CIVIC OS • High-Security Identity Verification • Authorized Personnel Only
            </p>
          </div>
          <div class="flex items-center gap-4">
            <NuxtLink
              to="/"
              class="font-label-caps text-label-caps text-on-surface-variant transition-colors hover:text-on-surface"
            >
              Privacy Notice
            </NuxtLink>
            <NuxtLink
              to="/"
              class="font-label-caps text-label-caps text-on-surface-variant transition-colors hover:text-on-surface"
            >
              Terms
            </NuxtLink>
          </div>
        </div>
      </div>
    </footer>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ layout: "blank" });

useHead({
  title: "Sign in — e-mobilize",
});

const router = useRouter();
const route = useRoute();
const { login, isLoggedIn } = useAdminAuth();

const nextPath = computed(() => {
  const next = route.query.next;
  return typeof next === "string" && next.startsWith("/") ? next : "/admin/dashboard";
});

const authTab = ref<"credentials" | "sso">("credentials");
const email = ref("");
const password = ref("");
const showPassword = ref(false);
const remember = ref(true);
const loading = ref(false);
const error = ref("");

const idps = [
  { name: "Okta", sub: "SAML 2.0" },
  { name: "Google", sub: "Workspace" },
  { name: "Azure", sub: "Entra ID" },
];

const complianceChips = ["SOC-2 Type II", "Merkle Subledger", "GDPR • TCPA Shield"];

onMounted(() => {
  if (isLoggedIn.value) router.replace(nextPath.value);
});

async function onSubmit() {
  loading.value = true;
  error.value = "";
  try {
    await login(email.value, password.value);
    await router.push(nextPath.value);
  } catch (err: unknown) {
    const detail = (err as { data?: { detail?: string } })?.data?.detail;
    error.value = typeof detail === "string" ? detail : "Sign in failed.";
  } finally {
    loading.value = false;
  }
}
</script>
