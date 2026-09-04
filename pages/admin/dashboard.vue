<template>
  <div class="flex w-full flex-col">
    <div class="mx-auto flex w-full max-w-7xl flex-col gap-6 p-6 md:p-8">
    <header
      v-if="activeTab !== 'agents' && activeTab !== 'sms-analytics' && activeTab !== 'disbursements' && activeTab !== 'recordings' && activeTab !== 'chapters' && activeTab !== 'payment-gateways' && activeTab !== 'packages' && activeTab !== 'parties' && activeTab !== 'votes' && activeTab !== 'data' && activeTab !== 'airtime' && activeTab !== 'snaps' && activeTab !== 'inbox' && activeTab !== 'feeds'"
      class="flex flex-col gap-4 pb-2 lg:flex-row lg:items-center lg:justify-between"
    >
      <div class="min-w-0 flex-1 flex flex-col gap-1.5">
        <div class="flex flex-wrap items-center gap-2">
          <span class="font-label-caps text-label-caps uppercase tracking-wider text-outline">HQ Central Command</span>
          <span class="text-xs text-outline">/</span>
          <span class="font-label-caps text-label-caps font-bold uppercase tracking-wider text-secondary">{{ currentNavLabel }}</span>
        </div>
        <div class="flex flex-wrap items-center gap-3">
          <h1 class="font-headline-md text-2xl font-bold tracking-tight text-primary sm:text-headline-md">{{ pageTitle }}</h1>
          <div
            v-if="activeTab === 'overview'"
            class="inline-flex items-center gap-2 rounded-full bg-surface-container-low px-3 py-1 shadow-sm"
          >
            <span class="h-2 w-2 animate-ping rounded-full bg-action-green" />
            <span class="font-label-caps text-[11px] font-semibold text-on-surface">
              Live sync: {{ commandLive }} feeds · {{ Number(commandPeople || 0).toLocaleString() }} people
            </span>
          </div>
        </div>
      </div>
      <div
        v-if="activeTab === 'overview'"
        class="grid w-full grid-cols-1 gap-2 sm:grid-cols-3 lg:w-auto lg:max-w-none lg:shrink-0"
      >
        <button
          class="inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-surface-container-lowest px-4 font-button-text text-sm font-semibold text-primary shadow-sm transition hover:bg-surface-container-low"
          type="button"
          @click="exportAuditCsv"
        >
          <span class="material-symbols-outlined shrink-0 text-[18px] text-outline">file_download</span>
          <span class="truncate">Export audit</span>
        </button>
        <button
          class="inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-surface-container-lowest px-4 font-button-text text-sm font-semibold text-primary shadow-sm transition hover:bg-surface-container-low"
          type="button"
          @click="setTab('inbox')"
        >
          <span class="material-symbols-outlined shrink-0 text-[18px] text-electric-pink">campaign</span>
          <span class="truncate">Quick alert</span>
        </button>
        <button
          class="inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-electric-pink px-4 font-button-text text-sm font-semibold text-pure-white shadow-sm shadow-electric-pink/25 transition hover:opacity-95"
          type="button"
          @click="setTab('feeds')"
        >
          <span class="material-symbols-outlined shrink-0 text-[18px]">videocam</span>
          <span class="truncate">Live operations</span>
        </button>
      </div>
    </header>

    <p v-if="message" class="sr-only">{{ message }}</p>
    <p v-if="actionError" class="sr-only">{{ actionError }}</p>

    <section v-if="activeTab === 'overview'" class="flex flex-col gap-6">
      <section aria-label="Operational Indicators" class="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <div class="group relative flex flex-col justify-between overflow-hidden rounded-xl bg-surface-container-lowest p-5 shadow-sm">
          <div class="flex items-start justify-between">
            <div>
              <p class="font-label-caps text-label-caps font-semibold uppercase tracking-wider text-outline">Live feeds</p>
              <h2 class="mt-1 font-headline-md text-3xl font-extrabold tracking-tight text-primary">{{ formatStat(commandLive) }}</h2>
            </div>
            <div class="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/5 text-primary">
              <span class="material-symbols-outlined text-[20px]">videocam</span>
            </div>
          </div>
          <div class="mt-4 flex items-center justify-between">
            <div class="flex items-center gap-1.5 rounded-full bg-tertiary-fixed/40 px-2 py-0.5">
              <span class="material-symbols-outlined text-[16px] text-action-green">trending_up</span>
              <span class="font-label-caps text-label-caps font-bold text-on-tertiary-fixed">{{ liveShareLabel }}</span>
            </div>
            <div class="h-6 w-24">
              <svg class="h-full w-full fill-none stroke-action-green stroke-2" viewBox="0 0 100 24">
                <path d="M0,20 Q20,15 35,17 T65,8 T100,3" vector-effect="non-scaling-stroke" />
              </svg>
            </div>
          </div>
        </div>

        <div class="flex flex-col justify-between overflow-hidden rounded-xl bg-surface-container-lowest p-5 shadow-sm">
          <div class="flex items-start justify-between">
            <div>
              <p class="font-label-caps text-label-caps font-semibold uppercase tracking-wider text-outline">Field agents deployed</p>
              <h2 class="mt-1 font-headline-md text-3xl font-extrabold tracking-tight text-primary">{{ formatStat(commandAgents) }}</h2>
            </div>
            <div class="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/5 text-primary">
              <span class="material-symbols-outlined text-[20px]">groups</span>
            </div>
          </div>
          <div class="mt-4 flex items-center justify-between">
            <span class="font-label-caps text-label-caps text-on-surface-variant">{{ commandUnits }} registered units</span>
            <div class="flex items-center gap-1.5 rounded-full bg-action-green/20 px-2 py-0.5">
              <span class="h-1.5 w-1.5 rounded-full bg-action-green" />
              <span class="font-label-caps text-label-caps font-bold text-primary">{{ liveShareLabel }} live</span>
            </div>
          </div>
        </div>

        <div class="flex flex-col justify-between overflow-hidden rounded-xl bg-surface-container-lowest p-5 shadow-sm">
          <div class="flex items-start justify-between">
            <div>
              <p class="font-label-caps text-label-caps font-semibold uppercase tracking-wider text-outline">People on site</p>
              <h2 class="mt-1 font-headline-md text-3xl font-extrabold tracking-tight text-primary">{{ formatStat(commandPeople) }}</h2>
            </div>
            <div class="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/5 text-primary">
              <span class="material-symbols-outlined text-[20px]">pin_drop</span>
            </div>
          </div>
          <div class="mt-4 flex flex-col gap-1.5">
            <div class="flex items-center justify-between text-xs">
              <span class="font-label-caps text-label-caps text-outline">Across live polling units</span>
              <span class="font-label-caps text-label-caps font-bold text-electric-pink">{{ commandLive }} streams</span>
            </div>
            <div class="h-1.5 w-full overflow-hidden rounded-full bg-surface-container-high">
              <div class="h-full rounded-full bg-action-green" :style="{ width: `${liveSharePct}%` }" />
            </div>
          </div>
        </div>

        <div class="flex flex-col justify-between overflow-hidden rounded-xl bg-surface-container-lowest p-5 shadow-sm">
          <div class="flex items-start justify-between gap-3">
            <div class="min-w-0">
              <p class="font-label-caps text-label-caps font-semibold uppercase tracking-wider text-outline">Votes captured</p>
              <h2 class="mt-1 font-headline-md text-3xl font-extrabold tracking-tight text-primary">{{ formatStat(commandVotes) }}</h2>
            </div>
            <div class="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/5 text-primary">
              <span class="material-symbols-outlined text-[20px]">how_to_vote</span>
            </div>
          </div>
          <div class="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <span class="font-label-caps text-label-caps text-on-surface-variant">
              {{ commandUnitsReported }} unit(s) reported
            </span>
            <button
              type="button"
              class="inline-flex h-9 w-full shrink-0 items-center justify-center gap-1.5 rounded-lg bg-deep-navy px-3 font-button-text text-xs font-semibold text-pure-white transition hover:bg-primary sm:w-auto"
              @click="openVoteResults"
            >
              <span>Open breakdown</span>
              <span class="material-symbols-outlined text-[16px]">arrow_forward</span>
            </button>
          </div>
        </div>
      </section>

      <div class="grid grid-cols-1 gap-6 lg:grid-cols-12">
        <div class="flex flex-col gap-6 lg:col-span-8">
          <div class="flex flex-col overflow-hidden rounded-xl bg-surface-container-lowest shadow-sm">
            <div class="flex flex-col items-start justify-between gap-3 bg-surface-container-lowest p-5 sm:flex-row sm:items-center">
              <div>
                <div class="flex items-center gap-2">
                  <span class="h-2.5 w-2.5 rounded-full bg-action-green" />
                  <h3 class="font-button-text text-sm font-bold text-primary">Field turf & live deployment</h3>
                </div>
                <p class="mt-0.5 font-body-md text-xs text-outline">Polling units grouped by local government · live streams in view</p>
              </div>
              <div class="flex items-center gap-2">
                <span class="rounded-lg bg-surface-container-low px-2.5 py-1 font-label-caps text-label-caps font-bold text-primary">
                  Coverage: {{ liveSharePct }}%
                </span>
                <button
                  class="inline-flex h-9 items-center justify-center gap-1.5 rounded-lg bg-deep-navy px-3 font-button-text text-xs font-semibold text-pure-white transition hover:bg-primary"
                  type="button"
                  @click="setTab('feeds')"
                >
                  <span class="material-symbols-outlined text-[14px]">map</span>
                  <span>Open feeds</span>
                </button>
              </div>
            </div>

            <div class="relative h-80 w-full overflow-hidden bg-deep-navy">
              <GoogleMapPanel
                class="absolute inset-0"
                :center="overviewMapCenter"
                :zoom="10"
                :markers="overviewMapMarkers"
                :loading="overviewMapLoading"
              />
              <div class="pointer-events-none absolute left-4 top-4 z-10 flex flex-col gap-1 rounded-xl bg-deep-navy/90 px-3 py-2 text-pure-white shadow-lg backdrop-blur-md">
                <span class="font-label-caps text-label-caps text-action-green">Active clusters</span>
                <span class="text-sm font-bold">{{ topCluster?.lga || overviewMapData?.lga || "Ogun State" }}</span>
                <span class="text-xs text-on-navy">
                  <template v-if="overviewMapData">
                    {{ overviewMapData.live_count }} live · {{ overviewMapData.registered_count }} registered ·
                    {{ overviewMapData.total }} units
                  </template>
                  <template v-else-if="topCluster">
                    {{ topCluster.live }} live · {{ topCluster.people.toLocaleString() }} people
                  </template>
                  <template v-else>Waiting for field streams</template>
                </span>
              </div>
              <div class="pointer-events-none absolute bottom-4 left-4 right-4 z-10 flex flex-col gap-3 rounded-xl bg-deep-navy/85 p-3 text-pure-white backdrop-blur-md sm:flex-row sm:items-center sm:justify-between">
                <div class="flex flex-wrap items-center gap-x-4 gap-y-1.5 font-label-caps text-xs">
                  <span class="flex items-center gap-1.5"><span class="h-2 w-2 rounded-full bg-action-green" /> Live</span>
                  <span class="flex items-center gap-1.5"><span class="h-2 w-2 rounded-full bg-electric-pink" /> Registered</span>
                  <span class="flex items-center gap-1.5"><span class="h-2 w-2 rounded-full bg-outline" /> Catalog</span>
                </div>
                <div class="pointer-events-auto flex shrink-0 items-center gap-2">
                  <button
                    class="inline-flex h-8 items-center justify-center rounded-lg bg-pure-white/15 px-3 font-button-text text-xs font-semibold text-pure-white transition hover:bg-pure-white/25"
                    type="button"
                    @click="refreshOverviewMap({ reloadUnits: true })"
                  >
                    Refresh
                  </button>
                  <button
                    class="inline-flex h-8 items-center justify-center rounded-lg bg-electric-pink px-3 font-button-text text-xs font-semibold text-pure-white transition hover:opacity-95"
                    type="button"
                    @click="setTab('feeds')"
                  >
                    Expand
                  </button>
                </div>
              </div>
            </div>

            <div class="grid grid-cols-1 gap-3 bg-surface-container-lowest p-4 sm:grid-cols-3">
              <div v-for="row in topLgas.slice(0, 3)" :key="row.lga" class="rounded-xl bg-surface-container-low p-3">
                <p class="font-label-caps text-label-caps font-semibold text-outline">{{ row.lga }}</p>
                <div class="mt-1 flex items-baseline justify-between">
                  <span class="font-button-text text-sm font-bold text-primary">{{ row.live }} / {{ row.units }}</span>
                  <span class="font-label-caps text-label-caps font-bold" :class="row.pct >= 50 ? 'text-action-green' : 'text-secondary'">{{ row.pct }}%</span>
                </div>
              </div>
              <div v-if="!topLgas.length" class="rounded-xl bg-surface-container-low p-3 text-xs text-on-surface-variant">
                No polling units in this scope yet.
              </div>
            </div>
          </div>

          <div class="flex flex-col gap-4 rounded-xl bg-surface-container-lowest p-5 shadow-sm">
            <div class="flex flex-col items-start justify-between gap-2 sm:flex-row sm:items-center">
              <div>
                <h3 class="font-button-text text-sm font-bold text-primary">Live throughput by local government</h3>
                <p class="font-body-md text-xs text-outline">People counted on live streams vs registered units</p>
              </div>
              <div class="flex items-center gap-3">
                <span class="flex items-center gap-1.5 font-label-caps text-label-caps text-primary">
                  <span class="h-2.5 w-2.5 rounded-full bg-deep-navy" /> Units
                </span>
                <span class="flex items-center gap-1.5 font-label-caps text-label-caps text-electric-pink">
                  <span class="h-2.5 w-2.5 rounded-full bg-electric-pink" /> Live
                </span>
              </div>
            </div>
            <div class="flex h-44 w-full items-end gap-2 pt-6">
              <div
                v-for="bar in velocityBars"
                :key="bar.lga"
                class="flex h-full flex-1 flex-col items-center justify-end gap-1.5"
              >
                <div
                  class="w-full rounded-t-md transition-all hover:opacity-90"
                  :class="bar.live ? 'bg-electric-pink' : 'bg-deep-navy'"
                  :style="{ height: `${bar.height}%` }"
                />
                <span class="max-w-full truncate font-label-caps text-[10px] text-outline">{{ bar.short }}</span>
              </div>
              <p v-if="!velocityBars.length" class="w-full self-center text-center text-xs text-on-surface-variant">No LGA activity yet.</p>
            </div>
            <div class="flex items-center justify-between border-t border-surface-container-low pt-3 text-xs">
              <span class="font-body-md font-medium text-on-surface-variant">{{ commandPeople.toLocaleString() }} people counted across live units</span>
              <span class="flex items-center gap-1 font-label-caps text-label-caps font-bold text-action-green">
                <span class="material-symbols-outlined text-[14px]">bolt</span> Real-time pipeline
              </span>
            </div>
          </div>
        </div>

        <div class="flex flex-col gap-6 lg:col-span-4">
          <div class="flex flex-col gap-4 rounded-xl bg-surface-container-lowest p-5 shadow-sm">
            <div class="flex items-center justify-between">
              <div class="flex items-center gap-2">
                <span class="h-2 w-2 animate-pulse rounded-full bg-electric-pink" />
                <h3 class="font-button-text text-sm font-bold text-primary">Critical action triggers</h3>
              </div>
              <span class="rounded-full bg-secondary-fixed px-2 py-0.5 font-label-caps text-label-caps font-bold text-secondary">{{ criticalAlerts.length }} open</span>
            </div>
            <div class="flex flex-col gap-3">
              <div
                v-for="alert in criticalAlerts"
                :key="alert.id"
                class="flex flex-col gap-2 rounded-xl bg-surface-container-low p-3.5 transition-colors hover:bg-surface-container"
              >
                <div class="flex items-center justify-between">
                  <span class="font-label-caps text-[11px] font-bold uppercase tracking-wider" :class="alert.tone">{{ alert.title }}</span>
                  <span class="font-label-caps text-[10px] text-outline">{{ alert.meta }}</span>
                </div>
                <p class="font-body-md text-xs leading-snug text-on-surface">{{ alert.body }}</p>
                <div v-if="alert.action" class="mt-1 flex gap-2">
                  <button
                    class="rounded-lg bg-deep-navy px-3 py-1 text-xs font-button-text text-pure-white transition-colors hover:bg-primary"
                    type="button"
                    @click="alert.action()"
                  >
                    {{ alert.actionLabel }}
                  </button>
                </div>
              </div>
              <p v-if="!criticalAlerts.length" class="rounded-xl bg-surface-container-low p-3.5 text-xs text-on-surface-variant">
                No pending accreditations or flagged units in this scope.
              </p>
            </div>
          </div>

          <div class="relative flex flex-col gap-4 overflow-hidden rounded-xl bg-deep-navy p-5 text-pure-white shadow-sm">
            <div class="absolute -right-10 -top-10 h-32 w-32 rounded-full bg-electric-pink/15 blur-2xl" />
            <div class="flex items-center justify-between">
              <div class="flex items-center gap-2">
                <span class="material-symbols-outlined text-[20px] text-action-green">smart_toy</span>
                <h3 class="font-button-text text-sm font-bold text-pure-white">e-mobilize copilot</h3>
              </div>
              <span class="font-label-caps text-label-caps uppercase tracking-widest text-action-green">Live</span>
            </div>
            <div class="flex flex-col gap-2 rounded-xl bg-surface-container-lowest/5 p-3.5 backdrop-blur-sm">
              <p class="font-body-md text-xs leading-relaxed text-on-navy">{{ copilotInsight }}</p>
              <div class="flex items-center justify-between pt-2">
                <button
                  class="rounded-lg bg-action-green px-3 py-1.5 text-xs font-bold font-button-text text-on-tertiary-fixed transition-colors hover:bg-tertiary-fixed"
                  type="button"
                  @click="setTab('feeds')"
                >
                  Review live units
                </button>
                <span class="font-label-caps text-[10px] text-on-primary-container">From live telemetry</span>
              </div>
            </div>
          </div>

          <div class="flex flex-col gap-3 rounded-xl bg-surface-container-lowest p-5 shadow-sm">
            <div class="flex items-center justify-between">
              <h3 class="font-button-text text-sm font-bold text-primary">Security & compliance</h3>
              <span class="material-symbols-outlined text-[20px] text-action-green">verified</span>
            </div>
            <div class="flex flex-col gap-2 text-xs">
              <div class="flex items-center justify-between border-b border-surface-container-low py-1.5">
                <span class="font-body-md text-on-surface-variant">SOC 2 Type II validation</span>
                <span class="font-label-caps text-label-caps font-bold text-action-green">Passed</span>
              </div>
              <div class="flex items-center justify-between border-b border-surface-container-low py-1.5">
                <span class="font-body-md text-on-surface-variant">Flagged polling units</span>
                <span class="font-label-caps text-label-caps font-bold text-primary">{{ flaggedUnits.length }}</span>
              </div>
              <div class="flex items-center justify-between border-b border-surface-container-low py-1.5">
                <span class="font-body-md text-on-surface-variant">Result sheets on file</span>
                <span class="font-label-caps text-label-caps font-bold text-action-green">{{ resultSheets.length }}</span>
              </div>
              <div class="flex items-center justify-between gap-3 py-1.5">
                <span class="font-body-md text-on-surface-variant">Independent audit</span>
                <button
                  class="inline-flex h-8 items-center justify-center rounded-lg bg-surface-container px-3 font-button-text text-xs font-semibold text-primary transition hover:bg-surface-container-high"
                  type="button"
                  @click="setTab('audit')"
                >
                  Open panel
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <section class="flex flex-col overflow-hidden rounded-xl bg-surface-container-lowest shadow-sm">
        <div class="flex flex-col items-start justify-between gap-3 bg-surface-container-lowest p-5 sm:flex-row sm:items-center">
          <div>
            <h3 class="font-headline-md text-xl font-bold tracking-tight text-primary">Active polling unit dispatches</h3>
            <p class="font-body-md text-xs text-outline">Live status of registered units, people on site, and stream state</p>
          </div>
          <button
            class="inline-flex h-9 items-center justify-center rounded-lg bg-deep-navy px-3.5 font-button-text text-xs font-semibold text-pure-white transition hover:bg-primary"
            type="button"
            @click="setTab('feeds')"
          >
            View all units
          </button>
        </div>
        <div class="w-full overflow-x-auto">
          <table class="w-full border-collapse text-left text-xs">
            <thead>
              <tr class="bg-surface-container-low font-label-caps text-[11px] uppercase tracking-wider text-outline">
                <th class="px-4 py-3 font-semibold">Code</th>
                <th class="px-4 py-3 font-semibold">Polling unit</th>
                <th class="px-4 py-3 font-semibold">LGA / Ward</th>
                <th class="px-4 py-3 font-semibold">People</th>
                <th class="px-4 py-3 font-semibold">Status</th>
                <th class="px-4 py-3 text-right font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-surface-container-low font-body-md text-on-surface">
              <tr v-for="unit in dispatchRows" :key="unit.id" class="transition-colors hover:bg-off-white/60">
                <td class="px-4 py-3.5 font-label-caps font-medium text-outline">{{ unit.code }}</td>
                <td class="px-4 py-3.5 font-button-text font-bold text-primary">{{ unit.name }}</td>
                <td class="px-4 py-3.5">{{ unit.lga }} · {{ unit.ward }}</td>
                <td class="px-4 py-3.5 font-label-caps font-semibold">{{ unit.people_count }}</td>
                <td class="px-4 py-3.5">
                  <span
                    class="inline-flex items-center gap-1 rounded-full px-2 py-0.5 font-label-caps text-[11px] font-bold"
                    :class="unit.stream_status === 'live' ? 'bg-action-green/20 text-on-tertiary-fixed' : 'bg-surface-container-high text-outline'"
                  >
                    <span class="h-1.5 w-1.5 rounded-full" :class="unit.stream_status === 'live' ? 'bg-action-green' : 'bg-outline'" />
                    {{ unit.stream_status === 'live' ? 'In field' : unit.stream_status }}
                  </span>
                </td>
                <td class="px-4 py-3.5 text-right">
                  <button
                    class="inline-flex h-8 items-center justify-center rounded-lg bg-surface-container px-3 font-button-text text-xs font-semibold text-primary transition hover:bg-surface-container-high"
                    type="button"
                    @click="setTab('feeds')"
                  >
                    Open
                  </button>
                </td>
              </tr>
              <tr v-if="!dispatchRows.length">
                <td colspan="6" class="px-4 py-8 text-center text-on-surface-variant">No polling units in this scope.</td>
              </tr>
            </tbody>
          </table>
        </div>
        <div class="flex items-center justify-between border-t border-surface-container-low bg-surface-container-lowest p-4">
          <span class="font-label-caps text-xs text-outline">Showing {{ dispatchRows.length }} of {{ scopedUnits.length }} units</span>
          <button
            class="inline-flex h-8 items-center justify-center rounded-lg bg-deep-navy px-3 font-button-text text-xs font-semibold text-pure-white transition hover:bg-primary"
            type="button"
            @click="setTab('feeds')"
          >
            View more
          </button>
        </div>
      </section>
    </section>

    <section v-else-if="activeTab === 'feeds'" class="flex flex-col gap-6">
      <AdminLiveOperationsPanel
        :units="scopedUnits"
        :loading="loadingUnits"
        :count-edits="countEdits"
        :state-scope="'Ogun State'"
        @refresh="loadUnits"
        @update:count="(code, value) => (countEdits[code] = value)"
        @save-count="saveCount"
        @force-offline="forceOffline"
        @delete="deleteUnit"
      />
    </section>

    <section v-else-if="activeTab === 'snaps'" class="flex flex-col gap-6">
      <AdminMediaAssetsPanel
        :state-scope="'Ogun State'"
        @error="(msg: string) => (actionError = msg)"
        @message="(msg: string) => (message = msg)"
      />
    </section>

    <section v-else-if="activeTab === 'recordings'" class="flex flex-col gap-6">
      <AdminFieldCanvassingPanel
        :state-scope="'Ogun State'"
        @error="(msg: string) => (actionError = msg)"
        @message="(msg: string) => (message = msg)"
      />
    </section>

    <section v-else-if="activeTab === 'agents'" class="flex flex-col gap-6">
      <AdminCrmDirectory
        :state-scope="'Ogun State'"
        @error="(msg: string) => (actionError = msg)"
        @message="(msg: string) => (message = msg)"
        @open-agent="openAgentModal"
      />

      <div v-if="admin?.role === 'super_admin' && pendingAccreditations.length" class="overflow-hidden rounded-xl bg-surface-container-lowest shadow-sm">
        <div class="border-b border-outline-variant/40 bg-secondary-fixed/20 p-5">
        <h3 class="text-sm font-semibold text-primary">
          Pending accreditation review ({{ pendingAccreditations.length }})
        </h3>
        <ul class="mt-3 space-y-3">
          <li
            v-for="row in pendingAccreditations"
            :key="row.agent_id"
            class="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-outline-variant/40 bg-surface-container-low p-3"
          >
            <div class="min-w-0">
              <p class="text-sm font-medium text-primary">{{ row.agent_name }}</p>
              <p class="text-xs text-outline">
                {{ row.agent_email }} · {{ row.ward }}, {{ row.lga }}
                <span v-if="row.party_name"> · {{ row.party_name }}</span>
                <span v-if="row.accreditation_number"> · #{{ row.accreditation_number }}</span>
                <span v-if="row.is_ec8a_signatory"> · EC8A signatory</span>
              </p>
            </div>
            <div class="flex items-center gap-2">
              <button
                type="button"
                class="rounded-lg border border-outline-variant/40 px-3 py-1.5 text-xs text-primary hover:bg-surface-container"
                @click="viewAccreditationDocument(row.agent_id)"
              >
                View document
              </button>
              <button
                type="button"
                class="rounded-lg bg-action-green px-3 py-1.5 text-xs text-primary hover:opacity-90"
                :disabled="accreditationActionBusy === row.agent_id"
                @click="approveAccreditation(row.agent_id)"
              >
                Approve
              </button>
              <button
                type="button"
                class="rounded-lg bg-error px-3 py-1.5 text-xs text-on-primary hover:opacity-90"
                :disabled="accreditationActionBusy === row.agent_id"
                @click="rejectAccreditation(row.agent_id)"
              >
                Reject
              </button>
            </div>
          </li>
        </ul>
        <p v-if="accreditationActionError" class="mt-3 text-sm text-error">{{ accreditationActionError }}</p>
        </div>
      </div>

      <div class="overflow-hidden rounded-xl bg-surface-container-lowest shadow-sm">
        <div class="flex flex-wrap items-center justify-between gap-3 border-b border-outline-variant/30 px-5 py-4">
          <div>
            <h2 class="font-semibold text-primary">Field agent accounts</h2>
            <p class="text-xs text-outline">
              {{ filteredAgents.length }} of {{ scopedAgents.length }} agent(s)
              <span v-if="stateScopeFilter !== 'all'"> · {{ stateScopeFilter }}</span>
            </p>
          </div>
          <input
            v-model="agentSearch"
            type="search"
            placeholder="Search name, email, state, LGA, ward…"
            class="w-full max-w-xs rounded-xl bg-off-white px-3 py-2 text-sm text-on-surface focus:outline-none"
          />
        </div>

        <div v-if="loadingAgents" class="p-8 text-center text-sm text-outline">Loading…</div>
        <div v-else-if="!filteredAgents.length" class="p-8 text-center text-sm text-outline">No agents match your search.</div>

        <div v-else class="grid gap-3 p-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          <button
            v-for="agent in filteredAgents"
            :key="agent.id"
            type="button"
            class="rounded-xl bg-surface-container-low p-4 text-left transition hover:bg-surface-container"
            @click="openAgentModal(agent.id)"
          >
            <p class="truncate font-medium text-primary">{{ agent.name }}</p>
            <p class="truncate text-xs text-outline">{{ agent.email }}</p>
            <p v-if="agent.state || agent.lga" class="mt-2 truncate text-xs text-action-green">
              <span v-if="agent.state" class="font-semibold">{{ agent.state }}</span>
              <span v-if="agent.state && agent.lga"> · </span>
              <span v-if="agent.lga">{{ agent.lga }}</span>
              <span v-if="agent.ward"> · {{ agent.ward }}</span>
            </p>
            <p v-else class="mt-2 text-xs text-secondary">Unassigned</p>
            <dl class="mt-3 grid grid-cols-3 gap-2 text-xs">
              <div class="rounded bg-surface-container-lowest px-2 py-1">
                <dt class="text-outline">Units</dt>
                <dd class="font-semibold text-primary">{{ agent.polling_unit_count }}</dd>
              </div>
              <div class="rounded bg-surface-container-lowest px-2 py-1">
                <dt class="text-outline">Live</dt>
                <dd class="font-semibold text-secondary">{{ agent.live_unit_count }}</dd>
              </div>
              <div class="rounded bg-surface-container-lowest px-2 py-1">
                <dt class="text-outline">Data</dt>
                <dd class="font-semibold text-primary">
                  {{ agent.data_claims_used ?? 0 }}/{{ agent.data_claim_limit ?? 1 }}
                </dd>
              </div>
            </dl>
            <p class="mt-3 text-[10px] text-secondary">Manage →</p>
          </button>
        </div>
      </div>
    </section>

    <section v-else-if="activeTab === 'sms-analytics'" class="flex flex-col gap-6">
      <AdminCrmSmsAnalyticsPanel
        @error="(msg: string) => (actionError = msg)"
        @message="(msg: string) => (message = msg)"
      />
    </section>

    <section v-else-if="activeTab === 'disbursements'">
      <AdminDisbursementsPanel @error="(msg: string) => (actionError = msg)" @message="(msg: string) => (message = msg)" />
    </section>

    <section v-else-if="activeTab === 'chapters'" class="flex flex-col gap-6">
      <AdminRegionalChaptersPanel
        @error="(msg: string) => (actionError = msg)"
        @message="(msg: string) => (message = msg)"
      />
    </section>

    <section v-else-if="activeTab === 'payment-gateways'" class="flex flex-col gap-6">
      <AdminPaymentGatewaysPanel
        @error="(msg: string) => (actionError = msg)"
        @message="(msg: string) => (message = msg)"
      />
    </section>

    <section v-else-if="activeTab === 'packages'">
      <AdminPackagesPanel @error="(msg: string) => (actionError = msg)" @message="(msg: string) => (message = msg)" />
    </section>

    <section v-else-if="activeTab === 'inbox'">
      <AdminInboxPanel @error="(msg: string) => (actionError = msg)" @message="(msg: string) => (message = msg)" />
    </section>

    <section v-else-if="activeTab === 'data'" class="flex flex-col gap-6">
      <AdminDataPlansPanel
        @error="(msg: string) => (actionError = msg)"
        @message="(msg: string) => (message = msg)"
      />
    </section>

    <section v-else-if="activeTab === 'airtime'" class="flex flex-col gap-6">
      <AdminAirtimePanel
        @error="(msg: string) => (actionError = msg)"
        @message="(msg: string) => (message = msg)"
      />
    </section>

    <section v-else-if="activeTab === 'audit'">
      <IndependentAuditPanel :api-base="apiBase" embedded />
    </section>

    <section v-else-if="activeTab === 'parties'">
      <AdminPartiesPanel
        @error="(msg: string) => (actionError = msg)"
        @message="(msg: string) => (message = msg)"
      />
    </section>

    <section v-else-if="activeTab === 'votes'" class="flex flex-col gap-6">
      <AdminVoteResultsPanel
        :state-scope="'Ogun State'"
        :show-state-scope="false"
        @error="(msg: string) => (actionError = msg)"
        @loaded="onVoteResultsLoaded"
      />

      <div class="overflow-hidden rounded-2xl bg-surface-container-lowest shadow-sm">
        <div class="flex flex-wrap items-start justify-between gap-3 border-b border-outline-variant/30 px-5 py-4">
          <div>
            <h2 class="font-headline-md text-lg font-bold text-primary">EC8A result sheets (photo evidence)</h2>
            <p class="mt-1 text-xs text-outline">
              Immutable, timestamped photos agents captured at each unit. Enter the official
              figure (from IReV or collation) as you confirm it — the difference is flagged
              automatically.
            </p>
          </div>
          <button
            type="button"
            class="rounded-xl bg-surface-container px-3 py-1.5 text-xs text-on-surface hover:bg-surface-container-high"
            :disabled="loadingResultSheets"
            @click="loadResultSheets"
          >
            {{ loadingResultSheets ? "Loading…" : "Refresh" }}
          </button>
        </div>

        <div v-if="!resultSheets.length" class="p-8 text-center text-sm text-outline">
          No result sheets submitted yet.
        </div>
        <ul v-else class="divide-y divide-outline-variant/20">
          <li
            v-for="row in resultSheets"
            :key="row.id"
            class="flex flex-wrap items-start justify-between gap-4 px-5 py-4"
          >
            <div class="min-w-0 flex-1">
              <p class="text-sm font-medium text-on-surface">
                {{ row.polling_unit_name }}
                <span
                  v-if="row.version > 1"
                  class="ml-1 rounded-full bg-electric-pink/15 px-2 py-0.5 text-[10px] font-semibold text-electric-pink"
                >
                  Correction #{{ row.version }}
                </span>
                <span
                  v-if="row.over_accreditation"
                  class="ml-1 rounded-full bg-error/15 px-2 py-0.5 text-[10px] font-semibold text-error"
                >
                  Over-voting?
                </span>
              </p>
              <p class="text-xs text-outline">{{ row.code }} · {{ row.state }} · {{ row.ward }}, {{ row.lga }}</p>
              <p class="mt-1 text-xs text-outline">
                Votes: <span class="font-semibold text-on-surface">{{ row.votes.toLocaleString() }}</span>
                <span v-if="row.accredited_voters !== null">
                  · Accredited: {{ row.accredited_voters?.toLocaleString() }}
                </span>
                <span v-if="row.people_count_at_capture">
                  · People on-site: {{ row.people_count_at_capture.toLocaleString() }}
                </span>
              </p>
              <p
                v-if="row.discrepancy_note"
                class="mt-1 text-xs"
                :class="row.official_diff ? 'text-error' : 'text-action-green'"
              >
                {{ row.discrepancy_note }}
              </p>
              <p class="mt-0.5 text-[10px] text-outline">
                Captured {{ formatWhen(row.received_at) }}
                <span v-if="row.captured_lat !== null"> · GPS logged</span>
                · Hash {{ row.sha256.slice(0, 10) }}…
                <span v-if="row.ipfs_cid"> · IPFS {{ row.ipfs_cid.slice(0, 8) }}…</span>
              </p>
            </div>
            <div class="flex flex-col items-end gap-2">
              <div class="flex gap-2">
                <button
                  type="button"
                  class="rounded-lg border border-ui-border/40 px-3 py-1.5 text-xs text-ui-text hover:bg-ui-elevated/40"
                  @click="viewAdminResultSheetPhoto(row)"
                >
                  View photo
                </button>
                <NuxtLink
                  :to="`/admin/result-sheets/${row.id}/certificate`"
                  target="_blank"
                  class="rounded-lg border border-ui-border/40 px-3 py-1.5 text-xs text-ui-text hover:bg-ui-elevated/40"
                >
                  Certificate
                </NuxtLink>
                <NuxtLink
                  :to="`/admin/polling-units/${row.code}/tribunal-report`"
                  target="_blank"
                  class="rounded-lg border border-ui-border/40 px-3 py-1.5 text-xs text-ui-text hover:bg-ui-elevated/40"
                >
                  Tribunal report
                </NuxtLink>
              </div>
              <form class="flex items-center gap-1.5" @submit.prevent="saveOfficialFigure(row)">
                <input
                  v-model.number="officialFigureDrafts[row.id]"
                  type="number"
                  min="0"
                  placeholder="Official #"
                  class="ui-input w-28 py-1 text-xs"
                />
                <button
                  type="submit"
                  class="rounded-lg bg-violet-600 px-2.5 py-1.5 text-xs text-white hover:bg-violet-500 disabled:opacity-50"
                  :disabled="
                    savingOfficialFigure === row.id ||
                    officialFigureDrafts[row.id] === undefined ||
                    officialFigureDrafts[row.id] === null
                  "
                >
                  {{ savingOfficialFigure === row.id ? "Saving…" : "Save" }}
                </button>
              </form>
            </div>
          </li>
        </ul>
        <p v-if="resultSheetsError" class="px-5 pb-4 text-sm text-red-500">{{ resultSheetsError }}</p>
      </div>

      <div v-if="admin?.role === 'super_admin'" class="ui-card overflow-hidden">
        <div class="border-b border-ui-border/40 px-5 py-4">
          <h2 class="font-semibold text-ui-text">IReV watchdog (super admin)</h2>
          <p class="mt-1 text-xs text-ui-muted">
            Points at INEC's IReV API for the current election. The host and election ID are only
            valid while IReV is live for that election — capture them from your browser's
            devtools network tab during that window. Left off, result sheets fall back to the
            manual official-figure entry above.
          </p>
        </div>
        <div class="space-y-4 p-5">
          <div class="flex items-center justify-between rounded-lg border border-ui-border/40 p-3">
            <div>
              <p class="text-sm font-medium text-ui-text">Watchdog enabled</p>
              <p class="text-xs text-ui-muted">
                {{ irevConfigDraft.irev_enabled ? "Polling IReV automatically" : "Off — manual entry only" }}
              </p>
            </div>
            <input v-model="irevConfigDraft.irev_enabled" type="checkbox" class="h-5 w-5" />
          </div>
          <div class="grid gap-4 sm:grid-cols-2">
            <label class="block sm:col-span-2">
              <span class="text-xs text-ui-muted">IReV API base URL</span>
              <input
                v-model.trim="irevConfigDraft.irev_api_base"
                type="text"
                placeholder="https://xxxx.inecelectionresults.ng/api/v1"
                class="ui-input mt-1"
              />
            </label>
            <label class="block">
              <span class="text-xs text-ui-muted">Election ID</span>
              <input v-model.trim="irevConfigDraft.irev_election_id" type="text" class="ui-input mt-1" />
            </label>
            <label class="block">
              <span class="text-xs text-ui-muted">Poll interval (seconds)</span>
              <input
                v-model.number="irevConfigDraft.irev_poll_interval_seconds"
                type="number"
                min="60"
                max="3600"
                class="ui-input mt-1"
              />
            </label>
          </div>
          <button
            type="button"
            class="rounded-lg bg-violet-600 px-4 py-2 text-sm text-white hover:bg-violet-500 disabled:opacity-50"
            :disabled="savingIrevConfig"
            @click="saveIrevConfig"
          >
            {{ savingIrevConfig ? "Saving…" : "Save watchdog config" }}
          </button>

          <div
            v-if="irevStatus"
            class="rounded-lg border border-ui-border/40 bg-ui-elevated/30 p-3 text-xs text-ui-muted"
          >
            <p>Configured: {{ irevStatus.configured ? "Yes" : "No" }} · Enabled: {{ irevStatus.enabled ? "Yes" : "No" }}</p>
            <p class="mt-1">
              Mapped polling units: {{ irevStatus.mapped_polling_units.toLocaleString() }}
              · Auto-filled results: {{ irevStatus.auto_filled_result_sheets.toLocaleString() }}
            </p>
          </div>

          <div class="border-t border-ui-border/40 pt-4">
            <p class="text-sm font-medium text-ui-text">One-time: match our polling units to IReV</p>
            <p class="mt-1 text-xs text-ui-muted">
              Enter IReV's internal state ID (found in devtools while browsing IReV live), then
              run the match. Safe to re-run any time.
            </p>
            <div class="mt-2 flex flex-wrap items-center gap-2">
              <input
                v-model.trim="irevSyncStateId"
                type="text"
                placeholder="IReV state_irev_id"
                class="ui-input w-48"
              />
              <button
                type="button"
                class="rounded-lg border border-ui-border/50 px-3 py-1.5 text-xs hover:bg-ui-muted/10 disabled:opacity-50"
                :disabled="syncingIrev || !irevSyncStateId"
                @click="runIrevSync"
              >
                {{ syncingIrev ? "Matching…" : "Run mapping sync" }}
              </button>
            </div>
            <p v-if="irevSyncResult" class="mt-2 text-xs text-emerald-600">{{ irevSyncResult }}</p>
            <p v-if="irevSyncError" class="mt-2 text-xs text-red-500">{{ irevSyncError }}</p>
          </div>
        </div>
      </div>
    </section>

    <AdminAgentManageModal
      :open="agentModalOpen"
      :loading="loadingAgentDetail"
      :agent="selectedAgent"
      :api-base="apiBase"
      :auth-headers="authHeaders"
      :locked-state="admin?.role === 'state_admin' ? admin.state ?? null : null"
      @close="agentModalOpen = false"
      @updated="onAgentUpdated"
      @deleted="onAgentDeleted"
    />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ADMIN_NAV } from "~/composables/useAdminShell";
