<template>
  <div class="min-h-screen bg-ui-bg text-ui-text">
    <header class="ui-section-header backdrop-blur">
      <div class="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-4 py-3 sm:px-6">
        <NuxtLink to="/" class="flex min-w-0 items-center gap-3">
          <BrandLogos size="sm" :show-divider="false" />
          <div class="min-w-0 border-l border-ui-border/50 pl-3">
            <p class="truncate text-sm font-semibold leading-tight">Ogun State Monitor</p>
            <p class="truncate text-xs text-ui-muted">Live polling unit activity</p>
          </div>
        </NuxtLink>

        <div class="flex flex-wrap items-center gap-2">
          <nav class="flex flex-wrap items-center gap-1 text-sm">
            <NuxtLink
              to="/"
              class="ui-nav-link"
              :class="{ 'ui-nav-link-active': route.path === '/' }"
            >
              Home
            </NuxtLink>
            <NuxtLink
              to="/monitor"
              class="ui-nav-link"
              active-class="ui-nav-link-active"
            >
              Monitor
            </NuxtLink>
            <NuxtLink
              to="/feeds"
              class="ui-nav-link"
              active-class="ui-nav-link-active"
            >
              Live Feeds
            </NuxtLink>
            <NuxtLink
              to="/scan"
              class="ui-nav-link"
              active-class="ui-nav-link-active"
            >
              Scan Form
            </NuxtLink>
            <NuxtLink
              v-if="dashboardHref"
              :to="dashboardHref"
              class="ui-nav-link"
              active-class="ui-nav-link-active"
            >
              Dashboard
            </NuxtLink>
            <NuxtLink
              v-if="!isAgentLoggedIn"
              to="/agent/login"
              class="ui-nav-link"
              active-class="ui-nav-link-active"
            >
              Agent
            </NuxtLink>
            <NuxtLink
              v-if="!isAdminLoggedIn"
              to="/admin/login"
              class="ui-nav-link"
              active-class="ui-nav-link-active"
            >
              Admin
            </NuxtLink>
          </nav>
          <ThemeToggle />
        </div>
      </div>
    </header>

    <main>
      <slot />
    </main>

    <footer class="mt-auto border-t border-ui-border/50 bg-ui-surface/30 py-6">
      <div class="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-4 sm:px-6">
        <BrandLogos size="sm" />
        <p class="text-xs text-ui-muted">
          Ogun State election monitoring · Powered by live field agents
        </p>
      </div>
    </footer>
  </div>
</template>

<script setup lang="ts">
const route = useRoute();
const { isLoggedIn: isAgentLoggedIn } = useAgentAuth();
const { isLoggedIn: isAdminLoggedIn } = useAdminAuth();

const dashboardHref = computed(() => {
  if (isAdminLoggedIn.value) return "/admin/dashboard";
  if (isAgentLoggedIn.value) return "/agent/dashboard";
  return null;
});
</script>
