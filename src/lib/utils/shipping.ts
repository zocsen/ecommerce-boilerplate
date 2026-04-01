/* ------------------------------------------------------------------ */
/*  Shipping fee calculation — with weight-based tier support           */
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

// ── Weight tier lookup ─────────────────────────────────────────────

/**
 * Look up the shipping fee for a given total weight (in grams) using
 * the configured weight tiers.
 *
 * - Tiers are sorted ascending by `maxWeightKg`.
 * - Returns the fee of the first tier whose `maxWeightKg` >= totalWeightKg.
 * - If weight exceeds all tiers, returns the highest tier's fee.
 * - If no tiers are configured, returns `null` (caller uses baseFee).
 */
export function getWeightTierFee(totalWeightGrams: number): number | null {
  const { weightTiers } = siteConfig.shipping.rules;

  if (weightTiers.length === 0) return null;

  const totalKg = totalWeightGrams / 1000;

  // Tiers are assumed sorted ascending; sort defensively
  const sorted = [...weightTiers].sort((a, b) => a.maxWeightKg - b.maxWeightKg);

  for (const tier of sorted) {
    if (totalKg <= tier.maxWeightKg) {
      return tier.fee;
    }
  }

  // Exceeds all tiers — use highest tier fee
  return sorted[sorted.length - 1]!.fee;
}

// ── Fee calculation ────────────────────────────────────────────────

/**
 * Calculate shipping fee based on method, subtotal, and optional total weight.
 *
 * Priority:
 * 1. Free shipping if subtotal >= freeOver threshold
 * 2. Weight-based tier fee (if weight provided and tiers configured)
 * 3. Configured baseFee (fallback)
 *
 * For pickup method, fee is capped at the minimum pickup carrier fee.
 */
export function calculateShippingFee(
  method: "home" | "pickup",
  subtotal: number,
  totalWeightGrams?: number,
): number {
  const { rules } = siteConfig.shipping;

  // Free shipping threshold applies to both methods
  if (rules.freeOver > 0 && subtotal >= rules.freeOver) {
    return 0;
  }

  // Determine base fee — weight tier or baseFee
  let fee: number;

  if (totalWeightGrams != null && totalWeightGrams > 0) {
    const tierFee = getWeightTierFee(totalWeightGrams);
    fee = tierFee ?? rules.baseFee;
  } else {
    fee = rules.baseFee;
  }

  // Pickup points: cap at the minimum pickup carrier fee
  if (method === "pickup") {
    const minPickupFee = Math.min(...PICKUP_CARRIERS.map((c) => c.fee));
    return Math.min(fee, minPickupFee);
  }

  return fee;
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
 * If weight tiers are configured and totalWeightGrams is provided,
 * the weight-tier fee replaces the carrier's fixed fee.
 * Returns null if the carrier is not found or not enabled.
 */
export function getCarrierFee(
  method: "home" | "pickup",
  carrierId: string,
  subtotal: number,
  totalWeightGrams?: number,
): number | null {
  const { rules } = siteConfig.shipping;

  // Free shipping threshold
  if (rules.freeOver > 0 && subtotal >= rules.freeOver) {
    return 0;
  }

  const carriers = getAvailableCarriers(method);
  const carrier = carriers.find((c) => c.id === carrierId);
  if (!carrier) return null;

  // If weight is provided and tiers are configured, use tier fee
  if (totalWeightGrams != null && totalWeightGrams > 0) {
    const tierFee = getWeightTierFee(totalWeightGrams);
    if (tierFee != null) return tierFee;
  }

  return carrier.fee;
}
