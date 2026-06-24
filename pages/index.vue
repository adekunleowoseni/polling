<template>
  <div>
    <section class="relative overflow-hidden border-b border-ui-border/50">
      <div class="absolute inset-0 bg-gradient-to-b from-sky-100/70 via-ui-bg to-ui-bg dark:from-sky-900/30 dark:via-ui-bg dark:to-ui-bg" />
      <div class="relative mx-auto max-w-7xl px-4 py-10 sm:px-6 sm:py-14">
        <div class="flex flex-wrap items-start justify-between gap-6">
          <div>
            <BrandLogos size="lg" class="mb-5" />
            <div class="mb-4 inline-flex items-center gap-2 rounded-full border border-red-500/30 bg-red-500/10 px-3 py-1 text-xs font-medium text-red-700 dark:text-red-300">
              <span class="relative flex h-2 w-2">
                <span class="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-500 opacity-75" />
                <span class="relative inline-flex h-2 w-2 rounded-full bg-red-500" />
              </span>
              Live feed monitor — auto-refreshing
            </div>
            <h1 class="text-3xl font-bold tracking-tight text-ui-text sm:text-4xl">
              Ogun State Live Monitor
            </h1>
            <p class="mt-3 max-w-2xl text-ui-muted">
              Real-time view of active polling unit video feeds, unique people on site, and ward activity
              across Ogun State.
            </p>
          </div>
          <div class="flex flex-col items-end gap-2 text-right text-sm text-ui-muted">
            <button
              class="rounded-lg border border-ui-border/60 px-3 py-1.5 text-xs text-ui-text transition hover:bg-ui-muted/10"
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

      <!-- Live feed stats -->
      <section class="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <div
          v-for="stat in liveStats"
          :key="stat.label"
          class="ui-card p-5 shadow-lg"
        >
          <p class="text-xs font-medium uppercase tracking-wider text-ui-muted">{{ stat.label }}</p>
          <p class="mt-2 text-3xl font-bold" :class="stat.accent ?? 'text-ui-text'">
            <span v-if="!feedLoading || feedData">{{ stat.value }}</span>
            <span v-else class="inline-block h-8 w-16 animate-pulse rounded bg-ui-elevated" />
          </p>
          <p class="mt-1 text-xs text-ui-muted">{{ stat.hint }}</p>
        </div>
      </section>

      <!-- Form scan stat (secondary) -->
      <section class="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div class="ui-card border-emerald-500/20 p-5 sm:col-span-1">
          <p class="text-xs font-medium uppercase tracking-wider text-ui-muted">Forms scanned</p>
          <p class="mt-2 text-2xl font-bold text-emerald-600 dark:text-emerald-400">
            <span v-if="!formLoading || formData">{{ formData?.total_registrations ?? 0 }}</span>
            <span v-else class="inline-block h-7 w-14 animate-pulse rounded bg-ui-elevated" />
          </p>
          <p class="mt-1 text-xs text-ui-muted">
            {{ formData?.today_count ?? 0 }} today ·
            <NuxtLink to="/scan" class="text-emerald-600 hover:underline dark:text-emerald-400">Scan form</NuxtLink>
          </p>
        </div>

        <div class="ui-card flex flex-wrap items-center justify-between gap-4 p-5 sm:col-span-1 lg:col-span-3">
          <div>
            <h2 class="text-sm font-semibold text-ui-text">Open live feeds</h2>
            <p class="mt-1 text-xs text-ui-muted">Watch active ward streams grouped by LGA.</p>
          </div>
          <div class="flex gap-3">
            <NuxtLink
              to="/feeds"
              class="rounded-lg bg-sky-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-sky-500"
            >
              View live feeds
            </NuxtLink>
            <NuxtLink
              to="/agent/login"
              class="rounded-lg border border-ui-border/60 px-4 py-2 text-sm text-ui-text transition hover:bg-ui-muted/10"
            >
              Agent sign in
            </NuxtLink>
          </div>
        </div>
      </section>

      <div class="grid gap-8 lg:grid-cols-5">
        <!-- Live streaming units -->
        <section class="lg:col-span-3">
          <div class="ui-card shadow-lg">
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
                Feeds appear when agents start streaming from
                <NuxtLink to="/agent/login" class="text-sky-600 hover:underline dark:text-sky-400">registered units</NuxtLink>.
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
                            class="h-full rounded-full bg-sky-500 transition-all duration-500"
                            :style="{ width: `${peopleBarWidth(unit.people_count)}%` }"
                          />
                        </div>
                      </div>
                    </td>
                    <td class="px-5 py-3.5 text-ui-muted">{{ unit.ward }}</td>
                    <td class="px-5 py-3.5">
                      <NuxtLink
                        :to="{ path: '/feeds', query: { lga: unit.lga } }"
                        class="text-sky-600 hover:underline dark:text-sky-400"
                      >
                        {{ unit.lga }}
                      </NuxtLink>
                    </td>
                    <td class="px-5 py-3.5 text-right font-semibold tabular-nums text-emerald-600 dark:text-emerald-400">
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

        <!-- Live now previews -->
        <section class="lg:col-span-2">
          <div class="ui-card shadow-lg">
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

            <ul v-else class="grid grid-cols-2 gap-2 p-4 sm:grid-cols-3">
              <li
                v-for="unit in liveUnitsSorted.slice(0, 12)"
                :key="unit.id"
                class="overflow-hidden rounded-lg border border-ui-border/40 bg-black"
              >
                <img
                  :src="snapshotUrl(apiBase, unit.code, frameVersions[unit.code])"
                  :alt="`${unit.name} live feed`"
                  :title="`${unit.name} · ${unit.people_count} on site`"
                  class="aspect-video w-full object-cover"
                />
              </li>
            </ul>
          </div>
        </section>
      </div>

      <!-- Live LGAs quick links -->
      <section v-if="lgaSummaries.length" class="ui-card bg-ui-surface/50 p-5">
        <h3 class="text-xs font-semibold uppercase tracking-wider text-ui-muted">Live LGAs</h3>
        <div class="mt-3 flex flex-wrap gap-2">
          <NuxtLink
            v-for="lga in lgaSummaries"
            :key="lga.lga"
            :to="{ path: '/feeds', query: { lga: lga.lga } }"
            class="rounded-full border border-ui-border/50 bg-ui-elevated/80 px-3 py-1 text-xs text-ui-muted transition hover:border-sky-500/40 hover:text-sky-600 dark:hover:text-sky-400"
          >
            {{ lga.lga }}
            <span class="ml-1 text-red-500">{{ lga.liveUnits }}</span>
          </NuxtLink>
        </div>
      </section>
    </div>
  </div>