import type { PollingUnit } from "~/composables/useVideoFeeds";
import type { AdminOverview } from "~/composables/useAdminAuth";
import type { FeedSnap } from "~/composables/useFeedSnaps";

import type { AdminAgentDetail } from "~/components/AdminAgentManageModal";

type AdminAgentSummary = {
  id: string;
  name: string;
  email: string;
  lga: string | null;
  ward: string | null;
  state?: string | null;
  created_at: string;
  polling_unit_count: number;
  live_unit_count: number;
  data_claim_limit: number;
  data_claims_used: number;
  airtime_claim_limit: number;
  airtime_claims_used: number;
};

type DataPlan = {
  network: string;
  service_id: string;
  variation_code: string;
  name: string;
  amount: number;
  enabled: boolean;
};

type DataCredit = {
  id: string;
  phone: string;
  network: string;
  plan_name: string;
  variation_code: string;
  amount: number;
  request_id: string;
  status: string;
  created_at: string;
  agent_name?: string | null;
  agent_email?: string | null;
};

type AirtimeAmount = {
  amount: number;
  enabled: boolean;
};

type AppSettings = {
  strict_one_data_claim_per_phone: boolean;
  strict_one_airtime_claim_per_phone: boolean;
  irev_enabled: boolean;
  irev_api_base: string;
  irev_election_id: string;
  irev_poll_interval_seconds: number;
};

