"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams } from "next/navigation";
import {
  FileText,
  Send,
  Banknote,
  Wallet,
  CheckCircle2,
  XCircle,
  RotateCcw,
  AlertTriangle,
} from "lucide-react";
import { adminGetOrder, adminUpdateOrderStatus } from "@/lib/actions/orders";
import { sendReceipt, sendShippingUpdate } from "@/lib/integrations/email/actions";
import { formatHUF, formatDate, formatDateTime } from "@/lib/utils/format";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { OrderStatusBadge } from "@/components/admin/order-status-badge";
import { OrderNotes } from "@/components/admin/order-notes";
import {
  StatusStepper,
  StatusTransitionButton,
  AddressDisplay,
} from "@/components/admin/order-detail-components";
import { createClient as createBrowserClient } from "@/lib/supabase/client";
import {
  ORDER_STATUS_LABELS,
  getStatusTransitions,
  isTerminalStatusForPayment,
} from "@/lib/constants/order-status";
import type { OrderRow, OrderItemRow, OrderStatus, PaymentMethod } from "@/lib/types/database";

/* ------------------------------------------------------------------ */
/*  Admin Order Detail                                                  */
/* ------------------------------------------------------------------ */

// ── Main page component ────────────────────────────────────────────

interface OrderWithItems extends OrderRow {
  order_items: OrderItemRow[];
}

