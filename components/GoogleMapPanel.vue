<script setup lang="ts">
import type { WebMapMarker } from "~/composables/useMapPollingUnits";
import { loadGoogleMapsScript, useGoogleMapsKey } from "~/composables/useGoogleMaps";

const props = withDefaults(
  defineProps<{
    center: { lat: number; lng: number };
    zoom?: number;
    markers?: WebMapMarker[];
    loading?: boolean;
    /** Closed polygon path for turf outline (first point need not equal last). */
    polygon?: { lat: number; lng: number }[];
    polygonColor?: string;
  }>(),
  { zoom: 10, markers: () => [], loading: false, polygon: () => [], polygonColor: "#FF387F" },
);

const emit = defineEmits<{ (e: "marker-click", id: string): void }>();

const { key, hasKey } = useGoogleMapsKey();
const mapEl = ref<HTMLElement | null>(null);
const ready = ref(false);
const loadError = ref("");

type GoogleMapsNs = {
  Map: new (el: HTMLElement, opts: Record<string, unknown>) => {
    setCenter: (c: { lat: number; lng: number }) => void;
    setZoom: (z: number) => void;
  };
  Marker: new (opts: Record<string, unknown>) => {
    setMap: (m: unknown) => void;
    addListener: (event: string, fn: () => void) => void;
  };
  Size: new (w: number, h: number) => unknown;
  Point: new (x: number, y: number) => unknown;
  LatLngBounds: new () => {
    extend: (p: { lat: number; lng: number }) => void;
    isEmpty: () => boolean;
  };
  Polygon: new (opts: Record<string, unknown>) => {
    setMap: (m: unknown) => void;
    setPath: (path: { lat: number; lng: number }[]) => void;
  };
};

let map: InstanceType<GoogleMapsNs["Map"]> | null = null;
let markerObjs: InstanceType<GoogleMapsNs["Marker"]>[] = [];
let polygonObj: InstanceType<GoogleMapsNs["Polygon"]> | null = null;

function pinSvg(color: string, kind: string) {
  const inner =
    kind === "user"
      ? `<circle cx="18" cy="16.5" r="5" fill="${color}"/>`
      : `<rect x="12.4" y="11" width="11.2" height="11.2" rx="1.6" fill="none" stroke="${color}" stroke-width="1.7"/>` +
        `<path d="M15 16.5l2.2 2.2 4.4-4.6" fill="none" stroke="${color}" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>`;
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" width="36" height="48" viewBox="0 0 36 48">` +
    `<path fill="${color}" d="M18 0C8.06 0 0 8.06 0 18c0 13.5 18 30 18 30s18-16.5 18-30C36 8.06 27.94 0 18 0z"/>` +
    `<circle fill="#ffffff" cx="18" cy="16.5" r="9.2"/>` +
    inner +
    `</svg>`
  );
}

function pinIcon(maps: GoogleMapsNs, color: string, kind: string) {
  return {
    url: `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(pinSvg(color || "#222230", kind || "unit"))}`,
    scaledSize: new maps.Size(36, 48),
    anchor: new maps.Point(18, 48),
  };
}

function getMaps(): GoogleMapsNs | null {
  const g = window as Window & { google?: { maps?: GoogleMapsNs } };
  return g.google?.maps ?? null;
}

function clearMarkers() {
  for (const m of markerObjs) m.setMap(null);
  markerObjs = [];
}

function renderPolygon() {
  const maps = getMaps();
  if (!maps || !map) return;
  const path = props.polygon.filter((p) => Number.isFinite(p.lat) && Number.isFinite(p.lng));
  if (path.length < 3) {
    if (polygonObj) {
      polygonObj.setMap(null);
      polygonObj = null;
    }
    return;
  }
  if (!polygonObj) {
    polygonObj = new maps.Polygon({
      paths: path,
      map,
      strokeColor: props.polygonColor,
      strokeOpacity: 0.95,
      strokeWeight: 2,
      fillColor: props.polygonColor,
      fillOpacity: 0.18,
      clickable: false,
    });
  } else {
    polygonObj.setPath(path);
    polygonObj.setMap(map);
  }
}

function renderMarkers() {
  const maps = getMaps();
  if (!maps || !map) return;
  clearMarkers();
  const bounds = new maps.LatLngBounds();
  for (const m of props.markers) {
    const marker = new maps.Marker({
      position: { lat: m.lat, lng: m.lng },
      map,
      title: m.subtitle ? `${m.title} (${m.subtitle})` : m.title,
      optimized: false,
      icon: pinIcon(maps, m.color || "#222230", m.kind || "unit"),
    });
    marker.addListener("click", () => emit("marker-click", m.id));
    markerObjs.push(marker);
    bounds.extend({ lat: m.lat, lng: m.lng });
  }
  for (const p of props.polygon) {
    if (Number.isFinite(p.lat) && Number.isFinite(p.lng)) bounds.extend(p);
  }
  renderPolygon();
  const hasBounds =
    props.markers.length + props.polygon.length > 1 &&
    !(bounds as { isEmpty?: () => boolean }).isEmpty?.();
  if (hasBounds) {
    try {
      (map as unknown as { fitBounds: (b: unknown, p?: number) => void }).fitBounds(bounds, 48);
    } catch {
      map.setCenter(props.center);
      map.setZoom(props.zoom);
    }
  } else if (props.markers.length === 1) {
    map.setCenter({ lat: props.markers[0].lat, lng: props.markers[0].lng });
    map.setZoom(Math.max(props.zoom, 12));
  } else {
    map.setCenter(props.center);
    map.setZoom(props.zoom);
  }
}

async function initMap() {
  if (!hasKey.value || !mapEl.value) return;
  loadError.value = "";
  try {
    await loadGoogleMapsScript(key.value);
    const maps = getMaps();
    if (!maps || !mapEl.value) throw new Error("Maps API unavailable.");
    map = new maps.Map(mapEl.value, {
      center: props.center,
      zoom: props.zoom,
      mapTypeControl: false,
      streetViewControl: false,
      fullscreenControl: false,
      clickableIcons: false,
    });
    ready.value = true;
    renderMarkers();
  } catch (e: unknown) {
    loadError.value = e instanceof Error ? e.message : "Could not load Google Maps.";
    ready.value = false;
  }
}

watch(
  () => [props.center.lat, props.center.lng, props.zoom, props.markers, props.polygon, props.polygonColor] as const,
  () => {
    if (!map) return;
    renderMarkers();
  },
  { deep: true },
);

onMounted(() => {
  void initMap();
});

onBeforeUnmount(() => {
  clearMarkers();
  if (polygonObj) {
    polygonObj.setMap(null);
    polygonObj = null;
  }
  map = null;
});
</script>

<template>
  <div class="relative h-full w-full overflow-hidden bg-deep-navy">
    <div v-if="!hasKey" class="flex h-full items-center justify-center p-6 text-center">
      <p class="max-w-sm text-sm text-pure-white/80">
        Add <code class="text-action-green">NUXT_PUBLIC_GOOGLE_MAPS_API_KEY</code> to
        <code class="text-action-green">frontend/.env</code> (same key as mobile) and restart the Nuxt
        server.
      </p>
    </div>
    <div v-else-if="loadError" class="flex h-full items-center justify-center p-6 text-center">
      <p class="text-sm text-electric-pink">{{ loadError }}</p>
    </div>
    <template v-else>
      <div ref="mapEl" class="h-full w-full" />
      <div
        v-if="loading || !ready"
        class="absolute inset-0 flex items-center justify-center bg-deep-navy/50 text-sm text-pure-white"
      >
        Loading map…
      </div>
    </template>
  </div>
</template>
