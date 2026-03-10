"use server";

/* ------------------------------------------------------------------ */
/*  Profile server actions                                             */
/*  Customer-facing actions for managing their own profile.            */
/* ------------------------------------------------------------------ */

import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { requireAuth } from "@/lib/security/roles";
import type {
  ProfileRow,
  OrderRow,
  AddressJson,
  BillingAddressJson,
  PickupPointJson,
} from "@/lib/types/database";

// ── Types ──────────────────────────────────────────────────────────

interface ActionResult<T = undefined> {
  success: boolean;
  data?: T;
  error?: string;
}

// ── Validation schemas ─────────────────────────────────────────────

const hungarianPhoneRegex = /^\+36\s?\d{2}\s?\d{3}\s?\d{4}$/;

const updateProfileSchema = z.object({
  fullName: z.string().min(1, "A nev megadasa kotelezo").max(200),
  phone: z
    .string()
    .regex(hungarianPhoneRegex, "Ervenytelen magyar telefonszam (pl. +36 30 123 4567)")
    .or(z.literal("")),
});

const addressSchema = z.object({
  name: z.string().min(1, "A nev megadasa kotelezo"),
  street: z.string().min(1, "Az utca megadasa kotelezo"),
  city: z.string().min(1, "A varos megadasa kotelezo"),
  zip: z.string().regex(/^\d{4}$/, "Az iranyitoszam 4 szamjegyu kell legyen"),
  country: z.string().default("HU"),
});

const billingAddressSchema = addressSchema.extend({
  company_name: z.string().max(200).optional(),
  tax_number: z.string().max(50).optional(),
});

const pickupPointSchema = z.object({
  provider: z.string().optional(),
  point_id: z.string().optional(),
  point_label: z.string().optional(),
});

const changePasswordSchema = z.object({
  newPassword: z.string().min(8, "A jelszonak legalabb 8 karakter hosszunak kell lennie"),
});

// ── Get current profile ────────────────────────────────────────────

