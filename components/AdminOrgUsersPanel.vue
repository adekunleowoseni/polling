<script setup lang="ts">
type OrgMember = {
  id: string;
  name: string;
  email: string;
  role: string;
  disabled: boolean;
  created_at: string;
};

type Organization = {
  id: string;
  legal_name: string;
  slug: string;
  status: string;
  admin_count: number;
};

const emit = defineEmits<{ (e: "error", msg: string): void; (e: "message", msg: string): void }>();

const { authHeaders, apiBase, admin } = useAdminAuth();

const loading = ref(true);
const saving = ref(false);
const org = ref<Organization | null>(null);
const members = ref<OrgMember[]>([]);
const showForm = ref(false);
const form = reactive({
  name: "",
  email: "",
  password: "",
  role: "org_admin" as "org_admin" | "org_operator",
});

async function refresh() {
  loading.value = true;
  try {
    org.value = await $fetch<Organization>(`${apiBase}/admin/organizations/me`, {
      headers: authHeaders(),
    });
    members.value = await $fetch<OrgMember[]>(`${apiBase}/admin/organizations/me/users`, {
      headers: authHeaders(),
    });
  } catch {
    org.value = null;
    members.value = [];
    emit("error", "Could not load organization users. This tab is for tenant org admins.");
  } finally {
    loading.value = false;
  }
}

async function createUser() {
  if (!form.name.trim() || !form.email.trim() || form.password.length < 8) {
    emit("error", "Name, email, and password (8+ chars) are required.");
    return;
  }
  saving.value = true;
  try {
    await $fetch(`${apiBase}/admin/organizations/me/users`, {
      method: "POST",
      headers: authHeaders(),
      body: { ...form },
    });
    showForm.value = false;
    form.name = "";
    form.email = "";
    form.password = "";
    form.role = "org_admin";
    await refresh();
    emit("message", "Organization user created.");
  } catch (e: unknown) {
    const detail = (e as { data?: { detail?: string } })?.data?.detail;
    emit("error", typeof detail === "string" ? detail : "Failed to create user.");
  } finally {
    saving.value = false;
  }
}

async function toggleDisabled(m: OrgMember) {
  if (m.role === "org_owner") {
    emit("error", "Cannot disable the organization owner.");
    return;
  }
  saving.value = true;
  try {
    await $fetch(`${apiBase}/admin/organizations/me/users/${m.id}`, {
      method: "PATCH",
      headers: authHeaders(),
      body: { disabled: !m.disabled },
    });
    await refresh();
    emit("message", m.disabled ? "User re-enabled." : "User disabled.");
  } catch {
    emit("error", "Failed to update user.");
  } finally {
    saving.value = false;
  }
}

onMounted(() => void refresh());
</script>

<template>
  <div class="flex w-full flex-col gap-6 pb-10">
    <div class="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
      <div>
        <p class="font-label-caps text-on-surface-variant">{{ org?.slug || admin?.org_name || "TENANT" }}</p>
        <h1 class="mt-1 font-headline-md text-2xl font-bold text-primary">Org Users &amp; Roles</h1>
        <p class="mt-1 text-sm text-on-surface-variant">
          Create admins and operators for {{ org?.legal_name || "your organization" }}. Owners manage roles; operators
          get a limited HQ surface.
        </p>
      </div>
      <button
        type="button"
        class="inline-flex h-11 items-center gap-2 rounded-xl bg-electric-pink px-4 font-button-text text-sm font-semibold text-pure-white shadow-sm"
        @click="showForm = !showForm"
      >
        <span class="material-symbols-outlined text-[18px]">person_add</span>
        Add user
      </button>
    </div>

    <div v-if="showForm" class="rounded-2xl bg-surface-container-lowest p-5 shadow-sm">
      <h2 class="font-button-text text-lg font-bold text-primary">New organization user</h2>
      <div class="mt-4 grid gap-3 sm:grid-cols-2">
        <label class="block text-xs font-semibold text-outline">
          Full name
          <input v-model="form.name" class="mt-1 w-full rounded-xl bg-off-white px-3 py-2.5 text-sm text-on-surface" />
        </label>
        <label class="block text-xs font-semibold text-outline">
          Email
          <input
            v-model="form.email"
            type="email"
            class="mt-1 w-full rounded-xl bg-off-white px-3 py-2.5 text-sm text-on-surface"
          />
        </label>
        <label class="block text-xs font-semibold text-outline">
          Temporary password
          <input
            v-model="form.password"
            type="password"
            minlength="8"
            class="mt-1 w-full rounded-xl bg-off-white px-3 py-2.5 text-sm text-on-surface"
          />
        </label>
        <label class="block text-xs font-semibold text-outline">
          Role
          <select v-model="form.role" class="mt-1 w-full rounded-xl bg-off-white px-3 py-2.5 text-sm text-on-surface">
            <option value="org_admin">Admin (full org HQ)</option>
            <option value="org_operator">Operator (limited)</option>
          </select>
        </label>
      </div>
      <div class="mt-4 flex justify-end gap-2">
        <button type="button" class="h-10 rounded-xl bg-surface-container px-4 text-sm font-semibold" @click="showForm = false">
          Cancel
        </button>
        <button
          type="button"
          class="h-10 rounded-xl bg-electric-pink px-4 text-sm font-semibold text-pure-white disabled:opacity-60"
          :disabled="saving"
          @click="createUser"
        >
          {{ saving ? "Saving…" : "Create user" }}
        </button>
      </div>
    </div>

    <div v-if="loading" class="rounded-2xl bg-surface-container-lowest p-10 text-center text-sm text-outline">
      Loading users…
    </div>
    <div v-else class="overflow-hidden rounded-2xl bg-surface-container-lowest shadow-sm">
      <div class="divide-y divide-outline-variant/15">
        <div
          v-for="m in members"
          :key="m.id"
          class="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center sm:justify-between"
        >
          <div>
            <p class="font-button-text text-sm font-semibold text-on-surface">{{ m.name }}</p>
            <p class="text-[11px] text-outline">{{ m.email }} · {{ m.role }}</p>
          </div>
          <div class="flex items-center gap-2">
            <span
              class="rounded-full px-2 py-0.5 font-label-caps text-[10px] font-bold"
              :class="m.disabled ? 'bg-error-container/50 text-error' : 'bg-action-green/15 text-deep-navy'"
            >
              {{ m.disabled ? "disabled" : "active" }}
            </span>
            <button
              v-if="m.role !== 'org_owner'"
              type="button"
              class="rounded-lg bg-surface-container px-2.5 py-1.5 font-label-caps text-[10px] font-bold text-primary"
              :disabled="saving"
              @click="toggleDisabled(m)"
            >
              {{ m.disabled ? "Enable" : "Disable" }}
            </button>
          </div>
        </div>
        <p v-if="!members.length" class="px-5 py-10 text-center text-sm text-outline">No users yet.</p>
      </div>
    </div>
  </div>
</template>
