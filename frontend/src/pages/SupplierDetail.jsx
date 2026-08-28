import * as React from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft,
  Building2,
  Mail,
  MapPin,
  Pencil,
  Phone,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";

import { EmptyState, ErrorState } from "@/components/EmptyState";
import { Metric, PageHeader } from "@/components/PageHeader";
import { Pagination } from "@/components/Pagination";
import { StockStatusBadge } from "@/components/StatusBadge";
import { StockCell } from "@/components/StockMeter";
import { SupplierFormDialog } from "@/components/suppliers/SupplierFormDialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ConfirmDialog } from "@/components/ui/alert-dialog";
import { Skeleton, TableSkeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  useDeleteSupplier,
  useSupplier,
  useSupplierPurchases,
} from "@/hooks/queries";
import { formatDate, money, number } from "@/lib/utils";

export default function SupplierDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [editOpen, setEditOpen] = React.useState(false);
  const [deleteOpen, setDeleteOpen] = React.useState(false);
  const [page, setPage] = React.useState(1);
  const [perPage, setPerPage] = React.useState(10);

  const detail = useSupplier(id);
  const purchases = useSupplierPurchases(id, { page, per_page: perPage });
  const remove = useDeleteSupplier();

  const supplier = detail.data?.supplier;
  const stats = detail.data?.stats;
  const products = detail.data?.products ?? [];

  const confirmDelete = async () => {
    try {
      const response = await remove.mutateAsync(Number(id));
      toast.success(response.data?.message ?? "Supplier deleted.");
      navigate("/suppliers", { replace: true });
    } catch (error) {
      toast.error(error.message);
      setDeleteOpen(false);
    }
  };

  if (detail.isError) {
    return (
      <Card>
        <ErrorState error={detail.error} onRetry={detail.refetch} />
        <div className="flex justify-center pb-8">
          <Button variant="outline" size="sm" asChild>
            <Link to="/suppliers">
              <ArrowLeft />
              Back to suppliers
            </Link>
          </Button>
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-5">
      <Button variant="ghost" size="sm" className="-ml-2" asChild>
        <Link to="/suppliers">
          <ArrowLeft />
          All suppliers
        </Link>
      </Button>

      {detail.isLoading ? (
        <Skeleton className="h-24" />
      ) : (
        <PageHeader eyebrow="Supplier" title={supplier.name}>
          <Button variant="outline" size="sm" onClick={() => setEditOpen(true)}>
            <Pencil />
            Edit
          </Button>
          <Button variant="outline" size="sm" onClick={() => setDeleteOpen(true)}>
            <Trash2 />
            Delete
          </Button>
        </PageHeader>
      )}

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,320px)]">
        {/* ------------------------------------------------ products & history */}
        <Card className="min-w-0">
          <Tabs defaultValue="products">
            <div className="border-b border-border px-4 pt-4">
              <TabsList>
                <TabsTrigger value="products">
                  Products
                  {products.length > 0 && (
                    <span className="num ml-1.5 text-muted-foreground">
                      {number(products.length)}
                    </span>
                  )}
                </TabsTrigger>
                <TabsTrigger value="purchases">
                  Purchase history
                  {stats?.purchase_count > 0 && (
                    <span className="num ml-1.5 text-muted-foreground">
                      {number(stats.purchase_count)}
                    </span>
                  )}
                </TabsTrigger>
              </TabsList>
            </div>

            <TabsContent value="products" className="mt-0">
              {detail.isLoading ? (
                <TableSkeleton rows={5} columns={4} />
              ) : products.length === 0 ? (
                <EmptyState
                  title="No products from this supplier yet"
                  description="Link a product to this supplier when you create or edit it."
                  action={
                    <Button variant="outline" size="sm" asChild className="mt-1">
                      <Link to="/products">Go to products</Link>
                    </Button>
                  }
                />
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow className="hover:bg-transparent">
                      <TableHead>Product</TableHead>
                      <TableHead className="hidden sm:table-cell">Category</TableHead>
                      <TableHead align="right">Cost</TableHead>
                      <TableHead align="right">In stock</TableHead>
                      <TableHead className="hidden md:table-cell">Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {products.map((product) => (
                      <TableRow key={product.id}>
                        <TableCell>
                          <Link
                            to={`/products?search=${encodeURIComponent(product.sku)}`}
                            className="block max-w-[220px] truncate text-[13px] font-medium underline-offset-2 hover:underline"
                          >
                            {product.name}
                          </Link>
                          <span className="num text-[11.5px] text-muted-foreground">
                            {product.sku}
                          </span>
                        </TableCell>
                        <TableCell className="hidden sm:table-cell">
                          <span className="text-[13px] text-muted-foreground">
                            {product.category?.name ?? "—"}
                          </span>
                        </TableCell>
                        <TableCell align="right">
                          <span className="num text-[13px]">
                            {money(product.cost_price)}
                          </span>
                        </TableCell>
                        <TableCell align="right">
                          <StockCell
                            quantity={product.quantity}
                            reorderLevel={product.reorder_level}
                            status={product.stock_status}
                            className="ml-auto"
                          />
                        </TableCell>
                        <TableCell className="hidden md:table-cell">
                          <StockStatusBadge status={product.stock_status} />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </TabsContent>

            <TabsContent value="purchases" className="mt-0">
              {purchases.isError ? (
                <ErrorState error={purchases.error} onRetry={purchases.refetch} />
              ) : purchases.isLoading ? (
                <TableSkeleton rows={5} columns={5} />
              ) : (purchases.data?.items ?? []).length === 0 ? (
                <EmptyState
                  title="Nothing received from them yet"
                  description="Record a purchase against this supplier and it will appear here."
                  action={
                    <Button variant="outline" size="sm" asChild className="mt-1">
                      <Link to="/purchases?new=1">Record a purchase</Link>
                    </Button>
                  }
                />
              ) : (
                <>
                  <Table>
                    <TableHeader>
                      <TableRow className="hover:bg-transparent">
                        <TableHead>Reference</TableHead>
                        <TableHead>Product</TableHead>
                        <TableHead align="right">Qty</TableHead>
                        <TableHead align="right">Unit cost</TableHead>
                        <TableHead align="right">Total</TableHead>
                        <TableHead align="right" className="hidden sm:table-cell">
                          Date
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {purchases.data.items.map((line) => (
                        <TableRow key={line.id}>
                          <TableCell>
                            <span className="num text-[12.5px] font-medium">
                              {line.reference_no}
                            </span>
                          </TableCell>
                          <TableCell>
                            <span className="block max-w-[200px] truncate text-[13px]">
                              {line.product?.name ?? "—"}
                            </span>
                          </TableCell>
                          <TableCell align="right">
                            <span className="num text-[13px]">{number(line.quantity)}</span>
                          </TableCell>
                          <TableCell align="right">
                            <span className="num text-[13px]">{money(line.cost_price)}</span>
                          </TableCell>
                          <TableCell align="right">
                            <span className="num text-[13px] font-medium">
                              {money(line.line_total)}
                            </span>
                          </TableCell>
                          <TableCell align="right" className="hidden sm:table-cell">
                            <span className="text-[12.5px] text-muted-foreground">
                              {formatDate(line.purchase_date)}
                            </span>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                    {stats && (
                      <TableFooter>
                        <TableRow className="hover:bg-transparent">
                          <TableCell colSpan={4} className="text-[12.5px] text-muted-foreground">
                            Lifetime received
                          </TableCell>
                          <TableCell align="right">
                            <span className="num text-[13px] font-semibold">
                              {money(stats.total_purchased_value)}
                            </span>
                          </TableCell>
                          <TableCell className="hidden sm:table-cell" />
                        </TableRow>
                      </TableFooter>
                    )}
                  </Table>

                  <Pagination
                    meta={purchases.data.meta}
                    onPageChange={setPage}
                    onPageSizeChange={(size) => {
                      setPerPage(size);
                      setPage(1);
                    }}
                  />
                </>
              )}
            </TabsContent>
          </Tabs>
        </Card>

        {/* ------------------------------------------------------------ aside */}
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>At a glance</CardTitle>
            </CardHeader>
            <CardContent>
              {detail.isLoading ? (
                <Skeleton className="h-24" />
              ) : (
                <dl className="grid grid-cols-2 gap-5">
                  <Metric label="Products" value={number(stats.product_count)} />
                  <Metric label="Purchases" value={number(stats.purchase_count)} />
                  <Metric
                    label="Received value"
                    value={money(stats.total_purchased_value)}
                    className="col-span-2"
                    hint="At the cost recorded on each purchase."
                  />
                </dl>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Contact</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {detail.isLoading ? (
                <Skeleton className="h-20" />
              ) : (
                <>
                  <ContactRow icon={Building2} label="Contact person">
                    {supplier.contact_person || "—"}
                  </ContactRow>
                  <ContactRow icon={Phone} label="Phone">
                    {supplier.phone ? (
                      <a href={`tel:${supplier.phone}`} className="num hover:text-primary">
                        {supplier.phone}
                      </a>
                    ) : (
                      "—"
                    )}
                  </ContactRow>
                  <ContactRow icon={Mail} label="Email">
                    {supplier.email ? (
                      <a
                        href={`mailto:${supplier.email}`}
                        className="num break-all hover:text-primary"
                      >
                        {supplier.email}
                      </a>
                    ) : (
                      "—"
                    )}
                  </ContactRow>
                  <ContactRow icon={MapPin} label="Address">
                    <span className="whitespace-pre-line">{supplier.address || "—"}</span>
                  </ContactRow>
                  <p className="border-t border-border pt-3 text-[11.5px] text-muted-foreground">
                    Added {formatDate(supplier.created_at)}
                  </p>
                </>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      <SupplierFormDialog
        open={editOpen}
        onOpenChange={setEditOpen}
        supplier={supplier}
      />

      <ConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title={`Delete "${supplier?.name ?? "this supplier"}"?`}
        description="The supplier is removed. Products they supply keep their stock but lose the link."
        consequence={
          stats?.product_count > 0
            ? `${number(stats.product_count)} product${
                stats.product_count === 1 ? "" : "s"
              } are linked to this supplier.`
            : undefined
        }
        confirmLabel="Delete supplier"
        loading={remove.isPending}
        onConfirm={confirmDelete}
      />
    </div>
  );
}

function ContactRow({ icon: Icon, label, children }) {
  return (
    <div className="flex gap-2.5">
      <Icon className="mt-0.5 size-3.5 shrink-0 text-muted-foreground" aria-hidden="true" />
      <div className="min-w-0">
        <p className="text-[11px] font-semibold uppercase tracking-[0.07em] text-muted-foreground">
          {label}
        </p>
        <p className="mt-0.5 text-[13px] leading-relaxed">{children}</p>
      </div>
    </div>
  );
}
