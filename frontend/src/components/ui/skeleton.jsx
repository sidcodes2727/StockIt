import { cn } from "@/lib/utils";

/**
 * Skeletons, not spinners: the loading state has the shape of the content that
 * is coming, so the page doesn't reflow when data lands.
 */
function Skeleton({ className, ...props }) {
  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-md bg-muted",
        "after:absolute after:inset-0 after:-translate-x-full after:animate-shimmer",
        "after:bg-gradient-to-r after:from-transparent after:via-foreground/[0.06] after:to-transparent",
        className,
      )}
      {...props}
    />
  );
}

/** Matching skeleton for the shared DataTable, so rows land in place. */
function TableSkeleton({ rows = 8, columns = 5 }) {
  return (
    <div className="divide-y divide-border" aria-hidden="true">
      {Array.from({ length: rows }).map((_, rowIndex) => (
        <div key={rowIndex} className="flex items-center gap-4 px-4 py-3.5">
          {Array.from({ length: columns }).map((_, colIndex) => (
            <Skeleton
              key={colIndex}
              className={cn(
                "h-4",
                colIndex === 0 ? "w-[24%]" : "flex-1",
                colIndex === columns - 1 && "w-16 flex-none",
              )}
            />
          ))}
        </div>
      ))}
    </div>
  );
}

export { Skeleton, TableSkeleton };
