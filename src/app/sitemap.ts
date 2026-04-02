import type { MetadataRoute } from "next";
import { createAdminClient } from "@/lib/supabase/admin";
import { siteConfig } from "@/lib/config/site.config";

/* ------------------------------------------------------------------ */
/*  sitemap.xml route handler                                          */
/* ------------------------------------------------------------------ */

// Prevent static prerendering — admin client needs runtime env vars
export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const { siteUrl } = siteConfig.urls;
  const admin = createAdminClient();

  // ── Static pages ─────────────────────────────────────────────────

  const staticPages: MetadataRoute.Sitemap = [
    {
      url: siteUrl,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 1,
    },
    {
      url: `${siteUrl}/products`,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 0.9,
    },
    {
      url: `${siteUrl}/terms`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.3,
    },
    {
      url: `${siteUrl}/privacy`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.3,
    },
    {
      url: `${siteUrl}/shipping-and-returns`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.3,
    },
  ];

  // ── Product pages ────────────────────────────────────────────────

  // Admin client bypasses RLS — MUST filter published_at at app level
  const now = new Date().toISOString();
  const { data: products } = await admin
    .from("products")
    .select("slug, updated_at")
    .eq("is_active", true)
    .or(`published_at.is.null,published_at.lte.${now}`)
    .order("updated_at", { ascending: false })
    .limit(5000);

  const productPages: MetadataRoute.Sitemap = (products ?? []).map((product) => ({
    url: `${siteUrl}/products/${product.slug}`,
    lastModified: product.updated_at ? new Date(product.updated_at) : new Date(),
    changeFrequency: "weekly" as const,
    priority: 0.8,
  }));

  // ── Category filtered pages ──────────────────────────────────────

  const { data: categories } = await admin
    .from("categories")
    .select("slug")
    .eq("is_active", true)
    .limit(500);

  const categoryPages: MetadataRoute.Sitemap = (categories ?? []).map((category) => ({
    url: `${siteUrl}/products?category=${category.slug}`,
    lastModified: new Date(),
    changeFrequency: "weekly" as const,
    priority: 0.7,
  }));

  // ── Blog post pages ──────────────────────────────────────────────

  const { data: posts } = await admin
    .from("posts")
    .select("slug, updated_at")
    .eq("is_published", true)
    .order("published_at", { ascending: false })
    .limit(5000);

  const blogPages: MetadataRoute.Sitemap = [
    {
      url: `${siteUrl}/blog`,
      lastModified: new Date(),
      changeFrequency: "weekly" as const,
      priority: 0.7,
    },
    ...(posts ?? []).map((post) => ({
      url: `${siteUrl}/blog/${post.slug}`,
      lastModified: post.updated_at ? new Date(post.updated_at) : new Date(),
      changeFrequency: "weekly" as const,
      priority: 0.6,
    })),
  ];

  return [...staticPages, ...productPages, ...categoryPages, ...blogPages];
}
