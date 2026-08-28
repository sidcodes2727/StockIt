import * as React from "react";
import { Shield, ShieldAlert, MoreHorizontal, Pencil, Trash2, UserPlus, Power, PowerOff } from "lucide-react";
import { toast } from "sonner";

import { EmptyState, ErrorState } from "@/components/EmptyState";
import { PageHeader } from "@/components/PageHeader";
import { Pagination } from "@/components/Pagination";
import { SearchInput } from "@/components/SearchInput";
import { UserFormDialog } from "@/components/users/UserFormDialog";
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
import { useDeleteUser, useSetUserActive, useUsers } from "@/hooks/queries";
import { useTableParams } from "@/hooks/useTableParams";
import { useAuth } from "@/hooks/useAuth";
import { cn, number } from "@/lib/utils";

const DEFAULTS = {
  search: "",
  sort_by: "name",
  sort_dir: "asc",
  page: 1,
  per_page: 25,
};

export default function Users() {
  const { user: currentUser } = useAuth();
  const { params, setParams, reset, isFiltered } = useTableParams(DEFAULTS);
  
  const [formOpen, setFormOpen] = React.useState(false);
  const [editing, setEditing] = React.useState(null);
  const [pendingDelete, setPendingDelete] = React.useState(null);

  const users = useUsers(params);
  const remove = useDeleteUser();
  const setActive = useSetUserActive();

  const items = users.data?.items ?? [];
  const meta = users.data?.meta;

  const confirmDelete = async () => {
    try {
      const response = await remove.mutateAsync(pendingDelete.id);
      toast.success(response.data?.message ?? "User deleted.");
      setPendingDelete(null);
    } catch (error) {
      toast.error(error.message);
      setPendingDelete(null);
    }
  };

  const toggleActive = async (user) => {
    try {
      await setActive.mutateAsync({ id: user.id, active: !user.is_active });
      toast.success(`User ${user.is_active ? "deactivated" : "activated"}.`);
    } catch (error) {
      toast.error(error.message);
    }
  };

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Admin"
        title="Users"
        description="Manage access to the system. You can deactivate users instead of deleting them to preserve history."
      >
        <Button
          size="sm"
          onClick={() => {
            setEditing(null);
            setFormOpen(true);
          }}
        >
          <UserPlus />
          Add user
        </Button>
      </PageHeader>

      <Card>
        <div className="flex flex-col gap-2.5 border-b border-border p-4 sm:flex-row sm:items-center">
          <SearchInput
            value={params.search}
            onChange={(value) => setParams({ search: value })}
            placeholder="Search name or email…"
            className="sm:max-w-sm sm:flex-1"
          />
          {meta && (
            <p className="num ml-auto hidden text-[12.5px] text-muted-foreground sm:block">
              {number(meta.total)} user{meta.total === 1 ? "" : "s"}
            </p>
          )}
        </div>

        {users.isError ? (
          <ErrorState error={users.error} onRetry={users.refetch} />
        ) : users.isLoading ? (
          <TableSkeleton rows={5} columns={4} />
        ) : items.length === 0 ? (
          <EmptyState
            title="No users found"
            description="Try a different search term."
            actionLabel="Clear search"
            onAction={reset}
          />
        ) : (
          <div className={users.isPlaceholderData ? "opacity-60 transition-opacity" : undefined}>
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <SortableHead
                    columnKey="name"
                    sortBy={params.sort_by}
                    sortDir={params.sort_dir}
                    onSort={(key, dir) => setParams({ sort_by: key, sort_dir: dir })}
                  >
                    User
                  </SortableHead>
                  <SortableHead
                    columnKey="role"
                    sortBy={params.sort_by}
                    sortDir={params.sort_dir}
                    onSort={(key, dir) => setParams({ sort_by: key, sort_dir: dir })}
                  >
                    Role
                  </SortableHead>
                  <TableHead>Status</TableHead>
                  <TableHead align="right" className="w-12">
                    <span className="sr-only">Actions</span>
                  </TableHead>
                </TableRow>
              </TableHeader>

              <TableBody>
                {items.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <span className={cn(
                          "flex size-8 shrink-0 items-center justify-center rounded-md border text-muted-foreground",
                          user.role === 'admin' ? "border-primary/20 bg-primary/10 text-primary" : "border-border bg-muted/60"
                        )}>
                          {user.role === 'admin' ? <ShieldAlert className="size-4" /> : <Shield className="size-4" />}
                        </span>
                        <span className="min-w-0">
                          <span className="block max-w-[220px] truncate text-[13px] font-medium">
                            {user.name} {user.id === currentUser?.id && "(You)"}
                          </span>
                          <span className="num block truncate text-[11.5px] text-muted-foreground">
                            {user.email}
                          </span>
                        </span>
                      </div>
                    </TableCell>

                    <TableCell>
                      <span className="text-[13px] capitalize">
                        {user.role}
                      </span>
                    </TableCell>
                    
                    <TableCell>
                       {user.is_active ? (
                        <span className="inline-flex items-center rounded-full border border-success/30 bg-success/10 px-2 py-0.5 text-[11px] font-medium text-success">
                          Active
                        </span>
                      ) : (
                        <span className="inline-flex items-center rounded-full border border-muted-foreground/30 bg-muted/50 px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
                          Inactive
                        </span>
                      )}
                    </TableCell>

                    <TableCell align="right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            aria-label={`Actions for ${user.name}`}
                          >
                            <MoreHorizontal />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-44">
                          <DropdownMenuItem
                            onSelect={() => {
                              setEditing(user);
                              setFormOpen(true);
                            }}
                          >
                            <Pencil />
                            Edit details
                          </DropdownMenuItem>
                          
                          {user.id !== currentUser?.id && (
                            <>
                              <DropdownMenuItem
                                onSelect={() => toggleActive(user)}
                              >
                                {user.is_active ? (
                                  <>
                                    <PowerOff /> Deactivate
                                  </>
                                ) : (
                                  <>
                                    <Power /> Activate
                                  </>
                                )}
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                destructive
                                onSelect={() => setPendingDelete(user)}
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

            <Pagination
              meta={meta}
              onPageChange={(page) => setParams({ page })}
              onPageSizeChange={(size) => setParams({ per_page: size, page: 1 })}
            />
          </div>
        )}
      </Card>

      <UserFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        user={editing}
      />

      <ConfirmDialog
        open={Boolean(pendingDelete)}
        onOpenChange={(open) => !open && setPendingDelete(null)}
        title={`Delete "${pendingDelete?.name}"?`}
        description="This action cannot be undone. You may want to deactivate the user instead to preserve their historical actions."
        confirmLabel="Delete user"
        loading={remove.isPending}
        onConfirm={confirmDelete}
      />
    </div>
  );
}
