import { useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { BadgeIndianRupee, Banknote, Clock, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
import { EmptyState } from "@/components/affiliate/EmptyState";
import { CopyButton } from "@/components/affiliate/CopyButton";
import {
  useAllBankDetails,
  useConversions,
  useLeads,
  usePayConversions,
  usePayouts,
  useProfiles,
  useSettings,
} from "@/hooks/useAffiliate";
import { daysUntilPayout, payoutStatusOf } from "@/lib/affiliate/commission";
import { formatMoney } from "@/lib/affiliate/money";
import { sum } from "@/lib/affiliate/money";
import { payoutSchema, type PayoutValues } from "@/lib/affiliate/validation";
import type { Conversion, Profile } from "@/lib/affiliate/types";

export default function AdminPayouts() {
  const { data: settings } = useSettings();
  const { data: profiles = [] } = useProfiles();
  const { data: conversions = [] } = useConversions();
  const { data: payouts = [] } = usePayouts();
  const { data: banks = [] } = useAllBankDetails();
  const { data: leads = [] } = useLeads();
  const payConversions = usePayConversions();
  const [paying, setPaying] = useState<{ profile: Profile; conversions: Conversion[] } | null>(null);

  const currency = settings?.currency || "INR";
  const holdDays = settings?.payoutHoldDays ?? 7;
  const profileOf = (id: string) => profiles.find((row) => row.id === id);
  const bankOf = (id: string) => banks.find((row) => row.userId === id) ?? null;
  const leadName = (leadId: string) => leads.find((row) => row.id === leadId)?.name ?? "-";

  const form = useForm<PayoutValues>({
    resolver: zodResolver(payoutSchema),
    defaultValues: { reference: "", note: "" },
  });

  const { due, pending } = useMemo(() => {
    const dueMap = new Map<string, Conversion[]>();
    const pendingMap = new Map<string, Conversion[]>();
    for (const conversion of conversions) {
      const status = payoutStatusOf(conversion);
      if (status === "paid") continue;
      const target = status === "available" ? dueMap : pendingMap;
      const bucket = target.get(conversion.affiliateId);
      if (bucket) bucket.push(conversion);
      else target.set(conversion.affiliateId, [conversion]);
    }
    return { due: dueMap, pending: pendingMap };
  }, [conversions]);

  const totalDue = sum(Array.from(due.values()).flat().map((row) => row.commissionAmount));
  const totalPending = sum(Array.from(pending.values()).flat().map((row) => row.commissionAmount));
  const totalPaid = sum(payouts.map((row) => row.amount));

  const onPay = async (values: PayoutValues) => {
    if (!paying) return;
    try {
      const payout = await payConversions.mutateAsync({
        affiliateId: paying.profile.id,
        conversionIds: paying.conversions.map((row) => row.id),
        values,
      });
      toast.success(`${formatMoney(payout.amount, currency)} marked as paid to ${paying.profile.fullName}`);
      setPaying(null);
      form.reset({ reference: "", note: "" });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not record the payout");
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Payouts"
        description={`Commissions clear ${holdDays} days after the sale. Transfer the money yourself, then record it here.`}
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <StatTile label="Ready to transfer" value={formatMoney(totalDue, currency)} icon={BadgeIndianRupee} />
        <StatTile label="Still in hold" value={formatMoney(totalPending, currency)} tone="warning" icon={Clock} />
        <StatTile label="Paid so far" value={formatMoney(totalPaid, currency)} tone="positive" />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Ready to transfer</CardTitle>
          <CardDescription>These commissions have cleared their hold period.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {due.size === 0 ? (
            <EmptyState
              icon={BadgeIndianRupee}
              title="Nothing to pay right now"
              description={`Commissions appear here ${holdDays} days after the sale is recorded.`}
            />
          ) : (
            Array.from(due.entries()).map(([affiliateId, rows]) => {
              const profile = profileOf(affiliateId);
              const bank = bankOf(affiliateId);
              const amount = sum(rows.map((row) => row.commissionAmount));
              if (!profile) return null;
              return (
                <div key={affiliateId} className="rounded-lg border p-4">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="font-medium">{profile.fullName}</p>
                      <p className="text-xs text-muted-foreground">
                        {rows.length} commission{rows.length === 1 ? "" : "s"} · {profile.email}
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-lg font-semibold tabular-nums">{formatMoney(amount, currency)}</span>
                      <Button
                        onClick={() => {
                          form.reset({ reference: "", note: "" });
                          setPaying({ profile, conversions: rows });
                        }}
                      >
                        Mark as paid
                      </Button>
                    </div>
                  </div>

                  {bank ? (
                    <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 rounded-md bg-muted/40 p-3 text-xs">
                      <Banknote className="h-3.5 w-3.5 text-muted-foreground" />
                      <span>
                        <span className="text-muted-foreground">Holder </span>
                        <span className="font-medium">{bank.accountHolderName}</span>
                      </span>
                      <span>
                        <span className="text-muted-foreground">Bank </span>
                        <span className="font-medium">{bank.bankName}</span>
                      </span>
                      <span className="flex items-center gap-1">
                        <span className="text-muted-foreground">A/C </span>
                        <span className="font-mono font-medium">{bank.accountNumber}</span>
                        <CopyButton value={bank.accountNumber} size="icon" variant="ghost" />
                      </span>
                      <span className="flex items-center gap-1">
                        <span className="text-muted-foreground">IFSC </span>
                        <span className="font-mono font-medium">{bank.ifscCode}</span>
                        <CopyButton value={bank.ifscCode} size="icon" variant="ghost" />
                      </span>
                      {bank.upiId ? (
                        <span className="flex items-center gap-1">
                          <span className="text-muted-foreground">UPI </span>
                          <span className="font-mono font-medium">{bank.upiId}</span>
                          <CopyButton value={bank.upiId} size="icon" variant="ghost" />
                        </span>
                      ) : null}
                    </div>
                  ) : (
                    <p className="mt-3 text-xs text-destructive">
                      No bank details on file - ask {profile.fullName.split(" ")[0]} to add them before transferring.
                    </p>
                  )}

                  <Table className="mt-3">
                    <TableHeader>
                      <TableRow>
                        <TableHead>Lead</TableHead>
                        <TableHead className="hidden sm:table-cell">Sale</TableHead>
                        <TableHead className="hidden sm:table-cell">Cleared on</TableHead>
                        <TableHead className="text-right">Commission</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {rows.map((conversion) => (
                        <TableRow key={conversion.id}>
                          <TableCell>{leadName(conversion.leadId)}</TableCell>
                          <TableCell className="hidden sm:table-cell tabular-nums">
                            {formatMoney(conversion.saleAmount, currency)}
                          </TableCell>
                          <TableCell className="hidden sm:table-cell text-sm text-muted-foreground">
                            {new Date(conversion.payoutDueAt).toLocaleDateString()}
                          </TableCell>
                          <TableCell className="text-right font-medium tabular-nums">
                            {formatMoney(conversion.commissionAmount, currency)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              );
            })
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Still in hold</CardTitle>
          <CardDescription>Earned, but not yet transferable.</CardDescription>
        </CardHeader>
        <CardContent>
          {pending.size === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">Nothing in hold.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Affiliate</TableHead>
                  <TableHead>Lead</TableHead>
                  <TableHead className="hidden sm:table-cell">Clears on</TableHead>
                  <TableHead className="text-right">Commission</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {Array.from(pending.entries()).flatMap(([affiliateId, rows]) =>
                  rows.map((conversion) => (
                    <TableRow key={conversion.id}>
                      <TableCell>{profileOf(affiliateId)?.fullName ?? "-"}</TableCell>
                      <TableCell>{leadName(conversion.leadId)}</TableCell>
                      <TableCell className="hidden sm:table-cell text-sm">
                        {new Date(conversion.payoutDueAt).toLocaleDateString()}
                        <span className="ml-1 text-xs text-muted-foreground">
                          (in {daysUntilPayout(conversion)}d)
                        </span>
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {formatMoney(conversion.commissionAmount, currency)}
                      </TableCell>
                    </TableRow>
                  )),
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Payout history</CardTitle>
          <CardDescription>Every transfer you have recorded.</CardDescription>
        </CardHeader>
        <CardContent>
          {payouts.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">No payouts recorded yet.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Paid on</TableHead>
                  <TableHead>Affiliate</TableHead>
                  <TableHead>Reference</TableHead>
                  <TableHead className="hidden sm:table-cell">Note</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {payouts.map((payout) => (
                  <TableRow key={payout.id}>
                    <TableCell>{new Date(payout.paidAt).toLocaleDateString()}</TableCell>
                    <TableCell>{profileOf(payout.affiliateId)?.fullName ?? "-"}</TableCell>
                    <TableCell className="font-mono text-xs">{payout.reference}</TableCell>
                    <TableCell className="hidden sm:table-cell text-sm text-muted-foreground">{payout.note}</TableCell>
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

      <Dialog open={Boolean(paying)} onOpenChange={(open) => !open && setPaying(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Record the transfer</DialogTitle>
            <DialogDescription>
              {paying ? (
                <>
                  Confirm you have transferred{" "}
                  <strong>{formatMoney(sum(paying.conversions.map((row) => row.commissionAmount)), currency)}</strong> to{" "}
                  {paying.profile.fullName}. This marks {paying.conversions.length} commission
                  {paying.conversions.length === 1 ? "" : "s"} as paid.
                </>
              ) : null}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={form.handleSubmit(onPay)} className="space-y-4" noValidate>
            <div className="space-y-2">
              <Label htmlFor="reference">Transfer reference</Label>
              <Input id="reference" placeholder="UPI/NEFT reference number" {...form.register("reference")} />
              {form.formState.errors.reference ? (
                <p className="text-sm text-destructive">{form.formState.errors.reference.message}</p>
              ) : null}
            </div>
            <div className="space-y-2">
              <Label htmlFor="payout-note">Note (optional)</Label>
              <Textarea id="payout-note" rows={2} {...form.register("note")} />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setPaying(null)}>
                Cancel
              </Button>
              <Button type="submit" disabled={payConversions.isPending}>
                {payConversions.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Mark as paid
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
