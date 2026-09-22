<script setup lang="ts">
type OrgMember = {
  id: string;
  name: string;
  email: string;
  role: string;
  member_kind?: string;
  lga?: string | null;
  ward?: string | null;
  disabled: boolean;
  created_at: string;
};

type Organization = {
  id: string;
  legal_name: string;
  slug: string;
  status: string;
  archetype?: string;
  admin_count: number;
};

type MemberRole =
  | "org_admin"
  | "org_operator"
  | "director_general"
  | "campaign_manager"
  | "lga_supervisor"
  | "ward_supervisor"
  | "field_agent";

const HQ_ROLES: MemberRole[] = ["org_admin", "org_operator", "director_general", "campaign_manager"];
const FIELD_ROLES: MemberRole[] = ["lga_supervisor", "ward_supervisor", "field_agent"];

const emit = defineEmits<{ (e: "error", msg: string): void; (e: "message", msg: string): void }>();

const { authHeaders, apiBase, admin } = useAdminAuth();
const { lgas, wards, loadingWards, loadLgas, loadWards } = useOgunGeo();

const loading = ref(true);
const saving = ref(false);
const org = ref<Organization | null>(null);
const members = ref<OrgMember[]>([]);
const showForm = ref(false);
const editingId = ref<string | null>(null);
const form = reactive({
  name: "",
  email: "",
  password: "",
  role: "org_admin" as MemberRole,
  lga: "",
  ward: "",
});
const editForm = reactive({
  name: "",
  email: "",
  password: "",
  role: "org_admin" as MemberRole,
  lga: "",
  ward: "",
});

const isPoliticalOrg = computed(() => {
  const a = (org.value?.archetype || "").toLowerCase();
  return a === "political" || a === "campaign";
});

const editingMember = computed(() => members.value.find((m) => m.id === editingId.value) || null);
const editingIsAgent = computed(() => (editingMember.value?.member_kind || "admin") === "agent");
const createNeedsTurf = computed(() => FIELD_ROLES.includes(form.role));
const editNeedsTurf = computed(() => editingIsAgent.value || FIELD_ROLES.includes(editForm.role));

function roleDisplay(role: string) {
  if (role === "org_owner") return "Owner";
  if (role === "director_general") return "Director-General";
  if (role === "campaign_manager") return "Campaign Manager";
  if (role === "lga_supervisor") return "LGA Coordinator";
  if (role === "ward_supervisor") return "Ward Coordinator";
  if (role === "field_agent") return "Field Agent";
  if (role === "org_admin") return "Admin";
  if (role === "org_operator") return "Operator";
  return role;
}

function isFieldRole(role: string) {
  return FIELD_ROLES.includes(role as MemberRole);
}

function resetCreateForm() {
  form.name = "";
  form.email = "";
  form.password = "";
  form.role = "org_admin";
  form.lga = "";
  form.ward = "";
}

async function onCreateLgaChange() {
  form.ward = "";
  await loadWards(form.lga);
}

async function onEditLgaChange() {
  editForm.ward = "";
  await loadWards(editForm.lga);
}

function openEdit(m: OrgMember) {
  if (m.role === "org_owner") {
    emit("error", "Cannot edit the organization owner this way.");
    return;
  }
  showForm.value = false;
  editingId.value = m.id;
  editForm.name = m.name;
  editForm.email = m.email;
  editForm.password = "";
  editForm.lga = m.lga || "";
  editForm.ward = m.ward || "";
  const allowed = m.member_kind === "agent" ? FIELD_ROLES : HQ_ROLES;
  editForm.role = (allowed.includes(m.role as MemberRole) ? m.role : allowed[0]) as MemberRole;
  if (editForm.lga) void loadWards(editForm.lga);
}

function cancelEdit() {
  editingId.value = null;
  editForm.name = "";
  editForm.email = "";
  editForm.password = "";
  editForm.role = "org_admin";
  editForm.lga = "";
  editForm.ward = "";
}

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
  if (createNeedsTurf.value) {
    if (!form.lga) {
      emit("error", "Select an LGA for this field role.");
      return;
    }
    if (form.role !== "lga_supervisor" && !form.ward) {
      emit("error", "Select a ward for Ward Coordinator / Field Agent.");
      return;
    }
  }
  saving.value = true;
  try {
    const body: Record<string, string> = {
      name: form.name.trim(),
      email: form.email.trim(),
      password: form.password,
      role: form.role,
    };
    if (createNeedsTurf.value) {
      body.lga = form.lga;
      if (form.role !== "lga_supervisor" && form.ward) body.ward = form.ward;
    }
    await $fetch(`${apiBase}/admin/organizations/me/users`, {
      method: "POST",
      headers: authHeaders(),
      body,
    });
    showForm.value = false;
    resetCreateForm();
    await refresh();
    emit(
      "message",
      createNeedsTurf.value
        ? "Field agent created — they sign in on the mobile app."
        : "Organization user created.",
    );
  } catch (e: unknown) {
    const detail = (e as { data?: { detail?: string } })?.data?.detail;
    emit("error", typeof detail === "string" ? detail : "Failed to create user.");
  } finally {
    saving.value = false;
  }
}

