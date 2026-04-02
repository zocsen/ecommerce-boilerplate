"use client";

import { useState, useEffect, useCallback } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  Star,
  Search,
  Check,
  X,
  Trash2,
  MessageSquare,
  Loader2,
  ShieldCheck,
  Send,
} from "lucide-react";
import { AdminPagination } from "@/components/admin/pagination";
import {
  adminGetReviews,
  adminGetReviewStats,
  adminModerateReview,
  adminReplyToReview,
  adminDeleteReview,
  adminBulkModerate,
} from "@/lib/actions/reviews";
import { formatDate } from "@/lib/utils/format";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { ReviewWithProduct, ReviewStatus } from "@/lib/types/database";

/* ------------------------------------------------------------------ */
/*  Admin Reviews Page — moderation, reply, delete                     */
/* ------------------------------------------------------------------ */

type StatusTab = "all" | ReviewStatus;

const STATUS_TABS: { key: StatusTab; label: string }[] = [
  { key: "all", label: "Összes" },
  { key: "pending", label: "Függőben" },
  { key: "approved", label: "Elfogadva" },
  { key: "rejected", label: "Elutasítva" },
];

const STATUS_BADGE_MAP: Record<
  ReviewStatus,
  { label: string; variant: "default" | "secondary" | "outline" | "destructive" }
> = {
  pending: { label: "Függőben", variant: "secondary" },
  approved: { label: "Elfogadva", variant: "default" },
  rejected: { label: "Elutasítva", variant: "destructive" },
};

