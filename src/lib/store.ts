import type { AgentLogEntry, AgentSettings, Campaign } from "@/types/agent";
import { DEFAULT_SETTINGS } from "@/types/agent";
import { generateMockCampaigns, generateMockLogs } from "@/lib/mockData";

const STORAGE_KEY = "meta-ads-agent:v1";

export interface StoreState {
  campaigns: Campaign[];
  logs: AgentLogEntry[];
  settings: AgentSettings;
}

function loadInitialState(): StoreState {
  if (typeof window !== "undefined") {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as StoreState;
        if (parsed.campaigns && parsed.settings) {
          return { ...parsed, settings: { ...DEFAULT_SETTINGS, ...parsed.settings } };
        }
      }
    } catch {
      // fall through to fresh demo data
    }
  }
  const campaigns = generateMockCampaigns();
  const logs = generateMockLogs(campaigns);
  const lastDailyCheckAt = logs.find((l) => l.type === "daily_check")?.timestamp ?? null;
  const lastCreativeRotationAt = logs.find((l) => l.type === "creative_rotation")?.timestamp ?? null;
  return {
    campaigns,
    logs,
    settings: { ...DEFAULT_SETTINGS, lastDailyCheckAt, lastCreativeRotationAt },
  };
}

let state: StoreState = loadInitialState();
const listeners = new Set<() => void>();

function persist() {
  if (typeof window !== "undefined") {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      // storage may be unavailable (private mode, quota) — state still works in-memory
    }
  }
  listeners.forEach((l) => l());
}

export function getState(): StoreState {
  return state;
}

export function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function setState(updater: (prev: StoreState) => StoreState) {
  state = updater(state);
  persist();
}

export function updateSettings(partial: Partial<AgentSettings>) {
  setState((prev) => ({ ...prev, settings: { ...prev.settings, ...partial } }));
}

export function prependLog(entry: AgentLogEntry) {
  setState((prev) => ({ ...prev, logs: [entry, ...prev.logs] }));
}

export function updateCampaigns(updater: (campaigns: Campaign[]) => Campaign[]) {
  setState((prev) => ({ ...prev, campaigns: updater(prev.campaigns) }));
}

export function resetDemoData() {
  const campaigns = generateMockCampaigns();
  const logs = generateMockLogs(campaigns);
  setState(() => ({ campaigns, logs, settings: { ...DEFAULT_SETTINGS } }));
}
