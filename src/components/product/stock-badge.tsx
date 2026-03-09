import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

/* ------------------------------------------------------------------ */
/*  Stock badge — green / yellow / red based on quantity               */
/* ------------------------------------------------------------------ */

interface StockBadgeProps {
  quantity: number;
}

export function StockBadge({ quantity }: StockBadgeProps) {
  if (quantity === 0) {
    return (
      <Badge
        className={cn(
          "border-red-200 bg-red-50 text-red-700",
          "dark:border-red-800 dark:bg-red-950 dark:text-red-400",
        )}
      >
        Elfogyott
      </Badge>
    );
  }

  if (quantity <= 5) {
    return (
      <Badge
        className={cn(
          "border-amber-200 bg-amber-50 text-amber-700",
          "dark:border-amber-800 dark:bg-amber-950 dark:text-amber-400",
        )}
      >
        Kevés — {quantity} db
      </Badge>
    );
  }

  return (
    <Badge
      className={cn(
        "border-emerald-200 bg-emerald-50 text-emerald-700",
        "dark:border-emerald-800 dark:bg-emerald-950 dark:text-emerald-400",
      )}
    >
      Készleten
    </Badge>
  );
}
