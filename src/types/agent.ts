// Core domain types for the Meta Ads AI Agent platform.

export type CampaignStatus = "ACTIVE" | "PAUSED" | "LEARNING" | "ENDED";
export type CampaignObjective =
  | "OUTCOME_SALES"
  | "OUTCOME_LEADS"
  | "OUTCOME_TRAFFIC"
  | "OUTCOME_ENGAGEMENT"
  | "OUTCOME_AWARENESS";

export interface DailyMetric {
  date: string; // ISO date
  spend: number;
  impressions: number;
  clicks: number;
  conversions: number;
  revenue: number;
}

export interface Metrics {
  spend: number;
  impressions: number;
  clicks: number;
  conversions: number;
  revenue: number;
  ctr: number; // %
  cpc: number; // currency
  cpm: number; // currency
  cpa: number; // currency
  roas: number; // ratio
}

export interface Creative {
  id: string;
  headline: string;
  body: string;
  cta: string;
  gradient: [string, string];
  createdAt: string;
  generation: number; // which rotation cycle produced it
  status: "draft" | "pending_review" | "active" | "retired" | "rejected";
  performanceScore?: number; // 0-100, assigned after some days live
  parentCreativeId?: string | null;
  reasoning: string; // why the agent generated this variant
}

export interface AdSet {
  id: string;
  name: string;
  campaignId: string;
  dailyBudget: number;
  status: CampaignStatus;
  targeting: string;
  activeCreativeId: string;
  creatives: Creative[];
  metrics: Metrics;
  history: DailyMetric[];
  lastCreativeRotation: string; // ISO date
  nextCreativeRotation: string; // ISO date
}

export interface Campaign {
  id: string;
  name: string;
  objective: CampaignObjective;
  status: CampaignStatus;
  dailyBudget: number;
  metrics: Metrics;
  history: DailyMetric[];
  adSets: AdSet[];
  createdAt: string;
}

export type AgentEventType =
  | "daily_check"
  | "creative_rotation"
  | "budget_alert"
  | "performance_alert"
  | "creative_published"
  | "creative_rejected"
  | "recommendation"
  | "info";

export type AgentEventSeverity = "info" | "success" | "warning" | "critical";

export interface AgentFinding {
  label: string;
  detail: string;
  severity: AgentEventSeverity;
}

export interface AgentLogEntry {
  id: string;
  type: AgentEventType;
  severity: AgentEventSeverity;
  timestamp: string; // ISO
  title: string;
  summary: string;
  findings?: AgentFinding[];
  campaignId?: string;
  adSetId?: string;
  creativeId?: string;
}

export interface AgentSettings {
  connected: boolean;
  accessToken: string;
  adAccountId: string;
  businessName: string;
  productDescription: string;
  brandTone: "bold" | "friendly" | "premium" | "playful" | "minimal";
  dailyCheckEnabled: boolean;
  dailyCheckHour: number; // 0-23
  creativeRotationEnabled: boolean;
  creativeRotationDays: number; // default 3
  approvalMode: "auto" | "manual";
  maxDailyBudgetIncreasePct: number;
  minRoasThreshold: number;
  pauseUnderperformersEnabled: boolean;
  lastDailyCheckAt: string | null;
  lastCreativeRotationAt: string | null;
  backendUrl: string;
}

export const DEFAULT_SETTINGS: AgentSettings = {
  connected: false,
  accessToken: "",
  adAccountId: "",
  businessName: "My Business",
  productDescription: "A modern D2C product selling to a broad consumer audience.",
  brandTone: "bold",
  dailyCheckEnabled: true,
  dailyCheckHour: 8,
  creativeRotationEnabled: true,
  creativeRotationDays: 3,
  approvalMode: "manual",
  maxDailyBudgetIncreasePct: 20,
  minRoasThreshold: 1.5,
  pauseUnderperformersEnabled: true,
  lastDailyCheckAt: null,
  lastCreativeRotationAt: null,
  backendUrl: "",
};
