<template>
  <div class="mx-auto max-w-lg p-4 pb-24">
    <section class="rounded-2xl border border-white/10 bg-slate-900/80 p-5">
      <div class="flex items-start justify-between gap-3">
        <div>
          <p class="text-xs uppercase tracking-wider text-slate-500">Agent relay — {{ agent?.name }}</p>
          <h1 class="text-lg font-semibold text-white">{{ code }}</h1>
          <p class="mt-1 text-xs text-slate-400">
            Streams POV frames for live video. Each face is counted once — no duplicates.
          </p>
        </div>
        <span
          class="shrink-0 rounded-full px-2 py-1 text-xs font-semibold"
          :class="streaming ? 'bg-red-600 text-white' : 'bg-slate-700 text-slate-300'"
        >
          {{ streaming ? "STREAMING" : status }}
        </span>
      </div>

      <div class="relative mt-4 aspect-video overflow-hidden rounded-xl bg-black">
        <video ref="videoEl" autoplay playsinline muted class="h-full w-full object-cover" />
        <canvas ref="canvasEl" class="hidden" />
        <div v-if="lastCount !== null" class="absolute bottom-3 right-3 rounded-lg bg-black/70 px-3 py-2 text-right">
          <p class="text-2xl font-bold text-emerald-400">{{ lastCount }}</p>
          <p class="text-[10px] uppercase text-slate-400">unique people</p>
        </div>
      </div>

      <label class="mt-4 block">
        <span class="text-xs text-slate-500">Ingest token (from when you created this unit)</span>
        <input
          v-model="ingestToken"
          type="password"
          class="mt-1 w-full rounded-lg border px-3 py-2 text-sm text-white"
          :class="tokenBorderClass"
          placeholder="Required to stream"
          @input="onTokenInput"
          @blur="validateIngestToken"
        />
        <p v-if="tokenError" class="mt-1.5 text-sm text-red-400">{{ tokenError }}</p>
        <p v-else-if="tokenValid" class="mt-1.5 text-sm text-emerald-400">Ingest token verified.</p>
      </label>

      <div class="mt-4 flex gap-3">
        <button
          v-if="!streaming"
          class="flex-1 rounded-lg bg-emerald-600 py-2.5 text-sm font-medium text-white hover:bg-emerald-500 disabled:opacity-50"
          :disabled="!ingestToken || verifyingToken"
          @click="startStream"
        >
          {{ verifyingToken ? "Verifying token…" : "Start relay" }}
        </button>
        <template v-else>
          <button
            type="button"
            class="rounded-lg border border-sky-500/40 bg-sky-500/10 px-4 py-2.5 text-sm font-medium text-sky-300 hover:bg-sky-500/20 disabled:opacity-50"
            :disabled="snapping"
            @click="snapPicture"
          >
            {{ snapping ? "Saving…" : "Snap picture" }}
          </button>
          <button
            class="flex-1 rounded-lg bg-red-600 py-2.5 text-sm font-medium text-white hover:bg-red-500"
            @click="stopStream"
          >
            Stop relay
          </button>
        </template>
      </div>

      <p v-if="snapMessage" class="mt-2 text-xs text-sky-400">{{ snapMessage }}</p>

      <p v-if="error" class="mt-3 text-sm text-red-400">{{ error }}</p>
      <p v-if="streaming" class="mt-3 text-xs text-slate-500">
        Live stream ~{{ fpsLabel }} fps · {{ framesSent }} frames sent
        <span v-if="lastNewFaces"> · +{{ lastNewFaces }} new face(s) last frame</span>
      </p>
    </section>

    <section class="rounded-2xl border border-white/10 bg-slate-900/80 p-5">
      <h2 class="text-sm font-semibold text-white">Correct unique people count</h2>
      <p class="mt-1 text-xs text-slate-500">
        If the auto-detected count is wrong, set the correct number of unique people on site.
      </p>
      <div class="mt-4 flex flex-wrap items-end gap-3">
        <label class="min-w-[120px] flex-1">
          <span class="text-xs text-slate-500">Unique people</span>
          <input
            v-model.number="correctedCount"
            type="number"
            min="0"
            max="10000"
            class="mt-1 w-full rounded-lg border border-white/10 bg-slate-950 px-3 py-2 text-sm text-white"
          />
        </label>
        <button
          type="button"
          class="rounded-lg border border-emerald-500/40 bg-emerald-500/10 px-4 py-2 text-sm text-emerald-300 hover:bg-emerald-500/20 disabled:opacity-50"
          :disabled="savingCount || correctedCount < 0"
          @click="saveCorrectedCount"
        >
          {{ savingCount ? "Saving…" : "Update count" }}
        </button>
      </div>
      <p v-if="countMessage" class="mt-2 text-xs text-emerald-400">{{ countMessage }}</p>
    </section>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ layout: "default" });

