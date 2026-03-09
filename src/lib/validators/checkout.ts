/* ------------------------------------------------------------------ */
/*  Zod 4 schemas for checkout                                         */
/* ------------------------------------------------------------------ */

import { z } from "zod";

// ── Hungarian phone regex ──────────────────────────────────────────
//    Matches: +36 30 123 4567, +3630 1234567, +36 30 123 4567

const hungarianPhoneRegex = /^\+36\s?\d{2}\s?\d{3}\s?\d{4}$/;

// ── Address schema ─────────────────────────────────────────────────

export const addressSchema = z.object({
  name: z.string().min(1, "A név megadása kötelező"),
  street: z.string().min(1, "Az utca megadása kötelező"),
  city: z.string().min(1, "A város megadása kötelező"),
  zip: z
    .string()
    .regex(/^\d{4}$/, "Az irányítószám 4 számjegyű kell legyen"),
  country: z.string().default("HU"),
});

export type AddressInput = z.infer<typeof addressSchema>;

// ── Contact schema ─────────────────────────────────────────────────

export const contactSchema = z.object({
  email: z.email("Érvénytelen e-mail cím"),
  phone: z
    .string()
    .regex(hungarianPhoneRegex, "Érvénytelen magyar telefonszám (pl. +36 30 123 4567)"),
});

export type ContactInput = z.infer<typeof contactSchema>;

// ── Home delivery schema ───────────────────────────────────────────

export const homeDeliverySchema = z.object({
  carrier: z.literal(["GLS", "MPL", "Express One"]),
  address: addressSchema,
  phone: z
    .string()
    .regex(hungarianPhoneRegex, "Érvénytelen magyar telefonszám (pl. +36 30 123 4567)"),
});

export type HomeDeliveryInput = z.infer<typeof homeDeliverySchema>;

// ── Pickup point schema ────────────────────────────────────────────

export const pickupPointSchema = z.object({
  provider: z.literal([
    "Foxpost",
    "GLS Automata",
    "Packeta",
    "MPL Automata",
    "Easybox",
  ]),
  pointId: z.string().min(1, "Az átvételi pont azonosítója kötelező"),
  pointLabel: z.string().min(1, "Az átvételi pont megnevezése kötelező"),
  phone: z
    .string()
    .regex(hungarianPhoneRegex, "Érvénytelen magyar telefonszám (pl. +36 30 123 4567)"),
});

export type PickupPointInput = z.infer<typeof pickupPointSchema>;

// ── Full checkout schema ───────────────────────────────────────────

export const checkoutSchema = z.object({
  contact: contactSchema,
  shippingMethod: z.literal(["home", "pickup"]),
  homeDelivery: homeDeliverySchema.optional(),
  pickupPoint: pickupPointSchema.optional(),
  billingAddress: addressSchema,
  sameAsBilling: z.boolean(),
  notes: z.string().optional(),
  couponCode: z.string().optional(),
});

export type CheckoutInput = z.infer<typeof checkoutSchema>;
