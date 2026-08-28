import * as React from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { Field, FormError } from "@/components/Field";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { useCreatePurchase, useProductOptions, useSupplierOptions } from "@/hooks/queries";
import { money } from "@/lib/utils";

export function PurchaseFormDialog({ open, onOpenChange }) {
  const create = useCreatePurchase();
  const productsQuery = useProductOptions();
  const suppliersQuery = useSupplierOptions();

  const products = productsQuery.data || [];
  const suppliers = suppliersQuery.data || [];

  const {
    register,
    control,
    handleSubmit,
    setValue,
    watch,
    setError,
    reset,
    formState: { errors, isSubmitting },
  } = useForm({
    defaultValues: {
      supplier_id: "",
      purchase_date: new Date().toISOString().split("T")[0],
      update_cost_price: true,
      items: [{ product_id: "", quantity: 1, cost_price: "" }],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: "items",
  });

  const itemsWatch = watch("items");

  React.useEffect(() => {
    if (open) {
      reset({
        supplier_id: "",
        purchase_date: new Date().toISOString().split("T")[0],
        update_cost_price: true,
        items: [{ product_id: "", quantity: 1, cost_price: "" }],
      });
    }
  }, [open, reset]);

  const onSubmit = async (data) => {
    // Transform payload
    const payload = {
      supplier_id: data.supplier_id ? parseInt(data.supplier_id, 10) : null,
      purchase_date: data.purchase_date,
      update_cost_price: data.update_cost_price,
      items: data.items.map((item) => ({
        product_id: parseInt(item.product_id, 10),
        quantity: parseInt(item.quantity, 10),
        cost_price: item.cost_price ? parseFloat(item.cost_price) : undefined,
      })),
    };

    try {
      const response = await create.mutateAsync(payload);
      toast.success(response.message || "Purchase recorded.");
      onOpenChange(false);
    } catch (error) {
      if (error.fieldErrors) {
        Object.entries(error.fieldErrors).forEach(([field, message]) => {
          setError(field, { type: "server", message });
        });
      }
      setError("root", { message: error.message });
    }
  };

  const calculateTotal = () => {
    return itemsWatch.reduce((total, item) => {
      const q = parseInt(item.quantity, 10) || 0;
      const c = parseFloat(item.cost_price) || 0;
      return total + q * c;
    }, 0);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <form onSubmit={handleSubmit(onSubmit)}>
          <DialogHeader>
            <DialogTitle>Record Purchase</DialogTitle>
            <DialogDescription>
              Log incoming stock. This will update inventory levels and your purchase reports.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-6 py-6">
            <div className="grid grid-cols-2 gap-4">
              <Field label="Supplier" htmlFor="supplier_id" error={errors.supplier_id?.message}>
                <Select
                  value={watch("supplier_id")}
                  onValueChange={(val) => setValue("supplier_id", val)}
                >
                  <SelectTrigger id="supplier_id">
                    <SelectValue placeholder="Select supplier (optional)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value=" ">None</SelectItem>
                    {suppliers.map((s) => (
                      <SelectItem key={s.id} value={String(s.id)}>
                        {s.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>

              <Field label="Purchase Date" htmlFor="purchase_date" error={errors.purchase_date?.message} required>
                <Input
                  id="purchase_date"
                  type="date"
                  {...register("purchase_date", { required: "Date is required" })}
                />
              </Field>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-medium">Line Items</h4>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => append({ product_id: "", quantity: 1, cost_price: "" })}
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Add Item
                </Button>
              </div>

              <div className="border border-border rounded-md divide-y divide-border">
                <div className="flex gap-4 p-3 bg-muted/50 text-xs font-medium text-muted-foreground">
                  <div className="flex-1">Product</div>
                  <div className="w-24 text-right">Quantity</div>
                  <div className="w-32 text-right">Unit Cost</div>
                  <div className="w-24 text-right">Line Total</div>
                  <div className="w-10"></div>
                </div>
                
                {fields.map((field, index) => {
                  const qty = parseInt(itemsWatch[index]?.quantity || 0, 10);
                  const cost = parseFloat(itemsWatch[index]?.cost_price || 0);
                  const lineTotal = qty * cost;

                  return (
                    <div key={field.id} className="flex gap-4 p-3 items-start">
                      <div className="flex-1">
                        <Select
                          value={itemsWatch[index]?.product_id}
                          onValueChange={(val) => {
                            setValue(`items.${index}.product_id`, val);
                            // Auto-fill cost price if available
                            const prod = products.find(p => p.id === parseInt(val, 10));
                            if (prod && prod.cost_price) {
                              setValue(`items.${index}.cost_price`, String(prod.cost_price));
                            }
                          }}
                        >
                          <SelectTrigger className={errors.items?.[index]?.product_id ? "border-destructive" : ""}>
                            <SelectValue placeholder="Select product..." />
                          </SelectTrigger>
                          <SelectContent>
                            {products.map((p) => (
                              <SelectItem key={p.id} value={String(p.id)}>
                                {p.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="w-24">
                        <Input
                          type="number"
                          min="1"
                          {...register(`items.${index}.quantity`, {
                            required: "Required",
                            min: 1,
                          })}
                          className={`text-right ${errors.items?.[index]?.quantity ? "border-destructive" : ""}`}
                        />
                      </div>

                      <div className="w-32">
                        <Input
                          type="number"
                          step="0.01"
                          min="0"
                          {...register(`items.${index}.cost_price`, {
                            required: "Required",
                            min: 0,
                          })}
                          className={`text-right ${errors.items?.[index]?.cost_price ? "border-destructive" : ""}`}
                        />
                      </div>

                      <div className="w-24 pt-2 text-right text-sm font-medium">
                        {money(lineTotal)}
                      </div>

                      <div className="w-10 pt-1 text-right">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon-sm"
                          className="text-muted-foreground hover:text-destructive"
                          onClick={() => {
                            if (fields.length > 1) remove(index);
                          }}
                          disabled={fields.length === 1}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>

              {errors.items?.root && (
                <p className="text-sm text-destructive">{errors.items.root.message}</p>
              )}
            </div>

            <div className="flex items-end justify-between">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="update_cost_price"
                  checked={watch("update_cost_price")}
                  onCheckedChange={(val) => setValue("update_cost_price", val)}
                />
                <label
                  htmlFor="update_cost_price"
                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                >
                  Update product cost prices
                </label>
              </div>

              <div className="text-right space-y-1">
                <p className="text-sm text-muted-foreground">Total Value</p>
                <p className="text-xl font-bold">{money(calculateTotal())}</p>
              </div>
            </div>

            <FormError error={errors.root} />
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              Record Purchase
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