const route = useRoute();
const config = useRuntimeConfig();
const apiBase = config.public.apiBase;
const { agent, authHeaders, requireAgent } = useAgentAuth();

const code = computed(() => String(route.params.code).toLowerCase());
const ingestToken = ref(String(route.query.token ?? ""));
const videoEl = ref<HTMLVideoElement | null>(null);
const canvasEl = ref<HTMLCanvasElement | null>(null);

const streaming = ref(false);
const status = ref("idle");
const error = ref("");
const lastCount = ref<number | null>(null);
const lastNewFaces = ref(0);
const framesSent = ref(0);
/** Live video interval (ms). Lower = more realtime, more bandwidth. */
const frameIntervalMs = 400;
const fpsLabel = (1000 / frameIntervalMs).toFixed(1);
let sendingFrame = false;
const correctedCount = ref(0);
const savingCount = ref(false);
const countMessage = ref("");
const snapping = ref(false);
const snapMessage = ref("");
const verifyingToken = ref(false);
const tokenError = ref("");
const tokenValid = ref(false);

const tokenBorderClass = computed(() => {
  if (tokenError.value) return "border-red-500 bg-slate-950";
  if (tokenValid.value) return "border-emerald-500/60 bg-slate-950";
  return "border-white/10 bg-slate-950";
});

let mediaStream: MediaStream | null = null;
let sendTimer: ReturnType<typeof setInterval> | null = null;

onMounted(async () => {
  if (!requireAgent()) return;
  if (!ingestToken.value && import.meta.client) {
    ingestToken.value = localStorage.getItem(`ingest_token_${code.value}`) ?? "";
  }
  await loadCurrentCount();
});

async function loadCurrentCount() {
  try {
    const units = await $fetch<{ code: string; people_count: number }[]>(
      `${apiBase}/agents/me/polling-units`,
      { headers: authHeaders() },
    );
    const unit = units.find((u) => u.code === code.value);
    if (unit) {
      lastCount.value = unit.people_count;
      correctedCount.value = unit.people_count;
    }
  } catch {
    // unit list may fail before stream starts
  }
}

function onTokenInput() {
  tokenError.value = "";
  tokenValid.value = false;
  if (import.meta.client && ingestToken.value) {
    localStorage.setItem(`ingest_token_${code.value}`, ingestToken.value);
  }
}

async function validateIngestToken(): Promise<boolean> {
  tokenError.value = "";
  tokenValid.value = false;
  if (!ingestToken.value) {
    tokenError.value = "Ingest token is required.";
    return false;
  }

  verifyingToken.value = true;
  try {
    await $fetch(`${apiBase}/polling-units/${code.value}/verify-ingest`, {
      method: "POST",
      headers: {
        "X-Ingest-Token": ingestToken.value,
        ...authHeaders(),
      },
    });
    tokenValid.value = true;
    return true;
  } catch (err: unknown) {
    const status = (err as { statusCode?: number })?.statusCode;
    const detail = (err as { data?: { detail?: string } })?.data?.detail;
    if (status === 401) {
      tokenError.value = "Invalid ingest token. Check the token from when you created this unit.";
    } else if (typeof detail === "string") {
      tokenError.value = detail;
    } else {
      tokenError.value = "Could not verify ingest token.";
    }
    return false;
  } finally {
    verifyingToken.value = false;
  }
}

async function saveCorrectedCount() {
  savingCount.value = true;
  countMessage.value = "";
  error.value = "";
  try {
    const res = await $fetch<{ people_count: number }>(
      `${apiBase}/polling-units/${code.value}/people-count`,
      {
        method: "PATCH",
        headers: authHeaders(),
        body: { people_count: correctedCount.value },
      },
    );
    lastCount.value = res.people_count;
    countMessage.value = `Count updated to ${res.people_count} unique people.`;
  } catch (err: unknown) {
    const status = (err as { statusCode?: number })?.statusCode;
    const detail = (err as { data?: { detail?: string } })?.data?.detail;
    if (status === 404) {
      error.value = "Update endpoint not found — restart the backend server, then try again.";
    } else if (typeof detail === "string") {
      error.value = detail;
    } else {
      error.value = "Failed to update count.";
    }
  } finally {
    savingCount.value = false;
  }
}

