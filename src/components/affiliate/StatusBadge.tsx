import { Badge } from "@/components/ui/badge";
import { LEAD_STATUS_LABELS, PAYOUT_STATUS_LABELS } from "@/lib/affiliate/constants";
import type { LeadStatus, PayoutStatus } from "@/lib/affiliate/types";
import { cn } from "@/lib/utils";

const LEAD_TONES: Record<LeadStatus, string> = {
  new: "bg-sky-100 text-sky-800 dark:bg-sky-950 dark:text-sky-300",
  contacted: "bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-300",
  converted: "bg-emerald-100 text-emerald-900 dark:bg-emerald-950 dark:text-emerald-300",
  rejected: "bg-rose-100 text-rose-900 dark:bg-rose-950 dark:text-rose-300",
};

const PAYOUT_TONES: Record<PayoutStatus, string> = {
  pending: "bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-300",
  available: "bg-sky-100 text-sky-900 dark:bg-sky-950 dark:text-sky-300",
  paid: "bg-emerald-100 text-emerald-900 dark:bg-emerald-950 dark:text-emerald-300",
};

export function LeadStatusBadge({ status }: { status: LeadStatus }) {
  return (
    <Badge variant="secondary" className={cn("border-0 font-medium", LEAD_TONES[status])}>
      {LEAD_STATUS_LABELS[status] ?? status}
    </Badge>
  );
}

export function PayoutStatusBadge({ status }: { status: PayoutStatus }) {
  return (
    <Badge variant="secondary" className={cn("border-0 font-medium", PAYOUT_TONES[status])}>
      {PAYOUT_STATUS_LABELS[status] ?? status}
    </Badge>
  );
}
