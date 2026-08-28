import * as React from "react";
import { ArrowDown, ArrowUp, ChevronsUpDown } from "lucide-react";

import { cn } from "@/lib/utils";

const Table = React.forwardRef(({ className, ...props }, ref) => (
  <div className="relative w-full overflow-x-auto">
    <table
      ref={ref}
      className={cn("w-full caption-bottom border-collapse text-sm", className)}
      {...props}
    />
  </div>
));
Table.displayName = "Table";

const TableHeader = React.forwardRef(({ className, ...props }, ref) => (
  <thead ref={ref} className={cn("bg-muted/40", className)} {...props} />
));
TableHeader.displayName = "TableHeader";

const TableBody = React.forwardRef(({ className, ...props }, ref) => (
  <tbody ref={ref} className={cn("divide-y divide-border", className)} {...props} />
));
TableBody.displayName = "TableBody";

const TableFooter = React.forwardRef(({ className, ...props }, ref) => (
  <tfoot
    ref={ref}
    className={cn("border-t border-border bg-muted/40 font-medium", className)}
    {...props}
  />
));
TableFooter.displayName = "TableFooter";

const TableRow = React.forwardRef(({ className, ...props }, ref) => (
  <tr
    ref={ref}
    className={cn(
      "transition-colors hover:bg-muted/50 data-[state=selected]:bg-accent",
      className,
    )}
    {...props}
  />
));
TableRow.displayName = "TableRow";

const TableHead = React.forwardRef(({ className, align, ...props }, ref) => (
  <th
    ref={ref}
    scope="col"
    className={cn(
      "th-label h-10 border-b border-border px-4 text-left align-middle",
      align === "right" && "text-right",
      align === "center" && "text-center",
      className,
    )}
    {...props}
  />
));
TableHead.displayName = "TableHead";

const TableCell = React.forwardRef(({ className, align, ...props }, ref) => (
  <td
    ref={ref}
    className={cn(
      "px-4 py-3 align-middle",
      align === "right" && "text-right",
      align === "center" && "text-center",
      className,
    )}
    {...props}
  />
));
TableCell.displayName = "TableCell";

const TableCaption = React.forwardRef(({ className, ...props }, ref) => (
  <caption ref={ref} className={cn("mt-4 text-[13px] text-muted-foreground", className)} {...props} />
));
TableCaption.displayName = "TableCaption";

/**
 * A sortable column header. The arrow shows the *current* direction when the
 * column is active and a neutral hint when it isn't, so the click's outcome is
 * never a guess.
 */
function SortableHead({
  children,
  columnKey,
  sortBy,
  sortDir,
  onSort,
  align,
  className,
}) {
  const active = sortBy === columnKey;
  const nextDir = active && sortDir === "asc" ? "desc" : "asc";
  const Icon = active ? (sortDir === "asc" ? ArrowUp : ArrowDown) : ChevronsUpDown;

  return (
    <TableHead align={align} className={cn("p-0", className)}>
      <button
        type="button"
        onClick={() => onSort(columnKey, nextDir)}
        aria-sort={active ? (sortDir === "asc" ? "ascending" : "descending") : "none"}
        className={cn(
          "group inline-flex h-10 w-full items-center gap-1.5 px-4 transition-colors hover:text-foreground",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring",
          active && "text-foreground",
          align === "right" && "justify-end",
          align === "center" && "justify-center",
        )}
      >
        <span className="th-label text-inherit">{children}</span>
        <Icon
          className={cn(
            "size-3 shrink-0 transition-opacity",
            active ? "opacity-100" : "opacity-0 group-hover:opacity-50",
          )}
          aria-hidden="true"
        />
      </button>
    </TableHead>
  );
}

export {
  Table,
  TableHeader,
  TableBody,
  TableFooter,
  TableHead,
  TableRow,
  TableCell,
  TableCaption,
  SortableHead,
};