async function startStream() {
  error.value = "";
  tokenError.value = "";

  const ok = await validateIngestToken();
  if (!ok) return;

  try {
    mediaStream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: "environment", width: { ideal: 640 }, height: { ideal: 480 } },
      audio: false,
    });
    if (videoEl.value) videoEl.value.srcObject = mediaStream;
    streaming.value = true;
    status.value = "live";
    await sendFrame();
    if (tokenError.value || error.value) {
      stopStream();
      return;
    }
    sendTimer = setInterval(sendFrame, frameIntervalMs);
  } catch {
    error.value = "Camera access denied. Allow camera permission to relay video.";
    stopStream();
  }
}

function stopStream() {
  streaming.value = false;
  status.value = "stopped";
  if (sendTimer) clearInterval(sendTimer);
  sendTimer = null;
  mediaStream?.getTracks().forEach((t) => t.stop());
  mediaStream = null;
  if (videoEl.value) videoEl.value.srcObject = null;
}

function drawLiveFrame(maxWidth = 640): boolean {
  const video = videoEl.value;
  const canvas = canvasEl.value;
  if (!video || !canvas || video.readyState < 2) return false;

  const srcW = video.videoWidth || maxWidth;
  const srcH = video.videoHeight || Math.round(maxWidth * 0.75);
  const scale = Math.min(1, maxWidth / srcW);
  canvas.width = Math.max(1, Math.round(srcW * scale));
  canvas.height = Math.max(1, Math.round(srcH * scale));
  const ctx = canvas.getContext("2d");
  if (!ctx) return false;
  ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
  return true;
}

async function captureFrameBlob(quality = 0.9, maxWidth = 1280): Promise<Blob | null> {
  if (!drawLiveFrame(maxWidth)) return null;
  const canvas = canvasEl.value;
  if (!canvas) return null;
  return new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", quality));
}

async function snapPicture() {
  if (!streaming.value) {
    error.value = "Start the relay before snapping a picture.";
    return;
  }

  snapping.value = true;
  snapMessage.value = "";
  error.value = "";

  try {
    const blob = await captureFrameBlob(0.9, 1280);
    if (!blob) {
      error.value = "Camera frame not ready. Try again in a moment.";
      return;
    }

    const formData = new FormData();
    formData.append("photo", blob, "snap.jpg");

    await $fetch(`${apiBase}/polling-units/${code.value}/snaps`, {
      method: "POST",
      body: formData,
      headers: authHeaders(),
    });
    snapMessage.value = "Picture saved. It will appear on the ward feed card.";
  } catch (err: unknown) {
    const detail = (err as { data?: { detail?: string } })?.data?.detail;
    error.value = typeof detail === "string" ? detail : "Failed to save picture.";
  } finally {
    snapping.value = false;
  }
}

async function sendFrame() {
  // Drop frames if the previous upload is still in flight (keeps stream realtime).
  if (sendingFrame || !streaming.value) return;
  if (!drawLiveFrame(640)) return;

  const canvas = canvasEl.value;
  if (!canvas) return;

  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.55));
  if (!blob) return;

  const formData = new FormData();
  formData.append("frame", blob, "frame.jpg");

  sendingFrame = true;
  try {
    const res = await $fetch<{ people_count: number; new_faces_this_frame: number }>(
      `${apiBase}/polling-units/${code.value}/ingest`,
      {
        method: "POST",
        body: formData,
        headers: {
          "X-Ingest-Token": ingestToken.value,
          ...authHeaders(),
        },
      },
    );
    lastCount.value = res.people_count;
    lastNewFaces.value = res.new_faces_this_frame;
    framesSent.value += 1;
    error.value = "";
  } catch (err: unknown) {
    const status = (err as { statusCode?: number })?.statusCode;
    const detail = (err as { data?: { detail?: string } })?.data?.detail;
    if (status === 401) {
      tokenError.value = "Invalid ingest token. Relay stopped.";
      stopStream();
      return;
    }
    error.value = typeof detail === "string" ? detail : "Failed to send frame.";
  } finally {
    sendingFrame = false;
  }
}

onUnmounted(stopStream);
</script>