type AirtimeCredit = {
  id: string;
  phone: string;
  network: string;
  amount: number;
  request_id: string;
  status: string;
  created_at: string;
  agent_name?: string | null;
  agent_email?: string | null;
};

type FeedRecording = {
  id: string;
  polling_unit_id: string;
  polling_unit_name: string;
  code: string;
  state: string;
  ward: string;
  lga: string;
  status: string;
  started_at: string;
  ended_at: string | null;
  duration_seconds: number;
  frame_count: number;
  fps: number;
  file_size: number;
};

definePageMeta({ layout: "admin" });

const router = useRouter();
const { admin, authHeaders, requireAdmin, clear, apiBase, refreshMe, canAccessTab } =
  useAdminAuth();
const { lgas, loadLgas } = useOgunGeo();
const { activeTab, searchQuery, setTab } = useAdminShell();

const ALL_TABS = [
  { id: "overview", label: "Overview" },
  { id: "feeds", label: "Live feeds" },
  { id: "snaps", label: "Pictures" },
  { id: "recordings", label: "Recordings" },
  { id: "agents", label: "Agents" },
  { id: "sms-analytics", label: "SMS Analytics" },
  { id: "disbursements", label: "Disbursements" },
  { id: "chapters", label: "Regional Chapters" },
  { id: "payment-gateways", label: "Payment Gateways" },
  { id: "packages", label: "Packages" },
  { id: "inbox", label: "Inbox" },
  { id: "audit", label: "Independent Audit" },
  { id: "parties", label: "Parties" },
  { id: "votes", label: "Vote results" },
  { id: "data", label: "Data plans" },
  { id: "airtime", label: "Airtime" },
] as const;

