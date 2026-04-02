"use client";

/* ------------------------------------------------------------------ */
/*  ReviewForm — submit or edit a review for a product                  */
/* ------------------------------------------------------------------ */

import { useState, useEffect, useCallback } from "react";
import { Loader2, Send, Pencil, Trash2, AlertCircle } from "lucide-react";
import {
  submitReview,
  updateReview,
  deleteOwnReview,
  getUserReviewForProduct,
} from "@/lib/actions/reviews";
import { StarRating } from "@/components/product/star-rating";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import type { ReviewRow } from "@/lib/types/database";

type ReviewFormProps = {
  productId: string;
  /** Called after a successful submit/update/delete to refresh the list */
  onReviewChange?: () => void;
  className?: string;
};

const STATUS_LABELS: Record<string, string> = {
  pending: "Moderálás alatt",
  approved: "Elfogadva",
  rejected: "Elutasítva",
};

export function ReviewForm({ productId, onReviewChange, className }: ReviewFormProps) {
  const [existingReview, setExistingReview] = useState<ReviewRow | null>(null);
  const [isLoggedIn, setIsLoggedIn] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);

  // Form state
  const [rating, setRating] = useState(0);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Edit mode
  const [editing, setEditing] = useState(false);

  // Delete confirmation
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const fetchExisting = useCallback(async () => {
    setLoading(true);
    const res = await getUserReviewForProduct(productId);
    if (res.success && res.data) {
      setExistingReview(res.data.review);
      setIsLoggedIn(true);
    } else {
      // If the action returns success with null review, user is logged in but has no review
      // If it fails, could be auth issue
      setIsLoggedIn(res.success ? true : null);
    }
    setLoading(false);
  }, [productId]);

  useEffect(() => {
    fetchExisting();
  }, [fetchExisting]);

  function startEdit() {
    if (!existingReview) return;
    setRating(existingReview.rating);
    setTitle(existingReview.title ?? "");
    setBody(existingReview.body);
    setEditing(true);
    setError(null);
    setSuccess(null);
  }

  function cancelEdit() {
    setEditing(false);
    setRating(0);
    setTitle("");
    setBody("");
    setError(null);
  }

  async function handleSubmit() {
    if (rating === 0) {
      setError("Kérlek, válassz egy csillagszámot.");
      return;
    }
    if (body.length < 10) {
      setError("A vélemény legalább 10 karakter legyen.");
      return;
    }

    setSubmitting(true);
    setError(null);
    setSuccess(null);

    if (editing && existingReview) {
      // Update
      const res = await updateReview(existingReview.id, {
        rating,
        title: title.trim() || undefined,
        body: body.trim(),
      });

      if (!res.success) {
        setError(res.error ?? "Hiba a módosításnál.");
        setSubmitting(false);
        return;
      }

      setSuccess("Értékelésed frissítve. Moderálás után jelenik meg újra.");
      setEditing(false);
    } else {
      // New review
      const res = await submitReview({
        productId,
        rating,
        title: title.trim() || undefined,
        body: body.trim(),
      });

      if (!res.success) {
        setError(res.error ?? "Hiba az értékelés beküldésekor.");
        setSubmitting(false);
        return;
      }

      setSuccess("Köszönjük értékelésed! Moderálás után jelenik meg.");
    }

    setRating(0);
    setTitle("");
    setBody("");
    setSubmitting(false);

    // Refresh
    fetchExisting();
    onReviewChange?.();
  }

  async function handleDelete() {
    if (!existingReview) return;
    if (!confirmDelete) {
      setConfirmDelete(true);
      return;
    }

    setDeleting(true);
    setError(null);

    const res = await deleteOwnReview(existingReview.id);
    if (!res.success) {
      setError(res.error ?? "Hiba a törléskor.");
      setDeleting(false);
      setConfirmDelete(false);
      return;
    }

    setExistingReview(null);
    setConfirmDelete(false);
    setDeleting(false);
    setSuccess("Az értékelésed törölve lett.");
    onReviewChange?.();
  }

  if (loading) {
    return (
      <div className={cn("flex items-center justify-center py-8", className)}>
        <Loader2 className="text-muted-foreground size-5 animate-spin" />
      </div>
    );
  }

  // Not logged in
  if (isLoggedIn === null || isLoggedIn === false) {
    return (
      <div className={cn("border-border/40 rounded-lg border px-6 py-8 text-center", className)}>
        <p className="text-muted-foreground text-sm">
          Az értékelés írásához{" "}
          <a href="/login" className="text-foreground underline underline-offset-4">
            jelentkezz be
          </a>
          .
        </p>
      </div>
    );
  }

  // Existing review — show summary (unless editing)
  if (existingReview && !editing) {
    return (
      <div className={cn("space-y-4", className)}>
        <div className="border-border/40 rounded-lg border px-6 py-5">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-muted-foreground text-xs font-medium tracking-[0.1em] uppercase">
                Saját értékelésed
              </p>
              <StarRating value={existingReview.rating} size="sm" />
            </div>
            <span
              className={cn(
                "rounded-full px-2.5 py-1 text-[10px] font-semibold tracking-wider uppercase",
                existingReview.status === "approved" && "bg-emerald-100 text-emerald-700",
                existingReview.status === "pending" && "bg-amber-100 text-amber-700",
                existingReview.status === "rejected" && "bg-red-100 text-red-700",
              )}
            >
              {STATUS_LABELS[existingReview.status] ?? existingReview.status}
            </span>
          </div>
          {existingReview.title && (
            <h4 className="text-foreground mt-3 text-sm font-semibold">{existingReview.title}</h4>
          )}
          <p className="text-foreground/80 mt-2 text-sm leading-relaxed">{existingReview.body}</p>
          <div className="mt-4 flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={startEdit}>
              <Pencil className="mr-2 size-3.5" />
              Szerkesztés
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="text-destructive hover:text-destructive"
              onClick={handleDelete}
              disabled={deleting}
            >
              {deleting ? (
                <Loader2 className="mr-2 size-3.5 animate-spin" />
              ) : (
                <Trash2 className="mr-2 size-3.5" />
              )}
              {confirmDelete ? "Biztosan törlöd?" : "Törlés"}
            </Button>
          </div>
        </div>

        {success && (
          <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
            {success}
          </div>
        )}
        {error && (
          <div className="border-destructive/50 bg-destructive/10 text-destructive flex items-center gap-2 rounded-lg border px-4 py-3 text-sm">
            <AlertCircle className="size-4 shrink-0" />
            {error}
          </div>
        )}
      </div>
    );
  }

  // New review form or edit form
  return (
    <div className={cn("space-y-4", className)}>
      <div className="border-border/40 rounded-lg border px-6 py-6">
        <h3 className="text-foreground text-sm font-semibold">
          {editing ? "Értékelés szerkesztése" : "Írd meg a véleményed"}
        </h3>

        <div className="mt-5 space-y-4">
          {/* Rating */}
          <div className="space-y-2">
            <Label className="text-xs">Értékelés *</Label>
            <StarRating value={rating} onChange={setRating} size="lg" />
          </div>

          {/* Title */}
          <div className="space-y-2">
            <Label className="text-xs">Cím (opcionális)</Label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="pl. Kiváló minőség!"
              maxLength={200}
            />
          </div>

          {/* Body */}
          <div className="space-y-2">
            <Label className="text-xs">Vélemény *</Label>
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="Írj részletesen a tapasztalataidról..."
              rows={4}
              maxLength={5000}
              className="border-input bg-background ring-offset-background placeholder:text-muted-foreground focus-visible:ring-ring flex w-full rounded-md border px-3 py-2 text-sm shadow-sm transition-colors focus-visible:ring-1 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50"
            />
            <p className="text-muted-foreground text-xs">{body.length}/5000 karakter</p>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2 pt-2">
            <Button size="sm" onClick={handleSubmit} disabled={submitting || rating === 0}>
              {submitting ? (
                <Loader2 className="mr-2 size-4 animate-spin" />
              ) : (
                <Send className="mr-2 size-4" />
              )}
              {editing ? "Mentés" : "Beküldés"}
            </Button>
            {editing && (
              <Button variant="ghost" size="sm" onClick={cancelEdit}>
                Mégsem
              </Button>
            )}
          </div>
        </div>
      </div>

      {success && (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          {success}
        </div>
      )}
      {error && (
        <div className="border-destructive/50 bg-destructive/10 text-destructive flex items-center gap-2 rounded-lg border px-4 py-3 text-sm">
          <AlertCircle className="size-4 shrink-0" />
          {error}
        </div>
      )}
    </div>
  );
}
