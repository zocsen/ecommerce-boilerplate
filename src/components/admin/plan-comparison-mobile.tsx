"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { PlanColumnHeader } from "@/components/admin/plan-column-header";
import { PlanFeatureListItem, FEATURE_CATEGORIES } from "@/components/admin/plan-feature-row";
import { cn } from "@/lib/utils";
import type { ShopPlanRow, PlanFeaturesJson } from "@/lib/types/database";

/* ------------------------------------------------------------------ */
/*  PlanComparisonMobile — Tabbed card view (<1024px)                   */
/*                                                                     */
/*  One tab per plan, each showing all features in accordion groups.    */
/* ------------------------------------------------------------------ */

interface PlanComparisonMobileProps {
  plans: ShopPlanRow[];
  currentPlanId: string | null;
  currentPlanSortOrder: number | null;
  cycle: "monthly" | "annual";
  subscribingPlanId: string | null;
  onSubscribe: (planId: string) => void;
}

export function PlanComparisonMobile({
  plans,
  currentPlanId,
  currentPlanSortOrder,
  cycle,
  subscribingPlanId,
  onSubscribe,
}: PlanComparisonMobileProps) {
  // Default to current plan tab, or first plan
  const defaultPlan = plans.find((p) => p.id === currentPlanId) ?? plans[0];

  return (
    <Tabs defaultValue={defaultPlan?.id}>
      {/* Tab list */}
      <TabsList className="w-full">
        {plans.map((plan) => (
          <TabsTrigger key={plan.id} value={plan.id}>
            {plan.name}
          </TabsTrigger>
        ))}
      </TabsList>

      {/* Tab panels */}
      {plans.map((plan) => {
        const features = plan.features as unknown as PlanFeaturesJson;
        const isCurrent = plan.id === currentPlanId;
        const isDowngrade = currentPlanSortOrder !== null && plan.sort_order < currentPlanSortOrder;

        return (
          <TabsContent key={plan.id} value={plan.id}>
            <div className="border-border mt-4 overflow-hidden rounded-xl border">
              {/* Plan header */}
              <div className={cn("border-border/50 border-b", isCurrent && "bg-foreground/[0.02]")}>
                <PlanColumnHeader
                  plan={plan}
                  cycle={cycle}
                  isCurrent={isCurrent}
                  isDowngrade={isDowngrade}
                  subscribing={subscribingPlanId === plan.id}
                  onSubscribe={onSubscribe}
                  variant="card"
                />
              </div>

              {/* Feature categories as accordions */}
              <div className="divide-border/50 divide-y">
                {FEATURE_CATEGORIES.map((category) => (
                  <CategoryAccordion
                    key={category.id}
                    label={category.label}
                    featureKeys={category.features}
                    features={features}
                  />
                ))}
              </div>
            </div>
          </TabsContent>
        );
      })}
    </Tabs>
  );
}

/* ------------------------------------------------------------------ */
/*  CategoryAccordion — collapsible feature group for mobile            */
/* ------------------------------------------------------------------ */

function CategoryAccordion({
  label,
  featureKeys,
  features,
}: {
  label: string;
  featureKeys: (keyof PlanFeaturesJson)[];
  features: PlanFeaturesJson;
}) {
  const [open, setOpen] = useState(true);

  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className="hover:bg-muted/30 flex w-full items-center justify-between px-4 py-3 transition-colors duration-200"
      >
        <span className="text-xs font-semibold tracking-wide uppercase">{label}</span>
        <ChevronDown
          className={cn(
            "text-muted-foreground size-4 transition-transform duration-300",
            open && "rotate-180",
          )}
        />
      </button>
      <div
        className={cn(
          "grid transition-all duration-300 ease-out",
          open ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0",
        )}
      >
        <div className="overflow-hidden">
          <div className="divide-border/30 divide-y px-4 pb-2">
            {featureKeys.map((featureKey) => (
              <PlanFeatureListItem key={featureKey} featureKey={featureKey} features={features} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
