import { Link } from "react-router-dom";
import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from "recharts";
import { DollarSign, MousePointerClick, ShoppingCart, TrendingUp, ArrowRight, Bot, Clock } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart";
import { Button } from "@/components/ui/button";
import { StatCard } from "@/components/agent/StatCard";
import { StatusBadge, SeverityBadge } from "@/components/agent/Badges";
import { useAgentStore } from "@/hooks/useAgentStore";
import { mergeAccountHistory, periodDeltaPct, summarizeMetrics } from "@/lib/analytics";
import { formatCurrency, formatDate, formatPercent, formatRatio, formatRelativeTime } from "@/lib/format";

const chartConfig: ChartConfig = {
  spend: { label: "Spend", color: "hsl(var(--accent))" },
  revenue: { label: "Revenue", color: "hsl(217 91% 60%)" },
};

export default function Overview() {
  const { campaigns, logs, settings } = useAgentStore();
  const history = mergeAccountHistory(campaigns);
  const metrics = summarizeMetrics(history);

  const spendDelta = periodDeltaPct(history, 7, (m) => m.spend);
  const roasDelta = periodDeltaPct(history, 7, (m) => m.roas);
  const ctrDelta = periodDeltaPct(history, 7, (m) => m.ctr);
  const convDelta = periodDeltaPct(history, 7, (m) => m.conversions);

  const chartData = history.map((h) => ({ date: formatDate(h.date), spend: h.spend, revenue: h.revenue }));

  const activeAdSets = campaigns.flatMap((c) => c.adSets).filter((a) => a.status === "ACTIVE").length;
  const dueForRotation = campaigns
    .flatMap((c) => c.adSets)
    .filter((a) => new Date(a.nextCreativeRotation).getTime() <= Date.now()).length;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-bold tracking-tight">Overview</h1>
        <p className="text-sm text-muted-foreground">
          Account performance for the last 14 days across {campaigns.length} campaigns.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Total spend" value={formatCurrency(metrics.spend)} icon={DollarSign} deltaPct={spendDelta} deltaGoodDirection="down" subtext="vs. prior 7 days" />
        <StatCard label="ROAS" value={formatRatio(metrics.roas)} icon={TrendingUp} deltaPct={roasDelta} deltaGoodDirection="up" subtext="vs. prior 7 days" />
        <StatCard label="CTR" value={formatPercent(metrics.ctr)} icon={MousePointerClick} deltaPct={ctrDelta} deltaGoodDirection="up" subtext="vs. prior 7 days" />
        <StatCard label="Conversions" value={metrics.conversions.toLocaleString()} icon={ShoppingCart} deltaPct={convDelta} deltaGoodDirection="up" subtext="vs. prior 7 days" />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Spend vs. revenue</CardTitle>
            <CardDescription>Daily totals across the whole ad account</CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer config={chartConfig} className="aspect-auto h-[280px] w-full">
              <AreaChart data={chartData} margin={{ left: 0, right: 12, top: 8, bottom: 0 }}>
                <defs>
                  <linearGradient id="fillSpend" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--color-spend)" stopOpacity={0.35} />
                    <stop offset="95%" stopColor="var(--color-spend)" stopOpacity={0.02} />
                  </linearGradient>
                  <linearGradient id="fillRevenue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--color-revenue)" stopOpacity={0.35} />
                    <stop offset="95%" stopColor="var(--color-revenue)" stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid vertical={false} strokeDasharray="3 3" />
                <XAxis dataKey="date" tickLine={false} axisLine={false} tickMargin={8} minTickGap={24} />
                <YAxis tickLine={false} axisLine={false} tickMargin={8} width={40} tickFormatter={(v) => `$${v}`} />
                <ChartTooltip content={<ChartTooltipContent indicator="dot" />} />
                <Area dataKey="revenue" type="monotone" fill="url(#fillRevenue)" stroke="var(--color-revenue)" strokeWidth={2} />
                <Area dataKey="spend" type="monotone" fill="url(#fillSpend)" stroke="var(--color-spend)" strokeWidth={2} />
              </AreaChart>
            </ChartContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0">
            <div>
              <CardTitle className="flex items-center gap-2 text-base">
                <Bot className="h-4 w-4" /> Agent status
              </CardTitle>
              <CardDescription>{settings.connected ? "Connected to Meta Ads" : "Running in demo mode"}</CardDescription>
            </div>
          </CardHeader>
          <CardContent className="space-y-4 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Daily check</span>
              <span className="flex items-center gap-1 font-medium">
                <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                {formatRelativeTime(settings.lastDailyCheckAt)}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Last creative rotation</span>
              <span className="flex items-center gap-1 font-medium">
                <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                {formatRelativeTime(settings.lastCreativeRotationAt)}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Active ad sets</span>
              <span className="font-medium">{activeAdSets}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Due for creative refresh</span>
              <span className="font-medium">{dueForRotation}</span>
            </div>
            <div className="flex items-center justify-between rounded-md bg-muted px-3 py-2">
              <span className="text-xs text-muted-foreground">Rotation cadence</span>
              <span className="text-xs font-medium">every {settings.creativeRotationDays} days</span>
            </div>
            <Button variant="outline" size="sm" className="w-full gap-1.5" asChild>
              <Link to="/agent">
                View agent activity <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Campaigns</CardTitle>
            <CardDescription>Live performance snapshot</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {campaigns.map((c) => (
              <Link
                key={c.id}
                to="/campaigns"
                className="flex items-center justify-between gap-3 rounded-lg border p-3 text-sm transition-colors hover:bg-muted/50"
              >
                <div className="flex min-w-0 flex-col gap-1">
                  <span className="truncate font-medium">{c.name}</span>
                  <span className="text-xs text-muted-foreground">{c.adSets.length} ad sets · {formatCurrency(c.dailyBudget)}/day</span>
                </div>
                <div className="flex items-center gap-4 text-right">
                  <div>
                    <div className="font-medium">{formatCurrency(c.metrics.spend)}</div>
                    <div className="text-xs text-muted-foreground">spend</div>
                  </div>
                  <div>
                    <div className="font-medium">{formatRatio(c.metrics.roas)}</div>
                    <div className="text-xs text-muted-foreground">ROAS</div>
                  </div>
                  <StatusBadge status={c.status} />
                </div>
              </Link>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-base">Recent agent activity</CardTitle>
            <Button variant="ghost" size="sm" asChild>
              <Link to="/agent">View all</Link>
            </Button>
          </CardHeader>
          <CardContent className="space-y-3">
            {logs.slice(0, 5).map((log) => (
              <div key={log.id} className="space-y-1 border-b pb-3 last:border-0 last:pb-0">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm font-medium leading-tight">{log.title}</span>
                  <SeverityBadge severity={log.severity} />
                </div>
                <p className="text-xs text-muted-foreground">{formatRelativeTime(log.timestamp)}</p>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
