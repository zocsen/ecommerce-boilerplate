import { PlanColumnHeader } from "@/components/admin/plan-column-header";
import { PlanFeatureRow, FEATURE_CATEGORIES } from "@/components/admin/plan-feature-row";
import { cn } from "@/lib/utils";
import type { ShopPlanRow } from "@/lib/types/database";

/* ------------------------------------------------------------------ */
/*  PlanComparisonTable — Desktop layout (>=1024px)                    */
/*                                                                     */
/*  Full comparison table with:                                        */
/*  - Sticky header showing plan names + pricing                       */
/*  - Feature rows grouped by category with section headers            */
/*  - Current plan column highlighted                                  */
/*  - Subscribe CTA per plan                                           */
/* ------------------------------------------------------------------ */

interface PlanComparisonTableProps {
  plans: ShopPlanRow[];
  currentPlanId: string | null;
  currentPlanSortOrder: number | null;
  cycle: "monthly" | "annual";
  subscribingPlanId: string | null;
  onSubscribe: (planId: string) => void;
}

export function PlanComparisonTable({
  plans,
  currentPlanId,
  currentPlanSortOrder,
  cycle,
  subscribingPlanId,
  onSubscribe,
}: PlanComparisonTableProps) {
  return (
    <div className="border-border overflow-hidden rounded-xl border">
      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          {/* ── Sticky header ─────────────────────────────────── */}
          <thead>
            <tr className="bg-muted/30 sticky top-0 z-10 backdrop-blur-sm">
              <th className="border-border/50 w-[260px] min-w-[200px] border-b p-0 text-left">
                <div className="py-4 pr-4 pl-6">
                  <span className="text-muted-foreground text-xs font-medium tracking-wider uppercase">
                    Funkciók
                  </span>
                </div>
              </th>
              {plans.map((plan) => {
                const isCurrent = plan.id === currentPlanId;
                const isDowngrade =
                  currentPlanSortOrder !== null && plan.sort_order < currentPlanSortOrder;

                return (
                  <th
                    key={plan.id}
                    className={cn(
                      "border-border/50 min-w-[200px] border-b p-0",
                      isCurrent && "bg-foreground/[0.02]",
                    )}
                  >
                    <PlanColumnHeader
                      plan={plan}
                      cycle={cycle}
                      isCurrent={isCurrent}
                      isDowngrade={isDowngrade}
                      subscribing={subscribingPlanId === plan.id}
                      onSubscribe={onSubscribe}
                      variant="table"
                    />
                  </th>
                );
              })}
            </tr>
          </thead>

          {/* ── Feature rows grouped by category ──────────────── */}
          <tbody>
            {FEATURE_CATEGORIES.map((category) => (
              <CategoryGroup
                key={category.id}
                categoryLabel={category.label}
                featureKeys={category.features}
                plans={plans}
                currentPlanId={currentPlanId}
              />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  CategoryGroup — section header + feature rows for one category     */
/* ------------------------------------------------------------------ */

function CategoryGroup({
  categoryLabel,
  featureKeys,
  plans,
  currentPlanId,
}: {
  categoryLabel: string;
  featureKeys: (keyof import("@/lib/types/database").PlanFeaturesJson)[];
  plans: ShopPlanRow[];
  currentPlanId: string | null;
}) {
  return (
    <>
      {/* Category header row */}
      <tr>
        <td
          colSpan={plans.length + 1}
          className="bg-muted/20 border-border/50 border-y px-6 py-2.5"
        >
          <span className="text-xs font-semibold tracking-wide uppercase">{categoryLabel}</span>
        </td>
      </tr>
      {/* Feature rows */}
      {featureKeys.map((featureKey) => (
        <PlanFeatureRow
          key={featureKey}
          featureKey={featureKey}
          plans={plans}
          currentPlanId={currentPlanId}
        />
      ))}
    </>
  );
}
