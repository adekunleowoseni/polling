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
              FIELD OS
            </span>
          </NuxtLink>
          <div class="hidden items-center gap-2 rounded-full bg-surface-container px-3 py-1 lg:flex">
            <span class="h-2 w-2 animate-pulse rounded-full bg-action-green" />
            <span class="font-label-caps text-label-caps font-medium text-on-surface-variant">
              Field Gateway Online
            </span>
          </div>
        </div>
        <div class="flex items-center gap-3">
          <NuxtLink
            to="/admin/login"
            class="hidden font-button-text text-sm text-on-surface-variant transition-colors hover:text-on-surface sm:inline"
          >
            Admin portal
          </NuxtLink>
          <div class="hidden items-center gap-2 rounded-full bg-surface-container-low px-2.5 py-1 sm:flex">
            <span class="material-symbols-outlined text-[16px] text-on-surface-variant">lock</span>
            <span class="font-label-caps text-label-caps text-on-surface-variant">256-bit TLS</span>
          </div>
        </div>
      </div>
    </header>

    <main class="flex flex-1 flex-col bg-surface pt-16">
      <div class="relative w-full overflow-hidden py-8 lg:py-12">
        <div class="pointer-events-none absolute -top-40 right-1/4 h-96 w-96 rounded-full bg-primary-fixed/30 blur-3xl" />
        <div class="pointer-events-none absolute left-10 top-1/2 h-72 w-72 rounded-full bg-secondary-fixed/20 blur-3xl" />

        <div class="relative z-10 mx-auto max-w-container-max px-margin-mobile lg:px-gutter">
          <div class="mb-6 flex flex-wrap items-center justify-between gap-4">
            <div class="flex items-center gap-2.5">
              <span class="inline-flex h-2 w-2 animate-ping rounded-full bg-action-green" />
              <span class="font-label-caps text-label-caps uppercase tracking-wider text-on-surface-variant">
                Agent Gateway :: Ogun Field Partition
              </span>
            </div>
            <code
              class="rounded bg-surface-container px-2 py-0.5 font-label-caps text-label-caps font-semibold text-deep-navy"
            >
              EM-FIELD-AGENT
            </code>
          </div>

          <div class="grid grid-cols-1 items-stretch gap-6 lg:grid-cols-12 xl:gap-8">
            <div
              class="flex flex-col justify-between rounded-2xl bg-pure-white p-6 shadow-xl shadow-deep-navy/5 sm:p-10 lg:col-span-7"
            >
              <div>
                <div class="mb-8 flex items-center justify-between rounded-xl bg-surface-container-low p-3">
                  <div class="flex min-w-0 items-center gap-3">
                    <div
                      class="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-deep-navy text-pure-white"
                    >
                      <span class="material-symbols-outlined text-[20px]">badge</span>
                    </div>
                    <div class="min-w-0">
                      <p class="font-label-caps text-label-caps uppercase text-on-surface-variant">Field Domain</p>
                      <p class="truncate font-button-text text-button-text text-deep-navy">
                        Ogun State · Polling Unit Agents
                      </p>
                    </div>
                  </div>
                  <NuxtLink
                    to="/admin/login"
                    class="flex flex-shrink-0 items-center gap-1 rounded bg-surface px-2.5 py-1 font-label-caps text-label-caps text-secondary transition-colors hover:bg-surface-container-high"
                  >
                    <span>HQ admin</span>
                    <span class="material-symbols-outlined text-[14px]">swap_horiz</span>
                  </NuxtLink>
                </div>

                <div class="mb-8">
                  <div
                    class="mb-3 inline-flex items-center gap-2 rounded-full bg-surface-container px-2.5 py-1 text-deep-navy"
                  >
                    <span class="material-symbols-outlined text-[16px] text-electric-pink">fingerprint</span>
                    <span class="font-label-caps text-label-caps font-semibold">Field Agent Terminal</span>
                  </div>
                  <h1 class="font-headline-lg text-3xl font-bold tracking-tight text-deep-navy sm:text-headline-lg">
                    {{ mode === "login" ? "Sign In to e-mobilize" : "Create Agent Account" }}
                  </h1>
                  <p class="mt-2 font-body-md text-body-md text-on-surface-variant">
                    Registered field agents can create polling units, stream live video, and submit EC8A evidence.
                  </p>
                </div>

                <div class="mb-6 flex rounded-xl bg-surface-container p-1">
                  <button
                    type="button"
                    class="flex flex-1 items-center justify-center gap-2 rounded-lg py-2.5 font-button-text text-sm font-semibold transition-all"
                    :class="
                      mode === 'login'
                        ? 'bg-pure-white text-deep-navy shadow-sm'
                        : 'text-on-surface-variant hover:text-deep-navy'
                    "
                    @click="mode = 'login'"
                  >
                    Sign in
                  </button>
                  <button
                    type="button"
                    class="flex flex-1 items-center justify-center gap-2 rounded-lg py-2.5 font-button-text text-sm font-semibold transition-all"
                    :class="
                      mode === 'register'
                        ? 'bg-pure-white text-deep-navy shadow-sm'
                        : 'text-on-surface-variant hover:text-deep-navy'
                    "
                    @click="mode = 'register'"
                  >
                    Register
                  </button>
                </div>

                <form class="space-y-5" @submit.prevent="onSubmit">
                  <div v-if="mode === 'register'">
                    <label class="mb-1.5 block font-label-caps text-label-caps font-semibold uppercase text-deep-navy">
                      Full name
                    </label>
                    <input
                      v-model="name"
                      type="text"
                      required
                      class="w-full rounded-xl bg-off-white px-4 py-3 font-body-md text-body-md text-deep-navy transition-all placeholder:text-outline focus:bg-pure-white focus:outline-none focus:shadow-md"
                      placeholder="Agent full name"
                    />
                  </div>

                  <div>
                    <label
                      class="mb-1.5 block font-label-caps text-label-caps font-semibold uppercase text-deep-navy"
                      for="agent-email"
                    >
                      Work Email
                    </label>
                    <div class="relative flex items-center">
                      <span class="material-symbols-outlined absolute left-3.5 text-[20px] text-on-surface-variant">
                        alternate_email
                      </span>
                      <input
                        id="agent-email"
                        v-model="email"
                        type="email"
                        required
                        autocomplete="username"
                        placeholder="agent@chapter.org"
                        class="w-full rounded-xl bg-off-white py-3 pl-11 pr-4 font-body-md text-body-md text-deep-navy transition-all placeholder:text-outline focus:bg-pure-white focus:outline-none focus:shadow-md"
                      />
                    </div>
                  </div>

                  <div v-if="mode === 'register'" class="grid gap-4 sm:grid-cols-2">
                    <div>
                      <label class="mb-1.5 block font-label-caps text-label-caps font-semibold uppercase text-deep-navy">
                        LGA
                      </label>
                      <select
                        v-model="lga"
                        required
                        class="w-full rounded-xl bg-off-white px-4 py-3 font-body-md text-body-md text-deep-navy focus:outline-none focus:shadow-md"
                        :disabled="loadingLgas || !lgas.length"
                        @change="onLgaChange"
                      >
                        <option value="" disabled>
                          {{ loadingLgas ? "Loading LGAs…" : "Select LGA" }}
                        </option>
                        <option v-for="item in lgas" :key="item" :value="item">{{ item }}</option>
                      </select>
                    </div>
                    <div>
                      <label class="mb-1.5 block font-label-caps text-label-caps font-semibold uppercase text-deep-navy">
                        Ward
                      </label>
                      <select
                        v-model="ward"
                        required
                        class="w-full rounded-xl bg-off-white px-4 py-3 font-body-md text-body-md text-deep-navy focus:outline-none focus:shadow-md"
                        :disabled="!lga || loadingWards || !wards.length"
                      >
                        <option value="" disabled>
                          {{ loadingWards ? "Loading wards…" : "Select ward" }}
                        </option>
                        <option v-for="item in wards" :key="item" :value="item">{{ item }}</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label
                      class="mb-1.5 block font-label-caps text-label-caps font-semibold uppercase text-deep-navy"
                      for="agent-password"
                    >
                      Password
                    </label>
                    <div class="relative flex items-center">
                      <span class="material-symbols-outlined absolute left-3.5 text-[20px] text-on-surface-variant">
                        key
                      </span>
                      <input
                        id="agent-password"
                        v-model="password"
                        type="password"
                        required
                        minlength="8"
                        autocomplete="current-password"
                        placeholder="••••••••••••"
                        class="w-full rounded-xl bg-off-white py-3 pl-11 pr-4 font-body-md text-body-md text-deep-navy transition-all placeholder:text-outline focus:bg-pure-white focus:outline-none focus:shadow-md"
                      />
                    </div>
                  </div>

                  <p v-if="error" class="rounded-xl bg-error-container/50 px-3 py-2 text-sm text-error">{{ error }}</p>

                  <button
                    type="submit"
                    class="flex w-full items-center justify-center gap-3 rounded-xl bg-electric-pink px-6 py-4 font-button-text text-button-text text-pure-white shadow-lg shadow-electric-pink/25 transition-all hover:bg-secondary-container disabled:opacity-60"
                    :disabled="loading"
                  >
                    <span class="material-symbols-outlined text-[20px]">lock_open</span>
                    <span>
                      {{
                        loading
                          ? "Please wait…"
                          : mode === "login"
                            ? "Authenticate & Enter Field Terminal"
                            : "Create agent account"
                      }}
                    </span>
                    <span class="material-symbols-outlined text-[18px]">arrow_forward</span>
                  </button>
                </form>
              </div>

              <div
                class="mt-8 flex flex-col items-center justify-between gap-4 border-t border-surface-container pt-6 sm:flex-row"
              >
                <p class="font-body-md text-sm text-on-surface-variant">
                  {{ mode === "login" ? "New agent?" : "Already registered?" }}
                  <button
                    type="button"
                    class="font-semibold text-secondary hover:underline"
                    @click="mode = mode === 'login' ? 'register' : 'login'"
                  >
                    {{ mode === "login" ? "Create an account" : "Sign in instead" }}
                  </button>
                </p>
                <div class="flex items-center gap-2 font-label-caps text-label-caps text-on-surface-variant">
                  <span class="material-symbols-outlined text-[16px] text-action-green">encrypted</span>
                  <span>256-bit Encrypted</span>
                </div>
              </div>
            </div>

            <div class="flex flex-col gap-6 lg:col-span-5">
              <div class="relative overflow-hidden rounded-2xl bg-deep-navy p-6 text-pure-white shadow-xl sm:p-8">
                <div
                  class="pointer-events-none absolute -bottom-10 -right-10 h-48 w-48 rounded-full bg-electric-pink/15 blur-2xl"
                />
                <div class="mb-4 flex items-center gap-2">
                  <span class="h-2.5 w-2.5 animate-pulse rounded-full bg-action-green" />
                  <span class="font-label-caps text-label-caps font-bold uppercase tracking-wide text-action-green">
                    Live Field Pulse
                  </span>
                </div>
                <h2 class="font-headline-md text-2xl font-bold leading-tight text-pure-white">
                  Stream, count, and report from every polling unit
                </h2>
                <p class="mt-2 font-body-md text-sm text-inverse-on-surface/80">
                  Your agent session unlocks live video, people counting, result-sheet capture, and ward-scoped
                  assignments across Ogun.
                </p>
                <div class="mt-6 grid grid-cols-2 gap-3">
                  <div class="rounded-xl bg-surface-container/10 p-3.5">
                    <div class="text-2xl font-bold text-pure-white">Live</div>
                    <div class="mt-0.5 font-label-caps text-label-caps uppercase text-inverse-on-surface/70">
                      Video feeds
                    </div>
                  </div>
                  <div class="rounded-xl bg-surface-container/10 p-3.5">
                    <div class="text-2xl font-bold text-action-green">EC8A</div>
                    <div class="mt-0.5 font-label-caps text-label-caps uppercase text-inverse-on-surface/70">
                      Sheet capture
                    </div>
                  </div>
                </div>
              </div>

              <div class="rounded-2xl bg-pure-white p-6 shadow-md">
                <div class="flex items-start gap-2.5 rounded-xl bg-surface-container p-3">
                  <span class="material-symbols-outlined mt-0.5 flex-shrink-0 text-[18px] text-deep-navy">policy</span>
                  <p class="font-label-caps text-label-caps leading-relaxed text-on-surface-variant">
                    <span class="font-bold text-deep-navy">Statutory Notice:</span>
                    Only registered field agents may create polling units and stream live video. Sessions are logged for
                    audit.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>

    <footer class="w-full bg-surface-container-low shadow-[0_-1px_8px_rgba(0,0,0,0.02)]">
      <div class="mx-auto flex max-w-container-max flex-wrap items-center justify-between gap-4 px-margin-mobile py-6 lg:px-gutter">
        <p class="font-label-caps text-label-caps text-on-surface-variant">
          e-mobilize FIELD OS • Authorized Agents Only
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

useHead({
  title: "Agent sign in — e-mobilize",
});

const router = useRouter();
const { login, register } = useAgentAuth();
const { lgas, wards, loadingLgas, loadingWards, loadLgas, loadWards } = useOgunGeo();

const mode = ref<"login" | "register">("login");
const name = ref("");
const email = ref("");
const password = ref("");
const lga = ref("");
const ward = ref("");
const loading = ref(false);
const error = ref("");

onMounted(() => {
  loadLgas();
});

watch(mode, (value) => {
  if (value === "register" && !lgas.value.length) loadLgas();
});

async function onLgaChange() {
  ward.value = "";
  await loadWards(lga.value);
}

async function onSubmit() {
  loading.value = true;
  error.value = "";
  try {
    if (mode.value === "login") {
      await login(email.value, password.value);
    } else {
      await register(name.value, email.value, password.value, lga.value, ward.value);
    }
    await router.push("/agent/dashboard");
  } catch (err: unknown) {
    const detail = (err as { data?: { detail?: string } })?.data?.detail;
    error.value = typeof detail === "string" ? detail : "Request failed.";
  } finally {
    loading.value = false;
  }
}
</script>
