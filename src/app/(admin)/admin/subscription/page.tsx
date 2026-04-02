"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  CreditCard,
  Loader2,
  CheckCircle,
  AlertCircle,
  Clock,
  XCircle,
  FileText,
  AlertTriangle,
  Ban,
  ShieldCheck,
} from "lucide-react";
import { toast } from "sonner";
import { getMyInvoices } from "@/lib/actions/subscriptions";
import {
  getMySubscriptionWithPaymentInfo,
  cancelMySubscription,
} from "@/lib/actions/subscription-payments";
import { formatHUF, formatDate } from "@/lib/utils/format";
import { Button, buttonVariants } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AlertDialog,
  AlertDialogTrigger,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogMedia,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogAction,
  AlertDialogCancel,
} from "@/components/ui/alert-dialog";
import { cn } from "@/lib/utils";
import type {
  ShopSubscriptionWithPlan,
  SubscriptionInvoiceRow,
  PlanFeaturesJson,
} from "@/lib/types/database";

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

const STATUS_LABELS: Record<string, string> = {
  active: "Aktív",
  trialing: "Próbaidőszak",
  past_due: "Lejárt fizetés",
  cancelled: "Lemondva",
  suspended: "Felfüggesztve",
};

const INVOICE_STATUS_LABELS: Record<string, string> = {
  pending: "Függőben",
  paid: "Fizetve",
  failed: "Sikertelen",
  refunded: "Visszatérítve",
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
    case "suspended":
      return (
        <Badge variant="destructive" className="gap-1 text-xs">
          <Ban className="size-3" />
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

function invoiceStatusBadge(status: string) {
  switch (status) {
    case "paid":
      return <Badge className="text-xs">{INVOICE_STATUS_LABELS[status]}</Badge>;
    case "pending":
      return (
        <Badge variant="secondary" className="text-xs">
          {INVOICE_STATUS_LABELS[status]}
        </Badge>
      );
    case "failed":
      return (
        <Badge variant="destructive" className="text-xs">
          {INVOICE_STATUS_LABELS[status]}
        </Badge>
      );
    case "refunded":
      return (
        <Badge variant="outline" className="text-xs">
          {INVOICE_STATUS_LABELS[status]}
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

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

type SubscriptionWithPaymentInfo = ShopSubscriptionWithPlan & {
  hasPaymentMethod: boolean;
  isCancelScheduled: boolean;
  canResubscribe: boolean;
};

/* ------------------------------------------------------------------ */
/*  Admin Subscription Dashboard                                       */
/* ------------------------------------------------------------------ */

export default function AdminSubscriptionPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [subscription, setSubscription] = useState<SubscriptionWithPaymentInfo | null>(null);
  const [invoices, setInvoices] = useState<SubscriptionInvoiceRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [cancelling, setCancelling] = useState(false);
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);

  // ── Fetch ──────────────────────────────────────────────────────
  const fetchData = useCallback(async () => {
    setLoading(true);

    const [subRes, invRes] = await Promise.all([
      getMySubscriptionWithPaymentInfo(),
      getMyInvoices(),
    ]);

    if (subRes.success && subRes.data) {
      setSubscription(subRes.data);
    }
    if (invRes.success && invRes.data) {
      setInvoices(invRes.data);
    }

    setLoading(false);
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // ── Handle payment redirect query params ───────────────────────
  useEffect(() => {
    const payment = searchParams.get("payment");
    if (payment === "success") {
      toast.success("Sikeres fizetés! Az előfizetésed aktiválva lett.");
      router.replace("/admin/subscription", { scroll: false });
    } else if (payment === "cancel") {
      toast.info("A fizetés megszakítva. Az előfizetésed nem változott.");
      router.replace("/admin/subscription", { scroll: false });
    }
  }, [searchParams, router]);

  // ── Cancel handler ─────────────────────────────────────────────
  const handleCancel = useCallback(async () => {
    setCancelling(true);
    try {
      const result = await cancelMySubscription();
      if (result.success) {
        toast.success("Előfizetés lemondva. Az aktuális időszak végéig aktív marad.");
        setCancelDialogOpen(false);
        await fetchData();
      } else {
        toast.error(result.error ?? "Hiba a lemondás során.");
      }
    } catch {
      toast.error("Váratlan hiba történt.");
    } finally {
      setCancelling(false);
    }
  }, [fetchData]);

  // ── Effective price ─────────────────────────────────────────────
  function effectivePrice(sub: ShopSubscriptionWithPlan): number {
    if (sub.billing_cycle === "annual") {
      return sub.custom_annual_price ?? sub.plan.base_annual_price;
    }
    return sub.custom_monthly_price ?? sub.plan.base_monthly_price;
  }

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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Előfizetés</h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Az aktuális előfizetési csomag és számlák áttekintése
          </p>
        </div>
        <Link
          href="/admin/subscription/plans"
          className={cn(buttonVariants({ variant: "outline", size: "sm" }), "no-underline")}
        >
          Csomagok megtekintése
        </Link>
      </div>

      {/* No subscription state */}
      {!subscription ? (
        <div className="border-border text-muted-foreground flex h-60 flex-col items-center justify-center gap-3 rounded-xl border border-dashed text-sm">
          <CreditCard className="text-muted-foreground/40 size-10" />
          <p className="text-base font-medium">Nincs aktív előfizetés</p>
          <p className="max-w-xs text-center text-xs">
            Válassz egy csomagot és aktiváld az előfizetésedet az elérhető csomagok oldalon.
          </p>
          <Link
            href="/admin/subscription/plans"
            className={cn(buttonVariants({ variant: "default", size: "sm" }), "mt-2 no-underline")}
          >
            Csomagok megtekintése
          </Link>
        </div>
      ) : (
        <>
          {/* ── Status banners ──────────────────────────────────── */}

          {/* Scheduled for cancellation */}
          {subscription.isCancelScheduled && (
            <div className="flex items-center gap-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 dark:border-amber-900/50 dark:bg-amber-950/20">
              <AlertTriangle className="size-4 shrink-0 text-amber-600 dark:text-amber-400" />
              <div className="flex-1">
                <p className="text-sm font-medium text-amber-800 dark:text-amber-200">
                  Előfizetés lemondva
                </p>
                <p className="text-xs text-amber-700 dark:text-amber-300">
                  Az előfizetésed {formatDate(subscription.current_period_end)}-ig aktív marad,
                  ezután a funkciók zárolásra kerülnek. Ha meggondolod magad, válassz új csomagot!
                </p>
              </div>
              <Link
                href="/admin/subscription/plans"
                className={cn(
                  buttonVariants({ variant: "outline", size: "sm" }),
                  "shrink-0 no-underline",
                )}
              >
                Újra előfizetés
              </Link>
            </div>
          )}

          {/* Past due */}
          {subscription.status === "past_due" && (
            <div className="flex items-center gap-3 rounded-lg border border-red-200 bg-red-50 px-4 py-3 dark:border-red-900/50 dark:bg-red-950/20">
              <AlertCircle className="size-4 shrink-0 text-red-600 dark:text-red-400" />
              <div className="flex-1">
                <p className="text-sm font-medium text-red-800 dark:text-red-200">
                  Fizetési probléma
                </p>
                <p className="text-xs text-red-700 dark:text-red-300">
                  Az automatikus megújítás sikertelen volt. Kérjük, frissítsd a fizetési adataidat.
                  {subscription.grace_period_end && (
                    <> A türelmi időszak {formatDate(subscription.grace_period_end)}-ig tart.</>
                  )}
                </p>
              </div>
            </div>
          )}

          {/* Suspended */}
          {subscription.status === "suspended" && (
            <div className="flex items-center gap-3 rounded-lg border border-red-200 bg-red-50 px-4 py-3 dark:border-red-900/50 dark:bg-red-950/20">
              <Ban className="size-4 shrink-0 text-red-600 dark:text-red-400" />
              <div className="flex-1">
                <p className="text-sm font-medium text-red-800 dark:text-red-200">
                  Előfizetés felfüggesztve
                </p>
                <p className="text-xs text-red-700 dark:text-red-300">
                  Az előfizetésed felfüggesztésre került a sikertelen fizetés miatt. Az újbóli
                  aktiváláshoz válassz egy új csomagot.
                </p>
              </div>
              <Link
                href="/admin/subscription/plans"
                className={cn(
                  buttonVariants({ variant: "default", size: "sm" }),
                  "shrink-0 no-underline",
                )}
              >
                Újra előfizetés
              </Link>
            </div>
          )}

          {/* Cancelled (final) */}
          {subscription.status === "cancelled" && (
            <div className="border-border bg-muted/30 flex items-center gap-3 rounded-lg border px-4 py-3">
              <XCircle className="text-muted-foreground size-4 shrink-0" />
              <div className="flex-1">
                <p className="text-sm font-medium">Előfizetés lejárt</p>
                <p className="text-muted-foreground text-xs">
                  Az előfizetésed lejárt. Válassz egy új csomagot az újraaktiváláshoz.
                </p>
              </div>
              <Link
                href="/admin/subscription/plans"
                className={cn(
                  buttonVariants({ variant: "default", size: "sm" }),
                  "shrink-0 no-underline",
                )}
              >
                Újra előfizetés
              </Link>
            </div>
          )}

          {/* ── Subscription overview cards ─────────────────────── */}

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-muted-foreground text-xs font-medium tracking-wider uppercase">
                  Csomag
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-xl font-semibold tracking-tight">{subscription.plan.name}</p>
                <p className="text-muted-foreground mt-1 text-xs">{subscription.shop_identifier}</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-muted-foreground text-xs font-medium tracking-wider uppercase">
                  Státusz
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-1">
                {subscriptionStatusBadge(subscription.status)}
                {subscription.trial_ends_at && (
                  <p className="text-muted-foreground mt-2 text-xs">
                    Próbaidő vége: {formatDate(subscription.trial_ends_at)}
                  </p>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-muted-foreground text-xs font-medium tracking-wider uppercase">
                  Díjszabás
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-xl font-semibold tracking-tight">
                  {formatHUF(effectivePrice(subscription))}
                </p>
                <p className="text-muted-foreground mt-1 text-xs">
                  {subscription.billing_cycle === "annual" ? "éves" : "havi"} számlázás
                  {(subscription.custom_monthly_price != null ||
                    subscription.custom_annual_price != null) && (
                    <span className="text-muted-foreground/70 ml-1">(egyedi ár)</span>
                  )}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-muted-foreground text-xs font-medium tracking-wider uppercase">
                  Aktuális időszak
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm font-medium">
                  {formatDate(subscription.current_period_start)}
                </p>
                <p className="text-muted-foreground mt-0.5 text-xs">
                  – {formatDate(subscription.current_period_end)}
                </p>
              </CardContent>
            </Card>
          </div>

          {/* ── Payment method card ─────────────────────────────── */}

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold">Fizetési mód</CardTitle>
            </CardHeader>
            <CardContent>
              {subscription.hasPaymentMethod ? (
                <div className="flex items-center gap-3">
                  <div className="bg-muted flex size-10 items-center justify-center rounded-lg">
                    <ShieldCheck className="text-foreground size-5" />
                  </div>
                  <div>
                    <p className="text-sm font-medium">Bankkártya (Barion)</p>
                    <p className="text-muted-foreground text-xs">
                      Automatikus megújítás aktív
                      {subscription.barion_funding_source && (
                        <span className="text-muted-foreground/70 ml-1">
                          ({subscription.barion_funding_source})
                        </span>
                      )}
                    </p>
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-3">
                  <div className="bg-muted flex size-10 items-center justify-center rounded-lg">
                    <CreditCard className="text-muted-foreground size-5" />
                  </div>
                  <div>
                    <p className="text-muted-foreground text-sm">Nincs tárolt fizetési mód</p>
                    <p className="text-muted-foreground/70 text-xs">
                      Az első sikeres fizetés után automatikusan mentjük a kártyaadatokat
                    </p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* ── Plan features ───────────────────────────────────── */}

          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-semibold">Csomag funkciók</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {(
                  Object.entries(subscription.plan.features as unknown as PlanFeaturesJson) as [
                    string,
                    boolean | number,
                  ][]
                ).map(([key, value]) => {
                  const overrides =
                    subscription.feature_overrides as unknown as Partial<PlanFeaturesJson> | null;
                  const override = overrides?.[key as keyof PlanFeaturesJson];
                  const effective = override !== undefined ? override : value;
                  const label = key
                    .replace(/^enable_/, "")
                    .replace(/^max_/, "max. ")
                    .replaceAll("_", " ");

                  return (
                    <div
                      key={key}
                      className="border-border flex items-center justify-between rounded-lg border px-3 py-2 text-xs"
                    >
                      <span className="text-muted-foreground">{label}</span>
                      {typeof effective === "boolean" ? (
                        effective ? (
                          <CheckCircle className="size-3.5 text-green-600" />
                        ) : (
                          <XCircle className="text-muted-foreground/50 size-3.5" />
                        )
                      ) : (
                        <span className="font-mono font-medium">
                          {effective === 0 ? "Korlátlan" : effective}
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
              {subscription.notes && (
                <p className="text-muted-foreground mt-4 text-xs">
                  Megjegyzés: {subscription.notes}
                </p>
              )}
            </CardContent>
          </Card>

          {/* ── Invoices ────────────────────────────────────────── */}

          <div className="space-y-4">
            <h2 className="text-base font-semibold tracking-tight">Számlák</h2>

            {invoices.length === 0 ? (
              <div className="border-border text-muted-foreground flex h-32 flex-col items-center justify-center gap-2 rounded-xl border border-dashed text-sm">
                <FileText className="text-muted-foreground/40 size-7" />
                <p>Nincsenek számlák.</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Számlaszám</TableHead>
                    <TableHead>Időszak</TableHead>
                    <TableHead className="text-right">Összeg</TableHead>
                    <TableHead>Státusz</TableHead>
                    <TableHead>Fizetve</TableHead>
                    <TableHead />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {invoices.map((inv) => (
                    <TableRow key={inv.id}>
                      <TableCell className="text-muted-foreground font-mono text-xs">
                        {inv.invoice_number ?? inv.id.slice(0, 8)}
                        {inv.invoice_provider && (
                          <span className="text-muted-foreground/60 ml-1">
                            ({inv.invoice_provider})
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="text-muted-foreground text-xs whitespace-nowrap">
                        {formatDate(inv.billing_period_start)} –{" "}
                        {formatDate(inv.billing_period_end)}
                      </TableCell>
                      <TableCell className="text-right font-medium tabular-nums">
                        {formatHUF(inv.amount)}
                      </TableCell>
                      <TableCell>{invoiceStatusBadge(inv.status)}</TableCell>
                      <TableCell className="text-muted-foreground text-xs">
                        {inv.paid_at ? formatDate(inv.paid_at) : "—"}
                      </TableCell>
                      <TableCell>
                        {inv.invoice_url && (
                          <a
                            href={inv.invoice_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className={cn(
                              buttonVariants({ variant: "ghost", size: "icon-xs" }),
                              "no-underline",
                            )}
                            title="Számla megtekintése"
                          >
                            <FileText className="size-3" />
                          </a>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </div>

          {/* ── Cancel subscription ─────────────────────────────── */}

          {!subscription.isCancelScheduled &&
            !subscription.canResubscribe &&
            ["active", "trialing"].includes(subscription.status) && (
              <div className="border-border flex items-center justify-between rounded-lg border px-4 py-3">
                <div>
                  <p className="text-sm font-medium">Előfizetés lemondása</p>
                  <p className="text-muted-foreground text-xs">
                    Az előfizetés az aktuális időszak végéig aktív marad, visszatérítés nem jár.
                  </p>
                </div>
                <AlertDialog open={cancelDialogOpen} onOpenChange={setCancelDialogOpen}>
                  <AlertDialogTrigger render={<Button variant="destructive" size="sm" />}>
                    Lemondás
                  </AlertDialogTrigger>
                  <AlertDialogContent size="sm">
                    <AlertDialogHeader>
                      <AlertDialogMedia className="bg-destructive/10">
                        <AlertTriangle className="text-destructive size-5" />
                      </AlertDialogMedia>
                      <AlertDialogTitle>Előfizetés lemondása</AlertDialogTitle>
                      <AlertDialogDescription>
                        Biztosan le szeretnéd mondani az előfizetésedet? Az előfizetésed{" "}
                        {formatDate(subscription.current_period_end)}-ig aktív marad, ezután a
                        funkciók zárolásra kerülnek. Visszatérítés nem jár.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Mégsem</AlertDialogCancel>
                      <AlertDialogAction
                        variant="destructive"
                        disabled={cancelling}
                        onClick={(e) => {
                          e.preventDefault();
                          handleCancel();
                        }}
                      >
                        {cancelling ? (
                          <>
                            <Loader2 className="size-3.5 animate-spin" />
                            Feldolgozás…
                          </>
                        ) : (
                          "Lemondás megerősítése"
                        )}
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            )}
        </>
      )}
    </div>
  );
}
