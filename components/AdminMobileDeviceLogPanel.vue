<script setup lang="ts">
export type MobileDeviceLogRow = {
  id: string;
  account_kind: string;
  account_id: string | null;
  account_name: string;
  account_email: string;
  account_label: string | null;
  org_id: string | null;
  org_name: string | null;
  device_id: string | null;
  app_version: string | null;
  platform: string | null;
  os_version: string | null;
  device_model: string | null;
  auth_method: string;
  event: string;
  ip: string | null;
  created_at: string;
};

const emit = defineEmits<{
  (e: "error", msg: string): void;
  (e: "message", msg: string): void;
}>();

const { authHeaders, apiBase, admin, isSuperAdmin, isImpersonating } = useAdminAuth();

const loading = ref(false);
const rows = ref<MobileDeviceLogRow[]>([]);
const search = ref("");
let searchTimer: ReturnType<typeof setTimeout> | null = null;

const title = computed(() =>
  isSuperAdmin.value && !isImpersonating.value
    ? "Mobile device log (all logins)"
    : "Mobile device log (organization users)",
);

const subtitle = computed(() =>
  isSuperAdmin.value && !isImpersonating.value
    ? "Every agent, voter, member, and donor sign-in from the mobile app."
    : "Sign-ins from mobile users who belong to this organization (including older logins before org tagging).",
);

function formatWhen(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function platformLabel(row: MobileDeviceLogRow) {
  const parts = [row.platform, row.os_version, row.device_model].filter(Boolean);
  return parts.length ? parts.join(" · ") : "—";
}

function kindClass(kind: string) {
  if (kind === "agent") return "bg-electric-pink/15 text-electric-pink";
  if (kind === "donor") return "bg-action-green/15 text-action-green";
  if (kind === "member") return "bg-secondary/15 text-secondary";
  return "bg-surface-container-high text-on-surface-variant";
}

async function refresh() {
  loading.value = true;
  try {
    const query: Record<string, string | number> = { limit: 250 };
    if (search.value.trim()) query.q = search.value.trim();
    // Super admin: show all logins by default. Org filter only when impersonating
    // (tenant scope). Do not silently hide rows via the global org dropdown.
    rows.value = await $fetch<MobileDeviceLogRow[]>(`${apiBase}/admin/mobile-device-log`, {
      headers: authHeaders(),
      query,
    });
  } catch (e: unknown) {
    const msg =
      e && typeof e === "object" && "data" in e
        ? String((e as { data?: { detail?: string } }).data?.detail || "Could not load device log.")
        : "Could not load device log.";
    emit("error", msg);
  } finally {
    loading.value = false;
  }
}

function onSearchInput() {
  if (searchTimer) clearTimeout(searchTimer);
  searchTimer = setTimeout(() => void refresh(), 280);
}

onMounted(() => void refresh());
watch(isImpersonating, () => void refresh());
</script>

<template>
  <div class="flex flex-col gap-5">
    <div class="flex flex-wrap items-end justify-between gap-3">
      <div>
        <h2 class="font-headline-md text-xl font-bold text-primary">{{ title }}</h2>
        <p class="mt-1 text-sm text-outline">{{ subtitle }}</p>
        <p v-if="admin?.org_name" class="mt-1 text-xs text-on-surface-variant">
          Organization: {{ admin.org_name }}
        </p>
      </div>
      <div class="flex flex-wrap items-center gap-2">
        <input
          v-model="search"
          type="search"
          placeholder="Search name, email, device…"
          class="w-56 rounded-xl bg-off-white px-3 py-2.5 text-sm text-on-surface outline-none ring-1 ring-outline-variant/40 focus:ring-electric-pink"
          @input="onSearchInput"
        />
        <button
          type="button"
          class="rounded-xl bg-electric-pink px-4 py-2.5 text-sm font-semibold text-pure-white disabled:opacity-50"
          :disabled="loading"
          @click="refresh"
        >
          {{ loading ? "Loading…" : "Refresh" }}
        </button>
      </div>
    </div>

    <div class="overflow-hidden rounded-2xl bg-surface-container-lowest shadow-sm">
      <div class="overflow-x-auto">
        <table class="min-w-full text-left text-sm">
          <thead class="border-b border-outline-variant/30 bg-surface-container-low text-xs uppercase tracking-wide text-outline">
            <tr>
              <th class="px-4 py-3 font-semibold">When</th>
              <th class="px-4 py-3 font-semibold">User</th>
              <th class="px-4 py-3 font-semibold">Kind</th>
              <th class="px-4 py-3 font-semibold">Organization</th>
              <th class="px-4 py-3 font-semibold">Device</th>
              <th class="px-4 py-3 font-semibold">Auth</th>
              <th class="px-4 py-3 font-semibold">IP</th>
            </tr>
          </thead>
          <tbody>
            <tr v-if="loading && !rows.length">
              <td colspan="7" class="px-4 py-10 text-center text-on-surface-variant">Loading device log…</td>
            </tr>
            <tr v-else-if="!rows.length">
              <td colspan="7" class="px-4 py-10 text-center text-on-surface-variant">
                No mobile sign-ins recorded yet. Entries appear when users log in or sign up on the app.
              </td>
            </tr>
            <tr
              v-for="row in rows"
              :key="row.id"
              class="border-b border-outline-variant/20 last:border-0 hover:bg-surface-container-low/60"
            >
              <td class="whitespace-nowrap px-4 py-3 text-on-surface-variant">{{ formatWhen(row.created_at) }}</td>
              <td class="px-4 py-3">
                <p class="font-semibold text-on-surface">{{ row.account_name }}</p>
                <p class="text-xs text-outline">{{ row.account_email }}</p>
                <p v-if="row.account_label" class="mt-0.5 text-[11px] uppercase tracking-wide text-on-surface-variant">
                  {{ row.account_label }}
                </p>
              </td>
              <td class="px-4 py-3">
                <span class="inline-flex rounded-full px-2.5 py-1 text-xs font-semibold capitalize" :class="kindClass(row.account_kind)">
                  {{ row.account_kind }}
                  <span v-if="row.event === 'signup'" class="ml-1 opacity-70">· new</span>
                </span>
              </td>
              <td class="px-4 py-3 text-on-surface-variant">{{ row.org_name || "—" }}</td>
              <td class="px-4 py-3">
                <p class="text-on-surface">{{ platformLabel(row) }}</p>
                <p class="font-mono text-[11px] text-outline">{{ row.device_id || "—" }}</p>
                <p v-if="row.app_version" class="text-[11px] text-on-surface-variant">{{ row.app_version }}</p>
              </td>
              <td class="px-4 py-3 capitalize text-on-surface-variant">{{ row.auth_method }}</td>
              <td class="px-4 py-3 font-mono text-xs text-on-surface-variant">{{ row.ip || "—" }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>
