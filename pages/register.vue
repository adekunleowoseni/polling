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
        </div>
        <nav class="hidden items-center gap-6 md:flex">
          <span class="font-button-text text-sm font-bold text-on-surface">Provision Workspace</span>
          <NuxtLink to="/admin/login" class="font-button-text text-sm text-on-surface-variant hover:text-on-surface">
            Sign in
          </NuxtLink>
        </nav>
      </div>
    </header>

    <main class="flex flex-1 flex-col bg-surface pt-16">
      <div v-if="!saasEnabled" class="mx-auto max-w-container-max px-margin-mobile py-16 lg:px-gutter">
        <div class="rounded-2xl bg-pure-white p-10 text-center shadow-sm">
          <span class="material-symbols-outlined text-[48px] text-outline">cloud_off</span>
          <h1 class="mt-4 font-headline-md text-2xl font-bold text-deep-navy">Organization registration paused</h1>
          <p class="mt-2 text-on-surface-variant">
            The platform administrator has temporarily disabled new SaaS workspace provisioning.
          </p>
          <NuxtLink
            to="/admin/login"
            class="mt-6 inline-flex h-11 items-center rounded-xl bg-electric-pink px-5 font-button-text text-sm font-semibold text-pure-white"
          >
            Sign in to existing workspace
          </NuxtLink>
        </div>
      </div>

      <div v-else class="mx-auto w-full max-w-container-max px-margin-mobile py-8 lg:px-gutter lg:py-12">
        <div class="mb-8 lg:mb-10">
          <div
            class="mb-4 inline-flex items-center gap-2 rounded-full bg-surface-container px-3 py-1 font-label-caps text-label-caps text-deep-navy"
          >
            <span class="material-symbols-outlined text-[16px] text-electric-pink">bolt</span>
            WORKSPACE INITIALIZATION
          </div>
          <h1 class="mb-3 font-headline-lg text-3xl font-bold tracking-tight text-deep-navy sm:text-headline-lg">
            Deploy e-mobilize for Your Movement
          </h1>
          <p class="max-w-3xl font-body-lg text-body-lg text-on-surface-variant">
            Political campaigns, nonprofit drives, awareness efforts, and associations — free SaaS workspace with your
            own admins and roles.
          </p>
        </div>

        <!-- Campaign type -->
        <div class="mb-6">
          <p class="mb-2 font-label-caps text-label-caps uppercase text-on-surface-variant">Campaign type</p>
          <div class="inline-flex flex-wrap gap-1 rounded-xl bg-surface-container p-1.5" role="tablist">
            <button
              v-for="opt in archetypes"
              :key="opt.id"
              type="button"
              class="flex items-center gap-2 rounded-lg px-3 py-2.5 font-button-text text-sm transition-all sm:px-4"
              :class="
                form.archetype === opt.id
                  ? 'bg-pure-white text-deep-navy shadow-sm'
                  : 'text-on-surface-variant hover:text-deep-navy'
              "
              @click="form.archetype = opt.id"
            >
              <span
                class="material-symbols-outlined text-[18px]"
                :class="form.archetype === opt.id ? 'text-electric-pink' : ''"
              >
                {{ opt.icon }}
              </span>
              {{ opt.label }}
            </button>
          </div>
          <p class="mt-2 max-w-2xl text-sm text-on-surface-variant">{{ archetypeHint }}</p>
        </div>

        <!-- Tab strip -->
        <div class="mb-6 rounded-xl bg-pure-white p-2 shadow-sm sm:p-3">
          <div class="grid grid-cols-3 gap-1" role="tablist">
            <button
              v-for="(tab, idx) in tabs"
              :key="tab.id"
              type="button"
              class="flex flex-col items-start gap-1 rounded-lg px-3 py-3 text-left transition sm:flex-row sm:items-center sm:gap-3"
              :class="
                activeTab === idx
                  ? 'bg-deep-navy text-pure-white'
                  : idx < activeTab
                    ? 'bg-surface-container text-deep-navy'
                    : 'text-on-surface-variant hover:bg-surface-container-low'
              "
              @click="goTab(idx)"
            >
              <span
                class="flex h-7 w-7 shrink-0 items-center justify-center rounded-full font-label-caps text-label-caps font-bold"
                :class="activeTab === idx ? 'bg-electric-pink text-pure-white' : 'bg-surface-container-high text-deep-navy'"
              >
                {{ idx + 1 }}
              </span>
              <span>
                <span class="block font-label-caps text-[10px] uppercase opacity-80">{{ tab.eyebrow }}</span>
                <span class="block text-sm font-semibold">{{ tab.title }}</span>
              </span>
            </button>
          </div>
        </div>

        <div class="grid grid-cols-1 items-start gap-8 lg:grid-cols-12">
          <form class="lg:col-span-8" @submit.prevent="onSubmit">
            <!-- Tab 0: Entity -->
            <div v-show="activeTab === 0" class="space-y-6 rounded-xl bg-pure-white p-6 shadow-sm sm:p-8">
              <div>
                <h2 class="text-[22px] font-semibold leading-tight text-deep-navy">Entity &amp; Movement Profile</h2>
                <p class="font-label-caps text-label-caps text-on-surface-variant">NAME &amp; WORKSPACE SLUG</p>
              </div>

              <div>
                <label class="mb-1.5 block font-label-caps text-label-caps font-medium uppercase text-on-surface-variant">
                  {{ isPolitical ? "Legal Entity or Campaign Committee Name" : "Organization or Campaign Name" }}
                </label>
                <input
                  v-model="form.legal_name"
                  type="text"
                  required
                  class="w-full rounded-lg bg-off-white px-4 py-3 font-body-md text-body-md text-on-surface shadow-inner transition-all focus:bg-pure-white focus:outline-none"
                  :placeholder="isPolitical ? 'e.g., Forward Civic Coalition 2026' : 'e.g., Clean Water Awareness Drive'"
                  @input="onLegalNameInput"
                />
              </div>

              <div>
                <label class="mb-1.5 block font-label-caps text-label-caps font-medium uppercase text-on-surface-variant">
                  Assigned Subdomain Slug
                </label>
                <div class="flex items-center">
                  <input
                    v-model="form.slug"
                    type="text"
                    required
                    class="w-full rounded-l-lg bg-off-white px-4 py-3 font-label-caps text-label-caps font-semibold text-deep-navy focus:bg-pure-white focus:outline-none"
                    @blur="checkSlug"
                  />
                  <span
                    class="select-none rounded-r-lg bg-surface-container px-3 py-3 font-label-caps text-label-caps text-on-surface-variant"
                  >
                    .e-mobilize.app
                  </span>
                </div>
                <div class="mt-1.5 flex items-center gap-1.5">
                  <span
                    class="material-symbols-outlined text-[14px]"
                    :class="slugOk ? 'text-action-green' : 'text-error'"
                  >
                    {{ slugOk ? "check_circle" : "error" }}
                  </span>
                  <span
                    class="font-label-caps text-label-caps font-medium"
                    :class="slugOk ? 'text-action-green' : 'text-error'"
                  >
                    {{ slugMessage }}
                  </span>
                </div>
              </div>

              <template v-if="isPolitical">
                <div>
                  <label class="mb-1.5 block font-label-caps text-label-caps font-medium uppercase text-on-surface-variant">
                    Primary Statutory Jurisdiction
                  </label>
                  <select
                    v-model="form.jurisdiction"
                    class="w-full appearance-none rounded-lg bg-off-white px-4 py-3 font-body-md text-body-md text-on-surface focus:bg-pure-white focus:outline-none"
                  >
                    <option v-for="j in jurisdictions" :key="j.id" :value="j.id">{{ j.label }}</option>
                  </select>
                </div>

                <div>
                  <label class="mb-2 block font-label-caps text-label-caps font-medium uppercase text-on-surface-variant">
                    Estimated Supporter / Voter Universe
                  </label>
                  <div class="grid grid-cols-2 gap-2 sm:grid-cols-4">
                    <button
                      v-for="u in universes"
                      :key="u.id"
                      type="button"
                      class="rounded-lg p-3 text-center font-label-caps text-label-caps transition-all"
                      :class="
                        form.universe_size === u.id
                          ? 'bg-deep-navy font-bold text-pure-white shadow-sm'
                          : 'bg-surface-container-low text-on-surface hover:bg-surface-container'
                      "
                      @click="form.universe_size = u.id"
                    >
                      {{ u.label }}
                    </button>
                  </div>
                </div>
              </template>
            </div>

            <!-- Tab 1: Custodian -->
            <div v-show="activeTab === 1" class="space-y-6 rounded-xl bg-pure-white p-6 shadow-sm sm:p-8">
              <div>
                <h2 class="text-[22px] font-semibold leading-tight text-deep-navy">Lead Custodian Identity</h2>
                <p class="font-label-caps text-label-caps text-on-surface-variant">
                  ORGANIZATION OWNER / FIRST ADMIN
                </p>
              </div>

              <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label class="mb-1.5 block font-label-caps text-label-caps font-medium uppercase text-on-surface-variant">
                    First Name
                  </label>
                  <input
                    v-model="form.first_name"
                    required
                    class="w-full rounded-lg bg-off-white px-4 py-3 font-body-md text-on-surface focus:bg-pure-white focus:outline-none"
                  />
                </div>
                <div>
                  <label class="mb-1.5 block font-label-caps text-label-caps font-medium uppercase text-on-surface-variant">
                    Last Name
                  </label>
                  <input
                    v-model="form.last_name"
                    required
                    class="w-full rounded-lg bg-off-white px-4 py-3 font-body-md text-on-surface focus:bg-pure-white focus:outline-none"
                  />
                </div>
              </div>

              <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label class="mb-1.5 block font-label-caps text-label-caps font-medium uppercase text-on-surface-variant">
                    Work Email
                  </label>
                  <input
                    v-model="form.email"
                    type="email"
                    required
                    class="w-full rounded-lg bg-off-white px-4 py-3 font-body-md text-on-surface focus:bg-pure-white focus:outline-none"
                  />
                </div>
                <div>
                  <label class="mb-1.5 block font-label-caps text-label-caps font-medium uppercase text-on-surface-variant">
                    Direct Mobile
                  </label>
                  <input
                    v-model="form.phone"
                    type="tel"
                    class="w-full rounded-lg bg-off-white px-4 py-3 font-body-md text-on-surface focus:bg-pure-white focus:outline-none"
                    placeholder="+234…"
                  />
                </div>
              </div>

              <div>
                <div class="mb-1.5 flex items-center justify-between">
                  <label class="font-label-caps text-label-caps font-medium uppercase text-on-surface-variant">
                    Root Workspace Passphrase
                  </label>
                  <span class="font-label-caps text-label-caps font-semibold text-action-green">
                    {{ passwordStrength.label }}
                  </span>
                </div>
                <div class="relative">
                  <input
                    v-model="form.password"
                    :type="showPassword ? 'text' : 'password'"
                    required
                    minlength="8"
                    class="w-full rounded-lg bg-off-white px-4 py-3 pr-12 font-label-caps text-label-caps tracking-widest text-on-surface focus:bg-pure-white focus:outline-none"
                  />
                  <button
                    type="button"
                    class="absolute right-3 top-3 text-on-surface-variant hover:text-deep-navy"
                    @click="showPassword = !showPassword"
                  >
                    <span class="material-symbols-outlined text-[18px]">
                      {{ showPassword ? "visibility_off" : "visibility" }}
                    </span>
                  </button>
                </div>
                <div class="grid grid-cols-4 gap-1 pt-2">
                  <div
                    v-for="n in 4"
                    :key="n"
                    class="h-1 rounded-full"
                    :class="passwordStrength.score >= n ? 'bg-action-green' : 'bg-surface-container-high'"
                  />
                </div>
              </div>
            </div>

            <!-- Tab 2: Governance -->
            <div v-show="activeTab === 2" class="space-y-6 rounded-xl bg-pure-white p-6 shadow-sm sm:p-8">
              <div>
                <h2 class="text-[22px] font-semibold leading-tight text-deep-navy">
                  Sovereignty &amp; Governance
                </h2>
                <p class="font-label-caps text-label-caps text-on-surface-variant">
                  DATA RESIDENCY &amp; CONTROLS
                </p>
              </div>

              <div>
                <label class="mb-1.5 block font-label-caps text-label-caps font-medium uppercase text-on-surface-variant">
                  Data Sovereign Enclave Location
                </label>
                <select
                  v-model="form.enclave_region"
                  class="w-full appearance-none rounded-lg bg-off-white px-4 py-3 font-body-md text-on-surface focus:outline-none"
                >
                  <option v-for="r in enclaves" :key="r.id" :value="r.id">{{ r.label }}</option>
                </select>
              </div>

              <div class="flex items-start justify-between gap-4 rounded-xl bg-surface-container-low p-4">
                <div class="space-y-1">
                  <div class="flex items-center gap-2">
                    <span class="material-symbols-outlined text-[18px] text-electric-pink">policy</span>
                    <span class="font-button-text text-sm font-bold text-deep-navy">Enforce Dual-Signatory Mandate</span>
                  </div>
                  <p class="text-sm text-on-surface-variant">
                    Requires two authorized officers for financial outlays, contact exports, or mass SMS above threshold.
                  </p>
                </div>
                <label class="relative mt-1 inline-flex cursor-pointer items-center">
                  <input v-model="form.dual_signatory" type="checkbox" class="peer sr-only" />
                  <div
                    class="peer h-6 w-11 rounded-full bg-surface-container-highest after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:bg-pure-white after:transition-all after:content-[''] peer-checked:bg-electric-pink peer-checked:after:translate-x-full"
                  />
                </label>
              </div>

              <div class="space-y-3 pt-2">
                <label class="flex cursor-pointer items-start gap-3">
                  <input v-model="form.certify_authorized" type="checkbox" required class="mt-1 accent-electric-pink" />
                  <span class="text-sm leading-relaxed text-on-surface-variant">
                    I certify that I am authorized to open this workspace for the organization.
                  </span>
                </label>
                <label class="flex cursor-pointer items-start gap-3">
                  <input v-model="form.accept_terms" type="checkbox" required class="mt-1 accent-electric-pink" />
                  <span class="text-sm leading-relaxed text-on-surface-variant">
                    I agree to the e-mobilize Master Subscription Terms and acceptable use policy.
                  </span>
                </label>
              </div>
            </div>

            <p v-if="error" class="mt-4 rounded-xl bg-error-container/50 px-4 py-3 text-sm text-error">{{ error }}</p>

            <div class="mt-6 flex flex-wrap items-center justify-between gap-3">
              <button
                v-if="activeTab > 0"
                type="button"
                class="inline-flex items-center gap-2 rounded-xl bg-surface-container px-5 py-3 text-sm font-semibold text-deep-navy"
                @click="activeTab -= 1"
              >
                <span class="material-symbols-outlined text-[18px]">arrow_back</span>
                Back
              </button>
              <div v-else />

              <button
                v-if="activeTab < tabs.length - 1"
                type="button"
                class="inline-flex items-center gap-2 rounded-xl bg-deep-navy px-5 py-3 text-sm font-semibold text-pure-white disabled:opacity-50"
                :disabled="!canAdvance"
                @click="nextTab"
              >
                Continue
                <span class="material-symbols-outlined text-[18px]">arrow_forward</span>
              </button>
              <button
                v-else
                type="submit"
                class="inline-flex items-center gap-2 rounded-xl bg-electric-pink px-6 py-3 text-sm font-bold text-pure-white shadow-lg disabled:opacity-60"
                :disabled="loading || !slugOk || !canSubmit"
              >
                <span>{{ loading ? "Provisioning…" : "Initialize Workspace" }}</span>
                <span class="material-symbols-outlined text-[20px]">arrow_forward</span>
              </button>
            </div>

            <div class="mt-6 flex items-center justify-center gap-2 text-sm text-on-surface-variant">
              <span>Already have a workspace?</span>
              <NuxtLink to="/admin/login" class="font-bold text-deep-navy underline hover:text-electric-pink">
                Sign in
              </NuxtLink>
            </div>
          </form>

          <aside class="space-y-6 lg:col-span-4">
            <div class="space-y-4 rounded-xl bg-pure-white p-6 shadow-sm">
              <span class="font-label-caps text-label-caps font-semibold uppercase text-on-surface-variant">
                Included free
              </span>
              <ul class="space-y-3 text-sm text-on-surface-variant">
                <li v-for="item in included" :key="item" class="flex items-start gap-2.5">
                  <span class="material-symbols-outlined mt-0.5 text-[18px] text-action-green">check_circle</span>
                  <span>{{ item }}</span>
                </li>
              </ul>
            </div>
          </aside>
        </div>
      </div>
    </main>

    <footer class="w-full bg-surface-container-low">
      <div class="mx-auto flex max-w-container-max flex-wrap items-center justify-between gap-4 px-margin-mobile py-6 lg:px-gutter">
        <p class="font-label-caps text-label-caps text-on-surface-variant">
          e-mobilize · Free SaaS · Political, nonprofit &amp; awareness campaigns
        </p>
        <NuxtLink to="/" class="font-label-caps text-label-caps text-on-surface-variant hover:text-on-surface">
          Back to home
        </NuxtLink>
      </div>
    </footer>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ layout: "blank" });

