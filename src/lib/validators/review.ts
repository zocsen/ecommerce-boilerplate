/* ------------------------------------------------------------------ */
/*  Zod 4 schemas for product reviews (FE-010)                         */
/* ------------------------------------------------------------------ */

import { z } from "zod";
import { uuidSchema } from "@/lib/validators/uuid";

// ── Submit review (customer) ───────────────────────────────────────

export const reviewSubmitSchema = z.object({
  productId: uuidSchema,
  rating: z
    .number()
    .int("Az értékelés egész szám kell legyen.")
    .min(1, "Az értékelés legalább 1 csillag.")
    .max(5, "Az értékelés legfeljebb 5 csillag."),
  title: z.string().max(200, "A cím legfeljebb 200 karakter.").optional(),
  body: z
    .string()
    .min(10, "A vélemény legalább 10 karakter.")
    .max(5000, "A vélemény legfeljebb 5000 karakter."),
});

export type ReviewSubmitInput = z.infer<typeof reviewSubmitSchema>;

// ── Update own review (customer) ───────────────────────────────────

export const reviewUpdateSchema = z.object({
  rating: z
    .number()
    .int("Az értékelés egész szám kell legyen.")
    .min(1, "Az értékelés legalább 1 csillag.")
    .max(5, "Az értékelés legfeljebb 5 csillag.")
    .optional(),
  title: z.string().max(200, "A cím legfeljebb 200 karakter.").optional(),
  body: z
    .string()
    .min(10, "A vélemény legalább 10 karakter.")
    .max(5000, "A vélemény legfeljebb 5000 karakter.")
    .optional(),
});

export type ReviewUpdateInput = z.infer<typeof reviewUpdateSchema>;

// ── Admin moderate (approve/reject) ─────────────────────────────────

export const reviewModerateSchema = z.object({
  status: z.enum(["approved", "rejected"], {
    message: "Érvénytelen státusz. Csak 'approved' vagy 'rejected' lehet.",
  }),
});

export type ReviewModerateInput = z.infer<typeof reviewModerateSchema>;

// ── Admin reply ─────────────────────────────────────────────────────

export const reviewReplySchema = z.object({
  reply: z
    .string()
    .min(1, "A válasz nem lehet üres.")
    .max(2000, "A válasz legfeljebb 2000 karakter."),
});

export type ReviewReplyInput = z.infer<typeof reviewReplySchema>;

// ── List params ─────────────────────────────────────────────────────

export const reviewListParamsSchema = z.object({
  page: z.number().int().min(1).optional(),
  limit: z.number().int().min(1).max(50).optional(),
  sortBy: z.enum(["newest", "highest", "lowest"]).optional(),
});

export type ReviewListParams = z.infer<typeof reviewListParamsSchema>;

// ── Admin list params (includes status filter) ──────────────────────

export const adminReviewListParamsSchema = z.object({
  page: z.number().int().min(1).optional(),
  perPage: z.number().int().min(1).max(100).optional(),
  status: z.enum(["pending", "approved", "rejected"]).optional(),
  search: z.string().optional(),
});

export type AdminReviewListParams = z.infer<typeof adminReviewListParamsSchema>;
