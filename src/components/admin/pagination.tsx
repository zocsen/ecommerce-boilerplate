"use client"

import { ChevronLeft, ChevronRight } from "lucide-react"
import { Button } from "@/components/ui/button"

/* ------------------------------------------------------------------ */
/*  Reusable admin pagination controls                                  */
/* ------------------------------------------------------------------ */

export interface AdminPaginationProps {
  /** Current page (1-indexed) */
  page: number
  /** Total number of pages */
  totalPages: number
  /** Called when the user navigates to a different page */
  onPageChange: (page: number) => void
  /** Optional suffix displayed after "X. / Y. oldal" (e.g. "— 150 feliratkozó") */
  suffix?: string
}

/**
 * Shared pagination bar used across admin list pages.
 *
 * Renders only when `totalPages > 1`.
 */
export function AdminPagination({ page, totalPages, onPageChange, suffix }: AdminPaginationProps) {
  if (totalPages <= 1) return null

  return (
    <div className="flex items-center justify-between">
      <span className="text-xs text-muted-foreground">
        {page}. / {totalPages}. oldal{suffix ? ` ${suffix}` : ""}
      </span>
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          disabled={page <= 1}
          onClick={() => onPageChange(page - 1)}
        >
          <ChevronLeft className="size-4" />
        </Button>
        <Button
          variant="outline"
          size="sm"
          disabled={page >= totalPages}
          onClick={() => onPageChange(page + 1)}
        >
          <ChevronRight className="size-4" />
        </Button>
      </div>
    </div>
  )
}
