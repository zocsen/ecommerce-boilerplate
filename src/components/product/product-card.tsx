import Image from "next/image";
import Link from "next/link";
import type { ProductRow } from "@/lib/types/database";
import { PriceDisplay } from "@/components/product/price-display";

/* ------------------------------------------------------------------ */
/*  Product card — server component for catalog grids                  */
/* ------------------------------------------------------------------ */

interface ProductCardProps {
  product: ProductRow;
  priority?: boolean;
}

export function ProductCard({ product, priority = false }: ProductCardProps) {
  return (
    <Link href={`/products/${product.slug}`} className="group block">
      {/* ── Image ──────────────────────────────────────── */}
      <div
        className="bg-muted relative overflow-hidden rounded-lg transition-all duration-500 ease-out group-hover:shadow-lg group-hover:shadow-black/5"
        style={{ aspectRatio: "4/5" }}
      >
        {product.main_image_url ? (
          <Image
            src={product.main_image_url}
            alt={product.title}
            fill
            sizes="(max-width: 640px) 100vw, (max-width: 768px) 50vw, (max-width: 1024px) 33vw, 25vw"
            className="object-cover transition-transform duration-500 ease-out group-hover:scale-[1.02]"
            priority={priority}
            unoptimized={product.main_image_url.startsWith("http://")}
          />
        ) : (
          <div className="flex h-full items-center justify-center">
            <span className="text-muted-foreground/40 text-4xl font-light tracking-[-0.04em]">
              {product.title.charAt(0).toUpperCase()}
            </span>
          </div>
        )}

        {/* Sale indicator — top-right corner */}
        {product.compare_at_price != null && product.compare_at_price > product.base_price && (
          <div className="bg-foreground text-background absolute top-3 right-3 rounded-full px-2.5 py-1 text-[10px] font-semibold tracking-wider uppercase">
            Akció
          </div>
        )}
      </div>

      {/* ── Details ────────────────────────────────────── */}
      <div className="mt-4 space-y-1.5">
        <h3 className="text-foreground group-hover:text-foreground/70 text-sm leading-snug font-medium tracking-[-0.01em] transition-colors duration-300">
          {product.title}
        </h3>
        <PriceDisplay
          price={product.base_price}
          compareAtPrice={product.compare_at_price}
          size="sm"
        />
      </div>
    </Link>
  );
}