useHead({ title: "Register organization — e-mobilize" });

const config = useRuntimeConfig();
const apiBase = config.public.apiBase as string;
const router = useRouter();
const { persistSession } = useAdminAuth();

const saasEnabled = ref(true);
const loading = ref(false);
const error = ref("");
const showPassword = ref(false);
const slugOk = ref(true);
const slugMessage = ref("Domain available for instant lease");
const activeTab = ref(0);

type Archetype = "political" | "nonprofit" | "awareness" | "union";

const form = reactive({
  legal_name: "",
  slug: "",
  archetype: "political" as Archetype,
  jurisdiction: "ng-inec",
  universe_size: "25k-150k",
  enclave_region: "ng-lagos",
  dual_signatory: true,
  first_name: "",
  last_name: "",
  email: "",
  phone: "",
  password: "",
  certify_authorized: true,
  accept_terms: true,
});

const archetypes = [
  { id: "political" as const, label: "Political campaign", icon: "how_to_vote" },
  { id: "nonprofit" as const, label: "Nonprofit campaign", icon: "volunteer_activism" },
  { id: "awareness" as const, label: "Awareness / support", icon: "campaign" },
  { id: "union" as const, label: "Union / association", icon: "groups" },
];

const tabs = [
  { id: "entity", eyebrow: "Step 1", title: "Entity profile" },
  { id: "custodian", eyebrow: "Step 2", title: "Lead custodian" },
  { id: "governance", eyebrow: "Step 3", title: "Governance" },
];

