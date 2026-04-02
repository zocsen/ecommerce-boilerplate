"use client";

import { Crown, Loader2 } from "lucide-react";
import { formatHUF } from "@/lib/utils/format";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { ShopPlanRow } from "@/lib/types/database";

/* ------------------------------------------------------------------ */
/*  PlanColumnHeader                                                    */
/*                                                                     */
/*  Used at the top of each plan column in the comparison table and     */
/*  at the top of each mobile tab. Shows plan name, price, savings,    */
/*  "current plan" badge, and subscribe CTA.                           */
/* ------------------------------------------------------------------ */

interface PlanColumnHeaderProps {
  plan: ShopPlanRow;
  cycle: "monthly" | "annual";
  isCurrent: boolean;
  /** Whether this plan is a downgrade from the current plan (disable subscribe) */
  isDowngrade?: boolean;
  /** Whether a subscribe action is currently in progress */
  subscribing?: boolean;
  /** Called when the user clicks the subscribe button */
  onSubscribe?: (planId: string) => void;
  /** Layout variant: 'table' for compact sticky header, 'card' for full-width mobile card */
  variant?: "table" | "card";
}

export function PlanColumnHeader({
  plan,
  cycle,
  isCurrent,
  isDowngrade = false,
  subscribing = false,
  onSubscribe,
  variant = "table",
}: PlanColumnHeaderProps) {
  const price = cycle === "annual" ? plan.base_annual_price : plan.base_monthly_price;
  const monthlyEquivalent = cycle === "annual" ? Math.round(plan.base_annual_price / 12) : null;
  const annualSavings =
    cycle === "annual" ? plan.base_monthly_price * 12 - plan.base_annual_price : null;

  const isCard = variant === "card";

  return (
    <div className={cn("flex flex-col items-center gap-2", isCard ? "py-6" : "py-4")}>
      {/* Current plan badge */}
      {isCurrent && (
        <Badge className="gap-1 text-xs shadow-sm">
          <Crown className="size-3" />
          Jelenlegi csomagod
        </Badge>
      )}

      {/* Plan name */}
      <h3 className={cn("font-semibold tracking-tight", isCard ? "text-xl" : "text-base")}>
        {plan.name}
      </h3>

      {/* Description */}
      {plan.description && (
        <p className="text-muted-foreground max-w-xs text-center text-xs">{plan.description}</p>
      )}

      {/* Price */}
      <div className="text-center">
        <span className={cn("font-bold tracking-tight", isCard ? "text-3xl" : "text-2xl")}>
          {formatHUF(price)}
        </span>
        <span className="text-muted-foreground ml-1 text-sm">
          / {cycle === "annual" ? "év" : "hó"}
        </span>
      </div>

      {/* Monthly equivalent for annual billing */}
      {monthlyEquivalent !== null && (
        <p className="text-muted-foreground text-xs">
          {formatHUF(monthlyEquivalent)} / hó átlagosan
        </p>
      )}

      {/* Annual savings callout */}
      {annualSavings !== null && annualSavings > 0 && (
        <Badge variant="secondary" className="text-xs font-normal">
          Megtakarítás: {formatHUF(annualSavings)} / év
        </Badge>
      )}

      {/* CTA */}
      {isCurrent ? (
        <div className="text-muted-foreground mt-1 text-xs">Ez az aktuális csomagod</div>
      ) : isDowngrade ? (
        <div className="text-muted-foreground mt-1 text-xs">
          Csomag visszaléptetés nem lehetséges
        </div>
      ) : (
        <Button
          variant="outline"
          size="sm"
          className="mt-1 gap-1.5"
          disabled={subscribing}
          onClick={() => onSubscribe?.(plan.id)}
        >
          {subscribing ? (
            <>
              <Loader2 className="size-3.5 animate-spin" />
              Feldolgozás…
            </>
          ) : (
            "Előfizetés"
          )}
        </Button>
      )}
    </div>
  );
}
