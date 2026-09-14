import { useState } from "react";
import { Bot, ChevronDown, RefreshCw, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { runCreativeRotationNow, runDailyCheckNow } from "@/lib/agentEngine";
import { toast } from "sonner";

export function RunAgentMenu() {
  const [running, setRunning] = useState<"daily" | "rotation" | null>(null);

  async function handleDailyCheck() {
    setRunning("daily");
    await new Promise((r) => setTimeout(r, 700));
    const entry = runDailyCheckNow();
    toast.success(entry.title, { description: entry.summary });
    setRunning(null);
  }

  async function handleRotation() {
    setRunning("rotation");
    await new Promise((r) => setTimeout(r, 900));
    const entries = runCreativeRotationNow(true);
    toast.success(
      entries.length ? `Generated ${entries.length} new creative${entries.length === 1 ? "" : "s"}` : "Creative rotation checked",
      { description: entries.length ? entries.map((e) => e.title).join(", ") : "No ad sets are due for a refresh right now." },
    );
    setRunning(null);
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button size="sm" className="gap-1.5">
          <Bot className="h-4 w-4" />
          Run agent
          <ChevronDown className="h-3.5 w-3.5 opacity-70" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-72">
        <DropdownMenuLabel>Run agent jobs manually</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={handleDailyCheck} disabled={running !== null} className="gap-2">
          <RefreshCw className={`h-4 w-4 ${running === "daily" ? "animate-spin" : ""}`} />
          <div className="flex flex-col">
            <span className="text-sm">Run daily check now</span>
            <span className="text-xs text-muted-foreground">Scan performance & flag issues</span>
          </div>
        </DropdownMenuItem>
        <DropdownMenuItem onClick={handleRotation} disabled={running !== null} className="gap-2">
          <Sparkles className={`h-4 w-4 ${running === "rotation" ? "animate-spin" : ""}`} />
          <div className="flex flex-col">
            <span className="text-sm">Force creative rotation</span>
            <span className="text-xs text-muted-foreground">Generate new creatives for every ad set</span>
          </div>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
