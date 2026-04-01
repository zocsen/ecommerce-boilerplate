"use client";

import { useState, useEffect, useCallback } from "react";
import { Loader2, CheckCircle, XCircle, Crown } from "lucide-react";
import { listPlans, getMySubscription } from "@/lib/actions/subscriptions";
import { formatHUF } from "@/lib/utils/format";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { ShopPlanRow, PlanFeaturesJson, ShopSubscriptionWithPlan } from "@/lib/types/database";

/* ------------------------------------------------------------------ */
/*  Feature labels (Hungarian)                                         */
/* ------------------------------------------------------------------ */

const FEATURE_LABELS: Record<keyof PlanFeaturesJson, string> = {
  max_products: "Termékek",
  max_admins: "Adminisztrátorok",
  max_categories: "Kategóriák",
  delivery_options: "Szállítási módok",
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

const NUMERIC_KEYS: (keyof PlanFeaturesJson)[] = [
  "max_products",
  "max_admins",
  "max_categories",
  "delivery_options",
];

/* ------------------------------------------------------------------ */
/*  Billing cycle toggle                                               */
/* ------------------------------------------------------------------ */

function BillingToggle({
  cycle,
  onChange,
}: {
  cycle: "monthly" | "annual";
  onChange: (c: "monthly" | "annual") => void;
}) {
  return (
    <div className="border-border bg-muted/50 inline-flex items-center gap-1 rounded-lg border p-1">
      <button
        onClick={() => onChange("monthly")}
        className={cn(
          "rounded-md px-4 py-1.5 text-sm font-medium transition-all duration-300",
          cycle === "monthly"
            ? "bg-foreground text-background shadow-sm"
            : "text-muted-foreground hover:text-foreground",
        )}
      >
        Havi
      </button>
      <button
        onClick={() => onChange("annual")}
        className={cn(
          "rounded-md px-4 py-1.5 text-sm font-medium transition-all duration-300",
          cycle === "annual"
            ? "bg-foreground text-background shadow-sm"
            : "text-muted-foreground hover:text-foreground",
        )}
      >
        Éves
      </button>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Feature line                                                       */
/* ------------------------------------------------------------------ */

function FeatureLine({
  featureKey,
  value,
}: {
  featureKey: keyof PlanFeaturesJson;
  value: boolean | number;
}) {
  const isNumeric = NUMERIC_KEYS.includes(featureKey);
  const label = FEATURE_LABELS[featureKey];

  if (isNumeric) {
    const numVal = value as number;
    return (
      <div className="flex items-center justify-between py-1.5 text-sm">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-medium tabular-nums">{numVal === 0 ? "Korlátlan" : numVal}</span>
      </div>
    );
  }

  const enabled = value as boolean;
  return (
    <div className="flex items-center justify-between py-1.5 text-sm">
      <span className={cn("text-muted-foreground", !enabled && "opacity-50")}>{label}</span>
      {enabled ? (
        <CheckCircle className="size-4 text-green-600 dark:text-green-500" />
      ) : (
        <XCircle className="text-muted-foreground/30 size-4" />
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Pricing card                                                       */
/* ------------------------------------------------------------------ */

function PricingCard({
  plan,
  cycle,
  isCurrent,
}: {
  plan: ShopPlanRow;
  cycle: "monthly" | "annual";
  isCurrent: boolean;
}) {
  const price = cycle === "annual" ? plan.base_annual_price : plan.base_monthly_price;
  const featureEntries = Object.entries(plan.features) as [
    keyof PlanFeaturesJson,
    boolean | number,
  ][];

  // Sort: numeric limits first, then booleans
  const sortedFeatures = featureEntries.sort((a, b) => {
    const aNum = NUMERIC_KEYS.includes(a[0]) ? 0 : 1;
    const bNum = NUMERIC_KEYS.includes(b[0]) ? 0 : 1;
    return aNum - bNum;
  });

  return (
    <Card
      className={cn(
        "relative flex flex-col transition-all duration-500",
        isCurrent && "border-foreground/40 ring-foreground/20 ring-1",
      )}
    >
      {isCurrent && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2">
          <Badge className="gap-1 text-xs shadow-sm">
            <Crown className="size-3" />
            Jelenlegi csomagod
          </Badge>
        </div>
      )}

      <CardHeader className="pt-6 pb-2 text-center">
        <h3 className="text-lg font-semibold tracking-tight">{plan.name}</h3>
        {plan.description && (
          <p className="text-muted-foreground mt-1 text-xs">{plan.description}</p>
        )}
      </CardHeader>

      <CardContent className="flex flex-1 flex-col">
        {/* Price */}
        <div className="mb-6 text-center">
          <span className="text-3xl font-bold tracking-tight">{formatHUF(price)}</span>
          <span className="text-muted-foreground ml-1 text-sm">
            / {cycle === "annual" ? "év" : "hó"}
          </span>
          {cycle === "annual" && (
            <p className="text-muted-foreground mt-1 text-xs">
              {formatHUF(Math.round(plan.base_annual_price / 12))} / hó átlagosan
            </p>
          )}
        </div>

        {/* Features */}
        <div className="divide-border/50 flex-1 space-y-0 divide-y">
          {sortedFeatures.map(([key, value]) => (
            <FeatureLine key={key} featureKey={key} value={value} />
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

/* ------------------------------------------------------------------ */
/*  Plans Comparison Page (read-only for shop owners)                   */
/* ------------------------------------------------------------------ */

export default function PlansComparisonPage() {
  const [plans, setPlans] = useState<ShopPlanRow[]>([]);
  const [mySubscription, setMySubscription] = useState<ShopSubscriptionWithPlan | null>(null);
  const [loading, setLoading] = useState(true);
  const [cycle, setCycle] = useState<"monthly" | "annual">("monthly");

  const fetchData = useCallback(async () => {
    setLoading(true);
    const [plansRes, subRes] = await Promise.all([listPlans(), getMySubscription()]);

    if (plansRes.success && plansRes.data) {
      setPlans(plansRes.data.filter((p) => p.is_active));
    }
    if (subRes.success && subRes.data) {
      setMySubscription(subRes.data);
      setCycle(subRes.data.billing_cycle);
    }

    setLoading(false);
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  if (loading) {
    return (
      <div className="flex h-60 items-center justify-center">
        <Loader2 className="text-muted-foreground size-6 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="text-center">
        <h1 className="text-2xl font-semibold tracking-tight">Elérhető csomagok</h1>
        <p className="text-muted-foreground mt-2 text-sm">Előfizetési csomagok összehasonlítása</p>
      </div>

      {/* Billing toggle */}
      <div className="flex justify-center">
        <BillingToggle cycle={cycle} onChange={setCycle} />
      </div>

      {/* Pricing cards grid */}
      {plans.length === 0 ? (
        <div className="border-border text-muted-foreground flex h-40 flex-col items-center justify-center gap-2 rounded-xl border border-dashed text-sm">
          <p>Nincsenek elérhető csomagok.</p>
        </div>
      ) : (
        <div
          className={cn(
            "grid gap-6",
            plans.length === 1 && "mx-auto max-w-sm grid-cols-1",
            plans.length === 2 && "mx-auto max-w-2xl grid-cols-1 sm:grid-cols-2",
            plans.length === 3 && "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3",
            plans.length >= 4 && "grid-cols-1 sm:grid-cols-2 lg:grid-cols-4",
          )}
        >
          {plans.map((plan) => (
            <PricingCard
              key={plan.id}
              plan={plan}
              cycle={cycle}
              isCurrent={mySubscription?.plan_id === plan.id}
            />
          ))}
        </div>
      )}

      {/* Contact note */}
      <div className="text-center">
        <p className="text-muted-foreground text-xs">
          Csomag váltáshoz lépj kapcsolatba az ügynökségeddel.
        </p>
      </div>
    </div>
  );
}
