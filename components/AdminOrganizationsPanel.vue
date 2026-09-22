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
  universe_size?: string;
  enclave_region?: string;
  dual_signatory?: boolean;
  is_election_workspace?: boolean;
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

const { authHeaders, apiBase, persistSession } = useAdminAuth();
const { loadOrganizations: reloadOrgSwitcher, selectOrganization } = useAdminOrgContext();
const { setTab } = useAdminShell();

const deleting = ref(false);
const deletingId = ref<string | null>(null);
const loading = ref(true);
const saving = ref(false);
const entering = ref(false);
const saasEnabled = ref(true);
const orgs = ref<Organization[]>([]);
const selectedId = ref<string | null>(null);
const members = ref<OrgMember[]>([]);
const editing = ref(false);

const draft = reactive({
  legal_name: "",
  name: "",
  slug: "",
  archetype: "campaign",
  jurisdiction: "",
  universe_size: "",
  enclave_region: "",
  dual_signatory: true,
  is_election_workspace: false,
  status: "active",
});

const selectedOrg = computed(() => orgs.value.find((o) => o.id === selectedId.value) || null);

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
  await reloadOrgSwitcher().catch(() => undefined);
}

async function refresh() {
  loading.value = true;
  try {
    await Promise.all([loadSettings(), loadOrgs()]);
    if (selectedId.value && !orgs.value.some((o) => o.id === selectedId.value)) {
      selectedId.value = null;
      members.value = [];
      editing.value = false;
    }
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

async function deleteOrg(org: Organization) {
  const confirmMsg =
    `Permanently delete "${org.name}"?\n\n` +
    `This removes all org users, agents, voters, packages, CRM data, feeds, recordings, and related files. This cannot be undone.`;
  if (!window.confirm(confirmMsg)) return;
  const typed = window.prompt(`Type the slug "${org.slug}" to confirm deletion:`);
  if (typed !== org.slug) {
    emit("error", "Deletion cancelled — slug did not match.");
    return;
  }
  deleting.value = true;
  deletingId.value = org.id;
  try {
    const result = await $fetch<{
      name: string;
      agents: number;
      voters: number;
      files_removed: number;
    }>(`${apiBase}/admin/organizations/${org.id}`, {
      method: "DELETE",
      headers: authHeaders(),
    });
    if (selectedId.value === org.id) {
      selectedId.value = null;
      members.value = [];
      editing.value = false;
    }
    await loadOrgs();
    emit(
      "message",
      `Deleted ${result.name} (${result.agents} agents, ${result.voters} voters, ${result.files_removed} files cleaned).`,
    );
  } catch (e: unknown) {
    const detail = (e as { data?: { detail?: string } })?.data?.detail;
    emit("error", typeof detail === "string" ? detail : "Failed to delete organization.");
  } finally {
    deleting.value = false;
    deletingId.value = null;
  }
}

function fillDraft(org: Organization) {
  draft.legal_name = org.legal_name || org.name;
  draft.name = org.name;
  draft.slug = org.slug;
  draft.archetype = org.archetype || "campaign";
  draft.jurisdiction = org.jurisdiction || "";
  draft.universe_size = org.universe_size || "";
  draft.enclave_region = org.enclave_region || "";
  draft.dual_signatory = org.dual_signatory !== false;
  draft.is_election_workspace = !!org.is_election_workspace;
  draft.status = org.status || "active";
}

async function openOrg(org: Organization) {
  selectedId.value = org.id;
  editing.value = false;
  fillDraft(org);
  try {
    members.value = await $fetch<OrgMember[]>(`${apiBase}/admin/organizations/${org.id}/users`, {
      headers: authHeaders(),
    });
  } catch {
    members.value = [];
    emit("error", "Failed to load organization users.");
  }
}

async function enterOrg(org: Organization) {
  entering.value = true;
  try {
    const session = await $fetch<{ api_token: string; admin: Record<string, unknown> }>(
      `${apiBase}/admin/organizations/${org.id}/impersonate`,
      {
        method: "POST",
        headers: authHeaders(),
      },
    );
    persistSession(session as never);
    selectOrganization(org.id);
    setTab("overview");
    emit("message", `Entered ${org.name}. You can manage this organization as Super Admin.`);
  } catch (e: unknown) {
    const detail = (e as { data?: { detail?: string } })?.data?.detail;
    emit("error", typeof detail === "string" ? detail : "Could not enter organization.");
  } finally {
    entering.value = false;
  }
}

function startEdit() {
  if (!selectedOrg.value) return;
  fillDraft(selectedOrg.value);
  editing.value = true;
}

async function saveOrg() {
  if (!selectedId.value) return;
  if (!draft.name.trim() || !draft.legal_name.trim() || !draft.slug.trim()) {
    emit("error", "Name, legal name, and slug are required.");
    return;
  }
  saving.value = true;
  try {
    const updated = await $fetch<Organization>(`${apiBase}/admin/organizations/${selectedId.value}`, {
      method: "PATCH",
      headers: authHeaders(),
      body: {
        legal_name: draft.legal_name.trim(),
        name: draft.name.trim(),
        slug: draft.slug.trim(),
        archetype: draft.archetype,
        jurisdiction: draft.jurisdiction.trim(),
        universe_size: draft.universe_size.trim(),
        enclave_region: draft.enclave_region.trim(),
        dual_signatory: draft.dual_signatory,
        is_election_workspace: draft.is_election_workspace,
        status: draft.status,
      },
    });
    await loadOrgs();
    selectedId.value = updated.id;
    fillDraft(updated);
    editing.value = false;
    emit("message", `${updated.name} updated.`);
  } catch (e: unknown) {
    const detail = (e as { data?: { detail?: string } })?.data?.detail;
    emit("error", typeof detail === "string" ? detail : "Failed to save organization.");
  } finally {
    saving.value = false;
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
          Manage tenant workspaces, rename the Ogun election org, and control public registration.
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

    <div v-else class="grid gap-4 xl:grid-cols-[minmax(0,1fr)_420px]">
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
              <p class="truncate font-button-text text-sm font-semibold text-on-surface">{{ org.name }}</p>
              <p class="text-[11px] text-outline">
                {{ org.slug }} · {{ org.jurisdiction || "—" }} · {{ org.admin_count }} users
                <span v-if="org.is_election_workspace"> · election workspace</span>
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
                type="button"
                class="rounded-lg bg-electric-pink px-2.5 py-1.5 font-label-caps text-[10px] font-bold text-pure-white disabled:opacity-60"
                :disabled="entering || org.status !== 'active'"
                @click.stop="enterOrg(org)"
              >
                Enter
              </button>
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
                :disabled="saving || deleting"
                @click="setOrgStatus(org, 'active')"
              >
                Enable
              </button>
              <button
                type="button"
                class="rounded-lg bg-error px-2.5 py-1.5 font-label-caps text-[10px] font-bold text-pure-white disabled:opacity-60"
                :disabled="saving || deleting"
                @click.stop="deleteOrg(org)"
              >
                {{ deletingId === org.id ? "Deleting…" : "Delete" }}
              </button>
            </div>
          </div>
          <p v-if="!orgs.length" class="px-5 py-10 text-center text-sm text-outline">No organizations yet.</p>
        </div>
      </div>

      <aside class="space-y-4">
        <div class="rounded-2xl bg-surface-container-lowest p-5 shadow-sm">
          <div class="flex items-start justify-between gap-3">
            <div>
              <h3 class="font-headline-md text-lg font-bold text-primary">Organization profile</h3>
              <p class="mt-1 text-xs text-on-surface-variant">
                Select an org to edit, or enter it to manage agents, users, and packages.
              </p>
            </div>
            <div v-if="selectedOrg && !editing" class="flex flex-col gap-2">
              <button
                type="button"
                class="inline-flex items-center justify-center gap-1 rounded-lg bg-electric-pink px-3 py-1.5 text-xs font-semibold text-pure-white disabled:opacity-60"
                :disabled="entering || selectedOrg.status !== 'active'"
                @click="enterOrg(selectedOrg)"
              >
                <span class="material-symbols-outlined text-[14px]">login</span>
                {{ entering ? "Entering…" : "Enter & manage" }}
              </button>
              <button
                type="button"
                class="rounded-lg bg-surface-container px-3 py-1.5 text-xs font-semibold text-primary"
                @click="startEdit"
              >
                Edit profile
              </button>
              <button
                type="button"
                class="rounded-lg bg-error px-3 py-1.5 text-xs font-semibold text-pure-white disabled:opacity-60"
                :disabled="deleting"
                @click="deleteOrg(selectedOrg)"
              >
                {{ deleting ? "Deleting…" : "Delete organization" }}
              </button>
            </div>
          </div>

          <div v-if="!selectedOrg" class="mt-6 text-sm text-outline">No organization selected.</div>

          <div v-else-if="!editing" class="mt-4 space-y-2 text-sm">
            <p><span class="text-outline">Display name:</span> {{ selectedOrg.name }}</p>
            <p><span class="text-outline">Legal name:</span> {{ selectedOrg.legal_name }}</p>
            <p><span class="text-outline">Slug:</span> {{ selectedOrg.slug }}</p>
            <p><span class="text-outline">Jurisdiction:</span> {{ selectedOrg.jurisdiction || "—" }}</p>
            <p><span class="text-outline">Archetype:</span> {{ selectedOrg.archetype }}</p>
            <p>
              <span class="text-outline">Election workspace:</span>
              {{ selectedOrg.is_election_workspace ? "Yes" : "No" }}
            </p>
          </div>

          <form v-else class="mt-4 grid gap-3" @submit.prevent="saveOrg">
            <label class="text-sm">
              <span class="font-label-caps text-[11px] uppercase text-outline">Display name</span>
              <input v-model="draft.name" class="mt-1 w-full rounded-xl bg-off-white px-3 py-2.5 outline-none" required />
            </label>
            <label class="text-sm">
              <span class="font-label-caps text-[11px] uppercase text-outline">Legal name</span>
              <input v-model="draft.legal_name" class="mt-1 w-full rounded-xl bg-off-white px-3 py-2.5 outline-none" required />
            </label>
            <label class="text-sm">
              <span class="font-label-caps text-[11px] uppercase text-outline">Slug</span>
              <input v-model="draft.slug" class="mt-1 w-full rounded-xl bg-off-white px-3 py-2.5 outline-none" required />
            </label>
            <label class="text-sm">
              <span class="font-label-caps text-[11px] uppercase text-outline">Jurisdiction</span>
              <input v-model="draft.jurisdiction" class="mt-1 w-full rounded-xl bg-off-white px-3 py-2.5 outline-none" />
            </label>
            <label class="text-sm">
              <span class="font-label-caps text-[11px] uppercase text-outline">Archetype</span>
              <select v-model="draft.archetype" class="mt-1 w-full rounded-xl bg-off-white px-3 py-2.5 outline-none">
                <option value="political">Political campaign</option>
                <option value="campaign">Campaign (legacy)</option>
                <option value="nonprofit">Nonprofit campaign</option>
                <option value="awareness">Awareness / support</option>
                <option value="union">Union / association</option>
              </select>
            </label>
            <label class="text-sm">
              <span class="font-label-caps text-[11px] uppercase text-outline">Universe size</span>
              <input v-model="draft.universe_size" class="mt-1 w-full rounded-xl bg-off-white px-3 py-2.5 outline-none" />
            </label>
            <label class="text-sm">
              <span class="font-label-caps text-[11px] uppercase text-outline">Enclave region</span>
              <input v-model="draft.enclave_region" class="mt-1 w-full rounded-xl bg-off-white px-3 py-2.5 outline-none" />
            </label>
            <label class="flex items-center gap-2 text-sm text-on-surface">
              <input v-model="draft.dual_signatory" type="checkbox" class="rounded" />
              Dual signatory
            </label>
            <label class="flex items-center gap-2 text-sm text-on-surface">
              <input v-model="draft.is_election_workspace" type="checkbox" class="rounded" />
              Election workspace (shows live feeds / units / votes on overview)
            </label>
            <label class="text-sm">
              <span class="font-label-caps text-[11px] uppercase text-outline">Status</span>
              <select v-model="draft.status" class="mt-1 w-full rounded-xl bg-off-white px-3 py-2.5 outline-none">
                <option value="active">active</option>
                <option value="disabled">disabled</option>
              </select>
            </label>
            <div class="flex justify-end gap-2 pt-1">
              <button type="button" class="rounded-xl bg-surface-container px-4 py-2 text-sm" @click="editing = false">
                Cancel
              </button>
              <button
                type="submit"
                class="rounded-xl bg-electric-pink px-4 py-2 text-sm font-semibold text-pure-white disabled:opacity-50"
                :disabled="saving"
              >
                {{ saving ? "Saving…" : "Save organization" }}
              </button>
            </div>
          </form>
        </div>

        <div class="rounded-2xl bg-surface-container-lowest p-5 shadow-sm">
          <h3 class="font-headline-md text-lg font-bold text-primary">Org users</h3>
          <p class="mt-1 text-xs text-on-surface-variant">Admins and operators linked to this workspace.</p>
          <div v-if="!selectedId" class="mt-6 text-sm text-outline">No organization selected.</div>
          <ul v-else class="mt-4 space-y-2">
            <li v-for="m in members" :key="m.id" class="rounded-xl bg-off-white px-3 py-2">
              <p class="text-sm font-semibold text-on-surface">{{ m.name }}</p>
              <p class="text-[11px] text-outline">{{ m.email }} · {{ m.role }}{{ m.disabled ? " · disabled" : "" }}</p>
            </li>
            <li v-if="!members.length" class="text-sm text-outline">No users found.</li>
          </ul>
        </div>
      </aside>
    </div>
  </div>
</template>
