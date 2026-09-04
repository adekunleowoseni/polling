function normalizeApiBase(raw: string | undefined): string {
  const value = (raw ?? "http://localhost:8000").trim().replace(/\/+$/, "");
  if (!value) return "http://localhost:8000";
  if (/^https?:\/\//i.test(value)) return value;
  // Hostnames without a scheme become relative URLs in the browser and break on Vercel.
  return `https://${value}`;
}

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
  compatibilityDate: "2025-01-01",
});
