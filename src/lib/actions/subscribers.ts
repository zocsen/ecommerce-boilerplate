"use server";

/* ------------------------------------------------------------------ */
/*  Newsletter subscriber server actions                               */
/* ------------------------------------------------------------------ */

import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdmin, requireAdminOrViewer } from "@/lib/security/roles";
import { logAudit } from "@/lib/security/logger";
import { subscribeRateLimiter } from "@/lib/security/rate-limit";
import { subscribeSchema, tagSchema } from "@/lib/validators/subscriber";
import type { SubscriberRow } from "@/lib/types/database";
import { headers } from "next/headers";

// ── Types ──────────────────────────────────────────────────────────

interface ActionResult<T = undefined> {
  success: boolean;
  data?: T;
  error?: string;
}

interface SubscriberListData {
  subscribers: SubscriberRow[];
  total: number;
  page: number;
  totalPages: number;
}

// ── Validation schemas ─────────────────────────────────────────────

const adminListSchema = z.object({
  search: z.string().optional(),
  status: z.string().optional(),
  tag: z.string().optional(),
  page: z.number().int().min(1).optional(),
  perPage: z.number().int().min(1).max(100).optional(),
});

// ── Helpers ────────────────────────────────────────────────────────

async function getClientIp(): Promise<string> {
  const headersList = await headers();
  const forwarded = headersList.get("x-forwarded-for");
  if (forwarded) {
    return forwarded.split(",")[0]?.trim() ?? "unknown";
  }
  return headersList.get("x-real-ip") ?? "unknown";
}

// ── Public actions ─────────────────────────────────────────────────

