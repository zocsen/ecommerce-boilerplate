/* ------------------------------------------------------------------ */
/*  Zod 4 schemas for newsletter subscribers                           */
/* ------------------------------------------------------------------ */

import { z } from "zod";

// ── Subscribe schema ───────────────────────────────────────────────

export const subscribeSchema = z.object({
  email: z.email("Érvénytelen e-mail cím"),
});

export type SubscribeInput = z.infer<typeof subscribeSchema>;

// ── Unsubscribe schema (email or token) ────────────────────────────

export const unsubscribeSchema = z.union([
  z.object({
    email: z.email("Érvénytelen e-mail cím"),
  }),
  z.object({
    token: z.string().min(1, "A token megadása kötelező"),
  }),
]);

export type UnsubscribeInput = z.infer<typeof unsubscribeSchema>;

// ── Tag subscriber schema (admin) ──────────────────────────────────

export const tagSchema = z.object({
  email: z.email("Érvénytelen e-mail cím"),
  tags: z.array(z.string().min(1, "A címke nem lehet üres")),
});

export type TagInput = z.infer<typeof tagSchema>;
