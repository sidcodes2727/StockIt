import * as React from "react";
import { useForm } from "react-hook-form";
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
import { useSaveUser } from "@/hooks/queries";

export function UserFormDialog({ open, onOpenChange, user }) {
  const isEditing = Boolean(user);
  const save = useSaveUser();

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    setError,
    reset,
    formState: { errors, isSubmitting },
  } = useForm({
    defaultValues: {
      name: "",
      email: "",
      role: "user",
      password: "",
    },
  });

  // Load data when opening to edit
  React.useEffect(() => {
    if (open) {
      if (user) {
        reset({
          name: user.name || "",
          email: user.email || "",
          role: user.role || "user",
          password: "", // Leave blank, only fill if changing
        });
      } else {
        reset({
          name: "",
          email: "",
          role: "user",
          password: "",
        });
      }
    }
  }, [open, user, reset]);

  const onSubmit = async (data) => {
    // Drop empty password on update so we don't accidentally blank it
    const payload = { ...data };
    if (isEditing && !payload.password) {
      delete payload.password;
    }

    try {
      await save.mutateAsync({
        id: user?.id,
        ...payload,
      });
      toast.success(isEditing ? "User updated." : "User created.");
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

  const role = watch("role");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <form onSubmit={handleSubmit(onSubmit)}>
          <DialogHeader>
            <DialogTitle>{isEditing ? "Edit User" : "Add User"}</DialogTitle>
            <DialogDescription>
              {isEditing
                ? "Update user details or change their role."
                : "Create a new user account."}
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <Field label="Name" htmlFor="name" error={errors.name?.message} required>
              <Input
                id="name"
                autoComplete="off"
                {...register("name", { required: "Name is required" })}
              />
            </Field>

            <Field label="Email" htmlFor="email" error={errors.email?.message} required>
              <Input
                id="email"
                type="email"
                autoComplete="off"
                {...register("email", { required: "Email is required" })}
              />
            </Field>

            <Field label="Role" htmlFor="role" error={errors.role?.message} required>
              <Select value={role} onValueChange={(val) => setValue("role", val)}>
                <SelectTrigger id="role">
                  <SelectValue placeholder="Select a role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="user">User (Standard)</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                </SelectContent>
              </Select>
            </Field>

            <Field
              label={isEditing ? "New Password" : "Password"}
              htmlFor="password"
              error={errors.password?.message}
              required={!isEditing}
              hint={isEditing ? "Leave blank to keep current password" : ""}
            >
              <Input
                id="password"
                type="password"
                autoComplete="new-password"
                {...register("password", {
                  required: isEditing ? false : "Password is required",
                  minLength: {
                    value: 8,
                    message: "Must be at least 8 characters",
                  },
                })}
              />
            </Field>

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
              {isEditing ? "Save changes" : "Create user"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