async function saveEdit() {
  if (!editingId.value) return;
  if (!editForm.name.trim() || !editForm.email.trim()) {
    emit("error", "Name and email are required.");
    return;
  }
  if (editForm.password && editForm.password.length < 8) {
    emit("error", "New password must be at least 8 characters.");
    return;
  }
  if (editNeedsTurf.value) {
    if (!editForm.lga) {
      emit("error", "Select an LGA for this field role.");
      return;
    }
    if (editForm.role !== "lga_supervisor" && !editForm.ward) {
      emit("error", "Select a ward for Ward Coordinator / Field Agent.");
      return;
    }
  }
  saving.value = true;
  try {
    const body: Record<string, string> = {
      name: editForm.name.trim(),
      email: editForm.email.trim(),
      role: editForm.role,
    };
    if (editForm.password.trim()) {
      body.password = editForm.password.trim();
    }
    if (editNeedsTurf.value) {
      body.lga = editForm.lga;
      if (editForm.role !== "lga_supervisor") body.ward = editForm.ward;
    }
    await $fetch(`${apiBase}/admin/organizations/me/users/${editingId.value}`, {
      method: "PATCH",
      headers: authHeaders(),
      body,
    });
    cancelEdit();
    await refresh();
    emit("message", "User details and role updated.");
  } catch (e: unknown) {
    const detail = (e as { data?: { detail?: string } })?.data?.detail;
    emit("error", typeof detail === "string" ? detail : "Failed to update user.");
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
    emit("message", m.disabled ? "User enabled." : "User disabled.");
  } catch (e: unknown) {
    const detail = (e as { data?: { detail?: string } })?.data?.detail;
    emit("error", typeof detail === "string" ? detail : "Failed to update user.");
  } finally {
    saving.value = false;
  }
}

onMounted(async () => {
  await loadLgas();
  await refresh();
});
</script>

