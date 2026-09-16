import { describe, expect, it } from "vitest";
import {
  buildEmbedSnippet,
  buildReferralUrl,
  buildWhatsAppChatUrl,
  extractRefFromUrl,
  generateLinkCode,
  generateReferralCode,
  normalizeCode,
  slugifyName,
} from "./codes";

describe("referral codes", () => {
  it("builds a readable prefix from the affiliate's name", () => {
    expect(slugifyName("Rahul Sharma")).toBe("RAHULS");
    expect(slugifyName("Jo")).toBe("FOS");
    expect(slugifyName("")).toBe("FOS");
    expect(generateReferralCode("Rahul Sharma")).toMatch(/^RAHULS-[A-Z2-9]{4}$/);
  });

  it("never reuses a code that is already taken", () => {
    const taken = new Set<string>();
    for (let i = 0; i < 300; i += 1) {
      const code = generateReferralCode("Amit Patel", taken);
      expect(taken.has(code)).toBe(false);
      taken.add(code);
    }
  });

  it("generates link codes without ambiguous characters", () => {
    for (let i = 0; i < 200; i += 1) {
      expect(generateLinkCode()).toMatch(/^[ABCDEFGHJKMNPQRSTUVWXYZ23456789]{8}$/);
    }
  });

  it("normalizes user-typed codes", () => {
    expect(normalizeCode("  rh7k2m4p ")).toBe("RH7K2M4P");
    expect(normalizeCode("")).toBe("");
  });
});

describe("link building", () => {
  it("builds a hash-router referral URL that works on static hosts", () => {
    expect(buildReferralUrl("https://funnelos.example.com", "rh7k2m4p")).toBe(
      "https://funnelos.example.com/#/r/RH7K2M4P",
    );
    expect(buildReferralUrl("https://funnelos.example.com/", "RH7K2M4P")).toBe(
      "https://funnelos.example.com/#/r/RH7K2M4P",
    );
  });

  it("builds an embed snippet pointing at the hosted script", () => {
    const snippet = buildEmbedSnippet("https://funnelos.example.com", "RH7K2M4P");
    expect(snippet).toContain('src="https://funnelos.example.com/embed.js"');
    expect(snippet).toContain('data-funnelos-ref="RH7K2M4P"');
  });

  it("builds a WhatsApp chat link from a messy phone number", () => {
    expect(buildWhatsAppChatUrl("+91 98765 43210", "Hi")).toBe("https://wa.me/919876543210?text=Hi");
  });

  it("extracts the referral code from every supported URL shape", () => {
    expect(extractRefFromUrl("https://x.com/#/r/RH7K2M4P")).toBe("RH7K2M4P");
    expect(extractRefFromUrl("https://x.com/#/embed/RH7K2M4P")).toBe("RH7K2M4P");
    expect(extractRefFromUrl("https://x.com/landing?ref=rh7k2m4p")).toBe("RH7K2M4P");
    expect(extractRefFromUrl("https://x.com/landing?utm=a&ref=RH7K2M4P")).toBe("RH7K2M4P");
    expect(extractRefFromUrl("https://x.com/landing")).toBe("");
    expect(extractRefFromUrl("")).toBe("");
  });
});
