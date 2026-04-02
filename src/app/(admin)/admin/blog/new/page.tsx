"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import { Save, Loader2, ArrowLeft, Eye, EyeOff } from "lucide-react";
import Link from "next/link";
import { adminCreatePost } from "@/lib/actions/blog";
import { SingleImageUpload } from "@/components/admin/image-upload";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { toSlug } from "@/lib/utils/slug";

/* ------------------------------------------------------------------ */
/*  Lazy-load Markdown editor (client-only, avoids SSR issues)         */
/* ------------------------------------------------------------------ */

const MDEditor = dynamic(() => import("@uiw/react-md-editor"), { ssr: false });

/* ------------------------------------------------------------------ */
/*  Admin Blog Create Page                                              */
/* ------------------------------------------------------------------ */

export default function AdminBlogNewPage() {
  const router = useRouter();

  // Form state
  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [slugManual, setSlugManual] = useState(false);
  const [excerpt, setExcerpt] = useState("");
  const [contentMarkdown, setContentMarkdown] = useState("");
  const [coverImageUrl, setCoverImageUrl] = useState("");
  const [isPublished, setIsPublished] = useState(false);
  const [tagsInput, setTagsInput] = useState("");
  const [metaTitle, setMetaTitle] = useState("");
  const [metaDescription, setMetaDescription] = useState("");

  // Submit
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ── Auto-slug from title ──────────────────────────────────────
  function handleTitleChange(value: string) {
    setTitle(value);
    if (!slugManual) {
      setSlug(toSlug(value));
    }
  }

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

    const tags = parseTags(tagsInput);

    const res = await adminCreatePost({
      title,
      slug: slug || undefined,
      excerpt: excerpt || undefined,
      content_html: contentMarkdown,
      cover_image_url: coverImageUrl || null,
      is_published: isPublished,
      tags,
      meta_title: metaTitle || undefined,
      meta_description: metaDescription || undefined,
    });

    if (res.success && res.data) {
      router.push(`/admin/blog/${res.data.id}`);
    } else {
      setError(res.error ?? "Hiba történt a mentés során.");
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* ── Header ──────────────────────────────────────────────── */}
      <div className="flex items-center gap-4">
        <Link href="/admin/blog">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="size-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Új bejegyzés</h1>
          <p className="text-muted-foreground mt-1 text-sm">Hozz létre egy új blog bejegyzést.</p>
        </div>
      </div>

      {/* ── Error ───────────────────────────────────────────────── */}
      {error && (
        <div className="bg-destructive/10 text-destructive rounded-lg p-3 text-sm">{error}</div>
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
                    onChange={(e) => handleTitleChange(e.target.value)}
                    placeholder="Bejegyzés címe"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="slug">Slug</Label>
                  <Input
                    id="slug"
                    value={slug}
                    onChange={(e) => {
                      setSlug(e.target.value);
                      setSlugManual(true);
                    }}
                    placeholder="bejegyzes-cime"
                    className="font-mono text-sm"
                  />
                  <p className="text-muted-foreground text-xs">
                    Automatikusan generálódik a címből. Kézzel is módosítható.
                  </p>
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
                    ? "A bejegyzés mentés után azonnal megjelenik a blogon."
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
              Mégse
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
