/** Money helpers. Everything is stored as a plain number with 2 decimals. */

/**
 * Round to 2 decimals without the classic float drift (1.005 -> 1.0 instead of
 * 1.01). Uses an epsilon nudge on the scaled value.
 */
export function round2(value: number): number {
  if (!Number.isFinite(value)) return 0;
  const scaled = value * 100;
  // Pull the value back onto the intended decimal grid before rounding so that
  // representations like 100.49999999999999 round the way a human expects.
  const corrected = Math.round((scaled + Number.EPSILON * Math.sign(scaled) * Math.abs(scaled)) * 1e6) / 1e6;
  return Math.round(corrected) / 100;
}

export function sum(values: number[]): number {
  return round2(values.reduce((total, value) => total + value, 0));
}

const SYMBOLS: Record<string, string> = {
  INR: "₹",
  USD: "$",
  EUR: "€",
  GBP: "£",
  AED: "AED ",
};

export function currencySymbol(currency: string): string {
  return SYMBOLS[currency?.toUpperCase()] ?? `${currency} `;
}

export function formatMoney(value: number, currency = "INR"): string {
  const amount = round2(value);
  const formatted = Math.abs(amount).toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  return `${amount < 0 ? "-" : ""}${currencySymbol(currency)}${formatted}`;
}

export function formatNumber(value: number): string {
  return Math.round(value).toLocaleString("en-IN");
}

export function formatPercent(value: number, digits = 1): string {
  if (!Number.isFinite(value)) return "0%";
  return `${value.toFixed(digits)}%`;
}
