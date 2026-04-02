"use server";

/* ------------------------------------------------------------------ */
/*  Blog post server actions (FE-022)                                  */
/*                                                                     */
/*  Public actions: getPublishedPosts, getPostBySlug                   */
/*  Admin actions: adminGetPosts, adminCreatePost, adminUpdatePost,    */
/*    adminDeletePost, adminTogglePostPublished                        */
/* ------------------------------------------------------------------ */

import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdmin, requireAdminOrViewer } from "@/lib/security/roles";
import { logAudit } from "@/lib/security/logger";
import { getPlanGate } from "@/lib/security/plan-gate";
import { siteConfig } from "@/lib/config/site.config";
import { uuidSchema } from "@/lib/validators/uuid";
import {
  postCreateSchema,
  postUpdateSchema,
  postListParamsSchema,
  adminPostListParamsSchema,
} from "@/lib/validators/blog";
import { toSlug } from "@/lib/utils/slug";
import type { PostRow, PostSummary, PostDetail, PostAdmin } from "@/lib/types/database";

// ── Types ──────────────────────────────────────────────────────────

type ActionResult<T = undefined> = {
  success: boolean;
  data?: T;
  error?: string;
};

type PostListData = {
  posts: PostSummary[];
  total: number;
  page: number;
  totalPages: number;
};

type AdminPostListData = {
  posts: PostAdmin[];
  total: number;
  page: number;
  totalPages: number;
};

// ── Helpers ────────────────────────────────────────────────────────

/**
 * Two-tier gate: static feature flag + dynamic plan feature.
 * Returns an error message string if blocked, or null if allowed.
 */
async function checkBlogEnabled(): Promise<string | null> {
  if (!siteConfig.features.enableBlog) {
    return "A blog funkció jelenleg nem elérhető.";
  }

  const gate = await getPlanGate();
  const check = gate.check("enable_blog");
  if (!check.allowed) {
    return check.reason ?? "A blog nem elérhető a jelenlegi csomagban.";
  }

  return null;
}

/**
 * Generate a unique slug. Appends -2, -3 etc. on collision.
 */
async function generateUniqueSlug(baseSlug: string, excludeId?: string): Promise<string> {
  const admin = createAdminClient();
  let slug = baseSlug;
  let attempt = 1;

  for (;;) {
    const query = admin.from("posts").select("id").eq("slug", slug).limit(1);

    if (excludeId) {
      query.neq("id", excludeId);
    }

    const { data } = await query;

    if (!data || data.length === 0) {
      return slug;
    }

    attempt += 1;
    slug = `${baseSlug}-${attempt}`;
  }
}

// ═══════════════════════════════════════════════════════════════════
//  PUBLIC ACTIONS
// ═══════════════════════════════════════════════════════════════════

// ── Get published posts (paginated) ────────────────────────────────

export async function getPublishedPosts(params: {
  page?: number;
  limit?: number;
  tag?: string;
}): Promise<ActionResult<PostListData>> {
  const gateError = await checkBlogEnabled();
  if (gateError) return { success: false, error: gateError };

  const parsed = postListParamsSchema.safeParse(params);
  if (!parsed.success) {
    return { success: false, error: "Érvénytelen paraméterek." };
  }

  const { page, limit, tag } = parsed.data;
  const offset = (page - 1) * limit;
  const admin = createAdminClient();

  // Count total
  let countQuery = admin
    .from("posts")
    .select("id", { count: "exact", head: true })
    .eq("is_published", true);

  if (tag) {
    countQuery = countQuery.contains("tags", [tag]);
  }

  const { count } = await countQuery;
  const total = count ?? 0;
  const totalPages = Math.ceil(total / limit);

  // Fetch posts
  let dataQuery = admin
    .from("posts")
    .select("id, slug, title, excerpt, cover_image_url, published_at, tags, author_id")
    .eq("is_published", true)
    .order("published_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (tag) {
    dataQuery = dataQuery.contains("tags", [tag]);
  }

  const { data: rows, error } = await dataQuery;

  if (error) {
    console.error("[blog] getPublishedPosts error:", error.message);
    return { success: false, error: "Hiba történt a bejegyzések betöltésekor." };
  }

  // Enrich with author names
  const authorIds = [...new Set((rows ?? []).map((r) => r.author_id))];
  let authorMap: Record<string, string> = {};

  if (authorIds.length > 0) {
    const { data: profiles } = await admin
      .from("profiles")
      .select("id, full_name")
      .in("id", authorIds);

    if (profiles) {
      authorMap = Object.fromEntries(
        profiles.map((p) => [p.id, p.full_name ?? "Ismeretlen szerző"]),
      );
    }
  }

  const posts: PostSummary[] = (rows ?? []).map((r) => ({
    id: r.id,
    slug: r.slug,
    title: r.title,
    excerpt: r.excerpt,
    cover_image_url: r.cover_image_url,
    published_at: r.published_at,
    tags: r.tags,
    author_name: authorMap[r.author_id] ?? null,
  }));

  return {
    success: true,
    data: { posts, total, page, totalPages },
  };
}

