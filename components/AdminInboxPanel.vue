<script setup lang="ts">
import { useInbox, type InboxBroadcast, type InboxPostCreate } from "~/composables/useInbox";

const emit = defineEmits<{ (e: "error", msg: string): void; (e: "message", msg: string): void }>();

const { loadBroadcasts, createBroadcast } = useInbox();
const { admin } = useAdminAuth();

const loading = ref(true);
const busy = ref(false);
const items = ref<InboxBroadcast[]>([]);

const form = reactive<InboxPostCreate>({
  item_type: "message",
  title: "",
  body: "",
  attachment_url: "",
  state: admin.value?.state ?? "Ogun State",
  lga: "",
  ward: "",
  polling_unit_code: "",
  audience: "both",
});

const lgas = ref<string[]>([]);
const wards = ref<string[]>([]);
const stateCode = computed(() => "ogun");

const previewBody = computed(() => form.body.trim() || "Your message will appear here…");

async function loadGeo() {
  const config = useRuntimeConfig();
  lgas.value = await $fetch<string[]>(`${config.public.apiBase}/geo/states/${stateCode.value}/lgas`);
}

watch(
  () => form.state,
  async () => {
    form.lga = "";
    form.ward = "";
    wards.value = [];
    await loadGeo();
  },
  { immediate: true },
);

watch(
  () => form.lga,
  async (lga) => {
    form.ward = "";
    if (!lga) {
      wards.value = [];
      return;
    }
    const config = useRuntimeConfig();
    wards.value = await $fetch<string[]>(
      `${config.public.apiBase}/geo/states/${stateCode.value}/lgas/${encodeURIComponent(lga)}/wards`,
    );
  },
);

async function refresh() {
  loading.value = true;
  try {
    items.value = await loadBroadcasts();
  } catch (e: unknown) {
    emit("error", e instanceof Error ? e.message : "Failed to load inbox posts.");
  } finally {
    loading.value = false;
  }
}

async function submit() {
  if (!form.title.trim() || !form.body.trim() || !form.lga || !form.ward) {
    emit("error", "Add a title, message, LGA, and ward.");
    return;
  }
  busy.value = true;
  try {
    const body: InboxPostCreate = {
      item_type: form.item_type,
      title: form.title.trim(),
      body: form.body.trim(),
      state: form.state,
      lga: form.lga,
      ward: form.ward,
      audience: form.audience,
    };
    if (form.attachment_url?.trim()) body.attachment_url = form.attachment_url.trim();
    if (form.polling_unit_code?.trim()) body.polling_unit_code = form.polling_unit_code.trim();

    const created = await createBroadcast(body);
    emit("message", `Posted to ${created.recipient_count.toLocaleString()} recipient(s).`);
    form.title = "";
    form.body = "";
    form.attachment_url = "";
    form.polling_unit_code = "";
    await refresh();
  } catch (e: unknown) {
    emit("error", e instanceof Error ? e.message : "Post failed.");
  } finally {
    busy.value = false;
  }
}

function formatWhen(iso: string) {
  try {
    return new Date(iso).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
  } catch {
    return iso;
  }
}

function audienceLabel(a: string) {
  if (a === "member") return "Members";
  if (a === "voter") return "Voters";
  return "Voters & members";
}

function typeLabel(t: string) {
  if (t === "invite") return "Invite";
  if (t === "material") return "Material";
  return "Message";
}

onMounted(refresh);
</script>

