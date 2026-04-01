"use client"

import { useCallback } from "react"
import { ShoppingBag } from "lucide-react"
import type { ProductRow, ProductVariantRow, ProductExtraWithProduct } from "@/lib/types/database"
import { useCartStore } from "@/lib/store/cart"
import { Button } from "@/components/ui/button"
import { siteConfig } from "@/lib/config/site.config"

/* ------------------------------------------------------------------ */
/*  Add to cart button — resolves price from variant or base product   */
/* ------------------------------------------------------------------ */

interface AddToCartButtonProps {
  product: ProductRow
  variant: ProductVariantRow | null
  extras?: ProductExtraWithProduct[]
  checkedExtraIds?: Set<string>
  disabled?: boolean
}

export function AddToCartButton({
  product,
  variant,
  extras = [],
  checkedExtraIds,
  disabled = false,
}: AddToCartButtonProps) {
  const addItem = useCartStore((s) => s.addItem)

  const isOutOfStock = variant ? variant.stock_quantity === 0 : false
  const isDisabled = disabled || isOutOfStock

  const handleAdd = useCallback(() => {
    const price = variant?.price_override ?? product.base_price
    const stock = variant?.stock_quantity ?? 0
    const defaultWeight = siteConfig.shipping.rules.defaultProductWeightGrams
    const weightGrams = variant
      ? (variant.weight_grams ?? product.weight_grams ?? defaultWeight)
      : (product.weight_grams ?? defaultWeight)

    const variantLabel = buildVariantLabel(variant)

    // Add main product
    addItem({
      productId: product.id,
      variantId: variant?.id ?? null,
      title: product.title,
      variantLabel,
      price,
      quantity: 1,
      image: product.main_image_url,
      slug: product.slug,
      stock,
      weightGrams,
    })

    // Add checked extras as separate cart items
    if (checkedExtraIds && checkedExtraIds.size > 0) {
      for (const extra of extras) {
        if (!checkedExtraIds.has(extra.id)) continue

        const extraPrice = extra.extra_variant_price ?? extra.extra_product_price
        const extraStock = extra.extra_variant_stock ?? 9999

        addItem({
          productId: extra.extra_product_id,
          variantId: extra.extra_variant_id,
          title: extra.extra_product_title,
          variantLabel: extra.label,
          price: extraPrice,
          quantity: 1,
          image: extra.extra_product_image,
          slug: extra.extra_product_slug,
          stock: extraStock,
          weightGrams: defaultWeight,
        })
      }
    }
  }, [addItem, product, variant, extras, checkedExtraIds])

  return (
    <Button
      size="lg"
      disabled={isDisabled}
      onClick={handleAdd}
      className="h-12 w-full gap-2.5 rounded-lg text-sm font-semibold uppercase tracking-wider transition-all duration-500 ease-out"
    >
      {isOutOfStock ? (
        "Elfogyott"
      ) : (
        <>
          <ShoppingBag className="size-4" />
          Kosárba
        </>
      )}
    </Button>
  )
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function buildVariantLabel(variant: ProductVariantRow | null): string {
  if (!variant) return ""

  const parts: string[] = []

  if (variant.option1_value) {
    parts.push(variant.option1_value)
  }
  if (variant.option2_value) {
    parts.push(variant.option2_value)
  }

  return parts.join(" / ")
}