// ── Get single post by slug (public) ───────────────────────────────

export async function getPostBySlug(slug: string): Promise<ActionResult<PostDetail>> {
  const gateError = await checkBlogEnabled();
  if (gateError) return { success: false, error: gateError };

  if (!slug || typeof slug !== "string") {
    return { success: false, error: "Érvénytelen slug." };
  }

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("posts")
    .select("*")
    .eq("slug", slug)
    .eq("is_published", true)
    .single();

  if (error || !data) {
    return { success: false, error: "A bejegyzés nem található." };
  }

  // Get author name
  const { data: profile } = await admin
    .from("profiles")
    .select("full_name")
    .eq("id", data.author_id)
    .single();

  const post: PostDetail = {
    ...(data as PostRow),
    author_name: profile?.full_name ?? null,
  };

  return { success: true, data: post };
}

// ── Get related posts (same tags, excluding current) ───────────────

export async function getRelatedPosts(
  postId: string,
  tags: string[],
  limit: number = 3,
): Promise<ActionResult<PostSummary[]>> {
  const admin = createAdminClient();

  if (tags.length === 0) {
    return { success: true, data: [] };
  }

  const { data: rows } = await admin
    .from("posts")
    .select("id, slug, title, excerpt, cover_image_url, published_at, tags, author_id")
    .eq("is_published", true)
    .neq("id", postId)
    .overlaps("tags", tags)
    .order("published_at", { ascending: false })
    .limit(limit);

  if (!rows || rows.length === 0) {
    return { success: true, data: [] };
  }

  const authorIds = [...new Set(rows.map((r) => r.author_id))];
  let authorMap: Record<string, string> = {};

  if (authorIds.length > 0) {
    const { data: profiles } = await admin
      .from("profiles")
      .select("id, full_name")
      .in("id", authorIds);

    if (profiles) {
      authorMap = Object.fromEntries(
        profiles.map((p) => [p.id, p.full_name ?? "Ismeretlen szerző"]),
      );
    }
  }

  const posts: PostSummary[] = rows.map((r) => ({
    id: r.id,
    slug: r.slug,
    title: r.title,
    excerpt: r.excerpt,
    cover_image_url: r.cover_image_url,
    published_at: r.published_at,
    tags: r.tags,
    author_name: authorMap[r.author_id] ?? null,
  }));

  return { success: true, data: posts };
}

// ═══════════════════════════════════════════════════════════════════
//  ADMIN ACTIONS
// ═══════════════════════════════════════════════════════════════════

// ── Admin get posts (paginated, filterable) ────────────────────────

export async function adminGetPosts(params: {
  page?: number;
  perPage?: number;
  status?: "all" | "published" | "draft";
  search?: string;
}): Promise<ActionResult<AdminPostListData>> {
  await requireAdminOrViewer();

  const parsed = adminPostListParamsSchema.safeParse(params);
  if (!parsed.success) {
    return { success: false, error: "Érvénytelen paraméterek." };
  }

  const { page, perPage, status, search } = parsed.data;
  const offset = (page - 1) * perPage;
  const admin = createAdminClient();

  // Build count query
  let countQuery = admin.from("posts").select("id", { count: "exact", head: true });

  if (status === "published") countQuery = countQuery.eq("is_published", true);
  if (status === "draft") countQuery = countQuery.eq("is_published", false);
  if (search) countQuery = countQuery.ilike("title", `%${search}%`);

  const { count } = await countQuery;
  const total = count ?? 0;
  const totalPages = Math.ceil(total / perPage);

  // Build data query
  let dataQuery = admin
    .from("posts")
    .select("*, author_id")
    .order("created_at", { ascending: false })
    .range(offset, offset + perPage - 1);

  if (status === "published") dataQuery = dataQuery.eq("is_published", true);
  if (status === "draft") dataQuery = dataQuery.eq("is_published", false);
  if (search) dataQuery = dataQuery.ilike("title", `%${search}%`);

  const { data: rows, error } = await dataQuery;

  if (error) {
    console.error("[blog] adminGetPosts error:", error.message);
    return { success: false, error: "Hiba történt a bejegyzések betöltésekor." };
  }

  // Enrich with author names
  const authorIds = [...new Set((rows ?? []).map((r) => r.author_id))];
  let authorMap: Record<string, string> = {};

  if (authorIds.length > 0) {
    const { data: profiles } = await admin
      .from("profiles")
      .select("id, full_name")
      .in("id", authorIds);

    if (profiles) {
      authorMap = Object.fromEntries(
        profiles.map((p) => [p.id, p.full_name ?? "Ismeretlen szerző"]),
      );
    }
  }

  const posts: PostAdmin[] = (rows ?? []).map((r) => ({
    ...(r as PostRow),
    author_name: authorMap[r.author_id] ?? null,
  }));

  return {
    success: true,
    data: { posts, total, page, totalPages },
  };
}

