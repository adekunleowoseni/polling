<template>
  <div class="flex min-h-screen flex-col bg-background font-body-md text-on-surface">
    <header class="flex items-center justify-between px-margin-mobile py-4 lg:px-gutter">
      <NuxtLink
        to="/"
        class="inline-flex min-h-[44px] items-center rounded-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-electric-pink"
        aria-label="e-mobilize home"
      >
        <BrandMark size="sm" />
      </NuxtLink>
      <NuxtLink to="/admin/login" :class="[linkClass, 'text-sm']">Admin sign in</NuxtLink>
    </header>

    <main class="flex flex-1 items-start justify-center px-margin-mobile pb-8 pt-4 sm:items-center sm:pt-0">
      <div class="w-full max-w-md rounded-2xl border border-outline-variant/60 bg-surface-container-lowest p-6 sm:p-8">
        <h1 class="font-headline-md text-2xl font-bold tracking-tight text-on-surface">
          {{ isLogin ? "Agent sign in" : "Create agent account" }}
        </h1>

        <form class="mt-6 space-y-4" @submit.prevent="onSubmit">
          <div v-if="!isLogin">
            <label :class="labelClass" for="agent-name">Full name</label>
            <input id="agent-name" v-model="name" type="text" required autocomplete="name" :class="fieldClass" />
          </div>

          <div>
            <label :class="labelClass" for="agent-email">Email</label>
            <input id="agent-email" v-model="email" type="email" required autocomplete="username" :class="fieldClass" />
          </div>

          <div v-if="!isLogin" class="grid gap-4 sm:grid-cols-2">
            <div>
              <label :class="labelClass" for="agent-lga">LGA</label>
              <select
                id="agent-lga"
                v-model="lga"
                required
                :class="fieldClass"
                :disabled="loadingLgas || !lgas.length"
                @change="onLgaChange"
              >
                <option value="" disabled>{{ loadingLgas ? "Loading…" : "Select LGA" }}</option>
                <option v-for="item in lgas" :key="item" :value="item">{{ item }}</option>
              </select>
            </div>
            <div>
              <label :class="labelClass" for="agent-ward">Ward</label>
              <select
                id="agent-ward"
                v-model="ward"
                required
                :class="fieldClass"
                :disabled="!lga || loadingWards || !wards.length"
              >
                <option value="" disabled>{{ loadingWards ? "Loading…" : "Select ward" }}</option>
                <option v-for="item in wards" :key="item" :value="item">{{ item }}</option>
              </select>
            </div>
          </div>

          <div>
            <label :class="labelClass" for="agent-password">Password</label>
            <div class="relative">
              <input
                id="agent-password"
                v-model="password"
                :type="showPassword ? 'text' : 'password'"
                required
                minlength="8"
                :autocomplete="isLogin ? 'current-password' : 'new-password'"
                :aria-describedby="isLogin ? undefined : 'agent-password-hint'"
                :class="[fieldClass, 'pr-20']"
              />
              <button
                type="button"
                class="absolute inset-y-0 right-0 rounded-r-xl px-4 text-sm font-medium text-on-surface-variant hover:text-on-surface focus:outline-none focus-visible:ring-2 focus-visible:ring-electric-pink"
                :aria-label="showPassword ? 'Hide password' : 'Show password'"
                @click="showPassword = !showPassword"
              >
                {{ showPassword ? "Hide" : "Show" }}
              </button>
            </div>
            <p v-if="!isLogin" id="agent-password-hint" class="mt-1.5 text-sm text-on-surface-variant">
              At least 8 characters
            </p>
          </div>

          <p v-if="error" role="alert" class="rounded-xl bg-error-container px-4 py-3 text-sm text-on-error-container">
            {{ error }}
          </p>

          <button
            type="submit"
            class="!mt-6 h-12 w-full rounded-xl bg-secondary-container font-button-text text-button-text text-pure-white transition-colors hover:bg-secondary focus:outline-none focus-visible:ring-2 focus-visible:ring-electric-pink focus-visible:ring-offset-2 focus-visible:ring-offset-surface-container-lowest disabled:cursor-not-allowed disabled:opacity-60"
            :disabled="loading"
          >
            {{ loading ? "Please wait…" : isLogin ? "Sign in" : "Create account" }}
          </button>
        </form>

        <p class="mt-4 text-center text-sm text-on-surface-variant">
          {{ isLogin ? "New agent?" : "Already registered?" }}
          <button type="button" :class="linkClass" @click="toggleMode">
            {{ isLogin ? "Create an account" : "Sign in instead" }}
          </button>
        </p>
      </div>
    </main>

    <footer class="px-margin-mobile pb-4 text-center text-sm text-on-surface-variant">
      <p>For registered field agents only. Sessions are logged for audit.</p>
      <NuxtLink to="/register" :class="linkClass">Register an organization</NuxtLink>
    </footer>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ layout: "blank" });

useHead({
  title: "Agent sign in — e-mobilize",
});

const labelClass = "mb-1.5 block text-sm font-medium text-on-surface";
const fieldClass =
  "h-12 w-full rounded-xl border border-outline bg-surface-container-lowest px-4 text-base text-on-surface transition-colors focus:border-electric-pink focus:outline-none focus:ring-2 focus:ring-electric-pink/40 disabled:cursor-not-allowed disabled:opacity-60";
const linkClass =
  "inline-flex min-h-[44px] items-center rounded font-semibold text-on-surface underline underline-offset-4 hover:no-underline focus:outline-none focus-visible:ring-2 focus-visible:ring-electric-pink";

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
const showPassword = ref(false);
const isLogin = computed(() => mode.value === "login");

onMounted(() => {
  loadLgas();
});

watch(mode, (value) => {
  if (value === "register" && !lgas.value.length) loadLgas();
});

function toggleMode() {
  mode.value = isLogin.value ? "register" : "login";
  error.value = "";
  showPassword.value = false;
}

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
