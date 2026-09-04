<template>
  <div class="bg-background font-body-md text-on-surface antialiased">
    <header class="fixed left-0 right-0 top-0 z-50 border-b border-outline-variant/40 bg-surface/90 backdrop-blur-xl">
      <div
        class="mx-auto grid h-16 max-w-container-max grid-cols-[auto_1fr_auto] items-center gap-3 px-margin-mobile lg:h-20 lg:gap-6 lg:px-gutter"
      >
        <!-- Brand -->
        <NuxtLink to="/" class="relative z-10 flex shrink-0 items-center">
          <BrandMark size="md" />
        </NuxtLink>

        <!-- Center menus (desktop) -->
        <nav
          class="hidden min-w-0 items-center justify-center gap-1 lg:flex xl:gap-0.5"
          aria-label="Primary"
        >
          <template v-for="item in navLinks" :key="item.label">
            <NuxtLink
              v-if="item.to"
              :to="item.to"
              class="inline-flex h-9 items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 font-button-text text-[13px] text-on-surface-variant transition-colors hover:bg-surface-container-low hover:text-on-surface xl:px-3 xl:text-sm"
            >
              <span v-if="item.live" class="relative flex h-1.5 w-1.5 shrink-0">
                <span class="absolute inline-flex h-full w-full animate-ping rounded-full bg-action-green opacity-75" />
                <span class="relative inline-flex h-1.5 w-1.5 rounded-full bg-action-green" />
              </span>
              {{ item.short || item.label }}
            </NuxtLink>
            <a
              v-else
              :href="item.href"
              class="inline-flex h-9 items-center whitespace-nowrap rounded-full px-2.5 font-button-text text-[13px] text-on-surface-variant transition-colors hover:bg-surface-container-low hover:text-on-surface xl:px-3 xl:text-sm"
            >
              {{ item.short || item.label }}
            </a>
          </template>
        </nav>

        <!-- Actions -->
        <div class="relative z-10 flex shrink-0 items-center justify-end gap-2 sm:gap-3">
          <NuxtLink
            to="/admin/login"
            class="hidden h-9 items-center px-2 font-button-text text-sm text-on-surface-variant transition-colors hover:text-on-surface md:inline-flex"
          >
            Log in
          </NuxtLink>
          <NuxtLink
            to="/register"
            class="hidden h-9 items-center px-2 font-button-text text-sm text-on-surface-variant transition-colors hover:text-on-surface lg:inline-flex"
          >
            Register org
          </NuxtLink>
          <a
            href="#demo"
            class="inline-flex h-9 items-center justify-center rounded-full bg-electric-pink px-3.5 font-button-text text-sm text-on-primary shadow-[0_2px_12px_rgba(255,56,127,0.28)] transition-all hover:bg-secondary sm:px-4"
          >
            Book a Demo
          </a>
          <ThemeToggle />
          <NuxtLink
            to="/admin/login"
            class="hidden h-9 w-9 items-center justify-center rounded-full bg-deep-navy md:inline-flex"
            aria-label="Admin sign in"
          >
            <span class="material-symbols-outlined text-[18px] text-on-primary">person</span>
          </NuxtLink>
          <button
            type="button"
            class="inline-flex h-9 w-9 items-center justify-center rounded-full bg-surface-container-low text-primary lg:hidden"
            :aria-expanded="menuOpen"
            aria-label="Toggle menu"
            @click="menuOpen = !menuOpen"
          >
            <span class="material-symbols-outlined text-[22px]">{{ menuOpen ? "close" : "menu" }}</span>
          </button>
        </div>
      </div>

      <!-- Mobile / tablet menu -->
      <div
        v-if="menuOpen"
        class="border-t border-outline-variant/50 bg-surface-container-lowest lg:hidden"
      >
        <nav class="mx-auto flex max-w-container-max flex-col gap-0.5 px-margin-mobile py-3 lg:px-gutter" aria-label="Mobile">
          <template v-for="item in navLinks" :key="`m-${item.label}`">
            <NuxtLink
              v-if="item.to"
              :to="item.to"
              class="flex h-11 items-center gap-2.5 rounded-xl px-3 font-button-text text-sm text-on-surface transition-colors hover:bg-surface-container"
              @click="menuOpen = false"
            >
              <span v-if="item.live" class="h-2 w-2 shrink-0 rounded-full bg-action-green" />
              {{ item.label }}
            </NuxtLink>
            <a
              v-else
              :href="item.href"
              class="flex h-11 items-center rounded-xl px-3 font-button-text text-sm text-on-surface-variant transition-colors hover:bg-surface-container hover:text-on-surface"
              @click="menuOpen = false"
            >
              {{ item.label }}
            </a>
          </template>
          <div class="mt-2 flex flex-col gap-2 border-t border-outline-variant/40 pt-3 md:hidden">
            <NuxtLink
              to="/agent/login"
              class="flex h-11 items-center justify-center rounded-xl bg-surface-container font-button-text text-sm font-semibold text-primary"
              @click="menuOpen = false"
            >
              Log in
            </NuxtLink>
            <NuxtLink
              to="/admin/login"
              class="flex h-11 items-center justify-center gap-2 rounded-xl bg-deep-navy font-button-text text-sm font-semibold text-pure-white"
              @click="menuOpen = false"
            >
              <span class="material-symbols-outlined text-[18px]">person</span>
              Admin sign in
            </NuxtLink>
          </div>
        </nav>
      </div>
    </header>

    <main class="w-full bg-background pt-20">
      <div class="w-full bg-deep-navy px-margin-mobile py-2 text-pure-white lg:px-gutter">
        <div class="mx-auto flex max-w-container-max flex-wrap items-center justify-between gap-base font-label-caps text-label-caps">
          <div class="flex items-center gap-base">
            <span class="inline-flex items-center gap-1 text-action-green">
              <span class="h-2 w-2 animate-pulse rounded-full bg-action-green" />
              GLOBAL TELEMETRY ACTIVE
            </span>
            <span class="hidden text-outline-variant sm:inline">|</span>
            <span class="hidden text-on-navy sm:inline">100,583 actions running across 80+ countries</span>
          </div>
          <div class="flex items-center gap-gutter text-on-primary-container">
            <span class="flex items-center gap-1">
              <span class="material-symbols-outlined text-[14px] text-action-green">verified</span>
              SOC 2 Type II
            </span>
            <span class="flex items-center gap-1">
              <span class="material-symbols-outlined text-[14px] text-electric-pink">speed</span>
              Latency: 114ms
            </span>
            <span class="hidden items-center gap-1 md:flex">
              <span class="material-symbols-outlined text-[14px] text-action-green">lock</span>
              Sovereign Encryption
            </span>
          </div>
        </div>
      </div>

      <section id="platform" class="relative w-full scroll-mt-20 overflow-hidden bg-background py-16 lg:py-24">
        <div class="pointer-events-none absolute right-1/4 top-0 -z-0 h-[600px] w-[600px] rounded-full bg-electric-pink/5 blur-3xl" />
        <div class="pointer-events-none absolute -bottom-20 left-10 -z-0 h-[500px] w-[500px] rounded-full bg-action-green/5 blur-3xl" />
        <div class="relative z-10 mx-auto flex max-w-container-max flex-col items-center px-margin-mobile text-center lg:px-gutter">
          <div class="mb-6 inline-flex items-center gap-2 rounded-full bg-surface-container-low px-4 py-1.5 shadow-sm">
            <span class="h-2 w-2 animate-ping rounded-full bg-electric-pink" />
            <span class="font-label-caps text-label-caps font-semibold uppercase tracking-wider text-deep-navy">
              Modern Infrastructure for Mission-Driven Movements
            </span>
          </div>
          <h1 class="mb-6 max-w-4xl font-display-lg text-headline-lg-mobile tracking-tight text-primary lg:text-display-lg lg:leading-[1.08]">
            Modern Infrastructure for Nonprofit &amp; Political Teams
          </h1>
          <p class="mb-8 max-w-2xl font-body-lg text-body-lg leading-relaxed text-on-surface-variant">
            Replace fragmented spreadsheets and legacy databases with a secure, unified real-time foundation.
            Activate 10,000+ field volunteers, track donor journeys, and scale community momentum without the security trade-offs.
          </p>
          <div class="mb-16 flex w-full flex-col items-center gap-4 sm:w-auto sm:flex-row">
            <a
              href="#demo"
              class="inline-flex w-full items-center justify-center gap-2 rounded-full bg-electric-pink px-8 py-3.5 font-button-text text-button-text text-on-primary shadow-[0_4px_20px_rgba(255,56,127,0.35)] transition-all hover:-translate-y-0.5 hover:bg-secondary sm:w-auto"
            >
              <span>Request a Demo</span>
              <span class="material-symbols-outlined text-[18px]">arrow_forward</span>
            </a>
            <a
              href="#infrastructure"
              class="inline-flex w-full items-center justify-center gap-2 rounded-full bg-surface-container-lowest px-8 py-3.5 font-button-text text-button-text text-primary shadow-sm transition-all hover:bg-surface-container sm:w-auto"
            >
              <span class="material-symbols-outlined text-[18px] text-deep-navy">shield</span>
              <span>Explore Architecture &amp; Security</span>
            </a>
          </div>

          <div class="grid w-full max-w-4xl grid-cols-2 gap-4 pb-12 pt-4 md:grid-cols-4 md:gap-8">
            <div class="flex flex-col items-center rounded-xl bg-surface-container-lowest p-4 shadow-sm">
              <span class="font-display-lg text-headline-md font-extrabold text-primary">1,500+</span>
              <span class="mt-1 font-label-caps text-label-caps uppercase text-on-surface-variant">Movements &amp; Parties</span>
            </div>
            <div class="flex flex-col items-center rounded-xl bg-surface-container-lowest p-4 shadow-sm">
              <span class="font-display-lg text-headline-md font-extrabold text-primary">125M+</span>
              <span class="mt-1 font-label-caps text-label-caps uppercase text-on-surface-variant">Doors Knocked</span>
            </div>
            <div class="flex flex-col items-center rounded-xl bg-surface-container-lowest p-4 shadow-sm">
              <span class="flex items-center gap-1 font-display-lg text-headline-md font-extrabold text-action-green">
                <span class="material-symbols-outlined text-[26px] text-action-green">verified</span>
                SOC 2
              </span>
              <span class="mt-1 font-label-caps text-label-caps uppercase text-on-surface-variant">Type II Certified</span>
            </div>
            <div class="flex flex-col items-center rounded-xl bg-surface-container-lowest p-4 shadow-sm">
              <span class="font-display-lg text-headline-md font-extrabold text-primary">99.99%</span>
              <span class="mt-1 font-label-caps text-label-caps uppercase text-on-surface-variant">Field Uptime</span>
            </div>
          </div>

          <div class="relative mt-4 w-full">
            <div class="absolute -left-2 -top-6 z-20 hidden items-center gap-3 rounded-xl bg-surface-container-lowest p-3.5 text-primary shadow-xl md:flex sm:left-4">
              <div class="flex h-10 w-10 items-center justify-center rounded-lg bg-deep-navy text-pure-white">
                <span class="material-symbols-outlined text-[22px]">hub</span>
              </div>
              <div class="text-left">
                <div class="font-label-caps text-label-caps uppercase text-on-surface-variant">Active Pipeline</div>
                <div class="flex items-center gap-2 font-headline-md text-base font-bold text-primary">
                  Syncing 14.8k Events/s
                  <span class="h-2 w-2 animate-ping rounded-full bg-action-green" />
                </div>
              </div>
            </div>
            <div class="absolute -bottom-6 -right-2 z-20 hidden items-center gap-3 rounded-xl bg-surface-container-lowest p-3.5 text-primary shadow-xl md:flex sm:right-6">
              <div class="flex h-10 w-10 items-center justify-center rounded-lg bg-electric-pink/15 text-electric-pink">
                <span class="material-symbols-outlined text-[22px]">lock</span>
              </div>
              <div class="text-left">
                <div class="font-label-caps text-label-caps uppercase text-on-surface-variant">Sovereign Vault</div>
                <div class="font-headline-md text-base font-bold text-primary">EU/US Isolated Enclaves</div>
              </div>
            </div>

            <div class="w-full rounded-2xl bg-deep-navy p-2 text-pure-white shadow-2xl sm:p-4">
              <div class="mb-3 flex items-center justify-between border-b border-outline/20 px-3 py-2">
                <div class="flex items-center gap-2">
                  <span class="h-3 w-3 rounded-full bg-error" />
                  <span class="h-3 w-3 rounded-full bg-action-green" />
                  <span class="h-3 w-3 rounded-full bg-outline-variant" />
                  <span class="ml-3 hidden font-label-caps text-label-caps tracking-wide text-on-navy sm:inline">
                    e-mobilize // Territorial Analysis &amp; Voter Routing Console
                  </span>
                </div>
                <div class="flex items-center gap-3">
                  <span class="rounded-full bg-surface-tint/30 px-2.5 py-0.5 font-label-caps text-[10px] uppercase text-pure-white">Cluster: us-east-prod-4</span>
                  <span class="h-2 w-2 rounded-full bg-action-green" />
                </div>
              </div>
              <div class="relative w-full overflow-hidden rounded-xl bg-surface-container-lowest text-on-surface">
                <div class="grid min-h-[480px] grid-cols-1 lg:grid-cols-12">
                  <div class="hidden flex-col justify-between bg-surface-container-low p-4 text-left lg:flex lg:col-span-3">
                    <div>
                      <div class="mb-4 flex items-center justify-between">
                        <span class="font-headline-md text-base font-bold text-primary">Events Finder</span>
                        <span class="rounded-full bg-surface-container-highest px-2 py-0.5 font-label-caps text-label-caps text-primary">37 Active</span>
                      </div>
                      <div class="space-y-2.5">
                        <div class="flex flex-col gap-1 rounded-lg bg-surface-container-lowest p-3 shadow-sm">
                          <div class="font-button-text text-sm font-semibold text-primary">Volunteer Meetup - West District</div>
                          <div class="flex items-center gap-2 font-label-caps text-[11px] text-on-surface-variant">
                            <span class="material-symbols-outlined text-[14px] text-electric-pink">location_on</span>
                            London Camden · Live Now
                          </div>
                          <div class="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-surface-container">
                            <div class="h-full w-4/5 bg-action-green" />
                          </div>
                          <div class="mt-1 flex justify-between font-label-caps text-[10px] text-on-surface-variant">
                            <span>48/60 Volunteers Check-in</span>
                            <span class="font-bold text-action-green">80%</span>
                          </div>
                        </div>
                        <div class="flex flex-col gap-1 rounded-lg bg-surface-container-lowest p-3 shadow-sm">
                          <div class="font-button-text text-sm font-semibold text-primary">Canvassing Action for All</div>
                          <div class="flex items-center gap-2 font-label-caps text-[11px] text-on-surface-variant">
                            <span class="material-symbols-outlined text-[14px] text-outline">calendar_month</span>
                            Tomorrow 10:00 AM
                          </div>
                        </div>
                        <div class="flex flex-col gap-1 rounded-lg bg-surface-container-lowest p-3 shadow-sm">
                          <div class="font-button-text text-sm font-semibold text-primary">Supporter High-Turnout Briefing</div>
                          <div class="flex items-center gap-2 font-label-caps text-[11px] text-on-surface-variant">
                            <span class="material-symbols-outlined text-[14px] text-outline">videocam</span>
                            Webinar · 412 RSVP
                          </div>
                        </div>
                      </div>
                    </div>
                    <div class="mt-4 rounded-lg bg-deep-navy p-3 text-left text-pure-white">
                      <div class="font-label-caps text-[10px] font-bold uppercase tracking-wider text-action-green">AI Lookalike Matcher</div>
                      <div class="mt-1 font-headline-md text-sm font-semibold">34 High-Propensity Contacts</div>
                      <p class="mt-1 font-body-md text-[11px] text-on-primary-container">Identified 34 unregistered allies in Sector 4.</p>
                    </div>
                  </div>

                  <div class="relative min-h-[360px] overflow-hidden bg-surface-container lg:col-span-6">
                    <div class="landing-map h-full min-h-[420px] w-full" />
                    <div class="pointer-events-none absolute inset-0 bg-gradient-to-t from-deep-navy/30 via-transparent to-transparent" />
                    <div class="absolute left-4 right-4 top-4 z-10 flex flex-wrap items-center gap-2">
                      <div class="flex items-center gap-2 rounded-full bg-surface-container-lowest/95 px-3 py-1.5 text-xs font-medium text-primary shadow-md backdrop-blur-md">
                        <span class="material-symbols-outlined text-[16px] text-electric-pink">search</span>
                        <span>Camden &amp; Islington Turf</span>
                      </div>
                      <div class="flex items-center gap-1.5 rounded-full bg-surface-container-lowest/95 px-3 py-1.5 text-xs text-on-surface-variant shadow-md backdrop-blur-md">
                        <span class="material-symbols-outlined text-[16px] text-action-green">tune</span>
                        <span>Electoral Ward 2026</span>
                      </div>
                      <div class="ml-auto flex items-center gap-1.5 rounded-full bg-deep-navy px-3 py-1.5 text-xs font-semibold text-pure-white shadow-md">
                        <span class="h-2 w-2 animate-ping rounded-full bg-action-green" />
                        <span>14 Teams Active</span>
                      </div>
                    </div>
                    <div class="absolute left-1/2 top-1/3 flex -translate-x-1/2 animate-bounce items-center gap-1 rounded-full bg-electric-pink px-3 py-1.5 text-xs font-bold text-pure-white shadow-xl">
                      <span class="material-symbols-outlined text-[14px]">campaign</span>
                      <span>Target Zone #1 (94% Match)</span>
                    </div>
                    <div class="absolute bottom-16 left-12 flex items-center gap-1.5 rounded-full bg-deep-navy px-3 py-1 text-[11px] font-medium text-pure-white shadow-lg">
                      <span class="material-symbols-outlined text-[14px] text-action-green">check_circle</span>
                      <span>Dulwich St: 100% Completed</span>
                    </div>
                    <div class="absolute bottom-4 right-4 flex items-center gap-2 rounded-lg bg-surface-container-lowest/95 p-2.5 font-label-caps text-[10px] shadow-md backdrop-blur-md">
                      <span class="text-on-surface-variant">Priority:</span>
                      <div class="flex items-center gap-1">
                        <span class="h-2.5 w-3 rounded-sm bg-secondary-fixed" />
                        <span class="h-2.5 w-3 rounded-sm bg-secondary-fixed-dim" />
                        <span class="h-2.5 w-3 rounded-sm bg-electric-pink" />
                        <span class="h-2.5 w-3 rounded-sm bg-deep-navy" />
                      </div>
                      <span class="font-bold text-primary">High Density</span>
                    </div>
                  </div>

                  <div class="hidden flex-col justify-between bg-surface-container-lowest p-4 text-left lg:flex lg:col-span-3">
                    <div>
                      <div class="flex items-center justify-between border-b border-surface-container pb-3">
                        <span class="font-label-caps text-label-caps font-bold uppercase text-on-surface-variant">Turf Dispatch Feed</span>
                        <span class="material-symbols-outlined text-[18px] text-on-surface-variant">refresh</span>
                      </div>
                      <div class="space-y-3 py-3">
                        <div class="text-xs">
                          <div class="mb-1 flex justify-between font-semibold text-primary">
                            <span>Canvass Coverage</span>
                            <span>73.4%</span>
                          </div>
                          <div class="h-2 w-full rounded-full bg-surface-container">
                            <div class="h-full rounded-full bg-electric-pink" style="width: 73.4%" />
                          </div>
                        </div>
                        <div class="text-xs">
                          <div class="mb-1 flex justify-between font-semibold text-primary">
                            <span>Pledge Conversion</span>
                            <span class="font-bold text-action-green">28.9% (+4.2%)</span>
                          </div>
                          <div class="h-2 w-full rounded-full bg-surface-container">
                            <div class="h-full rounded-full bg-action-green" style="width: 62%" />
                          </div>
                        </div>
                        <div class="pt-2">
                          <span class="font-label-caps text-[10px] uppercase tracking-wider text-on-surface-variant">Priority Zones</span>
                          <div class="mt-2 space-y-1.5 font-body-md text-xs">
                            <div class="flex items-center justify-between rounded bg-surface-container-low p-2">
                              <span class="font-semibold text-primary">1. Hampstead North</span>
                              <span class="font-bold text-electric-pink">2,813 voters</span>
                            </div>
                            <div class="flex items-center justify-between rounded bg-surface-container-low p-2">
                              <span class="font-semibold text-primary">2. Belsize Central</span>
                              <span class="text-on-surface-variant">1,420 voters</span>
                            </div>
                            <div class="flex items-center justify-between rounded bg-surface-container-low p-2">
                              <span class="font-semibold text-primary">3. Highgate South</span>
                              <span class="text-on-surface-variant">940 voters</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                    <div class="flex items-center justify-between border-t border-surface-container pt-3">
                      <div class="flex items-center gap-2">
                        <span class="h-2 w-2 animate-ping rounded-full bg-action-green" />
                        <span class="font-label-caps text-[11px] text-primary">Real-time Webhook Live</span>
                      </div>
                      <span class="material-symbols-outlined text-[16px] text-on-surface-variant">dns</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="infrastructure" class="w-full scroll-mt-20 bg-surface-container-low py-20">
        <div class="mx-auto max-w-container-max px-margin-mobile lg:px-gutter">
          <div class="mb-14 max-w-3xl text-left">
            <div class="mb-3 inline-flex items-center gap-2 rounded-full bg-surface-container-highest px-3 py-1 font-label-caps text-label-caps uppercase text-primary">
              Architecture Breakdown
            </div>
            <h2 class="font-headline-lg text-headline-md font-bold tracking-tight text-primary lg:text-headline-lg">
              The Infrastructure Gap: Legacy Chaos vs. Sovereign Momentum
            </h2>
            <p class="mt-3 font-body-lg text-body-lg text-on-surface-variant">
              Most organizations run on 8 to 12 disconnected SaaS subscriptions. Data fractures, staff burn out, and volunteer enthusiasm dies in administrative lag.
            </p>
          </div>
          <div class="grid grid-cols-1 gap-8 lg:grid-cols-2">
            <div class="flex flex-col justify-between rounded-2xl bg-surface-container-lowest p-8 shadow-sm lg:p-10">
              <div>
                <div class="mb-6 flex items-center justify-between">
                  <span class="flex items-center gap-2 font-label-caps text-label-caps font-bold uppercase tracking-wider text-error">
                    <span class="material-symbols-outlined text-[18px]">cancel</span>
                    Legacy Tech Silos
                  </span>
                  <span class="rounded-full bg-error-container px-2.5 py-1 font-label-caps text-[11px] text-on-error-container">Fragile &amp; Unaudited</span>
                </div>
                <h3 class="mb-4 font-headline-md text-2xl font-bold text-primary">Scattered tools, broken syncs, and unverified data leaks</h3>
                <div class="mt-6 space-y-6">
                  <div v-for="item in legacyItems" :key="item.title" class="flex items-start gap-4">
                    <div class="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-error-container text-sm font-bold text-error">×</div>
                    <div>
                      <h4 class="font-button-text text-base font-semibold text-primary">{{ item.title }}</h4>
                      <p class="mt-1 font-body-md text-sm text-on-surface-variant">{{ item.body }}</p>
                    </div>
                  </div>
                </div>
              </div>
              <div class="mt-8 flex items-center justify-between border-t border-surface-container pt-6 font-label-caps text-xs text-on-surface-variant">
                <span>Result: Lost Momentum &amp; Inefficiency</span>
                <span class="font-semibold text-error">High Churn Rate</span>
              </div>
            </div>
            <div class="relative flex flex-col justify-between overflow-hidden rounded-2xl bg-deep-navy p-8 text-pure-white shadow-xl lg:p-10">
              <div class="absolute -bottom-10 -right-10 h-48 w-48 rounded-full bg-electric-pink/20 blur-2xl" />
              <div class="relative z-10">
                <div class="mb-6 flex items-center justify-between">
                  <span class="flex items-center gap-2 font-label-caps text-label-caps font-bold uppercase tracking-wider text-action-green">
                    <span class="material-symbols-outlined text-[18px]">verified</span>
                    e-mobilize Infrastructure
                  </span>
                  <span class="rounded-full bg-tertiary-container px-2.5 py-1 font-label-caps text-[11px] font-bold text-action-green">SOC 2 Type II Sovereign</span>
                </div>
                <h3 class="mb-4 font-headline-md text-2xl font-bold text-pure-white">Unified relational core, offline-first mobile, zero data leakage</h3>
                <div class="mt-6 space-y-6">
                  <div v-for="item in modernItems" :key="item.title" class="flex items-start gap-4">
                    <div class="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-action-green/20 text-action-green">
                      <span class="material-symbols-outlined text-[18px]">{{ item.icon }}</span>
                    </div>
                    <div>
                      <h4 class="font-button-text text-base font-semibold text-pure-white">{{ item.title }}</h4>
                      <p class="mt-1 font-body-md text-sm text-on-navy">{{ item.body }}</p>
                    </div>
                  </div>
                </div>
              </div>
              <div class="relative z-10 mt-8 flex items-center justify-between border-t border-outline/30 pt-6 font-label-caps text-xs text-on-primary-container">
                <span>Result: Instant Community Activation</span>
                <span class="font-semibold text-action-green">10x Speed to Field</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="solutions" class="w-full scroll-mt-20 bg-background py-20">
        <div class="mx-auto max-w-container-max px-margin-mobile lg:px-gutter">
          <div class="mb-14 flex flex-col justify-between gap-4 md:flex-row md:items-end">
            <div>
              <div class="mb-3 inline-flex items-center gap-2 rounded-full bg-electric-pink/10 px-3 py-1 font-label-caps text-label-caps uppercase text-electric-pink">
                Core Architecture
              </div>
              <h2 class="font-headline-lg text-headline-md font-bold tracking-tight text-primary lg:text-headline-lg">
                Built for Scale, Sovereign Security, &amp; Ground Velocity
              </h2>
            </div>
            <p class="max-w-md font-body-md text-on-surface-variant">
              Engineered to support distributed national parties, fast-response disaster coalitions, and global advocacy movements.
            </p>
          </div>
          <div class="grid grid-cols-1 gap-8 md:grid-cols-2">
            <div class="flex flex-col justify-between rounded-2xl bg-surface-container-lowest p-8 shadow-sm">
              <div>
                <div class="mb-6 flex items-center justify-between">
                  <span class="flex h-12 w-12 items-center justify-center rounded-xl bg-surface-container-low text-primary">
                    <span class="material-symbols-outlined text-[26px] text-electric-pink">groups</span>
                  </span>
                  <span class="rounded-full bg-surface-container px-3 py-1 font-label-caps text-label-caps font-semibold uppercase text-on-surface-variant">CRM &amp; Identity</span>
                </div>
                <h3 class="mb-3 font-headline-md text-2xl font-bold text-primary">Unified Action &amp; Supporter CRM</h3>
                <p class="mb-6 font-body-md text-on-surface-variant">
                  Centralize every donor, voter, volunteer, and member in a single relational core. Eliminate duplications with AI-assisted fuzzy matching and maintain complete longitudinal activity histories.
                </p>
                <div class="mb-4 space-y-2 rounded-xl bg-surface-container-low p-4">
                  <div v-for="row in crmRows" :key="row.name" class="flex items-center justify-between rounded-lg bg-surface-container-lowest px-3 py-2 text-sm">
                    <span class="font-semibold text-primary">{{ row.name }}</span>
                    <span class="font-label-caps text-[11px] text-on-surface-variant">{{ row.role }}</span>
                  </div>
                </div>
              </div>
              <div class="flex flex-wrap items-center gap-2 pt-4">
                <span class="rounded bg-surface-container px-2.5 py-1 font-label-caps text-[11px] text-primary">Bi-directional Sync</span>
                <span class="rounded bg-surface-container px-2.5 py-1 font-label-caps text-[11px] text-primary">Deduplication AI</span>
                <span class="rounded bg-surface-container px-2.5 py-1 font-label-caps text-[11px] text-primary">Multi-channel Journeys</span>
              </div>
            </div>

            <div class="flex flex-col justify-between rounded-2xl bg-surface-container-lowest p-8 shadow-sm">
              <div>
                <div class="mb-6 flex items-center justify-between">
                  <span class="flex h-12 w-12 items-center justify-center rounded-xl bg-surface-container-low">
                    <span class="material-symbols-outlined text-[26px] text-action-green">map</span>
                  </span>
                  <span class="rounded-full bg-surface-container px-3 py-1 font-label-caps text-label-caps font-semibold uppercase text-on-surface-variant">Mobile Field</span>
                </div>
                <h3 class="mb-3 font-headline-md text-2xl font-bold text-primary">Decentralized Field Operations &amp; Routing</h3>
                <p class="mb-6 font-body-md text-on-surface-variant">
                  Instant turf cutting, turn-by-turn canvassing routes, and offline-first mobile sync designed for zero-connectivity rural zones and high-density urban areas alike.
                </p>
                <div class="mb-4 space-y-4 rounded-xl bg-deep-navy p-5 text-pure-white shadow-inner">
                  <div class="flex items-center justify-between">
                    <div class="flex items-center gap-2">
                      <span class="material-symbols-outlined text-[20px] text-action-green">explore</span>
                      <span class="font-headline-md text-sm font-semibold">Turf Dispatch #819 - Ward 4</span>
                    </div>
                    <span class="font-label-caps text-[11px] text-action-green">GPS CALIBRATED</span>
                  </div>
                  <div class="relative flex h-28 w-full items-center justify-center rounded-lg bg-surface-container-low/10 p-2">
                    <svg class="h-full w-full text-action-green" fill="none" stroke="currentColor" viewBox="0 0 320 80">
                      <path d="M10,60 C40,20 80,70 120,30 C160,-10 200,50 240,25 C280,0 300,40 310,35" stroke-dasharray="4 2" stroke-linecap="round" stroke-width="3" />
                      <circle cx="10" cy="60" fill="#FF387F" r="5" />
                      <circle cx="120" cy="30" fill="#92D80A" r="5" />
                      <circle cx="240" cy="25" fill="#92D80A" r="5" />
                      <circle cx="310" cy="35" fill="#FF387F" r="6" />
                    </svg>
                  </div>
                  <div class="grid grid-cols-3 gap-2 pt-1 text-center font-label-caps text-[11px]">
                    <div class="rounded bg-surface-tint/20 py-1.5">148 Doors Done</div>
                    <div class="rounded bg-surface-tint/20 py-1.5 text-action-green">89.4% Hit Rate</div>
                    <div class="rounded bg-surface-tint/20 py-1.5">0ms Offline Lag</div>
                  </div>
                </div>
              </div>
              <div class="flex flex-wrap items-center gap-2 pt-4">
                <span class="rounded bg-surface-container px-2.5 py-1 font-label-caps text-[11px] text-primary">Offline-First Storage</span>
                <span class="rounded bg-surface-container px-2.5 py-1 font-label-caps text-[11px] text-primary">Dynamic Turf Cutting</span>
                <span class="rounded bg-surface-container px-2.5 py-1 font-label-caps text-[11px] text-primary">iOS &amp; Android Native</span>
              </div>
            </div>

            <div class="flex flex-col justify-between rounded-2xl bg-surface-container-lowest p-8 shadow-sm">
              <div>
                <div class="mb-6 flex items-center justify-between">
                  <span class="flex h-12 w-12 items-center justify-center rounded-xl bg-surface-container-low">
                    <span class="material-symbols-outlined text-[26px] text-deep-navy">lock</span>
                  </span>
                  <span class="rounded-full bg-surface-container px-3 py-1 font-label-caps text-label-caps font-semibold uppercase text-on-surface-variant">Governance</span>
                </div>
                <h3 class="mb-3 font-headline-md text-2xl font-bold text-primary">Enterprise Security &amp; Sovereign Data</h3>
                <p class="mb-6 font-body-md text-on-surface-variant">
                  Your supporter data is your movement's most vital strategic asset. We guarantee absolute organizational ownership with no cross-tenant exposure and full SOC 2 Type II assurance.
                </p>
                <div class="mb-4 space-y-3 rounded-xl bg-surface-container-low p-4">
                  <div class="flex items-center justify-between text-xs">
                    <span class="flex items-center gap-1.5 font-semibold text-primary">
                      <span class="material-symbols-outlined text-[18px] text-action-green">verified_user</span>
                      SOC 2 Type II Certified
                    </span>
                    <span class="font-label-caps text-[11px] font-bold text-action-green">ANNUAL AUDIT PASSED</span>
                  </div>
                  <div class="flex items-center justify-between text-xs">
                    <span class="flex items-center gap-1.5 font-semibold text-primary">
                      <span class="material-symbols-outlined text-[18px] text-action-green">key</span>
                      AES-256 &amp; TLS 1.3 End-to-End
                    </span>
                    <span class="font-label-caps text-[11px] text-on-surface-variant">Hardware Enclaves</span>
                  </div>
                  <div class="flex items-center justify-between text-xs">
                    <span class="flex items-center gap-1.5 font-semibold text-primary">
                      <span class="material-symbols-outlined text-[18px] text-action-green">public</span>
                      GDPR, CCPA &amp; Electoral Code Compliance
                    </span>
                    <span class="font-label-caps text-[11px] text-on-surface-variant">EU/US Storage Options</span>
                  </div>
                </div>
              </div>
              <div class="flex flex-wrap items-center gap-2 pt-4">
                <span class="rounded bg-surface-container px-2.5 py-1 font-label-caps text-[11px] text-primary">Granular RBAC</span>
                <span class="rounded bg-surface-container px-2.5 py-1 font-label-caps text-[11px] text-primary">Immutable Audit Logs</span>
                <span class="rounded bg-surface-container px-2.5 py-1 font-label-caps text-[11px] text-primary">Zero Vendor Lock-in</span>
              </div>
            </div>

            <div class="flex flex-col justify-between rounded-2xl bg-surface-container-lowest p-8 shadow-sm">
              <div>
                <div class="mb-6 flex items-center justify-between">
                  <span class="flex h-12 w-12 items-center justify-center rounded-xl bg-surface-container-low">
                    <span class="material-symbols-outlined text-[26px] text-electric-pink">terminal</span>
                  </span>
                  <span class="rounded-full bg-surface-container px-3 py-1 font-label-caps text-label-caps font-semibold uppercase text-on-surface-variant">Integrations</span>
                </div>
                <h3 class="mb-3 font-headline-md text-2xl font-bold text-primary">Public API, Webhooks &amp; MCP Integration</h3>
                <p class="mb-6 font-body-md text-on-surface-variant">
                  Connect over 9,000+ external tools through our documented REST APIs, live webhooks, or plug straight into autonomous AI assistants using Model Context Protocol (MCP) agents.
                </p>
                <div class="mb-4 space-y-2 rounded-xl bg-deep-navy p-4 font-label-caps text-xs text-pure-white">
                  <div class="flex items-center justify-between border-b border-surface-tint/20 pb-1 text-on-primary-container">
                    <span>POST /v1/mcp/action-trigger</span>
                    <span class="text-action-green">200 OK · 18ms</span>
                  </div>
                  <div class="text-left text-on-navy">
                    <span class="text-electric-pink">{"agent":</span> "mobilizer-alpha",<br>
                    <span class="text-electric-pink">"intent":</span> "dispatch_neighborhood_wave",<br>
                    <span class="text-electric-pink">"ward_id":</span> "UK-CAM-2026",<br>
                    <span class="text-electric-pink">"volunteers_allocated":</span> 84}
                  </div>
                </div>
              </div>
              <div class="flex flex-wrap items-center gap-2 pt-4">
                <span class="rounded bg-surface-container px-2.5 py-1 font-label-caps text-[11px] text-primary">9,000+ Apps Ready</span>
                <span class="rounded bg-surface-container px-2.5 py-1 font-label-caps text-[11px] text-primary">Model Context Protocol</span>
                <span class="rounded bg-surface-container px-2.5 py-1 font-label-caps text-[11px] text-primary">Real-time Webhooks</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="impact" class="relative w-full scroll-mt-20 overflow-hidden bg-deep-navy py-20 text-pure-white">
        <div class="absolute inset-0 bg-[radial-gradient(#92D80A_1px,transparent_1px)] opacity-10 [background-size:24px_24px]" />
        <div class="relative z-10 mx-auto max-w-container-max px-margin-mobile lg:px-gutter">
          <div class="mx-auto mb-16 max-w-3xl text-center">
            <div class="mb-3 inline-flex items-center gap-2 rounded-full bg-surface-tint/30 px-3 py-1 font-label-caps text-label-caps uppercase text-action-green">
              Scale &amp; Proven Throughput
            </div>
            <h2 class="font-headline-lg text-headline-md font-bold tracking-tight text-pure-white lg:text-headline-lg">
              Battle-Tested Across the World's Highest Stakes Campaigns
            </h2>
            <p class="mt-3 font-body-md text-on-navy">
              When election day arrives or rapid community mobilization is called, milliseconds and reliability matter.
            </p>
          </div>
          <div class="grid grid-cols-1 gap-6 text-center md:grid-cols-4">
            <div class="rounded-xl bg-surface-container-low/5 p-6 backdrop-blur-md">
              <div class="font-display-lg text-4xl font-extrabold tracking-tight text-action-green lg:text-5xl">100,583</div>
              <div class="mt-2 font-button-text text-sm font-semibold text-pure-white">Active Mobilizations</div>
              <p class="mt-1 font-body-md text-xs text-on-primary-container">Simultaneously running globally</p>
            </div>
            <div class="rounded-xl bg-surface-container-low/5 p-6 backdrop-blur-md">
              <div class="font-display-lg text-4xl font-extrabold tracking-tight text-pure-white lg:text-5xl">180,000+</div>
              <div class="mt-2 font-button-text text-sm font-semibold text-pure-white">Field Volunteers Deployed</div>
              <p class="mt-1 font-body-md text-xs text-on-primary-container">Coordinated through native apps</p>
            </div>
            <div class="rounded-xl bg-surface-container-low/5 p-6 backdrop-blur-md">
              <div class="font-display-lg text-4xl font-extrabold tracking-tight text-pure-white lg:text-5xl">97M+</div>
              <div class="mt-2 font-button-text text-sm font-semibold text-pure-white">Outreach Calls Completed</div>
              <p class="mt-1 font-body-md text-xs text-on-primary-container">High conversion phone banking</p>
            </div>
            <div class="rounded-xl bg-surface-container-low/5 p-6 backdrop-blur-md">
              <div class="font-display-lg text-4xl font-extrabold tracking-tight text-electric-pink lg:text-5xl">&lt;150ms</div>
              <div class="mt-2 font-button-text text-sm font-semibold text-pure-white">Avg Field Sync Latency</div>
              <p class="mt-1 font-body-md text-xs text-on-primary-container">Edge replication globally</p>
            </div>
          </div>
        </div>
      </section>

      <section class="w-full bg-background py-20">
        <div class="mx-auto max-w-container-max px-margin-mobile lg:px-gutter">
          <div class="mx-auto mb-14 max-w-2xl text-center">
            <div class="mb-3 inline-flex items-center gap-2 rounded-full bg-surface-container-high px-3 py-1 font-label-caps text-label-caps uppercase text-primary">
              Voice from the Ground
            </div>
            <h2 class="font-headline-lg text-headline-md font-bold tracking-tight text-primary lg:text-headline-lg">
              Trusted by the Organizers Who Cannot Afford Downtime
            </h2>
          </div>
          <div class="grid grid-cols-1 gap-6 md:grid-cols-3">
            <div v-for="quote in testimonials" :key="quote.name" class="flex flex-col justify-between rounded-2xl bg-surface-container-lowest p-8 shadow-sm">
              <div>
                <div class="mb-4 flex items-center gap-1 text-electric-pink">
                  <span v-for="n in 5" :key="n" class="material-symbols-outlined text-[20px]" style="font-variation-settings: 'FILL' 1">star</span>
                </div>
                <p class="mb-6 font-body-lg text-base italic leading-relaxed text-primary">“{{ quote.quote }}”</p>
              </div>
              <div class="flex items-center gap-3 border-t border-surface-container pt-4">
                <div class="flex h-10 w-10 items-center justify-center rounded-full text-sm font-bold text-pure-white" :class="quote.avatar">
                  {{ quote.initials }}
                </div>
                <div>
                  <div class="font-button-text text-sm font-semibold text-primary">{{ quote.name }}</div>
                  <div class="font-label-caps text-[11px] text-on-surface-variant">{{ quote.role }}</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="resources" class="w-full bg-surface-container-low py-16">
        <div class="mx-auto max-w-container-max px-margin-mobile text-center lg:px-gutter">
          <span class="font-label-caps text-label-caps font-semibold uppercase tracking-wider text-on-surface-variant">
            Seamless Interoperability with 9,000+ Platforms &amp; Frameworks
          </span>
          <div class="mt-8 flex flex-wrap items-center justify-center gap-4 sm:gap-8">
            <div v-for="tool in tools" :key="tool.label" class="flex items-center gap-2 rounded-xl bg-surface-container-lowest px-4 py-2.5 font-button-text text-sm font-semibold text-primary shadow-sm">
              <span class="material-symbols-outlined text-[20px]" :class="tool.color">{{ tool.icon }}</span>
              {{ tool.label }}
            </div>
          </div>
        </div>
      </section>

      <section id="demo" class="w-full scroll-mt-20 bg-background py-20">
        <div class="mx-auto max-w-container-max px-margin-mobile lg:px-gutter">
          <div class="relative w-full overflow-hidden rounded-3xl bg-deep-navy p-8 text-pure-white shadow-2xl sm:p-14 lg:p-20">
            <div class="pointer-events-none absolute -right-24 -top-24 h-96 w-96 rounded-full bg-electric-pink/30 blur-3xl" />
            <div class="pointer-events-none absolute -bottom-20 -left-20 h-80 w-80 rounded-full bg-action-green/20 blur-3xl" />
            <div class="relative z-10 max-w-2xl text-left">
              <div class="mb-4 inline-flex items-center gap-2 rounded-full bg-surface-tint/30 px-3 py-1 font-label-caps text-label-caps uppercase text-action-green">
                Security Review &amp; Architecture Onboarding
              </div>
              <h2 class="mb-4 font-headline-lg text-headline-md font-extrabold leading-tight tracking-tight text-pure-white lg:text-headline-lg">
                Ready to modernize your movement's digital infrastructure?
              </h2>
              <p class="mb-8 font-body-lg text-body-lg text-on-navy">
                Speak directly with our system architects. We'll review your current data schema, audit migration paths from legacy tools, and show you live territorial dispatch in action.
              </p>
              <form class="flex max-w-lg flex-col items-stretch gap-3 sm:flex-row" @submit.prevent="submitDemo">
                <input
                  v-model="demoEmail"
                  class="w-full rounded-full bg-surface-container-lowest px-5 py-3.5 font-body-md text-sm text-on-surface placeholder:text-outline focus:outline-none focus:ring-2 focus:ring-electric-pink"
                  placeholder="Enter your organization email..."
                  required
                  type="email"
                >
                <button
                  class="inline-flex flex-shrink-0 items-center justify-center gap-2 rounded-full bg-electric-pink px-8 py-3.5 font-button-text text-button-text text-on-primary shadow-[0_4px_16px_rgba(255,56,127,0.4)] transition-all hover:bg-secondary"
                  type="submit"
                >
                  <span>Schedule Briefing</span>
                  <span class="material-symbols-outlined text-[18px]">arrow_forward</span>
                </button>
              </form>
              <p v-if="demoSent" class="mt-4 font-body-md text-sm text-action-green">
                Thank you. A dedicated technical director will contact you within 2 business hours.
              </p>
              <div class="mt-6 flex flex-wrap items-center gap-6 font-label-caps text-[11px] text-on-primary-container">
                <span class="flex items-center gap-1"><span class="material-symbols-outlined text-[14px] text-action-green">check_circle</span> Strict Non-Disclosure Protected</span>
                <span class="flex items-center gap-1"><span class="material-symbols-outlined text-[14px] text-action-green">check_circle</span> White-Glove Data Migration</span>
                <span class="flex items-center gap-1"><span class="material-symbols-outlined text-[14px] text-action-green">check_circle</span> 24/7 Field Escalation Support</span>
              </div>
            </div>
          </div>
        </div>
      </section>
    </main>

    <footer class="w-full bg-deep-navy text-on-navy">
      <div class="mx-auto max-w-container-max px-margin-mobile pb-margin-desktop pt-margin-desktop lg:px-gutter">
        <div class="grid grid-cols-1 gap-gutter pb-margin-desktop md:grid-cols-2 lg:grid-cols-5">
          <div class="flex flex-col gap-base pr-gutter lg:col-span-2">
            <BrandMark size="lg" name-class="text-pure-white" />
            <p class="mt-base max-w-sm font-body-md text-body-md text-on-primary-container">
              High-performance digital mobilizing infrastructure for civic action, national non-profits, and grassroots campaigns worldwide.
            </p>
            <div class="mt-base flex items-center gap-base">
              <span class="h-2.5 w-2.5 animate-pulse rounded-full bg-action-green" />
              <span class="font-label-caps text-label-caps uppercase text-action-green">All Systems Operational · 99.99% Uptime</span>
            </div>
          </div>
          <div class="flex flex-col gap-base">
            <span class="font-label-caps text-label-caps uppercase tracking-wider text-pure-white">Platform Ecosystem</span>
            <nav class="flex flex-col gap-base">
              <a href="#solutions" class="font-body-md text-body-md text-on-primary-container transition-colors hover:text-pure-white">Canvassing Core</a>
              <a href="#solutions" class="font-body-md text-body-md text-on-primary-container transition-colors hover:text-pure-white">Voter &amp; Donor CRM</a>
              <a href="#infrastructure" class="font-body-md text-body-md text-on-primary-container transition-colors hover:text-pure-white">Automated Outreach</a>
              <a href="#impact" class="font-body-md text-body-md text-on-primary-container transition-colors hover:text-pure-white">Field Intelligence</a>
              <NuxtLink to="/live-monitoring" class="font-body-md text-body-md text-electric-pink transition-colors hover:text-pure-white">Live Monitoring</NuxtLink>
            </nav>
          </div>
          <div class="flex flex-col gap-base">
            <span class="font-label-caps text-label-caps uppercase tracking-wider text-pure-white">Trust &amp; Governance</span>
            <nav class="flex flex-col gap-base">
              <a href="#infrastructure" class="font-body-md text-body-md text-on-primary-container transition-colors hover:text-pure-white">SOC-2 Type II Certified</a>
              <a href="#infrastructure" class="font-body-md text-body-md text-on-primary-container transition-colors hover:text-pure-white">GDPR &amp; CCPA Compliance</a>
              <NuxtLink to="/independent-audit" class="font-body-md text-body-md text-on-primary-container transition-colors hover:text-pure-white">Independent Audit</NuxtLink>
              <NuxtLink to="/verify" class="font-body-md text-body-md text-on-primary-container transition-colors hover:text-pure-white">Verify Evidence</NuxtLink>
            </nav>
          </div>
          <div class="flex flex-col gap-base">
            <span class="font-label-caps text-label-caps uppercase tracking-wider text-pure-white">Company</span>
            <nav class="flex flex-col gap-base">
              <a href="#impact" class="font-body-md text-body-md text-on-primary-container transition-colors hover:text-pure-white">Civic Impact</a>
              <a href="#demo" class="font-body-md text-body-md text-on-primary-container transition-colors hover:text-pure-white">Pricing Tiers</a>
              <NuxtLink to="/agent/login" class="font-body-md text-body-md text-on-primary-container transition-colors hover:text-pure-white">Agent Sign-in</NuxtLink>
              <a href="#demo" class="font-body-md text-body-md text-on-primary-container transition-colors hover:text-pure-white">Schedule Briefing</a>
            </nav>
          </div>
        </div>
        <div class="flex flex-col items-center justify-between gap-base pt-gutter font-label-caps text-label-caps text-on-primary-container md:flex-row">
          <div class="flex items-center gap-gutter">
            <span class="inline-flex items-center gap-1.5 rounded-full bg-primary-container px-2.5 py-1 text-pure-white">
              <span class="material-symbols-outlined text-[14px] text-action-green">verified_user</span>
              SOC-2 Type II
            </span>
            <span class="inline-flex items-center gap-1.5 rounded-full bg-primary-container px-2.5 py-1 text-pure-white">
              <span class="material-symbols-outlined text-[14px] text-action-green">lock</span>
              GDPR Compliant
            </span>
          </div>
          <div class="flex flex-wrap items-center gap-gutter">
            <NuxtLink to="/verify" class="transition-colors hover:text-pure-white">Privacy Policy</NuxtLink>
            <a href="#infrastructure" class="transition-colors hover:text-pure-white">Terms of Service</a>
            <a href="#infrastructure" class="transition-colors hover:text-pure-white">Security Whitepaper</a>
            <span>© 2026 e-mobilize Technologies Inc.</span>
          </div>
        </div>
      </div>
    </footer>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ layout: "blank" });