// ── Admin get single post by ID ────────────────────────────────────

export async function adminGetPost(id: string): Promise<ActionResult<PostAdmin>> {
  await requireAdminOrViewer();

  const idParsed = uuidSchema.safeParse(id);
  if (!idParsed.success) {
    return { success: false, error: "Érvénytelen bejegyzés azonosító." };
  }

  const admin = createAdminClient();
  const { data, error } = await admin.from("posts").select("*").eq("id", idParsed.data).single();

  if (error || !data) {
    return { success: false, error: "A bejegyzés nem található." };
  }

  // Get author name
  const { data: profile } = await admin
    .from("profiles")
    .select("full_name")
    .eq("id", data.author_id)
    .single();

  return {
    success: true,
    data: {
      ...(data as PostRow),
      author_name: profile?.full_name ?? null,
    },
  };
}

// ── Admin create post ──────────────────────────────────────────────

export async function adminCreatePost(input: {
  title: string;
  slug?: string;
  excerpt?: string;
  content_html?: string;
  cover_image_url?: string | null;
  is_published?: boolean;
  tags?: string[];
  meta_title?: string;
  meta_description?: string;
}): Promise<ActionResult<{ id: string }>> {
  const user = await requireAdmin();

  const parsed = postCreateSchema.safeParse({
    ...input,
    slug: input.slug || toSlug(input.title),
  });
  if (!parsed.success) {
    const firstIssue = parsed.error.issues[0];
    return {
      success: false,
      error: firstIssue?.message ?? "Érvénytelen adatok.",
    };
  }

  const data = parsed.data;
  const admin = createAdminClient();

  // Generate unique slug
  const uniqueSlug = await generateUniqueSlug(data.slug);

  // If publishing, set published_at
  const publishedAt = data.is_published ? new Date().toISOString() : null;

  const { data: created, error } = await admin
    .from("posts")
    .insert({
      slug: uniqueSlug,
      title: data.title,
      excerpt: data.excerpt ?? null,
      content_html: data.content_html || "",
      cover_image_url: data.cover_image_url ?? null,
      author_id: user.id,
      is_published: data.is_published,
      published_at: publishedAt,
      tags: data.tags,
      meta_title: data.meta_title ?? null,
      meta_description: data.meta_description ?? null,
    })
    .select("id")
    .single();

  if (error || !created) {
    console.error("[blog] adminCreatePost error:", error?.message);
    return { success: false, error: "Hiba történt a bejegyzés létrehozásakor." };
  }

  await logAudit({
    actorId: user.id,
    actorRole: user.role,
    action: "post.create",
    entityType: "post",
    entityId: created.id,
    metadata: {
      title: data.title,
      slug: uniqueSlug,
      is_published: data.is_published,
    },
  });

  return { success: true, data: { id: created.id } };
}

// ── Admin update post ──────────────────────────────────────────────