type TabId = (typeof ALL_TABS)[number]["id"];

const visibleTabs = computed(() => ALL_TABS.filter((tab) => canAccessTab(tab.id)));
const overview = ref<AdminOverview | null>(null);
const units = ref<PollingUnit[]>([]);
const snaps = ref<FeedSnap[]>([]);
const agents = ref<AdminAgentSummary[]>([]);
const agentSearch = ref("");
const agentModalOpen = ref(false);
const selectedAgent = ref<AdminAgentDetail | null>(null);
const loadingAgentDetail = ref(false);
const countEdits = ref<Record<string, number>>({});

const recordings = ref<FeedRecording[]>([]);
const loadingRecordings = ref(false);
const busyRecording = ref<string | null>(null);
const playingRecordingUrl = ref<string | null>(null);
const playingRecordingTitle = ref("");

const loadingUnits = ref(false);
const loadingSnaps = ref(false);
const loadingAgents = ref(false);

type PendingAccreditation = {
  agent_id: string;
  agent_name: string;
  agent_email: string;
  lga: string | null;
  ward: string | null;
  state: string | null;
  accreditation_status: string;
  accreditation_number: string | null;
  party_name: string | null;
  is_ec8a_signatory: boolean | null;
};

const pendingAccreditations = ref<PendingAccreditation[]>([]);
const accreditationActionBusy = ref<string | null>(null);
const accreditationActionError = ref("");
const message = ref("");
const actionError = ref("");
const toast = useToast();