useHead({
  title: "e-mobilize — Modern Infrastructure for Movements",
  meta: [
    {
      name: "description",
      content: "Secure, unified real-time infrastructure for nonprofit and political teams. CRM, field ops, and live monitoring.",
    },
  ],
});

const menuOpen = ref(false);
const demoEmail = ref("");
const demoSent = ref(false);

const navLinks: { label: string; short?: string; href?: string; to?: string; live?: boolean }[] = [
  { label: "Solutions", href: "#solutions" },
  { label: "Platform", href: "#platform" },
  { label: "Live Monitoring", short: "Live", to: "/live-monitoring", live: true },
  { label: "Infrastructure & Security", short: "Security", href: "#infrastructure" },
  { label: "Impact", href: "#impact" },
  { label: "Pricing", href: "#demo" },
  { label: "Resources", href: "#resources" },
];

const legacyItems = [
  {
    title: "Fragmented Voter Files & Volunteer Forms",
    body: "Data trapped across disconnected spreadsheets, Mailchimp exports, and outdated local databases without single truth verification.",
  },
  {
    title: "Fragile Exports & Constant Leak Risks",
    body: "Staff emailing unencrypted CSV lists to chapter heads. Non-compliant with GDPR, CCPA, and voter privacy statutes.",
  },
  {
    title: "Slow Manual Dispatch & Volunteer Drop-off",
    body: "Days spent cutting turf on desktop GIS systems. By the time lists are printed, 60% of enthusiastic volunteers have abandoned the shift.",
  },
];

