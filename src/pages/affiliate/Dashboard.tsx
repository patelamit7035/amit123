import { Link } from "react-router-dom";
import { ArrowRight, MousePointerClick, Users, Wallet, TrendingUp, Clock, BadgeCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { PageHeader } from "@/components/affiliate/PageHeader";
import { StatTile } from "@/components/affiliate/StatTile";
import { LeadStatusBadge } from "@/components/affiliate/StatusBadge";
import { EmptyState } from "@/components/affiliate/EmptyState";
import { useAuth } from "@/lib/auth/AuthProvider";
import { useConversions, useLeads, useLinks, useProducts, useSettings } from "@/hooks/useAffiliate";
import { buildAffiliateStats } from "@/lib/affiliate/stats";
import { formatMoney, formatNumber, formatPercent } from "@/lib/affiliate/money";
import { daysUntilPayout, payoutStatusOf } from "@/lib/affiliate/commission";

export default function AffiliateDashboard() {
  const { profile } = useAuth();
  const affiliateId = profile?.id;
  const { data: settings } = useSettings();
  const { data: links = [] } = useLinks(affiliateId);
  const { data: leads = [] } = useLeads({ affiliateId });
  const { data: conversions = [] } = useConversions(affiliateId);
  const { data: products = [] } = useProducts();

  const currency = settings?.currency || "INR";
  const holdDays = settings?.payoutHoldDays ?? 7;
  const stats = buildAffiliateStats(links, leads, conversions);
  const productName = (productId: string) => products.find((row) => row.id === productId)?.name ?? "-";

  const nextCredit = conversions
    .filter((row) => payoutStatusOf(row) === "pending")
    .sort((a, b) => a.payoutDueAt.localeCompare(b.payoutDueAt))[0];

  return (
    <div className="space-y-6">
      <PageHeader
        title={`Welcome back, ${profile?.fullName?.split(" ")[0] ?? "there"}`}
        description="Your links, your leads and what you have earned so far."
        actions={
          <Button asChild>
            <Link to="/app/products">
              Get my links
              <ArrowRight className="ml-1.5 h-4 w-4" />
            </Link>
          </Button>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatTile label="Link clicks" value={formatNumber(stats.clicks)} icon={MousePointerClick} />
        <StatTile
          label="Leads submitted"
          value={formatNumber(stats.leads)}
          hint={`${formatPercent(stats.conversionRate)} converted`}
          icon={Users}
        />
        <StatTile label="Purchases" value={formatNumber(stats.conversions)} icon={BadgeCheck} tone="positive" />
        <StatTile
          label="Lifetime earnings"
          value={formatMoney(stats.lifetimeEarnings, currency)}
          icon={TrendingUp}
          tone="positive"
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">In hold</CardTitle>
            <CardDescription>Credited {holdDays} days after each sale</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold tabular-nums text-amber-600 dark:text-amber-400">
              {formatMoney(stats.pendingEarnings, currency)}
            </p>
            {nextCredit ? (
              <p className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
                <Clock className="h-3.5 w-3.5" />
                Next {formatMoney(nextCredit.commissionAmount, currency)} clears in {daysUntilPayout(nextCredit)} day
                {daysUntilPayout(nextCredit) === 1 ? "" : "s"}
              </p>
            ) : null}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Ready to be paid</CardTitle>
            <CardDescription>Cleared the hold, awaiting transfer</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold tabular-nums">{formatMoney(stats.availableEarnings, currency)}</p>
            <p className="mt-1 text-xs text-muted-foreground">Transferred to the bank account on your profile</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Already paid</CardTitle>
            <CardDescription>Transferred to you so far</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold tabular-nums text-emerald-600 dark:text-emerald-400">
              {formatMoney(stats.paidEarnings, currency)}
            </p>
            <Button asChild variant="link" className="h-auto p-0 text-xs">
              <Link to="/app/earnings">See every commission</Link>
            </Button>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex-row items-center justify-between space-y-0">
          <div>
            <CardTitle className="text-base">Latest leads</CardTitle>
            <CardDescription>People who filled in your form</CardDescription>
          </div>
          <Button asChild variant="outline" size="sm">
            <Link to="/app/leads">View all</Link>
          </Button>
        </CardHeader>
        <CardContent>
          {leads.length === 0 ? (
            <EmptyState
              icon={Users}
              title="No leads yet"
              description="Share your affiliate link on WhatsApp, Instagram or your own landing page. Every form submission shows up here."
              action={
                <Button asChild>
                  <Link to="/app/products">Get my affiliate link</Link>
                </Button>
              }
            />
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead className="hidden sm:table-cell">Product</TableHead>
                    <TableHead className="hidden md:table-cell">Submitted</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {leads.slice(0, 5).map((lead) => (
                    <TableRow key={lead.id}>
                      <TableCell>
                        <div className="font-medium">{lead.name}</div>
                        <div className="text-xs text-muted-foreground">{lead.email}</div>
                      </TableCell>
                      <TableCell className="hidden sm:table-cell">{productName(lead.productId)}</TableCell>
                      <TableCell className="hidden md:table-cell text-sm text-muted-foreground">
                        {new Date(lead.createdAt).toLocaleDateString()}
                      </TableCell>
                      <TableCell>
                        <LeadStatusBadge status={lead.status} />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">How you get paid</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 text-sm sm:grid-cols-4">
          {[
            ["1. Share", "Copy your link for any product and send it to your audience."],
            ["2. They enquire", "Their name, email and number land in your leads instantly."],
            ["3. They buy", "The admin records the sale and your commission is calculated."],
            [`4. You get paid`, `${holdDays} days later the commission clears and is transferred to your bank.`],
          ].map(([title, body]) => (
            <div key={title}>
              <p className="font-medium">{title}</p>
              <p className="mt-1 text-muted-foreground">{body}</p>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
