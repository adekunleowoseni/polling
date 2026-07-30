<template>
  <div class="mx-auto max-w-5xl space-y-6 p-4 sm:p-6">
    <header class="flex flex-wrap items-start justify-between gap-4">
      <div class="flex items-center gap-4">
        <BrandLogos size="sm" :show-divider="false" />
        <div>
          <h1 class="text-xl font-semibold text-ui-text">Agent dashboard</h1>
          <p v-if="agent" class="mt-1 text-sm text-ui-muted">{{ agent.name }}</p>
          <span
            v-if="agent?.lga && agent?.ward"
            class="mt-2 inline-flex items-center rounded-full bg-emerald-500/15 px-2.5 py-0.5 text-xs font-medium text-emerald-700 dark:text-emerald-300"
          >
            {{ agent.ward }} · {{ agent.lga }}
          </span>
          <span
            v-else-if="agent"
            class="mt-2 inline-flex items-center rounded-full bg-amber-500/15 px-2.5 py-0.5 text-xs font-medium text-amber-700 dark:text-amber-300"
          >
            No LGA/ward assigned — contact admin
          </span>
        </div>
      </div>
      <button
        type="button"
        class="rounded-lg border border-ui-border/50 px-3 py-1.5 text-sm text-ui-muted transition hover:bg-ui-muted/10 hover:text-ui-text"
        @click="logout"
      >
        Sign out
      </button>
    </header>

    <section class="grid grid-cols-2 gap-3 sm:grid-cols-4">
      <div
        v-for="stat in dashboardStats"
        :key="stat.label"
        class="ui-card p-4"
      >
        <p class="text-[10px] font-semibold uppercase tracking-wider text-ui-muted sm:text-xs">
          {{ stat.label }}
        </p>
        <p class="mt-1 text-2xl font-bold" :class="stat.valueClass">
          {{ stat.value }}
        </p>
        <p v-if="stat.hint" class="mt-0.5 text-[10px] text-ui-muted sm:text-xs">{{ stat.hint }}</p>
      </div>
    </section>

    <nav class="flex flex-wrap gap-2 border-b border-ui-border/40 pb-3">
      <button
        v-for="tab in tabsWithBadges"
        :key="tab.id"
        type="button"
        class="rounded-lg px-3 py-1.5 text-sm transition"
        :class="activeTab === tab.id
          ? 'bg-sky-600 text-white'
          : 'text-ui-muted hover:bg-ui-muted/10 hover:text-ui-text'"
        @click="activeTab = tab.id"
      >
        {{ tab.label }}
        <span
          v-if="tab.badge"
          class="ml-1.5 rounded-full px-1.5 py-0.5 text-[10px] font-semibold"
          :class="activeTab === tab.id ? 'bg-white/20' : 'bg-ui-muted/15'"
        >
          {{ tab.badge }}
        </span>
      </button>
    </nav>

    <!-- Units -->
    <section v-if="activeTab === 'units'" class="space-y-4">
      <div class="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 class="font-semibold text-ui-text">Your polling units</h2>
          <p class="text-xs text-ui-muted">Stream live feeds and manage people counts.</p>
        </div>
        <button
          type="button"
          class="rounded-lg border border-ui-border/50 px-3 py-1.5 text-xs hover:bg-ui-muted/10"
          :disabled="loading"
          @click="loadUnits"
        >
          Refresh
        </button>
      </div>

      <div v-if="loading" class="ui-card p-10 text-center text-sm text-ui-muted">Loading units…</div>

      <div
        v-else-if="!units.length"
        class="ui-card flex flex-col items-center gap-4 p-10 text-center"
      >
        <div class="flex h-14 w-14 items-center justify-center rounded-2xl bg-sky-500/10 text-2xl">📍</div>
        <div>
          <p class="font-medium text-ui-text">No polling units yet</p>
          <p class="mt-1 text-sm text-ui-muted">Register your first unit to start streaming.</p>
        </div>
        <button
          type="button"
          class="rounded-lg bg-emerald-600 px-4 py-2 text-sm text-white hover:bg-emerald-500"
          @click="activeTab = 'register'"
        >
          Register polling unit
        </button>
      </div>

      <div v-else class="grid gap-4 sm:grid-cols-2">
        <article
          v-for="unit in units"
          :key="unit.id"
          class="ui-card overflow-hidden"
        >
          <div class="border-b border-ui-border/40 px-4 py-3 flex items-center justify-between gap-2">
            <span
              class="rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide"
              :class="unit.stream_status === 'live'
                ? 'bg-red-500/15 text-red-600 dark:text-red-400'
                : 'bg-ui-elevated text-ui-muted'"
            >
              {{ unit.stream_status === 'live' ? '● Live' : 'Offline' }}
            </span>
            <span class="truncate text-[10px] font-mono text-ui-muted">{{ unit.code }}</span>
          </div>

          <div class="p-4">
            <h3 class="font-semibold text-ui-text">{{ unit.name }}</h3>
            <p class="mt-1 text-xs text-ui-muted">
              {{ unit.ward }} · {{ unit.lga }}
            </p>

            <dl class="mt-4 grid grid-cols-2 gap-3">
              <div class="rounded-lg bg-ui-elevated/50 px-3 py-2">
                <dt class="text-[10px] uppercase tracking-wider text-ui-muted">People</dt>
                <dd class="text-xl font-bold text-emerald-600 dark:text-emerald-400">
                  {{ unit.people_count }}
                </dd>
              </div>
              <div class="rounded-lg bg-ui-elevated/50 px-3 py-2">
                <dt class="text-[10px] uppercase tracking-wider text-ui-muted">Peak</dt>
                <dd class="text-xl font-bold text-ui-text">{{ unit.peak_people_count }}</dd>
              </div>
            </dl>

            <div class="mt-4 flex flex-wrap gap-2">
              <NuxtLink
                :to="`/relay/${unit.code}`"
                class="inline-flex flex-1 items-center justify-center rounded-lg bg-sky-600 px-3 py-2 text-sm font-medium text-white hover:bg-sky-500"
              >
                {{ unit.stream_status === 'live' ? 'Open stream' : 'Start stream' }}
              </NuxtLink>
              <button
                type="button"
                class="rounded-lg border border-ui-border/50 px-3 py-2 text-xs hover:bg-ui-muted/10"
                @click="toggleToken(unit.code)"
              >
                {{ visibleTokens.has(unit.code) ? 'Hide token' : 'Show token' }}
              </button>
            </div>

            <p
              v-if="visibleTokens.has(unit.code)"
              class="mt-3 break-all rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 font-mono text-[10px] text-amber-800 dark:text-amber-200"
            >
              {{ unit.ingest_token }}
            </p>

            <div
              v-if="editingCode === unit.code"
              class="mt-3 flex flex-wrap items-end gap-2 rounded-lg border border-ui-border/40 bg-ui-elevated/30 p-3"
            >
              <label class="min-w-[100px] flex-1">
                <span class="text-xs text-ui-muted">Correct count</span>
                <input
                  v-model.number="editCount"
                  type="number"
                  min="0"
                  class="ui-input mt-1"
                />
              </label>
              <button
                type="button"
                class="rounded-lg bg-emerald-600 px-3 py-2 text-xs text-white hover:bg-emerald-500 disabled:opacity-50"
                :disabled="savingEdit"
                @click="saveUnitCount(unit.code)"
              >
                {{ savingEdit ? 'Saving…' : 'Save' }}
              </button>
              <button
                type="button"
                class="rounded-lg px-3 py-2 text-xs text-ui-muted hover:text-ui-text"
                @click="editingCode = null"
              >
                Cancel
              </button>
            </div>
            <button
              v-else
              type="button"
              class="mt-3 text-xs text-ui-muted hover:text-emerald-600 dark:hover:text-emerald-400"
              @click="startEditCount(unit)"
            >
              Correct unique people count
            </button>
          </div>
        </article>
      </div>
    </section>

    <!-- Register -->
    <section v-else-if="activeTab === 'register'" class="ui-card overflow-hidden">
      <div class="border-b border-ui-border/40 px-5 py-4">
        <h2 class="font-semibold text-ui-text">Register polling unit</h2>
        <p class="mt-1 text-xs text-ui-muted">
          <template v-if="agent?.lga && agent?.ward">
            Select a unit in your assigned area: {{ agent.ward }}, {{ agent.lga }}.
          </template>
          <template v-else>
            Select LGA, ward, then polling unit — no typing required.
          </template>
        </p>
      </div>

      <form class="space-y-4 p-5" @submit.prevent="createUnit">
        <div class="grid gap-4 sm:grid-cols-2">
          <label class="block sm:col-span-2">
            <span class="text-xs text-ui-muted">State</span>
            <select v-model="form.state" class="ui-input mt-1" disabled>
              <option value="Ogun State">Ogun State</option>
            </select>
          </label>

          <label class="block">
            <span class="text-xs text-ui-muted">Local Government Area (LGA)</span>
            <select
              v-model="form.lga"
              required
              class="ui-input mt-1"
              :disabled="loadingLgas || !lgas.length || locationLocked"
              @change="onLgaChange"
            >
              <option value="" disabled>{{ loadingLgas ? 'Loading LGAs…' : 'Select LGA' }}</option>
              <option v-for="lga in lgas" :key="lga" :value="lga">{{ lga }}</option>
            </select>
          </label>

          <label class="block">
            <span class="text-xs text-ui-muted">Ward</span>
            <select
              v-model="form.ward"
              required
              class="ui-input mt-1"
              :disabled="!form.lga || loadingWards || !wards.length || locationLocked"
              @change="onWardChange"
            >
              <option value="" disabled>
                {{ !form.lga ? 'Select LGA first' : loadingWards ? 'Loading wards…' : 'Select ward' }}
              </option>
              <option v-for="ward in wards" :key="ward" :value="ward">{{ ward }}</option>
            </select>
          </label>

          <label class="block sm:col-span-2">
            <span class="text-xs text-ui-muted">Polling unit</span>
            <select
              v-model="form.pu_code"
              required
              class="ui-input mt-1"
              :disabled="!form.ward || loadingPollingUnits || !pollingUnits.length"
            >
              <option value="" disabled>
                {{
                  !form.ward
                    ? 'Select ward first'
                    : loadingPollingUnits
                      ? 'Loading polling units…'
                      : 'Select polling unit'
                }}
              </option>
              <option v-for="pu in pollingUnits" :key="pu.code" :value="pu.code">
                {{ pu.code }} — {{ pu.name }}
              </option>
            </select>
          </label>

          <label class="block">
            <span class="text-xs text-ui-muted">Device</span>
            <select v-model="form.device_type" class="ui-input mt-1">
              <option value="meta_rayban">Meta Ray-Ban AI Glasses</option>
              <option value="phone_camera">Phone camera (testing)</option>
            </select>
          </label>

          <div v-if="previewCode" class="flex items-end">
            <div class="rounded-lg border border-ui-border/40 bg-ui-elevated/30 px-3 py-2">
              <p class="text-[10px] uppercase tracking-wider text-ui-muted">Unit code</p>
              <p class="font-mono text-sm font-medium text-ui-text">{{ previewCode }}</p>
            </div>
          </div>
        </div>

        <button
          type="submit"
          class="rounded-lg bg-emerald-600 px-4 py-2 text-sm text-white hover:bg-emerald-500 disabled:opacity-50"
          :disabled="creating || !form.lga || !form.ward || !form.pu_code"
        >
          {{ creating ? 'Creating…' : 'Register polling unit' }}
        </button>
        <p v-if="createError" class="text-sm text-red-500">{{ createError }}</p>
      </form>

      <div
        v-if="newUnit"
        class="mx-5 mb-5 rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 text-sm"
      >
        <p class="font-medium text-amber-800 dark:text-amber-200">Save your ingest token — shown once</p>
        <p class="mt-2 break-all font-mono text-xs text-amber-900 dark:text-amber-100">
          {{ newUnit.ingest_token }}
        </p>
        <NuxtLink
          :to="`/relay/${newUnit.code}?token=${newUnit.ingest_token}`"
          class="mt-3 inline-flex rounded-lg bg-sky-600 px-4 py-2 text-sm text-white hover:bg-sky-500"
        >
          Start streaming →
        </NuxtLink>
      </div>
    </section>

    <!-- Accreditation -->
    <section v-else-if="activeTab === 'accreditation'" class="space-y-4">
      <div class="ui-card overflow-hidden">
        <div class="border-b border-ui-border/40 px-5 py-4">
          <h2 class="font-semibold text-ui-text">Party accreditation</h2>
          <p class="mt-1 text-xs text-ui-muted">
            Upload your INEC/party accreditation document (appointment letter as a polling
            agent). An admin must approve this before you can submit result sheets — an
            unaccredited monitor is a weaker witness if this ever goes to a tribunal.
          </p>
        </div>
        <div class="p-5">
          <div class="mb-4 flex items-center gap-2">
            <span class="text-xs text-ui-muted">Status:</span>
            <span
              class="rounded-full px-2 py-0.5 text-xs font-semibold"
              :class="accreditationStatusClass(accreditation.accreditation_status)"
            >
              {{ accreditationStatusLabel(accreditation.accreditation_status) }}
            </span>
          </div>
          <p v-if="accreditation.accreditation_status === 'rejected' && accreditation.rejection_reason" class="mb-4 rounded-lg border border-red-500/30 bg-red-500/5 p-3 text-xs text-red-600">
            Rejected: {{ accreditation.rejection_reason }}
          </p>

          <form class="space-y-4" @submit.prevent="submitAccreditation">
            <div class="grid gap-4 sm:grid-cols-2">
              <label class="block">
                <span class="text-xs text-ui-muted">Accreditation number (optional)</span>
                <input v-model.trim="accreditationForm.accreditation_number" type="text" class="ui-input mt-1" />
              </label>
              <label class="block">
                <span class="text-xs text-ui-muted">Party</span>
                <input v-model.trim="accreditationForm.party_name" type="text" placeholder="e.g. PDP" class="ui-input mt-1" />
              </label>
              <label class="flex items-center gap-2 sm:col-span-2">
                <input v-model="accreditationForm.is_ec8a_signatory" type="checkbox" class="h-4 w-4" />
                <span class="text-xs text-ui-text">I am one of the signatories on the physical EC8A form for my unit</span>
              </label>
              <label class="block sm:col-span-2">
                <span class="text-xs text-ui-muted">Accreditation document (photo or PDF)</span>
                <input
                  ref="accreditationFileInput"
                  type="file"
                  accept="image/*,application/pdf"
                  required
                  class="mt-1 block w-full text-sm text-ui-muted"
                  @change="onSelectAccreditationDoc"
                />
              </label>
            </div>
            <button
              type="submit"
              class="rounded-lg bg-emerald-600 px-4 py-2 text-sm text-white hover:bg-emerald-500 disabled:opacity-50"
              :disabled="savingAccreditation || !accreditationDoc"
            >
              {{ savingAccreditation ? "Uploading…" : "Submit for approval" }}
            </button>
            <p v-if="accreditationMessage" class="text-sm text-emerald-600 dark:text-emerald-400">{{ accreditationMessage }}</p>
            <p v-if="accreditationError" class="text-sm text-red-500">{{ accreditationError }}</p>
          </form>
        </div>
      </div>
    </section>

    <!-- Data credit -->
    <section v-else-if="activeTab === 'data'" class="space-y-4">
      <div class="grid gap-4 sm:grid-cols-3">
        <div class="ui-card p-4 sm:col-span-1">
          <p class="text-xs uppercase tracking-wider text-ui-muted">Claim allowance</p>
          <template v-if="dataQuota">
            <p class="mt-2 text-3xl font-bold text-violet-600 dark:text-violet-400">
              {{ dataQuota.data_claims_remaining }}
            </p>
            <p class="mt-1 text-xs text-ui-muted">
              remaining · used {{ dataQuota.data_claims_used }} of {{ dataQuota.data_claim_limit }}
            </p>
          </template>
          <p v-else class="mt-2 text-sm text-ui-muted">Loading…</p>
        </div>

        <div class="ui-card overflow-hidden sm:col-span-2">
          <div class="border-b border-ui-border/40 px-5 py-4">
            <h2 class="font-semibold text-ui-text">Claim data</h2>
            <p class="mt-1 text-xs text-ui-muted">
              Enter your phone; network is detected automatically. Only admin-enabled plans are available.
            </p>
          </div>

          <form class="space-y-4 p-5" @submit.prevent="creditData">
            <div class="grid gap-4 sm:grid-cols-2">
              <label class="block sm:col-span-2">
                <span class="text-xs text-ui-muted">Phone number</span>
                <input
                  v-model="dataForm.phone"
                  type="tel"
                  required
                  placeholder="08012345678"
                  class="ui-input mt-1"
                />
              </label>

              <div class="block">
                <span class="text-xs text-ui-muted">Network</span>
                <div v-if="!showDataNetworkPicker" class="ui-input mt-1 flex items-center gap-2">
                  <template v-if="dataForm.network">
                    <img
                      :src="networkIcon(dataForm.network) || ''"
                      :alt="networkLabel(dataForm.network)"
                      class="h-5 w-auto rounded-sm"
                    />
                    <span class="text-sm text-ui-text">{{ networkLabel(dataForm.network) }}</span>
                    <span class="text-[10px] uppercase tracking-wide text-ui-muted">auto</span>
                  </template>
                  <span v-else class="text-sm text-ui-muted">Enter phone to detect</span>
                  <button
                    type="button"
                    class="ml-auto text-[10px] uppercase tracking-wide text-sky-600 hover:underline"
                    @click="showDataNetworkPicker = true"
                  >
                    change
                  </button>
                </div>
                <select
                  v-else
                  v-model="dataForm.network"
                  class="ui-input mt-1"
                  @change="onDataManualNetwork"
                >
                  <option value="" disabled>Select network</option>
                  <option value="mtn">MTN</option>
                  <option value="airtel">Airtel</option>
                  <option value="glo">Glo</option>
                  <option value="9mobile">9mobile</option>
                </select>
              </div>

              <label class="block">
                <span class="text-xs text-ui-muted">Data plan</span>
                <select
                  v-model="dataForm.variation_code"
                  required
                  class="ui-input mt-1"
                  :disabled="!dataForm.network || !agentDataPlans.length"
                >
                  <option value="" disabled>
                    {{
                      !dataForm.network
                        ? 'Select network first'
                        : loadingDataPlans
                          ? 'Loading plans…'
                          : agentDataPlans.length
                            ? 'Select plan'
                            : 'No plans enabled'
                    }}
                  </option>
                  <option
                    v-for="plan in agentDataPlans"
                    :key="plan.variation_code"
                    :value="plan.variation_code"
                  >
                    {{ plan.name }} — ₦{{ plan.amount.toLocaleString() }}
                  </option>
                </select>
              </label>
            </div>

            <button
              type="submit"
              class="rounded-lg bg-violet-600 px-4 py-2 text-sm text-white hover:bg-violet-500 disabled:opacity-50"
              :disabled="
                creditingData
                  || !dataForm.phone
                  || !dataForm.network
                  || !dataForm.variation_code
                  || (dataQuota !== null && dataQuota.data_claims_remaining <= 0)
              "
            >
              {{
                dataQuota && dataQuota.data_claims_remaining <= 0
                  ? 'No claims left'
                  : creditingData
                    ? 'Crediting…'
                    : 'Credit data'
              }}
            </button>
            <p v-if="dataMessage" class="text-sm text-emerald-600 dark:text-emerald-400">{{ dataMessage }}</p>
            <p v-if="dataError" class="text-sm text-red-500">{{ dataError }}</p>
          </form>
        </div>
      </div>

      <div class="ui-card overflow-hidden">
        <div class="border-b border-ui-border/40 px-5 py-3">
          <h3 class="text-sm font-semibold text-ui-text">Claim history</h3>
        </div>
        <div v-if="!dataCredits.length" class="p-8 text-center text-sm text-ui-muted">
          No data credits claimed yet.
        </div>
        <ul v-else class="divide-y divide-ui-border/30">
          <li
            v-for="credit in dataCredits"
            :key="credit.id"
            class="flex flex-wrap items-center justify-between gap-3 px-5 py-3"
          >
            <div>
              <p class="text-sm font-medium text-ui-text">{{ credit.plan_name }}</p>
              <p class="text-xs text-ui-muted">
                {{ credit.phone }} · {{ credit.network }} · ₦{{ credit.amount.toLocaleString() }}
              </p>
              <p class="mt-0.5 text-[10px] text-ui-muted">{{ formatWhen(credit.created_at) }}</p>
            </div>
            <span
              class="rounded-full px-2 py-0.5 text-xs font-semibold"
              :class="creditStatusClass(credit.status)"
            >
              {{ credit.status || 'unknown' }}
            </span>
          </li>
        </ul>
      </div>
    </section>

    <!-- Airtime -->
    <section v-else-if="activeTab === 'airtime'" class="space-y-4">
      <div class="grid gap-4 sm:grid-cols-3">
        <div class="ui-card p-4 sm:col-span-1">
          <p class="text-xs uppercase tracking-wider text-ui-muted">Claim allowance</p>
          <template v-if="airtimeQuota">
            <p class="mt-2 text-3xl font-bold text-amber-600 dark:text-amber-400">
              {{ airtimeQuota.airtime_claims_remaining }}
            </p>
            <p class="mt-1 text-xs text-ui-muted">
              remaining · used {{ airtimeQuota.airtime_claims_used }} of {{ airtimeQuota.airtime_claim_limit }}
            </p>
          </template>
          <p v-else class="mt-2 text-sm text-ui-muted">Loading…</p>
        </div>

        <div class="ui-card overflow-hidden sm:col-span-2">
          <div class="border-b border-ui-border/40 px-5 py-4">
            <h2 class="font-semibold text-ui-text">Claim airtime</h2>
            <p class="mt-1 text-xs text-ui-muted">
              Enter phone; network is detected automatically. Only admin-enabled amounts are available.
            </p>
          </div>

          <form class="space-y-4 p-5" @submit.prevent="creditAirtime">
            <div class="grid gap-4 sm:grid-cols-2">
              <label class="block sm:col-span-2">
                <span class="text-xs text-ui-muted">Phone number</span>
                <input
                  v-model="airtimeForm.phone"
                  type="tel"
                  required
                  placeholder="08012345678"
                  class="ui-input mt-1"
                />
              </label>

              <div class="block">
                <span class="text-xs text-ui-muted">Network</span>
                <div v-if="!showAirtimeNetworkPicker" class="ui-input mt-1 flex items-center gap-2">
                  <template v-if="airtimeForm.network">
                    <img
                      :src="networkIcon(airtimeForm.network) || ''"
                      :alt="networkLabel(airtimeForm.network)"
                      class="h-5 w-auto rounded-sm"
                    />
                    <span class="text-sm text-ui-text">{{ networkLabel(airtimeForm.network) }}</span>
                    <span class="text-[10px] uppercase tracking-wide text-ui-muted">auto</span>
                  </template>
                  <span v-else class="text-sm text-ui-muted">Enter phone to detect</span>
                  <button
                    type="button"
                    class="ml-auto text-[10px] uppercase tracking-wide text-sky-600 hover:underline"
                    @click="showAirtimeNetworkPicker = true"
                  >
                    change
                  </button>
                </div>
                <select
                  v-else
                  v-model="airtimeForm.network"
                  class="ui-input mt-1"
                  @change="onAirtimeManualNetwork"
                >
                  <option value="" disabled>Select network</option>
                  <option value="mtn">MTN</option>
                  <option value="airtel">Airtel</option>
                  <option value="glo">Glo</option>
                  <option value="9mobile">9mobile</option>
                </select>
              </div>

              <label class="block">
                <span class="text-xs text-ui-muted">Amount</span>
                <select
                  v-model.number="airtimeForm.amount"
                  required
                  class="ui-input mt-1"
                  :disabled="!airtimeAmounts.length"
                >
                  <option :value="0" disabled>
                    {{ airtimeAmounts.length ? 'Select amount' : 'No amounts enabled' }}
                  </option>
                  <option
                    v-for="opt in airtimeAmounts"
                    :key="opt.amount"
                    :value="opt.amount"
                  >
                    ₦{{ opt.amount.toLocaleString() }}
                  </option>
                </select>
              </label>
            </div>

            <button
              type="submit"
              class="rounded-lg bg-amber-600 px-4 py-2 text-sm text-white hover:bg-amber-500 disabled:opacity-50"
              :disabled="
                creditingAirtime
                  || !airtimeForm.phone
                  || !airtimeForm.network
                  || !airtimeForm.amount
                  || (airtimeQuota !== null && airtimeQuota.airtime_claims_remaining <= 0)
              "
            >
              {{
                airtimeQuota && airtimeQuota.airtime_claims_remaining <= 0
                  ? 'No claims left'
                  : creditingAirtime
                    ? 'Claiming…'
                    : 'Claim airtime'
              }}
            </button>
            <p v-if="airtimeMessage" class="text-sm text-emerald-600 dark:text-emerald-400">{{ airtimeMessage }}</p>
            <p v-if="airtimeError" class="text-sm text-red-500">{{ airtimeError }}</p>
          </form>
        </div>
      </div>

      <div class="ui-card overflow-hidden">
        <div class="border-b border-ui-border/40 px-5 py-3">
          <h3 class="text-sm font-semibold text-ui-text">Claim history</h3>
        </div>
        <div v-if="!airtimeCredits.length" class="p-8 text-center text-sm text-ui-muted">
          No airtime claimed yet.
        </div>
        <ul v-else class="divide-y divide-ui-border/30">
          <li
            v-for="credit in airtimeCredits"
            :key="credit.id"
            class="flex flex-wrap items-center justify-between gap-3 px-5 py-3"
          >
            <div>
              <p class="text-sm font-medium text-ui-text">₦{{ credit.amount.toLocaleString() }} airtime</p>
              <p class="text-xs text-ui-muted">{{ credit.phone }} · {{ credit.network }}</p>
              <p class="mt-0.5 text-[10px] text-ui-muted">{{ formatWhen(credit.created_at) }}</p>
            </div>
            <span
              class="rounded-full px-2 py-0.5 text-xs font-semibold"
              :class="creditStatusClass(credit.status)"
            >
              {{ credit.status || 'unknown' }}
            </span>
          </li>
        </ul>
      </div>
    </section>

    <!-- Vote results -->
    <section v-else-if="activeTab === 'results'" class="space-y-4">
      <div class="ui-card overflow-hidden">
        <div class="border-b border-ui-border/40 px-5 py-4">
          <h2 class="font-semibold text-ui-text">Enter polling unit result</h2>
          <p class="mt-1 text-xs text-ui-muted">
            Type the vote count for one of your polling units. You can update it later if the figure changes.
          </p>
        </div>
        <form class="space-y-4 p-5" @submit.prevent="saveResult">
          <div class="grid gap-4 sm:grid-cols-2">
            <label class="block sm:col-span-2">
              <span class="text-xs text-ui-muted">Polling unit</span>
              <select v-model="resultForm.code" required class="ui-input mt-1">
                <option value="" disabled>Select your polling unit</option>
                <option v-for="unit in units" :key="unit.code" :value="unit.code">
                  {{ unit.code }} — {{ unit.name }} ({{ unit.ward }}, {{ unit.lga }})
                </option>
              </select>
            </label>
            <div v-if="selectedResultUnit" class="rounded-lg border border-ui-border/40 bg-ui-elevated/30 p-3 sm:col-span-2">
              <p class="text-xs text-ui-muted">People already counted at this unit</p>
              <p class="mt-1 text-xl font-bold text-ui-text">
                {{ selectedResultUnit.people_count.toLocaleString() }}
              </p>
              <p class="mt-1 text-xs text-ui-muted">
                Your vote count will be compared with this number on the admin dashboard.
              </p>
            </div>
            <label class="block sm:col-span-2">
              <span class="text-xs text-ui-muted">Vote count (result)</span>
              <input
                v-model.number="resultForm.votes"
                type="number"
                min="0"
                required
                placeholder="e.g. 250"
                class="ui-input mt-1"
              />
            </label>
          </div>
          <button
            type="submit"
            class="rounded-lg bg-emerald-600 px-4 py-2 text-sm text-white hover:bg-emerald-500 disabled:opacity-50"
            :disabled="savingResult || !resultForm.code || resultForm.votes < 0"
          >
            {{ savingResult ? "Saving…" : "Save result" }}
          </button>
          <p v-if="resultMessage" class="text-sm text-emerald-600 dark:text-emerald-400">{{ resultMessage }}</p>
          <p v-if="resultError" class="text-sm text-red-500">{{ resultError }}</p>
        </form>
      </div>

      <div class="ui-card overflow-hidden">
        <div class="border-b border-ui-border/40 px-5 py-3">
          <h3 class="text-sm font-semibold text-ui-text">Your submitted results</h3>
        </div>
        <div v-if="!myResults.length" class="p-8 text-center text-sm text-ui-muted">
          No results submitted yet.
        </div>
        <ul v-else class="divide-y divide-ui-border/30">
          <li
            v-for="row in myResults"
            :key="row.id"
            class="flex flex-wrap items-start justify-between gap-3 px-5 py-3"
          >
            <div>
              <p class="text-sm font-medium text-ui-text">{{ row.polling_unit_name }}</p>
              <p class="text-xs text-ui-muted">{{ row.code }} · {{ row.ward }}, {{ row.lga }}</p>
              <p class="mt-1 text-xs text-ui-muted">
                Votes: <span class="font-semibold text-ui-text">{{ row.votes.toLocaleString() }}</span>
                · People counted: {{ row.people_count.toLocaleString() }}
              </p>
              <p class="mt-0.5 text-[10px] text-ui-muted">Updated {{ formatWhen(row.updated_at) }}</p>
            </div>
            <span
              class="rounded-full px-2 py-0.5 text-xs font-semibold"
              :class="resultCompareClass(row.votes, row.people_count)"
            >
              {{ resultCompareLabel(row.votes, row.people_count) }}
            </span>
          </li>
        </ul>
      </div>

      <div
        v-if="accreditation.accreditation_status !== 'approved'"
        class="rounded-lg border border-amber-500/30 bg-amber-500/5 p-4 text-sm text-amber-700 dark:text-amber-400"
      >
        You must submit and get your
        <button type="button" class="underline" @click="activeTab = 'accreditation'">party accreditation</button>
        approved before you can submit result sheets.
      </div>

      <div class="ui-card overflow-hidden">
        <div class="border-b border-ui-border/40 px-5 py-4">
          <h2 class="font-semibold text-ui-text">Submit EC8A result sheet (recommended)</h2>
          <p class="mt-1 text-xs text-ui-muted">
            Photograph the result sheet the moment it's announced at your unit. This creates a
            timestamped, GPS-tagged record that can't be edited later — if a figure changes,
            submit a new correction instead; both stay on file.
          </p>
        </div>
        <form class="space-y-4 p-5" @submit.prevent="saveResultSheet">
          <div class="grid gap-4 sm:grid-cols-2">
            <label class="block sm:col-span-2">
              <span class="text-xs text-ui-muted">Polling unit</span>
              <select v-model="resultSheetForm.code" required class="ui-input mt-1">
                <option value="" disabled>Select your polling unit</option>
                <option v-for="unit in units" :key="unit.code" :value="unit.code">
                  {{ unit.code }} — {{ unit.name }} ({{ unit.ward }}, {{ unit.lga }})
                </option>
              </select>
            </label>
            <label class="block sm:col-span-2">
              <span class="text-xs text-ui-muted">Photo of the result sheet (EC8A)</span>
              <input
                ref="resultSheetFileInput"
                type="file"
                accept="image/*"
                capture="environment"
                required
                class="mt-1 block w-full text-sm text-ui-muted"
                @change="onSelectResultSheetPhoto"
              />
            </label>
            <label class="block">
              <span class="text-xs text-ui-muted">Votes (your candidate)</span>
              <input
                v-model.number="resultSheetForm.votes"
                type="number"
                min="0"
                required
                class="ui-input mt-1"
              />
            </label>
            <label class="block">
              <span class="text-xs text-ui-muted">Accredited voters (as announced)</span>
              <input
                v-model.number="resultSheetForm.accredited_voters"
                type="number"
                min="0"
                class="ui-input mt-1"
              />
            </label>
            <label class="block sm:col-span-2">
              <span class="text-xs text-ui-muted">Registered voters at this unit (optional)</span>
              <input
                v-model.number="resultSheetForm.registered_voters"
                type="number"
                min="0"
                class="ui-input mt-1"
              />
            </label>
          </div>
          <p class="text-[11px] text-ui-muted">
            Your device's location is attached automatically if you allow it — it isn't required
            to submit.
          </p>
          <button
            type="submit"
            class="rounded-lg bg-emerald-600 px-4 py-2 text-sm text-white hover:bg-emerald-500 disabled:opacity-50"
            :disabled="savingResultSheet || !resultSheetForm.code || !resultSheetPhoto"
          >
            {{ savingResultSheet ? "Uploading…" : "Submit result sheet" }}
          </button>
          <p v-if="resultSheetMessage" class="text-sm text-emerald-600 dark:text-emerald-400">
            {{ resultSheetMessage }}
          </p>
          <p v-if="resultSheetError" class="text-sm text-red-500">{{ resultSheetError }}</p>
        </form>
      </div>

      <div
        v-if="witnessPromptCode"
        class="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-amber-500/30 bg-amber-500/5 p-4 text-sm text-amber-700 dark:text-amber-400"
      >
        <span>
          This unit shows a possible irregularity — record a witness statement while it's fresh in
          your mind.
        </span>
        <button
          type="button"
          class="shrink-0 rounded-lg bg-amber-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-amber-500"
          @click="startWitnessStatement(witnessPromptCode)"
        >
          Record statement
        </button>
      </div>

      <div class="ui-card overflow-hidden">
        <div class="border-b border-ui-border/40 px-5 py-3">
          <h3 class="text-sm font-semibold text-ui-text">Your submitted result sheets</h3>
        </div>
        <div v-if="!myResultSheets.length" class="p-8 text-center text-sm text-ui-muted">
          No result sheets submitted yet.
        </div>
        <ul v-else class="divide-y divide-ui-border/30">
          <li
            v-for="row in myResultSheets"
            :key="row.id"
            class="flex flex-wrap items-start justify-between gap-3 px-5 py-3"
          >
            <div>
              <p class="text-sm font-medium text-ui-text">
                {{ row.polling_unit_name }}
                <span
                  v-if="row.version > 1"
                  class="ml-1 rounded-full bg-amber-500/15 px-2 py-0.5 text-[10px] font-semibold text-amber-700"
                >
                  Correction #{{ row.version }}
                </span>
              </p>
              <p class="text-xs text-ui-muted">{{ row.code }} · {{ row.ward }}, {{ row.lga }}</p>
              <p class="mt-1 text-xs text-ui-muted">
                Votes: <span class="font-semibold text-ui-text">{{ row.votes.toLocaleString() }}</span>
                <span v-if="row.accredited_voters !== null">
                  · Accredited: {{ row.accredited_voters?.toLocaleString() }}
                </span>
              </p>
              <p v-if="row.discrepancy_note" class="mt-1 text-xs text-amber-600">
                {{ row.discrepancy_note }}
              </p>
              <p class="mt-0.5 text-[10px] text-ui-muted">
                Captured {{ formatWhen(row.received_at) }}
                <span v-if="row.captured_lat !== null && row.captured_lng !== null"> · GPS logged</span>
                · Hash {{ row.sha256.slice(0, 10) }}…
              </p>
            </div>
            <button
              type="button"
              class="rounded-lg border border-ui-border/40 px-3 py-1.5 text-xs text-ui-text hover:bg-ui-elevated/40"
              @click="viewResultSheetPhoto(row)"
            >
              View photo
            </button>
          </li>
        </ul>
      </div>

      <div id="witness-statement-form" class="ui-card overflow-hidden">
        <div class="border-b border-ui-border/40 px-5 py-4">
          <h2 class="font-semibold text-ui-text">Record a witness statement</h2>
          <p class="mt-1 text-xs text-ui-muted">
            A photo alone is weak evidence without testimony. Record what happened while it's
            fresh — who was present, what was said, in what order. Include any security agents,
            journalists, or other observers on site as corroborating witnesses.
          </p>
        </div>
        <form class="space-y-4 p-5" @submit.prevent="submitWitnessStatement">
          <div class="grid gap-4 sm:grid-cols-2">
            <label class="block">
              <span class="text-xs text-ui-muted">Polling unit</span>
              <select v-model="witnessForm.code" required class="ui-input mt-1">
                <option value="" disabled>Select your polling unit</option>
                <option v-for="unit in units" :key="unit.code" :value="unit.code">
                  {{ unit.code }} — {{ unit.name }}
                </option>
              </select>
            </label>
            <label class="block">
              <span class="text-xs text-ui-muted">What happened</span>
              <select v-model="witnessForm.incident_category" required class="ui-input mt-1">
                <option value="over_voting">Over-voting</option>
                <option value="violence">Violence / intimidation</option>
                <option value="vote_buying">Vote buying</option>
                <option value="snatching">Ballot box snatching</option>
                <option value="irev_missing">Result not uploaded to IReV</option>
                <option value="other">Other</option>
              </select>
            </label>
            <label class="block sm:col-span-2">
              <span class="text-xs text-ui-muted">What happened, in your own words</span>
              <textarea
                v-model="witnessForm.narrative"
                rows="5"
                required
                minlength="10"
                placeholder="Describe what you saw and heard, in the order it happened."
                class="ui-input mt-1"
              />
            </label>
            <label class="block">
              <span class="text-xs text-ui-muted">When this happened</span>
              <input v-model="witnessForm.occurred_at" type="datetime-local" class="ui-input mt-1" />
            </label>
          </div>

          <div>
            <div class="flex items-center justify-between">
              <span class="text-xs text-ui-muted">Others present (security, journalists, observers)</span>
              <button type="button" class="text-xs text-emerald-600 hover:underline" @click="addWitnessPerson">
                + Add person
              </button>
            </div>
            <div v-for="(person, idx) in witnessForm.people_present" :key="idx" class="mt-2 grid gap-2 sm:grid-cols-4">
              <input v-model="person.name" type="text" placeholder="Name" class="ui-input text-xs sm:col-span-2" />
              <input v-model="person.role" type="text" placeholder="Role / organization" class="ui-input text-xs" />
              <div class="flex gap-1">
                <input v-model="person.phone" type="text" placeholder="Phone" class="ui-input text-xs" />
                <button
                  type="button"
                  class="shrink-0 rounded-lg border border-ui-border/40 px-2 text-xs text-ui-muted hover:bg-ui-elevated/40"
                  @click="witnessForm.people_present.splice(idx, 1)"
                >
                  ✕
                </button>
              </div>
            </div>
          </div>

          <button
            type="submit"
            class="rounded-lg bg-emerald-600 px-4 py-2 text-sm text-white hover:bg-emerald-500 disabled:opacity-50"
            :disabled="savingWitnessStatement || !witnessForm.code || witnessForm.narrative.length < 10"
          >
            {{ savingWitnessStatement ? "Saving…" : "Save statement" }}
          </button>
          <p v-if="witnessMessage" class="text-sm text-emerald-600 dark:text-emerald-400">{{ witnessMessage }}</p>
          <p v-if="witnessError" class="text-sm text-red-500">{{ witnessError }}</p>
        </form>
      </div>

      <div class="ui-card overflow-hidden">
        <div class="border-b border-ui-border/40 px-5 py-3">
          <h3 class="text-sm font-semibold text-ui-text">Your witness statements</h3>
        </div>
        <div v-if="!myWitnessStatements.length" class="p-8 text-center text-sm text-ui-muted">
          No witness statements submitted yet.
        </div>
        <ul v-else class="divide-y divide-ui-border/30">
          <li v-for="row in myWitnessStatements" :key="row.id" class="px-5 py-3">
            <p class="text-sm font-medium text-ui-text">
              {{ row.polling_unit_name }}
              <span class="ml-1 rounded-full bg-ui-muted/20 px-2 py-0.5 text-[10px] font-semibold text-ui-muted">
                {{ row.incident_category.replace("_", " ") }}
              </span>
            </p>
            <p class="mt-1 text-xs text-ui-muted line-clamp-2">{{ row.narrative }}</p>
            <p class="mt-1 text-[10px] text-ui-muted">
              Submitted {{ formatWhen(row.submitted_at) }}
              <span v-if="row.people_present.length"> · {{ row.people_present.length }} other witness(es) named</span>
            </p>
          </li>
        </ul>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import type { PollingUnit } from "~/composables/useVideoFeeds";

