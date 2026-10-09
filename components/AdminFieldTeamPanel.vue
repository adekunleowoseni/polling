<script setup lang="ts">
const props = withDefaults(
  defineProps<{
    /** Embedded inside another page (Field Canvassing): smaller heading, tree collapsed. */
    embedded?: boolean;
  }>(),
  { embedded: false },
);

const emit = defineEmits<{
  (e: "error", msg: string): void;
}>();

const { tree, treeLoading, loadTree } = useFieldTeam();
const { selectedOrg } = useAdminOrgContext();
const filter = ref("");

const cards = computed(() => {
  const t = tree.value;
  if (!t) return [];
  const pct = t.voters_total ? Math.round((t.voters_assigned / t.voters_total) * 100) : 0;
  return [
    { label: "LGA Coordinators", value: t.lga_coordinators, icon: "account_balance", hint: "Top of the hierarchy" },
    { label: "Ward Coordinators", value: t.totals.ward_coordinators, icon: "holiday_village", hint: "Report to an LGA Coordinator" },
    { label: "Field agents", value: t.totals.field_agents, icon: "directions_walk", hint: "Field & polling unit agents" },
    {
      label: "Voters assigned",
      value: t.voters_assigned,
      icon: "how_to_reg",
      hint: `${pct}% of ${t.voters_total.toLocaleString()} · ${t.voters_unassigned.toLocaleString()} unassigned`,
    },
    { label: "Contacts added", value: t.totals.contacts, icon: "person_add", hint: "Registered by the field team" },
  ];
});

async function refresh() {
  try {
    await loadTree();
  } catch {
    emit("error", "Could not load the field team hierarchy.");
  }
}

onMounted(() => {
  if (!tree.value) void refresh();
});
watch(() => selectedOrg.value?.id, () => void refresh());
</script>

<template>
  <section class="flex flex-col gap-4">
    <div class="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <p class="font-label-caps text-label-caps uppercase tracking-wider text-outline">Field team</p>
        <h2 :class="props.embedded ? 'text-lg' : 'text-2xl'" class="font-headline-md font-bold tracking-tight text-primary">
          Team hierarchy
        </h2>
        <p class="mt-1 max-w-2xl text-xs text-outline">
          LGA Coordinator → Ward Coordinator → Field agent → voters. Counts roll up: a coordinator's voters include
          everyone in their team. Open any person to assign their team or voters.
        </p>
      </div>
      <div class="flex gap-2">
        <div class="relative">
          <span class="material-symbols-outlined absolute left-3 top-2.5 text-[18px] text-outline">search</span>
          <input
            v-model="filter"
            type="search"
            class="h-10 w-full rounded-xl bg-off-white pl-9 pr-3 text-sm text-on-surface placeholder:text-outline focus:outline-none sm:w-72"
            placeholder="Find a coordinator, agent, LGA or ward…"
            aria-label="Filter the hierarchy"
          />
        </div>
        <button
          type="button"
          class="inline-flex h-10 items-center gap-1.5 rounded-xl bg-surface-container-low px-3 text-sm font-semibold text-primary hover:bg-surface-container disabled:opacity-50"
          :disabled="treeLoading"
          @click="refresh"
        >
          <span class="material-symbols-outlined text-[18px]" :class="treeLoading ? 'animate-spin' : ''">refresh</span>
          <span class="hidden sm:inline">Refresh</span>
        </button>
      </div>
    </div>

    <div v-if="cards.length" class="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5">
      <div v-for="card in cards" :key="card.label" class="rounded-xl bg-surface-container-lowest p-4 shadow-sm">
        <div class="flex items-center justify-between">
          <p class="font-label-caps text-[11px] font-semibold uppercase tracking-wider text-outline">{{ card.label }}</p>
          <span class="material-symbols-outlined text-[18px] text-outline">{{ card.icon }}</span>
        </div>
        <p class="mt-1 font-headline-md text-2xl font-extrabold text-primary">{{ card.value.toLocaleString() }}</p>
        <p class="mt-1 text-[11px] text-outline">{{ card.hint }}</p>
      </div>
    </div>

    <div class="rounded-xl bg-surface-container-lowest p-3 shadow-sm">
      <div v-if="treeLoading && !tree" class="p-8 text-center text-sm text-outline">Loading hierarchy…</div>
      <div v-else-if="!tree?.roots.length" class="p-8 text-center text-sm text-outline">
        No field agents yet. Onboard LGA Coordinators, Ward Coordinators and field agents from <strong>Field Agents</strong>.
      </div>
      <AdminFieldTeamTree v-else :nodes="tree.roots" :expand-depth="props.embedded ? 0 : 1" :filter="filter" />
    </div>
  </section>
</template>
