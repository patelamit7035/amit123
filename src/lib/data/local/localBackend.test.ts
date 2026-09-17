import { beforeEach, describe, expect, it } from "vitest";
import { buildAffiliateStats, buildAdminStats, duePayoutsByAffiliate } from "@/lib/affiliate/stats";
import { payoutStatusOf } from "@/lib/affiliate/commission";
import { BackendError } from "../backend";
import { LocalBackend } from "./localBackend";
import { memoryStorage } from "./localDb";

const DAY = 24 * 60 * 60 * 1000;

/** A clock the tests can advance to walk through the 7-day payout hold. */
function clock(startIso: string) {
  let current = new Date(startIso).getTime();
  return {
    now: () => new Date(current),
    advanceDays(days: number) {
      current += days * DAY;
    },
  };
}

function makeBackend(startIso = "2026-09-01T09:00:00.000Z") {
  const time = clock(startIso);
  const backend = new LocalBackend({ storage: memoryStorage(), seed: false, now: time.now });
  return { backend, time };
}

const adminSignUp = {
  fullName: "Amit Patel",
  email: "Admin@FunnelOS.app",
  phone: "+91 90000 00000",
  password: "supersecret1",
  confirmPassword: "supersecret1",
  accountHolderName: "Amit Patel",
  bankName: "HDFC Bank",
  accountNumber: "50100234567890",
  ifscCode: "HDFC0001234",
  upiId: "amit@okhdfcbank",
};

const affiliateSignUp = {
  ...adminSignUp,
  fullName: "Rahul Sharma",
  email: "rahul@example.com",
  accountHolderName: "Rahul Sharma",
  bankName: "ICICI Bank",
  accountNumber: "002401512345",
  ifscCode: "ICIC0000024",
  upiId: "rahul@okicici",
};

const productValues = {
  name: "FunnelOS Pro",
  description: "The complete funnel operating system",
  price: 24999,
  currency: "INR",
  commissionPercent: 20,
  landingUrl: "",
  active: true,
};

describe("registration and login", () => {
  let ctx: ReturnType<typeof makeBackend>;
  beforeEach(() => {
    ctx = makeBackend();
  });

  it("makes the first account the admin and later accounts affiliates", async () => {
    const admin = await ctx.backend.signUp(adminSignUp);
    expect(admin.role).toBe("admin");
    const affiliate = await ctx.backend.signUp(affiliateSignUp);
    expect(affiliate.role).toBe("affiliate");
  });

  it("lowercases the email and issues a unique referral code", async () => {
    const admin = await ctx.backend.signUp(adminSignUp);
    expect(admin.email).toBe("admin@funnelos.app");
    expect(admin.referralCode).toMatch(/^AMITPA-[A-Z2-9]{4}$/);
    const affiliate = await ctx.backend.signUp(affiliateSignUp);
    expect(affiliate.referralCode).not.toBe(admin.referralCode);
  });

  it("stores the bank details captured at registration", async () => {
    const affiliate = await ctx.backend.signUp(affiliateSignUp);
    const bank = await ctx.backend.getBankDetails(affiliate.id);
    expect(bank).toMatchObject({
      accountHolderName: "Rahul Sharma",
      bankName: "ICICI Bank",
      accountNumber: "002401512345",
      ifscCode: "ICIC0000024",
    });
  });

  it("rejects a duplicate email regardless of casing", async () => {
    await ctx.backend.signUp(adminSignUp);
    await expect(ctx.backend.signUp({ ...adminSignUp, email: "ADMIN@funnelos.app" })).rejects.toThrow(
      /already exists/i,
    );
  });

  it("signs in with the right password and refuses the wrong one", async () => {
    await ctx.backend.signUp(affiliateSignUp);
    await ctx.backend.signOut();
    expect(await ctx.backend.getCurrentProfile()).toBeNull();

    await expect(ctx.backend.signIn("rahul@example.com", "wrong-password")).rejects.toThrow(/incorrect/i);
    const profile = await ctx.backend.signIn("RAHUL@example.com", "supersecret1");
    expect(profile.fullName).toBe("Rahul Sharma");
    expect((await ctx.backend.getCurrentProfile())?.id).toBe(profile.id);
  });

  it("blocks a suspended affiliate from signing in", async () => {
    const affiliate = await ctx.backend.signUp(affiliateSignUp);
    await ctx.backend.setAffiliateStatus(affiliate.id, "suspended");
    await ctx.backend.signOut();
    await expect(ctx.backend.signIn("rahul@example.com", "supersecret1")).rejects.toThrow(/suspended/i);
  });

  it("keeps the session across a page reload (same storage)", async () => {
    const storage = memoryStorage();
    const first = new LocalBackend({ storage, seed: false });
    const profile = await first.signUp(affiliateSignUp);
    const second = new LocalBackend({ storage, seed: false });
    expect((await second.getCurrentProfile())?.id).toBe(profile.id);
  });
});

