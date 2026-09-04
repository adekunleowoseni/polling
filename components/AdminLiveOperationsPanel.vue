<script setup lang="ts">
import type { PollingUnit } from "~/composables/useVideoFeeds";

const props = defineProps<{
  units: PollingUnit[];
  loading: boolean;
  countEdits: Record<string, number>;
  stateScope: string;
}>();

const emit = defineEmits<{
  (e: "refresh"): void;
  (e: "update:count", code: string, value: number): void;
  (e: "save-count", code: string): void;
  (e: "force-offline", code: string): void;
  (e: "delete", code: string): void;
}>();

const search = ref("");
const statusFilter = ref<"all" | "live" | "offline">("all");

const filtered = computed(() => {
  const q = search.value.trim().toLowerCase();
  return props.units.filter((u) => {
    if (statusFilter.value === "live" && u.stream_status !== "live") return false;
    if (statusFilter.value === "offline" && u.stream_status === "live") return false;
    if (!q) return true;
    const hay = `${u.name} ${u.code} ${u.lga} ${u.ward} ${u.state || ""}`.toLowerCase();
    return hay.includes(q);
  });
});

const liveCount = computed(() => props.units.filter((u) => u.stream_status === "live").length);
const peopleTotal = computed(() => props.units.reduce((s, u) => s + (u.people_count || 0), 0));

function onCountInput(code: string, event: Event) {
  const value = Number((event.target as HTMLInputElement).value);
  emit("update:count", code, Number.isFinite(value) ? value : 0);
}
</script>

