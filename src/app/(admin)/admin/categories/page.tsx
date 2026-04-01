"use client";

import { useState, useEffect, useCallback } from "react";
import { Plus, Pencil, Trash2, Loader2, FolderTree, Save, X, Eye, EyeOff } from "lucide-react";
import {
  adminListCategories,
  adminCreateCategory,
  adminUpdateCategory,
  adminToggleCategory,
  adminHardDeleteCategory,
} from "@/lib/actions/categories";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { CategoryRow } from "@/lib/types/database";
import { toSlug } from "@/lib/utils/slug";

/* ------------------------------------------------------------------ */
/*  Admin Categories Page                                              */
/* ------------------------------------------------------------------ */

export default function AdminCategoriesPage() {
  const [categories, setCategories] = useState<CategoryRow[]>([]);
  const [loading, setLoading] = useState(true);

  // Create form
  const [showCreate, setShowCreate] = useState(false);
  const [createName, setCreateName] = useState("");
  const [createSlug, setCreateSlug] = useState("");
  const [createParentId, setCreateParentId] = useState("");
  const [createSortOrder, setCreateSortOrder] = useState("0");
  const [creating, setCreating] = useState(false);

  // Edit form
  const [editId, setEditId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editSlug, setEditSlug] = useState("");
  const [editParentId, setEditParentId] = useState("");
  const [editSortOrder, setEditSortOrder] = useState("0");
  const [saving, setSaving] = useState(false);

  // Toggle / delete state
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  // General
  const [error, setError] = useState<string | null>(null);

  // ── Fetch ──────────────────────────────────────────────────────
  const fetchCategories = useCallback(async () => {
    setLoading(true);
    const res = await adminListCategories();
    if (res.success && res.data) {
      setCategories(res.data);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  // ── Auto slug ──────────────────────────────────────────────────
  useEffect(() => {
    if (createName && !showCreate) return;
    setCreateSlug(toSlug(createName));
  }, [createName, showCreate]);

  // ── Helpers ────────────────────────────────────────────────────
  function getCategoryName(id: string | null): string {
    if (!id) return "—";
    return categories.find((c) => c.id === id)?.name ?? "—";
  }

  // ── Build hierarchy display ────────────────────────────────────
  function getSortedCategories(): (CategoryRow & { depth: number })[] {
    const result: (CategoryRow & { depth: number })[] = [];

    function addChildren(parentId: string | null, depth: number) {
      const children = categories.filter((c) => c.parent_id === parentId);
      for (const child of children) {
        result.push({ ...child, depth });
        addChildren(child.id, depth + 1);
      }
    }

    addChildren(null, 0);
    return result;
  }

  // ── Create ─────────────────────────────────────────────────────
  async function handleCreate() {
    if (!createName.trim() || !createSlug.trim()) {
      setError("A név és slug kötelező.");
      return;
    }

    setCreating(true);
    setError(null);

    const res = await adminCreateCategory({
      name: createName.trim(),
      slug: createSlug.trim(),
      parentId: createParentId || undefined,
      sortOrder: Number(createSortOrder) || 0,
    });

    if (!res.success) {
      setError(res.error ?? "Hiba a kategória létrehozásakor.");
      setCreating(false);
      return;
    }

    setCreateName("");
    setCreateSlug("");
    setCreateParentId("");
    setCreateSortOrder("0");
    setShowCreate(false);
    setCreating(false);
    fetchCategories();
  }

  // ── Start edit ─────────────────────────────────────────────────
  function startEdit(cat: CategoryRow) {
    setEditId(cat.id);
    setEditName(cat.name);
    setEditSlug(cat.slug);
    setEditParentId(cat.parent_id ?? "");
    setEditSortOrder(String(cat.sort_order));
    setError(null);
  }

  function cancelEdit() {
    setEditId(null);
    setError(null);
  }

  // ── Save edit ──────────────────────────────────────────────────
  async function handleSave() {
    if (!editId) return;
    if (!editName.trim() || !editSlug.trim()) {
      setError("A név és slug kötelező.");
      return;
    }

    setSaving(true);
    setError(null);

    const res = await adminUpdateCategory(editId, {
      name: editName.trim(),
      slug: editSlug.trim(),
      parentId: editParentId || null,
      sortOrder: Number(editSortOrder) || 0,
    });

    if (!res.success) {
      setError(res.error ?? "Hiba a kategória frissítésekor.");
      setSaving(false);
      return;
    }

    setEditId(null);
    setSaving(false);
    fetchCategories();
  }

  // ── Toggle active/inactive ─────────────────────────────────────
  async function handleToggle(cat: CategoryRow) {
    setTogglingId(cat.id);
    setError(null);

    const res = await adminToggleCategory(cat.id, !cat.is_active);

    if (!res.success) {
      setError(res.error ?? "Hiba a kategória státuszának módosításakor.");
    } else {
      fetchCategories();
    }

    setTogglingId(null);
  }

  // ── Hard delete ────────────────────────────────────────────────
  async function handleDelete(id: string) {
    // First click: show confirmation
    if (confirmDeleteId !== id) {
      setConfirmDeleteId(id);
      return;
    }

    // Second click: execute
    setDeletingId(id);
    setConfirmDeleteId(null);
    setError(null);

    const res = await adminHardDeleteCategory(id);

    if (!res.success) {
      setError(res.error ?? "Hiba a kategória törlésekor.");
    } else {
      fetchCategories();
    }

    setDeletingId(null);
  }

  // ── Render ─────────────────────────────────────────────────────
  const sortedCategories = getSortedCategories();
  const topLevelForParentSelect = categories.filter((c) => !c.parent_id);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Kategóriák</h1>
          <p className="text-muted-foreground mt-1 text-sm">{categories.length} kategória</p>
        </div>
        <Button
          size="sm"
          onClick={() => {
            setShowCreate(!showCreate);
            setError(null);
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
              Új kategória
            </>
          )}
        </Button>
      </div>

      {error && (
        <div className="border-destructive/50 bg-destructive/10 text-destructive rounded-lg border px-4 py-3 text-sm">
          {error}
        </div>
      )}

      {/* Create form */}
      {showCreate && (
        <Card>
          <CardHeader>
            <CardTitle>Új kategória</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div className="space-y-2">
                <Label>Név *</Label>
                <Input
                  value={createName}
                  onChange={(e) => setCreateName(e.target.value)}
                  placeholder="pl. Pólók"
                />
              </div>
              <div className="space-y-2">
                <Label>Slug *</Label>
                <Input
                  value={createSlug}
                  onChange={(e) => setCreateSlug(e.target.value)}
                  placeholder="polok"
                  className="font-mono text-sm"
                />
              </div>
              <div className="space-y-2">
                <Label>Szülő kategória</Label>
                <select
                  value={createParentId}
                  onChange={(e) => setCreateParentId(e.target.value)}
                  className="border-input bg-background focus-visible:ring-ring flex h-9 w-full rounded-md border px-3 py-1 text-sm shadow-sm transition-colors focus-visible:ring-1 focus-visible:outline-none"
                >
                  <option value="">Nincs (felső szintű)</option>
                  {topLevelForParentSelect.map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <Label>Sorrend</Label>
                <div className="flex items-end gap-2">
                  <Input
                    type="number"
                    min="0"
                    value={createSortOrder}
                    onChange={(e) => setCreateSortOrder(e.target.value)}
                    className="w-20"
                  />
                  <Button size="sm" onClick={handleCreate} disabled={creating}>
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
        <div className="text-muted-foreground flex h-40 items-center justify-center text-sm">
          Betöltés...
        </div>
      ) : sortedCategories.length === 0 ? (
        <div className="text-muted-foreground flex h-40 flex-col items-center justify-center gap-2 text-sm">
          <FolderTree className="text-muted-foreground/50 size-8" />
          <p>Nincsenek kategóriák.</p>
        </div>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Név</TableHead>
              <TableHead>Slug</TableHead>
              <TableHead>Szülő</TableHead>
              <TableHead className="text-center">Sorrend</TableHead>
              <TableHead className="text-right">Műveletek</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortedCategories.map((cat) => (
              <TableRow key={cat.id}>
                {editId === cat.id ? (
                  <>
                    <TableCell>
                      <Input
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        className="h-8 text-sm"
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        value={editSlug}
                        onChange={(e) => setEditSlug(e.target.value)}
                        className="h-8 font-mono text-sm"
                      />
                    </TableCell>
                    <TableCell>
                      <select
                        value={editParentId}
                        onChange={(e) => setEditParentId(e.target.value)}
                        className="border-input bg-background flex h-8 w-full rounded-md border px-2 py-1 text-sm"
                      >
                        <option value="">Nincs</option>
                        {categories
                          .filter((c) => c.id !== cat.id && !c.parent_id)
                          .map((c) => (
                            <option key={c.id} value={c.id}>
                              {c.name}
                            </option>
                          ))}
                      </select>
                    </TableCell>
                    <TableCell className="text-center">
                      <Input
                        type="number"
                        min="0"
                        value={editSortOrder}
                        onChange={(e) => setEditSortOrder(e.target.value)}
                        className="mx-auto h-8 w-16 text-center text-sm"
                      />
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
                        <Button variant="ghost" size="sm" className="h-7" onClick={cancelEdit}>
                          <X className="size-3.5" />
                        </Button>
                      </div>
                    </TableCell>
                  </>
                ) : (
                  <>
                    <TableCell>
                      <span
                        style={{ paddingLeft: `${cat.depth * 24}px` }}
                        className="flex items-center gap-2"
                      >
                        {cat.depth > 0 && <span className="text-muted-foreground">└</span>}
                        <span
                          className={
                            cat.is_active ? "font-medium" : "text-muted-foreground font-medium"
                          }
                        >
                          {cat.name}
                        </span>
                        {!cat.is_active && (
                          <Badge variant="secondary" className="ml-2 px-1.5 py-0 text-[10px]">
                            Inaktív
                          </Badge>
                        )}
                      </span>
                    </TableCell>
                    <TableCell className="text-muted-foreground font-mono text-xs">
                      {cat.slug}
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {getCategoryName(cat.parent_id)}
                    </TableCell>
                    <TableCell className="text-center text-sm tabular-nums">
                      {cat.sort_order}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        {/* Edit */}
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7"
                          title="Szerkesztés"
                          onClick={() => startEdit(cat)}
                        >
                          <Pencil className="size-3.5" />
                        </Button>

                        {/* Toggle active / inactive */}
                        <Button
                          variant="ghost"
                          size="sm"
                          className={`h-7 ${cat.is_active ? "text-muted-foreground hover:text-foreground" : "text-muted-foreground hover:text-emerald-600"}`}
                          title={cat.is_active ? "Inaktiválás" : "Aktiválás"}
                          onClick={() => handleToggle(cat)}
                          disabled={togglingId === cat.id}
                        >
                          {togglingId === cat.id ? (
                            <Loader2 className="size-3.5 animate-spin" />
                          ) : cat.is_active ? (
                            <EyeOff className="size-3.5" />
                          ) : (
                            <Eye className="size-3.5" />
                          )}
                        </Button>

                        {/* Permanent delete */}
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-destructive hover:text-destructive h-7"
                          title="Végleges törlés"
                          onClick={() => handleDelete(cat.id)}
                          disabled={deletingId === cat.id}
                        >
                          {deletingId === cat.id ? (
                            <Loader2 className="size-3.5 animate-spin" />
                          ) : confirmDeleteId === cat.id ? (
                            <span className="text-xs font-medium">Biztos?</span>
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

      {/* Cancel delete confirmation on outside click hint */}
      {confirmDeleteId && (
        <p className="text-muted-foreground text-center text-xs">
          Kattints újra a piros törlés gombra a megerősítéshez, vagy máshova kattintva
          megszakíthatod.
        </p>
      )}
    </div>
  );
}