const jurisdictions = [
  { id: "ng-inec", label: "Nigeria — INEC / State Electoral Bodies" },
  { id: "us-fec", label: "United States — Federal FEC / State Ethics" },
  { id: "uk-ec", label: "United Kingdom — Electoral Commission" },
  { id: "eu-ep", label: "European Union — Cross-Border" },
  { id: "ca-ec", label: "Canada — Elections Canada" },
];

const universes = [
  { id: "lt-25k", label: "< 25,000" },
  { id: "25k-150k", label: "25k – 150k" },
  { id: "150k-1.5m", label: "150k – 1.5M" },
  { id: "1.5m+", label: "1.5M+ Nationwide" },
];

const enclaves = [
  { id: "ng-lagos", label: "Nigeria (Lagos • West Africa Sovereign)" },
  { id: "lon", label: "United Kingdom (London • eu-west-2)" },
  { id: "fra", label: "European Union (Frankfurt • GDPR Harbor)" },
  { id: "us-gov", label: "North America (us-east-1 • SOC-2 Type II)" },
];

const included = [
  "Dedicated organization workspace with your own admin team",
  "Role-scoped users (owner, admin, operator)",
  "CRM, field ops, messaging, and telemetry modules",
  "Works for political, nonprofit, and awareness campaigns",
];

