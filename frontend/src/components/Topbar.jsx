import * as React from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Bell,
  ChevronDown,
  LogOut,
  Menu,
  Monitor,
  Moon,
  Package,
  Search,
  Settings,
  Sun,
  TriangleAlert,
  UserCog,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Skeleton } from "@/components/ui/skeleton";
import { UserAvatar } from "@/components/ui/avatar";
import { StockMeter } from "@/components/StockMeter";
import { useAuth } from "@/hooks/useAuth";
import { useTheme } from "@/hooks/useTheme";
import { useLowStockProducts, useProducts } from "@/hooks/queries";
import { cn, money, number } from "@/lib/utils";

export function Topbar({ onOpenSidebar }) {
  const { user, isAdmin, signOut } = useAuth();

  return (
    <header className="app-topbar sticky top-0 z-30 flex h-14 shrink-0 items-center gap-2 border-b border-border bg-background/85 px-3 backdrop-blur-md sm:px-5">
      <Button
        variant="ghost"
        size="icon-sm"
        className="lg:hidden"
        onClick={onOpenSidebar}
        aria-label="Open navigation"
      >
        <Menu />
      </Button>

      <QuickSearch />

      <div className="ml-auto flex items-center gap-1">
        <LowStockBell />
        <ThemeToggle />

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              className={cn(
                "ml-1 flex items-center gap-2 rounded-md py-1 pl-1 pr-1.5 transition-colors hover:bg-secondary",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
              )}
            >
              <UserAvatar name={user?.name} />
              <span className="hidden min-w-0 text-left sm:block">
                <span className="block max-w-[120px] truncate text-[13px] font-medium leading-tight">
                  {user?.name}
                </span>
                <span className="block text-[11px] capitalize leading-tight text-muted-foreground">
                  {user?.role}
                </span>
              </span>
              <ChevronDown className="size-3.5 text-muted-foreground" aria-hidden="true" />
            </button>
          </DropdownMenuTrigger>

          <DropdownMenuContent align="end" className="w-60">
            <div className="px-2 py-2">
              <p className="truncate text-[13px] font-medium">{user?.name}</p>
              <p className="truncate text-[12px] text-muted-foreground">{user?.email}</p>
            </div>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link to="/settings">
                <Settings />
                Settings
              </Link>
            </DropdownMenuItem>
            {isAdmin && (
              <DropdownMenuItem asChild>
                <Link to="/users">
                  <UserCog />
                  Manage users
                </Link>
              </DropdownMenuItem>
            )}
            <DropdownMenuSeparator />
            <DropdownMenuItem destructive onSelect={() => signOut()}>
              <LogOut />
              Sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}

/* -------------------------------------------------------------------------- */
/* Quick search — resolves to products, the only thing worth searching by name */
/* -------------------------------------------------------------------------- */
function QuickSearch() {
  const navigate = useNavigate();
  const [term, setTerm] = React.useState("");
  const [open, setOpen] = React.useState(false);
  const [debounced, setDebounced] = React.useState("");
  const inputRef = React.useRef(null);

  React.useEffect(() => {
    const timer = setTimeout(() => setDebounced(term.trim()), 250);
    return () => clearTimeout(timer);
  }, [term]);

  // Ctrl/Cmd-K focuses search from anywhere.
  React.useEffect(() => {
    const handler = (event) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        inputRef.current?.focus();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  const enabled = debounced.length >= 2;
  const { data, isFetching } = useProducts(
    { search: debounced, per_page: 6, sort_by: "name" },
    { enabled },
  );
  const results = enabled ? (data?.items ?? []) : [];

  const goToResults = () => {
    if (!debounced) return;
    setOpen(false);
    navigate(`/products?search=${encodeURIComponent(debounced)}`);
  };

  return (
    <Popover open={open && enabled} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <div className="relative w-full max-w-sm">
          <Search
            className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden="true"
          />
          <Input
            ref={inputRef}
            value={term}
            onChange={(event) => {
              setTerm(event.target.value);
              setOpen(true);
            }}
            onFocus={() => setOpen(true)}
            onKeyDown={(event) => {
              if (event.key === "Enter") goToResults();
              if (event.key === "Escape") setOpen(false);
            }}
            placeholder="Search products, SKUs…"
            aria-label="Search products"
            className="h-9 border-transparent bg-secondary pl-9 pr-14 shadow-none focus-visible:border-input focus-visible:bg-card"
          />
          <kbd className="num pointer-events-none absolute right-2.5 top-1/2 hidden -translate-y-1/2 rounded border border-border bg-card px-1.5 py-0.5 text-[10px] text-muted-foreground sm:block">
            ⌘K
          </kbd>
        </div>
      </PopoverTrigger>

      <PopoverContent
        align="start"
        className="w-[min(28rem,calc(100vw-2rem))] p-0"
        onOpenAutoFocus={(event) => event.preventDefault()}
      >
        {isFetching && !results.length ? (
          <div className="space-y-2 p-3">
            {[0, 1, 2].map((i) => (
              <Skeleton key={i} className="h-9" />
            ))}
          </div>
        ) : results.length ? (
          <>
            <ul className="max-h-80 overflow-y-auto p-1.5">
              {results.map((product) => (
                <li key={product.id}>
                  <Link
                    to={`/products?search=${encodeURIComponent(product.sku)}`}
                    onClick={() => setOpen(false)}
                    className="flex items-center gap-3 rounded-md px-2 py-2 transition-colors hover:bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <span className="flex size-7 shrink-0 items-center justify-center rounded border border-border bg-muted/60 text-muted-foreground">
                      <Package className="size-3.5" aria-hidden="true" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[13px] font-medium">
                        {product.name}
                      </span>
                      <span className="num block text-[11px] text-muted-foreground">
                        {product.sku} · {money(product.unit_price)}
                      </span>
                    </span>
                    <span className="w-16 shrink-0 text-right">
                      <span className="num block text-[12px] font-medium">
                        {number(product.quantity)}
                      </span>
                      <StockMeter
                        className="mt-1"
                        quantity={product.quantity}
                        reorderLevel={product.reorder_level}
                        status={product.stock_status}
                      />
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
            <button
              type="button"
              onClick={goToResults}
              className="w-full border-t border-border px-3 py-2 text-left text-[12.5px] text-primary transition-colors hover:bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
            >
              See all results for “{debounced}”
            </button>
          </>
        ) : (
          <p className="px-3 py-6 text-center text-[13px] text-muted-foreground">
            No products match “{debounced}”.
          </p>
        )}
      </PopoverContent>
    </Popover>
  );
}

/* -------------------------------------------------------------------------- */
/* Low-stock alerts                                                            */
/* -------------------------------------------------------------------------- */
function LowStockBell() {
  const { data, isLoading } = useLowStockProducts();
  const items = data?.items ?? [];
  const outOfStock = items.filter((p) => p.stock_status === "out_of_stock").length;
  const count = items.length;

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon-sm"
          className="relative"
          aria-label={
            count ? `${count} low stock alerts` : "Low stock alerts — none right now"
          }
        >
          <Bell />
          {count > 0 && (
            // Red when something is actually out of stock, amber when items are
            // merely low — the same two states the badges use.
            <span
              className={cn(
                "absolute -right-0.5 -top-0.5 flex min-w-[15px] items-center justify-center rounded-full px-[3px] text-[9.5px] font-bold leading-[15px] text-white ring-2 ring-background",
                outOfStock > 0 ? "bg-destructive" : "bg-warning",
              )}
            >
              {count > 9 ? "9+" : count}
            </span>
          )}
        </Button>
      </PopoverTrigger>

      <PopoverContent className="w-[min(22rem,calc(100vw-2rem))] p-0">
        <div className="flex items-center justify-between gap-2 border-b border-border px-3.5 py-2.5">
          <p className="text-[13px] font-semibold">Low stock alerts</p>
          {count > 0 && (
            <Badge variant={outOfStock > 0 ? "destructive" : "warning"}>
              <TriangleAlert aria-hidden="true" />
              {number(count)} item{count === 1 ? "" : "s"}
            </Badge>
          )}
        </div>

        {isLoading ? (
          <div className="space-y-2 p-3">
            {[0, 1, 2].map((i) => (
              <Skeleton key={i} className="h-10" />
            ))}
          </div>
        ) : count === 0 ? (
          <p className="px-3.5 py-8 text-center text-[13px] text-muted-foreground">
            Every product is above its reorder level.
          </p>
        ) : (
          <>
            <ul className="max-h-80 divide-y divide-border overflow-y-auto">
              {items.slice(0, 8).map((product) => (
                <li key={product.id} className="px-3.5 py-2.5">
                  <div className="flex items-baseline justify-between gap-3">
                    <span className="truncate text-[13px] font-medium">{product.name}</span>
                    <span
                      className={cn(
                        "num shrink-0 text-[12px] font-semibold",
                        product.stock_status === "out_of_stock"
                          ? "text-destructive"
                          : "text-warning",
                      )}
                    >
                      {number(product.quantity)} / {number(product.reorder_level)}
                    </span>
                  </div>
                  <StockMeter
                    className="mt-2"
                    quantity={product.quantity}
                    reorderLevel={product.reorder_level}
                    status={product.stock_status}
                  />
                </li>
              ))}
            </ul>
            <Link
              to="/reports?tab=low-stock"
              className="block border-t border-border px-3.5 py-2 text-[12.5px] text-primary transition-colors hover:bg-secondary"
            >
              View the full low stock report
            </Link>
          </>
        )}
      </PopoverContent>
    </Popover>
  );
}

/* -------------------------------------------------------------------------- */
/* Theme                                                                       */
/* -------------------------------------------------------------------------- */
function ThemeToggle() {
  const { theme, setTheme } = useTheme();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon-sm" aria-label="Change theme">
          <Sun className="dark:hidden" />
          <Moon className="hidden dark:block" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-40">
        <DropdownMenuLabel>Appearance</DropdownMenuLabel>
        <DropdownMenuRadioGroup value={theme} onValueChange={setTheme}>
          <DropdownMenuRadioItem value="light">
            <Sun />
            Light
          </DropdownMenuRadioItem>
          <DropdownMenuRadioItem value="dark">
            <Moon />
            Dark
          </DropdownMenuRadioItem>
          <DropdownMenuRadioItem value="system">
            <Monitor />
            System
          </DropdownMenuRadioItem>
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
