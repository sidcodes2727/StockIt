import * as React from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

import { Field, FormError } from "@/components/Field";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/hooks/useAuth";
import { useChangePassword, useUpdateProfile } from "@/hooks/queries";

export default function Settings() {
  const { user, updateUser } = useAuth();
  
  return (
    <div className="space-y-6 max-w-3xl">
      <PageHeader
        eyebrow="Account"
        title="Settings"
        description="Manage your profile details and password."
      />
      
      <div className="grid gap-6 md:grid-cols-2">
        <ProfileForm user={user} onSuccess={updateUser} />
        <PasswordForm />
      </div>
    </div>
  );
}

function ProfileForm({ user, onSuccess }) {
  const update = useUpdateProfile();
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm({
    defaultValues: {
      name: user?.name || "",
      email: user?.email || "",
    },
  });

  const onSubmit = async (data) => {
    try {
      const { user: updatedUser } = await update.mutateAsync(data);
      onSuccess(updatedUser);
      toast.success("Profile updated");
    } catch (error) {
      if (error.fieldErrors) {
        Object.entries(error.fieldErrors).forEach(([field, message]) => {
          setError(field, { type: "server", message });
        });
      }
      setError("root", { message: error.message });
    }
  };

  return (
    <Card className="p-5">
      <h3 className="mb-4 text-[15px] font-medium">Profile</h3>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <Field label="Name" htmlFor="name" error={errors.name?.message} required>
          <Input id="name" {...register("name", { required: "Name is required" })} />
        </Field>
        <Field label="Email" htmlFor="email" error={errors.email?.message} required>
          <Input id="email" type="email" {...register("email", { required: "Email is required" })} />
        </Field>
        
        <FormError error={errors.root} />
        
        <div className="pt-2">
          <Button type="submit" disabled={isSubmitting}>
            Save profile
          </Button>
        </div>
      </form>
    </Card>
  );
}

function PasswordForm() {
  const change = useChangePassword();
  const {
    register,
    handleSubmit,
    setError,
    reset,
    formState: { errors, isSubmitting },
  } = useForm({
    defaultValues: {
      current_password: "",
      new_password: "",
    },
  });

  const onSubmit = async (data) => {
    try {
      await change.mutateAsync(data);
      toast.success("Password changed successfully");
      reset();
    } catch (error) {
      if (error.fieldErrors) {
        Object.entries(error.fieldErrors).forEach(([field, message]) => {
          setError(field, { type: "server", message });
        });
      }
      setError("root", { message: error.message });
    }
  };

  return (
    <Card className="p-5">
      <h3 className="mb-4 text-[15px] font-medium">Change Password</h3>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <Field label="Current password" htmlFor="current_password" error={errors.current_password?.message} required>
          <Input id="current_password" type="password" {...register("current_password", { required: "Required" })} />
        </Field>
        <Field label="New password" htmlFor="new_password" error={errors.new_password?.message} required>
          <Input id="new_password" type="password" {...register("new_password", { required: "Required", minLength: { value: 8, message: "Must be at least 8 characters" } })} />
        </Field>
        
        <FormError error={errors.root} />
        
        <div className="pt-2">
          <Button type="submit" disabled={isSubmitting}>
            Update password
          </Button>
        </div>
      </form>
    </Card>
  );
}
