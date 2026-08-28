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
import { useSaveSupplier } from "@/hooks/queries";

const BLANK = {
  name: "",
  contact_person: "",
  phone: "",
  email: "",
  address: "",
};

export function SupplierFormDialog({ open, onOpenChange, supplier }) {
  const editing = Boolean(supplier?.id);
  const [formError, setFormError] = React.useState(null);
  const save = useSaveSupplier();

  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors, isDirty },
  } = useForm({ defaultValues: BLANK });

  React.useEffect(() => {
    if (!open) return;
    setFormError(null);
    reset(
      supplier
        ? {
            name: supplier.name ?? "",
            contact_person: supplier.contact_person ?? "",
            phone: supplier.phone ?? "",
            email: supplier.email ?? "",
            address: supplier.address ?? "",
          }
        : BLANK,
    );
  }, [open, supplier, reset]);

  const onSubmit = async (values) => {
    setFormError(null);
    try {
      const result = await save.mutateAsync({
        id: supplier?.id,
        name: values.name.trim(),
        contact_person: values.contact_person.trim() || null,
        phone: values.phone.trim() || null,
        email: values.email.trim() || null,
        address: values.address.trim() || null,
      });
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
    <Dialog open={open} onOpenChange={save.isPending ? undefined : onOpenChange}>
      <DialogContent side="right" size="sm">
        <DialogHeader>
          <DialogTitle>{editing ? "Edit supplier" : "Add supplier"}</DialogTitle>
          <DialogDescription>
            Only the name is required — fill in the rest as you get it.
          </DialogDescription>
        </DialogHeader>

        <form
          onSubmit={handleSubmit(onSubmit)}
          className="flex min-h-0 flex-1 flex-col"
          noValidate
        >
          <DialogBody className="space-y-1">
            <Field label="Business name" htmlFor="sup-name" required error={errors.name?.message}>
              <Input
                id="sup-name"
                autoFocus
                placeholder="MedSupply Co"
                aria-invalid={Boolean(errors.name)}
                {...register("name", {
                  required: "Give the supplier a name.",
                  minLength: { value: 2, message: "At least 2 characters." },
                  maxLength: { value: 160, message: "160 characters at most." },
                })}
              />
            </Field>

            <Field
              label="Contact person"
              htmlFor="sup-contact"
              error={errors.contact_person?.message}
            >
              <Input
                id="sup-contact"
                placeholder="Asha Menon"
                {...register("contact_person", {
                  maxLength: { value: 120, message: "120 characters at most." },
                })}
              />
            </Field>

            <div className="grid gap-x-4 sm:grid-cols-2">
              <Field label="Phone" htmlFor="sup-phone" error={errors.phone?.message}>
                <Input
                  id="sup-phone"
                  type="tel"
                  className="num"
                  placeholder="+91 98765 43210"
                  {...register("phone", {
                    maxLength: { value: 40, message: "40 characters at most." },
                  })}
                />
              </Field>

              <Field label="Email" htmlFor="sup-email" error={errors.email?.message}>
                <Input
                  id="sup-email"
                  type="email"
                  className="num"
                  placeholder="orders@medsupply.in"
                  aria-invalid={Boolean(errors.email)}
                  {...register("email", {
                    maxLength: { value: 255, message: "255 characters at most." },
                    pattern: {
                      value: /^$|^[^\s@]+@[^\s@]+\.[^\s@]+$/,
                      message: "That doesn't look like an email address.",
                    },
                  })}
                />
              </Field>
            </div>

            <Field label="Address" htmlFor="sup-address" error={errors.address?.message}>
              <Textarea
                id="sup-address"
                rows={3}
                placeholder="Unit 4, Industrial Estate, Pune 411057"
                {...register("address", {
                  maxLength: { value: 2000, message: "That's too long." },
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
              disabled={save.isPending}
            >
              Cancel
            </Button>
            <Button type="submit" loading={save.isPending} disabled={editing && !isDirty}>
              {editing ? "Save changes" : "Add supplier"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
