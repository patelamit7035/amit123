import { Bar, BarChart, CartesianGrid, Line, LineChart, XAxis, YAxis } from "recharts";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart";
import { useAgentStore } from "@/hooks/useAgentStore";
import { mergeAccountHistory, splitByShares, summarizeMetrics } from "@/lib/analytics";
import { formatCurrency, formatDate, formatRatio } from "@/lib/format";

const PALETTE = ["hsl(var(--accent))", "hsl(217 91% 60%)", "hsl(160 84% 39%)", "hsl(280 65% 60%)", "hsl(38 92% 50%)"];

const placementShares = [
  { label: "Feed", share: 0.42, roasMultiplier: 1.1 },
  { label: "Reels", share: 0.27, roasMultiplier: 1.25 },
  { label: "Stories", share: 0.18, roasMultiplier: 0.85 },
  { label: "Audience Network", share: 0.13, roasMultiplier: 0.6 },
];

const deviceShares = [
  { label: "Mobile", share: 0.78, roasMultiplier: 1.08 },
  { label: "Desktop", share: 0.17, roasMultiplier: 0.95 },
  { label: "Tablet", share: 0.05, roasMultiplier: 0.7 },
];

const ageShares = [
  { label: "18-24", share: 0.16, roasMultiplier: 0.9 },
  { label: "25-34", share: 0.34, roasMultiplier: 1.3 },
  { label: "35-44", share: 0.26, roasMultiplier: 1.15 },
  { label: "45-54", share: 0.15, roasMultiplier: 0.8 },
  { label: "55+", share: 0.09, roasMultiplier: 0.55 },
];

const campaignChartConfig: ChartConfig = { spend: { label: "Spend", color: "hsl(var(--accent))" } };
const trendChartConfig: ChartConfig = {
  ctr: { label: "CTR %", color: "hsl(var(--accent))" },
  roas: { label: "ROAS", color: "hsl(217 91% 60%)" },
};

export default function Analytics() {
  const { campaigns } = useAgentStore();
  const history = mergeAccountHistory(campaigns);
  const total = summarizeMetrics(history);

  const campaignSpend = campaigns.map((c) => ({ name: c.name.split(" - ")[0], spend: c.metrics.spend }));
  const placements = splitByShares(total, placementShares);
  const devices = splitByShares(total, deviceShares);
  const ages = splitByShares(total, ageShares);

  const trend = history.map((h) => ({
    date: formatDate(h.date),
    ctr: h.impressions ? Number(((h.clicks / h.impressions) * 100).toFixed(2)) : 0,
    roas: h.spend ? Number((h.revenue / h.spend).toFixed(2)) : 0,
  }));

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-bold tracking-tight">Analytics</h1>
        <p className="text-sm text-muted-foreground">Deeper breakdowns across placements, devices, and audiences.</p>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>CTR &amp; ROAS trend</CardTitle>
            <CardDescription>14-day account trend</CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer config={trendChartConfig} className="aspect-auto h-[260px] w-full">
              <LineChart data={trend} margin={{ left: 0, right: 12, top: 8, bottom: 0 }}>
                <CartesianGrid vertical={false} strokeDasharray="3 3" />
                <XAxis dataKey="date" tickLine={false} axisLine={false} tickMargin={8} minTickGap={24} />
                <YAxis yAxisId="left" tickLine={false} axisLine={false} width={32} />
                <YAxis yAxisId="right" orientation="right" tickLine={false} axisLine={false} width={32} />
                <ChartTooltip content={<ChartTooltipContent indicator="line" />} />
                <Line yAxisId="left" dataKey="ctr" type="monotone" stroke="var(--color-ctr)" strokeWidth={2} dot={false} />
                <Line yAxisId="right" dataKey="roas" type="monotone" stroke="var(--color-roas)" strokeWidth={2} dot={false} />
              </LineChart>
            </ChartContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Spend by campaign</CardTitle>
            <CardDescription>Last 14 days</CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer config={campaignChartConfig} className="aspect-auto h-[260px] w-full">
              <BarChart data={campaignSpend} layout="vertical" margin={{ left: 0, right: 24, top: 8, bottom: 0 }}>
                <CartesianGrid horizontal={false} strokeDasharray="3 3" />
                <XAxis type="number" tickLine={false} axisLine={false} tickFormatter={(v) => `$${v}`} />
                <YAxis type="category" dataKey="name" tickLine={false} axisLine={false} width={110} />
                <ChartTooltip content={<ChartTooltipContent indicator="dot" />} />
                <Bar dataKey="spend" fill="var(--color-spend)" radius={4} />
              </BarChart>
            </ChartContainer>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <BreakdownTable title="By placement" rows={placements} />
        <BreakdownTable title="By device" rows={devices} />
        <BreakdownTable title="By age group" rows={ages} />
      </div>
    </div>
  );
}

function BreakdownTable({ title, rows }: { title: string; rows: { label: string; spend: number; conversions: number; roas: number }[] }) {
  const maxSpend = Math.max(...rows.map((r) => r.spend), 1);
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {rows.map((r, i) => (
          <div key={r.label} className="space-y-1.5">
            <div className="flex items-center justify-between text-sm">
              <span className="font-medium">{r.label}</span>
              <div className="flex gap-4 text-right text-muted-foreground">
                <span>{formatCurrency(r.spend)}</span>
                <span className="w-12 font-medium text-foreground">{formatRatio(r.roas)}</span>
              </div>
            </div>
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full"
                style={{ width: `${(r.spend / maxSpend) * 100}%`, backgroundColor: PALETTE[i % PALETTE.length] }}
              />
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
