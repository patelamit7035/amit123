import { useState } from "react";
import { Link, Navigate, useLocation, useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useAuth } from "@/lib/auth/AuthProvider";
import { loginSchema, type LoginValues } from "@/lib/affiliate/validation";
import { isDemoMode } from "@/lib/data";
import { DEMO_ADMIN, DEMO_AFFILIATE } from "@/lib/data/local/seed";
import { AuthShell } from "./AuthShell";

export default function Login() {
  const { signIn, profile, loading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [error, setError] = useState("");

  const form = useForm<LoginValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  });

  if (!loading && profile) {
    const target = (location.state as { from?: string } | null)?.from;
    return <Navigate to={target && target.startsWith("/app") ? target : "/app"} replace />;
  }

  const onSubmit = async (values: LoginValues) => {
    setError("");
    try {
      const next = await signIn(values.email, values.password);
      navigate(next.role === "admin" ? "/admin" : "/app", { replace: true });
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not sign in");
    }
  };

  const fillDemo = (email: string, password: string) => {
    form.setValue("email", email);
    form.setValue("password", password);
  };

  return (
    <AuthShell
      title="Sign in"
      description="Access your affiliate dashboard, links and earnings."
      footer={
        <>
          New here?{" "}
          <Link to="/register" className="font-medium text-primary hover:underline">
            Create an affiliate account
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

        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input id="email" type="email" autoComplete="email" {...form.register("email")} />
          {form.formState.errors.email ? (
            <p className="text-sm text-destructive">{form.formState.errors.email.message}</p>
          ) : null}
        </div>

        <div className="space-y-2">
          <Label htmlFor="password">Password</Label>
          <Input id="password" type="password" autoComplete="current-password" {...form.register("password")} />
          {form.formState.errors.password ? (
            <p className="text-sm text-destructive">{form.formState.errors.password.message}</p>
          ) : null}
        </div>

        <Button type="submit" className="w-full" disabled={form.formState.isSubmitting}>
          {form.formState.isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
          Sign in
        </Button>

        {isDemoMode ? (
          <div className="rounded-lg border bg-muted/40 p-3 text-sm">
            <p className="font-medium">Demo mode</p>
            <p className="mt-1 text-muted-foreground">
              No database is connected, so the app runs on sample data stored in this browser.
            </p>
            <div className="mt-2 flex flex-wrap gap-2">
              <Button type="button" size="sm" variant="outline" onClick={() => fillDemo(DEMO_ADMIN.email, DEMO_ADMIN.password)}>
                Use admin login
              </Button>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => fillDemo(DEMO_AFFILIATE.email, DEMO_AFFILIATE.password)}
              >
                Use affiliate login
              </Button>
            </div>
          </div>
        ) : null}
      </form>
    </AuthShell>
  );
}
