<template>
  <div class="bg-background font-body-md text-on-surface">
    <section class="relative overflow-hidden bg-deep-navy">
      <div class="pattern-grid absolute inset-0 opacity-70" />
      <div class="absolute inset-0 bg-gradient-to-b from-electric-pink/10 via-deep-navy/95 to-deep-navy" />
      <div class="pointer-events-none absolute -top-32 right-[-10%] h-96 w-96 rounded-full bg-electric-pink/15 blur-3xl" />
      <div class="pointer-events-none absolute -bottom-20 left-10 h-80 w-80 rounded-full bg-action-green/10 blur-3xl" />

      <div class="relative mx-auto max-w-container-max px-margin-mobile pt-10 lg:px-gutter sm:pt-16">
        <div class="flex flex-wrap items-center gap-3">
          <BrandMark size="md" :show-name="false" />
          <p class="font-label-caps text-label-caps font-semibold uppercase tracking-wider text-action-green">
            Election-Day Operations · Live Telemetry
          </p>
        </div>

        <div class="mt-10 max-w-3xl">
          <h1 class="font-display-lg text-4xl font-extrabold leading-[1.08] tracking-tight text-pure-white sm:text-6xl">
            Real-time visibility into<br class="hidden sm:block">
            every polling unit.
          </h1>
          <p class="mt-6 max-w-xl font-body-lg text-lg leading-relaxed text-primary-fixed-dim">
            An independent monitoring system connecting field agents, coordinators, and the
            public to live polling-unit activity across every ward.
          </p>
        </div>

        <div class="mt-9 flex flex-wrap items-center gap-3">
          <NuxtLink
            to="/monitor"
            class="inline-flex items-center justify-center gap-2.5 rounded-full bg-electric-pink px-6 py-3 font-button-text text-sm text-on-primary shadow-[0_4px_20px_rgba(255,56,127,0.35)] transition hover:bg-secondary"
          >
            <span class="relative flex h-2 w-2">
              <span class="absolute inline-flex h-full w-full animate-ping rounded-full bg-action-green opacity-75" />
              <span class="relative inline-flex h-2 w-2 rounded-full bg-action-green" />
            </span>
            Enter live monitor
          </NuxtLink>
          <NuxtLink
            to="/agent/login"
            class="rounded-full border border-white/15 px-6 py-3 font-button-text text-sm text-pure-white transition hover:bg-white/5"
          >
            Field agent sign-in
          </NuxtLink>
        </div>

        <div class="mt-14 grid grid-cols-2 gap-px overflow-hidden rounded-t-xl border border-white/10 bg-white/10 sm:grid-cols-4">
          <div v-for="stat in heroStats" :key="stat.label" class="bg-deep-navy/95 px-5 py-4 sm:px-6 sm:py-5">
            <p class="font-label-caps text-[10px] uppercase tracking-wider text-on-primary-container">{{ stat.label }}</p>
            <p class="mt-1.5 font-label-caps text-2xl font-bold tabular-nums" :class="stat.accent">
              <span v-if="!statsLoading">{{ stat.value.toLocaleString() }}</span>
              <span v-else class="inline-block h-6 w-10 animate-pulse rounded bg-white/10" />
            </p>
          </div>
        </div>
      </div>
    </section>

    <section class="border-b border-outline-variant bg-surface-container-low">
      <div class="mx-auto max-w-container-max px-margin-mobile py-4 lg:px-gutter">
        <div class="flex flex-wrap items-center justify-center gap-x-8 gap-y-2 sm:justify-between">
          <p v-for="badge in trustBadges" :key="badge" class="flex items-center gap-2 font-body-md text-xs font-medium text-on-surface-variant">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" class="h-3.5 w-3.5 shrink-0 text-action-green">
              <path d="M4 12.5l5 5L20 6.5" />
            </svg>
            {{ badge }}
          </p>
        </div>
      </div>
    </section>

    <div class="mx-auto max-w-container-max space-y-20 px-margin-mobile py-16 lg:px-gutter sm:py-20">
      <section>
        <p class="font-label-caps text-label-caps font-semibold uppercase tracking-wider text-electric-pink">
          Platform capabilities
        </p>
        <h2 class="mt-2 max-w-2xl font-headline-lg text-2xl font-bold text-primary sm:text-3xl">
          Built for election-day transparency
        </h2>

        <div class="mt-8 grid gap-px overflow-hidden rounded-2xl border border-outline-variant bg-outline-variant sm:grid-cols-2 lg:grid-cols-3">
          <article class="bg-surface-container-lowest p-6">
            <div class="flex items-start justify-between">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" class="h-8 w-8 text-electric-pink">
                <circle cx="12" cy="19" r="1.3" fill="currentColor" stroke="none" />
                <path d="M8.5 15.5a5 5 0 0 1 7 0" />
                <path d="M5.5 12.2a9.2 9.2 0 0 1 13 0" />
                <path d="M2.7 9a13 13 0 0 1 18.6 0" />
              </svg>
              <span class="font-label-caps text-xs text-on-surface-variant">01</span>
            </div>
            <h3 class="mt-4 font-headline-md text-base font-semibold text-primary">Live video streaming</h3>
            <p class="mt-2 font-body-md text-sm leading-relaxed text-on-surface-variant">
              Field agents broadcast real-time video and audio from polling units via WebRTC.
              Coordinators and the public can watch live feeds grouped by LGA and ward.
            </p>
          </article>

          <article class="bg-surface-container-lowest p-6">
            <div class="flex items-start justify-between">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" class="h-8 w-8 text-action-green">
                <circle cx="9" cy="8.5" r="3" />
                <path d="M3.5 20c0-3.6 2.9-6.5 6.5-6.5s6.5 2.9 6.5 6.5" />
                <circle cx="17" cy="8.5" r="2.2" />
                <path d="M15.8 13.6c2.6.5 4.7 2.9 4.7 6.4" />
              </svg>
              <span class="font-label-caps text-xs text-on-surface-variant">02</span>
            </div>
            <h3 class="mt-4 font-headline-md text-base font-semibold text-primary">Unique people counting</h3>
            <p class="mt-2 font-body-md text-sm leading-relaxed text-on-surface-variant">
              Computer vision detects and deduplicates faces in the stream to estimate how many
              unique individuals are on site at each polling unit.
            </p>
          </article>

          <article class="bg-surface-container-lowest p-6">
            <div class="flex items-start justify-between">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" class="h-8 w-8 text-deep-navy">
                <path d="M7 3.5h6.5L18 8v11.5a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1v-15a1 1 0 0 1 1-1Z" />
                <path d="M13.5 3.5V8H18" />
                <path d="M9 13.5l2 2 4-4.2" />
              </svg>
              <span class="font-label-caps text-xs text-on-surface-variant">03</span>
            </div>
            <h3 class="mt-4 font-headline-md text-base font-semibold text-primary">Result-sheet capture</h3>
            <p class="mt-2 font-body-md text-sm leading-relaxed text-on-surface-variant">
              Agents photograph EC8A result sheets on the spot — hashed, GPS and time-stamped, and
              locked immutable the moment they're submitted.
            </p>
          </article>

          <article class="bg-surface-container-lowest p-6">
            <div class="flex items-start justify-between">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" class="h-8 w-8 text-electric-pink">
                <path d="M12 21.5s7-7.4 7-12.6a7 7 0 1 0-14 0c0 5.2 7 12.6 7 12.6Z" />
                <circle cx="12" cy="8.8" r="2.6" />
              </svg>
              <span class="font-label-caps text-xs text-on-surface-variant">04</span>
            </div>
            <h3 class="mt-4 font-headline-md text-base font-semibold text-primary">Official polling unit catalog</h3>
            <p class="mt-2 font-body-md text-sm leading-relaxed text-on-surface-variant">
              Agents select LGA, ward, and polling unit from the official list — no free-text entry,
              every unit mapped to the correct electoral geography.
            </p>
          </article>

          <article class="bg-surface-container-lowest p-6">
            <div class="flex items-start justify-between">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" class="h-8 w-8 text-action-green">
                <rect x="7" y="2.5" width="10" height="19" rx="2.2" />
                <path d="M10.7 18.3h2.6" />
              </svg>
              <span class="font-label-caps text-xs text-on-surface-variant">05</span>
            </div>
            <h3 class="mt-4 font-headline-md text-base font-semibold text-primary">Agent data credits</h3>
            <p class="mt-2 font-body-md text-sm leading-relaxed text-on-surface-variant">
              Admins allocate mobile data plans so field agents stay connected on polling day,
              with claim limits controlled per agent.
            </p>
          </article>

          <article class="bg-surface-container-lowest p-6">
            <div class="flex items-start justify-between">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" class="h-8 w-8 text-deep-navy">
                <path d="M12 3 5 5.8v5.4c0 5 3 8.9 7 10 4-1.1 7-5 7-10V5.8Z" />
                <path d="M9 12l2.2 2.2L15.5 9.6" />
              </svg>
              <span class="font-label-caps text-xs text-on-surface-variant">06</span>
            </div>
            <h3 class="mt-4 font-headline-md text-base font-semibold text-primary">Independent oversight panel</h3>
            <p class="mt-2 font-body-md text-sm leading-relaxed text-on-surface-variant">
              Coordinators manage agents, correct counts, review discrepancies against official
              figures, and hold a defensible, tamper-evident record.
            </p>
            <NuxtLink to="/independent-audit" class="mt-3 inline-block font-button-text text-sm text-electric-pink hover:underline">
              Open Independent Audit
            </NuxtLink>
          </article>
        </div>
      </section>

      <section>
        <p class="font-label-caps text-label-caps font-semibold uppercase tracking-wider text-electric-pink">
          Operating procedure
        </p>
        <h2 class="mt-2 max-w-2xl font-headline-lg text-2xl font-bold text-primary sm:text-3xl">
          How the platform runs on polling day
        </h2>

        <ol class="relative mt-10 space-y-10 border-l border-outline-variant pl-8 sm:pl-10">
          <li v-for="(step, idx) in steps" :key="step.title" class="relative">
            <span
              class="absolute -left-[41px] top-0 flex h-8 w-8 items-center justify-center rounded-full border border-action-green/40 bg-background font-label-caps text-xs font-bold text-action-green sm:-left-[49px]"
            >
              {{ String(idx + 1).padStart(2, "0") }}
            </span>
            <h3 class="font-headline-md text-base font-semibold text-primary">{{ step.title }}</h3>
            <p class="mt-1.5 max-w-2xl font-body-md text-sm leading-relaxed text-on-surface-variant">{{ step.description }}</p>
          </li>
        </ol>
      </section>

      <section class="grid gap-6 lg:grid-cols-5">
        <div class="overflow-hidden rounded-2xl bg-deep-navy p-8 lg:col-span-3">
          <p class="font-label-caps text-label-caps font-semibold uppercase tracking-wider text-action-green">Statewide coverage</p>
          <h2 class="mt-2 font-headline-md text-xl font-bold text-pure-white">Mapped to the official electoral geography</h2>
          <p class="mt-3 max-w-md font-body-md text-sm leading-relaxed text-primary-fixed-dim">
            Agents are assigned to LGAs and wards. Every polling unit is selected
            from the official catalog — no free-text entry, no mismatched geography.
          </p>
          <dl class="mt-8 grid grid-cols-2 gap-6">
            <div>
              <dt class="font-label-caps text-[11px] uppercase tracking-wider text-on-primary-container">Local gov. areas</dt>
              <dd class="mt-1 font-display-lg text-4xl font-bold tabular-nums text-pure-white">
                {{ geoSummary?.lga_count ?? "—" }}
              </dd>
            </div>
            <div>
              <dt class="font-label-caps text-[11px] uppercase tracking-wider text-on-primary-container">Electoral wards</dt>
              <dd class="mt-1 font-display-lg text-4xl font-bold tabular-nums text-pure-white">
                {{ geoSummary?.ward_count ?? "—" }}
              </dd>
            </div>
          </dl>
        </div>

        <div class="flex flex-col justify-between rounded-2xl border border-outline-variant bg-surface-container-lowest p-8 lg:col-span-2">
          <div>
            <p class="font-label-caps text-label-caps font-semibold uppercase tracking-wider text-electric-pink">
              Live monitor
            </p>
            <h2 class="mt-2 font-headline-md text-xl font-bold text-primary">Ready to watch live?</h2>
            <p class="mt-3 font-body-md text-sm leading-relaxed text-on-surface-variant">
              Refreshes every few seconds with live feed counts, active wards, people on site, and
              video previews from the field.
            </p>
          </div>
          <div class="mt-8 flex flex-wrap gap-3">
            <NuxtLink
              to="/monitor"
              class="rounded-full bg-electric-pink px-5 py-2.5 font-button-text text-sm text-on-primary shadow-[0_2px_12px_rgba(255,56,127,0.3)] hover:bg-secondary"
            >
              Go to monitor
            </NuxtLink>
            <NuxtLink
              to="/feeds"
              class="rounded-full border border-outline-variant px-5 py-2.5 font-button-text text-sm text-primary hover:bg-surface-container-low"
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

useHead({
  title: "Live Monitoring",
});

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

const heroStats = computed(() => [
  { label: "Live feeds", value: feedData.value?.live_feeds ?? 0, accent: "text-electric-pink" },
  { label: "Units reporting", value: feedData.value?.registered_units ?? 0, accent: "text-action-green" },
  { label: "People on site", value: feedData.value?.total_people ?? 0, accent: "text-pure-white" },
  { label: "Forms scanned", value: formData.value?.total_registrations ?? 0, accent: "text-tertiary-fixed" },
]);

const trustBadges = [
  "Official polling-unit catalog",
  "GPS & timestamp-verified capture",
  "Independent, tamper-evident records",
  "Built for election-day transparency",
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
    title: "Result sheets are captured at the count",
    description:
      "The moment results are announced, agents photograph the EC8A on the spot — hashed, geo-tagged, and locked as an immutable record.",
  },
  {
    title: "Coordinators drill down by LGA",
    description:
      "Open Live Feeds to browse streams by local government and ward, view fullscreen, and review saved pictures from the field.",
  },
];
</script>
