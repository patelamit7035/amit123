import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, Mail, RotateCcw } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { PageHeader } from "@/components/affiliate/PageHeader";
import { CopyButton } from "@/components/affiliate/CopyButton";
import { useEmailLog, useSaveSettings, useSettings } from "@/hooks/useAffiliate";
import { settingsSchema, type SettingsValues } from "@/lib/affiliate/validation";
import { isDemoMode, resetDemoData } from "@/lib/data";
import { resolveBaseUrl } from "@/lib/affiliate/codes";

export default function AdminSettings() {
  const { data: settings, isLoading } = useSettings();
  const { data: emailLog = [] } = useEmailLog();
  const saveSettings = useSaveSettings();

  const form = useForm<SettingsValues>({
    resolver: zodResolver(settingsSchema),
    defaultValues: {
      brandName: "FunnelOS",
      currency: "INR",
      payoutHoldDays: 7,
      publicBaseUrl: "",
      funnelosWebhookUrl: "",
      whatsappNumber: "",
      notifyFromEmail: "",
      notifyAdminEmail: "",
    },
  });

  useEffect(() => {
    if (settings) form.reset(settings);
  }, [settings, form]);

  const onSubmit = async (values: SettingsValues) => {
    try {
      await saveSettings.mutateAsync(values);
      toast.success("Settings saved");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not save the settings");
    }
  };

  const detectedBase = resolveBaseUrl("");

  return (
    <div className="space-y-6">
      <PageHeader title="Program settings" description="How the program behaves, and where new leads are sent." />

      <Card>
        <CardHeader>
          <CardTitle className="text-base">General</CardTitle>
          <CardDescription>Applies to every affiliate and every new sale.</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-sm text-muted-foreground">Loading…</p>
          ) : (
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4" noValidate>
              <div className="grid gap-4 sm:grid-cols-3">
                <div className="space-y-2">
                  <Label htmlFor="brandName">Brand name</Label>
                  <Input id="brandName" {...form.register("brandName")} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="currency">Currency</Label>
                  <Input id="currency" className="uppercase" {...form.register("currency")} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="payoutHoldDays">Payout hold (days)</Label>
                  <Input id="payoutHoldDays" type="number" min="0" max="90" {...form.register("payoutHoldDays")} />
                  {form.formState.errors.payoutHoldDays ? (
                    <p className="text-sm text-destructive">{form.formState.errors.payoutHoldDays.message}</p>
                  ) : null}
                  <p className="text-xs text-muted-foreground">
                    A commission becomes payable this many days after the sale. Applies to new sales only.
                  </p>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="publicBaseUrl">Public site URL</Label>
                <Input id="publicBaseUrl" placeholder={detectedBase} {...form.register("publicBaseUrl")} />
                {form.formState.errors.publicBaseUrl ? (
                  <p className="text-sm text-destructive">{form.formState.errors.publicBaseUrl.message}</p>
                ) : null}
                <p className="text-xs text-muted-foreground">
                  Used to build affiliate links. Leave blank to use whatever address the dashboard is opened on
                  {detectedBase ? ` (currently ${detectedBase})` : ""}.
                </p>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="notifyFromEmail">Send lead emails from</Label>
                  <Input id="notifyFromEmail" placeholder="no-reply@yourdomain.com" {...form.register("notifyFromEmail")} />
                  {form.formState.errors.notifyFromEmail ? (
                    <p className="text-sm text-destructive">{form.formState.errors.notifyFromEmail.message}</p>
                  ) : null}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="notifyAdminEmail">Copy every new lead to</Label>
                  <Input id="notifyAdminEmail" placeholder="sales@yourdomain.com" {...form.register("notifyAdminEmail")} />
                  {form.formState.errors.notifyAdminEmail ? (
                    <p className="text-sm text-destructive">{form.formState.errors.notifyAdminEmail.message}</p>
                  ) : null}
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="whatsappNumber">WhatsApp number</Label>
                  <Input id="whatsappNumber" placeholder="919876543210" {...form.register("whatsappNumber")} />
                  {form.formState.errors.whatsappNumber ? (
                    <p className="text-sm text-destructive">{form.formState.errors.whatsappNumber.message}</p>
                  ) : null}
                  <p className="text-xs text-muted-foreground">
                    Shown to leads after they submit the form, and used in the follow-up links.
                  </p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="funnelosWebhookUrl">FunnelOS automation webhook</Label>
                  <Input id="funnelosWebhookUrl" placeholder="https://…" {...form.register("funnelosWebhookUrl")} />
                  {form.formState.errors.funnelosWebhookUrl ? (
                    <p className="text-sm text-destructive">{form.formState.errors.funnelosWebhookUrl.message}</p>
                  ) : null}
                  <p className="text-xs text-muted-foreground">
                    Every new lead is POSTed here as JSON, so FunnelOS can start its WhatsApp / email automation.
                  </p>
                </div>
              </div>

              <Button type="submit" disabled={saveSettings.isPending}>
                {saveSettings.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Save settings
              </Button>
            </form>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Webhook payload</CardTitle>
          <CardDescription>What FunnelOS receives for every new lead.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <pre className="overflow-x-auto rounded-md bg-muted p-3 text-xs">
{`{
  "event": "affiliate.lead.created",
  "lead":      { "id": "…", "name": "…", "email": "…", "phone": "…", "source": "…", "createdAt": "…" },
  "product":   { "id": "…", "name": "…" },
  "affiliate": { "id": "…", "name": "…", "code": "…" }
}`}
          </pre>
          <CopyButton
            label="Copy the sample payload"
            value={`{"event":"affiliate.lead.created","lead":{"id":"","name":"","email":"","phone":"","source":"","createdAt":""},"product":{"id":"","name":""},"affiliate":{"id":"","name":"","code":""}}`}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Email log</CardTitle>
          <CardDescription>The last few emails triggered by a lead submission.</CardDescription>
        </CardHeader>
        <CardContent>
          {emailLog.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">Nothing sent yet.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Sent</TableHead>
                  <TableHead>To</TableHead>
                  <TableHead>Template</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {emailLog.slice(0, 20).map((entry) => (
                  <TableRow key={entry.id}>
                    <TableCell className="text-sm text-muted-foreground">
                      {new Date(entry.createdAt).toLocaleString()}
                    </TableCell>
                    <TableCell>{entry.toEmail}</TableCell>
                    <TableCell className="text-sm">{entry.template}</TableCell>
                    <TableCell>
                      <Badge variant={entry.status === "sent" ? "secondary" : "outline"}>
                        <Mail className="mr-1 h-3 w-3" />
                        {entry.status}
                      </Badge>
                      {entry.error ? (
                        <span className="ml-2 text-xs text-muted-foreground">{entry.error}</span>
                      ) : null}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {isDemoMode ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Demo data</CardTitle>
            <CardDescription>This deployment has no database connected.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Alert>
              <AlertDescription>
                Everything you see is stored in this browser only. Connect Supabase (see the README) to make it real and
                multi-user.
              </AlertDescription>
            </Alert>
            <Button
              variant="outline"
              onClick={() => {
                resetDemoData();
                window.location.reload();
              }}
            >
              <RotateCcw className="mr-1.5 h-4 w-4" />
              Reset the demo data
            </Button>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
