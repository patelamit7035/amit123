import { payoutStatusOf } from "./commission";
import { PAYOUT_STATUS_LABELS, LEAD_STATUS_LABELS } from "./constants";
import { toCsv } from "./csv";
import type { Conversion, Lead } from "./types";

interface LeadExportOptions {
  productName: (productId: string) => string;
  affiliateName?: (affiliateId: string) => string;
}

/** The lead export an affiliate (or the admin) downloads. */
export function leadsToCsv(leads: Lead[], options: LeadExportOptions): string {
  const withAffiliate = Boolean(options.affiliateName);
  const rows = leads.map((lead) => ({
    name: lead.name,
    email: lead.email,
    phone: lead.phone,
    product: options.productName(lead.productId),
    affiliate: options.affiliateName ? options.affiliateName(lead.affiliateId) : "",
    status: LEAD_STATUS_LABELS[lead.status] ?? lead.status,
    source: lead.source,
    submitted: new Date(lead.createdAt).toLocaleString(),
    converted: lead.convertedAt ? new Date(lead.convertedAt).toLocaleString() : "",
    note: lead.note,
  }));

  const columns = [
    { key: "name" as const, label: "Name" },
    { key: "email" as const, label: "Email" },
    { key: "phone" as const, label: "Phone" },
    { key: "product" as const, label: "Product" },
    ...(withAffiliate ? [{ key: "affiliate" as const, label: "Affiliate" }] : []),
    { key: "status" as const, label: "Status" },
    { key: "source" as const, label: "Source" },
    { key: "submitted" as const, label: "Submitted at" },
    { key: "converted" as const, label: "Converted at" },
    { key: "note" as const, label: "Note" },
  ];

  return toCsv(rows, columns);
}

interface CommissionExportOptions {
  productName: (productId: string) => string;
  affiliateName?: (affiliateId: string) => string;
  leadName: (leadId: string) => string;
  now?: Date;
}

export function conversionsToCsv(conversions: Conversion[], options: CommissionExportOptions): string {
  const withAffiliate = Boolean(options.affiliateName);
  const now = options.now ?? new Date();
  const rows = conversions.map((conversion) => ({
    lead: options.leadName(conversion.leadId),
    product: options.productName(conversion.productId),
    affiliate: options.affiliateName ? options.affiliateName(conversion.affiliateId) : "",
    saleAmount: conversion.saleAmount.toFixed(2),
    commissionPercent: `${conversion.commissionPercent}%`,
    commissionAmount: conversion.commissionAmount.toFixed(2),
    convertedAt: new Date(conversion.convertedAt).toLocaleString(),
    creditedOn: new Date(conversion.payoutDueAt).toLocaleDateString(),
    payoutStatus: PAYOUT_STATUS_LABELS[payoutStatusOf(conversion, now)],
    paidAt: conversion.paidAt ? new Date(conversion.paidAt).toLocaleString() : "",
  }));

  const columns = [
    { key: "lead" as const, label: "Lead" },
    { key: "product" as const, label: "Product" },
    ...(withAffiliate ? [{ key: "affiliate" as const, label: "Affiliate" }] : []),
    { key: "saleAmount" as const, label: "Sale amount" },
    { key: "commissionPercent" as const, label: "Commission %" },
    { key: "commissionAmount" as const, label: "Commission" },
    { key: "convertedAt" as const, label: "Purchased at" },
    { key: "creditedOn" as const, label: "Credited on" },
    { key: "payoutStatus" as const, label: "Payout status" },
    { key: "paidAt" as const, label: "Paid at" },
  ];

  return toCsv(rows, columns);
}
