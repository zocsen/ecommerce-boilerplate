"use client"

import { useEffect, useState } from "react"

import { useCartStore } from "@/lib/store/cart"

/**
 * Client-only badge that displays the current cart item count.
 * Renders nothing when the cart is empty to keep the header clean.
 *
 * Uses a `mounted` guard to avoid hydration mismatches caused by
 * Zustand's `persist` middleware: on the server the cart is always
 * empty (count 0 → null), but after hydration localStorage may
 * contain items, switching the output to a visible badge.  By
 * deferring the real count to a post-mount effect the first client
 * render matches the server render exactly.
 */
export function CartCount() {
  const [mounted, setMounted] = useState(false)
  const count = useCartStore((s) => s.itemCount())

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted || count === 0) return null

  return (
    <span className="absolute -right-1 -top-1 flex size-[18px] items-center justify-center rounded-full bg-foreground text-[10px] font-semibold leading-none text-background">
      {count > 99 ? "99+" : count}
    </span>
  )
}
