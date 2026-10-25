import { ArrowDownRight, ArrowUpRight, Minus } from "lucide-react";

import { Sparkline } from "@/components/Sparkline";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

/**
 * A stat tile, not a chart: a single headline number's job is to be read, so it
 * gets the largest type on the page and no plot behind it.
 *
 * `spark` adds a word-sized trend line under the figure; `highlight` marks the
 * one tile on a row that matters most today.
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
  spark,
  highlight = false,
  children,
  className,
  style,
}) {
  return (
    <Card
      style={style}
      className={cn(
        "lift group relative flex animate-fade-in-up flex-col justify-between gap-5 overflow-hidden p-5",
        highlight && "edge-glow",
        className,
      )}
    >
      {highlight && (
        <span
          aria-hidden="true"
          className="pointer-events-none absolute -right-16 -top-16 size-40 rounded-full bg-primary/10 blur-3xl"
        />
      )}

      <div className="flex items-start justify-between gap-3">
        <p className="font-mono text-[10.5px] font-medium uppercase tracking-[0.12em] text-muted-foreground">
          {label}
        </p>
        {Icon && (
          <span
            className={cn(
              "flex size-8 shrink-0 items-center justify-center rounded-lg border transition-transform duration-300 group-hover:-rotate-6 group-hover:scale-110",
              tone === "warning" && "border-warning/25 bg-warning/10 text-warning",
              tone === "destructive" &&
                "border-destructive/25 bg-destructive/10 text-destructive",
              tone === "success" && "border-success/25 bg-success/10 text-success",
              tone === "default" &&
                (highlight
                  ? "border-primary/25 bg-primary/10 text-primary"
                  : "border-border bg-muted/60 text-muted-foreground"),
            )}
          >
            <Icon className="size-4" aria-hidden="true" />
          </span>
        )}
      </div>

      <div className="relative">
        <p className="flex items-baseline gap-1.5">
          <span
            className={cn(
              "num text-[30px] font-semibold leading-none tracking-[-0.04em]",
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

        <div className="mt-2.5 flex items-center gap-2">
          {delta !== undefined && <DeltaPill delta={delta} label={deltaLabel} />}
          {hint && <p className="truncate text-[12px] text-muted-foreground">{hint}</p>}
        </div>

        {spark && <Sparkline values={spark} className="-mb-1 mt-3" />}
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
    <span className="inline-flex items-center gap-1.5 text-[12px]">
      <span
        className={cn(
          "inline-flex items-center gap-0.5 rounded-md px-1.5 py-0.5 font-medium",
          flat
            ? "bg-muted text-muted-foreground"
            : up
              ? "bg-success/10 text-success"
              : "bg-destructive/10 text-destructive",
        )}
      >
        <Icon className="size-3" aria-hidden="true" />
        <span className="num">
          {up ? "+" : ""}
          {delta.toFixed(1)}%
        </span>
      </span>
      {label && <span className="text-muted-foreground">{label}</span>}
    </span>
  );
}
