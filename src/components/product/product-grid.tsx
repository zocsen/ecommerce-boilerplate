import type { ProductRow } from "@/lib/types/database";
import { ProductCard } from "@/components/product/product-card";

/* ------------------------------------------------------------------ */
/*  Product grid — responsive catalog layout                           */
/* ------------------------------------------------------------------ */

interface ProductGridProps {
  products: ProductRow[];
}

export function ProductGrid({ products }: ProductGridProps) {
  if (products.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-24">
        <p className="text-lg font-medium tracking-[-0.02em] text-muted-foreground">
          Nem találhatók termékek
        </p>
        <p className="mt-2 text-sm text-muted-foreground/60">
          Próbáld módosítani a szűrőket vagy a keresést.
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-x-6 gap-y-10 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
      {products.map((product, index) => (
        <ProductCard
          key={product.id}
          product={product}
          priority={index < 4}
        />
      ))}
    </div>
  );
}