type AgentPollingUnit = PollingUnit & { ingest_token: string };

definePageMeta({ layout: "default" });

const config = useRuntimeConfig();
const apiBase = config.public.apiBase;
const { agent, authHeaders, requireAgent, clear, fetchMe } = useAgentAuth();
const { detectNetwork, networkLabel, networkIcon } = useNetworkDetect();
const {
  lgas,
  wards,
  pollingUnits,
  loadingLgas,
  loadingWards,
  loadingPollingUnits,
  loadLgas,
  loadWards,
  loadPollingUnits,
} = useOgunGeo();

const tabs = [
  { id: "units", label: "My units" },
  { id: "register", label: "Register" },
  { id: "accreditation", label: "Accreditation" },
  { id: "data", label: "Data credit" },
  { id: "airtime", label: "Airtime" },
  { id: "results", label: "Results" },
] as const;

type TabId = (typeof tabs)[number]["id"];

const activeTab = ref<TabId>("units");
const visibleTokens = ref(new Set<string>());

const units = ref<AgentPollingUnit[]>([]);
const loading = ref(true);
const creating = ref(false);
const createError = ref("");
const newUnit = ref<{ code: string; ingest_token: string } | null>(null);
const editingCode = ref<string | null>(null);
const editCount = ref(0);
const savingEdit = ref(false);

