/* ------------------------------------------------------------------ */
/*  Price History — shared types and pure functions (FE-006)            */
/*  Safe to import from both server and client components              */
/* ------------------------------------------------------------------ */

/** Lowest price record within a time window */
export type LowestPriceResult = {
  lowestPrice: number;
  date: string; // ISO-8601
};

/** Single price history data point */
export type PriceHistoryPoint = {
  price: number;
  compareAtPrice: number | null;
  date: string; // ISO-8601
};

/**
 * Map of lowest 30-day prices keyed by variant ID.
 * `"product"` key holds the product-level lowest price.
 */
export type LowestPriceMap = Record<string, LowestPriceResult | null>;

/**
 * Resolve the lowest 30-day price for a given variant from the map,
 * with fallback to product-level price if no variant-specific history exists.
 */
export function resolveLowest30DayPrice(
  priceMap: LowestPriceMap,
  variantId: string | null,
): LowestPriceResult | null {
  if (variantId && priceMap[variantId]) {
    return priceMap[variantId];
  }
  // Fallback to product-level
  return priceMap["product"] ?? null;
}
