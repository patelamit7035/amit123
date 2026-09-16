import { calcCommission, payoutDueAt } from "@/lib/affiliate/commission";
import { DEFAULT_SETTINGS } from "@/lib/affiliate/constants";
import type { Conversion, Lead, Profile } from "@/lib/affiliate/types";
import { hashPassword, newId, type Db } from "./localDb";

/** Demo credentials shown on the login screen when running without Supabase. */
export const DEMO_ADMIN = { email: "admin@funnelos.app", password: "admin12345" };
export const DEMO_AFFILIATE = { email: "rahul@funnelos.app", password: "affiliate123" };

function daysAgo(now: Date, days: number, hour = 10): string {
  const date = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
  date.setHours(hour, 0, 0, 0);
  return date.toISOString();
}

/**
 * Fills a fresh local database with a believable program: one admin, two
 * affiliates with bank details, three products, links, leads at every stage and
 * commissions spread across the payout hold window (one already paid, one
 * matured and ready to transfer, one still pending).
 */
export function seedDemoData(db: Db, now: Date = new Date()): void {
  db.settings = {
    ...DEFAULT_SETTINGS,
    brandName: "FunnelOS",
    currency: "INR",
    notifyAdminEmail: DEMO_ADMIN.email,
    notifyFromEmail: "no-reply@funnelos.app",
  };

  const admin: Profile = {
    id: "usr_demo_admin",
    email: DEMO_ADMIN.email,
    fullName: "FunnelOS Admin",
    phone: "+91 90000 00000",
    role: "admin",
    status: "active",
    referralCode: "ADMIN-0001",
    createdAt: daysAgo(now, 60),
  };

  const rahul: Profile = {
    id: "usr_demo_rahul",
    email: DEMO_AFFILIATE.email,
    fullName: "Rahul Sharma",
    phone: "+91 98765 43210",
    role: "affiliate",
    status: "active",
    referralCode: "RAHUL-4K7P",
    createdAt: daysAgo(now, 40),
  };

  const priya: Profile = {
    id: "usr_demo_priya",
    email: "priya@funnelos.app",
    fullName: "Priya Nair",
    phone: "+91 91234 56780",
    role: "affiliate",
    status: "active",
    referralCode: "PRIYA-8M2Q",
    createdAt: daysAgo(now, 25),
  };

  db.profiles.push(admin, rahul, priya);
  db.credentials.push(
    { userId: admin.id, email: admin.email, passwordHash: hashPassword(DEMO_ADMIN.password) },
    { userId: rahul.id, email: rahul.email, passwordHash: hashPassword(DEMO_AFFILIATE.password) },
    { userId: priya.id, email: priya.email, passwordHash: hashPassword("affiliate123") },
  );
  db.bank.push(
    {
      userId: rahul.id,
      accountHolderName: "Rahul Sharma",
      bankName: "HDFC Bank",
      accountNumber: "50100234567890",
      ifscCode: "HDFC0001234",
      upiId: "rahul@okhdfcbank",
      updatedAt: daysAgo(now, 40),
    },
    {
      userId: priya.id,
      accountHolderName: "Priya Nair",
      bankName: "ICICI Bank",
      accountNumber: "002401512345",
      ifscCode: "ICIC0000024",
      upiId: "priya@okicici",
      updatedAt: daysAgo(now, 25),
    },
  );

  db.products.push(
    {
      id: "prd_demo_os",
      name: "FunnelOS Pro (Annual)",
      description: "The complete funnel operating system: pages, automations, WhatsApp and email follow-up.",
      price: 24999,
      currency: "INR",
      commissionPercent: 20,
      landingUrl: "",
      active: true,
      createdAt: daysAgo(now, 55),
    },
    {
      id: "prd_demo_bootcamp",
      name: "Funnel Bootcamp (5 Days)",
      description: "Live 5-day cohort that takes a business from zero to a launched funnel.",
      price: 4999,
      currency: "INR",
      commissionPercent: 30,
      landingUrl: "",
      active: true,
      createdAt: daysAgo(now, 50),
    },
    {
      id: "prd_demo_done",
      name: "Done-For-You Funnel Setup",
      description: "Our team builds and launches the entire funnel for you in 14 days.",
      price: 74999,
      currency: "INR",
      commissionPercent: 12,
      landingUrl: "",
      active: true,
      createdAt: daysAgo(now, 30),
    },
  );

  db.links.push(
    { id: "lnk_demo_1", code: "RH7K2M4P", affiliateId: rahul.id, productId: "prd_demo_os", clicks: 148, createdAt: daysAgo(now, 40) },
    { id: "lnk_demo_2", code: "RH9Q3T8Z", affiliateId: rahul.id, productId: "prd_demo_bootcamp", clicks: 96, createdAt: daysAgo(now, 38) },
    { id: "lnk_demo_3", code: "PR4N6V2X", affiliateId: priya.id, productId: "prd_demo_os", clicks: 71, createdAt: daysAgo(now, 25) },
  );

  const leadSeeds: Array<[string, string, string, string, string, string, number, Lead["status"]]> = [
    ["led_demo_1", "Arjun Mehta", "arjun.mehta@example.com", "+91 99880 11223", "lnk_demo_1", "prd_demo_os", 12, "converted"],
    ["led_demo_2", "Sneha Kulkarni", "sneha.k@example.com", "+91 99880 11224", "lnk_demo_1", "prd_demo_os", 9, "converted"],
    ["led_demo_3", "Vikram Desai", "vikram.d@example.com", "+91 99880 11225", "lnk_demo_1", "prd_demo_os", 5, "contacted"],
    ["led_demo_4", "Ananya Iyer", "ananya.i@example.com", "+91 99880 11226", "lnk_demo_2", "prd_demo_bootcamp", 3, "converted"],
    ["led_demo_5", "Rohit Verma", "rohit.v@example.com", "+91 99880 11227", "lnk_demo_2", "prd_demo_bootcamp", 2, "new"],
    ["led_demo_6", "Kavya Reddy", "kavya.r@example.com", "+91 99880 11228", "lnk_demo_3", "prd_demo_os", 6, "converted"],
    ["led_demo_7", "Imran Sheikh", "imran.s@example.com", "+91 99880 11229", "lnk_demo_3", "prd_demo_os", 1, "new"],
    ["led_demo_8", "Nisha Patel", "nisha.p@example.com", "+91 99880 11230", "lnk_demo_1", "prd_demo_os", 0, "new"],
  ];

  const affiliateOfLink: Record<string, string> = {
    lnk_demo_1: rahul.id,
    lnk_demo_2: rahul.id,
    lnk_demo_3: priya.id,
  };

  for (const [id, name, email, phone, linkId, productId, ageDays, status] of leadSeeds) {
    db.leads.push({
      id,
      affiliateId: affiliateOfLink[linkId],
      productId,
      linkId,
      name,
      email,
      phone,
      status,
      source: "referral-page",
      note: "",
      createdAt: daysAgo(now, ageDays, 11),
      convertedAt: status === "converted" ? daysAgo(now, Math.max(ageDays - 1, 0), 15) : null,
    });
  }
  db.leads.sort((a, b) => b.createdAt.localeCompare(a.createdAt));

  const conversionSeeds: Array<[string, string, string, string, number, number, number, boolean]> = [
    // id, leadId, affiliateId, productId, saleAmount, percent, convertedDaysAgo, paid
    ["cnv_demo_1", "led_demo_1", rahul.id, "prd_demo_os", 24999, 20, 11, true],
    ["cnv_demo_2", "led_demo_2", rahul.id, "prd_demo_os", 24999, 20, 8, false],
    ["cnv_demo_3", "led_demo_4", rahul.id, "prd_demo_bootcamp", 4999, 30, 2, false],
    ["cnv_demo_4", "led_demo_6", priya.id, "prd_demo_os", 24999, 20, 5, false],
  ];

  const conversions: Conversion[] = conversionSeeds.map(
    ([id, leadId, affiliateId, productId, saleAmount, percent, ageDays, paid]) => {
      const convertedAt = daysAgo(now, ageDays, 15);
      return {
        id,
        leadId,
        affiliateId,
        productId,
        saleAmount,
        commissionPercent: percent,
        commissionAmount: calcCommission(saleAmount, percent),
        convertedAt,
        payoutDueAt: payoutDueAt(convertedAt, DEFAULT_SETTINGS.payoutHoldDays),
        paidAt: paid ? daysAgo(now, Math.max(ageDays - 8, 0), 12) : null,
        payoutId: paid ? "pay_demo_1" : null,
        note: "",
      };
    },
  );
  db.conversions.push(...conversions);

  const paidConversion = conversions.find((row) => row.paidAt);
  if (paidConversion) {
    db.payouts.push({
      id: "pay_demo_1",
      affiliateId: rahul.id,
      amount: paidConversion.commissionAmount,
      conversionIds: [paidConversion.id],
      reference: "UPI/4471829301",
      note: "Weekly affiliate payout",
      paidAt: paidConversion.paidAt as string,
    });
  }

  db.emailLog.push({
    id: newId("mail"),
    leadId: "led_demo_8",
    toEmail: "nisha.p@example.com",
    template: "lead-welcome",
    status: "sent",
    error: "",
    createdAt: daysAgo(now, 0, 11),
  });
}
