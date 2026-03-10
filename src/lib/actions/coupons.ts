"use server";

/* ------------------------------------------------------------------ */
/*  Coupon admin server actions                                        */
/* ------------------------------------------------------------------ */

import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdmin, requireAdminOrViewer } from "@/lib/security/roles";
import { logAudit } from "@/lib/security/logger";
import { couponCreateSchema } from "@/lib/validators/coupon";
import type { CouponRow } from "@/lib/types/database";

// ── Types ──────────────────────────────────────────────────────────

interface ActionResult<T = undefined> {
  success: boolean;
  data?: T;
  error?: string;
}

interface CouponListData {
  coupons: CouponRow[];
  total: number;
  page: number;
  totalPages: number;
}

// ── Validation schemas ─────────────────────────────────────────────

const listFiltersSchema = z.object({
  page: z.number().int().min(1).optional(),
  perPage: z.number().int().min(1).max(100).optional(),
  search: z.string().optional(),
});

const couponUpdateSchema = z.object({
  code: z
    .string()
    .min(3)
    .max(20)
    .transform((val) => val.toUpperCase())
    .optional(),
  discountType: z.enum(["percentage", "fixed"]).optional(),
  value: z.number().int().min(1).optional(),
  minOrderAmount: z.number().int().min(0).nullable().optional(),
  maxUses: z.number().int().min(1).nullable().optional(),
  validFrom: z.string().nullable().optional(),
  validUntil: z.string().nullable().optional(),
  isActive: z.boolean().optional(),
});

// ── Admin actions ──────────────────────────────────────────────────

