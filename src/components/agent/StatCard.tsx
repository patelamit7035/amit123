import type { LucideIcon } from "lucide-react";
import { ArrowDownRight, ArrowUpRight } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface StatCardProps {
  label: string;
  value: string;
  icon: LucideIcon;
  deltaPct?: number;
  deltaGoodDirection?: "up" | "down";
  subtext?: string;
}

export function StatCard({ label, value, icon: Icon, deltaPct, deltaGoodDirection = "up", subtext }: StatCardProps) {
  const isPositiveDelta = deltaPct !== undefined && deltaPct >= 0;
  const isGood =
    deltaPct !== undefined && (deltaGoodDirection === "up" ? isPositiveDelta : !isPositiveDelta);

  return (
    <Card>
      <CardContent className="p-5">
        <div className="flex items-start justify-between">
          <span className="text-sm text-muted-foreground">{label}</span>
          <Icon className="h-4 w-4 text-muted-foreground" />
        </div>
        <div className="mt-2 text-2xl font-bold tracking-tight">{value}</div>
        <div className="mt-1 flex items-center gap-1.5 text-xs">
          {deltaPct !== undefined && (
            <span
              className={cn(
                "inline-flex items-center gap-0.5 font-medium",
                isGood ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400",
              )}
            >
              {isPositiveDelta ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
              {Math.abs(deltaPct).toFixed(1)}%
            </span>
          )}
          {subtext && <span className="text-muted-foreground">{subtext}</span>}
        </div>
      </CardContent>
    </Card>
  );
}
