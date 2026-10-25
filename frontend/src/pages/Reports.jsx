import * as React from "react";
import { FileSpreadsheet, FileText } from "lucide-react";
import { useSearchParams } from "react-router-dom";

import { EmptyState, ErrorState } from "@/components/EmptyState";
import { PageHeader } from "@/components/PageHeader";
import { StockStatusBadge } from "@/components/StatusBadge";
import { StockCell } from "@/components/StockMeter";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton, TableSkeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useReport, useExportReport } from "@/hooks/queries";
import { cn, formatDate, money, moneyCompact, number } from "@/lib/utils";

export default function Reports() {
  const [searchParams, setSearchParams] = useSearchParams();
  const currentTab = searchParams.get("tab") || "sales";

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Insight"
        title="Reports"
        description="Sales, purchases, valuation and restocking — each one exportable as CSV or PDF."
      />

      <Tabs value={currentTab} onValueChange={(tab) => setSearchParams({ tab })}>
        <div className="mb-4 overflow-x-auto">
          <TabsList>
            <TabsTrigger value="sales">Sales</TabsTrigger>
            <TabsTrigger value="purchases">Purchases</TabsTrigger>
            <TabsTrigger value="stock">Inventory valuation</TabsTrigger>
            <TabsTrigger value="low-stock">Low stock</TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="sales" className="m-0">
          <SalesReport />
        </TabsContent>
        <TabsContent value="purchases" className="m-0">
          <PurchasesReport />
        </TabsContent>
        <TabsContent value="stock" className="m-0">
          <StockReport />
        </TabsContent>
        <TabsContent value="low-stock" className="m-0">
          <LowStockReport />
        </TabsContent>
      </Tabs>
    </div>
  );
}

/* ------------------------------------------------------------------ reports */

function SalesReport() {
  const [groupBy, setGroupBy] = React.useState("day");
  const query = useReport("sales", { group_by: groupBy });
  const totals = query.data?.totals;
  const rows = query.data?.rows ?? [];
  const max = maxOf(rows, "revenue");

  const lead =
    groupBy === "day"
      ? { label: "Date", render: (row) => row.label }
      : groupBy === "product"
        ? { label: "Product", render: (row) => <ProductLabel name={row.label} sku={row.sku} /> }
        : { label: "Category", render: (row) => row.label };

  return (
    <ReportLayout
      title="Sales"
      range={query.data}
      query={query}
      actions={<ReportActions type="sales" params={{ group_by: groupBy }} />}
      filters={
        <GroupBy
          value={groupBy}
          onChange={setGroupBy}
          options={[
            ["day", "By day"],
            ["product", "By product"],
            ["category", "By category"],
          ]}
        />
      }
      kpis={
        totals && [
          ["Revenue", money(totals.total_revenue)],
          ["Invoices", number(totals.invoice_count)],
          ["Avg order", money(totals.average_order_value)],
          ["Per day", money(totals.average_daily_revenue)],
        ]
      }
      columns={[
        { ...lead, className: "font-medium" },
        groupBy === "day" && {
          label: "Invoices",
          align: "right",
          render: (r) => number(r.invoices),
        },
        { label: "Units", align: "right", render: (r) => number(r.units) },
        {
          label: "Revenue",
          align: "right",
          render: (r) => <BarCell value={r.revenue} max={max} />,
        },
      ]}
      footer={
        totals && [
          "Total",
          groupBy === "day" && number(totals.invoice_count),
          number(totals.total_units),
          money(totals.total_revenue),
        ]
      }
      rows={rows}
    />
  );
}

function PurchasesReport() {
  const [groupBy, setGroupBy] = React.useState("day");
  const query = useReport("purchases", { group_by: groupBy });
  const totals = query.data?.totals;
  const rows = query.data?.rows ?? [];
  const max = maxOf(rows, "cost");

  const lead =
    groupBy === "day"
      ? { label: "Date", render: (row) => row.label }
      : groupBy === "product"
        ? { label: "Product", render: (row) => <ProductLabel name={row.label} sku={row.sku} /> }
        : { label: "Supplier", render: (row) => row.label };

  return (
    <ReportLayout
      title="Purchases"
      range={query.data}
      query={query}
      actions={<ReportActions type="purchases" params={{ group_by: groupBy }} />}
      filters={
        <GroupBy
          value={groupBy}
          onChange={setGroupBy}
          options={[
            ["day", "By day"],
            ["supplier", "By supplier"],
            ["product", "By product"],
          ]}
        />
      }
      kpis={
        totals && [
          ["Total spend", money(totals.total_cost)],
          ["Purchases", number(totals.purchase_count)],
          ["Units received", number(totals.total_units)],
          ["Per day", money(totals.days ? totals.total_cost / totals.days : 0)],
        ]
      }
      columns={[
        { ...lead, className: "font-medium" },
        { label: "Units", align: "right", render: (r) => number(r.units) },
        { label: "Cost", align: "right", render: (r) => <BarCell value={r.cost} max={max} /> },
      ]}
      footer={totals && ["Total", number(totals.total_units), money(totals.total_cost)]}
      rows={rows}
    />
  );
}

