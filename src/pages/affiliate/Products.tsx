import { useEffect, useMemo, useRef, useState } from "react";
import { Code2, ExternalLink, Link2, MessageCircle, Package } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { PageHeader } from "@/components/affiliate/PageHeader";
import { CopyButton } from "@/components/affiliate/CopyButton";
import { EmptyState } from "@/components/affiliate/EmptyState";
import { useAuth } from "@/lib/auth/AuthProvider";
import { useEnsureLink, useLinks, useProducts, useSettings } from "@/hooks/useAffiliate";
import { buildEmbedSnippet, buildReferralUrl, buildWhatsAppShareUrl } from "@/lib/affiliate/codes";
import { formatMoney } from "@/lib/affiliate/money";
import type { Product } from "@/lib/affiliate/types";

export default function AffiliateProducts() {
  const { profile } = useAuth();
  const affiliateId = profile?.id;
  const { data: settings } = useSettings();
  const { data: products = [], isLoading } = useProducts();
  const { data: links = [] } = useLinks(affiliateId);
  const ensureLink = useEnsureLink();
  const [embedFor, setEmbedFor] = useState<Product | null>(null);
  const requested = useRef(new Set<string>());

  const baseUrl = settings?.publicBaseUrl || "";
  const linkByProduct = useMemo(
    () => new Map(links.map((link) => [link.productId, link])),
    [links],
  );

  // Mint a link for every product the affiliate does not have one for yet, so
  // the page is immediately useful with nothing to click.
  useEffect(() => {
    if (!affiliateId || isLoading) return;
    for (const product of products) {
      if (linkByProduct.has(product.id) || requested.current.has(product.id)) continue;
      requested.current.add(product.id);
      ensureLink.mutate({ affiliateId, productId: product.id });
    }
  }, [affiliateId, products, linkByProduct, ensureLink, isLoading]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Products & your links"
        description="Every product has its own link. Anyone who opens it and fills in the form is counted as your lead."
      />

      {products.length === 0 && !isLoading ? (
        <EmptyState
          icon={Package}
          title="No products are live yet"
          description="Once the admin publishes a product it shows up here with your personal link."
        />
      ) : null}

      <div className="grid gap-4 md:grid-cols-2">
        {products.map((product) => {
          const link = linkByProduct.get(product.id);
          const url = link ? buildReferralUrl(baseUrl, link.code) : "";
          const shareMessage = `${product.name} - have a look: ${url}`;

          return (
            <Card key={product.id} className="flex flex-col">
              <CardHeader>
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <CardTitle className="text-base">{product.name}</CardTitle>
                    <CardDescription className="mt-1 line-clamp-2">{product.description}</CardDescription>
                  </div>
                  <Badge variant="secondary" className="shrink-0">
                    {product.commissionPercent}% to you
                  </Badge>
                </div>
              </CardHeader>

              <CardContent className="mt-auto space-y-3">
                <div className="flex flex-wrap items-baseline gap-x-2 text-sm">
                  <span className="text-muted-foreground">Price</span>
                  <span className="font-medium">{formatMoney(product.price, product.currency)}</span>
                  <span className="text-muted-foreground">· you earn</span>
                  <span className="font-medium text-emerald-600 dark:text-emerald-400">
                    {formatMoney((product.price * product.commissionPercent) / 100, product.currency)}
                  </span>
                  <span className="text-muted-foreground">per sale</span>
                </div>

                {link ? (
                  <>
                    <div className="flex items-center gap-2">
                      <Input readOnly value={url} className="font-mono text-xs" onFocus={(e) => e.target.select()} />
                      <CopyButton value={url} label="Copy" />
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Button asChild size="sm" variant="secondary">
                        <a href={buildWhatsAppShareUrl(shareMessage)} target="_blank" rel="noreferrer">
                          <MessageCircle className="mr-1.5 h-3.5 w-3.5" />
                          Share on WhatsApp
                        </a>
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => setEmbedFor(product)}>
                        <Code2 className="mr-1.5 h-3.5 w-3.5" />
                        Embed the form
                      </Button>
                      <Button asChild size="sm" variant="ghost">
                        <a href={url} target="_blank" rel="noreferrer">
                          <ExternalLink className="mr-1.5 h-3.5 w-3.5" />
                          Preview
                        </a>
                      </Button>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {link.clicks} click{link.clicks === 1 ? "" : "s"} · code{" "}
                      <span className="font-mono">{link.code}</span>
                    </p>
                  </>
                ) : (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Link2 className="h-4 w-4 animate-pulse" />
                    Creating your link…
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Dialog open={Boolean(embedFor)} onOpenChange={(open) => !open && setEmbedFor(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Put this form on your own page</DialogTitle>
            <DialogDescription>
              Paste this snippet anywhere - WordPress, Webflow, Shopify or a plain HTML page. Every submission is
              credited to you.
            </DialogDescription>
          </DialogHeader>
          {embedFor ? (
            <div className="space-y-3">
              <Textarea
                readOnly
                rows={6}
                className="font-mono text-xs"
                value={buildEmbedSnippet(baseUrl, linkByProduct.get(embedFor.id)?.code || "")}
                onFocus={(event) => event.target.select()}
              />
              <CopyButton
                value={buildEmbedSnippet(baseUrl, linkByProduct.get(embedFor.id)?.code || "")}
                label="Copy the snippet"
                variant="default"
              />
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}
