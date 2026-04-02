"use client";

/* ------------------------------------------------------------------ */
/*  ReviewSummary — aggregated rating stats with star histogram         */
/* ------------------------------------------------------------------ */

import type { ReviewStats } from "@/lib/types/database";
import { StarRating } from "@/components/product/star-rating";
import { cn } from "@/lib/utils";

type ReviewSummaryProps = {
  stats: ReviewStats;
  className?: string;
};

export function ReviewSummary({ stats, className }: ReviewSummaryProps) {
  const bars = [
    { label: "5", count: stats.five_star },
    { label: "4", count: stats.four_star },
    { label: "3", count: stats.three_star },
    { label: "2", count: stats.two_star },
    { label: "1", count: stats.one_star },
  ];

  const maxCount = Math.max(...bars.map((b) => b.count), 1);

  return (
    <div className={cn("flex flex-col gap-6 sm:flex-row sm:gap-12", className)}>
      {/* Left: overall score */}
      <div className="flex flex-col items-center gap-2">
        <span className="text-foreground text-5xl font-semibold tracking-[-0.04em]">
          {stats.average_rating.toFixed(1)}
        </span>
        <StarRating value={stats.average_rating} size="md" />
        <span className="text-muted-foreground text-sm">{stats.review_count} értékelés</span>
      </div>

      {/* Right: histogram */}
      <div className="flex flex-1 flex-col gap-2">
        {bars.map((bar) => (
          <div key={bar.label} className="flex items-center gap-3">
            <span className="text-muted-foreground w-4 text-right text-sm tabular-nums">
              {bar.label}
            </span>
            <div className="bg-muted h-2 flex-1 overflow-hidden rounded-full">
              <div
                className="h-full rounded-full bg-amber-400 transition-all duration-500 ease-out"
                style={{
                  width: `${(bar.count / maxCount) * 100}%`,
                }}
              />
            </div>
            <span className="text-muted-foreground w-8 text-sm tabular-nums">{bar.count}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