const isPolitical = computed(() => form.archetype === "political");

const archetypeHint = computed(() => {
  if (form.archetype === "political") {
    return "Electoral or party campaigns — jurisdiction and voter universe apply.";
  }
  if (form.archetype === "nonprofit") {
    return "Registered nonprofits raising support, donors, or community programs.";
  }
  if (form.archetype === "awareness") {
    return "Public awareness, civic education, and cause-based mobilizing.";
  }
  return "Federated unions, chapters, and membership associations.";
});

const passwordStrength = computed(() => {
  const p = form.password;
  let score = 0;
  if (p.length >= 8) score++;
  if (p.length >= 12) score++;
  if (/[A-Z]/.test(p) && /[0-9]/.test(p)) score++;
  if (/[^A-Za-z0-9]/.test(p)) score++;
  const labels = ["Entropy: Low", "Entropy: Fair", "Entropy: Good", "Entropy: High", "Entropy: High"];
  return { score, label: labels[score] || labels[0] };
});

const canAdvance = computed(() => {
  if (activeTab.value === 0) {
    return Boolean(form.legal_name.trim() && form.slug.trim() && slugOk.value);
  }
  if (activeTab.value === 1) {
    return Boolean(
      form.first_name.trim() &&
        form.last_name.trim() &&
        form.email.trim() &&
        form.password.length >= 8,
    );
  }
  return true;
});

