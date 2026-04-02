"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Loader2,
  Save,
  CheckCircle,
  XCircle,
  AlertCircle,
  Clock,
  FileText,
  Plus,
  X,
} from "lucide-react";
import {
  getSubscription,
  listInvoices,
  listPlans,
  adminUpdateSubscription,
  adminCancelSubscription,
  adminCreateInvoice,
  adminUpdateInvoice,
} from "@/lib/actions/subscriptions";
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
import type {
  ShopSubscriptionWithPlan,
  SubscriptionInvoiceRow,
  ShopPlanRow,
} from "@/lib/types/database";

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

const STATUS_LABELS: Record<string, string> = {
  active: "Aktív",
  trialing: "Próbaidőszak",
  past_due: "Lejárt",
  cancelled: "Lemondva",
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
/*  Client Subscription Detail Page                                    */
/* ------------------------------------------------------------------ */

export default function ClientSubscriptionDetailPage() {
  const params = useParams<{ id: string }>();
  const id = params.id;

  const [subscription, setSubscription] = useState<ShopSubscriptionWithPlan | null>(null);
  const [invoices, setInvoices] = useState<SubscriptionInvoiceRow[]>([]);
  const [plans, setPlans] = useState<ShopPlanRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Edit subscription fields
  const [editPlanId, setEditPlanId] = useState("");
  const [editBillingCycle, setEditBillingCycle] = useState<"monthly" | "annual">("monthly");
  const [editStatus, setEditStatus] = useState<
    "active" | "trialing" | "past_due" | "cancelled" | "suspended"
  >("active");
  const [editCustomMonthly, setEditCustomMonthly] = useState("");
  const [editCustomAnnual, setEditCustomAnnual] = useState("");
  const [editPeriodEnd, setEditPeriodEnd] = useState("");
  const [editNotes, setEditNotes] = useState("");
  const [saving, setSaving] = useState(false);

  // Cancel
  const [confirmCancel, setConfirmCancel] = useState(false);
  const [cancelling, setCancelling] = useState(false);

  // Invoice create
  const [showCreateInvoice, setShowCreateInvoice] = useState(false);
  const [invoiceAmount, setInvoiceAmount] = useState("");
  const [invoicePeriodStart, setInvoicePeriodStart] = useState("");
  const [invoicePeriodEnd, setInvoicePeriodEnd] = useState("");
  const [invoiceStatus, setInvoiceStatus] = useState<"pending" | "paid" | "failed" | "refunded">(
    "pending",
  );
  const [invoiceNumber, setInvoiceNumber] = useState("");
  const [invoiceProvider, setInvoiceProvider] = useState("");
  const [creatingInvoice, setCreatingInvoice] = useState(false);

  // Invoice update
  const [updatingInvoiceId, setUpdatingInvoiceId] = useState<string | null>(null);

  // ── Fetch ──────────────────────────────────────────────────────
  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);

    const [subRes, plansRes, invRes] = await Promise.all([
      getSubscription(id),
      listPlans(),
      listInvoices(id),
    ]);

    if (!subRes.success || !subRes.data) {
      setError(subRes.error ?? "Az előfizetés nem található.");
      setLoading(false);
      return;
    }

    const sub = subRes.data;
    setSubscription(sub);
    setEditPlanId(sub.plan_id);
    setEditBillingCycle(sub.billing_cycle);
    setEditStatus(sub.status);
    setEditCustomMonthly(sub.custom_monthly_price != null ? String(sub.custom_monthly_price) : "");
    setEditCustomAnnual(sub.custom_annual_price != null ? String(sub.custom_annual_price) : "");
    setEditPeriodEnd(sub.current_period_end.slice(0, 10));
    setEditNotes(sub.notes ?? "");

    if (plansRes.success && plansRes.data) setPlans(plansRes.data);
    if (invRes.success && invRes.data) setInvoices(invRes.data);

    setLoading(false);
  }, [id]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // ── Save subscription updates ────────────────────────────────────
  async function handleSave() {
    setSaving(true);
    setError(null);
    setSuccessMsg(null);

    const res = await adminUpdateSubscription(id, {
      plan_id: editPlanId || undefined,
      billing_cycle: editBillingCycle,
      status: editStatus,
      custom_monthly_price: editCustomMonthly ? Number(editCustomMonthly) : null,
      custom_annual_price: editCustomAnnual ? Number(editCustomAnnual) : null,
      current_period_end: editPeriodEnd ? new Date(editPeriodEnd).toISOString() : undefined,
      notes: editNotes || null,
    });

    if (!res.success) {
      setError(res.error ?? "Hiba a frissítéskor.");
    } else {
      setSuccessMsg("Az előfizetés sikeresen frissítve.");
      fetchData();
    }
    setSaving(false);
  }

  // ── Cancel subscription ──────────────────────────────────────────
  async function handleCancel() {
    if (!confirmCancel) {
      setConfirmCancel(true);
      return;
    }
    setCancelling(true);
    setError(null);
    const res = await adminCancelSubscription(id);
    if (!res.success) {
      setError(res.error ?? "Hiba a lemondásnál.");
    } else {
      setSuccessMsg("Az előfizetés lemondva.");
      setConfirmCancel(false);
      fetchData();
    }
    setCancelling(false);
  }

  // ── Create invoice ───────────────────────────────────────────────
  async function handleCreateInvoice() {
    if (!invoiceAmount || !invoicePeriodStart || !invoicePeriodEnd) {
      setError("Az összeg és a számlázási időszak kötelező.");
      return;
    }
    setCreatingInvoice(true);
    setError(null);

    const res = await adminCreateInvoice({
      subscription_id: id,
      amount: Number(invoiceAmount),
      billing_period_start: new Date(invoicePeriodStart).toISOString(),
      billing_period_end: new Date(invoicePeriodEnd).toISOString(),
      status: invoiceStatus,
      invoice_number: invoiceNumber || undefined,
      invoice_provider: invoiceProvider || undefined,
    });

    if (!res.success) {
      setError(res.error ?? "Hiba a számla létrehozásakor.");
    } else {
      setShowCreateInvoice(false);
      setInvoiceAmount("");
      setInvoicePeriodStart("");
      setInvoicePeriodEnd("");
      setInvoiceStatus("pending");
      setInvoiceNumber("");
      setInvoiceProvider("");
      fetchData();
    }
    setCreatingInvoice(false);
  }

  // ── Mark invoice paid ────────────────────────────────────────────
  async function handleMarkPaid(invoiceId: string) {
    setUpdatingInvoiceId(invoiceId);
    setError(null);
    const res = await adminUpdateInvoice(invoiceId, { status: "paid" });
    if (!res.success) {
      setError(res.error ?? "Hiba a számla frissítésekor.");
    } else {
      fetchData();
    }
    setUpdatingInvoiceId(null);
  }

  if (loading) {
    return (
      <div className="flex h-60 items-center justify-center">
        <Loader2 className="text-muted-foreground size-6 animate-spin" />
      </div>
    );
  }

  if (!subscription) {
    return (
      <div className="space-y-4">
        <Link href="/agency/clients">
          <Button variant="ghost" size="sm" className="gap-2">
            <ArrowLeft className="size-4" />
            Vissza
          </Button>
        </Link>
        <p className="text-destructive text-sm">{error ?? "Az előfizetés nem található."}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <Link href="/agency/clients">
            <Button variant="ghost" size="sm" className="text-muted-foreground mb-3 gap-2 pl-0">
              <ArrowLeft className="size-4" />
              Vissza az ügyfelekhez
            </Button>
          </Link>
          <h1 className="text-2xl font-semibold tracking-tight">{subscription.shop_identifier}</h1>
          <div className="mt-2 flex items-center gap-3">
            {subscriptionStatusBadge(subscription.status)}
            <span className="text-muted-foreground text-sm">{subscription.plan.name}</span>
          </div>
        </div>

        {subscription.status !== "cancelled" && (
          <Button
            variant="outline"
            size="sm"
            className="text-destructive hover:text-destructive"
            onClick={handleCancel}
            disabled={cancelling}
          >
            {cancelling ? <Loader2 className="mr-2 size-4 animate-spin" /> : null}
            {confirmCancel ? "Valóban lemondod?" : "Előfizetés lemondása"}
          </Button>
        )}
      </div>

      {error && (
        <div className="border-destructive/50 bg-destructive/10 text-destructive rounded-lg border px-4 py-3 text-sm">
          {error}
        </div>
      )}
      {successMsg && (
        <div className="rounded-lg border border-green-500/30 bg-green-500/10 px-4 py-3 text-sm text-green-700 dark:text-green-400">
          {successMsg}
        </div>
      )}

      {/* Edit subscription */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Előfizetés adatai</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <div className="space-y-2">
              <Label>Csomag</Label>
              <select
                value={editPlanId}
                onChange={(e) => setEditPlanId(e.target.value)}
                className="border-input bg-background focus-visible:ring-ring flex h-9 w-full rounded-md border px-3 py-1 text-sm shadow-sm transition-colors focus-visible:ring-1 focus-visible:outline-none"
              >
                {plans.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label>Számlázási ciklus</Label>
              <select
                value={editBillingCycle}
                onChange={(e) => setEditBillingCycle(e.target.value as "monthly" | "annual")}
                className="border-input bg-background focus-visible:ring-ring flex h-9 w-full rounded-md border px-3 py-1 text-sm shadow-sm transition-colors focus-visible:ring-1 focus-visible:outline-none"
              >
                <option value="monthly">Havi</option>
                <option value="annual">Éves</option>
              </select>
            </div>
            <div className="space-y-2">
              <Label>Státusz</Label>
              <select
                value={editStatus}
                onChange={(e) =>
                  setEditStatus(
                    e.target.value as
                      | "active"
                      | "trialing"
                      | "past_due"
                      | "cancelled"
                      | "suspended",
                  )
                }
                className="border-input bg-background focus-visible:ring-ring flex h-9 w-full rounded-md border px-3 py-1 text-sm shadow-sm transition-colors focus-visible:ring-1 focus-visible:outline-none"
              >
                <option value="active">Aktív</option>
                <option value="trialing">Próbaidőszak</option>
                <option value="past_due">Lejárt</option>
                <option value="cancelled">Lemondva</option>
                <option value="suspended">Felfüggesztve</option>
              </select>
            </div>
            <div className="space-y-2">
              <Label>Egyedi havi ár (HUF)</Label>
              <Input
                type="number"
                min="0"
                value={editCustomMonthly}
                onChange={(e) => setEditCustomMonthly(e.target.value)}
                placeholder={`Alap: ${subscription.plan.base_monthly_price}`}
              />
            </div>
            <div className="space-y-2">
              <Label>Egyedi éves ár (HUF)</Label>
              <Input
                type="number"
                min="0"
                value={editCustomAnnual}
                onChange={(e) => setEditCustomAnnual(e.target.value)}
                placeholder={`Alap: ${subscription.plan.base_annual_price}`}
              />
            </div>
            <div className="space-y-2">
              <Label>Időszak vége</Label>
              <Input
                type="date"
                value={editPeriodEnd}
                onChange={(e) => setEditPeriodEnd(e.target.value)}
              />
            </div>
            <div className="space-y-2 sm:col-span-2 lg:col-span-3">
              <Label>Megjegyzés</Label>
              <Input
                value={editNotes}
                onChange={(e) => setEditNotes(e.target.value)}
                placeholder="Belső megjegyzés"
              />
            </div>
          </div>
          <div className="flex justify-end">
            <Button size="sm" onClick={handleSave} disabled={saving}>
              {saving ? (
                <Loader2 className="mr-2 size-4 animate-spin" />
              ) : (
                <Save className="mr-2 size-4" />
              )}
              Mentés
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Invoices */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold tracking-tight">Számlák</h2>
          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              setShowCreateInvoice((v) => !v);
              setError(null);
            }}
          >
            {showCreateInvoice ? (
              <>
                <X className="mr-2 size-4" />
                Mégsem
              </>
            ) : (
              <>
                <Plus className="mr-2 size-4" />
                Új számla
              </>
            )}
          </Button>
        </div>

        {/* Create invoice form */}
        {showCreateInvoice && (
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Új számla</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                <div className="space-y-2">
                  <Label>Összeg (HUF) *</Label>
                  <Input
                    type="number"
                    min="1"
                    value={invoiceAmount}
                    onChange={(e) => setInvoiceAmount(e.target.value)}
                    placeholder="pl. 9900"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Időszak kezdete *</Label>
                  <Input
                    type="date"
                    value={invoicePeriodStart}
                    onChange={(e) => setInvoicePeriodStart(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Időszak vége *</Label>
                  <Input
                    type="date"
                    value={invoicePeriodEnd}
                    onChange={(e) => setInvoicePeriodEnd(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Státusz</Label>
                  <select
                    value={invoiceStatus}
                    onChange={(e) => setInvoiceStatus(e.target.value as typeof invoiceStatus)}
                    className="border-input bg-background focus-visible:ring-ring flex h-9 w-full rounded-md border px-3 py-1 text-sm shadow-sm transition-colors focus-visible:ring-1 focus-visible:outline-none"
                  >
                    <option value="pending">Függőben</option>
                    <option value="paid">Fizetve</option>
                    <option value="failed">Sikertelen</option>
                    <option value="refunded">Visszatérítve</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <Label>Számlaszám</Label>
                  <Input
                    value={invoiceNumber}
                    onChange={(e) => setInvoiceNumber(e.target.value)}
                    placeholder="Opcionális"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Számlázó rendszer</Label>
                  <Input
                    value={invoiceProvider}
                    onChange={(e) => setInvoiceProvider(e.target.value)}
                    placeholder="pl. Billingo"
                  />
                </div>
              </div>
              <div className="mt-4 flex justify-end">
                <Button size="sm" onClick={handleCreateInvoice} disabled={creatingInvoice}>
                  {creatingInvoice ? (
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
                <TableHead className="text-right">Műveletek</TableHead>
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
                    {formatDate(inv.billing_period_start)} – {formatDate(inv.billing_period_end)}
                  </TableCell>
                  <TableCell className="text-right font-medium tabular-nums">
                    {formatHUF(inv.amount)}
                  </TableCell>
                  <TableCell>{invoiceStatusBadge(inv.status)}</TableCell>
                  <TableCell className="text-muted-foreground text-xs">
                    {inv.paid_at ? formatDate(inv.paid_at) : "—"}
                  </TableCell>
                  <TableCell className="text-right">
                    {inv.status === "pending" && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 text-xs"
                        onClick={() => handleMarkPaid(inv.id)}
                        disabled={updatingInvoiceId === inv.id}
                      >
                        {updatingInvoiceId === inv.id ? (
                          <Loader2 className="size-3.5 animate-spin" />
                        ) : (
                          "Befizetettnek jelöl"
                        )}
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>
    </div>
  );
}
