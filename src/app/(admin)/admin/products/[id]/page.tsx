"use client";

import { useState, useEffect, use } from "react";
import { useRouter } from "next/navigation";
import {
  Plus,
  Trash2,
  Save,
  Loader2,
  ImagePlus,
  AlertTriangle,
  Eye,
  EyeOff,
} from "lucide-react";
import { adminUpdateProduct, adminHardDeleteProduct, adminToggleProductActive, adminGetProduct } from "@/lib/actions/products";
import { listCategories } from "@/lib/actions/categories";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import type {
  ProductRow,
  ProductVariantRow,
  CategoryRow,
} from "@/lib/types/database";

/* ------------------------------------------------------------------ */
/*  Variant row type (client-side)                                     */
/* ------------------------------------------------------------------ */

interface VariantRow {
  key: string;
  id?: string;
  sku: string;
  option1Name: string;
  option1Value: string;
  option2Name: string;
  option2Value: string;
  priceOverride: string;
  stockQuantity: string;
  isActive: boolean;
}

function variantFromDB(v: ProductVariantRow): VariantRow {
  return {
    key: v.id,
    id: v.id,
    sku: v.sku ?? "",
    option1Name: v.option1_name ?? "Méret",
    option1Value: v.option1_value ?? "",
    option2Name: v.option2_name ?? "",
    option2Value: v.option2_value ?? "",
    priceOverride: v.price_override != null ? String(v.price_override) : "",
    stockQuantity: String(v.stock_quantity),
    isActive: v.is_active,
  };
}

function emptyVariant(): VariantRow {
  return {
    key: crypto.randomUUID(),
    sku: "",
    option1Name: "Méret",
    option1Value: "",
    option2Name: "",
    option2Value: "",
    priceOverride: "",
    stockQuantity: "0",
    isActive: true,
  };
}

/* ------------------------------------------------------------------ */
/*  Admin Product Edit Page                                            */
/* ------------------------------------------------------------------ */

