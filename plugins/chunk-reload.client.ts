/**
 * Recovers from stale chunk references that Nuxt's route-level handler misses:
 * lazy components and prefetches that fail outside a navigation.
 */
const RELOAD_GUARD = "lado-chunk-reload";

function isChunkLoadError(reason: unknown): boolean {
  const message = reason instanceof Error ? reason.message : String(reason ?? "");
  return /dynamically imported module|Importing a module script failed|Failed to fetch dynamically/i.test(
    message,
  );
}

export default defineNuxtPlugin(() => {
  if (!import.meta.client) return;

  const reloadOnce = (url: string) => {
    const last = Number(sessionStorage.getItem(RELOAD_GUARD) || 0);
    if (Date.now() - last < 10_000) return;
    sessionStorage.setItem(RELOAD_GUARD, String(Date.now()));
    window.location.replace(url);
  };

  window.addEventListener("unhandledrejection", (event) => {
    if (!isChunkLoadError(event.reason)) return;
    event.preventDefault();
    reloadOnce(window.location.href);
  });
});
