/* ------------------------------------------------------------------ */
/*  Order detail page — shows full order information                   */
/* ------------------------------------------------------------------ */

import { notFound } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Package,
  MapPin,
  FileText,
  CreditCard,
  Truck,
} from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { requireAuth } from "@/lib/security/roles";
import { formatHUF } from "@/lib/utils/format";
import { formatDate, formatDateTime } from "@/lib/utils/format";
import { Breadcrumbs } from "@/components/shared/breadcrumbs";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import type { OrderRow, OrderItemRow, OrderStatus, AddressJson } from "@/lib/types/database";

// ── Status config ──────────────────────────────────────────────────

const STATUS_CONFIG: Record<
  OrderStatus,
  { label: string; variant: "default" | "secondary" | "outline" | "destructive" }
> = {
  draft: { label: "Piszkozat", variant: "outline" },
  awaiting_payment: { label: "Fizetesre var", variant: "secondary" },
  paid: { label: "Fizetve", variant: "default" },
  processing: { label: "Feldolgozas alatt", variant: "secondary" },
  shipped: { label: "Kiszallitva", variant: "default" },
  cancelled: { label: "Lemondva", variant: "destructive" },
  refunded: { label: "Visszateritve", variant: "destructive" },
};

const STATUS_TIMELINE: OrderStatus[] = [
  "awaiting_payment",
  "paid",
  "processing",
  "shipped",
];

// ── Page ───────────────────────────────────────────────────────────

interface OrderDetailPageProps {
  params: Promise<{ id: string }>;
}

