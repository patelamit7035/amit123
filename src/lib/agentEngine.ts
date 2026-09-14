import type { AdSet, AgentFinding, AgentLogEntry, Campaign, Creative } from "@/types/agent";
import { generateCreativeVariant } from "@/lib/copyGenerator";
import { getState, prependLog, updateCampaigns, updateSettings } from "@/lib/store";

let idCounter = Math.floor(Math.random() * 1e6);
function nextId(prefix: string): string {
  idCounter += 1;
  return `${prefix}_${Date.now().toString(36)}_${idCounter.toString(36)}`;
}

function recentTrend(history: AdSet["history"]) {
  const recent = history.slice(-3);
  const prior = history.slice(-6, -3);
  const sum = (arr: typeof recent, key: "clicks" | "impressions" | "spend" | "revenue") =>
    arr.reduce((s, d) => s + d[key], 0);

  const recentCtr = sum(recent, "impressions") ? (sum(recent, "clicks") / sum(recent, "impressions")) * 100 : 0;
  const priorCtr = sum(prior, "impressions") ? (sum(prior, "clicks") / sum(prior, "impressions")) * 100 : recentCtr;
  const recentRoas = sum(recent, "spend") ? sum(recent, "revenue") / sum(recent, "spend") : 0;

  const ctrDropPct = priorCtr > 0 ? Math.max(0, ((priorCtr - recentCtr) / priorCtr) * 100) : 0;
  return { recentCtr, priorCtr, recentRoas, ctrDropPct };
}

/** Runs the daily performance check across all campaigns/ad sets. */
export function runDailyCheckNow(): AgentLogEntry {
  const { campaigns, settings } = getState();
  const findings: AgentFinding[] = [];
  let scannedAdSets = 0;

  const avgRoas =
    campaigns.reduce((s, c) => s + c.metrics.roas, 0) / Math.max(1, campaigns.length);

  updateCampaigns((prevCampaigns) =>
    prevCampaigns.map((campaign) => ({
      ...campaign,
      adSets: campaign.adSets.map((adSet) => {
        scannedAdSets += 1;
        const { recentRoas, ctrDropPct } = recentTrend(adSet.history);
        let nextAdSet = adSet;

        if (recentRoas > 0 && recentRoas < settings.minRoasThreshold) {
          findings.push({
            label: `${campaign.name} / ${adSet.name}`,
            detail: `ROAS at ${recentRoas.toFixed(2)}x over the last 3 days, below the ${settings.minRoasThreshold}x threshold.`,
            severity: "warning",
          });
          if (settings.pauseUnderperformersEnabled && settings.approvalMode === "auto") {
            nextAdSet = { ...nextAdSet, status: "PAUSED" };
            findings.push({
              label: `${campaign.name} / ${adSet.name}`,
              detail: `Auto-paused to protect budget. Re-enable after reviewing the new creative.`,
              severity: "critical",
            });
          }
        } else if (recentRoas > avgRoas * 1.3 && avgRoas > 0) {
          const bump = Math.min(settings.maxDailyBudgetIncreasePct, 20);
          findings.push({
            label: `${campaign.name} / ${adSet.name}`,
            detail: `ROAS at ${recentRoas.toFixed(2)}x, ${Math.round(((recentRoas - avgRoas) / avgRoas) * 100)}% above account average.` +
              (settings.approvalMode === "auto"
                ? ` Increased daily budget by ${bump}%.`
                : ` Recommend increasing daily budget by up to ${bump}%.`),
            severity: "success",
          });
          if (settings.approvalMode === "auto") {
            nextAdSet = { ...nextAdSet, dailyBudget: Math.round(nextAdSet.dailyBudget * (1 + bump / 100)) };
          }
        }

        if (ctrDropPct > 15) {
          findings.push({
            label: `${campaign.name} / ${adSet.name}`,
            detail: `CTR down ${ctrDropPct.toFixed(0)}% vs. the prior 3 days — creative fatigue likely. Will refresh on next rotation.`,
            severity: "warning",
          });
        }

        return nextAdSet;
      }),
    })),
  );

  const severity = findings.some((f) => f.severity === "critical")
    ? "critical"
    : findings.some((f) => f.severity === "warning")
      ? "warning"
      : "info";

  const entry: AgentLogEntry = {
    id: nextId("log"),
    type: "daily_check",
    severity,
    timestamp: new Date().toISOString(),
    title: "Daily performance check completed",
    summary:
      findings.length === 0
        ? `Scanned ${campaigns.length} campaigns, ${scannedAdSets} ad sets. Spend on pace, no anomalies detected.`
        : `Scanned ${campaigns.length} campaigns, ${scannedAdSets} ad sets. ${findings.length} item${findings.length === 1 ? "" : "s"} need attention.`,
    findings: findings.length ? findings : undefined,
  };

  prependLog(entry);
  updateSettings({ lastDailyCheckAt: entry.timestamp });
  return entry;
}

