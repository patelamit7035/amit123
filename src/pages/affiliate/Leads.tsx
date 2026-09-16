import { useMemo, useState } from "react";
import { Download, Search, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { PageHeader } from "@/components/affiliate/PageHeader";
import { LeadStatusBadge } from "@/components/affiliate/StatusBadge";
import { EmptyState } from "@/components/affiliate/EmptyState";
import { StatTile } from "@/components/affiliate/StatTile";
import { useAuth } from "@/lib/auth/AuthProvider";
import { useLeads, useProducts } from "@/hooks/useAffiliate";
import { downloadCsv } from "@/lib/affiliate/csv";
import { leadsToCsv } from "@/lib/affiliate/exports";
import { formatNumber } from "@/lib/affiliate/money";
import type { LeadStatus } from "@/lib/affiliate/types";

export default function AffiliateLeads() {
  const { profile } = useAuth();
  const { data: leads = [], isLoading } = useLeads({ affiliateId: profile?.id });
  const { data: products = [] } = useProducts(true);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<LeadStatus | "all">("all");

  const productName = (productId: string) => products.find((row) => row.id === productId)?.name ?? "-";

  const filtered = useMemo(() => {
    const needle = search.trim().toLowerCase();
    return leads
      .filter((lead) => (status === "all" ? true : lead.status === status))
      .filter((lead) =>
        needle === ""
          ? true
          : [lead.name, lead.email, lead.phone].some((value) => value.toLowerCase().includes(needle)),
      );
  }, [leads, search, status]);

  const counts = useMemo(
    () => ({
      total: leads.length,
      converted: leads.filter((lead) => lead.status === "converted").length,
      open: leads.filter((lead) => lead.status === "new" || lead.status === "contacted").length,
    }),
    [leads],
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="My leads"
        description="Everyone who filled in a form behind one of your links."
        actions={
          <Button
            variant="outline"
            disabled={filtered.length === 0}
            onClick={() =>
              downloadCsv(
                `my-leads-${new Date().toISOString().slice(0, 10)}`,
                leadsToCsv(filtered, { productName }),
              )
            }
          >
            <Download className="mr-1.5 h-4 w-4" />
            Export CSV
          </Button>
        }
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <StatTile label="Total leads" value={formatNumber(counts.total)} icon={Users} />
        <StatTile label="Still open" value={formatNumber(counts.open)} tone="warning" />
        <StatTile label="Turned into sales" value={formatNumber(counts.converted)} tone="positive" />
      </div>

      <Card>
        <CardContent className="space-y-4 p-4">
          <div className="flex flex-col gap-3 sm:flex-row">
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                className="pl-8"
                placeholder="Search by name, email or phone"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
              />
            </div>
            <Select value={status} onValueChange={(value) => setStatus(value as LeadStatus | "all")}>
              <SelectTrigger className="w-full sm:w-48">
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
            <p className="py-8 text-center text-sm text-muted-foreground">Loading your leads…</p>
          ) : filtered.length === 0 ? (
            <EmptyState
              icon={Users}
              title={leads.length === 0 ? "No leads yet" : "Nothing matches that filter"}
              description={
                leads.length === 0
                  ? "Share your affiliate link - every form submission behind it lands here with the person's name, email and number."
                  : "Try a different search term or status."
              }
            />
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Lead</TableHead>
                    <TableHead className="hidden sm:table-cell">Phone</TableHead>
                    <TableHead className="hidden md:table-cell">Product</TableHead>
                    <TableHead className="hidden lg:table-cell">Submitted</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((lead) => (
                    <TableRow key={lead.id}>
                      <TableCell>
                        <div className="font-medium">{lead.name}</div>
                        <div className="text-xs text-muted-foreground">{lead.email}</div>
                      </TableCell>
                      <TableCell className="hidden sm:table-cell tabular-nums">{lead.phone}</TableCell>
                      <TableCell className="hidden md:table-cell">{productName(lead.productId)}</TableCell>
                      <TableCell className="hidden lg:table-cell text-sm text-muted-foreground">
                        {new Date(lead.createdAt).toLocaleString()}
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
    </div>
  );
}
