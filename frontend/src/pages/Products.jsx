import * as React from "react";
import { useSearchParams } from "react-router-dom";
import {
  Boxes,
  MoreHorizontal,
  Package,
  PackagePlus,
  Pencil,
  Scale,
  Trash2,
  Upload,
  X,
} from "lucide-react";
import { toast } from "sonner";

import { EmptyState, ErrorState } from "@/components/EmptyState";
import { PageHeader } from "@/components/PageHeader";
import { Pagination } from "@/components/Pagination";
import { SearchInput } from "@/components/SearchInput";
import { StockStatusBadge } from "@/components/StatusBadge";
import { StockCell } from "@/components/StockMeter";
import { ImportDialog } from "@/components/products/ImportDialog";
import { ProductFormDialog } from "@/components/products/ProductFormDialog";
import { StockAdjustDialog } from "@/components/products/StockAdjustDialog";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ConfirmDialog } from "@/components/ui/alert-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { TableSkeleton } from "@/components/ui/skeleton";
import {
  SortableHead,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useAuth } from "@/hooks/useAuth";
import { useCategories, useDeleteProduct, useProducts } from "@/hooks/queries";
import { useTableParams } from "@/hooks/useTableParams";
import { money, number } from "@/lib/utils";

const DEFAULTS = {
  search: "",
  category_id: "all",
  stock_status: "all",
  sort_by: "name",
  sort_dir: "asc",
  page: 1,
  per_page: 25,
};

const STATUS_OPTIONS = [
  { value: "all", label: "Any stock level" },
  { value: "in_stock", label: "In stock" },
  { value: "low_stock", label: "Low stock" },
  { value: "out_of_stock", label: "Out of stock" },
];