export async function adminListCoupons(
  filters: { page?: number; perPage?: number; search?: string } = {},
): Promise<ActionResult<CouponListData>> {
  try {
    await requireAdminOrViewer();

    const parsed = listFiltersSchema.safeParse(filters);
    if (!parsed.success) {
      return { success: false, error: "Érvénytelen szűrő paraméterek." };
    }

    const { page = 1, perPage = 20, search } = parsed.data;

    const admin = createAdminClient();

    let query = admin
      .from("coupons")
      .select("*", { count: "exact" })
      .order("is_active", { ascending: false })
      .order("created_at" as string, { ascending: false });

    if (search) {
      query = query.ilike("code", `%${search.toUpperCase()}%`);
    }

    const from = (page - 1) * perPage;
    const to = from + perPage - 1;
    query = query.range(from, to);

    const { data: coupons, count, error } = await query;

    if (error) {
      console.error("[adminListCoupons] DB error:", error.message);
      return { success: false, error: "Hiba a kuponok lekérésekor." };
    }

    const total = count ?? 0;

    return {
      success: true,
      data: {
        coupons: coupons ?? [],
        total,
        page,
        totalPages: Math.ceil(total / perPage),
      },
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[adminListCoupons] Unexpected error:", message);
    return { success: false, error: "Váratlan hiba történt." };
  }
}

export async function adminCreateCoupon(data: {
  code: string;
  discountType: "percentage" | "fixed";
  value: number;
  minOrderAmount?: number;
  maxUses?: number;
  validFrom?: string;
  validUntil?: string;
  isActive: boolean;
}): Promise<ActionResult<{ id: string }>> {
  try {
    const profile = await requireAdmin();

    const parsed = couponCreateSchema.safeParse(data);
    if (!parsed.success) {
      const firstIssue = parsed.error.issues[0];
      return {
        success: false,
        error: firstIssue?.message ?? "Érvénytelen adatok.",
      };
    }

    const input = parsed.data;

    // Additional validation: percentage must be 1-100
    if (input.discountType === "percentage" && input.value > 100) {
      return {
        success: false,
        error: "A százalékos kedvezmény legfeljebb 100% lehet.",
      };
    }

    const admin = createAdminClient();

    const { data: coupon, error } = await admin
      .from("coupons")
      .insert({
        code: input.code,
        discount_type: input.discountType,
        value: input.value,
        min_order_amount: input.minOrderAmount ?? null,
        max_uses: input.maxUses ?? null,
        valid_from: input.validFrom ?? null,
        valid_until: input.validUntil ?? null,
        is_active: input.isActive,
      })
      .select("id")
      .single();

    if (error || !coupon) {
      if (error?.code === "23505") {
        return { success: false, error: "Ez a kuponkód már létezik." };
      }
      console.error("[adminCreateCoupon] Insert error:", error?.message);
      return { success: false, error: "Hiba a kupon létrehozásakor." };
    }

    await logAudit({
      actorId: profile.id,
      actorRole: profile.role,
      action: "coupon.create",
      entityType: "coupon",
      entityId: coupon.id,
      metadata: { code: input.code, discountType: input.discountType, value: input.value },
    });

    return { success: true, data: { id: coupon.id } };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[adminCreateCoupon] Unexpected error:", message);
    return { success: false, error: "Váratlan hiba történt." };
  }
}

export async function adminUpdateCoupon(
  id: string,
  data: {
    code?: string;
    discountType?: "percentage" | "fixed";
    value?: number;
    minOrderAmount?: number | null;
    maxUses?: number | null;
    validFrom?: string | null;
    validUntil?: string | null;
    isActive?: boolean;
  },
): Promise<ActionResult<{ id: string }>> {
  try {
    const profile = await requireAdmin();

    const idParsed = z.string().uuid().safeParse(id);
    if (!idParsed.success) {
      return { success: false, error: "Érvénytelen kupon azonosító." };
    }

    const parsed = couponUpdateSchema.safeParse(data);
    if (!parsed.success) {
      const firstIssue = parsed.error.issues[0];
      return {
        success: false,
        error: firstIssue?.message ?? "Érvénytelen adatok.",
      };
    }

    const input = parsed.data;

    // Additional validation: percentage must be 1-100
    if (input.discountType === "percentage" && input.value !== undefined && input.value > 100) {
      return {
        success: false,
        error: "A százalékos kedvezmény legfeljebb 100% lehet.",
      };
    }

    const admin = createAdminClient();

    const updatePayload: Record<string, unknown> = {};
    if (input.code !== undefined) updatePayload.code = input.code;
    if (input.discountType !== undefined)
      updatePayload.discount_type = input.discountType;
    if (input.value !== undefined) updatePayload.value = input.value;
    if (input.minOrderAmount !== undefined)
      updatePayload.min_order_amount = input.minOrderAmount;
    if (input.maxUses !== undefined) updatePayload.max_uses = input.maxUses;
    if (input.validFrom !== undefined)
      updatePayload.valid_from = input.validFrom;
    if (input.validUntil !== undefined)
      updatePayload.valid_until = input.validUntil;
    if (input.isActive !== undefined) updatePayload.is_active = input.isActive;

    if (Object.keys(updatePayload).length === 0) {
      return { success: false, error: "Nincs frissítendő mező." };
    }

    const { error } = await admin
      .from("coupons")
      .update(updatePayload)
      .eq("id", idParsed.data);

    if (error) {
      if (error.code === "23505") {
        return { success: false, error: "Ez a kuponkód már létezik." };
      }
      console.error("[adminUpdateCoupon] Update error:", error.message);
      return { success: false, error: "Hiba a kupon frissítésekor." };
    }

    await logAudit({
      actorId: profile.id,
      actorRole: profile.role,
      action: "coupon.update",
      entityType: "coupon",
      entityId: idParsed.data,
      metadata: { updatedFields: Object.keys(updatePayload) },
    });

    return { success: true, data: { id: idParsed.data } };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[adminUpdateCoupon] Unexpected error:", message);
    return { success: false, error: "Váratlan hiba történt." };
  }
}

export async function adminDeleteCoupon(
  id: string,
): Promise<ActionResult> {
  try {
    const profile = await requireAdmin();

    const idParsed = z.string().uuid().safeParse(id);
    if (!idParsed.success) {
      return { success: false, error: "Érvénytelen kupon azonosító." };
    }

    const admin = createAdminClient();

    // Soft-delete: deactivate the coupon
    const { error } = await admin
      .from("coupons")
      .update({ is_active: false })
      .eq("id", idParsed.data);

    if (error) {
      console.error("[adminDeleteCoupon] Update error:", error.message);
      return { success: false, error: "Hiba a kupon törlésekor." };
    }

    await logAudit({
      actorId: profile.id,
      actorRole: profile.role,
      action: "coupon.soft_delete",
      entityType: "coupon",
      entityId: idParsed.data,
    });

    return { success: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[adminDeleteCoupon] Unexpected error:", message);
    return { success: false, error: "Váratlan hiba történt." };
  }
}
