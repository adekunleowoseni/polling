<script setup lang="ts">
type Organization = {
  id: string;
  legal_name: string;
  name: string;
  slug: string;
  archetype: string;
  status: string;
  admin_count: number;
  created_at: string;
  jurisdiction: string;
};

type OrgMember = {
  id: string;
  name: string;
  email: string;
  role: string;
  disabled: boolean;
  created_at: string;
};

const emit = defineEmits<{ (e: "error", msg: string): void; (e: "message", msg: string): void }>();

const { authHeaders, apiBase } = useAdminAuth();

const loading = ref(true);
const saving = ref(false);
const saasEnabled = ref(true);
const orgs = ref<Organization[]>([]);
const selectedId = ref<string | null>(null);
const members = ref<OrgMember[]>([]);

async function loadSettings() {
  const s = await $fetch<{ saas_enabled?: boolean }>(`${apiBase}/admin/settings`, {
    headers: authHeaders(),
  });
  saasEnabled.value = s.saas_enabled !== false;
}

async function loadOrgs() {
  orgs.value = await $fetch<Organization[]>(`${apiBase}/admin/organizations`, {
    headers: authHeaders(),
  });
}

async function refresh() {
  loading.value = true;
  try {
    await Promise.all([loadSettings(), loadOrgs()]);
  } catch {
    emit("error", "Failed to load organizations.");
  } finally {
    loading.value = false;
  }
}

async function toggleSaas() {
  saving.value = true;
  try {
    const next = !saasEnabled.value;
    const s = await $fetch<{ saas_enabled: boolean }>(`${apiBase}/admin/settings`, {
      method: "PATCH",
      headers: authHeaders(),
      body: { saas_enabled: next },
    });
    saasEnabled.value = s.saas_enabled;
    emit("message", next ? "SaaS registration enabled." : "SaaS registration disabled.");
  } catch {
    emit("error", "Could not update SaaS setting.");
  } finally {
    saving.value = false;
  }
}

async function setOrgStatus(org: Organization, status: "active" | "disabled") {
  saving.value = true;
  try {
    await $fetch(`${apiBase}/admin/organizations/${org.id}`, {
      method: "PATCH",
      headers: authHeaders(),
      body: { status },
    });
    await loadOrgs();
    emit("message", `${org.name} marked ${status}.`);
  } catch {
    emit("error", "Failed to update organization.");
  } finally {
    saving.value = false;
  }
}

async function openOrg(org: Organization) {
  selectedId.value = org.id;
  try {
    members.value = await $fetch<OrgMember[]>(`${apiBase}/admin/organizations/${org.id}/users`, {
      headers: authHeaders(),
    });
  } catch {
    members.value = [];
    emit("error", "Failed to load organization users.");
  }
}

onMounted(() => void refresh());
</script>

