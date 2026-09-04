<template>
  <div>
    <section class="relative overflow-hidden border-b border-outline-variant">
      <div class="absolute inset-0 bg-gradient-to-b from-secondary-fixed via-background to-background dark:from-electric-pink/10 dark:via-deep-navy dark:to-deep-navy" />
      <div class="relative mx-auto max-w-container-max px-margin-mobile py-10 lg:px-gutter sm:py-12">
        <div class="flex flex-wrap items-start justify-between gap-6">
          <div>
            <div class="mb-4 inline-flex items-center gap-2 rounded-full border border-electric-pink/30 bg-secondary-fixed px-3 py-1 font-label-caps text-[11px] font-medium uppercase tracking-wider text-electric-pink">
              <span class="relative flex h-2 w-2">
                <span class="absolute inline-flex h-full w-full animate-ping rounded-full bg-action-green opacity-75" />
                <span class="relative inline-flex h-2 w-2 rounded-full bg-action-green" />
              </span>
              Real-time monitor · auto-refreshing
            </div>
            <h1 class="font-headline-lg text-3xl font-bold tracking-tight text-primary sm:text-4xl">
              Election Monitor
            </h1>
            <p class="mt-3 max-w-2xl font-body-md text-on-surface-variant">
              Live polling unit feeds, ward activity, and people on site — updated every few seconds.
            </p>
          </div>
          <div class="flex flex-col items-end gap-2 text-right font-body-md text-sm text-on-surface-variant">
            <button
              type="button"
              class="rounded-full border border-outline-variant px-3 py-1.5 text-xs text-primary transition hover:bg-surface-container-low"
              :disabled="feedLoading"
              @click="refreshFeeds"
            >
              {{ feedLoading ? "Refreshing…" : "Refresh now" }}
            </button>
            <p v-if="feedData?.updated_at">
              Last sync: {{ formatClock(feedData.updated_at) }}
            </p>
          </div>
        </div>
      </div>
    </section>

    <div class="mx-auto max-w-7xl space-y-8 px-4 py-8 sm:px-6">
      <p v-if="feedError" class="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-500 dark:text-red-300">
        {{ feedError }}
      </p>

      <section class="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <div
          v-for="stat in monitorStats"
          :key="stat.label"
          class="ui-card p-4"
        >
          <p class="text-[10px] font-semibold uppercase tracking-wider text-ui-muted sm:text-xs">
            {{ stat.label }}
          </p>
          <p class="mt-1 text-2xl font-bold sm:text-3xl" :class="stat.accent ?? 'text-ui-text'">
            <span v-if="!feedLoading || feedData">{{ stat.value }}</span>
            <span v-else class="inline-block h-8 w-12 animate-pulse rounded bg-ui-elevated" />
          </p>
          <p v-if="stat.hint" class="mt-0.5 text-[10px] text-ui-muted sm:text-xs">{{ stat.hint }}</p>
        </div>
      </section>

      <div class="ui-card flex flex-wrap items-center justify-between gap-4 p-5">
        <div>
          <h2 class="text-sm font-semibold text-ui-text">Watch live video feeds</h2>
          <p class="mt-1 text-xs text-ui-muted">Browse streams grouped by LGA and ward.</p>
        </div>
        <NuxtLink
          to="/feeds"
          class="rounded-full bg-electric-pink px-4 py-2 text-sm font-medium text-on-primary transition hover:bg-secondary"
        >
          Open live feeds
        </NuxtLink>
      </div>

      <div class="grid gap-8 lg:grid-cols-5">
        <section class="lg:col-span-3">
          <div class="ui-card overflow-hidden">
            <div class="flex items-center justify-between border-b border-ui-border/40 px-5 py-4">
              <h2 class="text-lg font-semibold text-ui-text">Live streaming units</h2>
              <span class="text-xs text-ui-muted">{{ liveUnits.length }} live now</span>
            </div>

            <div v-if="feedLoading && !feedData" class="p-8 text-center text-sm text-ui-muted">
              Loading live feeds…
            </div>

            <div v-else-if="!liveUnits.length" class="p-10 text-center">
              <p class="text-ui-muted">No live video feeds right now.</p>
              <p class="mt-2 text-sm text-ui-muted">
                Feeds appear when field agents start streaming from registered polling units.
              </p>
            </div>

            <div v-else class="overflow-x-auto">
              <table class="w-full text-left text-sm">
                <thead>
                  <tr class="border-b border-ui-border/30 text-xs uppercase tracking-wider text-ui-muted">
                    <th class="px-5 py-3 font-medium">Polling unit</th>
                    <th class="px-5 py-3 font-medium">Ward</th>
                    <th class="px-5 py-3 font-medium">LGA</th>
                    <th class="px-5 py-3 font-medium text-right">On site</th>
                    <th class="px-5 py-3 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-ui-border/30">
                  <tr
                    v-for="unit in liveUnitsSorted"
                    :key="unit.id"
                    class="transition hover:bg-ui-muted/5"
                  >
                    <td class="px-5 py-3.5">
                      <div class="min-w-0">
                        <p class="truncate font-medium text-ui-text">{{ unit.name }}</p>
                        <p class="truncate text-xs text-ui-muted">{{ unit.code }}</p>
                        <div class="mt-1.5 h-1.5 overflow-hidden rounded-full bg-ui-elevated">
                          <div
                            class="h-full rounded-full bg-electric-pink transition-all duration-500"
                            :style="{ width: `${peopleBarWidth(unit.people_count)}%` }"
                          />
                        </div>
                      </div>
                    </td>
                    <td class="px-5 py-3.5 text-ui-muted">{{ unit.ward }}</td>
                    <td class="px-5 py-3.5">
                      <NuxtLink
                        :to="{ path: '/feeds', query: { lga: unit.lga } }"
                        class="text-electric-pink hover:underline"
                      >
                        {{ unit.lga }}
                      </NuxtLink>
                    </td>
                    <td class="px-5 py-3.5 text-right font-semibold tabular-nums text-action-green">
                      {{ unit.people_count }}
                    </td>
                    <td class="px-5 py-3.5">
                      <span class="inline-flex items-center gap-1.5 rounded-full bg-red-500/15 px-2 py-0.5 text-xs font-semibold text-red-600 dark:text-red-400">
                        <span class="h-1.5 w-1.5 rounded-full bg-red-500" />
                        LIVE
                      </span>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </section>

        <section class="lg:col-span-2">
          <div class="ui-card overflow-hidden">
            <div class="border-b border-ui-border/40 px-5 py-4">
              <h2 class="text-lg font-semibold text-ui-text">Live now</h2>
              <p class="text-xs text-ui-muted">Active feed previews</p>
            </div>

            <div v-if="feedLoading && !feedData" class="p-8 text-center text-sm text-ui-muted">
              Loading…
            </div>

            <ul v-else-if="!liveUnits.length" class="p-8 text-center text-sm text-ui-muted">
              Waiting for agents to go live…
            </ul>

            <ul v-else class="grid grid-cols-2 gap-2 p-4">
              <li
                v-for="unit in liveUnitsSorted.slice(0, 8)"
                :key="unit.id"
                class="aspect-video overflow-hidden rounded-lg border border-ui-border/40 bg-black"
                :title="`${unit.name} · ${unit.people_count} on site`"
              >
                <LiveFeedPlayer
                  :code="unit.code"
                  :api-base="apiBase"
                  :people-count="unit.people_count"
                  :start-muted="true"
                />
              </li>
            </ul>
          </div>
        </section>
      </div>

      <section v-if="lgaSummaries.length" class="ui-card p-5">
        <h3 class="text-xs font-semibold uppercase tracking-wider text-ui-muted">Live LGAs</h3>
        <div class="mt-3 flex flex-wrap gap-2">
          <NuxtLink
            v-for="lga in lgaSummaries"
            :key="lga.lga"
            :to="{ path: '/feeds', query: { lga: lga.lga } }"
            class="rounded-full border border-outline-variant bg-surface-container-low px-3 py-1 text-xs text-on-surface-variant transition hover:border-electric-pink/40 hover:text-electric-pink"
          >
            {{ lga.lga }}
            <span class="ml-1 font-semibold text-electric-pink">{{ lga.liveUnits }}</span>
          </NuxtLink>
        </div>
      </section>
    </div>
  </div>
