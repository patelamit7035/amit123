import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { AgentEventSeverity, CampaignStatus, Creative } from "@/types/agent";

const STATUS_STYLES: Record<CampaignStatus, string> = {
  ACTIVE: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/20",
  PAUSED: "bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/20",
  LEARNING: "bg-blue-500/15 text-blue-700 dark:text-blue-400 border-blue-500/20",
  ENDED: "bg-muted text-muted-foreground border-border",
};

export function StatusBadge({ status }: { status: CampaignStatus }) {
  return (
    <Badge variant="outline" className={cn("font-medium", STATUS_STYLES[status])}>
      {status === "ACTIVE" ? "Active" : status === "PAUSED" ? "Paused" : status === "LEARNING" ? "Learning" : "Ended"}
    </Badge>
  );
}

const SEVERITY_STYLES: Record<AgentEventSeverity, string> = {
  info: "bg-blue-500/15 text-blue-700 dark:text-blue-400 border-blue-500/20",
  success: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/20",
  warning: "bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/20",
  critical: "bg-red-500/15 text-red-700 dark:text-red-400 border-red-500/20",
};

export function SeverityBadge({ severity }: { severity: AgentEventSeverity }) {
  return (
    <Badge variant="outline" className={cn("font-medium capitalize", SEVERITY_STYLES[severity])}>
      {severity}
    </Badge>
  );
}

const CREATIVE_STATUS_LABEL: Record<Creative["status"], string> = {
  draft: "Draft",
  pending_review: "Pending review",
  active: "Live",
  retired: "Retired",
  rejected: "Rejected",
};

const CREATIVE_STATUS_STYLES: Record<Creative["status"], string> = {
  draft: "bg-muted text-muted-foreground border-border",
  pending_review: "bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/20",
  active: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/20",
  retired: "bg-muted text-muted-foreground border-border",
  rejected: "bg-red-500/15 text-red-700 dark:text-red-400 border-red-500/20",
};

export function CreativeStatusBadge({ status }: { status: Creative["status"] }) {
  return (
    <Badge variant="outline" className={cn("font-medium", CREATIVE_STATUS_STYLES[status])}>
      {CREATIVE_STATUS_LABEL[status]}
    </Badge>
  );
}
