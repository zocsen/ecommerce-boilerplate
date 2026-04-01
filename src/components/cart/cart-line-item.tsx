"use client";

import { useCallback } from "react";
import Image from "next/image";
import Link from "next/link";
import { Minus, Plus, X } from "lucide-react";
import type { CartItem } from "@/lib/types";
import { useCartStore } from "@/lib/store/cart";
import { formatHUF } from "@/lib/utils/format";
import { Button } from "@/components/ui/button";

/* ------------------------------------------------------------------ */
/*  Cart line item — image, title, variant, qty controls, remove       */
/* ------------------------------------------------------------------ */

interface CartLineItemProps {
  item: CartItem;
}

export function CartLineItem({ item }: CartLineItemProps) {
  const updateQuantity = useCartStore((s) => s.updateQuantity);
  const removeItem = useCartStore((s) => s.removeItem);

  const handleDecrement = useCallback(() => {
    updateQuantity(item.productId, item.variantId, item.quantity - 1);
  }, [updateQuantity, item.productId, item.variantId, item.quantity]);

  const handleIncrement = useCallback(() => {
    if (item.quantity < item.stock) {
      updateQuantity(item.productId, item.variantId, item.quantity + 1);
    }
  }, [updateQuantity, item.productId, item.variantId, item.quantity, item.stock]);

  const handleRemove = useCallback(() => {
    removeItem(item.productId, item.variantId);
  }, [removeItem, item.productId, item.variantId]);

  const lineTotal = item.price * item.quantity;

  return (
    <div className="flex gap-4 py-5">
      {/* ── Image ──────────────────────────────────────── */}
      <Link
        href={`/products/${item.slug}`}
        className="relative size-20 flex-shrink-0 overflow-hidden rounded-md bg-muted"
      >
        {item.image ? (
          <Image
            src={item.image}
            alt={item.title}
            fill
            sizes="80px"
            className="object-cover"
            unoptimized={item.image.startsWith("http://")}
          />
        ) : (
          <div className="flex h-full items-center justify-center">
            <span className="text-lg font-light text-muted-foreground/40">
              {item.title.charAt(0).toUpperCase()}
            </span>
          </div>
        )}
      </Link>

      {/* ── Details ────────────────────────────────────── */}
      <div className="flex min-w-0 flex-1 flex-col justify-between">
        <div>
          <div className="flex items-start justify-between gap-2">
            <Link
              href={`/products/${item.slug}`}
              className="text-sm font-medium leading-snug text-foreground transition-colors duration-300 hover:text-foreground/70"
            >
              {item.title}
            </Link>
            <Button
              variant="ghost"
              size="icon-xs"
              onClick={handleRemove}
              className="flex-shrink-0 text-muted-foreground hover:text-foreground"
            >
              <X className="size-3.5" />
              <span className="sr-only">Eltávolítás</span>
            </Button>
          </div>

          {item.variantLabel && (
            <p className="mt-0.5 text-xs text-muted-foreground">{item.variantLabel}</p>
          )}
        </div>

        <div className="mt-2 flex items-center justify-between">
          {/* ── Quantity controls ─────────────────────── */}
          <div className="flex items-center gap-0.5">
            <Button
              variant="outline"
              size="icon-xs"
              onClick={handleDecrement}
              disabled={item.quantity <= 1}
            >
              <Minus className="size-3" />
              <span className="sr-only">Csökkentés</span>
            </Button>

            <span className="min-w-[2rem] text-center text-sm font-medium tabular-nums">
              {item.quantity}
            </span>

            <Button
              variant="outline"
              size="icon-xs"
              onClick={handleIncrement}
              disabled={item.quantity >= item.stock}
            >
              <Plus className="size-3" />
              <span className="sr-only">Növelés</span>
            </Button>
          </div>

          {/* ── Line total ───────────────────────────── */}
          <div className="text-right">
            <p className="text-sm font-medium tabular-nums">{formatHUF(lineTotal)}</p>
            {item.quantity > 1 && (
              <p className="text-xs text-muted-foreground tabular-nums">
                {formatHUF(item.price)} / db
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