const modernItems = [
  {
    icon: "sync_alt",
    title: "Bi-Directional Action CRM Core",
    body: "Every donor, volunteer, voter, and member unified into a live encrypted record. Instant duplicate resolution and automatic identity enrichment.",
  },
  {
    icon: "security",
    title: "Strict Data Sovereignty & RBAC Protocols",
    body: "Full regional isolation (EU / US enclaves), granular field-level permissioning, tamper-evident audit trails, and certified SOC-2 Type II posture.",
  },
  {
    icon: "bolt",
    title: "Real-Time Mobile Dispatch & Instant Turf",
    body: "Deploy 50 or 5,000 door knockers in 60 seconds with offline-first iOS/Android apps. Live updates sync back to HQ under 150ms.",
  },
];

const crmRows = [
  { name: "Amara Okonkwo", role: "Donor · Monthly" },
  { name: "James Whitfield", role: "Volunteer · Ward 4" },
  { name: "Sofia Mendes", role: "Member · Verified" },
];

const testimonials = [
  {
    quote: "Within 24 hours we were able to go from selecting e-mobilize, to uploading our voter list, to door knocking with 50+ volunteers using the built-in mobile app without a single hitch.",
    name: "Brandon R.",
    role: "Campaign Consultant · Key Races",
    initials: "BR",
    avatar: "bg-deep-navy",
  },
  {
    quote: "We chose this infrastructure because it allows us to run highly effective issue-based campaigns with precise targeting, stronger engagement, and sovereign voter privacy.",
    name: "Victoria C.",
    role: "Digital & Comms Director",
    initials: "VC",
    avatar: "bg-electric-pink",
  },
  {
    quote: "Volunteer coordination completely transformed. We assign actions, analyze turnout, and communicate with local chapters all in one unified cockpit.",
    name: "Nellie C.",
    role: "National Organizing Director",
    initials: "NC",
    avatar: "bg-action-green text-on-tertiary-fixed",
  },
];

