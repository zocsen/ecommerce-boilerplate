/* ------------------------------------------------------------------ */
/*  Zod 4 schemas for product CRUD                                     */
/* ------------------------------------------------------------------ */

import { z } from "zod";
import { uuidSchema } from "@/lib/validators/uuid";

// ── Slug regex: lowercase letters, digits, hyphens ─────────────────

const slugPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

// ── Variant schema ─────────────────────────────────────────────────

export const variantSchema = z.object({
  sku: z.string().optional(),
  option1Name: z.string().min(1, "Az opció neve kötelező"),
  option1Value: z.string().min(1, "Az opció értéke kötelező"),
  option2Name: z.string().optional(),
  option2Value: z.string().optional(),
  priceOverride: z.int().min(0, "Az ár nem lehet negatív").optional(),
  stockQuantity: z.int().min(0, "A készlet nem lehet negatív"),
  isActive: z.boolean(),
});

export type VariantInput = z.infer<typeof variantSchema>;

// ── Product create schema ──────────────────────────────────────────

export const productCreateSchema = z.object({
  title: z.string().min(1, "A termék neve kötelező"),
  slug: z
    .string()
    .min(1, "A slug kötelező")
    .regex(slugPattern, "A slug csak kisbetűket, számokat és kötőjelet tartalmazhat"),
  description: z.string(),
  basePrice: z.int().min(0, "Az alapár nem lehet negatív"),
  compareAtPrice: z.int().min(0, "Az összehasonlító ár nem lehet negatív").optional(),
  mainImageUrl: z.url("Érvénytelen kép URL").optional(),
  imageUrls: z.array(z.string()),
  isActive: z.boolean(),
  categoryIds: z.array(uuidSchema),
});

export type ProductCreateInput = z.infer<typeof productCreateSchema>;

// ── Product update schema (all optional except id) ─────────────────

export const productUpdateSchema = z.object({
  id: uuidSchema,
  title: z.string().min(1, "A termék neve kötelező").optional(),
  slug: z
    .string()
    .min(1, "A slug kötelező")
    .regex(slugPattern, "A slug csak kisbetűket, számokat és kötőjelet tartalmazhat")
    .optional(),
  description: z.string().optional(),
  basePrice: z.int().min(0, "Az alapár nem lehet negatív").optional(),
  compareAtPrice: z
    .int()
    .min(0, "Az összehasonlító ár nem lehet negatív")
    .optional()
    .nullable(),
  mainImageUrl: z.url("Érvénytelen kép URL").optional().nullable(),
  imageUrls: z.array(z.string()).optional(),
  isActive: z.boolean().optional(),
  categoryIds: z.array(uuidSchema).optional(),
});

export type ProductUpdateInput = z.infer<typeof productUpdateSchema>;
