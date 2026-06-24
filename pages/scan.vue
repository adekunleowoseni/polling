<template>
  <div class="mx-auto max-w-4xl space-y-8 p-6">
    <section class="rounded-xl border border-white/10 bg-slate-900 p-6 shadow-xl">
      <h1 class="text-2xl font-semibold text-white">Registration Scanner</h1>
      <p class="mt-2 text-sm text-slate-400">
        Upload a paper registration form image. AI will extract fields and save them to MongoDB.
      </p>

      <div
        class="mt-6 rounded-lg border-2 border-dashed border-slate-700 p-8 text-center"
        @dragover.prevent
        @drop.prevent="onDrop"
      >
        <p class="mb-3 text-sm text-slate-400">Drag and drop a form image, or choose a file.</p>
        <input
          ref="fileInput"
          class="mx-auto block text-sm text-slate-300"
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

      <p v-if="errorMsg" class="mt-3 text-sm text-red-400">{{ errorMsg }}</p>
    </section>

    <section v-if="result" class="rounded-xl border border-white/10 bg-slate-900 p-6 shadow-xl">
      <h2 class="text-lg font-semibold text-white">Extracted Registration</h2>
      <dl class="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
        <div><dt class="text-xs text-slate-500">Name</dt><dd class="text-slate-200">{{ result.name || "-" }}</dd></div>
        <div><dt class="text-xs text-slate-500">Phone</dt><dd class="text-slate-200">{{ result.phone || "-" }}</dd></div>
        <div><dt class="text-xs text-slate-500">Email</dt><dd class="text-slate-200">{{ result.email || "-" }}</dd></div>
        <div><dt class="text-xs text-slate-500">LGA</dt><dd class="text-slate-200">{{ result.lga || "-" }}</dd></div>
        <div><dt class="text-xs text-slate-500">Ward</dt><dd class="text-slate-200">{{ result.ward || "-" }}</dd></div>
        <div><dt class="text-xs text-slate-500">Polling Unit</dt><dd class="text-slate-200">{{ result.polling_unit || "-" }}</dd></div>
        <div><dt class="text-xs text-slate-500">Address</dt><dd class="text-slate-200">{{ result.address || "-" }}</dd></div>
        <div><dt class="text-xs text-slate-500">Date</dt><dd class="text-slate-200">{{ result.form_date || "-" }}</dd></div>
      </dl>
    </section>

    <section class="rounded-xl border border-white/10 bg-slate-900 p-6 shadow-xl">
      <h2 class="mb-3 text-lg font-semibold text-white">Registration Trends</h2>
      <Line v-if="chartData.labels.length" :data="chartData" :options="chartOptions" />
      <p v-else class="text-sm text-slate-500">No analytics data yet.</p>
    </section>
  </div>
</template>

<script setup lang="ts">
import { Chart as ChartJS, CategoryScale, LinearScale, LineElement, PointElement, Tooltip, Legend } from "chart.js";
import { Line } from "vue-chartjs";

definePageMeta({ layout: "default" });

ChartJS.register(CategoryScale, LinearScale, LineElement, PointElement, Tooltip, Legend);

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

const chartOptions = {
  responsive: true,
  plugins: { legend: { labels: { color: "#94a3b8" } } },
  scales: {
    x: { ticks: { color: "#94a3b8" }, grid: { color: "rgba(148,163,184,0.1)" } },
    y: { ticks: { color: "#94a3b8" }, grid: { color: "rgba(148,163,184,0.1)" } },
  },
};

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
