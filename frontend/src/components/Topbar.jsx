import { Link, useLocation } from "react-router-dom";
import {
  Bell,
  ChevronDown,
  ChevronRight,
  Command,
  LogOut,
  Menu,
  Monitor,
  Moon,
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
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Skeleton } from "@/components/ui/skeleton";
import { UserAvatar } from "@/components/ui/avatar";
import { NAV_ITEMS } from "@/components/Sidebar";
import { StockMeter } from "@/components/StockMeter";
import { useAuth } from "@/hooks/useAuth";
import { useTheme } from "@/hooks/useTheme";
import { useLowStockProducts } from "@/hooks/queries";
import { cn, number } from "@/lib/utils";

export function Topbar({ onOpenSidebar, onOpenPalette }) {
  const { user, isAdmin, signOut } = useAuth();

  return (
    <header className="app-topbar sticky top-0 z-30 flex h-14 shrink-0 items-center gap-3 border-b border-border bg-background/75 px-3 backdrop-blur-xl backdrop-saturate-150 sm:px-6">
      <Button
        variant="ghost"
        size="icon-sm"
        className="lg:hidden"
        onClick={onOpenSidebar}
        aria-label="Open navigation"
      >
        <Menu />
      </Button>

      <Breadcrumb />
      <PaletteTrigger onOpen={onOpenPalette} />

      <div className="ml-auto flex items-center gap-1 md:ml-0">
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
/* Where am I — section / page, read from the same table the sidebar uses      */
/* -------------------------------------------------------------------------- */
function Breadcrumb() {
  const { pathname } = useLocation();
  const match =
    NAV_ITEMS.find((item) => (item.end ? pathname === item.to : pathname.startsWith(item.to))) ??
    null;

  return (
    <div className="hidden min-w-0 items-center gap-2 text-[13px] md:flex">
      <span className="font-mono text-[10.5px] uppercase tracking-[0.14em] text-muted-foreground">
        {match?.section ?? "Overview"}
      </span>
      <ChevronRight className="size-3.5 text-muted-foreground/60" aria-hidden="true" />
      <span className="truncate font-medium">{match?.label ?? "Not found"}</span>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Command palette trigger — looks like search, does everything                */
/* -------------------------------------------------------------------------- */
function PaletteTrigger({ onOpen }) {
  const isMac = typeof navigator !== "undefined" && /Mac|iPhone|iPad/.test(navigator.platform);
  return (
    <button
      type="button"
      onClick={onOpen}
      className={cn(
        "group flex h-9 w-full max-w-[340px] items-center gap-2.5 rounded-lg border border-border bg-card/70 pl-3 pr-1.5 text-left text-[13px] text-muted-foreground shadow-soft transition-all",
        "hover:border-foreground/20 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        "md:ml-auto",
      )}
      aria-label="Open command palette"
    >
      <Search className="size-4 shrink-0" aria-hidden="true" />
      <span className="flex-1 truncate">Search or jump to…</span>
      <kbd className="num hidden items-center gap-0.5 rounded-md border border-border bg-muted px-1.5 py-0.5 text-[10.5px] sm:flex">
        <Command className="size-2.5" aria-hidden="true" hidden={!isMac} />
        {isMac ? "K" : "Ctrl K"}
      </kbd>
    </button>
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
                "absolute -right-0.5 -top-0.5 flex min-w-[15px] items-center justify-center rounded-full px-[3px] text-[9.5px] font-bold leading-[15px] ring-2 ring-background",
                outOfStock > 0
                  ? "bg-destructive text-destructive-foreground"
                  : "bg-warning text-warning-foreground",
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
