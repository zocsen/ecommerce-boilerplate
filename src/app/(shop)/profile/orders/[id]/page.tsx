import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { getUserOrder } from "@/lib/actions/profile";
import { formatHUF, formatDate, formatDateTime } from "@/lib/utils/format";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Breadcrumbs } from "@/components/shared/breadcrumbs";
import { notFound } from "next/navigation";
import type { OrderStatus, AddressJson } from "@/lib/types/database";

/* ------------------------------------------------------------------ */
/*  Profile order detail page                                          */
/* ------------------------------------------------------------------ */

const STATUS_LABELS: Record<OrderStatus, string> = {
  draft: "Piszkozat",
  awaiting_payment: "Fizetesre var",
  paid: "Fizetve",
  processing: "Feldolgozas alatt",
  shipped: "Kiszallitva",
  cancelled: "Lemondva",
  refunded: "Visszateritve",
};

const STATUS_VARIANTS: Record<OrderStatus, "default" | "secondary" | "outline" | "destructive"> = {
  draft: "outline",
  awaiting_payment: "secondary",
  paid: "default",
  processing: "secondary",
  shipped: "default",
  cancelled: "destructive",
  refunded: "destructive",
};

function AddressDisplay({ address, label }: { address: AddressJson; label: string }) {
  if (!address?.name && !address?.street) return null;
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <div className="mt-1 text-sm">
        <p className="font-medium">{address.name}</p>
        <p>{address.street}</p>
        <p>{address.zip} {address.city}</p>
        {address.country && address.country !== "HU" && <p>{address.country}</p>}
      </div>
    </div>
  );
}

export default async function ProfileOrderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const result = await getUserOrder(id);

  if (!result.success || !result.data) {
    notFound();
  }

  const { order, items } = result.data;

  return (
    <div className="space-y-8">
      <Breadcrumbs
        items={[
          { label: "Fiokom", href: "/profile" },
          { label: "Rendeleseim", href: "/profile/orders" },
          { label: `#${order.id.slice(0, 8).toUpperCase()}` },
        ]}
      />

      {/* -- Header -- */}
      <div className="flex items-start justify-between">
        <div>
          <Button variant="ghost" size="sm" render={<Link href="/profile/orders" />} className="mb-2">
            <ArrowLeft className="mr-2 size-4" />
            Vissza
          </Button>
          <h1 className="text-2xl font-semibold tracking-[-0.03em]">
            Rendeles #{order.id.slice(0, 8).toUpperCase()}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {formatDateTime(order.created_at)}
          </p>
        </div>
        <Badge variant={STATUS_VARIANTS[order.status] ?? "outline"} className="text-sm">
          {STATUS_LABELS[order.status] ?? order.status}
        </Badge>
      </div>

      <div className="grid gap-8 lg:grid-cols-[1fr_320px]">
        {/* -- Left: line items -- */}
        <div className="space-y-6">
          <div className="rounded-xl border border-border">
            <div className="border-b border-border px-5 py-3">
              <h2 className="text-sm font-semibold">Termekek</h2>
            </div>
            <div className="divide-y divide-border">
              {items.map((item) => {
                const vs = item.variant_snapshot as Record<string, string | undefined>;
                const variantLabel = [
                  vs.option1Value && `${vs.option1Name}: ${vs.option1Value}`,
                  vs.option2Value && `${vs.option2Name}: ${vs.option2Value}`,
                ]
                  .filter(Boolean)
                  .join(" / ");

                return (
                  <div key={item.id} className="flex items-center justify-between px-5 py-4">
                    <div>
                      <p className="text-sm font-medium">{item.title_snapshot}</p>
                      {variantLabel && (
                        <p className="mt-0.5 text-xs text-muted-foreground">{variantLabel}</p>
                      )}
                      {vs.sku && (
                        <p className="mt-0.5 font-mono text-xs text-muted-foreground">SKU: {vs.sku}</p>
                      )}
                    </div>
                    <div className="text-right">
                      <p className="text-sm tabular-nums">
                        {item.quantity} x {formatHUF(item.unit_price_snapshot)}
                      </p>
                      <p className="text-sm font-medium tabular-nums">
                        {formatHUF(item.line_total)}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Totals */}
            <div className="border-t border-border px-5 py-4 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Reszosszeg</span>
                <span className="tabular-nums">{formatHUF(order.subtotal_amount)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Szallitas</span>
                <span className="tabular-nums">{formatHUF(order.shipping_fee)}</span>
              </div>
              {order.discount_total > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">
                    Kedvezmeny{order.coupon_code ? ` (${order.coupon_code})` : ""}
                  </span>
                  <span className="tabular-nums text-green-600">-{formatHUF(order.discount_total)}</span>
                </div>
              )}
              <div className="flex justify-between border-t border-border pt-2 text-base font-semibold">
                <span>Osszesen</span>
                <span className="tabular-nums">{formatHUF(order.total_amount)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* -- Right: sidebar info -- */}
        <div className="space-y-4">
          {/* Shipping info */}
          <div className="rounded-xl border border-border p-5 space-y-3">
            <h3 className="text-sm font-semibold">Szallitas</h3>
            <p className="text-sm">
              {order.shipping_method === "home" ? "Hazhozszallitas" : "Csomagautomata"}
            </p>
            {order.shipping_method === "home" && order.shipping_address && (
              <AddressDisplay
                address={order.shipping_address as unknown as AddressJson}
                label="Szallitasi cim"
              />
            )}
            {order.shipping_method === "pickup" && order.pickup_point_label && (
              <div>
                <p className="text-xs text-muted-foreground">Atveteli pont</p>
                <p className="mt-1 text-sm">
                  {order.pickup_point_provider && (
                    <span className="font-medium">{order.pickup_point_provider}: </span>
                  )}
                  {order.pickup_point_label}
                </p>
              </div>
            )}
            {order.shipping_phone && (
              <div>
                <p className="text-xs text-muted-foreground">Telefon</p>
                <p className="mt-1 text-sm">{order.shipping_phone}</p>
              </div>
            )}
          </div>

          {/* Billing info */}
          {order.billing_address && (
            <div className="rounded-xl border border-border p-5">
              <AddressDisplay
                address={order.billing_address as unknown as AddressJson}
                label="Szamlazasi cim"
              />
            </div>
          )}

          {/* Payment info */}
          {order.barion_status && (
            <div className="rounded-xl border border-border p-5 space-y-2">
              <h3 className="text-sm font-semibold">Fizetes</h3>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Allapot</span>
                <span>{order.barion_status}</span>
              </div>
              {order.paid_at && (
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Fizetve</span>
                  <span>{formatDateTime(order.paid_at)}</span>
                </div>
              )}
            </div>
          )}

          {/* Invoice */}
          {order.invoice_number && (
            <div className="rounded-xl border border-border p-5 space-y-2">
              <h3 className="text-sm font-semibold">Szamla</h3>
              <p className="text-sm">{order.invoice_number}</p>
              {order.invoice_url && (
                <a
                  href={order.invoice_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm underline underline-offset-2 transition-colors hover:text-foreground/70"
                >
                  Szamla megnyitasa
                </a>
              )}
            </div>
          )}

          {/* Notes */}
          {order.notes && (
            <div className="rounded-xl border border-border p-5">
              <h3 className="text-sm font-semibold">Megjegyzes</h3>
              <p className="mt-1 text-sm text-muted-foreground">{order.notes}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
