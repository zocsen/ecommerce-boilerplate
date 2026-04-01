/* ------------------------------------------------------------------ */
/*  Price History — server-side utilities (FE-006)                     */
/*  These functions query the database and must only be imported       */
/*  from server components or server actions.                          */
/* ------------------------------------------------------------------ */

import { createClient } from "@/lib/supabase/server";

// Re-export shared types and pure functions for convenience
export type {
  LowestPriceResult,
  PriceHistoryPoint,
  LowestPriceMap,
} from "@/lib/utils/price-history-shared";
export { resolveLowest30DayPrice } from "@/lib/utils/price-history-shared";

/**
 * Get the lowest price recorded in the last `days` days for a product
 * (or a specific variant). Used on the storefront to comply with the
 * EU Omnibus Directive.
 *
 * Returns `null` when:
 * - No price history exists for this product/variant
 * - The product is free (price = 0)
 */
export async function getLowest30DayPrice(
  productId: string,
  variantId?: string | null,
  days: number = 30,
): Promise<import("@/lib/utils/price-history-shared").LowestPriceResult | null> {
  const supabase = await createClient();

  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - days);

  let query = supabase
    .from("price_history")
    .select("price, recorded_at")
    .eq("product_id", productId)
    .gte("recorded_at", cutoffDate.toISOString())
    .gt("price", 0); // Exclude free product records

  // If variantId is explicitly provided, filter for that variant.
  // If variantId is null/undefined, look for product-level records (variant_id IS NULL).
  if (variantId) {
    query = query.eq("variant_id", variantId);
  } else {
    query = query.is("variant_id", null);
  }

  const { data, error } = await query.order("price", { ascending: true }).limit(1);

  if (error || !data || data.length === 0) {
    return null;
  }

  return {
    lowestPrice: data[0].price,
    date: data[0].recorded_at,
  };
}

/**
 * Get the lowest 30-day prices for a product AND all its variants in a
 * single query. Returns a map keyed by variant ID, with `"product"` for
 * the product-level entry.
 *
 * Fallback logic (per spec): if a variant has no price history, the
 * product-level lowest price is used instead.
 */
export async function getLowest30DayPriceMap(
  productId: string,
  variantIds: string[],
  days: number = 30,
): Promise<import("@/lib/utils/price-history-shared").LowestPriceMap> {
  const supabase = await createClient();

  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - days);

  // Fetch ALL price history records for this product in one query
  const { data, error } = await supabase
    .from("price_history")
    .select("variant_id, price, recorded_at")
    .eq("product_id", productId)
    .gte("recorded_at", cutoffDate.toISOString())
    .gt("price", 0)
    .order("price", { ascending: true });

  if (error || !data) {
    return { product: null };
  }

  // Group records by variant_id (null = product-level)
  const result: import("@/lib/utils/price-history-shared").LowestPriceMap = { product: null };

  // Track which keys we've already found the lowest for (data is sorted by price ASC)
  const seen = new Set<string>();

  for (const row of data) {
    const key = row.variant_id ?? "product";
    if (!seen.has(key)) {
      seen.add(key);
      result[key] = {
        lowestPrice: row.price,
        date: row.recorded_at,
      };
    }
  }

  // Ensure every requested variant has an entry (null if no history)
  for (const vid of variantIds) {
    if (!(vid in result)) {
      result[vid] = null;
    }
  }

  return result;
}

/**
 * Get full price history for a product/variant over the last `days` days.
 * Used for the admin sparkline chart.
 *
 * Returns an array of price points sorted chronologically (oldest first).
 */
export async function getPriceHistory(
  productId: string,
  variantId?: string | null,
  days: number = 30,
): Promise<import("@/lib/utils/price-history-shared").PriceHistoryPoint[]> {
  const supabase = await createClient();

  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - days);

  let query = supabase
    .from("price_history")
    .select("price, compare_at_price, recorded_at")
    .eq("product_id", productId)
    .gte("recorded_at", cutoffDate.toISOString());

  if (variantId) {
    query = query.eq("variant_id", variantId);
  } else {
    query = query.is("variant_id", null);
  }

  const { data, error } = await query.order("recorded_at", { ascending: true });

  if (error || !data) {
    return [];
  }

  return data.map((row) => ({
    price: row.price,
    compareAtPrice: row.compare_at_price,
    date: row.recorded_at,
  }));
}
