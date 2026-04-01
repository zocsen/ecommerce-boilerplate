import type { Metadata } from "next";
import { Suspense } from "react";
import { listProducts } from "@/lib/actions/products";
import { listCategories } from "@/lib/actions/categories";
import { ProductGrid } from "@/components/product/product-grid";
import { ProductFilters } from "@/components/product/product-filters";
import { Breadcrumbs } from "@/components/shared/breadcrumbs";
import { ProductGridSkeleton } from "@/components/shared/loading-skeleton";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationPrevious,
  PaginationNext,
  PaginationEllipsis,
} from "@/components/ui/pagination";

/* ------------------------------------------------------------------ */
/*  Products listing page (server component)                           */
/* ------------------------------------------------------------------ */

export const metadata: Metadata = {
  title: "Termékek",
  description: "Böngészd prémium termékkínálatunkat. Szűrj kategória, ár és elérhetőség szerint.",
};

interface ProductsPageProps {
  searchParams: Promise<{
    category?: string;
    minPrice?: string;
    maxPrice?: string;
    inStock?: string;
    sort?: string;
    page?: string;
  }>;
}

export default async function ProductsPage({ searchParams }: ProductsPageProps) {
  const params = await searchParams;

  const filters = {
    category: params.category,
    minPrice: params.minPrice ? Number(params.minPrice) : undefined,
    maxPrice: params.maxPrice ? Number(params.maxPrice) : undefined,
    inStock: params.inStock === "true" ? true : undefined,
    sort: params.sort,
    page: params.page ? Number(params.page) : 1,
    perPage: 12,
  };

  const [productsResult, categoriesResult] = await Promise.all([
    listProducts(filters),
    listCategories(),
  ]);

  const products = productsResult.data?.products ?? [];
  const total = productsResult.data?.total ?? 0;
  const page = productsResult.data?.page ?? 1;
  const totalPages = productsResult.data?.totalPages ?? 0;
  const categories = categoriesResult.data ?? [];

  return (
    <div className="mx-auto max-w-7xl px-6 py-12 lg:px-8 lg:py-16">
      {/* ── Breadcrumbs ──────────────────────────────────── */}
      <Breadcrumbs items={[{ label: "Termékek" }]} />

      {/* ── Header ───────────────────────────────────────── */}
      <div className="mt-8 mb-10">
        <h1 className="text-foreground text-4xl font-semibold tracking-[-0.03em] lg:text-5xl">
          Termékek
        </h1>
        <p className="text-muted-foreground mt-3 text-sm">
          {total > 0
            ? `${total} termék található`
            : "Nem találhatók termékek a megadott szűrőkkel."}
        </p>
      </div>

      {/* ── Filters ──────────────────────────────────────── */}
      <Suspense fallback={null}>
        <ProductFilters categories={categories} />
      </Suspense>

      {/* ── Product grid ─────────────────────────────────── */}
      <div className="mt-10">
        <Suspense fallback={<ProductGridSkeleton count={12} />}>
          <ProductGrid products={products} />
        </Suspense>
      </div>

      {/* ── Pagination ───────────────────────────────────── */}
      {totalPages > 1 && (
        <div className="mt-16">
          <ProductsPagination currentPage={page} totalPages={totalPages} searchParams={params} />
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Pagination helper (server component)                               */
/* ------------------------------------------------------------------ */

interface ProductsPaginationProps {
  currentPage: number;
  totalPages: number;
  searchParams: Record<string, string | undefined>;
}

function ProductsPagination({ currentPage, totalPages, searchParams }: ProductsPaginationProps) {
  function buildHref(page: number): string {
    const params = new URLSearchParams();
    for (const [key, value] of Object.entries(searchParams)) {
      if (value !== undefined && key !== "page") {
        params.set(key, value);
      }
    }
    if (page > 1) params.set("page", String(page));
    const qs = params.toString();
    return qs ? `/products?${qs}` : "/products";
  }

  // Generate page numbers to display
  const pages = generatePageNumbers(currentPage, totalPages);

  return (
    <Pagination>
      <PaginationContent>
        {currentPage > 1 && (
          <PaginationItem>
            <PaginationPrevious href={buildHref(currentPage - 1)} text="Előző" />
          </PaginationItem>
        )}

        {pages.map((p, i) => (
          <PaginationItem key={`${p}-${i}`}>
            {p === "ellipsis" ? (
              <PaginationEllipsis />
            ) : (
              <PaginationLink href={buildHref(p)} isActive={p === currentPage}>
                {p}
              </PaginationLink>
            )}
          </PaginationItem>
        ))}

        {currentPage < totalPages && (
          <PaginationItem>
            <PaginationNext href={buildHref(currentPage + 1)} text="Következő" />
          </PaginationItem>
        )}
      </PaginationContent>
    </Pagination>
  );
}

/**
 * Generate page numbers with ellipsis for large ranges.
 * Always shows first, last, and 2 pages around current.
 */
function generatePageNumbers(current: number, total: number): Array<number | "ellipsis"> {
  if (total <= 7) {
    return Array.from({ length: total }, (_, i) => i + 1);
  }

  const pages: Array<number | "ellipsis"> = [];
  const rangeStart = Math.max(2, current - 1);
  const rangeEnd = Math.min(total - 1, current + 1);

  pages.push(1);

  if (rangeStart > 2) {
    pages.push("ellipsis");
  }

  for (let i = rangeStart; i <= rangeEnd; i++) {
    pages.push(i);
  }

  if (rangeEnd < total - 1) {
    pages.push("ellipsis");
  }

  pages.push(total);

  return pages;
}
