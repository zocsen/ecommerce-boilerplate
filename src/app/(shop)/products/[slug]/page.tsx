import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getProductBySlug } from "@/lib/actions/products";
import { getLowest30DayPriceMap } from "@/lib/utils/price-history";
import { siteConfig } from "@/lib/config/site.config";
import { formatHUF } from "@/lib/utils/format";
import { Breadcrumbs } from "@/components/shared/breadcrumbs";
import { ProductDetailClient } from "@/components/product/product-detail-client";

/* ------------------------------------------------------------------ */
/*  Product detail page (server component)                             */
/* ------------------------------------------------------------------ */

interface ProductPageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: ProductPageProps): Promise<Metadata> {
  const { slug } = await params;
  const result = await getProductBySlug(slug);

  if (!result.success || !result.data) {
    return { title: "Termék nem található" };
  }

  const { product } = result.data;
  const price = formatHUF(product.base_price);

  return {
    title: product.title,
    description: product.description?.slice(0, 160) ?? `${product.title} — ${price}`,
    openGraph: {
      title: product.title,
      description: product.description?.slice(0, 160) ?? `${product.title} — ${price}`,
      images: product.main_image_url
        ? [{ url: product.main_image_url, width: 800, height: 1000 }]
        : undefined,
      type: "website",
    },
  };
}

export default async function ProductPage({ params }: ProductPageProps) {
  const { slug } = await params;
  const result = await getProductBySlug(slug);

  if (!result.success || !result.data) {
    notFound();
  }

  const { product, variants, categories, extras } = result.data;

  // Fetch lowest 30-day price map for Omnibus Directive (FE-006)
  // Only fetch when the product has a compare_at_price (discount indicator)
  const lowestPriceMap =
    product.compare_at_price != null && product.compare_at_price > product.base_price
      ? await getLowest30DayPriceMap(
          product.id,
          variants.map((v) => v.id),
        )
      : undefined;

  // Build breadcrumb trail
  const breadcrumbItems = [
    { label: "Termékek", href: "/products" },
    ...(categories.length > 0
      ? [
          {
            label: categories[0].name,
            href: `/products?category=${categories[0].slug}`,
          },
        ]
      : []),
    { label: product.title },
  ];

  // JSON-LD structured data
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.title,
    description: product.description ?? undefined,
    image: product.main_image_url ?? undefined,
    url: `${siteConfig.urls.siteUrl}/products/${product.slug}`,
    offers: {
      "@type": "Offer",
      price: product.base_price,
      priceCurrency: "HUF",
      availability: variants.some((v) => v.stock_quantity > 0 && v.is_active)
        ? "https://schema.org/InStock"
        : "https://schema.org/OutOfStock",
      seller: {
        "@type": "Organization",
        name: siteConfig.store.name,
      },
    },
  };

  return (
    <div className="mx-auto max-w-7xl px-6 py-12 lg:px-8 lg:py-16">
      {/* ── Breadcrumbs ──────────────────────────────────── */}
      <div className="mb-10">
        <Breadcrumbs items={breadcrumbItems} />
      </div>

      {/* ── Product detail (client wrapper) ──────────────── */}
      <ProductDetailClient
        product={product}
        variants={variants}
        categories={categories}
        extras={extras}
        lowestPriceMap={lowestPriceMap}
      />

      {/* ── JSON-LD ──────────────────────────────────────── */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
    </div>
  );
}
