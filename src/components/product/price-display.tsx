import { cn } from "@/lib/utils";
import { formatHUF } from "@/lib/utils/format";
import { Badge } from "@/components/ui/badge";

/* ------------------------------------------------------------------ */
/*  Price display — shows current price + optional compare-at          */
/*  Includes EU Omnibus Directive lowest 30-day price when discounted  */
/* ------------------------------------------------------------------ */

interface PriceDisplayProps {
  price: number;
  compareAtPrice?: number | null;
  size?: "sm" | "md" | "lg";
  /** Lowest price from the last 30 days (EU Omnibus Directive). Only shown when discounted. */
  lowest30DayPrice?: number | null;
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
  lowest30DayPrice,
}: PriceDisplayProps) {
  const isOnSale = compareAtPrice != null && compareAtPrice > price;

  return (
    <div className="flex flex-col gap-1">
      <div className="flex flex-wrap items-baseline gap-2">
        <span className={cn(sizeClasses[size], isOnSale ? "text-foreground" : "text-foreground")}>
          {formatHUF(price)}
        </span>

        {isOnSale && (
          <>
            <span className={cn(compareSizeClasses[size], "text-muted-foreground line-through")}>
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

      {/* EU Omnibus Directive: lowest price in last 30 days */}
      {isOnSale && lowest30DayPrice != null && lowest30DayPrice > 0 && (
        <p className="text-sm text-muted-foreground">
          Legalacsonyabb ár az elmúlt 30 napban:{" "}
          <span className="font-medium">{formatHUF(lowest30DayPrice)}</span>
        </p>
      )}
    </div>
  );
}
