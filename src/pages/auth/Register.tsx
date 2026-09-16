import { useState } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { useAuth } from "@/lib/auth/AuthProvider";
import { registerSchema, type RegisterValues } from "@/lib/affiliate/validation";
import { AuthShell } from "./AuthShell";

interface FieldProps {
  id: keyof RegisterValues;
  label: string;
  type?: string;
  placeholder?: string;
  autoComplete?: string;
  hint?: string;
}

export default function Register() {
  const { signUp, profile, loading } = useAuth();
  const navigate = useNavigate();
  const [error, setError] = useState("");
  const [confirmation, setConfirmation] = useState(false);

  const form = useForm<RegisterValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      fullName: "",
      email: "",
      phone: "",
      password: "",
      confirmPassword: "",
      accountHolderName: "",
      bankName: "",
      accountNumber: "",
      ifscCode: "",
      upiId: "",
    },
  });

  if (!loading && profile) return <Navigate to="/app" replace />;

  const onSubmit = async (values: RegisterValues) => {
    setError("");
    try {
      const next = await signUp(values);
      if (!next) {
        setConfirmation(true);
        return;
      }
      navigate(next.role === "admin" ? "/admin" : "/app", { replace: true });
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not create the account");
    }
  };

  const field = ({ id, label, type = "text", placeholder, autoComplete, hint }: FieldProps) => (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      <Input id={id} type={type} placeholder={placeholder} autoComplete={autoComplete} {...form.register(id)} />
      {hint ? <p className="text-xs text-muted-foreground">{hint}</p> : null}
      {form.formState.errors[id] ? (
        <p className="text-sm text-destructive">{form.formState.errors[id]?.message as string}</p>
      ) : null}
    </div>
  );

  if (confirmation) {
    return (
      <AuthShell title="Confirm your email" description="One last step before your dashboard opens.">
        <Alert>
          <AlertDescription>
            We sent a confirmation link to <strong>{form.getValues("email")}</strong>. Open it, then sign in.
          </AlertDescription>
        </Alert>
        <Button asChild className="mt-4 w-full">
          <Link to="/login">Go to sign in</Link>
        </Button>
      </AuthShell>
    );
  }

  return (
    <AuthShell
      title="Join the affiliate program"
      description="Share your link, bring in leads, and get paid a week after every sale."
      footer={
        <>
          Already have an account?{" "}
          <Link to="/login" className="font-medium text-primary hover:underline">
            Sign in
          </Link>
        </>
      }
    >
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4" noValidate>
        {error ? (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        ) : null}

        {field({ id: "fullName", label: "Full name", autoComplete: "name", placeholder: "Rahul Sharma" })}
        <div className="grid gap-4 sm:grid-cols-2">
          {field({ id: "email", label: "Email", type: "email", autoComplete: "email" })}
          {field({ id: "phone", label: "Phone (WhatsApp)", autoComplete: "tel", placeholder: "+91 98765 43210" })}
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          {field({ id: "password", label: "Password", type: "password", autoComplete: "new-password", hint: "At least 8 characters" })}
          {field({ id: "confirmPassword", label: "Confirm password", type: "password", autoComplete: "new-password" })}
        </div>

        <Separator className="my-2" />
        <div>
          <h3 className="text-sm font-semibold">Where should we send your commission?</h3>
          <p className="text-xs text-muted-foreground">
            Payouts are transferred manually to this account once a commission clears its hold period. You can update
            these details later.
          </p>
        </div>

        {field({ id: "accountHolderName", label: "Account holder name", placeholder: "As printed on your passbook" })}
        <div className="grid gap-4 sm:grid-cols-2">
          {field({ id: "bankName", label: "Bank name", placeholder: "HDFC Bank" })}
          {field({ id: "accountNumber", label: "Account number", placeholder: "50100234567890" })}
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          {field({ id: "ifscCode", label: "IFSC code", placeholder: "HDFC0001234" })}
          {field({ id: "upiId", label: "UPI ID (optional)", placeholder: "you@okhdfcbank" })}
        </div>

        <Button type="submit" className="w-full" disabled={form.formState.isSubmitting}>
          {form.formState.isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
          Create my affiliate account
        </Button>
      </form>
    </AuthShell>
  );
}
