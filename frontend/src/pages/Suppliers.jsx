import * as React from "react";
import { Link } from "react-router-dom";
import {
  Building2,
  Mail,
  MoreHorizontal,
  Pencil,
  Phone,
  Trash2,
  Truck,
  UserPlus,
  X,
} from "lucide-react";
import { toast } from "sonner";

import { EmptyState, ErrorState } from "@/components/EmptyState";
import { PageHeader } from "@/components/PageHeader";
import { Pagination } from "@/components/Pagination";
import { SearchInput } from "@/components/SearchInput";
import { SupplierFormDialog } from "@/components/suppliers/SupplierFormDialog";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ConfirmDialog } from "@/components/ui/alert-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { TableSkeleton } from "@/components/ui/skeleton";
import {
  SortableHead,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useDeleteSupplier, useSuppliers } from "@/hooks/queries";
import { useTableParams } from "@/hooks/useTableParams";
import { number } from "@/lib/utils";

const DEFAULTS = {
  search: "",
  sort_by: "name",
  sort_dir: "asc",
  page: 1,
  per_page: 25,
};

export default function Suppliers() {
  const { params, setParams, reset, isFiltered } = useTableParams(DEFAULTS);
  const [formOpen, setFormOpen] = React.useState(false);
  const [editing, setEditing] = React.useState(null);
  const [pendingDelete, setPendingDelete] = React.useState(null);

  const suppliers = useSuppliers(params);
  const remove = useDeleteSupplier();

  const items = suppliers.data?.items ?? [];
  const meta = suppliers.data?.meta;

  const confirmDelete = async () => {
    try {
      const response = await remove.mutateAsync(pendingDelete.id);
      toast.success(response.data?.message ?? "Supplier deleted.");
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
        title="Suppliers"
        description="Who you buy from. Open a supplier to see the products they provide and everything you've received from them."
      >
        <Button
          size="sm"
          onClick={() => {
            setEditing(null);
            setFormOpen(true);
          }}
        >
          <UserPlus />
          Add supplier
        </Button>
      </PageHeader>

      <Card>
        <div className="flex flex-col gap-2.5 border-b border-border p-4 sm:flex-row sm:items-center">
          <SearchInput
            value={params.search}
            onChange={(value) => setParams({ search: value })}
            placeholder="Search name, contact, email or phone…"
            className="sm:max-w-sm sm:flex-1"
          />
          {isFiltered && (
            <Button variant="ghost" size="sm" onClick={reset}>
              <X />
              Clear
            </Button>
          )}
          {meta && (
            <p className="num ml-auto hidden text-[12.5px] text-muted-foreground sm:block">
              {number(meta.total)} supplier{meta.total === 1 ? "" : "s"}
            </p>
          )}
        </div>

        {suppliers.isError ? (
          <ErrorState error={suppliers.error} onRetry={suppliers.refetch} />
        ) : suppliers.isLoading ? (
          <TableSkeleton rows={6} columns={4} />
        ) : items.length === 0 ? (
          isFiltered ? (
            <EmptyState
              title="No suppliers match that search"
              description="Try a shorter term, or search by phone number."
              actionLabel="Clear search"
              onAction={reset}
            />
          ) : (
            <EmptyState
              icon={Truck}
              title="No suppliers yet"
              description="Add the businesses you buy stock from — purchases can then be attributed to them."
              actionLabel="Add supplier"
              onAction={() => {
                setEditing(null);
                setFormOpen(true);
              }}
            />
          )
        ) : (
          <div className={suppliers.isPlaceholderData ? "opacity-60 transition-opacity" : undefined}>
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <SortableHead
                    columnKey="name"
                    sortBy={params.sort_by}
                    sortDir={params.sort_dir}
                    onSort={(key, dir) => setParams({ sort_by: key, sort_dir: dir })}
                  >
                    Supplier
                  </SortableHead>
                  <SortableHead
                    columnKey="contact_person"
                    className="hidden md:table-cell"
                    sortBy={params.sort_by}
                    sortDir={params.sort_dir}
                    onSort={(key, dir) => setParams({ sort_by: key, sort_dir: dir })}
                  >
                    Contact
                  </SortableHead>
                  <TableHead className="hidden lg:table-cell">Reach them</TableHead>
                  <TableHead align="right">Products</TableHead>
                  <TableHead align="right" className="w-12">
                    <span className="sr-only">Actions</span>
                  </TableHead>
                </TableRow>
              </TableHeader>

              <TableBody>
                {items.map((supplier) => (
                  <TableRow key={supplier.id}>
                    <TableCell>
                      <Link
                        to={`/suppliers/${supplier.id}`}
                        className="flex items-center gap-3 group"
                      >
                        <span className="flex size-8 shrink-0 items-center justify-center rounded-md border border-border bg-muted/60 text-muted-foreground">
                          <Building2 className="size-4" aria-hidden="true" />
                        </span>
                        <span className="min-w-0">
                          <span className="block max-w-[220px] truncate text-[13px] font-medium underline-offset-2 group-hover:underline">
                            {supplier.name}
                          </span>
                          {supplier.address && (
                            <span className="block max-w-[220px] truncate text-[11.5px] text-muted-foreground">
                              {supplier.address}
                            </span>
                          )}
                        </span>
                      </Link>
                    </TableCell>

                    <TableCell className="hidden md:table-cell">
                      <span className="text-[13px] text-muted-foreground">
                        {supplier.contact_person || "—"}
                      </span>
                    </TableCell>

                    <TableCell className="hidden lg:table-cell">
                      <div className="space-y-0.5">
                        {supplier.phone && (
                          <a
                            href={`tel:${supplier.phone}`}
                            className="num flex items-center gap-1.5 text-[12.5px] text-muted-foreground hover:text-foreground"
                          >
                            <Phone className="size-3" aria-hidden="true" />
                            {supplier.phone}
                          </a>
                        )}
                        {supplier.email && (
                          <a
                            href={`mailto:${supplier.email}`}
                            className="flex max-w-[200px] items-center gap-1.5 truncate text-[12.5px] text-muted-foreground hover:text-foreground"
                          >
                            <Mail className="size-3 shrink-0" aria-hidden="true" />
                            <span className="num truncate">{supplier.email}</span>
                          </a>
                        )}
                        {!supplier.phone && !supplier.email && (
                          <span className="text-[13px] text-muted-foreground">—</span>
                        )}
                      </div>
                    </TableCell>

                    <TableCell align="right">
                      {supplier.product_count > 0 ? (
                        <Link
                          to={`/products?supplier_id=${supplier.id}`}
                          className="num text-[13px] font-medium text-primary underline-offset-2 hover:underline"
                        >
                          {number(supplier.product_count)}
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
                            aria-label={`Actions for ${supplier.name}`}
                          >
                            <MoreHorizontal />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-48">
                          <DropdownMenuItem asChild>
                            <Link to={`/suppliers/${supplier.id}`}>
                              <Building2 />
                              View supplier
                            </Link>
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onSelect={() => {
                              setEditing(supplier);
                              setFormOpen(true);
                            }}
                          >
                            <Pencil />
                            Edit details
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            destructive
                            onSelect={() => setPendingDelete(supplier)}
                          >
                            <Trash2 />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>

            <Pagination
              meta={meta}
              onPageChange={(page) => setParams({ page })}
              onPageSizeChange={(size) => setParams({ per_page: size, page: 1 })}
            />
          </div>
        )}
      </Card>

      <SupplierFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        supplier={editing}
      />

      <ConfirmDialog
        open={Boolean(pendingDelete)}
        onOpenChange={(open) => !open && setPendingDelete(null)}
        title={`Delete "${pendingDelete?.name}"?`}
        description="The supplier is removed. Products they supply keep their stock but lose the link."
        consequence={
          pendingDelete?.product_count > 0
            ? `${number(pendingDelete.product_count)} product${
                pendingDelete.product_count === 1 ? "" : "s"
              } are linked to this supplier.`
            : undefined
        }
        confirmLabel="Delete supplier"
        loading={remove.isPending}
        onConfirm={confirmDelete}
      />
    </div>
  );
}
