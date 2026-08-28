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
import { useCreateSale, useProductOptions } from "@/hooks/queries";
import { money } from "@/lib/utils";

export function SaleFormDialog({ open, onOpenChange }) {
  const create = useCreateSale();
  const productsQuery = useProductOptions();

  const products = productsQuery.data || [];

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
      customer_name: "",
      sale_date: new Date().toISOString().split("T")[0],
      items: [{ product_id: "", quantity: 1, sale_price: "" }],
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
        customer_name: "",
        sale_date: new Date().toISOString().split("T")[0],
        items: [{ product_id: "", quantity: 1, sale_price: "" }],
      });
    }
  }, [open, reset]);

  const onSubmit = async (data) => {
    const payload = {
      customer_name: data.customer_name || null,
      sale_date: data.sale_date,
      items: data.items.map((item) => ({
        product_id: parseInt(item.product_id, 10),
        quantity: parseInt(item.quantity, 10),
        sale_price: item.sale_price ? parseFloat(item.sale_price) : undefined,
      })),
    };

    try {
      const response = await create.mutateAsync(payload);
      toast.success(response.message || "Sale recorded.");
      onOpenChange(false);
    } catch (error) {
      if (error.fieldErrors) {
        Object.entries(error.fieldErrors).forEach(([field, message]) => {
          setError(field, { type: "server", message });
        });
      }
      
      // Handle insufficient stock errors nicely
      if (error.code === "INSUFFICIENT_STOCK" && error.details?.shortfalls) {
        const lines = error.details.shortfalls.map(s => 
          `• ${s.product_name}: need ${s.requested}, have ${s.available}`
        );
        setError("root", { message: `Not enough stock:\n${lines.join("\n")}` });
      } else {
        setError("root", { message: error.message });
      }
    }
  };

  const calculateTotal = () => {
    return itemsWatch.reduce((total, item) => {
      const q = parseInt(item.quantity, 10) || 0;
      const p = parseFloat(item.sale_price) || 0;
      return total + q * p;
    }, 0);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <form onSubmit={handleSubmit(onSubmit)}>
          <DialogHeader>
            <DialogTitle>Record Sale</DialogTitle>
            <DialogDescription>
              Log an outgoing transaction. This deducts from your inventory.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-6 py-6">
            <div className="grid grid-cols-2 gap-4">
              <Field label="Customer Name" htmlFor="customer_name" error={errors.customer_name?.message}>
                <Input
                  id="customer_name"
                  placeholder="Walk-in customer"
                  {...register("customer_name")}
                />
              </Field>

              <Field label="Sale Date" htmlFor="sale_date" error={errors.sale_date?.message} required>
                <Input
                  id="sale_date"
                  type="date"
                  {...register("sale_date", { required: "Date is required" })}
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
                  onClick={() => append({ product_id: "", quantity: 1, sale_price: "" })}
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Add Item
                </Button>
              </div>

              <div className="border border-border rounded-md divide-y divide-border">
                <div className="flex gap-4 p-3 bg-muted/50 text-xs font-medium text-muted-foreground">
                  <div className="flex-1">Product</div>
                  <div className="w-24 text-right">Quantity</div>
                  <div className="w-32 text-right">Unit Price</div>
                  <div className="w-24 text-right">Line Total</div>
                  <div className="w-10"></div>
                </div>
                
                {fields.map((field, index) => {
                  const qty = parseInt(itemsWatch[index]?.quantity || 0, 10);
                  const price = parseFloat(itemsWatch[index]?.sale_price || 0);
                  const lineTotal = qty * price;

                  return (
                    <div key={field.id} className="flex gap-4 p-3 items-start">
                      <div className="flex-1">
                        <Select
                          value={itemsWatch[index]?.product_id}
                          onValueChange={(val) => {
                            setValue(`items.${index}.product_id`, val);
                            // Auto-fill unit price if available
                            const prod = products.find(p => p.id === parseInt(val, 10));
                            if (prod && prod.unit_price) {
                              setValue(`items.${index}.sale_price`, String(prod.unit_price));
                            }
                          }}
                        >
                          <SelectTrigger className={errors.items?.[index]?.product_id ? "border-destructive" : ""}>
                            <SelectValue placeholder="Select product..." />
                          </SelectTrigger>
                          <SelectContent>
                            {products.map((p) => (
                              <SelectItem key={p.id} value={String(p.id)} disabled={p.quantity <= 0}>
                                <div className="flex justify-between w-full">
                                  <span>{p.name}</span>
                                  <span className="text-muted-foreground ml-2">({p.quantity} in stock)</span>
                                </div>
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
                          {...register(`items.${index}.sale_price`, {
                            required: "Required",
                            min: 0,
                          })}
                          className={`text-right ${errors.items?.[index]?.sale_price ? "border-destructive" : ""}`}
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
              <div>
                {/* Placeholder for left side of footer */}
              </div>

              <div className="text-right space-y-1">
                <p className="text-sm text-muted-foreground">Total Sale</p>
                <p className="text-xl font-bold">{money(calculateTotal())}</p>
              </div>
            </div>

            {errors.root && (
              <div className="rounded-md border border-destructive/25 bg-destructive/10 px-3 py-2 text-[13px] text-destructive whitespace-pre-line">
                {errors.root.message}
              </div>
            )}
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
              Record Sale
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
