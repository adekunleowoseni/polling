<script setup lang="ts">
type PartyCandidate = {
  id: string;
  name: string;
  post: string;
  has_photo?: boolean;
  photo_url?: string | null;
  photo_updated_at?: string | null;
};

type Party = {
  code: string;
  name: string;
  color: string;
  candidate: string;
  sort_order: number;
  has_candidate_photo?: boolean;
  candidate_photo_url?: string | null;
  candidate_photo_updated_at?: string | null;
  has_party_photo?: boolean;
  party_photo_url?: string | null;
  party_photo_updated_at?: string | null;
  candidates?: PartyCandidate[];
};

const props = defineProps<{
  jurisdiction?: string | null;
}>();

const emit = defineEmits<{ (e: "error", msg: string): void; (e: "message", msg: string): void }>();

const { authHeaders, apiBase } = useAdminAuth();

const loading = ref(false);
const busy = ref(false);
const uploadingKey = ref<string | null>(null);
const parties = ref<Party[]>([]);
const editing = ref<string | null>(null);
const showForm = ref(false);
const selectedCode = ref<string | null>(null);
const photoInput = ref<HTMLInputElement | null>(null);
const pendingUpload = ref<{ kind: "logo" | "candidate"; code: string; candidateId?: string } | null>(null);
const electivePosts = ref<{ label: string; code: string }[]>([]);

const form = reactive({
  code: "",
  name: "",
  color: "#92D80A",
});

const draft = reactive<Record<string, { name: string; color: string }>>({});

const candidateForm = reactive({
  name: "",
  post: "",
});

const selectedParty = computed(() => parties.value.find((p) => p.code === selectedCode.value) || null);

const postSuggestions = computed(() => {
  if (electivePosts.value.length) return electivePosts.value.map((p) => p.label);
  return [
    "Governor",
    "Deputy Governor",
    "Senator",
    "House of Reps",
    "State Assembly",
    "Chairman",
    "Councillor",
  ];
});

const defaultPost = computed(() => postSuggestions.value[0] || "Candidate");

async function loadElectivePosts() {
  try {
    const rows = await $fetch<{ label: string; code: string; active?: boolean }[]>(
      `${apiBase}/admin/elective-positions`,
      {
        headers: authHeaders(),
        query: props.jurisdiction ? { jurisdiction: props.jurisdiction } : undefined,
      },
    );
    electivePosts.value = (rows || []).filter((r) => r.active !== false);
    if (!candidateForm.post) candidateForm.post = defaultPost.value;
  } catch {
    electivePosts.value = [];
    if (!candidateForm.post) candidateForm.post = defaultPost.value;
  }
}

function mediaUrl(path: string | null | undefined, updatedAt?: string | null) {
  if (!path) return "";
  const base = String(apiBase || "").replace(/\/+$/, "");
  const normalized = path.startsWith("/") ? path : `/${path}`;
  const bust = updatedAt ? `?t=${encodeURIComponent(String(updatedAt))}` : "";
  return `${base}${normalized}${bust}`;
}

function logoUrl(party: Party) {
  if (!party.has_party_photo || !party.party_photo_url) return "";
  return mediaUrl(party.party_photo_url, party.party_photo_updated_at);
}

function candidatePhotoUrl(c: PartyCandidate) {
  if (!c.has_photo || !c.photo_url) return "";
  return mediaUrl(c.photo_url, c.photo_updated_at);
}

async function load() {
  loading.value = true;
  try {
    parties.value = await $fetch<Party[]>(`${apiBase}/admin/parties`, { headers: authHeaders() });
    for (const party of parties.value) {
      draft[party.code] = {
        name: party.name,
        color: party.color,
      };
    }
    if (selectedCode.value && !parties.value.some((p) => p.code === selectedCode.value)) {
      selectedCode.value = null;
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
        color: form.color,
      },
    });
    form.code = "";
    form.name = "";
    form.color = "#92D80A";
    showForm.value = false;
    emit("message", `${code.toUpperCase()} added.`);
    await load();
    selectedCode.value = code.toUpperCase();
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
    if (selectedCode.value === code) selectedCode.value = null;
    emit("message", `${code} removed.`);
    await load();
  } catch (e: unknown) {
    const detail = (e as { data?: { detail?: string } })?.data?.detail;
    emit("error", typeof detail === "string" ? detail : "Could not remove that party.");
  } finally {
    busy.value = false;
  }
}

function pickLogo(code: string) {
  pendingUpload.value = { kind: "logo", code };
  photoInput.value?.click();
}

function pickCandidatePhoto(code: string, candidateId: string) {
  pendingUpload.value = { kind: "candidate", code, candidateId };
  photoInput.value?.click();
}

