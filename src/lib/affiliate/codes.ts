/**
 * Referral / affiliate-link code generation and the URLs built from them.
 *
 * Codes are uppercase and skip the characters that get misread when someone
 * reads a link out loud or retypes it (0/O, 1/I/L).
 */

const ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";

function randomChars(length: number): string {
  const cryptoObj = typeof globalThis !== "undefined" ? globalThis.crypto : undefined;
  let out = "";
  if (cryptoObj?.getRandomValues) {
    const bytes = new Uint8Array(length);
    cryptoObj.getRandomValues(bytes);
    for (let i = 0; i < length; i += 1) out += ALPHABET[bytes[i] % ALPHABET.length];
    return out;
  }
  for (let i = 0; i < length; i += 1) {
    out += ALPHABET[Math.floor(Math.random() * ALPHABET.length)];
  }
  return out;
}

/** Turns a person's name into a short, link-safe prefix. */
export function slugifyName(name: string): string {
  const cleaned = (name || "")
    .toUpperCase()
    .replace(/[^A-Z]/g, "")
    .slice(0, 6);
  return cleaned.length >= 3 ? cleaned : "FOS";
}

/** A stable per-affiliate code, e.g. AMIT-7K2M. */
export function generateReferralCode(fullName: string, taken: Iterable<string> = []): string {
  const existing = new Set(Array.from(taken, (code) => code.toUpperCase()));
  const prefix = slugifyName(fullName);
  for (let attempt = 0; attempt < 50; attempt += 1) {
    const code = `${prefix}-${randomChars(4)}`;
    if (!existing.has(code)) return code;
  }
  return `${prefix}-${randomChars(8)}`;
}

/** A per-(affiliate, product) link code, e.g. 7K2MQ4TZ. */
export function generateLinkCode(taken: Iterable<string> = []): string {
  const existing = new Set(Array.from(taken, (code) => code.toUpperCase()));
  for (let attempt = 0; attempt < 50; attempt += 1) {
    const code = randomChars(8);
    if (!existing.has(code)) return code;
  }
  return randomChars(12);
}

export function normalizeCode(code: string): string {
  return (code || "").trim().toUpperCase();
}

/**
 * The app runs on a HashRouter so the links keep working on every free static
 * host (GitHub Pages included) with no rewrite rules.
 */
export function resolveBaseUrl(configured?: string): string {
  const fromSettings = (configured || "").trim().replace(/\/+$/, "");
  if (fromSettings) return fromSettings;
  if (typeof window !== "undefined" && window.location) {
    return `${window.location.origin}${window.location.pathname}`.replace(/\/+$/, "");
  }
  return "";
}

export function buildReferralUrl(baseUrl: string, code: string): string {
  return `${resolveBaseUrl(baseUrl)}/#/r/${normalizeCode(code)}`;
}

export function buildEmbedUrl(baseUrl: string, code: string): string {
  return `${resolveBaseUrl(baseUrl)}/#/embed/${normalizeCode(code)}`;
}

/** Iframe snippet an affiliate can paste into any landing page. */
export function buildEmbedSnippet(baseUrl: string, code: string): string {
  const base = resolveBaseUrl(baseUrl);
  return [
    `<!-- FunnelOS lead form -->`,
    `<div id="funnelos-form-${normalizeCode(code)}"></div>`,
    `<script src="${base}/embed.js" data-funnelos-ref="${normalizeCode(code)}" data-funnelos-base="${base}" async></script>`,
  ].join("\n");
}

/** WhatsApp click-to-chat link used for sharing and lead follow-up. */
export function buildWhatsAppShareUrl(message: string): string {
  return `https://wa.me/?text=${encodeURIComponent(message)}`;
}

export function buildWhatsAppChatUrl(phone: string, message: string): string {
  const digits = (phone || "").replace(/\D/g, "");
  return `https://wa.me/${digits}?text=${encodeURIComponent(message)}`;
}

/** Reads a referral code off a URL: /#/r/CODE, ?ref=CODE or #ref=CODE. */
export function extractRefFromUrl(url: string): string {
  if (!url) return "";
  const pathMatch = url.match(/#\/(?:r|embed)\/([A-Za-z0-9-]+)/);
  if (pathMatch) return normalizeCode(pathMatch[1]);
  const queryMatch = url.match(/[?&#]ref=([A-Za-z0-9-]+)/);
  if (queryMatch) return normalizeCode(queryMatch[1]);
  return "";
}