watch(message, (value) => {
  if (value) toast.success(value);
});
watch(actionError, (value) => {
  if (value) toast.error(value);
});

const vtpassConfigured = ref(false);
const vtpassBalance = ref<number | null>(null);
const loadingBalance = ref(false);
const dataNetworks = [
  { id: "mtn", label: "MTN" },
  { id: "airtel", label: "Airtel" },
  { id: "glo", label: "Glo" },
  { id: "9mobile", label: "9mobile" },
];
const dataNetwork = ref("mtn");
const catalogPlans = ref<DataPlan[]>([]);
const enabledPlanKeys = ref<string[]>([]);
const savedPlans = ref<DataPlan[]>([]);
const dataCredits = ref<DataCredit[]>([]);
const loadingCatalog = ref(false);
const savingPlans = ref(false);

const airtimeAmounts = ref<AirtimeAmount[]>([]);
const airtimeCredits = ref<AirtimeCredit[]>([]);
const newAirtimeAmount = ref<number | null>(null);
const loadingAirtime = ref(false);
const savingAirtime = ref(false);

type VoteUnitStat = {
  code: string;
  name: string;
  lga: string;
  ward: string;
  state?: string;
  votes: number;
  people_count: number;
  difference: number;
  comparison_note: string;
};
type VotePlaceStat = {
  label: string;
  state?: string;
  lga: string;
  ward?: string;
  votes: number;
  people_count: number;
  unit_count: number;
  difference: number;
  comparison_note: string;
};
type VoteResultsSummary = {
  total_votes: number;
  units_with_results: number;
  total_people_counted: number;
  overall_difference: number;
  overall_note: string;
  plain_summary: string;
  by_polling_unit: VoteUnitStat[];
  by_lga: VotePlaceStat[];
  by_ward: VotePlaceStat[];
  by_state?: VotePlaceStat[];
  highest_unit: VoteUnitStat | null;
  lowest_unit: VoteUnitStat | null;
  highest_lga: VotePlaceStat | null;
  lowest_lga: VotePlaceStat | null;
  highest_ward: VotePlaceStat | null;
  lowest_ward: VotePlaceStat | null;
};

const voteSummary = ref<VoteResultsSummary | null>(null);
const loadingVotes = ref(false);
const voteDetailTab = ref<"units" | "lgas" | "wards">("units");

type AdminResultSheet = {
  id: string;
  code: string;
  polling_unit_name: string;
  state: string;
  ward: string;
  lga: string;
  agent_id: string | null;
  votes: number;
  accredited_voters: number | null;
  people_count_at_capture: number;
  sha256: string;
  ipfs_cid?: string | null;
  captured_lat: number | null;
  captured_lng: number | null;
  received_at: string;
  version: number;
  official_votes: number | null;
  official_diff: number | null;
  discrepancy_note: string | null;
  over_accreditation: boolean;
};

const resultSheets = ref<AdminResultSheet[]>([]);
const loadingResultSheets = ref(false);
const resultSheetsError = ref("");

type FlaggedUnit = {
  code: string;
  polling_unit_name: string;
  state: string;
  ward: string;
  lga: string;
  flags: string[];
  severity: number;
};

const flaggedUnits = ref<FlaggedUnit[]>([]);
const officialFigureDrafts = reactive<Record<string, number | null>>({});
const savingOfficialFigure = ref<string | null>(null);
const stateScopeFilter = ref<"all" | "Ogun State">("Ogun State");

/** Ogun-only deployment — multi-state scope UI removed. */
const showStateScopeFilter = computed(() => false);

function matchesStateScope(state: string | null | undefined) {
  const s = (state || "").trim();
  if (!s) return true;
  return s === "Ogun State" || /ogun/i.test(s);
}

const scopedUnits = computed(() => units.value.filter((u) => matchesStateScope(u.state)));
const scopedSnaps = computed(() => snaps.value.filter((s) => matchesStateScope(s.state)));
const scopedRecordings = computed(() => recordings.value.filter((r) => matchesStateScope(r.state)));
const scopedAgents = computed(() => agents.value.filter((a) => matchesStateScope(a.state)));

function rebuildVoteSummary(units: VoteUnitStat[]): VoteResultsSummary {
  const total_votes = units.reduce((s, u) => s + u.votes, 0);
  const total_people = units.reduce((s, u) => s + u.people_count, 0);
  const overall_difference = total_votes - total_people;
  const by_lga_map = new Map<string, VotePlaceStat>();
  const by_ward_map = new Map<string, VotePlaceStat>();
  const by_state_map = new Map<string, VotePlaceStat>();

  for (const u of units) {
    const state = u.state || "Unknown";
    const lgaKey = `${state}::${u.lga}`;
    const wardKey = `${state}::${u.lga}::${u.ward}`;

    const st = by_state_map.get(state) || {
      label: state,
      state,
      lga: "",
      votes: 0,
      people_count: 0,
      unit_count: 0,
      difference: 0,
      comparison_note: "",
    };
    st.votes += u.votes;
    st.people_count += u.people_count;
    st.unit_count += 1;
    st.difference = st.votes - st.people_count;
    by_state_map.set(state, st);

    const lg = by_lga_map.get(lgaKey) || {
      label: `${u.lga} (${state})`,
      state,
      lga: u.lga,
      votes: 0,
      people_count: 0,
      unit_count: 0,
      difference: 0,
      comparison_note: "",
    };
    lg.votes += u.votes;
    lg.people_count += u.people_count;
    lg.unit_count += 1;
    lg.difference = lg.votes - lg.people_count;
    by_lga_map.set(lgaKey, lg);

    const wd = by_ward_map.get(wardKey) || {
      label: `${u.ward}, ${u.lga} (${state})`,
      state,
      lga: u.lga,
      ward: u.ward,
      votes: 0,
      people_count: 0,
      unit_count: 0,
      difference: 0,
      comparison_note: "",
    };
    wd.votes += u.votes;
    wd.people_count += u.people_count;
    wd.unit_count += 1;
    wd.difference = wd.votes - wd.people_count;
    by_ward_map.set(wardKey, wd);
  }

  const by_lga = [...by_lga_map.values()].sort((a, b) => (a.state || "").localeCompare(b.state || "") || b.votes - a.votes);
  const by_ward = [...by_ward_map.values()].sort((a, b) => (a.state || "").localeCompare(b.state || "") || b.votes - a.votes);
  const by_state = [...by_state_map.values()].sort((a, b) => b.votes - a.votes);
  const sortedUnits = [...units].sort((a, b) => (a.state || "").localeCompare(b.state || "") || b.votes - a.votes);

  return {
    total_votes,
    units_with_results: units.length,
    total_people_counted: total_people,
    overall_difference,
    overall_note: voteSummary.value?.overall_note || "",
    plain_summary:
      stateScopeFilter.value === "all"
        ? voteSummary.value?.plain_summary || ""
        : `${stateScopeFilter.value}: ${total_votes.toLocaleString()} vote(s) from ${units.length} polling unit(s).`,
    by_polling_unit: sortedUnits,
    by_lga,
    by_ward,
    by_state,
    highest_unit: sortedUnits.length ? sortedUnits.reduce((a, b) => (a.votes >= b.votes ? a : b)) : null,
    lowest_unit: sortedUnits.length ? sortedUnits.reduce((a, b) => (a.votes <= b.votes ? a : b)) : null,
    highest_lga: by_lga.length ? by_lga.reduce((a, b) => (a.votes >= b.votes ? a : b)) : null,
    lowest_lga: by_lga.length ? by_lga.reduce((a, b) => (a.votes <= b.votes ? a : b)) : null,
    highest_ward: by_ward.length ? by_ward.reduce((a, b) => (a.votes >= b.votes ? a : b)) : null,
    lowest_ward: by_ward.length ? by_ward.reduce((a, b) => (a.votes <= b.votes ? a : b)) : null,
  };
}

const filteredVoteSummary = computed(() => {
  if (!voteSummary.value) return null;
  if (!showStateScopeFilter.value || stateScopeFilter.value === "all") {
    return voteSummary.value;
  }
  const units = voteSummary.value.by_polling_unit.filter((u) => u.state === stateScopeFilter.value);
  return rebuildVoteSummary(units);
});

