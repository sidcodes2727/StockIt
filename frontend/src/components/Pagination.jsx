import { ChevronLeft, ChevronRight } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn, number } from "@/lib/utils";

const PAGE_SIZES = [10, 25, 50, 100];

/**
 * Reads the `meta` block every paginated endpoint returns, so the control can
 * never disagree with the server about how many pages there are.
 */
export function Pagination({ meta, onPageChange, onPageSizeChange, className }) {
  if (!meta) return null;

  const { page = 1, per_page: perPage = 10, total = 0, pages = 1 } = meta;
  const from = total === 0 ? 0 : (page - 1) * perPage + 1;
  const to = Math.min(page * perPage, total);

  return (
    <div
      className={cn(
        "flex flex-col-reverse items-center justify-between gap-3 border-t border-border px-4 py-3 sm:flex-row",
        className,
      )}
    >
      <p className="text-[12.5px] text-muted-foreground">
        Showing <span className="num font-medium text-foreground">{number(from)}</span>–
        <span className="num font-medium text-foreground">{number(to)}</span> of{" "}
        <span className="num font-medium text-foreground">{number(total)}</span>
      </p>

      <div className="flex items-center gap-4">
        {onPageSizeChange && (
          <div className="hidden items-center gap-2 sm:flex">
            <span className="text-[12.5px] text-muted-foreground">Rows</span>
            <Select
              value={String(perPage)}
              onValueChange={(value) => onPageSizeChange(Number(value))}
            >
              <SelectTrigger size="sm" className="h-8 w-[68px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PAGE_SIZES.map((size) => (
                  <SelectItem key={size} value={String(size)}>
                    {size}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        <div className="flex items-center gap-1">
          <Button
            variant="outline"
            size="icon-sm"
            onClick={() => onPageChange(page - 1)}
            disabled={!meta.has_prev}
            aria-label="Previous page"
          >
            <ChevronLeft />
          </Button>
          <span className="num px-2 text-[12.5px] text-muted-foreground">
            {page} / {Math.max(pages, 1)}
          </span>
          <Button
            variant="outline"
            size="icon-sm"
            onClick={() => onPageChange(page + 1)}
            disabled={!meta.has_next}
            aria-label="Next page"
          >
            <ChevronRight />
          </Button>
        </div>
      </div>
    </div>
  );
}
