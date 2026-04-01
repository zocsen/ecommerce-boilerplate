import type { OrderStatus } from "@/lib/types/database";
import { ORDER_STATUS_LABELS, ORDER_STATUS_BADGE_VARIANT } from "@/lib/constants/order-status";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface OrderStatusBadgeProps {
  status: OrderStatus;
  className?: string;
}

/**
 * Shared order status badge — single source of truth for labels & variants.
 *
 * Works in both Server Components and Client Components.
 * Import from `@/components/admin/order-status-badge`.
 */
export function OrderStatusBadge({ status, className }: OrderStatusBadgeProps) {
  return (
    <Badge variant={ORDER_STATUS_BADGE_VARIANT[status] ?? "outline"} className={cn(className)}>
      {ORDER_STATUS_LABELS[status] ?? status}
    </Badge>
  );
}
