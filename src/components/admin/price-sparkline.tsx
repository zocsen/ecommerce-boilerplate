"use client";

import { useMemo } from "react";
import { formatHUF } from "@/lib/utils/format";
import { formatDate } from "@/lib/utils/format";

/* ------------------------------------------------------------------ */
/*  Minimal SVG sparkline for price history (FE-006)                   */
/*  ~120px wide × 32px tall, shows last 30 days of price changes      */
/* ------------------------------------------------------------------ */

interface PriceHistoryPoint {
  price: number;
  date: string;
}

interface PriceSparklineProps {
  history: PriceHistoryPoint[];
  width?: number;
  height?: number;
}

export function PriceSparkline({ history, width = 120, height = 32 }: PriceSparklineProps) {
  const { pathD, minPrice, maxPrice, points } = useMemo(() => {
    if (history.length === 0) {
      return { pathD: "", minPrice: 0, maxPrice: 0, points: [] };
    }

    const prices = history.map((h) => h.price);
    const min = Math.min(...prices);
    const max = Math.max(...prices);
    const range = max - min || 1; // Avoid division by zero for flat prices

    // Padding inside the SVG
    const padX = 2;
    const padY = 4;
    const innerW = width - padX * 2;
    const innerH = height - padY * 2;

    const pts = history.map((h, i) => ({
      x: padX + (history.length === 1 ? innerW / 2 : (i / (history.length - 1)) * innerW),
      y: padY + innerH - ((h.price - min) / range) * innerH,
      price: h.price,
      date: h.date,
    }));

    // Build SVG path
    const d = pts
      .map((p, i) => `${i === 0 ? "M" : "L"} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`)
      .join(" ");

    return { pathD: d, minPrice: min, maxPrice: max, points: pts };
  }, [history, width, height]);

  if (history.length === 0) {
    return <span className="text-muted-foreground/60 text-xs">Nincs ártörténet</span>;
  }

  // For a flat line (single price or no change), show a simple indicator
  if (history.length === 1) {
    return (
      <span className="text-muted-foreground text-xs">
        {formatHUF(history[0].price)} — {formatDate(history[0].date)}
      </span>
    );
  }

  const lastPoint = history[history.length - 1];
  const firstPoint = history[0];
  const trend =
    lastPoint.price > firstPoint.price
      ? "up"
      : lastPoint.price < firstPoint.price
        ? "down"
        : "flat";
  const strokeColor =
    trend === "up"
      ? "var(--color-destructive, #ef4444)"
      : trend === "down"
        ? "var(--color-chart-2, #22c55e)"
        : "var(--color-muted-foreground, #71717a)";

  return (
    <div className="group relative inline-flex items-center gap-2">
      <svg
        width={width}
        height={height}
        viewBox={`0 0 ${width} ${height}`}
        className="shrink-0"
        aria-label={`Ártörténet: ${formatHUF(minPrice)} – ${formatHUF(maxPrice)}`}
      >
        <path
          d={pathD}
          fill="none"
          stroke={strokeColor}
          strokeWidth={1.5}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {/* Dot on the last point */}
        {points.length > 0 && (
          <circle
            cx={points[points.length - 1].x}
            cy={points[points.length - 1].y}
            r={2}
            fill={strokeColor}
          />
        )}
      </svg>

      {/* Tooltip on hover */}
      <span className="bg-popover text-popover-foreground pointer-events-none absolute -top-8 left-0 hidden rounded px-2 py-1 text-xs whitespace-nowrap shadow-md group-hover:block">
        {formatHUF(minPrice)} – {formatHUF(maxPrice)} (30 nap)
      </span>
    </div>
  );
}
