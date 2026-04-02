"use server";

/* ------------------------------------------------------------------ */
/*  Product reviews server actions (FE-010)                            */
/*                                                                     */
/*  Customer actions: submitReview, updateReview, deleteOwnReview,     */
/*    getProductReviews, getUserReviewForProduct                        */
/*  Admin actions: adminGetReviews, adminGetReviewStats,               */
/*    adminModerateReview, adminReplyToReview, adminDeleteReview,       */
/*    adminBulkModerate                                                 */
/* ------------------------------------------------------------------ */

import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdmin, requireAdminOrViewer, getCurrentUser } from "@/lib/security/roles";
import { logAudit } from "@/lib/security/logger";
import { getPlanGate } from "@/lib/security/plan-gate";
import { reviewRateLimiter } from "@/lib/security/rate-limit";
import { siteConfig } from "@/lib/config/site.config";
import { uuidSchema } from "@/lib/validators/uuid";
import {
  reviewSubmitSchema,
  reviewUpdateSchema,
  reviewModerateSchema,
  reviewReplySchema,
  reviewListParamsSchema,
  adminReviewListParamsSchema,
} from "@/lib/validators/review";
import type {
  ReviewRow,
  ReviewWithUser,
  ReviewWithProduct,
  ReviewStats,
  ReviewStatus,
} from "@/lib/types/database";

// ── Types ──────────────────────────────────────────────────────────

type ActionResult<T = undefined> = {
  success: boolean;
  data?: T;
  error?: string;
};

type ReviewListData = {
  reviews: ReviewWithUser[];
  total: number;
  page: number;
  totalPages: number;
};

type AdminReviewListData = {
  reviews: ReviewWithProduct[];
  total: number;
  page: number;
  totalPages: number;
};

// ── Helpers ────────────────────────────────────────────────────────

/**
 * Two-tier gate: static feature flag + dynamic plan feature.
 * Returns an error message string if blocked, or null if allowed.
 */
async function checkReviewsEnabled(): Promise<string | null> {
  // Static feature flag
  if (!siteConfig.features.enableReviews) {
    return "Az értékelések funkció jelenleg nem elérhető.";
  }

  // Dynamic plan gate
  const gate = await getPlanGate();
  const check = gate.check("enable_reviews");
  if (!check.allowed) {
    return check.reason ?? "Az értékelések nem elérhetők a jelenlegi csomagban.";
  }

  return null;
}

// ═══════════════════════════════════════════════════════════════════
//  CUSTOMER ACTIONS
// ═══════════════════════════════════════════════════════════════════

// ── Submit a new review ────────────────────────────────────────────

export async function submitReview(data: {
  productId: string;
  rating: number;
  title?: string;
  body: string;
}): Promise<ActionResult<{ id: string }>> {
  try {
    // Gate check
    const gateError = await checkReviewsEnabled();
    if (gateError) return { success: false, error: gateError };

    // Auth
    const user = await getCurrentUser();
    if (!user) {
      return { success: false, error: "Az értékelés beküldéséhez be kell jelentkezned." };
    }

    // Rate limit
    const rl = reviewRateLimiter.check(user.id);
    if (!rl.success) {
      return { success: false, error: "Túl sok kérés. Kérlek, próbáld újra később." };
    }

    // Validate
    const parsed = reviewSubmitSchema.safeParse(data);
    if (!parsed.success) {
      const firstIssue = parsed.error.issues[0];
      return {
        success: false,
        error: firstIssue?.message ?? "Érvénytelen adatok.",
      };
    }

    const input = parsed.data;
    const admin = createAdminClient();

    // Check product exists and is active
    const { data: product, error: prodError } = await admin
      .from("products")
      .select("id")
      .eq("id", input.productId)
      .eq("is_active", true)
      .single();

    if (prodError || !product) {
      return { success: false, error: "A termék nem található vagy nem elérhető." };
    }

    // Check if user already reviewed this product
    const { data: existingReview } = await admin
      .from("reviews")
      .select("id")
      .eq("product_id", input.productId)
      .eq("user_id", user.id)
      .single();

    if (existingReview) {
      return { success: false, error: "Már írtál értékelést ehhez a termékhez." };
    }

    // Check for verified purchase: user has a shipped order containing this product
    let isVerifiedPurchase = false;
    let verifiedOrderId: string | null = null;

    const { data: orderItems } = await admin
      .from("order_items")
      .select("order_id, orders!inner(id, status, user_id)")
      .eq("product_id", input.productId)
      .eq("orders.user_id", user.id)
      .eq("orders.status", "shipped")
      .limit(1);

    if (orderItems && orderItems.length > 0) {
      isVerifiedPurchase = true;
      const orderItem = orderItems[0] as {
        order_id: string;
        orders: { id: string; status: string; user_id: string };
      };
      verifiedOrderId = orderItem.order_id;
    }

    // Insert review
    const { data: review, error: insertError } = await admin
      .from("reviews")
      .insert({
        product_id: input.productId,
        user_id: user.id,
        order_id: verifiedOrderId,
        rating: input.rating,
        title: input.title ?? null,
        body: input.body,
        status: "pending" as ReviewStatus,
        is_verified_purchase: isVerifiedPurchase,
      })
      .select("id")
      .single();

    if (insertError || !review) {
      if (insertError?.code === "23505") {
        return { success: false, error: "Már írtál értékelést ehhez a termékhez." };
      }
      console.error("[submitReview] Insert error:", insertError?.message);
      return { success: false, error: "Hiba az értékelés mentésekor." };
    }

    await logAudit({
      actorId: user.id,
      actorRole: "customer",
      action: "review.submit",
      entityType: "review",
      entityId: review.id,
      metadata: {
        product_id: input.productId,
        rating: input.rating,
        is_verified_purchase: isVerifiedPurchase,
      },
    });

    return { success: true, data: { id: review.id } };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[submitReview] Unexpected error:", message);
    return { success: false, error: "Váratlan hiba történt." };
  }
}

