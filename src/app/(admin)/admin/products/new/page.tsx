"use client"

import { useState, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
import { Plus, Trash2, Save, Loader2, Search, GripVertical } from "lucide-react"
import Link from "next/link"
import { adminCreateProduct, adminListProducts } from "@/lib/actions/products"
import { listCategories } from "@/lib/actions/categories"
import { SingleImageUpload, GalleryImageUpload } from "@/components/admin/image-upload"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { siteConfig } from "@/lib/config/site.config"
import { toSlug } from "@/lib/utils/slug"
import type { CategoryRow } from "@/lib/types/database"

/* ------------------------------------------------------------------ */
/*  Variant row type (client-side)                                     */
/* ------------------------------------------------------------------ */

interface VariantRow {
  key: string
  sku: string
  option1Name: string
  option1Value: string
  option2Name: string
  option2Value: string
  priceOverride: string
  stockQuantity: string
  isActive: boolean
  weightGrams: string
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
  }
}

/* ------------------------------------------------------------------ */
/*  Extra row type (client-side)                                       */
/* ------------------------------------------------------------------ */

interface ExtraRow {
  key: string
  extraProductId: string
  extraVariantId: string | null
  extraProductTitle: string
  label: string
  isDefaultChecked: boolean
  sortOrder: number
}

/* ------------------------------------------------------------------ */
/*  Admin Product Create Page                                          */
/* ------------------------------------------------------------------ */

