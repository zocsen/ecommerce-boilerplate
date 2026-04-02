"use client";

/* ------------------------------------------------------------------ */
/*  StarRating — display and interactive star rating component          */
/*  Usage:                                                              */
/*    <StarRating value={4.2} />              — display mode            */
/*    <StarRating value={3} onChange={fn} />   — interactive mode        */
/* ------------------------------------------------------------------ */

import { useState, useCallback } from "react";
import { Star } from "lucide-react";
import { cn } from "@/lib/utils";

type StarRatingProps = {
  /** Current rating value (0-5, can be fractional for display) */
  value: number;
  /** When provided, enables interactive mode */
  onChange?: (value: number) => void;
  /** Size variant */
  size?: "sm" | "md" | "lg";
  /** Show numeric value next to stars */
  showValue?: boolean;
  /** Total review count to display */
  reviewCount?: number;
  /** Additional classes */
  className?: string;
};

const SIZE_MAP = {
  sm: "size-3.5",
  md: "size-4",
  lg: "size-5",
} as const;

const TEXT_SIZE_MAP = {
  sm: "text-xs",
  md: "text-sm",
  lg: "text-base",
} as const;

export function StarRating({
  value,
  onChange,
  size = "md",
  showValue = false,
  reviewCount,
  className,
}: StarRatingProps) {
  const [hoverValue, setHoverValue] = useState<number | null>(null);
  const isInteractive = !!onChange;
  const displayValue = hoverValue ?? value;

  const handleClick = useCallback(
    (star: number) => {
      if (onChange) {
        onChange(star);
      }
    },
    [onChange],
  );

  return (
    <div className={cn("flex items-center gap-1.5", className)}>
      <div
        className={cn("flex items-center gap-0.5", isInteractive && "cursor-pointer")}
        onMouseLeave={() => isInteractive && setHoverValue(null)}
      >
        {[1, 2, 3, 4, 5].map((star) => {
          const filled = displayValue >= star;
          const halfFilled = !filled && displayValue >= star - 0.5;

          return (
            <button
              key={star}
              type="button"
              disabled={!isInteractive}
              onClick={() => handleClick(star)}
              onMouseEnter={() => isInteractive && setHoverValue(star)}
              className={cn(
                "relative transition-colors duration-200",
                isInteractive
                  ? "focus-visible:ring-ring hover:scale-110 focus-visible:rounded-sm focus-visible:ring-1 focus-visible:outline-none"
                  : "cursor-default",
              )}
              tabIndex={isInteractive ? 0 : -1}
              aria-label={isInteractive ? `${star} csillag` : undefined}
            >
              {/* Background star (empty) */}
              <Star
                className={cn(
                  SIZE_MAP[size],
                  "text-border fill-transparent transition-colors duration-200",
                )}
              />
              {/* Filled overlay */}
              {(filled || halfFilled) && (
                <Star
                  className={cn(
                    SIZE_MAP[size],
                    "absolute inset-0 fill-amber-400 text-amber-400 transition-colors duration-200",
                  )}
                  style={
                    halfFilled ? { clipPath: "polygon(0 0, 50% 0, 50% 100%, 0 100%)" } : undefined
                  }
                />
              )}
            </button>
          );
        })}
      </div>

      {showValue && value > 0 && (
        <span className={cn("text-foreground/70 font-medium tabular-nums", TEXT_SIZE_MAP[size])}>
          {value.toFixed(1)}
        </span>
      )}

      {reviewCount !== undefined && (
        <span className={cn("text-muted-foreground", TEXT_SIZE_MAP[size])}>({reviewCount})</span>
      )}
    </div>
  );
}
