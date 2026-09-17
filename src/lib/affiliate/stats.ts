import { payoutStatusOf } from "./commission";
import { round2, sum } from "./money";
import type {
  AdminStats,
  AffiliateLink,
  AffiliateStats,
  Conversion,
  Lead,
  Profile,
} from "./types";

/**
 * Rolls a single affiliate's raw rows up into the numbers shown on their
 * dashboard. Earnings are split three ways:
 *   pending   - earned, still inside the hold window
 *   available - matured, waiting for the admin to transfer it
 *   paid      - already transferred
 */
export function buildAffiliateStats(
  links: AffiliateLink[],
  leads: Lead[],
  conversions: Conversion[],
  now: Date = new Date(),
): AffiliateStats {
  const clicks = links.reduce((total, link) => total + (link.clicks || 0), 0);
  const pending: number[] = [];
  const available: number[] = [];
  const paid: number[] = [];

  for (const conversion of conversions) {
    const status = payoutStatusOf(conversion, now);
    if (status === "paid") paid.push(conversion.commissionAmount);
    else if (status === "available") available.push(conversion.commissionAmount);
    else pending.push(conversion.commissionAmount);
  }

  const pendingEarnings = sum(pending);
  const availableEarnings = sum(available);
  const paidEarnings = sum(paid);

  return {
    clicks,
    leads: leads.length,
    conversions: conversions.length,
    conversionRate: leads.length === 0 ? 0 : round2((conversions.length / leads.length) * 100),
    pendingEarnings,
    availableEarnings,
    paidEarnings,
    lifetimeEarnings: round2(pendingEarnings + availableEarnings + paidEarnings),
  };
}

export function buildAdminStats(
  profiles: Profile[],
  productCount: number,
  links: AffiliateLink[],
  leads: Lead[],
  conversions: Conversion[],
  now: Date = new Date(),
): AdminStats {
  const affiliates = profiles.filter((profile) => profile.role === "affiliate");
  const paid = conversions.filter((conversion) => payoutStatusOf(conversion, now) === "paid");
  const unpaid = conversions.filter((conversion) => payoutStatusOf(conversion, now) !== "paid");

  return {
    affiliates: affiliates.length,
    activeAffiliates: affiliates.filter((profile) => profile.status === "active").length,
    products: productCount,
    clicks: links.reduce((total, link) => total + (link.clicks || 0), 0),
    leads: leads.length,
    conversions: conversions.length,
    revenue: sum(conversions.map((conversion) => conversion.saleAmount)),
    commissionOwed: sum(unpaid.map((conversion) => conversion.commissionAmount)),
    commissionPaid: sum(paid.map((conversion) => conversion.commissionAmount)),
  };
}

/** Groups rows by affiliate id so the admin panel can show per-user totals. */
export function groupByAffiliate<T extends { affiliateId: string }>(rows: T[]): Map<string, T[]> {
  const grouped = new Map<string, T[]>();
  for (const row of rows) {
    const bucket = grouped.get(row.affiliateId);
    if (bucket) bucket.push(row);
    else grouped.set(row.affiliateId, [row]);
  }
  return grouped;
}

/** Conversions that have matured and are still unpaid, per affiliate. */
export function duePayoutsByAffiliate(conversions: Conversion[], now: Date = new Date()): Map<string, Conversion[]> {
  return groupByAffiliate(conversions.filter((conversion) => payoutStatusOf(conversion, now) === "available"));
}

export function leadsByDay(leads: Lead[], days = 14, now: Date = new Date()): { date: string; leads: number }[] {
  const buckets = new Map<string, number>();
  for (let index = days - 1; index >= 0; index -= 1) {
    const date = new Date(now.getTime() - index * 24 * 60 * 60 * 1000);
    buckets.set(date.toISOString().slice(0, 10), 0);
  }
  for (const lead of leads) {
    const key = (lead.createdAt || "").slice(0, 10);
    if (buckets.has(key)) buckets.set(key, (buckets.get(key) || 0) + 1);
  }
  return Array.from(buckets, ([date, count]) => ({ date, leads: count }));
}
