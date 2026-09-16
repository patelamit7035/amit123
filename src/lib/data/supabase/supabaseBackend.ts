import { DEFAULT_SETTINGS } from "@/lib/affiliate/constants";
import { normalizeCode } from "@/lib/affiliate/codes";
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
import { getSupabaseClient } from "./client";
import {
  fromSettings,
  toBankDetails,
  toConversion,
  toEmailLogEntry,
  toLead,
  toLink,
  toPayout,
  toProduct,
  toProfile,
  toSettings,
} from "./mappers";

type Row = Record<string, unknown>;

/** Turns a Postgres/Supabase error into something worth showing a person. */
function fail(error: { message?: string; code?: string } | null, fallback: string): never {
  const message = (error?.message || "").replace(/^new row violates row-level security policy.*/i, "");
  throw new BackendError(message || fallback, error?.code || "backend_error");
}

/**
 * The production backend. Reads go through PostgREST (guarded by the row level
 * security policies in supabase/migrations), and every write that touches money
 * or the public internet goes through a SECURITY DEFINER function.
 */
export class SupabaseBackend implements AffiliateBackend {
  readonly kind = "supabase" as const;

  private get db() {
    return getSupabaseClient();
  }

  // ---- auth ----------------------------------------------------------------

  async signUp(values: RegisterValues): Promise<Profile | null> {
    const { data, error } = await this.db.auth.signUp({
      email: values.email.trim().toLowerCase(),
      password: values.password,
      options: {
        data: {
          full_name: values.fullName.trim(),
          phone: values.phone.trim(),
          account_holder_name: values.accountHolderName.trim(),
          bank_name: values.bankName.trim(),
          account_number: values.accountNumber.trim(),
          ifsc_code: values.ifscCode.trim().toUpperCase(),
          upi_id: (values.upiId || "").trim(),
        },
      },
    });
    if (error) fail(error, "Could not create the account");
    // With "Confirm email" switched on there is no session yet.
    if (!data.session) return null;
    return this.getCurrentProfile();
  }

  async signIn(email: string, password: string): Promise<Profile> {
    const { error } = await this.db.auth.signInWithPassword({
      email: email.trim().toLowerCase(),
      password,
    });
    if (error) {
      throw new BackendError(
        /invalid login/i.test(error.message) ? "Email or password is incorrect" : error.message,
        "invalid_credentials",
      );
    }
    const profile = await this.getCurrentProfile();
    if (!profile) throw new BackendError("Your account is missing a profile. Contact the admin.", "no_profile");
    if (profile.status === "suspended") {
      await this.signOut();
      throw new BackendError("This account has been suspended. Contact the admin.", "suspended");
    }
    return profile;
  }

  async signOut(): Promise<void> {
    await this.db.auth.signOut();
  }

  async getCurrentProfile(): Promise<Profile | null> {
    const { data } = await this.db.auth.getSession();
    const userId = data.session?.user?.id;
    if (!userId) return null;
    const { data: row, error } = await this.db.from("profiles").select("*").eq("id", userId).maybeSingle();
    if (error) fail(error, "Could not load your profile");
    return row ? toProfile(row as Row) : null;
  }

  // ---- profile & banking ---------------------------------------------------

  async getBankDetails(userId: string): Promise<BankDetails | null> {
    const { data, error } = await this.db.from("bank_details").select("*").eq("user_id", userId).maybeSingle();
    if (error) fail(error, "Could not load the bank details");
    return data ? toBankDetails(data as Row) : null;
  }

  async saveBankDetails(userId: string, values: BankDetailsValues): Promise<BankDetails> {
    const payload = {
      user_id: userId,
      account_holder_name: values.accountHolderName.trim(),
      bank_name: values.bankName.trim(),
      account_number: values.accountNumber.trim(),
      ifsc_code: values.ifscCode.trim().toUpperCase(),
      upi_id: (values.upiId || "").trim(),
      updated_at: new Date().toISOString(),
    };
    const { data, error } = await this.db.from("bank_details").upsert(payload).select().single();
    if (error) fail(error, "Could not save the bank details");
    return toBankDetails(data as Row);
  }

