import { calcCommission, payoutDueAt, payoutStatusOf } from "@/lib/affiliate/commission";
import { DEFAULT_SETTINGS } from "@/lib/affiliate/constants";
import { generateLinkCode, generateReferralCode, normalizeCode } from "@/lib/affiliate/codes";
import { round2, sum } from "@/lib/affiliate/money";
import { sanitizeLead } from "@/lib/affiliate/validation";
import type {
  AffiliateLink,
  AffiliateStatus,
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
} from "@/lib/affiliate/types";
import type {
  BankDetailsValues,
  ConversionValues,
  PayoutValues,
  ProductValues,
  RegisterValues,
  SettingsValues,
} from "@/lib/affiliate/validation";
import {
  BackendError,
  type AffiliateBackend,
  type LeadFilter,
  type ResolvedLink,
  type SubmitLeadResult,
} from "../backend";
import {
  browserStorage,
  emptyDb,
  hashPassword,
  loadDb,
  memoryStorage,
  newId,
  saveDb,
  SESSION_KEY,
  verifyPassword,
  type Db,
  type KeyValueStorage,
} from "./localDb";
import { seedDemoData } from "./seed";

export interface LocalBackendOptions {
  storage?: KeyValueStorage;
  /** Seed a demo admin + affiliate + products on first run. Default true. */
  seed?: boolean;
  /** Overridable clock, so tests can fast-forward the 7-day payout hold. */
  now?: () => Date;
}

/**
 * A complete implementation of the affiliate system backed by localStorage.
 *
 * It exists for two reasons: the app is fully usable the moment it loads (no
 * Supabase project required to explore it), and every rule in the system -
 * attribution, commission, the payout hold - is exercised by the test-suite
 * through exactly the code paths the UI uses.
 */
export class LocalBackend implements AffiliateBackend {
  readonly kind = "local" as const;

  private readonly storage: KeyValueStorage;
  private readonly now: () => Date;
  private db: Db;

  constructor(options: LocalBackendOptions = {}) {
    this.storage = options.storage ?? (typeof window === "undefined" ? memoryStorage() : browserStorage());
    this.now = options.now ?? (() => new Date());
    const existing = loadDb(this.storage);
    if (existing) {
      this.db = existing;
    } else {
      this.db = emptyDb();
      if (options.seed !== false) seedDemoData(this.db, this.now());
      this.persist();
    }
  }

  // ---- internals -----------------------------------------------------------

  private persist(): void {
    saveDb(this.storage, this.db);
  }

  private iso(): string {
    return this.now().toISOString();
  }

  private requireProfile(userId: string): Profile {
    const profile = this.db.profiles.find((row) => row.id === userId);
    if (!profile) throw new BackendError("Account not found", "not_found");
    return profile;
  }

  private requireProduct(productId: string): Product {
    const product = this.db.products.find((row) => row.id === productId);
    if (!product) throw new BackendError("Product not found", "not_found");
    return product;
  }

  private logEmail(entry: Omit<EmailLogEntry, "id" | "createdAt">): void {
    this.db.emailLog.unshift({ ...entry, id: newId("mail"), createdAt: this.iso() });
    this.db.emailLog = this.db.emailLog.slice(0, 200);
  }

  // ---- auth ----------------------------------------------------------------

