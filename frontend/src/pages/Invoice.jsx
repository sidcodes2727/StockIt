import * as React from "react";
import { useParams, Link } from "react-router-dom";
import { ArrowLeft, Printer } from "lucide-react";

import { ErrorState } from "@/components/EmptyState";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useInvoice } from "@/hooks/queries";
import { formatDate, money, number } from "@/lib/utils";

export default function Invoice() {
  const { invoiceNo } = useParams();
  const invoiceQuery = useInvoice(invoiceNo);

  const invoice = invoiceQuery.data;

  if (invoiceQuery.isError) {
    return (
      <div className="p-8 max-w-2xl mx-auto">
        <Button variant="ghost" asChild className="mb-4">
          <Link to="/sales">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Sales
          </Link>
        </Button>
        <ErrorState error={invoiceQuery.error} onRetry={invoiceQuery.refetch} />
      </div>
    );
  }

  if (invoiceQuery.isLoading) {
    return (
      <div className="p-8 max-w-2xl mx-auto space-y-6">
        <Skeleton className="h-8 w-40" />
        <Skeleton className="h-[400px] w-full" />
      </div>
    );
  }

  if (!invoice) return null;

  return (
    <div className="min-h-screen bg-muted/20">
      {/* Non-printable controls */}
      <div className="print:hidden p-4 border-b border-border bg-card flex items-center justify-between shadow-sm">
        <Button variant="ghost" asChild>
          <Link to="/sales">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Sales
          </Link>
        </Button>
        <Button onClick={() => window.print()}>
          <Printer className="mr-2 h-4 w-4" />
          Print Invoice
        </Button>
      </div>

      {/* Printable Invoice Sheet */}
      <div className="p-4 sm:p-8 flex justify-center">
        <div className="bg-card w-full max-w-[800px] shadow-sm border border-border p-8 sm:p-12 print:shadow-none print:border-none print:p-0">
          <div className="flex justify-between items-start mb-12">
            <div>
              <h1 className="text-3xl font-bold tracking-tight text-foreground">INVOICE</h1>
              <p className="text-muted-foreground mt-1 text-sm">#{invoice.invoice_no}</p>
            </div>
            <div className="text-right">
              <h2 className="font-semibold text-lg">Your Company Name</h2>
              <p className="text-sm text-muted-foreground mt-1">123 Business Avenue</p>
              <p className="text-sm text-muted-foreground">City, Country, 12345</p>
              <p className="text-sm text-muted-foreground">contact@yourcompany.com</p>
            </div>
          </div>

          <div className="flex justify-between mb-10 pb-8 border-b border-border">
            <div>
              <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Billed To</h3>
              <p className="font-medium">{invoice.customer_name || "Walk-in Customer"}</p>
            </div>
            <div className="text-right">
              <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Date of Issue</h3>
              <p className="font-medium">{formatDate(invoice.sale_date)}</p>
            </div>
          </div>

          <table className="w-full mb-10">
            <thead>
              <tr className="border-b border-border">
                <th className="py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">Item</th>
                <th className="py-3 text-center text-xs font-semibold text-muted-foreground uppercase tracking-wider">Qty</th>
                <th className="py-3 text-right text-xs font-semibold text-muted-foreground uppercase tracking-wider">Price</th>
                <th className="py-3 text-right text-xs font-semibold text-muted-foreground uppercase tracking-wider">Total</th>
              </tr>
            </thead>
            <tbody>
              {invoice.items?.map((item, index) => (
                <tr key={index} className="border-b border-border/50">
                  <td className="py-4 text-sm font-medium">{item.product_name}</td>
                  <td className="py-4 text-sm text-center">{number(item.quantity)}</td>
                  <td className="py-4 text-sm text-right">{money(item.unit_price)}</td>
                  <td className="py-4 text-sm text-right font-medium">{money(item.total_price)}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="flex justify-end">
            <div className="w-64 space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Subtotal</span>
                <span>{money(invoice.total_amount)}</span>
              </div>
              {/* Optional tax row could go here */}
              <div className="flex justify-between text-lg font-bold pt-3 border-t border-border">
                <span>Total</span>
                <span>{money(invoice.total_amount)}</span>
              </div>
            </div>
          </div>
          
          <div className="mt-20 pt-8 border-t border-border text-center text-sm text-muted-foreground">
            Thank you for your business!
          </div>
        </div>
      </div>
    </div>
  );
}