  async updateProfile(userId: string, patch: Partial<Pick<Profile, "fullName" | "phone">>): Promise<Profile> {
    const payload: Row = {};
    if (patch.fullName !== undefined) payload.full_name = patch.fullName.trim();
    if (patch.phone !== undefined) payload.phone = patch.phone.trim();
    const { data, error } = await this.db.from("profiles").update(payload).eq("id", userId).select().single();
    if (error) fail(error, "Could not update the profile");
    return toProfile(data as Row);
  }

  async setAffiliateStatus(userId: string, status: AffiliateStatus): Promise<Profile> {
    const { data, error } = await this.db.from("profiles").update({ status }).eq("id", userId).select().single();
    if (error) fail(error, "Could not update the affiliate");
    return toProfile(data as Row);
  }

  async listProfiles(): Promise<Profile[]> {
    const { data, error } = await this.db.from("profiles").select("*").order("created_at", { ascending: false });
    if (error) fail(error, "Could not load the affiliates");
    return (data as Row[]).map(toProfile);
  }

  async listBankDetails(): Promise<BankDetails[]> {
    const { data, error } = await this.db.from("bank_details").select("*");
    if (error) fail(error, "Could not load the bank details");
    return (data as Row[]).map(toBankDetails);
  }

  // ---- products ------------------------------------------------------------

  async listProducts(options: { includeInactive?: boolean } = {}): Promise<Product[]> {
    let query = this.db.from("products").select("*").order("name");
    if (!options.includeInactive) query = query.eq("active", true);
    const { data, error } = await query;
    if (error) fail(error, "Could not load the products");
    return (data as Row[]).map(toProduct);
  }

  private productPayload(values: ProductValues) {
    return {
      name: values.name.trim(),
      description: (values.description || "").trim(),
      price: Number(values.price),
      currency: (values.currency || "INR").toUpperCase(),
      commission_percent: Number(values.commissionPercent),
      landing_url: (values.landingUrl || "").trim(),
      active: values.active !== false,
    };
  }

  async createProduct(values: ProductValues): Promise<Product> {
    const { data, error } = await this.db.from("products").insert(this.productPayload(values)).select().single();
    if (error) fail(error, "Could not create the product");
    return toProduct(data as Row);
  }

  async updateProduct(productId: string, values: ProductValues): Promise<Product> {
    const { data, error } = await this.db
      .from("products")
      .update(this.productPayload(values))
      .eq("id", productId)
      .select()
      .single();
    if (error) fail(error, "Could not update the product");
    return toProduct(data as Row);
  }

  async deleteProduct(productId: string): Promise<void> {
    const { count, error: countError } = await this.db
      .from("leads")
      .select("id", { count: "exact", head: true })
      .eq("product_id", productId);
    if (countError) fail(countError, "Could not check the product's leads");
    if ((count || 0) > 0) {
      throw new BackendError(
        "This product already has leads. Deactivate it instead so the history stays intact.",
        "product_in_use",
      );
    }
    const { error } = await this.db.from("products").delete().eq("id", productId);
    if (error) fail(error, "Could not delete the product");
  }

  // ---- affiliate links -----------------------------------------------------

  async listLinks(affiliateId?: string): Promise<AffiliateLink[]> {
    let query = this.db.from("affiliate_links").select("*");
    if (affiliateId) query = query.eq("affiliate_id", affiliateId);
    const { data, error } = await query;
    if (error) fail(error, "Could not load the affiliate links");
    return (data as Row[]).map(toLink);
  }

  async ensureLink(affiliateId: string, productId: string): Promise<AffiliateLink> {
    const { data, error } = await this.db.rpc("ensure_affiliate_link", { p_product_id: productId });
    if (error) fail(error, "Could not create your affiliate link");
    const row = (Array.isArray(data) ? data[0] : data) as Row;
    if (!row) throw new BackendError("Could not create your affiliate link", "no_link");
    return toLink(row);
  }

