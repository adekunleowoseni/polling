<script setup lang="ts">
import type { AdminOverview } from "~/composables/useAdminAuth";
import type { VideoFeedDashboard } from "~/composables/useVideoFeeds";

const props = withDefaults(
  defineProps<{
    stateScope?: string;
  }>(),
  { stateScope: "all" },
);

const emit = defineEmits<{
  (e: "error", msg: string): void;
  (e: "message", msg: string): void;
}>();

const { authHeaders, apiBase } = useAdminAuth();
const { setTab } = useAdminShell();
const { lgas, wards, loadLgas, loadWards } = useOgunGeo();

const {
  loading: fieldMapLoading,
  data: fieldMapData,
  markers: fieldMapMarkers,
  center: fieldMapCenter,
  load: loadFieldMap,
} = useMapPollingUnits();

type AgentSummary = {
  id: string;
  name: string;
  email: string;
  lga: string | null;
  ward: string | null;
  state?: string | null;
  polling_unit_count: number;
  live_unit_count: number;
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

type MapTool = "polygon" | "radius" | "heatmap" | "gps";

const loading = ref(true);
const overview = ref<AdminOverview | null>(null);
const agents = ref<AgentSummary[]>([]);
const recordings = ref<FeedRecording[]>([]);
const feeds = ref<VideoFeedDashboard | null>(null);
const mapTool = ref<MapTool>("heatmap");
const showAllPacks = ref(false);
const showRecordings = ref(false);
const busyRecording = ref<string | null>(null);
const playingUrl = ref<string | null>(null);
const playingTitle = ref("");
const showRebalance = ref(false);
const showCutTurf = ref(false);
const rebalanceBusy = ref(false);
const cutBusy = ref(false);
const walksheetBusy = ref(false);
const mapCanvasEl = ref<HTMLElement | null>(null);
const turfPolygon = ref<{ lat: number; lng: number }[]>([]);
const rebalanceMoves = ref<
  { agentId: string; name: string; fromLga: string; fromWard: string; toLga: string; toWard: string }[]
>([]);
const cutForm = reactive({
  lga: "",
  ward: "",
  agentIds: [] as string[],
});

onMounted(() => void refresh());
onUnmounted(() => closePlayer());

watch(
  () => props.stateScope,
  () => void refresh(),
);

async function refresh(opts: { map?: { lga?: string; ward?: string } } = {}) {
  loading.value = true;
  try {
    const [ov, ag, rec, feed] = await Promise.all([
      $fetch<AdminOverview>(`${apiBase}/admin/overview`, { headers: authHeaders() }),
      $fetch<AgentSummary[]>(`${apiBase}/admin/agents`, { headers: authHeaders() }),
      $fetch<FeedRecording[]>(`${apiBase}/admin/recordings`, { headers: authHeaders() }),
      $fetch<VideoFeedDashboard>(`${apiBase}/analytics/video-feeds`).catch(() => null),
    ]);
    overview.value = ov;
    agents.value = ag;
    recordings.value = rec;
    feeds.value = feed;
    const topLga = opts.map?.lga || lgaSectors.value[0]?.lga;
    await loadFieldMap({
      state: props.stateScope !== "all" ? props.stateScope : "Ogun State",
      ...(topLga ? { lga: topLga } : {}),
      ...(opts.map?.ward ? { ward: opts.map.ward } : {}),
    });
  } catch {
    emit("error", "Failed to load field canvassing command.");
  } finally {
    loading.value = false;
  }
}

function matchesScope(state: string | null | undefined) {
  if (!props.stateScope || props.stateScope === "all") return true;
  return (state || "").trim() === props.stateScope;
}

const scopedAgents = computed(() => agents.value.filter((a) => matchesScope(a.state)));
const scopedRecordings = computed(() => recordings.value.filter((r) => matchesScope(r.state)));
const scopedUnits = computed(() => (feeds.value?.units ?? []).filter((u) => matchesScope(u.state)));

const activeCanvassers = computed(() => scopedAgents.value.length);
const agentsWithLive = computed(() => scopedAgents.value.filter((a) => a.live_unit_count > 0).length);
const liveUnits = computed(() => scopedUnits.value.filter((u) => u.stream_status === "live"));
const offlineUnits = computed(() => scopedUnits.value.filter((u) => u.stream_status !== "live"));
const totalUnits = computed(() => scopedUnits.value.length || overview.value?.registered_units || 0);
const peopleOnSite = computed(
  () =>
    liveUnits.value.reduce((s, u) => s + (u.people_count || 0), 0) ||
    overview.value?.total_people_on_site ||
    0,
);
const dailyQuota = computed(() => Math.max(totalUnits.value * 50, peopleOnSite.value || 150_000, 1));
const doorsPct = computed(() => Math.min(100, Math.round((peopleOnSite.value / dailyQuota.value) * 1000) / 10));
const contactRate = computed(() => {
  if (!totalUnits.value) return 0;
  return Math.round((liveUnits.value.length / totalUnits.value) * 1000) / 10;
});
const gpsActivePct = computed(() => {
  if (!activeCanvassers.value) return 0;
  return Math.round((agentsWithLive.value / activeCanvassers.value) * 1000) / 10;
});
const supportHint = computed(() => {
  const reported = overview.value?.units_with_results ?? 0;
  const registered = overview.value?.registered_units || totalUnits.value || 1;
  return Math.round((reported / registered) * 100);
});

const zoneLabel = computed(() => {
  if (props.stateScope && props.stateScope !== "all") return props.stateScope;
  const top = lgaSectors.value[0];
  return top ? `${top.lga} Zone` : "Field Operations Zone";
});

type Sector = {
  key: string;
  lga: string;
  ward: string;
  agents: number;
  live: number;
  people: number;
  units: number;
  pct: number;
};

const lgaSectors = computed(() => {
  const map = new Map<string, Sector>();
  for (const u of scopedUnits.value) {
    const key = u.lga || "Unassigned";
    const cur = map.get(key) || {
      key,
      lga: key,
      ward: u.ward || "",
      agents: 0,
      live: 0,
      people: 0,
      units: 0,
      pct: 0,
    };
    cur.units += 1;
    if (u.stream_status === "live") {
      cur.live += 1;
      cur.people += u.people_count || 0;
    }
    if (!cur.ward && u.ward) cur.ward = u.ward;
    map.set(key, cur);
  }
  for (const a of scopedAgents.value) {
    const key = a.lga || "Unassigned";
    const cur = map.get(key) || {
      key,
      lga: key,
      ward: a.ward || "",
      agents: 0,
      live: 0,
      people: 0,
      units: 0,
      pct: 0,
    };
    cur.agents += 1;
    map.set(key, cur);
  }
  return [...map.values()]
    .map((s) => ({
      ...s,
      pct: s.units ? Math.round((s.live / s.units) * 100) : 0,
    }))
    .sort((a, b) => b.live - a.live || b.agents - a.agents);
});

const mapSectors = computed(() => lgaSectors.value.slice(0, 2));

type TurfPacket = {
  id: string;
  code: string;
  title: string;
  lead: string;
  canvassers: number;
  live: number;
  units: number;
  people: number;
  pct: number;
  agents: AgentSummary[];
};

const turfPackets = computed(() => {
  const byWard = new Map<string, TurfPacket>();
  for (const a of scopedAgents.value) {
    const ward = a.ward || a.lga || "Unassigned turf";
    const lga = a.lga || "";
    const key = `${lga}::${ward}`;
    const cur = byWard.get(key) || {
      id: key,
      code: `TRF-${String(byWard.size + 1).padStart(3, "0")}`,
      title: lga ? `${ward} · ${lga}` : ward,
      lead: a.name,
      canvassers: 0,
      live: 0,
      units: 0,
      people: 0,
      pct: 0,
      agents: [],
    };
    cur.canvassers += 1;
    cur.live += a.live_unit_count || 0;
    cur.units += a.polling_unit_count || 0;
    cur.agents.push(a);
    if ((a.live_unit_count || 0) > (cur.agents[0]?.live_unit_count || 0)) cur.lead = a.name;
    byWard.set(key, cur);
  }
  for (const u of scopedUnits.value) {
    const ward = u.ward || u.lga || "Unassigned turf";
    const key = `${u.lga || ""}::${ward}`;
    const cur = byWard.get(key);
    if (!cur) continue;
    if (u.stream_status === "live") cur.people += u.people_count || 0;
  }
  return [...byWard.values()]
    .map((p) => ({
      ...p,
      pct: p.units ? Math.min(100, Math.round((p.live / Math.max(p.units, 1)) * 100)) : 0,
    }))
    .sort((a, b) => b.live - a.live || b.canvassers - a.canvassers);
});

const visiblePackets = computed(() =>
  showAllPacks.value ? turfPackets.value : turfPackets.value.slice(0, 3),
);

type FeedItem = {
  id: string;
  time: string;
  badge: string;
  icon: string;
  tone: string;
  html: string;
};

const fieldFeed = computed(() => {
  const items: FeedItem[] = [];
  for (const rec of scopedRecordings.value.slice(0, 6)) {
    const active = rec.status === "recording";
    items.push({
      id: `rec-${rec.id}`,
      time: formatClock(rec.started_at),
      badge: rec.code,
      icon: active ? "videocam" : "movie",
      tone: active ? "bg-action-green/20 text-action-green" : "bg-surface-container-highest text-on-surface-variant",
      html: active
        ? `<strong class="font-semibold">${escapeHtml(rec.polling_unit_name || rec.code)}</strong> is live-recording in <em>${escapeHtml(rec.ward || rec.lga)}</em>.`
        : `Recording archived for <strong class="font-semibold">${escapeHtml(rec.polling_unit_name || rec.code)}</strong> · ${formatDuration(rec.duration_seconds)}.`,
    });
  }
  for (const u of liveUnits.value.slice(0, 4)) {
    items.push({
      id: `live-${u.id}`,
      time: formatClock(u.last_frame_at || u.created_at),
      badge: u.code,
      icon: "groups",
      tone: "bg-secondary-container/20 text-secondary-container",
      html: `<strong class="font-semibold">${escapeHtml(u.name)}</strong> reports <em>${u.people_count.toLocaleString()} people on site</em> · ${escapeHtml(u.ward)}.`,
    });
  }
  for (const a of scopedAgents.value.filter((x) => x.live_unit_count > 0).slice(0, 3)) {
    items.push({
      id: `ag-${a.id}`,
      time: "Live",
      badge: initials(a.name),
      icon: "how_to_reg",
      tone: "bg-action-green/20 text-action-green",
      html: `<strong class="font-semibold">${escapeHtml(a.name)}</strong> has <em>${a.live_unit_count} live unit(s)</em> across ${escapeHtml(a.ward || a.lga || "field")}.`,
    });
  }
  return items.slice(0, 8);
});

const precinctsLocked = computed(() => liveUnits.value.length);
const avgCadence = computed(() => {
  const recs = scopedRecordings.value.filter((r) => r.duration_seconds > 0);
  if (!recs.length) return "—";
  const avg = recs.reduce((s, r) => s + r.duration_seconds, 0) / recs.length;
  return `${(avg / 60).toFixed(1)} min / unit`;
});
const snapsPlaced = computed(() => overview.value?.feed_snapshots ?? 0);
const doorVelocity = computed(() => {
  if (!totalUnits.value) return "+0%";
  const pct = Math.round((liveUnits.value.length / totalUnits.value) * 100 - 50);
  return `${pct >= 0 ? "+" : ""}${pct}%`;
});

const advisory = computed(() => {
  const weak = lgaSectors.value.find((s) => s.units > 0 && s.pct < 50);
  if (weak) {
    return {
      title: "AI Route & Coverage Advisory",
      body: `Coverage lag in ${weak.lga}${weak.ward ? ` (${weak.ward})` : ""} at ${weak.pct}% live. Recommend shifting ${Math.max(2, Math.round(weak.agents * 0.4) || 4)} canvassers to under-served polling units to restore knock velocity.`,
      priority: "High Priority",
    };
  }
  if (offlineUnits.value.length > liveUnits.value.length) {
    return {
      title: "AI Route & Sync Advisory",
      body: `${offlineUnits.value.length} polling units offline vs ${liveUnits.value.length} live. Rebalance field allocations toward units with no recent frame sync.`,
      priority: "Medium Priority",
    };
  }
  return {
    title: "AI Route & Weather Advisory",
    body: "Field mesh is healthy. Maintain current turf cuts and continue GPS walk optimization across active wards.",
    priority: "Nominal",
  };
});

function escapeHtml(s: string) {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function formatClock(iso: string | null) {
  if (!iso) return "—";
  if (iso === "Live") return "Live";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit", second: "2-digit" });
}

function formatDuration(seconds: number) {
  const s = Math.max(0, Math.floor(seconds || 0));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const r = s % 60;
  if (h) return `${h}h ${m}m`;
  if (m) return `${m}m ${r}s`;
  return `${r}s`;
}

function formatBytes(n: number) {
  if (!n) return "—";
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}

function formatWhen(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString(undefined, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
}

function selectMapTool(tool: MapTool) {
  mapTool.value = tool;
  if (tool === "polygon" && !turfPolygon.value.length) {
    const pts = (fieldMapData.value?.units || []).map((u) => ({ lat: u.lat, lng: u.lng }));
    turfPolygon.value = padTurfPolygon(pts);
  }
}

function monitorPacket(packet: TurfPacket) {
  setTab("feeds");
  emit("message", `Opening live feeds for ${packet.title}.`);
}

function csvCell(value: string | number | null | undefined) {
  const raw = value == null ? "" : String(value);
  return `"${raw.replace(/"/g, '""')}"`;
}

function convexHull(points: { lat: number; lng: number }[]) {
  if (points.length < 3) return points.slice();
  const sorted = [...points].sort((a, b) => a.lng - b.lng || a.lat - b.lat);
  const cross = (o: { lat: number; lng: number }, a: { lat: number; lng: number }, b: { lat: number; lng: number }) =>
    (a.lng - o.lng) * (b.lat - o.lat) - (a.lat - o.lat) * (b.lng - o.lng);
  const lower: { lat: number; lng: number }[] = [];
  for (const p of sorted) {
    while (lower.length >= 2 && cross(lower[lower.length - 2], lower[lower.length - 1], p) <= 0) lower.pop();
    lower.push(p);
  }
  const upper: { lat: number; lng: number }[] = [];
  for (let i = sorted.length - 1; i >= 0; i--) {
    const p = sorted[i];
    while (upper.length >= 2 && cross(upper[upper.length - 2], upper[upper.length - 1], p) <= 0) upper.pop();
    upper.push(p);
  }
  lower.pop();
  upper.pop();
  return lower.concat(upper);
}

function padTurfPolygon(points: { lat: number; lng: number }[]) {
  if (points.length >= 3) return convexHull(points);
  if (points.length === 2) {
    const [a, b] = points;
    const dLat = Math.max(0.004, Math.abs(a.lat - b.lat) * 0.35 + 0.002);
    const dLng = Math.max(0.004, Math.abs(a.lng - b.lng) * 0.35 + 0.002);
    return [
      { lat: a.lat + dLat, lng: a.lng - dLng },
      { lat: a.lat + dLat, lng: b.lng + dLng },
      { lat: b.lat - dLat, lng: b.lng + dLng },
      { lat: b.lat - dLat, lng: a.lng - dLng },
    ];
  }
  if (points.length === 1) {
    const { lat, lng } = points[0];
    const d = 0.006;
    return [
      { lat: lat + d, lng: lng - d },
      { lat: lat + d, lng: lng + d },
      { lat: lat - d, lng: lng + d },
      { lat: lat - d, lng: lng - d },
    ];
  }
  return [];
}

function scrollToMapCanvas() {
  nextTick(() => mapCanvasEl.value?.scrollIntoView({ behavior: "smooth", block: "center" }));
}

function buildRebalanceMoves() {
  type Bucket = { lga: string; ward: string; agents: AgentSummary[]; units: number };
  const buckets = new Map<string, Bucket>();
  for (const u of scopedUnits.value) {
    const ward = (u.ward || "").trim();
    const lga = (u.lga || "").trim();
    if (!ward || !lga) continue;
    const key = `${lga}::${ward}`;
    const cur = buckets.get(key) || { lga, ward, agents: [], units: 0 };
    cur.units += 1;
    buckets.set(key, cur);
  }
  for (const a of scopedAgents.value) {
    const ward = (a.ward || "").trim() || "Unassigned";
    const lga = (a.lga || "").trim() || "Unassigned";
    const key = `${lga}::${ward}`;
    const cur = buckets.get(key) || { lga, ward, agents: [], units: 0 };
    cur.agents.push(a);
    buckets.set(key, cur);
  }
  const list = [...buckets.values()].filter((b) => b.lga !== "Unassigned" && b.ward !== "Unassigned");
  if (list.length < 2) return [];

  const totalAgents = list.reduce((s, b) => s + b.agents.length, 0);
  const totalUnits = list.reduce((s, b) => s + b.units, 0) || 1;
  const targets = list.map((b) => ({
    ...b,
    target: Math.max(b.units > 0 ? 1 : 0, Math.round((totalAgents * b.units) / totalUnits)),
  }));

  const surplus: { agent: AgentSummary; from: Bucket }[] = [];
  for (const b of targets) {
    const extra = b.agents.length - b.target;
    if (extra <= 0) continue;
    const movable = [...b.agents].sort((a, c) => (a.live_unit_count || 0) - (c.live_unit_count || 0));
    for (let i = 0; i < extra && i < movable.length; i++) {
      surplus.push({ agent: movable[i], from: b });
    }
  }

  const moves: {
    agentId: string;
    name: string;
    fromLga: string;
    fromWard: string;
    toLga: string;
    toWard: string;
  }[] = [];
  const assigned = new Set<string>();

  for (const b of targets.sort((a, c) => a.agents.length - c.target - (c.agents.length - c.target))) {
    let need = b.target - b.agents.length;
    if (need <= 0) continue;
    while (need > 0 && surplus.length) {
      const next = surplus.shift()!;
      if (next.from.lga === b.lga && next.from.ward === b.ward) continue;
      if (assigned.has(next.agent.id)) continue;
      assigned.add(next.agent.id);
      moves.push({
        agentId: next.agent.id,
        name: next.agent.name,
        fromLga: next.from.lga,
        fromWard: next.from.ward,
        toLga: b.lga,
        toWard: b.ward,
      });
      need -= 1;
    }
  }
  return moves;
}

function openRebalance() {
  const moves = buildRebalanceMoves();
  rebalanceMoves.value = moves;
  showRebalance.value = true;
  if (!moves.length) {
    emit("message", "Field allocations are already balanced across active wards.");
  }
}

async function confirmRebalance() {
  if (!rebalanceMoves.value.length) {
    showRebalance.value = false;
    return;
  }
  rebalanceBusy.value = true;
  let ok = 0;
  try {
    for (const move of rebalanceMoves.value) {
      await $fetch(`${apiBase}/admin/agents/${move.agentId}/assignment`, {
        method: "PATCH",
        headers: authHeaders(),
        body: { lga: move.toLga, ward: move.toWard },
      });
      ok += 1;
    }
    showRebalance.value = false;
    emit("message", `Rebalanced ${ok} field allocation${ok === 1 ? "" : "s"} across wards.`);
    await refresh();
  } catch {
    emit("error", `Rebalance stopped after ${ok} move(s). Check agent access and try again.`);
  } finally {
    rebalanceBusy.value = false;
  }
}

async function openCutTurf() {
  mapTool.value = "polygon";
  showCutTurf.value = true;
  cutForm.agentIds = [];
  if (!lgas.value.length) await loadLgas();
  const top = lgaSectors.value[0];
  if (top?.lga) {
    cutForm.lga = top.lga;
    await loadWards(top.lga);
    const topWard = scopedAgents.value.find((a) => a.lga === top.lga)?.ward || wards.value[0] || "";
    cutForm.ward = topWard;
  } else if (lgas.value[0]) {
    cutForm.lga = lgas.value[0];
    await loadWards(cutForm.lga);
    cutForm.ward = wards.value[0] || "";
  }
  scrollToMapCanvas();
}

async function onCutLgaChange() {
  cutForm.ward = "";
  await loadWards(cutForm.lga);
  cutForm.ward = wards.value[0] || "";
}

function toggleCutAgent(id: string) {
  const idx = cutForm.agentIds.indexOf(id);
  if (idx >= 0) cutForm.agentIds.splice(idx, 1);
  else cutForm.agentIds.push(id);
}

async function confirmCutTurf() {
  if (!cutForm.lga || !cutForm.ward) {
    emit("error", "Select LGA and ward for the new polygon turf.");
    return;
  }
  if (!cutForm.agentIds.length) {
    emit("error", "Select at least one field agent to assign to this turf.");
    return;
  }
  cutBusy.value = true;
  let ok = 0;
  try {
    for (const agentId of cutForm.agentIds) {
      await $fetch(`${apiBase}/admin/agents/${agentId}/assignment`, {
        method: "PATCH",
        headers: authHeaders(),
        body: { lga: cutForm.lga, ward: cutForm.ward },
      });
      ok += 1;
    }
    await refresh({ map: { lga: cutForm.lga, ward: cutForm.ward } });
    const pts = (fieldMapData.value?.units || [])
      .filter((u) => u.ward === cutForm.ward)
      .map((u) => ({ lat: u.lat, lng: u.lng }));
    turfPolygon.value = padTurfPolygon(pts);
    mapTool.value = "polygon";
    showCutTurf.value = false;
    emit(
      "message",
      `Cut polygon turf for ${cutForm.ward}, ${cutForm.lga} — assigned ${ok} agent${ok === 1 ? "" : "s"}.`,
    );
    scrollToMapCanvas();
  } catch {
    emit("error", `Turf cut stopped after ${ok} assignment(s). Verify LGA/ward and try again.`);
  } finally {
    cutBusy.value = false;
  }
}

async function downloadWalksheets() {
  walksheetBusy.value = true;
  try {
    if (!fieldMapData.value?.units?.length) {
      await loadFieldMap({
        state: props.stateScope !== "all" ? props.stateScope : "Ogun State",
        ...(lgaSectors.value[0]?.lga ? { lga: lgaSectors.value[0].lga } : {}),
      });
    }
    const units = fieldMapData.value?.units || [];
    const agentsByWard = new Map<string, AgentSummary[]>();
    for (const a of scopedAgents.value) {
      const key = `${a.lga || ""}::${a.ward || ""}`;
      const list = agentsByWard.get(key) || [];
      list.push(a);
      agentsByWard.set(key, list);
    }

    const header = [
      "walk_order",
      "turf_code",
      "turf_title",
      "lga",
      "ward",
      "pu_code",
      "pu_name",
      "lat",
      "lng",
      "stream_status",
      "people_count",
      "assigned_agents",
      "agent_emails",
    ];
    const rows: string[] = [header.join(",")];

    if (turfPackets.value.length) {
      let order = 1;
      for (const packet of turfPackets.value) {
        const [lgaPart, wardPart] = packet.id.split("::");
        const wardUnits = units
          .filter((u) => (u.lga || "") === (lgaPart || "") && (u.ward || "") === (wardPart || ""))
          .sort((a, b) => a.name.localeCompare(b.name));
        const packetAgents = packet.agents;
        const agentNames = packetAgents.map((a) => a.name).join("; ");
        const agentEmails = packetAgents.map((a) => a.email).join("; ");
        if (!wardUnits.length) {
          rows.push(
            [
              order++,
              csvCell(packet.code),
              csvCell(packet.title),
              csvCell(lgaPart),
              csvCell(wardPart),
              "",
              "",
              "",
              "",
              "no_units",
              0,
              csvCell(agentNames),
              csvCell(agentEmails),
            ].join(","),
          );
          continue;
        }
        for (const u of wardUnits) {
          rows.push(
            [
              order++,
              csvCell(packet.code),
              csvCell(packet.title),
              csvCell(u.lga),
              csvCell(u.ward),
              csvCell(u.code),
              csvCell(u.name),
              u.lat,
              u.lng,
              csvCell(u.stream_status),
              u.people_count || 0,
              csvCell(agentNames),
              csvCell(agentEmails),
            ].join(","),
          );
        }
      }
    } else if (units.length) {
      units.forEach((u, i) => {
        const key = `${u.lga || ""}::${u.ward || ""}`;
        const ags = agentsByWard.get(key) || [];
        rows.push(
          [
            i + 1,
            csvCell(`TRF-${String(i + 1).padStart(3, "0")}`),
            csvCell(`${u.ward} · ${u.lga}`),
            csvCell(u.lga),
            csvCell(u.ward),
            csvCell(u.code),
            csvCell(u.name),
            u.lat,
            u.lng,
            csvCell(u.stream_status),
            u.people_count || 0,
            csvCell(ags.map((a) => a.name).join("; ")),
            csvCell(ags.map((a) => a.email).join("; ")),
          ].join(","),
        );
      });
    } else {
      emit("error", "No turf packets or mapped polling units to export.");
      return;
    }

    const blob = new Blob([rows.join("\n")], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `turf-walksheets-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    emit("message", `Turf walksheets exported (${rows.length - 1} stop(s)).`);
  } finally {
    walksheetBusy.value = false;
  }
}

async function fetchRecordingBlob(id: string) {
  const res = await fetch(`${apiBase}/admin/recordings/${id}/video`, { headers: authHeaders() });
  if (!res.ok) throw new Error("Failed to fetch recording.");
  return res.blob();
}

function closePlayer() {
  if (playingUrl.value) URL.revokeObjectURL(playingUrl.value);
  playingUrl.value = null;
  playingTitle.value = "";
}

async function playRecording(rec: FeedRecording) {
  busyRecording.value = rec.id;
  try {
    closePlayer();
    const blob = await fetchRecordingBlob(rec.id);
    playingUrl.value = URL.createObjectURL(blob);
    playingTitle.value = `${rec.polling_unit_name || rec.code} · ${rec.ward}`;
    showRecordings.value = true;
  } catch {
    emit("error", "Could not load the recording for playback.");
  } finally {
    busyRecording.value = null;
  }
}

async function downloadRecording(rec: FeedRecording) {
  busyRecording.value = rec.id;
  try {
    const blob = await fetchRecordingBlob(rec.id);
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${rec.code}-${rec.id}.mp4`;
    a.click();
    URL.revokeObjectURL(url);
  } catch {
    emit("error", "Failed to download the recording.");
  } finally {
    busyRecording.value = null;
  }
}

async function deleteRecording(id: string) {
  if (!confirm("Delete this recording permanently?")) return;
  try {
    await $fetch(`${apiBase}/admin/recordings/${id}`, { method: "DELETE", headers: authHeaders() });
    recordings.value = recordings.value.filter((r) => r.id !== id);
    if (playingTitle.value) closePlayer();
    emit("message", "Recording deleted.");
  } catch {
    emit("error", "Failed to delete the recording.");
  }
}
</script>

<template>
  <div class="flex w-full flex-col space-y-8 pb-8">
    <!-- Command Header -->
    <section class="mt-2 flex flex-col gap-4">
      <div class="flex flex-wrap items-center gap-2">
        <span class="font-label-caps text-label-caps uppercase tracking-wider text-on-surface-variant">HQ Central Command</span>
        <span class="font-label-caps text-label-caps text-outline-variant">/</span>
        <span class="font-label-caps text-label-caps font-semibold uppercase tracking-wider text-deep-navy dark:text-pure-white">
          Field Canvassing &amp; Spatial Operations
        </span>
      </div>
      <div class="flex flex-col justify-between gap-6 xl:flex-row xl:items-end">
        <div class="space-y-1">
          <h1 class="font-headline-lg text-2xl font-bold tracking-tight text-deep-navy dark:text-pure-white sm:text-headline-md lg:text-[40px] lg:leading-[48px]">
            Field Canvassing &amp; Turf Command
          </h1>
          <p class="max-w-3xl font-body-md text-sm text-on-surface-variant sm:text-body-md">
            Real-time spatial deployment, door-to-door turf cutting, GPS walk route optimization, and live sync across mobile field terminals.
          </p>
        </div>
        <div class="grid w-full grid-cols-1 gap-2 sm:grid-cols-3 xl:w-auto xl:shrink-0">
          <button
            type="button"
            class="inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-surface-container-lowest px-4 font-button-text text-sm font-semibold text-deep-navy shadow-sm transition hover:bg-surface-container-low disabled:opacity-60 dark:text-pure-white"
            :disabled="walksheetBusy"
            @click="downloadWalksheets"
          >
            <span class="material-symbols-outlined shrink-0 text-[18px] text-outline">file_download</span>
            <span class="truncate">{{ walksheetBusy ? "Exporting…" : "Download Turf Walksheets" }}</span>
          </button>
          <button
            type="button"
            class="inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-surface-container-lowest px-4 font-button-text text-sm font-semibold text-deep-navy shadow-sm transition hover:bg-surface-container-low disabled:opacity-60 dark:text-pure-white"
            :disabled="loading || rebalanceBusy"
            @click="openRebalance"
          >
            <span class="material-symbols-outlined shrink-0 text-[18px] text-action-green">alt_route</span>
            <span class="truncate">Rebalance Field Allocations</span>
          </button>
          <button
            type="button"
            class="inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-secondary-container px-4 font-button-text text-sm font-semibold text-pure-white shadow-sm shadow-secondary-container/20 transition hover:opacity-95"
            @click="openCutTurf"
          >
            <span class="material-symbols-outlined shrink-0 text-[18px]">add_location_alt</span>
            <span class="truncate">Cut New Polygon Turf</span>
          </button>
        </div>
      </div>
    </section>

    <div v-if="loading && !overview" class="rounded-xl bg-surface-container-lowest p-10 text-center text-sm text-outline shadow-sm">
      Loading turf command…
    </div>

    <template v-else>
      <!-- KPI Grid -->
      <section class="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-4">
        <div class="relative flex flex-col justify-between overflow-hidden rounded-xl bg-surface-container-lowest p-5 shadow-sm">
          <div class="flex items-start justify-between">
            <div class="space-y-1">
              <span class="block font-label-caps text-label-caps uppercase tracking-wider text-on-surface-variant">Active Canvassers in Field</span>
              <div class="flex items-baseline gap-2">
                <span class="font-display-lg text-[36px] font-bold leading-[40px] tracking-tight text-deep-navy dark:text-pure-white sm:text-[40px] sm:leading-[44px]">
                  {{ activeCanvassers.toLocaleString() }}
                </span>
                <span class="flex items-center font-label-caps text-label-caps font-semibold text-action-green">
                  <span class="material-symbols-outlined text-[16px]">north</span>
                  {{ agentsWithLive }} live
                </span>
              </div>
            </div>
            <div class="flex h-10 w-10 items-center justify-center rounded-lg bg-surface-container-low text-deep-navy dark:text-pure-white">
              <span class="material-symbols-outlined">directions_walk</span>
            </div>
          </div>
          <div class="mt-4 flex items-center justify-between pt-3 font-body-md text-xs text-on-surface-variant">
            <span>{{ turfPackets.length }} active turf packs</span>
            <span class="rounded-full bg-surface-container px-2 py-0.5 font-label-caps text-label-caps font-medium text-deep-navy dark:text-pure-white">
              {{ gpsActivePct }}% GPS Active
            </span>
          </div>
        </div>

        <div class="relative flex flex-col justify-between overflow-hidden rounded-xl bg-surface-container-lowest p-5 shadow-sm">
          <div class="flex items-start justify-between">
            <div class="space-y-1">
              <span class="block font-label-caps text-label-caps uppercase tracking-wider text-on-surface-variant">People On Site Today</span>
              <div class="flex items-baseline gap-2">
                <span class="font-display-lg text-[36px] font-bold leading-[40px] tracking-tight text-deep-navy dark:text-pure-white sm:text-[40px] sm:leading-[44px]">
                  {{ peopleOnSite.toLocaleString() }}
                </span>
                <span class="font-label-caps text-label-caps text-on-surface-variant">/ {{ dailyQuota.toLocaleString() }}</span>
              </div>
            </div>
            <div class="flex h-10 w-10 items-center justify-center rounded-lg bg-surface-container-low text-deep-navy dark:text-pure-white">
              <span class="material-symbols-outlined">sensor_door</span>
            </div>
          </div>
          <div class="mt-4 flex flex-col gap-1.5 pt-3">
            <div class="h-1.5 w-full overflow-hidden rounded-full bg-surface-container-highest">
              <div class="h-full rounded-full bg-action-green" :style="{ width: `${doorsPct}%` }" />
            </div>
            <div class="flex items-center justify-between font-body-md text-xs text-on-surface-variant">
              <span>{{ doorsPct }}% of field capacity</span>
              <span class="font-label-caps text-label-caps font-medium text-action-green">
                {{ liveUnits.length }} live units
              </span>
            </div>
          </div>
        </div>

        <div class="relative flex flex-col justify-between overflow-hidden rounded-xl bg-surface-container-lowest p-5 shadow-sm">
          <div class="flex items-start justify-between">
            <div class="space-y-1">
              <span class="block font-label-caps text-label-caps uppercase tracking-wider text-on-surface-variant">Contact &amp; Engagement</span>
              <div class="flex items-baseline gap-2">
                <span class="font-display-lg text-[36px] font-bold leading-[40px] tracking-tight text-deep-navy dark:text-pure-white sm:text-[40px] sm:leading-[44px]">
                  {{ contactRate }}%
                </span>
                <span class="font-label-caps text-label-caps font-semibold text-secondary-container">Units Live</span>
              </div>
            </div>
            <div class="flex h-10 w-10 items-center justify-center rounded-lg bg-surface-container-low text-secondary-container">
              <span class="material-symbols-outlined">forum</span>
            </div>
          </div>
          <div class="mt-4 flex items-center justify-between pt-3 font-body-md text-xs text-on-surface-variant">
            <span>{{ (overview?.live_feeds ?? liveUnits.length).toLocaleString() }} live feeds</span>
            <span class="font-label-caps text-label-caps font-semibold text-deep-navy dark:text-pure-white">
              {{ supportHint }}% results coverage
            </span>
          </div>
        </div>

        <div class="relative flex flex-col justify-between overflow-hidden rounded-xl bg-surface-container-lowest p-5 shadow-sm">
          <div class="flex items-start justify-between">
            <div class="space-y-1">
              <span class="block font-label-caps text-label-caps uppercase tracking-wider text-on-surface-variant">Offline Edge Sync</span>
              <div class="flex items-baseline gap-2">
                <span
                  class="font-display-lg text-[36px] font-bold leading-[40px] tracking-tight sm:text-[40px] sm:leading-[44px]"
                  :class="offlineUnits.length ? 'text-electric-pink' : 'text-action-green'"
                >
                  {{ offlineUnits.length }}
                </span>
                <span class="font-label-caps text-label-caps text-on-surface-variant">Queued Backlog</span>
              </div>
            </div>
            <div
              class="flex h-10 w-10 items-center justify-center rounded-lg bg-surface-container-low"
              :class="offlineUnits.length ? 'text-electric-pink' : 'text-action-green'"
            >
              <span class="material-symbols-outlined">{{ offlineUnits.length ? "cloud_off" : "cloud_done" }}</span>
            </div>
          </div>
          <div class="mt-4 flex items-center justify-between pt-3 font-body-md text-xs text-on-surface-variant">
            <span>{{ scopedRecordings.length }} feed recording(s)</span>
            <span
              class="rounded-full px-2 py-0.5 font-label-caps text-label-caps font-semibold"
              :class="offlineUnits.length ? 'bg-electric-pink/15 text-electric-pink' : 'bg-action-green/20 text-tertiary-container dark:text-action-green'"
            >
              {{ offlineUnits.length ? "Needs Sync" : "Mesh Zero-Latency" }}
            </span>
          </div>
        </div>
      </section>

      <!-- Workspace -->
      <section class="grid grid-cols-1 items-start gap-6 lg:grid-cols-12">
        <div class="flex flex-col gap-4 lg:col-span-7">
          <div class="relative flex flex-col overflow-hidden rounded-xl bg-surface-container-lowest p-4 shadow-sm">
            <div class="flex flex-wrap items-center justify-between gap-3 pb-3">
              <div class="flex flex-wrap items-center gap-2">
                <span class="font-headline-md text-lg font-bold text-deep-navy dark:text-pure-white">Precinct Operations Canvas</span>
                <span class="rounded-full bg-surface-container px-2 py-0.5 font-label-caps text-xs text-on-surface-variant">
                  {{ zoneLabel }}
                </span>
              </div>
              <div class="flex items-center gap-1.5 rounded-lg bg-off-white p-1">
                <button
                  v-for="tool in [
                    { id: 'polygon' as const, icon: 'draw', label: 'Polygon Tool', color: 'text-secondary-container' },
                    { id: 'radius' as const, icon: 'radar', label: 'Radius (500m)', color: '' },
                    { id: 'heatmap' as const, icon: 'local_fire_department', label: 'Heatmap', color: 'text-action-green' },
                    { id: 'gps' as const, icon: 'my_location', label: 'Live GPS', color: '' },
                  ]"
                  :key="tool.id"
                  type="button"
                  class="flex items-center gap-1 rounded-md px-2.5 py-1.5 font-label-caps text-xs transition-colors"
                  :class="
                    mapTool === tool.id
                      ? 'bg-surface-container-lowest font-semibold text-deep-navy shadow-sm dark:text-pure-white'
                      : 'text-on-surface-variant hover:bg-surface-container-high'
                  "
                  @click="selectMapTool(tool.id)"
                >
                  <span class="material-symbols-outlined text-[16px]" :class="tool.color">{{ tool.icon }}</span>
                  {{ tool.label }}
                </button>
              </div>
            </div>

            <div ref="mapCanvasEl" class="relative h-[420px] w-full overflow-hidden rounded-xl bg-deep-navy shadow-inner sm:h-[520px]">
              <GoogleMapPanel
                class="absolute inset-0"
                :center="fieldMapCenter"
                :zoom="11"
                :markers="fieldMapMarkers"
                :loading="fieldMapLoading"
                :polygon="mapTool === 'polygon' ? turfPolygon : []"
                polygon-color="#FF387F"
              />

              <div class="pointer-events-none absolute inset-0 flex flex-col justify-between p-4 sm:p-6">
                <div
                  v-if="mapSectors[0] || fieldMapData"
                  class="pointer-events-none max-w-xs space-y-2 self-start rounded-xl bg-deep-navy/90 p-3.5 text-pure-white shadow-xl backdrop-blur-md"
                >
                  <div class="flex items-center justify-between gap-2">
                    <span class="flex items-center gap-1.5 font-label-caps text-xs font-bold text-action-green">
                      <span class="h-2 w-2 animate-ping rounded-full bg-action-green" />
                      {{ (mapSectors[0]?.lga || fieldMapData?.lga || "OGUN").toUpperCase() }}
                    </span>
                    <span class="rounded bg-action-green/20 px-1.5 py-0.5 font-label-caps text-xs font-bold text-action-green">
                      {{ mapSectors[0]?.pct ?? fieldMapData?.live_count ?? 0 }}{{ mapSectors[0] ? "%" : " live" }}
                    </span>
                  </div>
                  <p class="font-body-md text-xs text-surface-dim">
                    <template v-if="mapSectors[0]">
                      {{ mapSectors[0].agents }} field operatives · {{ mapSectors[0].live }}/{{ mapSectors[0].units }} units live ·
                      {{ mapSectors[0].people.toLocaleString() }} on site
                    </template>
                    <template v-else-if="fieldMapData">
                      {{ fieldMapData.live_count }} live · {{ fieldMapData.registered_count }} registered ·
                      {{ fieldMapData.total }} catalog units
                    </template>
                  </p>
                </div>

                <div
                  class="pointer-events-none flex flex-wrap items-center gap-4 self-start rounded-xl bg-surface/90 px-4 py-2 font-label-caps text-xs text-deep-navy shadow-lg backdrop-blur-md"
                >
                  <div class="flex items-center gap-1.5">
                    <span class="h-2.5 w-2.5 rounded-full bg-action-green" />
                    <span>Live</span>
                  </div>
                  <div class="flex items-center gap-1.5">
                    <span class="h-2.5 w-2.5 rounded-full bg-secondary-container" />
                    <span>Registered</span>
                  </div>
                  <div class="flex items-center gap-1.5">
                    <span class="h-2.5 w-2.5 rounded-full bg-surface-container-highest" />
                    <span>{{ mapTool === 'gps' ? 'Live GPS' : mapTool === 'heatmap' ? 'Heatmap' : 'Turf tool' }}</span>
                  </div>
                </div>
              </div>
            </div>

            <div class="mt-1 grid grid-cols-2 gap-3 pt-3 sm:grid-cols-4">
              <div class="rounded-lg bg-off-white p-2.5">
                <span class="block font-label-caps text-[11px] uppercase text-on-surface-variant">Precincts Live</span>
                <span class="font-headline-md text-base font-bold text-deep-navy dark:text-on-surface">
                  {{ precinctsLocked }} of {{ totalUnits || "—" }}
                </span>
              </div>
              <div class="rounded-lg bg-off-white p-2.5">
                <span class="block font-label-caps text-[11px] uppercase text-on-surface-variant">Avg Walk Cadence</span>
                <span class="font-headline-md text-base font-bold text-deep-navy dark:text-on-surface">{{ avgCadence }}</span>
              </div>
              <div class="rounded-lg bg-off-white p-2.5">
                <span class="block font-label-caps text-[11px] uppercase text-on-surface-variant">Field Snaps</span>
                <span class="font-headline-md text-base font-bold text-secondary-container">{{ snapsPlaced.toLocaleString() }} units</span>
              </div>
              <div class="rounded-lg bg-off-white p-2.5">
                <span class="block font-label-caps text-[11px] uppercase text-on-surface-variant">Live Door Velocity</span>
                <span class="font-headline-md text-base font-bold text-action-green">{{ doorVelocity }}</span>
              </div>
            </div>
          </div>

          <div class="flex items-start justify-between gap-4 rounded-xl bg-primary p-5 text-pure-white shadow-md">
            <div class="flex items-start gap-3.5">
              <div class="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-surface-container-highest/20 text-action-green">
                <span class="material-symbols-outlined text-2xl">thunderstorm</span>
              </div>
              <div class="space-y-1">
                <div class="flex flex-wrap items-center gap-2">
                  <span class="font-label-caps text-xs font-bold uppercase tracking-wider text-action-green">
                    {{ advisory.title }}
                  </span>
                  <span class="rounded-full bg-pure-white/10 px-2 py-0.5 font-label-caps text-[10px] text-surface-dim">
                    {{ advisory.priority }}
                  </span>
                </div>
                <p class="font-body-md text-sm text-surface-dim">{{ advisory.body }}</p>
              </div>
            </div>
            <button
              type="button"
              class="shrink-0 rounded-lg bg-action-green px-4 py-2 font-button-text text-sm font-semibold text-tertiary-container transition-all hover:opacity-90"
              @click="applyRebalance"
            >
              Apply Route Rebalance
            </button>
          </div>
        </div>

        <!-- Right drawer -->
        <div class="flex flex-col gap-6 lg:col-span-5">
          <div class="space-y-4 rounded-xl bg-surface-container-lowest p-5 shadow-sm">
            <div class="flex items-center justify-between">
              <div class="space-y-0.5">
                <h2 class="font-headline-md text-lg font-bold text-deep-navy dark:text-pure-white">Active Turf Dispatches</h2>
                <span class="font-label-caps text-xs uppercase text-on-surface-variant">
                  {{ Math.min(3, turfPackets.length) }} of {{ turfPackets.length }} packets in field
                </span>
              </div>
              <button
                type="button"
                class="font-label-caps text-xs font-semibold text-secondary-container hover:underline"
                @click="showAllPacks = !showAllPacks"
              >
                {{ showAllPacks ? "Show Top Packs" : "View All Packs" }}
              </button>
            </div>

            <div v-if="!visiblePackets.length" class="rounded-xl bg-off-white p-4 text-xs text-outline">
              No turf packets yet — assign agents to wards to open dispatches.
            </div>

            <div class="space-y-3">
              <div
                v-for="packet in visiblePackets"
                :key="packet.id"
                class="space-y-3 rounded-xl bg-off-white p-4 transition-colors hover:bg-surface-container-low"
              >
                <div class="flex items-start justify-between gap-3">
                  <div>
                    <div class="flex flex-wrap items-center gap-2">
                      <span class="font-label-caps text-xs font-bold text-deep-navy dark:text-on-surface">#{{ packet.code }}</span>
                      <span class="font-headline-md text-sm font-semibold text-deep-navy dark:text-on-surface">{{ packet.title }}</span>
                    </div>
                    <p class="mt-0.5 font-body-md text-xs text-on-surface-variant">
                      Lead: {{ packet.lead }} · {{ packet.canvassers }} canvassers
                    </p>
                  </div>
                  <button
                    type="button"
                    class="shrink-0 rounded-lg bg-surface-container-lowest px-3 py-1 font-label-caps text-xs font-semibold text-deep-navy shadow-sm transition-all hover:bg-deep-navy hover:text-pure-white dark:text-on-surface"
                    @click="monitorPacket(packet)"
                  >
                    Live Monitor
                  </button>
                </div>
                <div class="space-y-1.5">
                  <div class="flex justify-between font-label-caps text-xs">
                    <span class="text-on-surface-variant">Progress</span>
                    <span class="font-bold text-deep-navy dark:text-on-surface">
                      {{ packet.live }} / {{ packet.units || "—" }} units ({{ packet.pct }}%)
                    </span>
                  </div>
                  <div class="h-1.5 w-full overflow-hidden rounded-full bg-surface-container-highest">
                    <div
                      class="h-full rounded-full"
                      :class="packet.pct >= 60 ? 'bg-action-green' : 'bg-secondary-container'"
                      :style="{ width: `${packet.pct}%` }"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div class="space-y-4 rounded-xl bg-surface-container-lowest p-5 shadow-sm">
            <div class="flex items-center justify-between">
              <div class="flex items-center gap-2">
                <span class="h-2.5 w-2.5 animate-pulse rounded-full bg-action-green" />
                <h2 class="font-headline-md text-lg font-bold text-deep-navy dark:text-pure-white">Live Canvass Field Feed</h2>
              </div>
              <span class="font-label-caps text-xs text-on-surface-variant">Streaming Real-Time</span>
            </div>

            <div v-if="!fieldFeed.length" class="rounded-lg bg-off-white p-3 text-xs text-outline">
              Waiting for live units and recordings…
            </div>

            <div class="space-y-3 font-body-md">
              <div
                v-for="item in fieldFeed"
                :key="item.id"
                class="flex items-start gap-3 rounded-lg bg-off-white p-3"
              >
                <div
                  class="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full"
                  :class="item.tone"
                >
                  <span class="material-symbols-outlined text-[18px]">{{ item.icon }}</span>
                </div>
                <div class="min-w-0 flex-1">
                  <div class="flex items-center justify-between gap-2">
                    <span class="font-label-caps text-xs text-on-surface-variant">{{ item.time }}</span>
                    <span class="rounded bg-surface-container px-1.5 font-label-caps text-[11px] text-deep-navy dark:text-on-surface">
                      {{ item.badge }}
                    </span>
                  </div>
                  <p class="mt-1 text-xs text-deep-navy dark:text-on-surface" v-html="item.html" />
                </div>
              </div>
            </div>

            <button
              type="button"
              class="w-full rounded-xl bg-surface-container py-2 font-button-text text-xs text-on-surface transition-colors hover:bg-surface-container-high"
              @click="showRecordings = !showRecordings"
            >
              {{ showRecordings ? "Hide" : "Open" }} feed recordings library ({{ scopedRecordings.length }})
            </button>
          </div>
        </div>
      </section>

      <!-- Recordings library -->
      <section
        v-if="showRecordings"
        class="overflow-hidden rounded-xl bg-surface-container-lowest shadow-sm"
      >
        <div class="flex flex-wrap items-center justify-between gap-3 border-b border-outline-variant/30 px-5 py-4">
          <div>
            <h2 class="font-semibold text-primary">Saved feed recordings</h2>
            <p class="text-xs text-outline">
              {{ scopedRecordings.length }} recording(s)
              <span v-if="stateScope !== 'all'"> · {{ stateScope }}</span>
              · assembled from live relay frames
            </p>
          </div>
          <button
            type="button"
            class="rounded-lg bg-surface-container px-3 py-1.5 text-xs text-on-surface hover:bg-surface-container-high"
            @click="refresh"
          >
            Refresh
          </button>
        </div>

        <div v-if="!scopedRecordings.length" class="p-8 text-center text-sm text-outline">
          No recordings in this scope yet.
        </div>
        <div v-else class="overflow-x-auto">
          <table class="w-full text-left text-sm">
            <thead>
              <tr class="bg-surface-container-low font-label-caps text-[11px] uppercase tracking-wider text-on-surface-variant">
                <th class="px-4 py-3">Polling unit</th>
                <th class="px-4 py-3">Ward / LGA</th>
                <th class="px-4 py-3">Started</th>
                <th class="px-4 py-3 text-right">Length</th>
                <th class="px-4 py-3 text-right">Size</th>
                <th class="px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="rec in scopedRecordings"
                :key="rec.id"
                class="transition-colors hover:bg-surface-container-low/60"
              >
                <td class="px-4 py-3">
                  <p class="font-medium text-on-surface">{{ rec.polling_unit_name || rec.code }}</p>
                  <p class="font-label-caps text-[10px] text-outline">{{ rec.code }}</p>
                </td>
                <td class="px-4 py-3 text-on-surface-variant">
                  {{ rec.ward || "—" }} · {{ rec.lga || "—" }}
                </td>
                <td class="px-4 py-3 text-on-surface-variant">
                  {{ formatWhen(rec.started_at) }}
                  <span
                    v-if="rec.status === 'recording'"
                    class="ml-1 rounded-full bg-error/15 px-2 py-0.5 text-[10px] font-semibold text-error"
                  >
                    recording…
                  </span>
                </td>
                <td class="px-4 py-3 text-right text-on-surface-variant">{{ formatDuration(rec.duration_seconds) }}</td>
                <td class="px-4 py-3 text-right text-on-surface-variant">{{ formatBytes(rec.file_size) }}</td>
                <td class="px-4 py-3">
                  <div class="flex flex-wrap gap-2">
                    <button
                      type="button"
                      class="rounded-lg bg-surface-container px-2 py-1 text-xs disabled:opacity-50"
                      :disabled="rec.status === 'recording' || busyRecording === rec.id"
                      @click="playRecording(rec)"
                    >
                      {{ busyRecording === rec.id ? "Loading…" : "Play" }}
                    </button>
                    <button
                      type="button"
                      class="rounded-lg bg-surface-container px-2 py-1 text-xs disabled:opacity-50"
                      :disabled="rec.status === 'recording' || busyRecording === rec.id"
                      @click="downloadRecording(rec)"
                    >
                      Download
                    </button>
                    <button
                      type="button"
                      class="rounded-lg bg-error/10 px-2 py-1 text-xs text-error"
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

        <div v-if="playingUrl" class="border-t border-outline-variant/30 p-5">
          <div class="mb-2 flex items-center justify-between">
            <p class="text-sm font-medium text-on-surface">{{ playingTitle }}</p>
            <button type="button" class="text-xs text-outline hover:text-on-surface" @click="closePlayer">Close</button>
          </div>
          <video :src="playingUrl" controls autoplay class="w-full rounded-lg bg-black" />
        </div>
      </section>
    </template>

    <!-- Rebalance modal -->
    <Teleport to="body">
      <div
        v-if="showRebalance"
        class="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
        @click.self="showRebalance = false"
      >
        <div class="flex max-h-[85vh] w-full max-w-lg flex-col overflow-hidden rounded-2xl bg-surface-container-lowest shadow-2xl">
          <header class="flex items-start justify-between gap-3 border-b border-outline-variant/30 px-5 py-4">
            <div>
              <h2 class="font-button-text text-lg font-bold text-deep-navy dark:text-pure-white">Rebalance field allocations</h2>
              <p class="mt-1 text-xs text-outline">
                Moves surplus agents from overstaffed wards into understaffed wards with live units.
              </p>
            </div>
            <button type="button" class="rounded-lg p-1.5 text-outline hover:bg-surface-container" @click="showRebalance = false">
              <span class="material-symbols-outlined text-[20px]">close</span>
            </button>
          </header>
          <div class="min-h-0 flex-1 overflow-y-auto px-5 py-4">
            <p v-if="!rebalanceMoves.length" class="text-sm text-outline">No moves needed — coverage looks balanced.</p>
            <ul v-else class="space-y-2">
              <li
                v-for="move in rebalanceMoves"
                :key="move.agentId"
                class="rounded-xl bg-surface-container-low px-3 py-2.5 text-sm text-on-surface"
              >
                <span class="font-semibold text-deep-navy dark:text-pure-white">{{ move.name }}</span>
                <span class="mt-0.5 block text-xs text-outline">
                  {{ move.fromWard }}, {{ move.fromLga }}
                  <span class="mx-1 text-action-green">→</span>
                  {{ move.toWard }}, {{ move.toLga }}
                </span>
              </li>
            </ul>
          </div>
          <footer class="flex flex-wrap justify-end gap-2 border-t border-outline-variant/30 px-5 py-4">
            <button
              type="button"
              class="inline-flex h-10 items-center justify-center rounded-xl bg-surface-container px-4 font-button-text text-sm font-semibold text-on-surface"
              @click="showRebalance = false"
            >
              Cancel
            </button>
            <button
              type="button"
              class="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-deep-navy px-4 font-button-text text-sm font-semibold text-pure-white disabled:opacity-60"
              :disabled="rebalanceBusy || !rebalanceMoves.length"
              @click="confirmRebalance"
            >
              {{ rebalanceBusy ? "Applying…" : `Apply ${rebalanceMoves.length} move${rebalanceMoves.length === 1 ? "" : "s"}` }}
            </button>
          </footer>
        </div>
      </div>
    </Teleport>

    <!-- Cut turf modal -->
    <Teleport to="body">
      <div
        v-if="showCutTurf"
        class="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
        @click.self="showCutTurf = false"
      >
        <div class="flex max-h-[85vh] w-full max-w-lg flex-col overflow-hidden rounded-2xl bg-surface-container-lowest shadow-2xl">
          <header class="flex items-start justify-between gap-3 border-b border-outline-variant/30 px-5 py-4">
            <div>
              <h2 class="font-button-text text-lg font-bold text-deep-navy dark:text-pure-white">Cut new polygon turf</h2>
              <p class="mt-1 text-xs text-outline">
                Assign field agents to an LGA/ward. The map draws a polygon around polling units in that turf.
              </p>
            </div>
            <button type="button" class="rounded-lg p-1.5 text-outline hover:bg-surface-container" @click="showCutTurf = false">
              <span class="material-symbols-outlined text-[20px]">close</span>
            </button>
          </header>
          <div class="min-h-0 flex-1 space-y-4 overflow-y-auto px-5 py-4">
            <div class="grid gap-3 sm:grid-cols-2">
              <label class="block text-xs font-semibold text-outline">
                LGA
                <select
                  v-model="cutForm.lga"
                  class="mt-1 w-full rounded-xl bg-off-white px-3 py-2.5 text-sm text-on-surface focus:outline-none"
                  @change="onCutLgaChange"
                >
                  <option value="" disabled>Select LGA</option>
                  <option v-for="lga in lgas" :key="lga" :value="lga">{{ lga }}</option>
                </select>
              </label>
              <label class="block text-xs font-semibold text-outline">
                Ward
                <select
                  v-model="cutForm.ward"
                  class="mt-1 w-full rounded-xl bg-off-white px-3 py-2.5 text-sm text-on-surface focus:outline-none"
                  :disabled="!cutForm.lga"
                >
                  <option value="" disabled>Select ward</option>
                  <option v-for="ward in wards" :key="ward" :value="ward">{{ ward }}</option>
                </select>
              </label>
            </div>
            <div>
              <p class="mb-2 text-xs font-semibold text-outline">
                Field agents ({{ cutForm.agentIds.length }} selected)
              </p>
              <div v-if="!scopedAgents.length" class="rounded-xl bg-surface-container-low p-4 text-sm text-outline">
                No field agents in this scope.
              </div>
              <ul v-else class="max-h-48 space-y-1 overflow-y-auto rounded-xl bg-surface-container-low p-2">
                <li v-for="agent in scopedAgents" :key="agent.id">
                  <label class="flex cursor-pointer items-center gap-2 rounded-lg px-2 py-1.5 text-sm hover:bg-surface-container-lowest">
                    <input
                      type="checkbox"
                      class="rounded"
                      :checked="cutForm.agentIds.includes(agent.id)"
                      @change="toggleCutAgent(agent.id)"
                    />
                    <span class="min-w-0 flex-1 truncate font-medium text-on-surface">{{ agent.name }}</span>
                    <span class="shrink-0 font-label-caps text-[10px] text-outline">
                      {{ agent.ward || agent.lga || "Unassigned" }}
                    </span>
                  </label>
                </li>
              </ul>
            </div>
          </div>
          <footer class="flex flex-wrap justify-end gap-2 border-t border-outline-variant/30 px-5 py-4">
            <button
              type="button"
              class="inline-flex h-10 items-center justify-center rounded-xl bg-surface-container px-4 font-button-text text-sm font-semibold text-on-surface"
              @click="showCutTurf = false"
            >
              Cancel
            </button>
            <button
              type="button"
              class="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-secondary-container px-4 font-button-text text-sm font-semibold text-pure-white disabled:opacity-60"
              :disabled="cutBusy || !cutForm.lga || !cutForm.ward || !cutForm.agentIds.length"
              @click="confirmCutTurf"
            >
              {{ cutBusy ? "Cutting…" : "Cut turf & assign" }}
            </button>
          </footer>
        </div>
      </div>
    </Teleport>
  </div>
</template>
