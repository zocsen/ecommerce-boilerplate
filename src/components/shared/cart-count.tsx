"use client";

import { useCartStore } from "@/lib/store/cart";

/**
 * Client-only badge that displays the current cart item count.
 * Renders nothing when the cart is empty to keep the header clean.
 */
export function CartCount() {
  const count = useCartStore((s) => s.itemCount());

  if (count === 0) return null;

  return (
    <span className="absolute -right-1 -top-1 flex size-[18px] items-center justify-center rounded-full bg-foreground text-[10px] font-semibold leading-none text-background">
      {count > 99 ? "99+" : count}
    </span>
  );
}
