<template>
  <div class="mx-auto max-w-6xl space-y-6 p-4 sm:p-6">
    <header class="flex flex-wrap items-center justify-between gap-4">
      <div>
        <h1 class="text-xl font-semibold text-ui-text">Admin control panel</h1>
        <p v-if="admin" class="mt-1 text-sm text-ui-muted">
          {{ admin.name }} · {{ admin.role === "state_admin" ? "State admin" : "Super admin" }}
          <span v-if="admin.state"> · {{ admin.state }}</span>
        </p>
      </div>
      <AdminProfileMenu :admin="admin" @logout="logout" />
    </header>

    <nav class="flex flex-wrap gap-2 border-b border-ui-border/40 pb-3">
      <button
        v-for="tab in visibleTabs"
        :key="tab.id"
        type="button"
        class="rounded-lg px-3 py-1.5 text-sm transition"
        :class="activeTab === tab.id ? 'bg-violet-600 text-white' : 'text-ui-muted hover:bg-ui-muted/10 hover:text-ui-text'"
        @click="activeTab = tab.id"
      >
        {{ tab.label }}
      </button>
    </nav>

    <div
      v-if="showStateScopeFilter"
      class="flex flex-wrap items-center gap-2 rounded-lg border border-ui-border/40 bg-ui-elevated/30 px-3 py-2"
    >
      <p class="text-xs font-medium uppercase tracking-wider text-ui-muted">State scope</p>
      <button
        v-for="opt in stateScopeFilters"
        :key="opt.id"
        type="button"
        class="rounded-lg px-3 py-1.5 text-xs font-medium transition"
        :class="stateScopeFilter === opt.id ? 'bg-violet-600 text-white' : 'border border-ui-border/50 text-ui-muted hover:bg-ui-muted/10'"
        @click="stateScopeFilter = opt.id"
      >
        {{ opt.label }}
      </button>
      <p class="text-xs text-ui-muted">
        Filters overview, feeds, pictures, recordings, agents, and vote results.
      </p>
    </div>

    <p v-if="message" class="rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-4 py-2 text-sm text-emerald-700 dark:text-emerald-300">
      {{ message }}
    </p>
    <p v-if="actionError" class="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-2 text-sm text-red-500 dark:text-red-300">
      {{ actionError }}
    </p>

    <section v-if="activeTab === 'overview'" class="space-y-4">
      <div
        v-if="showStateScopeFilter && stateScopeFilter === 'all' && overviewByState.length"
        class="grid gap-3 sm:grid-cols-2"
      >
        <div
          v-for="row in overviewByState"
          :key="row.state"
          class="ui-card p-5"
        >
          <p class="text-xs font-semibold uppercase tracking-wider text-violet-600 dark:text-violet-400">{{ row.state }}</p>
          <dl class="mt-3 grid grid-cols-2 gap-3 text-sm">
            <div>
              <dt class="text-xs text-ui-muted">Live feeds</dt>
              <dd class="font-semibold text-ui-text">{{ row.live }}</dd>
            </div>
            <div>
              <dt class="text-xs text-ui-muted">Units</dt>
              <dd class="font-semibold text-ui-text">{{ row.units }}</dd>
            </div>
            <div>
              <dt class="text-xs text-ui-muted">Agents</dt>
              <dd class="font-semibold text-ui-text">{{ row.agents }}</dd>
            </div>
            <div>
              <dt class="text-xs text-ui-muted">Pictures</dt>
              <dd class="font-semibold text-ui-text">{{ row.snaps }}</dd>
            </div>
          </dl>
        </div>
      </div>
      <div class="grid grid-cols-2 gap-4 lg:grid-cols-3">
        <div
          v-for="stat in overviewStats"
          :key="stat.label"
          class="ui-card p-5"
          :class="stat.clickable ? 'cursor-pointer transition hover:border-violet-400/60 hover:bg-violet-500/5' : ''"
          @click="stat.clickable ? openVoteResults() : undefined"
        >
          <p class="text-xs uppercase tracking-wider text-ui-muted">{{ stat.label }}</p>
          <p class="mt-2 text-2xl font-bold text-ui-text">{{ stat.value }}</p>
          <p v-if="stat.hint" class="mt-1 text-xs text-ui-muted">{{ stat.hint }}</p>
        </div>
      </div>
      <p class="text-xs text-ui-muted">
        Tip: click the <span class="font-medium text-ui-text">Total votes</span> card to open the full vote breakdown.
      </p>
    </section>

    <section v-else-if="activeTab === 'feeds'" class="ui-card overflow-hidden">
      <div class="border-b border-ui-border/40 px-5 py-4">
        <h2 class="font-semibold text-ui-text">Polling units & live feeds</h2>
        <p class="text-xs text-ui-muted">
          {{ scopedUnits.length }} unit(s)
          <span v-if="stateScopeFilter !== 'all'"> · {{ stateScopeFilter }}</span>
          · Force offline, correct counts, or remove units.
        </p>
      </div>

      <div v-if="loadingUnits" class="p-8 text-center text-sm text-ui-muted">Loading…</div>
      <div v-else-if="!scopedUnits.length" class="p-8 text-center text-sm text-ui-muted">No polling units in this scope.</div>

      <div v-else class="overflow-x-auto">
        <table class="w-full text-left text-sm">
          <thead>
            <tr class="border-b border-ui-border/30 text-xs uppercase text-ui-muted">
              <th class="px-4 py-3">Unit</th>
              <th class="px-4 py-3">State</th>
              <th class="px-4 py-3">Ward</th>
              <th class="px-4 py-3">LGA</th>
              <th class="px-4 py-3">Status</th>
              <th class="px-4 py-3 text-right">People</th>
              <th class="px-4 py-3">Actions</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-ui-border/30">
            <tr v-for="unit in scopedUnits" :key="unit.id">
              <td class="px-4 py-3">
                <p class="font-medium text-ui-text">{{ unit.name }}</p>
                <p class="text-xs text-ui-muted">{{ unit.code }}</p>
              </td>
              <td class="px-4 py-3 font-medium text-ui-text">{{ unit.state || "—" }}</td>
              <td class="px-4 py-3 text-ui-muted">{{ unit.ward }}</td>
              <td class="px-4 py-3 text-ui-muted">{{ unit.lga }}</td>
              <td class="px-4 py-3">
                <span
                  class="rounded-full px-2 py-0.5 text-xs font-semibold"
                  :class="unit.stream_status === 'live' ? 'bg-red-500/15 text-red-600 dark:text-red-400' : 'bg-ui-elevated text-ui-muted'"
                >
                  {{ unit.stream_status }}
                </span>
              </td>
              <td class="px-4 py-3 text-right">
                <input v-model.number="countEdits[unit.code]" type="number" min="0" class="ui-input w-20 text-right" />
              </td>
              <td class="px-4 py-3">
                <div class="flex flex-wrap gap-2">
                  <button type="button" class="rounded border border-ui-border/50 px-2 py-1 text-xs hover:bg-ui-muted/10" @click="saveCount(unit.code)">
                    Save count
                  </button>
                  <button
                    v-if="unit.stream_status === 'live'"
                    type="button"
                    class="rounded border border-amber-500/40 px-2 py-1 text-xs text-amber-700 hover:bg-amber-500/10 dark:text-amber-300"
                    @click="forceOffline(unit.code)"
                  >
                    Force offline
                  </button>
                  <button type="button" class="rounded border border-red-500/40 px-2 py-1 text-xs text-red-600 hover:bg-red-500/10 dark:text-red-400" @click="deleteUnit(unit.code)">
                    Delete
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>

    <section v-else-if="activeTab === 'snaps'" class="ui-card overflow-hidden">
      <div class="flex flex-wrap items-center justify-between gap-3 border-b border-ui-border/40 px-5 py-4">
        <div>
          <h2 class="font-semibold text-ui-text">Saved feed pictures</h2>
          <p class="text-xs text-ui-muted">
            {{ scopedSnaps.length }} image(s)
            <span v-if="stateScopeFilter !== 'all'"> · {{ stateScopeFilter }}</span>
            · grouped by state, LGA and ward
          </p>
        </div>
        <button type="button" class="rounded-lg border border-ui-border/50 px-3 py-1.5 text-xs hover:bg-ui-muted/10" @click="loadSnaps">
          Refresh
        </button>
      </div>

      <div v-if="loadingSnaps" class="p-8 text-center text-sm text-ui-muted">Loading…</div>
      <div v-else-if="!scopedSnaps.length" class="p-8 text-center text-sm text-ui-muted">No saved pictures in this scope.</div>

      <div v-else class="space-y-8 p-5">
        <section v-for="lgaGroup in snapsByLga" :key="`${lgaGroup.state}-${lgaGroup.lga}`">
          <h3 class="text-sm font-semibold text-ui-text">{{ lgaGroup.label }}</h3>
          <div v-for="wardGroup in lgaGroup.wards" :key="`${lgaGroup.state}-${lgaGroup.lga}-${wardGroup.ward}`" class="mt-4">
            <p class="mb-2 text-xs font-medium uppercase tracking-wider text-ui-muted">
              {{ wardGroup.ward }} · {{ wardGroup.snaps.length }} picture(s)
            </p>
            <div class="grid gap-3 sm:grid-cols-3 lg:grid-cols-5">
              <article
                v-for="snap in wardGroup.snaps"
                :key="snap.id"
                class="group overflow-hidden rounded-lg border border-ui-border/40 bg-ui-elevated/50"
              >
                <img
                  :src="feedSnapImageUrl(apiBase, snap.id)"
                  :alt="snap.polling_unit_name"
                  :title="`${snap.polling_unit_name} · ${snap.state}`"
                  class="aspect-video w-full object-cover"
                />
                <div class="px-2 py-1 text-[10px] text-ui-muted">
                  <p class="truncate font-medium text-ui-text">{{ snap.polling_unit_name }}</p>
                  <p class="truncate">{{ snap.state }} · {{ snap.ward }} · {{ snap.lga }}</p>
                </div>
                <button
                  type="button"
                  class="w-full py-1 text-[10px] text-red-600 opacity-0 transition group-hover:opacity-100 hover:bg-red-500/10 dark:text-red-400"
                  @click="deleteSnap(snap.id)"
                >
                  Delete
                </button>
              </article>
            </div>
          </div>
        </section>
      </div>
    </section>

    <section v-else-if="activeTab === 'recordings'" class="ui-card overflow-hidden">
      <div class="flex flex-wrap items-center justify-between gap-3 border-b border-ui-border/40 px-5 py-4">
        <div>
          <h2 class="font-semibold text-ui-text">Saved feed recordings</h2>
          <p class="text-xs text-ui-muted">
            {{ scopedRecordings.length }} recording(s)
            <span v-if="stateScopeFilter !== 'all'"> · {{ stateScopeFilter }}</span>
            · assembled from live relay frames
          </p>
        </div>
        <button type="button" class="rounded-lg border border-ui-border/50 px-3 py-1.5 text-xs hover:bg-ui-muted/10" @click="loadRecordings">
          Refresh
        </button>
      </div>

      <div v-if="loadingRecordings" class="p-8 text-center text-sm text-ui-muted">Loading…</div>
      <div v-else-if="!scopedRecordings.length" class="p-8 text-center text-sm text-ui-muted">
        No recordings in this scope yet.
      </div>

      <div v-else class="overflow-x-auto">
        <table class="w-full text-left text-sm">
          <thead>
            <tr class="border-b border-ui-border/30 text-xs uppercase text-ui-muted">
              <th class="px-4 py-3">Polling unit</th>
              <th class="px-4 py-3">State</th>
              <th class="px-4 py-3">Ward</th>
              <th class="px-4 py-3">LGA</th>
              <th class="px-4 py-3">Started</th>
              <th class="px-4 py-3 text-right">Length</th>
              <th class="px-4 py-3 text-right">Size</th>
              <th class="px-4 py-3">Actions</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-ui-border/30">
            <tr v-for="rec in scopedRecordings" :key="rec.id">
              <td class="px-4 py-3">
                <p class="font-medium text-ui-text">{{ rec.polling_unit_name || rec.code }}</p>
                <p class="text-xs text-ui-muted">{{ rec.code }}</p>
              </td>
              <td class="px-4 py-3 font-medium text-ui-text">{{ rec.state || "—" }}</td>
              <td class="px-4 py-3 text-ui-muted">{{ rec.ward || "—" }}</td>
              <td class="px-4 py-3 text-ui-muted">{{ rec.lga || "—" }}</td>
              <td class="px-4 py-3 text-ui-muted">
                {{ formatWhen(rec.started_at) }}
                <span
                  v-if="rec.status === 'recording'"
                  class="ml-1 rounded-full bg-red-500/15 px-2 py-0.5 text-[10px] font-semibold text-red-600 dark:text-red-400"
                >
                  recording…
                </span>
              </td>
              <td class="px-4 py-3 text-right text-ui-muted">{{ formatDuration(rec.duration_seconds) }}</td>
              <td class="px-4 py-3 text-right text-ui-muted">{{ formatBytes(rec.file_size) }}</td>
              <td class="px-4 py-3">
                <div class="flex flex-wrap gap-2">
                  <button
                    type="button"
                    class="rounded border border-ui-border/50 px-2 py-1 text-xs hover:bg-ui-muted/10 disabled:opacity-50"
                    :disabled="rec.status === 'recording' || busyRecording === rec.id"
                    @click="playRecording(rec)"
                  >
                    {{ busyRecording === rec.id ? "Loading…" : "Play" }}
                  </button>
                  <button
                    type="button"
                    class="rounded border border-ui-border/50 px-2 py-1 text-xs hover:bg-ui-muted/10 disabled:opacity-50"
                    :disabled="rec.status === 'recording' || busyRecording === rec.id"
                    @click="downloadRecording(rec)"
                  >
                    Download
                  </button>
                  <button
                    type="button"
                    class="rounded border border-red-500/40 px-2 py-1 text-xs text-red-600 hover:bg-red-500/10 dark:text-red-400"
                    @click="deleteRecording(rec.id)"
                  >
                    Delete
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div v-if="playingRecordingUrl" class="border-t border-ui-border/40 p-5">
        <div class="mb-2 flex items-center justify-between">
          <p class="text-sm font-medium text-ui-text">{{ playingRecordingTitle }}</p>
          <button type="button" class="text-xs text-ui-muted hover:text-ui-text" @click="closePlayer">Close</button>
        </div>
        <video :src="playingRecordingUrl" controls autoplay class="w-full rounded-lg bg-black" />
        <p class="mt-2 text-xs text-ui-muted">
          If the video does not play inline, use Download — the file plays in any desktop player (e.g. VLC).
        </p>
      </div>
    </section>

    <section v-else-if="activeTab === 'agents'" class="ui-card overflow-hidden">
      <div class="flex flex-wrap items-center justify-between gap-3 border-b border-ui-border/40 px-5 py-4">
        <div>
          <h2 class="font-semibold text-ui-text">Field agents</h2>
          <p class="text-xs text-ui-muted">
            {{ filteredAgents.length }} of {{ scopedAgents.length }} agent(s)
            <span v-if="stateScopeFilter !== 'all'"> · {{ stateScopeFilter }}</span>
          </p>
        </div>
        <input
          v-model="agentSearch"
          type="search"
          placeholder="Search name, email, state, LGA, ward…"
          class="ui-input w-full max-w-xs text-sm"
        />
      </div>

      <div v-if="loadingAgents" class="p-8 text-center text-sm text-ui-muted">Loading…</div>
      <div v-else-if="!filteredAgents.length" class="p-8 text-center text-sm text-ui-muted">No agents match your search.</div>

      <div v-else class="grid gap-3 p-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        <button
          v-for="agent in filteredAgents"
          :key="agent.id"
          type="button"
          class="rounded-xl border border-ui-border/40 bg-ui-elevated/30 p-4 text-left transition hover:border-violet-500/40 hover:bg-ui-elevated/50"
          @click="openAgentModal(agent.id)"
        >
          <p class="truncate font-medium text-ui-text">{{ agent.name }}</p>
          <p class="truncate text-xs text-ui-muted">{{ agent.email }}</p>
          <p v-if="agent.state || agent.lga" class="mt-2 truncate text-xs text-emerald-600 dark:text-emerald-400">
            <span v-if="agent.state" class="font-semibold">{{ agent.state }}</span>
            <span v-if="agent.state && agent.lga"> · </span>
            <span v-if="agent.lga">{{ agent.lga }}</span>
            <span v-if="agent.ward"> · {{ agent.ward }}</span>
          </p>
          <p v-else class="mt-2 text-xs text-amber-600 dark:text-amber-400">Unassigned</p>
          <dl class="mt-3 grid grid-cols-3 gap-2 text-xs">
            <div class="rounded bg-ui-surface/50 px-2 py-1">
              <dt class="text-ui-muted">Units</dt>
              <dd class="font-semibold text-ui-text">{{ agent.polling_unit_count }}</dd>
            </div>
            <div class="rounded bg-ui-surface/50 px-2 py-1">
              <dt class="text-ui-muted">Live</dt>
              <dd class="font-semibold text-red-600 dark:text-red-400">{{ agent.live_unit_count }}</dd>
            </div>
            <div class="rounded bg-ui-surface/50 px-2 py-1">
              <dt class="text-ui-muted">Data</dt>
              <dd class="font-semibold text-ui-text">
                {{ agent.data_claims_used ?? 0 }}/{{ agent.data_claim_limit ?? 1 }}
              </dd>
            </div>
          </dl>
          <p class="mt-3 text-[10px] text-violet-600 dark:text-violet-400">Manage →</p>
        </button>
      </div>
    </section>

    <section v-else-if="activeTab === 'data'" class="space-y-4">
      <div class="ui-card p-5">
        <div class="flex flex-wrap items-start justify-between gap-4">
          <div class="min-w-0">
            <h2 class="font-semibold text-ui-text">Strict rule</h2>
            <p class="mt-1 text-xs text-ui-muted">
              When on, a phone number can claim data <strong>only once</strong>. Repeat attempts are blocked.
            </p>
          </div>
          <label class="inline-flex cursor-pointer items-center gap-2">
            <input
              type="checkbox"
              class="peer sr-only"
              :checked="appSettings.strict_one_data_claim_per_phone"
              :disabled="savingSettings"
              @change="saveAppSettings({ strict_one_data_claim_per_phone: ($event.target as HTMLInputElement).checked })"
            />
            <span
              class="relative h-6 w-11 rounded-full bg-ui-muted/30 transition peer-checked:bg-emerald-500 after:absolute after:left-0.5 after:top-0.5 after:h-5 after:w-5 after:rounded-full after:bg-white after:transition peer-checked:after:translate-x-5"
            />
            <span class="text-xs font-medium text-ui-text">
              {{ appSettings.strict_one_data_claim_per_phone ? "Active" : "Inactive" }}
            </span>
          </label>
        </div>
      </div>

      <div class="ui-card p-5">
        <div class="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 class="font-semibold text-ui-text">Agent data credit (VTpass)</h2>
            <p class="mt-1 text-xs text-ui-muted">
              Load plans from VTpass, then enable only the ones agents may claim.
            </p>
          </div>
          <div class="flex flex-col items-end gap-1.5">
            <span
              class="rounded-full px-2 py-1 text-xs font-semibold"
              :class="vtpassConfigured ? 'bg-emerald-500/15 text-emerald-600' : 'bg-amber-500/15 text-amber-600'"
            >
              {{ vtpassConfigured ? "VTpass configured" : "VTpass not configured" }}
            </span>
            <div class="flex items-center gap-2">
              <span class="text-xs text-ui-muted">Wallet</span>
              <span class="text-sm font-semibold text-ui-text">
                {{
                  loadingBalance
                    ? "…"
                    : vtpassBalance !== null
                      ? `₦${vtpassBalance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                      : "—"
                }}
              </span>
              <button
                type="button"
                class="text-[10px] uppercase tracking-wide text-sky-600 hover:underline"
                @click="loadVtpassBalance"
              >
                refresh
              </button>
            </div>
          </div>
        </div>

        <div class="mt-4 flex flex-wrap items-end gap-3">
          <label class="min-w-[140px]">
            <span class="text-xs text-ui-muted">Network</span>
            <select v-model="dataNetwork" class="ui-input mt-1" @change="loadCatalog">
              <option v-for="n in dataNetworks" :key="n.id" :value="n.id">{{ n.label }}</option>
            </select>
          </label>
          <button
            type="button"
            class="rounded-lg bg-violet-600 px-4 py-2 text-sm text-white hover:bg-violet-500 disabled:opacity-50"
            :disabled="loadingCatalog || !vtpassConfigured"
            @click="loadCatalog"
          >
            {{ loadingCatalog ? "Loading…" : "Load VTpass plans" }}
          </button>
          <button
            type="button"
            class="rounded-lg border border-ui-border/50 px-4 py-2 text-sm hover:bg-ui-muted/10 disabled:opacity-50"
            :disabled="savingPlans"
            @click="saveDataPlans"
          >
            {{ savingPlans ? "Saving…" : "Save enabled plans" }}
          </button>
        </div>
      </div>

      <div class="ui-card overflow-hidden">
        <div class="border-b border-ui-border/40 px-5 py-3">
          <h3 class="text-sm font-semibold text-ui-text">
            {{ dataNetwork.toUpperCase() }} plans
            <span class="font-normal text-ui-muted">(tick to enable for agents)</span>
          </h3>
        </div>
        <div v-if="loadingCatalog" class="p-8 text-center text-sm text-ui-muted">Loading catalog…</div>
        <div v-else-if="!catalogPlans.length" class="p-8 text-center text-sm text-ui-muted">
          Load plans from VTpass for this network.
        </div>
        <ul v-else class="divide-y divide-ui-border/30 max-h-[28rem] overflow-y-auto">
          <li
            v-for="plan in catalogPlans"
            :key="plan.variation_code"
            class="flex items-center gap-3 px-5 py-3"
          >
            <input
              :id="`plan-${plan.variation_code}`"
              v-model="enabledPlanKeys"
              type="checkbox"
              class="h-4 w-4 rounded border-ui-border"
              :value="planKey(plan)"
            />
            <label :for="`plan-${plan.variation_code}`" class="min-w-0 flex-1 cursor-pointer">
              <p class="text-sm font-medium text-ui-text">{{ plan.name }}</p>
              <p class="text-xs text-ui-muted">
                {{ plan.variation_code }} · ₦{{ plan.amount.toLocaleString() }}
              </p>
            </label>
          </li>
        </ul>
      </div>

      <div class="ui-card overflow-hidden">
        <div class="border-b border-ui-border/40 px-5 py-3 flex items-center justify-between">
          <h3 class="text-sm font-semibold text-ui-text">Recent credits</h3>
          <button type="button" class="text-xs text-violet-600 hover:underline" @click="loadDataCredits">
            Refresh
          </button>
        </div>
        <div v-if="!dataCredits.length" class="p-6 text-center text-sm text-ui-muted">No credits yet.</div>
        <div v-else class="overflow-x-auto">
          <table class="w-full text-left text-sm">
            <thead>
              <tr class="border-b border-ui-border/30 text-xs uppercase text-ui-muted">
                <th class="px-4 py-2">Agent</th>
                <th class="px-4 py-2">Phone</th>
                <th class="px-4 py-2">Plan</th>
                <th class="px-4 py-2">Status</th>
                <th class="px-4 py-2">When</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-ui-border/30">
              <tr v-for="credit in dataCredits" :key="credit.id">
                <td class="px-4 py-2">
                  <p class="text-ui-text">{{ credit.agent_name || "—" }}</p>
                  <p class="text-xs text-ui-muted">{{ credit.agent_email || "—" }}</p>
                </td>
                <td class="px-4 py-2 text-ui-muted">{{ credit.phone || "—" }} · {{ credit.network || "—" }}</td>
                <td class="px-4 py-2">
                  <p class="text-ui-text">{{ credit.plan_name || "—" }}</p>
                  <p class="text-xs text-ui-muted">₦{{ (credit.amount ?? 0).toLocaleString() }}</p>
                </td>
                <td class="px-4 py-2">
                  <span
                    class="rounded-full px-2 py-0.5 text-xs font-semibold"
                    :class="creditStatusClass(credit.status)"
                  >
                    {{ credit.status || "unknown" }}
                  </span>
                </td>
                <td class="px-4 py-2 text-xs text-ui-muted">{{ formatWhen(credit.created_at) }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </section>

    <section v-else-if="activeTab === 'airtime'" class="space-y-4">
      <div class="ui-card p-5">
        <div class="flex flex-wrap items-start justify-between gap-4">
          <div class="min-w-0">
            <h2 class="font-semibold text-ui-text">Strict rule</h2>
            <p class="mt-1 text-xs text-ui-muted">
              When on, a phone number can claim airtime <strong>only once</strong>. Repeat attempts are blocked.
            </p>
          </div>
          <label class="inline-flex cursor-pointer items-center gap-2">
            <input
              type="checkbox"
              class="peer sr-only"
              :checked="appSettings.strict_one_airtime_claim_per_phone"
              :disabled="savingSettings"
              @change="saveAppSettings({ strict_one_airtime_claim_per_phone: ($event.target as HTMLInputElement).checked })"
            />
            <span
              class="relative h-6 w-11 rounded-full bg-ui-muted/30 transition peer-checked:bg-emerald-500 after:absolute after:left-0.5 after:top-0.5 after:h-5 after:w-5 after:rounded-full after:bg-white after:transition peer-checked:after:translate-x-5"
            />
            <span class="text-xs font-medium text-ui-text">
              {{ appSettings.strict_one_airtime_claim_per_phone ? "Active" : "Inactive" }}
            </span>
          </label>
        </div>
      </div>

      <div class="ui-card p-5">
        <div class="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 class="font-semibold text-ui-text">Agent airtime (VTpass)</h2>
            <p class="mt-1 text-xs text-ui-muted">
              Control which airtime amounts agents can buy. Tick to enable, then save.
            </p>
          </div>
          <div class="flex flex-col items-end gap-1.5">
            <span
              class="rounded-full px-2 py-1 text-xs font-semibold"
              :class="vtpassConfigured ? 'bg-emerald-500/15 text-emerald-600' : 'bg-amber-500/15 text-amber-600'"
            >
              {{ vtpassConfigured ? "VTpass configured" : "VTpass not configured" }}
            </span>
            <div class="flex items-center gap-2">
              <span class="text-xs text-ui-muted">Wallet</span>
              <span class="text-sm font-semibold text-ui-text">
                {{
                  loadingBalance
                    ? "…"
                    : vtpassBalance !== null
                      ? `₦${vtpassBalance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                      : "—"
                }}
              </span>
              <button
                type="button"
                class="text-[10px] uppercase tracking-wide text-sky-600 hover:underline"
                @click="loadVtpassBalance"
              >
                refresh
              </button>
            </div>
          </div>
        </div>

        <div class="mt-4 flex flex-wrap items-end gap-3">
          <label class="min-w-[160px]">
            <span class="text-xs text-ui-muted">Add amount (₦)</span>
            <input
              v-model.number="newAirtimeAmount"
              type="number"
              min="1"
              step="50"
              placeholder="e.g. 750"
              class="ui-input mt-1"
              @keyup.enter="addAirtimeAmount"
            />
          </label>
          <button
            type="button"
            class="rounded-lg border border-ui-border/50 px-4 py-2 text-sm hover:bg-ui-muted/10"
            @click="addAirtimeAmount"
          >
            Add amount
          </button>
          <button
            type="button"
            class="rounded-lg bg-amber-600 px-4 py-2 text-sm text-white hover:bg-amber-500 disabled:opacity-50"
            :disabled="savingAirtime"
            @click="saveAirtimeAmounts"
          >
            {{ savingAirtime ? "Saving…" : "Save amounts" }}
          </button>
        </div>
      </div>

      <div class="ui-card overflow-hidden">
        <div class="border-b border-ui-border/40 px-5 py-3">
          <h3 class="text-sm font-semibold text-ui-text">
            Airtime amounts
            <span class="font-normal text-ui-muted">(tick to enable for agents)</span>
          </h3>
        </div>
        <div v-if="loadingAirtime" class="p-8 text-center text-sm text-ui-muted">Loading amounts…</div>
        <div v-else-if="!airtimeAmounts.length" class="p-8 text-center text-sm text-ui-muted">
          No amounts yet. Add one above.
        </div>
        <ul v-else class="divide-y divide-ui-border/30 max-h-[28rem] overflow-y-auto">
          <li
            v-for="opt in airtimeAmounts"
            :key="opt.amount"
            class="flex items-center gap-3 px-5 py-3"
          >
            <input
              :id="`airtime-${opt.amount}`"
              v-model="opt.enabled"
              type="checkbox"
              class="h-4 w-4 rounded border-ui-border"
            />
            <label :for="`airtime-${opt.amount}`" class="min-w-0 flex-1 cursor-pointer">
              <p class="text-sm font-medium text-ui-text">₦{{ opt.amount.toLocaleString() }}</p>
              <p class="text-xs text-ui-muted">{{ opt.enabled ? "Enabled" : "Disabled" }}</p>
            </label>
            <button
              type="button"
              class="rounded-lg border border-red-500/40 px-2.5 py-1 text-xs text-red-600 hover:bg-red-500/10 dark:text-red-400"
              @click="removeAirtimeAmount(opt.amount)"
            >
              Remove
            </button>
          </li>
        </ul>
      </div>

      <div class="ui-card overflow-hidden">
        <div class="border-b border-ui-border/40 px-5 py-3 flex items-center justify-between">
          <h3 class="text-sm font-semibold text-ui-text">Recent airtime</h3>
          <button type="button" class="text-xs text-amber-600 hover:underline" @click="loadAirtimeCredits">
            Refresh
          </button>
        </div>
        <div v-if="!airtimeCredits.length" class="p-6 text-center text-sm text-ui-muted">No airtime yet.</div>
        <div v-else class="overflow-x-auto">
          <table class="w-full text-left text-sm">
            <thead>
              <tr class="border-b border-ui-border/30 text-xs uppercase text-ui-muted">
                <th class="px-4 py-2">Agent</th>
                <th class="px-4 py-2">Phone</th>
                <th class="px-4 py-2">Amount</th>
                <th class="px-4 py-2">Status</th>
                <th class="px-4 py-2">When</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-ui-border/30">
              <tr v-for="credit in airtimeCredits" :key="credit.id">
                <td class="px-4 py-2">
                  <p class="text-ui-text">{{ credit.agent_name || "—" }}</p>
                  <p class="text-xs text-ui-muted">{{ credit.agent_email || "—" }}</p>
                </td>
                <td class="px-4 py-2 text-ui-muted">{{ credit.phone || "—" }} · {{ credit.network || "—" }}</td>
                <td class="px-4 py-2 text-ui-text">₦{{ (credit.amount ?? 0).toLocaleString() }}</td>
                <td class="px-4 py-2">
                  <span
                    class="rounded-full px-2 py-0.5 text-xs font-semibold"
                    :class="creditStatusClass(credit.status)"
                  >
                    {{ credit.status || "unknown" }}
                  </span>
                </td>
                <td class="px-4 py-2 text-xs text-ui-muted">{{ formatWhen(credit.created_at) }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </section>

    <section v-else-if="activeTab === 'votes'" class="space-y-4">
      <div class="ui-card p-5">
        <div class="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 class="font-semibold text-ui-text">Vote results — simple overview</h2>
            <p class="mt-1 text-sm text-ui-muted">
              These numbers come from agents typing results at each polling unit. We also compare them with the people counted on site.
            </p>
          </div>
          <button
            type="button"
            class="rounded-lg border border-ui-border/50 px-3 py-1.5 text-xs hover:bg-ui-muted/10"
            :disabled="loadingVotes"
            @click="loadVoteResults"
          >
            {{ loadingVotes ? "Loading…" : "Refresh" }}
          </button>
        </div>

        <div v-if="loadingVotes && !voteSummary" class="mt-4 text-sm text-ui-muted">Loading vote results…</div>
        <template v-else-if="filteredVoteSummary">
          <div class="mt-4 rounded-lg border border-sky-500/20 bg-sky-500/5 p-4 text-sm leading-relaxed text-ui-text">
            {{ filteredVoteSummary.plain_summary }}
          </div>

          <div
            v-if="showStateScopeFilter && stateScopeFilter === 'all' && filteredVoteSummary.by_state?.length"
            class="mt-4 grid gap-3 sm:grid-cols-2"
          >
            <div
              v-for="st in filteredVoteSummary.by_state"
              :key="st.state"
              class="rounded-lg border border-ui-border/40 p-4"
            >
              <p class="text-[10px] uppercase tracking-wider text-ui-muted">{{ st.state }}</p>
              <p class="mt-1 text-2xl font-bold text-violet-600 dark:text-violet-400">
                {{ st.votes.toLocaleString() }}
              </p>
              <p class="mt-1 text-xs text-ui-muted">
                {{ st.unit_count }} unit(s) · {{ st.people_count.toLocaleString() }} people counted
              </p>
            </div>
          </div>

          <div class="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <div class="rounded-lg border border-ui-border/40 p-4">
              <p class="text-[10px] uppercase tracking-wider text-ui-muted">Total votes</p>
              <p class="mt-1 text-2xl font-bold text-violet-600 dark:text-violet-400">
                {{ filteredVoteSummary.total_votes.toLocaleString() }}
              </p>
            </div>
            <div class="rounded-lg border border-ui-border/40 p-4">
              <p class="text-[10px] uppercase tracking-wider text-ui-muted">Units with results</p>
              <p class="mt-1 text-2xl font-bold text-ui-text">{{ filteredVoteSummary.units_with_results.toLocaleString() }}</p>
            </div>
            <div class="rounded-lg border border-ui-border/40 p-4">
              <p class="text-[10px] uppercase tracking-wider text-ui-muted">People counted there</p>
              <p class="mt-1 text-2xl font-bold text-ui-text">{{ filteredVoteSummary.total_people_counted.toLocaleString() }}</p>
            </div>
            <div class="rounded-lg border border-ui-border/40 p-4">
              <p class="text-[10px] uppercase tracking-wider text-ui-muted">Votes vs people</p>
              <p class="mt-1 text-2xl font-bold text-ui-text">
                {{ filteredVoteSummary.overall_difference > 0 ? "+" : "" }}{{ filteredVoteSummary.overall_difference.toLocaleString() }}
              </p>
            </div>
          </div>
          <p class="mt-3 text-xs text-ui-muted">{{ filteredVoteSummary.overall_note }}</p>

          <div class="mt-5 grid gap-3 sm:grid-cols-2">
            <div class="rounded-lg border border-emerald-500/25 bg-emerald-500/5 p-4">
              <p class="text-xs font-semibold uppercase tracking-wider text-emerald-700 dark:text-emerald-400">Highest votes</p>
              <p v-if="filteredVoteSummary.highest_unit" class="mt-2 text-sm text-ui-text">
                Polling unit: <strong>{{ filteredVoteSummary.highest_unit.name }}</strong>
                ({{ filteredVoteSummary.highest_unit.state }}, {{ filteredVoteSummary.highest_unit.ward }}, {{ filteredVoteSummary.highest_unit.lga }}) —
                {{ filteredVoteSummary.highest_unit.votes.toLocaleString() }} votes
                vs {{ filteredVoteSummary.highest_unit.people_count.toLocaleString() }} people
              </p>
              <p v-if="filteredVoteSummary.highest_ward" class="mt-1 text-xs text-ui-muted">
                Highest ward: {{ filteredVoteSummary.highest_ward.label }} — {{ filteredVoteSummary.highest_ward.votes.toLocaleString() }} votes
              </p>
              <p v-if="filteredVoteSummary.highest_lga" class="mt-1 text-xs text-ui-muted">
                Highest LGA: {{ filteredVoteSummary.highest_lga.lga }}
                <span v-if="filteredVoteSummary.highest_lga.state">({{ filteredVoteSummary.highest_lga.state }})</span>
                — {{ filteredVoteSummary.highest_lga.votes.toLocaleString() }} votes
              </p>
            </div>
            <div class="rounded-lg border border-amber-500/25 bg-amber-500/5 p-4">
              <p class="text-xs font-semibold uppercase tracking-wider text-amber-700 dark:text-amber-400">Lowest votes</p>
              <p v-if="filteredVoteSummary.lowest_unit" class="mt-2 text-sm text-ui-text">
                Polling unit: <strong>{{ filteredVoteSummary.lowest_unit.name }}</strong>
                ({{ filteredVoteSummary.lowest_unit.state }}, {{ filteredVoteSummary.lowest_unit.ward }}, {{ filteredVoteSummary.lowest_unit.lga }}) —
                {{ filteredVoteSummary.lowest_unit.votes.toLocaleString() }} votes
                vs {{ filteredVoteSummary.lowest_unit.people_count.toLocaleString() }} people
              </p>
              <p v-if="filteredVoteSummary.lowest_ward" class="mt-1 text-xs text-ui-muted">
                Lowest ward: {{ filteredVoteSummary.lowest_ward.label }} — {{ filteredVoteSummary.lowest_ward.votes.toLocaleString() }} votes
              </p>
              <p v-if="filteredVoteSummary.lowest_lga" class="mt-1 text-xs text-ui-muted">
                Lowest LGA: {{ filteredVoteSummary.lowest_lga.lga }}
                <span v-if="filteredVoteSummary.lowest_lga.state">({{ filteredVoteSummary.lowest_lga.state }})</span>
                — {{ filteredVoteSummary.lowest_lga.votes.toLocaleString() }} votes
              </p>
            </div>
          </div>
        </template>
        <p v-else class="mt-4 text-sm text-ui-muted">No vote results yet.</p>
      </div>

      <div class="ui-card overflow-hidden">
        <div class="flex flex-wrap gap-2 border-b border-ui-border/40 px-5 py-3">
          <button
            v-for="opt in [
              { id: 'units', label: 'By polling unit' },
              { id: 'lgas', label: 'By local government' },
              { id: 'wards', label: 'By ward' },
            ] as const"
            :key="opt.id"
            type="button"
            class="rounded-lg px-3 py-1.5 text-xs font-medium transition"
            :class="voteDetailTab === opt.id ? 'bg-violet-600 text-white' : 'text-ui-muted hover:bg-ui-muted/10'"
            @click="voteDetailTab = opt.id"
          >
            {{ opt.label }}
          </button>
        </div>

        <div v-if="!filteredVoteSummary?.by_polling_unit?.length" class="p-8 text-center text-sm text-ui-muted">
          Waiting for agents to submit results.
        </div>

        <div v-else-if="voteDetailTab === 'units'" class="overflow-x-auto">
          <table class="w-full text-left text-sm">
            <thead>
              <tr class="border-b border-ui-border/30 text-xs uppercase text-ui-muted">
                <th class="px-4 py-2">Polling unit</th>
                <th class="px-4 py-2">State</th>
                <th class="px-4 py-2">Ward</th>
                <th class="px-4 py-2">LGA</th>
                <th class="px-4 py-2 text-right">Votes</th>
                <th class="px-4 py-2 text-right">People counted</th>
                <th class="px-4 py-2 text-right">Difference</th>
                <th class="px-4 py-2">What this means</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-ui-border/30">
              <tr v-for="row in filteredVoteSummary.by_polling_unit" :key="`${row.state}-${row.code}`">
                <td class="px-4 py-2">
                  <p class="font-medium text-ui-text">{{ row.name }}</p>
                  <p class="text-xs text-ui-muted">{{ row.code }}</p>
                </td>
                <td class="px-4 py-2 font-medium text-ui-text">{{ row.state || "—" }}</td>
                <td class="px-4 py-2 text-ui-muted">{{ row.ward || "—" }}</td>
                <td class="px-4 py-2 text-ui-muted">{{ row.lga || "—" }}</td>
                <td class="px-4 py-2 text-right font-semibold text-ui-text">{{ row.votes.toLocaleString() }}</td>
                <td class="px-4 py-2 text-right text-ui-muted">{{ row.people_count.toLocaleString() }}</td>
                <td class="px-4 py-2 text-right" :class="row.difference === 0 ? 'text-emerald-600' : 'text-amber-600'">
                  {{ row.difference > 0 ? "+" : "" }}{{ row.difference.toLocaleString() }}
                </td>
                <td class="px-4 py-2 text-xs text-ui-muted max-w-xs">{{ row.comparison_note }}</td>
              </tr>
            </tbody>
          </table>
        </div>

        <div v-else-if="voteDetailTab === 'lgas'" class="overflow-x-auto">
          <table class="w-full text-left text-sm">
            <thead>
              <tr class="border-b border-ui-border/30 text-xs uppercase text-ui-muted">
                <th class="px-4 py-2">State</th>
                <th class="px-4 py-2">Local government</th>
                <th class="px-4 py-2 text-right">Units</th>
                <th class="px-4 py-2 text-right">Votes</th>
                <th class="px-4 py-2 text-right">People counted</th>
                <th class="px-4 py-2 text-right">Difference</th>
                <th class="px-4 py-2">What this means</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-ui-border/30">
              <tr v-for="row in filteredVoteSummary.by_lga" :key="`${row.state}-${row.lga}`">
                <td class="px-4 py-2 font-medium text-ui-text">{{ row.state || "—" }}</td>
                <td class="px-4 py-2 font-medium text-ui-text">{{ row.lga }}</td>
                <td class="px-4 py-2 text-right text-ui-muted">{{ row.unit_count }}</td>
                <td class="px-4 py-2 text-right font-semibold text-ui-text">{{ row.votes.toLocaleString() }}</td>
                <td class="px-4 py-2 text-right text-ui-muted">{{ row.people_count.toLocaleString() }}</td>
                <td class="px-4 py-2 text-right" :class="row.difference === 0 ? 'text-emerald-600' : 'text-amber-600'">
                  {{ row.difference > 0 ? "+" : "" }}{{ row.difference.toLocaleString() }}
                </td>
                <td class="px-4 py-2 text-xs text-ui-muted max-w-xs">{{ row.comparison_note }}</td>
              </tr>
            </tbody>
          </table>
        </div>

        <div v-else class="overflow-x-auto">
          <table class="w-full text-left text-sm">
            <thead>
              <tr class="border-b border-ui-border/30 text-xs uppercase text-ui-muted">
                <th class="px-4 py-2">State</th>
                <th class="px-4 py-2">Ward</th>
                <th class="px-4 py-2">LGA</th>
                <th class="px-4 py-2 text-right">Units</th>
                <th class="px-4 py-2 text-right">Votes</th>
                <th class="px-4 py-2 text-right">People counted</th>
                <th class="px-4 py-2 text-right">Difference</th>
                <th class="px-4 py-2">What this means</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-ui-border/30">
              <tr v-for="row in filteredVoteSummary.by_ward" :key="`${row.state}-${row.label}`">
                <td class="px-4 py-2 font-medium text-ui-text">{{ row.state || "—" }}</td>
                <td class="px-4 py-2 font-medium text-ui-text">{{ row.ward }}</td>
                <td class="px-4 py-2 text-ui-muted">{{ row.lga }}</td>
                <td class="px-4 py-2 text-right text-ui-muted">{{ row.unit_count }}</td>
                <td class="px-4 py-2 text-right font-semibold text-ui-text">{{ row.votes.toLocaleString() }}</td>
                <td class="px-4 py-2 text-right text-ui-muted">{{ row.people_count.toLocaleString() }}</td>
                <td class="px-4 py-2 text-right" :class="row.difference === 0 ? 'text-emerald-600' : 'text-amber-600'">
                  {{ row.difference > 0 ? "+" : "" }}{{ row.difference.toLocaleString() }}
                </td>
                <td class="px-4 py-2 text-xs text-ui-muted max-w-xs">{{ row.comparison_note }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <div class="ui-card overflow-hidden">
        <div class="flex flex-wrap items-start justify-between gap-3 border-b border-ui-border/40 px-5 py-4">
          <div>
            <h2 class="font-semibold text-ui-text">EC8A result sheets (photo evidence)</h2>
            <p class="mt-1 text-xs text-ui-muted">
              Immutable, timestamped photos agents captured at each unit. Enter the official
              figure (from IReV or collation) as you confirm it — the difference is flagged
              automatically.
            </p>
          </div>
          <button
            type="button"
            class="rounded-lg border border-ui-border/50 px-3 py-1.5 text-xs hover:bg-ui-muted/10"
            :disabled="loadingResultSheets"
            @click="loadResultSheets"
          >
            {{ loadingResultSheets ? "Loading…" : "Refresh" }}
          </button>
        </div>

        <div v-if="!resultSheets.length" class="p-8 text-center text-sm text-ui-muted">
          No result sheets submitted yet.
        </div>
        <ul v-else class="divide-y divide-ui-border/30">
          <li
            v-for="row in resultSheets"
            :key="row.id"
            class="flex flex-wrap items-start justify-between gap-4 px-5 py-4"
          >
            <div class="min-w-0 flex-1">
              <p class="text-sm font-medium text-ui-text">
                {{ row.polling_unit_name }}
                <span
                  v-if="row.version > 1"
                  class="ml-1 rounded-full bg-amber-500/15 px-2 py-0.5 text-[10px] font-semibold text-amber-700"
                >
                  Correction #{{ row.version }}
                </span>
                <span
                  v-if="row.over_accreditation"
                  class="ml-1 rounded-full bg-red-500/15 px-2 py-0.5 text-[10px] font-semibold text-red-600"
                >
                  Over-voting?
                </span>
              </p>
              <p class="text-xs text-ui-muted">{{ row.code }} · {{ row.state }} · {{ row.ward }}, {{ row.lga }}</p>
              <p class="mt-1 text-xs text-ui-muted">
                Votes: <span class="font-semibold text-ui-text">{{ row.votes.toLocaleString() }}</span>
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
                :class="row.official_diff ? 'text-red-600' : 'text-emerald-600'"
              >
                {{ row.discrepancy_note }}
              </p>
              <p class="mt-0.5 text-[10px] text-ui-muted">
                Captured {{ formatWhen(row.received_at) }}
                <span v-if="row.captured_lat !== null"> · GPS logged</span>
                · Hash {{ row.sha256.slice(0, 10) }}…
              </p>
            </div>
            <div class="flex flex-col items-end gap-2">
              <button
                type="button"
                class="rounded-lg border border-ui-border/40 px-3 py-1.5 text-xs text-ui-text hover:bg-ui-elevated/40"
                @click="viewAdminResultSheetPhoto(row)"
              >
                View photo
              </button>
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
</template>

<script setup lang="ts">
import { feedSnapImageUrl, groupSnapsByLgaAndWard } from "~/composables/useFeedSnaps";
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

definePageMeta({ layout: "default" });

const router = useRouter();
const { admin, authHeaders, requireAdmin, clear, apiBase, refreshMe, canAccessTab } =
  useAdminAuth();
const { lgas, loadLgas } = useOgunGeo();

const ALL_TABS = [
  { id: "overview", label: "Overview" },
  { id: "feeds", label: "Live feeds" },
  { id: "snaps", label: "Pictures" },
  { id: "recordings", label: "Recordings" },
  { id: "agents", label: "Agents" },
  { id: "votes", label: "Vote results" },
  { id: "data", label: "Data plans" },
  { id: "airtime", label: "Airtime" },
] as const;

type TabId = (typeof ALL_TABS)[number]["id"];

const visibleTabs = computed(() => ALL_TABS.filter((tab) => canAccessTab(tab.id)));

const activeTab = ref<TabId>("overview");
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
const message = ref("");
const actionError = ref("");

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
const officialFigureDrafts = reactive<Record<string, number | null>>({});
const savingOfficialFigure = ref<string | null>(null);
const stateScopeFilter = ref<"all" | "Ogun State" | "Osun State">("all");

const showStateScopeFilter = computed(
  () => (admin.value?.role || "super_admin") === "super_admin",
);

const stateScopeFilters = [
  { id: "all" as const, label: "All states" },
  { id: "Ogun State" as const, label: "Ogun only" },
  { id: "Osun State" as const, label: "Osun only" },
];

function matchesStateScope(state: string | null | undefined) {
  if (!showStateScopeFilter.value || stateScopeFilter.value === "all") return true;
  return (state || "").trim() === stateScopeFilter.value;
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

const snapsByLga = computed(() => groupSnapsByLgaAndWard(scopedSnaps.value));

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
  const states = ["Ogun State", "Osun State"] as const;
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

onMounted(async () => {
  if (!requireAdmin()) return;
  await refreshMe();
  if (!canAccessTab(activeTab.value) && visibleTabs.value.length) {
    activeTab.value = visibleTabs.value[0].id;
  }
  await loadLgas();
  await Promise.all([loadOverview(), loadUnits(), loadSnaps(), loadAgents()]);
});

watch(activeTab, async (tab) => {
  if (tab === "feeds" && !units.value.length) loadUnits();
  if (tab === "snaps" && !snaps.value.length) loadSnaps();
  if (tab === "recordings") loadRecordings();
  if (tab === "agents" && !agents.value.length) loadAgents();
  if (tab === "votes") {
    loadVoteResults();
    loadResultSheets();
    if (admin.value?.role === "super_admin") {
      loadAppSettings();
      loadIrevStatus();
    }
  }
  if (tab === "data") {
    await loadVtpassStatus();
    await loadVtpassBalance();
    await loadSavedPlans();
    await loadDataCredits();
    await loadAppSettings();
  }
  if (tab === "airtime") {
    await loadVtpassStatus();
    await loadVtpassBalance();
    await loadAirtimeAmounts();
    await loadAirtimeCredits();
    await loadAppSettings();
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
  const tasks = [loadVoteResults(), loadResultSheets()];
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
  } catch {
    // keep defaults
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

async function deleteSnap(id: string) {
  if (!confirm("Delete this saved picture?")) return;
  clearFeedback();
  try {
    await $fetch(`${apiBase}/admin/feed-snaps/${id}`, { method: "DELETE", headers: authHeaders() });
    message.value = "Picture deleted.";
    await loadSnaps();
    await loadOverview();
  } catch {
    actionError.value = "Failed to delete picture.";
  }
}
</script>