  async resolveLink(code: string): Promise<ResolvedLink | null> {
    const { data, error } = await this.db.rpc("resolve_link", { p_code: normalizeCode(code) });
    if (error) fail(error, "Could not open this link");
    if (!data) return null;
    const payload = data as {
      link: Row;
      product: Row;
      affiliate: { id: string; fullName: string; referralCode: string };
      settings: Partial<AppSettings>;
    };
    return {
      link: {
        id: String(payload.link.id),
        code: String(payload.link.code),
        affiliateId: String(payload.link.affiliateId),
        productId: String(payload.link.productId),
        clicks: Number(payload.link.clicks) || 0,
        createdAt: String(payload.link.createdAt),
      },
      product: {
        id: String(payload.product.id),
        name: String(payload.product.name),
        description: String(payload.product.description ?? ""),
        price: Number(payload.product.price) || 0,
        currency: String(payload.product.currency || "INR"),
        commissionPercent: 0,
        landingUrl: String(payload.product.landingUrl ?? ""),
        active: true,
        createdAt: String(payload.product.createdAt ?? ""),
      },
      affiliate: payload.affiliate,
      settings: { ...DEFAULT_SETTINGS, ...payload.settings },
    };
  }

  async registerClick(code: string): Promise<void> {
    await this.db.rpc("register_click", { p_code: normalizeCode(code) });
  }

  // ---- leads ---------------------------------------------------------------

  async submitLead(submission: LeadSubmission): Promise<SubmitLeadResult> {
    const clean = sanitizeLead(submission);
    const body = {
      code: normalizeCode(submission.code),
      name: clean.name,
      email: clean.email,
      phone: clean.phone,
      source: submission.source || "referral-page",
    };

    // Preferred path: the edge function stores the lead, sends the emails and
    // forwards it to the FunnelOS automation in one round trip.
    try {
      const { data, error } = await this.db.functions.invoke("lead-capture", { body });
      if (!error && data && (data as Row).lead) {
        const payload = data as { lead: Row; emailSent?: boolean; forwardedToFunnelos?: boolean; warning?: string };
        return {
          lead: toLead(payload.lead),
          emailSent: Boolean(payload.emailSent),
          forwardedToFunnelos: Boolean(payload.forwardedToFunnelos),
          warning: payload.warning,
        };
      }
      // A 4xx from the function carries the real validation message.
      if (error) {
        const detail = await readFunctionError(error);
        if (detail) throw new BackendError(detail, "invalid_input");
      }
    } catch (invokeError) {
      if (invokeError instanceof BackendError) throw invokeError;
      // Network/not-deployed - fall through to the database function so a lead
      // is never lost just because email delivery is not set up yet.
    }

    const { data, error } = await this.db.rpc("submit_lead", {
      p_code: body.code,
      p_name: body.name,
      p_email: body.email,
      p_phone: body.phone,
      p_source: body.source,
    });
    if (error) fail(error, "Could not submit the form");
    const row = (Array.isArray(data) ? data[0] : data) as Row;
    return { lead: toLead(row), emailSent: false, forwardedToFunnelos: false, warning: "email_not_configured" };
  }

  async listLeads(filter: LeadFilter = {}): Promise<Lead[]> {
    let query = this.db.from("leads").select("*").order("created_at", { ascending: false });
    if (filter.affiliateId) query = query.eq("affiliate_id", filter.affiliateId);
    if (filter.productId) query = query.eq("product_id", filter.productId);
    if (filter.status) query = query.eq("status", filter.status);
    const { data, error } = await query;
    if (error) fail(error, "Could not load the leads");
    return (data as Row[]).map(toLead);
  }

  async updateLead(leadId: string, patch: { status?: LeadStatus; note?: string }): Promise<Lead> {
    if (patch.status === "converted") {
      throw new BackendError("Record the sale amount to convert this lead.", "use_convert");
    }
    const payload: Row = {};
    if (patch.status) payload.status = patch.status;
    if (patch.note !== undefined) payload.note = patch.note.slice(0, 300);
    const { data, error } = await this.db.from("leads").update(payload).eq("id", leadId).select().single();
    if (error) fail(error, "Could not update the lead");
    return toLead(data as Row);
  }

