import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { api, get } from "@/lib/api";
import { downloadBlob, filenameFromHeaders } from "@/lib/utils";

/* --------------------------------------------------------------------------
   Query keys

   One place, so an invalidation can never miss a cache that should have been
   refreshed. Anything that touches Product.quantity invalidates the same
   `stockAffected` set — that's the group that has to move together.
   -------------------------------------------------------------------------- */
export const keys = {
  dashboard: {
    all: ["dashboard"],
    summary: () => ["dashboard", "summary"],
    trend: (days) => ["dashboard", "trend", days],
    top: (params) => ["dashboard", "top", params],
  },
  products: {
    all: ["products"],
    list: (params) => ["products", "list", params],
    detail: (id) => ["products", "detail", id],
    lowStock: () => ["products", "low-stock"],
    options: () => ["products", "options"],
  },
  categories: {
    all: ["categories"],
    list: () => ["categories", "list"],
  },
  suppliers: {
    all: ["suppliers"],
    list: (params) => ["suppliers", "list", params],
    detail: (id) => ["suppliers", "detail", id],
    purchases: (id, params) => ["suppliers", "purchases", id, params],
    options: () => ["suppliers", "options"],
  },
  purchases: {
    all: ["purchases"],
    list: (params) => ["purchases", "list", params],
    reference: (ref) => ["purchases", "reference", ref],
  },
  sales: {
    all: ["sales"],
    list: (params) => ["sales", "list", params],
    invoice: (no) => ["sales", "invoice", no],
  },
  reports: {
    all: ["reports"],
    one: (type, params) => ["reports", type, params],
  },
  users: {
    all: ["users"],
    list: (params) => ["users", "list", params],
    detail: (id) => ["users", "detail", id],
  },
};

/** Everything a stock movement changes. Used by purchases, sales and adjustments. */
function invalidateStock(queryClient) {
  [
    keys.products.all,
    keys.dashboard.all,
    keys.purchases.all,
    keys.sales.all,
    keys.reports.all,
    keys.suppliers.all,
  ].forEach((key) => queryClient.invalidateQueries({ queryKey: key }));
}

/* --------------------------------------------------------------------------
   Dashboard
   -------------------------------------------------------------------------- */
export function useDashboardSummary() {
  return useQuery({
    queryKey: keys.dashboard.summary(),
    queryFn: () => get("/dashboard/summary"),
    // The dashboard is the screen people leave open, so it self-refreshes.
    refetchInterval: 120_000,
  });
}

export function useSalesTrend(days = 7) {
  return useQuery({
    queryKey: keys.dashboard.trend(days),
    queryFn: () => get("/dashboard/sales-trend", { days }),
    // Keeps the previous series on screen while a new range loads, so toggling
    // 7/30 days doesn't collapse the chart to a skeleton.
    placeholderData: (previous) => previous,
  });
}

export function useTopProducts({ days = 30, limit = 5 } = {}) {
  return useQuery({
    queryKey: keys.dashboard.top({ days, limit }),
    queryFn: () => get("/dashboard/top-products", { days, limit }),
  });
}

/* --------------------------------------------------------------------------
   Products
   -------------------------------------------------------------------------- */
export function useProducts(params, options = {}) {
  return useQuery({
    queryKey: keys.products.list(params),
    queryFn: () => get("/products", params),
    placeholderData: (previous) => previous,
    ...options,
  });
}

export function useProduct(id, options = {}) {
  return useQuery({
    queryKey: keys.products.detail(id),
    queryFn: () => get(`/products/${id}`),
    enabled: Boolean(id),
    ...options,
  });
}

export function useLowStockProducts() {
  return useQuery({
    queryKey: keys.products.lowStock(),
    queryFn: () => get("/products/low-stock"),
  });
}

/** Unpaginated, for the product pickers on the purchase and sale forms. */
export function useProductOptions() {
  return useQuery({
    queryKey: keys.products.options(),
    queryFn: () => get("/products", { paginate: false, sort_by: "name" }),
    staleTime: 60_000,
    select: (data) => data.items ?? data,
  });
}

export function useCreateProduct() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload) => api.post("/products", payload).then((r) => r.data),
    onSuccess: () => invalidateStock(queryClient),
  });
}

export function useUpdateProduct() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...payload }) =>
      api.patch(`/products/${id}`, payload).then((r) => r.data),
    onSuccess: () => invalidateStock(queryClient),
  });
}

export function useAdjustStock() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...payload }) =>
      api.post(`/products/${id}/adjust-stock`, payload).then((r) => r.data),
    onSuccess: () => invalidateStock(queryClient),
  });
}

export function useDeleteProduct() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, force = false }) =>
      api.delete(`/products/${id}`, { params: force ? { force: true } : undefined }),
    onSuccess: () => invalidateStock(queryClient),
  });
}

export function useImportProducts() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (file) => {
      const form = new FormData();
      form.append("file", file);
      return api
        .post("/products/import", form, { headers: { "Content-Type": undefined } })
        .then((r) => r.data);
    },
    onSuccess: () => invalidateStock(queryClient),
  });
}

/* --------------------------------------------------------------------------
   Categories
   -------------------------------------------------------------------------- */
export function useCategories() {
  return useQuery({
    queryKey: keys.categories.list(),
    queryFn: () => get("/categories"),
    staleTime: 60_000,
    select: (data) => data.items ?? data,
  });
}

export function useSaveCategory() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...payload }) =>
      id
        ? api.put(`/categories/${id}`, payload).then((r) => r.data)
        : api.post("/categories", payload).then((r) => r.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: keys.categories.all });
      queryClient.invalidateQueries({ queryKey: keys.products.all });
    },
  });
}

