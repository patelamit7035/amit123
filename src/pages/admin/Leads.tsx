import { useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Download, IndianRupee, Loader2, MessageCircle, Search, Users } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { PageHeader } from "@/components/affiliate/PageHeader";
import { StatTile } from "@/components/affiliate/StatTile";
import { LeadStatusBadge } from "@/components/affiliate/StatusBadge";
import { EmptyState } from "@/components/affiliate/EmptyState";
import {
  useConversions,
  useConvertLead,
  useLeads,
  useProducts,
  useProfiles,
  useSettings,
  useUpdateLead,
} from "@/hooks/useAffiliate";
import { conversionSchema, type ConversionValues } from "@/lib/affiliate/validation";
import { calcCommission } from "@/lib/affiliate/commission";
import { formatMoney, formatNumber } from "@/lib/affiliate/money";
import { downloadCsv } from "@/lib/affiliate/csv";
import { leadsToCsv } from "@/lib/affiliate/exports";
import { buildWhatsAppChatUrl } from "@/lib/affiliate/codes";
import type { Lead, LeadStatus } from "@/lib/affiliate/types";

export default function AdminLeads() {
  const { data: settings } = useSettings();
  const { data: leads = [], isLoading } = useLeads();
  const { data: products = [] } = useProducts(true);
  const { data: profiles = [] } = useProfiles();
  const { data: conversions = [] } = useConversions();
  const updateLead = useUpdateLead();
  const convertLead = useConvertLead();

  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<LeadStatus | "all">("all");
  const [affiliateId, setAffiliateId] = useState("all");
  const [converting, setConverting] = useState<Lead | null>(null);

  const currency = settings?.currency || "INR";
  const productName = (id: string) => products.find((row) => row.id === id)?.name ?? "-";
  const affiliateName = (id: string) => profiles.find((row) => row.id === id)?.fullName ?? "-";

  const form = useForm<ConversionValues>({
    resolver: zodResolver(conversionSchema),
    defaultValues: { saleAmount: 0, commissionPercent: 0, note: "" },
  });
  const watched = form.watch();

  const openConvert = (lead: Lead) => {
    const product = products.find((row) => row.id === lead.productId);
    form.reset({
      saleAmount: product?.price ?? 0,
      commissionPercent: product?.commissionPercent ?? 0,
      note: "",
    });
    setConverting(lead);
  };

  const onConvert = async (values: ConversionValues) => {
    if (!converting) return;
    try {
      const conversion = await convertLead.mutateAsync({ leadId: converting.id, values });
      toast.success(
        `Purchase recorded - ${formatMoney(conversion.commissionAmount, currency)} credited to ${affiliateName(
          conversion.affiliateId,
        )} on ${new Date(conversion.payoutDueAt).toLocaleDateString()}`,
      );
      setConverting(null);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not record the purchase");
    }
  };

  const setLeadStatus = async (lead: Lead, next: LeadStatus) => {
    try {
      await updateLead.mutateAsync({ leadId: lead.id, status: next });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not update the lead");
    }
  };

  const filtered = useMemo(() => {
    const needle = search.trim().toLowerCase();
    return leads
      .filter((lead) => (status === "all" ? true : lead.status === status))
      .filter((lead) => (affiliateId === "all" ? true : lead.affiliateId === affiliateId))
      .filter((lead) =>
        needle === ""
          ? true
          : [lead.name, lead.email, lead.phone].some((value) => value.toLowerCase().includes(needle)),
      );
  }, [leads, search, status, affiliateId]);

  const affiliates = profiles.filter((profile) => profile.role === "affiliate");

  return (
    <div className="space-y-6">
      <PageHeader
        title="All leads"
        description="Every form submission across the program, with the affiliate who brought it."
        actions={
          <Button
            variant="outline"
            disabled={filtered.length === 0}
            onClick={() =>
              downloadCsv(
                `leads-${new Date().toISOString().slice(0, 10)}`,
                leadsToCsv(filtered, { productName, affiliateName }),
              )
            }
          >
            <Download className="mr-1.5 h-4 w-4" />
            Export CSV
          </Button>
        }
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <StatTile label="Leads" value={formatNumber(leads.length)} icon={Users} />
        <StatTile
          label="Open"
          value={formatNumber(leads.filter((lead) => lead.status === "new" || lead.status === "contacted").length)}
          tone="warning"
        />
        <StatTile label="Purchases recorded" value={formatNumber(conversions.length)} tone="positive" />
      </div>

      <Card>
        <CardContent className="space-y-4 p-4">
          <div className="flex flex-col gap-3 lg:flex-row">
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                className="pl-8"
                placeholder="Search by name, email or phone"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
              />
            </div>
            <Select value={affiliateId} onValueChange={setAffiliateId}>
              <SelectTrigger className="w-full lg:w-56">
                <SelectValue placeholder="All affiliates" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All affiliates</SelectItem>
                {affiliates.map((profile) => (
                  <SelectItem key={profile.id} value={profile.id}>
                    {profile.fullName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={status} onValueChange={(value) => setStatus(value as LeadStatus | "all")}>
              <SelectTrigger className="w-full lg:w-44">
                <SelectValue placeholder="All statuses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All statuses</SelectItem>
                <SelectItem value="new">New</SelectItem>
                <SelectItem value="contacted">Contacted</SelectItem>
                <SelectItem value="converted">Converted</SelectItem>
                <SelectItem value="rejected">Rejected</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {isLoading ? (
            <p className="py-8 text-center text-sm text-muted-foreground">Loading leads…</p>
          ) : filtered.length === 0 ? (
            <EmptyState
              icon={Users}
              title={leads.length === 0 ? "No leads yet" : "Nothing matches that filter"}
              description={
                leads.length === 0
                  ? "Leads appear here the moment someone fills in a form behind an affiliate link."
                  : "Try a different search term, affiliate or status."
              }
            />
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Lead</TableHead>
                    <TableHead className="hidden lg:table-cell">Phone</TableHead>
                    <TableHead className="hidden md:table-cell">Product</TableHead>
                    <TableHead>Affiliate</TableHead>
                    <TableHead className="hidden xl:table-cell">Submitted</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((lead) => (
                    <TableRow key={lead.id}>
                      <TableCell>
                        <div className="font-medium">{lead.name}</div>
                        <div className="text-xs text-muted-foreground">{lead.email}</div>
                      </TableCell>
                      <TableCell className="hidden lg:table-cell">
                        <div className="flex items-center gap-1.5 tabular-nums">
                          {lead.phone}
                          <a
                            href={buildWhatsAppChatUrl(lead.phone, `Hi ${lead.name.split(" ")[0]}, `)}
                            target="_blank"
                            rel="noreferrer"
                            className="text-emerald-600 hover:opacity-80"
                            aria-label={`Message ${lead.name} on WhatsApp`}
                          >
                            <MessageCircle className="h-3.5 w-3.5" />
                          </a>
                        </div>
                      </TableCell>
                      <TableCell className="hidden md:table-cell">{productName(lead.productId)}</TableCell>
                      <TableCell>{affiliateName(lead.affiliateId)}</TableCell>
                      <TableCell className="hidden xl:table-cell text-sm text-muted-foreground">
                        {new Date(lead.createdAt).toLocaleDateString()}
                      </TableCell>
                      <TableCell>
                        {lead.status === "converted" ? (
                          <LeadStatusBadge status={lead.status} />
                        ) : (
                          <Select value={lead.status} onValueChange={(value) => setLeadStatus(lead, value as LeadStatus)}>
                            <SelectTrigger className="h-8 w-32">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="new">New</SelectItem>
                              <SelectItem value="contacted">Contacted</SelectItem>
                              <SelectItem value="rejected">Rejected</SelectItem>
                            </SelectContent>
                          </Select>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        {lead.status === "converted" ? (
                          <span className="text-xs text-muted-foreground">Recorded</span>
                        ) : (
                          <Button size="sm" variant="outline" onClick={() => openConvert(lead)}>
                            <IndianRupee className="mr-1 h-3.5 w-3.5" />
                            Mark purchased
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={Boolean(converting)} onOpenChange={(open) => !open && setConverting(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Record a purchase</DialogTitle>
            <DialogDescription>
              {converting ? (
                <>
                  {converting.name} bought {productName(converting.productId)} through{" "}
                  {affiliateName(converting.affiliateId)}. Their commission starts its{" "}
                  {settings?.payoutHoldDays ?? 7}-day hold today.
                </>
              ) : null}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={form.handleSubmit(onConvert)} className="space-y-4" noValidate>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="saleAmount">Amount actually paid</Label>
                <Input id="saleAmount" type="number" step="0.01" min="0" {...form.register("saleAmount")} />
                {form.formState.errors.saleAmount ? (
                  <p className="text-sm text-destructive">{form.formState.errors.saleAmount.message}</p>
                ) : null}
              </div>
              <div className="space-y-2">
                <Label htmlFor="commissionPercent">Commission %</Label>
                <Input
                  id="commissionPercent"
                  type="number"
                  step="0.1"
                  min="0"
                  max="100"
                  {...form.register("commissionPercent")}
                />
                {form.formState.errors.commissionPercent ? (
                  <p className="text-sm text-destructive">{form.formState.errors.commissionPercent.message}</p>
                ) : null}
              </div>
            </div>

            <p className="rounded-md bg-muted/50 p-3 text-sm">
              Commission to the affiliate:{" "}
              <strong>
                {formatMoney(
                  calcCommission(Number(watched.saleAmount) || 0, Number(watched.commissionPercent) || 0),
                  currency,
                )}
              </strong>
            </p>

            <div className="space-y-2">
              <Label htmlFor="note">Note (optional)</Label>
              <Textarea id="note" rows={2} placeholder="Payment method, invoice number…" {...form.register("note")} />
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setConverting(null)}>
                Cancel
              </Button>
              <Button type="submit" disabled={convertLead.isPending}>
                {convertLead.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Record purchase
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