export default function AdminReviewsPage() {
  const [reviews, setReviews] = useState<ReviewWithProduct[]>([]);
  const [totalPages, setTotalPages] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [statusTab, setStatusTab] = useState<StatusTab>("all");
  const [loading, setLoading] = useState(true);

  // Stats
  const [statsLoading, setStatsLoading] = useState(true);
  const [totalReviews, setTotalReviews] = useState(0);
  const [pendingCount, setPendingCount] = useState(0);
  const [approvedCount, setApprovedCount] = useState(0);
  const [rejectedCount, setRejectedCount] = useState(0);

  // Actions
  const [moderatingId, setModeratingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Reply
  const [replyId, setReplyId] = useState<string | null>(null);
  const [replyText, setReplyText] = useState("");
  const [replying, setReplying] = useState(false);

  // Bulk selection
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkAction, setBulkAction] = useState(false);

  // ── Fetch reviews ─────────────────────────────────────────────
  const fetchReviews = useCallback(async () => {
    setLoading(true);
    const res = await adminGetReviews({
      page,
      perPage: 20,
      status: statusTab === "all" ? undefined : statusTab,
      search: search || undefined,
    });
    if (res.success && res.data) {
      setReviews(res.data.reviews);
      setTotalPages(res.data.totalPages);
    }
    setLoading(false);
  }, [page, statusTab, search]);

  // ── Fetch stats ───────────────────────────────────────────────
  const fetchStats = useCallback(async () => {
    setStatsLoading(true);
    const res = await adminGetReviewStats();
    if (res.success && res.data) {
      setTotalReviews(res.data.totalReviews);
      setPendingCount(res.data.pendingCount);
      setApprovedCount(res.data.approvedCount);
      setRejectedCount(res.data.rejectedCount);
    }
    setStatsLoading(false);
  }, []);

  useEffect(() => {
    fetchReviews();
  }, [fetchReviews]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  // ── Moderate ──────────────────────────────────────────────────
  async function handleModerate(reviewId: string, status: "approved" | "rejected") {
    setModeratingId(reviewId);
    setError(null);

    const res = await adminModerateReview(reviewId, { status });
    if (!res.success) {
      setError(res.error ?? "Hiba a moderálásnál.");
    } else {
      fetchReviews();
      fetchStats();
    }
    setModeratingId(null);
  }

  // ── Reply ─────────────────────────────────────────────────────
  function startReply(review: ReviewWithProduct) {
    setReplyId(review.id);
    setReplyText(review.admin_reply ?? "");
    setError(null);
  }

  async function handleReply() {
    if (!replyId || !replyText.trim()) return;
    setReplying(true);
    setError(null);

    const res = await adminReplyToReview(replyId, { reply: replyText.trim() });
    if (!res.success) {
      setError(res.error ?? "Hiba a válasz mentésekor.");
    } else {
      setReplyId(null);
      setReplyText("");
      fetchReviews();
    }
    setReplying(false);
  }

  // ── Delete ────────────────────────────────────────────────────
  async function handleDelete(id: string) {
    if (deletingId !== id) {
      setDeletingId(id);
      return;
    }

    setError(null);
    const res = await adminDeleteReview(id);
    if (!res.success) {
      setError(res.error ?? "Hiba a törléskor.");
    } else {
      fetchReviews();
      fetchStats();
    }
    setDeletingId(null);
  }

  // ── Bulk moderate ─────────────────────────────────────────────
  async function handleBulkModerate(status: "approved" | "rejected") {
    if (selectedIds.size === 0) return;
    setBulkAction(true);
    setError(null);

    const res = await adminBulkModerate({
      reviewIds: Array.from(selectedIds),
      status,
    });
    if (!res.success) {
      setError(res.error ?? "Hiba a tömeges moderálásnál.");
    } else {
      setSelectedIds(new Set());
      fetchReviews();
      fetchStats();
    }
    setBulkAction(false);
  }

  // ── Selection helpers ─────────────────────────────────────────
  function toggleSelect(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }

  function toggleSelectAll() {
    if (selectedIds.size === reviews.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(reviews.map((r) => r.id)));
    }
  }

  // ── Render stars ──────────────────────────────────────────────
  function renderStars(rating: number) {
    return (
      <div className="flex items-center gap-0.5">
        {[1, 2, 3, 4, 5].map((i) => (
          <Star
            key={i}
            className={`size-3.5 ${
              i <= rating ? "fill-amber-400 text-amber-400" : "text-border fill-transparent"
            }`}
          />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Értékelések</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Vásárlói értékelések moderálása és kezelése
        </p>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {[
          { label: "Összes", value: totalReviews, color: "text-foreground" },
          { label: "Függőben", value: pendingCount, color: "text-amber-600" },
          { label: "Elfogadva", value: approvedCount, color: "text-emerald-600" },
          { label: "Elutasítva", value: rejectedCount, color: "text-red-600" },
        ].map((stat) => (
          <Card key={stat.label}>
            <CardContent className="px-4 py-3">
              <p className="text-muted-foreground text-xs font-medium">{stat.label}</p>
              <p className={`text-2xl font-semibold tabular-nums ${stat.color}`}>
                {statsLoading ? "—" : stat.value}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      {error && (
        <div className="border-destructive/50 bg-destructive/10 text-destructive rounded-lg border px-4 py-3 text-sm">
          {error}
        </div>
      )}

      {/* Tabs + search */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-1">
          {STATUS_TABS.map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => {
                setStatusTab(tab.key);
                setPage(1);
                setSelectedIds(new Set());
              }}
              className={`rounded-md px-3 py-1.5 text-xs font-medium transition-all duration-300 ${
                statusTab === tab.key
                  ? "bg-foreground text-background"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
        <div className="relative max-w-sm">
          <Search className="text-muted-foreground absolute top-1/2 left-3 size-4 -translate-y-1/2" />
          <Input
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            placeholder="Keresés a véleményekben..."
            className="pl-9"
          />
        </div>
      </div>

      {/* Bulk actions */}
      {selectedIds.size > 0 && (
        <div className="bg-muted/50 flex items-center gap-3 rounded-lg px-4 py-2.5">
          <span className="text-muted-foreground text-sm">{selectedIds.size} kiválasztva</span>
          <Button
            size="sm"
            variant="outline"
            onClick={() => handleBulkModerate("approved")}
            disabled={bulkAction}
          >
            {bulkAction ? (
              <Loader2 className="mr-2 size-3.5 animate-spin" />
            ) : (
              <Check className="mr-2 size-3.5" />
            )}
            Elfogadás
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => handleBulkModerate("rejected")}
            disabled={bulkAction}
          >
            <X className="mr-2 size-3.5" />
            Elutasítás
          </Button>
          <Button size="sm" variant="ghost" onClick={() => setSelectedIds(new Set())}>
            Törlés
          </Button>
        </div>
      )}

      {/* Reply panel */}
      {replyId && (
        <Card>
          <CardContent className="space-y-3 px-4 py-4">
            <p className="text-sm font-medium">Válasz írása</p>
            <textarea
              value={replyText}
              onChange={(e) => setReplyText(e.target.value)}
              rows={3}
              maxLength={2000}
              placeholder="Írj választ az értékelésre..."
              className="border-input bg-background ring-offset-background placeholder:text-muted-foreground focus-visible:ring-ring flex w-full rounded-md border px-3 py-2 text-sm shadow-sm transition-colors focus-visible:ring-1 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50"
            />
            <div className="flex items-center gap-2">
              <Button size="sm" onClick={handleReply} disabled={replying || !replyText.trim()}>
                {replying ? (
                  <Loader2 className="mr-2 size-3.5 animate-spin" />
                ) : (
                  <Send className="mr-2 size-3.5" />
                )}
                Mentés
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => {
                  setReplyId(null);
                  setReplyText("");
                }}
              >
                Mégsem
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Table */}
      {loading ? (
        <div className="text-muted-foreground flex h-40 items-center justify-center text-sm">
          Betöltés...
        </div>
      ) : reviews.length === 0 ? (
        <div className="text-muted-foreground flex h-40 flex-col items-center justify-center gap-2 text-sm">
          <Star className="text-muted-foreground/50 size-8" />
          <p>Nincsenek értékelések.</p>
        </div>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-10">
                <Checkbox
                  checked={selectedIds.size === reviews.length && reviews.length > 0}
                  onCheckedChange={toggleSelectAll}
                />
              </TableHead>
              <TableHead>Termék</TableHead>
              <TableHead>Értékelés</TableHead>
              <TableHead>Vélemény</TableHead>
              <TableHead>Szerző</TableHead>
              <TableHead>Státusz</TableHead>
              <TableHead>Dátum</TableHead>
              <TableHead className="text-right">Műveletek</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {reviews.map((review) => (
              <TableRow key={review.id}>
                <TableCell>
                  <Checkbox
                    checked={selectedIds.has(review.id)}
                    onCheckedChange={() => toggleSelect(review.id)}
                  />
                </TableCell>
                <TableCell>
                  <Link
                    href={`/products/${review.product_slug}`}
                    className="flex items-center gap-2 hover:underline"
                    target="_blank"
                  >
                    {review.product_main_image_url ? (
                      <Image
                        src={review.product_main_image_url}
                        alt={review.product_title}
                        width={32}
                        height={32}
                        className="rounded object-cover"
                        unoptimized={review.product_main_image_url.startsWith("http://")}
                      />
                    ) : (
                      <div className="bg-muted flex size-8 items-center justify-center rounded text-xs">
                        {review.product_title.charAt(0)}
                      </div>
                    )}
                    <span className="max-w-[120px] truncate text-xs font-medium">
                      {review.product_title}
                    </span>
                  </Link>
                </TableCell>
                <TableCell>{renderStars(review.rating)}</TableCell>
                <TableCell>
                  <div className="max-w-[200px] space-y-0.5">
                    {review.title && (
                      <p className="truncate text-xs font-semibold">{review.title}</p>
                    )}
                    <p className="text-muted-foreground line-clamp-2 text-xs">{review.body}</p>
                    {review.admin_reply && (
                      <p className="text-muted-foreground mt-1 text-[10px] italic">
                        Válasz: {review.admin_reply.slice(0, 50)}
                        {review.admin_reply.length > 50 ? "..." : ""}
                      </p>
                    )}
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs">{review.author_name ?? "—"}</span>
                    {review.is_verified_purchase && (
                      <span title="Igazolt vásárlás">
                        <ShieldCheck className="size-3 text-emerald-600" />
                      </span>
                    )}
                  </div>
                </TableCell>
                <TableCell>
                  <Badge variant={STATUS_BADGE_MAP[review.status].variant} className="text-[10px]">
                    {STATUS_BADGE_MAP[review.status].label}
                  </Badge>
                </TableCell>
                <TableCell className="text-muted-foreground text-xs">
                  {formatDate(review.created_at)}
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex items-center justify-end gap-1">
                    {review.status !== "approved" && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 text-emerald-600 hover:text-emerald-700"
                        onClick={() => handleModerate(review.id, "approved")}
                        disabled={moderatingId === review.id}
                        title="Elfogadás"
                      >
                        {moderatingId === review.id ? (
                          <Loader2 className="size-3.5 animate-spin" />
                        ) : (
                          <Check className="size-3.5" />
                        )}
                      </Button>
                    )}
                    {review.status !== "rejected" && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 text-amber-600 hover:text-amber-700"
                        onClick={() => handleModerate(review.id, "rejected")}
                        disabled={moderatingId === review.id}
                        title="Elutasítás"
                      >
                        <X className="size-3.5" />
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7"
                      onClick={() => startReply(review)}
                      title="Válasz"
                    >
                      <MessageSquare className="size-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-destructive hover:text-destructive h-7"
                      onClick={() => handleDelete(review.id)}
                      title="Törlés"
                    >
                      {deletingId === review.id ? (
                        <span className="text-[10px]">Megerősítés?</span>
                      ) : (
                        <Trash2 className="size-3.5" />
                      )}
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      {/* Pagination */}
      <AdminPagination page={page} totalPages={totalPages} onPageChange={(n) => setPage(n)} />
    </div>
  );
}
