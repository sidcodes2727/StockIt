import * as React from "react";
import { Link } from "react-router-dom";
import {
  ArrowDownLeft,
  Building2,
  MoreHorizontal,
  Plus,
  Search,
  ShoppingCart,
  X,
} from "lucide-react";

import { EmptyState, ErrorState } from "@/components/EmptyState";
import { PageHeader } from "@/components/PageHeader";
import { Pagination } from "@/components/Pagination";
import { SearchInput } from "@/components/SearchInput";
import { PurchaseFormDialog } from "@/components/purchases/PurchaseFormDialog";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
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
import { usePurchases, useSupplierOptions } from "@/hooks/queries";
import { useTableParams } from "@/hooks/useTableParams";
import { formatDate, money, number, relativeTime } from "@/lib/utils";

const DEFAULTS = {
  search: "",
  supplier_id: "all",
  sort_by: "purchase_date",
  sort_dir: "desc",
  page: 1,
  per_page: 25,
};

export default function Purchases() {
  const { params, setParams, reset, isFiltered } = useTableParams(DEFAULTS);
  const [formOpen, setFormOpen] = React.useState(false);

  const purchases = usePurchases(params);
  const suppliers = useSupplierOptions();

  const items = purchases.data?.items ?? [];
  const meta = purchases.data?.meta;
  const summary = purchases.data?.summary;

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Transactions"
        title="Purchases"
        description="Every stock intake, logged by date and supplier."
      >
        <Button size="sm" onClick={() => setFormOpen(true)}>
          <Plus />
          Record purchase
        </Button>
      </PageHeader>

      <Card>
        <div className="flex flex-col gap-2.5 border-b border-border p-4 lg:flex-row lg:items-center">
          <SearchInput
            value={params.search}
            onChange={(value) => setParams({ search: value })}
            placeholder="Search reference number…"
            className="lg:max-w-sm lg:flex-1"
          />

          <div className="flex flex-wrap items-center gap-2.5">
            <Select
              value={params.supplier_id}
              onValueChange={(value) => setParams({ supplier_id: value })}
            >
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Supplier" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All suppliers</SelectItem>
                {(suppliers.data ?? []).map((s) => (
                  <SelectItem key={s.id} value={String(s.id)}>
                    {s.name}
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

          {summary && (
            <div className="ml-auto hidden items-center gap-4 text-[12.5px] lg:flex">
              <span className="text-muted-foreground">
                <span className="font-medium text-foreground">{number(summary.total_units)}</span>{" "}
                units
              </span>
              <span className="text-muted-foreground">
                <span className="font-medium text-foreground">{money(summary.total_value)}</span>{" "}
                spent
              </span>
            </div>
          )}
        </div>

        {purchases.isError ? (
          <ErrorState error={purchases.error} onRetry={purchases.refetch} />
        ) : purchases.isLoading ? (
          <TableSkeleton rows={8} columns={6} />
        ) : items.length === 0 ? (
          isFiltered ? (
            <EmptyState
              title="No purchases match those filters"
              description="Try a different search term or widen the supplier filter."
              actionLabel="Clear filters"
              onAction={reset}
            />
          ) : (
            <EmptyState
              icon={ArrowDownLeft}
              title="No purchases recorded"
              description="When you buy stock from suppliers, record it here to update your inventory quantities."
              actionLabel="Record purchase"
              onAction={() => setFormOpen(true)}
            />
          )
        ) : (
          <div className={purchases.isPlaceholderData ? "opacity-60 transition-opacity" : undefined}>
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <SortableHead
                    columnKey="reference_no"
                    sortBy={params.sort_by}
                    sortDir={params.sort_dir}
                    onSort={(key, dir) => setParams({ sort_by: key, sort_dir: dir })}
                  >
                    Reference
                  </SortableHead>
                  <TableHead className="hidden sm:table-cell">Supplier</TableHead>
                  <TableHead>Product</TableHead>
                  <SortableHead
                    columnKey="quantity"
                    align="right"
                    sortBy={params.sort_by}
                    sortDir={params.sort_dir}
                    onSort={(key, dir) => setParams({ sort_by: key, sort_dir: dir })}
                  >
                    Quantity
                  </SortableHead>
                  <TableHead align="right" className="hidden md:table-cell">Unit Cost</TableHead>
                  <SortableHead
                    columnKey="purchase_date"
                    align="right"
                    sortBy={params.sort_by}
                    sortDir={params.sort_dir}
                    onSort={(key, dir) => setParams({ sort_by: key, sort_dir: dir })}
                  >
                    Date
                  </SortableHead>
                </TableRow>
              </TableHeader>

              <TableBody>
                {items.map((purchase) => (
                  <TableRow key={purchase.id}>
                    <TableCell>
                      <div className="font-medium text-[13px]">{purchase.reference_no}</div>
                    </TableCell>

                    <TableCell className="hidden sm:table-cell">
                      {purchase.supplier ? (
                        <Link
                          to={`/suppliers/${purchase.supplier.id}`}
                          className="flex items-center gap-2 text-[13px] text-muted-foreground hover:text-foreground"
                        >
                          <Building2 className="size-3.5" />
                          <span className="truncate max-w-[160px]">{purchase.supplier.name}</span>
                        </Link>
                      ) : (
                        <span className="text-[13px] text-muted-foreground">—</span>
                      )}
                    </TableCell>

                    <TableCell>
                      <div className="min-w-0">
                        <span className="block max-w-[200px] truncate text-[13px] font-medium">
                          {purchase.product.name}
                        </span>
                        <span className="num block text-[11.5px] text-muted-foreground">
                          {purchase.product.sku}
                        </span>
                      </div>
                    </TableCell>

                    <TableCell align="right">
                      <span className="num text-[13px] font-medium">
                        {number(purchase.quantity)}
                      </span>
                    </TableCell>
                    
                    <TableCell align="right" className="hidden md:table-cell">
                      <span className="num text-[13px] text-muted-foreground">
                        {money(purchase.cost_price)}
                      </span>
                      <span className="block text-[11px] text-muted-foreground num">
                        Total {money(purchase.line_total)}
                      </span>
                    </TableCell>

                    <TableCell align="right">
                      <span className="text-[13px]" title={relativeTime(purchase.created_at)}>
                        {formatDate(purchase.purchase_date)}
                      </span>
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

      <PurchaseFormDialog open={formOpen} onOpenChange={setFormOpen} />
    </div>
  );
}