const appSettings = ref<AppSettings>({
  strict_one_data_claim_per_phone: false,
  strict_one_airtime_claim_per_phone: false,
  irev_enabled: false,
  irev_api_base: "",
  irev_election_id: "",
  irev_poll_interval_seconds: 300,
});
const savingSettings = ref(false);

type IrevStatus = {
  enabled: boolean;
  configured: boolean;
  irev_api_base: string | null;
  irev_election_id: string | null;
  poll_interval_seconds: number;
  mapped_polling_units: number;
  auto_filled_result_sheets: number;
};

const irevConfigDraft = reactive({
  irev_enabled: false,
  irev_api_base: "",
  irev_election_id: "",
  irev_poll_interval_seconds: 300,
});
const savingIrevConfig = ref(false);
const irevStatus = ref<IrevStatus | null>(null);
const irevSyncStateId = ref("");
const syncingIrev = ref(false);
const irevSyncResult = ref("");
const irevSyncError = ref("");

function planKey(plan: Pick<DataPlan, "network" | "variation_code">) {
  return `${plan.network}::${plan.variation_code}`;
}

function formatWhen(iso: string) {
  try {
    return new Date(iso).toLocaleString();
  } catch {
    return iso;
  }
}

function formatDuration(seconds: number) {
  const s = Math.max(0, Math.round(seconds || 0));
  const m = Math.floor(s / 60);
  const rem = s % 60;
  if (m <= 0) return `${rem}s`;
  return `${m}m ${rem.toString().padStart(2, "0")}s`;
}

function formatBytes(bytes: number) {
  if (!bytes) return "—";
  const units = ["B", "KB", "MB", "GB"];
  let value = bytes;
  let i = 0;
  while (value >= 1024 && i < units.length - 1) {
    value /= 1024;
    i += 1;
  }
  return `${value.toFixed(value >= 10 || i === 0 ? 0 : 1)} ${units[i]}`;
}

function creditStatusClass(status?: string | null) {
  if (status === "delivered" || status === "successful") {
    return "bg-emerald-500/15 text-emerald-600";
  }
  if (status === "failed") {
    return "bg-red-500/15 text-red-600";
  }
  return "bg-amber-500/15 text-amber-600";
}

const filteredAgents = computed(() => {
  const q = agentSearch.value.trim().toLowerCase();
  const list = scopedAgents.value;
  if (!q) return list;
  return list.filter((a) => {
    const haystack = [a.name, a.email, a.state ?? "", a.lga ?? "", a.ward ?? ""].join(" ").toLowerCase();
    return haystack.includes(q);
  });
});

const overviewByState = computed(() => {
  if (!showStateScopeFilter.value) return [];
  const states = ["Ogun State"] as const;
  return states.map((state) => {
    const stateUnits = units.value.filter((u) => u.state === state);
    return {
      state,
      live: stateUnits.filter((u) => u.stream_status === "live").length,
      units: stateUnits.length,
      agents: agents.value.filter((a) => a.state === state).length,
      snaps: snaps.value.filter((s) => s.state === state).length,
    };
  }).filter((row) => row.units || row.agents || row.snaps || row.live);
});

const overviewStats = computed(() => {
  const scoped = stateScopeFilter.value !== "all" && showStateScopeFilter.value;
  const live = scoped
    ? scopedUnits.value.filter((u) => u.stream_status === "live").length
    : overview.value?.live_feeds ?? "—";
  const registered = scoped ? scopedUnits.value.length : overview.value?.registered_units ?? "—";
  const people = scoped
    ? scopedUnits.value.filter((u) => u.stream_status === "live").reduce((s, u) => s + (u.people_count || 0), 0)
    : overview.value?.total_people_on_site ?? "—";
  const pictures = scoped ? scopedSnaps.value.length : overview.value?.feed_snapshots ?? "—";
  const agentCount = scoped ? scopedAgents.value.length : overview.value?.agents ?? "—";
  const votes = filteredVoteSummary.value?.total_votes ?? overview.value?.total_votes;
  const unitsReported = filteredVoteSummary.value?.units_with_results ?? overview.value?.units_with_results;

  return [
    { label: "Live feeds", value: live, hint: scoped ? stateScopeFilter.value : null as string | null, clickable: false },
    { label: "Registered units", value: registered, hint: scoped ? stateScopeFilter.value : null, clickable: false },
    { label: "People on site", value: people, hint: scoped ? stateScopeFilter.value : null, clickable: false },
    {
      label: "Total votes",
      value: typeof votes === "number" ? votes.toLocaleString() : votes ?? "—",
      hint: unitsReported != null
        ? `${unitsReported} unit(s) reported · click for details`
        : "Click for details",
      clickable: true,
    },
    { label: "Saved pictures", value: pictures, hint: scoped ? stateScopeFilter.value : null, clickable: false },
    { label: "Agents", value: agentCount, hint: scoped ? stateScopeFilter.value : null, clickable: false },
    { label: "Forms scanned", value: overview.value?.form_registrations ?? "—", hint: null, clickable: false },
  ];
});

const currentNavLabel = computed(
  () => ADMIN_NAV.find((item) => item.id === activeTab.value)?.label ?? "Overview",
);
const pageTitle = computed(() => {
  if (activeTab.value === "overview") return "Global mission operations";
  if (activeTab.value === "agents") return "Supporter & Voter Directory";
  if (activeTab.value === "recordings") return "Field Canvassing & Turf Command";
  if (activeTab.value === "sms-analytics") return "SMS Delivery & Response Analytics";
  if (activeTab.value === "disbursements") return "Fundraising & Donor Capital Command";
  if (activeTab.value === "chapters") return "Ogun Chapter Budget & Configuration";
  if (activeTab.value === "payment-gateways") return "Payment Gateway Configuration";
  if (activeTab.value === "packages") return "Package Distribution Command";
  if (activeTab.value === "parties") return "Party & Candidate Registry";
  if (activeTab.value === "votes") return "Vote Results Command";
  if (activeTab.value === "data") return "Agent Data Credit Command";
  if (activeTab.value === "airtime") return "Agent Airtime Command";
  return currentNavLabel.value;
});

function formatStat(value: number | string | null | undefined) {
  if (typeof value === "number") return value.toLocaleString();
  if (value == null || value === "") return "—";
  return String(value);
}

const commandLive = computed(() => {
  if (showStateScopeFilter.value && stateScopeFilter.value !== "all") {
    return scopedUnits.value.filter((u) => u.stream_status === "live").length;
  }
  return overview.value?.live_feeds ?? scopedUnits.value.filter((u) => u.stream_status === "live").length;
});
const commandUnits = computed(() => {
  if (showStateScopeFilter.value && stateScopeFilter.value !== "all") return scopedUnits.value.length;
  return overview.value?.registered_units ?? scopedUnits.value.length;
});
const commandPeople = computed(() => {
  const fromUnits = scopedUnits.value
    .filter((u) => u.stream_status === "live")
    .reduce((sum, u) => sum + (u.people_count || 0), 0);
  if (showStateScopeFilter.value && stateScopeFilter.value !== "all") return fromUnits;
  return overview.value?.total_people_on_site ?? fromUnits;
});
const commandAgents = computed(() => {
  if (showStateScopeFilter.value && stateScopeFilter.value !== "all") return scopedAgents.value.length;
  return overview.value?.agents ?? scopedAgents.value.length;
});
const commandVotes = computed(
  () => filteredVoteSummary.value?.total_votes ?? overview.value?.total_votes ?? 0,
);
const commandUnitsReported = computed(
  () => filteredVoteSummary.value?.units_with_results ?? overview.value?.units_with_results ?? 0,
);
const liveSharePct = computed(() => {
  const total = Number(commandUnits.value) || 0;
  const live = Number(commandLive.value) || 0;
  if (!total) return 0;
  return Math.min(100, Math.round((live / total) * 100));
});
const liveShareLabel = computed(() => `${liveSharePct.value}%`);

const topLgas = computed(() => {
  const map = new Map<string, { lga: string; live: number; people: number; units: number; pct: number }>();
  for (const unit of scopedUnits.value) {
    const key = unit.lga || "Unassigned";
    const row = map.get(key) || { lga: key, live: 0, people: 0, units: 0, pct: 0 };
    row.units += 1;
    if (unit.stream_status === "live") {
      row.live += 1;
      row.people += unit.people_count || 0;
    }
    map.set(key, row);
  }
  return [...map.values()]
    .map((row) => ({ ...row, pct: row.units ? Math.round((row.live / row.units) * 100) : 0 }))
    .sort((a, b) => b.live - a.live || b.units - a.units);
});
const topCluster = computed(() => topLgas.value[0] ?? null);

const {
  loading: overviewMapLoading,
  data: overviewMapData,
  markers: overviewMapMarkers,
  center: overviewMapCenter,
  load: loadOverviewMapData,
} = useMapPollingUnits();

async function refreshOverviewMap(opts: { reloadUnits?: boolean } = {}) {
  const lga = topCluster.value?.lga;
  await loadOverviewMapData({
    state: "Ogun State",
    ...(lga ? { lga } : {}),
  });
  if (opts.reloadUnits) await loadUnits();
}

const velocityBars = computed(() => {
  const max = Math.max(1, ...topLgas.value.map((row) => row.units));
  return topLgas.value.slice(0, 7).map((row) => ({
    lga: row.lga,
    short: row.lga.slice(0, 10),
    live: row.live > 0,
    height: Math.max(8, Math.round((row.units / max) * 100)),
  }));
});
const dispatchRows = computed(() => {
  const live = scopedUnits.value.filter((u) => u.stream_status === "live");
  const rest = scopedUnits.value.filter((u) => u.stream_status !== "live");
  return [...live, ...rest].slice(0, 8);
});
const criticalAlerts = computed(() => {
  const alerts: {
    id: string;
    title: string;
    body: string;
    meta: string;
    tone: string;
    action?: () => void;
    actionLabel?: string;
  }[] = [];
  for (const row of pendingAccreditations.value.slice(0, 2)) {
    alerts.push({
      id: `acc-${row.agent_id}`,
      title: "Accreditation sign-off",
      body: `${row.agent_name} · ${row.ward || "—"}, ${row.lga || "—"}`,
      meta: "Pending",
      tone: "text-secondary",
      action: () => setTab("agents"),
      actionLabel: "Review",
    });
  }
  for (const unit of flaggedUnits.value.slice(0, 2)) {
    alerts.push({
      id: `flag-${unit.code}`,
      title: "Review needed",
      body: `${unit.polling_unit_name} · ${unit.flags.join(", ")}`,
      meta: unit.code,
      tone: "text-error",
      action: () => setTab("votes"),
      actionLabel: "Open votes",
    });
  }
  return alerts.slice(0, 3);
});
const copilotInsight = computed(() => {
  const quiet = scopedUnits.value.filter((u) => u.stream_status !== "live").length;
  const live = Number(commandLive.value) || 0;
  if (!scopedUnits.value.length) {
    return "No polling units in this scope yet. Register field units to start live telemetry.";
  }
  if (!live) {
    return `${quiet} unit(s) are registered but none are streaming. Check agent relays and force-offline history.`;
  }
  return `${live} live stream(s) across ${topLgas.value.length} LGA(s). ${quiet} unit(s) are still offline.`;
});