  async signUp(values: RegisterValues): Promise<Profile> {
    const email = values.email.trim().toLowerCase();
    if (this.db.credentials.some((row) => row.email === email)) {
      throw new BackendError("An account with this email already exists", "email_taken");
    }
    const userId = newId("usr");
    const profile: Profile = {
      id: userId,
      email,
      fullName: values.fullName.trim(),
      phone: values.phone.trim(),
      // The very first account to register becomes the admin so a fresh
      // deployment is never locked out of its own panel.
      role: this.db.profiles.length === 0 ? "admin" : "affiliate",
      status: "active",
      referralCode: generateReferralCode(values.fullName, this.db.profiles.map((row) => row.referralCode)),
      createdAt: this.iso(),
    };
    this.db.profiles.push(profile);
    this.db.credentials.push({ userId, email, passwordHash: hashPassword(values.password) });
    this.db.bank.push({
      userId,
      accountHolderName: values.accountHolderName.trim(),
      bankName: values.bankName.trim(),
      accountNumber: values.accountNumber.trim(),
      ifscCode: values.ifscCode.trim().toUpperCase(),
      upiId: (values.upiId || "").trim(),
      updatedAt: this.iso(),
    });
    this.storage.setItem(SESSION_KEY, userId);
    this.persist();
    return profile;
  }

  async signIn(email: string, password: string): Promise<Profile> {
    const normalized = email.trim().toLowerCase();
    const credential = this.db.credentials.find((row) => row.email === normalized);
    if (!credential || !verifyPassword(password, credential.passwordHash)) {
      throw new BackendError("Email or password is incorrect", "invalid_credentials");
    }
    const profile = this.requireProfile(credential.userId);
    if (profile.status === "suspended") {
      throw new BackendError("This account has been suspended. Contact the admin.", "suspended");
    }
    this.storage.setItem(SESSION_KEY, profile.id);
    return profile;
  }

  async signOut(): Promise<void> {
    this.storage.removeItem(SESSION_KEY);
  }

  async getCurrentProfile(): Promise<Profile | null> {
    const userId = this.storage.getItem(SESSION_KEY);
    if (!userId) return null;
    return this.db.profiles.find((row) => row.id === userId) ?? null;
  }

  // ---- profile & banking ---------------------------------------------------

  async getBankDetails(userId: string): Promise<BankDetails | null> {
    return this.db.bank.find((row) => row.userId === userId) ?? null;
  }

  async saveBankDetails(userId: string, values: BankDetailsValues): Promise<BankDetails> {
    this.requireProfile(userId);
    const record: BankDetails = {
      userId,
      accountHolderName: values.accountHolderName.trim(),
      bankName: values.bankName.trim(),
      accountNumber: values.accountNumber.trim(),
      ifscCode: values.ifscCode.trim().toUpperCase(),
      upiId: (values.upiId || "").trim(),
      updatedAt: this.iso(),
    };
    const index = this.db.bank.findIndex((row) => row.userId === userId);
    if (index >= 0) this.db.bank[index] = record;
    else this.db.bank.push(record);
    this.persist();
    return record;
  }

  async updateProfile(userId: string, patch: Partial<Pick<Profile, "fullName" | "phone">>): Promise<Profile> {
    const profile = this.requireProfile(userId);
    if (patch.fullName !== undefined) profile.fullName = patch.fullName.trim();
    if (patch.phone !== undefined) profile.phone = patch.phone.trim();
    this.persist();
    return { ...profile };
  }

  async setAffiliateStatus(userId: string, status: AffiliateStatus): Promise<Profile> {
    const profile = this.requireProfile(userId);
    profile.status = status;
    this.persist();
    return { ...profile };
  }

  async listProfiles(): Promise<Profile[]> {
    return this.db.profiles.map((row) => ({ ...row }));
  }

  async listBankDetails(): Promise<BankDetails[]> {
    return this.db.bank.map((row) => ({ ...row }));
  }

  // ---- products ------------------------------------------------------------

  async listProducts(options: { includeInactive?: boolean } = {}): Promise<Product[]> {
    const rows = options.includeInactive ? this.db.products : this.db.products.filter((row) => row.active);
    return rows.map((row) => ({ ...row })).sort((a, b) => a.name.localeCompare(b.name));
  }

  async createProduct(values: ProductValues): Promise<Product> {
    const product: Product = {
      id: newId("prd"),
      name: values.name.trim(),
      description: (values.description || "").trim(),
      price: round2(values.price),
      currency: (values.currency || this.db.settings.currency).toUpperCase(),
      commissionPercent: Number(values.commissionPercent),
      landingUrl: (values.landingUrl || "").trim(),
      active: values.active !== false,
      createdAt: this.iso(),
    };
    this.db.products.push(product);
    this.persist();
    return { ...product };
  }

