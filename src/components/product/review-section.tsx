"use client";

/* ------------------------------------------------------------------ */
/*  ReviewSection — complete reviews section for product pages          */
/*  Composes: ReviewSummary + ReviewForm + ReviewList                   */
/* ------------------------------------------------------------------ */

import { useState, useEffect, useCallback } from "react";
import { Loader2 } from "lucide-react";
import { getProductReviewStats } from "@/lib/actions/reviews";
import { siteConfig } from "@/lib/config/site.config";
import { ReviewSummary } from "@/components/product/review-summary";
import { ReviewForm } from "@/components/product/review-form";
import { ReviewList } from "@/components/product/review-list";
import { cn } from "@/lib/utils";
import type { ReviewStats } from "@/lib/types/database";

type ReviewSectionProps = {
  productId: string;
  className?: string;
};

export function ReviewSection({ productId, className }: ReviewSectionProps) {
  const [stats, setStats] = useState<ReviewStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);

  const fetchStats = useCallback(async () => {
    const res = await getProductReviewStats(productId);
    if (res.success && res.data) {
      setStats(res.data.stats);
    }
    setLoading(false);
  }, [productId]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats, refreshKey]);

  const handleReviewChange = useCallback(() => {
    setRefreshKey((k) => k + 1);
  }, []);

  // Check static feature flag (client-side) — placed after all hooks
  if (!siteConfig.features.enableReviews) {
    return null;
  }

  if (loading) {
    return (
      <div className={cn("flex items-center justify-center py-16", className)}>
        <Loader2 className="text-muted-foreground size-5 animate-spin" />
      </div>
    );
  }

  return (
    <section className={cn("space-y-10", className)} id="reviews">
      <h2 className="text-foreground text-2xl font-semibold tracking-[-0.03em]">
        Vásárlói vélemények
      </h2>

      {/* Stats summary (only when there are reviews) */}
      {stats && stats.review_count > 0 && <ReviewSummary stats={stats} />}

      {/* Review form */}
      <ReviewForm productId={productId} onReviewChange={handleReviewChange} />

      {/* Review list */}
      <ReviewList key={refreshKey} productId={productId} />
    </section>
  );
}
