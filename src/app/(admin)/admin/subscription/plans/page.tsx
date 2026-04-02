"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Loader2, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { listPlans, getMySubscription } from "@/lib/actions/subscriptions";
import { startSubscriptionPayment } from "@/lib/actions/subscription-payments";
import { PlanComparisonTable } from "@/components/admin/plan-comparison-table";
import { PlanComparisonMobile } from "@/components/admin/plan-comparison-mobile";
import { cn } from "@/lib/utils";
import type { ShopPlanRow, ShopSubscriptionWithPlan } from "@/lib/types/database";

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
/*  Plan Comparison Page                                                */
/*                                                                     */
/*  FE-016 — Plan comparison for shop owners with self-service          */
/*  subscription checkout via Barion.                                   */
/*  Desktop (>=1024px): full comparison table with grouped features.    */
/*  Mobile (<1024px): tabbed card view with accordion categories.       */
/* ------------------------------------------------------------------ */

export default function PlansComparisonPage() {
  const router = useRouter();
  const [plans, setPlans] = useState<ShopPlanRow[]>([]);
  const [mySubscription, setMySubscription] = useState<ShopSubscriptionWithPlan | null>(null);
  const [loading, setLoading] = useState(true);
  const [cycle, setCycle] = useState<"monthly" | "annual">("monthly");
  const [subscribingPlanId, setSubscribingPlanId] = useState<string | null>(null);

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

  /* ── Subscribe handler ──────────────────────────────────────── */

  const handleSubscribe = useCallback(
    async (planId: string) => {
      if (subscribingPlanId) return;
      setSubscribingPlanId(planId);

      try {
        const result = await startSubscriptionPayment(planId, cycle);

        if (!result.success || !result.data) {
          toast.error(result.error ?? "Hiba a fizetés indításakor.");
          return;
        }

        // Redirect to Barion payment gateway
        toast.info("Átirányítás a fizetési felületre…");
        router.push(result.data.gatewayUrl);
      } catch {
        toast.error("Váratlan hiba történt. Kérjük, próbáld újra.");
      } finally {
        setSubscribingPlanId(null);
      }
    },
    [cycle, subscribingPlanId, router],
  );

  /* ── Loading ──────────────────────────────────────────────────── */

  if (loading) {
    return (
      <div className="flex h-60 items-center justify-center">
        <Loader2 className="text-muted-foreground size-6 animate-spin" />
      </div>
    );
  }

  const currentPlanId = mySubscription?.plan_id ?? null;
  const currentPlanSortOrder =
    currentPlanId !== null ? (plans.find((p) => p.id === currentPlanId)?.sort_order ?? null) : null;

  /* ── Empty state ──────────────────────────────────────────────── */

  if (plans.length === 0) {
    return (
      <div className="space-y-8">
        <PageHeader />
        <div className="border-border text-muted-foreground flex h-40 flex-col items-center justify-center gap-2 rounded-xl border border-dashed text-sm">
          <p>Nincsenek elérhető csomagok.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <PageHeader />

      {/* No active subscription banner */}
      {!mySubscription && (
        <div className="border-border bg-muted/30 flex items-center gap-3 rounded-lg border px-4 py-3">
          <AlertCircle className="text-muted-foreground size-4 shrink-0" />
          <p className="text-muted-foreground text-sm">
            Nincs aktív előfizetésed. Válassz egy csomagot és fizess elő!
          </p>
        </div>
      )}

      {/* Cancelled subscription banner */}
      {mySubscription?.cancelled_at && ["active", "trialing"].includes(mySubscription.status) && (
        <div className="border-border bg-destructive/5 flex items-center gap-3 rounded-lg border px-4 py-3">
          <AlertCircle className="text-destructive size-4 shrink-0" />
          <p className="text-destructive text-sm">
            Az előfizetésed lemondásra került. Az aktuális időszak végéig aktív marad. Válassz új
            csomagot az újraaktiváláshoz!
          </p>
        </div>
      )}

      {/* Billing toggle */}
      <div className="flex justify-center">
        <BillingToggle cycle={cycle} onChange={setCycle} />
      </div>

      {/* Desktop: full comparison table (hidden below 1024px) */}
      <div className="hidden lg:block">
        <PlanComparisonTable
          plans={plans}
          currentPlanId={currentPlanId}
          currentPlanSortOrder={currentPlanSortOrder}
          cycle={cycle}
          subscribingPlanId={subscribingPlanId}
          onSubscribe={handleSubscribe}
        />
      </div>

      {/* Mobile: tabbed card view (hidden at 1024px+) */}
      <div className="lg:hidden">
        <PlanComparisonMobile
          plans={plans}
          currentPlanId={currentPlanId}
          currentPlanSortOrder={currentPlanSortOrder}
          cycle={cycle}
          subscribingPlanId={subscribingPlanId}
          onSubscribe={handleSubscribe}
        />
      </div>

      {/* Footer note */}
      <div className="text-center">
        <p className="text-muted-foreground text-xs">
          Egyedi igényekhez lépj kapcsolatba az ügynökségeddel.
        </p>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Page header                                                        */
/* ------------------------------------------------------------------ */

function PageHeader() {
  return (
    <div className="text-center">
      <h1 className="text-2xl font-semibold tracking-tight">Elérhető csomagok</h1>
      <p className="text-muted-foreground mt-2 text-sm">
        Előfizetési csomagok részletes összehasonlítása
      </p>
    </div>
  );
}
