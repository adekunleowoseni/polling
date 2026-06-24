export function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
}

export function buildPollingUnitCode(lga: string, ward: string, name: string): string {
  const parts = [slugify(lga), slugify(ward), slugify(name)].filter(Boolean);
  return parts.join("-").slice(0, 64);
}

export function useOgunGeo() {
  const config = useRuntimeConfig();
  const apiBase = config.public.apiBase;

  const state = ref("Ogun State");
  const lgas = ref<string[]>([]);
  const wards = ref<string[]>([]);
  const loadingLgas = ref(false);
  const loadingWards = ref(false);

  async function loadLgas() {
    loadingLgas.value = true;
    try {
      lgas.value = await $fetch<string[]>(`${apiBase}/geo/states/ogun/lgas`);
    } finally {
      loadingLgas.value = false;
    }
  }

  async function loadWards(lga: string) {
    if (!lga) {
      wards.value = [];
      return;
    }
    loadingWards.value = true;
    try {
      wards.value = await $fetch<string[]>(
        `${apiBase}/geo/states/ogun/lgas/${encodeURIComponent(lga)}/wards`,
      );
    } finally {
      loadingWards.value = false;
    }
  }

  return {
    state,
    lgas,
    wards,
    loadingLgas,
    loadingWards,
    loadLgas,
    loadWards,
    buildPollingUnitCode,
  };
}
