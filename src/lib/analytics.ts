import type { Campaign, DailyMetric, Metrics } from "@/types/agent";

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

export function mergeAccountHistory(campaigns: Campaign[]): DailyMetric[] {
  const byDate = new Map<string, DailyMetric>();
  for (const c of campaigns) {
    for (const d of c.history) {
      const existing = byDate.get(d.date);
      if (existing) {
        existing.spend = round2(existing.spend + d.spend);
        existing.impressions += d.impressions;
        existing.clicks += d.clicks;
        existing.conversions += d.conversions;
        existing.revenue = round2(existing.revenue + d.revenue);
      } else {
        byDate.set(d.date, { ...d });
      }
    }
  }
  return Array.from(byDate.values()).sort((a, b) => a.date.localeCompare(b.date));
}

export function summarizeMetrics(history: DailyMetric[]): Metrics {
  const spend = round2(history.reduce((s, h) => s + h.spend, 0));
  const impressions = history.reduce((s, h) => s + h.impressions, 0);
  const clicks = history.reduce((s, h) => s + h.clicks, 0);
  const conversions = history.reduce((s, h) => s + h.conversions, 0);
  const revenue = round2(history.reduce((s, h) => s + h.revenue, 0));
  return {
    spend,
    impressions,
    clicks,
    conversions,
    revenue,
    ctr: impressions ? round2((clicks / impressions) * 100) : 0,
    cpc: clicks ? round2(spend / clicks) : 0,
    cpm: impressions ? round2((spend / impressions) * 1000) : 0,
    cpa: conversions ? round2(spend / conversions) : 0,
    roas: spend ? round2(revenue / spend) : 0,
  };
}

/** Percent change of `key` between the last `days` and the `days` before that. */
export function periodDeltaPct(history: DailyMetric[], days: number, metric: (m: Metrics) => number): number {
  const recent = history.slice(-days);
  const prior = history.slice(-days * 2, -days);
  if (!recent.length || !prior.length) return 0;
  const recentVal = metric(summarizeMetrics(recent));
  const priorVal = metric(summarizeMetrics(prior));
  if (priorVal === 0) return 0;
  return round2(((recentVal - priorVal) / priorVal) * 100);
}

export interface BreakdownShare {
  label: string;
  share: number; // 0-1, should sum to ~1 across the group
  roasMultiplier: number; // relative performance vs account average
}

export interface BreakdownRow {
  label: string;
  spend: number;
  conversions: number;
  roas: number;
}

/** Derives a plausible sub-breakdown (placement/device/demo) from account totals. */
export function splitByShares(total: Metrics, shares: BreakdownShare[]): BreakdownRow[] {
  return shares.map((s) => {
    const spend = round2(total.spend * s.share);
    const roas = round2(total.roas * s.roasMultiplier);
    const revenue = spend * roas;
    const conversions = Math.round((total.conversions * s.share) * s.roasMultiplier);
    return { label: s.label, spend, conversions, roas: revenue > 0 ? roas : 0 };
  });
}

export function allAdSets(campaigns: Campaign[]) {
  return campaigns.flatMap((c) => c.adSets.map((a) => ({ ...a, campaignName: c.name, campaignId: c.id })));
}

export function allCreatives(campaigns: Campaign[]) {
  return campaigns.flatMap((c) =>
    c.adSets.flatMap((a) =>
      a.creatives.map((cr) => ({
        ...cr,
        campaignId: c.id,
        campaignName: c.name,
        adSetId: a.id,
        adSetName: a.name,
        isActive: a.activeCreativeId === cr.id,
      })),
    ),
  );
}
