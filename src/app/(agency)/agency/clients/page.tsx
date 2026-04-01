"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  Users,
  Plus,
  Loader2,
  ChevronRight,
  CheckCircle,
  AlertCircle,
  Clock,
  XCircle,
  X,
  Save,
} from "lucide-react";
import { listSubscriptions, listPlans, adminCreateSubscription } from "@/lib/actions/subscriptions";
import { formatHUF, formatDate } from "@/lib/utils/format";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { ShopSubscriptionWithPlan, ShopPlanRow } from "@/lib/types/database";

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

const STATUS_LABELS: Record<string, string> = {
  active: "Aktív",
  trialing: "Próbaidőszak",
  past_due: "Lejárt",
  cancelled: "Lemondva",
};

function subscriptionStatusBadge(status: string) {
  switch (status) {
    case "active":
      return (
        <Badge className="gap-1 text-xs">
          <CheckCircle className="size-3" />
          {STATUS_LABELS[status]}
        </Badge>
      );
    case "trialing":
      return (
        <Badge variant="secondary" className="gap-1 text-xs">
          <Clock className="size-3" />
          {STATUS_LABELS[status]}
        </Badge>
      );
    case "past_due":
      return (
        <Badge variant="destructive" className="gap-1 text-xs">
          <AlertCircle className="size-3" />
          {STATUS_LABELS[status]}
        </Badge>
      );
    case "cancelled":
      return (
        <Badge variant="outline" className="gap-1 text-xs">
          <XCircle className="size-3" />
          {STATUS_LABELS[status]}
        </Badge>
      );
    default:
      return (
        <Badge variant="outline" className="text-xs">
          {status}
        </Badge>
      );
  }
}

function effectivePrice(sub: ShopSubscriptionWithPlan): number {
  if (sub.billing_cycle === "annual") {
    return sub.custom_annual_price ?? sub.plan.base_annual_price;
  }
  return sub.custom_monthly_price ?? sub.plan.base_monthly_price;
}

/* ------------------------------------------------------------------ */
/*  Agency Clients Page                                                */
/* ------------------------------------------------------------------ */

