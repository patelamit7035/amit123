import type { AppSettings } from "./types";

/** A commission is credited one week after the sale is recorded. */
export const DEFAULT_PAYOUT_HOLD_DAYS = 7;

export const DEFAULT_SETTINGS: AppSettings = {
  payoutHoldDays: DEFAULT_PAYOUT_HOLD_DAYS,
  currency: "INR",
  publicBaseUrl: "",
  funnelosWebhookUrl: "",
  whatsappNumber: "",
  notifyFromEmail: "",
  notifyAdminEmail: "",
  brandName: "FunnelOS",
};

export const LEAD_STATUS_LABELS: Record<string, string> = {
  new: "New",
  contacted: "Contacted",
  converted: "Converted",
  rejected: "Rejected",
};

export const PAYOUT_STATUS_LABELS: Record<string, string> = {
  pending: "Pending (in hold)",
  available: "Ready to pay",
  paid: "Paid",
};
