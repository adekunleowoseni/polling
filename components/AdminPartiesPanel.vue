<script setup lang="ts">
type Party = {
  code: string;
  name: string;
  color: string;
  candidate: string;
  sort_order: number;
};

const emit = defineEmits<{ (e: "error", msg: string): void; (e: "message", msg: string): void }>();

const { authHeaders, apiBase } = useAdminAuth();

const loading = ref(false);
const busy = ref(false);
const parties = ref<Party[]>([]);
const editing = ref<string | null>(null);
const showForm = ref(false);

const form = reactive({
  code: "",
  name: "",
  candidate: "",
  color: "#92D80A",
});

const draft = reactive<Record<string, { name: string; candidate: string; color: string }>>({});

async function load() {
  loading.value = true;
  try {
    parties.value = await $fetch<Party[]>(`${apiBase}/admin/parties`, { headers: authHeaders() });
    for (const party of parties.value) {
      draft[party.code] = {
        name: party.name,
        candidate: party.candidate || "",
        color: party.color,
      };
    }
  } catch (e: unknown) {
    emit("error", e instanceof Error ? e.message : "Could not load parties.");
  } finally {
    loading.value = false;
  }
}

async function addParty() {
  const code = form.code.trim();
  const name = form.name.trim();
  if (!code || !name) {
    emit("error", "Enter a party acronym and full name.");
    return;
  }
  busy.value = true;
  try {
    await $fetch(`${apiBase}/admin/parties`, {
      method: "POST",
      headers: authHeaders(),
      body: {
        code,
        name,
        candidate: form.candidate.trim(),
        color: form.color,
      },
    });
    form.code = "";
    form.name = "";
    form.candidate = "";
    form.color = "#92D80A";
    showForm.value = false;
    emit("message", `${code.toUpperCase()} added to the collation dashboard.`);
    await load();
  } catch (e: unknown) {
    const detail = (e as { data?: { detail?: string } })?.data?.detail;
    emit("error", typeof detail === "string" ? detail : "Could not add that party.");
  } finally {
    busy.value = false;
  }
}

function startEdit(party: Party) {
  draft[party.code] = {
    name: party.name,
    candidate: party.candidate || "",
    color: party.color,
  };
  editing.value = party.code;
}

async function saveParty(code: string) {
  const row = draft[code];
  if (!row?.name.trim()) {
    emit("error", "Party name cannot be empty.");
    return;
  }
  busy.value = true;
  try {
    await $fetch(`${apiBase}/admin/parties/${encodeURIComponent(code)}`, {
      method: "PATCH",
      headers: authHeaders(),
      body: {
        name: row.name.trim(),
        candidate: row.candidate.trim(),
        color: row.color,
      },
    });
    editing.value = null;
    emit("message", `${code} updated.`);
    await load();
  } catch (e: unknown) {
    const detail = (e as { data?: { detail?: string } })?.data?.detail;
    emit("error", typeof detail === "string" ? detail : "Could not save that party.");
  } finally {
    busy.value = false;
  }
}

async function removeParty(code: string) {
  if (code === "WRITE-IN") return;
  if (!confirm(`Remove ${code} from the collation dashboard?`)) return;
  busy.value = true;
  try {
    await $fetch(`${apiBase}/admin/parties/${encodeURIComponent(code)}`, {
      method: "DELETE",
      headers: authHeaders(),
    });
    emit("message", `${code} removed.`);
    await load();
  } catch (e: unknown) {
    const detail = (e as { data?: { detail?: string } })?.data?.detail;
    emit("error", typeof detail === "string" ? detail : "Could not remove that party.");
  } finally {
    busy.value = false;
  }
}

onMounted(() => {
  void load();
});
</script>

