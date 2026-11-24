<template>
  <div class="flex min-h-screen flex-col bg-background font-body-md text-on-surface lg:flex-row">
    <!-- Navy panel: marks this as the admin door. A band on phones, a full side panel on desktop. -->
    <aside class="flex flex-col bg-deep-navy px-margin-mobile py-4 text-pure-white lg:w-2/5 lg:px-12 lg:py-8">
      <NuxtLink
        to="/"
        class="inline-flex min-h-[44px] items-center self-start rounded-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-electric-pink"
        aria-label="e-mobilize home"
      >
        <BrandMark size="sm" name-class="text-pure-white" />
      </NuxtLink>

      <div class="mt-4 flex items-center gap-4 lg:my-auto lg:block">
        <span class="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-secondary-container lg:h-16 lg:w-16">
          <svg
            class="h-6 w-6 lg:h-8 lg:w-8"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
            aria-hidden="true"
          >
            <path d="M12 3l7 3v5c0 4.5-3 8.4-7 10-4-1.6-7-5.5-7-10V6l7-3z" />
            <path d="M9 12l2 2 4-4" />
          </svg>
        </span>
        <div>
          <p class="font-headline-md text-xl font-bold tracking-tight lg:mt-6 lg:text-4xl">Admin HQ</p>
          <p class="text-sm text-on-navy lg:mt-3 lg:max-w-sm lg:text-base">
            For campaign and organization administrators.
          </p>
        </div>
      </div>
    </aside>

    <div class="flex flex-1 flex-col">
      <main class="flex flex-1 items-start justify-center px-margin-mobile py-8 lg:items-center">
        <div class="w-full max-w-md">
          <h1 class="font-headline-md text-2xl font-bold tracking-tight text-on-surface sm:text-3xl">Admin sign in</h1>

          <form class="mt-6 space-y-4" @submit.prevent="onSubmit">
            <div>
              <label :class="labelClass" for="admin-email">Admin email</label>
              <input
                id="admin-email"
                v-model="email"
                type="email"
                required
                autocomplete="username"
                :class="fieldClass"
              />
            </div>

            <div>
              <label :class="labelClass" for="admin-password">Password</label>
              <div class="relative">
                <input
                  id="admin-password"
                  v-model="password"
                  :type="showPassword ? 'text' : 'password'"
                  required
                  autocomplete="current-password"
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
            </div>

            <p v-if="error" role="alert" class="rounded-xl bg-error-container px-4 py-3 text-sm text-on-error-container">
              {{ error }}
            </p>

            <button
              type="submit"
              class="!mt-6 h-12 w-full rounded-xl bg-secondary-container font-button-text text-button-text text-pure-white transition-colors hover:bg-secondary focus:outline-none focus-visible:ring-2 focus-visible:ring-electric-pink focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:opacity-60"
              :disabled="loading"
            >
              {{ loading ? "Please wait…" : "Sign in to Admin HQ" }}
            </button>
          </form>

          <NuxtLink
            to="/agent/login"
            class="mt-6 flex min-h-[48px] items-center justify-between gap-3 rounded-xl border border-outline-variant px-4 py-3 text-sm text-on-surface transition-colors hover:bg-surface-container focus:outline-none focus-visible:ring-2 focus-visible:ring-electric-pink"
          >
            <span>Are you a field agent?</span>
            <span class="font-semibold underline underline-offset-4">Go to agent sign in</span>
          </NuxtLink>
        </div>
      </main>

      <footer class="px-margin-mobile pb-4 text-center text-sm text-on-surface-variant">
        <p>For authorized administrators only. Activity is logged for audit.</p>
        <div class="flex flex-wrap justify-center gap-x-6">
          <NuxtLink to="/register" :class="linkClass">Register an organization</NuxtLink>
          <a href="mailto:support@e-mobilize.app" :class="linkClass">Support</a>
        </div>
      </footer>
    </div>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ layout: "blank" });

useHead({
  title: "Admin sign in — e-mobilize",
});

const labelClass = "mb-1.5 block text-sm font-medium text-on-surface";
const fieldClass =
  "h-12 w-full rounded-xl border border-outline bg-surface-container-lowest px-4 text-base text-on-surface transition-colors focus:border-electric-pink focus:outline-none focus:ring-2 focus:ring-electric-pink/40 disabled:cursor-not-allowed disabled:opacity-60";
const linkClass =
  "inline-flex min-h-[44px] items-center rounded font-semibold text-on-surface underline underline-offset-4 hover:no-underline focus:outline-none focus-visible:ring-2 focus-visible:ring-electric-pink";

const router = useRouter();
const route = useRoute();
const { login, isLoggedIn } = useAdminAuth();

const nextPath = computed(() => {
  const next = route.query.next;
  return typeof next === "string" && next.startsWith("/") ? next : "/admin/dashboard";
});

const email = ref("");
const password = ref("");
const showPassword = ref(false);
const loading = ref(false);
const error = ref("");

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
