/* ------------------------------------------------------------------ */
/*  Zod schemas for plan subscription management (FE-003)              */
/* ------------------------------------------------------------------ */

import { z } from "zod";
import { uuidSchema } from "@/lib/validators/uuid";

// ── Shared helpers ─────────────────────────────────────────────────

const billingCycleSchema = z.literal(["monthly", "annual"]);
const subscriptionStatusSchema = z.literal([
  "active",
  "past_due",
  "cancelled",
  "trialing",
  "suspended",
]);
const invoiceStatusSchema = z.literal(["pending", "paid", "failed", "refunded"]);

// ── Plan features schema ───────────────────────────────────────────

export const planFeaturesSchema = z.object({
  max_products: z.int().min(0),
  max_admins: z.int().min(0),
  max_categories: z.int().min(0),
  delivery_options: z.int().min(0),
  enable_coupons: z.boolean(),
  enable_marketing_module: z.boolean(),
  enable_abandoned_cart: z.boolean(),
  enable_b2b_wholesale: z.boolean(),
  enable_reviews: z.boolean(),
  enable_price_history: z.boolean(),
  enable_product_extras: z.boolean(),
  enable_scheduled_publishing: z.boolean(),
  enable_agency_viewer: z.boolean(),
  enable_custom_pages: z.boolean(),
  enable_blog: z.boolean(),
});

export type PlanFeaturesInput = z.infer<typeof planFeaturesSchema>;

// ── Plan create/update schemas ─────────────────────────────────────

export const planCreateSchema = z.object({
  name: z.string().min(1, "A csomagnév kötelező").max(100),
  slug: z
    .string()
    .min(1, "A slug kötelező")
    .max(50)
    .regex(
      /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
      "A slug csak kisbetűket, számokat és kötőjelet tartalmazhat",
    ),
  description: z.string().max(500).optional(),
  base_monthly_price: z.int().min(0, "Az ár nem lehet negatív"),
  base_annual_price: z.int().min(0, "Az ár nem lehet negatív"),
  features: planFeaturesSchema,
  sort_order: z.int().min(0).optional(),
  is_active: z.boolean().optional(),
});

export type PlanCreateInput = z.infer<typeof planCreateSchema>;

export const planUpdateSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  slug: z
    .string()
    .min(1)
    .max(50)
    .regex(
      /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
      "A slug csak kisbetűket, számokat és kötőjelet tartalmazhat",
    )
    .optional(),
  description: z.string().max(500).nullable().optional(),
  base_monthly_price: z.int().min(0).optional(),
  base_annual_price: z.int().min(0).optional(),
  features: planFeaturesSchema.partial().optional(),
  sort_order: z.int().min(0).optional(),
  is_active: z.boolean().optional(),
});

export type PlanUpdateInput = z.infer<typeof planUpdateSchema>;

// ── Subscription create/update schemas ────────────────────────────

export const subscriptionCreateSchema = z.object({
  plan_id: uuidSchema,
  shop_identifier: z
    .string()
    .min(1, "A bolt azonosító kötelező")
    .max(255, "A bolt azonosító legfeljebb 255 karakter lehet"),
  status: subscriptionStatusSchema.optional(),
  billing_cycle: billingCycleSchema.optional(),
  custom_monthly_price: z.int().min(0).nullable().optional(),
  custom_annual_price: z.int().min(0).nullable().optional(),
  current_period_start: z.string().datetime().optional(),
  current_period_end: z.string().datetime().optional(),
  trial_ends_at: z.string().datetime().nullable().optional(),
  feature_overrides: planFeaturesSchema.partial().optional(),
  notes: z.string().max(1000).nullable().optional(),
});

export type SubscriptionCreateInput = z.infer<typeof subscriptionCreateSchema>;

export const subscriptionUpdateSchema = z.object({
  plan_id: uuidSchema.optional(),
  shop_identifier: z.string().min(1).max(255).optional(),
  status: subscriptionStatusSchema.optional(),
  billing_cycle: billingCycleSchema.optional(),
  custom_monthly_price: z.int().min(0).nullable().optional(),
  custom_annual_price: z.int().min(0).nullable().optional(),
  current_period_start: z.string().datetime().nullable().optional(),
  current_period_end: z.string().datetime().nullable().optional(),
  trial_ends_at: z.string().datetime().nullable().optional(),
  cancelled_at: z.string().datetime().nullable().optional(),
  feature_overrides: planFeaturesSchema.partial().optional(),
  notes: z.string().max(1000).nullable().optional(),
});

export type SubscriptionUpdateInput = z.infer<typeof subscriptionUpdateSchema>;

// ── Invoice create/update schemas ─────────────────────────────────

export const invoiceCreateSchema = z.object({
  subscription_id: uuidSchema,
  amount: z.int().min(1, "A számlázandó összeg legalább 1 HUF kell legyen"),
  currency: z.string().length(3).optional(),
  billing_period_start: z.string().datetime("Érvénytelen számlázási időszak kezdete"),
  billing_period_end: z.string().datetime("Érvénytelen számlázási időszak vége"),
  status: invoiceStatusSchema.optional(),
  paid_at: z.string().datetime().nullable().optional(),
  invoice_provider: z.string().max(50).nullable().optional(),
  invoice_number: z.string().max(100).nullable().optional(),
  invoice_url: z.string().url().nullable().optional(),
  payment_method: z.string().max(50).nullable().optional(),
  notes: z.string().max(1000).nullable().optional(),
});

export type InvoiceCreateInput = z.infer<typeof invoiceCreateSchema>;

export const invoiceUpdateSchema = z.object({
  amount: z.int().min(1).optional(),
  status: invoiceStatusSchema.optional(),
  paid_at: z.string().datetime().nullable().optional(),
  invoice_provider: z.string().max(50).nullable().optional(),
  invoice_number: z.string().max(100).nullable().optional(),
  invoice_url: z.string().url().nullable().optional(),
  payment_method: z.string().max(50).nullable().optional(),
  notes: z.string().max(1000).nullable().optional(),
});

export type InvoiceUpdateInput = z.infer<typeof invoiceUpdateSchema>;