export async function getProfile(): Promise<ActionResult<ProfileRow>> {
  try {
    const user = await requireAuth();
    const supabase = await createClient();

    const { data: profile, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .single();

    if (error || !profile) {
      return { success: false, error: "A profil nem talalhato." };
    }

    return { success: true, data: profile };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[getProfile] Unexpected error:", message);
    return { success: false, error: "Varatlan hiba tortent." };
  }
}

// ── Update profile (name, phone) ───────────────────────────────────

export async function updateProfile(input: {
  fullName: string;
  phone: string;
}): Promise<ActionResult> {
  try {
    const user = await requireAuth();

    const parsed = updateProfileSchema.safeParse(input);
    if (!parsed.success) {
      const firstIssue = parsed.error.issues[0];
      return { success: false, error: firstIssue?.message ?? "Ervenytelen adatok." };
    }

    const supabase = await createClient();

    const { error } = await supabase
      .from("profiles")
      .update({
        full_name: parsed.data.fullName,
        phone: parsed.data.phone || null,
      })
      .eq("id", user.id);

    if (error) {
      console.error("[updateProfile] DB error:", error.message);
      return { success: false, error: "Hiba a profil frissitesekor." };
    }

    return { success: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[updateProfile] Unexpected error:", message);
    return { success: false, error: "Varatlan hiba tortent." };
  }
}

// ── Update addresses ───────────────────────────────────────────────

export async function updateAddresses(input: {
  shippingAddress?: AddressJson;
  billingAddress?: BillingAddressJson;
  pickupPoint?: PickupPointJson;
}): Promise<ActionResult> {
  try {
    const user = await requireAuth();

    const updatePayload: Record<string, unknown> = {};

    if (input.shippingAddress) {
      const parsed = addressSchema.safeParse(input.shippingAddress);
      if (!parsed.success) {
        const firstIssue = parsed.error.issues[0];
        return { success: false, error: `Szallitasi cim: ${firstIssue?.message ?? "ervenytelen"}` };
      }
      updatePayload.default_shipping_address = parsed.data;
    }

    if (input.billingAddress) {
      const parsed = billingAddressSchema.safeParse(input.billingAddress);
      if (!parsed.success) {
        const firstIssue = parsed.error.issues[0];
        return { success: false, error: `Szamlazasi cim: ${firstIssue?.message ?? "ervenytelen"}` };
      }
      updatePayload.default_billing_address = parsed.data;
    }

    if (input.pickupPoint) {
      const parsed = pickupPointSchema.safeParse(input.pickupPoint);
      if (!parsed.success) {
        return { success: false, error: "Ervenytelen atveteli pont adatok." };
      }
      updatePayload.default_pickup_point = parsed.data;
    }

    if (Object.keys(updatePayload).length === 0) {
      return { success: false, error: "Nincs frissitendo mezo." };
    }

    const supabase = await createClient();

    const { error } = await supabase
      .from("profiles")
      .update(updatePayload)
      .eq("id", user.id);

    if (error) {
      console.error("[updateAddresses] DB error:", error.message);
      return { success: false, error: "Hiba a cimek frissitesekor." };
    }

    return { success: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[updateAddresses] Unexpected error:", message);
    return { success: false, error: "Varatlan hiba tortent." };
  }
}

// ── Change password ────────────────────────────────────────────────

export async function changePassword(input: {
  newPassword: string;
}): Promise<ActionResult> {
  try {
    await requireAuth();

    const parsed = changePasswordSchema.safeParse(input);
    if (!parsed.success) {
      const firstIssue = parsed.error.issues[0];
      return { success: false, error: firstIssue?.message ?? "Ervenytelen jelszo." };
    }

    const supabase = await createClient();

    const { error } = await supabase.auth.updateUser({
      password: parsed.data.newPassword,
    });

    if (error) {
      console.error("[changePassword] Auth error:", error.message);
      return { success: false, error: "Hiba a jelszo megvaltoztatasakor." };
    }

    return { success: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[changePassword] Unexpected error:", message);
    return { success: false, error: "Varatlan hiba tortent." };
  }
}

// ── List user orders ───────────────────────────────────────────────

export async function listUserOrders(input?: {
  page?: number;
  perPage?: number;
}): Promise<ActionResult<{ orders: OrderRow[]; total: number; page: number; totalPages: number }>> {
  try {
    const user = await requireAuth();
    const supabase = await createClient();

    const page = input?.page ?? 1;
    const perPage = input?.perPage ?? 20;

    const from = (page - 1) * perPage;
    const to = from + perPage - 1;

    const { data: orders, count, error } = await supabase
      .from("orders")
      .select("*", { count: "exact" })
      .eq("user_id", user.id)
      .neq("status", "draft")
      .order("created_at", { ascending: false })
      .range(from, to);

    if (error) {
      console.error("[listUserOrders] DB error:", error.message);
      return { success: false, error: "Hiba a rendelesek lekeresekor." };
    }

    const total = count ?? 0;

    return {
      success: true,
      data: {
        orders: orders ?? [],
        total,
        page,
        totalPages: Math.ceil(total / perPage),
      },
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[listUserOrders] Unexpected error:", message);
    return { success: false, error: "Varatlan hiba tortent." };
  }
}

// ── Get user order detail ──────────────────────────────────────────

export async function getUserOrder(orderId: string): Promise<
  ActionResult<{
    order: OrderRow;
    items: Array<{
      id: string;
      title_snapshot: string;
      variant_snapshot: Record<string, unknown>;
      unit_price_snapshot: number;
      quantity: number;
      line_total: number;
    }>;
  }>
> {
  try {
    const user = await requireAuth();

    const idParsed = z.string().uuid().safeParse(orderId);
    if (!idParsed.success) {
      return { success: false, error: "Ervenytelen rendeles azonosito." };
    }

    const supabase = await createClient();

    const [orderResult, itemsResult] = await Promise.all([
      supabase
        .from("orders")
        .select("*")
        .eq("id", idParsed.data)
        .eq("user_id", user.id)
        .single(),
      supabase
        .from("order_items")
        .select("*")
        .eq("order_id", idParsed.data)
        .order("id", { ascending: true }),
    ]);

    if (orderResult.error || !orderResult.data) {
      return { success: false, error: "A rendeles nem talalhato." };
    }

    return {
      success: true,
      data: {
        order: orderResult.data,
        items: itemsResult.data ?? [],
      },
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[getUserOrder] Unexpected error:", message);
    return { success: false, error: "Varatlan hiba tortent." };
  }
}

// ── Sign out ───────────────────────────────────────────────────────

export async function signOut(): Promise<ActionResult> {
  try {
    const supabase = await createClient();
    const { error } = await supabase.auth.signOut();

    if (error) {
      console.error("[signOut] Auth error:", error.message);
      return { success: false, error: "Hiba a kijelentkezeskor." };
    }

    return { success: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[signOut] Unexpected error:", message);
    return { success: false, error: "Varatlan hiba tortent." };
  }
}
