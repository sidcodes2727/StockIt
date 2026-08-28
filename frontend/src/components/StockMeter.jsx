import { cn, number } from "@/lib/utils";

/**
 * The signature element.
 *
 * A hairline track under each quantity with a tick mark at that product's
 * reorder level. The tick sits at a *fixed* position on every row, so the fill
 * is scaled relative to the reorder level rather than to an absolute maximum —
 * which means one glance down a column answers "which of these are past their
 * threshold?" without reading a single number.
 *
 *   empty ......|.........   out of stock
 *   ███.........|.........   below reorder level
 *   ██████████░░|.........   at the reorder level
 *   ████████████|██████░░░   healthy
 *
 * It encodes a real relationship in the data (quantity against its own
 * threshold), so it earns its place instead of decorating the row.
 */

const TICK_POSITION = 38; // % of the track width — where every reorder tick sits

const FILL_STYLES = {
  in_stock: "bg-success",
  low_stock: "bg-warning",
  out_of_stock: "bg-destructive",
};

export function StockMeter({
  quantity = 0,
  reorderLevel = 0,
  status,
  className,
  showTick = true,
}) {
  const qty = Math.max(Number(quantity) || 0, 0);
  const reorder = Math.max(Number(reorderLevel) || 0, 0);

  const state = status ?? deriveStatus(qty, reorder);

  // With no threshold set there is nothing to measure against, so the track
  // simply reads full-or-empty and the tick is omitted.
  const hasThreshold = reorder > 0;
  const fill = hasThreshold
    ? Math.min((qty / reorder) * TICK_POSITION, 100)
    : qty > 0
      ? 100
      : 0;

  return (
    <div
      className={cn("h-1 w-full min-w-[52px] overflow-hidden rounded-full bg-muted", className)}
      role="img"
      aria-label={
        hasThreshold
          ? `${number(qty)} in stock, reorder level ${number(reorder)}`
          : `${number(qty)} in stock`
      }
    >
      <div className="relative h-full w-full">
        <div
          className={cn(
            "h-full rounded-full transition-[width] duration-500 ease-out",
            FILL_STYLES[state] ?? "bg-muted-foreground",
          )}
          style={{ width: `${fill}%` }}
        />
        {hasThreshold && showTick && (
          <span
            aria-hidden="true"
            className="absolute top-0 h-full w-px bg-foreground/35"
            style={{ left: `${TICK_POSITION}%` }}
          />
        )}
      </div>
    </div>
  );
}

/**
 * Quantity + meter as one cell. Used in every product-bearing table so the
 * number and its context are never separated.
 */
export function StockCell({ quantity, reorderLevel, status, unit, className }) {
  const state = status ?? deriveStatus(quantity, reorderLevel);
  return (
    <div className={cn("flex w-full max-w-[132px] flex-col items-end gap-1.5", className)}>
      <div className="flex items-baseline gap-1">
        <span
          className={cn(
            "num text-[13px] font-medium tabular-nums",
            state === "out_of_stock" && "text-destructive",
            state === "low_stock" && "text-warning",
          )}
        >
          {number(quantity)}
        </span>
        {unit && <span className="text-[11px] text-muted-foreground">{unit}</span>}
      </div>
      <StockMeter quantity={quantity} reorderLevel={reorderLevel} status={state} />
    </div>
  );
}

function deriveStatus(quantity, reorderLevel) {
  const qty = Number(quantity) || 0;
  const reorder = Number(reorderLevel) || 0;
  if (qty <= 0) return "out_of_stock";
  if (qty <= reorder) return "low_stock";
  return "in_stock";
}

export { deriveStatus };