export default async function OrderDetailPage({
  params,
}: OrderDetailPageProps) {
  const { id } = await params;
  const user = await requireAuth();
  const supabase = await createClient();

  // Fetch order
  const { data: order, error: orderError } = await supabase
    .from("orders")
    .select("*")
    .eq("id", id)
    .eq("user_id", user.id)
    .single();

  if (orderError || !order) {
    notFound();
  }

  // Fetch order items
  const { data: items } = await supabase
    .from("order_items")
    .select("*")
    .eq("order_id", order.id)
    .order("id", { ascending: true });

  const orderRow = order as OrderRow;
  const orderItems = (items ?? []) as OrderItemRow[];
  const statusConfig = STATUS_CONFIG[orderRow.status] ?? STATUS_CONFIG.draft;
  const shortId = orderRow.id.slice(0, 8).toUpperCase();

  return (
    <div className="mx-auto max-w-4xl px-6 py-12 lg:px-8">
      <Breadcrumbs
        items={[
          { label: "Fiok", href: "/account" },
          { label: "Rendeleseim", href: "/account/orders" },
          { label: `#${shortId}` },
        ]}
      />

      {/* ── Header ──────────────────────────────────────── */}
      <div className="mt-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-[-0.03em]">
            Rendeles #{shortId}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Letrehozva: {formatDateTime(orderRow.created_at)}
          </p>
        </div>
        <Badge variant={statusConfig.variant} className="w-fit">
          {statusConfig.label}
        </Badge>
      </div>

      {/* ── Status timeline ─────────────────────────────── */}
      {!["cancelled", "refunded", "draft"].includes(orderRow.status) && (
        <div className="mt-8 flex items-center gap-0">
          {STATUS_TIMELINE.map((step, idx) => {
            const stepIdx = STATUS_TIMELINE.indexOf(orderRow.status);
            const isCompleted = idx <= stepIdx;
            const isActive = idx === stepIdx;
            const stepLabel =
              STATUS_CONFIG[step]?.label ?? step;

            return (
              <div key={step} className="flex items-center">
                {idx > 0 && (
                  <div
                    className={`mx-1.5 h-px w-6 sm:mx-3 sm:w-12 transition-colors duration-500 ${
                      isCompleted ? "bg-foreground" : "bg-border"
                    }`}
                  />
                )}
                <div
                  className={`flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium transition-all duration-500 ${
                    isActive
                      ? "bg-foreground text-background"
                      : isCompleted
                        ? "bg-muted text-foreground"
                        : "text-muted-foreground"
                  }`}
                >
                  <span className="hidden sm:inline">{stepLabel}</span>
                  <span className="sm:hidden">{idx + 1}</span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <div className="mt-10 space-y-8">
        {/* ── Order items ───────────────────────────────── */}
        <section>
          <SectionHeader icon={<Package className="size-4" />} title="Tetelek" />
          <div className="mt-4 rounded-lg border border-border">
            <div className="divide-y divide-border">
              {orderItems.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between px-5 py-4"
                >
                  <div className="flex items-center gap-4">
                    <div className="flex size-10 items-center justify-center rounded bg-muted text-xs font-medium text-muted-foreground">
                      {item.quantity}x
                    </div>
                    <div>
                      <p className="text-sm font-medium">
                        {item.title_snapshot}
                      </p>
                      {item.variant_snapshot &&
                        typeof item.variant_snapshot === "object" &&
                        "option1Value" in item.variant_snapshot &&
                        item.variant_snapshot.option1Value && (
                          <p className="text-xs text-muted-foreground">
                            {String(item.variant_snapshot.option1Value)}
                            {item.variant_snapshot.option2Value
                              ? ` / ${String(item.variant_snapshot.option2Value)}`
                              : ""}
                          </p>
                        )}
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium tabular-nums">
                      {formatHUF(item.line_total)}
                    </p>
                    {item.quantity > 1 && (
                      <p className="text-xs text-muted-foreground tabular-nums">
                        {formatHUF(item.unit_price_snapshot)} / db
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* ── Totals ──────────────────────────────── */}
            <div className="border-t border-border bg-muted/30 px-5 py-4">
              <div className="space-y-2">
                <TotalLine
                  label="Reszosszeg"
                  value={formatHUF(orderRow.subtotal_amount)}
                />
                <TotalLine
                  label="Szallitas"
                  value={
                    orderRow.shipping_fee === 0
                      ? "Ingyenes"
                      : formatHUF(orderRow.shipping_fee)
                  }
                />
                {orderRow.discount_total > 0 && (
                  <TotalLine
                    label="Kedvezmeny"
                    value={`-${formatHUF(orderRow.discount_total)}`}
                    highlight
                  />
                )}
                <Separator className="my-2" />
                <div className="flex items-baseline justify-between">
                  <span className="text-sm font-medium">Vegosszeg</span>
                  <span className="text-lg font-semibold tabular-nums">
                    {formatHUF(orderRow.total_amount)}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ── Shipping info ─────────────────────────────── */}
        <section>
          <SectionHeader
            icon={<Truck className="size-4" />}
            title="Szallitasi adatok"
          />
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            {/* Shipping method */}
            <InfoCard title="Szallitasi mod">
              {orderRow.shipping_method === "pickup" ? (
                <>
                  <p className="font-medium">
                    Csomagautomata / Atveteli pont
                  </p>
                  {orderRow.pickup_point_provider && (
                    <p className="text-muted-foreground">
                      {orderRow.pickup_point_provider}
                    </p>
                  )}
                  {orderRow.pickup_point_label && (
                    <p>{orderRow.pickup_point_label}</p>
                  )}
                  {orderRow.pickup_point_id && (
                    <p className="text-xs text-muted-foreground">
                      Azonosito: {orderRow.pickup_point_id}
                    </p>
                  )}
                </>
              ) : (
                <>
                  <p className="font-medium">Hazhozsz&aacute;ll&iacute;t&aacute;s</p>
                  <AddressDisplay address={orderRow.shipping_address} />
                </>
              )}
              {orderRow.shipping_phone && (
                <p className="mt-1 text-muted-foreground">
                  Tel: {orderRow.shipping_phone}
                </p>
              )}
            </InfoCard>

            {/* Billing address */}
            <InfoCard title="Szamlazasi cim">
              <AddressDisplay address={orderRow.billing_address} />
            </InfoCard>
          </div>
        </section>

        {/* ── Payment info ──────────────────────────────── */}
        <section>
          <SectionHeader
            icon={<CreditCard className="size-4" />}
            title="Fizetes"
          />
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <InfoCard title="Fizetesi mod">
              <p className="font-medium">Barion</p>
              {orderRow.barion_status && (
                <p className="text-muted-foreground">
                  Statusz: {orderRow.barion_status}
                </p>
              )}
              {orderRow.paid_at && (
                <p className="text-muted-foreground">
                  Fizetve: {formatDateTime(orderRow.paid_at)}
                </p>
              )}
            </InfoCard>

            {orderRow.coupon_code && (
              <InfoCard title="Kupon">
                <p className="font-mono font-medium">{orderRow.coupon_code}</p>
                <p className="text-muted-foreground">
                  Kedvezmeny: {formatHUF(orderRow.discount_total)}
                </p>
              </InfoCard>
            )}
          </div>
        </section>

        {/* ── Notes ─────────────────────────────────────── */}
        {orderRow.notes && (
          <section>
            <SectionHeader
              icon={<FileText className="size-4" />}
              title="Megjegyzes"
            />
            <p className="mt-4 rounded-lg border border-border p-4 text-sm text-muted-foreground">
              {orderRow.notes}
            </p>
          </section>
        )}
      </div>

      {/* ── Back link ───────────────────────────────────── */}
      <div className="mt-10">
        <Link
          href="/account/orders"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors duration-300 hover:text-foreground"
        >
          <ArrowLeft className="size-3.5" />
          Vissza a rendelesekhez
        </Link>
      </div>
    </div>
  );
}

/* ================================================================== */
/*  Sub-components                                                     */
/* ================================================================== */

function SectionHeader({
  icon,
  title,
}: {
  icon: React.ReactNode;
  title: string;
}) {
  return (
    <h2 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-widest text-muted-foreground">
      {icon}
      {title}
    </h2>
  );
}

function InfoCard({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-lg border border-border p-4">
      <h4 className="mb-2 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
        {title}
      </h4>
      <div className="space-y-0.5 text-sm">{children}</div>
    </div>
  );
}

function AddressDisplay({ address }: { address: AddressJson }) {
  if (!address || !address.name) return null;

  return (
    <>
      <p>{address.name}</p>
      <p>{address.street}</p>
      <p>
        {address.zip} {address.city}
      </p>
      {address.country && <p>{address.country}</p>}
    </>
  );
}

function TotalLine({
  label,
  value,
  highlight = false,
}: {
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <div className="flex items-baseline justify-between text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span
        className={
          highlight
            ? "font-medium text-emerald-600 tabular-nums dark:text-emerald-400"
            : "font-medium tabular-nums"
        }
      >
        {value}
      </span>
    </div>
  );
}
