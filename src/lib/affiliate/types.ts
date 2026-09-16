/**
 * Core domain types for the FunnelOS affiliate system.
 *
 * These types are shared by every backend (Supabase in production, the
 * localStorage backend used for the zero-setup demo and the test-suite), so the
 * UI never has to care about where the data actually lives.
 */

export type UserRole = "admin" | "affiliate";

export type AffiliateStatus = "pending" | "active" | "suspended";

export interface Profile {
  id: string;
  email: string;
  fullName: string;
  phone: string;
  role: UserRole;
  status: AffiliateStatus;
  referralCode: string;
  createdAt: string;
}

export interface BankDetails {
  userId: string;
  accountHolderName: string;
  bankName: string;
  accountNumber: string;
  ifscCode: string;
  upiId: string;
  updatedAt: string;
}

export interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  currency: string;
  commissionPercent: number;
  /** Where the lead is sent after the form is submitted (optional). */
  landingUrl: string;
  active: boolean;
  createdAt: string;
}

export interface AffiliateLink {
  id: string;
  code: string;
  affiliateId: string;
  productId: string;
  clicks: number;
  createdAt: string;
}

export type LeadStatus = "new" | "contacted" | "converted" | "rejected";

export interface Lead {
  id: string;
  affiliateId: string;
  productId: string;
  linkId: string | null;
  name: string;
  email: string;
  phone: string;
  status: LeadStatus;
  /** Where the form was submitted from, e.g. "referral-page" or a landing page URL. */
  source: string;
  note: string;
  createdAt: string;
  convertedAt: string | null;
}

export type PayoutStatus = "pending" | "available" | "paid";

export interface Conversion {
  id: string;
  leadId: string;
  affiliateId: string;
  productId: string;
  saleAmount: number;
  commissionPercent: number;
  commissionAmount: number;
  convertedAt: string;
  /** Date the commission matures and becomes transferable (converted + hold days). */
  payoutDueAt: string;
  paidAt: string | null;
  payoutId: string | null;
  note: string;
}

export interface Payout {
  id: string;
  affiliateId: string;
  amount: number;
  conversionIds: string[];
  reference: string;
  note: string;
  paidAt: string;
}

export interface AppSettings {
  /** Days a commission is held before it can be transferred. Defaults to 7. */
  payoutHoldDays: number;
  currency: string;
  /** Public base URL used when building affiliate links. */
  publicBaseUrl: string;
  /** FunnelOS automation webhook every new lead is forwarded to. */
  funnelosWebhookUrl: string;
  /** WhatsApp number (E.164, no +) used for click-to-chat follow-ups. */
  whatsappNumber: string;
  /** Address new-lead notifications are sent from. */
  notifyFromEmail: string;
  /** Internal address that gets a copy of every new lead. */
  notifyAdminEmail: string;
  brandName: string;
}

export interface EmailLogEntry {
  id: string;
  leadId: string | null;
  toEmail: string;
  template: string;
  status: "sent" | "failed" | "queued";
  error: string;
  createdAt: string;
}

/** Everything an affiliate sees on their dashboard, already aggregated. */
export interface AffiliateStats {
  clicks: number;
  leads: number;
  conversions: number;
  conversionRate: number;
  pendingEarnings: number;
  availableEarnings: number;
  paidEarnings: number;
  lifetimeEarnings: number;
}

/** Per-affiliate rollup used by the admin panel. */
export interface AffiliateSummary {
  profile: Profile;
  bank: BankDetails | null;
  stats: AffiliateStats;
}

export interface AdminStats {
  affiliates: number;
  activeAffiliates: number;
  products: number;
  clicks: number;
  leads: number;
  conversions: number;
  revenue: number;
  commissionOwed: number;
  commissionPaid: number;
}

export interface LeadSubmission {
  code: string;
  name: string;
  email: string;
  phone: string;
  source?: string;
}
