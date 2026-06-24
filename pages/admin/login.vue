<template>
  <div class="mx-auto max-w-md p-6">
    <div class="mb-6 flex justify-center">
      <BrandLogos size="md" />
    </div>

    <section class="ui-card p-6">
      <h1 class="text-xl font-semibold text-ui-text">Super admin</h1>
      <p class="mt-2 text-sm text-ui-muted">
        Sign in to manage live feeds, delete saved images, and control polling units.
      </p>

      <form class="mt-6 space-y-4" @submit.prevent="onSubmit">
        <label class="block">
          <span class="text-xs text-ui-muted">Email</span>
          <input v-model="email" type="email" required class="ui-input mt-1" />
        </label>

        <label class="block">
          <span class="text-xs text-ui-muted">Password</span>
          <input v-model="password" type="password" required class="ui-input mt-1" />
        </label>

        <button
          type="submit"
          class="w-full rounded-lg bg-violet-600 py-2.5 text-sm font-medium text-white hover:bg-violet-500 disabled:opacity-50"
          :disabled="loading"
        >
          {{ loading ? "Signing in…" : "Sign in" }}
        </button>

        <p v-if="error" class="text-sm text-red-500 dark:text-red-400">{{ error }}</p>
      </form>
    </section>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ layout: "default" });

const router = useRouter();
const { login, isLoggedIn } = useAdminAuth();

const email = ref("");
const password = ref("");
const loading = ref(false);
const error = ref("");

onMounted(() => {
  if (isLoggedIn.value) router.replace("/admin/dashboard");
});

async function onSubmit() {
  loading.value = true;
  error.value = "";
  try {
    await login(email.value, password.value);
    await router.push("/admin/dashboard");
  } catch (err: unknown) {
    const detail = (err as { data?: { detail?: string } })?.data?.detail;
    error.value = typeof detail === "string" ? detail : "Sign in failed.";
  } finally {
    loading.value = false;
  }
}
</script>
