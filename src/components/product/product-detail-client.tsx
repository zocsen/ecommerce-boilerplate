"use client";

import { useState, useMemo } from "react";
import type {
  ProductRow,
  ProductVariantRow,
  CategoryRow,
  ProductExtraWithProduct,
} from "@/lib/types/database";
import type { LowestPriceMap } from "@/lib/utils/price-history-shared";
import { resolveLowest30DayPrice } from "@/lib/utils/price-history-shared";
import { Gallery } from "@/components/product/gallery";
import { PriceDisplay } from "@/components/product/price-display";
import { VariantSelector } from "@/components/product/variant-selector";
import { StockBadge } from "@/components/product/stock-badge";
import { AddToCartButton } from "@/components/product/add-to-cart-button";
import { Checkbox } from "@/components/ui/checkbox";
import { formatHUF } from "@/lib/utils/format";

/* ------------------------------------------------------------------ */
/*  Product detail client wrapper — holds selected variant state       */
/* ------------------------------------------------------------------ */

interface ProductDetailClientProps {
  product: ProductRow;
  variants: ProductVariantRow[];
  categories: CategoryRow[];
  extras: ProductExtraWithProduct[];
  /** Lowest 30-day price map for Omnibus directive (FE-006) */
  lowestPriceMap?: LowestPriceMap;
}

export function ProductDetailClient({
  product,
  variants,
  extras,
  lowestPriceMap,
}: ProductDetailClientProps) {
  // Default to first available variant
  const defaultVariantId = useMemo(() => {
    const inStock = variants.find((v) => v.stock_quantity > 0 && v.is_active);
    return inStock?.id ?? variants[0]?.id ?? null;
  }, [variants]);

  const [selectedVariantId, setSelectedVariantId] = useState<string | null>(defaultVariantId);

  const selectedVariant = useMemo(
    () => variants.find((v) => v.id === selectedVariantId) ?? null,
    [variants, selectedVariantId],
  );

  const currentPrice = selectedVariant?.price_override ?? product.base_price;
  const currentStock = selectedVariant?.stock_quantity ?? 0;

  // Resolve the lowest 30-day price for the currently selected variant (FE-006 Omnibus)
  const currentLowest30DayPrice = useMemo(() => {
    if (!lowestPriceMap) return null;
    const result = resolveLowest30DayPrice(lowestPriceMap, selectedVariantId);
    return result?.lowestPrice ?? null;
  }, [lowestPriceMap, selectedVariantId]);

  // ── Extras state ───────────────────────────────────────────────
  // Filter out inactive extra products; determine which are available
  const availableExtras = useMemo(
    () =>
      extras.filter((e) => {
        // Extra product must be active
        if (!e.extra_product_is_active) return false;
        // If extra has a specific variant, that variant must be active and in stock
        if (e.extra_variant_is_active === false) return false;
        return true;
      }),
    [extras],
  );

  // Initialize checked state from is_default_checked
  const [checkedExtraIds, setCheckedExtraIds] = useState<Set<string>>(() => {
    const defaults = new Set<string>();
    for (const extra of extras) {
      if (extra.is_default_checked && extra.extra_product_is_active) {
        // If variant is specified, only default-check if variant is active and in stock
        if (extra.extra_variant_is_active === false) continue;
        if (extra.extra_variant_stock !== null && extra.extra_variant_stock === 0) continue;
        defaults.add(extra.id);
      }
    }
    return defaults;
  });

  function toggleExtra(extraId: string) {
    setCheckedExtraIds((prev) => {
      const next = new Set(prev);
      if (next.has(extraId)) {
        next.delete(extraId);
      } else {
        next.add(extraId);
      }
      return next;
    });
  }

  /** Whether an extra is out of stock (variant stock = 0) */
  function isExtraOutOfStock(extra: ProductExtraWithProduct): boolean {
    if (extra.extra_variant_stock !== null && extra.extra_variant_stock === 0) {
      return true;
    }
    return false;
  }

  return (
    <div className="grid grid-cols-1 gap-12 lg:grid-cols-2 lg:gap-16">
      {/* ── Left: Gallery ────────────────────────────────── */}
      <div>
        <Gallery mainImage={product.main_image_url} images={product.image_urls} />
      </div>

      {/* ── Right: Product info ──────────────────────────── */}
      <div className="flex flex-col">
        <h1 className="text-foreground text-3xl font-semibold tracking-[-0.03em] lg:text-4xl">
          {product.title}
        </h1>

        <div className="mt-4">
          <PriceDisplay
            price={currentPrice}
            compareAtPrice={product.compare_at_price}
            size="lg"
            lowest30DayPrice={currentLowest30DayPrice}
          />
        </div>

        <div className="mt-6">
          <StockBadge quantity={currentStock} />
        </div>

        {/* Variants */}
        {variants.length > 0 && (
          <div className="mt-8">
            <VariantSelector
              variants={variants}
              selectedVariantId={selectedVariantId}
              onSelect={setSelectedVariantId}
            />
          </div>
        )}

        {/* ── Extras checkboxes ─────────────────────────── */}
        {availableExtras.length > 0 && (
          <div className="mt-8 space-y-3">
            <p className="text-muted-foreground text-xs font-medium tracking-[0.15em] uppercase">
              Kiegészítők
            </p>
            {availableExtras.map((extra) => {
              const outOfStock = isExtraOutOfStock(extra);
              const price = extra.extra_variant_price ?? extra.extra_product_price;

              return (
                <label
                  key={extra.id}
                  className={`flex cursor-pointer items-center gap-3 rounded-lg border px-4 py-3 transition-all duration-300 ${
                    checkedExtraIds.has(extra.id)
                      ? "border-foreground/20 bg-foreground/[0.03]"
                      : "border-border/40 hover:border-border/70"
                  } ${outOfStock ? "pointer-events-none opacity-50" : ""}`}
                >
                  <Checkbox
                    checked={checkedExtraIds.has(extra.id)}
                    onCheckedChange={() => toggleExtra(extra.id)}
                    disabled={outOfStock}
                  />
                  <span className="text-foreground flex-1 text-sm">{extra.label}</span>
                  <span className="text-foreground/70 text-sm font-medium tabular-nums">
                    {outOfStock ? "Elfogyott" : `+${formatHUF(price)}`}
                  </span>
                </label>
              );
            })}
          </div>
        )}

        {/* Add to cart */}
        <div className="mt-10">
          <AddToCartButton
            product={product}
            variant={selectedVariant}
            extras={availableExtras}
            checkedExtraIds={checkedExtraIds}
          />
        </div>

        {/* Description */}
        {product.description && (
          <div className="border-border/40 mt-12 border-t pt-8">
            <h2 className="text-muted-foreground mb-4 text-xs font-medium tracking-[0.15em] uppercase">
              Leírás
            </h2>
            <div className="prose prose-sm prose-neutral text-muted-foreground max-w-none">
              <p className="leading-relaxed whitespace-pre-line">{product.description}</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
