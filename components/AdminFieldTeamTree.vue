<script setup lang="ts">
import { fieldTeamPath, type FieldTeamNode } from "~/composables/useFieldTeam";

const props = withDefaults(
  defineProps<{
    nodes: FieldTeamNode[];
    depth?: number;
    /** Levels shown expanded when the tree first renders. */
    expandDepth?: number;
    /** Text filter: keeps nodes whose name/LGA/ward match, plus their ancestors. */
    filter?: string;
  }>(),
  { depth: 0, expandDepth: 1, filter: "" },
);

const expanded = ref<Set<string>>(new Set());
const collapsed = ref<Set<string>>(new Set());

function key(node: FieldTeamNode, index: number) {
  return node.id ?? `${node.rank}-${index}`;
}

function selfMatches(node: FieldTeamNode, needle: string): boolean {
  const hay = [node.name, node.lga, node.ward, node.phone, node.rank_label].filter(Boolean).join(" ").toLowerCase();
  return hay.includes(needle);
}

function matches(node: FieldTeamNode, needle: string): boolean {
  if (!needle) return true;
  return selfMatches(node, needle) || node.children.some((c) => matches(c, needle));
}

const needle = computed(() => props.filter.trim().toLowerCase());
const visible = computed(() => props.nodes.filter((n) => matches(n, needle.value)));

function isOpen(node: FieldTeamNode, index: number) {
  const k = key(node, index);
  if (needle.value) return !collapsed.value.has(k);
  if (expanded.value.has(k)) return true;
  if (collapsed.value.has(k)) return false;
  return props.depth < props.expandDepth;
}

function toggle(node: FieldTeamNode, index: number) {
  const k = key(node, index);
  const open = isOpen(node, index);
  const nextOpen = new Set(expanded.value);
  const nextClosed = new Set(collapsed.value);
  if (open) {
    nextOpen.delete(k);
    nextClosed.add(k);
  } else {
    nextClosed.delete(k);
    nextOpen.add(k);
  }
  expanded.value = nextOpen;
  collapsed.value = nextClosed;
}

function rankIcon(rank: string) {
  if (rank === "lga_supervisor") return "account_balance";
  if (rank === "ward_supervisor") return "holiday_village";
  if (rank.startsWith("unassigned")) return "help_center";
  return "directions_walk";
}

function rankTone(rank: string) {
  if (rank === "lga_supervisor") return "bg-deep-navy text-pure-white";
  if (rank === "ward_supervisor") return "bg-secondary/15 text-secondary";
  if (rank.startsWith("unassigned")) return "bg-error-container text-error";
  return "bg-action-green/20 text-on-tertiary-fixed";
}
</script>

<template>
  <ul class="flex flex-col gap-1" :class="depth ? 'ml-4 border-l border-surface-container-high pl-3' : ''">
    <li v-for="(node, index) in visible" :key="key(node, index)">
      <div class="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-xl px-2 py-2 transition-colors hover:bg-surface-container-low">
        <button
          type="button"
          class="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-outline hover:bg-surface-container"
          :class="node.children.length ? '' : 'invisible'"
          :aria-expanded="isOpen(node, index)"
          :aria-label="isOpen(node, index) ? `Collapse ${node.name}` : `Expand ${node.name}`"
          @click="toggle(node, index)"
        >
          <span class="material-symbols-outlined text-[18px] transition-transform" :class="isOpen(node, index) ? 'rotate-90' : ''">
            chevron_right
          </span>
        </button>
        <span class="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg" :class="rankTone(node.rank)">
          <span class="material-symbols-outlined text-[18px]">{{ rankIcon(node.rank) }}</span>
        </span>
        <div class="min-w-0 flex-1">
          <NuxtLink
            v-if="node.id"
            :to="fieldTeamPath(node.id)"
            class="block truncate font-button-text text-sm font-bold text-primary hover:underline"
          >
            {{ node.name }}
          </NuxtLink>
          <span v-else class="block truncate font-button-text text-sm font-bold text-error">{{ node.name }}</span>
          <span class="block truncate text-[11px] text-outline">
            {{ node.rank_label }}<template v-if="node.lga"> · {{ node.lga }}</template><template v-if="node.ward"> · {{ node.ward }}</template>
          </span>
        </div>
        <div class="flex flex-wrap items-center gap-1.5 font-label-caps text-[11px]">
          <span
            v-if="node.totals.ward_coordinators"
            class="rounded-full bg-secondary/10 px-2 py-0.5 font-bold text-secondary"
            :title="`${node.totals.ward_coordinators} ward coordinator(s) under ${node.name}`"
          >
            {{ node.totals.ward_coordinators.toLocaleString() }} ward
          </span>
          <span
            v-if="node.totals.field_agents"
            class="rounded-full bg-action-green/20 px-2 py-0.5 font-bold text-on-tertiary-fixed"
            :title="`${node.totals.field_agents} field agent(s) under ${node.name}`"
          >
            {{ node.totals.field_agents.toLocaleString() }} agents
          </span>
          <span
            class="rounded-full bg-deep-navy/5 px-2 py-0.5 font-bold text-primary"
            :title="`Voters assigned to ${node.name}${node.children.length ? ' and their team' : ''}`"
          >
            {{ node.totals.voters.toLocaleString() }} voters
          </span>
          <span
            v-if="node.totals.contacts"
            class="rounded-full bg-surface-container px-2 py-0.5 font-bold text-on-surface"
            :title="`CRM contacts registered by ${node.name}${node.children.length ? ' and their team' : ''}`"
          >
            {{ node.totals.contacts.toLocaleString() }} added
          </span>
        </div>
      </div>
      <AdminFieldTeamTree
        v-if="node.children.length && isOpen(node, index)"
        :nodes="node.children"
        :depth="depth + 1"
        :expand-depth="expandDepth"
        :filter="needle && selfMatches(node, needle) ? '' : filter"
      />
    </li>
  </ul>
</template>