<template>
  <div class="flex w-full flex-col gap-6 pb-10">
    <div class="flex flex-col justify-between gap-4 xl:flex-row xl:items-end">
      <div>
        <p class="font-label-caps text-on-surface-variant">PLATFORM · MULTI-TENANT</p>
        <h1 class="mt-1 font-headline-md text-2xl font-bold text-primary sm:text-3xl">Organizations (SaaS)</h1>
        <p class="mt-1 max-w-2xl text-sm text-on-surface-variant">
          Enable free organization registration, review tenant workspaces, and disable orgs that should not access HQ.
        </p>
      </div>
      <div class="flex flex-wrap gap-2">
        <button
          type="button"
          class="inline-flex h-11 items-center gap-2 rounded-xl px-4 font-button-text text-sm font-semibold shadow-sm disabled:opacity-60"
          :class="saasEnabled ? 'bg-action-green/20 text-deep-navy' : 'bg-error-container/50 text-error'"
          :disabled="saving"
          @click="toggleSaas"
        >
          <span class="material-symbols-outlined text-[18px]">{{ saasEnabled ? "toggle_on" : "toggle_off" }}</span>
          SaaS registration {{ saasEnabled ? "ON" : "OFF" }}
        </button>
        <button
          type="button"
          class="inline-flex h-11 items-center gap-2 rounded-xl bg-surface-container-lowest px-4 font-button-text text-sm font-semibold text-primary shadow-sm"
          @click="refresh"
        >
          <span class="material-symbols-outlined text-[18px]">refresh</span>
          Refresh
        </button>
      </div>
    </div>

    <div class="rounded-2xl bg-surface-container-lowest p-5 shadow-sm">
      <div class="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p class="font-label-caps text-on-surface-variant">PUBLIC REGISTER</p>
          <p class="mt-1 text-sm text-on-surface">
            New movements register at
            <NuxtLink to="/register" class="font-semibold text-electric-pink hover:underline">/register</NuxtLink>
            when SaaS is enabled.
          </p>
        </div>
        <span
          class="rounded-full px-3 py-1 font-label-caps text-[11px] font-bold"
          :class="saasEnabled ? 'bg-action-green/15 text-deep-navy' : 'bg-error-container text-error'"
        >
          {{ saasEnabled ? "ACCEPTING ORGS" : "REGISTRATION CLOSED" }}
        </span>
      </div>
    </div>

    <div v-if="loading" class="rounded-2xl bg-surface-container-lowest p-10 text-center text-sm text-outline shadow-sm">
      Loading organizations…
    </div>

    <div v-else class="grid gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
      <div class="overflow-hidden rounded-2xl bg-surface-container-lowest shadow-sm">
        <div class="border-b border-outline-variant/20 px-5 py-4">
          <h2 class="font-headline-md text-lg font-bold text-primary">{{ orgs.length }} organizations</h2>
        </div>
        <div class="divide-y divide-outline-variant/15">
          <div
            v-for="org in orgs"
            :key="org.id"
            class="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center sm:justify-between"
            :class="selectedId === org.id ? 'bg-action-green/5' : ''"
          >
            <button type="button" class="min-w-0 flex-1 text-left" @click="openOrg(org)">
              <p class="truncate font-button-text text-sm font-semibold text-on-surface">{{ org.legal_name }}</p>
              <p class="text-[11px] text-outline">
                {{ org.slug }}.e-mobilize.app · {{ org.archetype }} · {{ org.admin_count }} users ·
                {{ new Date(org.created_at).toLocaleDateString() }}
              </p>
            </button>
            <div class="flex shrink-0 items-center gap-2">
              <span
                class="rounded-full px-2 py-0.5 font-label-caps text-[10px] font-bold"
                :class="
                  org.status === 'active'
                    ? 'bg-action-green/15 text-deep-navy'
                    : 'bg-error-container/60 text-error'
                "
              >
                {{ org.status }}
              </span>
              <button
                v-if="org.status === 'active'"
                type="button"
                class="rounded-lg bg-error-container/40 px-2.5 py-1.5 font-label-caps text-[10px] font-bold text-error"
                :disabled="saving"
                @click="setOrgStatus(org, 'disabled')"
              >
                Disable
              </button>
              <button
                v-else
                type="button"
                class="rounded-lg bg-action-green/20 px-2.5 py-1.5 font-label-caps text-[10px] font-bold text-deep-navy"
                :disabled="saving"
                @click="setOrgStatus(org, 'active')"
              >
                Enable
              </button>
            </div>
          </div>
          <p v-if="!orgs.length" class="px-5 py-10 text-center text-sm text-outline">No organizations yet.</p>
        </div>
      </div>

      <aside class="rounded-2xl bg-surface-container-lowest p-5 shadow-sm">
        <h3 class="font-headline-md text-lg font-bold text-primary">Org users</h3>
        <p class="mt-1 text-xs text-on-surface-variant">Select an organization to inspect its admins and operators.</p>
        <div v-if="!selectedId" class="mt-6 text-sm text-outline">No organization selected.</div>
        <ul v-else class="mt-4 space-y-2">
          <li
            v-for="m in members"
            :key="m.id"
            class="rounded-xl bg-off-white px-3 py-2"
          >
            <p class="text-sm font-semibold text-on-surface">{{ m.name }}</p>
            <p class="text-[11px] text-outline">{{ m.email }} · {{ m.role }}{{ m.disabled ? " · disabled" : "" }}</p>
          </li>
          <li v-if="!members.length" class="text-sm text-outline">No users found.</li>
        </ul>
      </aside>
    </div>
  </div>
</template>
