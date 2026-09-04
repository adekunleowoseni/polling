<script setup lang="ts">
import { useInbox, type InboxBroadcast, type InboxPostCreate } from "~/composables/useInbox";

const emit = defineEmits<{ (e: "error", msg: string): void; (e: "message", msg: string): void }>();

const { loadBroadcasts, createBroadcast } = useInbox();
const { admin } = useAdminAuth();

const loading = ref(true);
const busy = ref(false);
const items = ref<InboxBroadcast[]>([]);

const form = reactive<InboxPostCreate>({
  item_type: "material",
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
    emit("error", "Fill in title, message, LGA, and ward.");
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
    emit("message", `Posted to ${created.recipient_count} voter(s)/member(s).`);
    form.title = "";
    form.body = "";
    form.attachment_url = "";
    await refresh();
  } catch (e: unknown) {
    emit("error", e instanceof Error ? e.message : "Post failed.");
  } finally {
    busy.value = false;
  }
}

onMounted(refresh);
</script>

<template>
  <div class="space-y-6">
    <div class="ui-card p-5">
      <h2 class="text-lg font-semibold text-ui-text">Post to voter & member inbox</h2>
      <p class="mt-1 text-sm text-ui-muted">
        Send action invites, messages, or materials to voters and members by LGA and ward. They appear in the mobile inbox.
      </p>

      <div class="mt-4 grid gap-3 sm:grid-cols-2">
        <label class="block">
          <span class="text-xs font-medium uppercase text-ui-muted">Type</span>
          <select v-model="form.item_type" class="ui-input mt-1 w-full">
            <option value="invite">Action invite</option>
            <option value="message">Message</option>
            <option value="material">Material</option>
          </select>
        </label>
        <label class="block">
          <span class="text-xs font-medium uppercase text-ui-muted">Audience</span>
          <select v-model="form.audience" class="ui-input mt-1 w-full">
            <option value="both">Voters & members</option>
            <option value="voter">Voters only</option>
            <option value="member">Members only</option>
          </select>
        </label>
        <label class="block sm:col-span-2">
          <span class="text-xs font-medium uppercase text-ui-muted">Title</span>
          <input v-model="form.title" class="ui-input mt-1 w-full" placeholder="Weekend canvass — Ward 3" />
        </label>
        <label class="block sm:col-span-2">
          <span class="text-xs font-medium uppercase text-ui-muted">Message / details</span>
          <textarea v-model="form.body" rows="4" class="ui-input mt-1 w-full" placeholder="Meet at the ward office at 9am…" />
        </label>
        <label class="block sm:col-span-2">
          <span class="text-xs font-medium uppercase text-ui-muted">Attachment URL (optional)</span>
          <input v-model="form.attachment_url" class="ui-input mt-1 w-full" placeholder="https://…" />
        </label>
        <label class="block">
          <span class="text-xs font-medium uppercase text-ui-muted">State</span>
          <select v-model="form.state" class="ui-input mt-1 w-full">
            <option>Ogun State</option>
          </select>
        </label>
        <label class="block">
          <span class="text-xs font-medium uppercase text-ui-muted">LGA</span>
          <select v-model="form.lga" class="ui-input mt-1 w-full">
            <option value="">Select LGA</option>
            <option v-for="g in lgas" :key="g" :value="g">{{ g }}</option>
          </select>
        </label>
        <label class="block">
          <span class="text-xs font-medium uppercase text-ui-muted">Ward</span>
          <select v-model="form.ward" class="ui-input mt-1 w-full" :disabled="!form.lga">
            <option value="">Select ward</option>
            <option v-for="w in wards" :key="w" :value="w">{{ w }}</option>
          </select>
        </label>
        <label class="block">
          <span class="text-xs font-medium uppercase text-ui-muted">Polling unit code (optional)</span>
          <input v-model="form.polling_unit_code" class="ui-input mt-1 w-full" />
        </label>
      </div>

      <button type="button" class="ui-btn-primary mt-4" :disabled="busy" @click="submit">
        {{ busy ? "Posting…" : "Post to inbox" }}
      </button>
    </div>

    <div class="ui-card overflow-hidden">
      <div class="border-b border-ui-border/40 px-5 py-4">
        <h3 class="font-semibold text-ui-text">Recent posts</h3>
      </div>
      <div v-if="loading" class="p-8 text-center text-sm text-ui-muted">Loading…</div>
      <div v-else-if="!items.length" class="p-8 text-center text-sm text-ui-muted">No inbox posts yet.</div>
      <ul v-else class="divide-y divide-ui-border/30">
        <li v-for="item in items" :key="item.id" class="px-5 py-4">
          <div class="flex flex-wrap items-start justify-between gap-2">
            <div>
              <p class="font-medium text-ui-text">{{ item.title }}</p>
              <p class="text-sm text-ui-muted">{{ item.ward }} · {{ item.lga }} · {{ item.state }}</p>
              <p class="mt-2 line-clamp-3 text-sm text-ui-text">{{ item.body }}</p>
              <p class="mt-2 text-xs text-ui-muted">
                {{ item.recipient_count }} recipients · {{ item.audience }} · by {{ item.sender_name }}
              </p>
            </div>
            <span class="rounded-full bg-violet-500/15 px-2 py-1 text-xs font-medium uppercase text-violet-700">
              {{ item.item_type }}
            </span>
          </div>
        </li>
      </ul>
    </div>
  </div>
</template>
