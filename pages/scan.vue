<template>
  <div class="mx-auto max-w-4xl space-y-8 p-6">
    <section class="ui-card p-6">
      <h1 class="text-2xl font-semibold text-ui-text">Registration Scanner</h1>
      <p class="mt-2 text-sm text-ui-muted">
        Upload a paper registration form image. AI will extract fields and save them to MongoDB.
      </p>

      <div
        class="mt-6 rounded-lg border-2 border-dashed border-outline-variant bg-surface-container-low p-8 text-center"
        @dragover.prevent
        @drop.prevent="onDrop"
      >
        <p class="mb-3 text-sm text-ui-muted">Drag and drop a form image, or choose a file.</p>
        <input
          ref="fileInput"
          class="mx-auto block text-sm text-on-surface"
          type="file"
          accept="image/png,image/jpeg,application/pdf"
          @change="onSelectFile"
        />
      </div>

      <div class="mt-4 flex gap-3">
        <button
          class="rounded-lg bg-emerald-600 px-4 py-2 text-white transition hover:bg-emerald-500 disabled:cursor-not-allowed disabled:bg-emerald-900"
          :disabled="!selectedFile || loading"
          @click="upload"
        >
          {{ loading ? "Processing..." : "Upload and Extract" }}
        </button>
      </div>

      <p v-if="errorMsg" class="mt-3 text-sm text-red-500 dark:text-red-400">{{ errorMsg }}</p>
    </section>

    <section v-if="result" class="ui-card p-6">
      <h2 class="text-lg font-semibold text-ui-text">Extracted Registration</h2>
      <dl class="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
        <div><dt class="text-xs text-ui-muted">Name</dt><dd class="text-ui-text">{{ result.name || "-" }}</dd></div>
        <div><dt class="text-xs text-ui-muted">Phone</dt><dd class="text-ui-text">{{ result.phone || "-" }}</dd></div>
        <div><dt class="text-xs text-ui-muted">Email</dt><dd class="text-ui-text">{{ result.email || "-" }}</dd></div>
        <div><dt class="text-xs text-ui-muted">LGA</dt><dd class="text-ui-text">{{ result.lga || "-" }}</dd></div>
        <div><dt class="text-xs text-ui-muted">Ward</dt><dd class="text-ui-text">{{ result.ward || "-" }}</dd></div>
        <div><dt class="text-xs text-ui-muted">Polling Unit</dt><dd class="text-ui-text">{{ result.polling_unit || "-" }}</dd></div>
        <div><dt class="text-xs text-ui-muted">Address</dt><dd class="text-ui-text">{{ result.address || "-" }}</dd></div>
        <div><dt class="text-xs text-ui-muted">Date</dt><dd class="text-ui-text">{{ result.form_date || "-" }}</dd></div>
      </dl>
    </section>

    <section class="ui-card p-6">
      <h2 class="mb-3 text-lg font-semibold text-ui-text">Registration Trends</h2>
      <Line v-if="chartData.labels.length" :data="chartData" :options="chartOptions" />
      <p v-else class="text-sm text-ui-muted">No analytics data yet.</p>
    </section>
  </div>
</template>

<script setup lang="ts">
import { Chart as ChartJS, CategoryScale, LinearScale, LineElement, PointElement, Tooltip, Legend } from "chart.js";
import { Line } from "vue-chartjs";

definePageMeta({ layout: "default" });

ChartJS.register(CategoryScale, LinearScale, LineElement, PointElement, Tooltip, Legend);

const { isDark } = useTheme();

type Registration = {
  id: string;
  name: string | null;
  phone: string | null;
  email: string | null;
  ward: string | null;
  lga: string | null;
  polling_unit: string | null;
  address: string | null;
  form_date: string | null;
  created_at: string;
};

type Trend = { date: string; total: number };

const config = useRuntimeConfig();
const apiBase = config.public.apiBase;

const fileInput = ref<HTMLInputElement | null>(null);
const selectedFile = ref<File | null>(null);
const loading = ref(false);
const errorMsg = ref("");
const result = ref<Registration | null>(null);
const trends = ref<Trend[]>([]);

const chartOptions = computed(() => {
  const tick = isDark.value ? "#c7c4d7" : "#47464c";
  const grid = isDark.value ? "rgba(199,196,215,0.12)" : "rgba(120,118,124,0.16)";
  return {
    responsive: true,
    plugins: { legend: { labels: { color: tick } } },
    scales: {
      x: { ticks: { color: tick }, grid: { color: grid } },
      y: { ticks: { color: tick }, grid: { color: grid } },
    },
  };
});

const chartData = computed(() => ({
  labels: trends.value.map((x) => x.date),
  datasets: [
    {
      label: "Registrations per day",
      data: trends.value.map((x) => x.total),
      borderColor: "#10b981",
      backgroundColor: "rgba(16, 185, 129, 0.15)",
      tension: 0.3,
    },
  ],
}));

function onDrop(event: DragEvent) {
  if (!event.dataTransfer?.files?.length) return;
  selectedFile.value = event.dataTransfer.files[0];
}

function onSelectFile(event: Event) {
  const input = event.target as HTMLInputElement;
  if (!input.files?.length) return;
  selectedFile.value = input.files[0];
}

async function upload() {
  if (!selectedFile.value) return;
  loading.value = true;
  errorMsg.value = "";

  const formData = new FormData();
  formData.append("file", selectedFile.value);

  try {
    const res = await $fetch<Registration>(`${apiBase}/upload-form`, {
      method: "POST",
      body: formData,
    });
    result.value = res;
    await loadTrends();
  } catch (error: unknown) {
    const detail = (error as { data?: { detail?: string } })?.data?.detail;
    errorMsg.value = detail ?? "Upload failed. Please check server configuration.";
  } finally {
    loading.value = false;
  }
}

async function loadTrends() {
  trends.value = await $fetch<Trend[]>(`${apiBase}/analytics/trends`);
}

onMounted(loadTrends);
</script>