</template>

<script setup lang="ts">
import { groupByLga, liveUnitsOnly } from "~/composables/useFeedGroups";
import { formatClock, useLiveDashboard } from "~/composables/useLiveDashboard";
import { snapshotUrl, useVideoFeeds } from "~/composables/useVideoFeeds";

definePageMeta({ layout: "default" });

const {
  data: feedData,
  loading: feedLoading,
  error: feedError,
  apiBase,
  frameVersions,
  refresh: refreshFeeds,
} = useVideoFeeds(8000);

const { data: formData, loading: formLoading } = useLiveDashboard(30000);

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

const liveStats = computed(() => [
  {
    label: "Live feeds",
    value: feedData.value?.live_feeds ?? 0,
    hint: "Polling units streaming now",
    accent: "text-red-600 dark:text-red-400",
  },
  {
    label: "People on site",
    value: feedData.value?.total_people ?? 0,
    hint: "Unique people across live feeds",
    accent: "text-emerald-600 dark:text-emerald-400",
  },
  {
    label: "Live LGAs",
    value: lgaSummaries.value.length,
    hint: "Local governments with active streams",
  },
  {
    label: "Active wards",
    value: activeWards.value,
    hint: "Wards with at least one live feed",
  },
]);

function peopleBarWidth(count: number): number {
  return Math.round((count / maxPeople.value) * 100);
}
</script>
