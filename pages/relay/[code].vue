<template>
  <div class="mx-auto max-w-lg p-4 pb-24">
    <section class="rounded-2xl border border-white/10 bg-slate-900/80 p-5">
      <div class="flex items-start justify-between gap-3">
        <div>
          <p class="text-xs uppercase tracking-wider text-slate-500">Agent relay — {{ agent?.name }}</p>
          <h1 class="text-lg font-semibold text-white">{{ code }}</h1>
          <p class="mt-1 text-xs text-slate-400">
            Realtime WebRTC video + audio. Face counting runs in the background.
          </p>
        </div>
        <span
          class="shrink-0 rounded-full px-2 py-1 text-xs font-semibold"
          :class="streaming ? 'bg-red-600 text-white' : 'bg-slate-700 text-slate-300'"
        >
          {{ streaming ? "LIVE" : status }}
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

      <div class="mt-4 flex flex-wrap gap-3">
        <button
          v-if="!streaming"
          class="flex-1 rounded-lg bg-emerald-600 py-2.5 text-sm font-medium text-white hover:bg-emerald-500 disabled:opacity-50"
          :disabled="!ingestToken || verifyingToken || starting"
          @click="startStream"
        >
          {{ starting ? "Starting…" : verifyingToken ? "Verifying token…" : "Start live relay" }}
        </button>
        <template v-else>
          <button
            type="button"
            class="rounded-lg border px-4 py-2.5 text-sm font-medium"
            :class="micMuted
              ? 'border-amber-500/40 bg-amber-500/10 text-amber-300'
              : 'border-sky-500/40 bg-sky-500/10 text-sky-300'"
            @click="toggleMic"
          >
            {{ micMuted ? "Unmute mic" : "Mute mic" }}
          </button>
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
        WebRTC live · mic {{ micMuted ? "muted" : "on" }}
        <span v-if="lastNewFaces"> · +{{ lastNewFaces }} new face(s)</span>
      </p>
    </section>

    <section class="mt-4 rounded-2xl border border-white/10 bg-slate-900/80 p-5">
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
import {
  Room,
  RoomEvent,
  Track,
  createLocalTracks,
  type LocalAudioTrack,
  type LocalVideoTrack,
} from "livekit-client";

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
const starting = ref(false);
const status = ref("idle");
const error = ref("");
const lastCount = ref<number | null>(null);
const lastNewFaces = ref(0);
const correctedCount = ref(0);
const savingCount = ref(false);
const countMessage = ref("");
const snapping = ref(false);
const snapMessage = ref("");
const verifyingToken = ref(false);
const tokenError = ref("");
const tokenValid = ref(false);
const micMuted = ref(false);

const tokenBorderClass = computed(() => {
  if (tokenError.value) return "border-red-500 bg-slate-950";
  if (tokenValid.value) return "border-emerald-500/60 bg-slate-950";
  return "border-white/10 bg-slate-950";
});

let room: Room | null = null;
let localVideo: LocalVideoTrack | null = null;
let localAudio: LocalAudioTrack | null = null;
let countTimer: ReturnType<typeof setInterval> | null = null;
let sendingCountFrame = false;

/** Face-count samples only (video/audio is WebRTC). */
const countIntervalMs = 2000;

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
    // ignore
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
    const statusCode = (err as { statusCode?: number })?.statusCode;
    const detail = (err as { data?: { detail?: string } })?.data?.detail;
    if (statusCode === 401) {
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
  countMessage.value = "";
  error.value = "";
  savingCount.value = true;
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
    countMessage.value = "Count updated.";
  } catch (err: unknown) {
    const detail = (err as { data?: { detail?: string } })?.data?.detail;
    error.value = typeof detail === "string" ? detail : "Failed to update count.";
  } finally {
    savingCount.value = false;
  }
}

function ingestHeaders() {
  return {
    "X-Ingest-Token": ingestToken.value,
    ...authHeaders(),
  };
}

