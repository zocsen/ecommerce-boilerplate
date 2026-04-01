"use client";

import { useState, useEffect, useCallback } from "react";
import { Plus, Pencil, Loader2, Save, X, BookOpen, CheckCircle, XCircle } from "lucide-react";
import { listPlans, adminCreatePlan, adminUpdatePlan } from "@/lib/actions/subscriptions";
import { formatHUF } from "@/lib/utils/format";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { ShopPlanRow, PlanFeaturesJson } from "@/lib/types/database";

/* ------------------------------------------------------------------ */
/*  Default feature set for new plans                                  */
/* ------------------------------------------------------------------ */

const DEFAULT_FEATURES: PlanFeaturesJson = {
  max_products: 0,
  max_admins: 0,
  max_categories: 0,
  delivery_options: 0,
  enable_coupons: true,
  enable_marketing_module: false,
  enable_abandoned_cart: false,
  enable_b2b_wholesale: false,
  enable_reviews: false,
  enable_price_history: true,
  enable_product_extras: false,
  enable_scheduled_publishing: false,
  enable_agency_viewer: false,
  enable_custom_pages: false,
};

const FEATURE_LABELS: Record<keyof PlanFeaturesJson, string> = {
  max_products: "Max. termékek (0=korlátlan)",
  max_admins: "Max. adminisztrátorok (0=korlátlan)",
  max_categories: "Max. kategóriák (0=korlátlan)",
  delivery_options: "Szállítási lehetőségek (0=korlátlan)",
  enable_coupons: "Kuponok",
  enable_marketing_module: "Marketing modul",
  enable_abandoned_cart: "Elhagyott kosár",
  enable_b2b_wholesale: "Nagykereskedelem (B2B)",
  enable_reviews: "Értékelések",
  enable_price_history: "Árelőzmények",
  enable_product_extras: "Termék kiegészítők",
  enable_scheduled_publishing: "Ütemezett közzététel",
  enable_agency_viewer: "Agency Viewer",
  enable_custom_pages: "Egyedi oldalak",
};

/* ------------------------------------------------------------------ */
/*  Feature editor sub-component                                       */
/* ------------------------------------------------------------------ */