function exportAuditCsv() {
  const escape = (value: unknown) => `"${String(value ?? "").replace(/"/g, '""')}"`;
  const lines = [
    ["Code", "Name", "State", "LGA", "Ward", "Status", "People"].join(","),
    ...scopedUnits.value.map((unit) =>
      [unit.code, unit.name, unit.state, unit.lga, unit.ward, unit.stream_status, unit.people_count]
        .map(escape)
        .join(","),
    ),
  ];
  const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "e-mobilize-units.csv";
  link.click();
  URL.revokeObjectURL(url);
}

watch(searchQuery, (query) => {
  agentSearch.value = query;
});

onMounted(async () => {
  if (!requireAdmin()) return;
  await refreshMe();
  if (!canAccessTab(activeTab.value) && visibleTabs.value.length) {
    activeTab.value = visibleTabs.value[0].id;
  }
  await loadLgas();
  await Promise.all([
    loadOverview(),
    loadUnits(),
    loadSnaps(),
    loadAgents(),
    loadVoteResults(),
    loadFlaggedUnits(),
    loadResultSheets(),
  ]);
  if (admin.value?.role === "super_admin") {
    loadPendingAccreditations();
  }
  void refreshOverviewMap();
});

watch([activeTab, stateScopeFilter], () => {
  if (activeTab.value === "overview") void refreshOverviewMap();
});

watch(topCluster, (cluster, prev) => {
  if (activeTab.value !== "overview") return;
  if (cluster?.lga && cluster.lga !== prev?.lga) void refreshOverviewMap();
});

watch(activeTab, async (tab) => {
  if (tab === "feeds" && !units.value.length) loadUnits();
  if (tab === "snaps" && !snaps.value.length) loadSnaps();
  if (tab === "recordings") loadRecordings();
  if (tab === "agents") {
    if (!agents.value.length) loadAgents();
    if (admin.value?.role === "super_admin") loadPendingAccreditations();
  }
  if (tab === "votes") {
    loadResultSheets();
    if (admin.value?.role === "super_admin") {
      loadAppSettings();
      loadIrevStatus();
    }
  }
});

onUnmounted(() => {
  closePlayer();
});

function logout() {
  clear();
  router.push("/admin/login");
}

async function loadOverview() {
  try {
    overview.value = await $fetch<AdminOverview>(`${apiBase}/admin/overview`, { headers: authHeaders() });
  } catch {
    actionError.value = "Failed to load overview.";
  }
}

async function openVoteResults() {
  activeTab.value = "votes";
  const tasks = [loadVoteResults(), loadResultSheets(), loadFlaggedUnits()];
  if (admin.value?.role === "super_admin") {
    tasks.push(loadAppSettings(), loadIrevStatus());
  }
  await Promise.all(tasks);
}

async function loadVoteResults() {
  loadingVotes.value = true;
  actionError.value = "";
  try {
    voteSummary.value = await $fetch<VoteResultsSummary>(`${apiBase}/admin/results/summary`, {
      headers: authHeaders(),
    });
  } catch {
    actionError.value = "Failed to load vote results.";
    voteSummary.value = null;
  } finally {
    loadingVotes.value = false;
  }
}

function onVoteResultsLoaded(sum: VoteResultsSummary | null) {
  if (sum) voteSummary.value = sum;
}

async function loadResultSheets() {
  loadingResultSheets.value = true;
  resultSheetsError.value = "";
  try {
    resultSheets.value = await $fetch<AdminResultSheet[]>(`${apiBase}/admin/result-sheets`, {
      headers: authHeaders(),
    });
    for (const row of resultSheets.value) {
      if (officialFigureDrafts[row.id] === undefined) {
        officialFigureDrafts[row.id] = row.official_votes;
      }
    }
  } catch {
    resultSheetsError.value = "Failed to load result sheets.";
    resultSheets.value = [];
  } finally {
    loadingResultSheets.value = false;
  }
}

async function loadFlaggedUnits() {
  try {
    flaggedUnits.value = await $fetch<FlaggedUnit[]>(`${apiBase}/admin/tribunal-reports/flagged`, {
      headers: authHeaders(),
    });
  } catch {
    flaggedUnits.value = [];
  }
}

async function viewAdminResultSheetPhoto(row: AdminResultSheet) {
  resultSheetsError.value = "";
  try {
    const res = await fetch(`${apiBase}/admin/result-sheets/${row.id}/photo`, {
      headers: authHeaders(),
    });
    if (!res.ok) throw new Error("Failed to load photo.");
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    window.open(url, "_blank");
  } catch {
    resultSheetsError.value = "Could not load the photo.";
  }
}

async function saveOfficialFigure(row: AdminResultSheet) {
  const value = officialFigureDrafts[row.id];
  if (value === undefined || value === null) return;
  savingOfficialFigure.value = row.id;
  resultSheetsError.value = "";
  try {
    const updated = await $fetch<AdminResultSheet>(`${apiBase}/admin/result-sheets/${row.id}/official-figure`, {
      method: "PATCH",
      headers: authHeaders(),
      body: { official_votes: value },
    });
    const idx = resultSheets.value.findIndex((r) => r.id === row.id);
    if (idx !== -1) resultSheets.value[idx] = updated;
  } catch {
    resultSheetsError.value = "Failed to save the official figure.";
  } finally {
    savingOfficialFigure.value = null;
  }
}

async function loadUnits() {
  loadingUnits.value = true;
  try {
    units.value = await $fetch<PollingUnit[]>(`${apiBase}/admin/polling-units`, { headers: authHeaders() });
    const edits: Record<string, number> = {};
    for (const u of units.value) edits[u.code] = u.people_count;
    countEdits.value = edits;
  } catch {
    actionError.value = "Failed to load polling units.";
  } finally {
    loadingUnits.value = false;
  }
}

async function loadSnaps() {
  loadingSnaps.value = true;
  try {
    snaps.value = await $fetch<FeedSnap[]>(`${apiBase}/admin/feed-snaps`, { headers: authHeaders() });
  } catch {
    actionError.value = "Failed to load pictures.";
  } finally {
    loadingSnaps.value = false;
  }
}

async function loadAgents() {
  loadingAgents.value = true;
  try {
    agents.value = await $fetch<AdminAgentSummary[]>(`${apiBase}/admin/agents`, { headers: authHeaders() });
  } catch {
    actionError.value = "Failed to load agents.";
  } finally {
    loadingAgents.value = false;
  }
}

async function loadPendingAccreditations() {
  try {
    pendingAccreditations.value = await $fetch<PendingAccreditation[]>(
      `${apiBase}/admin/accreditation/pending`,
      { headers: authHeaders() },
    );
  } catch {
    pendingAccreditations.value = [];
  }
}

async function viewAccreditationDocument(agentId: string) {
  accreditationActionError.value = "";
  try {
    const res = await fetch(`${apiBase}/admin/agents/${agentId}/accreditation/document`, {
      headers: authHeaders(),
    });
    if (!res.ok) throw new Error("Failed to load document.");
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    window.open(url, "_blank");
  } catch {
    accreditationActionError.value = "Could not load the accreditation document.";
  }
}

async function approveAccreditation(agentId: string) {
  accreditationActionBusy.value = agentId;
  accreditationActionError.value = "";
  try {
    await $fetch(`${apiBase}/admin/agents/${agentId}/accreditation/approve`, {
      method: "POST",
      headers: authHeaders(),
    });
    await loadPendingAccreditations();
  } catch {
    accreditationActionError.value = "Failed to approve accreditation.";
  } finally {
    accreditationActionBusy.value = null;
  }
}

async function rejectAccreditation(agentId: string) {
  const reason = window.prompt("Reason for rejecting this accreditation:");
  if (!reason) return;
  accreditationActionBusy.value = agentId;
  accreditationActionError.value = "";
  try {
    await $fetch(`${apiBase}/admin/agents/${agentId}/accreditation/reject`, {
      method: "POST",
      headers: authHeaders(),
      body: { reason },
    });
    await loadPendingAccreditations();
  } catch {
    accreditationActionError.value = "Failed to reject accreditation.";
  } finally {
    accreditationActionBusy.value = null;
  }
}

async function loadRecordings() {
  loadingRecordings.value = true;
  try {
    recordings.value = await $fetch<FeedRecording[]>(`${apiBase}/admin/recordings`, {
      headers: authHeaders(),
    });
  } catch {
    actionError.value = "Failed to load recordings.";
  } finally {
    loadingRecordings.value = false;
  }
}

async function fetchRecordingBlob(id: string): Promise<Blob> {
  const res = await fetch(`${apiBase}/admin/recordings/${id}/video`, {
    headers: authHeaders(),
  });
  if (!res.ok) throw new Error("Failed to fetch recording.");
  return res.blob();
}

function closePlayer() {
  if (playingRecordingUrl.value) URL.revokeObjectURL(playingRecordingUrl.value);
  playingRecordingUrl.value = null;
  playingRecordingTitle.value = "";
}

async function playRecording(rec: FeedRecording) {
  actionError.value = "";
  busyRecording.value = rec.id;
  try {
    closePlayer();
    const blob = await fetchRecordingBlob(rec.id);
    playingRecordingUrl.value = URL.createObjectURL(blob);
    playingRecordingTitle.value = `${rec.polling_unit_name || rec.code} · ${formatWhen(rec.started_at)}`;
  } catch {
    actionError.value = "Could not load the recording for playback. Try downloading it instead.";
  } finally {
    busyRecording.value = null;
  }
}