async function startStream() {
  error.value = "";
  tokenError.value = "";
  starting.value = true;

  const ok = await validateIngestToken();
  if (!ok) {
    starting.value = false;
    return;
  }

  try {
    const session = await $fetch<{ url: string; token: string }>(`${apiBase}/webrtc/publisher-token`, {
      method: "POST",
      headers: ingestHeaders(),
      body: { code: code.value },
    });

    const tracks = await createLocalTracks({
      audio: true,
      video: {
        facingMode: "environment",
        resolution: { width: 1280, height: 720, frameRate: 24 },
      },
    });

    localVideo = (tracks.find((t) => t.kind === Track.Kind.Video) as LocalVideoTrack | undefined) ?? null;
    localAudio = (tracks.find((t) => t.kind === Track.Kind.Audio) as LocalAudioTrack | undefined) ?? null;

    if (localVideo && videoEl.value) {
      localVideo.attach(videoEl.value);
    }

    room = new Room();
    room.on(RoomEvent.Disconnected, () => {
      if (streaming.value) {
        error.value = "Live connection lost.";
        void stopStream();
      }
    });

    await room.connect(session.url, session.token);
    if (localVideo) await room.localParticipant.publishTrack(localVideo);
    if (localAudio) await room.localParticipant.publishTrack(localAudio);

    await $fetch(`${apiBase}/webrtc/${code.value}/start`, {
      method: "POST",
      headers: ingestHeaders(),
    });

    streaming.value = true;
    status.value = "live";
    micMuted.value = false;
    countTimer = setInterval(sendCountFrame, countIntervalMs);
    void sendCountFrame();
  } catch (err: unknown) {
    const detail = (err as { data?: { detail?: string } })?.data?.detail;
    error.value =
      typeof detail === "string"
        ? detail
        : "Could not start WebRTC. Check LiveKit config and camera/mic permissions.";
    await stopStream();
  } finally {
    starting.value = false;
  }
}

async function toggleMic() {
  if (!localAudio) return;
  if (micMuted.value) {
    await localAudio.unmute();
    micMuted.value = false;
  } else {
    await localAudio.mute();
    micMuted.value = true;
  }
}

async function stopStream() {
  streaming.value = false;
  status.value = "stopped";
  if (countTimer) clearInterval(countTimer);
  countTimer = null;

  try {
    if (ingestToken.value) {
      await $fetch(`${apiBase}/webrtc/${code.value}/stop`, {
        method: "POST",
        headers: ingestHeaders(),
      });
    }
  } catch {
    // best effort
  }

  if (room) {
    room.removeAllListeners();
    await room.disconnect();
    room = null;
  }
  localVideo?.stop();
  localAudio?.stop();
  localVideo = null;
  localAudio = null;
  if (videoEl.value) videoEl.value.srcObject = null;
}

function drawCountFrame(maxWidth = 480): boolean {
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

async function sendCountFrame() {
  if (!streaming.value || sendingCountFrame) return;
  if (!drawCountFrame(480)) return;
  const canvas = canvasEl.value;
  if (!canvas) return;

  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.5));
  if (!blob) return;

  const formData = new FormData();
  formData.append("frame", blob, "frame.jpg");
  sendingCountFrame = true;
  try {
    const res = await $fetch<{ people_count: number; new_faces_this_frame: number }>(
      `${apiBase}/polling-units/${code.value}/ingest`,
      {
        method: "POST",
        body: formData,
        headers: ingestHeaders(),
      },
    );
    lastCount.value = res.people_count;
    lastNewFaces.value = res.new_faces_this_frame;
  } catch (err: unknown) {
    const statusCode = (err as { statusCode?: number })?.statusCode;
    if (statusCode === 401) {
      tokenError.value = "Invalid ingest token. Relay stopped.";
      await stopStream();
    }
  } finally {
    sendingCountFrame = false;
  }
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
    if (!drawCountFrame(1280)) {
      error.value = "Camera frame not ready. Try again in a moment.";
      return;
    }
    const canvas = canvasEl.value;
    if (!canvas) return;
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.9));
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

onUnmounted(() => {
  void stopStream();
});
</script>
