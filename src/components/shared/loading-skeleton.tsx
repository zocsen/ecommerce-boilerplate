import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

/* ------------------------------------------------------------------ */
/*  ProductCardSkeleton                                                */
/* ------------------------------------------------------------------ */

export function ProductCardSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn("flex flex-col gap-3", className)}>
      {/* Image placeholder */}
      <Skeleton className="aspect-[4/5] w-full rounded-lg" />
      {/* Title */}
      <Skeleton className="h-4 w-3/4" />
      {/* Price */}
      <Skeleton className="h-4 w-1/3" />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  ProductGridSkeleton                                                */
/* ------------------------------------------------------------------ */

export function ProductGridSkeleton({
  count = 8,
  className,
}: {
  count?: number;
  className?: string;
}) {
  return (
    <div className={cn("grid grid-cols-2 gap-6 sm:grid-cols-3 lg:grid-cols-4", className)}>
      {Array.from({ length: count }, (_, i) => (
        <ProductCardSkeleton key={i} />
      ))}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  PageSkeleton — full-page loading state                             */
/* ------------------------------------------------------------------ */

export function PageSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn("mx-auto w-full max-w-7xl px-6 py-12 lg:px-8", className)}>
      {/* Breadcrumb skeleton */}
      <Skeleton className="mb-8 h-4 w-48" />

      {/* Page title */}
      <Skeleton className="mb-2 h-8 w-64" />
      <Skeleton className="mb-10 h-4 w-96" />

      {/* Content grid */}
      <div className="grid grid-cols-2 gap-6 sm:grid-cols-3 lg:grid-cols-4">
        {Array.from({ length: 8 }, (_, i) => (
          <div key={i} className="flex flex-col gap-3">
            <Skeleton className="aspect-[4/5] w-full rounded-lg" />
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-4 w-1/3" />
          </div>
        ))}
      </div>

      {/* Pagination skeleton */}
      <div className="mt-12 flex justify-center gap-2">
        {Array.from({ length: 5 }, (_, i) => (
          <Skeleton key={i} className="size-9 rounded-lg" />
        ))}
      </div>
    </div>
  );
}
