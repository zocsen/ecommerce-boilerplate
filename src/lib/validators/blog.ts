/* ------------------------------------------------------------------ */
/*  Zod 4 schemas for blog posts (FE-022)                              */
/* ------------------------------------------------------------------ */

import { z } from "zod";

// ── Slug ───────────────────────────────────────────────────────────

export const slugSchema = z
  .string()
  .min(1, "A slug megadása kötelező.")
  .max(200, "A slug legfeljebb 200 karakter.")
  .regex(
    /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
    "A slug csak kisbetűket, számokat és kötőjeleket tartalmazhat.",
  );

// ── Create post (admin) ────────────────────────────────────────────

export const postCreateSchema = z.object({
  title: z.string().min(1, "A cím megadása kötelező.").max(300, "A cím legfeljebb 300 karakter."),
  slug: slugSchema,
  excerpt: z
    .string()
    .max(1000, "A kivonat legfeljebb 1000 karakter.")
    .optional()
    .transform((v) => v || null),
  content_html: z.string().optional().default(""),
  cover_image_url: z.string().url("Érvénytelen borítókép URL.").nullable().optional().default(null),
  is_published: z.boolean().default(false),
  tags: z
    .array(z.string().min(1).max(50, "A címke legfeljebb 50 karakter."))
    .max(20, "Legfeljebb 20 címke adható meg.")
    .default([]),
  meta_title: z
    .string()
    .max(200, "A meta cím legfeljebb 200 karakter.")
    .optional()
    .transform((v) => v || null),
  meta_description: z
    .string()
    .max(500, "A meta leírás legfeljebb 500 karakter.")
    .optional()
    .transform((v) => v || null),
});

export type PostCreateInput = z.infer<typeof postCreateSchema>;

// ── Update post (admin) ────────────────────────────────────────────

export const postUpdateSchema = z.object({
  title: z
    .string()
    .min(1, "A cím megadása kötelező.")
    .max(300, "A cím legfeljebb 300 karakter.")
    .optional(),
  slug: slugSchema.optional(),
  excerpt: z
    .string()
    .max(1000, "A kivonat legfeljebb 1000 karakter.")
    .optional()
    .transform((v) => v || null),
  content_html: z.string().optional(),
  cover_image_url: z.string().url("Érvénytelen borítókép URL.").nullable().optional(),
  is_published: z.boolean().optional(),
  tags: z
    .array(z.string().min(1).max(50, "A címke legfeljebb 50 karakter."))
    .max(20, "Legfeljebb 20 címke adható meg.")
    .optional(),
  meta_title: z
    .string()
    .max(200, "A meta cím legfeljebb 200 karakter.")
    .optional()
    .transform((v) => v || null),
  meta_description: z
    .string()
    .max(500, "A meta leírás legfeljebb 500 karakter.")
    .optional()
    .transform((v) => v || null),
});

export type PostUpdateInput = z.infer<typeof postUpdateSchema>;

// ── List params (public) ───────────────────────────────────────────

export const postListParamsSchema = z.object({
  page: z.number().int().min(1).optional().default(1),
  limit: z.number().int().min(1).max(50).optional().default(6),
  tag: z.string().optional(),
});

export type PostListParams = z.infer<typeof postListParamsSchema>;

// ── Admin list params ──────────────────────────────────────────────

export const adminPostListParamsSchema = z.object({
  page: z.number().int().min(1).optional().default(1),
  perPage: z.number().int().min(1).max(100).optional().default(20),
  status: z.enum(["all", "published", "draft"]).optional().default("all"),
  search: z.string().optional(),
});

export type AdminPostListParams = z.infer<typeof adminPostListParamsSchema>;
