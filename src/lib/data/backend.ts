import type {
  AffiliateLink,
  AppSettings,
  BankDetails,
  Conversion,
  EmailLogEntry,
  Lead,
  LeadStatus,
  LeadSubmission,
  Payout,
  Product,
  Profile,
  AffiliateStatus,
} from "@/lib/affiliate/types";
import type {
  BankDetailsValues,
  ConversionValues,
  PayoutValues,
  ProductValues,
  RegisterValues,
  SettingsValues,
} from "@/lib/affiliate/validation";

/** What a public referral link resolves to. */
export interface ResolvedLink {
  link: AffiliateLink;
  product: Product;
  affiliate: Pick<Profile, "id" | "fullName" | "referralCode">;
  settings: AppSettings;
}

export interface LeadFilter {
  affiliateId?: string;
  productId?: string;
  status?: LeadStatus;
}

export interface SubmitLeadResult {
  lead: Lead;
  emailSent: boolean;
  forwardedToFunnelos: boolean;
  /** Set when the lead was stored but a follow-up step (email/webhook) failed. */
  warning?: string;
}

/**
 * Everything the UI needs from a data source. Implemented twice: once against
 * Supabase (production) and once against localStorage (zero-setup demo and the
 * test-suite), so the exact same screens run in both modes.
 */
export interface AffiliateBackend {
  readonly kind: "local" | "supabase";

  // ---- auth ----------------------------------------------------------------
  /**
   * Creates the account. Resolves to null when the provider requires the user
   * to confirm their email address before the session starts.
   */
  signUp(values: RegisterValues): Promise<Profile | null>;
  signIn(email: string, password: string): Promise<Profile>;
  signOut(): Promise<void>;
  getCurrentProfile(): Promise<Profile | null>;

  // ---- profile & banking ---------------------------------------------------
  getBankDetails(userId: string): Promise<BankDetails | null>;
  saveBankDetails(userId: string, values: BankDetailsValues): Promise<BankDetails>;
  updateProfile(userId: string, patch: Partial<Pick<Profile, "fullName" | "phone">>): Promise<Profile>;
  setAffiliateStatus(userId: string, status: AffiliateStatus): Promise<Profile>;
  listProfiles(): Promise<Profile[]>;
  listBankDetails(): Promise<BankDetails[]>;

  // ---- products ------------------------------------------------------------
  listProducts(options?: { includeInactive?: boolean }): Promise<Product[]>;
  createProduct(values: ProductValues): Promise<Product>;
  updateProduct(productId: string, values: ProductValues): Promise<Product>;
  deleteProduct(productId: string): Promise<void>;

  // ---- affiliate links -----------------------------------------------------
  listLinks(affiliateId?: string): Promise<AffiliateLink[]>;
  /** Returns the affiliate's link for a product, creating it on first use. */
  ensureLink(affiliateId: string, productId: string): Promise<AffiliateLink>;
  resolveLink(code: string): Promise<ResolvedLink | null>;
  registerClick(code: string): Promise<void>;

  // ---- leads ---------------------------------------------------------------
  submitLead(submission: LeadSubmission): Promise<SubmitLeadResult>;
  listLeads(filter?: LeadFilter): Promise<Lead[]>;
  updateLead(leadId: string, patch: { status?: LeadStatus; note?: string }): Promise<Lead>;

  // ---- conversions & payouts ----------------------------------------------
  listConversions(affiliateId?: string): Promise<Conversion[]>;
  convertLead(leadId: string, values: ConversionValues): Promise<Conversion>;
  deleteConversion(conversionId: string): Promise<void>;
  listPayouts(affiliateId?: string): Promise<Payout[]>;
  payConversions(affiliateId: string, conversionIds: string[], values: PayoutValues): Promise<Payout>;

  // ---- settings & logs -----------------------------------------------------
  getSettings(): Promise<AppSettings>;
  saveSettings(values: SettingsValues): Promise<AppSettings>;
  listEmailLog(): Promise<EmailLogEntry[]>;
}

/** Thrown for expected, user-facing failures (bad password, duplicate email…). */
export class BackendError extends Error {
  constructor(message: string, readonly code = "backend_error") {
    super(message);
    this.name = "BackendError";
  }
}
