import * as React from "react";
import { Link } from "react-router-dom";
import {
  ArrowDownLeft,
  ArrowUpRight,
  Boxes,
  IndianRupee,
  PackageCheck,
  PackagePlus,
  Plus,
  ShoppingCart,
  TrendingUp,
  TriangleAlert,
} from "lucide-react";

import { AnimatedNumber } from "@/components/AnimatedNumber";
import { EmptyState, ErrorState } from "@/components/EmptyState";
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
import { useDashboardSummary, useSalesTrend, useTopProducts } from "@/hooks/queries";
import { cn, formatDate, money, moneyCompact, number, relativeTime } from "@/lib/utils";

export default function Dashboard() {
  const { user } = useAuth();
  const [days, setDays] = React.useState(7);

  const summary = useDashboardSummary();
  const trend = useSalesTrend(days);
  const week = useSalesTrend(7);
  const top = useTopProducts({ days: 30, limit: 5 });

  const cards = summary.data?.cards;
  const counts = summary.data?.counts;
  const weekRevenue = week.data?.series?.map((point) => point.revenue);

  return (
    <div className="space-y-5">
      <Hero user={user} cards={cards} loading={summary.isLoading} />

      {summary.isError ? (
        <Card>
          <ErrorState error={summary.error} onRetry={summary.refetch} />
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {summary.isLoading ? (
            Array.from({ length: 4 }).map((_, index) => (
              <Skeleton key={index} className="h-[148px] rounded-xl" />
            ))
          ) : (
            <>
              <StatCard
                label="Today's sales"
                value={<AnimatedNumber value={cards.today_revenue} format={money} />}
                icon={ShoppingCart}
                delta={cards.today_vs_yesterday_pct}
                deltaLabel="vs yesterday"
                spark={weekRevenue}
                highlight
              />
              <StatCard
                label="Stock value"
                value={<AnimatedNumber value={cards.stock_value_at_cost} format={moneyCompact} />}
                icon={IndianRupee}
                hint={`${moneyCompact(cards.stock_value_at_retail)} at retail`}
                style={{ animationDelay: "60ms" }}
              />
              <StatCard
                label="Total products"
                value={<AnimatedNumber value={cards.total_products} />}
                icon={Boxes}
                hint={`${number(cards.total_units)} units on hand`}
                style={{ animationDelay: "120ms" }}
              />
              <StatCard
                label="Low stock"
                value={<AnimatedNumber value={cards.low_stock_count} />}
                icon={TriangleAlert}
                tone={cards.low_stock_count > 0 ? "warning" : "default"}
                hint={
                  cards.out_of_stock_count > 0
                    ? `${number(cards.out_of_stock_count)} out of stock`
                    : "nothing out of stock"
                }
                style={{ animationDelay: "180ms" }}
              />
            </>
          )}
        </div>
      )}

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
        <TrendCard days={days} onDaysChange={setDays} query={trend} />
        <LowStockPanel
          products={summary.data?.low_stock_products}
          loading={summary.isLoading}
          total={cards?.low_stock_count}
        />
      </div>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
        <RecentTransactions rows={summary.data?.recent_transactions} loading={summary.isLoading} />
        <div className="space-y-4">
          <TopProducts query={top} />
          {counts && <Footprint counts={counts} monthRevenue={cards.month_revenue} />}
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------- hero */

/**
 * The page opens with a sentence, not a grid: what happened today and what
 * needs doing, in words, next to the shape of the whole inventory.
 */
function Hero({ user, cards, loading }) {
  const firstName = user?.name?.split(" ")[0] ?? "there";
  const needsRestock = cards?.low_stock_count ?? 0;

  return (
    <Card className="edge-glow relative overflow-hidden">
      {/* Ambient light: violet from the top-left, a whisper of volt bottom-right. */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-0">
        <div className="absolute -left-24 -top-32 size-[420px] rounded-full bg-primary/[0.13] blur-3xl" />
        <div className="absolute -bottom-40 right-10 size-[300px] rounded-full bg-volt/[0.12] blur-3xl" />
        <div className="absolute inset-0 opacity-70 [background-image:radial-gradient(hsl(var(--grid-dot))_1px,transparent_1px)] [background-size:22px_22px] [mask-image:linear-gradient(100deg,transparent_30%,black)]"
        />
      </div>

      <div className="relative grid lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
        <div className="flex flex-col justify-between gap-7 p-6 sm:p-8">
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-3">
              <p className="eyebrow">{formatDate(new Date())}</p>
              <span className="inline-flex items-center gap-1.5 rounded-full border border-success/25 bg-success/10 px-2 py-0.5 text-[10.5px] font-medium text-success">
                <span className="relative flex size-1.5">
                  <span className="absolute inline-flex size-full animate-ping-soft rounded-full bg-success" />
                  <span className="relative inline-flex size-1.5 rounded-full bg-success" />
                </span>
                Live
              </span>
            </div>

            <h1 className="font-display text-[34px] font-bold leading-[1.02] sm:text-[44px]">
              {greeting()}, <span className="text-primary">{firstName}</span>.
            </h1>

            {loading || !cards ? (
              <div className="space-y-2">
                <Skeleton className="h-4 w-full max-w-md" />
                <Skeleton className="h-4 w-2/3 max-w-sm" />
              </div>
            ) : (
              <p className="max-w-xl text-[15px] leading-relaxed text-muted-foreground">
                {cards.today_invoice_count > 0 ? (
                  <>
                    You've sold{" "}
                    <strong className="num font-semibold text-foreground">
                      {money(cards.today_revenue)}
                    </strong>{" "}
                    across{" "}
                    <strong className="font-semibold text-foreground">
                      {number(cards.today_invoice_count)} invoice
                      {cards.today_invoice_count === 1 ? "" : "s"}
                    </strong>{" "}
                    today.{" "}
                  </>
                ) : (
                  <>No sales recorded yet today. </>
                )}
                {needsRestock > 0 ? (
                  <>
                    <Link
                      to="/reports?tab=low-stock"
                      className="font-semibold text-warning underline decoration-warning/40 underline-offset-4 transition-colors hover:decoration-warning"
                    >
                      {number(needsRestock)} product{needsRestock === 1 ? "" : "s"}
                    </Link>{" "}
                    need{needsRestock === 1 ? "s" : ""} restocking.
                  </>
                ) : (
                  <>Every shelf is above its reorder level.</>
                )}
              </p>
            )}
          </div>

          {cards && (
            <dl className="grid max-w-xl grid-cols-3 divide-x divide-border/70 rounded-xl border border-border/70 bg-card/60 backdrop-blur-sm">
              {[
                ["Units today", number(cards.today_units)],
                ["This month", moneyCompact(cards.month_revenue)],
                ["Month units", number(cards.month_units)],
              ].map(([label, value]) => (
                <div key={label} className="px-4 py-3">
                  <dt className="truncate text-[11.5px] text-muted-foreground">{label}</dt>
                  <dd className="num mt-1 text-[17px] font-semibold tracking-[-0.02em]">{value}</dd>
                </div>
              ))}
            </dl>
          )}

          <div className="flex flex-wrap items-center gap-2">
            <Button variant="volt" asChild>
              <Link to="/sales?new=1">
                <Plus />
                New sale
              </Link>
            </Button>
            <Button variant="outline" asChild>
              <Link to="/purchases?new=1">
                <ArrowDownLeft />
                Stock in
              </Link>
            </Button>
            <Button variant="ghost" asChild>
              <Link to="/products?new=1">
                <PackagePlus />
                Add product
              </Link>
            </Button>
            <p className="ml-auto hidden items-center gap-1.5 text-[12px] text-muted-foreground xl:flex">
              Press
              <kbd className="num rounded-md border border-border bg-card px-1.5 py-0.5 text-[10.5px] shadow-soft">
                /
              </kbd>
              to search anything
            </p>
          </div>
        </div>

        <div className="border-t border-border/70 p-6 sm:p-8 lg:border-l lg:border-t-0">
          <InventoryHealth cards={cards} loading={loading} />
        </div>
      </div>
    </Card>
  );
}

function InventoryHealth({ cards, loading }) {
  if (loading || !cards) {
    return (
      <div className="flex items-center gap-6">
        <Skeleton className="size-[148px] shrink-0 rounded-full" />
        <div className="flex-1 space-y-3">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-5" />
          ))}
        </div>
      </div>
    );
  }

  const total = cards.total_products;
  const out = cards.out_of_stock_count;
  const low = Math.max(cards.low_stock_count - out, 0);
  const healthy = Math.max(total - low - out, 0);
  const pct = total ? Math.round((healthy / total) * 100) : 0;

  const segments = [
    {
      key: "healthy",
      label: "Healthy",
      value: healthy,
      stroke: "hsl(var(--success))",
      dot: "bg-success",
    },
    {
      key: "low",
      label: "Running low",
      value: low,
      stroke: "hsl(var(--warning))",
      dot: "bg-warning",
    },
    {
      key: "out",
      label: "Out of stock",
      value: out,
      stroke: "hsl(var(--destructive))",
      dot: "bg-destructive",
    },
  ];

  return (
    <div className="flex h-full flex-col justify-between gap-6">
      <div className="flex items-baseline justify-between">
        <p className="font-mono text-[10.5px] uppercase tracking-[0.12em] text-muted-foreground">
          Inventory health
        </p>
        <p className="num text-[11.5px] text-muted-foreground">{number(total)} SKUs</p>
      </div>

      <div className="flex items-center gap-6 sm:gap-8">
        <HealthRing segments={segments} total={total} pct={pct} />
        <ul className="min-w-0 flex-1 space-y-3">
          {segments.map((segment) => (
            <li key={segment.key} className="flex items-center gap-2.5 text-[13px]">
              <span className={cn("size-2 shrink-0 rounded-[3px]", segment.dot)} />
              <span className="min-w-0 flex-1 truncate text-muted-foreground">{segment.label}</span>
              <span className="num font-semibold">{number(segment.value)}</span>
            </li>
          ))}
        </ul>
      </div>

      <dl className="grid grid-cols-2 gap-4 border-t border-border/70 pt-4">
        <div>
          <dt className="text-[11.5px] text-muted-foreground">Value at cost</dt>
          <dd className="num mt-0.5 text-[15px] font-semibold">
            {moneyCompact(cards.stock_value_at_cost)}
          </dd>
        </div>
        <div>
          <dt className="text-[11.5px] text-muted-foreground">Potential margin</dt>
          <dd className="num mt-0.5 text-[15px] font-semibold text-success">
            {moneyCompact(cards.stock_value_at_retail - cards.stock_value_at_cost)}
          </dd>
        </div>
      </dl>
    </div>
  );
}