describe("products and affiliate links", () => {
  it("creates one stable link per affiliate and product", async () => {
    const { backend } = makeBackend();
    await backend.signUp(adminSignUp);
    const affiliate = await backend.signUp(affiliateSignUp);
    const product = await backend.createProduct(productValues);

    const link = await backend.ensureLink(affiliate.id, product.id);
    const again = await backend.ensureLink(affiliate.id, product.id);
    expect(again.id).toBe(link.id);
    expect(again.code).toBe(link.code);
    expect(link.code).toMatch(/^[A-Z2-9]{8}$/);
  });

  it("gives different affiliates different codes for the same product", async () => {
    const { backend } = makeBackend();
    const admin = await backend.signUp(adminSignUp);
    const affiliate = await backend.signUp(affiliateSignUp);
    const product = await backend.createProduct(productValues);
    const a = await backend.ensureLink(admin.id, product.id);
    const b = await backend.ensureLink(affiliate.id, product.id);
    expect(a.code).not.toBe(b.code);
  });

  it("hides inactive products from the public link resolver", async () => {
    const { backend } = makeBackend();
    const affiliate = await backend.signUp(adminSignUp);
    const product = await backend.createProduct(productValues);
    const link = await backend.ensureLink(affiliate.id, product.id);
    expect(await backend.resolveLink(link.code)).not.toBeNull();

    await backend.updateProduct(product.id, { ...productValues, active: false });
    expect(await backend.resolveLink(link.code)).toBeNull();
    expect(await backend.listProducts()).toHaveLength(0);
    expect(await backend.listProducts({ includeInactive: true })).toHaveLength(1);
  });

  it("counts clicks on the link and tolerates unknown codes", async () => {
    const { backend } = makeBackend();
    const affiliate = await backend.signUp(adminSignUp);
    const product = await backend.createProduct(productValues);
    const link = await backend.ensureLink(affiliate.id, product.id);

    await backend.registerClick(link.code);
    await backend.registerClick(link.code.toLowerCase());
    await expect(backend.registerClick("NOPE1234")).resolves.toBeUndefined();

    const [stored] = await backend.listLinks(affiliate.id);
    expect(stored.clicks).toBe(2);
  });

  it("refuses to delete a product that already has leads", async () => {
    const { backend } = makeBackend();
    const affiliate = await backend.signUp(adminSignUp);
    const product = await backend.createProduct(productValues);
    const link = await backend.ensureLink(affiliate.id, product.id);
    await backend.submitLead({ code: link.code, name: "Arjun", email: "a@example.com", phone: "9988001122" });

    await expect(backend.deleteProduct(product.id)).rejects.toThrow(/deactivate it instead/i);
  });
});

