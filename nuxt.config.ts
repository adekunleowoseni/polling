function normalizeApiBase(raw: string | undefined): string {
  const value = (raw ?? "http://localhost:8000").trim().replace(/\/+$/, "");
  if (!value) return "http://localhost:8000";
  if (/^https?:\/\//i.test(value)) return value;
  // Hostnames without a scheme become relative URLs in the browser and break on Vercel.
  return `https://${value}`;
}

/**
 * Dev-only: the same SFC style URL is served as `text/css` for the SSR `<link>` and as a JS
 * module for the client import. Vite caches both under one key, so a back/forward navigation
 * replays the CSS response into a module request and the page chunk fails to import.
 */
const devStyleCacheFix = {
  name: "lado-dev-style-cache-fix",
  apply: "serve" as const,
  configureServer(server: { middlewares: { use: (fn: (req: any, res: any, next: () => void) => void) => void } }) {
    server.middlewares.use((req, res, next) => {
      const url: string = req.url || "";
      if (url.includes("type=style") || url.includes("lang.css")) {
        // Vite's own `send` sets Cache-Control last, so force the values as they are written.
        const setHeader = res.setHeader.bind(res);
        res.setHeader = (name: string, value: unknown) => {
          const key = String(name).toLowerCase();
          if (key === "cache-control") return setHeader(name, "no-store");
          if (key === "vary") return setHeader(name, "Origin, Accept, Sec-Fetch-Dest");
          return setHeader(name, value);
        };
        setHeader("Cache-Control", "no-store");
        setHeader("Vary", "Origin, Accept, Sec-Fetch-Dest");
      }
      next();
    });
  },
};

export default defineNuxtConfig({
  css: ["~/assets/css/main.css"],
  modules: ["@nuxtjs/tailwindcss"],
  app: {
    head: {
      title: "e-mobilize",
      link: [
        { rel: "icon", type: "image/png", href: "/applogo.png" },
        { rel: "apple-touch-icon", href: "/applogo.png" },
        { rel: "preconnect", href: "https://fonts.googleapis.com" },
        { rel: "preconnect", href: "https://fonts.gstatic.com", crossorigin: "anonymous" },
        {
          rel: "stylesheet",
          href: "https://fonts.googleapis.com/css2?family=Hanken+Grotesk:wght@600;700;800&family=JetBrains+Mono:wght@500&family=Rubik:wght@400;500;600&display=swap",
        },
        {
          rel: "stylesheet",
          href: "https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200&display=swap",
        },
      ],
      script: [
        {
          innerHTML:
            "(function(){try{var t=localStorage.getItem('lado-theme');var d=t==='dark'||(t!=='light'&&window.matchMedia('(prefers-color-scheme: dark)').matches);document.documentElement.classList.toggle('dark',d)}catch(e){}})();",
          type: "text/javascript",
          tagPosition: "head",
        },
      ],
    },
  },
  runtimeConfig: {
    public: {
      apiBase: normalizeApiBase(process.env.NUXT_PUBLIC_API_BASE),
      /** Same Google Maps JS API key as mobile `EXPO_PUBLIC_GOOGLE_MAPS_API_KEY`. */
      googleMapsApiKey: process.env.NUXT_PUBLIC_GOOGLE_MAPS_API_KEY || "",
    },
  },
  vite: {
    plugins: [devStyleCacheFix],
  },
  experimental: {
    // Stale JS/CSS chunk references (dev HMR, or an old bundle after deploy) surface as
    // "error loading dynamically imported module" on history navigation. Reload instead.
    emitRouteChunkError: "automatic-immediate",
  },
  compatibilityDate: "2025-01-01",
});
