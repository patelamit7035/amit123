import { useState } from "react";
import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from "recharts";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart";
import { StatusBadge } from "@/components/agent/Badges";
import { CreativePreview } from "@/components/agent/CreativePreview";
import { useAgentStore } from "@/hooks/useAgentStore";
import { formatCurrency, formatDate, formatPercent, formatRatio, formatRelativeTime } from "@/lib/format";
import type { Campaign } from "@/types/agent";

const chartConfig: ChartConfig = {
  spend: { label: "Spend", color: "hsl(var(--accent))" },
  revenue: { label: "Revenue", color: "hsl(217 91% 60%)" },
};

export default function Campaigns() {
  const { campaigns } = useAgentStore();
  const [selected, setSelected] = useState<Campaign | null>(null);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-bold tracking-tight">Campaigns</h1>
        <p className="text-sm text-muted-foreground">{campaigns.length} campaigns · click a row for ad set detail</p>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Campaign</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Budget/day</TableHead>
                <TableHead className="text-right">Spend</TableHead>
                <TableHead className="text-right">CTR</TableHead>
                <TableHead className="text-right">CPA</TableHead>
                <TableHead className="text-right">ROAS</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {campaigns.map((c) => (
                <TableRow key={c.id} className="cursor-pointer" onClick={() => setSelected(c)}>
                  <TableCell>
                    <div className="flex flex-col">
                      <span className="font-medium">{c.name}</span>
                      <span className="text-xs text-muted-foreground">{c.adSets.length} ad sets · {c.objective.replace("OUTCOME_", "")}</span>
                    </div>
                  </TableCell>
                  <TableCell><StatusBadge status={c.status} /></TableCell>
                  <TableCell className="text-right">{formatCurrency(c.dailyBudget)}</TableCell>
                  <TableCell className="text-right">{formatCurrency(c.metrics.spend)}</TableCell>
                  <TableCell className="text-right">{formatPercent(c.metrics.ctr)}</TableCell>
                  <TableCell className="text-right">{formatCurrency(c.metrics.cpa)}</TableCell>
                  <TableCell className="text-right font-medium">{formatRatio(c.metrics.roas)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Sheet open={!!selected} onOpenChange={(open) => !open && setSelected(null)}>
        <SheetContent className="w-full overflow-y-auto sm:max-w-xl">
          {selected && (
            <>
              <SheetHeader>
                <SheetTitle>{selected.name}</SheetTitle>
                <SheetDescription>
                  {selected.objective.replace("OUTCOME_", "")} · {formatCurrency(selected.dailyBudget)}/day budget
                </SheetDescription>
              </SheetHeader>

              <div className="mt-4">
                <ChartContainer config={chartConfig} className="aspect-auto h-[180px] w-full">
                  <AreaChart data={selected.history.map((h) => ({ date: formatDate(h.date), spend: h.spend, revenue: h.revenue }))}>
                    <CartesianGrid vertical={false} strokeDasharray="3 3" />
                    <XAxis dataKey="date" tickLine={false} axisLine={false} tickMargin={6} minTickGap={24} />
                    <YAxis tickLine={false} axisLine={false} width={36} tickFormatter={(v) => `$${v}`} />
                    <ChartTooltip content={<ChartTooltipContent indicator="dot" />} />
                    <Area dataKey="revenue" type="monotone" fill="var(--color-revenue)" fillOpacity={0.15} stroke="var(--color-revenue)" strokeWidth={2} />
                    <Area dataKey="spend" type="monotone" fill="var(--color-spend)" fillOpacity={0.15} stroke="var(--color-spend)" strokeWidth={2} />
                  </AreaChart>
                </ChartContainer>
              </div>

              <Tabs defaultValue={selected.adSets[0]?.id} className="mt-6">
                <TabsList className="flex h-auto w-full flex-wrap justify-start gap-1">
                  {selected.adSets.map((a) => (
                    <TabsTrigger key={a.id} value={a.id} className="text-xs">
                      {a.name}
                    </TabsTrigger>
                  ))}
                </TabsList>
                {selected.adSets.map((a) => {
                  const activeCreative = a.creatives.find((c) => c.id === a.activeCreativeId);
                  return (
                    <TabsContent key={a.id} value={a.id} className="space-y-4">
                      <Card>
                        <CardHeader className="pb-2">
                          <CardTitle className="text-sm">{a.targeting}</CardTitle>
                          <CardDescription className="flex items-center gap-2">
                            <StatusBadge status={a.status} />
                            <span>{formatCurrency(a.dailyBudget)}/day</span>
                          </CardDescription>
                        </CardHeader>
                        <CardContent className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
                          <Metric label="Spend" value={formatCurrency(a.metrics.spend)} />
                          <Metric label="CTR" value={formatPercent(a.metrics.ctr)} />
                          <Metric label="CPA" value={formatCurrency(a.metrics.cpa)} />
                          <Metric label="ROAS" value={formatRatio(a.metrics.roas)} />
                        </CardContent>
                      </Card>

                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">Next creative rotation</span>
                        <Badge variant="secondary">{formatRelativeTime(a.nextCreativeRotation)}</Badge>
                      </div>

                      {activeCreative && (
                        <div className="flex gap-3">
                          <CreativePreview creative={activeCreative} className="w-28 shrink-0" />
                          <div className="space-y-1">
                            <p className="text-sm font-medium">Live creative</p>
                            <p className="text-xs text-muted-foreground">{activeCreative.headline}</p>
                            <p className="text-xs text-muted-foreground">Generation #{activeCreative.generation}</p>
                          </div>
                        </div>
                      )}
                    </TabsContent>
                  );
                })}
              </Tabs>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="font-semibold">{value}</div>
      <div className="text-xs text-muted-foreground">{label}</div>
    </div>
  );
}