<template>
  <div class="flex w-full flex-col gap-6 pb-10">
    <section class="flex flex-col gap-4">
      <div class="flex flex-wrap items-center gap-2">
        <span class="font-label-caps text-label-caps uppercase tracking-wider text-outline">HQ Central Command</span>
        <span class="text-outline">/</span>
        <span class="font-label-caps text-label-caps font-bold uppercase tracking-wider text-secondary">
          Collation · Parties
        </span>
      </div>
      <div class="flex flex-col justify-between gap-4 xl:flex-row xl:items-end">
        <div>
          <h1 class="font-headline-md text-2xl font-bold tracking-tight text-primary sm:text-headline-md">
            Party &amp; Candidate Registry
          </h1>
          <p class="mt-1 max-w-2xl text-sm text-on-surface-variant">
            Parties and candidates feed Independent Audit standings, pie charts, bar charts, and the results matrix.
          </p>
        </div>
        <div class="flex flex-wrap gap-2">
          <button
            type="button"
            class="inline-flex items-center gap-2 rounded-xl bg-surface-container px-4 py-2.5 text-sm text-on-surface hover:bg-surface-container-high"
            :disabled="loading"
            @click="load"
          >
            <span class="material-symbols-outlined text-[18px]">sync</span>
            {{ loading ? "Loading…" : "Refresh" }}
          </button>
          <button
            type="button"
            class="inline-flex items-center gap-2 rounded-xl bg-electric-pink px-5 py-2.5 text-sm font-semibold text-pure-white"
            @click="showForm = !showForm"
          >
            <span class="material-symbols-outlined text-[18px]">flag</span>
            {{ showForm ? "Close form" : "Add party" }}
          </button>
        </div>
      </div>
    </section>

    <section class="grid grid-cols-1 gap-4 sm:grid-cols-3">
      <div class="rounded-2xl bg-surface-container-lowest p-5 shadow-sm">
        <span class="font-label-caps text-xs uppercase text-outline">Parties on ballot</span>
        <p class="mt-2 text-3xl font-extrabold text-primary">{{ parties.length }}</p>
      </div>
      <div class="rounded-2xl bg-surface-container-lowest p-5 shadow-sm">
        <span class="font-label-caps text-xs uppercase text-outline">With candidates</span>
        <p class="mt-2 text-3xl font-extrabold text-primary">
          {{ parties.filter((p) => p.candidate).length }}
        </p>
      </div>
      <div class="rounded-2xl bg-deep-navy p-5 text-pure-white shadow-sm">
        <span class="font-label-caps text-xs uppercase text-primary-fixed-dim">Live audit feed</span>
        <p class="mt-2 text-lg font-bold">Independent Audit reads this list live</p>
      </div>
    </section>

    <section v-if="showForm" class="rounded-2xl bg-surface-container-lowest p-6 shadow-sm">
      <h2 class="font-headline-md text-lg font-bold text-primary">Register a party</h2>
      <form class="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-5" @submit.prevent="addParty">
        <label class="text-sm">
          <span class="font-label-caps text-[11px] uppercase text-outline">Acronym</span>
          <input v-model="form.code" class="mt-1 w-full rounded-xl bg-off-white px-3 py-2.5 uppercase outline-none" placeholder="LP" maxlength="12" />
        </label>
        <label class="text-sm">
          <span class="font-label-caps text-[11px] uppercase text-outline">Party name</span>
          <input v-model="form.name" class="mt-1 w-full rounded-xl bg-off-white px-3 py-2.5 outline-none" placeholder="Labour Party" />
        </label>
        <label class="text-sm">
          <span class="font-label-caps text-[11px] uppercase text-outline">Candidate</span>
          <input v-model="form.candidate" class="mt-1 w-full rounded-xl bg-off-white px-3 py-2.5 outline-none" placeholder="Candidate name" />
        </label>
        <label class="text-sm">
          <span class="font-label-caps text-[11px] uppercase text-outline">Colour</span>
          <input v-model="form.color" type="color" class="mt-1 h-11 w-full cursor-pointer rounded-xl bg-off-white p-1" />
        </label>
        <div class="flex items-end">
          <button
            type="submit"
            class="w-full rounded-xl bg-deep-navy px-4 py-2.5 text-sm font-semibold text-pure-white disabled:opacity-50"
            :disabled="busy"
          >
            Add party
          </button>
        </div>
      </form>
    </section>

    <section class="overflow-hidden rounded-2xl bg-surface-container-lowest shadow-sm">
      <div class="border-b border-outline-variant/30 px-5 py-4">
        <h2 class="font-headline-md text-lg font-bold text-primary">Parties on the dashboard</h2>
        <p class="text-xs text-outline">{{ parties.length }} parties · edit inline or remove</p>
      </div>
      <div class="overflow-x-auto">
        <table class="w-full text-left text-sm">
          <thead>
            <tr class="bg-surface-container-low font-label-caps text-[11px] uppercase tracking-wider text-on-surface-variant">
              <th class="px-4 py-3">Code</th>
              <th class="px-4 py-3">Party</th>
              <th class="px-4 py-3">Candidate</th>
              <th class="px-4 py-3">Colour</th>
              <th class="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="party in parties" :key="party.code" class="transition-colors hover:bg-surface-container-low/50">
              <td class="px-4 py-3">
                <span class="rounded px-2 py-0.5 text-xs font-black text-slate-950" :style="{ background: party.color }">
                  {{ party.code }}
                </span>
              </td>
              <td class="px-4 py-3">
                <input
                  v-if="editing === party.code"
                  v-model="draft[party.code].name"
                  class="w-full rounded-xl bg-off-white px-3 py-2 outline-none"
                />
                <span v-else class="font-medium text-on-surface">{{ party.name }}</span>
              </td>
              <td class="px-4 py-3">
                <input
                  v-if="editing === party.code"
                  v-model="draft[party.code].candidate"
                  class="w-full rounded-xl bg-off-white px-3 py-2 outline-none"
                  placeholder="Candidate name"
                />
                <span v-else class="text-on-surface-variant">{{ party.candidate || "—" }}</span>
              </td>
              <td class="px-4 py-3">
                <input
                  v-if="editing === party.code"
                  v-model="draft[party.code].color"
                  type="color"
                  class="h-8 w-12 cursor-pointer rounded border border-outline-variant/40"
                />
                <span v-else class="inline-block h-4 w-4 rounded-full border border-outline-variant/40" :style="{ background: party.color }" />
              </td>
              <td class="px-4 py-3 text-right">
                <div class="flex justify-end gap-2">
                  <template v-if="editing === party.code">
                    <button type="button" class="text-xs font-semibold text-electric-pink" :disabled="busy" @click="saveParty(party.code)">
                      Save
                    </button>
                    <button type="button" class="text-xs text-outline" @click="editing = null">Cancel</button>
                  </template>
                  <template v-else>
                    <button type="button" class="text-xs font-semibold text-on-surface" @click="startEdit(party)">Edit</button>
                    <button
                      v-if="party.code !== 'WRITE-IN'"
                      type="button"
                      class="text-xs font-semibold text-error"
                      :disabled="busy"
                      @click="removeParty(party.code)"
                    >
                      Remove
                    </button>
                  </template>
                </div>
              </td>
            </tr>
            <tr v-if="!parties.length && !loading">
              <td colspan="5" class="px-4 py-10 text-center text-outline">No parties yet.</td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>
  </div>
</template>
