import * as React from "react";
import { Link, useSearchParams } from "react-router-dom";
import {
  ArrowUpRight,
  MoreHorizontal,
  Plus,
  Receipt,
  ShoppingCart,
  X,
} from "lucide-react";

import { EmptyState, ErrorState } from "@/components/EmptyState";
import { PageHeader } from "@/components/PageHeader";
import { Pagination } from "@/components/Pagination";
import { SearchInput } from "@/components/SearchInput";
import { SaleFormDialog } from "@/components/sales/SaleFormDialog";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
import { useSales } from "@/hooks/queries";
import { useTableParams } from "@/hooks/useTableParams";
import { formatDate, money, number, relativeTime } from "@/lib/utils";

const DEFAULTS = {
  search: "",
  sort_by: "sale_date",
  sort_dir: "desc",
  page: 1,
  per_page: 25,
};

export default function Sales() {
  const { params, setParams, reset, isFiltered } = useTableParams(DEFAULTS);
  const [searchParams, setSearchParams] = useSearchParams();
  const [formOpen, setFormOpen] = React.useState(false);

  React.useEffect(() => {
    if (searchParams.get("new") === "1") {
      setFormOpen(true);
      const next = new URLSearchParams(searchParams);
      next.delete("new");
      setSearchParams(next, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  const sales = useSales(params);

  const items = sales.data?.items ?? [];
  const meta = sales.data?.meta;
  const summary = sales.data?.summary;

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Transactions"
        title="Sales"
        description="Every stock dispatch, grouped by invoice."
      >
        <Button size="sm" onClick={() => setFormOpen(true)}>
          <Plus />
          Record sale
        </Button>
      </PageHeader>

      <Card>
        <div className="flex flex-col gap-2.5 border-b border-border p-4 lg:flex-row lg:items-center">
          <SearchInput
            value={params.search}
            onChange={(value) => setParams({ search: value })}
            placeholder="Search invoice or customer…"
            className="lg:max-w-sm lg:flex-1"
          />

          <div className="flex flex-wrap items-center gap-2.5">
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
                units sold
              </span>
              <span className="text-muted-foreground">
                <span className="font-medium text-foreground">{money(summary.total_revenue)}</span>{" "}
                revenue
              </span>
            </div>
          )}
        </div>

        {sales.isError ? (
          <ErrorState error={sales.error} onRetry={sales.refetch} />
        ) : sales.isLoading ? (
          <TableSkeleton rows={8} columns={6} />
        ) : items.length === 0 ? (
          isFiltered ? (
            <EmptyState
              title="No sales match those filters"
              description="Try a different search term."
              actionLabel="Clear filters"
              onAction={reset}
            />
          ) : (
            <EmptyState
              icon={ArrowUpRight}
              title="No sales recorded"
              description="When you sell products to customers, record them here to deduct from your inventory."
              actionLabel="Record sale"
              onAction={() => setFormOpen(true)}
            />
          )
        ) : (
          <div className={sales.isPlaceholderData ? "opacity-60 transition-opacity" : undefined}>
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <SortableHead
                    columnKey="invoice_no"
                    sortBy={params.sort_by}
                    sortDir={params.sort_dir}
                    onSort={(key, dir) => setParams({ sort_by: key, sort_dir: dir })}
                  >
                    Invoice No
                  </SortableHead>
                  <SortableHead
                    columnKey="customer_name"
                    className="hidden sm:table-cell"
                    sortBy={params.sort_by}
                    sortDir={params.sort_dir}
                    onSort={(key, dir) => setParams({ sort_by: key, sort_dir: dir })}
                  >
                    Customer
                  </SortableHead>
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
                  <TableHead align="right" className="hidden md:table-cell">Unit Price</TableHead>
                  <SortableHead
                    columnKey="sale_date"
                    align="right"
                    sortBy={params.sort_by}
                    sortDir={params.sort_dir}
                    onSort={(key, dir) => setParams({ sort_by: key, sort_dir: dir })}
                  >
                    Date
                  </SortableHead>
                  <TableHead align="right" className="w-12">
                    <span className="sr-only">Actions</span>
                  </TableHead>
                </TableRow>
              </TableHeader>

              <TableBody>
                {items.map((sale) => (
                  <TableRow key={sale.id}>
                    <TableCell>
                      <Link
                        to={`/sales/invoice/${sale.invoice_no}`}
                        className="font-medium text-[13px] text-primary hover:underline"
                      >
                        {sale.invoice_no}
                      </Link>
                    </TableCell>

                    <TableCell className="hidden sm:table-cell">
                      <span className="text-[13px] text-muted-foreground">
                        {sale.customer_name || "—"}
                      </span>
                    </TableCell>

                    <TableCell>
                      <div className="min-w-0">
                        <span className="block max-w-[200px] truncate text-[13px] font-medium">
                          {sale.product?.name ?? "(deleted)"}
                        </span>
                        {sale.product?.sku && (
                          <span className="num block text-[11.5px] text-muted-foreground">
                            {sale.product.sku}
                          </span>
                        )}
                      </div>
                    </TableCell>

                    <TableCell align="right">
                      <span className="num text-[13px] font-medium">
                        {number(sale.quantity)}
                      </span>
                    </TableCell>
                    
                    <TableCell align="right" className="hidden md:table-cell">
                      <span className="num text-[13px] text-muted-foreground">
                        {money(sale.sale_price)}
                      </span>
                      <span className="block text-[11px] text-muted-foreground num">
                        Total {money(sale.line_total)}
                      </span>
                    </TableCell>

                    <TableCell align="right">
                      <span className="text-[13px]" title={relativeTime(sale.created_at)}>
                        {formatDate(sale.sale_date)}
                      </span>
                    </TableCell>

                    <TableCell align="right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon-sm">
                            <MoreHorizontal />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-44">
                          <DropdownMenuItem asChild>
                            <Link to={`/sales/invoice/${sale.invoice_no}`}>
                              <Receipt />
                              View invoice
                            </Link>
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
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

      <SaleFormDialog open={formOpen} onOpenChange={setFormOpen} />
    </div>
  );
}