  async updateProduct(productId: string, values: ProductValues): Promise<Product> {
    const product = this.requireProduct(productId);
    Object.assign(product, {
      name: values.name.trim(),
      description: (values.description || "").trim(),
      price: round2(values.price),
      currency: (values.currency || product.currency).toUpperCase(),
      commissionPercent: Number(values.commissionPercent),
      landingUrl: (values.landingUrl || "").trim(),
      active: values.active !== false,
    });
    this.persist();
    return { ...product };
  }

  async deleteProduct(productId: string): Promise<void> {
    const hasLeads = this.db.leads.some((lead) => lead.productId === productId);
    if (hasLeads) {
      throw new BackendError(
        "This product already has leads. Deactivate it instead so the history stays intact.",
        "product_in_use",
      );
    }
    this.db.products = this.db.products.filter((row) => row.id !== productId);
    this.db.links = this.db.links.filter((row) => row.productId !== productId);
    this.persist();
  }

  // ---- affiliate links -----------------------------------------------------

  async listLinks(affiliateId?: string): Promise<AffiliateLink[]> {
    const rows = affiliateId ? this.db.links.filter((row) => row.affiliateId === affiliateId) : this.db.links;
    return rows.map((row) => ({ ...row }));
  }

  async ensureLink(affiliateId: string, productId: string): Promise<AffiliateLink> {
    this.requireProfile(affiliateId);
    this.requireProduct(productId);
    const existing = this.db.links.find((row) => row.affiliateId === affiliateId && row.productId === productId);
    if (existing) return { ...existing };
    const link: AffiliateLink = {
      id: newId("lnk"),
      code: generateLinkCode(this.db.links.map((row) => row.code)),
      affiliateId,
      productId,
      clicks: 0,
      createdAt: this.iso(),
    };
    this.db.links.push(link);
    this.persist();
    return { ...link };
  }

  async resolveLink(code: string): Promise<ResolvedLink | null> {
    const normalized = normalizeCode(code);
    const link = this.db.links.find((row) => row.code === normalized);
    if (!link) return null;
    const product = this.db.products.find((row) => row.id === link.productId);
    const affiliate = this.db.profiles.find((row) => row.id === link.affiliateId);
    if (!product || !affiliate) return null;
    if (!product.active) return null;
    if (affiliate.status === "suspended") return null;
    return {
      link: { ...link },
      product: { ...product },
      affiliate: { id: affiliate.id, fullName: affiliate.fullName, referralCode: affiliate.referralCode },
      settings: { ...this.db.settings },
    };
  }

  async registerClick(code: string): Promise<void> {
    const link = this.db.links.find((row) => row.code === normalizeCode(code));
    if (!link) return;
    link.clicks += 1;
    this.persist();
  }

  // ---- leads ---------------------------------------------------------------

