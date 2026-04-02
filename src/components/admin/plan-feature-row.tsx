import { CheckCircle, XCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import type { PlanFeaturesJson, ShopPlanRow } from "@/lib/types/database";

/* ------------------------------------------------------------------ */
/*  Feature metadata — labels, categories, and display config          */
/* ------------------------------------------------------------------ */

/** Human-readable Hungarian labels for every plan feature key */
export const FEATURE_LABELS: Record<keyof PlanFeaturesJson, string> = {
  max_products: "Maximális termékszám",
  max_admins: "Adminisztrátorok száma",
  max_categories: "Kategóriák száma",
  delivery_options: "Szállítási módok száma",
  enable_coupons: "Kuponok és kedvezmények",
  enable_marketing_module: "Marketing modul",
  enable_abandoned_cart: "Elhagyott kosár visszaállítás",
  enable_b2b_wholesale: "Nagykereskedelem (B2B)",
  enable_reviews: "Vásárlói értékelések",
  enable_price_history: "30 napos árelőzmények (EU Omnibus)",
  enable_product_extras: "Termék kiegészítők",
  enable_scheduled_publishing: "Ütemezett közzététel",
  enable_agency_viewer: "Agency Viewer hozzáférés",
  enable_custom_pages: "Egyedi oldalak (Rólunk, stb.)",
  enable_blog: "Blog",
};

/** Which features are numeric limits (0 = unlimited) */
export const NUMERIC_FEATURE_KEYS: ReadonlySet<keyof PlanFeaturesJson> = new Set([
  "max_products",
  "max_admins",
  "max_categories",
  "delivery_options",
]);

/** Feature categories for grouping in comparison views */
export type FeatureCategory = {
  id: string;
  label: string;
  features: (keyof PlanFeaturesJson)[];
};

export const FEATURE_CATEGORIES: FeatureCategory[] = [
  {
    id: "products",
    label: "Termékek & Katalógus",
    features: [
      "max_products",
      "max_categories",
      "enable_product_extras",
      "enable_price_history",
      "enable_scheduled_publishing",
    ],
  },
  {
    id: "orders",
    label: "Rendelések & Fizetés",
    features: ["enable_coupons"],
  },
  {
    id: "shipping",
    label: "Szállítás",
    features: ["delivery_options"],
  },
  {
    id: "marketing",
    label: "Marketing & Kommunikáció",
    features: ["enable_marketing_module", "enable_abandoned_cart"],
  },
  {
    id: "content",
    label: "Tartalom & Megjelenés",
    features: ["enable_custom_pages", "enable_blog", "enable_reviews"],
  },
  {
    id: "integrations",
    label: "Integrációk",
    features: ["enable_b2b_wholesale"],
  },
  {
    id: "users",
    label: "Felhasználókezelés",
    features: ["max_admins", "enable_agency_viewer"],
  },
];

/* ------------------------------------------------------------------ */
/*  Helper: resolve a feature value for display                        */
/* ------------------------------------------------------------------ */

export function resolveFeatureDisplay(
  featureKey: keyof PlanFeaturesJson,
  features: PlanFeaturesJson,
): { type: "boolean"; enabled: boolean } | { type: "numeric"; value: number; display: string } {
  const value = features[featureKey];
  if (NUMERIC_FEATURE_KEYS.has(featureKey)) {
    const num = (value as number) ?? 0;
    return {
      type: "numeric",
      value: num,
      display: num === 0 ? "Korlátlan" : String(num),
    };
  }
  return { type: "boolean", enabled: Boolean(value) };
}

/* ------------------------------------------------------------------ */
/*  PlanFeatureRow — used inside comparison table (desktop)            */
/* ------------------------------------------------------------------ */

interface PlanFeatureRowProps {
  featureKey: keyof PlanFeaturesJson;
  plans: ShopPlanRow[];
  currentPlanId: string | null;
}

/**
 * A single table row in the desktop comparison table.
 * Shows feature label + one cell per plan with check/X/value.
 */
export function PlanFeatureRow({ featureKey, plans, currentPlanId }: PlanFeatureRowProps) {
  const label = FEATURE_LABELS[featureKey];

  return (
    <tr className="border-border/50 border-b last:border-b-0">
      <td className="text-muted-foreground py-3 pr-4 pl-6 text-sm">{label}</td>
      {plans.map((plan) => {
        const features = plan.features as unknown as PlanFeaturesJson;
        const resolved = resolveFeatureDisplay(featureKey, features);
        const isCurrent = plan.id === currentPlanId;

        return (
          <td
            key={plan.id}
            className={cn("py-3 text-center text-sm", isCurrent && "bg-foreground/[0.02]")}
          >
            {resolved.type === "numeric" ? (
              <span className="font-medium tabular-nums">{resolved.display}</span>
            ) : resolved.enabled ? (
              <CheckCircle className="mx-auto size-4.5 text-green-600 dark:text-green-500" />
            ) : (
              <XCircle className="text-muted-foreground/25 mx-auto size-4.5" />
            )}
          </td>
        );
      })}
    </tr>
  );
}

/* ------------------------------------------------------------------ */
/*  PlanFeatureListItem — used inside mobile card view                  */
/* ------------------------------------------------------------------ */

interface PlanFeatureListItemProps {
  featureKey: keyof PlanFeaturesJson;
  features: PlanFeaturesJson;
}

/**
 * A single feature line in the mobile list view.
 * Shows label + value on the same row.
 */
export function PlanFeatureListItem({ featureKey, features }: PlanFeatureListItemProps) {
  const label = FEATURE_LABELS[featureKey];
  const resolved = resolveFeatureDisplay(featureKey, features);

  return (
    <div className="flex items-center justify-between py-2 text-sm">
      <span
        className={cn(
          "text-muted-foreground",
          resolved.type === "boolean" && !resolved.enabled && "opacity-50",
        )}
      >
        {label}
      </span>
      {resolved.type === "numeric" ? (
        <span className="font-medium tabular-nums">{resolved.display}</span>
      ) : resolved.enabled ? (
        <CheckCircle className="size-4 text-green-600 dark:text-green-500" />
      ) : (
        <XCircle className="text-muted-foreground/30 size-4" />
      )}
    </div>
  );
}
