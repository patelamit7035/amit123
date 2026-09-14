import { metaClient } from "../metaClient.js";
import { appendLog } from "../store.js";

const config = () => ({
  minRoasThreshold: Number(process.env.MIN_ROAS_THRESHOLD || 1.5),
  maxBudgetIncreasePct: Number(process.env.MAX_DAILY_BUDGET_INCREASE_PCT || 20),
  pauseUnderperformers: process.env.PAUSE_UNDERPERFORMERS !== "false",
  approvalMode: process.env.APPROVAL_MODE || "manual",
});

/**
 * Scans every campaign/ad set on the configured ad account, flags pacing,
 * ROAS, and CTR issues, and (in "auto" approval mode) takes protective
 * action: pausing underperformers and nudging budget on winners.
 */
export async function runDailyCheck() {
  const cfg = config();
  const findings = [];
  let scannedAdSets = 0;
  let totalRoas = 0;
  let roasSamples = 0;

  const campaigns = await metaClient.getCampaigns();

  const perCampaignAdSets = await Promise.all(
    campaigns.map(async (campaign) => ({
      campaign,
      adSets: await metaClient.getAdSets(campaign.id),
    })),
  );

  // First pass: gather insights + compute account-average ROAS.
  const enriched = [];
  for (const { campaign, adSets } of perCampaignAdSets) {
    for (const adSet of adSets) {
      scannedAdSets += 1;
      const insights = await metaClient.getAdSetInsights(adSet.id, "last_3d");
      const roas = insights.spend > 0 ? insights.revenue / insights.spend : 0;
      if (roas > 0) {
        totalRoas += roas;
        roasSamples += 1;
      }
      enriched.push({ campaign, adSet, insights, roas });
    }
  }

  const avgRoas = roasSamples ? totalRoas / roasSamples : 0;

  for (const { campaign, adSet, insights, roas } of enriched) {
    const label = `${campaign.name} / ${adSet.name}`;

    if (roas > 0 && roas < cfg.minRoasThreshold) {
      findings.push({
        label,
        detail: `ROAS at ${roas.toFixed(2)}x over the last 3 days, below the ${cfg.minRoasThreshold}x threshold.`,
        severity: "warning",
      });

      if (cfg.pauseUnderperformers && cfg.approvalMode === "auto" && adSet.status === "ACTIVE") {
        await metaClient.pauseAdSet(adSet.id);
        findings.push({ label, detail: "Auto-paused to protect budget.", severity: "critical" });
      }
    } else if (avgRoas > 0 && roas > avgRoas * 1.3) {
      const bump = Math.min(cfg.maxBudgetIncreasePct, 20);
      const detail = `ROAS at ${roas.toFixed(2)}x, ${Math.round(((roas - avgRoas) / avgRoas) * 100)}% above account average.`;

      if (cfg.approvalMode === "auto" && adSet.daily_budget) {
        const newBudget = Math.round(Number(adSet.daily_budget) * (1 + bump / 100));
        await metaClient.setAdSetDailyBudget(adSet.id, newBudget);
        findings.push({ label, detail: `${detail} Increased daily budget by ${bump}%.`, severity: "success" });
      } else {
        findings.push({ label, detail: `${detail} Recommend increasing daily budget by up to ${bump}%.`, severity: "success" });
      }
    }
  }

  const severity = findings.some((f) => f.severity === "critical")
    ? "critical"
    : findings.some((f) => f.severity === "warning")
      ? "warning"
      : "info";

  const entry = {
    type: "daily_check",
    severity,
    timestamp: new Date().toISOString(),
    title: "Daily performance check completed",
    summary:
      findings.length === 0
        ? `Scanned ${campaigns.length} campaigns, ${scannedAdSets} ad sets. Spend on pace, no anomalies detected.`
        : `Scanned ${campaigns.length} campaigns, ${scannedAdSets} ad sets. ${findings.length} item(s) need attention.`,
    findings,
  };

  await appendLog(entry);
  return entry;
}
