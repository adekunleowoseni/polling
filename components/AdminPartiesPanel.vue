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

const form = reactive({
  code: "",
  name: "",
  candidate: "",
  color: "#94A3B8",
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
    form.color = "#94A3B8";
    emit("error", "");
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
    emit("error", "");
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
    emit("error", "");
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
  <div class="space-y-4">
    <div class="ui-card p-5">
      <h2 class="font-semibold text-ui-text">Add a party</h2>
      <p class="mt-1 text-sm text-ui-muted">
        New parties and candidates appear on Independent Audit standings, the pie chart, bar chart, and matrix.
      </p>
      <form class="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-5" @submit.prevent="addParty">
        <label class="text-sm">
          <span class="text-xs text-ui-muted">Acronym</span>
          <input v-model="form.code" class="mt-1 w-full rounded-lg border border-ui-border/50 bg-ui-bg px-3 py-2 uppercase" placeholder="LP" maxlength="12" />
        </label>
        <label class="text-sm sm:col-span-1 lg:col-span-1">
          <span class="text-xs text-ui-muted">Party name</span>
          <input v-model="form.name" class="mt-1 w-full rounded-lg border border-ui-border/50 bg-ui-bg px-3 py-2" placeholder="Labour Party" />
        </label>
        <label class="text-sm sm:col-span-2 lg:col-span-1">
          <span class="text-xs text-ui-muted">Candidate</span>
          <input v-model="form.candidate" class="mt-1 w-full rounded-lg border border-ui-border/50 bg-ui-bg px-3 py-2" placeholder="Candidate name" />
        </label>
        <label class="text-sm">
          <span class="text-xs text-ui-muted">Colour</span>
          <input v-model="form.color" type="color" class="mt-1 h-10 w-full cursor-pointer rounded-lg border border-ui-border/50 bg-ui-bg p-1" />
        </label>
        <div class="flex items-end">
          <button
            type="submit"
            class="w-full rounded-lg bg-violet-600 px-4 py-2 text-sm font-semibold text-white hover:bg-violet-500 disabled:opacity-50"
            :disabled="busy"
          >
            Add party
          </button>
        </div>
      </form>
    </div>

    <div class="ui-card overflow-hidden">
      <div class="flex items-center justify-between border-b border-ui-border/40 px-5 py-4">
        <div>
          <h2 class="font-semibold text-ui-text">Parties on the dashboard</h2>
          <p class="text-xs text-ui-muted">{{ parties.length }} parties · Independent Audit reads this list live</p>
        </div>
        <button type="button" class="rounded-lg border border-ui-border/50 px-3 py-1.5 text-xs" :disabled="loading" @click="load">
          {{ loading ? "Loading…" : "Refresh" }}
        </button>
      </div>
      <div class="overflow-x-auto">
        <table class="w-full text-left text-sm">
          <thead>
            <tr class="border-b border-ui-border/30 text-xs uppercase text-ui-muted">
              <th class="px-4 py-2">Code</th>
              <th class="px-4 py-2">Party</th>
              <th class="px-4 py-2">Candidate</th>
              <th class="px-4 py-2">Colour</th>
              <th class="px-4 py-2 text-right">Actions</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-ui-border/30">
            <tr v-for="party in parties" :key="party.code">
              <td class="px-4 py-3">
                <span class="rounded px-2 py-0.5 text-xs font-black text-slate-950" :style="{ background: party.color }">
                  {{ party.code }}
                </span>
              </td>
              <td class="px-4 py-3">
                <input
                  v-if="editing === party.code"
                  v-model="draft[party.code].name"
                  class="w-full rounded-lg border border-ui-border/50 bg-ui-bg px-2 py-1"
                />
                <span v-else class="font-medium text-ui-text">{{ party.name }}</span>
              </td>
              <td class="px-4 py-3">
                <input
                  v-if="editing === party.code"
                  v-model="draft[party.code].candidate"
                  class="w-full rounded-lg border border-ui-border/50 bg-ui-bg px-2 py-1"
                  placeholder="Candidate name"
                />
                <span v-else class="text-ui-muted">{{ party.candidate || "—" }}</span>
              </td>
              <td class="px-4 py-3">
                <input
                  v-if="editing === party.code"
                  v-model="draft[party.code].color"
                  type="color"
                  class="h-8 w-12 cursor-pointer rounded border border-ui-border/50"
                />
                <span v-else class="inline-block h-4 w-4 rounded-full border border-ui-border/40" :style="{ background: party.color }" />
              </td>
              <td class="px-4 py-3 text-right">
                <div class="flex justify-end gap-2">
                  <template v-if="editing === party.code">
                    <button type="button" class="text-xs font-semibold text-violet-600" :disabled="busy" @click="saveParty(party.code)">
                      Save
                    </button>
                    <button type="button" class="text-xs text-ui-muted" @click="editing = null">Cancel</button>
                  </template>
                  <template v-else>
                    <button type="button" class="text-xs font-semibold text-ui-text" @click="startEdit(party)">Edit</button>
                    <button
                      v-if="party.code !== 'WRITE-IN'"
                      type="button"
                      class="text-xs font-semibold text-red-600"
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
              <td colspan="5" class="px-4 py-8 text-center text-ui-muted">No parties yet.</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>
