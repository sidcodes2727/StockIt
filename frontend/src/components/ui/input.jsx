import * as React from "react";

import { cn } from "@/lib/utils";

const Input = React.forwardRef(({ className, type = "text", ...props }, ref) => (
  <input
    ref={ref}
    type={type}
    className={cn(
      "flex h-9 w-full rounded-lg border border-input bg-card px-3 py-1 text-sm shadow-soft transition-colors",
      "placeholder:text-muted-foreground/70",
      "focus-visible:border-primary focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/15",
      "disabled:cursor-not-allowed disabled:bg-muted disabled:opacity-60",
      "aria-[invalid=true]:border-destructive aria-[invalid=true]:ring-destructive/20",
      // Numeric and identifier fields carry the mono face too, so what you type
      // matches how it will be rendered in the table.
      (type === "number" || props.inputMode === "decimal") && "num",
      className,
    )}
    {...props}
  />
));
Input.displayName = "Input";

const Textarea = React.forwardRef(({ className, ...props }, ref) => (
  <textarea
    ref={ref}
    className={cn(
      "flex min-h-[72px] w-full rounded-lg border border-input bg-card px-3 py-2 text-sm shadow-soft transition-colors",
      "placeholder:text-muted-foreground/70",
      "focus-visible:border-primary focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/15",
      "disabled:cursor-not-allowed disabled:bg-muted disabled:opacity-60",
      "aria-[invalid=true]:border-destructive",
      className,
    )}
    {...props}
  />
));
Textarea.displayName = "Textarea";

export { Input, Textarea };
