import { useMemo } from "react";
import { Download, Wallet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { PageHeader } from "@/components/affiliate/PageHeader";
import { StatTile } from "@/components/affiliate/StatTile";
import { PayoutStatusBadge } from "@/components/affiliate/StatusBadge";
import { EmptyState } from "@/components/affiliate/EmptyState";
import { useAuth } from "@/lib/auth/AuthProvider";
import { useConversions, useLeads, useLinks, usePayouts, useProducts, useSettings } from "@/hooks/useAffiliate";
import { buildAffiliateStats } from "@/lib/affiliate/stats";
import { daysUntilPayout, payoutStatusOf } from "@/lib/affiliate/commission";
import { formatMoney } from "@/lib/affiliate/money";
import { downloadCsv } from "@/lib/affiliate/csv";
import { conversionsToCsv } from "@/lib/affiliate/exports";

export default function AffiliateEarnings() {
  const { profile } = useAuth();
  const affiliateId = profile?.id;
  const { data: settings } = useSettings();
  const { data: conversions = [] } = useConversions(affiliateId);
  const { data: leads = [] } = useLeads({ affiliateId });
  const { data: links = [] } = useLinks(affiliateId);
  const { data: payouts = [] } = usePayouts(affiliateId);
  const { data: products = [] } = useProducts(true);

  const currency = settings?.currency || "INR";
  const holdDays = settings?.payoutHoldDays ?? 7;
  const stats = useMemo(() => buildAffiliateStats(links, leads, conversions), [links, leads, conversions]);

  const productName = (productId: string) => products.find((row) => row.id === productId)?.name ?? "-";
  const leadName = (leadId: string) => leads.find((row) => row.id === leadId)?.name ?? "-";

  return (
    <div className="space-y-6">
      <PageHeader
        title="Earnings"
        description={`Every commission you have earned. Each one is credited ${holdDays} days after the sale, then transferred to your bank account.`}
        actions={
          <Button
            variant="outline"
            disabled={conversions.length === 0}
            onClick={() =>
              downloadCsv(
                `my-commissions-${new Date().toISOString().slice(0, 10)}`,
                conversionsToCsv(conversions, { productName, leadName }),
              )
            }
          >
            <Download className="mr-1.5 h-4 w-4" />
            Export CSV
          </Button>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatTile label="In hold" value={formatMoney(stats.pendingEarnings, currency)} tone="warning" />
        <StatTile label="Ready to be paid" value={formatMoney(stats.availableEarnings, currency)} />
        <StatTile label="Paid out" value={formatMoney(stats.paidEarnings, currency)} tone="positive" />
        <StatTile label="Lifetime" value={formatMoney(stats.lifetimeEarnings, currency)} icon={Wallet} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Commissions</CardTitle>
          <CardDescription>One row per confirmed purchase from your leads.</CardDescription>
        </CardHeader>
        <CardContent>
          {conversions.length === 0 ? (
            <EmptyState
              icon={Wallet}
              title="No commissions yet"
              description="As soon as one of your leads buys, the sale is recorded here with your commission and the date it will be credited."
            />
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Lead</TableHead>
                    <TableHead className="hidden md:table-cell">Product</TableHead>
                    <TableHead className="text-right">Sale</TableHead>
                    <TableHead className="text-right">Your commission</TableHead>
                    <TableHead className="hidden sm:table-cell">Credited on</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {conversions.map((conversion) => {
                    const status = payoutStatusOf(conversion);
                    const daysLeft = daysUntilPayout(conversion);
                    return (
                      <TableRow key={conversion.id}>
                        <TableCell className="font-medium">{leadName(conversion.leadId)}</TableCell>
                        <TableCell className="hidden md:table-cell">{productName(conversion.productId)}</TableCell>
                        <TableCell className="text-right tabular-nums">
                          {formatMoney(conversion.saleAmount, currency)}
                        </TableCell>
                        <TableCell className="text-right font-medium tabular-nums">
                          {formatMoney(conversion.commissionAmount, currency)}
                          <span className="ml-1 text-xs text-muted-foreground">({conversion.commissionPercent}%)</span>
                        </TableCell>
                        <TableCell className="hidden sm:table-cell text-sm">
                          {new Date(conversion.payoutDueAt).toLocaleDateString()}
                          {status === "pending" ? (
                            <span className="block text-xs text-muted-foreground">
                              in {daysLeft} day{daysLeft === 1 ? "" : "s"}
                            </span>
                          ) : null}
                        </TableCell>
                        <TableCell>
                          <PayoutStatusBadge status={status} />
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Transfers received</CardTitle>
          <CardDescription>Money that has actually landed in your account.</CardDescription>
        </CardHeader>
        <CardContent>
          {payouts.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">No transfers yet.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Paid on</TableHead>
                  <TableHead>Reference</TableHead>
                  <TableHead className="hidden sm:table-cell">Commissions</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {payouts.map((payout) => (
                  <TableRow key={payout.id}>
                    <TableCell>{new Date(payout.paidAt).toLocaleDateString()}</TableCell>
                    <TableCell className="font-mono text-xs">{payout.reference}</TableCell>
                    <TableCell className="hidden sm:table-cell">{payout.conversionIds.length}</TableCell>
                    <TableCell className="text-right font-medium tabular-nums">
                      {formatMoney(payout.amount, currency)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
