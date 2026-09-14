import { useState } from "react";
import { AlertTriangle, KeyRound, Save, Sparkles } from "lucide-react";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useAgentStore } from "@/hooks/useAgentStore";
import { resetDemoData, updateSettings } from "@/lib/store";
import type { AgentSettings } from "@/types/agent";
import { toast } from "sonner";

export default function Settings() {
  const { settings } = useAgentStore();
  const [form, setForm] = useState<AgentSettings>(settings);

  function set<K extends keyof AgentSettings>(key: K, value: AgentSettings[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function save() {
    updateSettings({ ...form, connected: Boolean(form.accessToken && form.adAccountId) });
    toast.success("Settings saved");
  }

  return (
    <div className="max-w-3xl space-y-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
        <p className="text-sm text-muted-foreground">Connect your Meta Ads account and configure how the agent behaves.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <KeyRound className="h-4 w-4" /> Meta Ads connection
          </CardTitle>
          <CardDescription>
            Requires a Marketing API access token with <code className="text-xs">ads_management</code> and{" "}
            <code className="text-xs">ads_read</code> permissions on this ad account.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="accessToken">Access token</Label>
            <Input
              id="accessToken"
              type="password"
              placeholder="EAAG..."
              value={form.accessToken}
              onChange={(e) => set("accessToken", e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="adAccountId">Ad account ID</Label>
            <Input
              id="adAccountId"
              placeholder="act_1234567890"
              value={form.adAccountId}
              onChange={(e) => set("adAccountId", e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="backendUrl">Agent backend URL (optional)</Label>
            <Input
              id="backendUrl"
              placeholder="https://your-agent-backend.example.com"
              value={form.backendUrl}
              onChange={(e) => set("backendUrl", e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              Without a backend the agent runs in this browser tab (demo mode) — checks fire when the dashboard is
              open. Point this at the included <code className="text-xs">server/</code> deployment for true 24/7
              scheduling, even when your browser is closed. See the README for deploy steps.
            </p>
          </div>
          {!form.accessToken && (
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>Running in demo mode</AlertTitle>
              <AlertDescription>
                No access token connected — the dashboard shows simulated data so you can try the full experience.
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Sparkles className="h-4 w-4" /> Brand &amp; product
          </CardTitle>
          <CardDescription>Used by the agent to write on-brand creative copy.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="businessName">Business name</Label>
            <Input id="businessName" value={form.businessName} onChange={(e) => set("businessName", e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="productDescription">Product description</Label>
            <Textarea
              id="productDescription"
              rows={3}
              value={form.productDescription}
              onChange={(e) => set("productDescription", e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Brand tone</Label>
            <Select value={form.brandTone} onValueChange={(v) => set("brandTone", v as AgentSettings["brandTone"])}>
              <SelectTrigger className="w-56">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="bold">Bold</SelectItem>
                <SelectItem value="friendly">Friendly</SelectItem>
                <SelectItem value="premium">Premium</SelectItem>
                <SelectItem value="playful">Playful</SelectItem>
                <SelectItem value="minimal">Minimal</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Agent configuration</CardTitle>
          <CardDescription>Control what the agent checks daily and how it rotates creatives.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <Row label="Daily performance check" description="Scan every campaign for pacing, ROAS, and CTR issues">
            <Switch checked={form.dailyCheckEnabled} onCheckedChange={(v) => set("dailyCheckEnabled", v)} />
          </Row>
          <Row label="Check time (hour of day)" description="24-hour format">
            <Input
              type="number"
              min={0}
              max={23}
              className="w-20"
              value={form.dailyCheckHour}
              onChange={(e) => set("dailyCheckHour", Number(e.target.value))}
            />
          </Row>
          <Separator />
          <Row label="Automatic creative rotation" description="Generate a new creative variant on a fixed cadence">
            <Switch checked={form.creativeRotationEnabled} onCheckedChange={(v) => set("creativeRotationEnabled", v)} />
          </Row>
          <Row label="Rotation cadence (days)" description="How often each ad set gets a new creative">
            <Input
              type="number"
              min={1}
              max={30}
              className="w-20"
              value={form.creativeRotationDays}
              onChange={(e) => set("creativeRotationDays", Number(e.target.value))}
            />
          </Row>
          <Row label="Approval mode" description="Auto-publish new creatives, or hold them for your review">
            <Select value={form.approvalMode} onValueChange={(v) => set("approvalMode", v as AgentSettings["approvalMode"])}>
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="manual">Manual review</SelectItem>
                <SelectItem value="auto">Automatic</SelectItem>
              </SelectContent>
            </Select>
          </Row>
          <Separator />
          <Row label="Pause underperformers" description="Automatically pause ad sets below the ROAS threshold (auto mode only)">
            <Switch checked={form.pauseUnderperformersEnabled} onCheckedChange={(v) => set("pauseUnderperformersEnabled", v)} />
          </Row>
          <Row label="Minimum ROAS threshold">
            <Input
              type="number"
              step={0.1}
              min={0}
              className="w-24"
              value={form.minRoasThreshold}
              onChange={(e) => set("minRoasThreshold", Number(e.target.value))}
            />
          </Row>
          <Row label="Max daily budget increase" description="Cap on auto budget increases for winning ad sets">
            <div className="flex items-center gap-1">
              <Input
                type="number"
                min={0}
                max={100}
                className="w-20"
                value={form.maxDailyBudgetIncreasePct}
                onChange={(e) => set("maxDailyBudgetIncreasePct", Number(e.target.value))}
              />
              <span className="text-sm text-muted-foreground">%</span>
            </div>
          </Row>
        </CardContent>
        <CardFooter className="justify-end border-t pt-4">
          <Button onClick={save} className="gap-1.5">
            <Save className="h-4 w-4" /> Save changes
          </Button>
        </CardFooter>
      </Card>

      <Card className="border-destructive/30">
        <CardHeader>
          <CardTitle className="text-base text-destructive">Danger zone</CardTitle>
          <CardDescription>Wipe all demo data (campaigns, creatives, and agent logs) and start fresh.</CardDescription>
        </CardHeader>
        <CardFooter>
          <Button
            variant="destructive"
            onClick={() => {
              resetDemoData();
              toast.success("Demo data reset");
            }}
          >
            Reset demo data
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}

function Row({ label, description, children }: { label: string; description?: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <div className="space-y-0.5">
        <Label>{label}</Label>
        {description && <p className="text-xs text-muted-foreground">{description}</p>}
      </div>
      {children}
    </div>
  );
}
