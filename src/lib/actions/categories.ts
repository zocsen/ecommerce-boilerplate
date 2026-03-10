"use server";

/* ------------------------------------------------------------------ */
/*  Category server actions                                            */
/* ------------------------------------------------------------------ */

import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdmin, requireAdminOrViewer } from "@/lib/security/roles";
import { logAudit } from "@/lib/security/logger";
import { uuidSchema } from "@/lib/validators/uuid";
import type { CategoryRow } from "@/lib/types/database";

// ── Types ──────────────────────────────────────────────────────────

interface ActionResult<T = undefined> {
  success: boolean;
  data?: T;
  error?: string;
}

// ── Validation schemas ─────────────────────────────────────────────

const slugPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

const categoryCreateSchema = z.object({
  slug: z
    .string()
    .min(1, "A slug kötelező")
    .regex(slugPattern, "A slug csak kisbetűket, számokat és kötőjelet tartalmazhat"),
  name: z.string().min(1, "A kategória neve kötelező"),
  parentId: uuidSchema.optional(),
  sortOrder: z.number().int().min(0).optional(),
});

const categoryUpdateSchema = z.object({
  slug: z
    .string()
    .min(1)
    .regex(slugPattern, "A slug csak kisbetűket, számokat és kötőjelet tartalmazhat")
    .optional(),
  name: z.string().min(1).optional(),
  parentId: uuidSchema.nullable().optional(),
  sortOrder: z.number().int().min(0).optional(),
});

// ── Public actions ─────────────────────────────────────────────────

export async function listCategories(): Promise<
  ActionResult<CategoryRow[]>
> {
  try {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from("categories")
      .select("*")
      .eq("is_active", true)
      .order("sort_order", { ascending: true })
      .order("name", { ascending: true });

    if (error) {
      console.error("[listCategories] DB error:", error.message);
      return { success: false, error: "Hiba a kategóriák lekérésekor." };
    }

    return { success: true, data: data ?? [] };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[listCategories] Unexpected error:", message);
    return { success: false, error: "Váratlan hiba történt." };
  }
}

// ── Admin actions ──────────────────────────────────────────────────

/**
 * List ALL categories (including inactive/soft-deleted) for admin view.
 * Uses the admin client to bypass RLS.
 */
export async function adminListCategories(): Promise<
  ActionResult<CategoryRow[]>
> {
  try {
    await requireAdminOrViewer();

    const admin = createAdminClient();

    const { data, error } = await admin
      .from("categories")
      .select("*")
      .order("sort_order", { ascending: true })
      .order("name", { ascending: true });

    if (error) {
      console.error("[adminListCategories] DB error:", error.message);
      return { success: false, error: "Hiba a kategóriák lekérésekor." };
    }

    return { success: true, data: data ?? [] };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[adminListCategories] Unexpected error:", message);
    return { success: false, error: "Váratlan hiba történt." };
  }
}

export async function adminCreateCategory(data: {
  slug: string;
  name: string;
  parentId?: string;
  sortOrder?: number;
}): Promise<ActionResult<{ id: string }>> {
  try {
    const profile = await requireAdmin();

    const parsed = categoryCreateSchema.safeParse(data);
    if (!parsed.success) {
      const firstIssue = parsed.error.issues[0];
      return {
        success: false,
        error: firstIssue?.message ?? "Érvénytelen adatok.",
      };
    }

    const input = parsed.data;
    const admin = createAdminClient();

    // Verify parent exists if provided
    if (input.parentId) {
      const { data: parent } = await admin
        .from("categories")
        .select("id")
        .eq("id", input.parentId)
        .single();

      if (!parent) {
        return { success: false, error: "A szülő kategória nem található." };
      }
    }

    const { data: category, error } = await admin
      .from("categories")
      .insert({
        slug: input.slug,
        name: input.name,
        parent_id: input.parentId ?? null,
        sort_order: input.sortOrder ?? 0,
        is_active: true,
      })
      .select("id")
      .single();

    if (error || !category) {
      if (error?.code === "23505") {
        return { success: false, error: "Ez a slug már foglalt." };
      }
      console.error("[adminCreateCategory] Insert error:", error?.message);
      return { success: false, error: "Hiba a kategória létrehozásakor." };
    }

    await logAudit({
      actorId: profile.id,
      actorRole: profile.role,
      action: "category.create",
      entityType: "category",
      entityId: category.id,
      metadata: { name: input.name, slug: input.slug },
    });

    return { success: true, data: { id: category.id } };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[adminCreateCategory] Unexpected error:", message);
    return { success: false, error: "Váratlan hiba történt." };
  }
}