export default function AdminOrderDetailPage() {
  const params = useParams();
  const orderId = params.id as string;

  const [order, setOrder] = useState<OrderWithItems | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [trackingCode, setTrackingCode] = useState("");
  const [currentUserId, setCurrentUserId] = useState<string>("");
  const [isAgencyViewer, setIsAgencyViewer] = useState(false);

  const fetchOrder = useCallback(async () => {
    const result = await adminGetOrder(orderId);
    if (result.success && result.data) {
      setOrder(result.data as OrderWithItems);
    } else {
      setError(result.error ?? "Nem sikerült betölteni a rendelést.");
    }
    setLoading(false);
  }, [orderId]);

  useEffect(() => {
    fetchOrder();

    // Fetch current user for notes ownership
    const supabase = createBrowserClient();
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) {
        setCurrentUserId(data.user.id);
      }
    });
    supabase
      .from("profiles")
      .select("role")
      .single()
      .then(({ data }) => {
        if (data?.role === "agency_viewer") {
          setIsAgencyViewer(true);
        }
      });
  }, [fetchOrder]);

  async function handleStatusChange(newStatus: OrderStatus) {
    if (!order) return;
    setActionLoading(true);
    setActionError(null);

    const result = await adminUpdateOrderStatus(
      order.id,
      newStatus,
      newStatus === "shipped" ? trackingCode || undefined : undefined,
    );

    if (result.success) {
      // Send email notifications
      if (newStatus === "paid") {
        await sendReceipt(order.id);
      }
      if (newStatus === "shipped") {
        await sendShippingUpdate(order.id, trackingCode || undefined);
      }
      await fetchOrder();
      setTrackingCode("");
    } else {
      setActionError(result.error ?? "Nem sikerült a státusz módosítása.");
    }

    setActionLoading(false);
  }

  async function handleSendReceipt() {
    if (!order) return;
    setActionLoading(true);
    await sendReceipt(order.id);
    setActionLoading(false);
  }

  if (loading) {
    return (
      <div className="text-muted-foreground flex h-60 items-center justify-center text-sm">
        Betöltés...
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="space-y-4">
        <p className="text-destructive text-sm">{error}</p>
      </div>
    );
  }

  const paymentMethod: PaymentMethod = order.payment_method ?? "barion";
  const transitions = getStatusTransitions(paymentMethod);
  const possibleTransitions = transitions[order.status] ?? [];
  const isTerminal = isTerminalStatusForPayment(order.status, paymentMethod);

  return (
    <div className="space-y-6">
      {/* ── Header ──────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-semibold tracking-tight">
              Rendelés #{order.id.slice(0, 8).toUpperCase()}
            </h1>
            <OrderStatusBadge status={order.status} />
            {paymentMethod === "cod" && (
              <Badge variant="outline" className="text-xs">
                <Banknote className="mr-1 size-3" />
                Utánvét
              </Badge>
            )}
          </div>
          <p className="text-muted-foreground mt-1 text-xs">{formatDateTime(order.created_at)}</p>
        </div>

        <Button variant="outline" size="sm" disabled={actionLoading} onClick={handleSendReceipt}>
          <Send className="mr-2 size-3.5" />
          Visszaigazolás küldése
        </Button>
      </div>

      {/* ── Status stepper ──────────────────────────────────────── */}
      <div className="border-border bg-card overflow-x-auto rounded-lg border px-4 py-3">
        <StatusStepper currentStatus={order.status} paymentMethod={paymentMethod} />
      </div>

      {/* ── Status actions (PROMINENT — top of page) ────────────── */}
      {possibleTransitions.length > 0 && !isAgencyViewer && (
        <Card className="border-primary/20 bg-primary/[0.02]">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Következő lépés</CardTitle>
            <CardDescription>
              Jelenlegi státusz: {ORDER_STATUS_LABELS[order.status]}
              {paymentMethod === "cod" ? " (utánvétes rendelés)" : ""}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Tracking code input — only when "shipped" is an option */}
            {possibleTransitions.includes("shipped" as OrderStatus) && (
              <div className="max-w-sm">
                <Label htmlFor="tracking" className="text-xs">
                  Csomagkövetési szám (opcionális)
                </Label>
                <Input
                  id="tracking"
                  placeholder="pl. GLS1234567890"
                  className="mt-1 h-8"
                  value={trackingCode}
                  onChange={(e) => setTrackingCode(e.target.value)}
                />
              </div>
            )}

            {/* Action buttons with confirmation dialogs */}
            <div className="flex flex-wrap gap-2">
              {possibleTransitions.map((nextStatus) => (
                <StatusTransitionButton
                  key={nextStatus}
                  targetStatus={nextStatus}
                  currentStatus={order.status}
                  paymentMethod={paymentMethod}
                  disabled={actionLoading}
                  trackingCode={trackingCode}
                  onConfirm={handleStatusChange}
                />
              ))}
            </div>

            {/* Error message */}
            {actionError && (
              <div className="border-destructive/30 bg-destructive/5 text-destructive flex items-center gap-2 rounded-md border px-3 py-2 text-sm">
                <AlertTriangle className="size-4 shrink-0" />
                {actionError}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Terminal state notice */}
      {isTerminal && (
        <div className="border-muted bg-muted/50 text-muted-foreground flex items-center gap-2 rounded-lg border px-4 py-3 text-sm">
          {order.status === "cancelled" ? (
            <XCircle className="size-4 shrink-0" />
          ) : order.status === "refunded" ? (
            <RotateCcw className="size-4 shrink-0" />
          ) : (
            <CheckCircle2 className="size-4 shrink-0" />
          )}
          Ez a rendelés végállapotban van ({ORDER_STATUS_LABELS[order.status]}). Nincs további
          teendő.
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        {/* ── Main content ──────────────────────────────────────── */}
        <div className="space-y-6 lg:col-span-2">
          {/* Line items */}
          <Card>
            <CardHeader>
              <CardTitle>Tételek</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {order.order_items.map((item) => {
                  const variant = item.variant_snapshot as Record<string, string | undefined>;
                  const variantLabel = [
                    variant.option1Value
                      ? `${variant.option1Name ?? "Méret"}: ${variant.option1Value}`
                      : null,
                    variant.option2Value ? `${variant.option2Name}: ${variant.option2Value}` : null,
                  ]
                    .filter(Boolean)
                    .join(" / ");

                  return (
                    <div
                      key={item.id}
                      className="border-border flex items-center justify-between rounded-lg border p-3"
                    >
                      <div>
                        <p className="text-sm font-medium">{item.title_snapshot}</p>
                        {variantLabel && (
                          <p className="text-muted-foreground text-xs">{variantLabel}</p>
                        )}
                        {variant.sku && (
                          <p className="text-muted-foreground text-xs">SKU: {variant.sku}</p>
                        )}
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-medium tabular-nums">
                          {formatHUF(item.line_total)}
                        </p>
                        <p className="text-muted-foreground text-xs">
                          {item.quantity} x {formatHUF(item.unit_price_snapshot)}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>

              <Separator className="my-4" />

              {/* Totals */}
              <div className="space-y-1.5 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Részösszeg</span>
                  <span className="tabular-nums">{formatHUF(order.subtotal_amount)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Szállítás</span>
                  <span className="tabular-nums">
                    {order.shipping_fee === 0 ? "Ingyenes" : formatHUF(order.shipping_fee)}
                  </span>
                </div>
                {order.discount_total > 0 && (
                  <div className="flex justify-between text-green-600">
                    <span>
                      Kedvezmény
                      {order.coupon_code ? ` (${order.coupon_code})` : ""}
                    </span>
                    <span className="tabular-nums">-{formatHUF(order.discount_total)}</span>
                  </div>
                )}
                {order.cod_fee > 0 && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Utánvét kezelési díj</span>
                    <span className="tabular-nums">{formatHUF(order.cod_fee)}</span>
                  </div>
                )}
                <Separator />
                <div className="flex justify-between font-semibold">
                  <span>Összesen</span>
                  <span className="tabular-nums">{formatHUF(order.total_amount)}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Internal notes (FE-018) */}
          <OrderNotes orderId={orderId} currentUserId={currentUserId} isReadOnly={isAgencyViewer} />
        </div>

        {/* ── Sidebar ───────────────────────────────────────────── */}
        <div className="space-y-6">
          {/* Customer */}
          <Card>
            <CardHeader>
              <CardTitle>Vevő</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div>
                <p className="font-medium">{order.email}</p>
                {order.shipping_phone && (
                  <p className="text-muted-foreground">{order.shipping_phone}</p>
                )}
              </div>
              {order.user_id && (
                <p className="text-muted-foreground text-xs">
                  Felhasználó: {order.user_id.slice(0, 8)}...
                </p>
              )}
              {!order.user_id && (
                <Badge variant="outline" className="text-[10px]">
                  Vendég
                </Badge>
              )}
            </CardContent>
          </Card>

          {/* Shipping */}
          <Card>
            <CardHeader>
              <CardTitle>Szállítás</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Badge variant="secondary" className="text-xs">
                {order.shipping_method === "home" ? "Házhozszállítás" : "Csomagautomata"}
              </Badge>

              {order.shipping_method === "home" && (
                <AddressDisplay address={order.shipping_address} label="Szállítási cím" />
              )}

              {order.shipping_method === "pickup" && (
                <div className="space-y-1 text-sm">
                  <p className="text-muted-foreground text-xs font-medium tracking-wider uppercase">
                    Átvételi pont
                  </p>
                  <p className="font-medium">{order.pickup_point_provider?.toUpperCase()}</p>
                  <p>{order.pickup_point_label}</p>
                  <p className="text-muted-foreground text-xs">ID: {order.pickup_point_id}</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Billing */}
          <Card>
            <CardHeader>
              <CardTitle>Számlázás</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <AddressDisplay address={order.billing_address} label="Számlázási cím" />

              {order.invoice_number && (
                <div className="space-y-1 text-sm">
                  <p className="text-muted-foreground text-xs font-medium tracking-wider uppercase">
                    Számla
                  </p>
                  <p className="font-medium">{order.invoice_number}</p>
                  {order.invoice_url && (
                    <a
                      href={order.invoice_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-xs underline underline-offset-4"
                    >
                      <FileText className="size-3" />
                      Megnyitás
                    </a>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Payment */}
          <Card>
            <CardHeader>
              <CardTitle>Fizetés</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div>
                <p className="text-muted-foreground text-xs">Fizetési mód</p>
                <div className="mt-0.5 flex items-center gap-1.5">
                  {paymentMethod === "cod" ? (
                    <>
                      <Banknote className="text-muted-foreground size-3.5" />
                      <span className="font-medium">Utánvét</span>
                    </>
                  ) : (
                    <>
                      <Wallet className="text-muted-foreground size-3.5" />
                      <span className="font-medium">Online bankkártya (Barion)</span>
                    </>
                  )}
                </div>
              </div>
              {order.cod_fee > 0 && (
                <div>
                  <p className="text-muted-foreground text-xs">Utánvét kezelési díj</p>
                  <p className="font-medium">{formatHUF(order.cod_fee)}</p>
                </div>
              )}
              {order.barion_payment_id && (
                <div>
                  <p className="text-muted-foreground text-xs">Barion ID</p>
                  <p className="font-mono text-xs">{order.barion_payment_id}</p>
                </div>
              )}
              {order.barion_status && (
                <div>
                  <p className="text-muted-foreground text-xs">Barion státusz</p>
                  <p className="font-medium">{order.barion_status}</p>
                </div>
              )}
              {order.paid_at && (
                <div>
                  <p className="text-muted-foreground text-xs">Fizetve</p>
                  <p>{formatDateTime(order.paid_at)}</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Notes */}
          {order.notes && (
            <Card>
              <CardHeader>
                <CardTitle>Megjegyzés</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground text-sm">{order.notes}</p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