export default function AdminProductNewPage() {
  const router = useRouter()

  // Form state
  const [title, setTitle] = useState("")
  const [slug, setSlug] = useState("")
  const [slugManual, setSlugManual] = useState(false)
  const [description, setDescription] = useState("")
  const [basePrice, setBasePrice] = useState("")
  const [compareAtPrice, setCompareAtPrice] = useState("")
  const [vatRate, setVatRate] = useState(String(siteConfig.tax.defaultVatRate))
  const [weightGrams, setWeightGrams] = useState("")
  const [mainImageUrl, setMainImageUrl] = useState("")
  const [imageUrls, setImageUrls] = useState<string[]>([])
  const [isActive, setIsActive] = useState(true)
  const [publishedAt, setPublishedAt] = useState("")
  const [selectedCategoryIds, setSelectedCategoryIds] = useState<string[]>([])
  const [variants, setVariants] = useState<VariantRow[]>([])

  // Extras
  const [extras, setExtras] = useState<ExtraRow[]>([])
  const [extraSearch, setExtraSearch] = useState("")
  const [extraSearchResults, setExtraSearchResults] = useState<
    Array<{ id: string; title: string; slug: string; base_price: number }>
  >([])
  const [extraSearching, setExtraSearching] = useState(false)

  // Categories
  const [categories, setCategories] = useState<CategoryRow[]>([])

  // Submit
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Fetch categories
  useEffect(() => {
    listCategories().then((res) => {
      if (res.success && res.data) {
        setCategories(res.data)
      }
    })
  }, [])

  // Auto-generate slug from title
  useEffect(() => {
    if (!slugManual && title) {
      setSlug(toSlug(title))
    }
  }, [title, slugManual])

  // ── Category toggle ────────────────────────────────────────────
  function toggleCategory(id: string) {
    setSelectedCategoryIds((prev) =>
      prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id],
    )
  }

  // ── Variant management ─────────────────────────────────────────
  function addVariant() {
    setVariants((prev) => [...prev, emptyVariant()])
  }

  function removeVariant(key: string) {
    setVariants((prev) => prev.filter((v) => v.key !== key))
  }

  function updateVariant(key: string, field: keyof VariantRow, value: string | boolean) {
    setVariants((prev) => prev.map((v) => (v.key === key ? { ...v, [field]: value } : v)))
  }

  // ── Extras management ──────────────────────────────────────────
  async function searchExtraProducts(query: string) {
    setExtraSearch(query)
    if (query.trim().length < 2) {
      setExtraSearchResults([])
      return
    }
    setExtraSearching(true)
    try {
      const result = await adminListProducts({ search: query.trim(), perPage: 10 })
      if (result.success && result.data) {
        const existingIds = new Set(extras.map((e) => e.extraProductId))
        setExtraSearchResults(
          result.data.products
            .filter((p) => !existingIds.has(p.id))
            .map((p) => ({ id: p.id, title: p.title, slug: p.slug, base_price: p.base_price })),
        )
      }
    } finally {
      setExtraSearching(false)
    }
  }

  function addExtra(productResult: {
    id: string
    title: string
    slug: string
    base_price: number
  }) {
    const newExtra: ExtraRow = {
      key: crypto.randomUUID(),
      extraProductId: productResult.id,
      extraVariantId: null,
      extraProductTitle: productResult.title,
      label: `${productResult.title} (+${Math.round(productResult.base_price).toLocaleString("hu-HU")} Ft)`,
      isDefaultChecked: false,
      sortOrder: extras.length,
    }
    setExtras((prev) => [...prev, newExtra])
    setExtraSearch("")
    setExtraSearchResults([])
  }

  function removeExtra(key: string) {
    setExtras((prev) => prev.filter((e) => e.key !== key))
  }

  function updateExtra(key: string, field: keyof ExtraRow, value: string | boolean | number) {
    setExtras((prev) => prev.map((e) => (e.key === key ? { ...e, [field]: value } : e)))
  }

  // ── Submit ─────────────────────────────────────────────────────
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    // Client-side basic validation
    if (!title.trim()) {
      setError("A termék neve kötelező.")
      return
    }
    if (!slug.trim()) {
      setError("A slug kötelező.")
      return
    }
    if (!basePrice || Number(basePrice) < 0) {
      setError("Érvényes alapár szükséges.")
      return
    }

    setSubmitting(true)

    try {
      const formData = new FormData()
      formData.set("title", title.trim())
      formData.set("slug", slug.trim())
      formData.set("description", description)
      formData.set("basePrice", String(Math.round(Number(basePrice))))

      if (compareAtPrice) {
        formData.set("compareAtPrice", String(Math.round(Number(compareAtPrice))))
      }

      formData.set("vatRate", vatRate)

      if (weightGrams) {
        formData.set("weightGrams", weightGrams)
      }

      if (mainImageUrl.trim()) {
        formData.set("mainImageUrl", mainImageUrl.trim())
      }

      formData.set("imageUrls", JSON.stringify(imageUrls))
      formData.set("isActive", String(isActive))
      formData.set("publishedAt", publishedAt ? new Date(publishedAt).toISOString() : "")
      formData.set("categoryIds", JSON.stringify(selectedCategoryIds))

      // Build variants payload
      if (variants.length > 0) {
        const variantsPayload = variants.map((v) => ({
          sku: v.sku || undefined,
          option1Name: v.option1Name || "Méret",
          option1Value: v.option1Value,
          option2Name: v.option2Name || undefined,
          option2Value: v.option2Value || undefined,
          priceOverride: v.priceOverride ? Number(v.priceOverride) : undefined,
          stockQuantity: Number(v.stockQuantity) || 0,
          isActive: v.isActive,
          weightGrams: v.weightGrams ? Number(v.weightGrams) : undefined,
        }))
        formData.set("variants", JSON.stringify(variantsPayload))
      }

      // Extras
      if (extras.length > 0) {
        const extrasPayload = extras.map((e) => ({
          extraProductId: e.extraProductId,
          extraVariantId: e.extraVariantId || undefined,
          label: e.label,
          isDefaultChecked: e.isDefaultChecked,
          sortOrder: e.sortOrder,
        }))
        formData.set("extras", JSON.stringify(extrasPayload))
      }

      const result = await adminCreateProduct(formData)

      if (!result.success) {
        setError(result.error ?? "Hiba a termék létrehozásakor.")
        return
      }

      router.push(`/admin/products/${result.data?.id}`)
    } catch {
      setError("Váratlan hiba történt.")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Új termék</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Töltse ki az alábbi mezőket az új termék létrehozásához.
          </p>
        </div>
        <Button type="submit" size="sm" disabled={submitting}>
          {submitting ? (
            <Loader2 className="mr-2 size-4 animate-spin" />
          ) : (
            <Save className="mr-2 size-4" />
          )}
          Mentés
        </Button>
      </div>

      {error && (
        <div className="rounded-lg border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      )}

      <div className="grid gap-8 lg:grid-cols-[1fr_340px]">
        {/* Left column — main info */}
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
                  placeholder="pl. Prémium póló"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="slug">
                  Slug *
                  <button
                    type="button"
                    className="ml-2 cursor-pointer text-xs text-muted-foreground underline"
                    onClick={() => {
                      setSlugManual(!slugManual)
                      if (slugManual) setSlug(toSlug(title))
                    }}
                  >
                    {slugManual ? "Auto-generálás" : "Kézi szerkesztés"}
                  </button>
                </Label>
                <Input
                  id="slug"
                  value={slug}
                  onChange={(e) => {
                    setSlugManual(true)
                    setSlug(e.target.value)
                  }}
                  placeholder="premium-polo"
                  className="font-mono text-sm"
                  readOnly={!slugManual}
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
                  placeholder="Termék részletes leírása..."
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
                  <Input
                    id="basePrice"
                    type="number"
                    min="0"
                    step="1"
                    value={basePrice}
                    onChange={(e) => setBasePrice(e.target.value)}
                    placeholder="0"
                  />
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
                  <p className="text-xs text-muted-foreground">
                    Ha megadja, a termék akciósként jelenik meg.
                  </p>
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
                  <p className="text-xs text-muted-foreground">
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
              <CardDescription>
                Húzza ide a képeket vagy kattintson a tallózáshoz. A fő kép jelenik meg a listákban.
              </CardDescription>
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
                  <CardDescription>
                    Opcionális. Méret, szín, stb. variánsok kezelése.
                  </CardDescription>
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
                  <div key={v.key} className="rounded-lg border bg-muted/30 p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Variáns #{idx + 1}</span>
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
                          onChange={(e) => updateVariant(v.key, "sku", e.target.value)}
                          placeholder="pl. TEE-BLK-M"
                          className="h-8 text-xs"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Opció 1 neve</Label>
                        <Input
                          value={v.option1Name}
                          onChange={(e) => updateVariant(v.key, "option1Name", e.target.value)}
                          placeholder="Méret"
                          className="h-8 text-xs"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Opció 1 értéke *</Label>
                        <Input
                          value={v.option1Value}
                          onChange={(e) => updateVariant(v.key, "option1Value", e.target.value)}
                          placeholder="M"
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
                          placeholder="Szín (opcionális)"
                          className="h-8 text-xs"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Opció 2 értéke</Label>
                        <Input
                          value={v.option2Value}
                          onChange={(e) => updateVariant(v.key, "option2Value", e.target.value)}
                          placeholder="Fekete"
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
                          placeholder="Alap ár"
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
                  <Search className="absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    value={extraSearch}
                    onChange={(e) => searchExtraProducts(e.target.value)}
                    placeholder="Keresés név vagy slug alapján..."
                    className="h-8 pl-9 text-xs"
                  />
                  {extraSearching && (
                    <Loader2 className="absolute right-3 top-1/2 size-3.5 -translate-y-1/2 animate-spin text-muted-foreground" />
                  )}
                </div>

                {/* Search results dropdown */}
                {extraSearchResults.length > 0 && (
                  <div className="rounded-md border bg-background shadow-md">
                    {extraSearchResults.map((p) => (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => addExtra(p)}
                        className="flex w-full cursor-pointer items-center justify-between px-3 py-2 text-xs hover:bg-muted/50 transition-colors"
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
                  {extras.map((extra) => (
                    <div key={extra.key} className="rounded-lg border bg-muted/30 p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <GripVertical className="size-4 text-muted-foreground" />
                          <span className="text-sm font-medium">{extra.extraProductTitle}</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => removeExtra(extra.key)}
                          className="cursor-pointer text-muted-foreground hover:text-destructive"
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
                <p className="text-xs text-muted-foreground">
                  Nincs kiegészítő termék hozzárendelve. Keressen fent egy terméket a hozzáadáshoz.
                </p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right column — sidebar */}
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
                <p className="text-xs text-muted-foreground">
                  Hagyja üresen az azonnali megjelenéshez. Jövőbeli dátum esetén a termék addig
                  rejtett marad a webshopban.
                </p>
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
                <p className="text-sm text-muted-foreground">
                  Nincsenek kategóriák.{" "}
                  <Link href="/admin/categories" className="underline hover:text-foreground">
                    Létrehozás
                  </Link>
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
                        {cat.parent_id && <span className="text-muted-foreground">— </span>}
                        {cat.name}
                      </Label>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </form>
  )
}
