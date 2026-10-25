import * as React from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { useNavigate } from "react-router-dom";
import {
  ArrowDownLeft,
  CornerDownLeft,
  LogOut,
  Moon,
  Package,
  PackagePlus,
  Plus,
  Search,
  Sun,
} from "lucide-react";

import { NAV_ITEMS } from "@/components/Sidebar";
import { StockMeter } from "@/components/StockMeter";
import { useAuth } from "@/hooks/useAuth";
import { useProducts } from "@/hooks/queries";
import { useTheme } from "@/hooks/useTheme";
import { cn, money, number } from "@/lib/utils";

/**
 * One keyboard-first entry point for the whole app: jump to any page, run the
 * common actions, or find a product by name or SKU — without touching the
 * mouse. Opens with ⌘K / Ctrl-K, or "/" when focus isn't in a text field.
 */
export function CommandPalette({ open, onOpenChange }) {
  const navigate = useNavigate();
  const { isAdmin, signOut } = useAuth();
  const { toggle } = useTheme();

  const [term, setTerm] = React.useState("");
  const [debounced, setDebounced] = React.useState("");
  const [activeRaw, setActive] = React.useState(0);
  const listRef = React.useRef(null);

  React.useEffect(() => {
    const timer = setTimeout(() => setDebounced(term.trim()), 180);
    return () => clearTimeout(timer);
  }, [term]);

  const enabled = open && debounced.length >= 2;
  const { data, isFetching } = useProducts(
    { search: debounced, per_page: 5, sort_by: "name" },
    { enabled },
  );
  const items = data?.items;
  const products = React.useMemo(() => (enabled ? (items ?? []) : []), [enabled, items]);

  const close = React.useCallback(() => {
    onOpenChange(false);
    setTerm("");
    setDebounced("");
    setActive(0);
  }, [onOpenChange]);

  // Global shortcuts.
  React.useEffect(() => {
    const handler = (event) => {
      const key = event.key?.toLowerCase();
      if ((event.metaKey || event.ctrlKey) && key === "k") {
        event.preventDefault();
        if (open) close();
        else onOpenChange(true);
        return;
      }
      const typing = event.target.closest?.("input, textarea, select, [contenteditable=true]");
      if (key === "/" && !typing && !open) {
        event.preventDefault();
        onOpenChange(true);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, onOpenChange, close]);

  const go = React.useCallback(
    (to) => {
      close();
      navigate(to);
    },
    [close, navigate],
  );

  const groups = React.useMemo(() => {
    const q = term.trim().toLowerCase();
    const matches = (label) => !q || label.toLowerCase().includes(q);

    const actions = [
      {
        id: "new-sale",
        label: "New sale",
        hint: "Record stock out",
        icon: Plus,
        run: () => go("/sales?new=1"),
      },
      {
        id: "stock-in",
        label: "Record purchase",
        hint: "Bring stock in",
        icon: ArrowDownLeft,
        run: () => go("/purchases?new=1"),
      },
      {
        id: "add-product",
        label: "Add product",
        hint: "New catalogue item",
        icon: PackagePlus,
        run: () => go("/products?new=1"),
      },
      {
        id: "theme",
        label: "Toggle theme",
        hint: "Light ↔ dark",
        icon: document.documentElement.classList.contains("dark") ? Sun : Moon,
        run: () => {
          toggle();
          close();
        },
      },
      {
        id: "sign-out",
        label: "Sign out",
        hint: "End this session",
        icon: LogOut,
        run: () => {
          close();
          signOut();
        },
      },
    ].filter((item) => matches(item.label));

    const pages = NAV_ITEMS.filter((item) => !item.adminOnly || isAdmin)
      .filter((item) => matches(item.label) || (item.section && matches(item.section)))
      .map((item) => ({
        id: `nav-${item.to}`,
        label: item.label,
        hint: item.section ?? "Overview",
        icon: item.icon,
        run: () => go(item.to),
      }));

    const productItems = products.map((product) => ({
      id: `product-${product.id}`,
      label: product.name,
      product,
      run: () => go(`/products?search=${encodeURIComponent(product.sku)}`),
    }));

    if (debounced.length >= 2) {
      productItems.push({
        id: "all-products",
        label: `See all products matching “${debounced}”`,
        icon: Search,
        run: () => go(`/products?search=${encodeURIComponent(debounced)}`),
      });
    }

    return [
      { label: "Products", items: productItems },
      { label: "Actions", items: actions },
      { label: "Go to", items: pages },
    ].filter((group) => group.items.length);
  }, [term, debounced, products, isAdmin, go, close, toggle, signOut]);

  const flat = React.useMemo(() => groups.flatMap((group) => group.items), [groups]);

  // Results shrink as you type; keep the highlight on a row that exists.
  const active = Math.min(activeRaw, Math.max(flat.length - 1, 0));

  React.useEffect(() => {
    listRef.current
      ?.querySelector(`[data-index="${active}"]`)
      ?.scrollIntoView({ block: "nearest" });
  }, [active]);

  const onKeyDown = (event) => {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActive((active + 1) % Math.max(flat.length, 1));
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setActive((active - 1 + flat.length) % Math.max(flat.length, 1));
    } else if (event.key === "Enter") {
      event.preventDefault();
      flat[active]?.run();
    }
  };

  let index = -1;

  return (
    <DialogPrimitive.Root
      open={open}
      onOpenChange={(next) => (next ? onOpenChange(true) : close())}
    >
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-[hsl(240_14%_4%/0.5)] backdrop-blur-sm data-[state=closed]:animate-out data-[state=open]:animate-in data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
        <DialogPrimitive.Content
          className={cn(
            "fixed left-1/2 top-[12vh] z-50 w-[calc(100vw-2rem)] max-w-[600px] -translate-x-1/2 overflow-hidden rounded-2xl border border-border bg-popover shadow-overlay outline-none",
            "edge-glow data-[state=closed]:animate-out data-[state=open]:animate-in data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-[0.98] data-[state=open]:zoom-in-[0.98] data-[state=open]:slide-in-from-top-2",
          )}
          aria-describedby={undefined}
        >
          <DialogPrimitive.Title className="sr-only">Command palette</DialogPrimitive.Title>

          <div className="flex items-center gap-3 border-b border-border px-4">
            <Search className="size-[18px] shrink-0 text-muted-foreground" aria-hidden="true" />
            <input
              autoFocus
              value={term}
              onChange={(event) => {
                setTerm(event.target.value);
                setActive(0);
              }}
              onKeyDown={onKeyDown}
              placeholder="Search products, jump to a page, run an action…"
              aria-label="Command"
              role="combobox"
              aria-expanded="true"
              aria-controls="command-list"
              aria-activedescendant={flat[active] ? `cmd-${flat[active].id}` : undefined}
              className="h-14 flex-1 bg-transparent text-[15px] outline-none placeholder:text-muted-foreground/70 focus-visible:ring-0 focus-visible:ring-offset-0"
            />
            {isFetching && enabled && (
              <span className="size-3.5 animate-spin rounded-full border-2 border-primary/30 border-t-primary" />
            )}
            <kbd className="num hidden rounded-md border border-border bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground sm:block">
              esc
            </kbd>
          </div>

          <div
            ref={listRef}
            id="command-list"
            role="listbox"
            className="max-h-[min(60vh,420px)] overflow-y-auto p-2"
          >
            {flat.length === 0 ? (
              <p className="px-3 py-10 text-center text-[13px] text-muted-foreground">
                Nothing matches “{term}”.
              </p>
            ) : (
              groups.map((group) => (
                <div
                  key={group.label}
                  className="pb-1.5 last:pb-0"
                  role="group"
                  aria-label={group.label}
                >
                  <p className="px-2.5 pb-1 pt-2 font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground/80">
                    {group.label}
                  </p>
                  {group.items.map((item) => {
                    index += 1;
                    const current = index;
                    const selected = current === active;
                    return (
                      <div
                        key={item.id}
                        id={`cmd-${item.id}`}
                        role="option"
                        aria-selected={selected}
                        data-index={current}
                        onMouseMove={() => !selected && setActive(current)}
                        onClick={() => item.run()}
                        className={cn(
                          "flex cursor-pointer items-center gap-3 rounded-lg px-2.5 py-2 transition-colors",
                          selected ? "bg-accent text-accent-foreground" : "text-foreground",
                        )}
                      >
                        {item.product ? (
                          <ProductRow product={item.product} selected={selected} />
                        ) : (
                          <>
                            <span
                              className={cn(
                                "flex size-7 shrink-0 items-center justify-center rounded-md border transition-colors",
                                selected
                                  ? "border-primary/30 bg-primary text-primary-foreground"
                                  : "border-border bg-muted/60 text-muted-foreground",
                              )}
                            >
                              <item.icon className="size-3.5" aria-hidden="true" />
                            </span>
                            <span className="min-w-0 flex-1 truncate text-[13.5px] font-medium">
                              {item.label}
                            </span>
                            {item.hint && (
                              <span className="hidden shrink-0 text-[12px] text-muted-foreground sm:block">
                                {item.hint}
                              </span>
                            )}
                          </>
                        )}
                        <CornerDownLeft
                          className={cn(
                            "size-3.5 shrink-0 text-muted-foreground",
                            !selected && "invisible",
                          )}
                          aria-hidden="true"
                        />
                      </div>
                    );
                  })}
                </div>
              ))
            )}
          </div>

          <div className="flex items-center gap-4 border-t border-border bg-muted/40 px-4 py-2 text-[11px] text-muted-foreground">
            <Hint keys={["↑", "↓"]} label="navigate" />
            <Hint keys={["↵"]} label="select" />
            <Hint keys={["/"]} label="open anywhere" className="ml-auto hidden sm:flex" />
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}

function ProductRow({ product, selected }) {
  return (
    <>
      <span
        className={cn(
          "flex size-7 shrink-0 items-center justify-center rounded-md border transition-colors",
          selected
            ? "border-primary/30 bg-primary text-primary-foreground"
            : "border-border bg-muted/60 text-muted-foreground",
        )}
      >
        <Package className="size-3.5" aria-hidden="true" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[13.5px] font-medium">{product.name}</span>
        <span className="num block text-[11px] text-muted-foreground">
          {product.sku} · {money(product.unit_price)}
        </span>
      </span>
      <span className="w-16 shrink-0 text-right">
        <span className="num block text-[12px] font-medium">{number(product.quantity)}</span>
        <StockMeter
          className="mt-1"
          quantity={product.quantity}
          reorderLevel={product.reorder_level}
          status={product.stock_status}
        />
      </span>
    </>
  );
}

function Hint({ keys, label, className }) {
  return (
    <span className={cn("flex items-center gap-1.5", className)}>
      {keys.map((key) => (
        <kbd key={key} className="num rounded border border-border bg-card px-1 py-px text-[10px]">
          {key}
        </kbd>
      ))}
      {label}
    </span>
  );
}
