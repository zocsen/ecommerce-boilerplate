"use client";

import { useCallback } from "react";
import { ShoppingBag } from "lucide-react";
import { toast } from "sonner";
import type { ProductRow, ProductVariantRow } from "@/lib/types/database";
import { useCartStore } from "@/lib/store/cart";
import { Button } from "@/components/ui/button";
import { formatHUF } from "@/lib/utils/format";

/* ------------------------------------------------------------------ */
/*  Add to cart button — resolves price from variant or base product   */
/* ------------------------------------------------------------------ */

interface AddToCartButtonProps {
  product: ProductRow;
  variant: ProductVariantRow | null;
  disabled?: boolean;
}

export function AddToCartButton({
  product,
  variant,
  disabled = false,
}: AddToCartButtonProps) {
  const addItem = useCartStore((s) => s.addItem);

  const isOutOfStock = variant ? variant.stock_quantity === 0 : false;
  const isDisabled = disabled || isOutOfStock;

  const handleAdd = useCallback(() => {
    const price = variant?.price_override ?? product.base_price;
    const stock = variant?.stock_quantity ?? 0;

    const variantLabel = buildVariantLabel(variant);

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
    });

    toast.success("Hozzáadva a kosárhoz", {
      description: `${product.title}${variantLabel ? ` — ${variantLabel}` : ""} (${formatHUF(price)})`,
    });
  }, [addItem, product, variant]);

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
  );
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function buildVariantLabel(variant: ProductVariantRow | null): string {
  if (!variant) return "";

  const parts: string[] = [];

  if (variant.option1_value) {
    parts.push(variant.option1_value);
  }
  if (variant.option2_value) {
    parts.push(variant.option2_value);
  }

  return parts.join(" / ");
}