describe("lead capture", () => {
  it("attributes a submitted form to the affiliate who owns the link", async () => {
    const { backend } = makeBackend();
    await backend.signUp(adminSignUp);
    const affiliate = await backend.signUp(affiliateSignUp);
    const product = await backend.createProduct(productValues);
    const link = await backend.ensureLink(affiliate.id, product.id);

    const result = await backend.submitLead({
      code: link.code.toLowerCase(),
      name: "  Arjun Mehta ",
      email: " Arjun@Example.com ",
      phone: " +91 99880 11223 ",
      source: "https://mypage.example.com/offer",
    });

    expect(result.lead).toMatchObject({
      affiliateId: affiliate.id,
      productId: product.id,
      linkId: link.id,
      name: "Arjun Mehta",
      email: "arjun@example.com",
      phone: "+91 99880 11223",
      status: "new",
      source: "https://mypage.example.com/offer",
    });
    expect(result.emailSent).toBe(true);

    const log = await backend.listEmailLog();
    expect(log[0]).toMatchObject({ toEmail: "arjun@example.com", template: "lead-welcome", status: "sent" });
  });

  it("also emails the admin when a notification address is configured", async () => {
    const { backend } = makeBackend();
    const affiliate = await backend.signUp(adminSignUp);
    const product = await backend.createProduct(productValues);
    const link = await backend.ensureLink(affiliate.id, product.id);
    await backend.saveSettings({
      brandName: "FunnelOS",
      currency: "INR",
      payoutHoldDays: 7,
      publicBaseUrl: "",
      funnelosWebhookUrl: "",
      whatsappNumber: "",
      notifyFromEmail: "no-reply@funnelos.app",
      notifyAdminEmail: "sales@funnelos.app",
    });

    await backend.submitLead({ code: link.code, name: "Arjun", email: "a@example.com", phone: "9988001122" });
    const log = await backend.listEmailLog();
    expect(log.map((row) => row.template)).toEqual(["lead-notification", "lead-welcome"]);
  });

  it("does not double-count the same person submitting twice", async () => {
    const { backend } = makeBackend();
    const affiliate = await backend.signUp(adminSignUp);
    const product = await backend.createProduct(productValues);
    const link = await backend.ensureLink(affiliate.id, product.id);

    await backend.submitLead({ code: link.code, name: "Arjun", email: "a@example.com", phone: "9988001122" });
    const second = await backend.submitLead({
      code: link.code,
      name: "Arjun Mehta",
      email: "A@Example.com",
      phone: "9988009999",
    });

    expect(second.warning).toBe("duplicate");
    const leads = await backend.listLeads();
    expect(leads).toHaveLength(1);
    expect(leads[0]).toMatchObject({ name: "Arjun Mehta", phone: "9988009999" });
  });

  it("rejects a dead link and missing fields", async () => {
    const { backend } = makeBackend();
    const affiliate = await backend.signUp(adminSignUp);
    const product = await backend.createProduct(productValues);
    const link = await backend.ensureLink(affiliate.id, product.id);

    await expect(
      backend.submitLead({ code: "UNKNOWN1", name: "A", email: "a@example.com", phone: "1" }),
    ).rejects.toThrow(/no longer active/i);
    await expect(
      backend.submitLead({ code: link.code, name: "", email: "a@example.com", phone: "1" }),
    ).rejects.toBeInstanceOf(BackendError);
  });

  it("filters leads by affiliate so one affiliate never sees another's", async () => {
    const { backend } = makeBackend();
    const one = await backend.signUp(adminSignUp);
    const two = await backend.signUp(affiliateSignUp);
    const product = await backend.createProduct(productValues);
    const linkOne = await backend.ensureLink(one.id, product.id);
    const linkTwo = await backend.ensureLink(two.id, product.id);

    await backend.submitLead({ code: linkOne.code, name: "Lead One", email: "one@example.com", phone: "1111111111" });
    await backend.submitLead({ code: linkTwo.code, name: "Lead Two", email: "two@example.com", phone: "2222222222" });

    expect(await backend.listLeads({ affiliateId: one.id })).toHaveLength(1);
    expect((await backend.listLeads({ affiliateId: two.id }))[0].name).toBe("Lead Two");
    expect(await backend.listLeads()).toHaveLength(2);
  });
});

