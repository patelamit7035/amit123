import type { AgentSettings } from "@/types/agent";

// Deterministic-ish creative copy generator. This stands in for a real
// LLM/image-gen call (see server/agent/creativeGenerator.ts for the
// pluggable OpenAI/Anthropic-backed version used by the backend agent).

const HOOKS = [
  (p: string) => `Still putting up with the old way to get ${p}?`,
  (p: string) => `The secret ${p} buyers won't tell you.`,
  (p: string) => `We rebuilt ${p} from scratch. Here's why.`,
  (p: string) => `${p}, minus the wait.`,
  (p: string) => `Your competitors already switched.`,
  (p: string) => `This is what ${p} should have felt like all along.`,
  (p: string) => `Stop overpaying for ${p}.`,
  (p: string) => `The 3-second test that predicts if ${p} will work for you.`,
];

const BODIES = [
  (p: string, b: string) => `${b} Join thousands who upgraded to ${p} this month.`,
  (p: string, b: string) => `${b} No contracts, no surprises — just results.`,
  (p: string, b: string) => `${b} Rated 4.9/5 by real customers.`,
  (p: string, b: string) => `${b} Limited-time launch pricing ends soon.`,
  (p: string, b: string) => `${b} See why it's the #1 pick this quarter.`,
  (p: string, b: string) => `${b} Backed by a 30-day money-back guarantee.`,
];

const CTAS = ["Shop Now", "Learn More", "Get Offer", "Sign Up", "Try It Free", "Order Today"];

const GRADIENTS: [string, string][] = [
  ["#ff7a45", "#ff3d81"],
  ["#4f7cff", "#7c3aed"],
  ["#10b981", "#0ea5e9"],
  ["#f59e0b", "#ef4444"],
  ["#8b5cf6", "#ec4899"],
  ["#06b6d4", "#3b82f6"],
  ["#14b8a6", "#22c55e"],
];

const REASONING_TEMPLATES = [
  (drop: number) =>
    `Creative fatigue detected: CTR fell ${drop.toFixed(0)}% vs. its first 3 days live. Generating a fresh hook to reset audience attention.`,
  () => `Scheduled 3-day creative refresh — testing a new angle while the current winner keeps running.`,
  (drop: number) =>
    `Frequency is climbing and CTR is down ${drop.toFixed(0)}%. Rotating in a variant with a different visual and hook to fight banner blindness.`,
  () => `No fatigue signal yet, but running a scheduled challenger variant to keep the creative pipeline warm.`,
];

function pick<T>(arr: T[], seed: number): T {
  return arr[Math.floor(seed) % arr.length];
}

export interface GeneratedCreative {
  headline: string;
  body: string;
  cta: string;
  gradient: [string, string];
  reasoning: string;
}

export function generateCreativeVariant(
  settings: Pick<AgentSettings, "businessName" | "productDescription">,
  opts: { seed?: number; ctrDropPct?: number } = {},
): GeneratedCreative {
  const seed = opts.seed ?? Math.floor(Math.random() * 10000);
  const product = settings.businessName || "your product";
  const desc = settings.productDescription || "A modern product built for today's customer.";

  const headline = pick(HOOKS, seed)(product);
  const body = pick(BODIES, seed + 3)(product, desc.split(".")[0] + ".");
  const cta = pick(CTAS, seed + 5);
  const gradient = pick(GRADIENTS, seed + 7);

  const drop = opts.ctrDropPct ?? 0;
  const reasoning =
    drop > 10
      ? REASONING_TEMPLATES[0](drop)
      : pick(REASONING_TEMPLATES.slice(1), seed + 9)(drop);

  return { headline, body, cta, gradient, reasoning };
}