export async function subscribe(
  email: string,
  source?: string,
): Promise<ActionResult> {
  try {
    // Rate limiting
    const ip = await getClientIp();
    const rateLimitResult = subscribeRateLimiter.check(ip);

    if (!rateLimitResult.success) {
      return {
        success: false,
        error: "Túl sok kérés. Kérjük, próbálja újra később.",
      };
    }

    // Validate email
    const parsed = subscribeSchema.safeParse({ email });
    if (!parsed.success) {
      const firstIssue = parsed.error.issues[0];
      return {
        success: false,
        error: firstIssue?.message ?? "Érvénytelen e-mail cím.",
      };
    }

    const admin = createAdminClient();

    // Upsert subscriber — if already exists, resubscribe
    const { data: existing } = await admin
      .from("subscribers")
      .select("id, status")
      .eq("email", parsed.data.email)
      .single();

    if (existing) {
      if (existing.status === "subscribed") {
        // Already subscribed — treat as success (idempotent)
        return { success: true };
      }

      // Re-subscribe
      const { error } = await admin
        .from("subscribers")
        .update({
          status: "subscribed",
          unsubscribed_at: null,
          source: source ?? null,
        })
        .eq("id", existing.id);

      if (error) {
        console.error("[subscribe] Update error:", error.message);
        return { success: false, error: "Hiba a feliratkozáskor." };
      }

      return { success: true };
    }

    // New subscriber
    const { error } = await admin.from("subscribers").insert({
      email: parsed.data.email,
      status: "subscribed",
      source: source ?? null,
      tags: [],
    });

    if (error) {
      if (error.code === "23505") {
        // Race condition — already exists, treat as success
        return { success: true };
      }
      console.error("[subscribe] Insert error:", error.message);
      return { success: false, error: "Hiba a feliratkozáskor." };
    }

    return { success: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[subscribe] Unexpected error:", message);
    return { success: false, error: "Váratlan hiba történt." };
  }
}

export async function unsubscribe(
  email: string,
): Promise<ActionResult> {
  try {
    const parsed = z.string().email().safeParse(email);
    if (!parsed.success) {
      return { success: false, error: "Érvénytelen e-mail cím." };
    }

    const admin = createAdminClient();

    const { error } = await admin
      .from("subscribers")
      .update({
        status: "unsubscribed" as const,
        unsubscribed_at: new Date().toISOString(),
      })
      .eq("email", parsed.data);

    if (error) {
      console.error("[unsubscribe] Update error:", error.message);
      return { success: false, error: "Hiba a leiratkozáskor." };
    }

    return { success: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[unsubscribe] Unexpected error:", message);
    return { success: false, error: "Váratlan hiba történt." };
  }
}

// ── Admin actions ──────────────────────────────────────────────────

export async function adminListSubscribers(filters: {
  search?: string;
  status?: string;
  tag?: string;
  page?: number;
  perPage?: number;
} = {}): Promise<ActionResult<SubscriberListData>> {
  try {
    await requireAdminOrViewer();

    const parsed = adminListSchema.safeParse(filters);
    if (!parsed.success) {
      return { success: false, error: "Érvénytelen szűrő paraméterek." };
    }

    const {
      search,
      status,
      tag,
      page = 1,
      perPage = 20,
    } = parsed.data;

    const admin = createAdminClient();

    let query = admin
      .from("subscribers")
      .select("*", { count: "exact" })
      .order("created_at", { ascending: false });

    if (search) {
      query = query.ilike("email", `%${search}%`);
    }

    if (status) {
      query = query.eq("status", status as SubscriberRow["status"]);
    }

    if (tag) {
      query = query.contains("tags", [tag]);
    }

    const from = (page - 1) * perPage;
    const to = from + perPage - 1;
    query = query.range(from, to);

    const { data: subscribers, count, error } = await query;

    if (error) {
      console.error("[adminListSubscribers] DB error:", error.message);
      return {
        success: false,
        error: "Hiba a feliratkozók lekérésekor.",
      };
    }

    const total = count ?? 0;

    return {
      success: true,
      data: {
        subscribers: subscribers ?? [],
        total,
        page,
        totalPages: Math.ceil(total / perPage),
      },
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[adminListSubscribers] Unexpected error:", message);
    return { success: false, error: "Váratlan hiba történt." };
  }
}

export async function adminTagSubscriber(
  email: string,
  tags: string[],
): Promise<ActionResult> {
  try {
    const profile = await requireAdmin();

    const parsed = tagSchema.safeParse({ email, tags });
    if (!parsed.success) {
      const firstIssue = parsed.error.issues[0];
      return {
        success: false,
        error: firstIssue?.message ?? "Érvénytelen adatok.",
      };
    }

    const admin = createAdminClient();

    // Fetch current subscriber
    const { data: subscriber } = await admin
      .from("subscribers")
      .select("id, tags")
      .eq("email", parsed.data.email)
      .single();

    if (!subscriber) {
      return { success: false, error: "A feliratkozó nem található." };
    }

    // Merge tags (deduplicate)
    const mergedTags = [...new Set([...subscriber.tags, ...parsed.data.tags])];

    const { error } = await admin
      .from("subscribers")
      .update({ tags: mergedTags })
      .eq("id", subscriber.id);

    if (error) {
      console.error("[adminTagSubscriber] Update error:", error.message);
      return { success: false, error: "Hiba a címkék frissítésekor." };
    }

    await logAudit({
      actorId: profile.id,
      actorRole: profile.role,
      action: "subscriber.tag",
      entityType: "subscriber",
      entityId: subscriber.id,
      metadata: { email: parsed.data.email, addedTags: parsed.data.tags },
    });

    return { success: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[adminTagSubscriber] Unexpected error:", message);
    return { success: false, error: "Váratlan hiba történt." };
  }
}

/**
 * Fetch ALL active subscriber emails, paginating through every page.
 * Used by the campaign builder to send to all subscribers (or filtered by tag).
 * Returns up to 10,000 emails max as a safety limit.
 */
export async function adminGetAllActiveSubscriberEmails(
  tag?: string,
): Promise<ActionResult<{ emails: string[]; total: number }>> {
  try {
    await requireAdmin();

    const admin = createAdminClient();
    const PAGE_SIZE = 1000;
    const MAX_EMAILS = 10000;
    const allEmails: string[] = [];
    let offset = 0;
    let hasMore = true;

    while (hasMore && allEmails.length < MAX_EMAILS) {
      let query = admin
        .from("subscribers")
        .select("email")
        .eq("status", "subscribed")
        .range(offset, offset + PAGE_SIZE - 1);

      if (tag) {
        query = query.contains("tags", [tag]);
      }

      const { data, error } = await query;

      if (error) {
        console.error(
          "[adminGetAllActiveSubscriberEmails] DB error:",
          error.message,
        );
        return {
          success: false,
          error: "Hiba a feliratkozók lekérésekor.",
        };
      }

      if (!data || data.length === 0) {
        hasMore = false;
      } else {
        allEmails.push(...data.map((s) => s.email));
        offset += PAGE_SIZE;
        if (data.length < PAGE_SIZE) {
          hasMore = false;
        }
      }
    }

    return {
      success: true,
      data: { emails: allEmails, total: allEmails.length },
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(
      "[adminGetAllActiveSubscriberEmails] Unexpected error:",
      message,
    );
    return { success: false, error: "Váratlan hiba történt." };
  }
}

/**
 * Fetch all unique tags across all subscribers.
 * Used by the campaign builder for segment selection.
 */
export async function adminGetAllTags(): Promise<ActionResult<string[]>> {
  try {
    await requireAdminOrViewer();

    const admin = createAdminClient();

    // Fetch all distinct tags — Supabase doesn't support DISTINCT on array
    // elements directly, so we fetch all tags arrays and deduplicate in JS.
    // For large subscriber counts this should be replaced with a DB function.
    const { data, error } = await admin
      .from("subscribers")
      .select("tags")
      .not("tags", "eq", "{}");

    if (error) {
      console.error("[adminGetAllTags] DB error:", error.message);
      return { success: false, error: "Hiba a címkék lekérésekor." };
    }

    const allTags = new Set<string>();
    for (const row of data ?? []) {
      for (const tag of row.tags) {
        allTags.add(tag);
      }
    }

    return {
      success: true,
      data: [...allTags].sort(),
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[adminGetAllTags] Unexpected error:", message);
    return { success: false, error: "Váratlan hiba történt." };
  }
}