export default function Products() {
  const { isAdmin } = useAuth();
  const { params, setParams, reset, isFiltered } = useTableParams(DEFAULTS);
  const [searchParams, setSearchParams] = useSearchParams();

  const [formOpen, setFormOpen] = React.useState(false);
  const [editing, setEditing] = React.useState(null);
  const [adjusting, setAdjusting] = React.useState(null);
  const [importOpen, setImportOpen] = React.useState(false);
  const [pendingDelete, setPendingDelete] = React.useState(null);

  const products = useProducts(params);
  const categories = useCategories();
  const remove = useDeleteProduct();

  // `?new=1` from the dashboard's shortcut opens the form straight away.
  React.useEffect(() => {
    if (searchParams.get("new") !== "1") return;
    setEditing(null);
    setFormOpen(true);
    const next = new URLSearchParams(searchParams);
    next.delete("new");
    setSearchParams(next, { replace: true });
  }, [searchParams, setSearchParams]);

  const items = products.data?.items ?? [];
  const meta = products.data?.meta;

  const openCreate = () => {
    setEditing(null);
    setFormOpen(true);
  };

  const openEdit = (product) => {
    setEditing(product);
    setFormOpen(true);
  };

  const confirmDelete = async () => {
    const { product, force } = pendingDelete;
    try {
      const response = await remove.mutateAsync({ id: product.id, force });
      toast.success(response.data?.message ?? `"${product.name}" deleted.`);
      setPendingDelete(null);
    } catch (error) {
      // The server refuses to drop financial history silently. It reports the
      // counts, so the second pass can state the real blast radius.
      if (error.code === "HAS_TRANSACTIONS") {
        const purchases = error.details?.purchase_count ?? 0;
        const sales = error.details?.sale_count ?? 0;
        setPendingDelete({
          product,
          force: true,
          consequence: `This will also delete ${number(purchases)} purchase record${
            purchases === 1 ? "" : "s"
          } and ${number(sales)} sale record${sales === 1 ? "" : "s"}.`,
        });
        return;
      }
      toast.error(error.message);
      setPendingDelete(null);
    }
  };

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Catalogue"
        title="Products"
        description="Everything you stock, with each quantity measured against its own reorder level."
      >
        {isAdmin && (
          <Button variant="outline" size="sm" onClick={() => setImportOpen(true)}>
            <Upload />
            Import CSV
          </Button>
        )}
        <Button size="sm" onClick={openCreate}>
          <PackagePlus />
          Add product
        </Button>
      </PageHeader>

      <Card>
        {/* ------------------------------------------------------ filters */}
        <div className="flex flex-col gap-2.5 border-b border-border p-4 lg:flex-row lg:items-center">
          <SearchInput
            value={params.search}
            onChange={(value) => setParams({ search: value })}
            placeholder="Search name, SKU or description…"
            className="lg:max-w-sm lg:flex-1"
          />

          <div className="flex flex-wrap items-center gap-2.5">
            <Select
              value={params.category_id}
              onValueChange={(value) => setParams({ category_id: value })}
            >
              <SelectTrigger className="w-[168px]">
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All categories</SelectItem>
                {(categories.data ?? []).map((category) => (
                  <SelectItem key={category.id} value={String(category.id)}>
                    {category.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select
              value={params.stock_status}
              onValueChange={(value) => setParams({ stock_status: value })}
            >
              <SelectTrigger className="w-[164px]">
                <SelectValue placeholder="Stock level" />
              </SelectTrigger>
              <SelectContent>
                {STATUS_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {isFiltered && (
              <Button variant="ghost" size="sm" onClick={reset}>
                <X />
                Clear
              </Button>
            )}
          </div>

          {meta && (
            <p className="num ml-auto hidden shrink-0 text-[12.5px] text-muted-foreground lg:block">
              {number(meta.total)} product{meta.total === 1 ? "" : "s"}
            </p>
          )}
        </div>

        {/* -------------------------------------------------------- table */}
        {products.isError ? (
          <ErrorState error={products.error} onRetry={products.refetch} />
        ) : products.isLoading ? (
          <TableSkeleton rows={8} columns={6} />
        ) : items.length === 0 ? (
          isFiltered ? (
            <EmptyState
              title="No products match those filters"
              description="Try a different search term, or widen the category and stock-level filters."
              actionLabel="Clear filters"
              onAction={reset}
            />
          ) : (
            <EmptyState
              icon={Boxes}
              title="Your catalogue is empty"
              description="Add your first product, or import a whole spreadsheet at once."
              actionLabel="Add product"
              onAction={openCreate}
            />
          )
        ) : (
          <div className={products.isPlaceholderData ? "opacity-60 transition-opacity" : undefined}>
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <SortableHead
                    columnKey="name"
                    sortBy={params.sort_by}
                    sortDir={params.sort_dir}
                    onSort={(key, dir) => setParams({ sort_by: key, sort_dir: dir })}
                  >
                    Product
                  </SortableHead>
                  <TableHead className="hidden md:table-cell">Category</TableHead>
                  <TableHead className="hidden xl:table-cell">Supplier</TableHead>
                  <SortableHead
                    columnKey="unit_price"
                    align="right"
                    sortBy={params.sort_by}
                    sortDir={params.sort_dir}
                    onSort={(key, dir) => setParams({ sort_by: key, sort_dir: dir })}
                  >
                    Price
                  </SortableHead>
                  <SortableHead
                    columnKey="quantity"
                    align="right"
                    sortBy={params.sort_by}
                    sortDir={params.sort_dir}
                    onSort={(key, dir) => setParams({ sort_by: key, sort_dir: dir })}
                  >
                    In stock
                  </SortableHead>
                  <TableHead className="hidden sm:table-cell">Status</TableHead>
                  <TableHead align="right" className="w-12">
                    <span className="sr-only">Actions</span>
                  </TableHead>
                </TableRow>
              </TableHeader>

              <TableBody>
                {items.map((product) => (
                  <TableRow key={product.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <span className="flex size-8 shrink-0 items-center justify-center rounded-md border border-border bg-muted/60 text-muted-foreground">
                          <Package className="size-4" aria-hidden="true" />
                        </span>
                        <span className="min-w-0">
                          <span className="block max-w-[240px] truncate text-[13px] font-medium">
                            {product.name}
                          </span>
                          <span className="num block text-[11.5px] text-muted-foreground">
                            {product.sku}
                          </span>
                        </span>
                      </div>
                    </TableCell>

                    <TableCell className="hidden md:table-cell">
                      <span className="text-[13px] text-muted-foreground">
                        {product.category?.name ?? "—"}
                      </span>
                    </TableCell>

                    <TableCell className="hidden xl:table-cell">
                      <span className="block max-w-[160px] truncate text-[13px] text-muted-foreground">
                        {product.supplier?.name ?? "—"}
                      </span>
                    </TableCell>

                    <TableCell align="right">
                      <span className="num text-[13px] font-medium">
                        {money(product.unit_price)}
                      </span>
                      <span className="num block text-[11px] text-muted-foreground">
                        cost {money(product.cost_price)}
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

                    <TableCell className="hidden sm:table-cell">
                      <StockStatusBadge status={product.stock_status} />
                    </TableCell>

                    <TableCell align="right">
                      <RowActions
                        product={product}
                        onEdit={() => openEdit(product)}
                        onAdjust={() => setAdjusting(product)}
                        onDelete={() => setPendingDelete({ product, force: false })}
                      />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>

            <Pagination
              meta={meta}
              onPageChange={(page) => setParams({ page })}
              onPageSizeChange={(size) => setParams({ per_page: size, page: 1 })}
            />
          </div>
        )}
      </Card>

      <ProductFormDialog open={formOpen} onOpenChange={setFormOpen} product={editing} />
      <StockAdjustDialog
        open={Boolean(adjusting)}
        onOpenChange={(open) => !open && setAdjusting(null)}
        product={adjusting}
      />
      <ImportDialog open={importOpen} onOpenChange={setImportOpen} />

      <ConfirmDialog
        open={Boolean(pendingDelete)}
        onOpenChange={(open) => !open && setPendingDelete(null)}
        title={`Delete "${pendingDelete?.product.name}"?`}
        description={
          pendingDelete?.force
            ? "This product has transaction history. Deleting it removes that history too, which changes your past reports."
            : "The product will be removed from your catalogue. This can't be undone."
        }
        consequence={pendingDelete?.consequence}
        confirmLabel={pendingDelete?.force ? "Delete anyway" : "Delete product"}
        loading={remove.isPending}
        onConfirm={confirmDelete}
      />
    </div>
  );
}

function RowActions({ product, onEdit, onAdjust, onDelete }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon-sm" aria-label={`Actions for ${product.name}`}>
          <MoreHorizontal />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-44">
        <DropdownMenuItem onSelect={onEdit}>
          <Pencil />
          Edit details
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={onAdjust}>
          <Scale />
          Adjust stock
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem destructive onSelect={onDelete}>
          <Trash2 />
          Delete
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
