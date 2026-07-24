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
    },
  },
  compatibilityDate: "2025-01-01",
});
