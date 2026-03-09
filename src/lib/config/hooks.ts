/* ------------------------------------------------------------------ */
/*  Client-override hooks for per-project customisation                */
/*                                                                     */
/*  Default implementations are identity / no-op so the boilerplate    */
/*  works out of the box. Override individual hooks in your project     */
/*  entry point (e.g. instrumentation.ts) via `overrideHooks()`.       */
/* ------------------------------------------------------------------ */

import type { OrderRow, ProductRow, ProductVariantRow } from "@/lib/types/database";

// ── Hook signatures ────────────────────────────────────────────────

/** Minimal order draft shape passed before payment is initiated. */
export interface OrderDraft {
  email: string;
  phone: string;
  shippingMethod: string;
  shippingAddress: Record<string, unknown>;
  billingAddress: Record<string, unknown>;
  carrier: string | null;
  pickupPointProvider: string | null;
  pickupPointId: string | null;
  pickupPointLabel: string | null;
  couponCode: string | null;
  notes: string | null;
  items: Array<{
    productId: string;
    variantId: string | null;
    quantity: number;
    unitPrice: number;
  }>;
  subtotalAmount: number;
  shippingFee: number;
  discountTotal: number;
  totalAmount: number;
}

/** Minimal user context passed to pricing hook. */
export interface PricingUser {
  id: string;
  role: string;
  tags?: string[];
}

export interface SiteHooks {
  /**
   * Called right before the order record is created.
   * Return the (potentially mutated) draft.
   * Default: identity — returns the draft unchanged.
   */
  preCheckoutHook: (orderDraft: OrderDraft) => OrderDraft | Promise<OrderDraft>;

  /**
   * Called after the order has been marked as paid.
   * Use for side-effects (analytics, webhooks, loyalty points, etc.).
   * Default: no-op.
   */
  postPaidHook: (order: OrderRow) => void | Promise<void>;

  /**
   * Override pricing for a specific product + variant + user combination.
   * Return a number (HUF integer) to override, or `null` to use the
   * default base_price / price_override logic.
   * Default: returns `null` (use default pricing).
   */
  pricingHook: (
    product: ProductRow,
    variant: ProductVariantRow | null,
    user: PricingUser | null,
  ) => number | null | Promise<number | null>;
}

// ── Default (no-op) implementations ────────────────────────────────

const defaultHooks: SiteHooks = {
  preCheckoutHook: (orderDraft: OrderDraft) => orderDraft,
  postPaidHook: () => {},
  pricingHook: () => null,
};

// ── Mutable hooks object ───────────────────────────────────────────

let hooks: SiteHooks = { ...defaultHooks };

/**
 * Read the current hooks. Used throughout the application.
 */
export function getHooks(): Readonly<SiteHooks> {
  return hooks;
}

/**
 * Merge one or more hook overrides into the active hooks object.
 *
 * @example
 * ```ts
 * import { overrideHooks } from "@/lib/config/hooks";
 *
 * overrideHooks({
 *   pricingHook: (product, variant, user) => {
 *     if (user?.role === "wholesale") {
 *       return Math.round((variant?.price_override ?? product.base_price) * 0.8);
 *     }
 *     return null;
 *   },
 * });
 * ```
 */
export function overrideHooks(overrides: Partial<SiteHooks>): void {
  hooks = { ...hooks, ...overrides };
}

/**
 * Reset all hooks back to their defaults (useful in tests).
 */
export function resetHooks(): void {
  hooks = { ...defaultHooks };
}