// ── Update own review ──────────────────────────────────────────────

export async function updateReview(
  reviewId: string,
  data: {
    rating?: number;
    title?: string;
    body?: string;
  },
): Promise<ActionResult> {
  try {
    const gateError = await checkReviewsEnabled();
    if (gateError) return { success: false, error: gateError };

    const user = await getCurrentUser();
    if (!user) {
      return { success: false, error: "Be kell jelentkezned a módosításhoz." };
    }

    const idParsed = uuidSchema.safeParse(reviewId);
    if (!idParsed.success) {
      return { success: false, error: "Érvénytelen értékelés azonosító." };
    }

    const parsed = reviewUpdateSchema.safeParse(data);
    if (!parsed.success) {
      const firstIssue = parsed.error.issues[0];
      return {
        success: false,
        error: firstIssue?.message ?? "Érvénytelen adatok.",
      };
    }

    const input = parsed.data;
    if (Object.keys(input).length === 0) {
      return { success: false, error: "Nincs frissítendő mező." };
    }

    const admin = createAdminClient();

    // Check ownership
    const { data: existing, error: fetchError } = await admin
      .from("reviews")
      .select("id, user_id, status")
      .eq("id", idParsed.data)
      .single();

    if (fetchError || !existing) {
      return { success: false, error: "Az értékelés nem található." };
    }

    if (existing.user_id !== user.id) {
      return { success: false, error: "Csak a saját értékelésed módosíthatod." };
    }

    // Build update payload
    const updatePayload: Record<string, unknown> = {};
    if (input.rating !== undefined) updatePayload.rating = input.rating;
    if (input.title !== undefined) updatePayload.title = input.title;
    if (input.body !== undefined) updatePayload.body = input.body;

    // Editing resets status to pending for re-moderation
    updatePayload.status = "pending";

    const { error: updateError } = await admin
      .from("reviews")
      .update(updatePayload)
      .eq("id", idParsed.data);

    if (updateError) {
      console.error("[updateReview] Update error:", updateError.message);
      return { success: false, error: "Hiba az értékelés frissítésekor." };
    }

    await logAudit({
      actorId: user.id,
      actorRole: "customer",
      action: "review.update",
      entityType: "review",
      entityId: idParsed.data,
      metadata: { updatedFields: Object.keys(input) },
    });

    return { success: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[updateReview] Unexpected error:", message);
    return { success: false, error: "Váratlan hiba történt." };
  }
}

// ── Delete own review ──────────────────────────────────────────────

export async function deleteOwnReview(reviewId: string): Promise<ActionResult> {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return { success: false, error: "Be kell jelentkezned a törléshez." };
    }

    const idParsed = uuidSchema.safeParse(reviewId);
    if (!idParsed.success) {
      return { success: false, error: "Érvénytelen értékelés azonosító." };
    }

    const admin = createAdminClient();

    // Check ownership
    const { data: existing } = await admin
      .from("reviews")
      .select("id, user_id")
      .eq("id", idParsed.data)
      .single();

    if (!existing) {
      return { success: false, error: "Az értékelés nem található." };
    }

    if (existing.user_id !== user.id) {
      return { success: false, error: "Csak a saját értékelésed törölheted." };
    }

    const { error: deleteError } = await admin.from("reviews").delete().eq("id", idParsed.data);

    if (deleteError) {
      console.error("[deleteOwnReview] Delete error:", deleteError.message);
      return { success: false, error: "Hiba az értékelés törlésekor." };
    }

    await logAudit({
      actorId: user.id,
      actorRole: "customer",
      action: "review.delete_own",
      entityType: "review",
      entityId: idParsed.data,
    });

    return { success: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[deleteOwnReview] Unexpected error:", message);
    return { success: false, error: "Váratlan hiba történt." };
  }
}

