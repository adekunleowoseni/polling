export type MapPollingUnit = {
  code: string;
  name: string;
  state: string;
  lga: string;
  ward: string;
  lat: number;
  lng: number;
  registered: boolean;
  stream_status: string;
  people_count: number;
  is_live: boolean;
};

export type MapPollingUnitsResponse = {
  state: string;
  lga: string | null;
  ward: string | null;
  center_lat: number;
  center_lng: number;
  total: number;
  live_count: number;
  registered_count: number;
  units: MapPollingUnit[];
};

export type WebMapMarker = {
  id: string;
  lat: number;
  lng: number;
  title: string;
  subtitle?: string;
  color?: string;
  kind?: "unit" | "user";
};

const LIVE_COLOR = "#92D80A";
const REGISTERED_COLOR = "#FF387F";
const DEFAULT_COLOR = "#222230";

export function markerColorForUnit(unit: MapPollingUnit): string {
  if (unit.is_live) return LIVE_COLOR;
  if (unit.registered) return REGISTERED_COLOR;
  return DEFAULT_COLOR;
}

export function unitsToMapMarkers(units: MapPollingUnit[]): WebMapMarker[] {
  return units.map((unit) => ({
    id: unit.code,
    lat: unit.lat,
    lng: unit.lng,
    title: unit.name,
    subtitle: unit.code,
    color: markerColorForUnit(unit),
    kind: "unit" as const,
  }));
}

export function useMapPollingUnits() {
  const config = useRuntimeConfig();
  const apiBase = config.public.apiBase as string;

  const loading = ref(false);
  const error = ref("");
  const data = ref<MapPollingUnitsResponse | null>(null);

  async function load(params: { state?: string; lga?: string; ward?: string } = {}) {
    loading.value = true;
    error.value = "";
    try {
      const query: Record<string, string> = {
        state: params.state || "Ogun State",
      };
      if (params.lga) query.lga = params.lga;
      if (params.ward) query.ward = params.ward;
      data.value = await $fetch<MapPollingUnitsResponse>(`${apiBase}/public/map/polling-units`, { query });
    } catch {
      error.value = "Could not load polling unit map.";
      data.value = null;
    } finally {
      loading.value = false;
    }
  }

  const markers = computed(() => (data.value ? unitsToMapMarkers(data.value.units) : []));
  const center = computed(() =>
    data.value
      ? { lat: data.value.center_lat, lng: data.value.center_lng }
      : { lat: 7.0, lng: 3.35 },
  );

  return { loading, error, data, markers, center, load };
}
