/* ------------------------------------------------------------------ */
/*  Shipping fee calculation                                           */
/* ------------------------------------------------------------------ */

import { siteConfig } from "@/lib/config/site.config";

// ── Carrier data ───────────────────────────────────────────────────

export interface Carrier {
  id: string;
  name: string;
  fee: number;
}

const HOME_CARRIERS: Carrier[] = [
  { id: "gls", name: "GLS", fee: 1490 },
  { id: "mpl", name: "MPL", fee: 1290 },
  { id: "express_one", name: "Express One", fee: 1790 },
];

const PICKUP_CARRIERS: Carrier[] = [
  { id: "foxpost", name: "Foxpost", fee: 890 },
  { id: "gls_automata", name: "GLS Automata", fee: 790 },
  { id: "packeta", name: "Packeta", fee: 690 },
  { id: "mpl_automata", name: "MPL Automata", fee: 790 },
  { id: "easybox", name: "Easybox", fee: 890 },
];

// ── Fee calculation ────────────────────────────────────────────────

/**
 * Calculate shipping fee based on method and subtotal.
 * Returns 0 if subtotal reaches or exceeds the free shipping threshold.
 * Otherwise returns the configured baseFee.
 */
export function calculateShippingFee(
  method: "home" | "pickup",
  subtotal: number,
): number {
  const { rules } = siteConfig.shipping;

  // Free shipping threshold applies to both methods
  if (rules.freeOver > 0 && subtotal >= rules.freeOver) {
    return 0;
  }

  // Use the minimum carrier fee for the given method as fallback,
  // but prefer the configured baseFee
  if (method === "pickup") {
    // Pickup points are typically cheaper — use baseFee as the floor
    const minPickupFee = Math.min(...PICKUP_CARRIERS.map((c) => c.fee));
    return Math.min(rules.baseFee, minPickupFee);
  }

  return rules.baseFee;
}

// ── Available carriers ─────────────────────────────────────────────

/**
 * Get available carriers for a shipping method.
 * Filters by carriers enabled in the site configuration.
 */
export function getAvailableCarriers(method: "home" | "pickup"): Carrier[] {
  if (method === "home") {
    const enabledIds = new Set<string>(siteConfig.shipping.homeDeliveryCarriers);
    return HOME_CARRIERS.filter((c) => enabledIds.has(c.id));
  }

  const enabledIds = new Set<string>(siteConfig.shipping.pickupPointCarriers);
  return PICKUP_CARRIERS.filter((c) => enabledIds.has(c.id));
}

/**
 * Get the fee for a specific carrier by id.
 * Returns null if the carrier is not found or not enabled.
 */
export function getCarrierFee(
  method: "home" | "pickup",
  carrierId: string,
  subtotal: number,
): number | null {
  const { rules } = siteConfig.shipping;

  // Free shipping threshold
  if (rules.freeOver > 0 && subtotal >= rules.freeOver) {
    return 0;
  }

  const carriers = getAvailableCarriers(method);
  const carrier = carriers.find((c) => c.id === carrierId);
  return carrier?.fee ?? null;
}