async function downloadRecording(rec: FeedRecording) {
  actionError.value = "";
  busyRecording.value = rec.id;
  try {
    const blob = await fetchRecordingBlob(rec.id);
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${rec.code}-${rec.id}.mp4`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  } catch {
    actionError.value = "Failed to download the recording.";
  } finally {
    busyRecording.value = null;
  }
}

async function deleteRecording(id: string) {
  if (!confirm("Delete this recording permanently?")) return;
  actionError.value = "";
  try {
    await $fetch(`${apiBase}/admin/recordings/${id}`, {
      method: "DELETE",
      headers: authHeaders(),
    });
    if (playingRecordingTitle.value && recordings.value.find((r) => r.id === id)) {
      closePlayer();
    }
    recordings.value = recordings.value.filter((r) => r.id !== id);
    message.value = "Recording deleted.";
  } catch {
    actionError.value = "Failed to delete the recording.";
  }
}

async function openAgentModal(agentId: string) {
  loadingAgentDetail.value = true;
  agentModalOpen.value = true;
  selectedAgent.value = null;
  try {
    selectedAgent.value = await $fetch<AdminAgentDetail>(`${apiBase}/admin/agents/${agentId}`, {
      headers: authHeaders(),
    });
  } catch {
    actionError.value = "Failed to load agent details.";
    agentModalOpen.value = false;
  } finally {
    loadingAgentDetail.value = false;
  }
}

async function onAgentUpdated() {
  message.value = "Agent updated.";
  if (selectedAgent.value) {
    selectedAgent.value = await $fetch<AdminAgentDetail>(
      `${apiBase}/admin/agents/${selectedAgent.value.id}`,
      { headers: authHeaders() },
    );
  }
  await loadAgents();
}

async function loadVtpassStatus() {
  try {
    const res = await $fetch<{ configured: boolean }>(`${apiBase}/admin/data/status`, {
      headers: authHeaders(),
    });
    vtpassConfigured.value = res.configured;
  } catch {
    vtpassConfigured.value = false;
  }
}

async function loadVtpassBalance() {
  loadingBalance.value = true;
  try {
    const res = await $fetch<{ configured: boolean; balance: number | null }>(
      `${apiBase}/admin/vtpass/balance`,
      { headers: authHeaders() },
    );
    vtpassConfigured.value = res.configured;
    vtpassBalance.value = res.balance;
  } catch {
    vtpassBalance.value = null;
  } finally {
    loadingBalance.value = false;
  }
}

async function loadSavedPlans() {
  try {
    savedPlans.value = await $fetch<DataPlan[]>(`${apiBase}/admin/data/plans`, {
      headers: authHeaders(),
    });
    enabledPlanKeys.value = savedPlans.value
      .filter((p) => p.enabled)
      .map((p) => planKey(p));
  } catch {
    savedPlans.value = [];
  }
}

async function loadCatalog() {
  loadingCatalog.value = true;
  clearFeedback();
  try {
    catalogPlans.value = await $fetch<DataPlan[]>(
      `${apiBase}/admin/data/catalog/${dataNetwork.value}`,
      { headers: authHeaders() },
    );
    // Keep ticks for plans already enabled on this network.
    const enabled = new Set(enabledPlanKeys.value);
    for (const p of savedPlans.value) {
      if (p.network === dataNetwork.value && p.enabled) {
        enabled.add(planKey(p));
      }
    }
    enabledPlanKeys.value = [...enabled];
  } catch (err: unknown) {
    const detail = (err as { data?: { detail?: string } })?.data?.detail;
    actionError.value = typeof detail === "string" ? detail : "Failed to load VTpass catalog.";
    catalogPlans.value = [];
  } finally {
    loadingCatalog.value = false;
  }
}

async function saveDataPlans() {
  savingPlans.value = true;
  clearFeedback();
  try {
    // Merge: keep enabled plans from other networks + selected from current catalog.
    const otherNetworks = savedPlans.value.filter((p) => p.network !== dataNetwork.value && p.enabled);
    const selected = catalogPlans.value.filter((p) => enabledPlanKeys.value.includes(planKey(p)));
    const plans = [
      ...otherNetworks.map((p) => ({
        network: p.network,
        variation_code: p.variation_code,
        name: p.name,
        amount: p.amount,
        enabled: true,
      })),
      ...selected.map((p) => ({
        network: p.network,
        variation_code: p.variation_code,
        name: p.name,
        amount: p.amount,
        enabled: true,
      })),
    ];
    savedPlans.value = await $fetch<DataPlan[]>(`${apiBase}/admin/data/plans`, {
      method: "PUT",
      headers: authHeaders(),
      body: { plans },
    });
    enabledPlanKeys.value = savedPlans.value.filter((p) => p.enabled).map((p) => planKey(p));
    message.value = `Saved ${savedPlans.value.length} enabled data plan(s).`;
  } catch (err: unknown) {
    const detail = (err as { data?: { detail?: string } })?.data?.detail;
    actionError.value = typeof detail === "string" ? detail : "Failed to save data plans.";
  } finally {
    savingPlans.value = false;
  }
}

async function loadDataCredits() {
  try {
    dataCredits.value = await $fetch<DataCredit[]>(`${apiBase}/admin/data/credits`, {
      headers: authHeaders(),
    });
  } catch {
    dataCredits.value = [];
  }
}

async function loadAirtimeAmounts() {
  loadingAirtime.value = true;
  try {
    airtimeAmounts.value = await $fetch<AirtimeAmount[]>(`${apiBase}/admin/airtime/amounts`, {
      headers: authHeaders(),
    });
  } catch {
    airtimeAmounts.value = [];
  } finally {
    loadingAirtime.value = false;
  }
}

function addAirtimeAmount() {
  const value = Number(newAirtimeAmount.value);
  if (!value || value <= 0) {
    actionError.value = "Enter a valid airtime amount.";
    return;
  }
  if (airtimeAmounts.value.some((a) => a.amount === value)) {
    actionError.value = "That amount already exists.";
    return;
  }
  airtimeAmounts.value = [...airtimeAmounts.value, { amount: value, enabled: true }].sort(
    (a, b) => a.amount - b.amount,
  );
  newAirtimeAmount.value = null;
  actionError.value = "";
}

function removeAirtimeAmount(amount: number) {
  airtimeAmounts.value = airtimeAmounts.value.filter((a) => a.amount !== amount);
}

async function saveAirtimeAmounts() {
  savingAirtime.value = true;
  actionError.value = "";
  try {
    airtimeAmounts.value = await $fetch<AirtimeAmount[]>(`${apiBase}/admin/airtime/amounts`, {
      method: "PUT",
      headers: authHeaders(),
      body: { plans: airtimeAmounts.value },
    });
    const enabled = airtimeAmounts.value.filter((a) => a.enabled).length;
    message.value = `Saved ${airtimeAmounts.value.length} amount(s), ${enabled} enabled for agents.`;
  } catch (err: unknown) {
    const detail = (err as { data?: { detail?: string } })?.data?.detail;
    actionError.value = typeof detail === "string" ? detail : "Failed to save airtime amounts.";
  } finally {
    savingAirtime.value = false;
  }
}

async function loadAirtimeCredits() {
  try {
    airtimeCredits.value = await $fetch<AirtimeCredit[]>(`${apiBase}/admin/airtime/credits`, {
      headers: authHeaders(),
    });
  } catch {
    airtimeCredits.value = [];
  }
}

async function loadAppSettings() {
  try {
    appSettings.value = await $fetch<AppSettings>(`${apiBase}/admin/settings`, {
      headers: authHeaders(),
    });
    irevConfigDraft.irev_enabled = appSettings.value.irev_enabled;
    irevConfigDraft.irev_api_base = appSettings.value.irev_api_base;
    irevConfigDraft.irev_election_id = appSettings.value.irev_election_id;
    irevConfigDraft.irev_poll_interval_seconds = appSettings.value.irev_poll_interval_seconds;
  } catch {
    // keep defaults
  }
}

async function saveIrevConfig() {
  savingIrevConfig.value = true;
  irevSyncError.value = "";
  try {
    await saveAppSettings({
      irev_enabled: irevConfigDraft.irev_enabled,
      irev_api_base: irevConfigDraft.irev_api_base,
      irev_election_id: irevConfigDraft.irev_election_id,
      irev_poll_interval_seconds: irevConfigDraft.irev_poll_interval_seconds,
    });
    await loadIrevStatus();
  } finally {
    savingIrevConfig.value = false;
  }
}

async function loadIrevStatus() {
  try {
    irevStatus.value = await $fetch<IrevStatus>(`${apiBase}/admin/irev/status`, {
      headers: authHeaders(),
    });
  } catch {
    irevStatus.value = null;
  }
}

async function runIrevSync() {
  if (!irevSyncStateId.value) return;
  syncingIrev.value = true;
  irevSyncResult.value = "";
  irevSyncError.value = "";
  try {
    const res = await $fetch<{ matched: number; skipped: number; error?: string }>(
      `${apiBase}/admin/irev/sync-mapping`,
      {
        method: "POST",
        headers: authHeaders(),
        body: { state_irev_id: irevSyncStateId.value },
      },
    );
    if (res.error) {
      irevSyncError.value = res.error;
    } else {
      irevSyncResult.value = `Matched ${res.matched.toLocaleString()} polling unit(s), skipped ${res.skipped.toLocaleString()}.`;
    }
    await loadIrevStatus();
  } catch (err: unknown) {
    const detail = (err as { data?: { detail?: string } })?.data?.detail;
    irevSyncError.value = typeof detail === "string" ? detail : "Failed to run the mapping sync.";
  } finally {
    syncingIrev.value = false;
  }
}

async function saveAppSettings(patch: Partial<AppSettings>) {
  savingSettings.value = true;
  actionError.value = "";
  try {
    appSettings.value = await $fetch<AppSettings>(`${apiBase}/admin/settings`, {
      method: "PATCH",
      headers: authHeaders(),
      body: patch,
    });
    message.value = "Rules updated.";
  } catch (err: unknown) {
    const detail = (err as { data?: { detail?: string } })?.data?.detail;
    actionError.value = typeof detail === "string" ? detail : "Failed to update rules.";
    await loadAppSettings();
  } finally {
    savingSettings.value = false;
  }
}

async function onAgentDeleted(id: string) {
  message.value = "Agent deleted.";
  agents.value = agents.value.filter((a) => a.id !== id);
  selectedAgent.value = null;
  agentModalOpen.value = false;
  await loadUnits();
  await loadSnaps();
  await loadOverview();
}

function clearFeedback() {
  message.value = "";
  actionError.value = "";
}

async function saveCount(code: string) {
  clearFeedback();
  try {
    await $fetch(`${apiBase}/admin/polling-units/${code}/people-count`, {
      method: "PATCH",
      headers: authHeaders(),
      body: { people_count: countEdits.value[code] ?? 0 },
    });
    message.value = `Count updated for ${code}.`;
    await loadUnits();
    await loadOverview();
  } catch (err: unknown) {
    const detail = (err as { data?: { detail?: string } })?.data?.detail;
    actionError.value = typeof detail === "string" ? detail : "Failed to update count.";
  }
}

async function forceOffline(code: string) {
  if (!confirm(`Force ${code} offline?`)) return;
  clearFeedback();
  try {
    await $fetch(`${apiBase}/admin/polling-units/${code}/force-offline`, { method: "POST", headers: authHeaders() });
    message.value = `${code} forced offline.`;
    await loadUnits();
    await loadOverview();
  } catch {
    actionError.value = "Failed to force offline.";
  }
}

async function deleteUnit(code: string) {
  if (!confirm(`Delete polling unit ${code} and all its data?`)) return;
  clearFeedback();
  try {
    await $fetch(`${apiBase}/admin/polling-units/${code}`, { method: "DELETE", headers: authHeaders() });
    message.value = `${code} deleted.`;
    await loadUnits();
    await loadSnaps();
    await loadOverview();
  } catch {
    actionError.value = "Failed to delete unit.";
  }
}
</script>