async function onPhotoSelected(event: Event) {
  const input = event.target as HTMLInputElement;
  const file = input.files?.[0];
  const pending = pendingUpload.value;
  input.value = "";
  pendingUpload.value = null;
  if (!file || !pending) return;

  const key =
    pending.kind === "logo"
      ? `logo:${pending.code}`
      : `cand:${pending.code}:${pending.candidateId}`;
  uploadingKey.value = key;
  try {
    const body = new FormData();
    body.append("file", file);
    if (pending.kind === "logo") {
      await $fetch(`${apiBase}/admin/parties/${encodeURIComponent(pending.code)}/logo`, {
        method: "POST",
        headers: authHeaders(),
        body,
      });
      emit("message", `Party image updated for ${pending.code}.`);
    } else if (pending.candidateId) {
      await $fetch(
        `${apiBase}/admin/parties/${encodeURIComponent(pending.code)}/candidates/${encodeURIComponent(pending.candidateId)}/photo`,
        {
          method: "POST",
          headers: authHeaders(),
          body,
        },
      );
      emit("message", "Candidate photo updated.");
    }
    await load();
  } catch (e: unknown) {
    const detail = (e as { data?: { detail?: string } })?.data?.detail;
    emit("error", typeof detail === "string" ? detail : "Could not upload image.");
  } finally {
    uploadingKey.value = null;
  }
}

async function clearLogo(code: string) {
  if (!confirm(`Remove party image for ${code}?`)) return;
  uploadingKey.value = `logo:${code}`;
  try {
    await $fetch(`${apiBase}/admin/parties/${encodeURIComponent(code)}/logo`, {
      method: "DELETE",
      headers: authHeaders(),
    });
    emit("message", `Party image removed for ${code}.`);
    await load();
  } catch (e: unknown) {
    const detail = (e as { data?: { detail?: string } })?.data?.detail;
    emit("error", typeof detail === "string" ? detail : "Could not remove image.");
  } finally {
    uploadingKey.value = null;
  }
}

async function addCandidate() {
  if (!selectedCode.value) return;
  const name = candidateForm.name.trim();
  if (!name) {
    emit("error", "Enter a candidate name.");
    return;
  }
  busy.value = true;
  try {
    await $fetch(`${apiBase}/admin/parties/${encodeURIComponent(selectedCode.value)}/candidates`, {
      method: "POST",
      headers: authHeaders(),
      body: {
        name,
        post: candidateForm.post.trim() || "Candidate",
      },
    });
    candidateForm.name = "";
    candidateForm.post = defaultPost.value;
    emit("message", "Candidate added.");
    await load();
  } catch (e: unknown) {
    const detail = (e as { data?: { detail?: string } })?.data?.detail;
    emit("error", typeof detail === "string" ? detail : "Could not add candidate.");
  } finally {
    busy.value = false;
  }
}

async function removeCandidate(candidateId: string) {
  if (!selectedCode.value) return;
  if (!confirm("Remove this candidate?")) return;
  busy.value = true;
  try {
    await $fetch(
      `${apiBase}/admin/parties/${encodeURIComponent(selectedCode.value)}/candidates/${encodeURIComponent(candidateId)}`,
      {
        method: "DELETE",
        headers: authHeaders(),
      },
    );
    emit("message", "Candidate removed.");
    await load();
  } catch (e: unknown) {
    const detail = (e as { data?: { detail?: string } })?.data?.detail;
    emit("error", typeof detail === "string" ? detail : "Could not remove candidate.");
  } finally {
    busy.value = false;
  }
}

async function clearCandidatePhoto(candidateId: string) {
  if (!selectedCode.value) return;
  uploadingKey.value = `cand:${selectedCode.value}:${candidateId}`;
  try {
    await $fetch(
      `${apiBase}/admin/parties/${encodeURIComponent(selectedCode.value)}/candidates/${encodeURIComponent(candidateId)}/photo`,
      {
        method: "DELETE",
        headers: authHeaders(),
      },
    );
    emit("message", "Candidate photo removed.");
    await load();
  } catch (e: unknown) {
    const detail = (e as { data?: { detail?: string } })?.data?.detail;
    emit("error", typeof detail === "string" ? detail : "Could not remove photo.");
  } finally {
    uploadingKey.value = null;
  }
}

function openParty(party: Party) {
  selectedCode.value = party.code;
  candidateForm.name = "";
  candidateForm.post = defaultPost.value;
}

watch(
  () => props.jurisdiction,
  () => {
    void loadElectivePosts();
  },
);