export async function adminUpdateCategory(
  id: string,
  data: {
    slug?: string;
    name?: string;
    parentId?: string | null;
    sortOrder?: number;
  },
): Promise<ActionResult<{ id: string }>> {
  try {
    const profile = await requireAdmin();

    const idParsed = uuidSchema.safeParse(id);
    if (!idParsed.success) {
      return { success: false, error: "Érvénytelen kategória azonosító." };
    }

    const parsed = categoryUpdateSchema.safeParse(data);
    if (!parsed.success) {
      const firstIssue = parsed.error.issues[0];
      return {
        success: false,
        error: firstIssue?.message ?? "Érvénytelen adatok.",
      };
    }

    const input = parsed.data;
    const admin = createAdminClient();

    // Prevent self-referencing parent
    if (input.parentId === idParsed.data) {
      return {
        success: false,
        error: "A kategória nem lehet saját maga szülője.",
      };
    }

    // Verify parent exists if provided
    if (input.parentId) {
      const { data: parent } = await admin
        .from("categories")
        .select("id")
        .eq("id", input.parentId)
        .single();

      if (!parent) {
        return { success: false, error: "A szülő kategória nem található." };
      }
    }

    const updatePayload: Record<string, unknown> = {};
    if (input.slug !== undefined) updatePayload.slug = input.slug;
    if (input.name !== undefined) updatePayload.name = input.name;
    if (input.parentId !== undefined)
      updatePayload.parent_id = input.parentId;
    if (input.sortOrder !== undefined)
      updatePayload.sort_order = input.sortOrder;

    if (Object.keys(updatePayload).length === 0) {
      return { success: false, error: "Nincs frissítendő mező." };
    }

    const { error } = await admin
      .from("categories")
      .update(updatePayload)
      .eq("id", idParsed.data);

    if (error) {
      if (error.code === "23505") {
        return { success: false, error: "Ez a slug már foglalt." };
      }
      console.error("[adminUpdateCategory] Update error:", error.message);
      return { success: false, error: "Hiba a kategória frissítésekor." };
    }

    await logAudit({
      actorId: profile.id,
      actorRole: profile.role,
      action: "category.update",
      entityType: "category",
      entityId: idParsed.data,
      metadata: { updatedFields: Object.keys(updatePayload) },
    });

    return { success: true, data: { id: idParsed.data } };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[adminUpdateCategory] Unexpected error:", message);
    return { success: false, error: "Váratlan hiba történt." };
  }
}

export async function adminDeleteCategory(
  id: string,
): Promise<ActionResult> {
  try {
    const profile = await requireAdmin();

    const idParsed = uuidSchema.safeParse(id);
    if (!idParsed.success) {
      return { success: false, error: "Érvénytelen kategória azonosító." };
    }

    const admin = createAdminClient();

    // Soft-delete: set is_active = false
    const { error } = await admin
      .from("categories")
      .update({ is_active: false })
      .eq("id", idParsed.data);

    if (error) {
      console.error("[adminDeleteCategory] Update error:", error.message);
      return { success: false, error: "Hiba a kategória törlésekor." };
    }

    await logAudit({
      actorId: profile.id,
      actorRole: profile.role,
      action: "category.soft_delete",
      entityType: "category",
      entityId: idParsed.data,
    });

    return { success: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[adminDeleteCategory] Unexpected error:", message);
    return { success: false, error: "Váratlan hiba történt." };
  }
}

export async function adminToggleCategory(
  id: string,
  isActive: boolean,
): Promise<ActionResult> {
  try {
    const profile = await requireAdmin();

    const idParsed = uuidSchema.safeParse(id);
    if (!idParsed.success) {
      return { success: false, error: "Érvénytelen kategória azonosító." };
    }

    const admin = createAdminClient();

    const { error } = await admin
      .from("categories")
      .update({ is_active: isActive })
      .eq("id", idParsed.data);

    if (error) {
      console.error("[adminToggleCategory] Update error:", error.message);
      return { success: false, error: "Hiba a kategória státuszának módosításakor." };
    }

    await logAudit({
      actorId: profile.id,
      actorRole: profile.role,
      action: isActive ? "category.activate" : "category.deactivate",
      entityType: "category",
      entityId: idParsed.data,
    });

    return { success: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[adminToggleCategory] Unexpected error:", message);
    return { success: false, error: "Váratlan hiba történt." };
  }
}

export async function adminHardDeleteCategory(
  id: string,
): Promise<ActionResult> {
  try {
    const profile = await requireAdmin();

    const idParsed = uuidSchema.safeParse(id);
    if (!idParsed.success) {
      return { success: false, error: "Érvénytelen kategória azonosító." };
    }

    const admin = createAdminClient();

    // Remove category from all products first (product_categories join table)
    const { error: joinError } = await admin
      .from("product_categories")
      .delete()
      .eq("category_id", idParsed.data);

    if (joinError) {
      console.error("[adminHardDeleteCategory] Join delete error:", joinError.message);
      return { success: false, error: "Hiba a kategória törlésének előkészítésekor." };
    }

    // Also clear parent_id references so children become top-level
    await admin
      .from("categories")
      .update({ parent_id: null })
      .eq("parent_id", idParsed.data);

    // Hard-delete the category
    const { error } = await admin
      .from("categories")
      .delete()
      .eq("id", idParsed.data);

    if (error) {
      console.error("[adminHardDeleteCategory] Delete error:", error.message);
      return { success: false, error: "Hiba a kategória törlésekor." };
    }

    await logAudit({
      actorId: profile.id,
      actorRole: profile.role,
      action: "category.hard_delete",
      entityType: "category",
      entityId: idParsed.data,
    });

    return { success: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[adminHardDeleteCategory] Unexpected error:", message);
    return { success: false, error: "Váratlan hiba történt." };
  }
}

export async function adminRestoreCategory(
  id: string,
): Promise<ActionResult> {
  try {
    const profile = await requireAdmin();

    const idParsed = uuidSchema.safeParse(id);
    if (!idParsed.success) {
      return { success: false, error: "Érvénytelen kategória azonosító." };
    }

    const admin = createAdminClient();

    const { error } = await admin
      .from("categories")
      .update({ is_active: true })
      .eq("id", idParsed.data);

    if (error) {
      console.error("[adminRestoreCategory] Update error:", error.message);
      return { success: false, error: "Hiba a kategória visszaállításakor." };
    }

    await logAudit({
      actorId: profile.id,
      actorRole: profile.role,
      action: "category.restore",
      entityType: "category",
      entityId: idParsed.data,
    });

    return { success: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[adminRestoreCategory] Unexpected error:", message);
    return { success: false, error: "Váratlan hiba történt." };
  }
}
