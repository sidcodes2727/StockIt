import * as React from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { EmptyState } from "@/components/EmptyState";
import { Skeleton } from "@/components/ui/skeleton";
import { cn, money, moneyCompact, number } from "@/lib/utils";

/**
 * Sales trend, single series (revenue).
 *
 * One measure, one axis. Units and invoice counts live in the tooltip as text
 * rather than as a second y-scale — two scales on one plot is the chart mistake
 * that makes any two lines look correlated.
 *
 * The form follows the range: seven days are seven discrete things you compare,
 * so they're bars; a month or a quarter is a shape you read, so it's an area.
 */
export function SalesTrendChart({ data, days, loading, className }) {
  const series = data?.series ?? [];
  const asBars = days <= 14;

  if (loading && !data) {
    return <Skeleton className={cn("h-[260px] w-full", className)} />;
  }

  const hasRevenue = series.some((point) => Number(point.revenue) > 0);
  if (!series.length || !hasRevenue) {
    return (
      <EmptyState
        className={cn("h-[260px] border-0", className)}
        title="No sales in this period"
        description="Record a sale and the trend will start filling in from the day it happens."
      />
    );
  }

  const shared = {
    data: series,
    margin: { top: 8, right: 8, bottom: 0, left: -8 },
  };

  const axes = (
    <>
      <CartesianGrid
        vertical={false}
        stroke="hsl(var(--chart-grid))"
        strokeDasharray="3 3"
      />
      <XAxis
        dataKey="label"
        tickLine={false}
        axisLine={false}
        interval="preserveStartEnd"
        minTickGap={days > 30 ? 28 : 8}
        tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }}
        dy={6}
      />
      <YAxis
        tickLine={false}
        axisLine={false}
        width={56}
        tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }}
        tickFormatter={(value) => moneyCompact(value)}
      />
      <Tooltip
        content={<TrendTooltip />}
        cursor={
          asBars
            ? { fill: "hsl(var(--muted) / 0.55)" }
            : { stroke: "hsl(var(--primary))", strokeWidth: 1, strokeDasharray: "3 3" }
        }
      />
    </>
  );

  return (
    <div className={cn("h-[260px] w-full", className)}>
      <ResponsiveContainer width="100%" height="100%">
        {asBars ? (
          <BarChart {...shared} barCategoryGap={days <= 7 ? "34%" : "22%"}>
            {axes}
            <Bar
              dataKey="revenue"
              name="Revenue"
              fill="hsl(var(--chart-1))"
              radius={[4, 4, 0, 0]}
              maxBarSize={54}
            />
          </BarChart>
        ) : (
          <AreaChart {...shared}>
            <defs>
              <linearGradient id="trend-fill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="hsl(var(--chart-1))" stopOpacity={0.18} />
                <stop offset="100%" stopColor="hsl(var(--chart-1))" stopOpacity={0.01} />
              </linearGradient>
            </defs>
            {axes}
            <Area
              type="monotone"
              dataKey="revenue"
              name="Revenue"
              stroke="hsl(var(--chart-1))"
              strokeWidth={2}
              fill="url(#trend-fill)"
              activeDot={{
                r: 4,
                strokeWidth: 2,
                stroke: "hsl(var(--card))",
                fill: "hsl(var(--chart-1))",
              }}
              dot={false}
            />
          </AreaChart>
        )}
      </ResponsiveContainer>
    </div>
  );
}

function TrendTooltip({ active, payload }) {
  if (!active || !payload?.length) return null;
  const point = payload[0].payload;

  return (
    <div className="min-w-[168px] rounded-lg border border-border bg-popover p-3 shadow-overlay">
      <p className="text-[11.5px] font-medium text-muted-foreground">{point.label}</p>
      <p className="num mt-1 text-[16px] font-semibold leading-none tracking-[-0.02em]">
        {money(point.revenue)}
      </p>
      <dl className="mt-2.5 space-y-1 border-t border-border pt-2 text-[12px]">
        <Row label="Units sold" value={number(point.units)} />
        <Row label="Stock received" value={money(point.purchases)} />
      </dl>
    </div>
  );
}

function Row({ label, value }) {
  return (
    <div className="flex items-baseline justify-between gap-4">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="num font-medium">{value}</dd>
    </div>
  );
}

/** Segmented range control. The backend only accepts these four windows. */
export function RangeToggle({ value, onChange, options = [7, 30, 90], className }) {
  return (
    <div
      role="radiogroup"
      aria-label="Trend range"
      className={cn(
        "inline-flex items-center gap-0.5 rounded-md border border-border bg-muted/50 p-0.5",
        className,
      )}
    >
      {options.map((option) => {
        const active = option === value;
        return (
          <button
            key={option}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(option)}
            className={cn(
              "num rounded-[5px] px-2.5 py-1 text-[12px] font-medium transition-colors",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
              active
                ? "bg-card text-foreground shadow-soft"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            {option}d
          </button>
        );
      })}
    </div>
  );
}
