import { Skeleton } from "@/components/ui/skeleton";

/* ------------------------------------------------------------------ */
/*  Blog listing loading skeleton                                      */
/* ------------------------------------------------------------------ */

export default function BlogLoading() {
  return (
    <div className="mx-auto w-full max-w-7xl px-6 py-12 lg:px-8">
      {/* Breadcrumb */}
      <Skeleton className="mb-8 h-4 w-32" />

      {/* Title */}
      <Skeleton className="mb-2 h-10 w-48" />
      <Skeleton className="mb-12 h-5 w-80" />

      {/* Post grid */}
      <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }, (_, i) => (
          <div key={i} className="flex flex-col overflow-hidden rounded-lg border">
            <Skeleton className="aspect-[16/9] w-full" />
            <div className="space-y-3 p-5">
              <Skeleton className="h-3 w-16" />
              <Skeleton className="h-5 w-3/4" />
              <Skeleton className="h-3 w-full" />
              <Skeleton className="h-3 w-2/3" />
              <Skeleton className="mt-2 h-3 w-24" />
            </div>
          </div>
        ))}
      </div>

      {/* Pagination */}
      <div className="mt-12 flex justify-center gap-2">
        {Array.from({ length: 3 }, (_, i) => (
          <Skeleton key={i} className="size-9 rounded-lg" />
        ))}
      </div>
    </div>
  );
}
