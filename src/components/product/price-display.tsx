import { cn } from "@/lib/utils";
import { formatHUF } from "@/lib/utils/format";
import { Badge } from "@/components/ui/badge";

/* ------------------------------------------------------------------ */
/*  Price display — shows current price + optional compare-at          */
/* ------------------------------------------------------------------ */

interface PriceDisplayProps {
  price: number;
  compareAtPrice?: number | null;
  size?: "sm" | "md" | "lg";
}

const sizeClasses = {
  sm: "text-sm",
  md: "text-base",
  lg: "text-2xl font-semibold tracking-[-0.02em]",
} as const;

const compareSizeClasses = {
  sm: "text-xs",
  md: "text-sm",
  lg: "text-base",
} as const;

export function PriceDisplay({
  price,
  compareAtPrice,
  size = "md",
}: PriceDisplayProps) {
  const isOnSale = compareAtPrice != null && compareAtPrice > price;

  return (
    <div className="flex flex-wrap items-baseline gap-2">
      <span
        className={cn(
          sizeClasses[size],
          isOnSale ? "text-foreground" : "text-foreground",
        )}
      >
        {formatHUF(price)}
      </span>

      {isOnSale && (
        <>
          <span
            className={cn(
              compareSizeClasses[size],
              "text-muted-foreground line-through",
            )}
          >
            {formatHUF(compareAtPrice)}
          </span>
          <Badge
            variant="destructive"
            className="text-[10px] font-semibold uppercase tracking-wider"
          >
            Akció
          </Badge>
        </>
      )}
    </div>
  );
}
