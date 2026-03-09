"use client"

import { useState, useMemo } from "react"
import type { ProductRow, ProductVariantRow, CategoryRow } from "@/lib/types/database"
import { Gallery } from "@/components/product/gallery"
import { PriceDisplay } from "@/components/product/price-display"
import { VariantSelector } from "@/components/product/variant-selector"
import { StockBadge } from "@/components/product/stock-badge"
import { AddToCartButton } from "@/components/product/add-to-cart-button"

/* ------------------------------------------------------------------ */
/*  Product detail client wrapper — holds selected variant state       */
/* ------------------------------------------------------------------ */

interface ProductDetailClientProps {
  product: ProductRow
  variants: ProductVariantRow[]
  categories: CategoryRow[]
}

export function ProductDetailClient({
  product,
  variants,
}: ProductDetailClientProps) {
  // Default to first available variant
  const defaultVariantId = useMemo(() => {
    const inStock = variants.find(
      (v) => v.stock_quantity > 0 && v.is_active,
    )
    return inStock?.id ?? variants[0]?.id ?? null
  }, [variants])

  const [selectedVariantId, setSelectedVariantId] = useState<string | null>(
    defaultVariantId,
  )

  const selectedVariant = useMemo(
    () => variants.find((v) => v.id === selectedVariantId) ?? null,
    [variants, selectedVariantId],
  )

  const currentPrice = selectedVariant?.price_override ?? product.base_price
  const currentStock = selectedVariant?.stock_quantity ?? 0

  return (
    <div className="grid grid-cols-1 gap-12 lg:grid-cols-2 lg:gap-16">
      {/* ── Left: Gallery ────────────────────────────────── */}
      <div>
        <Gallery
          mainImage={product.main_image_url}
          images={product.image_urls}
        />
      </div>

      {/* ── Right: Product info ──────────────────────────── */}
      <div className="flex flex-col">
        <h1 className="text-3xl font-semibold tracking-[-0.03em] text-foreground lg:text-4xl">
          {product.title}
        </h1>

        <div className="mt-4">
          <PriceDisplay
            price={currentPrice}
            compareAtPrice={product.compare_at_price}
            size="lg"
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

        {/* Add to cart */}
        <div className="mt-10">
          <AddToCartButton
            product={product}
            variant={selectedVariant}
          />
        </div>

        {/* Description */}
        {product.description && (
          <div className="mt-12 border-t border-border/40 pt-8">
            <h2 className="mb-4 text-xs font-medium uppercase tracking-[0.15em] text-muted-foreground">
              Leírás
            </h2>
            <div className="prose prose-sm prose-neutral max-w-none text-muted-foreground">
              <p className="whitespace-pre-line leading-relaxed">
                {product.description}
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