export default function AdminProductEditPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();

  // Product data
  const [product, setProduct] = useState<ProductRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  // Form state
  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [description, setDescription] = useState("");
  const [basePrice, setBasePrice] = useState("");
  const [compareAtPrice, setCompareAtPrice] = useState("");
  const [mainImageUrl, setMainImageUrl] = useState("");
  const [imageUrls, setImageUrls] = useState<string[]>([]);
  const [newImageUrl, setNewImageUrl] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [selectedCategoryIds, setSelectedCategoryIds] = useState<string[]>([]);
  const [variants, setVariants] = useState<VariantRow[]>([]);

  // Categories
  const [categories, setCategories] = useState<CategoryRow[]>([]);

  // Submit / delete
  const [submitting, setSubmitting] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [toggling, setToggling] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // ── Fetch product + variants + categories ─────────────────────
  useEffect(() => {
    async function load() {
      setLoading(true);

      const result = await adminGetProduct(id);

      if (!result.success || !result.data) {
        setNotFound(true);
        setLoading(false);
        return;
      }

      const { product: prod, variants: dbVariants, categories: prodCategories } = result.data;

      setProduct(prod);
      setTitle(prod.title);
      setSlug(prod.slug);
      setDescription(prod.description ?? "");
      setBasePrice(String(prod.base_price));
      setCompareAtPrice(
        prod.compare_at_price != null ? String(prod.compare_at_price) : "",
      );
      setMainImageUrl(prod.main_image_url ?? "");
      setImageUrls(prod.image_urls ?? []);
      setIsActive(prod.is_active);

      if (dbVariants) {
        setVariants(dbVariants.map(variantFromDB));
      }

      setSelectedCategoryIds(prodCategories.map((c: CategoryRow) => c.id));
      setLoading(false);
    }

    load();
  }, [id]);

  // Fetch all categories
  useEffect(() => {
    listCategories().then((res) => {
      if (res.success && res.data) {
        setCategories(res.data);
      }
    });
  }, []);

  // ── Category toggle ────────────────────────────────────────────
  function toggleCategory(catId: string) {
    setSelectedCategoryIds((prev) =>
      prev.includes(catId) ? prev.filter((c) => c !== catId) : [...prev, catId],
    );
  }

  // ── Image management ───────────────────────────────────────────
  function addImageUrl() {
    const url = newImageUrl.trim();
    if (url && !imageUrls.includes(url)) {
      setImageUrls((prev) => [...prev, url]);
      setNewImageUrl("");
    }
  }

  function removeImageUrl(index: number) {
    setImageUrls((prev) => prev.filter((_, i) => i !== index));
  }

  // ── Variant management ─────────────────────────────────────────
  function addVariant() {
    setVariants((prev) => [...prev, emptyVariant()]);
  }

  function removeVariant(key: string) {
    setVariants((prev) => prev.filter((v) => v.key !== key));
  }

  function updateVariant(
    key: string,
    field: keyof VariantRow,
    value: string | boolean,
  ) {
    setVariants((prev) =>
      prev.map((v) => (v.key === key ? { ...v, [field]: value } : v)),
    );
  }

  // ── Save ───────────────────────────────────────────────────────
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(false);

    if (!title.trim()) {
      setError("A termék neve kötelező.");
      return;
    }
    if (!slug.trim()) {
      setError("A slug kötelező.");
      return;
    }
    if (!basePrice || Number(basePrice) < 0) {
      setError("Érvényes alapár szükséges.");
      return;
    }

    setSubmitting(true);

    try {
      const formData = new FormData();
      formData.set("title", title.trim());
      formData.set("slug", slug.trim());
      formData.set("description", description);
      formData.set("basePrice", String(Math.round(Number(basePrice))));

      if (compareAtPrice) {
        formData.set(
          "compareAtPrice",
          String(Math.round(Number(compareAtPrice))),
        );
      } else {
        formData.set("compareAtPrice", "");
      }

      formData.set("mainImageUrl", mainImageUrl.trim());
      formData.set("imageUrls", JSON.stringify(imageUrls));
      formData.set("isActive", String(isActive));
      formData.set("categoryIds", JSON.stringify(selectedCategoryIds));

      // Variants
      const variantsPayload = variants.map((v) => ({
        id: v.id,
        sku: v.sku || undefined,
        option1Name: v.option1Name || "Méret",
        option1Value: v.option1Value,
        option2Name: v.option2Name || undefined,
        option2Value: v.option2Value || undefined,
        priceOverride: v.priceOverride ? Number(v.priceOverride) : undefined,
        stockQuantity: Number(v.stockQuantity) || 0,
        isActive: v.isActive,
      }));
      formData.set("variants", JSON.stringify(variantsPayload));

      const result = await adminUpdateProduct(id, formData);

      if (!result.success) {
        setError(result.error ?? "Hiba a termék frissítésekor.");
        return;
      }

      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch {
      setError("Váratlan hiba történt.");
    } finally {
      setSubmitting(false);
    }
  }

  // ── Delete ─────────────────────────────────────────────────────
  async function handleDelete() {
    if (!confirmDelete) {
      setConfirmDelete(true);
      return;
    }

    setDeleting(true);

    try {
      const result = await adminHardDeleteProduct(id);
      if (!result.success) {
        setError(result.error ?? "Hiba a termék törlésekor.");
        setDeleting(false);
        return;
      }
      router.push("/admin/products");
    } catch {
      setError("Váratlan hiba történt.");
      setDeleting(false);
    }
  }

  // ── Toggle active/inactive ─────────────────────────────────────
  async function handleToggleActive() {
    if (!product) return;
    setToggling(true);
    setError(null);
    try {
      const newActive = !isActive;
      const result = await adminToggleProductActive(id, newActive);
      if (!result.success) {
        setError(result.error ?? "Hiba a termék státuszának módosításakor.");
      } else {
        setIsActive(newActive);
        setProduct({ ...product, is_active: newActive });
      }
    } catch {
      setError("Váratlan hiba történt.");
    } finally {
      setToggling(false);
    }
  }

  // ── Loading / Not found states ─────────────────────────────────
  if (loading) {
    return (
      <div className="flex h-60 items-center justify-center text-sm text-muted-foreground">
        <Loader2 className="mr-2 size-4 animate-spin" />
        Betöltés...
      </div>
    );
  }

  if (notFound) {
    return (
      <div className="flex h-60 flex-col items-center justify-center gap-4 text-sm text-muted-foreground">
        <p>A termék nem található.</p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            Termék szerkesztése
          </h1>
          <p className="mt-1 text-sm text-muted-foreground font-mono">
            {product?.slug}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {/* Toggle active / inactive */}
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleToggleActive}
            disabled={toggling}
            title={isActive ? "Inaktiválás" : "Aktiválás"}
          >
            {toggling ? (
              <Loader2 className="mr-2 size-4 animate-spin" />
            ) : isActive ? (
              <EyeOff className="mr-2 size-4" />
            ) : (
              <Eye className="mr-2 size-4" />
            )}
            {isActive ? "Inaktiválás" : "Aktiválás"}
          </Button>
          {/* Hard delete */}
          <Button
            type="button"
            variant="destructive"
            size="sm"
            onClick={handleDelete}
            disabled={deleting}
          >
            {deleting ? (
              <Loader2 className="mr-2 size-4 animate-spin" />
            ) : (
              <Trash2 className="mr-2 size-4" />
            )}
            {confirmDelete ? "Megerősítés" : "Törlés"}
          </Button>
          <Button type="submit" size="sm" disabled={submitting}>
            {submitting ? (
              <Loader2 className="mr-2 size-4 animate-spin" />
            ) : (
              <Save className="mr-2 size-4" />
            )}
            Mentés
          </Button>
        </div>
      </div>

      {error && (
        <div className="rounded-lg border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      )}

      {success && (
        <div className="rounded-lg border border-green-500/50 bg-green-50 px-4 py-3 text-sm text-green-700 dark:bg-green-950/50 dark:text-green-400">
          Termék sikeresen frissítve.
        </div>
      )}

      {confirmDelete && (
        <div className="rounded-lg border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive flex items-center gap-2">
          <AlertTriangle className="size-4 shrink-0" />
          Biztosan törölni szeretné ezt a terméket? Kattintson ismét a Megerősítés
          gombra.
          <button
            type="button"
            className="ml-auto cursor-pointer underline"
            onClick={() => setConfirmDelete(false)}
          >
            Mégsem
          </button>
        </div>
      )}

      <div className="grid gap-8 lg:grid-cols-[1fr_340px]">
        {/* Left column */}
        <div className="space-y-6">
          {/* Basic info */}
          <Card>
            <CardHeader>
              <CardTitle>Alapadatok</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="title">Termék neve *</Label>
                <Input
                  id="title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="slug">Slug *</Label>
                <Input
                  id="slug"
                  value={slug}
                  onChange={(e) => setSlug(e.target.value)}
                  className="font-mono text-sm"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Leírás</Label>
                <textarea
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={5}
                  className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                />
              </div>
            </CardContent>
          </Card>

          {/* Pricing */}
          <Card>
            <CardHeader>
              <CardTitle>Árazás</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="basePrice">Alapár (HUF) *</Label>
                <Input
                  id="basePrice"
                  type="number"
                  min="0"
                  step="1"
                  value={basePrice}
                  onChange={(e) => setBasePrice(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="compareAtPrice">
                  Összehasonlító ár (HUF)
                </Label>
                <Input
                  id="compareAtPrice"
                  type="number"
                  min="0"
                  step="1"
                  value={compareAtPrice}
                  onChange={(e) => setCompareAtPrice(e.target.value)}
                  placeholder="Opcionális"
                />
              </div>
            </CardContent>
          </Card>

          {/* Images */}
          <Card>
            <CardHeader>
              <CardTitle>Képek</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="mainImageUrl">Fő kép URL</Label>
                <Input
                  id="mainImageUrl"
                  type="url"
                  value={mainImageUrl}
                  onChange={(e) => setMainImageUrl(e.target.value)}
                  placeholder="https://..."
                />
              </div>

              <div className="space-y-2">
                <Label>Galéria képek</Label>
                <div className="flex gap-2">
                  <Input
                    type="url"
                    value={newImageUrl}
                    onChange={(e) => setNewImageUrl(e.target.value)}
                    placeholder="Kép URL hozzáadása..."
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        addImageUrl();
                      }
                    }}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={addImageUrl}
                  >
                    <ImagePlus className="size-4" />
                  </Button>
                </div>

                {imageUrls.length > 0 && (
                  <div className="mt-3 space-y-2">
                    {imageUrls.map((url, i) => (
                      <div
                        key={i}
                        className="flex items-center gap-2 rounded-md border bg-muted/50 px-3 py-2"
                      >
                        <div className="size-8 shrink-0 overflow-hidden rounded bg-muted">
                          <img
                            src={url}
                            alt=""
                            className="size-full object-cover"
                          />
                        </div>
                        <span className="flex-1 truncate text-xs font-mono">
                          {url}
                        </span>
                        <button
                          type="button"
                          onClick={() => removeImageUrl(i)}
                          className="cursor-pointer text-muted-foreground hover:text-destructive"
                        >
                          <Trash2 className="size-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Variants */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Variánsok</CardTitle>
                  <CardDescription>
                    Méret, szín stb. variánsok kezelése.
                  </CardDescription>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={addVariant}
                >
                  <Plus className="mr-2 size-4" />
                  Variáns
                </Button>
              </div>
            </CardHeader>
            {variants.length > 0 && (
              <CardContent className="space-y-4">
                {variants.map((v, idx) => (
                  <div
                    key={v.key}
                    className="rounded-lg border bg-muted/30 p-4 space-y-3"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">
                        Variáns #{idx + 1}
                        {v.id && (
                          <span className="ml-2 text-xs text-muted-foreground font-mono">
                            {v.id.slice(0, 8)}
                          </span>
                        )}
                      </span>
                      <button
                        type="button"
                        onClick={() => removeVariant(v.key)}
                        className="cursor-pointer text-muted-foreground hover:text-destructive"
                      >
                        <Trash2 className="size-4" />
                      </button>
                    </div>

                    <div className="grid gap-3 sm:grid-cols-3">
                      <div className="space-y-1">
                        <Label className="text-xs">SKU</Label>
                        <Input
                          value={v.sku}
                          onChange={(e) =>
                            updateVariant(v.key, "sku", e.target.value)
                          }
                          className="h-8 text-xs"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Opció 1 neve</Label>
                        <Input
                          value={v.option1Name}
                          onChange={(e) =>
                            updateVariant(v.key, "option1Name", e.target.value)
                          }
                          className="h-8 text-xs"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Opció 1 értéke *</Label>
                        <Input
                          value={v.option1Value}
                          onChange={(e) =>
                            updateVariant(v.key, "option1Value", e.target.value)
                          }
                          className="h-8 text-xs"
                        />
                      </div>
                    </div>

                    <div className="grid gap-3 sm:grid-cols-3">
                      <div className="space-y-1">
                        <Label className="text-xs">Opció 2 neve</Label>
                        <Input
                          value={v.option2Name}
                          onChange={(e) =>
                            updateVariant(v.key, "option2Name", e.target.value)
                          }
                          className="h-8 text-xs"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Opció 2 értéke</Label>
                        <Input
                          value={v.option2Value}
                          onChange={(e) =>
                            updateVariant(v.key, "option2Value", e.target.value)
                          }
                          className="h-8 text-xs"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Ár felülírás (HUF)</Label>
                        <Input
                          type="number"
                          min="0"
                          step="1"
                          value={v.priceOverride}
                          onChange={(e) =>
                            updateVariant(v.key, "priceOverride", e.target.value)
                          }
                          className="h-8 text-xs"
                        />
                      </div>
                    </div>

                    <div className="grid gap-3 sm:grid-cols-3">
                      <div className="space-y-1">
                        <Label className="text-xs">Készlet *</Label>
                        <Input
                          type="number"
                          min="0"
                          step="1"
                          value={v.stockQuantity}
                          onChange={(e) =>
                            updateVariant(v.key, "stockQuantity", e.target.value)
                          }
                          className="h-8 text-xs"
                        />
                      </div>
                      <div className="flex items-end gap-2 pb-1">
                        <Checkbox
                          checked={v.isActive}
                          onCheckedChange={(checked) =>
                            updateVariant(v.key, "isActive", !!checked)
                          }
                        />
                        <Label className="text-xs">Aktív</Label>
                      </div>
                    </div>
                  </div>
                ))}
              </CardContent>
            )}
          </Card>
        </div>

        {/* Right column */}
        <div className="space-y-6">
          {/* Status */}
          <Card>
            <CardHeader>
              <CardTitle>Státusz</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center gap-2">
                <Checkbox
                  checked={isActive}
                  onCheckedChange={(checked) => setIsActive(!!checked)}
                />
                <Label>Aktív (megjelenik a webshopban)</Label>
              </div>
              {!isActive && (
                <Badge variant="outline" className="text-xs">
                  Inaktív — nem látható a vásárlóknak
                </Badge>
              )}
            </CardContent>
          </Card>

          {/* Categories */}
          <Card>
            <CardHeader>
              <CardTitle>Kategóriák</CardTitle>
            </CardHeader>
            <CardContent>
              {categories.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  Nincsenek kategóriák.
                </p>
              ) : (
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {categories.map((cat) => (
                    <div key={cat.id} className="flex items-center gap-2">
                      <Checkbox
                        checked={selectedCategoryIds.includes(cat.id)}
                        onCheckedChange={() => toggleCategory(cat.id)}
                      />
                      <Label className="text-sm font-normal">
                        {cat.parent_id && (
                          <span className="text-muted-foreground">— </span>
                        )}
                        {cat.name}
                      </Label>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Meta */}
          {product && (
            <Card>
              <CardHeader>
                <CardTitle>Meta</CardTitle>
              </CardHeader>
              <CardContent className="text-xs text-muted-foreground space-y-1">
                <p>
                  <span className="font-medium">ID:</span>{" "}
                  <span className="font-mono">{product.id}</span>
                </p>
                <p>
                  <span className="font-medium">Létrehozva:</span>{" "}
                  {new Date(product.created_at).toLocaleString("hu-HU")}
                </p>
                <p>
                  <span className="font-medium">Frissítve:</span>{" "}
                  {new Date(product.updated_at).toLocaleString("hu-HU")}
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </form>
  );
}