type AgentDataPlan = {
  network: string;
  variation_code: string;
  name: string;
  amount: number;
};

type AgentDataCredit = {
  id: string;
  phone: string;
  network: string;
  plan_name: string;
  amount: number;
  status: string;
  created_at: string;
};

const dataForm = reactive({
  phone: "",
  network: "",
  variation_code: "",
});
const agentDataPlans = ref<AgentDataPlan[]>([]);
const dataCredits = ref<AgentDataCredit[]>([]);
const dataQuota = ref<{
  data_claim_limit: number;
  data_claims_used: number;
  data_claims_remaining: number;
} | null>(null);
const loadingDataPlans = ref(false);
const creditingData = ref(false);
const dataMessage = ref("");
const dataError = ref("");

type AgentAirtimeAmount = {
  amount: number;
  enabled: boolean;
};

type AgentAirtimeCredit = {
  id: string;
  phone: string;
  network: string;
  amount: number;
  status: string;
  created_at: string;
};

const airtimeForm = reactive({
  phone: "",
  network: "",
  amount: 0,
});
const airtimeAmounts = ref<AgentAirtimeAmount[]>([]);
const airtimeCredits = ref<AgentAirtimeCredit[]>([]);
const airtimeQuota = ref<{
  airtime_claim_limit: number;
  airtime_claims_used: number;
  airtime_claims_remaining: number;
} | null>(null);
const creditingAirtime = ref(false);
const airtimeMessage = ref("");
const airtimeError = ref("");

