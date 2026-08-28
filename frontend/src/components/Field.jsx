import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

/**
 * Label + control + inline message. The error replaces the hint rather than
 * stacking below it, so the field's height never changes when validation fires
 * and the form can't jump under the user's cursor.
 */
export function Field({
  label,
  htmlFor,
  error,
  hint,
  required,
  className,
  children,
  suffix,
}) {
  const message = error || hint;
  return (
    <div className={cn("space-y-1.5", className)}>
      {label && (
        <div className="flex items-baseline justify-between gap-2">
          <Label htmlFor={htmlFor} required={required}>
            {label}
          </Label>
          {suffix}
        </div>
      )}
      {children}
      {/* Reserved line: present whether or not there's a message. */}
      <p
        className={cn(
          "min-h-[16px] text-[12px] leading-4",
          error ? "text-destructive" : "text-muted-foreground",
        )}
      >
        {message}
      </p>
    </div>
  );
}

/** A form-wide error (a 409 from the server, say) shown above the actions. */
export function FormError({ error, className }) {
  if (!error) return null;
  return (
    <div
      role="alert"
      className={cn(
        "rounded-md border border-destructive/25 bg-destructive/10 px-3 py-2 text-[13px] text-destructive",
        className,
      )}
    >
      {typeof error === "string" ? error : error.message}
    </div>
  );
}
