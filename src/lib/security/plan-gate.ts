/* ------------------------------------------------------------------ */
/*  Plan feature gating                                                 */
/*                                                                     */
/*  Usage in server actions / server components:                       */
/*    const gate = await getPlanGate()                                 */
/*    const check = gate.check("enable_coupons")                       */
/*    if (!check.allowed) return { success: false, error: check.reason }*/
/*                                                                     */
/*  Design contract:                                                    */
/*  - No active subscription → unlimited access (dev/test mode).       */
/*    Set SUBSCRIPTION_ENFORCE_GATING=true to block instead.          */
/*  - Subscription exists → apply plan features + overrides.           */
/*  - Numeric limits: 0 = unlimited, >0 = max allowed count.          */
/* ------------------------------------------------------------------ */

import { createAdminClient } from "@/lib/supabase/admin";
import { siteConfig } from "@/lib/config/site.config";
import type { PlanFeaturesJson, ShopSubscriptionRow, ShopPlanRow } from "@/lib/types/database";

// ── Types ──────────────────────────────────────────────────────────

export interface GateCheckResult {
  allowed: boolean;
  reason?: string;
  limit?: number;
}

export interface PlanGate {
  /** Check a boolean feature flag */
  check(feature: keyof PlanFeaturesJson): GateCheckResult;
  /**
   * Check a numeric limit against the current count.
   * Returns allowed=true if limit is 0 (unlimited) or count < limit.
   */
  checkLimit(feature: keyof PlanFeaturesJson, currentCount: number): GateCheckResult;
  /** The raw merged features (plan + overrides), or null if no subscription found */
  features: PlanFeaturesJson | null;
}

// ── Feature label map for human-readable error messages ───────────

const FEATURE_LABELS: Partial<Record<keyof PlanFeaturesJson, string>> = {
  enable_coupons: "kuponok",
  enable_marketing_module: "marketing modul",
  enable_abandoned_cart: "elhagyott kosár",
  enable_b2b_wholesale: "nagykereskedelem (B2B)",
  enable_reviews: "értékelések",
  enable_price_history: "árelőzmények",
  enable_product_extras: "termék kiegészítők",
  enable_scheduled_publishing: "ütemezett közzététel",
  enable_agency_viewer: "agency viewer",
  enable_custom_pages: "egyedi oldalak",
  max_products: "termékek",
  max_admins: "adminisztrátorok",
  max_categories: "kategóriák",
  delivery_options: "szállítási lehetőségek",
};

// ── Main factory ──────────────────────────────────────────────────

/**
 * Resolves the active plan gate for the current shop.
 * Reads from `shop_subscriptions` using `siteConfig.subscription.defaultShopIdentifier`
 * (or the SHOP_IDENTIFIER env var it reads from).
 */
export async function getPlanGate(): Promise<PlanGate> {
  const shopIdentifier = siteConfig.subscription.defaultShopIdentifier;
  const enforceGating = siteConfig.subscription.enforceGating;

  const admin = createAdminClient();

  // Fetch active subscription with plan
  const { data: subscription } = await admin
    .from("shop_subscriptions")
    .select("*, plan:shop_plans(*)")
    .eq("shop_identifier", shopIdentifier)
    .in("status", ["active", "trialing"])
    .order("created_at", { ascending: false })
    .limit(1)
    .single();

  // No subscription found
  if (!subscription) {
    if (!enforceGating) {
      // Dev/test mode: unlimited access
      return buildUnlimitedGate();
    }
    // Enforcement mode: all gated features blocked
    return buildBlockedGate("Nincs aktív előfizetés ehhez az üzlethez.");
  }

  const plan = (subscription as ShopSubscriptionRow & { plan: ShopPlanRow }).plan;
  if (!plan) {
    return buildUnlimitedGate();
  }

  // Merge plan features with per-shop overrides
  const merged: PlanFeaturesJson = {
    ...plan.features,
    ...subscription.feature_overrides,
  };

  return {
    features: merged,
    check(feature) {
      const val = merged[feature];
      if (typeof val === "boolean") {
        if (val) return { allowed: true };
        const label = FEATURE_LABELS[feature] ?? String(feature);
        return {
          allowed: false,
          reason: `A jelenlegi előfizetési csomag nem tartalmazza a(z) ${label} funkciót.`,
        };
      }
      // Numeric features are always "allowed" via check() — use checkLimit() for those
      return { allowed: true };
    },
    checkLimit(feature, currentCount) {
      const val = merged[feature];
      if (typeof val !== "number") {
        return { allowed: true };
      }
      if (val === 0) {
        return { allowed: true, limit: 0 };
      }
      if (currentCount < val) {
        return { allowed: true, limit: val };
      }
      const label = FEATURE_LABELS[feature] ?? String(feature);
      return {
        allowed: false,
        limit: val,
        reason: `Elérted a csomag korlátját: legfeljebb ${val} ${label} lehetséges.`,
      };
    },
  };
}

// ── Private helpers ───────────────────────────────────────────────

function buildUnlimitedGate(): PlanGate {
  return {
    features: null,
    check: () => ({ allowed: true }),
    checkLimit: () => ({ allowed: true }),
  };
}

function buildBlockedGate(defaultReason: string): PlanGate {
  return {
    features: null,
    check: () => ({ allowed: false, reason: defaultReason }),
    checkLimit: () => ({ allowed: false, reason: defaultReason }),
  };
}
