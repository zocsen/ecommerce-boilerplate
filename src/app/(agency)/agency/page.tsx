"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  Users,
  BookOpen,
  Loader2,
  CheckCircle,
  Clock,
  AlertCircle,
  XCircle,
  ChevronRight,
} from "lucide-react";
import { listSubscriptions, listPlans } from "@/lib/actions/subscriptions";
import { formatHUF } from "@/lib/utils/format";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import type { ShopSubscriptionWithPlan, ShopPlanRow } from "@/lib/types/database";

/* ------------------------------------------------------------------ */
/*  Agency Dashboard                                                   */
/* ------------------------------------------------------------------ */

export default function AgencyDashboardPage() {
  const [subscriptions, setSubscriptions] = useState<ShopSubscriptionWithPlan[]>([]);
  const [plans, setPlans] = useState<ShopPlanRow[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    setLoading(true);
    const [subsRes, plansRes] = await Promise.all([listSubscriptions(), listPlans()]);
    if (subsRes.success && subsRes.data) setSubscriptions(subsRes.data);
    if (plansRes.success && plansRes.data) setPlans(plansRes.data);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const statusCounts = {
    active: subscriptions.filter((s) => s.status === "active").length,
    trialing: subscriptions.filter((s) => s.status === "trialing").length,
    past_due: subscriptions.filter((s) => s.status === "past_due").length,
    cancelled: subscriptions.filter((s) => s.status === "cancelled").length,
  };

  // Monthly Recurring Revenue (MRR) from active + trialing subs
  const mrr = subscriptions
    .filter((s) => s.status === "active" || s.status === "trialing")
    .reduce((sum, s) => {
      if (s.billing_cycle === "annual") {
        const price = s.custom_annual_price ?? s.plan.base_annual_price;
        return sum + Math.round(price / 12);
      }
      return sum + (s.custom_monthly_price ?? s.plan.base_monthly_price);
    }, 0);

  // Plan distribution
  const planDistribution = plans.map((plan) => ({
    name: plan.name,
    count: subscriptions.filter((s) => s.plan_id === plan.id && s.status !== "cancelled").length,
  }));

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
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Ügynökségi áttekintés</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Ügyfelek, előfizetések és bevétel összesítése
        </p>
      </div>

      {/* Summary cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-muted-foreground text-xs font-medium tracking-wider uppercase">
              Összes ügyfél
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-semibold tabular-nums">{subscriptions.length}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-muted-foreground flex items-center gap-1.5 text-xs font-medium tracking-wider uppercase">
              <CheckCircle className="size-3 text-green-600" />
              Aktív
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-semibold text-green-600 tabular-nums">
              {statusCounts.active}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-muted-foreground flex items-center gap-1.5 text-xs font-medium tracking-wider uppercase">
              <Clock className="size-3" />
              Próbaidőszak
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-semibold tabular-nums">{statusCounts.trialing}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-muted-foreground flex items-center gap-1.5 text-xs font-medium tracking-wider uppercase">
              <AlertCircle className="text-destructive size-3" />
              Lejárt
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-destructive text-3xl font-semibold tabular-nums">
              {statusCounts.past_due}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-muted-foreground text-xs font-medium tracking-wider uppercase">
              Havi bevétel (MRR)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-semibold tabular-nums">{formatHUF(mrr)}</p>
          </CardContent>
        </Card>
      </div>

      {/* Plan distribution */}
      {planDistribution.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-semibold">Csomag eloszlás</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {planDistribution.map((pd) => (
                <div
                  key={pd.name}
                  className="border-border flex items-center justify-between rounded-lg border px-4 py-3"
                >
                  <span className="text-sm font-medium">{pd.name}</span>
                  <span className="text-lg font-semibold tabular-nums">{pd.count}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Quick links */}
      <div className="grid gap-4 sm:grid-cols-2">
        <Link href="/agency/clients">
          <Card className="group hover:border-foreground/20 cursor-pointer transition-all duration-500 hover:scale-[1.02]">
            <CardContent className="flex items-center justify-between py-6">
              <div className="flex items-center gap-3">
                <Users className="text-muted-foreground size-5" />
                <div>
                  <p className="text-sm font-semibold">Ügyfelek kezelése</p>
                  <p className="text-muted-foreground text-xs">
                    Előfizetések megtekintése és szerkesztése
                  </p>
                </div>
              </div>
              <ChevronRight className="text-muted-foreground size-4 transition-transform duration-300 group-hover:translate-x-1" />
            </CardContent>
          </Card>
        </Link>

        <Link href="/agency/plans">
          <Card className="group hover:border-foreground/20 cursor-pointer transition-all duration-500 hover:scale-[1.02]">
            <CardContent className="flex items-center justify-between py-6">
              <div className="flex items-center gap-3">
                <BookOpen className="text-muted-foreground size-5" />
                <div>
                  <p className="text-sm font-semibold">Csomagok kezelése</p>
                  <p className="text-muted-foreground text-xs">
                    Előfizetési csomagok létrehozása és szerkesztése
                  </p>
                </div>
              </div>
              <ChevronRight className="text-muted-foreground size-4 transition-transform duration-300 group-hover:translate-x-1" />
            </CardContent>
          </Card>
        </Link>
      </div>
    </div>
  );
}
