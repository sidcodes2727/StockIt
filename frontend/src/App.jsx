import * as React from "react";
import { Route, Routes } from "react-router-dom";
import { Toaster } from "sonner";

import { AppShell } from "@/components/AppShell";
import { AdminRoute, ProtectedRoute } from "@/components/ProtectedRoute";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/hooks/useAuth";
import { ThemeProvider } from "@/hooks/useTheme";

// Every page is its own chunk, so signing in doesn't download the reports
// module and the charting library until someone actually opens them.
const Login = React.lazy(() => import("@/pages/Login"));
const Dashboard = React.lazy(() => import("@/pages/Dashboard"));
const Products = React.lazy(() => import("@/pages/Products"));
const Categories = React.lazy(() => import("@/pages/Categories"));
const Suppliers = React.lazy(() => import("@/pages/Suppliers"));
const SupplierDetail = React.lazy(() => import("@/pages/SupplierDetail"));
const Purchases = React.lazy(() => import("@/pages/Purchases"));
const Sales = React.lazy(() => import("@/pages/Sales"));
const Invoice = React.lazy(() => import("@/pages/Invoice"));
const Reports = React.lazy(() => import("@/pages/Reports"));
const Users = React.lazy(() => import("@/pages/Users"));
const SettingsPage = React.lazy(() => import("@/pages/Settings"));
const NotFound = React.lazy(() => import("@/pages/NotFound"));

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <TooltipProvider delayDuration={250}>
          {/* Routes outside the shell (login, invoice) suspend here; pages
              inside the shell suspend within it, so the rail stays put. */}
          <React.Suspense fallback={<div className="h-dvh bg-background" />}>
            <Routes>
              <Route path="/login" element={<Login />} />

              <Route element={<ProtectedRoute />}>
                {/* The printable invoice renders outside the shell: no sidebar,
                  no topbar, so Ctrl-P produces a clean receipt. */}
                <Route path="/sales/invoice/:invoiceNo" element={<Invoice />} />

                <Route element={<AppShell />}>
                  <Route index element={<Dashboard />} />
                  <Route path="products" element={<Products />} />
                  <Route path="categories" element={<Categories />} />
                  <Route path="suppliers" element={<Suppliers />} />
                  <Route path="suppliers/:id" element={<SupplierDetail />} />
                  <Route path="purchases" element={<Purchases />} />
                  <Route path="sales" element={<Sales />} />
                  <Route path="reports" element={<Reports />} />
                  <Route path="settings" element={<SettingsPage />} />

                  <Route element={<AdminRoute />}>
                    <Route path="users" element={<Users />} />
                  </Route>

                  <Route path="*" element={<NotFound />} />
                </Route>
              </Route>
            </Routes>
          </React.Suspense>

          <Toaster
            position="bottom-right"
            closeButton
            toastOptions={{
              classNames: {
                toast:
                  "!rounded-xl !border !border-border !bg-card !text-card-foreground !shadow-overlay",
                description: "!text-muted-foreground",
                actionButton: "!bg-primary !text-primary-foreground",
                error: "!border-destructive/30",
                success: "!border-success/30",
              },
            }}
          />
        </TooltipProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}
