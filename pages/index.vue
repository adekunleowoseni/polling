<template>
  <div>
    <section class="relative overflow-hidden border-b border-ui-border/50">
      <div class="absolute inset-0 bg-gradient-to-b from-sky-100/70 via-ui-bg to-ui-bg dark:from-sky-900/30 dark:via-ui-bg dark:to-ui-bg" />
      <div class="relative mx-auto max-w-7xl px-4 py-14 sm:px-6 sm:py-20">
        <BrandLogos size="lg" class="mb-6" />
        <h1 class="max-w-3xl text-3xl font-bold tracking-tight text-ui-text sm:text-5xl">
          Ogun State Election Live Monitor
        </h1>
        <p class="mt-5 max-w-2xl text-lg text-ui-muted">
          A real-time command centre for polling day — field agents stream live video from polling units,
          unique people are counted on site, and coordinators watch ward activity across every LGA in Ogun State.
        </p>
        <div class="mt-8 flex flex-wrap gap-3">
          <NuxtLink
            to="/monitor"
            class="inline-flex items-center gap-2 rounded-lg bg-red-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-red-500"
          >
            <span class="relative flex h-2 w-2">
              <span class="absolute inline-flex h-full w-full animate-ping rounded-full bg-white opacity-75" />
              <span class="relative inline-flex h-2 w-2 rounded-full bg-white" />
            </span>
            Open live monitor
          </NuxtLink>
          <NuxtLink
            to="/agent/login"
            class="rounded-lg border border-ui-border/60 px-5 py-2.5 text-sm font-medium text-ui-text transition hover:bg-ui-muted/10"
          >
            Agent sign in
          </NuxtLink>
        </div>
      </div>
    </section>

    <div class="mx-auto max-w-7xl space-y-12 px-4 py-10 sm:px-6 sm:py-14">
      <!-- Platform stats -->
      <section>
        <h2 class="text-sm font-semibold uppercase tracking-wider text-ui-muted">Platform at a glance</h2>
        <div class="mt-4 grid grid-cols-2 gap-4 lg:grid-cols-4">
          <div
            v-for="stat in platformStats"
            :key="stat.label"
            class="ui-card p-5"
          >
            <p class="text-xs font-medium uppercase tracking-wider text-ui-muted">{{ stat.label }}</p>
            <p class="mt-2 text-3xl font-bold" :class="stat.accent ?? 'text-ui-text'">
              <span v-if="!statsLoading">{{ stat.value }}</span>
              <span v-else class="inline-block h-8 w-14 animate-pulse rounded bg-ui-elevated" />
            </p>
            <p class="mt-1 text-xs text-ui-muted">{{ stat.hint }}</p>
          </div>
        </div>
      </section>

      <!-- What it does -->
      <section>
        <h2 class="text-2xl font-bold text-ui-text">What this platform does</h2>
        <p class="mt-2 max-w-2xl text-ui-muted">
          Built for election-day transparency — connecting field agents, coordinators, and the public
          to live polling unit activity across Ogun State.
        </p>
        <div class="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          <article
            v-for="feature in features"
            :key="feature.title"
            class="ui-card p-6"
          >
            <div class="flex h-11 w-11 items-center justify-center rounded-xl text-xl" :class="feature.iconBg">
              {{ feature.icon }}
            </div>
            <h3 class="mt-4 font-semibold text-ui-text">{{ feature.title }}</h3>
            <p class="mt-2 text-sm leading-relaxed text-ui-muted">{{ feature.description }}</p>
          </article>
        </div>
      </section>

      <!-- How it works -->
      <section class="ui-card overflow-hidden">
        <div class="border-b border-ui-border/40 px-6 py-5">
          <h2 class="text-lg font-semibold text-ui-text">How it works</h2>
        </div>
        <ol class="divide-y divide-ui-border/30">
          <li
            v-for="(step, idx) in steps"
            :key="step.title"
            class="flex gap-4 px-6 py-5"
          >
            <span class="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-sky-500/15 text-sm font-bold text-sky-600 dark:text-sky-400">
              {{ idx + 1 }}
            </span>
            <div>
              <h3 class="font-medium text-ui-text">{{ step.title }}</h3>
              <p class="mt-1 text-sm text-ui-muted">{{ step.description }}</p>
            </div>
          </li>
        </ol>
      </section>

      <!-- Coverage -->
      <section class="grid gap-6 lg:grid-cols-2">
        <div class="ui-card p-6">
          <h2 class="text-lg font-semibold text-ui-text">Statewide coverage</h2>
          <p class="mt-2 text-sm text-ui-muted">
            Agents are assigned to LGAs and wards across Ogun State. Polling units are selected from
            the official INEC catalog — no manual typing, fewer errors on election day.
          </p>
          <dl class="mt-5 grid grid-cols-2 gap-4">
            <div class="rounded-lg bg-ui-elevated/50 px-4 py-3">
              <dt class="text-xs uppercase tracking-wider text-ui-muted">Local gov. areas</dt>
              <dd class="mt-1 text-2xl font-bold text-ui-text">{{ geoSummary?.lga_count ?? "—" }}</dd>
            </div>
            <div class="rounded-lg bg-ui-elevated/50 px-4 py-3">
              <dt class="text-xs uppercase tracking-wider text-ui-muted">Electoral wards</dt>
              <dd class="mt-1 text-2xl font-bold text-ui-text">{{ geoSummary?.ward_count ?? "—" }}</dd>
            </div>
          </dl>
        </div>

        <div class="ui-card flex flex-col justify-between p-6">
          <div>
            <h2 class="text-lg font-semibold text-ui-text">Ready to watch live?</h2>
            <p class="mt-2 text-sm text-ui-muted">
              The monitor dashboard refreshes every few seconds with live feed counts, active wards,
              people on site, and video previews from the field.
            </p>
          </div>
          <div class="mt-6 flex flex-wrap gap-3">
            <NuxtLink
              to="/monitor"
              class="rounded-lg bg-sky-600 px-4 py-2 text-sm font-medium text-white hover:bg-sky-500"
            >
              Go to monitor
            </NuxtLink>
            <NuxtLink
              to="/feeds"
              class="rounded-lg border border-ui-border/50 px-4 py-2 text-sm text-ui-text hover:bg-ui-muted/10"
            >
              Browse live feeds
            </NuxtLink>
          </div>
        </div>
      </section>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useLiveDashboard } from "~/composables/useLiveDashboard";
