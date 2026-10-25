import { NavLink } from "react-router-dom";
import {
  ArrowDownToLine,
  ArrowUpFromLine,
  BarChart3,
  LayoutDashboard,
  LogOut,
  Package,
  Settings,
  Tags,
  Truck,
  Users,
} from "lucide-react";

import { UserAvatar } from "@/components/ui/avatar";
import { Tooltip } from "@/components/ui/tooltip";
import { useAuth } from "@/hooks/useAuth";
import { useDashboardSummary } from "@/hooks/queries";
import { cn, number } from "@/lib/utils";

export const NAV_SECTIONS = [
  {
    label: null,
    items: [{ to: "/", label: "Dashboard", icon: LayoutDashboard, end: true }],
  },
  {
    label: "Catalogue",
    items: [
      { to: "/products", label: "Products", icon: Package },
      { to: "/categories", label: "Categories", icon: Tags },
      { to: "/suppliers", label: "Suppliers", icon: Truck },
    ],
  },
  {
    label: "Movements",
    items: [
      { to: "/purchases", label: "Purchases", icon: ArrowDownToLine },
      { to: "/sales", label: "Sales", icon: ArrowUpFromLine },
    ],
  },
  {
    label: "Insight",
    items: [
      { to: "/reports", label: "Reports", icon: BarChart3 },
      { to: "/users", label: "Users", icon: Users, adminOnly: true },
      { to: "/settings", label: "Settings", icon: Settings },
    ],
  },
];

/** Every nav destination, flattened — the command palette and breadcrumb read this. */
export const NAV_ITEMS = NAV_SECTIONS.flatMap((section) =>
  section.items.map((item) => ({ ...item, section: section.label })),
);

/**
 * The glyph echoes the stock meter: three levels stacked in a bin, ink on volt.
 */
export function BrandMark({ className }) {
  return (
    <span
      className={cn(
        "relative flex size-8 shrink-0 items-center justify-center rounded-lg bg-volt text-volt-foreground shadow-inset-hi",
        className,
      )}
      aria-hidden="true"
    >
      <svg viewBox="0 0 20 20" fill="none" className="size-[18px]">
        <rect x="3.5" y="12.5" width="13" height="3" rx="1.5" fill="currentColor" />
        <rect x="3.5" y="8.5" width="8.5" height="3" rx="1.5" fill="currentColor" opacity="0.72" />
        <rect x="3.5" y="4.5" width="4" height="3" rx="1.5" fill="currentColor" opacity="0.45" />
      </svg>
    </span>
  );
}

export function Wordmark({ className, tagline = "Stock control" }) {
  return (
    <span className={cn("flex items-center gap-2.5", className)}>
      <BrandMark />
      <span className="min-w-0">
        <span className="font-display block text-[17px] font-bold leading-none">
          Stock<span className="text-primary dark:text-volt">It</span>
        </span>
        {tagline && (
          <span className="mt-1 block font-mono text-[9.5px] uppercase leading-none tracking-[0.16em] opacity-55">
            {tagline}
          </span>
        )}
      </span>
    </span>
  );
}

