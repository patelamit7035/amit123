import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { getBackend } from "@/lib/data";
import type { AffiliateStatus, LeadStatus } from "@/lib/affiliate/types";
import type {
  BankDetailsValues,
  ConversionValues,
  PayoutValues,
  ProductValues,
  SettingsValues,
} from "@/lib/affiliate/validation";
import type { LeadFilter } from "@/lib/data/backend";

/**
 * React Query wrappers over the backend. Every mutation invalidates the
 * queries that depend on it, so the dashboards stay consistent without any
 * manual refetching in the pages.
 */

export const queryKeys = {
  settings: ["settings"] as const,
  products: (includeInactive: boolean) => ["products", includeInactive] as const,
  links: (affiliateId?: string) => ["links", affiliateId ?? "all"] as const,
  leads: (filter: LeadFilter) => ["leads", filter.affiliateId ?? "all", filter.productId ?? "all", filter.status ?? "all"] as const,
  conversions: (affiliateId?: string) => ["conversions", affiliateId ?? "all"] as const,
  payouts: (affiliateId?: string) => ["payouts", affiliateId ?? "all"] as const,
  profiles: ["profiles"] as const,
  bankDetails: (userId?: string) => ["bank-details", userId ?? "all"] as const,
  emailLog: ["email-log"] as const,
};

export function useSettings() {
  return useQuery({ queryKey: queryKeys.settings, queryFn: () => getBackend().getSettings() });
}

export function useProducts(includeInactive = false) {
  return useQuery({
    queryKey: queryKeys.products(includeInactive),
    queryFn: () => getBackend().listProducts({ includeInactive }),
  });
}

export function useLinks(affiliateId?: string) {
  return useQuery({
    queryKey: queryKeys.links(affiliateId),
    queryFn: () => getBackend().listLinks(affiliateId),
  });
}

export function useLeads(filter: LeadFilter = {}) {
  return useQuery({ queryKey: queryKeys.leads(filter), queryFn: () => getBackend().listLeads(filter) });
}

export function useConversions(affiliateId?: string) {
  return useQuery({
    queryKey: queryKeys.conversions(affiliateId),
    queryFn: () => getBackend().listConversions(affiliateId),
  });
}

export function usePayouts(affiliateId?: string) {
  return useQuery({
    queryKey: queryKeys.payouts(affiliateId),
    queryFn: () => getBackend().listPayouts(affiliateId),
  });
}

export function useProfiles() {
  return useQuery({ queryKey: queryKeys.profiles, queryFn: () => getBackend().listProfiles() });
}

export function useAllBankDetails() {
  return useQuery({ queryKey: queryKeys.bankDetails(), queryFn: () => getBackend().listBankDetails() });
}

export function useBankDetails(userId?: string) {
  return useQuery({
    queryKey: queryKeys.bankDetails(userId),
    queryFn: () => (userId ? getBackend().getBankDetails(userId) : Promise.resolve(null)),
    enabled: Boolean(userId),
  });
}

export function useEmailLog() {
  return useQuery({ queryKey: queryKeys.emailLog, queryFn: () => getBackend().listEmailLog() });
}

/** Invalidates everything that can change when money or leads move. */
function useInvalidate() {
  const client = useQueryClient();
  return (keys: string[]) => {
    for (const key of keys) {
      void client.invalidateQueries({ queryKey: [key] });
    }
  };
}

export function useSaveProduct() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: ({ id, values }: { id?: string; values: ProductValues }) =>
      id ? getBackend().updateProduct(id, values) : getBackend().createProduct(values),
    onSuccess: () => invalidate(["products", "links"]),
  });
}

export function useDeleteProduct() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: (productId: string) => getBackend().deleteProduct(productId),
    onSuccess: () => invalidate(["products", "links"]),
  });
}

export function useEnsureLink() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: ({ affiliateId, productId }: { affiliateId: string; productId: string }) =>
      getBackend().ensureLink(affiliateId, productId),
    onSuccess: () => invalidate(["links"]),
  });
}

export function useUpdateLead() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: ({ leadId, status, note }: { leadId: string; status?: LeadStatus; note?: string }) =>
      getBackend().updateLead(leadId, { status, note }),
    onSuccess: () => invalidate(["leads"]),
  });
}

export function useConvertLead() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: ({ leadId, values }: { leadId: string; values: ConversionValues }) =>
      getBackend().convertLead(leadId, values),
    onSuccess: () => invalidate(["leads", "conversions", "payouts"]),
  });
}

export function useDeleteConversion() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: (conversionId: string) => getBackend().deleteConversion(conversionId),
    onSuccess: () => invalidate(["leads", "conversions", "payouts"]),
  });
}

export function usePayConversions() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: ({
      affiliateId,
      conversionIds,
      values,
    }: {
      affiliateId: string;
      conversionIds: string[];
      values: PayoutValues;
    }) => getBackend().payConversions(affiliateId, conversionIds, values),
    onSuccess: () => invalidate(["conversions", "payouts"]),
  });
}

export function useSaveBankDetails() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: ({ userId, values }: { userId: string; values: BankDetailsValues }) =>
      getBackend().saveBankDetails(userId, values),
    onSuccess: () => invalidate(["bank-details"]),
  });
}

export function useSaveSettings() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: (values: SettingsValues) => getBackend().saveSettings(values),
    onSuccess: () => invalidate(["settings"]),
  });
}

export function useSetAffiliateStatus() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: ({ userId, status }: { userId: string; status: AffiliateStatus }) =>
      getBackend().setAffiliateStatus(userId, status),
    onSuccess: () => invalidate(["profiles"]),
  });
}