function StockReport() {
  const query = useReport("stock", {});
  const totals = query.data?.totals;

  return (
    <ReportLayout
      title="Inventory valuation"
      query={query}
      actions={<ReportActions type="stock" params={{}} />}
      kpis={
        totals && [
          ["Value at cost", money(totals.total_stock_value)],
          ["Value at retail", money(totals.total_retail_value)],
          ["Potential margin", money(totals.potential_margin), "success"],
          ["Units on hand", number(totals.total_units)],
        ]
      }
      columns={[
        { label: "Product", render: (r) => <ProductLabel name={r.name} sku={r.sku} /> },
        { label: "Category", className: "text-muted-foreground", render: (r) => r.category ?? "—" },
        {
          label: "In stock",
          align: "right",
          render: (r) => (
            <StockCell
              quantity={r.quantity}
              reorderLevel={r.reorder_level}
              status={r.stock_status}
              className="ml-auto"
            />
          ),
        },
        { label: "At cost", align: "right", render: (r) => money(r.stock_value) },
        { label: "At retail", align: "right", render: (r) => money(r.retail_value) },
      ]}
      footer={
        totals && [
          `${number(totals.product_count)} products`,
          "",
          number(totals.total_units),
          money(totals.total_stock_value),
          money(totals.total_retail_value),
        ]
      }
      rows={query.data?.rows ?? []}
    />
  );
}

function LowStockReport() {
  const query = useReport("low-stock", {});
  const totals = query.data?.totals;

  return (
    <ReportLayout
      title="Restock list"
      query={query}
      actions={<ReportActions type="low-stock" params={{}} />}
      kpis={
        totals && [
          [
            "Items to restock",
            number(totals.item_count),
            totals.item_count ? "warning" : undefined,
          ],
          [
            "Out of stock",
            number(totals.out_of_stock_count),
            totals.out_of_stock_count ? "destructive" : undefined,
          ],
          ["Units short", number(totals.total_shortfall_units)],
          ["Restock cost", money(totals.estimated_restock_cost)],
        ]
      }
      empty={{
        title: "Nothing to restock",
        description: "Every product is above its reorder level.",
      }}
      columns={[
        { label: "Product", render: (r) => <ProductLabel name={r.name} sku={r.sku} /> },
        {
          label: "Supplier",
          render: (r) => (
            <span className="block">
              <span className="block text-[13px]">{r.supplier ?? "—"}</span>
              {r.supplier_phone && (
                <a
                  href={`tel:${r.supplier_phone.replace(/\s+/g, "")}`}
                  className="num block text-[11.5px] text-muted-foreground hover:text-primary"
                >
                  {r.supplier_phone}
                </a>
              )}
            </span>
          ),
        },
        {
          label: "In stock",
          align: "right",
          render: (r) => (
            <StockCell
              quantity={r.quantity}
              reorderLevel={r.reorder_level}
              status={r.stock_status}
              className="ml-auto"
            />
          ),
        },
        { label: "Status", render: (r) => <StockStatusBadge status={r.stock_status} /> },
        {
          label: "Shortfall",
          align: "right",
          className: "font-semibold text-destructive",
          render: (r) => number(r.shortfall),
        },
        { label: "Restock cost", align: "right", render: (r) => money(r.restock_cost) },
      ]}
      rows={query.data?.rows ?? []}
    />
  );
}

/* --------------------------------------------------------------- building blocks */

