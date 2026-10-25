import * as React from "react";
import { Outlet, useLocation } from "react-router-dom";

import { CommandPalette } from "@/components/CommandPalette";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { SidebarHealth, SidebarNav, SidebarUser, Wordmark } from "@/components/Sidebar";
import { Topbar } from "@/components/Topbar";
import { useAuth } from "@/hooks/useAuth";
import { useLowStockProducts } from "@/hooks/queries";

export function AppShell() {
  const { isAdmin } = useAuth();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = React.useState(false);
  const [paletteOpen, setPaletteOpen] = React.useState(false);
  const { data } = useLowStockProducts();
  const lowStockCount = data?.items?.length ?? 0;

  // Close the drawer on navigation, and reset scroll so a new page starts at
  // the top rather than mid-table.
  React.useEffect(() => {
    setMobileOpen(false);
    document.getElementById("main-scroll")?.scrollTo({ top: 0 });
  }, [location.pathname]);

  const rail = (onNavigate) => (
    <>
      <div className="flex h-14 shrink-0 items-center border-b border-sidebar-border px-4">
        <Wordmark />
      </div>
      <SidebarNav isAdmin={isAdmin} lowStockCount={lowStockCount} onNavigate={onNavigate} />
      <SidebarHealth />
      <SidebarUser />
    </>
  );

  return (
    <div className="flex h-dvh overflow-hidden bg-background">
      {/* The navigation rail follows the theme. Persistent on desktop. */}
      <aside className="console hidden w-[244px] shrink-0 flex-col border-r border-sidebar-border text-sidebar-foreground lg:flex">
        {rail()}
      </aside>

      {/* Drawer on tablet and phone — warehouse staff work on both. */}
      <Dialog open={mobileOpen} onOpenChange={setMobileOpen}>
        <DialogContent
          side="right"
          size="sm"
          className="console left-0 right-auto max-w-[268px] border-sidebar-border p-0 text-sidebar-foreground data-[state=closed]:slide-out-to-left data-[state=open]:slide-in-from-left lg:hidden"
        >
          <DialogTitle className="sr-only">Navigation</DialogTitle>
          {rail(() => setMobileOpen(false))}
        </DialogContent>
      </Dialog>

      <CommandPalette open={paletteOpen} onOpenChange={setPaletteOpen} />

      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar
          onOpenSidebar={() => setMobileOpen(true)}
          onOpenPalette={() => setPaletteOpen(true)}
        />
        <main id="main-scroll" className="canvas min-h-0 flex-1 overflow-y-auto">
          <div
            key={location.pathname}
            className="mx-auto w-full max-w-[1440px] animate-page-in px-4 py-6 sm:px-6 sm:py-8 lg:px-8"
          >
            <React.Suspense fallback={<PageFallback />}>
              <Outlet />
            </React.Suspense>
          </div>
        </main>
      </div>
    </div>
  );
}

/** Shown for the split second a lazily loaded page's code is in flight. */
function PageFallback() {
  return (
    <div className="space-y-6" aria-busy="true" aria-label="Loading page">
      <div className="space-y-2">
        <Skeleton className="h-3 w-24" />
        <Skeleton className="h-8 w-64" />
      </div>
      <Skeleton className="h-[420px] w-full rounded-xl" />
    </div>
  );
}