const canSubmit = computed(
  () =>
    canAdvance.value &&
    form.certify_authorized &&
    form.accept_terms &&
    form.first_name.trim() &&
    form.last_name.trim() &&
    form.email.trim() &&
    form.password.length >= 8,
);

function goTab(idx: number) {
  if (idx <= activeTab.value) {
    activeTab.value = idx;
    return;
  }
  // Only allow forward if current tab is valid
  if (canAdvance.value) activeTab.value = idx;
}

function nextTab() {
  if (!canAdvance.value) {
    error.value = "Complete the required fields on this step.";
    return;
  }
  error.value = "";
  if (activeTab.value < tabs.length - 1) activeTab.value += 1;
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 48);
}

function onLegalNameInput() {
  form.slug = slugify(form.legal_name);
  void checkSlug();
}

async function checkSlug() {
  const slug = slugify(form.slug);
  form.slug = slug;
  if (!slug || slug.length < 2) {
    slugOk.value = false;
    slugMessage.value = "Enter a valid slug";
    return;
  }
  try {
    const res = await $fetch<{ available: boolean; slug: string }>(
      `${apiBase}/public/organizations/slug-available`,
      { query: { slug } },
    );
    slugOk.value = res.available;
    slugMessage.value = res.available ? "Domain available for instant lease" : "Slug already taken";
  } catch {
    slugOk.value = true;
    slugMessage.value = "Unable to verify slug — will check on submit";
  }
}

