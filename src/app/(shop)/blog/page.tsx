import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { getPublishedPosts } from "@/lib/actions/blog";
import { Breadcrumbs } from "@/components/shared/breadcrumbs";
import { formatDate } from "@/lib/utils/format";
import { Badge } from "@/components/ui/badge";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationPrevious,
  PaginationNext,
} from "@/components/ui/pagination";

/* ------------------------------------------------------------------ */
/*  Public blog listing page (server component)                        */
/* ------------------------------------------------------------------ */

export const metadata: Metadata = {
  title: "Blog",
  description: "Olvasd legfrissebb bejegyzéseinket — hírek, tippek és inspiráció.",
};

interface BlogPageProps {
  searchParams: Promise<{
    page?: string;
    tag?: string;
  }>;
}

export default async function BlogPage({ searchParams }: BlogPageProps) {
  const params = await searchParams;
  const page = params.page ? Number(params.page) : 1;
  const tag = params.tag ?? undefined;

  const result = await getPublishedPosts({ page, limit: 6, tag });

  const posts = result.data?.posts ?? [];
  const totalPages = result.data?.totalPages ?? 0;
  const currentPage = result.data?.page ?? 1;

  // Build search params string for pagination links
  function pageHref(p: number): string {
    const sp = new URLSearchParams();
    if (p > 1) sp.set("page", String(p));
    if (tag) sp.set("tag", tag);
    const qs = sp.toString();
    return `/blog${qs ? `?${qs}` : ""}`;
  }

  return (
    <div className="mx-auto w-full max-w-7xl px-6 py-12 lg:px-8">
      {/* ── Breadcrumbs ─────────────────────────────────────────── */}
      <div className="mb-8">
        <Breadcrumbs
          items={[
            { label: "Blog" },
            ...(tag ? [{ label: `#${tag}`, href: `/blog?tag=${tag}` }] : []),
          ]}
        />
      </div>

      {/* ── Header ──────────────────────────────────────────────── */}
      <div className="mb-12">
        <h1 className="text-4xl font-semibold tracking-[-0.04em] lg:text-5xl">Blog</h1>
        <p className="text-muted-foreground mt-3 max-w-xl text-lg">
          Hírek, tippek és inspiráció a mindennapokhoz.
        </p>
        {tag && (
          <div className="mt-4 flex items-center gap-2">
            <Badge variant="secondary" className="text-sm">
              #{tag}
            </Badge>
            <Link
              href="/blog"
              className="text-muted-foreground hover:text-foreground text-sm transition-colors duration-300"
            >
              Szűrő törlése
            </Link>
          </div>
        )}
      </div>

      {/* ── Posts grid ──────────────────────────────────────────── */}
      {posts.length === 0 ? (
        <div className="text-muted-foreground py-24 text-center">
          {tag ? `Nem található bejegyzés a „${tag}" címkével.` : "Még nincs blog bejegyzés."}
        </div>
      ) : (
        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
          {posts.map((post) => (
            <article
              key={post.id}
              className="group flex flex-col overflow-hidden rounded-lg border transition-all duration-500 ease-out hover:scale-[1.02]"
            >
              {/* Cover image */}
              <Link href={`/blog/${post.slug}`} className="relative aspect-[16/9] overflow-hidden">
                {post.cover_image_url ? (
                  <Image
                    src={post.cover_image_url}
                    alt={post.title}
                    fill
                    className="object-cover transition-transform duration-700 ease-out group-hover:scale-105"
                    sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                  />
                ) : (
                  <div className="bg-muted flex size-full items-center justify-center">
                    <span className="text-muted-foreground text-4xl font-light tracking-tight">
                      {post.title.charAt(0)}
                    </span>
                  </div>
                )}
              </Link>

              {/* Content */}
              <div className="flex flex-1 flex-col gap-3 p-5">
                {/* Tags */}
                {post.tags && post.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {post.tags.slice(0, 3).map((t) => (
                      <Link key={t} href={`/blog?tag=${t}`}>
                        <Badge
                          variant="secondary"
                          className="hover:bg-foreground hover:text-background text-[11px] transition-colors duration-300"
                        >
                          {t}
                        </Badge>
                      </Link>
                    ))}
                  </div>
                )}

                {/* Title */}
                <Link href={`/blog/${post.slug}`}>
                  <h2 className="text-lg font-semibold tracking-tight transition-colors duration-300 group-hover:underline">
                    {post.title}
                  </h2>
                </Link>

                {/* Excerpt */}
                {post.excerpt && (
                  <p className="text-muted-foreground line-clamp-3 text-sm leading-relaxed">
                    {post.excerpt}
                  </p>
                )}

                {/* Meta */}
                <div className="text-muted-foreground mt-auto flex items-center gap-3 pt-3 text-xs">
                  {post.published_at && <time>{formatDate(post.published_at)}</time>}
                  {post.author_name && (
                    <>
                      <span className="text-border">|</span>
                      <span>{post.author_name}</span>
                    </>
                  )}
                </div>
              </div>
            </article>
          ))}
        </div>
      )}

      {/* ── Pagination ──────────────────────────────────────────── */}
      {totalPages > 1 && (
        <div className="mt-12 flex justify-center">
          <Pagination>
            <PaginationContent>
              {currentPage > 1 && (
                <PaginationItem>
                  <PaginationPrevious href={pageHref(currentPage - 1)} />
                </PaginationItem>
              )}

              {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                <PaginationItem key={p}>
                  <PaginationLink href={pageHref(p)} isActive={p === currentPage}>
                    {p}
                  </PaginationLink>
                </PaginationItem>
              ))}

              {currentPage < totalPages && (
                <PaginationItem>
                  <PaginationNext href={pageHref(currentPage + 1)} />
                </PaginationItem>
              )}
            </PaginationContent>
          </Pagination>
        </div>
      )}
    </div>
  );
}
