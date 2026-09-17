import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { getBackend } from "@/lib/data";
import { leadFormSchema, type LeadFormValues } from "@/lib/affiliate/validation";

interface LeadCaptureFormProps {
  code: string;
  source: string;
  submitLabel?: string;
  onSuccess?: (values: LeadFormValues) => void;
}

/**
 * The form behind every affiliate link - on the referral page and inside the
 * embeddable widget. Submitting it stores the lead against the affiliate who
 * owns the link and kicks off the email / FunnelOS automation.
 */
export function LeadCaptureForm({ code, source, submitLabel = "Get instant access", onSuccess }: LeadCaptureFormProps) {
  const [error, setError] = useState("");
  const form = useForm<LeadFormValues & { company?: string }>({
    resolver: zodResolver(leadFormSchema),
    defaultValues: { name: "", email: "", phone: "", company: "" },
  });

  const onSubmit = async (values: LeadFormValues & { company?: string }) => {
    setError("");
    // Honeypot: a real person never sees this field.
    if ((values.company || "").trim() !== "") {
      onSuccess?.(values);
      return;
    }
    try {
      await getBackend().submitLead({ code, name: values.name, email: values.email, phone: values.phone, source });
      form.reset();
      onSuccess?.(values);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not submit the form. Please try again.");
    }
  };

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4" noValidate>
      {error ? (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}

      <div className="space-y-2">
        <Label htmlFor="lead-name">Full name</Label>
        <Input id="lead-name" autoComplete="name" placeholder="Your name" {...form.register("name")} />
        {form.formState.errors.name ? (
          <p className="text-sm text-destructive">{form.formState.errors.name.message}</p>
        ) : null}
      </div>

      <div className="space-y-2">
        <Label htmlFor="lead-email">Email</Label>
        <Input
          id="lead-email"
          type="email"
          autoComplete="email"
          placeholder="you@example.com"
          {...form.register("email")}
        />
        {form.formState.errors.email ? (
          <p className="text-sm text-destructive">{form.formState.errors.email.message}</p>
        ) : null}
      </div>

      <div className="space-y-2">
        <Label htmlFor="lead-phone">WhatsApp number</Label>
        <Input id="lead-phone" type="tel" autoComplete="tel" placeholder="+91 98765 43210" {...form.register("phone")} />
        {form.formState.errors.phone ? (
          <p className="text-sm text-destructive">{form.formState.errors.phone.message}</p>
        ) : null}
      </div>

      <div aria-hidden="true" className="absolute left-[-9999px] h-0 w-0 overflow-hidden">
        <label htmlFor="lead-company">Company (leave this empty)</label>
        <input id="lead-company" tabIndex={-1} autoComplete="off" {...form.register("company")} />
      </div>

      <Button type="submit" className="w-full" size="lg" disabled={form.formState.isSubmitting}>
        {form.formState.isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
        {submitLabel}
      </Button>
      <p className="text-center text-xs text-muted-foreground">
        We will only use these details to contact you about this offer.
      </p>
    </form>
  );
}
