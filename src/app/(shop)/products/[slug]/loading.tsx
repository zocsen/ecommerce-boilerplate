import { Skeleton } from "@/components/ui/skeleton"

/* ------------------------------------------------------------------ */
/*  Product detail loading skeleton                                    */
/* ------------------------------------------------------------------ */

export default function ProductDetailLoading() {
  return (
    <div className="mx-auto max-w-7xl px-6 py-12 lg:px-8 lg:py-16">
      {/* Breadcrumb */}
      <Skeleton className="mb-10 h-4 w-64" />

      <div className="grid grid-cols-1 gap-12 lg:grid-cols-2 lg:gap-16">
        {/* Gallery skeleton */}
        <div className="space-y-3">
          <Skeleton className="aspect-[4/5] w-full rounded-xl" />
          <div className="flex gap-3">
            {Array.from({ length: 4 }, (_, i) => (
              <Skeleton key={i} className="size-16 rounded-lg" />
            ))}
          </div>
        </div>

        {/* Info skeleton */}
        <div className="flex flex-col">
          {/* Title */}
          <Skeleton className="h-9 w-3/4" />
          <Skeleton className="mt-2 h-9 w-1/2" />

          {/* Price */}
          <Skeleton className="mt-4 h-7 w-32" />

          {/* Stock badge */}
          <Skeleton className="mt-6 h-5 w-20 rounded-full" />

          {/* Variant selector */}
          <div className="mt-8 space-y-5">
            <Skeleton className="h-3 w-16" />
            <div className="flex gap-2">
              {Array.from({ length: 4 }, (_, i) => (
                <Skeleton key={i} className="h-10 w-16 rounded-lg" />
              ))}
            </div>
          </div>

          {/* Add to cart button */}
          <Skeleton className="mt-10 h-12 w-full rounded-lg" />

          {/* Description */}
          <div className="mt-12 space-y-3 border-t border-border/40 pt-8">
            <Skeleton className="h-3 w-16" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
          </div>
        </div>
      </div>
    </div>
  )
}
