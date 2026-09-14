import type {
  AdSet,
  AgentLogEntry,
  Campaign,
  Creative,
  DailyMetric,
  Metrics,
} from "@/types/agent";
import { generateCreativeVariant } from "@/lib/copyGenerator";

let idCounter = 1;
function nextId(prefix: string): string {
  idCounter += 1;
  return `${prefix}_${idCounter.toString(36)}`;
}

function daysAgoISO(days: number, hour = 8, minuteJitter = 0): string {
  const d = new Date();
  d.setDate(d.getDate() - days);
  d.setHours(hour, minuteJitter, 0, 0);
  return d.toISOString();
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

function buildHistory(days: number, baseSpend: number, baseCtr: number, baseRoas: number, trend: number): DailyMetric[] {
  const out: DailyMetric[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const noise = 0.85 + Math.random() * 0.3;
    const trendFactor = 1 + trend * ((days - i) / days);
    const spend = round2(baseSpend * noise * trendFactor);
    const ctr = Math.max(0.4, baseCtr * (2 - trendFactor) * (0.9 + Math.random() * 0.2));
    const impressions = Math.round((spend / 8) * 1000);
    const clicks = Math.max(1, Math.round((impressions * ctr) / 100));
    const roas = Math.max(0.2, baseRoas * (2 - trendFactor) * (0.85 + Math.random() * 0.3));
    const revenue = round2(spend * roas);
    const conversions = Math.max(0, Math.round(revenue / (25 + Math.random() * 30)));
    out.push({
      date: new Date(Date.now() - i * 86400000).toISOString().slice(0, 10),
      spend,
      impressions,
      clicks,
      conversions,
      revenue,
    });
  }
  return out;
}

function summarize(history: DailyMetric[]): Metrics {
  const spend = round2(history.reduce((s, h) => s + h.spend, 0));
  const impressions = history.reduce((s, h) => s + h.impressions, 0);
  const clicks = history.reduce((s, h) => s + h.clicks, 0);
  const conversions = history.reduce((s, h) => s + h.conversions, 0);
  const revenue = round2(history.reduce((s, h) => s + h.revenue, 0));
  const ctr = impressions ? round2((clicks / impressions) * 100) : 0;
  const cpc = clicks ? round2(spend / clicks) : 0;
  const cpm = impressions ? round2((spend / impressions) * 1000) : 0;
  const cpa = conversions ? round2(spend / conversions) : 0;
  const roas = spend ? round2(revenue / spend) : 0;
  return { spend, impressions, clicks, conversions, revenue, ctr, cpc, cpm, cpa, roas };
}

interface AdSetBlueprint {
  name: string;
  targeting: string;
  dailyBudget: number;
  trend: number; // -0.3 .. 0.3, negative = declining (fatigue), positive = improving
  rotationDaysAgo: number; // when creative was last rotated
}

interface CampaignBlueprint {
  name: string;
  objective: Campaign["objective"];
  dailyBudget: number;
  adSets: AdSetBlueprint[];
}

const BLUEPRINTS: CampaignBlueprint[] = [
  {
    name: "Prospecting - Core Interests",
    objective: "OUTCOME_SALES",
    dailyBudget: 120,
    adSets: [
      { name: "Broad US 25-54", targeting: "US · 25-54 · Broad", dailyBudget: 60, trend: -0.22, rotationDaysAgo: 3 },
      { name: "Lookalike 1% Purchasers", targeting: "US · LAL 1% Purchasers", dailyBudget: 60, trend: 0.15, rotationDaysAgo: 1 },
    ],
  },
  {
    name: "Retargeting - Warm Audience",
    objective: "OUTCOME_SALES",
    dailyBudget: 80,
    adSets: [
      { name: "Cart Abandoners 7d", targeting: "Website · Added to cart · 7d", dailyBudget: 45, trend: 0.05, rotationDaysAgo: 2 },
      { name: "Video Viewers 25%", targeting: "Engagement · Video 25%+ · 30d", dailyBudget: 35, trend: -0.1, rotationDaysAgo: 4 },
    ],
  },
  {
    name: "Lead Gen - Newsletter",
    objective: "OUTCOME_LEADS",
    dailyBudget: 50,
    adSets: [
      { name: "Interest Stack - Wellness", targeting: "US · 22-45 · Wellness interests", dailyBudget: 50, trend: -0.05, rotationDaysAgo: 0 },
    ],
  },
  {
    name: "Brand Awareness - Reels",
    objective: "OUTCOME_AWARENESS",
    dailyBudget: 40,
    adSets: [
      { name: "Reels Placement - 18-34", targeting: "IG Reels · 18-34 · Broad", dailyBudget: 40, trend: 0.2, rotationDaysAgo: 2 },
    ],
  },
];

function buildCreative(
  campaignName: string,
  generation: number,
  status: Creative["status"],
  createdAtDaysAgo: number,
  performanceScore?: number,
): Creative {
  const g = generateCreativeVariant(
    { businessName: "Aurora Skincare", productDescription: "A clean-label skincare line for sensitive skin." },
    { seed: Math.random() * 10000 },
  );
  return {
    id: nextId("cr"),
    headline: g.headline,
    body: g.body,
    cta: g.cta,
    gradient: g.gradient,
    createdAt: daysAgoISO(createdAtDaysAgo),
    generation,
    status,
    performanceScore,
    parentCreativeId: null,
    reasoning: g.reasoning,
  };
}

export function generateMockCampaigns(): Campaign[] {
  return BLUEPRINTS.map((cb) => {
    const adSets: AdSet[] = cb.adSets.map((asb) => {
      const history = buildHistory(14, asb.dailyBudget, 1.6, 2.4, asb.trend);
      const metrics = summarize(history);

      const retired = buildCreative(cb.name, 1, "retired", 9, 62 + Math.round(Math.random() * 10));
      const active = buildCreative(cb.name, 2, "active", asb.rotationDaysAgo, 71 + Math.round(Math.random() * 15));
      active.parentCreativeId = retired.id;

      const lastRotation = daysAgoISO(asb.rotationDaysAgo);
      const next = new Date(lastRotation);
      next.setDate(next.getDate() + 3);

      return {
        id: nextId("as"),
        name: asb.name,
        campaignId: "",
        dailyBudget: asb.dailyBudget,
        status: "ACTIVE",
        targeting: asb.targeting,
        activeCreativeId: active.id,
        creatives: [retired, active],
        metrics,
        history,
        lastCreativeRotation: lastRotation,
        nextCreativeRotation: next.toISOString(),
      };
    });

    const campaignId = nextId("camp");
    adSets.forEach((as) => (as.campaignId = campaignId));

    const combinedHistory = buildHistory(14, cb.dailyBudget, 1.5, 2.2, 0);
    const metrics = summarize(
      adSets.length
        ? mergeHistories(adSets.map((a) => a.history))
        : combinedHistory,
    );

    return {
      id: campaignId,
      name: cb.name,
      objective: cb.objective,
      status: "ACTIVE",
      dailyBudget: cb.dailyBudget,
      metrics,
      history: mergeHistories(adSets.map((a) => a.history)),
      adSets,
      createdAt: daysAgoISO(45),
    };
  });
}

function mergeHistories(histories: DailyMetric[][]): DailyMetric[] {
  const byDate = new Map<string, DailyMetric>();
  for (const h of histories) {
    for (const d of h) {
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

export function generateMockLogs(campaigns: Campaign[]): AgentLogEntry[] {
  const logs: AgentLogEntry[] = [];
  const firstAdSet = campaigns[0]?.adSets[0];
  const secondAdSet = campaigns[1]?.adSets[1];

  for (let day = 9; day >= 1; day--) {
    logs.push({
      id: nextId("log"),
      type: "daily_check",
      severity: day === 3 ? "warning" : "info",
      timestamp: daysAgoISO(day, 8, Math.floor(Math.random() * 20)),
      title: "Daily performance check completed",
      summary:
        day === 3
          ? "Scanned 4 campaigns, 5 ad sets. Flagged 1 underperforming ad set for review."
          : `Scanned 4 campaigns, 5 ad sets. Spend on pace, no anomalies detected.`,
      findings:
        day === 3
          ? [
              {
                label: "Prospecting - Core Interests / Broad US 25-54",
                detail: "ROAS dropped to 1.3x, below the 1.5x threshold over the last 2 days.",
                severity: "warning",
              },
            ]
          : undefined,
    });
  }

  if (firstAdSet) {
    logs.push({
      id: nextId("log"),
      type: "performance_alert",
      severity: "warning",
      timestamp: daysAgoISO(3, 8, 15),
      title: `Underperformance flagged on ${firstAdSet.name}`,
      summary: "ROAS below threshold for 2 consecutive days. Recommending a creative refresh and budget hold.",
      campaignId: firstAdSet.campaignId,
      adSetId: firstAdSet.id,
    });

    logs.push({
      id: nextId("log"),
      type: "creative_rotation",
      severity: "success",
      timestamp: daysAgoISO(3, 8, 20),
      title: `New creative generated for ${firstAdSet.name}`,
      summary: "Generated 2 challenger variants to address creative fatigue. Awaiting manual approval.",
      campaignId: firstAdSet.campaignId,
      adSetId: firstAdSet.id,
    });
  }

  if (secondAdSet) {
    logs.push({
      id: nextId("log"),
      type: "creative_rotation",
      severity: "success",
      timestamp: daysAgoISO(4, 8, 5),
      title: `Scheduled creative refresh — ${secondAdSet.name}`,
      summary: "3-day rotation cycle triggered. Published new challenger variant automatically.",
      campaignId: secondAdSet.campaignId,
      adSetId: secondAdSet.id,
    });
  }

  logs.push({
    id: nextId("log"),
    type: "budget_alert",
    severity: "success",
    timestamp: daysAgoISO(6, 9, 10),
    title: "Budget reallocation recommended",
    summary: "Lookalike 1% Purchasers is outperforming account average ROAS by 34%. Consider increasing budget.",
  });

  return logs.sort((a, b) => b.timestamp.localeCompare(a.timestamp));
}
