<script setup lang="ts">
type ElectivePosition = {
  id: string;
  jurisdiction: string;
  code: string;
  label: string;
  level: string;
  sort_order: number;
  active: boolean;
  is_builtin: boolean;
};

const props = defineProps<{
  jurisdiction?: string | null;
  political?: boolean;
}>();

const emit = defineEmits<{ (e: "error", msg: string): void; (e: "message", msg: string): void }>();

const { authHeaders, apiBase } = useAdminAuth();

const loading = ref(false);
const busy = ref(false);
const positions = ref<ElectivePosition[]>([]);
const jurisdictionOptions = ref<{ id: string; label: string }[]>([]);
const selectedJurisdiction = ref(props.jurisdiction || "ng-inec");

const form = reactive({
  code: "",
  label: "",
  level: "state",
});

watch(
  () => props.jurisdiction,
  (j) => {
    if (j) selectedJurisdiction.value = j;
  },
);

async function loadJurisdictions() {
  try {
    jurisdictionOptions.value = await $fetch<{ id: string; label: string }[]>(
      `${apiBase}/admin/elective-positions/jurisdictions`,
      { headers: authHeaders() },
    );
  } catch {
    jurisdictionOptions.value = [
      { id: "ng-inec", label: "Nigeria — INEC" },
      { id: "uk-ec", label: "United Kingdom" },
      { id: "ca-ec", label: "Canada" },
      { id: "us-fec", label: "United States" },
      { id: "eu-ep", label: "European Union" },
    ];
  }
}

async function load() {
  loading.value = true;
  try {
    positions.value = await $fetch<ElectivePosition[]>(`${apiBase}/admin/elective-positions`, {
      headers: authHeaders(),
      query: { jurisdiction: selectedJurisdiction.value, include_inactive: true },
    });
  } catch (e: unknown) {
    emit("error", e instanceof Error ? e.message : "Could not load elective offices.");
  } finally {
    loading.value = false;
  }
}

async function seed() {
  busy.value = true;
  try {
    const res = await $fetch<{ inserted: number }>(`${apiBase}/admin/elective-positions/seed`, {
      method: "POST",
      headers: authHeaders(),
      query: { jurisdiction: selectedJurisdiction.value },
    });
    emit("message", res.inserted ? `Added ${res.inserted} default office(s).` : "Catalog already complete.");
    await load();
  } catch (e: unknown) {
    const detail = (e as { data?: { detail?: string } })?.data?.detail;
    emit("error", typeof detail === "string" ? detail : "Could not seed offices.");
  } finally {
    busy.value = false;
  }
}

async function addPosition() {
  if (!form.label.trim() || !form.code.trim()) {
    emit("error", "Enter a code and label for the office.");
    return;
  }
  busy.value = true;
  try {
    await $fetch(`${apiBase}/admin/elective-positions`, {
      method: "POST",
      headers: authHeaders(),
      body: {
        jurisdiction: selectedJurisdiction.value,
        code: form.code.trim(),
        label: form.label.trim(),
        level: form.level,
      },
    });
    form.code = "";
    form.label = "";
    emit("message", "Elective office added.");
    await load();
  } catch (e: unknown) {
    const detail = (e as { data?: { detail?: string } })?.data?.detail;
    emit("error", typeof detail === "string" ? detail : "Could not add office.");
  } finally {
    busy.value = false;
  }
}

async function toggleActive(row: ElectivePosition) {
  busy.value = true;
  try {
    await $fetch(`${apiBase}/admin/elective-positions/${row.id}`, {
      method: "PATCH",
      headers: authHeaders(),
      body: { active: !row.active },
    });
    await load();
  } catch (e: unknown) {
    const detail = (e as { data?: { detail?: string } })?.data?.detail;
    emit("error", typeof detail === "string" ? detail : "Could not update office.");
  } finally {
    busy.value = false;
  }
}

async function removePosition(row: ElectivePosition) {
  if (!confirm(row.is_builtin ? `Deactivate ${row.label}?` : `Remove ${row.label}?`)) return;
  busy.value = true;
  try {
    await $fetch(`${apiBase}/admin/elective-positions/${row.id}`, {
      method: "DELETE",
      headers: authHeaders(),
    });
    emit("message", row.is_builtin ? "Office deactivated." : "Office removed.");
    await load();
  } catch (e: unknown) {
    const detail = (e as { data?: { detail?: string } })?.data?.detail;
    emit("error", typeof detail === "string" ? detail : "Could not remove office.");
  } finally {
    busy.value = false;
  }
}

