import * as React from "react";
import { Search, X } from "lucide-react";

import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

/**
 * Debounced search box. Keeps its own immediate value so typing feels instant
 * while the query only fires once the user pauses — 300ms is short enough to
 * feel live and long enough to avoid a request per keystroke.
 */
export function SearchInput({
  value,
  onChange,
  placeholder = "Search…",
  delay = 300,
  className,
  autoFocus,
}) {
  const [draft, setDraft] = React.useState(value ?? "");
  const onChangeRef = React.useRef(onChange);
  onChangeRef.current = onChange;

  // Keep in step when the parent resets filters.
  React.useEffect(() => {
    setDraft(value ?? "");
  }, [value]);

  React.useEffect(() => {
    if (draft === (value ?? "")) return;
    const timer = setTimeout(() => onChangeRef.current(draft), delay);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draft, delay]);

  return (
    <div className={cn("relative", className)}>
      <Search
        className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
        aria-hidden="true"
      />
      <Input
        type="search"
        value={draft}
        autoFocus={autoFocus}
        onChange={(event) => setDraft(event.target.value)}
        placeholder={placeholder}
        aria-label={placeholder}
        className="pl-9 pr-8 [&::-webkit-search-cancel-button]:hidden"
      />
      {draft && (
        <button
          type="button"
          onClick={() => {
            setDraft("");
            onChangeRef.current("");
          }}
          className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          aria-label="Clear search"
        >
          <X className="size-3.5" />
        </button>
      )}
    </div>
  );
}
