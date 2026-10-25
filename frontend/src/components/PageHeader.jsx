import { cn } from "@/lib/utils";

/**
 * Every page opens the same way: an eyebrow that names the module, the title,
 * one line of orientation, and the page's actions right-aligned.
 */
export function PageHeader({ eyebrow, title, description, children, className }) {
  return (
    <div
      className={cn(
        "flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between",
        className,
      )}
    >
      <div className="min-w-0 space-y-1.5">
        {eyebrow && <p className="eyebrow">{eyebrow}</p>}
        <h1 className="font-display truncate text-[28px] font-bold leading-[1.1] sm:text-[32px]">
          {title}
        </h1>
        {description && (
          <p className="max-w-2xl text-[13.5px] leading-relaxed text-muted-foreground">
            {description}
          </p>
        )}
      </div>
      {children && <div className="flex shrink-0 items-center gap-2">{children}</div>}
    </div>
  );
}

/** A small labelled statistic — used in detail panels and report summaries. */
export function Metric({ label, value, hint, tone = "default", className }) {
  return (
    <div className={cn("space-y-1", className)}>
      <dt className="font-mono text-[10.5px] font-medium uppercase tracking-[0.12em] text-muted-foreground">
        {label}
      </dt>
      <dd
        className={cn(
          "num text-[17px] font-semibold leading-none tracking-[-0.01em]",
          tone === "warning" && "text-warning",
          tone === "destructive" && "text-destructive",
          tone === "success" && "text-success",
        )}
      >
        {value}
      </dd>
      {hint && <p className="text-[12px] text-muted-foreground">{hint}</p>}
    </div>
  );
}
