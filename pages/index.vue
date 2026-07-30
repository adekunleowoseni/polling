<template>
  <div>
    <!-- Masthead / operations hero -->
    <section class="relative overflow-hidden bg-slate-950">
      <div class="pattern-grid absolute inset-0 opacity-70" />
      <div class="absolute inset-0 bg-gradient-to-b from-emerald-950/30 via-slate-950/95 to-slate-950" />
      <div class="pointer-events-none absolute -top-32 right-[-10%] h-96 w-96 rounded-full bg-emerald-500/10 blur-3xl" />

      <div class="relative mx-auto max-w-7xl px-4 pt-10 sm:px-6 sm:pt-16">
        <div class="flex flex-wrap items-center gap-3">
          <BrandLogos size="md" />
          <div class="h-8 w-px bg-white/15" />
          <p class="text-[11px] font-semibold uppercase tracking-[0.25em] text-emerald-400">
            Election-Day Operations · Ogun State
          </p>
        </div>

        <div class="mt-10 max-w-3xl">
          <h1 class="text-4xl font-bold leading-[1.08] tracking-tight text-white sm:text-6xl">
            Real-time visibility into<br class="hidden sm:block" />
            every polling unit.
          </h1>
          <p class="mt-6 max-w-xl text-lg leading-relaxed text-slate-300">
            An independent monitoring system connecting field agents, coordinators, and the
            public to live polling-unit activity across every ward in Ogun State.
          </p>
        </div>

        <div class="mt-9 flex flex-wrap items-center gap-3">
          <NuxtLink
            to="/monitor"
            class="inline-flex items-center gap-2.5 rounded-lg bg-emerald-500 px-6 py-3 text-sm font-semibold text-slate-950 transition hover:bg-emerald-400"
          >
            <span class="relative flex h-2 w-2">
              <span class="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-500 opacity-75" />
              <span class="relative inline-flex h-2 w-2 rounded-full bg-red-500" />
            </span>
            Enter live monitor
          </NuxtLink>
          <NuxtLink
            to="/agent/login"
            class="rounded-lg border border-white/15 px-6 py-3 text-sm font-medium text-white transition hover:bg-white/5"
          >
            Field agent sign-in
          </NuxtLink>
        </div>

        <!-- Live ops readout -->
        <div class="mt-14 grid grid-cols-2 gap-px overflow-hidden rounded-t-xl border border-white/10 bg-white/10 sm:grid-cols-4">
          <div v-for="stat in heroStats" :key="stat.label" class="bg-slate-950/95 px-5 py-4 sm:px-6 sm:py-5">
            <p class="text-[10px] font-semibold uppercase tracking-wider text-slate-500">{{ stat.label }}</p>
            <p class="mt-1.5 font-mono text-2xl font-bold tabular-nums" :class="stat.accent">
              <span v-if="!statsLoading">{{ stat.value.toLocaleString() }}</span>
              <span v-else class="inline-block h-6 w-10 animate-pulse rounded bg-white/10" />
            </p>
          </div>
        </div>
      </div>
    </section>

    <!-- Integrity / trust strip -->
    <section class="border-b border-ui-border/50 bg-ui-elevated/50">
      <div class="mx-auto max-w-7xl px-4 py-4 sm:px-6">
        <div class="flex flex-wrap items-center justify-center gap-x-8 gap-y-2 sm:justify-between">
          <p v-for="badge in trustBadges" :key="badge" class="flex items-center gap-2 text-xs font-medium text-ui-muted">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" class="h-3.5 w-3.5 shrink-0 text-emerald-500">
              <path d="M4 12.5l5 5L20 6.5" />
            </svg>
            {{ badge }}
          </p>
        </div>
      </div>
    </section>

    <div class="mx-auto max-w-7xl space-y-20 px-4 py-16 sm:px-6 sm:py-20">
      <!-- Capabilities -->
      <section>
        <p class="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-600 dark:text-emerald-400">
          Platform capabilities
        </p>
        <h2 class="mt-2 max-w-2xl text-2xl font-bold text-ui-text sm:text-3xl">
          Built for election-day transparency
        </h2>

        <div class="mt-8 grid gap-px overflow-hidden rounded-2xl border border-ui-border/50 bg-ui-border/50 sm:grid-cols-2 lg:grid-cols-3">
          <article class="bg-ui-surface p-6">
            <div class="flex items-start justify-between">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" class="h-8 w-8 text-red-500">
                <circle cx="12" cy="19" r="1.3" fill="currentColor" stroke="none" />
                <path d="M8.5 15.5a5 5 0 0 1 7 0" />
                <path d="M5.5 12.2a9.2 9.2 0 0 1 13 0" />
                <path d="M2.7 9a13 13 0 0 1 18.6 0" />
              </svg>
              <span class="font-mono text-xs text-ui-muted">01</span>
            </div>
            <h3 class="mt-4 font-semibold text-ui-text">Live video streaming</h3>
            <p class="mt-2 text-sm leading-relaxed text-ui-muted">
              Field agents broadcast real-time video and audio from polling units via WebRTC.
              Coordinators and the public can watch live feeds grouped by LGA and ward.
            </p>
          </article>

          <article class="bg-ui-surface p-6">
            <div class="flex items-start justify-between">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" class="h-8 w-8 text-emerald-600 dark:text-emerald-400">
                <circle cx="9" cy="8.5" r="3" />
                <path d="M3.5 20c0-3.6 2.9-6.5 6.5-6.5s6.5 2.9 6.5 6.5" />
                <circle cx="17" cy="8.5" r="2.2" />
                <path d="M15.8 13.6c2.6.5 4.7 2.9 4.7 6.4" />
              </svg>
              <span class="font-mono text-xs text-ui-muted">02</span>
            </div>
            <h3 class="mt-4 font-semibold text-ui-text">Unique people counting</h3>
            <p class="mt-2 text-sm leading-relaxed text-ui-muted">
              Computer vision detects and deduplicates faces in the stream to estimate how many
              unique individuals are on site at each polling unit.
            </p>
          </article>

          <article class="bg-ui-surface p-6">
            <div class="flex items-start justify-between">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" class="h-8 w-8 text-violet-600 dark:text-violet-400">
                <path d="M7 3.5h6.5L18 8v11.5a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1v-15a1 1 0 0 1 1-1Z" />
                <path d="M13.5 3.5V8H18" />
                <path d="M9 13.5l2 2 4-4.2" />
              </svg>
              <span class="font-mono text-xs text-ui-muted">03</span>
            </div>
            <h3 class="mt-4 font-semibold text-ui-text">Result-sheet capture</h3>
            <p class="mt-2 text-sm leading-relaxed text-ui-muted">
              Agents photograph EC8A result sheets on the spot — hashed, GPS and time-stamped, and
              locked immutable the moment they're submitted.
            </p>
          </article>

          <article class="bg-ui-surface p-6">
            <div class="flex items-start justify-between">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" class="h-8 w-8 text-sky-600 dark:text-sky-400">
                <path d="M12 21.5s7-7.4 7-12.6a7 7 0 1 0-14 0c0 5.2 7 12.6 7 12.6Z" />
                <circle cx="12" cy="8.8" r="2.6" />
              </svg>
              <span class="font-mono text-xs text-ui-muted">04</span>
            </div>
            <h3 class="mt-4 font-semibold text-ui-text">Official polling unit catalog</h3>
            <p class="mt-2 text-sm leading-relaxed text-ui-muted">
              Agents select LGA, ward, and polling unit from the INEC list — no free-text entry,
              every unit mapped to the correct electoral geography.
            </p>
          </article>

          <article class="bg-ui-surface p-6">
            <div class="flex items-start justify-between">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" class="h-8 w-8 text-amber-600 dark:text-amber-400">
                <rect x="7" y="2.5" width="10" height="19" rx="2.2" />
                <path d="M10.7 18.3h2.6" />
              </svg>
              <span class="font-mono text-xs text-ui-muted">05</span>
            </div>
            <h3 class="mt-4 font-semibold text-ui-text">Agent data credits</h3>
            <p class="mt-2 text-sm leading-relaxed text-ui-muted">
              Admins allocate mobile data plans so field agents stay connected on polling day,
              with claim limits controlled per agent.
            </p>
          </article>

          <article class="bg-ui-surface p-6">
            <div class="flex items-start justify-between">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" class="h-8 w-8 text-ui-text">
                <path d="M12 3 5 5.8v5.4c0 5 3 8.9 7 10 4-1.1 7-5 7-10V5.8Z" />
                <path d="M9 12l2.2 2.2L15.5 9.6" />
              </svg>
              <span class="font-mono text-xs text-ui-muted">06</span>
            </div>
            <h3 class="mt-4 font-semibold text-ui-text">Independent oversight panel</h3>
            <p class="mt-2 text-sm leading-relaxed text-ui-muted">
              Coordinators manage agents, correct counts, review discrepancies against official
              figures, and hold a defensible, tamper-evident record.
            </p>
          </article>
        </div>
      </section>

      <!-- Operating procedure -->
      <section>
        <p class="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-600 dark:text-emerald-400">
          Operating procedure
        </p>
        <h2 class="mt-2 max-w-2xl text-2xl font-bold text-ui-text sm:text-3xl">
          How the platform runs on polling day
        </h2>

        <ol class="relative mt-10 space-y-10 border-l border-ui-border/60 pl-8 sm:pl-10">
          <li v-for="(step, idx) in steps" :key="step.title" class="relative">
            <span
              class="absolute -left-[41px] top-0 flex h-8 w-8 items-center justify-center rounded-full border border-emerald-500/40 bg-ui-bg font-mono text-xs font-bold text-emerald-600 dark:text-emerald-400 sm:-left-[49px]"
            >
              {{ String(idx + 1).padStart(2, "0") }}
            </span>
            <h3 class="font-semibold text-ui-text">{{ step.title }}</h3>
            <p class="mt-1.5 max-w-2xl text-sm leading-relaxed text-ui-muted">{{ step.description }}</p>
          </li>
        </ol>
      </section>

      <!-- Coverage + CTA -->
      <section class="grid gap-6 lg:grid-cols-5">
        <div class="overflow-hidden rounded-2xl border border-ui-border/50 bg-slate-950 p-8 lg:col-span-3">
          <p class="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-400">Statewide coverage</p>
          <h2 class="mt-2 text-xl font-bold text-white">Mapped to the official electoral geography</h2>
          <p class="mt-3 max-w-md text-sm leading-relaxed text-slate-400">
            Agents are assigned to LGAs and wards across Ogun State. Every polling unit is selected
            from the official INEC catalog — no free-text entry, no mismatched geography.
          </p>
          <dl class="mt-8 grid grid-cols-2 gap-6">
            <div>
              <dt class="text-xs uppercase tracking-wider text-slate-500">Local gov. areas</dt>
              <dd class="mt-1 font-mono text-4xl font-bold tabular-nums text-white">
                {{ geoSummary?.lga_count ?? "—" }}
              </dd>
            </div>
            <div>
              <dt class="text-xs uppercase tracking-wider text-slate-500">Electoral wards</dt>
              <dd class="mt-1 font-mono text-4xl font-bold tabular-nums text-white">
                {{ geoSummary?.ward_count ?? "—" }}
              </dd>
            </div>
          </dl>
        </div>

        <div class="flex flex-col justify-between rounded-2xl border border-ui-border/50 bg-ui-surface p-8 lg:col-span-2">
          <div>
            <p class="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-600 dark:text-emerald-400">
              Live monitor
            </p>
            <h2 class="mt-2 text-xl font-bold text-ui-text">Ready to watch live?</h2>
            <p class="mt-3 text-sm leading-relaxed text-ui-muted">
              Refreshes every few seconds with live feed counts, active wards, people on site, and
              video previews from the field.
            </p>
          </div>
          <div class="mt-8 flex flex-wrap gap-3">
            <NuxtLink
              to="/monitor"
              class="rounded-lg bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-emerald-500"
            >
              Go to monitor
            </NuxtLink>
            <NuxtLink
              to="/feeds"
              class="rounded-lg border border-ui-border/60 px-5 py-2.5 text-sm font-medium text-ui-text hover:bg-ui-muted/10"
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

const heroStats = computed(() => [
  { label: "Live feeds", value: feedData.value?.live_feeds ?? 0, accent: "text-red-400" },
  { label: "Units reporting", value: feedData.value?.registered_units ?? 0, accent: "text-emerald-400" },
  { label: "People on site", value: feedData.value?.total_people ?? 0, accent: "text-sky-400" },
  { label: "Forms scanned", value: formData.value?.total_registrations ?? 0, accent: "text-amber-400" },
]);

const trustBadges = [
  "Official INEC polling-unit catalog",
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
