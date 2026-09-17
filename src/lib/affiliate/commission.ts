import { DEFAULT_PAYOUT_HOLD_DAYS } from "./constants";
import { round2 } from "./money";
import type { Conversion, PayoutStatus } from "./types";

/**
 * Commission for a sale. Percent is snapshotted onto the conversion when the
 * admin marks a lead converted, so later edits to the product's rate never
 * change money that was already earned.
 */
export function calcCommission(saleAmount: number, commissionPercent: number): number {
  const amount = Number(saleAmount);
  const percent = Number(commissionPercent);
  if (!Number.isFinite(amount) || !Number.isFinite(percent)) return 0;
  if (amount <= 0 || percent <= 0) return 0;
  return round2((amount * percent) / 100);
}

export function addDays(date: Date | string, days: number): Date {
  const base = typeof date === "string" ? new Date(date) : new Date(date.getTime());
  base.setTime(base.getTime() + days * 24 * 60 * 60 * 1000);
  return base;
}

/** The date a commission matures and can be transferred to the affiliate. */
export function payoutDueAt(convertedAt: string | Date, holdDays = DEFAULT_PAYOUT_HOLD_DAYS): string {
  const days = Number.isFinite(holdDays) && holdDays >= 0 ? holdDays : DEFAULT_PAYOUT_HOLD_DAYS;
  return addDays(convertedAt, days).toISOString();
}

/**
 * Where a commission currently sits:
 *  - paid      → the admin has transferred it
 *  - available → the hold period elapsed, it is waiting to be transferred
 *  - pending   → still inside the hold period
 */
export function payoutStatusOf(conversion: Pick<Conversion, "paidAt" | "payoutDueAt">, now: Date = new Date()): PayoutStatus {
  if (conversion.paidAt) return "paid";
  const due = new Date(conversion.payoutDueAt).getTime();
  if (!Number.isFinite(due)) return "pending";
  return due <= now.getTime() ? "available" : "pending";
}

/** Whole days left before a commission matures (0 once it is available). */
export function daysUntilPayout(conversion: Pick<Conversion, "paidAt" | "payoutDueAt">, now: Date = new Date()): number {
  if (conversion.paidAt) return 0;
  const diff = new Date(conversion.payoutDueAt).getTime() - now.getTime();
  if (!Number.isFinite(diff) || diff <= 0) return 0;
  return Math.ceil(diff / (24 * 60 * 60 * 1000));
}
