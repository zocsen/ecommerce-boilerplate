"use client";

/* ------------------------------------------------------------------ */
/*  ReviewList — paginated list of approved reviews for a product       */
/* ------------------------------------------------------------------ */

import { useState, useEffect, useCallback } from "react";
import { Loader2, ShieldCheck, ChevronDown } from "lucide-react";
import { getProductReviews } from "@/lib/actions/reviews";
import { StarRating } from "@/components/product/star-rating";
import { formatDate } from "@/lib/utils/format";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { ReviewWithUser } from "@/lib/types/database";

type SortBy = "newest" | "highest" | "lowest";

type ReviewListProps = {
  productId: string;
  className?: string;
};

const SORT_LABELS: Record<SortBy, string> = {
  newest: "Legújabb",
  highest: "Legjobb",
  lowest: "Legrosszabb",
};

export function ReviewList({ productId, className }: ReviewListProps) {
  const [reviews, setReviews] = useState<ReviewWithUser[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [sortBy, setSortBy] = useState<SortBy>("newest");
  const [loading, setLoading] = useState(true);

  const fetchReviews = useCallback(async () => {
    setLoading(true);
    const res = await getProductReviews(productId, { page, limit: 10, sortBy });
    if (res.success && res.data) {
      setReviews(res.data.reviews);
      setTotal(res.data.total);
      setTotalPages(res.data.totalPages);
    }
    setLoading(false);
  }, [productId, page, sortBy]);

  useEffect(() => {
    fetchReviews();
  }, [fetchReviews]);

  function handleSortChange(newSort: SortBy) {
    setSortBy(newSort);
    setPage(1);
  }

  if (loading && reviews.length === 0) {
    return (
      <div className={cn("flex items-center justify-center py-12", className)}>
        <Loader2 className="text-muted-foreground size-5 animate-spin" />
      </div>
    );
  }

  if (total === 0 && !loading) {
    return (
      <div className={cn("py-12 text-center", className)}>
        <p className="text-muted-foreground text-sm">
          Még nincsenek értékelések ehhez a termékhez.
        </p>
      </div>
    );
  }

  return (
    <div className={cn("space-y-6", className)}>
      {/* Sort controls */}
      <div className="flex items-center justify-between">
        <span className="text-muted-foreground text-sm">{total} értékelés</span>
        <div className="flex items-center gap-2">
          <span className="text-muted-foreground text-xs">Rendezés:</span>
          {(Object.keys(SORT_LABELS) as SortBy[]).map((key) => (
            <button
              key={key}
              type="button"
              onClick={() => handleSortChange(key)}
              className={cn(
                "rounded-md px-2.5 py-1 text-xs font-medium transition-all duration-300",
                sortBy === key
                  ? "bg-foreground text-background"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {SORT_LABELS[key]}
            </button>
          ))}
        </div>
      </div>

      {/* Reviews */}
      <div className="divide-border/40 divide-y">
        {reviews.map((review) => (
          <div key={review.id} className="py-6 first:pt-0 last:pb-0">
            <div className="flex items-start justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <StarRating value={review.rating} size="sm" />
                  {review.is_verified_purchase && (
                    <span className="flex items-center gap-1 text-[11px] font-medium text-emerald-600">
                      <ShieldCheck className="size-3" />
                      Igazolt vásárlás
                    </span>
                  )}
                </div>
                {review.title && (
                  <h4 className="text-foreground text-sm font-semibold">{review.title}</h4>
                )}
              </div>
              <div className="text-muted-foreground shrink-0 text-xs">
                {formatDate(review.created_at)}
              </div>
            </div>

            <p className="text-foreground/80 mt-3 text-sm leading-relaxed">{review.body}</p>

            <p className="text-muted-foreground mt-2 text-xs">
              {review.author_name ?? "Névtelen vásárló"}
            </p>

            {/* Admin reply */}
            {review.admin_reply && (
              <div className="bg-muted/50 mt-4 rounded-lg px-4 py-3">
                <p className="text-muted-foreground mb-1 text-[11px] font-medium tracking-[0.1em] uppercase">
                  Válasz az üzlettől
                </p>
                <p className="text-foreground/80 text-sm leading-relaxed">{review.admin_reply}</p>
                {review.admin_reply_at && (
                  <p className="text-muted-foreground mt-1 text-xs">
                    {formatDate(review.admin_reply_at)}
                  </p>
                )}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Load more / pagination */}
      {totalPages > 1 && (
        <div className="flex justify-center pt-4">
          {page < totalPages ? (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => p + 1)}
              disabled={loading}
            >
              {loading ? (
                <Loader2 className="mr-2 size-4 animate-spin" />
              ) : (
                <ChevronDown className="mr-2 size-4" />
              )}
              További értékelések
            </Button>
          ) : page > 1 ? (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setPage(1)}
              className="text-muted-foreground"
            >
              Vissza az elejére
            </Button>
          ) : null}
        </div>
      )}
    </div>
  );
}
