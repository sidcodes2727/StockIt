import * as React from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

import { Field, FormError } from "@/components/Field";
import { StockMeter } from "@/components/StockMeter";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useAdjustStock } from "@/hooks/queries";
import { number } from "@/lib/utils";

const REASONS = [
  "Stock-take correction",
  "Damaged / expired",
  "Shrinkage",
  "Returned to supplier",
];

/**
 * Manual stock correction. Takes an absolute figure rather than a delta,
 * because that's what a stock-take produces — you count what's on the shelf,
 * you don't calculate the difference. The delta is shown back to you so the
 * consequence is visible before you commit.
 */
export function StockAdjustDialog({ open, onOpenChange, product }) {
  const [formError, setFormError] = React.useState(null);
  const adjust = useAdjustStock();

  const {
    register,
    handleSubmit,
    reset,
    setError,
    setValue,
    watch,
    formState: { errors },
  } = useForm({ defaultValues: { quantity: "", reason: "" } });

  React.useEffect(() => {
    if (!open) return;
    setFormError(null);
    reset({ quantity: String(product?.quantity ?? 0), reason: "" });
  }, [open, product, reset]);

  const current = Number(product?.quantity ?? 0);
  const next = Number(watch("quantity"));
  const delta = Number.isFinite(next) ? next - current : 0;

  const onSubmit = async (values) => {
    setFormError(null);
    try {
      const result = await adjust.mutateAsync({
        id: product.id,
        quantity: Number(values.quantity),
        reason: values.reason.trim() || null,
      });
      toast.success(result.message);
      onOpenChange(false);
    } catch (error) {
      const message = error.fieldErrors?.quantity;
      if (message) setError("quantity", { message });
      else setFormError(error.message);
    }
  };

  if (!product) return null;

  return (
    <Dialog open={open} onOpenChange={adjust.isPending ? undefined : onOpenChange}>
      <DialogContent size="sm">
        <DialogHeader>
          <DialogTitle>Adjust stock</DialogTitle>
          <DialogDescription>
            {product.name} · <span className="num">{product.sku}</span>
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} noValidate>
          <DialogBody className="space-y-1">
            <div className="mb-4 rounded-md border border-border bg-muted/40 p-3">
              <div className="flex items-baseline justify-between">
                <span className="text-[12.5px] text-muted-foreground">Counted now</span>
                <span className="num text-[13px] font-medium">
                  {number(current)} units
                </span>
              </div>
              <StockMeter
                quantity={current}
                reorderLevel={product.reorder_level}
                status={product.stock_status}
                className="mt-2"
              />
              <p className="mt-2 text-[11.5px] text-muted-foreground">
                Reorder level <span className="num">{number(product.reorder_level)}</span>
              </p>
            </div>

            <Field
              label="Corrected quantity"
              htmlFor="quantity"
              required
              error={errors.quantity?.message}
              hint={
                delta === 0
                  ? "No change."
                  : `${delta > 0 ? "Adds" : "Removes"} ${number(Math.abs(delta))} units.`
              }
            >
              <Input
                id="quantity"
                type="number"
                min="0"
                step="1"
                autoFocus
                aria-invalid={Boolean(errors.quantity)}
                {...register("quantity", {
                  required: "Enter the counted quantity.",
                  min: { value: 0, message: "Stock can't go below zero." },
                })}
              />
            </Field>

            <Field
              label="Reason"
              htmlFor="reason"
              error={errors.reason?.message}
              hint="Recorded with the adjustment."
            >
              <Input
                id="reason"
                placeholder="Stock-take correction"
                {...register("reason", {
                  maxLength: { value: 300, message: "300 characters at most." },
                })}
              />
            </Field>

            <div className="flex flex-wrap gap-1.5 pt-1">
              {REASONS.map((reason) => (
                <button
                  key={reason}
                  type="button"
                  onClick={() => setValue("reason", reason)}
                  className="rounded-full border border-border px-2.5 py-1 text-[11.5px] text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  {reason}
                </button>
              ))}
            </div>

            <FormError error={formError} className="!mt-3" />
          </DialogBody>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={adjust.isPending}
            >
              Cancel
            </Button>
            <Button type="submit" loading={adjust.isPending} disabled={delta === 0}>
              Save count
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
