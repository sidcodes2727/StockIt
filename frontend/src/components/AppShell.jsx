import * as React from "react";
import { Outlet, useLocation } from "react-router-dom";

import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { BrandMark, SidebarNav } from "@/components/Sidebar";
import { Topbar } from "@/components/Topbar";
import { useAuth } from "@/hooks/useAuth";
import { useLowStockProducts } from "@/hooks/queries";

export function AppShell() {
  const { isAdmin } = useAuth();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = React.useState(false);
  const { data } = useLowStockProducts();
  const lowStockCount = data?.items?.length ?? 0;

  // Close the drawer on navigation, and reset scroll so a new page starts at
  // the top rather than mid-table.
  React.useEffect(() => {
    setMobileOpen(false);
    document.getElementById("main-scroll")?.scrollTo({ top: 0 });
  }, [location.pathname]);

  return (
    <div className="flex h-dvh overflow-hidden bg-background">
      {/* Persistent on desktop. */}
      <aside className="hidden w-[232px] shrink-0 flex-col border-r border-border bg-card lg:flex">
        <Brand />
        <SidebarNav isAdmin={isAdmin} lowStockCount={lowStockCount} />
        <Footprint />
      </aside>

      {/* Drawer on tablet and phone — warehouse staff work on both. */}
      <Dialog open={mobileOpen} onOpenChange={setMobileOpen}>
        <DialogContent
          side="right"
          size="sm"
          className="left-0 right-auto max-w-[264px] p-0 data-[state=closed]:slide-out-to-left data-[state=open]:slide-in-from-left lg:hidden"
        >
          <DialogTitle className="sr-only">Navigation</DialogTitle>
          <Brand />
          <SidebarNav
            isAdmin={isAdmin}
            lowStockCount={lowStockCount}
            onNavigate={() => setMobileOpen(false)}
          />
          <Footprint />
        </DialogContent>
      </Dialog>

      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar onOpenSidebar={() => setMobileOpen(true)} />
        <main id="main-scroll" className="min-h-0 flex-1 overflow-y-auto">
          <div className="mx-auto w-full max-w-[1400px] px-4 py-6 sm:px-6 sm:py-8">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}

function Brand() {
  return (
    <div className="flex h-14 shrink-0 items-center gap-2.5 border-b border-border px-4">
      <BrandMark />
      <span className="min-w-0">
        <span className="block text-[14px] font-semibold leading-tight tracking-[-0.01em]">
          StockFlow
        </span>
        <span className="block text-[10.5px] uppercase tracking-[0.09em] text-muted-foreground">
          Stock control
        </span>
      </span>
    </div>
  );
}

function Footprint() {
  const { user } = useAuth();
  return (
    <div className="shrink-0 border-t border-border px-4 py-3">
      <p className="text-[11px] text-muted-foreground">
        Signed in as <span className="font-medium text-foreground">{user?.name}</span>
      </p>
      <p className="text-[11px] capitalize text-muted-foreground">{user?.role} access</p>
    </div>
  );
}
