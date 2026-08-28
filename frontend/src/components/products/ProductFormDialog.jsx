import * as React from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

import { Field, FormError } from "@/components/Field";
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
import { Input, Textarea } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  useCategories,
  useCreateProduct,
  useSupplierOptions,
  useUpdateProduct,
} from "@/hooks/queries";
import { money } from "@/lib/utils";

const NONE = "none"; // Radix Select can't hold an empty string as a value.

const BLANK = {
  name: "",
  sku: "",
  category_id: NONE,
  supplier_id: NONE,
  unit_price: "",
  cost_price: "",
  quantity: "0",
  reorder_level: "10",
  description: "",
};

/**
 * Add / edit product.
 *
 * On edit, `quantity` is deliberately read-only: the backend refuses to change
 * stock through this endpoint so a routine price edit can't silently overwrite
 * a stock level. Stock moves through purchases, sales, or an explicit
 * adjustment — each of which leaves a trail.
 */
export function ProductFormDialog({ open, onOpenChange, product }) {
  const editing = Boolean(product?.id);
  const [formError, setFormError] = React.useState(null);

  const categories = useCategories();
  const suppliers = useSupplierOptions();
  const create = useCreateProduct();
  const update = useUpdateProduct();
  const saving = create.isPending || update.isPending;

  const {
    register,
    handleSubmit,
    reset,
    setError,
    setValue,
    watch,
    formState: { errors, isDirty },
  } = useForm({ defaultValues: BLANK });

  // Refill whenever the dialog opens, so a cancelled edit never leaks into the
  // next one.
  React.useEffect(() => {
    if (!open) return;
    setFormError(null);
    reset(
      product
        ? {
            name: product.name ?? "",
            sku: product.sku ?? "",
            category_id: product.category_id ? String(product.category_id) : NONE,
            supplier_id: product.supplier_id ? String(product.supplier_id) : NONE,
            unit_price: product.unit_price != null ? String(product.unit_price) : "",
            cost_price: product.cost_price != null ? String(product.cost_price) : "",
            quantity: String(product.quantity ?? 0),
            reorder_level: String(product.reorder_level ?? 0),
            description: product.description ?? "",
          }
        : BLANK,
    );
  }, [open, product, reset]);

  const unitPrice = Number(watch("unit_price")) || 0;
  const costPrice = Number(watch("cost_price")) || 0;
  const margin = unitPrice > 0 ? ((unitPrice - costPrice) / unitPrice) * 100 : null;

  const onSubmit = async (values) => {
    setFormError(null);

    const payload = {
      name: values.name.trim(),
      category_id: values.category_id === NONE ? null : Number(values.category_id),
      supplier_id: values.supplier_id === NONE ? null : Number(values.supplier_id),
      unit_price: Number(values.unit_price) || 0,
      cost_price: Number(values.cost_price) || 0,
      reorder_level: Number(values.reorder_level) || 0,
      description: values.description.trim() || null,
    };

    const sku = values.sku.trim();
    if (editing) {
      if (sku && sku !== product.sku) payload.sku = sku;
    } else {
      // Left blank, the server generates one from the category (MED-0007).
      if (sku) payload.sku = sku;
      payload.quantity = Number(values.quantity) || 0;
    }

    try {
      const result = editing
        ? await update.mutateAsync({ id: product.id, ...payload })
        : await create.mutateAsync(payload);
      toast.success(result.message);
      onOpenChange(false);
    } catch (error) {
      const fieldErrors = error.fieldErrors ?? {};
      const handled = Object.entries(fieldErrors).filter(([field]) => field in BLANK);
      handled.forEach(([field, message]) => setError(field, { message }));
      if (!handled.length) setFormError(error.message);
    }
  };

  return (
    <Dialog open={open} onOpenChange={saving ? undefined : onOpenChange}>
      <DialogContent side="right" size="md" className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{editing ? "Edit product" : "Add product"}</DialogTitle>
          <DialogDescription>
            {editing
              ? "Change the details. Stock levels move through purchases, sales and adjustments."
              : "Leave the SKU blank and one will be generated from the category."}
          </DialogDescription>
        </DialogHeader>

        <form
          onSubmit={handleSubmit(onSubmit)}
          className="flex min-h-0 flex-1 flex-col"
          noValidate
        >
          <DialogBody className="space-y-1">
            <Field label="Name" htmlFor="name" required error={errors.name?.message}>
              <Input
                id="name"
                autoFocus
                placeholder="Paracetamol 500mg"
                aria-invalid={Boolean(errors.name)}
                {...register("name", {
                  required: "Give the product a name.",
                  minLength: { value: 2, message: "At least 2 characters." },
                  maxLength: { value: 200, message: "200 characters at most." },
                })}
              />
            </Field>

            <Field
              label="SKU"
              htmlFor="sku"
              error={errors.sku?.message}
              hint={editing ? undefined : "Optional — generated if you leave it blank."}
            >
              <Input
                id="sku"
                className="num"
                placeholder="MED-0001"
                aria-invalid={Boolean(errors.sku)}
                {...register("sku", {
                  maxLength: { value: 64, message: "64 characters at most." },
                })}
              />
            </Field>

            <div className="grid gap-x-4 sm:grid-cols-2">
              <Field label="Category" htmlFor="category_id">
                <PickerSelect
                  id="category_id"
                  value={watch("category_id")}
                  onChange={(value) => setValue("category_id", value, { shouldDirty: true })}
                  options={categories.data}
                  loading={categories.isLoading}
                  placeholder="Uncategorised"
                />
              </Field>

              <Field label="Supplier" htmlFor="supplier_id">
                <PickerSelect
                  id="supplier_id"
                  value={watch("supplier_id")}
                  onChange={(value) => setValue("supplier_id", value, { shouldDirty: true })}
                  options={suppliers.data}
                  loading={suppliers.isLoading}
                  placeholder="No supplier"
                />
              </Field>
            </div>

            <div className="grid gap-x-4 sm:grid-cols-2">
              <Field
                label="Cost price"
                htmlFor="cost_price"
                error={errors.cost_price?.message}
                hint="What you pay per unit."
              >
                <Input
                  id="cost_price"
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="0.00"
                  aria-invalid={Boolean(errors.cost_price)}
                  {...register("cost_price", {
                    min: { value: 0, message: "Can't be negative." },
                  })}
                />
              </Field>

              <Field
                label="Selling price"
                htmlFor="unit_price"
                required
                error={errors.unit_price?.message}
                hint={
                  margin !== null
                    ? `${margin.toFixed(1)}% margin · ${money(unitPrice - costPrice)} per unit`
                    : "What the customer pays."
                }
              >
                <Input
                  id="unit_price"
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="0.00"
                  aria-invalid={Boolean(errors.unit_price)}
                  {...register("unit_price", {
                    required: "Set a selling price.",
                    min: { value: 0, message: "Can't be negative." },
                  })}
                />
              </Field>
            </div>

            <div className="grid gap-x-4 sm:grid-cols-2">
              <Field
                label="Opening stock"
                htmlFor="quantity"
                error={errors.quantity?.message}
                hint={
                  editing
                    ? "Use Adjust stock to correct this."
                    : "Units on hand right now."
                }
              >
                <Input
                  id="quantity"
                  type="number"
                  min="0"
                  step="1"
                  disabled={editing}
                  aria-invalid={Boolean(errors.quantity)}
                  {...register("quantity", {
                    min: { value: 0, message: "Can't be negative." },
                  })}
                />
              </Field>

              <Field
                label="Reorder level"
                htmlFor="reorder_level"
                required
                error={errors.reorder_level?.message}
                hint="Below this, the product is flagged low."
              >
                <Input
                  id="reorder_level"
                  type="number"
                  min="0"
                  step="1"
                  aria-invalid={Boolean(errors.reorder_level)}
                  {...register("reorder_level", {
                    required: "Set a reorder level.",
                    min: { value: 0, message: "Can't be negative." },
                  })}
                />
              </Field>
            </div>

            <Field label="Description" htmlFor="description" error={errors.description?.message}>
              <Textarea
                id="description"
                rows={3}
                placeholder="Pack size, dosage, storage notes…"
                {...register("description", {
                  maxLength: { value: 5000, message: "That's too long." },
                })}
              />
            </Field>

            <FormError error={formError} />
          </DialogBody>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={saving}
            >
              Cancel
            </Button>
            <Button type="submit" loading={saving} disabled={editing && !isDirty}>
              {editing ? "Save changes" : "Add product"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

/** A `{id, name}` list as a Select, with an explicit "none" option. */
function PickerSelect({ id, value, onChange, options, loading, placeholder }) {
  return (
    <Select value={value} onValueChange={onChange} disabled={loading}>
      <SelectTrigger id={id}>
        <SelectValue placeholder={loading ? "Loading…" : placeholder} />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value={NONE}>{placeholder}</SelectItem>
        {(options ?? []).map((option) => (
          <SelectItem key={option.id} value={String(option.id)}>
            {option.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
