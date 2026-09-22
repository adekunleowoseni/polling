/** Google Maps JavaScript API — prefer key from backend `/public/client-config`. */

type ClientConfig = {
  google_maps_api_key: string;
  google_maps_configured: boolean;
};

const mapsKeyState = () =>
  useState<string>("googleMapsApiKeyFromBackend", () => "");

export function useGoogleMapsKey() {
  const config = useRuntimeConfig();
  const remoteKey = mapsKeyState();
  const key = computed(() => {
    const fromBackend = String(remoteKey.value || "").trim();
    if (fromBackend.length > 10) return fromBackend;
    return String(config.public.googleMapsApiKey || "").trim();
  });
  const hasKey = computed(() => key.value.length > 10);

  async function ensureMapsKey() {
    if (import.meta.server) return key.value;
    if (remoteKey.value.length > 10) return remoteKey.value;
    try {
      const apiBase = String(config.public.apiBase || "").replace(/\/$/, "");
      const data = await $fetch<ClientConfig>(`${apiBase}/public/client-config`);
      const fetched = String(data?.google_maps_api_key || "").trim();
      if (fetched.length > 10) remoteKey.value = fetched;
    } catch {
      /* fall back to NUXT_PUBLIC_GOOGLE_MAPS_API_KEY */
    }
    return key.value;
  }

  return { key, hasKey, ensureMapsKey };
}

let mapsLoadPromise: Promise<void> | null = null;

export function loadGoogleMapsScript(apiKey: string): Promise<void> {
  if (import.meta.server) return Promise.reject(new Error("Google Maps is client-only."));
  const g = window as Window & { google?: { maps?: unknown } };
  if (g.google?.maps) return Promise.resolve();
  if (mapsLoadPromise) return mapsLoadPromise;

  mapsLoadPromise = new Promise((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>("script[data-google-maps]");
    if (existing) {
      existing.addEventListener("load", () => resolve());
      existing.addEventListener("error", () => reject(new Error("Google Maps failed to load.")));
      if (g.google?.maps) resolve();
      return;
    }
    const script = document.createElement("script");
    script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(apiKey)}`;
    script.async = true;
    script.defer = true;
    script.dataset.googleMaps = "1";
    script.onload = () => resolve();
    script.onerror = () => {
      mapsLoadPromise = null;
      reject(new Error("Google Maps failed to load."));
    };
    document.head.appendChild(script);
  });

  return mapsLoadPromise;
}