export async function adminUpdatePost(
  id: string,
  input: {
    title?: string;
    slug?: string;
    excerpt?: string;
    content_html?: string;
    cover_image_url?: string | null;
    is_published?: boolean;
    tags?: string[];
    meta_title?: string;
    meta_description?: string;
  },
): Promise<ActionResult<{ id: string }>> {
  const user = await requireAdmin();

  const idParsed = uuidSchema.safeParse(id);
  if (!idParsed.success) {
    return { success: false, error: "Érvénytelen bejegyzés azonosító." };
  }

  const parsed = postUpdateSchema.safeParse(input);
  if (!parsed.success) {
    const firstIssue = parsed.error.issues[0];
    return {
      success: false,
      error: firstIssue?.message ?? "Érvénytelen adatok.",
    };
  }

  const data = parsed.data;
  const admin = createAdminClient();

  // Fetch current post to check publish state transitions
  const { data: current } = await admin
    .from("posts")
    .select("is_published, published_at")
    .eq("id", idParsed.data)
    .single();

  if (!current) {
    return { success: false, error: "A bejegyzés nem található." };
  }

  // Build update object
  const updateObj: Record<string, unknown> = {};

  if (data.title !== undefined) updateObj.title = data.title;
  if (data.excerpt !== undefined) updateObj.excerpt = data.excerpt;
  if (data.content_html !== undefined) updateObj.content_html = data.content_html;
  if (data.cover_image_url !== undefined) updateObj.cover_image_url = data.cover_image_url;
  if (data.tags !== undefined) updateObj.tags = data.tags;
  if (data.meta_title !== undefined) updateObj.meta_title = data.meta_title;
  if (data.meta_description !== undefined) updateObj.meta_description = data.meta_description;

  // Handle slug
  if (data.slug !== undefined) {
    const uniqueSlug = await generateUniqueSlug(data.slug, idParsed.data);
    updateObj.slug = uniqueSlug;
  }

  // Handle publish state
  if (data.is_published !== undefined) {
    updateObj.is_published = data.is_published;

    // If transitioning from draft to published, set published_at
    if (data.is_published && !current.is_published) {
      updateObj.published_at = new Date().toISOString();
    }

    // If unpublishing, clear published_at
    if (!data.is_published) {
      updateObj.published_at = null;
    }
  }

  if (Object.keys(updateObj).length === 0) {
    return { success: true, data: { id: idParsed.data } };
  }

  const { error } = await admin.from("posts").update(updateObj).eq("id", idParsed.data);

  if (error) {
    console.error("[blog] adminUpdatePost error:", error.message);
    return { success: false, error: "Hiba történt a bejegyzés mentésekor." };
  }

  await logAudit({
    actorId: user.id,
    actorRole: user.role,
    action: "post.update",
    entityType: "post",
    entityId: idParsed.data,
    metadata: { fields: Object.keys(updateObj) },
  });

  return { success: true, data: { id: idParsed.data } };
}

// ── Admin delete post ──────────────────────────────────────────────

export async function adminDeletePost(id: string): Promise<ActionResult> {
  const user = await requireAdmin();

  const idParsed = uuidSchema.safeParse(id);
  if (!idParsed.success) {
    return { success: false, error: "Érvénytelen bejegyzés azonosító." };
  }

  const admin = createAdminClient();

  // Fetch post for audit log
  const { data: post } = await admin
    .from("posts")
    .select("title, slug, is_published")
    .eq("id", idParsed.data)
    .single();

  if (!post) {
    return { success: false, error: "A bejegyzés nem található." };
  }

  const { error } = await admin.from("posts").delete().eq("id", idParsed.data);

  if (error) {
    console.error("[blog] adminDeletePost error:", error.message);
    return { success: false, error: "Hiba történt a bejegyzés törlésekor." };
  }

  await logAudit({
    actorId: user.id,
    actorRole: user.role,
    action: "post.delete",
    entityType: "post",
    entityId: idParsed.data,
    metadata: {
      title: post.title,
      slug: post.slug,
      was_published: post.is_published,
    },
  });

  return { success: true };
}

// ── Admin toggle post published ────────────────────────────────────

export async function adminTogglePostPublished(
  id: string,
): Promise<ActionResult<{ isPublished: boolean }>> {
  const user = await requireAdmin();

  const idParsed = uuidSchema.safeParse(id);
  if (!idParsed.success) {
    return { success: false, error: "Érvénytelen bejegyzés azonosító." };
  }

  const admin = createAdminClient();

  const { data: current } = await admin
    .from("posts")
    .select("is_published, published_at")
    .eq("id", idParsed.data)
    .single();

  if (!current) {
    return { success: false, error: "A bejegyzés nem található." };
  }

  const newPublished = !current.is_published;
  const updateObj: Record<string, unknown> = {
    is_published: newPublished,
  };

  if (newPublished && !current.published_at) {
    updateObj.published_at = new Date().toISOString();
  }

  if (!newPublished) {
    updateObj.published_at = null;
  }

  const { error } = await admin.from("posts").update(updateObj).eq("id", idParsed.data);

  if (error) {
    return { success: false, error: "Hiba történt a módosítás során." };
  }

  await logAudit({
    actorId: user.id,
    actorRole: user.role,
    action: newPublished ? "post.publish" : "post.unpublish",
    entityType: "post",
    entityId: idParsed.data,
    metadata: {},
  });

  return { success: true, data: { isPublished: newPublished } };
}