function ReportLayout({
  title,
  range,
  query,
  actions,
  filters,
  kpis,
  columns,
  footer,
  rows,
  empty,
}) {
  const cols = columns.filter(Boolean);
  const footCells = footer?.filter((cell) => cell !== false);

  if (query.isError) {
    return (
      <Card>
        <ErrorState error={query.error} onRetry={query.refetch} />
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Headline figures, straight from the report's own totals. */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {query.isLoading || !kpis
          ? Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-[84px] rounded-xl" />
            ))
          : kpis.map(([label, value, tone], index) => (
              <Card
                key={label}
                className="lift animate-fade-in-up p-4"
                style={{ animationDelay: `${index * 50}ms` }}
              >
                <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-muted-foreground">
                  {label}
                </p>
                <p
                  className={cn(
                    "num mt-2 truncate text-[20px] font-semibold tracking-[-0.03em]",
                    tone === "success" && "text-success",
                    tone === "warning" && "text-warning",
                    tone === "destructive" && "text-destructive",
                  )}
                >
                  {value}
                </p>
              </Card>
            ))}
      </div>

      <Card className="overflow-hidden">
        <div className="flex flex-col gap-3 border-b border-border p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap items-center gap-3">
            <div>
              <h3 className="text-[15px] font-semibold tracking-[-0.015em]">{title}</h3>
              <p className="num text-[11.5px] text-muted-foreground">
                {range?.start_date
                  ? `${formatDate(range.start_date)} – ${formatDate(range.end_date)}`
                  : `As of ${formatDate(new Date())}`}
              </p>
            </div>
            {filters}
          </div>
          {actions}
        </div>

        {query.isLoading ? (
          <TableSkeleton rows={8} columns={cols.length} />
        ) : rows.length === 0 ? (
          <EmptyState
            title={empty?.title ?? "No data in this period"}
            description={
              empty?.description ?? "Once transactions are recorded they'll be summarised here."
            }
          />
        ) : (
          <div
            className={cn(
              "max-h-[620px] overflow-auto",
              query.isPlaceholderData && "opacity-60 transition-opacity",
            )}
          >
            <Table>
              <TableHeader className="sticky top-0 z-10 bg-card/95 backdrop-blur">
                <TableRow className="hover:bg-transparent">
                  {cols.map((col) => (
                    <TableHead key={col.label} align={col.align}>
                      {col.label}
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((row, i) => (
                  <TableRow key={row.key ?? row.sku ?? row.id ?? i}>
                    {cols.map((col) => (
                      <TableCell
                        key={col.label}
                        align={col.align}
                        className={cn("text-[13px]", col.align === "right" && "num", col.className)}
                      >
                        {col.render(row)}
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableBody>
              {footCells && (
                <TableFooter className="sticky bottom-0 bg-muted/90 backdrop-blur">
                  <TableRow className="hover:bg-transparent">
                    {footCells.map((cell, i) => (
                      <TableCell
                        key={i}
                        align={cols[i]?.align}
                        className={cn(
                          "text-[13px] font-semibold",
                          cols[i]?.align === "right" && "num",
                        )}
                      >
                        {cell}
                      </TableCell>
                    ))}
                  </TableRow>
                </TableFooter>
              )}
            </Table>
          </div>
        )}
      </Card>
    </div>
  );
}

/** The amount, with a bar behind it scaled to the largest row — rank at a glance. */
function BarCell({ value, max }) {
  const pct = max > 0 ? ((Number(value) || 0) / max) * 100 : 0;
  return (
    <div className="ml-auto flex w-full max-w-[220px] items-center justify-end gap-3">
      <div className="hidden h-1.5 flex-1 overflow-hidden rounded-full bg-muted sm:block">
        <div
          className="h-full origin-left animate-bar-grow rounded-full bg-gradient-to-r from-primary/50 to-primary"
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="w-[96px] shrink-0 text-right font-medium" title={money(value)}>
        {moneyCompact(value)}
      </span>
    </div>
  );
}

function ProductLabel({ name, sku }) {
  return (
    <span className="block min-w-0">
      <span className="block max-w-[260px] truncate text-[13px] font-medium">{name}</span>
      {sku && <span className="num block text-[11.5px] text-muted-foreground">{sku}</span>}
    </span>
  );
}

function GroupBy({ value, onChange, options }) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger size="sm" className="w-[140px]">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {options.map(([optionValue, label]) => (
          <SelectItem key={optionValue} value={optionValue}>
            {label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

function ReportActions({ type, params }) {
  const exporter = useExportReport();
  const pending = exporter.isPending ? exporter.variables?.format : null;

  return (
    <div className="flex items-center gap-2">
      <Button
        variant="outline"
        size="sm"
        loading={pending === "csv"}
        disabled={Boolean(pending)}
        onClick={() => exporter.mutate({ type, params, format: "csv" })}
      >
        {pending !== "csv" && <FileSpreadsheet />}
        CSV
      </Button>
      <Button
        variant="outline"
        size="sm"
        loading={pending === "pdf"}
        disabled={Boolean(pending)}
        onClick={() => exporter.mutate({ type, params, format: "pdf" })}
      >
        {pending !== "pdf" && <FileText />}
        PDF
      </Button>
    </div>
  );
}

function maxOf(rows, key) {
  return rows.reduce((max, row) => Math.max(max, Number(row[key]) || 0), 0);
}
