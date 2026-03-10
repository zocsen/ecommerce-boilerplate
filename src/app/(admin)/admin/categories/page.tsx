"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Plus,
  Pencil,
  Trash2,
  Loader2,
  FolderTree,
  Save,
  X,
  RotateCcw,
} from "lucide-react";
import {
  adminListCategories,
  adminCreateCategory,
  adminUpdateCategory,
  adminDeleteCategory,
  adminRestoreCategory,
} from "@/lib/actions/categories";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { CategoryRow } from "@/lib/types/database";

/* ------------------------------------------------------------------ */
/*  Slug generation helper                                             */
/* ------------------------------------------------------------------ */

function toSlug(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

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

  // Delete
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [restoringId, setRestoringId] = useState<string | null>(null);

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
  // Sort: top-level first, then children indented
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

  // ── Delete ─────────────────────────────────────────────────────
  async function handleDelete(id: string) {
    if (deletingId !== id) {
      setDeletingId(id);
      return;
    }

    setError(null);
    const res = await adminDeleteCategory(id);

    if (!res.success) {
      setError(res.error ?? "Hiba a kategória törlésekor.");
      setDeletingId(null);
      return;
    }

    setDeletingId(null);
    fetchCategories();
  }

  // ── Restore ────────────────────────────────────────────────────
  async function handleRestore(id: string) {
    setRestoringId(id);
    setError(null);

    const res = await adminRestoreCategory(id);

    if (!res.success) {
      setError(res.error ?? "Hiba a kategória visszaállításakor.");
      setRestoringId(null);
      return;
    }

    setRestoringId(null);
    fetchCategories();
  }

  // ── Render ─────────────────────────────────────────────────────
  const sortedCategories = getSortedCategories();
  const topLevelForParentSelect = categories.filter((c) => !c.parent_id);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Kategóriák</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {categories.length} kategória
          </p>
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
        <div className="rounded-lg border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive">
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
                  className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
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
      ) : sortedCategories.length === 0 ? (
        <div className="flex h-40 flex-col items-center justify-center gap-2 text-sm text-muted-foreground">
          <FolderTree className="size-8 text-muted-foreground/50" />
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
                        className="h-8 text-sm font-mono"
                      />
                    </TableCell>
                    <TableCell>
                      <select
                        value={editParentId}
                        onChange={(e) => setEditParentId(e.target.value)}
                        className="flex h-8 w-full rounded-md border border-input bg-background px-2 py-1 text-sm"
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
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7"
                          onClick={cancelEdit}
                        >
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
                        {cat.depth > 0 && (
                          <span className="text-muted-foreground">└</span>
                        )}
                        <span className="font-medium">{cat.name}</span>
                        {!cat.is_active && (
                          <Badge variant="secondary" className="ml-2 text-[10px] px-1.5 py-0">
                            Inaktív
                          </Badge>
                        )}
                      </span>
                    </TableCell>
                    <TableCell className="font-mono text-xs text-muted-foreground">
                      {cat.slug}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {getCategoryName(cat.parent_id)}
                    </TableCell>
                    <TableCell className="text-center tabular-nums text-sm">
                      {cat.sort_order}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7"
                          onClick={() => startEdit(cat)}
                        >
                          <Pencil className="size-3.5" />
                        </Button>
                        {!cat.is_active ? (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 text-emerald-600 hover:text-emerald-600"
                            onClick={() => handleRestore(cat.id)}
                            disabled={restoringId === cat.id}
                          >
                            {restoringId === cat.id ? (
                              <Loader2 className="size-3.5 animate-spin" />
                            ) : (
                              <RotateCcw className="size-3.5" />
                            )}
                          </Button>
                        ) : (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 text-destructive hover:text-destructive"
                            onClick={() => handleDelete(cat.id)}
                          >
                            {deletingId === cat.id ? (
                              <span className="text-xs">Megerősítés?</span>
                            ) : (
                              <Trash2 className="size-3.5" />
                            )}
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </>
                )}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  );
}
