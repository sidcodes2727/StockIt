import * as React from "react";
import { Download, FileUp, Upload } from "lucide-react";
import { toast } from "sonner";

import { FormError } from "@/components/Field";
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
import { useDownloadImportTemplate, useImportProducts } from "@/hooks/queries";
import { cn } from "@/lib/utils";

const COLUMNS =
  "name, sku, category, supplier, unit_price, cost_price, quantity, reorder_level, description";

/**
 * CSV bulk import (admin only).
 *
 * The whole file is one transaction on the server: if any row is bad, nothing
 * is created. So the failure state here is a list of row-numbered problems to
 * fix and re-upload, not a partial success to reconcile.
 */
export function ImportDialog({ open, onOpenChange }) {
  const [file, setFile] = React.useState(null);
  const [dragging, setDragging] = React.useState(false);
  const [rowErrors, setRowErrors] = React.useState(null);
  const [formError, setFormError] = React.useState(null);
  const inputRef = React.useRef(null);

  const importProducts = useImportProducts();
  const template = useDownloadImportTemplate();

  React.useEffect(() => {
    if (open) return;
    setFile(null);
    setRowErrors(null);
    setFormError(null);
  }, [open]);

  const accept = (candidate) => {
    setRowErrors(null);
    setFormError(null);
    if (!candidate) return;
    if (!candidate.name.toLowerCase().endsWith(".csv")) {
      setFormError("Only .csv files are supported. Export your sheet as CSV UTF-8.");
      return;
    }
    setFile(candidate);
  };

  const submit = async () => {
    if (!file) return;
    setRowErrors(null);
    setFormError(null);
    try {
      const result = await importProducts.mutateAsync(file);
      toast.success(result.message, {
        description:
          result.categories_created || result.suppliers_created
            ? `${result.categories_created} new categories, ${result.suppliers_created} new suppliers.`
            : undefined,
      });
      onOpenChange(false);
    } catch (error) {
      const errors = error.details?.errors;
      if (Array.isArray(errors) && errors.length) {
        setRowErrors({ list: errors, count: error.details.error_count ?? errors.length });
      }
      setFormError(error.message);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={importProducts.isPending ? undefined : onOpenChange}
    >
      <DialogContent size="lg">
        <DialogHeader>
          <DialogTitle>Import products from CSV</DialogTitle>
          <DialogDescription>
            Categories and suppliers named in the file are created if they don't exist
            yet.
          </DialogDescription>
        </DialogHeader>

        <DialogBody className="space-y-4">
          <div
            onDragOver={(event) => {
              event.preventDefault();
              setDragging(true);
            }}
            onDragLeave={() => setDragging(false)}
            onDrop={(event) => {
              event.preventDefault();
              setDragging(false);
              accept(event.dataTransfer.files?.[0]);
            }}
            className={cn(
              "flex flex-col items-center justify-center gap-3 rounded-lg border border-dashed px-6 py-9 text-center transition-colors",
              dragging ? "border-primary bg-primary/5" : "border-border bg-muted/30",
            )}
          >
            <span className="flex size-10 items-center justify-center rounded-lg border border-border bg-card text-muted-foreground">
              <FileUp className="size-[18px]" aria-hidden="true" />
            </span>

            {file ? (
              <div>
                <p className="num text-[13px] font-medium">{file.name}</p>
                <p className="mt-0.5 text-[12px] text-muted-foreground">
                  {(file.size / 1024).toFixed(1)} KB
                </p>
              </div>
            ) : (
              <div>
                <p className="text-[13px] font-medium">Drop a CSV here</p>
                <p className="mt-0.5 text-[12px] text-muted-foreground">
                  or choose a file from your computer
                </p>
              </div>
            )}

            <input
              ref={inputRef}
              type="file"
              accept=".csv,text/csv"
              className="sr-only"
              onChange={(event) => accept(event.target.files?.[0])}
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => inputRef.current?.click()}
            >
              {file ? "Choose a different file" : "Choose file"}
            </Button>
          </div>

          <div className="rounded-md border border-border bg-muted/40 p-3.5">
            <p className="text-[11px] font-semibold uppercase tracking-[0.07em] text-muted-foreground">
              Expected columns
            </p>
            <p className="num mt-1.5 text-[12px] leading-relaxed text-muted-foreground">
              {COLUMNS}
            </p>
            <p className="mt-2 text-[12px] leading-relaxed text-muted-foreground">
              Only <span className="num">name</span> is required. Leave{" "}
              <span className="num">sku</span> blank to have one generated.
            </p>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="mt-2 -ml-2"
              loading={template.isPending}
              onClick={() =>
                template.mutate(undefined, {
                  onError: (error) => toast.error(error.message),
                })
              }
            >
              <Download />
              Download template
            </Button>
          </div>

          <FormError error={formError} />

          {rowErrors && (
            <div className="rounded-md border border-destructive/25 bg-destructive/5 p-3.5">
              <p className="text-[12.5px] font-medium text-destructive">
                {rowErrors.count} row{rowErrors.count === 1 ? "" : "s"} need fixing —
                nothing was imported.
              </p>
              <ul className="num mt-2 max-h-40 space-y-1 overflow-y-auto text-[12px] text-muted-foreground">
                {rowErrors.list.map((message, index) => (
                  <li key={index}>{message}</li>
                ))}
              </ul>
            </div>
          )}
        </DialogBody>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={importProducts.isPending}
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={submit}
            disabled={!file}
            loading={importProducts.isPending}
          >
            <Upload />
            Import
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