/** Runs the creative rotation job for every ad set whose rotation is due. */
export function runCreativeRotationNow(force = false): AgentLogEntry[] {
  const { settings } = getState();
  const now = new Date();
  const createdEntries: AgentLogEntry[] = [];

  updateCampaigns((prevCampaigns) =>
    prevCampaigns.map((campaign) => ({
      ...campaign,
      adSets: campaign.adSets.map((adSet) => {
        const due = force || new Date(adSet.nextCreativeRotation).getTime() <= now.getTime();
        if (!due) return adSet;

        const { ctrDropPct } = recentTrend(adSet.history);
        const activeCreative = adSet.creatives.find((c) => c.id === adSet.activeCreativeId);
        const generation = Math.max(0, ...adSet.creatives.map((c) => c.generation)) + 1;

        const variant = generateCreativeVariant(
          { businessName: settings.businessName, productDescription: settings.productDescription },
          { ctrDropPct },
        );

        const newCreative: Creative = {
          id: nextId("cr"),
          headline: variant.headline,
          body: variant.body,
          cta: variant.cta,
          gradient: variant.gradient,
          createdAt: now.toISOString(),
          generation,
          status: settings.approvalMode === "auto" ? "active" : "pending_review",
          parentCreativeId: activeCreative?.id ?? null,
          reasoning: variant.reasoning,
        };

        const nextRotation = new Date(now);
        nextRotation.setDate(nextRotation.getDate() + settings.creativeRotationDays);

        const updatedCreatives = adSet.creatives.map((c) =>
          settings.approvalMode === "auto" && c.id === adSet.activeCreativeId
            ? { ...c, status: "retired" as const }
            : c,
        );

        createdEntries.push({
          id: nextId("log"),
          type: "creative_rotation",
          severity: "success",
          timestamp: now.toISOString(),
          title: `${settings.approvalMode === "auto" ? "New creative published" : "New creative generated"} — ${adSet.name}`,
          summary:
            settings.approvalMode === "auto"
              ? `Generated and published a new challenger creative automatically. ${variant.reasoning}`
              : `Generated a new challenger creative, awaiting your approval in Creatives. ${variant.reasoning}`,
          campaignId: campaign.id,
          adSetId: adSet.id,
          creativeId: newCreative.id,
        });

        return {
          ...adSet,
          creatives: [...updatedCreatives, newCreative],
          activeCreativeId: settings.approvalMode === "auto" ? newCreative.id : adSet.activeCreativeId,
          lastCreativeRotation: now.toISOString(),
          nextCreativeRotation: nextRotation.toISOString(),
        };
      }),
    })),
  );

  createdEntries.forEach((e) => prependLog(e));
  if (createdEntries.length > 0) {
    updateSettings({ lastCreativeRotationAt: now.toISOString() });
  }
  return createdEntries;
}

export function approveCreative(campaignId: string, adSetId: string, creativeId: string) {
  const now = new Date().toISOString();
  updateCampaigns((prev) =>
    prev.map((campaign) => {
      if (campaign.id !== campaignId) return campaign;
      return {
        ...campaign,
        adSets: campaign.adSets.map((adSet) => {
          if (adSet.id !== adSetId) return adSet;
          return {
            ...adSet,
            activeCreativeId: creativeId,
            creatives: adSet.creatives.map((c) => {
              if (c.id === creativeId) return { ...c, status: "active" as const };
              if (c.id === adSet.activeCreativeId) return { ...c, status: "retired" as const };
              return c;
            }),
          };
        }),
      };
    }),
  );

  prependLog({
    id: nextId("log"),
    type: "creative_published",
    severity: "success",
    timestamp: now,
    title: "Creative approved and published",
    summary: "You approved a pending creative. It's now live on the ad set.",
    campaignId,
    adSetId,
    creativeId,
  });
}

export function rejectCreative(campaignId: string, adSetId: string, creativeId: string) {
  updateCampaigns((prev) =>
    prev.map((campaign) => {
      if (campaign.id !== campaignId) return campaign;
      return {
        ...campaign,
        adSets: campaign.adSets.map((adSet) => {
          if (adSet.id !== adSetId) return adSet;
          return {
            ...adSet,
            creatives: adSet.creatives.map((c) => (c.id === creativeId ? { ...c, status: "rejected" as const } : c)),
          };
        }),
      };
    }),
  );

  prependLog({
    id: nextId("log"),
    type: "creative_rejected",
    severity: "info",
    timestamp: new Date().toISOString(),
    title: "Creative rejected",
    summary: "You rejected a pending creative. The agent will try a different angle next rotation.",
    campaignId,
    adSetId,
    creativeId,
  });
}

/** Called periodically (and on app load) to run any jobs that are due. */
export function maybeRunDueJobs() {
  const { settings } = getState();
  const now = new Date();

  if (settings.dailyCheckEnabled) {
    const last = settings.lastDailyCheckAt ? new Date(settings.lastDailyCheckAt) : null;
    const ranToday = last && last.toDateString() === now.toDateString();
    if (!ranToday && now.getHours() >= settings.dailyCheckHour) {
      runDailyCheckNow();
    }
  }

  if (settings.creativeRotationEnabled) {
    runCreativeRotationNow(false);
  }
}
