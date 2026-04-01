"use server";

/* ------------------------------------------------------------------ */
/*  Cart validation & coupon application server actions                */
/* ------------------------------------------------------------------ */

import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { siteConfig } from "@/lib/config/site.config";
import { couponApplySchema } from "@/lib/validators/coupon";
import { uuidSchema } from "@/lib/validators/uuid";
import type { CartItem } from "@/lib/types";

// ── Types ──────────────────────────────────────────────────────────

interface ActionResult<T = undefined> {
  success: boolean;
  data?: T;
  error?: string;
}

interface ValidatedCartItem {
  productId: string;
  variantId: string | null;
  title: string;
  variantLabel: string;
  price: number;
  quantity: number;
  image: string | null;
  slug: string;
  stock: number;
  weightGrams: number;
  available: boolean;
}

interface ValidatedCart {
  items: ValidatedCartItem[];
  subtotal: number;
  hasChanges: boolean;
}

interface CouponResult {
  discount: number;
  discountType: "percentage" | "fixed";
  value: number;
  code: string;
}

// ── Validation schemas ─────────────────────────────────────────────

const cartItemSchema = z.object({
  productId: uuidSchema,
  variantId: uuidSchema.nullable(),
  title: z.string(),
  variantLabel: z.string(),
  price: z.number().int().min(0),
  quantity: z.number().int().min(1),
  image: z.string().nullable(),
  slug: z.string(),
  stock: z.number().int().min(0),
  weightGrams: z.number().int().min(0),
});

const cartItemsSchema = z.array(cartItemSchema).min(1, "A kosár nem lehet üres.");

// ── Cart validation ────────────────────────────────────────────────