<template>
  <div class="flex w-full flex-col gap-6 pb-10">
    <div class="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
      <div>
        <p class="font-label-caps text-[11px] uppercase tracking-wider text-outline">Inbox dispatch</p>
        <h1 class="mt-1 font-headline-md text-2xl font-bold tracking-tight text-primary">
          Post to voter & member inbox
        </h1>
        <p class="mt-1 max-w-xl text-sm text-on-surface-variant">
          Send a message to supporters in a ward. It shows up in their app inbox.
        </p>
      </div>
      <button
        type="button"
        class="inline-flex items-center justify-center gap-2 rounded-xl bg-electric-pink px-5 py-2.5 text-sm font-semibold text-pure-white shadow-sm transition hover:opacity-95 disabled:opacity-50"
        :disabled="busy"
        @click="submit"
      >
        <span class="material-symbols-outlined text-[18px]">{{ busy ? "progress_activity" : "send" }}</span>
        {{ busy ? "Posting…" : "Publish" }}
      </button>
    </div>

    <div class="grid grid-cols-1 gap-5 lg:grid-cols-5">
      <!-- Compose -->
      <section class="flex flex-col gap-4 rounded-xl bg-pure-white p-5 shadow-sm lg:col-span-3">
        <h2 class="text-sm font-semibold text-primary">Compose</h2>

        <div class="grid gap-3 sm:grid-cols-2">
          <label class="block">
            <span class="text-xs font-medium text-on-surface-variant">Who receives it</span>
            <select
              v-model="form.audience"
              class="mt-1.5 w-full rounded-xl bg-off-white px-3 py-2.5 text-sm text-on-surface outline-none"
            >
              <option value="both">Voters & members</option>
              <option value="voter">Voters only</option>
              <option value="member">Members only</option>
            </select>
          </label>
          <label class="block">
            <span class="text-xs font-medium text-on-surface-variant">Type</span>
            <select
              v-model="form.item_type"
              class="mt-1.5 w-full rounded-xl bg-off-white px-3 py-2.5 text-sm text-on-surface outline-none"
            >
              <option value="message">Message</option>
              <option value="invite">Action invite</option>
              <option value="material">Material</option>
            </select>
          </label>
          <label class="block">
            <span class="text-xs font-medium text-on-surface-variant">LGA</span>
            <select
              v-model="form.lga"
              class="mt-1.5 w-full rounded-xl bg-off-white px-3 py-2.5 text-sm text-on-surface outline-none"
            >
              <option value="">Select LGA</option>
              <option v-for="g in lgas" :key="g" :value="g">{{ g }}</option>
            </select>
          </label>
          <label class="block">
            <span class="text-xs font-medium text-on-surface-variant">Ward</span>
            <select
              v-model="form.ward"
              class="mt-1.5 w-full rounded-xl bg-off-white px-3 py-2.5 text-sm text-on-surface outline-none disabled:opacity-50"
              :disabled="!form.lga"
            >
              <option value="">Select ward</option>
              <option v-for="w in wards" :key="w" :value="w">{{ w }}</option>
            </select>
          </label>
        </div>

        <label class="block">
          <span class="text-xs font-medium text-on-surface-variant">Title</span>
          <input
            v-model="form.title"
            type="text"
            class="mt-1.5 w-full rounded-xl bg-off-white px-3 py-2.5 text-sm text-on-surface outline-none"
            placeholder="Weekend canvass — Ward 3"
          />
        </label>

        <label class="block">
          <span class="text-xs font-medium text-on-surface-variant">Message</span>
          <textarea
            v-model="form.body"
            rows="5"
            class="mt-1.5 w-full resize-y rounded-xl bg-off-white px-3 py-2.5 text-sm leading-relaxed text-on-surface outline-none"
            placeholder="Meet at the ward office at 9am…"
          />
        </label>

        <label class="block">
          <span class="text-xs font-medium text-on-surface-variant">Attachment URL (optional)</span>
          <input
            v-model="form.attachment_url"
            type="url"
            class="mt-1.5 w-full rounded-xl bg-off-white px-3 py-2.5 text-sm text-on-surface outline-none"
            placeholder="https://…"
          />
        </label>
      </section>

      <!-- Simple preview -->
      <section class="flex flex-col gap-3 rounded-xl bg-pure-white p-5 shadow-sm lg:col-span-2">
        <h2 class="text-sm font-semibold text-primary">Preview</h2>
        <div class="flex flex-1 flex-col gap-3 rounded-xl bg-surface-container-low p-4">
          <div class="flex items-center justify-between gap-2">
            <span class="text-xs font-semibold text-primary">{{ admin?.name || "HQ" }}</span>
            <span class="rounded-full bg-electric-pink/15 px-2 py-0.5 text-[10px] font-semibold uppercase text-electric-pink">
              {{ typeLabel(form.item_type) }}
            </span>
          </div>
          <p class="text-sm font-semibold text-primary">
            {{ form.title.trim() || "Title" }}
          </p>
          <p class="whitespace-pre-wrap text-sm leading-relaxed text-on-surface-variant">
            {{ previewBody }}
          </p>
          <p class="mt-auto pt-2 text-[11px] text-outline">
            {{ form.ward && form.lga ? `${form.ward} · ${form.lga}` : "Select LGA and ward" }}
            · {{ audienceLabel(form.audience || "both") }}
          </p>
        </div>
      </section>
    </div>

    <!-- Recent -->
    <section class="rounded-xl bg-pure-white p-5 shadow-sm">
      <div class="mb-4 flex items-center justify-between gap-3">
        <div>
          <h2 class="text-sm font-semibold text-primary">Recent posts</h2>
          <p class="text-xs text-on-surface-variant">Posts already sent to inboxes</p>
        </div>
        <button
          type="button"
          class="rounded-lg bg-surface-container px-3 py-1.5 text-xs text-primary hover:bg-surface-container-high disabled:opacity-50"
          :disabled="loading"
          @click="refresh"
        >
          Refresh
        </button>
      </div>

      <div v-if="loading" class="py-8 text-center text-sm text-on-surface-variant">Loading…</div>
      <div v-else-if="!items.length" class="py-8 text-center text-sm text-on-surface-variant">
        No posts yet. Publish your first message above.
      </div>
      <ul v-else class="divide-y divide-surface-container-high">
        <li v-for="item in items" :key="item.id" class="flex flex-wrap items-start justify-between gap-3 py-4">
          <div class="min-w-0 flex-1">
            <p class="font-medium text-on-surface">{{ item.title }}</p>
            <p class="mt-0.5 text-xs text-on-surface-variant">
              {{ item.ward }} · {{ item.lga }} · {{ audienceLabel(item.audience) }}
            </p>
            <p class="mt-2 line-clamp-2 text-sm text-on-surface-variant">{{ item.body }}</p>
            <p class="mt-2 text-xs text-outline">
              {{ item.recipient_count.toLocaleString() }} recipients · {{ formatWhen(item.created_at) }} ·
              {{ item.sender_name }}
            </p>
          </div>
          <span class="rounded-full bg-surface-container px-2.5 py-1 text-[10px] font-semibold uppercase text-primary">
            {{ typeLabel(item.item_type) }}
          </span>
        </li>
      </ul>
    </section>
  </div>
</template>
