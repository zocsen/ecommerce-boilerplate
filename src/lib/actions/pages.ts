"use server";

/* ------------------------------------------------------------------ */
/*  Shop Pages server actions (FE-023)                                 */
/*                                                                     */
/*  CRUD for structured CMS-like pages (about, etc.).                  */
/*  Public read (published only), admin full CRUD.                     */
/* ------------------------------------------------------------------ */

import "server-only";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdmin, requireAdminOrViewer } from "@/lib/security/roles";
import { logAudit } from "@/lib/security/logger";
import type { AboutUsContent, ShopPageRow } from "@/lib/types/database";

// ── Types ──────────────────────────────────────────────────────────

interface ActionResult<T = undefined> {
  success: boolean;
  data?: T;
  error?: string;
}

// ── Validation schemas ─────────────────────────────────────────────

const pageKeySchema = z
  .string()
  .min(1, "Az oldal kulcs kötelező")
  .max(50, "Az oldal kulcs maximum 50 karakter")
  .regex(
    /^[a-z][a-z0-9_-]*$/,
    "Az oldal kulcs csak kisbetűket, számokat, kötőjelet és aláhúzást tartalmazhat",
  );

const aboutUsHeroSchema = z.object({
  title: z.string().max(200, "A cím maximum 200 karakter").default(""),
  subtitle: z.string().max(500, "Az alcím maximum 500 karakter").default(""),
  imageUrl: z.string().url("Érvénytelen kép URL").nullable().default(null),
});

const aboutUsStorySchema = z.object({
  title: z.string().max(200, "A cím maximum 200 karakter").default(""),
  body: z.string().max(10000, "A szöveg maximum 10 000 karakter").default(""),
});

const aboutUsTeamMemberSchema = z.object({
  name: z.string().min(1, "A név kötelező").max(100, "A név maximum 100 karakter"),
  role: z.string().max(100, "A pozíció maximum 100 karakter").default(""),
  imageUrl: z.string().url("Érvénytelen kép URL").nullable().default(null),
  bio: z.string().max(1000, "A bemutatkozás maximum 1000 karakter").default(""),
});

const aboutUsValueSchema = z.object({
  title: z.string().min(1, "A cím kötelező").max(100, "A cím maximum 100 karakter"),
  description: z.string().max(500, "A leírás maximum 500 karakter").default(""),
  icon: z.string().max(50, "Az ikon neve maximum 50 karakter").default(""),
});

const aboutUsContactSchema = z.object({
  address: z.string().max(300, "A cím maximum 300 karakter").default(""),
  phone: z.string().max(30, "A telefonszám maximum 30 karakter").default(""),
  email: z.string().email("Érvénytelen email cím").or(z.literal("")).default(""),
  mapEmbedUrl: z.string().url("Érvénytelen térkép URL").nullable().default(null),
});

const aboutUsContentSchema = z.object({
  hero: aboutUsHeroSchema,
  story: aboutUsStorySchema,
  team: z.array(aboutUsTeamMemberSchema).max(20, "Maximum 20 csapattag"),
  values: z.array(aboutUsValueSchema).max(12, "Maximum 12 érték"),
  contact: aboutUsContactSchema,
});

// ── Default empty content ──────────────────────────────────────────

const EMPTY_ABOUT_US: AboutUsContent = {
  hero: { title: "", subtitle: "", imageUrl: null },
  story: { title: "", body: "" },
  team: [],
  values: [],
  contact: { address: "", phone: "", email: "", mapEmbedUrl: null },
};

// ── Public actions ─────────────────────────────────────────────────

/**
 * Get published page content by key.
 * Public — fetches via admin client but only returns published pages.
 */
