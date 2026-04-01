"use server";

/* ------------------------------------------------------------------ */
/*  Audit log server actions                                           */
/* ------------------------------------------------------------------ */

import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdmin } from "@/lib/security/roles";
import type { AuditLogRow } from "@/lib/types/database";

// ── Types ──────────────────────────────────────────────────────────

interface ActionResult<T = undefined> {
  success: boolean;
  data?: T;
  error?: string;
}

interface AuditLogListData {
  logs: AuditLogRow[];
  total: number;
  page: number;
  totalPages: number;
}

// ── Validation schemas ─────────────────────────────────────────────

const filtersSchema = z.object({
  page: z.number().int().min(1).optional(),
  perPage: z.number().int().min(1).max(100).optional(),
  entityType: z.string().optional(),
  action: z.string().optional(),
});

// ── Admin actions ──────────────────────────────────────────────────

export async function adminListAuditLogs(
  filters: {
    page?: number;
    perPage?: number;
    entityType?: string;
    action?: string;
  } = {},
): Promise<ActionResult<AuditLogListData>> {
  try {
    await requireAdmin();

    const parsed = filtersSchema.safeParse(filters);
    if (!parsed.success) {
      return { success: false, error: "Érvénytelen szűrő paraméterek." };
    }

    const { page = 1, perPage = 30, entityType, action } = parsed.data;

    const admin = createAdminClient();

    let query = admin
      .from("audit_logs")
      .select("*", { count: "exact" })
      .order("created_at", { ascending: false });

    if (entityType) {
      query = query.eq("entity_type", entityType);
    }

    if (action) {
      query = query.eq("action", action);
    }

    const from = (page - 1) * perPage;
    const to = from + perPage - 1;
    query = query.range(from, to);

    const { data: logs, count, error } = await query;

    if (error) {
      console.error("[adminListAuditLogs] DB error:", error.message);
      return { success: false, error: "Hiba az audit napló lekérésekor." };
    }

    const total = count ?? 0;

    return {
      success: true,
      data: {
        logs: logs ?? [],
        total,
        page,
        totalPages: Math.ceil(total / perPage),
      },
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[adminListAuditLogs] Unexpected error:", message);
    return { success: false, error: "Váratlan hiba történt." };
  }
}