function FeatureEditor({
  value,
  onChange,
}: {
  value: PlanFeaturesJson;
  onChange: (v: PlanFeaturesJson) => void;
}) {
  const numericKeys: (keyof PlanFeaturesJson)[] = [
    "max_products",
    "max_admins",
    "max_categories",
    "delivery_options",
  ];
  const boolKeys = (Object.keys(DEFAULT_FEATURES) as (keyof PlanFeaturesJson)[]).filter(
    (k) => !numericKeys.includes(k),
  );

  return (
    <div className="space-y-4">
      <div>
        <p className="text-muted-foreground mb-2 text-xs font-medium tracking-wider uppercase">
          Numerikus korlátok
        </p>
        <div className="grid gap-3 sm:grid-cols-2">
          {numericKeys.map((key) => (
            <div key={key} className="space-y-1">
              <Label className="text-xs">{FEATURE_LABELS[key]}</Label>
              <Input
                type="number"
                min="0"
                value={value[key] as number}
                onChange={(e) => onChange({ ...value, [key]: Number(e.target.value) })}
                className="h-8 text-sm"
              />
            </div>
          ))}
        </div>
      </div>
      <div>
        <p className="text-muted-foreground mb-2 text-xs font-medium tracking-wider uppercase">
          Funkciók
        </p>
        <div className="grid gap-2 sm:grid-cols-2">
          {boolKeys.map((key) => (
            <label
              key={key}
              className="border-border hover:bg-muted/50 flex cursor-pointer items-center gap-2 rounded-md border px-3 py-2 text-xs"
            >
              <Checkbox
                checked={value[key] as boolean}
                onCheckedChange={(checked) => onChange({ ...value, [key]: !!checked })}
              />
              {FEATURE_LABELS[key]}
            </label>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Agency Plans Page                                                  */
/* ------------------------------------------------------------------ */

export default function AgencyPlansPage() {
  const [plans, setPlans] = useState<ShopPlanRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Create form
  const [showCreate, setShowCreate] = useState(false);
  const [createName, setCreateName] = useState("");
  const [createSlug, setCreateSlug] = useState("");
  const [createDescription, setCreateDescription] = useState("");
  const [createMonthlyPrice, setCreateMonthlyPrice] = useState("");
  const [createAnnualPrice, setCreateAnnualPrice] = useState("");
  const [createSortOrder, setCreateSortOrder] = useState("0");
  const [createIsActive, setCreateIsActive] = useState(true);
  const [createFeatures, setCreateFeatures] = useState<PlanFeaturesJson>({ ...DEFAULT_FEATURES });
  const [creating, setCreating] = useState(false);

  // Edit
  const [editId, setEditId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editMonthlyPrice, setEditMonthlyPrice] = useState("");
  const [editAnnualPrice, setEditAnnualPrice] = useState("");
  const [editSortOrder, setEditSortOrder] = useState("0");
  const [editIsActive, setEditIsActive] = useState(true);
  const [editFeatures, setEditFeatures] = useState<PlanFeaturesJson>({ ...DEFAULT_FEATURES });
  const [saving, setSaving] = useState(false);

  // ── Fetch ──────────────────────────────────────────────────────
  const fetchPlans = useCallback(async () => {
    setLoading(true);
    const res = await listPlans();
    if (res.success && res.data) setPlans(res.data);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchPlans();
  }, [fetchPlans]);

  // ── Auto-slug from name ─────────────────────────────────────────
  function slugify(s: string) {
    return s
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");
  }

  // ── Create ─────────────────────────────────────────────────────
  async function handleCreate() {
    if (!createName.trim() || !createSlug.trim() || !createMonthlyPrice || !createAnnualPrice) {
      setError("A név, slug, havi ár és éves ár kötelező.");
      return;
    }
    setCreating(true);
    setError(null);

    const res = await adminCreatePlan({
      name: createName.trim(),
      slug: createSlug.trim(),
      description: createDescription || undefined,
      base_monthly_price: Number(createMonthlyPrice),
      base_annual_price: Number(createAnnualPrice),
      features: createFeatures,
      sort_order: Number(createSortOrder),
      is_active: createIsActive,
    });

    if (!res.success) {
      setError(res.error ?? "Hiba a csomag létrehozásakor.");
      setCreating(false);
      return;
    }

    setShowCreate(false);
    setCreateName("");
    setCreateSlug("");
    setCreateDescription("");
    setCreateMonthlyPrice("");
    setCreateAnnualPrice("");
    setCreateSortOrder("0");
    setCreateIsActive(true);
    setCreateFeatures({ ...DEFAULT_FEATURES });
    setCreating(false);
    fetchPlans();
  }

  // ── Start edit ─────────────────────────────────────────────────
  function startEdit(plan: ShopPlanRow) {
    setEditId(plan.id);
    setEditName(plan.name);
    setEditDescription(plan.description ?? "");
    setEditMonthlyPrice(String(plan.base_monthly_price));
    setEditAnnualPrice(String(plan.base_annual_price));
    setEditSortOrder(String(plan.sort_order));
    setEditIsActive(plan.is_active);
    setEditFeatures({ ...DEFAULT_FEATURES, ...plan.features });
    setError(null);
  }

  // ── Save edit ──────────────────────────────────────────────────
  async function handleSave() {
    if (!editId) return;
    setSaving(true);
    setError(null);

    const res = await adminUpdatePlan(editId, {
      name: editName.trim(),
      description: editDescription || null,
      base_monthly_price: Number(editMonthlyPrice),
      base_annual_price: Number(editAnnualPrice),
      features: editFeatures,
      sort_order: Number(editSortOrder),
      is_active: editIsActive,
    });

    if (!res.success) {
      setError(res.error ?? "Hiba a csomag frissítésekor.");
      setSaving(false);
      return;
    }

    setEditId(null);
    setSaving(false);
    fetchPlans();
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Csomagok</h1>
          <p className="text-muted-foreground mt-1 text-sm">Előfizetési csomagok kezelése</p>
        </div>
        <Button
          size="sm"
          onClick={() => {
            setShowCreate((v) => !v);
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
              Új csomag
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
            <CardTitle className="text-sm">Új csomag</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <div className="space-y-2">
                <Label>Csomag neve *</Label>
                <Input
                  value={createName}
                  onChange={(e) => {
                    setCreateName(e.target.value);
                    setCreateSlug(slugify(e.target.value));
                  }}
                  placeholder="pl. Alap csomag"
                />
              </div>
              <div className="space-y-2">
                <Label>Slug *</Label>
                <Input
                  value={createSlug}
                  onChange={(e) => setCreateSlug(e.target.value)}
                  placeholder="pl. alap"
                  className="font-mono"
                />
              </div>
              <div className="space-y-2">
                <Label>Leírás</Label>
                <Input
                  value={createDescription}
                  onChange={(e) => setCreateDescription(e.target.value)}
                  placeholder="Opcionális"
                />
              </div>
              <div className="space-y-2">
                <Label>Havi ár (HUF) *</Label>
                <Input
                  type="number"
                  min="0"
                  value={createMonthlyPrice}
                  onChange={(e) => setCreateMonthlyPrice(e.target.value)}
                  placeholder="pl. 9900"
                />
              </div>
              <div className="space-y-2">
                <Label>Éves ár (HUF) *</Label>
                <Input
                  type="number"
                  min="0"
                  value={createAnnualPrice}
                  onChange={(e) => setCreateAnnualPrice(e.target.value)}
                  placeholder="pl. 99000"
                />
              </div>
              <div className="space-y-2">
                <Label>Sorrend</Label>
                <Input
                  type="number"
                  min="0"
                  value={createSortOrder}
                  onChange={(e) => setCreateSortOrder(e.target.value)}
                />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Checkbox
                checked={createIsActive}
                onCheckedChange={(checked) => setCreateIsActive(!!checked)}
              />
              <Label>Aktív</Label>
            </div>
            <FeatureEditor value={createFeatures} onChange={setCreateFeatures} />
            <div className="flex justify-end">
              <Button size="sm" onClick={handleCreate} disabled={creating}>
                {creating ? (
                  <Loader2 className="mr-2 size-4 animate-spin" />
                ) : (
                  <Plus className="mr-2 size-4" />
                )}
                Létrehozás
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Edit panel */}
      {editId && (
        <Card className="border-primary/30">
          <CardHeader>
            <CardTitle className="text-sm">Csomag szerkesztése</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <div className="space-y-2">
                <Label>Csomag neve</Label>
                <Input value={editName} onChange={(e) => setEditName(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Leírás</Label>
                <Input
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Havi ár (HUF)</Label>
                <Input
                  type="number"
                  min="0"
                  value={editMonthlyPrice}
                  onChange={(e) => setEditMonthlyPrice(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Éves ár (HUF)</Label>
                <Input
                  type="number"
                  min="0"
                  value={editAnnualPrice}
                  onChange={(e) => setEditAnnualPrice(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Sorrend</Label>
                <Input
                  type="number"
                  min="0"
                  value={editSortOrder}
                  onChange={(e) => setEditSortOrder(e.target.value)}
                />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Checkbox
                checked={editIsActive}
                onCheckedChange={(checked) => setEditIsActive(!!checked)}
              />
              <Label>Aktív</Label>
            </div>
            <FeatureEditor value={editFeatures} onChange={setEditFeatures} />
            <div className="flex items-center justify-end gap-2">
              <Button variant="outline" size="sm" onClick={() => setEditId(null)}>
                <X className="mr-2 size-4" />
                Mégsem
              </Button>
              <Button size="sm" onClick={handleSave} disabled={saving}>
                {saving ? (
                  <Loader2 className="mr-2 size-4 animate-spin" />
                ) : (
                  <Save className="mr-2 size-4" />
                )}
                Mentés
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Plans table */}
      {loading ? (
        <div className="flex h-40 items-center justify-center">
          <Loader2 className="text-muted-foreground size-6 animate-spin" />
        </div>
      ) : plans.length === 0 ? (
        <div className="border-border text-muted-foreground flex h-40 flex-col items-center justify-center gap-2 rounded-xl border border-dashed text-sm">
          <BookOpen className="text-muted-foreground/40 size-8" />
          <p>Nincsenek csomagok.</p>
        </div>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Csomag</TableHead>
              <TableHead>Slug</TableHead>
              <TableHead className="text-right">Havi ár</TableHead>
              <TableHead className="text-right">Éves ár</TableHead>
              <TableHead className="text-center">Sorrend</TableHead>
              <TableHead>Státusz</TableHead>
              <TableHead className="text-right">Műveletek</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {plans.map((plan) => (
              <TableRow key={plan.id} className={editId === plan.id ? "bg-muted/30" : ""}>
                <TableCell>
                  <p className="font-medium">{plan.name}</p>
                  {plan.description && (
                    <p className="text-muted-foreground text-xs">{plan.description}</p>
                  )}
                </TableCell>
                <TableCell className="text-muted-foreground font-mono text-xs">
                  {plan.slug}
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  {formatHUF(plan.base_monthly_price)}
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  {formatHUF(plan.base_annual_price)}
                </TableCell>
                <TableCell className="text-center tabular-nums">{plan.sort_order}</TableCell>
                <TableCell>
                  {plan.is_active ? (
                    <Badge className="gap-1 text-xs">
                      <CheckCircle className="size-3" />
                      Aktív
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="gap-1 text-xs">
                      <XCircle className="size-3" />
                      Inaktív
                    </Badge>
                  )}
                </TableCell>
                <TableCell className="text-right">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7"
                    onClick={() => (editId === plan.id ? setEditId(null) : startEdit(plan))}
                  >
                    {editId === plan.id ? (
                      <X className="size-3.5" />
                    ) : (
                      <Pencil className="size-3.5" />
                    )}
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  );
}
