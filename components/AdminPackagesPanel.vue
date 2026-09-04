<script setup lang="ts">
import { usePackages, type PackageDistribution, type PackageDistributionCreate } from "~/composables/usePackages";

const emit = defineEmits<{ (e: "error", msg: string): void; (e: "message", msg: string): void }>();

const { loadDistributions, createDistribution } = usePackages();
const { admin } = useAdminAuth();

const loading = ref(true);
const busy = ref(false);
const items = ref<PackageDistribution[]>([]);

const form = reactive<PackageDistributionCreate>({
  title: "Relief package distribution",
  state: admin.value?.state ?? "Ogun State",
  lga: "",
  ward: "",
  polling_unit_code: "",
  polling_unit_name: "",
  audience: "both",
  package_count: undefined,
  auto_count: true,
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
    items.value = await loadDistributions();
  } catch (e: unknown) {
    emit("error", e instanceof Error ? e.message : "Failed to load distributions.");
  } finally {
    loading.value = false;
  }
}

async function submit() {
  if (!form.lga || !form.ward) {
    emit("error", "Select LGA and ward.");
    return;
  }
  busy.value = true;
  try {
    const body: PackageDistributionCreate = {
      title: form.title.trim(),
      state: form.state,
      lga: form.lga,
      ward: form.ward,
      audience: form.audience,
      auto_count: form.auto_count,
    };
    if (form.polling_unit_code?.trim()) body.polling_unit_code = form.polling_unit_code.trim();
    if (form.polling_unit_name?.trim()) body.polling_unit_name = form.polling_unit_name.trim();
    if (!form.auto_count && form.package_count) body.package_count = form.package_count;

    await createDistribution(body);
    emit("message", "Package distribution published. Agents in this ward can accept it.");
    await refresh();
  } catch (e: unknown) {
    emit("error", e instanceof Error ? e.message : "Create failed.");
  } finally {
    busy.value = false;
  }
}

onMounted(refresh);
</script>

<template>
  <div class="space-y-6">
    <div class="ui-card p-5">
      <h2 class="text-lg font-semibold text-ui-text">Trigger package distribution</h2>
      <p class="mt-1 text-sm text-ui-muted">
        Publish packages by LGA, ward, and optional polling unit. Agents accept and show a QR code; voters/members scan to claim once.
      </p>

      <div class="mt-4 grid gap-3 sm:grid-cols-2">
        <label class="block sm:col-span-2">
          <span class="text-xs font-medium uppercase text-ui-muted">Title</span>
          <input v-model="form.title" class="ui-input mt-1 w-full" />
        </label>
        <label class="block">
          <span class="text-xs font-medium uppercase text-ui-muted">State</span>
          <select v-model="form.state" class="ui-input mt-1 w-full">
            <option>Ogun State</option>
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
          <input v-model="form.polling_unit_code" class="ui-input mt-1 w-full" placeholder="e.g. 27-01-01-001" />
        </label>
        <label class="block">
          <span class="text-xs font-medium uppercase text-ui-muted">Package count</span>
          <div class="mt-1 flex items-center gap-3">
            <label class="flex items-center gap-2 text-sm">
              <input v-model="form.auto_count" type="checkbox" />
              Auto from eligible voters/members
            </label>
            <input
              v-if="!form.auto_count"
              v-model.number="form.package_count"
              type="number"
              min="1"
              class="ui-input w-28"
            />
          </div>
        </label>
      </div>

      <button type="button" class="ui-btn-primary mt-4" :disabled="busy" @click="submit">
        {{ busy ? "Publishing…" : "Publish distribution" }}
      </button>
    </div>

    <div class="ui-card overflow-hidden">
      <div class="border-b border-ui-border/40 px-5 py-4">
        <h3 class="font-semibold text-ui-text">Recent distributions</h3>
      </div>
      <div v-if="loading" class="p-8 text-center text-sm text-ui-muted">Loading…</div>
      <div v-else-if="!items.length" class="p-8 text-center text-sm text-ui-muted">No distributions yet.</div>
      <ul v-else class="divide-y divide-ui-border/30">
        <li v-for="item in items" :key="item.id" class="px-5 py-4">
          <div class="flex flex-wrap items-start justify-between gap-2">
            <div>
              <p class="font-medium text-ui-text">{{ item.title }}</p>
              <p class="text-sm text-ui-muted">{{ item.ward }} · {{ item.lga }} · {{ item.state }}</p>
              <p class="mt-1 text-xs text-ui-muted">
                {{ item.packages_claimed }}/{{ item.package_count }} claimed · {{ item.eligible_count }} eligible ·
                {{ item.audience }}
              </p>
            </div>
            <span
              class="rounded-full px-2 py-1 text-xs font-medium uppercase"
              :class="
                item.status === 'active'
                  ? 'bg-emerald-500/15 text-emerald-700'
                  : item.status === 'completed'
                    ? 'bg-ui-muted/15 text-ui-muted'
                    : 'bg-violet-500/15 text-violet-700'
              "
            >
              {{ item.status }}
            </span>
          </div>
          <p v-if="item.agent_name" class="mt-2 text-xs text-ui-muted">Agent: {{ item.agent_name }}</p>
        </li>
      </ul>
    </div>
  </div>
</template>