const showDataNetworkPicker = ref(false);
const showAirtimeNetworkPicker = ref(false);

type AgentVoteResult = {
  id: string;
  code: string;
  polling_unit_name: string;
  ward: string;
  lga: string;
  votes: number;
  people_count: number;
  updated_at: string;
};

const resultForm = reactive({
  code: "",
  votes: 0,
});
const myResults = ref<AgentVoteResult[]>([]);

type AgentResultSheet = {
  id: string;
  code: string;
  polling_unit_name: string;
  ward: string;
  lga: string;
  votes: number;
  accredited_voters: number | null;
  registered_voters: number | null;
  sha256: string;
  captured_lat: number | null;
  captured_lng: number | null;
  received_at: string;
  version: number;
  supersedes_id: string | null;
  official_votes: number | null;
  official_diff: number | null;
  discrepancy_note: string | null;
  over_accreditation: boolean;
};

const resultSheetForm = reactive<{
  code: string;
  votes: number;
  accredited_voters: number | null;
  registered_voters: number | null;
}>({
  code: "",
  votes: 0,
  accredited_voters: null,
  registered_voters: null,
});
const resultSheetPhoto = ref<File | null>(null);
const resultSheetFileInput = ref<HTMLInputElement | null>(null);
const savingResultSheet = ref(false);
const resultSheetMessage = ref("");
const resultSheetError = ref("");
const myResultSheets = ref<AgentResultSheet[]>([]);
const witnessPromptCode = ref("");

