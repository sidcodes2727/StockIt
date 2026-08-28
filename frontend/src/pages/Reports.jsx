import * as React from "react";
import { Download } from "lucide-react";
import { useSearchParams } from "react-router-dom";

import { ErrorState } from "@/components/EmptyState";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useReport, useExportReport } from "@/hooks/queries";

export default function Reports() {
  const [searchParams, setSearchParams] = useSearchParams();
  const currentTab = searchParams.get("tab") || "sales";

  const onTabChange = (val) => {
    setSearchParams({ tab: val });
  };

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Business Intelligence"
        title="Reports"
        description="Analyze your sales, purchases, and inventory valuation."
      />

      <Tabs value={currentTab} onValueChange={onTabChange}>
        <div className="mb-4 overflow-x-auto">
          <TabsList>
            <TabsTrigger value="sales">Sales</TabsTrigger>
            <TabsTrigger value="purchases">Purchases</TabsTrigger>
            <TabsTrigger value="stock">Inventory Valuation</TabsTrigger>
            <TabsTrigger value="low-stock">Low Stock</TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="sales" className="m-0 focus-visible:outline-none">
          <SalesReport />
        </TabsContent>
        <TabsContent value="purchases" className="m-0 focus-visible:outline-none">
          <PurchasesReport />
        </TabsContent>
        <TabsContent value="stock" className="m-0 focus-visible:outline-none">
          <StockReport />
        </TabsContent>
        <TabsContent value="low-stock" className="m-0 focus-visible:outline-none">
          <LowStockReport />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function ReportActions({ type, params }) {
  const exporter = useExportReport();
  return (
    <div className="flex items-center gap-2">
      <Button
        variant="outline"
        size="sm"
        disabled={exporter.isPending}
        onClick={() => exporter.mutate({ type, params, format: "csv" })}
      >
        <Download className="mr-2 h-4 w-4" />
        CSV
      </Button>
      <Button
        variant="outline"
        size="sm"
        disabled={exporter.isPending}
        onClick={() => exporter.mutate({ type, params, format: "pdf" })}
      >
        <Download className="mr-2 h-4 w-4" />
        PDF
      </Button>
    </div>
  );
}

function SalesReport() {
  const [groupBy, setGroupBy] = React.useState("day");
  const query = useReport("sales", { group_by: groupBy });

  return (
    <ReportLayout 
      title="Sales Report" 
      query={query}
      actions={<ReportActions type="sales" params={{ group_by: groupBy }} />}
      filters={
        <Select value={groupBy} onValueChange={setGroupBy}>
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="Group by" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="day">By Day</SelectItem>
            <SelectItem value="product">By Product</SelectItem>
            <SelectItem value="category">By Category</SelectItem>
          </SelectContent>
        </Select>
      }
      columns={
        groupBy === "day" 
          ? ["Date", "Invoices", "Units", "Revenue"] 
          : groupBy === "product"
          ? ["Product", "SKU", "Units", "Revenue"]
          : ["Category", "Units", "Revenue"]
      }
      renderRow={(row, i) => (
        <TableRow key={row.key || i}>
          <TableCell className="font-medium">{row.label}</TableCell>
          {groupBy === "product" && <TableCell className="text-muted-foreground">{row.sku}</TableCell>}
          {groupBy === "day" && <TableCell>{row.invoices}</TableCell>}
          <TableCell>{row.units}</TableCell>
          <TableCell>{row.revenue}</TableCell>
        </TableRow>
      )}
    />
  );
}

function PurchasesReport() {
  const [groupBy, setGroupBy] = React.useState("day");
  const query = useReport("purchases", { group_by: groupBy });

  return (
    <ReportLayout 
      title="Purchases Report" 
      query={query}
      actions={<ReportActions type="purchases" params={{ group_by: groupBy }} />}
      filters={
        <Select value={groupBy} onValueChange={setGroupBy}>
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="Group by" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="day">By Day</SelectItem>
            <SelectItem value="supplier">By Supplier</SelectItem>
            <SelectItem value="product">By Product</SelectItem>
          </SelectContent>
        </Select>
      }
      columns={
        groupBy === "day" 
          ? ["Date", "Units", "Cost"] 
          : groupBy === "product"
          ? ["Product", "SKU", "Units", "Cost"]
          : ["Supplier", "Units", "Cost"]
      }
      renderRow={(row, i) => (
        <TableRow key={row.key || i}>
          <TableCell className="font-medium">{row.label}</TableCell>
          {groupBy === "product" && <TableCell className="text-muted-foreground">{row.sku}</TableCell>}
          <TableCell>{row.units}</TableCell>
          <TableCell>{row.cost}</TableCell>
        </TableRow>
      )}
    />
  );
}

function StockReport() {
  const query = useReport("stock", {});
  return (
    <ReportLayout 
      title="Inventory Valuation" 
      query={query}
      actions={<ReportActions type="stock" params={{}} />}
      columns={["SKU", "Product", "Category", "Qty", "Stock Value", "Retail Value"]}
      renderRow={(row, i) => (
        <TableRow key={row.sku || i}>
          <TableCell className="text-muted-foreground">{row.sku}</TableCell>
          <TableCell className="font-medium">{row.name}</TableCell>
          <TableCell>{row.category}</TableCell>
          <TableCell>{row.quantity}</TableCell>
          <TableCell>{row.stock_value}</TableCell>
          <TableCell>{row.retail_value}</TableCell>
        </TableRow>
      )}
    />
  );
}

function LowStockReport() {
  const query = useReport("low-stock", {});
  return (
    <ReportLayout 
      title="Low Stock Report" 
      query={query}
      actions={<ReportActions type="low-stock" params={{}} />}
      columns={["SKU", "Product", "Supplier", "In stock", "Reorder lvl", "Shortfall"]}
      renderRow={(row, i) => (
        <TableRow key={row.sku || i}>
          <TableCell className="text-muted-foreground">{row.sku}</TableCell>
          <TableCell className="font-medium">{row.name}</TableCell>
          <TableCell>{row.supplier}</TableCell>
          <TableCell>{row.quantity}</TableCell>
          <TableCell>{row.reorder_level}</TableCell>
          <TableCell className="text-destructive font-medium">{row.shortfall}</TableCell>
        </TableRow>
      )}
    />
  );
}

function ReportLayout({ title, query, actions, filters, columns, renderRow }) {
  if (query.isError) {
    return (
      <Card>
        <ErrorState error={query.error} onRetry={query.refetch} />
      </Card>
    );
  }

  return (
    <Card>
      <div className="flex flex-col gap-4 border-b border-border p-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <h3 className="font-semibold">{title}</h3>
          {filters}
        </div>
        {actions}
      </div>

      <CardContent className="p-0">
        {query.isLoading ? (
          <div className="p-6 space-y-4">
            <Skeleton className="h-6 w-full" />
            <Skeleton className="h-6 w-full" />
            <Skeleton className="h-6 w-full" />
          </div>
        ) : (
          <div className="max-h-[600px] overflow-auto">
            <Table>
              <TableHeader className="sticky top-0 bg-card z-10 shadow-sm">
                <TableRow>
                  {columns.map((col, i) => (
                    <TableHead key={i}>{col}</TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {query.data?.rows?.length > 0 ? (
                  query.data.rows.map(renderRow)
                ) : (
                  <TableRow>
                    <TableCell colSpan={columns.length} className="h-24 text-center">
                      No data found for this report.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