export async function getPageContent(
  pageKey: string,
): Promise<ActionResult<{ content: AboutUsContent; isPublished: boolean }>> {
  const keyParsed = pageKeySchema.safeParse(pageKey);
  if (!keyParsed.success) {
    return { success: false, error: "Érvénytelen oldal kulcs." };
  }

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("shop_pages")
    .select("content, is_published")
    .eq("page_key", keyParsed.data)
    .eq("is_published", true)
    .single();

  if (error || !data) {
    return { success: false, error: "Az oldal nem található." };
  }

  return {
    success: true,
    data: {
      content: (data.content as AboutUsContent) ?? EMPTY_ABOUT_US,
      isPublished: data.is_published,
    },
  };
}

// ── Admin actions ──────────────────────────────────────────────────

/**
 * Get page content for admin (includes unpublished).
 */
export async function adminGetPageContent(
  pageKey: string,
): Promise<ActionResult<{ content: AboutUsContent; isPublished: boolean }>> {
  await requireAdminOrViewer();

  const keyParsed = pageKeySchema.safeParse(pageKey);
  if (!keyParsed.success) {
    return { success: false, error: "Érvénytelen oldal kulcs." };
  }

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("shop_pages")
    .select("content, is_published")
    .eq("page_key", keyParsed.data)
    .single();

  if (error || !data) {
    // No page yet — return empty content
    return {
      success: true,
      data: {
        content: EMPTY_ABOUT_US,
        isPublished: false,
      },
    };
  }

  return {
    success: true,
    data: {
      content: (data.content as AboutUsContent) ?? EMPTY_ABOUT_US,
      isPublished: data.is_published,
    },
  };
}

/**
 * Create or update structured page content.
 * Uses upsert on page_key.
 */
export async function adminUpdatePageContent(
  pageKey: string,
  content: AboutUsContent,
  isPublished: boolean,
): Promise<ActionResult> {
  const user = await requireAdmin();

  const keyParsed = pageKeySchema.safeParse(pageKey);
  if (!keyParsed.success) {
    return { success: false, error: "Érvénytelen oldal kulcs." };
  }

  const contentParsed = aboutUsContentSchema.safeParse(content);
  if (!contentParsed.success) {
    const firstIssue = contentParsed.error.issues[0];
    return {
      success: false,
      error: firstIssue?.message ?? "Érvénytelen tartalom.",
    };
  }

  const admin = createAdminClient();
  const { error } = await admin.from("shop_pages").upsert(
    {
      page_key: keyParsed.data,
      content: contentParsed.data as unknown as Record<string, unknown>,
      is_published: isPublished,
    },
    { onConflict: "page_key" },
  );

  if (error) {
    console.error("[pages] adminUpdatePageContent error:", error.message);
    return { success: false, error: "Hiba történt a mentés során." };
  }

  await logAudit({
    actorId: user.id,
    actorRole: user.role,
    action: "page.update",
    entityType: "shop_page",
    entityId: null,
    metadata: {
      page_key: keyParsed.data,
      is_published: isPublished,
    },
  });

  return { success: true };
}

/**
 * Toggle page published status.
 */
export async function adminTogglePagePublished(
  pageKey: string,
): Promise<ActionResult<{ isPublished: boolean }>> {
  const user = await requireAdmin();

  const keyParsed = pageKeySchema.safeParse(pageKey);
  if (!keyParsed.success) {
    return { success: false, error: "Érvénytelen oldal kulcs." };
  }

  const admin = createAdminClient();

  // Fetch current state
  const { data: current } = await admin
    .from("shop_pages")
    .select("is_published")
    .eq("page_key", keyParsed.data)
    .single();

  if (!current) {
    return { success: false, error: "Az oldal nem található." };
  }

  const newPublished = !current.is_published;

  const { error } = await admin
    .from("shop_pages")
    .update({ is_published: newPublished })
    .eq("page_key", keyParsed.data);

  if (error) {
    return { success: false, error: "Hiba történt a módosítás során." };
  }

  await logAudit({
    actorId: user.id,
    actorRole: user.role,
    action: newPublished ? "page.publish" : "page.unpublish",
    entityType: "shop_page",
    entityId: null,
    metadata: { page_key: keyParsed.data },
  });

  return { success: true, data: { isPublished: newPublished } };
}
