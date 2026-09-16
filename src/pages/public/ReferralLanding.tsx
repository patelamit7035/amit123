import { useEffect, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { CheckCircle2, Loader2, MessageCircle, ShieldCheck, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { LeadCaptureForm } from "@/components/affiliate/LeadCaptureForm";
import { getBackend } from "@/lib/data";
import { buildWhatsAppChatUrl, normalizeCode } from "@/lib/affiliate/codes";
import { formatMoney } from "@/lib/affiliate/money";

/** The page an affiliate's audience lands on: the offer plus the lead form. */
export default function ReferralLanding() {
  const { code = "" } = useParams();
  const normalized = normalizeCode(code);
  const [submitted, setSubmitted] = useState(false);
  const clickRecorded = useRef("");

  const { data, isLoading } = useQuery({
    queryKey: ["resolve-link", normalized],
    queryFn: () => getBackend().resolveLink(normalized),
    enabled: Boolean(normalized),
    retry: false,
  });

  useEffect(() => {
    // One click per visit, even under React's double-invoked effects.
    if (!data || clickRecorded.current === normalized) return;
    clickRecorded.current = normalized;
    void getBackend().registerClick(normalized);
  }, [data, normalized]);

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-3 px-4 text-center">
        <h1 className="text-2xl font-semibold">This link is not active</h1>
        <p className="max-w-md text-muted-foreground">
          The offer behind this link may have been closed. Ask the person who shared it for an updated link.
        </p>
        <Button asChild variant="outline">
          <Link to="/">Go to the homepage</Link>
        </Button>
      </div>
    );
  }

  const { product, affiliate, settings } = data;
  const brand = settings.brandName || "FunnelOS";

  return (
    <div className="min-h-screen bg-gradient-to-b from-muted/40 to-background">
      <div className="mx-auto max-w-5xl px-4 py-10 md:py-16">
        <div className="mb-8 flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <Zap className="h-4 w-4" />
          </div>
          <span className="font-semibold">{brand}</span>
        </div>

        <div className="grid gap-8 md:grid-cols-2 md:gap-12">
          <div>
            <p className="text-sm font-medium text-primary">Recommended by {affiliate.fullName}</p>
            <h1 className="mt-2 text-3xl font-bold tracking-tight md:text-4xl">{product.name}</h1>
            {product.description ? (
              <p className="mt-4 text-lg text-muted-foreground">{product.description}</p>
            ) : null}

            <ul className="mt-6 space-y-3 text-sm">
              {[
                "A specialist calls you back on WhatsApp or email",
                "A walkthrough of exactly how this works for your business",
                "No payment needed to get the details",
              ].map((line) => (
                <li key={line} className="flex items-start gap-2">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
                  <span>{line}</span>
                </li>
              ))}
            </ul>

            {product.price > 0 ? (
              <p className="mt-6 text-sm text-muted-foreground">
                Programme value{" "}
                <span className="font-semibold text-foreground">{formatMoney(product.price, product.currency)}</span>
              </p>
            ) : null}
          </div>

          <Card className="h-fit shadow-lg">
            {submitted ? (
              <CardContent className="space-y-4 py-10 text-center">
                <CheckCircle2 className="mx-auto h-10 w-10 text-emerald-600" />
                <div>
                  <h2 className="text-xl font-semibold">You are on the list</h2>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Check your inbox - we have sent you the details, and the {brand} team will reach out shortly.
                  </p>
                </div>
                {settings.whatsappNumber ? (
                  <Button asChild variant="outline">
                    <a
                      href={buildWhatsAppChatUrl(settings.whatsappNumber, `Hi, I just signed up for ${product.name}`)}
                      target="_blank"
                      rel="noreferrer"
                    >
                      <MessageCircle className="mr-2 h-4 w-4" />
                      Chat on WhatsApp now
                    </a>
                  </Button>
                ) : null}
                {product.landingUrl ? (
                  <Button asChild variant="ghost">
                    <a href={product.landingUrl} target="_blank" rel="noreferrer">
                      Continue to the full details
                    </a>
                  </Button>
                ) : null}
              </CardContent>
            ) : (
              <>
                <CardHeader>
                  <CardTitle>Get the details</CardTitle>
                  <CardDescription>Fill this in and we will be in touch within one business day.</CardDescription>
                </CardHeader>
                <CardContent>
                  <LeadCaptureForm code={normalized} source="referral-page" onSuccess={() => setSubmitted(true)} />
                  <p className="mt-4 flex items-center justify-center gap-1.5 text-xs text-muted-foreground">
                    <ShieldCheck className="h-3.5 w-3.5" />
                    Your details are never sold or shared.
                  </p>
                </CardContent>
              </>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}