describe("conversion, commission and the 7-day payout hold", () => {
  async function setup() {
    const ctx = makeBackend("2026-09-01T09:00:00.000Z");
    await ctx.backend.signUp(adminSignUp);
    const affiliate = await ctx.backend.signUp(affiliateSignUp);
    const product = await ctx.backend.createProduct(productValues);
    const link = await ctx.backend.ensureLink(affiliate.id, product.id);
    const { lead } = await ctx.backend.submitLead({
      code: link.code,
      name: "Arjun Mehta",
      email: "arjun@example.com",
      phone: "9988001122",
    });
    return { ...ctx, affiliate, product, link, lead };
  }

  it("records the sale, snapshots the rate and dates the credit 7 days out", async () => {
    const { backend, lead, affiliate } = await setup();
    const conversion = await backend.convertLead(lead.id, { saleAmount: 24999, commissionPercent: 20, note: "UPI" });

    expect(conversion).toMatchObject({
      affiliateId: affiliate.id,
      saleAmount: 24999,
      commissionPercent: 20,
      commissionAmount: 4999.8,
      convertedAt: "2026-09-01T09:00:00.000Z",
      payoutDueAt: "2026-09-08T09:00:00.000Z",
      paidAt: null,
    });

    const [updated] = await backend.listLeads();
    expect(updated.status).toBe("converted");
    expect(updated.convertedAt).toBe("2026-09-01T09:00:00.000Z");
  });

  it("keeps the old rate on past sales when the product's rate changes later", async () => {
    const { backend, lead, product } = await setup();
    const conversion = await backend.convertLead(lead.id, { saleAmount: 24999, commissionPercent: 20, note: "" });
    await backend.updateProduct(product.id, { ...productValues, commissionPercent: 5 });

    const [stored] = await backend.listConversions();
    expect(stored.commissionPercent).toBe(20);
    expect(stored.commissionAmount).toBe(conversion.commissionAmount);
  });

  it("refuses to convert the same lead twice", async () => {
    const { backend, lead } = await setup();
    await backend.convertLead(lead.id, { saleAmount: 24999, commissionPercent: 20, note: "" });
    await expect(backend.convertLead(lead.id, { saleAmount: 100, commissionPercent: 20, note: "" })).rejects.toThrow(
      /already marked as a purchase/i,
    );
  });

  it("rejects a zero or negative sale amount", async () => {
    const { backend, lead } = await setup();
    await expect(backend.convertLead(lead.id, { saleAmount: 0, commissionPercent: 20, note: "" })).rejects.toThrow(
      /greater than 0/i,
    );
  });

  it("holds the commission for 7 days, then makes it payable", async () => {
    const { backend, time, affiliate } = await setup();
    const leads = await backend.listLeads();
    const conversion = await backend.convertLead(leads[0].id, {
      saleAmount: 24999,
      commissionPercent: 20,
      note: "",
    });

    let stats = buildAffiliateStats(
      await backend.listLinks(affiliate.id),
      await backend.listLeads({ affiliateId: affiliate.id }),
      await backend.listConversions(affiliate.id),
      time.now(),
    );
    expect(stats.pendingEarnings).toBe(4999.8);
    expect(stats.availableEarnings).toBe(0);

    time.advanceDays(6);
    expect(payoutStatusOf(conversion, time.now())).toBe("pending");
    await expect(
      backend.payConversions(affiliate.id, [conversion.id], { reference: "UPI/1", note: "" }),
    ).rejects.toThrow(/hold period/i);

    time.advanceDays(1);
    expect(payoutStatusOf(conversion, time.now())).toBe("available");

    stats = buildAffiliateStats(
      await backend.listLinks(affiliate.id),
      await backend.listLeads({ affiliateId: affiliate.id }),
      await backend.listConversions(affiliate.id),
      time.now(),
    );
    expect(stats.pendingEarnings).toBe(0);
    expect(stats.availableEarnings).toBe(4999.8);
    expect(stats.lifetimeEarnings).toBe(4999.8);
    expect(stats.conversionRate).toBe(100);
  });

  it("honours a custom hold period set by the admin", async () => {
    const { backend, time, affiliate } = await setup();
    await backend.saveSettings({
      brandName: "FunnelOS",
      currency: "INR",
      payoutHoldDays: 14,
      publicBaseUrl: "",
      funnelosWebhookUrl: "",
      whatsappNumber: "",
      notifyFromEmail: "",
      notifyAdminEmail: "",
    });
    const leads = await backend.listLeads();
    const conversion = await backend.convertLead(leads[0].id, { saleAmount: 1000, commissionPercent: 10, note: "" });
    expect(conversion.payoutDueAt).toBe("2026-09-15T09:00:00.000Z");

    time.advanceDays(13);
    await expect(
      backend.payConversions(affiliate.id, [conversion.id], { reference: "UPI/1", note: "" }),
    ).rejects.toThrow(/hold period/i);
  });

  it("pays matured commissions, records the reference and stops double payment", async () => {
    const { backend, time, affiliate } = await setup();
    const leads = await backend.listLeads();
    const conversion = await backend.convertLead(leads[0].id, {
      saleAmount: 24999,
      commissionPercent: 20,
      note: "",
    });
    time.advanceDays(7);

    const due = duePayoutsByAffiliate(await backend.listConversions(), time.now());
    expect(due.get(affiliate.id)).toHaveLength(1);

    const payout = await backend.payConversions(affiliate.id, [conversion.id], {
      reference: "UPI/4471829301",
      note: "Weekly payout",
    });
    expect(payout.amount).toBe(4999.8);
    expect(payout.conversionIds).toEqual([conversion.id]);

    const [stored] = await backend.listConversions(affiliate.id);
    expect(stored.paidAt).toBe("2026-09-08T09:00:00.000Z");
    expect(stored.payoutId).toBe(payout.id);

    await expect(
      backend.payConversions(affiliate.id, [conversion.id], { reference: "UPI/2", note: "" }),
    ).rejects.toThrow(/already paid/i);

    const stats = buildAffiliateStats(
      await backend.listLinks(affiliate.id),
      await backend.listLeads({ affiliateId: affiliate.id }),
      await backend.listConversions(affiliate.id),
      time.now(),
    );
    expect(stats.paidEarnings).toBe(4999.8);
    expect(stats.availableEarnings).toBe(0);
    expect(await backend.listPayouts(affiliate.id)).toHaveLength(1);
  });

  it("never mixes two affiliates into one payout", async () => {
    const { backend, time, affiliate, product } = await setup();
    const other = await backend.signUp({ ...affiliateSignUp, email: "priya@example.com", fullName: "Priya Nair" });
    const otherLink = await backend.ensureLink(other.id, product.id);
    const { lead: otherLead } = await backend.submitLead({
      code: otherLink.code,
      name: "Kavya",
      email: "kavya@example.com",
      phone: "9988001199",
    });

    const leads = await backend.listLeads({ affiliateId: affiliate.id });
    const mine = await backend.convertLead(leads[0].id, { saleAmount: 1000, commissionPercent: 10, note: "" });
    const theirs = await backend.convertLead(otherLead.id, { saleAmount: 1000, commissionPercent: 10, note: "" });
    time.advanceDays(7);

    await expect(
      backend.payConversions(affiliate.id, [mine.id, theirs.id], { reference: "UPI/1", note: "" }),
    ).rejects.toThrow(/different affiliates/i);
  });

  it("lets the admin undo an unpaid sale but not a paid one", async () => {
    const { backend, time, affiliate } = await setup();
    const leads = await backend.listLeads();
    const conversion = await backend.convertLead(leads[0].id, { saleAmount: 1000, commissionPercent: 10, note: "" });

    await backend.deleteConversion(conversion.id);
    expect(await backend.listConversions()).toHaveLength(0);
    expect((await backend.listLeads())[0]).toMatchObject({ status: "contacted", convertedAt: null });

    const redone = await backend.convertLead(leads[0].id, { saleAmount: 1000, commissionPercent: 10, note: "" });
    time.advanceDays(7);
    await backend.payConversions(affiliate.id, [redone.id], { reference: "UPI/1", note: "" });
    await expect(backend.deleteConversion(redone.id)).rejects.toThrow(/already been paid/i);
  });

  it("blocks manual status edits on a converted lead", async () => {
    const { backend } = await setup();
    const leads = await backend.listLeads();
    await backend.convertLead(leads[0].id, { saleAmount: 1000, commissionPercent: 10, note: "" });
    await expect(backend.updateLead(leads[0].id, { status: "new" })).rejects.toThrow(/converted/i);
    // Re-asserting the status it already has is a harmless no-op, not an error.
    await expect(backend.updateLead(leads[0].id, { status: "converted" })).resolves.toMatchObject({
      status: "converted",
    });
  });

  it("allows moving a fresh lead through the follow-up statuses", async () => {
    const { backend } = await setup();
    const leads = await backend.listLeads();
    const updated = await backend.updateLead(leads[0].id, { status: "contacted", note: "Called, will decide" });
    expect(updated).toMatchObject({ status: "contacted", note: "Called, will decide" });
    await expect(backend.updateLead(leads[0].id, { status: "converted" })).rejects.toThrow(/sale amount/i);
  });
});