const tools = [
  { label: "Salesforce", icon: "cloud", color: "text-blue-500" },
  { label: "Twilio Voice & SMS", icon: "sms", color: "text-red-500" },
  { label: "Stripe Payments", icon: "credit_card", color: "text-indigo-500" },
  { label: "Zapier", icon: "bolt", color: "text-orange-500" },
  { label: "NationBuilder Sync", icon: "dns", color: "text-action-green" },
  { label: "ActBlue", icon: "volunteer_activism", color: "text-blue-600" },
  { label: "Model Context Protocol (MCP)", icon: "smart_toy", color: "text-electric-pink" },
];

function submitDemo() {
  demoSent.value = true;
}
</script>

<style scoped>
.material-symbols-outlined {
  font-variation-settings: "FILL" 0, "wght" 400, "GRAD" 0, "opsz" 24;
  vertical-align: middle;
}

.landing-map {
  background-color: rgb(var(--ap-map-base));
  background-image:
    linear-gradient(rgb(var(--ap-deep-navy) / 0.08) 1px, transparent 1px),
    linear-gradient(90deg, rgb(var(--ap-deep-navy) / 0.08) 1px, transparent 1px),
    radial-gradient(circle at 32% 40%, rgb(var(--ap-electric-pink) / 0.28), transparent 28%),
    radial-gradient(circle at 62% 55%, rgb(var(--ap-action-green) / 0.22), transparent 24%),
    radial-gradient(circle at 48% 70%, rgb(var(--ap-deep-navy) / 0.18), transparent 30%);
  background-size: 28px 28px, 28px 28px, auto, auto, auto;
}
</style>
