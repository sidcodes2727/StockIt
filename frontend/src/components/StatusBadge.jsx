import { CheckCircle2, CircleSlash, TriangleAlert } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

/**
 * Stock status always ships as icon + text + colour, never colour alone. The
 * dark-mode amber/green pair sits in the validator's CVD floor band, which is
 * only legal with secondary encoding — this component is that encoding, so it
 * is the single place stock status is ever rendered.
 */
const STOCK_STATUS = {
  in_stock: { label: "In Stock", variant: "success", Icon: CheckCircle2 },
  low_stock: { label: "Low Stock", variant: "warning", Icon: TriangleAlert },
  out_of_stock: { label: "Out of Stock", variant: "destructive", Icon: CircleSlash },
};

export function StockStatusBadge({ status, className }) {
  const config = STOCK_STATUS[status] ?? STOCK_STATUS.in_stock;
  const { label, variant, Icon } = config;
  return (
    <Badge variant={variant} className={cn("whitespace-nowrap", className)}>
      <Icon aria-hidden="true" />
      {label}
    </Badge>
  );
}

export function RoleBadge({ role, className }) {
  const isAdmin = role === "admin";
  return (
    <Badge variant={isAdmin ? "default" : "neutral"} className={className}>
      {isAdmin ? "Admin" : "Staff"}
    </Badge>
  );
}

export function ActiveBadge({ active, className }) {
  return (
    <Badge variant={active ? "success" : "outline"} className={className}>
      {active ? <CheckCircle2 aria-hidden="true" /> : <CircleSlash aria-hidden="true" />}
      {active ? "Active" : "Deactivated"}
    </Badge>
  );
}

export { STOCK_STATUS };