  // ---- conversions & payouts ----------------------------------------------

  async listConversions(affiliateId?: string): Promise<Conversion[]> {
    let query = this.db.from("conversions").select("*").order("converted_at", { ascending: false });
    if (affiliateId) query = query.eq("affiliate_id", affiliateId);
    const { data, error } = await query;
    if (error) fail(error, "Could not load the commissions");
    return (data as Row[]).map(toConversion);
  }

  async convertLead(leadId: string, values: ConversionValues): Promise<Conversion> {
    const { data, error } = await this.db.rpc("convert_lead", {
      p_lead_id: leadId,
      p_sale_amount: Number(values.saleAmount),
      p_commission_percent:
        values.commissionPercent === undefined || Number.isNaN(Number(values.commissionPercent))
          ? null
          : Number(values.commissionPercent),
      p_note: values.note || "",
    });
    if (error) fail(error, "Could not record the purchase");
    const row = (Array.isArray(data) ? data[0] : data) as Row;
    return toConversion(row);
  }

  async deleteConversion(conversionId: string): Promise<void> {
    const { error } = await this.db.rpc("delete_conversion", { p_conversion_id: conversionId });
    if (error) fail(error, "Could not remove the purchase");
  }

  async listPayouts(affiliateId?: string): Promise<Payout[]> {
    let query = this.db.from("payouts").select("*").order("paid_at", { ascending: false });
    if (affiliateId) query = query.eq("affiliate_id", affiliateId);
    const { data, error } = await query;
    if (error) fail(error, "Could not load the payouts");
    const payouts = data as Row[];
    if (payouts.length === 0) return [];

    // The link between a payout and its commissions lives on the conversions.
    const { data: conversions } = await this.db
      .from("conversions")
      .select("id, payout_id")
      .in("payout_id", payouts.map((row) => String(row.id)));
    const byPayout = new Map<string, string[]>();
    for (const row of (conversions || []) as Row[]) {
      const key = String(row.payout_id);
      const bucket = byPayout.get(key);
      if (bucket) bucket.push(String(row.id));
      else byPayout.set(key, [String(row.id)]);
    }
    return payouts.map((row) => toPayout(row, byPayout.get(String(row.id)) || []));
  }

  async payConversions(affiliateId: string, conversionIds: string[], values: PayoutValues): Promise<Payout> {
    const { data, error } = await this.db.rpc("pay_conversions", {
      p_affiliate_id: affiliateId,
      p_conversion_ids: conversionIds,
      p_reference: values.reference,
      p_note: values.note || "",
    });
    if (error) fail(error, "Could not record the payout");
    const row = (Array.isArray(data) ? data[0] : data) as Row;
    return toPayout(row, conversionIds);
  }

  // ---- settings & logs -----------------------------------------------------

  async getSettings(): Promise<AppSettings> {
    const { data, error } = await this.db.from("app_settings").select("*").eq("id", 1).maybeSingle();
    if (error) fail(error, "Could not load the settings");
    return toSettings((data as Row) || null);
  }

  async saveSettings(values: SettingsValues): Promise<AppSettings> {
    const merged = { ...DEFAULT_SETTINGS, ...values, currency: (values.currency || "INR").toUpperCase() };
    const { data, error } = await this.db
      .from("app_settings")
      .update(fromSettings(merged))
      .eq("id", 1)
      .select()
      .single();
    if (error) fail(error, "Could not save the settings");
    return toSettings(data as Row);
  }

  async listEmailLog(): Promise<EmailLogEntry[]> {
    const { data, error } = await this.db
      .from("email_log")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(200);
    if (error) fail(error, "Could not load the email log");
    return (data as Row[]).map(toEmailLogEntry);
  }
}

/** Edge functions return their validation message in the response body. */
async function readFunctionError(error: unknown): Promise<string> {
  const context = (error as { context?: { json?: () => Promise<unknown> } })?.context;
  if (!context?.json) return "";
  try {
    const body = (await context.json()) as { error?: string };
    return body?.error || "";
  } catch {
    return "";
  }
}
