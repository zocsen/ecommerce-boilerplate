import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { getPostBySlug, getRelatedPosts } from "@/lib/actions/blog";
import { siteConfig } from "@/lib/config/site.config";
import { Breadcrumbs } from "@/components/shared/breadcrumbs";
import { formatDate } from "@/lib/utils/format";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";

/* ------------------------------------------------------------------ */
/*  Blog post detail page (server component)                           */
/* ------------------------------------------------------------------ */

interface BlogPostPageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: BlogPostPageProps): Promise<Metadata> {
  const { slug } = await params;
  const result = await getPostBySlug(slug);

  if (!result.success || !result.data) {
    return { title: "Bejegyzés nem található" };
  }

  const post = result.data;
  const title = post.meta_title || post.title;
  const description =
    post.meta_description || post.excerpt || `${post.title} — ${siteConfig.branding.logoText}`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      images: post.cover_image_url
        ? [{ url: post.cover_image_url, width: 1200, height: 630 }]
        : undefined,
      type: "article",
      publishedTime: post.published_at ?? undefined,
    },
  };
}

export default async function BlogPostPage({ params }: BlogPostPageProps) {
  const { slug } = await params;
  const result = await getPostBySlug(slug);

  if (!result.success || !result.data) {
    notFound();
  }

  const post = result.data;

  // Fetch related posts
  const relatedResult = await getRelatedPosts(post.id, post.tags ?? [], 3);
  const relatedPosts = relatedResult.data ?? [];

  return (
    <article className="mx-auto w-full max-w-7xl px-6 py-12 lg:px-8">
      {/* ── Breadcrumbs ─────────────────────────────────────────── */}
      <div className="mb-8">
        <Breadcrumbs items={[{ label: "Blog", href: "/blog" }, { label: post.title }]} />
      </div>

      {/* ── Hero ────────────────────────────────────────────────── */}
      <header className="mx-auto max-w-3xl">
        {/* Tags */}
        {post.tags && post.tags.length > 0 && (
          <div className="mb-4 flex flex-wrap gap-2">
            {post.tags.map((tag) => (
              <Link key={tag} href={`/blog?tag=${tag}`}>
                <Badge
                  variant="secondary"
                  className="hover:bg-foreground hover:text-background text-xs transition-colors duration-300"
                >
                  {tag}
                </Badge>
              </Link>
            ))}
          </div>
        )}

        {/* Title */}
        <h1 className="text-3xl font-semibold tracking-[-0.04em] lg:text-5xl">{post.title}</h1>

        {/* Meta */}
        <div className="text-muted-foreground mt-4 flex items-center gap-3 text-sm">
          {post.published_at && <time>{formatDate(post.published_at)}</time>}
          {post.author_name && (
            <>
              <span className="text-border">|</span>
              <span>{post.author_name}</span>
            </>
          )}
        </div>

        {/* Excerpt */}
        {post.excerpt && (
          <p className="text-muted-foreground mt-6 text-lg leading-relaxed">{post.excerpt}</p>
        )}
      </header>

      {/* ── Cover image ─────────────────────────────────────────── */}
      {post.cover_image_url && (
        <div className="relative mx-auto mt-10 aspect-[2/1] max-w-4xl overflow-hidden rounded-lg">
          <Image
            src={post.cover_image_url}
            alt={post.title}
            fill
            className="object-cover"
            sizes="(max-width: 1024px) 100vw, 896px"
            priority
          />
        </div>
      )}

      {/* ── Content ─────────────────────────────────────────────── */}
      <div className="prose prose-neutral dark:prose-invert mx-auto mt-12 max-w-3xl">
        <Markdown remarkPlugins={[remarkGfm]}>{post.content_html}</Markdown>
      </div>

      {/* ── Related posts ───────────────────────────────────────── */}
      {relatedPosts.length > 0 && (
        <>
          <Separator className="mx-auto mt-16 max-w-3xl" />

          <section className="mx-auto mt-12 max-w-5xl">
            <h2 className="mb-8 text-2xl font-semibold tracking-tight">Kapcsolódó bejegyzések</h2>
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {relatedPosts.map((related) => (
                <Link
                  key={related.id}
                  href={`/blog/${related.slug}`}
                  className="group flex flex-col overflow-hidden rounded-lg border transition-all duration-500 ease-out hover:scale-[1.02]"
                >
                  {/* Cover */}
                  <div className="relative aspect-[16/9] overflow-hidden">
                    {related.cover_image_url ? (
                      <Image
                        src={related.cover_image_url}
                        alt={related.title}
                        fill
                        className="object-cover transition-transform duration-700 ease-out group-hover:scale-105"
                        sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                      />
                    ) : (
                      <div className="bg-muted flex size-full items-center justify-center">
                        <span className="text-muted-foreground text-3xl font-light">
                          {related.title.charAt(0)}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Body */}
                  <div className="flex flex-col gap-2 p-4">
                    <h3 className="font-semibold tracking-tight transition-colors duration-300 group-hover:underline">
                      {related.title}
                    </h3>
                    {related.excerpt && (
                      <p className="text-muted-foreground line-clamp-2 text-sm">
                        {related.excerpt}
                      </p>
                    )}
                    <div className="text-muted-foreground mt-auto text-xs">
                      {related.published_at && formatDate(related.published_at)}
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        </>
      )}
    </article>
  );
}
