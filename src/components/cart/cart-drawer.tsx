"use client"

import { useEffect, useRef, useCallback } from "react"
import { ShoppingBag, ShoppingCart, X, Check } from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"

import { useCartStore } from "@/lib/store/cart"
import { useUIStore } from "@/lib/store/ui"
import { CartLineItem } from "@/components/cart/cart-line-item"
import { CartCount } from "@/components/shared/cart-count"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { Sheet, SheetTrigger, SheetContent, SheetTitle, SheetClose } from "@/components/ui/sheet"
import { formatHUF } from "@/lib/utils/format"
import { siteConfig } from "@/lib/config/site.config"
import { cn } from "@/lib/utils"

/* ------------------------------------------------------------------ */
/*  CartDrawer — slide-out cart panel                                  */
/* ------------------------------------------------------------------ */

const FREE_SHIPPING_THRESHOLD = siteConfig.shipping.rules.freeOver

export function CartDrawer() {
  const router = useRouter()
  const cartDrawerOpen = useUIStore((s) => s.cartDrawerOpen)
  const items = useCartStore((s) => s.items)
  const subtotal = useCartStore((s) => s.subtotal())
  const itemCount = useCartStore((s) => s.itemCount())

  const autoCloseTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const isAutoOpenedRef = useRef(false)

  /* ── Auto-open when items are added to the cart ──────────────────── */
  useEffect(() => {
    const unsub = useCartStore.subscribe((state, prevState) => {
      if (state.items.length > prevState.items.length) {
        isAutoOpenedRef.current = true
        useUIStore.getState().openCartDrawer()

        if (autoCloseTimerRef.current) clearTimeout(autoCloseTimerRef.current)
        autoCloseTimerRef.current = setTimeout(() => {
          useUIStore.getState().closeCartDrawer()
          isAutoOpenedRef.current = false
        }, 3000)
      }
    })

    return () => {
      unsub()
      if (autoCloseTimerRef.current) clearTimeout(autoCloseTimerRef.current)
    }
  }, [])

  /* ── Handlers ────────────────────────────────────────────────────── */

  // Clear auto-close timer on any drawer state change initiated by user
  const handleOpenChange = useCallback((open: boolean) => {
    if (autoCloseTimerRef.current) {
      clearTimeout(autoCloseTimerRef.current)
      autoCloseTimerRef.current = null
    }
    isAutoOpenedRef.current = false

    if (open) {
      useUIStore.getState().openCartDrawer()
    } else {
      useUIStore.getState().closeCartDrawer()
    }
  }, [])

  // Cancel auto-close when user hovers over the drawer
  const handleMouseEnter = useCallback(() => {
    if (isAutoOpenedRef.current && autoCloseTimerRef.current) {
      clearTimeout(autoCloseTimerRef.current)
      autoCloseTimerRef.current = null
      isAutoOpenedRef.current = false
    }
  }, [])

  const handleCheckout = useCallback(() => {
    if (autoCloseTimerRef.current) {
      clearTimeout(autoCloseTimerRef.current)
      autoCloseTimerRef.current = null
    }
    useUIStore.getState().closeCartDrawer()
    router.push("/checkout")
  }, [router])

  const handleBrowse = useCallback(() => {
    useUIStore.getState().closeCartDrawer()
    router.push("/products")
  }, [router])

  /* ── Free shipping calculations ──────────────────────────────────── */
  const remaining = Math.max(0, FREE_SHIPPING_THRESHOLD - subtotal)
  const progress = Math.min(100, (subtotal / FREE_SHIPPING_THRESHOLD) * 100)
  const isFreeShipping = remaining === 0

  /* ── Render ──────────────────────────────────────────────────────── */
  return (
    <Sheet open={cartDrawerOpen} onOpenChange={handleOpenChange}>
      {/* ── Trigger: cart icon button in header ────────────────────── */}
      <SheetTrigger
        render={
          <Button variant="ghost" size="icon" className="relative">
            <ShoppingBag className="size-[18px]" />
            <CartCount />
            <span className="sr-only">Kosár</span>
          </Button>
        }
      />

      {/* ── Drawer content ─────────────────────────────────────────── */}
      <SheetContent
        side="right"
        showCloseButton={false}
        className="flex w-full flex-col gap-0 p-0 sm:w-[420px]"
        onMouseEnter={handleMouseEnter}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b px-5 py-4">
          <SheetTitle className="text-base font-semibold tracking-tight">
            Kosár
            {itemCount > 0 && (
              <span className="ml-1.5 text-sm font-normal text-muted-foreground">
                ({itemCount} termék)
              </span>
            )}
          </SheetTitle>
          <SheetClose
            render={
              <Button
                variant="ghost"
                size="icon-sm"
                className="text-muted-foreground hover:text-foreground"
              />
            }
          >
            <X className="size-4" />
            <span className="sr-only">Bezárás</span>
          </SheetClose>
        </div>

        {items.length === 0 ? (
          /* ── Empty state ─────────────────────────────────────────── */
          <div className="flex flex-1 flex-col items-center justify-center gap-5 p-8 text-center">
            <div className="flex size-16 items-center justify-center rounded-full bg-muted">
              <ShoppingCart className="size-7 text-muted-foreground/60" />
            </div>
            <div className="space-y-1">
              <p className="font-medium tracking-tight">A kosarad üres</p>
              <p className="text-sm text-muted-foreground">
                Böngéssz a termékek között és adj valamit a kosárba!
              </p>
            </div>
            <Button size="sm" onClick={handleBrowse}>
              Vásárlás
            </Button>
          </div>
        ) : (
          <>
            {/* ── Items list (scrollable) ───────────────────────────── */}
            <div className="flex-1 overflow-y-auto">
              <ul className="divide-y divide-border px-5">
                {items.map((item) => (
                  <li key={`${item.productId}-${item.variantId ?? "base"}`}>
                    <CartLineItem item={item} />
                  </li>
                ))}
              </ul>
            </div>

            {/* ── Footer (sticky at bottom) ─────────────────────────── */}
            <div className="flex flex-col gap-3 border-t px-5 py-4">
              {/* Free shipping progress indicator */}
              <div className="space-y-1.5">
                <p className="text-xs">
                  {isFreeShipping ? (
                    <span className="flex items-center gap-1.5 font-medium text-green-600 dark:text-green-500">
                      <Check className="size-3.5" />
                      Ingyenes szállítás!
                    </span>
                  ) : (
                    <span className="text-muted-foreground">
                      Még{" "}
                      <span className="font-medium text-foreground">{formatHUF(remaining)}</span> és
                      ingyenes a szállítás!
                    </span>
                  )}
                </p>
                <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                  <div
                    className={cn(
                      "h-full rounded-full transition-all duration-500 ease-out",
                      isFreeShipping ? "bg-green-500" : "bg-foreground/60",
                    )}
                    style={{ width: `${progress}%` }}
                  />
                </div>
              </div>

              <Separator />

              {/* Subtotal row */}
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Részösszeg</span>
                <span className="text-base font-semibold tabular-nums">{formatHUF(subtotal)}</span>
              </div>

              {/* Checkout CTA */}
              <Button size="lg" className="w-full" onClick={handleCheckout}>
                Pénztárhoz
              </Button>

              {/* View full cart */}
              <SheetClose
                render={
                  <Link
                    href="/cart"
                    className="text-center text-sm text-muted-foreground underline-offset-4 transition-colors duration-300 hover:text-foreground hover:underline"
                  />
                }
              >
                Kosár megtekintése
              </SheetClose>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  )
}
