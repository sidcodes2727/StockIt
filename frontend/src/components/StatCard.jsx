import { ArrowDownRight, ArrowUpRight, Minus } from "lucide-react";

import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

/**
 * A stat tile, not a chart: a single headline number's job is to be read, so it
 * gets the largest type on the page and no plot behind it.
 *
 * `delta` is a signed percentage or null. Null means "no baseline to compare
 * against" — rendered as an em dash rather than a misleading 0%.
 */
export function StatCard({
  label,
  value,
  unit,
  hint,
  delta,
  deltaLabel,
  icon: Icon,
  tone = "default",
  children,
  className,
}) {
  return (
    <Card className={cn("flex flex-col justify-between gap-4 p-5", className)}>
      <div className="flex items-start justify-between gap-3">
        <p className="text-[11.5px] font-semibold uppercase tracking-[0.07em] text-muted-foreground">
          {label}
        </p>
        {Icon && (
          <span
            className={cn(
              "flex size-7 shrink-0 items-center justify-center rounded-md border",
              tone === "warning" && "border-warning/25 bg-warning/10 text-warning",
              tone === "destructive" &&
                "border-destructive/25 bg-destructive/10 text-destructive",
              tone === "success" && "border-success/25 bg-success/10 text-success",
              tone === "default" && "border-border bg-muted/60 text-muted-foreground",
            )}
          >
            <Icon className="size-[15px]" aria-hidden="true" />
          </span>
        )}
      </div>

      <div>
        <p className="flex items-baseline gap-1.5">
          <span
            className={cn(
              "num text-[26px] font-semibold leading-none tracking-[-0.03em]",
              tone === "warning" && "text-warning",
              tone === "destructive" && "text-destructive",
            )}
          >
            {value}
          </span>
          {unit && (
            <span className="text-[12px] font-medium text-muted-foreground">{unit}</span>
          )}
        </p>

        <div className="mt-2 flex items-center gap-2">
          {delta !== undefined && <DeltaPill delta={delta} label={deltaLabel} />}
          {hint && <p className="truncate text-[12px] text-muted-foreground">{hint}</p>}
        </div>
      </div>

      {children}
    </Card>
  );
}

function DeltaPill({ delta, label }) {
  if (delta === null || delta === undefined) {
    return (
      <span className="inline-flex items-center gap-1 text-[12px] text-muted-foreground">
        <Minus className="size-3" aria-hidden="true" />
        {label ?? "no comparison"}
      </span>
    );
  }

  const up = delta > 0;
  const flat = delta === 0;
  const Icon = flat ? Minus : up ? ArrowUpRight : ArrowDownRight;

  return (
    <span
      className={cn(
        "inline-flex items-center gap-0.5 text-[12px] font-medium",
        flat ? "text-muted-foreground" : up ? "text-success" : "text-destructive",
      )}
    >
      <Icon className="size-3" aria-hidden="true" />
      <span className="num">
        {up ? "+" : ""}
        {delta.toFixed(1)}%
      </span>
      {label && <span className="ml-0.5 font-normal text-muted-foreground">{label}</span>}
    </span>
  );
}