import { useVideoFeeds } from "~/composables/useVideoFeeds";

definePageMeta({ layout: "default" });

const config = useRuntimeConfig();
const apiBase = config.public.apiBase;

const { data: feedData, loading: feedLoading } = useVideoFeeds(30000);
const { data: formData, loading: formLoading } = useLiveDashboard(30000);

const geoSummary = ref<{ lga_count: number; ward_count: number } | null>(null);
const geoLoading = ref(true);

onMounted(async () => {
  try {
    geoSummary.value = await $fetch(`${apiBase}/geo/states/ogun/summary`);
  } catch {
    geoSummary.value = null;
  } finally {
    geoLoading.value = false;
  }
});

const statsLoading = computed(() => feedLoading.value || formLoading.value || geoLoading.value);

const platformStats = computed(() => [
  {
    label: "Registered units",
    value: feedData.value?.registered_units ?? 0,
    hint: "Polling units in the system",
    accent: "text-ui-text",
  },
  {
    label: "Live feeds",
    value: feedData.value?.live_feeds ?? 0,
    hint: "Streaming right now",
    accent: "text-red-600 dark:text-red-400",
  },
  {
    label: "Forms scanned",
    value: formData.value?.total_registrations ?? 0,
    hint: `${formData.value?.today_count ?? 0} today`,
    accent: "text-emerald-600 dark:text-emerald-400",
  },
  {
    label: "LGAs in Ogun",
    value: geoSummary.value?.lga_count ?? "—",
    hint: `${geoSummary.value?.ward_count ?? "—"} electoral wards`,
    accent: "text-sky-600 dark:text-sky-400",
  },
]);

const features = [
  {
    icon: "📡",
    iconBg: "bg-red-500/10",
    title: "Live video streaming",
    description:
      "Field agents broadcast real-time video and audio from polling units via WebRTC. Coordinators and the public can watch live feeds grouped by LGA and ward.",
  },
  {
    icon: "👥",
    iconBg: "bg-emerald-500/10",
    title: "Unique people counting",
    description:
      "Computer vision detects and deduplicates faces in the stream to estimate how many unique individuals are on site at each polling unit.",
  },
  {
    icon: "📋",
    iconBg: "bg-violet-500/10",
    title: "Form registration scanning",
    description:
      "Scan voter registration forms to log participation. Registrations are tracked in the live dashboard alongside streaming activity.",
  },
  {
    icon: "📍",
    iconBg: "bg-sky-500/10",
    title: "Official polling unit catalog",
    description:
      "Agents select LGA, ward, and polling unit from the INEC list. No free-text entry — every unit is mapped to the correct electoral geography.",
  },
  {
    icon: "📱",
    iconBg: "bg-amber-500/10",
    title: "Agent data credits",
    description:
      "Admins can allocate mobile data plans so field agents stay connected on polling day. Claim limits are controlled per agent.",
  },
  {
    icon: "🛡️",
    iconBg: "bg-ui-elevated",
    title: "Admin control panel",
    description:
      "Super admins manage agents, force streams offline, correct counts, review saved pictures, and configure enabled data plans.",
  },
];

const steps = [
  {
    title: "Agents register and go live",
    description:
      "Field agents sign in, register their polling unit, and start a live stream from the relay page using their ingest token.",
  },
  {
    title: "Video feeds appear on the monitor",
    description:
      "The monitor dashboard shows live feed counts, active LGAs and wards, people on site, and video previews — all auto-refreshing.",
  },
  {
    title: "Coordinators drill down by LGA",
    description:
      "Open Live Feeds to browse streams by local government and ward, view fullscreen, and review saved pictures from the field.",
  },
];
</script>
