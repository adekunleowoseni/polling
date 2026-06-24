<template>
  <div class="mx-auto max-w-md p-6">
    <div class="mb-6 flex justify-center">
      <BrandLogos size="lg" stacked />
    </div>

    <section class="ui-card p-6">
      <h1 class="text-xl font-semibold text-ui-text">Agent sign in</h1>
      <p class="mt-2 text-sm text-ui-muted">
        Only registered field agents can create polling units and stream live video.
      </p>

      <form class="mt-6 space-y-4" @submit.prevent="onSubmit">
        <label v-if="mode === 'register'" class="block">
          <span class="text-xs text-ui-muted">Full name</span>
          <input v-model="name" required class="ui-input mt-1" />
        </label>

        <label class="block">
          <span class="text-xs text-ui-muted">Email</span>
          <input v-model="email" type="email" required class="ui-input mt-1" />
        </label>

        <label v-if="mode === 'register'" class="block">
          <span class="text-xs text-ui-muted">Local Government Area (LGA)</span>
          <select
            v-model="lga"
            required
            class="ui-input mt-1"
            :disabled="loadingLgas || !lgas.length"
            @change="onLgaChange"
          >
            <option value="" disabled>{{ loadingLgas ? "Loading LGAs…" : "Select LGA" }}</option>
            <option v-for="item in lgas" :key="item" :value="item">{{ item }}</option>
          </select>
        </label>

        <label v-if="mode === 'register'" class="block">
          <span class="text-xs text-ui-muted">Ward</span>
          <select
            v-model="ward"
            required
            class="ui-input mt-1"
            :disabled="!lga || loadingWards || !wards.length"
          >
            <option value="" disabled>{{ loadingWards ? "Loading wards…" : "Select ward" }}</option>
            <option v-for="item in wards" :key="item" :value="item">{{ item }}</option>
          </select>
        </label>

        <label class="block">
          <span class="text-xs text-ui-muted">Password</span>
          <input v-model="password" type="password" required minlength="8" class="ui-input mt-1" />
        </label>

        <button
          type="submit"
          class="w-full rounded-lg bg-emerald-600 py-2.5 text-sm font-medium text-white hover:bg-emerald-500 disabled:opacity-50"
          :disabled="loading"
        >
          {{ loading ? "Please wait…" : mode === "login" ? "Sign in" : "Create agent account" }}
        </button>

        <p v-if="error" class="text-sm text-red-500 dark:text-red-400">{{ error }}</p>
      </form>

      <button
        type="button"
        class="mt-4 w-full text-sm text-ui-muted hover:text-ui-text"
        @click="mode = mode === 'login' ? 'register' : 'login'"
      >
        {{ mode === "login" ? "New agent? Create an account" : "Already registered? Sign in" }}
      </button>
    </section>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ layout: "default" });

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