type WitnessPerson = { name: string; role: string; phone: string };

type AgentWitnessStatement = {
  id: string;
  code: string;
  polling_unit_name: string;
  incident_category: string;
  narrative: string;
  people_present: WitnessPerson[];
  submitted_at: string;
};

const witnessForm = reactive<{
  code: string;
  incident_category: string;
  narrative: string;
  occurred_at: string;
  people_present: WitnessPerson[];
}>({
  code: "",
  incident_category: "over_voting",
  narrative: "",
  occurred_at: "",
  people_present: [],
});
const savingWitnessStatement = ref(false);
const witnessMessage = ref("");
const witnessError = ref("");
const myWitnessStatements = ref<AgentWitnessStatement[]>([]);

type Accreditation = {
  accreditation_status: string;
  accreditation_number: string | null;
  party_name: string | null;
  is_ec8a_signatory: boolean | null;
  submitted_at: string | null;
  reviewed_at: string | null;
  rejection_reason: string | null;
  has_document: boolean;
};

const accreditation = ref<Accreditation>({
  accreditation_status: "none",
  accreditation_number: null,
  party_name: null,
  is_ec8a_signatory: null,
  submitted_at: null,
  reviewed_at: null,
  rejection_reason: null,
  has_document: false,
});
const accreditationForm = reactive({
  accreditation_number: "",
  party_name: "",
  is_ec8a_signatory: false,
});
const accreditationDoc = ref<File | null>(null);
const accreditationFileInput = ref<HTMLInputElement | null>(null);
const savingAccreditation = ref(false);
const accreditationMessage = ref("");
const accreditationError = ref("");
const savingResult = ref(false);
const resultMessage = ref("");
const resultError = ref("");

