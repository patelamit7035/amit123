import { metaClient } from "../metaClient.js";
import { appendLog, getAdSetMeta, setAdSetMeta } from "../store.js";
import { generateCreativeVariant } from "./creativeGenerator.js";

const config = () => ({
  rotationDays: Number(process.env.CREATIVE_ROTATION_DAYS || 3),
  approvalMode: process.env.APPROVAL_MODE || "manual",
  businessName: process.env.BUSINESS_NAME || "My Business",
  productDescription: process.env.PRODUCT_DESCRIPTION || "A modern product built for today's customer.",
  brandTone: process.env.BRAND_TONE || "bold",
  pageId: process.env.META_PAGE_ID,
  destinationUrl: process.env.META_DESTINATION_URL || "https://example.com",
});

function isDue(lastRotationIso, rotationDays, force) {
  if (force) return true;
  if (!lastRotationIso) return true;
  const elapsedMs = Date.now() - new Date(lastRotationIso).getTime();
  return elapsedMs >= rotationDays * 24 * 60 * 60 * 1000;
}

/**
 * For every ad set whose rotation cadence is due, generates a new creative
 * (copy + image), uploads it to Meta, and creates a new ad with it.
 * In "auto" mode the new ad goes live immediately (added alongside the
 * existing ad, so nothing already running gets interrupted). In "manual"
 * mode it's created PAUSED and queued for approval via the API.
 */
export async function runCreativeRotation({ force = false } = {}) {
  const cfg = config();
  if (!cfg.pageId) {
    throw new Error("META_PAGE_ID must be set to publish ad creatives (see server/.env.example).");
  }

  const campaigns = await metaClient.getCampaigns();
  const entries = [];

  for (const campaign of campaigns) {
    const adSets = await metaClient.getAdSets(campaign.id);

    for (const adSet of adSets) {
      const meta = await getAdSetMeta(adSet.id);
      if (!isDue(meta.lastCreativeRotation, cfg.rotationDays, force)) continue;

      const [recent, longer] = await Promise.all([
        metaClient.getAdSetInsights(adSet.id, "last_3d"),
        metaClient.getAdSetInsights(adSet.id, "last_7d"),
      ]);
      const recentCtr = recent.impressions ? (recent.clicks / recent.impressions) * 100 : 0;
      const longerCtr = longer.impressions ? (longer.clicks / longer.impressions) * 100 : recentCtr;
      const ctrDropPct = longerCtr > 0 ? Math.max(0, ((longerCtr - recentCtr) / longerCtr) * 100) : 0;

      const variant = await generateCreativeVariant({
        businessName: cfg.businessName,
        productDescription: cfg.productDescription,
        brandTone: cfg.brandTone,
        ctrDropPct,
      });

      const imageHash = await metaClient.uploadImageFromUrl(variant.imageUrl);
      const creativeName = `${adSet.name} — AI variant ${new Date().toISOString().slice(0, 10)}`;
      const creative = await metaClient.createCreative({
        name: creativeName,
        pageId: cfg.pageId,
        imageHash,
        headline: variant.headline,
        body: variant.body,
        cta: variant.cta,
        link: cfg.destinationUrl,
      });

      const adStatus = cfg.approvalMode === "auto" ? "ACTIVE" : "PAUSED";
      const ad = await metaClient.createAd({
        name: creativeName,
        adSetId: adSet.id,
        creativeId: creative.id,
        status: adStatus,
      });

      const pendingCreatives =
        cfg.approvalMode === "auto"
          ? meta.pendingCreatives
          : [
              ...meta.pendingCreatives,
              { adId: ad.id, creativeId: creative.id, headline: variant.headline, body: variant.body, createdAt: new Date().toISOString() },
            ];

      await setAdSetMeta(adSet.id, { lastCreativeRotation: new Date().toISOString(), pendingCreatives });

      const entry = {
        type: "creative_rotation",
        severity: "success",
        timestamp: new Date().toISOString(),
        title: `${adStatus === "ACTIVE" ? "New creative published" : "New creative generated"} — ${adSet.name}`,
        summary:
          adStatus === "ACTIVE"
            ? `Published a new challenger ad automatically (ad ${ad.id}). ${variant.reasoning}`
            : `Generated a new challenger ad, paused pending your approval (ad ${ad.id}). ${variant.reasoning}`,
        campaignId: campaign.id,
        adSetId: adSet.id,
        adId: ad.id,
        creativeId: creative.id,
      };
      await appendLog(entry);
      entries.push(entry);
    }
  }

  return entries;
}

/** Approves a pending (paused) creative by flipping the ad live. */
export async function approvePendingCreative(adSetId, adId) {
  await metaClient.setAdStatus(adId, "ACTIVE");
  const meta = await getAdSetMeta(adSetId);
  await setAdSetMeta(adSetId, { pendingCreatives: meta.pendingCreatives.filter((c) => c.adId !== adId) });
  await appendLog({
    type: "creative_published",
    severity: "success",
    timestamp: new Date().toISOString(),
    title: "Creative approved and published",
    summary: `Ad ${adId} was approved and is now live.`,
    adSetId,
    adId,
  });
}

/** Rejects a pending creative: pauses it permanently and removes it from the queue. */
export async function rejectPendingCreative(adSetId, adId) {
  await metaClient.pauseAd(adId);
  const meta = await getAdSetMeta(adSetId);
  await setAdSetMeta(adSetId, { pendingCreatives: meta.pendingCreatives.filter((c) => c.adId !== adId) });
  await appendLog({
    type: "creative_rejected",
    severity: "info",
    timestamp: new Date().toISOString(),
    title: "Creative rejected",
    summary: `Ad ${adId} was rejected and left paused.`,
    adSetId,
    adId,
  });
}
