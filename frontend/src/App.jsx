import { Route, Routes } from "react-router-dom";
import { Toaster } from "sonner";

import { AppShell } from "@/components/AppShell";
import { AdminRoute, ProtectedRoute } from "@/components/ProtectedRoute";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/hooks/useAuth";
import { ThemeProvider } from "@/hooks/useTheme";

import Login from "@/pages/Login";
import Dashboard from "@/pages/Dashboard";
import Products from "@/pages/Products";
import Categories from "@/pages/Categories";
import Suppliers from "@/pages/Suppliers";
import SupplierDetail from "@/pages/SupplierDetail";
import Purchases from "@/pages/Purchases";
import Sales from "@/pages/Sales";
import Invoice from "@/pages/Invoice";
import Reports from "@/pages/Reports";
import Users from "@/pages/Users";
import SettingsPage from "@/pages/Settings";
import NotFound from "@/pages/NotFound";

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <TooltipProvider delayDuration={250}>
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

          <Toaster
            position="bottom-right"
            closeButton
            toastOptions={{
              classNames: {
                toast:
                  "!rounded-lg !border !border-border !bg-card !text-card-foreground !shadow-overlay",
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