watch(
  () => form.archetype,
  (type) => {
    if (type === "political") {
      if (!form.jurisdiction) form.jurisdiction = "ng-inec";
      if (!form.universe_size) form.universe_size = "25k-150k";
    }
  },
);

onMounted(async () => {
  try {
    const status = await $fetch<{ saas_enabled: boolean }>(`${apiBase}/public/saas/status`);
    saasEnabled.value = status.saas_enabled;
  } catch {
    saasEnabled.value = true;
  }
});

async function onSubmit() {
  error.value = "";
  if (!canSubmit.value) {
    error.value = "Complete all steps and accept the terms.";
    return;
  }
  loading.value = true;
  try {
    const body = {
      ...form,
      slug: slugify(form.slug),
      jurisdiction: isPolitical.value ? form.jurisdiction : "",
      universe_size: isPolitical.value ? form.universe_size : "",
    };
    const session = await $fetch<{ api_token: string; admin: import("~/composables/useAdminAuth").Admin }>(
      `${apiBase}/public/organizations/register`,
      {
        method: "POST",
        body,
      },
    );
    persistSession(session.api_token, session.admin);
    await router.push("/admin/dashboard");
  } catch (e: unknown) {
    const detail = (e as { data?: { detail?: string } })?.data?.detail;
    error.value = typeof detail === "string" ? detail : "Registration failed.";
  } finally {
    loading.value = false;
  }
}
</script>
