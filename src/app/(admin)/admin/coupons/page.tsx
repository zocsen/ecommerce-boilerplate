"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Plus,
  Pencil,
  Trash2,
  Loader2,
  Search,
  X,
  Save,
  Ticket,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import {
  adminListCoupons,
  adminCreateCoupon,
  adminUpdateCoupon,
  adminDeleteCoupon,
} from "@/lib/actions/coupons";
import { formatHUF, formatDate } from "@/lib/utils/format";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import type { CouponRow } from "@/lib/types/database";

/* ------------------------------------------------------------------ */
/*  Admin Coupons Page                                                 */
/* ------------------------------------------------------------------ */

export default function AdminCouponsPage() {
  const [coupons, setCoupons] = useState<CouponRow[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  // Create form
  const [showCreate, setShowCreate] = useState(false);
  const [createCode, setCreateCode] = useState("");
  const [createDiscountType, setCreateDiscountType] = useState<"percentage" | "fixed">("percentage");
  const [createValue, setCreateValue] = useState("");
  const [createMinOrderAmount, setCreateMinOrderAmount] = useState("");
  const [createMaxUses, setCreateMaxUses] = useState("");
  const [createValidFrom, setCreateValidFrom] = useState("");
  const [createValidUntil, setCreateValidUntil] = useState("");
  const [createIsActive, setCreateIsActive] = useState(true);
  const [creating, setCreating] = useState(false);

  // Edit
  const [editId, setEditId] = useState<string | null>(null);
  const [editCode, setEditCode] = useState("");
  const [editDiscountType, setEditDiscountType] = useState<"percentage" | "fixed">("percentage");
  const [editValue, setEditValue] = useState("");
  const [editMinOrderAmount, setEditMinOrderAmount] = useState("");
  const [editMaxUses, setEditMaxUses] = useState("");
  const [editValidFrom, setEditValidFrom] = useState("");
  const [editValidUntil, setEditValidUntil] = useState("");
  const [editIsActive, setEditIsActive] = useState(true);
  const [saving, setSaving] = useState(false);

  // Delete
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Error
  const [error, setError] = useState<string | null>(null);

  // ── Fetch ──────────────────────────────────────────────────────
  const fetchCoupons = useCallback(async () => {
    setLoading(true);
    const res = await adminListCoupons({
      page,
      perPage: 20,
      search: search || undefined,
    });
    if (res.success && res.data) {
      setCoupons(res.data.coupons);
      setTotal(res.data.total);
      setTotalPages(res.data.totalPages);
    }
    setLoading(false);
  }, [page, search]);

  useEffect(() => {
    fetchCoupons();
  }, [fetchCoupons]);

  // ── Helpers ────────────────────────────────────────────────────
  function formatDiscount(coupon: CouponRow): string {
    if (coupon.discount_type === "percentage") {
      return `${coupon.value}%`;
    }
    return formatHUF(coupon.value);
  }

  function resetCreateForm() {
    setCreateCode("");
    setCreateDiscountType("percentage");
    setCreateValue("");
    setCreateMinOrderAmount("");
    setCreateMaxUses("");
    setCreateValidFrom("");
    setCreateValidUntil("");
    setCreateIsActive(true);
  }

  // ── Create ─────────────────────────────────────────────────────
  async function handleCreate() {
    if (!createCode.trim() || !createValue) {
      setError("A kuponkód és az érték kötelező.");
      return;
    }

    setCreating(true);
    setError(null);

    const res = await adminCreateCoupon({
      code: createCode.trim(),
      discountType: createDiscountType,
      value: Number(createValue),
      minOrderAmount: createMinOrderAmount ? Number(createMinOrderAmount) : undefined,
      maxUses: createMaxUses ? Number(createMaxUses) : undefined,
      validFrom: createValidFrom || undefined,
      validUntil: createValidUntil || undefined,
      isActive: createIsActive,
    });

    if (!res.success) {
      setError(res.error ?? "Hiba a kupon létrehozásakor.");
      setCreating(false);
      return;
    }

    resetCreateForm();
    setShowCreate(false);
    setCreating(false);
    fetchCoupons();
  }

  // ── Start edit ─────────────────────────────────────────────────
  function startEdit(coupon: CouponRow) {
    setEditId(coupon.id);
    setEditCode(coupon.code);
    setEditDiscountType(coupon.discount_type);
    setEditValue(String(coupon.value));
    setEditMinOrderAmount(coupon.min_order_amount != null ? String(coupon.min_order_amount) : "");
    setEditMaxUses(coupon.max_uses != null ? String(coupon.max_uses) : "");
    setEditValidFrom(coupon.valid_from ? coupon.valid_from.slice(0, 16) : "");
    setEditValidUntil(coupon.valid_until ? coupon.valid_until.slice(0, 16) : "");
    setEditIsActive(coupon.is_active);
    setError(null);
  }

  // ── Save edit ──────────────────────────────────────────────────
  async function handleSave() {
    if (!editId) return;

    setSaving(true);
    setError(null);

    const res = await adminUpdateCoupon(editId, {
      code: editCode.trim(),
      discountType: editDiscountType,
      value: Number(editValue),
      minOrderAmount: editMinOrderAmount ? Number(editMinOrderAmount) : null,
      maxUses: editMaxUses ? Number(editMaxUses) : null,
      validFrom: editValidFrom || null,
      validUntil: editValidUntil || null,
      isActive: editIsActive,
    });

    if (!res.success) {
      setError(res.error ?? "Hiba a kupon frissítésekor.");
      setSaving(false);
      return;
    }

    setEditId(null);
    setSaving(false);
    fetchCoupons();
  }

  // ── Delete ─────────────────────────────────────────────────────
  async function handleDelete(id: string) {
    if (deletingId !== id) {
      setDeletingId(id);
      return;
    }

    setError(null);
    const res = await adminDeleteCoupon(id);

    if (!res.success) {
      setError(res.error ?? "Hiba a kupon törlésekor.");
      setDeletingId(null);
      return;
    }

    setDeletingId(null);
    fetchCoupons();
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Kuponok</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {total} kupon összesen
          </p>
        </div>
        <Button
          size="sm"
          onClick={() => {
            setShowCreate(!showCreate);
            setError(null);
            if (showCreate) resetCreateForm();
          }}
        >
          {showCreate ? (
            <>
              <X className="mr-2 size-4" />
              Mégsem
            </>
          ) : (
            <>
              <Plus className="mr-2 size-4" />
              Új kupon
            </>
          )}
        </Button>
      </div>

      {error && (
        <div className="rounded-lg border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      )}

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
          placeholder="Keresés kód alapján..."
          className="pl-9"
        />
      </div>

      {/* Create form */}
      {showCreate && (
        <Card>
          <CardHeader>
            <CardTitle>Új kupon</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div className="space-y-2">
                <Label>Kód *</Label>
                <Input
                  value={createCode}
                  onChange={(e) => setCreateCode(e.target.value.toUpperCase())}
                  placeholder="pl. NYAR2026"
                  className="font-mono uppercase"
                />
              </div>
              <div className="space-y-2">
                <Label>Típus *</Label>
                <select
                  value={createDiscountType}
                  onChange={(e) =>
                    setCreateDiscountType(e.target.value as "percentage" | "fixed")
                  }
                  className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                >
                  <option value="percentage">Százalékos (%)</option>
                  <option value="fixed">Fix összeg (HUF)</option>
                </select>
              </div>
              <div className="space-y-2">
                <Label>
                  Érték *{" "}
                  <span className="text-muted-foreground">
                    ({createDiscountType === "percentage" ? "%" : "HUF"})
                  </span>
                </Label>
                <Input
                  type="number"
                  min="1"
                  value={createValue}
                  onChange={(e) => setCreateValue(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Min. rendelés (HUF)</Label>
                <Input
                  type="number"
                  min="0"
                  value={createMinOrderAmount}
                  onChange={(e) => setCreateMinOrderAmount(e.target.value)}
                  placeholder="Opcionális"
                />
              </div>
              <div className="space-y-2">
                <Label>Max. felhasználás</Label>
                <Input
                  type="number"
                  min="1"
                  value={createMaxUses}
                  onChange={(e) => setCreateMaxUses(e.target.value)}
                  placeholder="Korlátlan"
                />
              </div>
              <div className="space-y-2">
                <Label>Érvényes ettől</Label>
                <Input
                  type="datetime-local"
                  value={createValidFrom}
                  onChange={(e) => setCreateValidFrom(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Érvényes eddig</Label>
                <Input
                  type="datetime-local"
                  value={createValidUntil}
                  onChange={(e) => setCreateValidUntil(e.target.value)}
                />
              </div>
              <div className="flex items-end gap-2 pb-1">
                <Checkbox
                  checked={createIsActive}
                  onCheckedChange={(checked) => setCreateIsActive(!!checked)}
                />
                <Label>Aktív</Label>
                <div className="ml-auto">
                  <Button
                    size="sm"
                    onClick={handleCreate}
                    disabled={creating}
                  >
                    {creating ? (
                      <Loader2 className="mr-2 size-4 animate-spin" />
                    ) : (
                      <Plus className="mr-2 size-4" />
                    )}
                    Létrehozás
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Table */}
      {loading ? (
        <div className="flex h-40 items-center justify-center text-sm text-muted-foreground">
          Betöltés...
        </div>
      ) : coupons.length === 0 ? (
        <div className="flex h-40 flex-col items-center justify-center gap-2 text-sm text-muted-foreground">
          <Ticket className="size-8 text-muted-foreground/50" />
          <p>Nincsenek kuponok.</p>
        </div>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Kód</TableHead>
              <TableHead>Kedvezmény</TableHead>
              <TableHead className="text-center">Felhasználás</TableHead>
              <TableHead>Érvényesség</TableHead>
              <TableHead>Státusz</TableHead>
              <TableHead className="text-right">Műveletek</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {coupons.map((coupon) => (
              <TableRow key={coupon.id}>
                {editId === coupon.id ? (
                  <>
                    <TableCell>
                      <Input
                        value={editCode}
                        onChange={(e) => setEditCode(e.target.value.toUpperCase())}
                        className="h-8 w-32 font-mono text-xs uppercase"
                      />
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <select
                          value={editDiscountType}
                          onChange={(e) =>
                            setEditDiscountType(
                              e.target.value as "percentage" | "fixed",
                            )
                          }
                          className="h-8 rounded-md border border-input bg-background px-2 text-xs"
                        >
                          <option value="percentage">%</option>
                          <option value="fixed">HUF</option>
                        </select>
                        <Input
                          type="number"
                          min="1"
                          value={editValue}
                          onChange={(e) => setEditValue(e.target.value)}
                          className="h-8 w-20 text-xs"
                        />
                      </div>
                    </TableCell>
                    <TableCell className="text-center">
                      <Input
                        type="number"
                        min="1"
                        value={editMaxUses}
                        onChange={(e) => setEditMaxUses(e.target.value)}
                        placeholder="∞"
                        className="mx-auto h-8 w-16 text-center text-xs"
                      />
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        <Input
                          type="datetime-local"
                          value={editValidFrom}
                          onChange={(e) => setEditValidFrom(e.target.value)}
                          className="h-7 text-xs"
                        />
                        <Input
                          type="datetime-local"
                          value={editValidUntil}
                          onChange={(e) => setEditValidUntil(e.target.value)}
                          className="h-7 text-xs"
                        />
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Checkbox
                          checked={editIsActive}
                          onCheckedChange={(checked) =>
                            setEditIsActive(!!checked)
                          }
                        />
                        <span className="text-xs">Aktív</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7"
                          onClick={handleSave}
                          disabled={saving}
                        >
                          {saving ? (
                            <Loader2 className="size-3.5 animate-spin" />
                          ) : (
                            <Save className="size-3.5" />
                          )}
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7"
                          onClick={() => setEditId(null)}
                        >
                          <X className="size-3.5" />
                        </Button>
                      </div>
                    </TableCell>
                  </>
                ) : (
                  <>
                    <TableCell className="font-mono font-medium">
                      {coupon.code}
                    </TableCell>
                    <TableCell>
                      <span className="font-medium">
                        {formatDiscount(coupon)}
                      </span>
                      {coupon.min_order_amount != null &&
                        coupon.min_order_amount > 0 && (
                          <span className="ml-1 text-xs text-muted-foreground">
                            (min. {formatHUF(coupon.min_order_amount)})
                          </span>
                        )}
                    </TableCell>
                    <TableCell className="text-center tabular-nums">
                      {coupon.used_count}
                      {coupon.max_uses != null && (
                        <span className="text-muted-foreground">
                          /{coupon.max_uses}
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {coupon.valid_from
                        ? formatDate(coupon.valid_from)
                        : "—"}{" "}
                      →{" "}
                      {coupon.valid_until
                        ? formatDate(coupon.valid_until)
                        : "—"}
                    </TableCell>
                    <TableCell>
                      {coupon.is_active ? (
                        <Badge variant="default" className="text-xs">
                          Aktív
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-xs">
                          Inaktív
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7"
                          onClick={() => startEdit(coupon)}
                        >
                          <Pencil className="size-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 text-destructive hover:text-destructive"
                          onClick={() => handleDelete(coupon.id)}
                        >
                          {deletingId === coupon.id ? (
                            <span className="text-xs">Megerősítés?</span>
                          ) : (
                            <Trash2 className="size-3.5" />
                          )}
                        </Button>
                      </div>
                    </TableCell>
                  </>
                )}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <span className="text-xs text-muted-foreground">
            {page}. / {totalPages}. oldal
          </span>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={page <= 1}
              onClick={() => setPage(page - 1)}
            >
              <ChevronLeft className="size-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= totalPages}
              onClick={() => setPage(page + 1)}
            >
              <ChevronRight className="size-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
