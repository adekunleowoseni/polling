/** Google Maps JavaScript API — same key family as mobile EXPO_PUBLIC_GOOGLE_MAPS_API_KEY */
export function useGoogleMapsKey() {
  const config = useRuntimeConfig();
  const key = computed(() => String(config.public.googleMapsApiKey || "").trim());
  const hasKey = computed(() => key.value.length > 10);
  return { key, hasKey };
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
