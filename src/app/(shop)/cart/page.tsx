"use client";

/* ------------------------------------------------------------------ */
/*  Cart page                                                          */
/* ------------------------------------------------------------------ */

import { useCallback, useMemo } from "react";
import Link from "next/link";
import { ShoppingBag, ArrowLeft, ArrowRight } from "lucide-react";
import { useCartStore } from "@/lib/store/cart";
import { applyCoupon } from "@/lib/actions/cart";
import { siteConfig } from "@/lib/config/site.config";
import { formatHUF } from "@/lib/utils/format";
import { calculateShippingFee } from "@/lib/utils/shipping";
import { Breadcrumbs } from "@/components/shared/breadcrumbs";
import { CartLineItem } from "@/components/cart/cart-line-item";
import { CouponInput } from "@/components/cart/coupon-input";
import { OrderSummary } from "@/components/cart/order-summary";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";

export default function CartPage() {
  const items = useCartStore((s) => s.items);
  const subtotal = useCartStore((s) => s.subtotal());
  const couponCode = useCartStore((s) => s.couponCode);
  const couponDiscount = useCartStore((s) => s.couponDiscount);
  const setCoupon = useCartStore((s) => s.setCoupon);
  const removeCoupon = useCartStore((s) => s.removeCoupon);

  // Compute total cart weight from items
  const totalWeightGrams = useMemo(
    () => items.reduce((sum, item) => sum + item.weightGrams * item.quantity, 0),
    [items],
  );

  const estimatedShipping = calculateShippingFee("home", subtotal, totalWeightGrams);
  const total = Math.max(0, subtotal + estimatedShipping - couponDiscount);

  const handleApplyCoupon = useCallback(
    async (code: string) => {
      const result = await applyCoupon(code, subtotal);
      if (result.success && result.data) {
        setCoupon(result.data.code, result.data.discount);
        return { success: true, discount: result.data.discount };
      }
      return { success: false, error: result.error };
    },
    [subtotal, setCoupon],
  );

  // ── Empty cart ────────────────────────────────────────────────────

  if (items.length === 0) {
    return (
      <div className="mx-auto max-w-7xl px-6 py-12 lg:px-8">
        <Breadcrumbs items={[{ label: "Kosár" }]} />

        <div className="mt-20 flex flex-col items-center justify-center text-center">
          <div className="flex size-20 items-center justify-center rounded-full bg-muted">
            <ShoppingBag className="size-8 text-muted-foreground" />
          </div>
          <h1 className="mt-6 text-2xl font-semibold tracking-[-0.02em]">A kosarad üres</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Még nem adtál hozzá termékeket a kosaradhoz.
          </p>
          <Button className="mt-8" size="lg" render={<Link href="/products" />}>
            Termékek böngészése
            <ArrowRight className="ml-1.5 size-4" />
          </Button>
        </div>
      </div>
    );
  }

  // ── Cart with items ──────────────────────────────────────────────

  return (
    <div className="mx-auto max-w-7xl px-6 py-12 lg:px-8">
      <Breadcrumbs items={[{ label: "Kosár" }]} />

      <h1 className="mt-8 text-3xl font-semibold tracking-[-0.03em]">Kosár</h1>
      <p className="mt-1 text-sm text-muted-foreground">{items.length} tétel a kosárban</p>

      <div className="mt-10 grid gap-12 lg:grid-cols-[1fr_380px]">
        {/* ── Left: Cart items ─────────────────────────── */}
        <div>
          <div className="divide-y divide-border">
            {items.map((item) => (
              <CartLineItem key={`${item.productId}-${item.variantId ?? "none"}`} item={item} />
            ))}
          </div>

          {/* ── Coupon input ──────────────────────────── */}
          {siteConfig.features.enableCoupons && (
            <div className="mt-8">
              <Separator className="mb-6" />
              <h2 className="mb-3 text-sm font-medium text-foreground">Kuponkód</h2>
              {couponCode ? (
                <div className="flex items-center justify-between rounded-lg border border-emerald-200 bg-emerald-50/50 px-4 py-3 dark:border-emerald-800 dark:bg-emerald-950/30">
                  <div className="text-sm">
                    <span className="font-medium text-emerald-700 dark:text-emerald-400">
                      {couponCode}
                    </span>
                    <span className="ml-2 text-muted-foreground">
                      &mdash; {formatHUF(couponDiscount)} kedvezmény
                    </span>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={removeCoupon}
                    className="text-muted-foreground hover:text-foreground"
                  >
                    Törlés
                  </Button>
                </div>
              ) : (
                <CouponInput onApply={handleApplyCoupon} />
              )}
            </div>
          )}

          {/* ── Continue shopping link ────────────────── */}
          <div className="mt-8">
            <Link
              href="/products"
              className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors duration-300 hover:text-foreground"
            >
              <ArrowLeft className="size-3.5" />
              Vissza a vásárláshoz
            </Link>
          </div>
        </div>

        {/* ── Right: Summary ───────────────────────────── */}
        <div className="lg:sticky lg:top-8 lg:self-start">
          <OrderSummary
            subtotal={subtotal}
            shippingFee={estimatedShipping}
            discount={couponDiscount}
            total={total}
          />

          <Button className="mt-4 w-full" size="lg" render={<Link href="/checkout" />}>
            Tovább a pénztárhoz
            <ArrowRight className="ml-1.5 size-4" />
          </Button>

          <p className="mt-3 text-center text-xs text-muted-foreground">
            {totalWeightGrams > 0 && (
              <span className="block mb-1">
                Becsült súly: {(totalWeightGrams / 1000).toFixed(1)} kg
              </span>
            )}
            A szállítási költség a pénztárnál kerül véglegesítésre.
          </p>
        </div>
      </div>
    </div>
  );
}
