"use client";

import { useMemo } from "react";
import type { ProductVariantRow } from "@/lib/types/database";
import { cn } from "@/lib/utils";

/* ------------------------------------------------------------------ */
/*  Variant selector — chip-style option pickers                       */
/* ------------------------------------------------------------------ */

interface VariantSelectorProps {
  variants: ProductVariantRow[];
  selectedVariantId: string | null;
  onSelect: (variantId: string) => void;
}

/** Groups variants by unique option names and their possible values. */
function useOptionGroups(variants: ProductVariantRow[]) {
  return useMemo(() => {
    const groups: Array<{
      name: string;
      values: Array<{
        value: string;
        /** Variant IDs that include this option value. */
        variantIds: string[];
        /** True if *every* variant with this value is out of stock. */
        allOutOfStock: boolean;
      }>;
    }> = [];

    // Option 1 — always present
    const option1Name = variants[0]?.option1_name ?? "Méret";
    const option1Map = new Map<
      string,
      { variantIds: string[]; allOutOfStock: boolean }
    >();

    for (const v of variants) {
      if (v.option1_value == null) continue;
      const existing = option1Map.get(v.option1_value);
      if (existing) {
        existing.variantIds.push(v.id);
        if (v.stock_quantity > 0 || v.is_active) {
          // At least one variant with this value is available
          existing.allOutOfStock =
            existing.allOutOfStock && (v.stock_quantity === 0 || !v.is_active);
        }
      } else {
        option1Map.set(v.option1_value, {
          variantIds: [v.id],
          allOutOfStock: v.stock_quantity === 0 || !v.is_active,
        });
      }
    }

    if (option1Map.size > 0) {
      groups.push({
        name: option1Name,
        values: Array.from(option1Map.entries()).map(([value, data]) => ({
          value,
          variantIds: data.variantIds,
          allOutOfStock: data.allOutOfStock,
        })),
      });
    }

    // Option 2 — optional
    const hasOption2 = variants.some(
      (v) => v.option2_name != null && v.option2_value != null,
    );

    if (hasOption2) {
      const option2Name = variants.find((v) => v.option2_name != null)
        ?.option2_name as string;
      const option2Map = new Map<
        string,
        { variantIds: string[]; allOutOfStock: boolean }
      >();

      for (const v of variants) {
        if (v.option2_value == null) continue;
        const existing = option2Map.get(v.option2_value);
        if (existing) {
          existing.variantIds.push(v.id);
          existing.allOutOfStock =
            existing.allOutOfStock && (v.stock_quantity === 0 || !v.is_active);
        } else {
          option2Map.set(v.option2_value, {
            variantIds: [v.id],
            allOutOfStock: v.stock_quantity === 0 || !v.is_active,
          });
        }
      }

      if (option2Map.size > 0) {
        groups.push({
          name: option2Name,
          values: Array.from(option2Map.entries()).map(([value, data]) => ({
            value,
            variantIds: data.variantIds,
            allOutOfStock: data.allOutOfStock,
          })),
        });
      }
    }

    return groups;
  }, [variants]);
}

export function VariantSelector({
  variants,
  selectedVariantId,
  onSelect,
}: VariantSelectorProps) {
  const groups = useOptionGroups(variants);

  if (variants.length === 0) return null;

  // For single-dimension variants, clicking a chip selects the variant directly.
  // For two-dimensional variants, we need to resolve the exact variant from the
  // selected combination. We handle this by checking if a clicked variant ID
  // is a direct match.

  return (
    <div className="space-y-5">
      {groups.map((group) => (
        <div key={group.name}>
          <p className="mb-2.5 text-xs font-medium uppercase tracking-widest text-muted-foreground">
            {group.name}
          </p>
          <div className="flex flex-wrap gap-2">
            {group.values.map((option) => {
              const isSelected = option.variantIds.includes(
                selectedVariantId ?? "",
              );
              const isDisabled = option.allOutOfStock;

              return (
                <button
                  key={option.value}
                  type="button"
                  disabled={isDisabled}
                  onClick={() => {
                    // Select the first available variant with this option value
                    const targetId = option.variantIds.find((id) => {
                      const v = variants.find((vr) => vr.id === id);
                      return v && v.stock_quantity > 0 && v.is_active;
                    });
                    if (targetId) {
                      onSelect(targetId);
                    } else if (option.variantIds[0]) {
                      // All out of stock but still allow selection for display
                      onSelect(option.variantIds[0]);
                    }
                  }}
                  className={cn(
                    "relative min-w-[3rem] rounded-lg border px-4 py-2 text-sm font-medium transition-all duration-300",
                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                    isSelected
                      ? "border-foreground bg-foreground text-background"
                      : "border-border bg-background text-foreground hover:border-foreground/40",
                    isDisabled &&
                      "cursor-not-allowed border-border/50 bg-muted text-muted-foreground/50 hover:border-border/50",
                  )}
                >
                  {isDisabled && (
                    <span
                      aria-hidden="true"
                      className="absolute inset-0 flex items-center justify-center"
                    >
                      <span className="h-px w-[calc(100%-16px)] rotate-[-12deg] bg-muted-foreground/30" />
                    </span>
                  )}
                  <span className={cn(isDisabled && "line-through")}>
                    {option.value}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
