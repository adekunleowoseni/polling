<template>
  <div class="min-h-screen bg-background font-body-md text-on-surface">
    <header class="sticky top-0 z-40 border-b border-outline-variant/80 bg-surface/90 backdrop-blur-xl">
      <div class="mx-auto flex max-w-container-max flex-wrap items-center justify-between gap-4 px-margin-mobile py-3 lg:px-gutter">
        <NuxtLink to="/" class="flex min-w-0 items-center gap-3">
          <BrandMark size="sm" />
          <p class="hidden truncate font-label-caps text-[10px] uppercase tracking-wider text-on-surface-variant sm:block">
            Live polling unit activity
          </p>
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
              to="/live-monitoring"
              class="ui-nav-link"
              active-class="ui-nav-link-active"
            >
              Live Monitoring
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
              to="/independent-audit"
              class="ui-nav-link"
              active-class="ui-nav-link-active"
            >
              Independent Audit
            </NuxtLink>
            <NuxtLink
              to="/verify"
              class="ui-nav-link"
              active-class="ui-nav-link-active"
            >
              Verify
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

    <footer class="mt-auto border-t border-outline-variant bg-deep-navy py-6 text-on-navy">
      <div class="mx-auto flex max-w-container-max flex-wrap items-center justify-between gap-4 px-margin-mobile lg:px-gutter">
        <div class="flex items-center gap-3">
          <BrandMark size="sm" name-class="text-pure-white" />
        </div>
        <p class="font-label-caps text-[11px] uppercase tracking-wider text-on-primary-container">
          Live field monitoring · 99.99% uptime
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