export default function AgencyClientsPage() {
  const [subscriptions, setSubscriptions] = useState<ShopSubscriptionWithPlan[]>([]);
  const [plans, setPlans] = useState<ShopPlanRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Create form
  const [showCreate, setShowCreate] = useState(false);
  const [createShopIdentifier, setCreateShopIdentifier] = useState("");
  const [createPlanId, setCreatePlanId] = useState("");
  const [createBillingCycle, setCreateBillingCycle] = useState<"monthly" | "annual">("monthly");
  const [createStatus, setCreateStatus] = useState<
    "active" | "trialing" | "past_due" | "cancelled"
  >("active");
  const [createPeriodStart, setCreatePeriodStart] = useState("");
  const [createPeriodEnd, setCreatePeriodEnd] = useState("");
  const [createNotes, setCreateNotes] = useState("");
  const [creating, setCreating] = useState(false);

  // Status filter
  const [statusFilter, setStatusFilter] = useState<string>("all");

  // ── Fetch ──────────────────────────────────────────────────────
  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);

    const [subsRes, plansRes] = await Promise.all([listSubscriptions(), listPlans()]);

    if (!subsRes.success) {
      setError(subsRes.error ?? "Hiba az előfizetések lekérésekor.");
    } else {
      setSubscriptions(subsRes.data ?? []);
    }

    if (plansRes.success && plansRes.data) {
      setPlans(plansRes.data);
      const firstActive = plansRes.data.find((p) => p.is_active);
      if (firstActive) setCreatePlanId(firstActive.id);
    }

    setLoading(false);
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // ── Create ─────────────────────────────────────────────────────
  async function handleCreate() {
    if (!createShopIdentifier.trim() || !createPlanId) {
      setError("A bolt azonosító és a csomag kötelező.");
      return;
    }

    setCreating(true);
    setError(null);

    const now = new Date();
    const periodStart = createPeriodStart
      ? new Date(createPeriodStart).toISOString()
      : now.toISOString();
    const periodEnd = createPeriodEnd
      ? new Date(createPeriodEnd).toISOString()
      : new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString();

    const res = await adminCreateSubscription({
      shop_identifier: createShopIdentifier.trim(),
      plan_id: createPlanId,
      billing_cycle: createBillingCycle,
      status: createStatus,
      current_period_start: periodStart,
      current_period_end: periodEnd,
      notes: createNotes || undefined,
    });

    if (!res.success) {
      setError(res.error ?? "Hiba az előfizetés létrehozásakor.");
      setCreating(false);
      return;
    }

    setShowCreate(false);
    setCreateShopIdentifier("");
    setCreateNotes("");
    setCreatePeriodStart("");
    setCreatePeriodEnd("");
    setCreating(false);
    fetchData();
  }

  // ── Filtered list ───────────────────────────────────────────────
  const filtered =
    statusFilter === "all" ? subscriptions : subscriptions.filter((s) => s.status === statusFilter);

  const statusCounts = {
    all: subscriptions.length,
    active: subscriptions.filter((s) => s.status === "active").length,
    trialing: subscriptions.filter((s) => s.status === "trialing").length,
    past_due: subscriptions.filter((s) => s.status === "past_due").length,
    cancelled: subscriptions.filter((s) => s.status === "cancelled").length,
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Ügyfelek</h1>
          <p className="text-muted-foreground mt-1 text-sm">
            {subscriptions.length} ügyfél előfizetés összesen
          </p>
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
              Új előfizetés
            </>
          )}
        </Button>
      </div>

      {error && (
        <div className="border-destructive/50 bg-destructive/10 text-destructive rounded-lg border px-4 py-3 text-sm">
          {error}
        </div>
      )}

      {/* Summary cards */}
      {!loading && subscriptions.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-muted-foreground text-xs font-medium tracking-wider uppercase">
                Aktív
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-semibold tabular-nums">{statusCounts.active}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-muted-foreground text-xs font-medium tracking-wider uppercase">
                Próbaidőszak
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-semibold tabular-nums">{statusCounts.trialing}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-muted-foreground text-xs font-medium tracking-wider uppercase">
                Lejárt
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-destructive text-2xl font-semibold tabular-nums">
                {statusCounts.past_due}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-muted-foreground text-xs font-medium tracking-wider uppercase">
                Lemondva
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground text-2xl font-semibold tabular-nums">
                {statusCounts.cancelled}
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Create form */}
      {showCreate && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Új ügyfél előfizetés</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <div className="space-y-2">
                <Label>Bolt azonosító *</Label>
                <Input
                  value={createShopIdentifier}
                  onChange={(e) => setCreateShopIdentifier(e.target.value)}
                  placeholder="pl. bolt-nev-1"
                  className="font-mono"
                />
              </div>
              <div className="space-y-2">
                <Label>Csomag *</Label>
                <select
                  value={createPlanId}
                  onChange={(e) => setCreatePlanId(e.target.value)}
                  className="border-input bg-background focus-visible:ring-ring flex h-9 w-full rounded-md border px-3 py-1 text-sm shadow-sm transition-colors focus-visible:ring-1 focus-visible:outline-none"
                >
                  <option value="">Válassz csomagot...</option>
                  {plans
                    .filter((p) => p.is_active)
                    .map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                </select>
              </div>
              <div className="space-y-2">
                <Label>Számlázási ciklus</Label>
                <select
                  value={createBillingCycle}
                  onChange={(e) => setCreateBillingCycle(e.target.value as "monthly" | "annual")}
                  className="border-input bg-background focus-visible:ring-ring flex h-9 w-full rounded-md border px-3 py-1 text-sm shadow-sm transition-colors focus-visible:ring-1 focus-visible:outline-none"
                >
                  <option value="monthly">Havi</option>
                  <option value="annual">Éves</option>
                </select>
              </div>
              <div className="space-y-2">
                <Label>Státusz</Label>
                <select
                  value={createStatus}
                  onChange={(e) =>
                    setCreateStatus(
                      e.target.value as "active" | "trialing" | "past_due" | "cancelled",
                    )
                  }
                  className="border-input bg-background focus-visible:ring-ring flex h-9 w-full rounded-md border px-3 py-1 text-sm shadow-sm transition-colors focus-visible:ring-1 focus-visible:outline-none"
                >
                  <option value="active">Aktív</option>
                  <option value="trialing">Próbaidőszak</option>
                  <option value="past_due">Lejárt</option>
                  <option value="cancelled">Lemondva</option>
                </select>
              </div>
              <div className="space-y-2">
                <Label>Időszak kezdete</Label>
                <Input
                  type="date"
                  value={createPeriodStart}
                  onChange={(e) => setCreatePeriodStart(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Időszak vége</Label>
                <Input
                  type="date"
                  value={createPeriodEnd}
                  onChange={(e) => setCreatePeriodEnd(e.target.value)}
                />
              </div>
              <div className="space-y-2 sm:col-span-2 lg:col-span-3">
                <Label>Megjegyzés</Label>
                <Input
                  value={createNotes}
                  onChange={(e) => setCreateNotes(e.target.value)}
                  placeholder="Opcionális belső megjegyzés"
                />
              </div>
            </div>
            <div className="mt-4 flex justify-end">
              <Button size="sm" onClick={handleCreate} disabled={creating}>
                {creating ? (
                  <Loader2 className="mr-2 size-4 animate-spin" />
                ) : (
                  <Save className="mr-2 size-4" />
                )}
                Létrehozás
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Status filter */}
      <div className="flex flex-wrap gap-2">
        {(["all", "active", "trialing", "past_due", "cancelled"] as const).map((s) => (
          <Button
            key={s}
            variant={statusFilter === s ? "default" : "outline"}
            size="sm"
            className="h-7 text-xs"
            onClick={() => setStatusFilter(s)}
          >
            {s === "all"
              ? `Mind (${statusCounts.all})`
              : `${STATUS_LABELS[s]} (${statusCounts[s]})`}
          </Button>
        ))}
      </div>

      {/* Table */}
      {loading ? (
        <div className="flex h-40 items-center justify-center">
          <Loader2 className="text-muted-foreground size-6 animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="border-border text-muted-foreground flex h-40 flex-col items-center justify-center gap-2 rounded-xl border border-dashed text-sm">
          <Users className="text-muted-foreground/40 size-8" />
          <p>Nincsenek előfizetések.</p>
        </div>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Bolt azonosító</TableHead>
              <TableHead>Csomag</TableHead>
              <TableHead>Számlázás</TableHead>
              <TableHead className="text-right">Díj</TableHead>
              <TableHead>Státusz</TableHead>
              <TableHead>Időszak vége</TableHead>
              <TableHead className="text-right" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map((sub) => (
              <TableRow key={sub.id}>
                <TableCell className="font-mono text-xs font-medium">
                  {sub.shop_identifier}
                </TableCell>
                <TableCell>
                  <span className="text-sm">{sub.plan.name}</span>
                </TableCell>
                <TableCell className="text-muted-foreground text-xs">
                  {sub.billing_cycle === "annual" ? "Éves" : "Havi"}
                </TableCell>
                <TableCell className="text-right text-sm tabular-nums">
                  {formatHUF(effectivePrice(sub))}
                </TableCell>
                <TableCell>{subscriptionStatusBadge(sub.status)}</TableCell>
                <TableCell className="text-muted-foreground text-xs whitespace-nowrap">
                  {formatDate(sub.current_period_end)}
                </TableCell>
                <TableCell className="text-right">
                  <Link href={`/agency/clients/${sub.id}`}>
                    <Button variant="ghost" size="sm" className="h-7 gap-1 text-xs">
                      Részletek
                      <ChevronRight className="size-3" />
                    </Button>
                  </Link>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  );
}
