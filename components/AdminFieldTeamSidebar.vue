<script setup lang="ts">
import { fieldTeamPath } from "~/composables/useFieldTeam";

const { tree, loadTree } = useFieldTeam();
const { setTab } = useAdminShell();
const { selectedOrg } = useAdminOrgContext();
const route = useRoute();
const open = useState("adminFieldTeamSidebarOpen", () => true);
const expanded = ref<Set<string>>(new Set());

const coordinators = computed(() => (tree.value?.roots ?? []).filter((n) => n.id));
const unassignedBuckets = computed(() => (tree.value?.roots ?? []).filter((n) => !n.id));

function toggle(id: string) {
  const next = new Set(expanded.value);
  if (next.has(id)) next.delete(id);
  else next.add(id);
  expanded.value = next;
}

function isCurrent(id: string | null) {
  return !!id && route.path === fieldTeamPath(id);
}

onMounted(() => {
  if (!tree.value) void loadTree().catch(() => {});
});
watch(() => selectedOrg.value?.id, () => void loadTree().catch(() => {}));
</script>

<template>
  <div class="flex flex-col gap-1">
    <button
      type="button"
      class="flex w-full items-center justify-between rounded-lg px-3 py-2 font-label-caps text-[10px] uppercase tracking-wider text-on-primary-container transition-colors hover:bg-surface-container-lowest/5 hover:text-pure-white"
      :aria-expanded="open"
      @click="open = !open"
    >
      <span>Field Team{{ tree ? ` · ${tree.voters_assigned.toLocaleString()} voters` : "" }}</span>
      <span class="material-symbols-outlined text-[16px] transition-transform" :class="open ? 'rotate-180' : ''">expand_more</span>
    </button>

    <div v-show="open" class="flex flex-col gap-0.5">
      <button
        type="button"
        class="flex items-center gap-3 rounded-xl px-3 py-2 font-button-text text-sm text-on-primary-container transition-colors hover:bg-surface-container-lowest/5 hover:text-pure-white"
        @click="setTab('hierarchy')"
      >
        <span class="material-symbols-outlined text-[20px]">account_tree</span>
        <span class="text-left leading-snug">Full hierarchy</span>
      </button>

      <p v-if="tree && !coordinators.length" class="px-3 py-1 text-[11px] text-on-primary-container">
        No LGA Coordinators yet.
      </p>

      <div v-for="lga in coordinators" :key="lga.id!" class="flex flex-col">
        <div
          class="flex items-center gap-1 rounded-xl pr-2 transition-colors"
          :class="isCurrent(lga.id) ? 'bg-surface-container-lowest/10' : 'hover:bg-surface-container-lowest/5'"
        >
          <button
            type="button"
            class="flex h-8 w-7 shrink-0 items-center justify-center text-on-primary-container hover:text-pure-white"
            :class="lga.children.length ? '' : 'invisible'"
            :aria-label="expanded.has(lga.id!) ? `Collapse ${lga.name}` : `Show ward coordinators under ${lga.name}`"
            :aria-expanded="expanded.has(lga.id!)"
            @click="toggle(lga.id!)"
          >
            <span class="material-symbols-outlined text-[16px] transition-transform" :class="expanded.has(lga.id!) ? 'rotate-90' : ''">
              chevron_right
            </span>
          </button>
          <NuxtLink :to="fieldTeamPath(lga.id!)" class="min-w-0 flex-1 py-1.5">
            <span class="block truncate text-sm font-semibold text-pure-white">{{ lga.name }}</span>
            <span class="block truncate text-[10px] text-on-primary-container">{{ lga.lga || "LGA Coordinator" }}</span>
          </NuxtLink>
          <span class="shrink-0 rounded-full bg-pure-white/10 px-2 py-0.5 font-label-caps text-[10px] font-bold text-pure-white" title="Voters in this coordinator's team">
            {{ lga.totals.voters.toLocaleString() }}
          </span>
        </div>
        <div v-if="expanded.has(lga.id!)" class="ml-7 flex flex-col border-l border-pure-white/10 pl-2">
          <NuxtLink
            v-for="ward in lga.children"
            :key="ward.id!"
            :to="fieldTeamPath(ward.id!)"
            class="flex items-center gap-2 rounded-lg px-2 py-1.5 transition-colors"
            :class="isCurrent(ward.id) ? 'bg-surface-container-lowest/10 text-pure-white' : 'text-on-primary-container hover:bg-surface-container-lowest/5 hover:text-pure-white'"
          >
            <span class="min-w-0 flex-1">
              <span class="block truncate text-xs font-semibold">{{ ward.name }}</span>
              <span class="block truncate text-[10px] opacity-80">{{ ward.ward || "Ward Coordinator" }} · {{ ward.totals.field_agents }} agents</span>
            </span>
            <span class="shrink-0 font-label-caps text-[10px] font-bold">{{ ward.totals.voters.toLocaleString() }}</span>
          </NuxtLink>
        </div>
      </div>

      <button
        v-for="bucket in unassignedBuckets"
        :key="bucket.rank"
        type="button"
        class="flex items-center gap-2 rounded-xl px-3 py-1.5 text-left text-[11px] text-electric-pink hover:bg-surface-container-lowest/5"
        @click="setTab('hierarchy')"
      >
        <span class="material-symbols-outlined text-[16px]">warning</span>
        <span class="min-w-0 flex-1 truncate">{{ bucket.children.length }} {{ bucket.rank === "unassigned_ward" ? "ward coordinator(s)" : "field agent(s)" }} not yet placed</span>
      </button>
    </div>
  </div>
</template>
