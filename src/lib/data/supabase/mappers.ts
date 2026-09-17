import { DEFAULT_SETTINGS } from "@/lib/affiliate/constants";
import type {
  AffiliateLink,
  AppSettings,
  BankDetails,
  Conversion,
  EmailLogEntry,
  Lead,
  Payout,
  Product,
  Profile,
} from "@/lib/affiliate/types";

type Row = Record<string, unknown>;

const str = (value: unknown, fallback = ""): string => (value === null || value === undefined ? fallback : String(value));
const num = (value: unknown, fallback = 0): number => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};
const nullableStr = (value: unknown): string | null =>
  value === null || value === undefined || value === "" ? null : String(value);

export const toProfile = (row: Row): Profile => ({
  id: str(row.id),
  email: str(row.email),
  fullName: str(row.full_name),
  phone: str(row.phone),
  role: row.role === "admin" ? "admin" : "affiliate",
  status: (["pending", "active", "suspended"] as const).includes(row.status as never)
    ? (row.status as Profile["status"])
    : "active",
  referralCode: str(row.referral_code),
  createdAt: str(row.created_at),
});

export const toBankDetails = (row: Row): BankDetails => ({
  userId: str(row.user_id),
  accountHolderName: str(row.account_holder_name),
  bankName: str(row.bank_name),
  accountNumber: str(row.account_number),
  ifscCode: str(row.ifsc_code),
  upiId: str(row.upi_id),
  updatedAt: str(row.updated_at),
});

export const toProduct = (row: Row): Product => ({
  id: str(row.id),
  name: str(row.name),
  description: str(row.description),
  price: num(row.price),
  currency: str(row.currency, "INR"),
  commissionPercent: num(row.commission_percent),
  landingUrl: str(row.landing_url),
  active: row.active !== false,
  createdAt: str(row.created_at),
});

export const toLink = (row: Row): AffiliateLink => ({
  id: str(row.id),
  code: str(row.code),
  affiliateId: str(row.affiliate_id),
  productId: str(row.product_id),
  clicks: num(row.clicks),
  createdAt: str(row.created_at),
});

export const toLead = (row: Row): Lead => ({
  id: str(row.id),
  affiliateId: str(row.affiliate_id),
  productId: str(row.product_id),
  linkId: nullableStr(row.link_id),
  name: str(row.name),
  email: str(row.email),
  phone: str(row.phone),
  status: (["new", "contacted", "converted", "rejected"] as const).includes(row.status as never)
    ? (row.status as Lead["status"])
    : "new",
  source: str(row.source),
  note: str(row.note),
  createdAt: str(row.created_at),
  convertedAt: nullableStr(row.converted_at),
});

export const toConversion = (row: Row): Conversion => ({
  id: str(row.id),
  leadId: str(row.lead_id),
  affiliateId: str(row.affiliate_id),
  productId: str(row.product_id),
  saleAmount: num(row.sale_amount),
  commissionPercent: num(row.commission_percent),
  commissionAmount: num(row.commission_amount),
  convertedAt: str(row.converted_at),
  payoutDueAt: str(row.payout_due_at),
  paidAt: nullableStr(row.paid_at),
  payoutId: nullableStr(row.payout_id),
  note: str(row.note),
});

export const toPayout = (row: Row, conversionIds: string[] = []): Payout => ({
  id: str(row.id),
  affiliateId: str(row.affiliate_id),
  amount: num(row.amount),
  conversionIds,
  reference: str(row.reference),
  note: str(row.note),
  paidAt: str(row.paid_at),
});

export const toSettings = (row: Row | null): AppSettings => ({
  ...DEFAULT_SETTINGS,
  brandName: str(row?.brand_name, DEFAULT_SETTINGS.brandName),
  currency: str(row?.currency, DEFAULT_SETTINGS.currency),
  payoutHoldDays: num(row?.payout_hold_days, DEFAULT_SETTINGS.payoutHoldDays),
  publicBaseUrl: str(row?.public_base_url),
  funnelosWebhookUrl: str(row?.funnelos_webhook_url),
  whatsappNumber: str(row?.whatsapp_number),
  notifyFromEmail: str(row?.notify_from_email),
  notifyAdminEmail: str(row?.notify_admin_email),
});

export const fromSettings = (settings: AppSettings) => ({
  brand_name: settings.brandName,
  currency: settings.currency,
  payout_hold_days: settings.payoutHoldDays,
  public_base_url: settings.publicBaseUrl,
  funnelos_webhook_url: settings.funnelosWebhookUrl,
  whatsapp_number: settings.whatsappNumber,
  notify_from_email: settings.notifyFromEmail,
  notify_admin_email: settings.notifyAdminEmail,
});

export const toEmailLogEntry = (row: Row): EmailLogEntry => ({
  id: str(row.id),
  leadId: nullableStr(row.lead_id),
  toEmail: str(row.to_email),
  template: str(row.template),
  status: (["sent", "failed", "queued"] as const).includes(row.status as never)
    ? (row.status as EmailLogEntry["status"])
    : "sent",
  error: str(row.error),
  createdAt: str(row.created_at),
});