  async submitLead(submission: LeadSubmission): Promise<SubmitLeadResult> {
    const resolved = await this.resolveLink(submission.code);
    if (!resolved) throw new BackendError("This affiliate link is no longer active", "invalid_link");

    const clean = sanitizeLead(submission);
    if (!clean.name || !clean.email || !clean.phone) {
      throw new BackendError("Name, email and phone are all required", "invalid_input");
    }

    // The same person re-submitting the same form updates their details rather
    // than inflating the affiliate's lead count.
    const duplicate = this.db.leads.find(
      (row) => row.linkId === resolved.link.id && row.email === clean.email,
    );
    if (duplicate) {
      duplicate.name = clean.name;
      duplicate.phone = clean.phone;
      this.persist();
      return { lead: { ...duplicate }, emailSent: false, forwardedToFunnelos: false, warning: "duplicate" };
    }

    const lead: Lead = {
      id: newId("led"),
      affiliateId: resolved.affiliate.id,
      productId: resolved.product.id,
      linkId: resolved.link.id,
      name: clean.name,
      email: clean.email,
      phone: clean.phone,
      status: "new",
      source: (submission.source || "referral-page").slice(0, 200),
      note: "",
      createdAt: this.iso(),
      convertedAt: null,
    };
    this.db.leads.unshift(lead);

    // Offline demo mode records what production would send instead of calling
    // out to an email provider that is not configured here.
    this.logEmail({ leadId: lead.id, toEmail: lead.email, template: "lead-welcome", status: "sent", error: "" });
    const adminEmail = this.db.settings.notifyAdminEmail;
    if (adminEmail) {
      this.logEmail({ leadId: lead.id, toEmail: adminEmail, template: "lead-notification", status: "sent", error: "" });
    }

    let forwardedToFunnelos = false;
    if (this.db.settings.funnelosWebhookUrl) {
      forwardedToFunnelos = await this.forwardToFunnelos(lead, resolved);
    }

    this.persist();
    return { lead: { ...lead }, emailSent: true, forwardedToFunnelos };
  }