/**
 * Three arcs on one ring — the same healthy / low / out split the badges use,
 * so the colours already mean something by the time you read the legend.
 */
function HealthRing({ segments, total, pct }) {
  const size = 148;
  const stroke = 14;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const gap = total > 0 && segments.filter((s) => s.value > 0).length > 1 ? 6 : 0;

  const visible = segments.filter((segment) => segment.value > 0);
  const arcs = visible.map((segment, index) => {
    // Each arc starts where the ones before it end.
    const before = visible.slice(0, index).reduce((sum, s) => sum + s.value, 0);
    return {
      ...segment,
      length: Math.max((segment.value / total) * c - gap, 2),
      offset: (before / total) * c,
    };
  });

  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg
        viewBox={`0 0 ${size} ${size}`}
        className="-rotate-90"
        role="img"
        aria-label={`${pct}% of products are above their reorder level`}
      >
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="hsl(var(--muted))"
          strokeWidth={stroke}
        />
        {arcs.map((arc, index) => (
          <circle
            key={arc.key}
            cx={size / 2}
            cy={size / 2}
            r={r}
            fill="none"
            stroke={arc.stroke}
            strokeWidth={stroke}
            strokeLinecap="round"
            strokeDasharray={`${arc.length} ${c}`}
            strokeDashoffset={-arc.offset}
            className="animate-ring-draw"
            style={{ "--ring-circumference": c, animationDelay: `${index * 120}ms` }}
          />
        ))}
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="font-display text-[34px] font-bold leading-none">
          <AnimatedNumber value={pct} format={(v) => Math.round(v)} />
          <span className="text-[18px] text-muted-foreground">%</span>
        </span>
        <span className="mt-1 font-mono text-[9.5px] uppercase tracking-[0.14em] text-muted-foreground">
          healthy
        </span>
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
                    <span className="num text-[13px] font-medium">{money(row.total_amount)}</span>
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
                      className="h-full origin-left animate-bar-grow rounded-full bg-gradient-to-r from-primary/60 to-primary"
                      style={{
                        width: `${((Number(item.revenue) || 0) / max) * 100}%`,
                        animationDelay: `${index * 80}ms`,
                      }}
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
            <div
              key={label}
              className="flex items-baseline justify-between py-2 first:pt-0 last:pb-0"
            >
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
