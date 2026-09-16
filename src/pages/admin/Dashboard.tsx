import { useMemo } from "react";
import { Link } from "react-router-dom";
import { BadgeIndianRupee, MousePointerClick, Package, Users, Wallet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { PageHeader } from "@/components/affiliate/PageHeader";
import { StatTile } from "@/components/affiliate/StatTile";
import { EmptyState } from "@/components/affiliate/EmptyState";
import {
  useConversions,
  useLeads,
  useLinks,
  useProducts,
  useProfiles,
  useSettings,
} from "@/hooks/useAffiliate";
import { buildAdminStats, buildAffiliateStats } from "@/lib/affiliate/stats";
import { formatMoney, formatNumber, formatPercent } from "@/lib/affiliate/money";

export default function AdminDashboard() {
  const { data: settings } = useSettings();
  const { data: profiles = [] } = useProfiles();
  const { data: products = [] } = useProducts(true);
  const { data: links = [] } = useLinks();
  const { data: leads = [] } = useLeads();
  const { data: conversions = [] } = useConversions();

  const currency = settings?.currency || "INR";
  const stats = buildAdminStats(profiles, products.filter((row) => row.active).length, links, leads, conversions);

  // One row per affiliate: their clicks, leads, sales and money - the
  // "who brought what" view.
  const rows = useMemo(() => {
    return profiles
      .filter((profile) => profile.role === "affiliate")
      .map((profile) => ({
        profile,
        stats: buildAffiliateStats(
          links.filter((link) => link.affiliateId === profile.id),
          leads.filter((lead) => lead.affiliateId === profile.id),
          conversions.filter((conversion) => conversion.affiliateId === profile.id),
        ),
      }))
      .sort((a, b) => b.stats.leads - a.stats.leads || b.stats.lifetimeEarnings - a.stats.lifetimeEarnings);
  }, [profiles, links, leads, conversions]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Admin overview"
        description="The whole affiliate program at a glance: who is bringing leads and what you owe them."
        actions={
          <Button asChild variant="outline">
            <Link to="/admin/payouts">Review payouts</Link>
          </Button>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatTile
          label="Affiliates"
          value={formatNumber(stats.affiliates)}
          hint={`${stats.activeAffiliates} active`}
          icon={Users}
        />
        <StatTile label="Live products" value={formatNumber(stats.products)} icon={Package} />
        <StatTile label="Link clicks" value={formatNumber(stats.clicks)} icon={MousePointerClick} />
        <StatTile
          label="Leads captured"
          value={formatNumber(stats.leads)}
          hint={`${formatNumber(stats.conversions)} purchases`}
          icon={Users}
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <StatTile label="Revenue recorded" value={formatMoney(stats.revenue, currency)} tone="positive" icon={Wallet} />
        <StatTile
          label="Commission owed"
          value={formatMoney(stats.commissionOwed, currency)}
          hint="Includes commissions still in their hold period"
          tone="warning"
          icon={BadgeIndianRupee}
        />
        <StatTile label="Commission paid" value={formatMoney(stats.commissionPaid, currency)} />
      </div>

      <Card>
        <CardHeader className="flex-row items-center justify-between space-y-0">
          <div>
            <CardTitle className="text-base">Leads by affiliate</CardTitle>
            <CardDescription>Who is actually sending you business.</CardDescription>
          </div>
          <Button asChild variant="outline" size="sm">
            <Link to="/admin/affiliates">Manage affiliates</Link>
          </Button>
        </CardHeader>
        <CardContent>
          {rows.length === 0 ? (
            <EmptyState
              icon={Users}
              title="No affiliates yet"
              description="Share the registration link. Anyone who signs up appears here with their own links and lead counts."
            />
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Affiliate</TableHead>
                    <TableHead className="hidden sm:table-cell text-right">Clicks</TableHead>
                    <TableHead className="text-right">Leads</TableHead>
                    <TableHead className="text-right">Sales</TableHead>
                    <TableHead className="hidden md:table-cell text-right">Conversion</TableHead>
                    <TableHead className="text-right">Owed now</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map(({ profile, stats: row }) => (
                    <TableRow key={profile.id}>
                      <TableCell>
                        <div className="font-medium">{profile.fullName}</div>
                        <div className="text-xs text-muted-foreground">{profile.email}</div>
                      </TableCell>
                      <TableCell className="hidden sm:table-cell text-right tabular-nums">
                        {formatNumber(row.clicks)}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">{formatNumber(row.leads)}</TableCell>
                      <TableCell className="text-right tabular-nums">{formatNumber(row.conversions)}</TableCell>
                      <TableCell className="hidden md:table-cell text-right tabular-nums">
                        {formatPercent(row.conversionRate)}
                      </TableCell>
                      <TableCell className="text-right font-medium tabular-nums">
                        {formatMoney(row.pendingEarnings + row.availableEarnings, currency)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
