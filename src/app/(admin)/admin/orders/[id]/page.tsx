"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Truck, FileText, Send } from "lucide-react";
import { adminGetOrder, adminUpdateOrderStatus } from "@/lib/actions/orders";
import { sendReceipt, sendShippingUpdate } from "@/lib/integrations/email/actions";
import { formatHUF, formatDate, formatDateTime } from "@/lib/utils/format";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import type { OrderRow, OrderItemRow, OrderStatus, AddressJson } from "@/lib/types/database";

/* ------------------------------------------------------------------ */
/*  Admin Order Detail                                                  */
/* ------------------------------------------------------------------ */

const STATUS_LABELS: Record<string, string> = {
  draft: "Piszkozat",
  awaiting_payment: "Fizetésre vár",
  paid: "Fizetve",
  processing: "Feldolgozás",
  shipped: "Kiszállítva",
  cancelled: "Törölve",
  refunded: "Visszatérítve",
};

const STATUS_TRANSITIONS: Record<string, OrderStatus[]> = {
  awaiting_payment: ["paid", "cancelled"],
  paid: ["processing", "cancelled", "refunded"],
  processing: ["shipped", "cancelled"],
  shipped: [],
  cancelled: [],
  refunded: [],
};

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
    draft: "outline",
    awaiting_payment: "secondary",
    paid: "default",
    processing: "default",
    shipped: "secondary",
    cancelled: "destructive",
    refunded: "destructive",
  };
  return (
    <Badge variant={map[status] ?? "outline"}>
      {STATUS_LABELS[status] ?? status}
    </Badge>
  );
}

function AddressDisplay({ address, label }: { address: AddressJson; label: string }) {
  if (!address.name && !address.street) return null;
  return (
    <div className="space-y-1">
      <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
        {label}
      </p>
      <div className="text-sm">
        <p className="font-medium">{address.name}</p>
        <p>{address.street}</p>
        <p>
          {address.zip} {address.city}
        </p>
        <p>{address.country}</p>
      </div>
    </div>
  );
}

interface OrderWithItems extends OrderRow {
  order_items: OrderItemRow[];
}

