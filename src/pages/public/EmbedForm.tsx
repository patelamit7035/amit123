import { useEffect, useRef, useState } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { CheckCircle2, Loader2 } from "lucide-react";
import { LeadCaptureForm } from "@/components/affiliate/LeadCaptureForm";
import { getBackend } from "@/lib/data";
import { normalizeCode } from "@/lib/affiliate/codes";

/**
 * The bare form rendered inside the iframe that public/embed.js drops onto any
 * landing page. It reports its height to the host page so the iframe can resize
 * itself, and it carries the host page's URL through as the lead's source.
 */
export default function EmbedForm() {
  const { code = "" } = useParams();
  const [params] = useSearchParams();
  const normalized = normalizeCode(code);
  const [submitted, setSubmitted] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["resolve-link", normalized],
    queryFn: () => getBackend().resolveLink(normalized),
    enabled: Boolean(normalized),
    retry: false,
  });

  // The form sits in an iframe on someone else's page, so it must not paint a
  // background of its own over their design.
  useEffect(() => {
    if (typeof document === "undefined") return;
    const { documentElement, body } = document;
    const previous = [documentElement.style.background, body.style.background];
    documentElement.style.background = "transparent";
    body.style.background = "transparent";
    return () => {
      documentElement.style.background = previous[0];
      body.style.background = previous[1];
    };
  }, []);

  // Keep the host iframe exactly as tall as the form.
  useEffect(() => {
    const element = containerRef.current;
    if (!element || typeof window === "undefined" || window.parent === window) return;

    const report = () => {
      window.parent.postMessage(
        { type: "funnelos:resize", code: normalized, height: element.offsetHeight + 8 },
        "*",
      );
    };
    report();
    const observer = new ResizeObserver(report);
    observer.observe(element);
    return () => observer.disconnect();
  }, [normalized, submitted, isLoading, data]);

  const source = params.get("source") || "embed";

  return (
    <div ref={containerRef} className="bg-transparent p-1">
      {isLoading ? (
        <div className="flex items-center justify-center py-10">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      ) : !data ? (
        <p className="py-6 text-center text-sm text-muted-foreground">This form is not active right now.</p>
      ) : submitted ? (
        <div className="space-y-2 py-8 text-center">
          <CheckCircle2 className="mx-auto h-8 w-8 text-emerald-600" />
          <p className="font-medium">Thanks! We have your details.</p>
          <p className="text-sm text-muted-foreground">Our team will reach out on WhatsApp or email shortly.</p>
        </div>
      ) : (
        <LeadCaptureForm
          code={normalized}
          source={source}
          submitLabel="Send me the details"
          onSuccess={() => setSubmitted(true)}
        />
      )}
    </div>
  );
}