// ── Get product reviews (public) ───────────────────────────────────

export async function getProductReviews(
  productId: string,
  params: { page?: number; limit?: number; sortBy?: "newest" | "highest" | "lowest" } = {},
): Promise<ActionResult<ReviewListData>> {
  try {
    const idParsed = uuidSchema.safeParse(productId);
    if (!idParsed.success) {
      return { success: false, error: "Érvénytelen termékazonosító." };
    }

    const parsed = reviewListParamsSchema.safeParse(params);
    if (!parsed.success) {
      return { success: false, error: "Érvénytelen szűrő paraméterek." };
    }

    const { page = 1, limit = 10, sortBy = "newest" } = parsed.data;
    const admin = createAdminClient();

    // Build sort
    let orderColumn: string;
    let ascending: boolean;
    switch (sortBy) {
      case "highest":
        orderColumn = "rating";
        ascending = false;
        break;
      case "lowest":
        orderColumn = "rating";
        ascending = true;
        break;
      default:
        orderColumn = "created_at";
        ascending = false;
    }

    // Join with profiles for author_name (FK: reviews_user_id_profiles_fkey)
    const from = (page - 1) * limit;
    const to = from + limit - 1;

    const {
      data: reviews,
      count,
      error,
    } = await admin
      .from("reviews")
      .select(
        `
        *,
        profiles(full_name)
        `,
        { count: "exact" },
      )
      .eq("product_id", idParsed.data)
      .eq("status", "approved")
      .order(orderColumn, { ascending })
      .order("created_at", { ascending: false })
      .range(from, to);

    if (error) {
      console.error("[getProductReviews] DB error:", error.message);
      return { success: false, error: "Hiba az értékelések lekérésekor." };
    }

    const total = count ?? 0;

    // Transform to ReviewWithUser shape
    const mappedReviews: ReviewWithUser[] = (reviews ?? []).map((row) => {
      const { profiles: profileData, ...reviewFields } = row;
      return {
        ...reviewFields,
        author_name: profileData?.full_name ?? null,
      };
    });

    return {
      success: true,
      data: {
        reviews: mappedReviews,
        total,
        page,
        totalPages: Math.ceil(total / limit),
      },
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[getProductReviews] Unexpected error:", message);
    return { success: false, error: "Váratlan hiba történt." };
  }
}

// ── Get user's review for a specific product ───────────────────────

export async function getUserReviewForProduct(
  productId: string,
): Promise<ActionResult<{ review: ReviewRow | null }>> {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return { success: true, data: { review: null } };
    }

    const idParsed = uuidSchema.safeParse(productId);
    if (!idParsed.success) {
      return { success: false, error: "Érvénytelen termékazonosító." };
    }

    const admin = createAdminClient();

    const { data: review, error } = await admin
      .from("reviews")
      .select("*")
      .eq("product_id", idParsed.data)
      .eq("user_id", user.id)
      .maybeSingle();

    if (error) {
      console.error("[getUserReviewForProduct] DB error:", error.message);
      return { success: false, error: "Hiba az értékelés lekérésekor." };
    }

    return { success: true, data: { review } };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[getUserReviewForProduct] Unexpected error:", message);
    return { success: false, error: "Váratlan hiba történt." };
  }
}

// ── Get product review stats ───────────────────────────────────────

export async function getProductReviewStats(
  productId: string,
): Promise<ActionResult<{ stats: ReviewStats | null }>> {
  try {
    const idParsed = uuidSchema.safeParse(productId);
    if (!idParsed.success) {
      return { success: false, error: "Érvénytelen termékazonosító." };
    }

    const admin = createAdminClient();

    const { data: stats, error } = await admin
      .from("product_review_stats")
      .select("*")
      .eq("product_id", idParsed.data)
      .maybeSingle();

    if (error) {
      console.error("[getProductReviewStats] DB error:", error.message);
      return { success: false, error: "Hiba a statisztikák lekérésekor." };
    }

    return { success: true, data: { stats: stats as ReviewStats | null } };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[getProductReviewStats] Unexpected error:", message);
    return { success: false, error: "Váratlan hiba történt." };
  }
}

