"use client";

import { useState, useEffect, use } from "react";
import { useRouter } from "next/navigation";
import {
  Plus,
  Trash2,
  Save,
  Loader2,
  AlertTriangle,
  Eye,
  EyeOff,
  Search,
  GripVertical,
} from "lucide-react";
import {
  adminUpdateProduct,
  adminHardDeleteProduct,
  adminToggleProductActive,
  adminGetProduct,
  adminListProducts,
  getProductPriceHistory,
} from "@/lib/actions/products";
import { listCategories } from "@/lib/actions/categories";
import { SingleImageUpload, GalleryImageUpload } from "@/components/admin/image-upload";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { siteConfig } from "@/lib/config/site.config";
import { PriceSparkline } from "@/components/admin/price-sparkline";
import type {
  ProductRow,
  ProductVariantRow,
  CategoryRow,
  ProductExtraWithProduct,
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
  weightGrams: string;
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
    weightGrams: v.weight_grams != null ? String(v.weight_grams) : "",
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
    weightGrams: "",
  };
}

/* ------------------------------------------------------------------ */
/*  Extra row type (client-side)                                       */
/* ------------------------------------------------------------------ */

interface ExtraRow {
  key: string;
  extraProductId: string;
  extraVariantId: string | null;
  extraProductTitle: string;
  label: string;
  isDefaultChecked: boolean;
  sortOrder: number;
}

function extraFromDB(e: ProductExtraWithProduct): ExtraRow {
  return {
    key: e.id,
    extraProductId: e.extra_product_id,
    extraVariantId: e.extra_variant_id,
    extraProductTitle: e.extra_product_title,
    label: e.label,
    isDefaultChecked: e.is_default_checked,
    sortOrder: e.sort_order,
  };
}

/* ------------------------------------------------------------------ */
/*  Admin Product Edit Page                                            */
/* ------------------------------------------------------------------ */