</template>

<script setup lang="ts">
import { groupByLga, liveUnitsOnly } from "~/composables/useFeedGroups";
import { formatClock } from "~/composables/useLiveDashboard";
import { useVideoFeeds } from "~/composables/useVideoFeeds";

definePageMeta({ layout: "default" });

const {
  data: feedData,
  loading: feedLoading,
  error: feedError,
  apiBase,
  refresh: refreshFeeds,
} = useVideoFeeds(3000);

const geoSummary = ref<{ lga_count: number; ward_count: number } | null>(null);

onMounted(async () => {
  try {
    geoSummary.value = await $fetch(`${apiBase}/geo/states/ogun/summary`);
  } catch {
    geoSummary.value = null;
  }
});

const liveUnits = computed(() => liveUnitsOnly(feedData.value?.units ?? []));
const lgaSummaries = computed(() => groupByLga(feedData.value?.units ?? []));

const liveUnitsSorted = computed(() =>
  [...liveUnits.value].sort((a, b) => b.people_count - a.people_count),
);

const maxPeople = computed(() =>
  Math.max(1, ...liveUnits.value.map((u) => u.people_count)),
);

const activeWards = computed(
  () => new Set(liveUnits.value.map((u) => `${u.lga}|${u.ward}`)).size,
);

const registeredWards = computed(
  () => new Set((feedData.value?.units ?? []).map((u) => `${u.lga}|${u.ward}`)).size,
);

const monitorStats = computed(() => [
  {
    label: "Live feeds",
    value: feedData.value?.live_feeds ?? 0,
    hint: "Streaming now",
    accent: "text-electric-pink",
  },
  {
    label: "People on site",
    value: feedData.value?.total_people ?? 0,
    hint: "Across live feeds",
    accent: "text-action-green",
  },
  {
    label: "Live LGAs",
    value: lgaSummaries.value.length,
    hint: "With active streams",
  },
  {
    label: "Active wards",
    value: activeWards.value,
    hint: "Wards streaming now",
  },
  {
    label: "Registered units",
    value: feedData.value?.registered_units ?? 0,
    hint: `${registeredWards.value} ward(s) covered`,
  },
  {
    label: "Total wards",
    value: geoSummary.value?.ward_count ?? "—",
    hint: geoSummary.value ? `${geoSummary.value.lga_count} LGAs in Ogun` : "Ogun State",
  },
]);

function peopleBarWidth(count: number): number {
  return Math.round((count / maxPeople.value) * 100);
}
</script>