describe("admin rollups", () => {
  it("reports per-affiliate leads and program totals", async () => {
    const { backend, time } = makeBackend();
    const admin = await backend.signUp(adminSignUp);
    const rahul = await backend.signUp(affiliateSignUp);
    const priya = await backend.signUp({ ...affiliateSignUp, email: "priya@example.com", fullName: "Priya Nair" });
    const product = await backend.createProduct(productValues);

    const rahulLink = await backend.ensureLink(rahul.id, product.id);
    const priyaLink = await backend.ensureLink(priya.id, product.id);
    await backend.registerClick(rahulLink.code);
    await backend.registerClick(rahulLink.code);
    await backend.registerClick(priyaLink.code);

    const a = await backend.submitLead({ code: rahulLink.code, name: "A", email: "a@example.com", phone: "1111111111" });
    await backend.submitLead({ code: rahulLink.code, name: "B", email: "b@example.com", phone: "2222222222" });
    await backend.submitLead({ code: priyaLink.code, name: "C", email: "c@example.com", phone: "3333333333" });
    await backend.convertLead(a.lead.id, { saleAmount: 24999, commissionPercent: 20, note: "" });

    const stats = buildAdminStats(
      await backend.listProfiles(),
      (await backend.listProducts()).length,
      await backend.listLinks(),
      await backend.listLeads(),
      await backend.listConversions(),
      time.now(),
    );

    expect(stats).toMatchObject({
      affiliates: 2,
      activeAffiliates: 2,
      products: 1,
      clicks: 3,
      leads: 3,
      conversions: 1,
      revenue: 24999,
      commissionOwed: 4999.8,
      commissionPaid: 0,
    });
    expect(admin.role).toBe("admin");
    expect((await backend.listLeads({ affiliateId: rahul.id })).length).toBe(2);
    expect((await backend.listLeads({ affiliateId: priya.id })).length).toBe(1);
    expect((await backend.listBankDetails()).length).toBe(3);
  });
});

