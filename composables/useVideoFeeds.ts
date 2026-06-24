export type PollingUnit = {
  id: string;
  name: string;
  code: string;
  state: string;
  ward: string;
  lga: string;
  people_count: number;
  peak_people_count: number;
  stream_status: "live" | "offline";
  device_type: string;
  last_frame_at: string | null;
  created_at: string;
};

export type VideoFeedDashboard = {
  state: string;
  total_people: number;
  live_feeds: number;
  registered_units: number;
  units: PollingUnit[];
  updated_at: string;
};

export type FeedUpdateMessage = {
  type: "feed_update";
  code: string;
  people_count: number;
  stream_status: string;
  last_frame_at: string;
};

export function snapshotUrl(apiBase: string, code: string, cacheBust?: number): string {
  const t = cacheBust ?? Date.now();
  return `${apiBase}/polling-units/${code}/snapshot?t=${t}`;
}

export function useVideoFeeds(intervalMs = 5000) {
  const config = useRuntimeConfig();
  const apiBase = config.public.apiBase;
  const wsBase = apiBase.replace(/^https/, "wss").replace(/^http/, "ws");

  const data = ref<VideoFeedDashboard | null>(null);
  const loading = ref(true);
  const error = ref("");
  const frameVersions = ref<Record<string, number>>({});

  let pollTimer: ReturnType<typeof setInterval> | undefined;
  let socket: WebSocket | undefined;

  async function refresh() {
    try {
      data.value = await $fetch<VideoFeedDashboard>(`${apiBase}/analytics/video-feeds`);
      error.value = "";
    } catch (err: unknown) {
      const detail = (err as { data?: { detail?: string } })?.data?.detail;
      error.value = detail ?? "Failed to load video feeds.";
    } finally {
      loading.value = false;
    }
  }

  function bumpFrame(code: string) {
    frameVersions.value = { ...frameVersions.value, [code]: Date.now() };
  }

  function connectSocket() {
    socket = new WebSocket(`${wsBase}/ws/feeds`);
    socket.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data) as FeedUpdateMessage;
        if (msg.type !== "feed_update" || !data.value) return;
        const unit = data.value.units.find((u) => u.code === msg.code);
        if (unit) {
          unit.people_count = msg.people_count;
          unit.stream_status = msg.stream_status as PollingUnit["stream_status"];
          unit.last_frame_at = msg.last_frame_at;
          data.value.total_people = data.value.units
            .filter((u) => u.stream_status === "live")
            .reduce((sum, u) => sum + u.people_count, 0);
          data.value.live_feeds = data.value.units.filter((u) => u.stream_status === "live").length;
        }
        bumpFrame(msg.code);
      } catch {
        // ignore malformed messages
      }
    };
    socket.onclose = () => {
      setTimeout(connectSocket, 3000);
    };
  }

  onMounted(() => {
    refresh();
    pollTimer = setInterval(refresh, intervalMs);
    connectSocket();
  });

  onUnmounted(() => {
    if (pollTimer) clearInterval(pollTimer);
    socket?.close();
  });

  return { data, loading, error, apiBase, frameVersions, refresh, snapshotUrl, bumpFrame };
}
