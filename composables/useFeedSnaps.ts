export type FeedSnap = {
  id: string;
  polling_unit_id: string;
  polling_unit_name: string;
  code: string;
  state: string;
  ward: string;
  lga: string;
  people_count: number;
  created_at: string;
};

export function feedSnapImageUrl(apiBase: string, snapId: string): string {
  return `${apiBase}/feed-snaps/${snapId}/image`;
}

export type SnapsByWard = {
  ward: string;
  snaps: FeedSnap[];
};

export type SnapsByLga = {
  lga: string;
  wards: SnapsByWard[];
};

export function groupSnapsByLgaAndWard(snaps: FeedSnap[]): SnapsByLga[] {
  const lgaMap = new Map<string, Map<string, FeedSnap[]>>();

  for (const snap of snaps) {
    const wardMap = lgaMap.get(snap.lga) ?? new Map<string, FeedSnap[]>();
    const list = wardMap.get(snap.ward) ?? [];
    list.push(snap);
    wardMap.set(snap.ward, list);
    lgaMap.set(snap.lga, wardMap);
  }

  return Array.from(lgaMap.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([lga, wardMap]) => ({
      lga,
      wards: Array.from(wardMap.entries())
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([ward, wardSnaps]) => ({
          ward,
          snaps: wardSnaps.sort(
            (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
          ),
        })),
    }));
}

export function useFeedSnaps(lga: Ref<string | null>) {
  const config = useRuntimeConfig();
  const apiBase = config.public.apiBase as string;

  const snaps = ref<FeedSnap[]>([]);
  const loading = ref(false);
  const error = ref("");

  async function refresh() {
    if (!lga.value) {
      snaps.value = [];
      return;
    }
    loading.value = true;
    error.value = "";
    try {
      snaps.value = await $fetch<FeedSnap[]>(`${apiBase}/feed-snaps`, {
        query: { lga: lga.value },
      });
    } catch {
      error.value = "Failed to load saved pictures.";
      snaps.value = [];
    } finally {
      loading.value = false;
    }
  }

  function snapsForWard(ward: string): FeedSnap[] {
    return snaps.value.filter((s) => s.ward === ward);
  }

  watch(lga, () => refresh(), { immediate: true });

  return { snaps, loading, error, refresh, snapsForWard, apiBase };
}