  private async forwardToFunnelos(lead: Lead, resolved: ResolvedLink): Promise<boolean> {
    if (typeof fetch !== "function") return false;
    try {
      const response = await fetch(this.db.settings.funnelosWebhookUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          event: "affiliate.lead.created",
          lead: { name: lead.name, email: lead.email, phone: lead.phone, source: lead.source },
          product: { id: resolved.product.id, name: resolved.product.name },
          affiliate: { id: resolved.affiliate.id, name: resolved.affiliate.fullName, code: resolved.affiliate.referralCode },
          createdAt: lead.createdAt,
        }),
      });
      return response.ok;
    } catch {
      return false;
    }
  }

  async listLeads(filter: LeadFilter = {}): Promise<Lead[]> {
    return this.db.leads
      .filter((row) => (filter.affiliateId ? row.affiliateId === filter.affiliateId : true))
      .filter((row) => (filter.productId ? row.productId === filter.productId : true))
      .filter((row) => (filter.status ? row.status === filter.status : true))
      .map((row) => ({ ...row }))
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  async updateLead(leadId: string, patch: { status?: LeadStatus; note?: string }): Promise<Lead> {
    const lead = this.db.leads.find((row) => row.id === leadId);
    if (!lead) throw new BackendError("Lead not found", "not_found");
    if (patch.status && patch.status !== lead.status) {
      if (lead.status === "converted") {
        throw new BackendError(
          "This lead is converted. Remove its sale first to change the status.",
          "lead_converted",
        );
      }
      if (patch.status === "converted") {
        throw new BackendError("Record the sale amount to convert this lead.", "use_convert");
      }
      lead.status = patch.status;
    }
    if (patch.note !== undefined) lead.note = patch.note.slice(0, 300);
    this.persist();
    return { ...lead };
  }

  // ---- conversions & payouts ----------------------------------------------

  async listConversions(affiliateId?: string): Promise<Conversion[]> {
    const rows = affiliateId
      ? this.db.conversions.filter((row) => row.affiliateId === affiliateId)
      : this.db.conversions;
    return rows.map((row) => ({ ...row })).sort((a, b) => b.convertedAt.localeCompare(a.convertedAt));
  }

  async convertLead(leadId: string, values: ConversionValues): Promise<Conversion> {
    const lead = this.db.leads.find((row) => row.id === leadId);
    if (!lead) throw new BackendError("Lead not found", "not_found");
    if (this.db.conversions.some((row) => row.leadId === leadId)) {
      throw new BackendError("This lead is already marked as a purchase", "already_converted");
    }
    const product = this.requireProduct(lead.productId);
    const commissionPercent =
      values.commissionPercent === undefined || values.commissionPercent === null || Number.isNaN(values.commissionPercent)
        ? product.commissionPercent
        : Number(values.commissionPercent);
    const saleAmount = round2(values.saleAmount);
    if (saleAmount <= 0) throw new BackendError("Sale amount must be greater than 0", "invalid_input");

    const convertedAt = this.iso();
    const conversion: Conversion = {
      id: newId("cnv"),
      leadId,
      affiliateId: lead.affiliateId,
      productId: lead.productId,
      saleAmount,
      commissionPercent,
      commissionAmount: calcCommission(saleAmount, commissionPercent),
      convertedAt,
      payoutDueAt: payoutDueAt(convertedAt, this.db.settings.payoutHoldDays),
      paidAt: null,
      payoutId: null,
      note: (values.note || "").trim(),
    };
    this.db.conversions.unshift(conversion);
    lead.status = "converted";
    lead.convertedAt = convertedAt;
    this.persist();
    return { ...conversion };
  }

  async deleteConversion(conversionId: string): Promise<void> {
    const conversion = this.db.conversions.find((row) => row.id === conversionId);
    if (!conversion) throw new BackendError("Sale not found", "not_found");
    if (conversion.paidAt) {
      throw new BackendError("This commission has already been paid and cannot be removed", "already_paid");
    }
    this.db.conversions = this.db.conversions.filter((row) => row.id !== conversionId);
    const lead = this.db.leads.find((row) => row.id === conversion.leadId);
    if (lead) {
      lead.status = "contacted";
      lead.convertedAt = null;
    }
    this.persist();
  }

  async listPayouts(affiliateId?: string): Promise<Payout[]> {
    const rows = affiliateId ? this.db.payouts.filter((row) => row.affiliateId === affiliateId) : this.db.payouts;
    return rows.map((row) => ({ ...row, conversionIds: [...row.conversionIds] })).sort((a, b) => b.paidAt.localeCompare(a.paidAt));
  }

  async payConversions(affiliateId: string, conversionIds: string[], values: PayoutValues): Promise<Payout> {
    this.requireProfile(affiliateId);
    if (conversionIds.length === 0) throw new BackendError("Select at least one commission to pay", "invalid_input");
    const now = this.now();
    const selected = conversionIds.map((id) => {
      const conversion = this.db.conversions.find((row) => row.id === id);
      if (!conversion) throw new BackendError("One of the selected commissions no longer exists", "not_found");
      if (conversion.affiliateId !== affiliateId) {
        throw new BackendError("Commissions from different affiliates cannot be paid together", "mixed_affiliates");
      }
      const status = payoutStatusOf(conversion, now);
      if (status === "paid") throw new BackendError("One of the selected commissions is already paid", "already_paid");
      if (status === "pending") {
        throw new BackendError("One of the selected commissions is still inside the hold period", "not_matured");
      }
      return conversion;
    });

    const payout: Payout = {
      id: newId("pay"),
      affiliateId,
      amount: sum(selected.map((row) => row.commissionAmount)),
      conversionIds: selected.map((row) => row.id),
      reference: values.reference.trim(),
      note: (values.note || "").trim(),
      paidAt: now.toISOString(),
    };
    for (const conversion of selected) {
      conversion.paidAt = payout.paidAt;
      conversion.payoutId = payout.id;
    }
    this.db.payouts.unshift(payout);
    this.persist();
    return { ...payout, conversionIds: [...payout.conversionIds] };
  }

  // ---- settings & logs -----------------------------------------------------

  async getSettings(): Promise<AppSettings> {
    return { ...DEFAULT_SETTINGS, ...this.db.settings };
  }

  async saveSettings(values: SettingsValues): Promise<AppSettings> {
    this.db.settings = { ...this.db.settings, ...values, currency: (values.currency || "INR").toUpperCase() };
    this.persist();
    return { ...this.db.settings };
  }

  async listEmailLog(): Promise<EmailLogEntry[]> {
    return this.db.emailLog.map((row) => ({ ...row }));
  }
}
