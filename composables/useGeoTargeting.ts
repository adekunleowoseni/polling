/** Shared multi-select geo targeting for inbox + packages. */

export type TargetScope = "all" | "lga" | "ward" | "polling_unit";

export type GeoTargetForm = {
  target_scope: TargetScope;
  states: string[];
  lgas: string[];
  /** Encoded as `LGA||Ward` */
  wards: string[];
  polling_unit_codes: string[];
};

export function encodeWard(lga: string, ward: string) {
  return `${lga}||${ward}`;
}

export function decodeWard(raw: string): { lga: string; ward: string } {
  const idx = raw.indexOf("||");
  if (idx < 0) return { lga: "", ward: raw };
  return { lga: raw.slice(0, idx), ward: raw.slice(idx + 2) };
}

export function wardLabel(raw: string) {
  const { lga, ward } = decodeWard(raw);
  return lga ? `${ward} (${lga})` : ward;
}

export function useGeoTargeting(initial?: Partial<GeoTargetForm>) {
  const form = reactive<GeoTargetForm>({
    target_scope: initial?.target_scope || "ward",
    states: initial?.states?.length ? [...initial.states] : ["Ogun State"],
    lgas: initial?.lgas ? [...initial.lgas] : [],
    wards: initial?.wards ? [...initial.wards] : [],
    polling_unit_codes: initial?.polling_unit_codes ? [...initial.polling_unit_codes] : [],
  });

  const availableStates = ref<{ code: string; name: string }[]>([]);
  const lgas = ref<string[]>([]);
  const wardPickerLga = ref("");
  const wardsForPicker = ref<string[]>([]);
  const puPickerLga = ref("");
  const puPickerWard = ref("");
  const unitsForPicker = ref<{ code: string; name?: string }[]>([]);

  const needsLga = computed(() => form.target_scope === "lga" || form.target_scope === "ward" || form.target_scope === "polling_unit");
  const needsWard = computed(() => form.target_scope === "ward" || form.target_scope === "polling_unit");
  const needsPu = computed(() => form.target_scope === "polling_unit");

  const targetSummary = computed(() => {
    if (form.target_scope === "all") {
      return form.states.length ? `All · ${form.states.join(", ")}` : "Select state(s)";
    }
    if (form.target_scope === "lga") {
      if (!form.lgas.length) return "Select LGA(s)";
      if (form.lgas.length <= 2) return form.lgas.join(", ");
      return `${form.lgas.length} LGAs`;
    }
    if (form.target_scope === "ward") {
      if (!form.wards.length) return "Select ward(s)";
      if (form.wards.length <= 2) return form.wards.map(wardLabel).join(", ");
      return `${form.wards.length} wards`;
    }
    if (!form.polling_unit_codes.length) return "Select polling unit(s)";
    if (form.polling_unit_codes.length <= 2) return form.polling_unit_codes.join(", ");
    return `${form.polling_unit_codes.length} polling units`;
  });

  async function loadStates() {
    const config = useRuntimeConfig();
    try {
      availableStates.value = await $fetch<{ code: string; name: string }[]>(
        `${config.public.apiBase}/geo/states`,
      );
      if (!form.states.length && availableStates.value.length) {
        form.states = [availableStates.value[0].name];
      }
    } catch {
      availableStates.value = [{ code: "ogun", name: "Ogun State" }];
    }
  }

  async function loadLgas() {
    const config = useRuntimeConfig();
    lgas.value = await $fetch<string[]>(`${config.public.apiBase}/geo/states/ogun/lgas`);
  }

  async function loadWardsForPicker(lga: string) {
    wardPickerLga.value = lga;
    if (!lga) {
      wardsForPicker.value = [];
      return;
    }
    const config = useRuntimeConfig();
    wardsForPicker.value = await $fetch<string[]>(
      `${config.public.apiBase}/geo/states/ogun/lgas/${encodeURIComponent(lga)}/wards`,
    );
  }

  async function loadUnitsForPicker(lga: string, ward: string) {
    puPickerLga.value = lga;
    puPickerWard.value = ward;
    if (!lga || !ward) {
      unitsForPicker.value = [];
      return;
    }
    const config = useRuntimeConfig();
    unitsForPicker.value = await $fetch<{ code: string; name?: string }[]>(
      `${config.public.apiBase}/geo/states/ogun/lgas/${encodeURIComponent(lga)}/wards/${encodeURIComponent(ward)}/polling-units`,
    );
  }

  function toggleState(name: string) {
    const i = form.states.indexOf(name);
    if (i >= 0) form.states.splice(i, 1);
    else form.states.push(name);
  }

  function toggleLga(name: string) {
    const i = form.lgas.indexOf(name);
    if (i >= 0) {
      form.lgas.splice(i, 1);
      form.wards = form.wards.filter((w) => decodeWard(w).lga !== name);
    } else {
      form.lgas.push(name);
    }
  }

  function toggleWard(lga: string, ward: string) {
    const key = encodeWard(lga, ward);
    const i = form.wards.indexOf(key);
    if (i >= 0) form.wards.splice(i, 1);
    else {
      form.wards.push(key);
      if (!form.lgas.includes(lga)) form.lgas.push(lga);
    }
  }

  function togglePu(code: string) {
    const i = form.polling_unit_codes.indexOf(code);
    if (i >= 0) form.polling_unit_codes.splice(i, 1);
    else form.polling_unit_codes.push(code);
  }

  function isWardSelected(lga: string, ward: string) {
    return form.wards.includes(encodeWard(lga, ward));
  }

  watch(
    () => form.target_scope,
    (scope) => {
      if (scope === "all") {
        form.lgas = [];
        form.wards = [];
        form.polling_unit_codes = [];
      } else if (scope === "lga") {
        form.wards = [];
        form.polling_unit_codes = [];
      } else if (scope === "ward") {
        form.polling_unit_codes = [];
      }
    },
  );

  function validate(): string | null {
    if (!form.states.length) return "Select at least one state.";
    if (form.target_scope === "all") return null;
    if (form.target_scope === "lga") {
      return form.lgas.length ? null : "Select at least one LGA.";
    }
    if (form.target_scope === "ward") {
      return form.wards.length ? null : "Select at least one ward.";
    }
    return form.polling_unit_codes.length ? null : "Select at least one polling unit.";
  }

  function toPayload() {
    return {
      target_scope: form.target_scope,
      state: form.states[0] || "Ogun State",
      states: [...form.states],
      lgas: form.target_scope === "all" ? [] : [...form.lgas],
      wards: form.target_scope === "ward" || form.target_scope === "polling_unit" ? [...form.wards] : [],
      polling_unit_codes: form.target_scope === "polling_unit" ? [...form.polling_unit_codes] : [],
      lga: form.lgas[0] || undefined,
      ward: form.wards[0] ? decodeWard(form.wards[0]).ward : undefined,
      polling_unit_code: form.polling_unit_codes[0] || undefined,
    };
  }

  onMounted(async () => {
    await loadStates();
    await loadLgas();
  });

  return reactive({
    form,
    availableStates,
    lgas,
    wardPickerLga,
    wardsForPicker,
    puPickerLga,
    puPickerWard,
    unitsForPicker,
    needsLga,
    needsWard,
    needsPu,
    targetSummary,
    loadWardsForPicker,
    loadUnitsForPicker,
    toggleState,
    toggleLga,
    toggleWard,
    togglePu,
    isWardSelected,
    validate,
    toPayload,
    wardLabel,
  });
}