const selectedResultUnit = computed(
  () => units.value.find((u) => u.code === resultForm.code) ?? null,
);

const form = reactive({
  pu_code: "",
  state: "Ogun State",
  ward: "",
  lga: "",
  device_type: "meta_rayban",
});

const selectedPu = computed(() => pollingUnits.value.find((p) => p.code === form.pu_code) ?? null);

const previewCode = computed(() => form.pu_code || "");

const locationLocked = computed(() => !!(agent.value?.lga && agent.value?.ward));

const liveUnitCount = computed(() => units.value.filter((u) => u.stream_status === "live").length);

const totalPeopleCount = computed(() =>
  units.value.reduce((sum, u) => sum + (u.people_count ?? 0), 0),
);

const dashboardStats = computed(() => [
  {
    label: "Polling units",
    value: loading.value ? "—" : units.value.length,
    valueClass: "text-ui-text",
    hint: null,
  },
  {
    label: "Live now",
    value: loading.value ? "—" : liveUnitCount.value,
    valueClass: liveUnitCount.value > 0 ? "text-red-600 dark:text-red-400" : "text-ui-text",
    hint: liveUnitCount.value > 0 ? "Streaming" : null,
  },
  {
    label: "People counted",
    value: loading.value ? "—" : totalPeopleCount.value,
    valueClass: "text-emerald-600 dark:text-emerald-400",
    hint: "Unique total",
  },
  {
    label: "Data claims",
    value: dataQuota.value?.data_claims_remaining ?? "—",
    valueClass: "text-violet-600 dark:text-violet-400",
    hint: dataQuota.value
      ? `${dataQuota.value.data_claims_used}/${dataQuota.value.data_claim_limit} used`
      : null,
  },
]);

const tabsWithBadges = computed(() =>
  tabs.map((tab) => {
    if (tab.id === "units") return { ...tab, badge: units.value.length || undefined };
    if (tab.id === "data") return { ...tab, badge: dataCredits.value.length || undefined };
    if (tab.id === "airtime") return { ...tab, badge: airtimeCredits.value.length || undefined };
    if (tab.id === "results") return { ...tab, badge: myResults.value.length || undefined };
    return { ...tab, badge: undefined as number | undefined };
  }),
);