export function useDeleteCategory() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id) => api.delete(`/categories/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: keys.categories.all });
      queryClient.invalidateQueries({ queryKey: keys.products.all });
    },
  });
}

/* --------------------------------------------------------------------------
   Suppliers
   -------------------------------------------------------------------------- */
export function useSuppliers(params) {
  return useQuery({
    queryKey: keys.suppliers.list(params),
    queryFn: () => get("/suppliers", params),
    placeholderData: (previous) => previous,
  });
}

export function useSupplierOptions() {
  return useQuery({
    queryKey: keys.suppliers.options(),
    queryFn: () => get("/suppliers", { paginate: false, sort_by: "name" }),
    staleTime: 60_000,
    select: (data) => data.items ?? data,
  });
}

export function useSupplier(id) {
  return useQuery({
    queryKey: keys.suppliers.detail(id),
    queryFn: () => get(`/suppliers/${id}`),
    enabled: Boolean(id),
  });
}

export function useSupplierPurchases(id, params) {
  return useQuery({
    queryKey: keys.suppliers.purchases(id, params),
    queryFn: () => get(`/suppliers/${id}/purchases`, params),
    enabled: Boolean(id),
    placeholderData: (previous) => previous,
  });
}

export function useSaveSupplier() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...payload }) =>
      id
        ? api.put(`/suppliers/${id}`, payload).then((r) => r.data)
        : api.post("/suppliers", payload).then((r) => r.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: keys.suppliers.all });
      queryClient.invalidateQueries({ queryKey: keys.products.all });
    },
  });
}

export function useDeleteSupplier() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id) => api.delete(`/suppliers/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: keys.suppliers.all });
      queryClient.invalidateQueries({ queryKey: keys.products.all });
    },
  });
}

/* --------------------------------------------------------------------------
   Purchases (stock in)
   -------------------------------------------------------------------------- */
export function usePurchases(params) {
  return useQuery({
    queryKey: keys.purchases.list(params),
    queryFn: () => get("/purchases", params),
    placeholderData: (previous) => previous,
  });
}

export function usePurchaseReference(referenceNo) {
  return useQuery({
    queryKey: keys.purchases.reference(referenceNo),
    queryFn: () => get(`/purchases/reference/${encodeURIComponent(referenceNo)}`),
    enabled: Boolean(referenceNo),
  });
}

export function useCreatePurchase() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload) => api.post("/purchases", payload).then((r) => r.data),
    onSuccess: () => invalidateStock(queryClient),
  });
}

/* --------------------------------------------------------------------------
   Sales (stock out)
   -------------------------------------------------------------------------- */
export function useSales(params) {
  return useQuery({
    queryKey: keys.sales.list(params),
    queryFn: () => get("/sales", params),
    placeholderData: (previous) => previous,
  });
}

export function useInvoice(invoiceNo) {
  return useQuery({
    queryKey: keys.sales.invoice(invoiceNo),
    queryFn: () => get(`/sales/invoice/${encodeURIComponent(invoiceNo)}`),
    enabled: Boolean(invoiceNo),
  });
}

export function useCreateSale() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload) => api.post("/sales", payload).then((r) => r.data),
    onSuccess: () => invalidateStock(queryClient),
  });
}

/* --------------------------------------------------------------------------
   Reports
   -------------------------------------------------------------------------- */
export function useReport(type, params, options = {}) {
  return useQuery({
    queryKey: keys.reports.one(type, params),
    queryFn: () => get(`/reports/${type}`, params),
    placeholderData: (previous) => previous,
    ...options,
  });
}

/**
 * Exports hit the same endpoint as the on-screen report with `format=csv|pdf`,
 * so a download can never show different numbers from the table above it.
 */
export function useExportReport() {
  return useMutation({
    mutationFn: async ({ type, params, format }) => {
      const response = await api.get(`/reports/${type}`, {
        params: { ...params, format },
        responseType: "blob",
      });
      const fallback = `${type}-report.${format}`;
      downloadBlob(response.data, filenameFromHeaders(response.headers, fallback));
    },
  });
}

export function useDownloadImportTemplate() {
  return useMutation({
    mutationFn: async () => {
      const response = await api.get("/products/import/template", {
        responseType: "blob",
      });
      downloadBlob(
        response.data,
        filenameFromHeaders(response.headers, "product-import-template.csv"),
      );
    },
  });
}

/* --------------------------------------------------------------------------
   Users (admin only)
   -------------------------------------------------------------------------- */
export function useUsers(params) {
  return useQuery({
    queryKey: keys.users.list(params),
    queryFn: () => get("/users", params),
    placeholderData: (previous) => previous,
  });
}

export function useSaveUser() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...payload }) =>
      id
        ? api.patch(`/users/${id}`, payload).then((r) => r.data)
        : api.post("/users", payload).then((r) => r.data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: keys.users.all }),
  });
}

export function useSetUserActive() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, active }) =>
      api.post(`/users/${id}/${active ? "activate" : "deactivate"}`).then((r) => r.data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: keys.users.all }),
  });
}

export function useDeleteUser() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id) => api.delete(`/users/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: keys.users.all }),
  });
}

/* --------------------------------------------------------------------------
   Profile
   -------------------------------------------------------------------------- */
export function useUpdateProfile() {
  return useMutation({
    mutationFn: (payload) => api.patch("/auth/me", payload).then((r) => r.data),
  });
}

export function useChangePassword() {
  return useMutation({
    mutationFn: (payload) => api.post("/auth/change-password", payload).then((r) => r.data),
  });
}