watch(selectedJurisdiction, () => {
  void load();
});

onMounted(async () => {
  await loadJurisdictions();
  if (props.jurisdiction) selectedJurisdiction.value = props.jurisdiction;
  await load();
});
</script>

<template>
  <section v-if="political === false" class="overflow-hidden rounded-2xl bg-surface-container-lowest p-6 shadow-sm">
    <h2 class="font-headline-md text-lg font-bold text-primary">Elective offices</h2>
    <p class="mt-2 text-sm text-on-surface-variant">
      Elective office catalogs apply to political and campaign organizations. Switch to a political org to manage ballot posts.
    </p>
  </section>
  <section v-else class="overflow-hidden rounded-2xl bg-surface-container-lowest shadow-sm">
    <div class="border-b border-outline-variant/30 px-5 py-4">
      <div class="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 class="font-headline-md text-lg font-bold text-primary">Elective offices</h2>
          <p class="text-xs text-on-surface-variant">
            Ballot posts for this jurisdiction — used when adding party candidates.
          </p>
        </div>
        <div class="flex flex-wrap items-center gap-2">
          <select
            v-model="selectedJurisdiction"
            class="rounded-xl bg-off-white px-3 py-2 text-sm outline-none"
          >
            <option v-for="j in jurisdictionOptions" :key="j.id" :value="j.id">{{ j.label }}</option>
          </select>
          <button
            type="button"
            class="rounded-xl bg-surface-container px-3 py-2 text-xs font-semibold text-primary disabled:opacity-50"
            :disabled="busy"
            @click="seed"
          >
            Load defaults
          </button>
        </div>
      </div>
    </div>

    <form class="grid gap-3 border-b border-outline-variant/20 p-5 sm:grid-cols-4" @submit.prevent="addPosition">
      <label class="text-sm">
        <span class="font-label-caps text-[11px] uppercase text-outline">Code</span>
        <input v-model="form.code" class="mt-1 w-full rounded-xl bg-off-white px-3 py-2.5 outline-none" placeholder="governor" />
      </label>
      <label class="text-sm sm:col-span-2">
        <span class="font-label-caps text-[11px] uppercase text-outline">Office label</span>
        <input v-model="form.label" class="mt-1 w-full rounded-xl bg-off-white px-3 py-2.5 outline-none" placeholder="Governor" />
      </label>
      <div class="flex items-end">
        <button
          type="submit"
          class="w-full rounded-xl bg-deep-navy px-4 py-2.5 text-sm font-semibold text-pure-white disabled:opacity-50"
          :disabled="busy"
        >
          Add office
        </button>
      </div>
    </form>

    <div v-if="loading" class="p-6 text-center text-sm text-outline">Loading offices…</div>
    <ul v-else class="divide-y divide-outline-variant/20">
      <li
        v-for="row in positions"
        :key="row.id"
        class="flex flex-wrap items-center justify-between gap-3 px-5 py-3"
        :class="row.active ? '' : 'opacity-50'"
      >
        <div class="min-w-0">
          <p class="font-medium text-on-surface">{{ row.label }}</p>
          <p class="text-xs text-outline">
            {{ row.code }}
            <span v-if="row.level"> · {{ row.level }}</span>
            <span v-if="row.is_builtin"> · built-in</span>
            <span v-if="!row.active"> · inactive</span>
          </p>
        </div>
        <div class="flex gap-2">
          <button type="button" class="text-xs font-semibold text-on-surface" :disabled="busy" @click="toggleActive(row)">
            {{ row.active ? "Deactivate" : "Activate" }}
          </button>
          <button type="button" class="text-xs font-semibold text-error" :disabled="busy" @click="removePosition(row)">
            {{ row.is_builtin ? "Hide" : "Remove" }}
          </button>
        </div>
      </li>
      <li v-if="!positions.length" class="px-5 py-8 text-center text-sm text-outline">
        No offices yet. Click “Load defaults” for this jurisdiction.
      </li>
    </ul>
  </section>
</template>