export async function validateCart(items: CartItem[]): Promise<ActionResult<ValidatedCart>> {
  try {
    const parsed = cartItemsSchema.safeParse(items);
    if (!parsed.success) {
      const firstIssue = parsed.error.issues[0];
      return {
        success: false,
        error: firstIssue?.message ?? "Érvénytelen kosár adatok.",
      };
    }

    const cartItems = parsed.data;
    const supabase = await createClient();

    // Collect all product IDs and variant IDs
    const productIds = [...new Set(cartItems.map((item) => item.productId))];
    const variantIds = cartItems
      .map((item) => item.variantId)
      .filter((id): id is string => id !== null);

    // Fetch products and variants in parallel — defense-in-depth: also filter by published_at
    const now = new Date().toISOString();
    const [productsResult, variantsResult] = await Promise.all([
      supabase
        .from("products")
        .select("*")
        .in("id", productIds)
        .eq("is_active", true)
        .or(`published_at.is.null,published_at.lte.${now}`),
      variantIds.length > 0
        ? supabase.from("product_variants").select("*").in("id", variantIds).eq("is_active", true)
        : Promise.resolve({ data: [], error: null }),
    ]);

    if (productsResult.error) {
      console.error("[validateCart] Products query error:", productsResult.error.message);
      return { success: false, error: "Hiba a termékek ellenőrzésekor." };
    }

    const productsMap = new Map((productsResult.data ?? []).map((p) => [p.id, p]));
    const variantsMap = new Map((variantsResult.data ?? []).map((v) => [v.id, v]));

    let hasChanges = false;
    const validatedItems: ValidatedCartItem[] = [];

    for (const item of cartItems) {
      const product = productsMap.get(item.productId);

      if (!product) {
        // Product no longer active or doesn't exist
        hasChanges = true;
        validatedItems.push({
          ...item,
          available: false,
          stock: 0,
        });
        continue;
      }

      let currentPrice = product.base_price;
      let currentStock = 0;
      let variantLabel = item.variantLabel;
      let resolvedWeight =
        product.weight_grams ?? siteConfig.shipping.rules.defaultProductWeightGrams;

      if (item.variantId) {
        const variant = variantsMap.get(item.variantId);
        if (!variant) {
          // Variant no longer active
          hasChanges = true;
          validatedItems.push({
            ...item,
            available: false,
            stock: 0,
          });
          continue;
        }

        currentPrice = variant.price_override ?? product.base_price;
        currentStock = variant.stock_quantity;
        variantLabel =
          [variant.option1_value, variant.option2_value].filter(Boolean).join(" / ") ||
          item.variantLabel;
        // Variant weight overrides product weight
        resolvedWeight =
          variant.weight_grams ??
          product.weight_grams ??
          siteConfig.shipping.rules.defaultProductWeightGrams;
      } else {
        // No variant — check if there are any variants at all
        // If product has variants, user should select one
        // For variant-less products, stock is unlimited (managed at product level)
        currentStock = 999;
      }

      // Check if price changed
      if (currentPrice !== item.price) {
        hasChanges = true;
      }

      // Clamp quantity to available stock
      const clampedQuantity = Math.min(item.quantity, currentStock);
      if (clampedQuantity !== item.quantity) {
        hasChanges = true;
      }

      validatedItems.push({
        productId: item.productId,
        variantId: item.variantId,
        title: product.title,
        variantLabel,
        price: currentPrice,
        quantity: clampedQuantity > 0 ? clampedQuantity : item.quantity,
        image: product.main_image_url,
        slug: product.slug,
        stock: currentStock,
        weightGrams: resolvedWeight,
        available: currentStock > 0 || !item.variantId,
      });
    }

    const subtotal = validatedItems
      .filter((item) => item.available)
      .reduce((sum, item) => sum + item.price * item.quantity, 0);

    return {
      success: true,
      data: {
        items: validatedItems,
        subtotal,
        hasChanges,
      },
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[validateCart] Unexpected error:", message);
    return { success: false, error: "Váratlan hiba történt." };
  }
}

// ── Coupon application ─────────────────────────────────────────────

export async function applyCoupon(
  code: string,
  subtotal: number,
): Promise<ActionResult<CouponResult>> {
  try {
    if (!siteConfig.features.enableCoupons) {
      return { success: false, error: "A kuponok jelenleg nem elérhetők." };
    }

    const parsed = couponApplySchema.safeParse({ code, subtotal });
    if (!parsed.success) {
      const firstIssue = parsed.error.issues[0];
      return {
        success: false,
        error: firstIssue?.message ?? "Érvénytelen kupon adatok.",
      };
    }

    const supabase = await createClient();

    const { data: coupon, error } = await supabase
      .from("coupons")
      .select("*")
      .eq("code", parsed.data.code.toUpperCase())
      .eq("is_active", true)
      .single();

    if (error || !coupon) {
      return { success: false, error: "Érvénytelen kuponkód." };
    }

    // Check validity dates
    const now = new Date();

    if (coupon.valid_from && new Date(coupon.valid_from) > now) {
      return { success: false, error: "A kupon még nem érvényes." };
    }

    if (coupon.valid_until && new Date(coupon.valid_until) < now) {
      return { success: false, error: "A kupon lejárt." };
    }

    // Check usage limit
    if (coupon.max_uses !== null && coupon.used_count >= coupon.max_uses) {
      return {
        success: false,
        error: "A kupon felhasználási kerete elfogyott.",
      };
    }

    // Check minimum order amount
    if (coupon.min_order_amount !== null && parsed.data.subtotal < coupon.min_order_amount) {
      return {
        success: false,
        error: `A minimális rendelési összeg ${coupon.min_order_amount.toLocaleString("hu-HU")} Ft.`,
      };
    }

    // Calculate discount
    let discount: number;

    if (coupon.discount_type === "percentage") {
      discount = Math.round((parsed.data.subtotal * coupon.value) / 100);
    } else {
      discount = coupon.value;
    }

    // Discount cannot exceed subtotal
    discount = Math.min(discount, parsed.data.subtotal);

    return {
      success: true,
      data: {
        discount,
        discountType: coupon.discount_type,
        value: coupon.value,
        code: coupon.code,
      },
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[applyCoupon] Unexpected error:", message);
    return { success: false, error: "Váratlan hiba történt." };
  }
}
