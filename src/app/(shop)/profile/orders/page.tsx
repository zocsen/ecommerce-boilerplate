import Link from "next/link";
import { Package, ChevronRight, ChevronLeft } from "lucide-react";
import { listUserOrders } from "@/lib/actions/profile";
import { formatHUF, formatDate } from "@/lib/utils/format";
import { OrderStatusBadge } from "@/components/admin/order-status-badge";
import { Button } from "@/components/ui/button";
import { Breadcrumbs } from "@/components/shared/breadcrumbs";
import type { OrderStatus } from "@/lib/types/database";

/* ------------------------------------------------------------------ */
/*  Profile orders list page                                           */
/* ------------------------------------------------------------------ */

export default async function ProfileOrdersPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const params = await searchParams;
  const page = Math.max(1, Number(params.page ?? "1"));

  const result = await listUserOrders({ page, perPage: 20 });
  const orders = result.success ? (result.data?.orders ?? []) : [];
  const totalPages = result.success ? (result.data?.totalPages ?? 0) : 0;
  const total = result.success ? (result.data?.total ?? 0) : 0;

  return (
    <div className="space-y-8">
      <Breadcrumbs items={[{ label: "Fiókom", href: "/profile" }, { label: "Rendeléseim" }]} />

      <div>
        <h1 className="text-3xl font-semibold tracking-[-0.03em]">Rendeléseim</h1>
        <p className="text-muted-foreground mt-1 text-sm">{total} rendelés összesen</p>
      </div>

      {orders.length === 0 ? (
        <div className="mt-16 flex flex-col items-center text-center">
          <div className="bg-muted flex size-16 items-center justify-center rounded-full">
            <Package className="text-muted-foreground size-7" />
          </div>
          <h2 className="mt-4 text-lg font-medium">Még nincsenek rendeléseid</h2>
          <p className="text-muted-foreground mt-1 text-sm">
            Amint leadod az első rendelést, itt fog megjelenni.
          </p>
          <Link
            href="/products"
            className="hover:text-foreground/70 mt-6 text-sm font-medium underline underline-offset-2 transition-colors"
          >
            Termékek böngészése
          </Link>
        </div>
      ) : (
        <>
          <div className="space-y-2">
            {orders.map((order) => (
              <Link
                key={order.id}
                href={`/profile/orders/${order.id}`}
                className="group border-border hover:border-foreground/20 hover:bg-muted/30 flex items-center justify-between rounded-xl border p-5 transition-all duration-500 ease-out"
              >
                <div className="flex flex-col gap-1.5 sm:flex-row sm:items-center sm:gap-6">
                  <div>
                    <p className="text-muted-foreground text-xs">Rendelés</p>
                    <p className="font-mono text-sm font-medium">
                      #{order.id.slice(0, 8).toUpperCase()}
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground text-xs">Dátum</p>
                    <p className="text-sm">{formatDate(order.created_at)}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground text-xs">Összeg</p>
                    <p className="text-sm font-medium tabular-nums">
                      {formatHUF(order.total_amount)}
                    </p>
                  </div>
                  <OrderStatusBadge status={order.status as OrderStatus} />
                </div>
                <ChevronRight className="text-muted-foreground size-4 transition-transform duration-300 group-hover:translate-x-0.5" />
              </Link>
            ))}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground text-xs">
                {page}. / {totalPages}. oldal
              </span>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page <= 1}
                  render={page > 1 ? <Link href={`/profile/orders?page=${page - 1}`} /> : undefined}
                >
                  <ChevronLeft className="size-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page >= totalPages}
                  render={
                    page < totalPages ? (
                      <Link href={`/profile/orders?page=${page + 1}`} />
                    ) : undefined
                  }
                >
                  <ChevronRight className="size-4" />
                </Button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
