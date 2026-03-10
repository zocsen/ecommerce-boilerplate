import Link from "next/link";
import { Package, ChevronRight, ArrowRight } from "lucide-react";
import { getCurrentProfile } from "@/lib/security/roles";
import { listUserOrders } from "@/lib/actions/profile";
import { formatHUF, formatDate } from "@/lib/utils/format";
import { Badge } from "@/components/ui/badge";
import { redirect } from "next/navigation";
import type { OrderStatus } from "@/lib/types/database";

/* ------------------------------------------------------------------ */
/*  Profile dashboard — welcome + recent orders                        */
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

export default async function ProfilePage() {
  const profile = await getCurrentProfile();
  if (!profile) redirect("/login");

  const ordersResult = await listUserOrders({ page: 1, perPage: 5 });
  const recentOrders = ordersResult.success ? ordersResult.data?.orders ?? [] : [];
  const totalOrders = ordersResult.success ? ordersResult.data?.total ?? 0 : 0;

  return (
    <div className="space-y-10">
      {/* -- Welcome -- */}
      <div>
        <h1 className="text-3xl font-semibold tracking-[-0.03em]">
          Udvozollek, {profile.full_name || "Felhasznalo"}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Itt kezelheted a rendeleseidet, cimeidet es fiokbeallitasaidat.
        </p>
      </div>

      {/* -- Quick stats -- */}
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-border p-5">
          <p className="text-xs text-muted-foreground">Osszes rendeles</p>
          <p className="mt-1 text-2xl font-semibold tabular-nums">{totalOrders}</p>
        </div>
        <div className="rounded-xl border border-border p-5">
          <p className="text-xs text-muted-foreground">Tag ota</p>
          <p className="mt-1 text-2xl font-semibold">{formatDate(profile.created_at)}</p>
        </div>
        <div className="rounded-xl border border-border p-5">
          <p className="text-xs text-muted-foreground">Telefon</p>
          <p className="mt-1 text-2xl font-semibold">
            {profile.phone || <span className="text-base text-muted-foreground">Nincs megadva</span>}
          </p>
        </div>
      </div>

      {/* -- Recent orders -- */}
      <div>
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Legutobbi rendelesek</h2>
          {totalOrders > 0 && (
            <Link
              href="/profile/orders"
              className="flex items-center gap-1 text-sm text-muted-foreground transition-colors hover:text-foreground"
            >
              Osszes megtekintese
              <ArrowRight className="size-3.5" />
            </Link>
          )}
        </div>

        {recentOrders.length === 0 ? (
          <div className="mt-8 flex flex-col items-center text-center">
            <div className="flex size-14 items-center justify-center rounded-full bg-muted">
              <Package className="size-6 text-muted-foreground" />
            </div>
            <p className="mt-3 text-sm text-muted-foreground">
              Meg nincsenek rendeleseid.
            </p>
            <Link
              href="/products"
              className="mt-4 text-sm font-medium underline underline-offset-2 transition-colors hover:text-foreground/70"
            >
              Termekek bongeszese
            </Link>
          </div>
        ) : (
          <div className="mt-4 space-y-2">
            {recentOrders.map((order) => (
              <Link
                key={order.id}
                href={`/profile/orders/${order.id}`}
                className="group flex items-center justify-between rounded-xl border border-border p-4 transition-all duration-500 ease-out hover:border-foreground/20 hover:bg-muted/30"
              >
                <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:gap-6">
                  <div>
                    <p className="font-mono text-sm font-medium">
                      #{order.id.slice(0, 8).toUpperCase()}
                    </p>
                  </div>
                  <p className="text-sm text-muted-foreground">{formatDate(order.created_at)}</p>
                  <p className="text-sm font-medium tabular-nums">{formatHUF(order.total_amount)}</p>
                  <Badge variant={STATUS_VARIANTS[order.status] ?? "outline"}>
                    {STATUS_LABELS[order.status] ?? order.status}
                  </Badge>
                </div>
                <ChevronRight className="size-4 text-muted-foreground transition-transform duration-300 group-hover:translate-x-0.5" />
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
