import { Link } from "react-router-dom";
import { ArrowRight, BarChart3, BadgeIndianRupee, Link2, ShieldCheck, Users, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useAuth } from "@/lib/auth/AuthProvider";
import { useSettings } from "@/hooks/useAffiliate";
import { isDemoMode } from "@/lib/data";

const STEPS = [
  {
    icon: Link2,
    title: "Get your link",
    body: "Every product in the program gives you your own link and an embeddable form you can drop on any page.",
  },
  {
    icon: Users,
    title: "Share it anywhere",
    body: "WhatsApp, Instagram, email, your own landing page. Anyone who fills in the form becomes your lead.",
  },
  {
    icon: BarChart3,
    title: "Watch your leads",
    body: "Name, email and number land in your dashboard instantly - and you can export the whole list.",
  },
  {
    icon: BadgeIndianRupee,
    title: "Get paid",
    body: "When a lead buys, your commission is calculated and transferred to your bank a week later.",
  },
];

export default function Home() {
  const { profile } = useAuth();
  const { data: settings } = useSettings();
  const brand = settings?.brandName || "FunnelOS";

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <Zap className="h-4 w-4" />
            </div>
            <span className="font-semibold">{brand} Affiliates</span>
          </div>
          <div className="flex items-center gap-2">
            {profile ? (
              <Button asChild size="sm">
                <Link to={profile.role === "admin" ? "/admin" : "/app"}>Go to dashboard</Link>
              </Button>
            ) : (
              <>
                <Button asChild size="sm" variant="ghost">
                  <Link to="/login">Sign in</Link>
                </Button>
                <Button asChild size="sm">
                  <Link to="/register">Join the program</Link>
                </Button>
              </>
            )}
          </div>
        </div>
      </header>

      <main>
        <section className="mx-auto max-w-6xl px-4 py-16 md:py-24">
          <div className="max-w-2xl">
            <h1 className="text-4xl font-bold tracking-tight md:text-5xl">
              Earn a commission on every {brand} customer you bring in
            </h1>
            <p className="mt-5 text-lg text-muted-foreground">
              Share your link, capture leads with a form you can put on any page, and get paid a week after every sale.
              Your leads, your numbers and your payouts, all in one dashboard.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Button asChild size="lg">
                <Link to={profile ? "/app" : "/register"}>
                  {profile ? "Open my dashboard" : "Become an affiliate"}
                  <ArrowRight className="ml-1.5 h-4 w-4" />
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline">
                <Link to="/login">I already have an account</Link>
              </Button>
            </div>
            {isDemoMode ? (
              <p className="mt-4 text-sm text-muted-foreground">
                Running in demo mode - sign in with the sample accounts on the login page to explore everything.
              </p>
            ) : null}
          </div>
        </section>

        <section className="border-y bg-muted/30">
          <div className="mx-auto grid max-w-6xl gap-6 px-4 py-14 sm:grid-cols-2 lg:grid-cols-4">
            {STEPS.map((step) => (
              <Card key={step.title} className="border-0 bg-background/60 shadow-none">
                <CardContent className="p-5">
                  <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <step.icon className="h-4.5 w-4.5" />
                  </div>
                  <h3 className="font-semibold">{step.title}</h3>
                  <p className="mt-1.5 text-sm text-muted-foreground">{step.body}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-4 py-16">
          <div className="grid gap-8 md:grid-cols-2">
            <div>
              <h2 className="text-2xl font-semibold tracking-tight">Everything is tracked, nothing is guesswork</h2>
              <ul className="mt-5 space-y-3 text-sm text-muted-foreground">
                {[
                  "A unique link per product, so you always know which offer is working",
                  "Live lead count with name, email and phone - exportable as CSV any time",
                  "Commission calculated from the real sale amount, not an estimate",
                  "A clear payout date on every commission you earn",
                ].map((line) => (
                  <li key={line} className="flex items-start gap-2">
                    <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
                    <span>{line}</span>
                  </li>
                ))}
              </ul>
            </div>
            <Card>
              <CardContent className="space-y-3 p-6">
                <h3 className="font-semibold">Ready in two minutes</h3>
                <p className="text-sm text-muted-foreground">
                  Register with your bank details, copy your first link and start sharing. There is nothing to install.
                </p>
                <Button asChild className="w-full">
                  <Link to="/register">Create my affiliate account</Link>
                </Button>
              </CardContent>
            </Card>
          </div>
        </section>
      </main>

      <footer className="border-t">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-2 px-4 py-6 text-sm text-muted-foreground sm:flex-row">
          <span>© {new Date().getFullYear()} {brand}</span>
          <Link to="/login" className="hover:text-foreground">
            Affiliate sign in
          </Link>
        </div>
      </footer>
    </div>
  );
}
