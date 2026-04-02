"use client";

import { useState, useEffect, use } from "react";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import { Save, Loader2, ArrowLeft, Eye, EyeOff, Trash2, ExternalLink } from "lucide-react";
import Link from "next/link";
import { adminGetPost, adminUpdatePost, adminDeletePost } from "@/lib/actions/blog";
import { SingleImageUpload } from "@/components/admin/image-upload";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { formatDateTime } from "@/lib/utils/format";
import type { PostAdmin } from "@/lib/types/database";

/* ------------------------------------------------------------------ */
/*  Lazy-load Markdown editor (client-only, avoids SSR issues)         */
/* ------------------------------------------------------------------ */

const MDEditor = dynamic(() => import("@uiw/react-md-editor"), { ssr: false });

/* ------------------------------------------------------------------ */
/*  Admin Blog Edit Page                                                */
/* ------------------------------------------------------------------ */

export default function AdminBlogEditPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();

  // Post data
  const [post, setPost] = useState<PostAdmin | null>(null);
  const [loadingPost, setLoadingPost] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  // Form state
  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [excerpt, setExcerpt] = useState("");
  const [contentMarkdown, setContentMarkdown] = useState("");
  const [coverImageUrl, setCoverImageUrl] = useState("");
  const [isPublished, setIsPublished] = useState(false);
  const [tagsInput, setTagsInput] = useState("");
  const [metaTitle, setMetaTitle] = useState("");
  const [metaDescription, setMetaDescription] = useState("");

  // Submit
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // ── Load post ─────────────────────────────────────────────────
  useEffect(() => {
    async function load() {
      setLoadingPost(true);
      const res = await adminGetPost(id);
      if (res.success && res.data) {
        const p = res.data;
        setPost(p);
        setTitle(p.title);
        setSlug(p.slug);
        setExcerpt(p.excerpt ?? "");
        setContentMarkdown(p.content_html ?? "");
        setCoverImageUrl(p.cover_image_url ?? "");
        setIsPublished(p.is_published);
        setTagsInput((p.tags ?? []).join(", "));
        setMetaTitle(p.meta_title ?? "");
        setMetaDescription(p.meta_description ?? "");
      } else {
        setLoadError(res.error ?? "A bejegyzés nem található.");
      }
      setLoadingPost(false);
    }
    load();
  }, [id]);

  // ── Tags parsing ──────────────────────────────────────────────
  function parseTags(input: string): string[] {
    return input
      .split(",")
      .map((t) => t.trim())
      .filter((t) => t.length > 0);
  }

  // ── Submit ────────────────────────────────────────────────────
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSuccess(false);

    const tags = parseTags(tagsInput);

    const res = await adminUpdatePost(id, {
      title,
      slug,
      excerpt: excerpt || undefined,
      content_html: contentMarkdown,
      cover_image_url: coverImageUrl || null,
      is_published: isPublished,
      tags,
      meta_title: metaTitle || undefined,
      meta_description: metaDescription || undefined,
    });

    if (res.success) {
      setSuccess(true);
      // Update local post state
      setPost((prev) =>
        prev
          ? {
              ...prev,
              title,
              slug,
              excerpt: excerpt || null,
              content_html: contentMarkdown,
              cover_image_url: coverImageUrl || null,
              is_published: isPublished,
              tags,
              meta_title: metaTitle || null,
              meta_description: metaDescription || null,
            }
          : null,
      );
      setTimeout(() => setSuccess(false), 3000);
    } else {
      setError(res.error ?? "Hiba történt a mentés során.");
    }
    setSaving(false);
  }

  // ── Delete ────────────────────────────────────────────────────
  async function handleDelete() {
    if (
      !confirm(
        `Biztosan törölni szeretnéd a(z) "${title}" bejegyzést? Ez a művelet nem vonható vissza.`,
      )
    ) {
      return;
    }

    setDeleting(true);
    setError(null);
    const res = await adminDeletePost(id);
    if (res.success) {
      router.push("/admin/blog");
    } else {
      setError(res.error ?? "Hiba történt a törlés során.");
      setDeleting(false);
    }
  }

  // ── Loading state ─────────────────────────────────────────────
  if (loadingPost) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="text-muted-foreground size-8 animate-spin" />
      </div>
    );
  }

  if (loadError || !post) {
    return (
      <div className="space-y-4 py-12 text-center">
        <p className="text-destructive">{loadError ?? "A bejegyzés nem található."}</p>
        <Link href="/admin/blog">
          <Button variant="outline">Vissza a listához</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* ── Header ──────────────────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/admin/blog">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="size-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Bejegyzés szerkesztése</h1>
            <div className="text-muted-foreground mt-1 flex items-center gap-2 text-sm">
              <span>Létrehozva: {formatDateTime(post.created_at)}</span>
              {post.is_published ? (
                <Badge variant="default">Publikált</Badge>
              ) : (
                <Badge variant="secondary">Vázlat</Badge>
              )}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {post.is_published && (
            <Link href={`/blog/${post.slug}`} target="_blank">
              <Button variant="outline" size="sm">
                <ExternalLink className="mr-2 size-4" />
                Megtekintés
              </Button>
            </Link>
          )}
          <Button variant="destructive" size="sm" onClick={handleDelete} disabled={deleting}>
            {deleting ? (
              <Loader2 className="mr-2 size-4 animate-spin" />
            ) : (
              <Trash2 className="mr-2 size-4" />
            )}
            Törlés
          </Button>
        </div>
      </div>

      {/* ── Messages ────────────────────────────────────────────── */}
      {error && (
        <div className="bg-destructive/10 text-destructive rounded-lg p-3 text-sm">{error}</div>
      )}
      {success && (
        <div className="rounded-lg bg-green-50 p-3 text-sm text-green-800 dark:bg-green-950 dark:text-green-200">
          A bejegyzés sikeresen mentve.
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid gap-6 lg:grid-cols-3">
          {/* ── Main content (2/3) ──────────────────────────────── */}
          <div className="space-y-6 lg:col-span-2">
            {/* Title & Slug */}
            <Card>
              <CardHeader>
                <CardTitle>Alapadatok</CardTitle>
                <CardDescription>A bejegyzés címe és URL slug-ja.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="title">Cím *</Label>
                  <Input
                    id="title"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Bejegyzés címe"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="slug">Slug</Label>
                  <Input
                    id="slug"
                    value={slug}
                    onChange={(e) => setSlug(e.target.value)}
                    placeholder="bejegyzes-cime"
                    className="font-mono text-sm"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="excerpt">Kivonat</Label>
                  <textarea
                    id="excerpt"
                    value={excerpt}
                    onChange={(e) => setExcerpt(e.target.value)}
                    placeholder="Rövid összefoglaló (max 1000 karakter)"
                    rows={3}
                    maxLength={1000}
                    className="border-input bg-background placeholder:text-muted-foreground focus-visible:ring-ring w-full rounded-md border px-3 py-2 text-sm focus-visible:ring-1 focus-visible:outline-none"
                  />
                </div>
              </CardContent>
            </Card>

            {/* Content */}
            <Card>
              <CardHeader>
                <CardTitle>Tartalom</CardTitle>
                <CardDescription>Markdown szerkesztő a bejegyzés tartalmához.</CardDescription>
              </CardHeader>
              <CardContent>
                <div data-color-mode="light">
                  <MDEditor
                    value={contentMarkdown}
                    onChange={(val) => setContentMarkdown(val ?? "")}
                    height={500}
                    preview="live"
                  />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* ── Sidebar (1/3) ───────────────────────────────────── */}
          <div className="space-y-6">
            {/* Publish */}
            <Card>
              <CardHeader>
                <CardTitle>Publikálás</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <Button
                  type="button"
                  variant={isPublished ? "default" : "outline"}
                  className="w-full"
                  onClick={() => setIsPublished(!isPublished)}
                >
                  {isPublished ? (
                    <>
                      <Eye className="mr-2 size-4" />
                      Publikálva
                    </>
                  ) : (
                    <>
                      <EyeOff className="mr-2 size-4" />
                      Vázlat
                    </>
                  )}
                </Button>
                <p className="text-muted-foreground text-xs">
                  {isPublished
                    ? "A bejegyzés mentés után megjelenik a blogon."
                    : "A bejegyzés vázlatként mentődik, csak az adminban látható."}
                </p>
              </CardContent>
            </Card>

            {/* Cover image */}
            <Card>
              <CardHeader>
                <CardTitle>Borítókép</CardTitle>
              </CardHeader>
              <CardContent>
                <SingleImageUpload
                  value={coverImageUrl}
                  onChange={setCoverImageUrl}
                  onRemove={() => setCoverImageUrl("")}
                />
              </CardContent>
            </Card>

            {/* Tags */}
            <Card>
              <CardHeader>
                <CardTitle>Címkék</CardTitle>
                <CardDescription>
                  Vesszővel elválasztva (pl. &bdquo;hírek, akció&rdquo;)
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Input
                  value={tagsInput}
                  onChange={(e) => setTagsInput(e.target.value)}
                  placeholder="hírek, akció, újdonság"
                />
              </CardContent>
            </Card>

            {/* SEO */}
            <Card>
              <CardHeader>
                <CardTitle>SEO</CardTitle>
                <CardDescription>Keresőoptimalizálási beállítások.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="metaTitle">Meta cím</Label>
                  <Input
                    id="metaTitle"
                    value={metaTitle}
                    onChange={(e) => setMetaTitle(e.target.value)}
                    placeholder="Egyedi meta cím (opcionális)"
                    maxLength={200}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="metaDescription">Meta leírás</Label>
                  <textarea
                    id="metaDescription"
                    value={metaDescription}
                    onChange={(e) => setMetaDescription(e.target.value)}
                    placeholder="Egyedi meta leírás (opcionális)"
                    rows={3}
                    maxLength={500}
                    className="border-input bg-background placeholder:text-muted-foreground focus-visible:ring-ring w-full rounded-md border px-3 py-2 text-sm focus-visible:ring-1 focus-visible:outline-none"
                  />
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* ── Submit ─────────────────────────────────────────────── */}
        <div className="flex justify-end gap-3">
          <Link href="/admin/blog">
            <Button variant="outline" type="button">
              Vissza
            </Button>
          </Link>
          <Button type="submit" disabled={saving || !title.trim()}>
            {saving ? (
              <Loader2 className="mr-2 size-4 animate-spin" />
            ) : (
              <Save className="mr-2 size-4" />
            )}
            Mentés
          </Button>
        </div>
      </form>
    </div>
  );
}
