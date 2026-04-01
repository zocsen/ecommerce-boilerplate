"use client";

import { useCallback } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { CategoryRow } from "@/lib/types/database";
import { cn } from "@/lib/utils";
import { SlidersHorizontal, X } from "lucide-react";

/* ------------------------------------------------------------------ */
/*  Product filters — client component for URL-based filtering         */
/* ------------------------------------------------------------------ */

interface ProductFiltersProps {
  categories: CategoryRow[];
}

const SORT_OPTIONS = [
  { value: "newest", label: "Legújabb" },
  { value: "price_asc", label: "Ár (növekvő)" },
  { value: "price_desc", label: "Ár (csökkenő)" },
] as const;

export function ProductFilters({ categories }: ProductFiltersProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const currentCategory = searchParams.get("category") ?? "";
  const currentSort = searchParams.get("sort") ?? "newest";
  const currentMinPrice = searchParams.get("minPrice") ?? "";
  const currentMaxPrice = searchParams.get("maxPrice") ?? "";
  const currentInStock = searchParams.get("inStock") === "true";

  const hasActiveFilters =
    currentCategory !== "" || currentMinPrice !== "" || currentMaxPrice !== "" || currentInStock;

  const updateParams = useCallback(
    (updates: Record<string, string | null>) => {
      const params = new URLSearchParams(searchParams.toString());

      // Reset to page 1 when filters change
      params.delete("page");

      for (const [key, value] of Object.entries(updates)) {
        if (value === null || value === "") {
          params.delete(key);
        } else {
          params.set(key, value);
        }
      }

      const qs = params.toString();
      router.push(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    },
    [router, pathname, searchParams],
  );

  function clearFilters() {
    const params = new URLSearchParams();
    const sort = searchParams.get("sort");
    if (sort) params.set("sort", sort);
    const qs = params.toString();
    router.push(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  }

  return (
    <div className="space-y-6">
      {/* ── Sort + clear row ─────────────────────────────── */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="text-muted-foreground flex items-center gap-2">
          <SlidersHorizontal className="size-4" />
          <span className="text-xs font-medium tracking-[0.15em] uppercase">Szűrők</span>
        </div>

        <div className="ml-auto flex items-center gap-3">
          {hasActiveFilters && (
            <Button
              variant="ghost"
              size="sm"
              onClick={clearFilters}
              className="text-muted-foreground gap-1.5 text-xs"
            >
              <X className="size-3" />
              Szűrők törlése
            </Button>
          )}

          <Select value={currentSort} onValueChange={(val) => updateParams({ sort: val })}>
            <SelectTrigger className="w-44">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {SORT_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* ── Category chips ───────────────────────────────── */}
      {categories.length > 0 && (
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => updateParams({ category: null })}
            className={cn(
              "cursor-pointer rounded-lg border px-4 py-2 text-sm font-medium transition-all duration-300",
              currentCategory === ""
                ? "border-foreground bg-foreground text-background"
                : "border-border text-foreground hover:border-foreground/40",
            )}
          >
            Összes
          </button>
          {categories
            .filter((c) => c.parent_id === null)
            .map((category) => (
              <button
                key={category.id}
                type="button"
                onClick={() => updateParams({ category: category.slug })}
                className={cn(
                  "cursor-pointer rounded-lg border px-4 py-2 text-sm font-medium transition-all duration-300",
                  currentCategory === category.slug
                    ? "border-foreground bg-foreground text-background"
                    : "border-border text-foreground hover:border-foreground/40",
                )}
              >
                {category.name}
              </button>
            ))}
        </div>
      )}

      {/* ── Price range + In stock ───────────────────────── */}
      <div className="flex flex-wrap items-end gap-4">
        <div className="flex items-center gap-2">
          <div className="space-y-1">
            <label
              htmlFor="minPrice"
              className="text-muted-foreground text-[11px] font-medium tracking-wider uppercase"
            >
              Min ár
            </label>
            <Input
              id="minPrice"
              type="number"
              placeholder="0"
              min={0}
              step={100}
              value={currentMinPrice}
              onChange={(e) => updateParams({ minPrice: e.target.value })}
              className="h-9 w-28"
            />
          </div>
          <span className="text-muted-foreground mt-5">—</span>
          <div className="space-y-1">
            <label
              htmlFor="maxPrice"
              className="text-muted-foreground text-[11px] font-medium tracking-wider uppercase"
            >
              Max ár
            </label>
            <Input
              id="maxPrice"
              type="number"
              placeholder="Ft"
              min={0}
              step={100}
              value={currentMaxPrice}
              onChange={(e) => updateParams({ maxPrice: e.target.value })}
              className="h-9 w-28"
            />
          </div>
        </div>

        <button
          type="button"
          onClick={() => updateParams({ inStock: currentInStock ? null : "true" })}
          className={cn(
            "cursor-pointer rounded-lg border px-4 py-2 text-sm font-medium transition-all duration-300",
            currentInStock
              ? "border-foreground bg-foreground text-background"
              : "border-border text-muted-foreground hover:border-foreground/40 hover:text-foreground",
          )}
        >
          Csak készleten
        </button>
      </div>
    </div>
  );
}
