import { Navigate, Outlet, useLocation } from "react-router-dom";
import { ShieldOff } from "lucide-react";

import { BrandMark } from "@/components/Sidebar";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";

/**
 * Route guard. While the stored token is being verified we render a neutral
 * splash rather than redirecting — otherwise every hard refresh of a protected
 * page would bounce through /login.
 */
export function ProtectedRoute() {
  const { isAuthenticated, bootstrapping } = useAuth();
  const location = useLocation();

  if (bootstrapping) return <Splash />;

  if (!isAuthenticated) {
    // Remember where they were headed so login can send them back.
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  return <Outlet />;
}

/**
 * Role gate. The backend enforces this too — every admin route is decorated
 * with @admin_required — so this is about not showing a page that would only
 * return 403s, not about security.
 */
export function AdminRoute() {
  const { isAdmin } = useAuth();
  if (!isAdmin) return <NoAccess />;
  return <Outlet />;
}

function Splash() {
  return (
    <div className="flex h-dvh flex-col items-center justify-center gap-3">
      <BrandMark className="animate-pulse" />
      <p className="text-[13px] text-muted-foreground">Restoring your session…</p>
    </div>
  );
}

function NoAccess() {
  return (
    <div className="flex flex-col items-center justify-center gap-4 py-24 text-center">
      <div className="flex size-11 items-center justify-center rounded-lg border border-border bg-muted/60 text-muted-foreground">
        <ShieldOff className="size-5" aria-hidden="true" />
      </div>
      <div className="space-y-1">
        <h1 className="text-[17px] font-semibold">Admins only</h1>
        <p className="max-w-sm text-[13px] leading-relaxed text-muted-foreground">
          User management is restricted to administrator accounts. Ask an admin if you
          need access.
        </p>
      </div>
      <Button variant="outline" size="sm" asChild>
        <a href="/">Back to dashboard</a>
      </Button>
    </div>
  );
}