export default function AdminProductEditPage({ params }: { params: Promise<{ id: string }> }) {
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
  const [vatRate, setVatRate] = useState(String(siteConfig.tax.defaultVatRate));
  const [weightGrams, setWeightGrams] = useState("");
  const [mainImageUrl, setMainImageUrl] = useState("");
  const [imageUrls, setImageUrls] = useState<string[]>([]);
  const [isActive, setIsActive] = useState(true);
  const [publishedAt, setPublishedAt] = useState("");
  const [selectedCategoryIds, setSelectedCategoryIds] = useState<string[]>([]);
  const [variants, setVariants] = useState<VariantRow[]>([]);

  // Extras
  const [extras, setExtras] = useState<ExtraRow[]>([]);
  const [extraSearch, setExtraSearch] = useState("");
  const [extraSearchResults, setExtraSearchResults] = useState<
    Array<{ id: string; title: string; slug: string; base_price: number }>
  >([]);
  const [extraSearching, setExtraSearching] = useState(false);

  // Categories
  const [categories, setCategories] = useState<CategoryRow[]>([]);

  // Price history (FE-006)
  const [priceHistory, setPriceHistory] = useState<Array<{ price: number; date: string }>>([]);

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

      const {
        product: prod,
        variants: dbVariants,
        categories: prodCategories,
        extras: dbExtras,
      } = result.data;

      setProduct(prod);
      setTitle(prod.title);
      setSlug(prod.slug);
      setDescription(prod.description ?? "");
      setBasePrice(String(prod.base_price));
      setCompareAtPrice(prod.compare_at_price != null ? String(prod.compare_at_price) : "");
      setVatRate(String(prod.vat_rate));
      setWeightGrams(prod.weight_grams != null ? String(prod.weight_grams) : "");
      setMainImageUrl(prod.main_image_url ?? "");
      setImageUrls(prod.image_urls ?? []);
      setIsActive(prod.is_active);

      // Convert published_at ISO string to datetime-local format for the input
      if (prod.published_at) {
        const dt = new Date(prod.published_at);
        const local = new Date(dt.getTime() - dt.getTimezoneOffset() * 60000)
          .toISOString()
          .slice(0, 16);
        setPublishedAt(local);
      } else {
        setPublishedAt("");
      }

      if (dbVariants) {
        setVariants(dbVariants.map(variantFromDB));
      }

      if (dbExtras) {
        setExtras(dbExtras.map(extraFromDB));
      }

      setSelectedCategoryIds(prodCategories.map((c: CategoryRow) => c.id));
      setLoading(false);

      // Fetch price history for sparkline (FE-006)
      getProductPriceHistory(id).then((res) => {
        if (res.success && res.data) {
          setPriceHistory(res.data.history.map((h) => ({ price: h.price, date: h.date })));
        }
      });
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

  // ── Variant management ─────────────────────────────────────────
  function addVariant() {
    setVariants((prev) => [...prev, emptyVariant()]);
  }

  function removeVariant(key: string) {
    setVariants((prev) => prev.filter((v) => v.key !== key));
  }

  function updateVariant(key: string, field: keyof VariantRow, value: string | boolean) {
    setVariants((prev) => prev.map((v) => (v.key === key ? { ...v, [field]: value } : v)));
  }

  // ── Extras management ──────────────────────────────────────────
  async function searchExtraProducts(query: string) {
    setExtraSearch(query);
    if (query.trim().length < 2) {
      setExtraSearchResults([]);
      return;
    }
    setExtraSearching(true);
    try {
      const result = await adminListProducts({ search: query.trim(), perPage: 10 });
      if (result.success && result.data) {
        // Filter out current product and already-added extras
        const existingIds = new Set(extras.map((e) => e.extraProductId));
        setExtraSearchResults(
          result.data.products
            .filter((p) => p.id !== id && !existingIds.has(p.id))
            .map((p) => ({ id: p.id, title: p.title, slug: p.slug, base_price: p.base_price })),
        );
      }
    } finally {
      setExtraSearching(false);
    }
  }

  function addExtra(productResult: {
    id: string;
    title: string;
    slug: string;
    base_price: number;
  }) {
    const newExtra: ExtraRow = {
      key: crypto.randomUUID(),
      extraProductId: productResult.id,
      extraVariantId: null,
      extraProductTitle: productResult.title,
      label: `${productResult.title} (+${Math.round(productResult.base_price).toLocaleString("hu-HU")} Ft)`,
      isDefaultChecked: false,
      sortOrder: extras.length,
    };
    setExtras((prev) => [...prev, newExtra]);
    setExtraSearch("");
    setExtraSearchResults([]);
  }

  function removeExtra(key: string) {
    setExtras((prev) => prev.filter((e) => e.key !== key));
  }

  function updateExtra(key: string, field: keyof ExtraRow, value: string | boolean | number) {
    setExtras((prev) => prev.map((e) => (e.key === key ? { ...e, [field]: value } : e)));
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
        formData.set("compareAtPrice", String(Math.round(Number(compareAtPrice))));
      } else {
        formData.set("compareAtPrice", "");
      }

      formData.set("vatRate", vatRate);

      if (weightGrams) {
        formData.set("weightGrams", weightGrams);
      }

      formData.set("mainImageUrl", mainImageUrl.trim());
      formData.set("imageUrls", JSON.stringify(imageUrls));
      formData.set("isActive", String(isActive));
      formData.set("publishedAt", publishedAt ? new Date(publishedAt).toISOString() : "");
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
        weightGrams: v.weightGrams ? Number(v.weightGrams) : undefined,
      }));
      formData.set("variants", JSON.stringify(variantsPayload));

      // Extras
      const extrasPayload = extras.map((e) => ({
        extraProductId: e.extraProductId,
        extraVariantId: e.extraVariantId || undefined,
        label: e.label,
        isDefaultChecked: e.isDefaultChecked,
        sortOrder: e.sortOrder,
      }));
      formData.set("extras", JSON.stringify(extrasPayload));

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
      <div className="text-muted-foreground flex h-60 items-center justify-center text-sm">
        <Loader2 className="mr-2 size-4 animate-spin" />
        Betöltés...
      </div>
    );
  }

  if (notFound) {
    return (
      <div className="text-muted-foreground flex h-60 flex-col items-center justify-center gap-4 text-sm">
        <p>A termék nem található.</p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Termék szerkesztése</h1>
          <p className="text-muted-foreground mt-1 font-mono text-sm">{product?.slug}</p>
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
        <div className="border-destructive/50 bg-destructive/10 text-destructive rounded-lg border px-4 py-3 text-sm">
          {error}
        </div>
      )}

      {success && (
        <div className="rounded-lg border border-green-500/50 bg-green-50 px-4 py-3 text-sm text-green-700 dark:bg-green-950/50 dark:text-green-400">
          Termék sikeresen frissítve.
        </div>
      )}

      {confirmDelete && (
        <div className="border-destructive/50 bg-destructive/10 text-destructive flex items-center gap-2 rounded-lg border px-4 py-3 text-sm">
          <AlertTriangle className="size-4 shrink-0" />
          Biztosan törölni szeretné ezt a terméket? Kattintson ismét a Megerősítés gombra.
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
                <Input id="title" value={title} onChange={(e) => setTitle(e.target.value)} />
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
                  className="border-input bg-background ring-offset-background placeholder:text-muted-foreground focus-visible:ring-ring flex w-full rounded-md border px-3 py-2 text-sm focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none"
                />
              </div>
            </CardContent>
          </Card>

          {/* Pricing */}
          <Card>
            <CardHeader>
              <CardTitle>Árazás</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-3">
                <div className="space-y-2">
                  <Label htmlFor="basePrice">Alapár (HUF) *</Label>
                  <div className="flex items-center gap-3">
                    <Input
                      id="basePrice"
                      type="number"
                      min="0"
                      step="1"
                      value={basePrice}
                      onChange={(e) => setBasePrice(e.target.value)}
                      className="flex-1"
                    />
                    <PriceSparkline history={priceHistory} />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="compareAtPrice">Összehasonlító ár (HUF)</Label>
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

                <div className="space-y-2">
                  <Label>ÁFA kulcs</Label>
                  <Select
                    value={vatRate}
                    onValueChange={(val: string | null) =>
                      setVatRate(val ?? String(siteConfig.tax.defaultVatRate))
                    }
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {siteConfig.tax.availableRates.map((rate) => (
                        <SelectItem key={rate} value={String(rate)}>
                          {rate}%
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-3">
                <div className="space-y-2">
                  <Label htmlFor="weightGrams">Súly (gramm)</Label>
                  <Input
                    id="weightGrams"
                    type="number"
                    min="0"
                    step="1"
                    value={weightGrams}
                    onChange={(e) => setWeightGrams(e.target.value)}
                    placeholder={String(siteConfig.shipping.rules.defaultProductWeightGrams)}
                  />
                  <p className="text-muted-foreground text-xs">
                    Üresen hagyva az alapértelmezett (
                    {siteConfig.shipping.rules.defaultProductWeightGrams} g) kerül alkalmazásra. A
                    variánsok felülírhatják.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Images */}
          <Card>
            <CardHeader>
              <CardTitle>Képek</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label>Fő kép</Label>
                <SingleImageUpload
                  value={mainImageUrl}
                  onChange={setMainImageUrl}
                  onRemove={() => setMainImageUrl("")}
                />
              </div>

              <div className="space-y-2">
                <Label>Galéria képek</Label>
                <GalleryImageUpload value={imageUrls} onChange={setImageUrls} />
              </div>
            </CardContent>
          </Card>

          {/* Variants */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Variánsok</CardTitle>
                  <CardDescription>Méret, szín stb. variánsok kezelése.</CardDescription>
                </div>
                <Button type="button" variant="outline" size="sm" onClick={addVariant}>
                  <Plus className="mr-2 size-4" />
                  Variáns
                </Button>
              </div>
            </CardHeader>
            {variants.length > 0 && (
              <CardContent className="space-y-4">
                {variants.map((v, idx) => (
                  <div key={v.key} className="bg-muted/30 space-y-3 rounded-lg border p-4">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">
                        Variáns #{idx + 1}
                        {v.id && (
                          <span className="text-muted-foreground ml-2 font-mono text-xs">
                            {v.id.slice(0, 8)}
                          </span>
                        )}
                      </span>
                      <button
                        type="button"
                        onClick={() => removeVariant(v.key)}
                        className="text-muted-foreground hover:text-destructive cursor-pointer"
                      >
                        <Trash2 className="size-4" />
                      </button>
                    </div>

                    <div className="grid gap-3 sm:grid-cols-3">
                      <div className="space-y-1">
                        <Label className="text-xs">SKU</Label>
                        <Input
                          value={v.sku}
                          onChange={(e) => updateVariant(v.key, "sku", e.target.value)}
                          className="h-8 text-xs"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Opció 1 neve</Label>
                        <Input
                          value={v.option1Name}
                          onChange={(e) => updateVariant(v.key, "option1Name", e.target.value)}
                          className="h-8 text-xs"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Opció 1 értéke *</Label>
                        <Input
                          value={v.option1Value}
                          onChange={(e) => updateVariant(v.key, "option1Value", e.target.value)}
                          className="h-8 text-xs"
                        />
                      </div>
                    </div>

                    <div className="grid gap-3 sm:grid-cols-3">
                      <div className="space-y-1">
                        <Label className="text-xs">Opció 2 neve</Label>
                        <Input
                          value={v.option2Name}
                          onChange={(e) => updateVariant(v.key, "option2Name", e.target.value)}
                          className="h-8 text-xs"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Opció 2 értéke</Label>
                        <Input
                          value={v.option2Value}
                          onChange={(e) => updateVariant(v.key, "option2Value", e.target.value)}
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
                          onChange={(e) => updateVariant(v.key, "priceOverride", e.target.value)}
                          className="h-8 text-xs"
                        />
                      </div>
                    </div>

                    <div className="grid gap-3 sm:grid-cols-4">
                      <div className="space-y-1">
                        <Label className="text-xs">Készlet *</Label>
                        <Input
                          type="number"
                          min="0"
                          step="1"
                          value={v.stockQuantity}
                          onChange={(e) => updateVariant(v.key, "stockQuantity", e.target.value)}
                          className="h-8 text-xs"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Súly (g)</Label>
                        <Input
                          type="number"
                          min="0"
                          step="1"
                          value={v.weightGrams}
                          onChange={(e) => updateVariant(v.key, "weightGrams", e.target.value)}
                          placeholder="Termék súly"
                          className="h-8 text-xs"
                        />
                      </div>
                      <div className="flex items-end gap-2 pb-1">
                        <Checkbox
                          checked={v.isActive}
                          onCheckedChange={(checked) => updateVariant(v.key, "isActive", !!checked)}
                        />
                        <Label className="text-xs">Aktív</Label>
                      </div>
                    </div>
                  </div>
                ))}
              </CardContent>
            )}
          </Card>

          {/* Extras */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Kiegészítő termékek</CardTitle>
                  <CardDescription>
                    Termékek, amelyeket a vásárlók egy jelölőnégyzettel hozzáadhatnak a kosárhoz.
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Search for extra products */}
              <div className="space-y-2">
                <Label className="text-xs">Termék keresése</Label>
                <div className="relative">
                  <Search className="text-muted-foreground absolute top-1/2 left-3 size-3.5 -translate-y-1/2" />
                  <Input
                    value={extraSearch}
                    onChange={(e) => searchExtraProducts(e.target.value)}
                    placeholder="Keresés név vagy slug alapján..."
                    className="h-8 pl-9 text-xs"
                  />
                  {extraSearching && (
                    <Loader2 className="text-muted-foreground absolute top-1/2 right-3 size-3.5 -translate-y-1/2 animate-spin" />
                  )}
                </div>

                {/* Search results dropdown */}
                {extraSearchResults.length > 0 && (
                  <div className="bg-background rounded-md border shadow-md">
                    {extraSearchResults.map((p) => (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => addExtra(p)}
                        className="hover:bg-muted/50 flex w-full cursor-pointer items-center justify-between px-3 py-2 text-xs transition-colors"
                      >
                        <span className="font-medium">{p.title}</span>
                        <span className="text-muted-foreground font-mono">
                          {Math.round(p.base_price).toLocaleString("hu-HU")} Ft
                        </span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Extras list */}
              {extras.length > 0 && (
                <div className="space-y-3">
                  {extras.map((extra, idx) => (
                    <div key={extra.key} className="bg-muted/30 space-y-3 rounded-lg border p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <GripVertical className="text-muted-foreground size-4" />
                          <span className="text-sm font-medium">{extra.extraProductTitle}</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => removeExtra(extra.key)}
                          className="text-muted-foreground hover:text-destructive cursor-pointer"
                        >
                          <Trash2 className="size-4" />
                        </button>
                      </div>

                      <div className="grid gap-3 sm:grid-cols-3">
                        <div className="space-y-1 sm:col-span-2">
                          <Label className="text-xs">Megjelenítési szöveg *</Label>
                          <Input
                            value={extra.label}
                            onChange={(e) => updateExtra(extra.key, "label", e.target.value)}
                            className="h-8 text-xs"
                            placeholder="pl. Díszcsomag (+990 Ft)"
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs">Sorrend</Label>
                          <Input
                            type="number"
                            min="0"
                            step="1"
                            value={extra.sortOrder}
                            onChange={(e) =>
                              updateExtra(extra.key, "sortOrder", Number(e.target.value) || 0)
                            }
                            className="h-8 text-xs"
                          />
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <Checkbox
                          checked={extra.isDefaultChecked}
                          onCheckedChange={(checked) =>
                            updateExtra(extra.key, "isDefaultChecked", !!checked)
                          }
                        />
                        <Label className="text-xs">Alapértelmezetten kijelölve</Label>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {extras.length === 0 && (
                <p className="text-muted-foreground text-xs">
                  Nincs kiegészítő termék hozzárendelve. Keressen fent egy terméket a hozzáadáshoz.
                </p>
              )}
            </CardContent>
          </Card>
        </div>
        <div className="space-y-6">
          {/* Status */}
          <Card>
            <CardHeader>
              <CardTitle>Státusz</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
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
              <div className="space-y-2">
                <Label htmlFor="publishedAt" className="text-sm">
                  Ütemezett megjelenés
                </Label>
                <Input
                  id="publishedAt"
                  type="datetime-local"
                  value={publishedAt}
                  onChange={(e) => setPublishedAt(e.target.value)}
                />
                <p className="text-muted-foreground text-xs">
                  Hagyja üresen az azonnali megjelenéshez. Jövőbeli dátum esetén a termék addig
                  rejtett marad a webshopban.
                </p>
                {publishedAt && new Date(publishedAt) > new Date() && isActive && (
                  <Badge variant="secondary" className="text-xs">
                    Ütemezett — megjelenik: {new Date(publishedAt).toLocaleDateString("hu-HU")}
                  </Badge>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Categories */}
          <Card>
            <CardHeader>
              <CardTitle>Kategóriák</CardTitle>
            </CardHeader>
            <CardContent>
              {categories.length === 0 ? (
                <p className="text-muted-foreground text-sm">Nincsenek kategóriák.</p>
              ) : (
                <div className="max-h-60 space-y-2 overflow-y-auto">
                  {categories.map((cat) => (
                    <div key={cat.id} className="flex items-center gap-2">
                      <Checkbox
                        checked={selectedCategoryIds.includes(cat.id)}
                        onCheckedChange={() => toggleCategory(cat.id)}
                      />
                      <Label className="text-sm font-normal">
                        {cat.parent_id && <span className="text-muted-foreground">— </span>}
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
              <CardContent className="text-muted-foreground space-y-1 text-xs">
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
