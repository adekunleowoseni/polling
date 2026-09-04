<template>
  <div class="min-h-screen bg-background font-body-md text-on-surface">
    <div
      v-if="sidebarOpen"
      class="fixed inset-0 z-40 bg-deep-navy/40 md:hidden"
      @click="sidebarOpen = false"
    />

    <aside
      class="fixed left-0 top-0 z-50 flex h-full w-72 flex-col justify-between bg-deep-navy text-pure-white shadow-[0_1px_8px_rgba(0,0,0,0.04)] transition-transform md:translate-x-0"
      :class="sidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'"
    >
      <div class="flex min-h-0 flex-col">
        <div class="flex h-16 items-center gap-3 bg-deep-navy px-6">
          <NuxtLink to="/" class="flex min-w-0 items-center">
            <BrandMark size="sm" name-class="text-pure-white" />
          </NuxtLink>
        </div>

        <div class="px-6 py-4">
          <div class="flex items-center justify-between rounded-xl bg-surface-container-lowest/5 px-3 py-2 backdrop-blur-md">
            <div class="flex items-center gap-2">
              <span class="h-2 w-2 animate-pulse rounded-full bg-action-green" />
              <span class="font-label-caps text-label-caps text-on-navy">System 99.99%</span>
            </div>
            <span class="font-label-caps text-label-caps text-action-green">Active</span>
          </div>
        </div>

        <nav class="mt-1 flex min-h-0 flex-col gap-3 overflow-y-auto px-3 pb-4" aria-label="Admin">
          <div v-for="group in navGroups" :key="group.id" class="flex flex-col gap-1">
            <button
              type="button"
              class="flex w-full items-center justify-between rounded-lg px-3 py-2 font-label-caps text-[10px] uppercase tracking-wider text-on-primary-container transition-colors hover:bg-surface-container-lowest/5 hover:text-pure-white"
              :aria-expanded="isGroupOpen(group.id)"
              @click="toggleNavGroup(group.id)"
            >
              <span>{{ group.label }}</span>
              <span
                class="material-symbols-outlined text-[16px] transition-transform"
                :class="isGroupOpen(group.id) ? 'rotate-180' : ''"
              >
                expand_more
              </span>
            </button>

            <div v-show="isGroupOpen(group.id)" class="flex flex-col gap-0.5">
              <button
                v-for="item in group.items"
                :key="item.id"
                type="button"
                class="flex items-center gap-3 rounded-xl px-3 py-2.5 font-button-text text-sm transition-colors"
                :class="
                  activeTab === item.id
                    ? 'bg-surface-container-lowest/10 font-bold text-pure-white shadow-[0_1px_8px_rgba(0,0,0,0.04)]'
                    : 'text-on-primary-container hover:bg-surface-container-lowest/5 hover:text-pure-white'
                "
                @click="setTab(item.id)"
              >
                <span class="material-symbols-outlined text-[20px]">{{ item.icon }}</span>
                <span class="text-left leading-snug">{{ item.label }}</span>
              </button>
            </div>
          </div>
        </nav>
      </div>

      <div class="bg-deep-navy p-4">
        <div class="flex items-center gap-3 rounded-xl bg-surface-container-lowest/5 p-3">
          <div class="flex h-8 w-8 items-center justify-center rounded-full bg-primary-container">
            <span class="material-symbols-outlined text-[18px] text-on-primary">person</span>
          </div>
          <div class="min-w-0 flex-1 truncate">
            <span class="block truncate font-button-text text-sm text-pure-white">{{ admin?.name || "Admin" }}</span>
            <span class="block truncate font-label-caps text-[10px] text-on-primary-container">{{ roleLabel }}</span>
          </div>
        </div>
      </div>
    </aside>

    <div class="md:pl-72">
      <header class="fixed left-0 right-0 top-0 z-40 h-16 bg-surface-container-lowest/80 shadow-[0_1px_8px_rgba(0,0,0,0.04)] backdrop-blur-xl md:left-72">
        <div class="flex h-16 w-full items-center justify-between gap-4 px-4 sm:px-8">
          <div class="flex min-w-0 flex-1 items-center gap-3">
            <button
              type="button"
              class="flex h-9 w-9 items-center justify-center rounded-xl bg-surface-container-low text-on-surface-variant md:hidden"
              aria-label="Open menu"
              @click="sidebarOpen = true"
            >
              <span class="material-symbols-outlined text-[20px]">menu</span>
            </button>
            <div class="relative flex w-full max-w-lg items-center">
              <span class="material-symbols-outlined absolute left-3 text-[20px] text-outline">search</span>
              <input
                v-model="searchQuery"
                class="w-full rounded-xl bg-off-white py-2 pl-10 pr-4 font-body-md text-sm text-on-surface placeholder:text-outline focus:bg-surface-container-lowest focus:outline-none"
                placeholder="Search precincts, agents, logs..."
                type="search"
                @keydown.enter="onSearch"
              />
            </div>
          </div>
          <div class="flex items-center gap-3">
            <div class="hidden items-center gap-2 rounded-full bg-surface-container-low px-3 py-1.5 md:flex">
              <span class="h-2 w-2 rounded-full bg-action-green" />
              <span class="font-label-caps text-label-caps text-on-surface">SOC-2 Validated</span>
            </div>
            <ThemeToggle />
            <button
              type="button"
              class="flex h-9 w-9 items-center justify-center rounded-xl bg-surface-container-low text-on-surface-variant transition-colors hover:bg-surface-container hover:text-on-surface"
              aria-label="Inbox"
              @click="setTab('inbox')"
            >
              <span class="material-symbols-outlined text-[20px]">notifications</span>
            </button>
            <AdminProfileMenu :admin="admin" compact @logout="logout" />
          </div>
        </div>
      </header>

      <main class="min-h-screen w-full bg-background pt-16">
        <slot />
      </main>
    </div>
    <AppToastStack />
  </div>
