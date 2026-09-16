import type { LucideIcon } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface StatTileProps {
  label: string;
  value: string;
  hint?: string;
  icon?: LucideIcon;
  tone?: "default" | "positive" | "warning" | "muted";
}

const TONES: Record<NonNullable<StatTileProps["tone"]>, string> = {
  default: "text-foreground",
  positive: "text-emerald-600 dark:text-emerald-400",
  warning: "text-amber-600 dark:text-amber-400",
  muted: "text-muted-foreground",
};

export function StatTile({ label, value, hint, icon: Icon, tone = "default" }: StatTileProps) {
  return (
    <Card>
      <CardContent className="flex items-start justify-between gap-3 p-4">
        <div className="min-w-0">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
          <p className={cn("mt-1 truncate text-2xl font-semibold tabular-nums", TONES[tone])}>{value}</p>
          {hint ? <p className="mt-1 text-xs text-muted-foreground">{hint}</p> : null}
        </div>
        {Icon ? (
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
            <Icon className="h-4 w-4" />
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
