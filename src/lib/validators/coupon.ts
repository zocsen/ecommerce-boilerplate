/* ------------------------------------------------------------------ */
/*  Zod 4 schemas for coupons                                          */
/* ------------------------------------------------------------------ */

import { z } from "zod";

// ── Coupon create schema (admin) ───────────────────────────────────

export const couponCreateSchema = z.object({
  code: z
    .string()
    .min(3, "A kuponkód legalább 3 karakter")
    .max(20, "A kuponkód legfeljebb 20 karakter")
    .transform((val) => val.toUpperCase()),
  discountType: z.literal(["percentage", "fixed"]),
  value: z.int().min(1, "Az érték legalább 1 kell legyen"),
  minOrderAmount: z.int().min(0).optional(),
  maxUses: z.int().min(1).optional(),
  validFrom: z.string().optional(),
  validUntil: z.string().optional(),
  isActive: z.boolean(),
});

export type CouponCreateInput = z.infer<typeof couponCreateSchema>;

// ── Coupon apply schema (storefront) ───────────────────────────────

export const couponApplySchema = z.object({
  code: z.string().min(1, "A kuponkód megadása kötelező"),
  subtotal: z.int().min(0, "Az összeg nem lehet negatív"),
});

export type CouponApplyInput = z.infer<typeof couponApplySchema>;