</template>

<script setup lang="ts">
import { ADMIN_NAV, ADMIN_NAV_GROUPS, type AdminTabId } from "~/composables/useAdminShell";

const router = useRouter();
const { admin, canAccessTab, clear } = useAdminAuth();
const {
  activeTab,
  searchQuery,
  sidebarOpen,
  openNavGroups,
  setTab,
  toggleNavGroup,
} = useAdminShell();

const navGroups = computed(() =>
  ADMIN_NAV_GROUPS.map((group) => ({
    ...group,
    items: group.items.filter((item) => canAccessTab(item.id)),
  })).filter((group) => group.items.length > 0),
);

const roleLabel = computed(() => {
  if (admin.value?.role === "state_admin") return admin.value.state ? `${admin.value.state} admin` : "State admin";
  return "Lead organizer";
});

function isGroupOpen(groupId: string) {
  return openNavGroups.value.includes(groupId);
}

function onSearch() {
  const q = searchQuery.value.trim();
  if (!q) return;
  if (canAccessTab("agents")) setTab("agents");
}

function logout() {
  clear();
  router.push("/admin/login");
}

onMounted(() => {
  // Older sessions only had command/crm/field open — surface fundraising & system.
  for (const id of ["fundraising", "system"] as const) {
    if (!openNavGroups.value.includes(id)) {
      openNavGroups.value = [...openNavGroups.value, id];
    }
  }
});

watch(
  navGroups,
  (groups) => {
    const flat = groups.flatMap((g) => g.items);
    if (!flat.some((item) => item.id === activeTab.value) && flat.length) {
      activeTab.value = flat[0].id as AdminTabId;
    }
    for (const group of groups) {
      if (group.items.some((item) => item.id === activeTab.value) && !openNavGroups.value.includes(group.id)) {
        openNavGroups.value = [...openNavGroups.value, group.id];
      }
    }
  },
  { immediate: true },
);

watch(activeTab, (tab) => {
  const group = ADMIN_NAV_GROUPS.find((g) => g.items.some((item) => item.id === tab));
  if (group && !openNavGroups.value.includes(group.id)) {
    openNavGroups.value = [...openNavGroups.value, group.id];
  }
});
</script>
