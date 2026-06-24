export type PollingUnitStat = {
  polling_unit: string;
  ward: string | null;
  lga: string | null;
  total: number;
  last_activity: string | null;
};

export type LiveActivity = {
  id: string;
  name: string | null;
  ward: string | null;
  lga: string | null;
  polling_unit: string | null;
  created_at: string;
};

export type LiveDashboard = {
  state: string;
  total_registrations: number;
  today_count: number;
  active_polling_units: number;
  active_wards: number;
  polling_units: PollingUnitStat[];
  recent_activity: LiveActivity[];
  updated_at: string;
};

export function useLiveDashboard(intervalMs = 8000) {
  const config = useRuntimeConfig();
  const data = ref<LiveDashboard | null>(null);
  const loading = ref(true);
  const error = ref("");
  const lastFetchedAt = ref<Date | null>(null);

  let timer: ReturnType<typeof setInterval> | undefined;

  async function refresh() {
    try {
      data.value = await $fetch<LiveDashboard>(`${config.public.apiBase}/analytics/live`);
      error.value = "";
      lastFetchedAt.value = new Date();
    } catch (err: unknown) {
      const detail = (err as { data?: { detail?: string } })?.data?.detail;
      error.value = detail ?? "Failed to load live data. Is the backend running?";
    } finally {
      loading.value = false;
    }
  }

  onMounted(() => {
    refresh();
    timer = setInterval(refresh, intervalMs);
  });

  onUnmounted(() => {
    if (timer) clearInterval(timer);
  });

  return { data, loading, error, lastFetchedAt, refresh };
}

export function formatRelativeTime(iso: string | null): string {
  if (!iso) return "—";
  const diffMs = Date.now() - new Date(iso).getTime();
  const seconds = Math.floor(diffMs / 1000);
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return new Date(iso).toLocaleString();
}

export function formatClock(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });
}
