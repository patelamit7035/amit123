import { useState } from "react";
import { AlertTriangle, Bot, DollarSign, Info, RefreshCw, Sparkles, ThumbsDown, ThumbsUp } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { SeverityBadge } from "@/components/agent/Badges";
import { useAgentStore } from "@/hooks/useAgentStore";
import { runCreativeRotationNow, runDailyCheckNow } from "@/lib/agentEngine";
import { formatDateTime } from "@/lib/format";
import type { AgentEventType } from "@/types/agent";
import { toast } from "sonner";

const ICONS: Record<AgentEventType, typeof Bot> = {
  daily_check: RefreshCw,
  creative_rotation: Sparkles,
  budget_alert: DollarSign,
  performance_alert: AlertTriangle,
  creative_published: ThumbsUp,
  creative_rejected: ThumbsDown,
  recommendation: Info,
  info: Info,
};

export default function AgentActivity() {
  const { logs, settings } = useAgentStore();
  const [running, setRunning] = useState<"daily" | "rotation" | null>(null);

  async function handleDailyCheck() {
    setRunning("daily");
    await new Promise((r) => setTimeout(r, 700));
    const entry = runDailyCheckNow();
    toast.success(entry.title);
    setRunning(null);
  }

  async function handleRotation() {
    setRunning("rotation");
    await new Promise((r) => setTimeout(r, 900));
    const entries = runCreativeRotationNow(true);
    toast.success(entries.length ? `Generated ${entries.length} new creative(s)` : "No ad sets due right now");
    setRunning(null);
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-bold tracking-tight">Agent Activity</h1>
          <p className="text-sm text-muted-foreground">
            Every check and decision the agent makes, with the reasoning behind it.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={handleDailyCheck} disabled={running !== null} className="gap-1.5">
            <RefreshCw className={`h-3.5 w-3.5 ${running === "daily" ? "animate-spin" : ""}`} />
            Run daily check
          </Button>
          <Button size="sm" onClick={handleRotation} disabled={running !== null} className="gap-1.5">
            <Sparkles className={`h-3.5 w-3.5 ${running === "rotation" ? "animate-spin" : ""}`} />
            Force rotation
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">How the agent operates</CardTitle>
          <CardDescription>
            Daily checks run at {settings.dailyCheckHour}:00 and scan every campaign for pacing, ROAS, and CTR issues.
            Creatives rotate automatically every {settings.creativeRotationDays} days per ad set.
            Approval mode is currently <span className="font-medium text-foreground">{settings.approvalMode === "auto" ? "Automatic" : "Manual review"}</span>.
          </CardDescription>
        </CardHeader>
      </Card>

      <div className="relative space-y-4 pl-6">
        <div className="absolute bottom-0 left-[11px] top-1 w-px bg-border" aria-hidden />
        {logs.map((log) => {
          const Icon = ICONS[log.type];
          return (
            <div key={log.id} className="relative">
              <div className="absolute -left-6 top-0.5 flex h-6 w-6 items-center justify-center rounded-full border bg-background">
                <Icon className="h-3 w-3" />
              </div>
              <Card>
                <CardContent className="space-y-2 p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="text-sm font-semibold">{log.title}</span>
                    <div className="flex items-center gap-2">
                      <SeverityBadge severity={log.severity} />
                      <span className="text-xs text-muted-foreground">{formatDateTime(log.timestamp)}</span>
                    </div>
                  </div>
                  <p className="text-sm text-muted-foreground">{log.summary}</p>
                  {log.findings && log.findings.length > 0 && (
                    <ul className="space-y-1.5 border-t pt-2">
                      {log.findings.map((f, i) => (
                        <li key={i} className="flex items-start gap-2 text-xs">
                          <SeverityBadge severity={f.severity} />
                          <span>
                            <span className="font-medium">{f.label}</span> — {f.detail}
                          </span>
                        </li>
                      ))}
                    </ul>
                  )}
                </CardContent>
              </Card>
            </div>
          );
        })}
      </div>
    </div>
  );
}
