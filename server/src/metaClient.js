// Minimal wrapper around the Meta Marketing (Graph) API.
// Docs: https://developers.facebook.com/docs/marketing-api/reference/ad-campaign-group

const API_VERSION = process.env.META_API_VERSION || "v21.0";
const BASE_URL = `https://graph.facebook.com/${API_VERSION}`;

function assertConfigured() {
  if (!process.env.META_ACCESS_TOKEN || !process.env.META_AD_ACCOUNT_ID) {
    throw new Error(
      "META_ACCESS_TOKEN and META_AD_ACCOUNT_ID must be set (see server/.env.example) before calling the Meta API.",
    );
  }
}

async function graphRequest(path, { method = "GET", params = {}, body } = {}) {
  assertConfigured();
  const url = new URL(`${BASE_URL}${path}`);
  url.searchParams.set("access_token", process.env.META_ACCESS_TOKEN);
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== null) url.searchParams.set(k, typeof v === "object" ? JSON.stringify(v) : String(v));
  }

  const res = await fetch(url, {
    method,
    headers: body ? { "Content-Type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });

  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    const message = json?.error?.message || `Meta API request failed (${res.status})`;
    const err = new Error(message);
    err.details = json?.error;
    throw err;
  }
  return json;
}

export const metaClient = {
  /** List campaigns on the configured ad account. */
  async getCampaigns() {
    const accountId = process.env.META_AD_ACCOUNT_ID;
    const data = await graphRequest(`/${accountId}/campaigns`, {
      params: { fields: "id,name,objective,status,daily_budget", limit: 200 },
    });
    return data.data || [];
  },

  /** List ad sets for a campaign, including current insights over a date preset. */
  async getAdSets(campaignId) {
    const data = await graphRequest(`/${campaignId}/adsets`, {
      params: {
        fields: "id,name,status,daily_budget,targeting,campaign_id",
        limit: 200,
      },
    });
    return data.data || [];
  },

  /** Insights for one ad set over a Meta date_preset (e.g. "last_3d", "last_7d"). */
  async getAdSetInsights(adSetId, datePreset = "last_3d") {
    const data = await graphRequest(`/${adSetId}/insights`, {
      params: {
        fields: "spend,impressions,clicks,ctr,cpc,actions,action_values",
        date_preset: datePreset,
      },
    });
    const row = data.data?.[0];
    if (!row) return { spend: 0, impressions: 0, clicks: 0, ctr: 0, conversions: 0, revenue: 0 };

    const conversions = (row.actions || [])
      .filter((a) => a.action_type === "purchase" || a.action_type === "offsite_conversion.fb_pixel_purchase")
      .reduce((s, a) => s + Number(a.value || 0), 0);
    const revenue = (row.action_values || [])
      .filter((a) => a.action_type === "purchase" || a.action_type === "offsite_conversion.fb_pixel_purchase")
      .reduce((s, a) => s + Number(a.value || 0), 0);

    return {
      spend: Number(row.spend || 0),
      impressions: Number(row.impressions || 0),
      clicks: Number(row.clicks || 0),
      ctr: Number(row.ctr || 0),
      conversions,
      revenue,
    };
  },

  async pauseAdSet(adSetId) {
    return graphRequest(`/${adSetId}`, { method: "POST", params: { status: "PAUSED" } });
  },

  async setAdSetDailyBudget(adSetId, dailyBudgetCents) {
    return graphRequest(`/${adSetId}`, { method: "POST", params: { daily_budget: Math.round(dailyBudgetCents) } });
  },

  /** Uploads an image to the ad account's image library from a public URL. */
  async uploadImageFromUrl(imageUrl) {
    const accountId = process.env.META_AD_ACCOUNT_ID;
    const data = await graphRequest(`/${accountId}/adimages`, { method: "POST", params: { url: imageUrl } });
    const images = data.images || {};
    const first = Object.values(images)[0];
    return first?.hash;
  },

  /** Creates a new ad creative (link ad) using an uploaded image hash. */
  async createCreative({ name, pageId, imageHash, headline, body, cta, link }) {
    const accountId = process.env.META_AD_ACCOUNT_ID;
    const object_story_spec = {
      page_id: pageId,
      link_data: {
        image_hash: imageHash,
        link,
        message: body,
        name: headline,
        call_to_action: { type: cta },
      },
    };
    return graphRequest(`/${accountId}/adcreatives`, {
      method: "POST",
      params: { name, object_story_spec },
    });
  },

  /** Creates a new ad in an ad set using a creative, defaulting to PAUSED so a human can flip it live. */
  async createAd({ name, adSetId, creativeId, status = "PAUSED" }) {
    const accountId = process.env.META_AD_ACCOUNT_ID;
    return graphRequest(`/${accountId}/ads`, {
      method: "POST",
      params: { name, adset_id: adSetId, creative: { creative_id: creativeId }, status },
    });
  },

  async pauseAd(adId) {
    return graphRequest(`/${adId}`, { method: "POST", params: { status: "PAUSED" } });
  },

  async setAdStatus(adId, status) {
    return graphRequest(`/${adId}`, { method: "POST", params: { status } });
  },
};
