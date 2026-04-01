"use client"

import { useState, useEffect, useCallback } from "react"
import Link from "next/link"
import {
  CreditCard,
  Loader2,
  CheckCircle,
  AlertCircle,
  Clock,
  XCircle,
  FileText,
} from "lucide-react"
import { getMySubscription, getMyInvoices } from "@/lib/actions/subscriptions"
import { formatHUF, formatDate } from "@/lib/utils/format"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import type { ShopSubscriptionWithPlan, SubscriptionInvoiceRow } from "@/lib/types/database"

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

const STATUS_LABELS: Record<string, string> = {
  active: "Aktív",
  trialing: "Próbaidőszak",
  past_due: "Lejárt",
  cancelled: "Lemondva",
}

const INVOICE_STATUS_LABELS: Record<string, string> = {
  pending: "Függőben",
  paid: "Fizetve",
  failed: "Sikertelen",
  refunded: "Visszatérítve",
}

function subscriptionStatusBadge(status: string) {
  switch (status) {
    case "active":
      return (
        <Badge className="gap-1 text-xs">
          <CheckCircle className="size-3" />
          {STATUS_LABELS[status]}
        </Badge>
      )
    case "trialing":
      return (
        <Badge variant="secondary" className="gap-1 text-xs">
          <Clock className="size-3" />
          {STATUS_LABELS[status]}
        </Badge>
      )
    case "past_due":
      return (
        <Badge variant="destructive" className="gap-1 text-xs">
          <AlertCircle className="size-3" />
          {STATUS_LABELS[status]}
        </Badge>
      )
    case "cancelled":
      return (
        <Badge variant="outline" className="gap-1 text-xs">
          <XCircle className="size-3" />
          {STATUS_LABELS[status]}
        </Badge>
      )
    default:
      return (
        <Badge variant="outline" className="text-xs">
          {status}
        </Badge>
      )
  }
}

function invoiceStatusBadge(status: string) {
  switch (status) {
    case "paid":
      return <Badge className="text-xs">{INVOICE_STATUS_LABELS[status]}</Badge>
    case "pending":
      return (
        <Badge variant="secondary" className="text-xs">
          {INVOICE_STATUS_LABELS[status]}
        </Badge>
      )
    case "failed":
      return (
        <Badge variant="destructive" className="text-xs">
          {INVOICE_STATUS_LABELS[status]}
        </Badge>
      )
    case "refunded":
      return (
        <Badge variant="outline" className="text-xs">
          {INVOICE_STATUS_LABELS[status]}
        </Badge>
      )
    default:
      return (
        <Badge variant="outline" className="text-xs">
          {status}
        </Badge>
      )
  }
}

/* ------------------------------------------------------------------ */
/*  Admin Subscription Page (read-only for shop owners)                */
/* ------------------------------------------------------------------ */

