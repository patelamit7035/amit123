import { useMemo, useState } from "react";
import { Banknote, Download, Search, Users } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { PageHeader } from "@/components/affiliate/PageHeader";
import { EmptyState } from "@/components/affiliate/EmptyState";
import { CopyButton } from "@/components/affiliate/CopyButton";
import {
  useAllBankDetails,
  useConversions,
  useLeads,
  useLinks,
  useProfiles,
  useSetAffiliateStatus,
  useSettings,
} from "@/hooks/useAffiliate";
import { buildAffiliateStats } from "@/lib/affiliate/stats";
import { formatMoney, formatNumber } from "@/lib/affiliate/money";
import { downloadCsv, toCsv } from "@/lib/affiliate/csv";
import type { Profile } from "@/lib/affiliate/types";

export default function AdminAffiliates() {
  const { data: settings } = useSettings();
  const { data: profiles = [], isLoading } = useProfiles();
  const { data: banks = [] } = useAllBankDetails();
  const { data: links = [] } = useLinks();
  const { data: leads = [] } = useLeads();
  const { data: conversions = [] } = useConversions();
  const setStatus = useSetAffiliateStatus();
  const [search, setSearch] = useState("");
  const [viewing, setViewing] = useState<Profile | null>(null);

  const currency = settings?.currency || "INR";
  const bankOf = (userId: string) => banks.find((row) => row.userId === userId) ?? null;

  const rows = useMemo(() => {
    const needle = search.trim().toLowerCase();
    return profiles
      .filter((profile) => profile.role === "affiliate")
      .filter((profile) =>
        needle === ""
          ? true
          : [profile.fullName, profile.email, profile.referralCode].some((value) =>
              value.toLowerCase().includes(needle),
            ),
      )
      .map((profile) => ({
        profile,
        bank: bankOf(profile.id),
        stats: buildAffiliateStats(
          links.filter((link) => link.affiliateId === profile.id),
          leads.filter((lead) => lead.affiliateId === profile.id),
          conversions.filter((conversion) => conversion.affiliateId === profile.id),
        ),
      }))
      .sort((a, b) => b.stats.leads - a.stats.leads);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profiles, banks, links, leads, conversions, search]);

  const exportAffiliates = () => {
    const csv = toCsv(
      rows.map(({ profile, bank, stats }) => ({
        name: profile.fullName,
        email: profile.email,
        phone: profile.phone,
        code: profile.referralCode,
        status: profile.status,
        clicks: stats.clicks,
        leads: stats.leads,
        sales: stats.conversions,
        pending: stats.pendingEarnings.toFixed(2),
        available: stats.availableEarnings.toFixed(2),
        paid: stats.paidEarnings.toFixed(2),
        accountHolder: bank?.accountHolderName ?? "",
        bankName: bank?.bankName ?? "",
        accountNumber: bank?.accountNumber ?? "",
        ifsc: bank?.ifscCode ?? "",
        upi: bank?.upiId ?? "",
      })),
      [
        { key: "name", label: "Affiliate" },
        { key: "email", label: "Email" },
        { key: "phone", label: "Phone" },
        { key: "code", label: "Referral code" },
        { key: "status", label: "Status" },
        { key: "clicks", label: "Clicks" },
        { key: "leads", label: "Leads" },
        { key: "sales", label: "Sales" },
        { key: "pending", label: "In hold" },
        { key: "available", label: "Ready to pay" },
        { key: "paid", label: "Paid" },
        { key: "accountHolder", label: "Account holder" },
        { key: "bankName", label: "Bank" },
        { key: "accountNumber", label: "Account number" },
        { key: "ifsc", label: "IFSC" },
        { key: "upi", label: "UPI" },
      ],
    );
    downloadCsv(`affiliates-${new Date().toISOString().slice(0, 10)}`, csv);
  };

  const toggleStatus = async (profile: Profile) => {
    const next = profile.status === "suspended" ? "active" : "suspended";
    try {
      await setStatus.mutateAsync({ userId: profile.id, status: next });
      toast.success(next === "suspended" ? `${profile.fullName} suspended` : `${profile.fullName} reactivated`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not update the affiliate");
    }
  };

  const viewingBank = viewing ? bankOf(viewing.id) : null;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Affiliates"
        description="Everyone in the program, what they have brought in, and where to transfer their money."
        actions={
          <Button variant="outline" disabled={rows.length === 0} onClick={exportAffiliates}>
            <Download className="mr-1.5 h-4 w-4" />
            Export CSV
          </Button>
        }
      />

      <Card>
        <CardContent className="space-y-4 p-4">
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              className="pl-8"
              placeholder="Search by name, email or referral code"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </div>

          {isLoading ? (
            <p className="py-8 text-center text-sm text-muted-foreground">Loading affiliates…</p>
          ) : rows.length === 0 ? (
            <EmptyState
              icon={Users}
              title="No affiliates yet"
              description="Anyone who registers on the sign-up page appears here straight away."
            />
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Affiliate</TableHead>
                    <TableHead className="hidden lg:table-cell">Code</TableHead>
                    <TableHead className="text-right">Leads</TableHead>
                    <TableHead className="text-right">Sales</TableHead>
                    <TableHead className="hidden sm:table-cell text-right">In hold</TableHead>
                    <TableHead className="text-right">Ready to pay</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map(({ profile, bank, stats }) => (
                    <TableRow key={profile.id}>
                      <TableCell>
                        <div className="font-medium">{profile.fullName}</div>
                        <div className="text-xs text-muted-foreground">{profile.email}</div>
                      </TableCell>
                      <TableCell className="hidden lg:table-cell font-mono text-xs">{profile.referralCode}</TableCell>
                      <TableCell className="text-right tabular-nums">{formatNumber(stats.leads)}</TableCell>
                      <TableCell className="text-right tabular-nums">{formatNumber(stats.conversions)}</TableCell>
                      <TableCell className="hidden sm:table-cell text-right tabular-nums">
                        {formatMoney(stats.pendingEarnings, currency)}
                      </TableCell>
                      <TableCell className="text-right font-medium tabular-nums">
                        {formatMoney(stats.availableEarnings, currency)}
                      </TableCell>
                      <TableCell>
                        <Badge variant={profile.status === "suspended" ? "destructive" : "secondary"}>
                          {profile.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => setViewing(profile)}
                          disabled={!bank}
                          title={bank ? "View bank details" : "No bank details on file"}
                        >
                          <Banknote className="h-3.5 w-3.5" />
                          <span className="sr-only">Bank details for {profile.fullName}</span>
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => toggleStatus(profile)}>
                          {profile.status === "suspended" ? "Reactivate" : "Suspend"}
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={Boolean(viewing)} onOpenChange={(open) => !open && setViewing(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Payout details</DialogTitle>
            <DialogDescription>Transfer {viewing?.fullName}'s cleared commissions to this account.</DialogDescription>
          </DialogHeader>
          {viewingBank ? (
            <dl className="space-y-3 text-sm">
              {[
                ["Account holder", viewingBank.accountHolderName],
                ["Bank", viewingBank.bankName],
                ["Account number", viewingBank.accountNumber],
                ["IFSC", viewingBank.ifscCode],
                ["UPI ID", viewingBank.upiId || "-"],
                ["Phone", viewing?.phone || "-"],
              ].map(([label, value]) => (
                <div key={label} className="flex items-center justify-between gap-3 border-b pb-2 last:border-0">
                  <dt className="text-muted-foreground">{label}</dt>
                  <dd className="flex items-center gap-2 font-medium">
                    <span className="font-mono">{value}</span>
                    {value && value !== "-" ? <CopyButton value={value} size="icon" variant="ghost" /> : null}
                  </dd>
                </div>
              ))}
            </dl>
          ) : (
            <p className="text-sm text-muted-foreground">This affiliate has not added bank details yet.</p>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
