/* ------------------------------------------------------------------ */
/*  My Orders page — lists user's orders                               */
/* ------------------------------------------------------------------ */

import Link from "next/link";
import { Package, ChevronRight } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { requireAuth } from "@/lib/security/roles";
import { formatHUF } from "@/lib/utils/format";
import { formatDate } from "@/lib/utils/format";
import { Breadcrumbs } from "@/components/shared/breadcrumbs";
import { Badge } from "@/components/ui/badge";
import type { OrderRow, OrderStatus } from "@/lib/types/database";

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

export default async function OrdersPage() {
  const user = await requireAuth();
  const supabase = await createClient();

  const { data: orders, error } = await supabase
    .from("orders")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("[OrdersPage] Error fetching orders:", error.message);
  }

  const orderList = (orders ?? []) as OrderRow[];

  return (
    <div className="mx-auto max-w-4xl px-6 py-12 lg:px-8">
      <Breadcrumbs
        items={[
          { label: "Fiok", href: "/account" },
          { label: "Rendeleseim" },
        ]}
      />

      <h1 className="mt-8 text-3xl font-semibold tracking-[-0.03em]">
        Rendeleseim
      </h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Korabbi rendeleseid es allapotuk.
      </p>

      {/* ── Empty state ──────────────────────────────── */}
      {orderList.length === 0 && (
        <div className="mt-16 flex flex-col items-center text-center">
          <div className="flex size-16 items-center justify-center rounded-full bg-muted">
            <Package className="size-7 text-muted-foreground" />
          </div>
          <h2 className="mt-4 text-lg font-medium">
            Meg nincsenek rendeleseid
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Amint leadod az elso rendelest, itt fog megjelenni.
          </p>
          <Link
            href="/products"
            className="mt-6 text-sm font-medium text-foreground underline underline-offset-2 transition-colors hover:text-foreground/70"
          >
            Termekek bongeszese
          </Link>
        </div>
      )}

      {/* ── Orders list ──────────────────────────────── */}
      {orderList.length > 0 && (
        <div className="mt-8 space-y-3">
          {orderList.map((order) => {
            const statusConfig =
              STATUS_CONFIG[order.status] ?? STATUS_CONFIG.draft;

            return (
              <Link
                key={order.id}
                href={`/account/orders/${order.id}`}
                className="group flex items-center justify-between rounded-xl border border-border p-5 transition-all duration-500 ease-out hover:border-foreground/20 hover:bg-muted/30"
              >
                <div className="flex flex-col gap-1.5 sm:flex-row sm:items-center sm:gap-6">
                  {/* Order ID */}
                  <div>
                    <p className="text-xs text-muted-foreground">Rendeles</p>
                    <p className="font-mono text-sm font-medium">
                      #{order.id.slice(0, 8).toUpperCase()}
                    </p>
                  </div>

                  {/* Date */}
                  <div>
                    <p className="text-xs text-muted-foreground">Datum</p>
                    <p className="text-sm">{formatDate(order.created_at)}</p>
                  </div>

                  {/* Total */}
                  <div>
                    <p className="text-xs text-muted-foreground">Osszeg</p>
                    <p className="text-sm font-medium tabular-nums">
                      {formatHUF(order.total_amount)}
                    </p>
                  </div>

                  {/* Status */}
                  <Badge variant={statusConfig.variant}>
                    {statusConfig.label}
                  </Badge>
                </div>

                <ChevronRight className="size-4 text-muted-foreground transition-transform duration-300 group-hover:translate-x-0.5" />
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
