// Generates new ad creative copy + a placeholder image URL Meta can fetch.
// Uses OPENAI_API_KEY for real copywriting when set, otherwise falls back to
// the same template approach as the frontend demo (src/lib/copyGenerator.ts).

const HOOKS = [
  (p) => `Still putting up with the old way to get ${p}?`,
  (p) => `The secret ${p} buyers won't tell you.`,
  (p) => `We rebuilt ${p} from scratch. Here's why.`,
  (p) => `${p}, minus the wait.`,
  (p) => `Your competitors already switched.`,
  (p) => `Stop overpaying for ${p}.`,
];
const CTAS = ["SHOP_NOW", "LEARN_MORE", "GET_OFFER", "SIGN_UP", "ORDER_NOW"];
const COLORS = ["ff7a45/ffffff", "4f7cff/ffffff", "10b981/ffffff", "f59e0b/ffffff", "8b5cf6/ffffff"];

function pick(arr, seed) {
  return arr[Math.floor(seed) % arr.length];
}

async function generateWithOpenAI({ businessName, productDescription, brandTone, ctrDropPct }) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return null;

  const prompt = `Write one Meta (Facebook/Instagram) ad in a ${brandTone} tone for "${businessName}": ${productDescription}. ${
    ctrDropPct > 10
      ? `The current creative's CTR has dropped ${ctrDropPct.toFixed(0)}%, so try a genuinely different angle/hook.`
      : "This is a scheduled creative refresh, so try a fresh angle."
  } Respond as strict JSON: {"headline": string (<=40 chars), "body": string (<=125 chars), "reasoning": string (one sentence on why this angle)}.`;

  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
      response_format: { type: "json_object" },
      temperature: 0.9,
    }),
  });
  if (!res.ok) return null;
  const data = await res.json();
  try {
    const parsed = JSON.parse(data.choices[0].message.content);
    return { headline: parsed.headline, body: parsed.body, reasoning: parsed.reasoning };
  } catch {
    return null;
  }
}

export async function generateCreativeVariant({ businessName, productDescription, brandTone = "bold", ctrDropPct = 0 }) {
  const ai = await generateWithOpenAI({ businessName, productDescription, brandTone, ctrDropPct }).catch(() => null);

  const seed = Math.floor(Math.random() * 10000);
  const cta = pick(CTAS, seed + 5);
  const colors = pick(COLORS, seed + 7);

  const headline = ai?.headline || pick(HOOKS, seed)(businessName);
  const body = ai?.body || `${productDescription} Join thousands who upgraded this month.`;
  const reasoning =
    ai?.reasoning ||
    (ctrDropPct > 10
      ? `Creative fatigue detected: CTR fell ${ctrDropPct.toFixed(0)}% vs. its first days live. Generating a fresh hook to reset audience attention.`
      : `Scheduled creative refresh — testing a new angle while the current winner keeps running.`);

  // Placeholder branded image Meta's adimages endpoint can fetch by URL.
  // Swap this for a real image-generation API (DALL-E, Ideogram, etc.) in production.
  const imageUrl = `https://placehold.co/1080x1080/${colors}/png?text=${encodeURIComponent(headline.slice(0, 60))}&font=roboto`;

  return { headline, body, cta, imageUrl, reasoning, usedAI: Boolean(ai) };
}
