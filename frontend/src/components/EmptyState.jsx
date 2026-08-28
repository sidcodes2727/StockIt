import { SearchX } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/**
 * An empty screen is an invitation to act, so every empty state names the next
 * step. `filtered` swaps the copy for the "your search matched nothing" case,
 * which needs a different answer (clear the filters) than a genuinely empty
 * table (create the first record).
 */
export function EmptyState({
  icon: Icon = SearchX,
  title,
  description,
  action,
  actionLabel,
  onAction,
  className,
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-3 px-6 py-16 text-center",
        className,
      )}
    >
      <div className="flex size-10 items-center justify-center rounded-lg border border-border bg-muted/60 text-muted-foreground">
        <Icon className="size-[18px]" aria-hidden="true" />
      </div>
      <div className="space-y-1">
        <p className="text-[14px] font-medium">{title}</p>
        {description && (
          <p className="mx-auto max-w-sm text-[13px] leading-relaxed text-muted-foreground">
            {description}
          </p>
        )}
      </div>
      {action ??
        (actionLabel && onAction && (
          <Button size="sm" variant="outline" onClick={onAction} className="mt-1">
            {actionLabel}
          </Button>
        ))}
    </div>
  );
}

/** The failure counterpart — shown when a query errors instead of returning rows. */
export function ErrorState({ error, onRetry, className }) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-3 px-6 py-16 text-center",
        className,
      )}
    >
      <div className="flex size-10 items-center justify-center rounded-lg border border-destructive/25 bg-destructive/10 text-destructive">
        <SearchX className="size-[18px]" aria-hidden="true" />
      </div>
      <div className="space-y-1">
        <p className="text-[14px] font-medium">Couldn't load this</p>
        <p className="mx-auto max-w-sm text-[13px] leading-relaxed text-muted-foreground">
          {error?.message || "Something went wrong."}
        </p>
      </div>
      {onRetry && (
        <Button size="sm" variant="outline" onClick={onRetry} className="mt-1">
          Try again
        </Button>
      )}
    </div>
  );
}
