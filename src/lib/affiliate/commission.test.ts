import { describe, expect, it } from "vitest";
import { calcCommission, daysUntilPayout, payoutDueAt, payoutStatusOf } from "./commission";
import { round2, sum, formatMoney, formatPercent } from "./money";

describe("calcCommission", () => {
  it("applies the percentage and rounds to 2 decimals", () => {
    expect(calcCommission(24999, 20)).toBe(4999.8);
    expect(calcCommission(4999, 30)).toBe(1499.7);
    expect(calcCommission(74999, 12)).toBe(8999.88);
  });

  it("handles awkward percentages without float drift", () => {
    expect(calcCommission(1000, 33.33)).toBe(333.3);
    expect(calcCommission(999.99, 7.5)).toBe(75);
    expect(calcCommission(100, 1)).toBe(1);
  });

  it("returns 0 for non-sales and invalid input", () => {
    expect(calcCommission(0, 20)).toBe(0);
    expect(calcCommission(-500, 20)).toBe(0);
    expect(calcCommission(1000, 0)).toBe(0);
    expect(calcCommission(Number.NaN, 20)).toBe(0);
    expect(calcCommission(1000, Number.NaN)).toBe(0);
  });

  it("never pays more than the sale at 100%", () => {
    expect(calcCommission(2500, 100)).toBe(2500);
  });
});

describe("payout hold window", () => {
  const converted = "2026-09-01T10:00:00.000Z";

  it("matures exactly 7 days after the sale by default", () => {
    expect(payoutDueAt(converted)).toBe("2026-09-08T10:00:00.000Z");
  });

  it("honours a custom hold period", () => {
    expect(payoutDueAt(converted, 14)).toBe("2026-09-15T10:00:00.000Z");
    expect(payoutDueAt(converted, 0)).toBe(converted);
  });

  it("falls back to 7 days when the hold is not a number", () => {
    expect(payoutDueAt(converted, Number.NaN)).toBe("2026-09-08T10:00:00.000Z");
  });

  it("is pending inside the window and available once it elapses", () => {
    const conversion = { paidAt: null, payoutDueAt: payoutDueAt(converted) };
    expect(payoutStatusOf(conversion, new Date("2026-09-01T10:00:01Z"))).toBe("pending");
    expect(payoutStatusOf(conversion, new Date("2026-09-07T23:59:59Z"))).toBe("pending");
    expect(payoutStatusOf(conversion, new Date("2026-09-08T10:00:00Z"))).toBe("available");
    expect(payoutStatusOf(conversion, new Date("2026-09-20T00:00:00Z"))).toBe("available");
  });

  it("reports paid regardless of the window once transferred", () => {
    const conversion = { paidAt: "2026-09-09T10:00:00Z", payoutDueAt: payoutDueAt(converted) };
    expect(payoutStatusOf(conversion, new Date("2026-09-01T10:00:01Z"))).toBe("paid");
    expect(daysUntilPayout(conversion, new Date("2026-09-01T10:00:01Z"))).toBe(0);
  });

  it("counts the days left before a commission is credited", () => {
    const conversion = { paidAt: null, payoutDueAt: payoutDueAt(converted) };
    expect(daysUntilPayout(conversion, new Date("2026-09-01T10:00:00Z"))).toBe(7);
    expect(daysUntilPayout(conversion, new Date("2026-09-06T10:00:00Z"))).toBe(2);
    expect(daysUntilPayout(conversion, new Date("2026-09-09T10:00:00Z"))).toBe(0);
  });
});

describe("money helpers", () => {
  it("rounds half up on the cent grid", () => {
    expect(round2(1.005)).toBe(1.01);
    expect(round2(2.675)).toBe(2.68);
    expect(round2(0.1 + 0.2)).toBe(0.3);
    expect(round2(Number.NaN)).toBe(0);
  });

  it("sums without accumulating float error", () => {
    expect(sum([0.1, 0.2, 0.3])).toBe(0.6);
    expect(sum([4999.8, 1499.7, 8999.88])).toBe(15499.38);
    expect(sum([])).toBe(0);
  });

  it("formats money and percentages for display", () => {
    expect(formatMoney(4999.8, "INR")).toBe("₹4,999.80");
    expect(formatMoney(0, "INR")).toBe("₹0.00");
    expect(formatMoney(-250.5, "INR")).toBe("-₹250.50");
    expect(formatPercent(37.5)).toBe("37.5%");
  });
});
