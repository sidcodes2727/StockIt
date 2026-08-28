import * as React from "react";
import { Link } from "react-router-dom";
import { FolderPlus, MoreHorizontal, Pencil, Tags, Trash2, X } from "lucide-react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

import { EmptyState, ErrorState } from "@/components/EmptyState";
import { Field, FormError } from "@/components/Field";
import { PageHeader } from "@/components/PageHeader";
import { SearchInput } from "@/components/SearchInput";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ConfirmDialog } from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input, Textarea } from "@/components/ui/input";
import { TableSkeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useAuth } from "@/hooks/useAuth";
import { useCategories, useDeleteCategory, useSaveCategory } from "@/hooks/queries";
import { number } from "@/lib/utils";

export default function Categories() {
  const { isAdmin } = useAuth();
  const [search, setSearch] = React.useState("");
  const [formOpen, setFormOpen] = React.useState(false);
  const [editing, setEditing] = React.useState(null);
  const [pendingDelete, setPendingDelete] = React.useState(null);

  const categories = useCategories();
  const remove = useDeleteCategory();

  // The endpoint is deliberately unpaginated — it powers filter dropdowns — so
  // the search happens here rather than as another round trip.
  const items = React.useMemo(() => {
    const all = categories.data ?? [];
    const needle = search.trim().toLowerCase();
    if (!needle) return all;
    return all.filter(
      (category) =>
        category.name.toLowerCase().includes(needle) ||
        (category.description ?? "").toLowerCase().includes(needle),
    );
  }, [categories.data, search]);

  const totalProducts = (categories.data ?? []).reduce(
    (sum, category) => sum + (category.product_count ?? 0),
    0,
  );

  const confirmDelete = async () => {
    try {
      const response = await remove.mutateAsync(pendingDelete.id);
      toast.success(response.data?.message ?? "Category deleted.");
      setPendingDelete(null);
    } catch (error) {
      toast.error(error.message);
      setPendingDelete(null);
    }
  };

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Catalogue"
        title="Categories"
        description="How your catalogue is grouped. Categories also seed generated SKUs — a product in Medicines becomes MED-0007."
      >
        <Button
          size="sm"
          onClick={() => {
            setEditing(null);
            setFormOpen(true);
          }}
        >
          <FolderPlus />
          New category
        </Button>
      </PageHeader>

      <Card>
        <div className="flex flex-col gap-2.5 border-b border-border p-4 sm:flex-row sm:items-center">
          <SearchInput
            value={search}
            onChange={setSearch}
            placeholder="Search categories…"
            className="sm:max-w-xs sm:flex-1"
          />
          {search && (
            <Button variant="ghost" size="sm" onClick={() => setSearch("")}>
              <X />
              Clear
            </Button>
          )}
          {categories.data && (
            <p className="num ml-auto hidden text-[12.5px] text-muted-foreground sm:block">
              {number(categories.data.length)} categories ·{" "}
              {number(totalProducts)} products
            </p>
          )}
        </div>

        {categories.isError ? (
          <ErrorState error={categories.error} onRetry={categories.refetch} />
        ) : categories.isLoading ? (
          <TableSkeleton rows={5} columns={4} />
        ) : items.length === 0 ? (
          search ? (
            <EmptyState
              title="No categories match that search"
              description="Try a shorter term."
              actionLabel="Clear search"
              onAction={() => setSearch("")}
            />
          ) : (
            <EmptyState
              icon={Tags}
              title="No categories yet"
              description="Group your products so filters, reports and generated SKUs have something to work with."
              actionLabel="New category"
              onAction={() => {
                setEditing(null);
                setFormOpen(true);
              }}
            />
          )
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead>Category</TableHead>
                <TableHead className="hidden md:table-cell">Description</TableHead>
                <TableHead align="right">Products</TableHead>
                <TableHead align="right" className="w-12">
                  <span className="sr-only">Actions</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((category) => (
                <TableRow key={category.id}>
                  <TableCell>
                    <span className="text-[13px] font-medium">{category.name}</span>
                  </TableCell>
                  <TableCell className="hidden md:table-cell">
                    <span className="block max-w-[420px] truncate text-[13px] text-muted-foreground">
                      {category.description || "—"}
                    </span>
                  </TableCell>
                  <TableCell align="right">
                    {category.product_count > 0 ? (
                      <Link
                        to={`/products?category_id=${category.id}`}
                        className="num text-[13px] font-medium text-primary underline-offset-2 hover:underline"
                      >
                        {number(category.product_count)}
                      </Link>
                    ) : (
                      <span className="num text-[13px] text-muted-foreground">0</span>
                    )}
                  </TableCell>
                  <TableCell align="right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          aria-label={`Actions for ${category.name}`}
                        >
                          <MoreHorizontal />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-44">
                        <DropdownMenuItem
                          onSelect={() => {
                            setEditing(category);
                            setFormOpen(true);
                          }}
                        >
                          <Pencil />
                          Rename
                        </DropdownMenuItem>
                        {isAdmin && (
                          <>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              destructive
                              onSelect={() => setPendingDelete(category)}
                            >
                              <Trash2 />
                              Delete
                            </DropdownMenuItem>
                          </>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Card>

      <CategoryFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        category={editing}
      />

      <ConfirmDialog
        open={Boolean(pendingDelete)}
        onOpenChange={(open) => !open && setPendingDelete(null)}
        title={`Delete "${pendingDelete?.name}"?`}
        description="The category is removed from the catalogue. Products keep their stock but lose this grouping."
        consequence={
          pendingDelete?.product_count > 0
            ? `${number(pendingDelete.product_count)} product${
                pendingDelete.product_count === 1 ? "" : "s"
              } still use this category — reassign them first.`
            : undefined
        }
        confirmLabel="Delete category"
        loading={remove.isPending}
        onConfirm={confirmDelete}
      />
    </div>
  );
}

function CategoryFormDialog({ open, onOpenChange, category }) {
  const editing = Boolean(category?.id);
  const [formError, setFormError] = React.useState(null);
  const save = useSaveCategory();

  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors },
  } = useForm({ defaultValues: { name: "", description: "" } });

  React.useEffect(() => {
    if (!open) return;
    setFormError(null);
    reset({
      name: category?.name ?? "",
      description: category?.description ?? "",
    });
  }, [open, category, reset]);

  const onSubmit = async (values) => {
    setFormError(null);
    try {
      const result = await save.mutateAsync({
        id: category?.id,
        name: values.name.trim(),
        description: values.description.trim() || null,
      });
      toast.success(result.message);
      onOpenChange(false);
    } catch (error) {
      const fieldErrors = error.fieldErrors ?? {};
      const handled = Object.entries(fieldErrors).filter(([field]) =>
        ["name", "description"].includes(field),
      );
      handled.forEach(([field, message]) => setError(field, { message }));
      if (!handled.length) setFormError(error.message);
    }
  };

  return (
    <Dialog open={open} onOpenChange={save.isPending ? undefined : onOpenChange}>
      <DialogContent size="sm">
        <DialogHeader>
          <DialogTitle>{editing ? "Rename category" : "New category"}</DialogTitle>
          <DialogDescription>
            {editing
              ? "Products keep their grouping — only the label changes."
              : "Used for filters, reports and generated SKUs."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} noValidate>
          <DialogBody className="space-y-1">
            <Field label="Name" htmlFor="cat-name" required error={errors.name?.message}>
              <Input
                id="cat-name"
                autoFocus
                placeholder="Medicines"
                aria-invalid={Boolean(errors.name)}
                {...register("name", {
                  required: "Give the category a name.",
                  minLength: { value: 2, message: "At least 2 characters." },
                  maxLength: { value: 120, message: "120 characters at most." },
                })}
              />
            </Field>

            <Field
              label="Description"
              htmlFor="cat-description"
              error={errors.description?.message}
              hint="Optional — what belongs in here."
            >
              <Textarea
                id="cat-description"
                rows={3}
                placeholder="Prescription and over-the-counter medication."
                {...register("description", {
                  maxLength: { value: 1000, message: "1000 characters at most." },
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
            <Button type="submit" loading={save.isPending}>
              {editing ? "Save changes" : "Create category"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