export default function AdminOrderDetailPage() {
  const params = useParams();
  const router = useRouter();
  const orderId = params.id as string;

  const [order, setOrder] = useState<OrderWithItems | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [trackingCode, setTrackingCode] = useState("");

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
  }, [fetchOrder]);

  async function handleStatusChange(newStatus: OrderStatus) {
    if (!order) return;
    setActionLoading(true);
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
      <div className="flex h-60 items-center justify-center text-sm text-muted-foreground">
        Betöltés...
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="space-y-4">
        <Button variant="ghost" size="sm" onClick={() => router.push("/admin/orders")}>
          <ArrowLeft className="mr-2 size-4" />
          Vissza
        </Button>
        <p className="text-sm text-destructive">{error}</p>
      </div>
    );
  }

  const possibleTransitions = STATUS_TRANSITIONS[order.status] ?? [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="sm"
            render={<Link href="/admin/orders" />}
          >
            <ArrowLeft className="mr-2 size-4" />
            Vissza
          </Button>
          <div>
            <h1 className="text-xl font-semibold tracking-tight">
              Rendelés #{order.id.slice(0, 8).toUpperCase()}
            </h1>
            <p className="mt-0.5 text-xs text-muted-foreground">
              {formatDateTime(order.created_at)}
            </p>
          </div>
          <StatusBadge status={order.status} />
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={actionLoading}
            onClick={handleSendReceipt}
          >
            <Send className="mr-2 size-3.5" />
            Visszaigazolás küldése
          </Button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Main content */}
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
                    variant.option2Value
                      ? `${variant.option2Name}: ${variant.option2Value}`
                      : null,
                  ]
                    .filter(Boolean)
                    .join(" / ");

                  return (
                    <div
                      key={item.id}
                      className="flex items-center justify-between rounded-lg border border-border p-3"
                    >
                      <div>
                        <p className="text-sm font-medium">
                          {item.title_snapshot}
                        </p>
                        {variantLabel && (
                          <p className="text-xs text-muted-foreground">
                            {variantLabel}
                          </p>
                        )}
                        {variant.sku && (
                          <p className="text-xs text-muted-foreground">
                            SKU: {variant.sku}
                          </p>
                        )}
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-medium tabular-nums">
                          {formatHUF(item.line_total)}
                        </p>
                        <p className="text-xs text-muted-foreground">
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
                  <span className="tabular-nums">
                    {formatHUF(order.subtotal_amount)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Szállítás</span>
                  <span className="tabular-nums">
                    {order.shipping_fee === 0
                      ? "Ingyenes"
                      : formatHUF(order.shipping_fee)}
                  </span>
                </div>
                {order.discount_total > 0 && (
                  <div className="flex justify-between text-green-600">
                    <span>
                      Kedvezmény
                      {order.coupon_code ? ` (${order.coupon_code})` : ""}
                    </span>
                    <span className="tabular-nums">
                      -{formatHUF(order.discount_total)}
                    </span>
                  </div>
                )}
                <Separator />
                <div className="flex justify-between font-semibold">
                  <span>Összesen</span>
                  <span className="tabular-nums">
                    {formatHUF(order.total_amount)}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Status actions */}
          {possibleTransitions.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Státusz módosítása</CardTitle>
                <CardDescription>
                  Jelenlegi státusz: {STATUS_LABELS[order.status]}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {possibleTransitions.includes("shipped") && (
                  <div className="mb-4">
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
                <div className="flex flex-wrap gap-2">
                  {possibleTransitions.map((nextStatus) => (
                    <Button
                      key={nextStatus}
                      variant={
                        nextStatus === "cancelled" || nextStatus === "refunded"
                          ? "outline"
                          : "default"
                      }
                      size="sm"
                      disabled={actionLoading}
                      onClick={() => handleStatusChange(nextStatus)}
                    >
                      {nextStatus === "shipped" && (
                        <Truck className="mr-2 size-3.5" />
                      )}
                      {nextStatus === "cancelled" || nextStatus === "refunded"
                        ? STATUS_LABELS[nextStatus]
                        : `Jelölés: ${STATUS_LABELS[nextStatus]}`}
                    </Button>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Sidebar */}
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
                <p className="text-xs text-muted-foreground">
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
                {order.shipping_method === "home"
                  ? "Házhozszállítás"
                  : "Csomagautomata"}
              </Badge>

              {order.shipping_method === "home" && (
                <AddressDisplay
                  address={order.shipping_address}
                  label="Szállítási cím"
                />
              )}

              {order.shipping_method === "pickup" && (
                <div className="space-y-1 text-sm">
                  <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    Átvételi pont
                  </p>
                  <p className="font-medium">
                    {order.pickup_point_provider?.toUpperCase()}
                  </p>
                  <p>{order.pickup_point_label}</p>
                  <p className="text-xs text-muted-foreground">
                    ID: {order.pickup_point_id}
                  </p>
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
              <AddressDisplay
                address={order.billing_address}
                label="Számlázási cím"
              />

              {order.invoice_number && (
                <div className="space-y-1 text-sm">
                  <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
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
          {order.barion_payment_id && (
            <Card>
              <CardHeader>
                <CardTitle>Fizetés</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <div>
                  <p className="text-xs text-muted-foreground">Barion ID</p>
                  <p className="font-mono text-xs">{order.barion_payment_id}</p>
                </div>
                {order.barion_status && (
                  <div>
                    <p className="text-xs text-muted-foreground">Státusz</p>
                    <p className="font-medium">{order.barion_status}</p>
                  </div>
                )}
                {order.paid_at && (
                  <div>
                    <p className="text-xs text-muted-foreground">Fizetve</p>
                    <p>{formatDateTime(order.paid_at)}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Notes */}
          {order.notes && (
            <Card>
              <CardHeader>
                <CardTitle>Megjegyzés</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">{order.notes}</p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
