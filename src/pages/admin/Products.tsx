import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, Package, Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { PageHeader } from "@/components/affiliate/PageHeader";
import { EmptyState } from "@/components/affiliate/EmptyState";
import { useDeleteProduct, useProducts, useSaveProduct, useSettings } from "@/hooks/useAffiliate";
import { productSchema, type ProductValues } from "@/lib/affiliate/validation";
import { formatMoney } from "@/lib/affiliate/money";
import { calcCommission } from "@/lib/affiliate/commission";
import type { Product } from "@/lib/affiliate/types";

const emptyProduct = (currency: string): ProductValues => ({
  name: "",
  description: "",
  price: 0,
  currency,
  commissionPercent: 20,
  landingUrl: "",
  active: true,
});

export default function AdminProducts() {
  const { data: settings } = useSettings();
  const { data: products = [], isLoading } = useProducts(true);
  const saveProduct = useSaveProduct();
  const deleteProduct = useDeleteProduct();
  const [editing, setEditing] = useState<Product | null>(null);
  const [open, setOpen] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<Product | null>(null);
  const currency = settings?.currency || "INR";

  const form = useForm<ProductValues>({
    resolver: zodResolver(productSchema),
    defaultValues: emptyProduct(currency),
  });

  useEffect(() => {
    if (!open) return;
    form.reset(
      editing
        ? {
            name: editing.name,
            description: editing.description,
            price: editing.price,
            currency: editing.currency,
            commissionPercent: editing.commissionPercent,
            landingUrl: editing.landingUrl,
            active: editing.active,
          }
        : emptyProduct(currency),
    );
  }, [editing, open, currency, form]);

  const watched = form.watch();

  const onSubmit = async (values: ProductValues) => {
    try {
      await saveProduct.mutateAsync({ id: editing?.id, values });
      toast.success(editing ? "Product updated" : "Product created");
      setOpen(false);
      setEditing(null);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not save the product");
    }
  };

  const onDelete = async () => {
    if (!pendingDelete) return;
    try {
      await deleteProduct.mutateAsync(pendingDelete.id);
      toast.success("Product deleted");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not delete the product");
    } finally {
      setPendingDelete(null);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Products"
        description="What your affiliates can promote, and the commission each sale pays them."
        actions={
          <Button
            onClick={() => {
              setEditing(null);
              setOpen(true);
            }}
          >
            <Plus className="mr-1.5 h-4 w-4" />
            Add product
          </Button>
        }
      />

      <Card>
        <CardContent className="p-4">
          {isLoading ? (
            <p className="py-8 text-center text-sm text-muted-foreground">Loading products…</p>
          ) : products.length === 0 ? (
            <EmptyState
              icon={Package}
              title="No products yet"
              description="Add your first product and every affiliate instantly gets their own link for it."
              action={
                <Button
                  onClick={() => {
                    setEditing(null);
                    setOpen(true);
                  }}
                >
                  Add product
                </Button>
              }
            />
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Product</TableHead>
                    <TableHead className="text-right">Price</TableHead>
                    <TableHead className="text-right">Commission</TableHead>
                    <TableHead className="hidden sm:table-cell text-right">Affiliate earns</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {products.map((product) => (
                    <TableRow key={product.id}>
                      <TableCell>
                        <div className="font-medium">{product.name}</div>
                        <div className="line-clamp-1 max-w-xs text-xs text-muted-foreground">{product.description}</div>
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {formatMoney(product.price, product.currency)}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">{product.commissionPercent}%</TableCell>
                      <TableCell className="hidden sm:table-cell text-right tabular-nums">
                        {formatMoney(calcCommission(product.price, product.commissionPercent), product.currency)}
                      </TableCell>
                      <TableCell>
                        <Badge variant={product.active ? "secondary" : "outline"}>
                          {product.active ? "Live" : "Hidden"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => {
                            setEditing(product);
                            setOpen(true);
                          }}
                        >
                          <Pencil className="h-3.5 w-3.5" />
                          <span className="sr-only">Edit {product.name}</span>
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => setPendingDelete(product)}>
                          <Trash2 className="h-3.5 w-3.5 text-destructive" />
                          <span className="sr-only">Delete {product.name}</span>
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit product" : "Add a product"}</DialogTitle>
            <DialogDescription>
              The commission percentage is what an affiliate earns on every sale you record against their lead.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4" noValidate>
            <div className="space-y-2">
              <Label htmlFor="name">Product name</Label>
              <Input id="name" {...form.register("name")} />
              {form.formState.errors.name ? (
                <p className="text-sm text-destructive">{form.formState.errors.name.message}</p>
              ) : null}
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea id="description" rows={3} {...form.register("description")} />
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              <div className="space-y-2">
                <Label htmlFor="price">Price</Label>
                <Input id="price" type="number" step="0.01" min="0" {...form.register("price")} />
                {form.formState.errors.price ? (
                  <p className="text-sm text-destructive">{form.formState.errors.price.message}</p>
                ) : null}
              </div>
              <div className="space-y-2">
                <Label htmlFor="currency">Currency</Label>
                <Input id="currency" className="uppercase" {...form.register("currency")} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="commissionPercent">Commission %</Label>
                <Input
                  id="commissionPercent"
                  type="number"
                  step="0.1"
                  min="0"
                  max="100"
                  {...form.register("commissionPercent")}
                />
                {form.formState.errors.commissionPercent ? (
                  <p className="text-sm text-destructive">{form.formState.errors.commissionPercent.message}</p>
                ) : null}
              </div>
            </div>

            <p className="rounded-md bg-muted/50 p-3 text-sm">
              An affiliate earns{" "}
              <strong>
                {formatMoney(
                  calcCommission(Number(watched.price) || 0, Number(watched.commissionPercent) || 0),
                  watched.currency || currency,
                )}
              </strong>{" "}
              per sale.
            </p>

            <div className="space-y-2">
              <Label htmlFor="landingUrl">Full sales page URL (optional)</Label>
              <Input id="landingUrl" placeholder="https://…" {...form.register("landingUrl")} />
              {form.formState.errors.landingUrl ? (
                <p className="text-sm text-destructive">{form.formState.errors.landingUrl.message}</p>
              ) : null}
            </div>

            <div className="flex items-center justify-between rounded-lg border p-3">
              <div>
                <Label htmlFor="active">Live</Label>
                <p className="text-xs text-muted-foreground">Hidden products stop accepting new leads.</p>
              </div>
              <Switch
                id="active"
                checked={watched.active}
                onCheckedChange={(checked) => form.setValue("active", checked)}
              />
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={saveProduct.isPending}>
                {saveProduct.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                {editing ? "Save changes" : "Create product"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={Boolean(pendingDelete)} onOpenChange={(value) => !value && setPendingDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {pendingDelete?.name}?</AlertDialogTitle>
            <AlertDialogDescription>
              This also removes every affiliate link for it. Products that already have leads cannot be deleted - hide
              them instead so the history stays intact.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={onDelete}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