// ═══════════════════════════════════════════════════════════════════
//  ADMIN ACTIONS
// ═══════════════════════════════════════════════════════════════════

// ── Admin list reviews (with filters) ──────────────────────────────

export async function adminGetReviews(
  filters: {
    page?: number;
    perPage?: number;
    status?: "pending" | "approved" | "rejected";
    search?: string;
  } = {},
): Promise<ActionResult<AdminReviewListData>> {
  try {
    await requireAdminOrViewer();

    const parsed = adminReviewListParamsSchema.safeParse(filters);
    if (!parsed.success) {
      return { success: false, error: "Érvénytelen szűrő paraméterek." };
    }

    const { page = 1, perPage = 20, status, search } = parsed.data;
    const admin = createAdminClient();

    let query = admin
      .from("reviews")
      .select(
        `
        *,
        products!reviews_product_id_fkey(title, slug, main_image_url),
        profiles!reviews_user_id_profiles_fkey(full_name)
        `,
        { count: "exact" },
      )
      .order("created_at", { ascending: false });

    if (status) {
      query = query.eq("status", status);
    }

    if (search) {
      query = query.or(`title.ilike.%${search}%,body.ilike.%${search}%`);
    }

    const from = (page - 1) * perPage;
    const to = from + perPage - 1;
    query = query.range(from, to);

    const { data: reviews, count, error } = await query;

    if (error) {
      console.error("[adminGetReviews] DB error:", error.message);
      return { success: false, error: "Hiba az értékelések lekérésekor." };
    }

    const total = count ?? 0;

    // Transform to ReviewWithProduct shape
    const mappedReviews: ReviewWithProduct[] = (reviews ?? []).map((row) => {
      const { products: productData, profiles: profileData, ...reviewFields } = row;
      return {
        ...reviewFields,
        product_title: productData?.title ?? "Ismeretlen termék",
        product_slug: productData?.slug ?? "",
        product_main_image_url: productData?.main_image_url ?? null,
        author_name: profileData?.full_name ?? null,
      } as ReviewWithProduct;
    });

    return {
      success: true,
      data: {
        reviews: mappedReviews,
        total,
        page,
        totalPages: Math.ceil(total / perPage),
      },
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[adminGetReviews] Unexpected error:", message);
    return { success: false, error: "Váratlan hiba történt." };
  }
}

// ── Admin get review stats overview ────────────────────────────────

export async function adminGetReviewStats(): Promise<
  ActionResult<{
    totalReviews: number;
    pendingCount: number;
    approvedCount: number;
    rejectedCount: number;
  }>
> {
  try {
    await requireAdminOrViewer();

    const admin = createAdminClient();

    // Get counts by status
    const [
      { count: totalCount },
      { count: pendingCount },
      { count: approvedCount },
      { count: rejectedCount },
    ] = await Promise.all([
      admin.from("reviews").select("*", { count: "exact", head: true }),
      admin.from("reviews").select("*", { count: "exact", head: true }).eq("status", "pending"),
      admin.from("reviews").select("*", { count: "exact", head: true }).eq("status", "approved"),
      admin.from("reviews").select("*", { count: "exact", head: true }).eq("status", "rejected"),
    ]);

    return {
      success: true,
      data: {
        totalReviews: totalCount ?? 0,
        pendingCount: pendingCount ?? 0,
        approvedCount: approvedCount ?? 0,
        rejectedCount: rejectedCount ?? 0,
      },
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[adminGetReviewStats] Unexpected error:", message);
    return { success: false, error: "Váratlan hiba történt." };
  }
}

// ── Admin moderate review (approve/reject) ─────────────────────────

export async function adminModerateReview(
  reviewId: string,
  data: { status: "approved" | "rejected" },
): Promise<ActionResult> {
  try {
    const profile = await requireAdmin();

    const idParsed = uuidSchema.safeParse(reviewId);
    if (!idParsed.success) {
      return { success: false, error: "Érvénytelen értékelés azonosító." };
    }

    const parsed = reviewModerateSchema.safeParse(data);
    if (!parsed.success) {
      const firstIssue = parsed.error.issues[0];
      return {
        success: false,
        error: firstIssue?.message ?? "Érvénytelen adatok.",
      };
    }

    const admin = createAdminClient();

    const { error } = await admin
      .from("reviews")
      .update({ status: parsed.data.status })
      .eq("id", idParsed.data);

    if (error) {
      console.error("[adminModerateReview] Update error:", error.message);
      return { success: false, error: "Hiba az értékelés moderálásakor." };
    }

    await logAudit({
      actorId: profile.id,
      actorRole: profile.role,
      action: `review.${parsed.data.status === "approved" ? "approve" : "reject"}`,
      entityType: "review",
      entityId: idParsed.data,
      metadata: { new_status: parsed.data.status },
    });

    return { success: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[adminModerateReview] Unexpected error:", message);
    return { success: false, error: "Váratlan hiba történt." };
  }
}

// ── Admin reply to review ──────────────────────────────────────────

export async function adminReplyToReview(
  reviewId: string,
  data: { reply: string },
): Promise<ActionResult> {
  try {
    const profile = await requireAdmin();

    const idParsed = uuidSchema.safeParse(reviewId);
    if (!idParsed.success) {
      return { success: false, error: "Érvénytelen értékelés azonosító." };
    }

    const parsed = reviewReplySchema.safeParse(data);
    if (!parsed.success) {
      const firstIssue = parsed.error.issues[0];
      return {
        success: false,
        error: firstIssue?.message ?? "Érvénytelen adatok.",
      };
    }

    const admin = createAdminClient();

    const { error } = await admin
      .from("reviews")
      .update({
        admin_reply: parsed.data.reply,
        admin_reply_at: new Date().toISOString(),
      })
      .eq("id", idParsed.data);

    if (error) {
      console.error("[adminReplyToReview] Update error:", error.message);
      return { success: false, error: "Hiba a válasz mentésekor." };
    }

    await logAudit({
      actorId: profile.id,
      actorRole: profile.role,
      action: "review.admin_reply",
      entityType: "review",
      entityId: idParsed.data,
      metadata: { reply_length: parsed.data.reply.length },
    });

    return { success: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[adminReplyToReview] Unexpected error:", message);
    return { success: false, error: "Váratlan hiba történt." };
  }
}

// ── Admin delete review ────────────────────────────────────────────

export async function adminDeleteReview(reviewId: string): Promise<ActionResult> {
  try {
    const profile = await requireAdmin();

    const idParsed = uuidSchema.safeParse(reviewId);
    if (!idParsed.success) {
      return { success: false, error: "Érvénytelen értékelés azonosító." };
    }

    const admin = createAdminClient();

    // Fetch review before deleting for audit trail
    const { data: existing } = await admin
      .from("reviews")
      .select("product_id, user_id, rating")
      .eq("id", idParsed.data)
      .single();

    const { error } = await admin.from("reviews").delete().eq("id", idParsed.data);

    if (error) {
      console.error("[adminDeleteReview] Delete error:", error.message);
      return { success: false, error: "Hiba az értékelés törlésekor." };
    }

    await logAudit({
      actorId: profile.id,
      actorRole: profile.role,
      action: "review.admin_delete",
      entityType: "review",
      entityId: idParsed.data,
      metadata: existing
        ? {
            product_id: existing.product_id,
            user_id: existing.user_id,
            rating: existing.rating,
          }
        : undefined,
    });

    return { success: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[adminDeleteReview] Unexpected error:", message);
    return { success: false, error: "Váratlan hiba történt." };
  }
}

// ── Admin bulk moderate reviews ────────────────────────────────────

const bulkModerateSchema = z.object({
  reviewIds: z.array(uuidSchema).min(1, "Legalább egy értékelést ki kell választani.").max(50),
  status: z.enum(["approved", "rejected"]),
});

export async function adminBulkModerate(data: {
  reviewIds: string[];
  status: "approved" | "rejected";
}): Promise<ActionResult<{ moderated: number }>> {
  try {
    const profile = await requireAdmin();

    const parsed = bulkModerateSchema.safeParse(data);
    if (!parsed.success) {
      const firstIssue = parsed.error.issues[0];
      return {
        success: false,
        error: firstIssue?.message ?? "Érvénytelen adatok.",
      };
    }

    const { reviewIds, status } = parsed.data;
    const admin = createAdminClient();

    const { error, count } = await admin.from("reviews").update({ status }).in("id", reviewIds);

    if (error) {
      console.error("[adminBulkModerate] Update error:", error.message);
      return { success: false, error: "Hiba a tömeges moderálásnál." };
    }

    await logAudit({
      actorId: profile.id,
      actorRole: profile.role,
      action: `review.bulk_${status === "approved" ? "approve" : "reject"}`,
      entityType: "review",
      entityId: null,
      metadata: {
        review_ids: reviewIds,
        count: count ?? reviewIds.length,
        new_status: status,
      },
    });

    return { success: true, data: { moderated: count ?? reviewIds.length } };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[adminBulkModerate] Unexpected error:", message);
    return { success: false, error: "Váratlan hiba történt." };
  }
}
