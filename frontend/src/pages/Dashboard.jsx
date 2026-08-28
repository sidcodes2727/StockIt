import * as React from "react";
import { Link } from "react-router-dom";
import {
  ArrowDownLeft,
  ArrowUpRight,
  Boxes,
  IndianRupee,
  PackageCheck,
  Plus,
  ShoppingCart,
  TrendingUp,
  TriangleAlert,
} from "lucide-react";

import { EmptyState, ErrorState } from "@/components/EmptyState";
import { PageHeader } from "@/components/PageHeader";
import { RangeToggle, SalesTrendChart } from "@/components/SalesTrendChart";
import { StatCard } from "@/components/StatCard";
import { StockStatusBadge } from "@/components/StatusBadge";
import { StockMeter } from "@/components/StockMeter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton, TableSkeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useAuth } from "@/hooks/useAuth";
import {
  useDashboardSummary,
  useSalesTrend,
  useTopProducts,
} from "@/hooks/queries";
import { formatDate, money, moneyCompact, number, relativeTime } from "@/lib/utils";

export default function Dashboard() {
  const { user } = useAuth();
  const [days, setDays] = React.useState(7);

  const summary = useDashboardSummary();
  const trend = useSalesTrend(days);
  const top = useTopProducts({ days: 30, limit: 5 });

  const cards = summary.data?.cards;
  const counts = summary.data?.counts;

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow={formatDate(new Date())}
        title={`${greeting()}, ${user?.name?.split(" ")[0] ?? "there"}`}
        description="Today's movement, what's running low, and where the stock value sits."
      >
        <Button variant="outline" size="sm" asChild>
          <Link to="/purchases?new=1">
            <ArrowDownLeft />
            Stock in
          </Link>
        </Button>
        <Button size="sm" asChild>
          <Link to="/sales?new=1">
            <Plus />
            New sale
          </Link>
        </Button>
      </PageHeader>

      {summary.isError ? (
        <Card>
          <ErrorState error={summary.error} onRetry={summary.refetch} />
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {summary.isLoading ? (
            Array.from({ length: 4 }).map((_, index) => (
              <Skeleton key={index} className="h-[128px]" />
            ))
          ) : (
            <>
              <StatCard
                label="Total products"
                value={number(cards.total_products)}
                icon={Boxes}
                hint={`${number(cards.total_units)} units on hand`}
              />
              <StatCard
                label="Stock value"
                value={moneyCompact(cards.stock_value_at_cost)}
                icon={IndianRupee}
                hint={`${moneyCompact(cards.stock_value_at_retail)} at retail`}
              />
              <StatCard
                label="Low stock"
                value={number(cards.low_stock_count)}
                icon={TriangleAlert}
                tone={cards.low_stock_count > 0 ? "warning" : "default"}
                hint={
                  cards.out_of_stock_count > 0
                    ? `${number(cards.out_of_stock_count)} out of stock`
                    : "nothing out of stock"
                }
              />
              <StatCard
                label="Today's sales"
                value={money(cards.today_revenue)}
                icon={ShoppingCart}
                delta={cards.today_vs_yesterday_pct}
                deltaLabel="vs yesterday"
              />
            </>
          )}
        </div>
      )}

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
        <TrendCard
          days={days}
          onDaysChange={setDays}
          query={trend}
        />
        <LowStockPanel
          products={summary.data?.low_stock_products}
          loading={summary.isLoading}
          total={cards?.low_stock_count}
        />
      </div>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
        <RecentTransactions
          rows={summary.data?.recent_transactions}
          loading={summary.isLoading}
        />
        <div className="space-y-4">
          <TopProducts query={top} />
          {counts && <Footprint counts={counts} monthRevenue={cards.month_revenue} />}
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ trend */

function TrendCard({ days, onDaysChange, query }) {
  const totals = query.data?.totals;

  return (
    <Card>
      <CardHeader className="flex-row items-start justify-between gap-4 space-y-0">
        <div className="min-w-0">
          {/* A single series needs no legend — the title names the measure. */}
          <CardTitle>Sales revenue</CardTitle>
          <p className="mt-1 flex flex-wrap items-baseline gap-x-2 gap-y-1">
            <span className="num text-[22px] font-semibold leading-none tracking-[-0.025em]">
              {totals ? money(totals.revenue) : "—"}
            </span>
            <span className="text-[12px] text-muted-foreground">
              {totals
                ? `over ${days} days · ${money(totals.average_daily_revenue)}/day avg · ${number(totals.units)} units`
                : `last ${days} days`}
            </span>
          </p>
        </div>
        <RangeToggle value={days} onChange={onDaysChange} />
      </CardHeader>
      <CardContent>
        {query.isError ? (
          <ErrorState error={query.error} onRetry={query.refetch} className="py-10" />
        ) : (
          <SalesTrendChart
            data={query.data}
            days={days}
            loading={query.isLoading}
            className={query.isPlaceholderData ? "opacity-60 transition-opacity" : undefined}
          />
        )}
      </CardContent>
    </Card>
  );
}

/* --------------------------------------------------------------- low stock */

function LowStockPanel({ products, loading, total }) {
  const items = products ?? [];
  const hidden = Math.max((total ?? items.length) - items.length, 0);

  return (
    <Card className="flex flex-col">
      <CardHeader className="flex-row items-center justify-between gap-3 space-y-0">
        <CardTitle>Low stock alerts</CardTitle>
        {Boolean(total) && (
          <span className="num rounded-full border border-warning/25 bg-warning/10 px-2 py-0.5 text-[11.5px] font-semibold text-warning">
            {number(total)}
          </span>
        )}
      </CardHeader>

      <CardContent className="flex-1 p-0">
        {loading ? (
          <div className="space-y-3 px-5 pb-5">
            {Array.from({ length: 4 }).map((_, index) => (
              <Skeleton key={index} className="h-12" />
            ))}
          </div>
        ) : items.length === 0 ? (
          <EmptyState
            icon={PackageCheck}
            title="Everything is above its reorder level"
            description="Products appear here the moment their quantity drops to the threshold you set."
            className="py-12"
          />
        ) : (
          <ul className="divide-y divide-border">
            {items.map((product) => (
              <li key={product.id}>
                <Link
                  to={`/products?search=${encodeURIComponent(product.sku)}`}
                  className="flex items-center gap-3 px-5 py-3 transition-colors hover:bg-muted/50 focus-visible:bg-muted/50 focus-visible:outline-none"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[13px] font-medium">{product.name}</p>
                    <p className="num mt-0.5 text-[11.5px] text-muted-foreground">
                      {product.sku}
                      {product.supplier?.name ? ` · ${product.supplier.name}` : ""}
                    </p>
                    <StockMeter
                      quantity={product.quantity}
                      reorderLevel={product.reorder_level}
                      status={product.stock_status}
                      className="mt-2"
                    />
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="num text-[13px] font-semibold">
                      {number(product.quantity)}
                      <span className="ml-1 text-[11px] font-normal text-muted-foreground">
                        / {number(product.reorder_level)}
                      </span>
                    </p>
                    <StockStatusBadge status={product.stock_status} className="mt-1.5" />
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </CardContent>

      {items.length > 0 && (
        <div className="border-t border-border px-5 py-3">
          <Button variant="ghost" size="sm" className="w-full justify-between" asChild>
            <Link to="/reports?tab=low-stock">
              {hidden > 0 ? `${number(hidden)} more to review` : "Open the low stock report"}
              <ArrowUpRight />
            </Link>
          </Button>
        </div>
      )}
    </Card>
  );
}

/* ----------------------------------------------------- recent transactions */

function RecentTransactions({ rows, loading }) {
  const items = rows ?? [];

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between gap-3 space-y-0">
        <div>
          <CardTitle>Recent movement</CardTitle>
          <p className="mt-0.5 text-[12.5px] text-muted-foreground">
            The last 10 stock movements, newest first.
          </p>
        </div>
        <Button variant="ghost" size="sm" asChild>
          <Link to="/sales">
            All sales
            <ArrowUpRight />
          </Link>
        </Button>
      </CardHeader>

      <CardContent className="p-0">
        {loading ? (
          <TableSkeleton rows={6} columns={5} />
        ) : items.length === 0 ? (
          <EmptyState
            icon={TrendingUp}
            title="No movement yet"
            description="Record a purchase to bring stock in, or a sale to take it out — both show up here."
            className="py-12"
          />
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead>Type</TableHead>
                <TableHead>Product</TableHead>
                <TableHead className="hidden md:table-cell">Party</TableHead>
                <TableHead align="right">Qty</TableHead>
                <TableHead align="right">Amount</TableHead>
                <TableHead align="right" className="hidden sm:table-cell">
                  When
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((row) => (
                <TableRow key={`${row.type}-${row.id}`}>
                  <TableCell>
                    <MovementType type={row.type} reference={row.reference} />
                  </TableCell>
                  <TableCell>
                    <p className="max-w-[220px] truncate text-[13px] font-medium">
                      {row.product_name}
                    </p>
                    <p className="num mt-0.5 text-[11.5px] text-muted-foreground">
                      {row.product_sku}
                    </p>
                  </TableCell>
                  <TableCell className="hidden md:table-cell">
                    <span className="block max-w-[160px] truncate text-[13px] text-muted-foreground">
                      {row.party || "—"}
                    </span>
                  </TableCell>
                  <TableCell align="right">
                    <span className="num text-[13px]">
                      {row.type === "sale" ? "−" : "+"}
                      {number(row.quantity)}
                    </span>
                  </TableCell>
                  <TableCell align="right">
                    <span className="num text-[13px] font-medium">
                      {money(row.total_amount)}
                    </span>
                  </TableCell>
                  <TableCell align="right" className="hidden sm:table-cell">
                    <span
                      className="text-[12px] text-muted-foreground"
                      title={formatDate(row.date)}
                    >
                      {relativeTime(row.created_at)}
                    </span>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}

/**
 * Sale vs purchase is *identity*, not status, so it gets the accent hue and a
 * neutral — the success/warning/danger steps stay reserved for stock state.
 */
function MovementType({ type, reference }) {
  const sale = type === "sale";
  const Icon = sale ? ArrowUpRight : ArrowDownLeft;

  return (
    <div className="flex items-center gap-2">
      <span
        className={
          sale
            ? "flex size-6 shrink-0 items-center justify-center rounded-md border border-primary/25 bg-primary/10 text-primary"
            : "flex size-6 shrink-0 items-center justify-center rounded-md border border-border bg-muted text-muted-foreground"
        }
      >
        <Icon className="size-3.5" aria-hidden="true" />
      </span>
      <span className="min-w-0">
        <span className="block text-[12.5px] font-medium leading-tight">
          {sale ? "Sale" : "Purchase"}
        </span>
        <span className="num block max-w-[110px] truncate text-[11px] leading-tight text-muted-foreground">
          {reference}
        </span>
      </span>
    </div>
  );
}

/* ----------------------------------------------------------- top products */

function TopProducts({ query }) {
  const items = query.data?.items ?? [];
  const max = Math.max(...items.map((item) => Number(item.revenue) || 0), 1);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Best sellers</CardTitle>
        <p className="text-[12.5px] text-muted-foreground">By revenue, last 30 days.</p>
      </CardHeader>
      <CardContent className="pt-1">
        {query.isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, index) => (
              <Skeleton key={index} className="h-9" />
            ))}
          </div>
        ) : items.length === 0 ? (
          <p className="py-6 text-center text-[13px] text-muted-foreground">
            No sales in the last 30 days.
          </p>
        ) : (
          <ol className="space-y-3.5">
            {items.map((item, index) => (
              <li key={item.product_id}>
                <div className="flex items-baseline justify-between gap-3">
                  <p className="min-w-0 truncate text-[13px]">
                    <span className="num mr-1.5 text-[11px] text-muted-foreground">
                      {index + 1}
                    </span>
                    {item.name}
                  </p>
                  <span className="num shrink-0 text-[12.5px] font-medium">
                    {moneyCompact(item.revenue)}
                  </span>
                </div>
                <div className="mt-1.5 flex items-center gap-2">
                  <div className="h-1 flex-1 overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full rounded-full bg-primary"
                      style={{ width: `${((Number(item.revenue) || 0) / max) * 100}%` }}
                    />
                  </div>
                  <span className="num w-16 shrink-0 text-right text-[11px] text-muted-foreground">
                    {number(item.units)} units
                  </span>
                </div>
              </li>
            ))}
          </ol>
        )}
      </CardContent>
    </Card>
  );
}

/* -------------------------------------------------------------- footprint */

function Footprint({ counts, monthRevenue }) {
  const rows = [
    ["This month", money(monthRevenue)],
    ["Categories", number(counts.categories)],
    ["Suppliers", number(counts.suppliers)],
    ["Team members", number(counts.users)],
  ];

  return (
    <Card>
      <CardContent className="pt-5">
        <dl className="divide-y divide-border">
          {rows.map(([label, value]) => (
            <div key={label} className="flex items-baseline justify-between py-2 first:pt-0 last:pb-0">
              <dt className="text-[12.5px] text-muted-foreground">{label}</dt>
              <dd className="num text-[13px] font-medium">{value}</dd>
            </div>
          ))}
        </dl>
      </CardContent>
    </Card>
  );
}

function greeting() {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}
