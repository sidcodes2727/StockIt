import { NavLink } from "react-router-dom";
import {
  ArrowDownToLine,
  ArrowUpFromLine,
  BarChart3,
  LayoutDashboard,
  Package,
  Settings,
  Tags,
  Truck,
  Users,
} from "lucide-react";

import { cn } from "@/lib/utils";

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

/** The glyph echoes the stock meter: stacked levels inside a bin. */
export function BrandMark({ className }) {
  return (
    <span
      className={cn(
        "flex size-8 shrink-0 items-center justify-center rounded-md bg-primary text-primary-foreground",
        className,
      )}
      aria-hidden="true"
    >
      <svg viewBox="0 0 20 20" fill="none" className="size-[18px]">
        <rect x="2.5" y="2.5" width="15" height="15" rx="3.5" stroke="currentColor" strokeWidth="1.6" />
        <rect x="5.5" y="12" width="9" height="2" rx="1" fill="currentColor" />
        <rect x="5.5" y="8.5" width="6" height="2" rx="1" fill="currentColor" opacity="0.75" />
        <rect x="5.5" y="5" width="3" height="2" rx="1" fill="currentColor" opacity="0.5" />
      </svg>
    </span>
  );
}

export function SidebarNav({ isAdmin, lowStockCount = 0, onNavigate }) {
  return (
    <nav className="flex flex-1 flex-col gap-6 overflow-y-auto px-3 py-4" aria-label="Main">
      {NAV_SECTIONS.map((section, index) => {
        const items = section.items.filter((item) => !item.adminOnly || isAdmin);
        if (!items.length) return null;

        return (
          <div key={section.label ?? index} className="space-y-1">
            {section.label && (
              <p className="px-3 pb-1.5 text-[10.5px] font-semibold uppercase tracking-[0.1em] text-muted-foreground/80">
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
                    "group relative flex items-center gap-2.5 rounded-md px-3 py-2 text-[13.5px] font-medium transition-colors",
                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                    isActive
                      ? "bg-accent text-accent-foreground"
                      : "text-muted-foreground hover:bg-secondary hover:text-foreground",
                  )
                }
              >
                {({ isActive }) => (
                  <>
                    {/* A 2px rail rather than a filled pill — the accent is
                        spent sparingly, and the rail reads at a glance. */}
                    <span
                      aria-hidden="true"
                      className={cn(
                        "absolute left-0 top-1/2 h-4 w-[2px] -translate-y-1/2 rounded-full bg-primary transition-opacity",
                        isActive ? "opacity-100" : "opacity-0",
                      )}
                    />
                    <Icon className="size-4 shrink-0" aria-hidden="true" />
                    <span className="truncate">{label}</span>
                    {to === "/products" && lowStockCount > 0 && (
                      <span
                        className="num ml-auto rounded bg-warning/15 px-1.5 py-0.5 text-[10.5px] font-semibold text-warning"
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
