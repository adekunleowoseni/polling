import type { PollingUnit } from "./useVideoFeeds";

export type LgaFeedSummary = {
  lga: string;
  liveUnits: number;
  activeWards: number;
  totalPeople: number;
};

export type WardFeedSummary = {
  ward: string;
  lga: string;
  units: PollingUnit[];
  totalPeople: number;
  peakPeople: number;
};

export function liveUnitsOnly(units: PollingUnit[]): PollingUnit[] {
  return units.filter((u) => u.stream_status === "live");
}

export function groupByLga(units: PollingUnit[]): LgaFeedSummary[] {
  const map = new Map<string, PollingUnit[]>();
  for (const unit of liveUnitsOnly(units)) {
    const list = map.get(unit.lga) ?? [];
    list.push(unit);
    map.set(unit.lga, list);
  }

  return Array.from(map.entries())
    .map(([lga, lgaUnits]) => ({
      lga,
      liveUnits: lgaUnits.length,
      activeWards: new Set(lgaUnits.map((u) => u.ward)).size,
      totalPeople: lgaUnits.reduce((sum, u) => sum + u.people_count, 0),
    }))
    .sort((a, b) => a.lga.localeCompare(b.lga));
}

export function groupByWard(units: PollingUnit[], lga: string): WardFeedSummary[] {
  const map = new Map<string, PollingUnit[]>();
  for (const unit of liveUnitsOnly(units)) {
    if (unit.lga !== lga) continue;
    const list = map.get(unit.ward) ?? [];
    list.push(unit);
    map.set(unit.ward, list);
  }

  return Array.from(map.entries())
    .map(([ward, wardUnits]) => ({
      ward,
      lga,
      units: wardUnits,
      totalPeople: wardUnits.reduce((sum, u) => sum + u.people_count, 0),
      peakPeople: Math.max(...wardUnits.map((u) => u.peak_people_count), 0),
    }))
    .sort((a, b) => a.ward.localeCompare(b.ward));
}