function formatWhen(iso: string) {
  try {
    return new Date(iso).toLocaleString();
  } catch {
    return iso;
  }
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

function toggleToken(code: string) {
  const next = new Set(visibleTokens.value);
  if (next.has(code)) next.delete(code);
  else next.add(code);
  visibleTokens.value = next;
}

watch(
  () => dataForm.phone,
  (val) => {
    const net = detectNetwork(val);
    if (net) {
      if (net !== dataForm.network) {
        dataForm.network = net;
        onDataNetworkChange();
      }
    } else if (dataForm.network) {
      dataForm.network = "";
      dataForm.variation_code = "";
      agentDataPlans.value = [];
    }
  },
);

watch(
  () => airtimeForm.phone,
  (val) => {
    airtimeForm.network = detectNetwork(val) ?? "";
  },
);

onMounted(async () => {
  if (!requireAgent()) return;
  await loadLgas();
  await fetchMe();
  await applyAgentLocation();
  await Promise.all([
    loadUnits(),
    loadDataCredits(),
    loadDataQuota(),
    loadAirtimeCredits(),
    loadAirtimeQuota(),
    loadAirtimeAmounts(),
    loadMyResults(),
    loadMyResultSheets(),
    loadAccreditation(),
    loadMyWitnessStatements(),
  ]);
});

function resultCompareLabel(votes: number, people: number) {
  const diff = votes - people;
  if (people <= 0) return "No people count yet";
  if (diff === 0) return "Matches people";
  if (diff > 0) return `${diff.toLocaleString()} more than people`;
  return `${Math.abs(diff).toLocaleString()} fewer than people`;
}

function resultCompareClass(votes: number, people: number) {
  const diff = votes - people;
  if (people <= 0) return "bg-ui-muted/20 text-ui-muted";
  if (diff === 0) return "bg-emerald-500/15 text-emerald-600";
  if (Math.abs(diff) / Math.max(people, 1) > 0.25) return "bg-amber-500/15 text-amber-700";
  return "bg-sky-500/15 text-sky-700";
}

async function loadMyResults() {
  try {
    myResults.value = await $fetch<AgentVoteResult[]>(`${apiBase}/agents/me/results`, {
      headers: authHeaders(),
    });
  } catch {
    myResults.value = [];
  }
}

async function saveResult() {
  resultMessage.value = "";
  resultError.value = "";
  savingResult.value = true;
  try {
    const res = await $fetch<AgentVoteResult>(`${apiBase}/agents/me/results`, {
      method: "PUT",
      headers: authHeaders(),
      body: { code: resultForm.code, votes: resultForm.votes },
    });
    resultMessage.value = `Saved ${res.votes.toLocaleString()} vote(s) for ${res.polling_unit_name}.`;
    await loadMyResults();
  } catch (err: unknown) {
    const detail = (err as { data?: { detail?: string } })?.data?.detail;
    resultError.value = typeof detail === "string" ? detail : "Failed to save result.";
  } finally {
    savingResult.value = false;
  }
}

function onSelectResultSheetPhoto(event: Event) {
  const input = event.target as HTMLInputElement;
  resultSheetPhoto.value = input.files?.[0] ?? null;
}

function getPositionBestEffort(): Promise<GeolocationPosition | null> {
  return new Promise((resolve) => {
    if (!navigator.geolocation) {
      resolve(null);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve(pos),
      () => resolve(null),
      { enableHighAccuracy: true, timeout: 8000 },
    );
  });
}

async function loadMyResultSheets() {
  try {
    myResultSheets.value = await $fetch<AgentResultSheet[]>(`${apiBase}/agents/me/result-sheets`, {
      headers: authHeaders(),
    });
  } catch {
    myResultSheets.value = [];
  }
}

async function saveResultSheet() {
  resultSheetMessage.value = "";
  resultSheetError.value = "";
  if (!resultSheetForm.code) {
    resultSheetError.value = "Choose a polling unit.";
    return;
  }
  if (!resultSheetPhoto.value) {
    resultSheetError.value = "Attach a photo of the result sheet.";
    return;
  }
  savingResultSheet.value = true;
  try {
    const position = await getPositionBestEffort();
    const formData = new FormData();
    formData.append("code", resultSheetForm.code);
    formData.append("votes", String(resultSheetForm.votes));
    if (resultSheetForm.accredited_voters !== null) {
      formData.append("accredited_voters", String(resultSheetForm.accredited_voters));
    }
    if (resultSheetForm.registered_voters !== null) {
      formData.append("registered_voters", String(resultSheetForm.registered_voters));
    }
    if (position) {
      formData.append("lat", String(position.coords.latitude));
      formData.append("lng", String(position.coords.longitude));
      formData.append("accuracy_m", String(position.coords.accuracy));
    }
    formData.append("device_captured_at", new Date().toISOString());
    formData.append("device_id", useDeviceId());
    formData.append("app_version", APP_VERSION);
    formData.append("photo", resultSheetPhoto.value, resultSheetPhoto.value.name || "result-sheet.jpg");

    const res = await $fetch<AgentResultSheet>(`${apiBase}/agents/me/result-sheets`, {
      method: "POST",
      headers: authHeaders(),
      body: formData,
    });
    resultSheetMessage.value = `Saved result sheet for ${res.polling_unit_name}${
      res.version > 1 ? ` (correction #${res.version})` : ""
    }.`;
    witnessPromptCode.value = res.over_accreditation ? res.code : "";
    resultSheetForm.votes = 0;
    resultSheetForm.accredited_voters = null;
    resultSheetForm.registered_voters = null;
    resultSheetPhoto.value = null;
    if (resultSheetFileInput.value) resultSheetFileInput.value.value = "";
    await loadMyResultSheets();
  } catch (err: unknown) {
    const detail = (err as { data?: { detail?: string } })?.data?.detail;
    resultSheetError.value = typeof detail === "string" ? detail : "Failed to save result sheet.";
  } finally {
    savingResultSheet.value = false;
  }
}

async function viewResultSheetPhoto(sheet: AgentResultSheet) {
  resultSheetError.value = "";
  try {
    const res = await fetch(`${apiBase}/agents/me/result-sheets/${sheet.id}/photo`, {
      headers: authHeaders(),
    });
    if (!res.ok) throw new Error("Failed to load photo.");
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    window.open(url, "_blank");
  } catch {
    resultSheetError.value = "Could not load the photo.";
  }
}

function addWitnessPerson() {
  witnessForm.people_present.push({ name: "", role: "", phone: "" });
}

function startWitnessStatement(code: string) {
  witnessForm.code = code;
  witnessPromptCode.value = "";
  nextTick(() => {
    document.getElementById("witness-statement-form")?.scrollIntoView({ behavior: "smooth" });
  });
}

async function loadMyWitnessStatements() {
  try {
    myWitnessStatements.value = await $fetch<AgentWitnessStatement[]>(`${apiBase}/agents/me/witness-statements`, {
      headers: authHeaders(),
    });
  } catch {
    myWitnessStatements.value = [];
  }
}

async function submitWitnessStatement() {
  witnessMessage.value = "";
  witnessError.value = "";
  if (!witnessForm.code) {
    witnessError.value = "Choose a polling unit.";
    return;
  }
  if (witnessForm.narrative.trim().length < 10) {
    witnessError.value = "Describe what happened in a bit more detail.";
    return;
  }
  savingWitnessStatement.value = true;
  try {
    const position = await getPositionBestEffort();
    const formData = new FormData();
    formData.append("code", witnessForm.code);
    formData.append("incident_category", witnessForm.incident_category);
    formData.append("narrative", witnessForm.narrative);
    if (witnessForm.occurred_at) {
      formData.append("occurred_at", new Date(witnessForm.occurred_at).toISOString());
    }
    const people = witnessForm.people_present.filter((p) => p.name.trim());
    if (people.length) {
      formData.append("people_present", JSON.stringify(people));
    }
    if (position) {
      formData.append("lat", String(position.coords.latitude));
      formData.append("lng", String(position.coords.longitude));
    }

    await $fetch(`${apiBase}/agents/me/witness-statements`, {
      method: "POST",
      headers: authHeaders(),
      body: formData,
    });
    witnessMessage.value = "Statement saved.";
    witnessForm.narrative = "";
    witnessForm.people_present = [];
    await loadMyWitnessStatements();
  } catch (err: unknown) {
    const detail = (err as { data?: { detail?: string } })?.data?.detail;
    witnessError.value = typeof detail === "string" ? detail : "Failed to save statement.";
  } finally {
    savingWitnessStatement.value = false;
  }
}

function accreditationStatusLabel(status: string) {
  if (status === "approved") return "Approved";
  if (status === "pending") return "Pending review";
  if (status === "rejected") return "Rejected";
  return "Not submitted";
}

function accreditationStatusClass(status: string) {
  if (status === "approved") return "bg-emerald-500/15 text-emerald-600";
  if (status === "pending") return "bg-amber-500/15 text-amber-700";
  if (status === "rejected") return "bg-red-500/15 text-red-600";
  return "bg-ui-muted/20 text-ui-muted";
}

function onSelectAccreditationDoc(event: Event) {
  const input = event.target as HTMLInputElement;
  accreditationDoc.value = input.files?.[0] ?? null;
}

async function loadAccreditation() {
  try {
    accreditation.value = await $fetch<Accreditation>(`${apiBase}/agents/me/accreditation`, {
      headers: authHeaders(),
    });
  } catch {
    // keep defaults
  }
}

async function submitAccreditation() {
  accreditationMessage.value = "";
  accreditationError.value = "";
  if (!accreditationDoc.value) {
    accreditationError.value = "Attach your accreditation document.";
    return;
  }
  savingAccreditation.value = true;
  try {
    const formData = new FormData();
    if (accreditationForm.accreditation_number) {
      formData.append("accreditation_number", accreditationForm.accreditation_number);
    }
    if (accreditationForm.party_name) {
      formData.append("party_name", accreditationForm.party_name);
    }
    formData.append("is_ec8a_signatory", String(accreditationForm.is_ec8a_signatory));
    formData.append("document", accreditationDoc.value, accreditationDoc.value.name || "accreditation");

    accreditation.value = await $fetch<Accreditation>(`${apiBase}/agents/me/accreditation`, {
      method: "POST",
      headers: authHeaders(),
      body: formData,
    });
    accreditationMessage.value = "Submitted for admin review.";
    accreditationDoc.value = null;
    if (accreditationFileInput.value) accreditationFileInput.value.value = "";
  } catch (err: unknown) {
    const detail = (err as { data?: { detail?: string } })?.data?.detail;
    accreditationError.value = typeof detail === "string" ? detail : "Failed to submit accreditation.";
  } finally {
    savingAccreditation.value = false;
  }
}

async function loadDataQuota() {
  try {
    dataQuota.value = await $fetch(`${apiBase}/agents/me/data/quota`, {
      headers: authHeaders(),
    });
  } catch {
    dataQuota.value = { data_claim_limit: 1, data_claims_used: 0, data_claims_remaining: 1 };
  }
}

async function onDataNetworkChange() {
  dataForm.variation_code = "";
  dataMessage.value = "";
  dataError.value = "";
  if (!dataForm.network) {
    agentDataPlans.value = [];
    return;
  }
  loadingDataPlans.value = true;
  try {
    agentDataPlans.value = await $fetch<AgentDataPlan[]>(`${apiBase}/agents/me/data/plans`, {
      headers: authHeaders(),
      query: { network: dataForm.network },
    });
  } catch {
    agentDataPlans.value = [];
    dataError.value = "Could not load data plans. Ask admin to enable plans.";
  } finally {
    loadingDataPlans.value = false;
  }
}

async function loadDataCredits() {
  try {
    dataCredits.value = await $fetch<AgentDataCredit[]>(`${apiBase}/agents/me/data/credits`, {
      headers: authHeaders(),
    });
  } catch {
    dataCredits.value = [];
  }
}

async function creditData() {
  dataMessage.value = "";
  dataError.value = "";
  creditingData.value = true;
  try {
    const res = await $fetch<AgentDataCredit>(`${apiBase}/agents/me/data/credit`, {
      method: "POST",
      headers: authHeaders(),
      body: {
        phone: dataForm.phone,
        network: dataForm.network,
        variation_code: dataForm.variation_code,
      },
    });
    dataMessage.value = `Data credited successfully (${res.plan_name}). Status: ${res.status}.`;
    await Promise.all([loadDataCredits(), loadDataQuota()]);
  } catch (err: unknown) {
    const detail = (err as { data?: { detail?: string } })?.data?.detail;
    dataError.value = typeof detail === "string" ? detail : "Failed to credit data.";
    await loadDataQuota();
  } finally {
    creditingData.value = false;
  }
}

function onDataManualNetwork() {
  showDataNetworkPicker.value = false;
  onDataNetworkChange();
}

function onAirtimeManualNetwork() {
  showAirtimeNetworkPicker.value = false;
}

async function loadAirtimeQuota() {
  try {
    airtimeQuota.value = await $fetch(`${apiBase}/agents/me/airtime/quota`, {
      headers: authHeaders(),
    });
  } catch {
    airtimeQuota.value = {
      airtime_claim_limit: 1,
      airtime_claims_used: 0,
      airtime_claims_remaining: 1,
    };
  }
}

async function loadAirtimeAmounts() {
  try {
    airtimeAmounts.value = await $fetch<AgentAirtimeAmount[]>(
      `${apiBase}/agents/me/airtime/amounts`,
      { headers: authHeaders() },
    );
  } catch {
    airtimeAmounts.value = [];
  }
}

async function loadAirtimeCredits() {
  try {
    airtimeCredits.value = await $fetch<AgentAirtimeCredit[]>(
      `${apiBase}/agents/me/airtime/credits`,
      { headers: authHeaders() },
    );
  } catch {
    airtimeCredits.value = [];
  }
}

async function creditAirtime() {
  airtimeMessage.value = "";
  airtimeError.value = "";
  creditingAirtime.value = true;
  try {
    const res = await $fetch<AgentAirtimeCredit>(`${apiBase}/agents/me/airtime/credit`, {
      method: "POST",
      headers: authHeaders(),
      body: {
        phone: airtimeForm.phone,
        network: airtimeForm.network,
        amount: airtimeForm.amount,
      },
    });
    airtimeMessage.value = `Airtime of ₦${res.amount.toLocaleString()} claimed for ${res.phone}. Status: ${res.status}.`;
    await Promise.all([loadAirtimeCredits(), loadAirtimeQuota()]);
  } catch (err: unknown) {
    const detail = (err as { data?: { detail?: string } })?.data?.detail;
    airtimeError.value = typeof detail === "string" ? detail : "Failed to send airtime.";
    await loadAirtimeQuota();
  } finally {
    creditingAirtime.value = false;
  }
}

async function applyAgentLocation() {
  if (!agent.value?.lga || !agent.value?.ward) return;
  form.lga = agent.value.lga;
  await loadWards(agent.value.lga);
  form.ward = agent.value.ward;
  form.pu_code = "";
  await loadPollingUnits(form.lga, form.ward);
}

async function onLgaChange() {
  if (locationLocked.value) return;
  form.ward = "";
  form.pu_code = "";
  pollingUnits.value = [];
  await loadWards(form.lga);
}

async function onWardChange() {
  form.pu_code = "";
  await loadPollingUnits(form.lga, form.ward);
}

async function loadUnits() {
  loading.value = true;
  try {
    units.value = await $fetch<AgentPollingUnit[]>(`${apiBase}/agents/me/polling-units`, {
      headers: authHeaders(),
    });
  } finally {
    loading.value = false;
  }
}

async function createUnit() {
  if (!selectedPu.value) {
    createError.value = "Select a polling unit.";
    return;
  }
  creating.value = true;
  createError.value = "";
  const code = form.pu_code.toLowerCase();
  try {
    const res = await $fetch<PollingUnit & { ingest_token: string }>(`${apiBase}/polling-units`, {
      method: "POST",
      headers: authHeaders(),
      body: {
        name: selectedPu.value.name,
        state: form.state,
        lga: form.lga,
        ward: form.ward,
        code,
        device_type: form.device_type,
      },
    });
    newUnit.value = { code: res.code, ingest_token: res.ingest_token };
    if (import.meta.client) {
      localStorage.setItem(`ingest_token_${res.code}`, res.ingest_token);
    }
    form.pu_code = "";
    if (!locationLocked.value) {
      form.ward = "";
      form.lga = "";
      wards.value = [];
      pollingUnits.value = [];
    } else {
      await loadPollingUnits(form.lga, form.ward);
    }
    await loadUnits();
    activeTab.value = "units";
  } catch (err: unknown) {
    const detail = (err as { data?: { detail?: string } })?.data?.detail;
    createError.value = typeof detail === "string" ? detail : "Failed to create polling unit.";
  } finally {
    creating.value = false;
  }
}

function logout() {
  clear();
  navigateTo("/agent/login");
}

function startEditCount(unit: AgentPollingUnit) {
  editingCode.value = unit.code;
  editCount.value = unit.people_count;
}

async function saveUnitCount(unitCode: string) {
  savingEdit.value = true;
  try {
    await $fetch(`${apiBase}/polling-units/${unitCode}/people-count`, {
      method: "PATCH",
      headers: authHeaders(),
      body: { people_count: editCount.value },
    });
    editingCode.value = null;
    await loadUnits();
  } catch (err: unknown) {
    const status = (err as { statusCode?: number })?.statusCode;
    const detail = (err as { data?: { detail?: string } })?.data?.detail;
    if (status === 404) {
      createError.value = "Update endpoint not found — restart the backend server, then try again.";
    } else if (typeof detail === "string") {
      createError.value = detail;
    } else {
      createError.value = "Failed to update count.";
    }
  } finally {
    savingEdit.value = false;
  }
}
</script>