<template>
  <div class="flex w-full flex-col gap-6 pb-10">
    <div class="flex flex-col justify-between gap-4 lg:flex-row lg:items-end">
      <div>
        <p class="font-label-caps text-[11px] uppercase tracking-wider text-outline">
          HQ Central Command / Live operations
        </p>
        <h1 class="mt-1 font-headline-md text-2xl font-bold tracking-tight text-primary">
          Polling units & live feeds
        </h1>
        <p class="mt-1 max-w-2xl text-sm text-on-surface-variant">
          {{ units.length }} unit(s)
          <span v-if="stateScope !== 'all'"> · {{ stateScope }}</span>
          · Force offline, correct counts, or remove units.
        </p>
      </div>
      <button
        type="button"
        class="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-deep-navy px-4 text-sm font-semibold text-pure-white transition hover:bg-primary disabled:opacity-50"
        :disabled="loading"
        @click="emit('refresh')"
      >
        <span class="material-symbols-outlined text-[18px]">sync</span>
        Refresh feeds
      </button>
    </div>

    <div class="grid grid-cols-1 gap-4 sm:grid-cols-3">
      <div class="rounded-xl bg-surface-container-lowest p-4 shadow-sm">
        <p class="font-label-caps text-[11px] uppercase text-outline">Registered units</p>
        <p class="mt-1 text-2xl font-extrabold text-primary">{{ units.length.toLocaleString() }}</p>
      </div>
      <div class="rounded-xl bg-surface-container-lowest p-4 shadow-sm">
        <p class="font-label-caps text-[11px] uppercase text-outline">Live now</p>
        <p class="mt-1 text-2xl font-extrabold text-action-green">{{ liveCount.toLocaleString() }}</p>
      </div>
      <div class="rounded-xl bg-surface-container-lowest p-4 shadow-sm">
        <p class="font-label-caps text-[11px] uppercase text-outline">People on site</p>
        <p class="mt-1 text-2xl font-extrabold text-primary">{{ peopleTotal.toLocaleString() }}</p>
      </div>
    </div>

    <div class="overflow-hidden rounded-xl bg-surface-container-lowest shadow-sm">
      <div class="flex flex-col gap-3 border-b border-outline-variant/30 p-4 sm:flex-row sm:items-center sm:justify-between">
        <div class="relative w-full sm:max-w-sm">
          <span class="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[18px] text-outline">
            search
          </span>
          <input
            v-model="search"
            type="search"
            class="h-10 w-full rounded-xl bg-off-white pl-10 pr-3 text-sm text-on-surface outline-none"
            placeholder="Search unit, code, LGA, ward…"
          />
        </div>
        <div class="flex flex-wrap gap-2">
          <button
            v-for="opt in [
              { id: 'all', label: 'All' },
              { id: 'live', label: 'Live' },
              { id: 'offline', label: 'Offline' },
            ]"
            :key="opt.id"
            type="button"
            class="inline-flex h-9 items-center rounded-lg px-3 text-xs font-semibold transition"
            :class="
              statusFilter === opt.id
                ? 'bg-deep-navy text-pure-white'
                : 'bg-surface-container text-on-surface hover:bg-surface-container-high'
            "
            @click="statusFilter = opt.id as 'all' | 'live' | 'offline'"
          >
            {{ opt.label }}
          </button>
        </div>
      </div>

      <div v-if="loading" class="p-10 text-center text-sm text-on-surface-variant">Loading…</div>
      <div v-else-if="!filtered.length" class="p-10 text-center text-sm text-on-surface-variant">
        No polling units match this filter.
      </div>
      <div v-else class="overflow-x-auto">
        <table class="w-full text-left text-sm">
          <thead>
            <tr class="bg-surface-container-low font-label-caps text-[11px] uppercase tracking-wider text-outline">
              <th class="px-4 py-3">Unit</th>
              <th class="px-4 py-3">Location</th>
              <th class="px-4 py-3">Status</th>
              <th class="px-4 py-3">People</th>
              <th class="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-outline-variant/20">
            <tr v-for="unit in filtered" :key="unit.id" class="hover:bg-off-white/50">
              <td class="px-4 py-3.5">
                <p class="font-semibold text-primary">{{ unit.name }}</p>
                <p class="font-label-caps text-[11px] text-outline">{{ unit.code }}</p>
              </td>
              <td class="px-4 py-3.5 text-xs text-on-surface-variant">
                <p>{{ unit.ward }} · {{ unit.lga }}</p>
                <p class="mt-0.5 text-outline">{{ unit.state || "—" }}</p>
              </td>
              <td class="px-4 py-3.5">
                <span
                  class="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase"
                  :class="
                    unit.stream_status === 'live'
                      ? 'bg-action-green/20 text-on-tertiary-fixed'
                      : 'bg-surface-container-high text-outline'
                  "
                >
                  <span
                    class="h-1.5 w-1.5 rounded-full"
                    :class="unit.stream_status === 'live' ? 'bg-action-green' : 'bg-outline'"
                  />
                  {{ unit.stream_status }}
                </span>
              </td>
              <td class="px-4 py-3.5">
                <input
                  :value="countEdits[unit.code] ?? unit.people_count"
                  type="number"
                  min="0"
                  class="h-9 w-24 rounded-lg bg-off-white px-2 text-right text-sm outline-none"
                  @input="onCountInput(unit.code, $event)"
                />
              </td>
              <td class="px-4 py-3.5">
                <div class="flex flex-wrap justify-end gap-2">
                  <button
                    type="button"
                    class="inline-flex h-9 items-center justify-center rounded-lg bg-deep-navy px-3 text-xs font-semibold text-pure-white transition hover:bg-primary"
                    @click="emit('save-count', unit.code)"
                  >
                    Save count
                  </button>
                  <button
                    v-if="unit.stream_status === 'live'"
                    type="button"
                    class="inline-flex h-9 items-center justify-center rounded-lg bg-surface-container px-3 text-xs font-semibold text-primary transition hover:bg-surface-container-high"
                    @click="emit('force-offline', unit.code)"
                  >
                    Force offline
                  </button>
                  <button
                    type="button"
                    class="inline-flex h-9 items-center justify-center rounded-lg bg-error/10 px-3 text-xs font-semibold text-error transition hover:bg-error/20"
                    @click="emit('delete', unit.code)"
                  >
                    Delete
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>
