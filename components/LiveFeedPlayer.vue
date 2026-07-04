<template>
  <div class="relative h-full w-full overflow-hidden bg-black">
    <video
      ref="videoEl"
      autoplay
      playsinline
      class="h-full w-full object-cover"
      :muted="audioMuted"
    />

    <div
      v-if="!connected"
      class="absolute inset-0 flex items-center justify-center bg-black/70 text-xs text-white/80"
    >
      {{ statusText }}
    </div>

    <div class="absolute bottom-1.5 left-1.5 flex items-center gap-1">
      <button
        type="button"
        class="rounded-full bg-black/70 p-1.5 text-white backdrop-blur hover:bg-black/90"
        :title="audioMuted ? 'Unmute audio' : 'Mute audio'"
        :aria-label="audioMuted ? 'Unmute audio' : 'Mute audio'"
        @click.stop="toggleAudio"
      >
        <svg v-if="audioMuted" class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2"
          />
        </svg>
        <svg v-else class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M15.536 8.464a5 5 0 010 7.072M18.364 5.636a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z"
          />
        </svg>
      </button>
    </div>

    <div
      v-if="peopleCount !== null && peopleCount !== undefined"
      class="absolute bottom-1.5 right-1.5 rounded bg-black/70 px-1.5 py-0.5 text-right backdrop-blur"
    >
      <p class="text-sm font-bold leading-none text-emerald-400">{{ peopleCount }}</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import {
  Room,
  RoomEvent,
  Track,
  type RemoteTrack,
  type RemoteTrackPublication,
  type RemoteParticipant,
} from "livekit-client";

const props = defineProps<{
  code: string;
  apiBase: string;
  peopleCount?: number | null;
  /** Start with audio muted (recommended for dashboard autoplay). */
  startMuted?: boolean;
}>();

const videoEl = ref<HTMLVideoElement | null>(null);
const audioMuted = ref(props.startMuted !== false);
const connected = ref(false);
const statusText = ref("Connecting…");

let room: Room | null = null;

function attachTrack(track: RemoteTrack) {
  const el = videoEl.value;
  if (!el) return;
  if (track.kind === Track.Kind.Video) {
    track.attach(el);
  } else if (track.kind === Track.Kind.Audio) {
    track.attach(el);
    el.muted = audioMuted.value;
  }
}

function onTrackSubscribed(
  track: RemoteTrack,
  _publication: RemoteTrackPublication,
  _participant: RemoteParticipant,
) {
  attachTrack(track);
  connected.value = true;
  statusText.value = "Live";
}

async function connect() {
  statusText.value = "Connecting…";
  connected.value = false;
  try {
    const session = await $fetch<{ url: string; token: string }>(`${props.apiBase}/webrtc/viewer-token`, {
      method: "POST",
      body: { code: props.code },
    });

    room = new Room({
      adaptiveStream: true,
      dynacast: true,
    });
    room.on(RoomEvent.TrackSubscribed, onTrackSubscribed);
    room.on(RoomEvent.Disconnected, () => {
      connected.value = false;
      statusText.value = "Reconnecting…";
      setTimeout(() => {
        void connect();
      }, 2000);
    });

    await room.connect(session.url, session.token);

    for (const participant of room.remoteParticipants.values()) {
      for (const publication of participant.trackPublications.values()) {
        if (publication.track) {
          attachTrack(publication.track as RemoteTrack);
          connected.value = true;
          statusText.value = "Live";
        }
      }
    }
    if (!connected.value) {
      statusText.value = "Waiting for agent…";
    }
  } catch (err: unknown) {
    const detail = (err as { data?: { detail?: string } })?.data?.detail;
    statusText.value = typeof detail === "string" ? detail : "WebRTC unavailable";
  }
}

function toggleAudio() {
  audioMuted.value = !audioMuted.value;
  if (videoEl.value) {
    videoEl.value.muted = audioMuted.value;
  }
}

async function disconnect() {
  if (room) {
    room.removeAllListeners();
    await room.disconnect();
    room = null;
  }
}

onMounted(() => {
  void connect();
});

onUnmounted(() => {
  void disconnect();
});

watch(
  () => props.code,
  async () => {
    await disconnect();
    await connect();
  },
);
</script>