export function SidebarNav({ isAdmin, lowStockCount = 0, onNavigate }) {
  return (
    <nav className="flex flex-1 flex-col gap-5 overflow-y-auto px-3 py-4" aria-label="Main">
      {NAV_SECTIONS.map((section, index) => {
        const items = section.items.filter((item) => !item.adminOnly || isAdmin);
        if (!items.length) return null;

        return (
          <div key={section.label ?? index} className="space-y-0.5">
            {section.label && (
              <p className="flex items-center gap-2 px-3 pb-1.5 font-mono text-[9.5px] font-medium uppercase tracking-[0.16em] text-sidebar-muted/80">
                <span className="text-sidebar-muted/50">
                  {String(index).padStart(2, "0")}
                </span>
                {section.label}
              </p>
            )}
            {items.map(({ to, label, icon: Icon, end }) => (
              <NavLink
                key={to}
                to={to}
                end={end}
                onClick={onNavigate}
                className={({ isActive }) =>
                  cn(
                    "group relative flex items-center gap-2.5 rounded-lg px-3 py-2 text-[13.5px] font-medium transition-all duration-150",
                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-0",
                    isActive
                      ? "bg-sidebar-accent text-sidebar-foreground"
                      : "text-sidebar-muted hover:bg-sidebar-hover hover:text-sidebar-foreground",
                  )
                }
              >
                {({ isActive }) => (
                  <>
                    <span
                      aria-hidden="true"
                      className={cn(
                        "absolute -left-3 top-1/2 h-5 w-[3px] -translate-y-1/2 rounded-r-full bg-primary shadow-[0_0_12px_hsl(var(--primary)/0.5)] dark:bg-volt dark:shadow-[0_0_12px_hsl(var(--volt)/0.8)] transition-all duration-200",
                        isActive ? "opacity-100" : "scale-y-0 opacity-0",
                      )}
                    />
                    <Icon
                      className={cn(
                        "size-4 shrink-0 transition-colors",
                        isActive ? "text-primary dark:text-volt" : "group-hover:text-sidebar-foreground",
                      )}
                      aria-hidden="true"
                    />
                    <span className="truncate">{label}</span>
                    {to === "/products" && lowStockCount > 0 && (
                      <span
                        className="num ml-auto rounded-md bg-warning/15 px-1.5 py-0.5 text-[10.5px] font-semibold text-warning"
                        title={`${lowStockCount} product(s) at or below reorder level`}
                      >
                        {lowStockCount}
                      </span>
                    )}
                  </>
                )}
              </NavLink>
            ))}
          </div>
        );
      })}
    </nav>
  );
}

/**
 * Stock health at a glance, always in view: the share of products sitting
 * above their reorder level, split into the same three states the badges use.
 */
export function SidebarHealth() {
  const { data } = useDashboardSummary();
  const cards = data?.cards;
  if (!cards || !cards.total_products) return null;

  const total = cards.total_products;
  const out = cards.out_of_stock_count;
  const low = Math.max(cards.low_stock_count - out, 0);
  const healthy = Math.max(total - low - out, 0);
  const pct = Math.round((healthy / total) * 100);

  const segments = [
    { value: healthy, className: "bg-success", label: "healthy" },
    { value: low, className: "bg-warning", label: "low" },
    { value: out, className: "bg-destructive", label: "out" },
  ];

  return (
    <div className="mx-3 mb-3 rounded-xl border border-sidebar-border bg-sidebar-hover p-3">
      <div className="flex items-baseline justify-between">
        <p className="font-mono text-[9.5px] uppercase tracking-[0.16em] text-sidebar-muted">
          Stock health
        </p>
        <p className="num text-[13px] font-semibold text-sidebar-foreground">{pct}%</p>
      </div>
      <div className="mt-2.5 flex h-1.5 gap-[3px] overflow-hidden rounded-full">
        {segments.map(
          (segment) =>
            segment.value > 0 && (
              <span
                key={segment.label}
                className={cn(
                  "h-full origin-left animate-bar-grow rounded-full",
                  segment.className,
                )}
                style={{ flexGrow: segment.value }}
              />
            ),
        )}
      </div>
      <p className="num mt-2 text-[10.5px] text-sidebar-muted">
        {number(healthy)} ok · {number(low)} low · {number(out)} out
      </p>
    </div>
  );
}

export function SidebarUser() {
  const { user, signOut } = useAuth();
  return (
    <div className="flex shrink-0 items-center gap-2.5 border-t border-sidebar-border px-4 py-3">
      <UserAvatar name={user?.name} />
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[12.5px] font-medium text-sidebar-foreground">
          {user?.name}
        </span>
        <span className="block font-mono text-[10px] uppercase tracking-[0.12em] text-sidebar-muted">
          {user?.role} access
        </span>
      </span>
      <Tooltip content="Sign out">
        <button
          type="button"
          onClick={() => signOut()}
          aria-label="Sign out"
          className="rounded-md p-1.5 text-sidebar-muted transition-colors hover:bg-sidebar-hover hover:text-sidebar-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <LogOut className="size-4" />
        </button>
      </Tooltip>
    </div>
  );
}
