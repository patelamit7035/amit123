import { useMemo, useState } from "react";
import { Check, Sparkles, X } from "lucide-react";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CreativePreview } from "@/components/agent/CreativePreview";
import { CreativeStatusBadge } from "@/components/agent/Badges";
import { useAgentStore } from "@/hooks/useAgentStore";
import { allCreatives } from "@/lib/analytics";
import { approveCreative, rejectCreative } from "@/lib/agentEngine";
import { formatRelativeTime } from "@/lib/format";
import { toast } from "sonner";

type Filter = "all" | "pending_review" | "active" | "retired" | "rejected";

export default function Creatives() {
  const { campaigns } = useAgentStore();
  const [filter, setFilter] = useState<Filter>("all");
  const creatives = useMemo(() => allCreatives(campaigns).sort((a, b) => b.createdAt.localeCompare(a.createdAt)), [campaigns]);
  const pendingCount = creatives.filter((c) => c.status === "pending_review").length;

  const filtered = filter === "all" ? creatives : creatives.filter((c) => c.status === filter);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-bold tracking-tight">Creatives</h1>
        <p className="text-sm text-muted-foreground">
          {creatives.length} generated · {pendingCount} awaiting your review
        </p>
      </div>

      <Tabs value={filter} onValueChange={(v) => setFilter(v as Filter)}>
        <TabsList>
          <TabsTrigger value="all">All</TabsTrigger>
          <TabsTrigger value="pending_review">Pending review</TabsTrigger>
          <TabsTrigger value="active">Live</TabsTrigger>
          <TabsTrigger value="retired">Retired</TabsTrigger>
          <TabsTrigger value="rejected">Rejected</TabsTrigger>
        </TabsList>
      </Tabs>

      {filtered.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-2 py-16 text-center">
            <Sparkles className="h-8 w-8 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">No creatives in this view yet.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filtered.map((creative) => (
            <Card key={creative.id} className="flex flex-col overflow-hidden">
              <CardHeader className="p-3 pb-0">
                <CreativePreview creative={creative} />
              </CardHeader>
              <CardContent className="flex-1 space-y-2 p-3">
                <div className="flex items-center justify-between gap-2">
                  <CreativeStatusBadge status={creative.status} />
                  <span className="text-[11px] text-muted-foreground">{formatRelativeTime(creative.createdAt)}</span>
                </div>
                <p className="text-xs font-medium leading-snug">{creative.adSetName}</p>
                <p className="text-[11px] text-muted-foreground line-clamp-2">{creative.campaignName}</p>
                <p className="rounded-md bg-muted p-2 text-[11px] leading-snug text-muted-foreground">
                  <span className="font-medium text-foreground">Why: </span>
                  {creative.reasoning}
                </p>
              </CardContent>
              {creative.status === "pending_review" && (
                <CardFooter className="grid grid-cols-2 gap-2 p-3 pt-0">
                  <Button
                    size="sm"
                    variant="outline"
                    className="gap-1"
                    onClick={() => {
                      rejectCreative(creative.campaignId, creative.adSetId, creative.id);
                      toast.info("Creative rejected");
                    }}
                  >
                    <X className="h-3.5 w-3.5" /> Reject
                  </Button>
                  <Button
                    size="sm"
                    className="gap-1"
                    onClick={() => {
                      approveCreative(creative.campaignId, creative.adSetId, creative.id);
                      toast.success("Creative published to Meta");
                    }}
                  >
                    <Check className="h-3.5 w-3.5" /> Approve
                  </Button>
                </CardFooter>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