onMounted(async () => {
  await Promise.all([load(), loadElectivePosts()]);
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
            Upload a party image, then open a party to add candidates with their post and photo.
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
        <span class="font-label-caps text-xs uppercase text-outline">Candidates listed</span>
        <p class="mt-2 text-3xl font-extrabold text-primary">
          {{ parties.reduce((n, p) => n + (p.candidates?.length || 0), 0) }}
        </p>
      </div>
      <div class="rounded-2xl bg-deep-navy p-5 text-pure-white shadow-sm">
        <span class="font-label-caps text-xs uppercase text-primary-fixed-dim">Party images</span>
        <p class="mt-2 text-3xl font-extrabold">
          {{ parties.filter((p) => p.has_party_photo).length }}
        </p>
      </div>
    </section>

    <section v-if="showForm" class="rounded-2xl bg-surface-container-lowest p-6 shadow-sm">
      <h2 class="font-headline-md text-lg font-bold text-primary">Register a party</h2>
      <form class="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4" @submit.prevent="addParty">
        <label class="text-sm">
          <span class="font-label-caps text-[11px] uppercase text-outline">Acronym</span>
          <input v-model="form.code" class="mt-1 w-full rounded-xl bg-off-white px-3 py-2.5 uppercase outline-none" placeholder="LP" maxlength="12" />
        </label>
        <label class="text-sm">
          <span class="font-label-caps text-[11px] uppercase text-outline">Party name</span>
          <input v-model="form.name" class="mt-1 w-full rounded-xl bg-off-white px-3 py-2.5 outline-none" placeholder="Labour Party" />
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

    <div class="grid grid-cols-1 gap-5 xl:grid-cols-5">
      <section class="overflow-hidden rounded-2xl bg-surface-container-lowest shadow-sm xl:col-span-3">
        <div class="border-b border-outline-variant/30 px-5 py-4">
          <h2 class="font-headline-md text-lg font-bold text-primary">Parties</h2>
          <p class="text-xs text-outline">Click a party to manage candidates · JPEG/PNG/WebP under 2&nbsp;MB</p>
        </div>
        <ul class="divide-y divide-outline-variant/20">
          <li
            v-for="party in parties"
            :key="party.code"
            class="cursor-pointer px-4 py-3 transition-colors hover:bg-surface-container-low/60"
            :class="selectedCode === party.code ? 'bg-surface-container-low' : ''"
            @click="openParty(party)"
          >
            <div class="flex items-center gap-3">
              <div
                class="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-surface-container text-[11px] font-bold text-outline ring-1 ring-outline-variant/30"
                :style="party.has_party_photo ? undefined : { background: party.color, color: '#0f172a' }"
              >
                <img
                  v-if="logoUrl(party)"
                  :src="logoUrl(party)"
                  :alt="party.name"
                  class="h-full w-full object-cover"
                />
                <span v-else>{{ party.code.slice(0, 2) }}</span>
              </div>
              <div class="min-w-0 flex-1">
                <div class="flex flex-wrap items-center gap-2">
                  <span class="rounded px-2 py-0.5 text-xs font-black text-slate-950" :style="{ background: party.color }">
                    {{ party.code }}
                  </span>
                  <template v-if="editing === party.code">
                    <input
                      v-model="draft[party.code].name"
                      class="min-w-0 flex-1 rounded-lg bg-off-white px-2 py-1 text-sm outline-none"
                      @click.stop
                    />
                  </template>
                  <span v-else class="truncate font-medium text-on-surface">{{ party.name }}</span>
                </div>
                <p class="mt-0.5 text-xs text-on-surface-variant">
                  {{ party.candidates?.length || 0 }} candidate(s)
                  <span v-if="party.candidate"> · Lead: {{ party.candidate }}</span>
                </p>
              </div>
              <div class="flex shrink-0 flex-col items-end gap-1" @click.stop>
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
            </div>
            <div class="mt-2 flex flex-wrap gap-2 pl-15" @click.stop>
              <button
                type="button"
                class="text-[11px] font-semibold text-electric-pink disabled:opacity-50"
                :disabled="uploadingKey === `logo:${party.code}`"
                @click="pickLogo(party.code)"
              >
                {{ uploadingKey === `logo:${party.code}` ? "Uploading…" : party.has_party_photo ? "Replace party image" : "Upload party image" }}
              </button>
              <button
                v-if="party.has_party_photo"
                type="button"
                class="text-[11px] text-outline disabled:opacity-50"
                :disabled="uploadingKey === `logo:${party.code}`"
                @click="clearLogo(party.code)"
              >
                Remove image
              </button>
              <label v-if="editing === party.code" class="ml-auto flex items-center gap-1 text-[11px] text-outline">
                Colour
                <input v-model="draft[party.code].color" type="color" class="h-6 w-8 cursor-pointer rounded border border-outline-variant/40" />
              </label>
            </div>
          </li>
          <li v-if="!parties.length && !loading" class="px-4 py-10 text-center text-outline">No parties yet.</li>
        </ul>
      </section>

      <section class="rounded-2xl bg-surface-container-lowest p-5 shadow-sm xl:col-span-2">
        <template v-if="selectedParty">
          <div class="flex items-start gap-3 border-b border-outline-variant/30 pb-4">
            <div
              class="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-xl text-sm font-bold"
              :style="selectedParty.has_party_photo ? undefined : { background: selectedParty.color, color: '#0f172a' }"
            >
              <img
                v-if="logoUrl(selectedParty)"
                :src="logoUrl(selectedParty)"
                :alt="selectedParty.name"
                class="h-full w-full object-cover"
              />
              <span v-else>{{ selectedParty.code.slice(0, 2) }}</span>
            </div>
            <div class="min-w-0">
              <p class="font-headline-md text-lg font-bold text-primary">{{ selectedParty.name }}</p>
              <p class="text-xs text-on-surface-variant">{{ selectedParty.code }} · add candidates with post &amp; photo</p>
            </div>
          </div>

          <form class="mt-4 grid gap-2" @submit.prevent="addCandidate">
            <label class="text-sm">
              <span class="font-label-caps text-[11px] uppercase text-outline">Candidate name</span>
              <input
                v-model="candidateForm.name"
                class="mt-1 w-full rounded-xl bg-off-white px-3 py-2.5 outline-none"
                placeholder="Full name"
              />
            </label>
            <label class="text-sm">
              <span class="font-label-caps text-[11px] uppercase text-outline">Post / office</span>
              <input
                v-model="candidateForm.post"
                class="mt-1 w-full rounded-xl bg-off-white px-3 py-2.5 outline-none"
                placeholder="Select or type an office"
                list="candidate-posts"
              />
              <datalist id="candidate-posts">
                <option v-for="label in postSuggestions" :key="label" :value="label" />
              </datalist>
            </label>
            <button
              type="submit"
              class="mt-1 rounded-xl bg-deep-navy px-4 py-2.5 text-sm font-semibold text-pure-white disabled:opacity-50"
              :disabled="busy"
            >
              Add candidate
            </button>
          </form>

          <ul class="mt-5 divide-y divide-outline-variant/20">
            <li
              v-for="c in selectedParty.candidates || []"
              :key="c.id"
              class="flex items-start gap-3 py-3"
            >
              <div
                class="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-full bg-surface-container text-[10px] font-bold text-outline"
              >
                <img
                  v-if="candidatePhotoUrl(c)"
                  :src="candidatePhotoUrl(c)"
                  :alt="c.name"
                  class="h-full w-full object-cover"
                />
                <span v-else>{{ (c.name || "?").slice(0, 2).toUpperCase() }}</span>
              </div>
              <div class="min-w-0 flex-1">
                <p class="font-medium text-on-surface">{{ c.name }}</p>
                <p class="text-xs text-on-surface-variant">{{ c.post || "Candidate" }}</p>
                <div class="mt-1 flex flex-wrap gap-2">
                  <button
                    type="button"
                    class="text-[11px] font-semibold text-electric-pink disabled:opacity-50"
                    :disabled="uploadingKey === `cand:${selectedParty.code}:${c.id}`"
                    @click="pickCandidatePhoto(selectedParty.code, c.id)"
                  >
                    {{ uploadingKey === `cand:${selectedParty.code}:${c.id}` ? "Uploading…" : c.has_photo ? "Replace photo" : "Upload photo" }}
                  </button>
                  <button
                    v-if="c.has_photo"
                    type="button"
                    class="text-[11px] text-outline disabled:opacity-50"
                    :disabled="uploadingKey === `cand:${selectedParty.code}:${c.id}`"
                    @click="clearCandidatePhoto(c.id)"
                  >
                    Remove photo
                  </button>
                  <button
                    type="button"
                    class="text-[11px] font-semibold text-error"
                    :disabled="busy"
                    @click="removeCandidate(c.id)"
                  >
                    Remove
                  </button>
                </div>
              </div>
            </li>
            <li v-if="!(selectedParty.candidates || []).length" class="py-8 text-center text-sm text-outline">
              No candidates yet. Add one above.
            </li>
          </ul>
        </template>
        <div v-else class="flex h-full min-h-[280px] flex-col items-center justify-center gap-2 text-center text-on-surface-variant">
          <span class="material-symbols-outlined text-4xl text-outline">how_to_vote</span>
          <p class="text-sm">Select a party to add candidates</p>
        </div>
      </section>
    </div>

    <input
      ref="photoInput"
      type="file"
      accept="image/jpeg,image/png,image/webp"
      class="hidden"
      @change="onPhotoSelected"
    />
  </div>
</template>