describe("demo seed", () => {
  it("produces a consistent program the dashboard can render", async () => {
    const backend = new LocalBackend({ storage: memoryStorage(), now: () => new Date("2026-09-16T09:00:00.000Z") });
    const profiles = await backend.listProfiles();
    expect(profiles.filter((row) => row.role === "admin")).toHaveLength(1);

    const conversions = await backend.listConversions();
    expect(conversions.length).toBeGreaterThan(0);
    for (const conversion of conversions) {
      const product = (await backend.listProducts()).find((row) => row.id === conversion.productId);
      expect(product).toBeDefined();
      expect(conversion.commissionAmount).toBeCloseTo((conversion.saleAmount * conversion.commissionPercent) / 100, 2);
    }

    // Every converted lead has exactly one conversion behind it.
    const convertedLeads = (await backend.listLeads()).filter((lead) => lead.status === "converted");
    expect(convertedLeads).toHaveLength(conversions.length);

    const now = new Date("2026-09-16T09:00:00.000Z");
    const statuses = conversions.map((row) => payoutStatusOf(row, now));
    expect(new Set(statuses).size).toBeGreaterThan(1);
    expect(await backend.signIn("admin@funnelos.app", "admin12345")).toMatchObject({ role: "admin" });
    expect(await backend.signIn("rahul@funnelos.app", "affiliate123")).toMatchObject({ role: "affiliate" });
  });
});