export default function AdminSubscriptionPage() {
  const [subscription, setSubscription] = useState<ShopSubscriptionWithPlan | null>(null)
  const [invoices, setInvoices] = useState<SubscriptionInvoiceRow[]>([])
  const [loading, setLoading] = useState(true)

  // ── Fetch ──────────────────────────────────────────────────────
  const fetchData = useCallback(async () => {
    setLoading(true)

    const [subRes, invRes] = await Promise.all([getMySubscription(), getMyInvoices()])

    if (subRes.success && subRes.data) {
      setSubscription(subRes.data)
    }
    if (invRes.success && invRes.data) {
      setInvoices(invRes.data)
    }

    setLoading(false)
  }, [])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  // ── Effective price ─────────────────────────────────────────────
  function effectivePrice(sub: ShopSubscriptionWithPlan): number {
    if (sub.billing_cycle === "annual") {
      return sub.custom_annual_price ?? sub.plan.base_annual_price
    }
    return sub.custom_monthly_price ?? sub.plan.base_monthly_price
  }

  if (loading) {
    return (
      <div className="flex h-60 items-center justify-center">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Előfizetés</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Az aktuális előfizetési csomag és számlák áttekintése
          </p>
        </div>
        <Link href="/admin/subscription/plans">
          <Button variant="outline" size="sm">
            Csomagok megtekintése
          </Button>
        </Link>
      </div>

      {/* No subscription state */}
      {!subscription ? (
        <div className="flex h-60 flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-border text-sm text-muted-foreground">
          <CreditCard className="size-10 text-muted-foreground/40" />
          <p className="text-base font-medium">Nincs aktív előfizetés</p>
          <p className="max-w-xs text-center text-xs">
            Lépj kapcsolatba az ügynökségeddel az előfizetés beállításához.
          </p>
        </div>
      ) : (
        <>
          {/* Subscription overview */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  Csomag
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-xl font-semibold tracking-tight">{subscription.plan.name}</p>
                <p className="mt-1 text-xs text-muted-foreground">{subscription.shop_identifier}</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  Státusz
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-1">
                {subscriptionStatusBadge(subscription.status)}
                {subscription.trial_ends_at && (
                  <p className="mt-2 text-xs text-muted-foreground">
                    Próbaidő vége: {formatDate(subscription.trial_ends_at)}
                  </p>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  Díjszabás
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-xl font-semibold tracking-tight">
                  {formatHUF(effectivePrice(subscription))}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {subscription.billing_cycle === "annual" ? "éves" : "havi"} számlázás
                  {(subscription.custom_monthly_price != null ||
                    subscription.custom_annual_price != null) && (
                    <span className="ml-1 text-muted-foreground/70">(egyedi ár)</span>
                  )}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  Aktuális időszak
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm font-medium">
                  {formatDate(subscription.current_period_start)}
                </p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  – {formatDate(subscription.current_period_end)}
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Plan features */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-semibold">Csomag funkciók</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {(Object.entries(subscription.plan.features) as [string, boolean | number][]).map(
                  ([key, value]) => {
                    const override =
                      subscription.feature_overrides[
                        key as keyof typeof subscription.feature_overrides
                      ]
                    const effective = override !== undefined ? override : value
                    const label = key
                      .replace(/^enable_/, "")
                      .replace(/^max_/, "max. ")
                      .replaceAll("_", " ")

                    return (
                      <div
                        key={key}
                        className="flex items-center justify-between rounded-lg border border-border px-3 py-2 text-xs"
                      >
                        <span className="text-muted-foreground">{label}</span>
                        {typeof effective === "boolean" ? (
                          effective ? (
                            <CheckCircle className="size-3.5 text-green-600" />
                          ) : (
                            <XCircle className="size-3.5 text-muted-foreground/50" />
                          )
                        ) : (
                          <span className="font-mono font-medium">
                            {effective === 0 ? "Korlátlan" : effective}
                          </span>
                        )}
                      </div>
                    )
                  },
                )}
              </div>
              {subscription.notes && (
                <p className="mt-4 text-xs text-muted-foreground">
                  Megjegyzés: {subscription.notes}
                </p>
              )}
            </CardContent>
          </Card>

          {/* Invoices (read-only) */}
          <div className="space-y-4">
            <h2 className="text-base font-semibold tracking-tight">Számlák</h2>

            {invoices.length === 0 ? (
              <div className="flex h-32 flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-border text-sm text-muted-foreground">
                <FileText className="size-7 text-muted-foreground/40" />
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
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {invoices.map((inv) => (
                    <TableRow key={inv.id}>
                      <TableCell className="font-mono text-xs text-muted-foreground">
                        {inv.invoice_number ?? inv.id.slice(0, 8)}
                        {inv.invoice_provider && (
                          <span className="ml-1 text-muted-foreground/60">
                            ({inv.invoice_provider})
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                        {formatDate(inv.billing_period_start)} –{" "}
                        {formatDate(inv.billing_period_end)}
                      </TableCell>
                      <TableCell className="text-right font-medium tabular-nums">
                        {formatHUF(inv.amount)}
                      </TableCell>
                      <TableCell>{invoiceStatusBadge(inv.status)}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {inv.paid_at ? formatDate(inv.paid_at) : "—"}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </div>
        </>
      )}
    </div>
  )
}