<template>
  <div class="flex w-full flex-col gap-6 pb-10">
    <div class="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
      <div>
        <p class="font-label-caps text-on-surface-variant">{{ org?.slug || admin?.org_name || "TENANT" }}</p>
        <h1 class="mt-1 font-headline-md text-2xl font-bold text-primary">Org Users &amp; Roles</h1>
        <p class="mt-1 text-sm text-on-surface-variant">
          Create and edit users for {{ org?.legal_name || "your organization" }}.
          <template v-if="isPoliticalOrg">
            HQ: Director-General &amp; Campaign Manager (full admin). Field: LGA Coordinator, Ward Coordinator &amp;
            Field Agent (mobile app).
          </template>
          <template v-else>
            Admins manage roles; operators get a limited HQ surface.
          </template>
        </p>
      </div>
      <button
        type="button"
        class="inline-flex h-11 items-center gap-2 rounded-xl bg-electric-pink px-4 font-button-text text-sm font-semibold text-pure-white shadow-sm"
        @click="
          showForm = !showForm;
          if (showForm) cancelEdit();
        "
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
            <option v-if="isPoliticalOrg" value="director_general">Director-General (full admin)</option>
            <option v-if="isPoliticalOrg" value="campaign_manager">Campaign Manager (full admin)</option>
            <option v-if="isPoliticalOrg" value="lga_supervisor">LGA Coordinator (mobile)</option>
            <option v-if="isPoliticalOrg" value="ward_supervisor">Ward Coordinator (mobile)</option>
            <option v-if="isPoliticalOrg" value="field_agent">Field Agent (mobile)</option>
            <option value="org_operator">Operator (limited)</option>
          </select>
        </label>
        <label v-if="createNeedsTurf" class="block text-xs font-semibold text-outline">
          LGA
          <select
            v-model="form.lga"
            class="mt-1 w-full rounded-xl bg-off-white px-3 py-2.5 text-sm text-on-surface"
            @change="onCreateLgaChange"
          >
            <option value="">Select LGA</option>
            <option v-for="l in lgas" :key="l" :value="l">{{ l }}</option>
          </select>
        </label>
        <label v-if="createNeedsTurf && form.role !== 'lga_supervisor'" class="block text-xs font-semibold text-outline">
          Ward
          <select
            v-model="form.ward"
            :disabled="!form.lga || loadingWards"
            class="mt-1 w-full rounded-xl bg-off-white px-3 py-2.5 text-sm text-on-surface disabled:opacity-60"
          >
            <option value="">{{ loadingWards ? "Loading…" : "Select ward" }}</option>
            <option v-for="w in wards" :key="w" :value="w">{{ w }}</option>
          </select>
        </label>
      </div>
      <p v-if="createNeedsTurf" class="mt-3 text-xs text-on-surface-variant">
        Field roles create a mobile agent account — they sign in on the e-mobilize app, not HQ admin.
      </p>
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
          {{ saving ? "Saving…" : createNeedsTurf ? "Create field agent" : "Create user" }}
        </button>
      </div>
    </div>

    <div v-if="editingMember" class="rounded-2xl bg-surface-container-lowest p-5 shadow-sm">
      <h2 class="font-button-text text-lg font-bold text-primary">Edit user</h2>
      <p class="mt-1 text-xs text-on-surface-variant">
        Update details and role for {{ editingMember.name }}. Leave password blank to keep the current one.
      </p>
      <div class="mt-4 grid gap-3 sm:grid-cols-2">
        <label class="block text-xs font-semibold text-outline">
          Full name
          <input v-model="editForm.name" class="mt-1 w-full rounded-xl bg-off-white px-3 py-2.5 text-sm text-on-surface" />
        </label>
        <label class="block text-xs font-semibold text-outline">
          Email
          <input
            v-model="editForm.email"
            type="email"
            class="mt-1 w-full rounded-xl bg-off-white px-3 py-2.5 text-sm text-on-surface"
          />
        </label>
        <label class="block text-xs font-semibold text-outline">
          New password (optional)
          <input
            v-model="editForm.password"
            type="password"
            minlength="8"
            placeholder="Leave blank to keep current"
            class="mt-1 w-full rounded-xl bg-off-white px-3 py-2.5 text-sm text-on-surface"
          />
        </label>
        <label class="block text-xs font-semibold text-outline">
          Role
          <select v-model="editForm.role" class="mt-1 w-full rounded-xl bg-off-white px-3 py-2.5 text-sm text-on-surface">
            <template v-if="editingIsAgent">
              <option value="lga_supervisor">LGA Coordinator (mobile)</option>
              <option value="ward_supervisor">Ward Coordinator (mobile)</option>
              <option value="field_agent">Field Agent (mobile)</option>
            </template>
            <template v-else>
              <option value="org_admin">Admin (full org HQ)</option>
              <option v-if="isPoliticalOrg" value="director_general">Director-General (full admin)</option>
              <option v-if="isPoliticalOrg" value="campaign_manager">Campaign Manager (full admin)</option>
              <option value="org_operator">Operator (limited)</option>
            </template>
          </select>
        </label>
        <label v-if="editNeedsTurf" class="block text-xs font-semibold text-outline">
          LGA
          <select
            v-model="editForm.lga"
            class="mt-1 w-full rounded-xl bg-off-white px-3 py-2.5 text-sm text-on-surface"
            @change="onEditLgaChange"
          >
            <option value="">Select LGA</option>
            <option v-for="l in lgas" :key="l" :value="l">{{ l }}</option>
          </select>
        </label>
        <label v-if="editNeedsTurf && editForm.role !== 'lga_supervisor'" class="block text-xs font-semibold text-outline">
          Ward
          <select
            v-model="editForm.ward"
            :disabled="!editForm.lga || loadingWards"
            class="mt-1 w-full rounded-xl bg-off-white px-3 py-2.5 text-sm text-on-surface disabled:opacity-60"
          >
            <option value="">{{ loadingWards ? "Loading…" : "Select ward" }}</option>
            <option v-for="w in wards" :key="w" :value="w">{{ w }}</option>
          </select>
        </label>
      </div>
      <div class="mt-4 flex justify-end gap-2">
        <button type="button" class="h-10 rounded-xl bg-surface-container px-4 text-sm font-semibold" @click="cancelEdit">
          Cancel
        </button>
        <button
          type="button"
          class="h-10 rounded-xl bg-electric-pink px-4 text-sm font-semibold text-pure-white disabled:opacity-60"
          :disabled="saving"
          @click="saveEdit"
        >
          {{ saving ? "Saving…" : "Save changes" }}
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
          :class="editingId === m.id ? 'bg-action-green/5' : ''"
        >
          <div>
            <p class="font-button-text text-sm font-semibold text-on-surface">{{ m.name }}</p>
            <p class="text-[11px] text-outline">
              {{ m.email }} · {{ roleDisplay(m.role) }}
              <template v-if="isFieldRole(m.role) || m.member_kind === 'agent'">
                · mobile
                <template v-if="m.lga"> · {{ [m.ward, m.lga].filter(Boolean).join(", ") }}</template>
              </template>
            </p>
          </div>
          <div class="flex flex-wrap items-center gap-2">
            <span
              class="rounded-full px-2 py-0.5 font-label-caps text-[10px] font-bold"
              :class="m.disabled ? 'bg-error-container/50 text-error' : 'bg-action-green/15 text-deep-navy'"
            >
              {{ m.disabled ? "disabled" : "active" }}
            </span>
            <button
              v-if="m.role !== 'org_owner'"
              type="button"
              class="rounded-lg bg-electric-pink/10 px-2.5 py-1.5 font-label-caps text-[10px] font-bold text-electric-pink"
              :disabled="saving"
              @click="openEdit(m)"
            >
              Edit
            </button>
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
