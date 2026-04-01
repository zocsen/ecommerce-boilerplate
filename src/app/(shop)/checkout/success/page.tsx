/* ------------------------------------------------------------------ */
/*  Checkout success page — server component                           */
/* ------------------------------------------------------------------ */

import Link from "next/link";
import { CheckCircle2, Package, ArrowRight } from "lucide-react";
import { getOrderForUser } from "@/lib/actions/orders";
import { getCurrentUser } from "@/lib/security/roles";
import { siteConfig } from "@/lib/config/site.config";
import { formatHUF } from "@/lib/utils/format";
import { formatDate } from "@/lib/utils/format";
import { Button } from "@/components/ui/button";
import { OrderStatusBadge } from "@/components/admin/order-status-badge";
import { Separator } from "@/components/ui/separator";
import type { OrderStatus } from "@/lib/types/database";

interface SuccessPageProps {
  searchParams: Promise<{ orderId?: string; method?: string }>;
}

export default async function CheckoutSuccessPage({ searchParams }: SuccessPageProps) {
  const params = await searchParams;
  const orderId = params.orderId;
  const isCod = params.method === "cod";
  const user = await getCurrentUser();

  // Attempt to fetch order details if user is logged in
  let orderData: {
    id: string;
    total_amount: number;
    status: string;
    created_at: string;
    email: string;
  } | null = null;

  if (orderId && user) {
    const result = await getOrderForUser(orderId);
    if (result.success && result.data) {
      orderData = result.data;
    }
  }

  return (
    <div className="mx-auto max-w-2xl px-6 py-20 lg:px-8">
      <div className="flex flex-col items-center text-center">
        {/* ── Success icon ──────────────────────────────── */}
        <div className="flex size-20 items-center justify-center rounded-full bg-emerald-50 dark:bg-emerald-950/30">
          <CheckCircle2 className="size-10 text-emerald-600 dark:text-emerald-400" />
        </div>

        <h1 className="mt-6 text-3xl font-semibold tracking-[-0.03em]">
          {isCod ? "Rendelés visszaigazolva!" : "Sikeres fizetés!"}
        </h1>
        <p className="mt-2 text-muted-foreground">
          {isCod
            ? "Köszönjük a rendelését. A fizetés a csomag átvételekor történik. Hamarosan e-mailben küldjük a visszaigazolást."
            : "Köszönjük a rendelését. Hamarosan e-mailben küldjük a visszaigazolást."}
        </p>
      </div>

      {/* ── Order details ───────────────────────────────── */}
      {orderData && (
        <div className="mt-10 rounded-xl border border-border p-6">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold uppercase tracking-widest text-muted-foreground">
              Rendelés részletei
            </h2>
            <OrderStatusBadge status={orderData.status as OrderStatus} />
          </div>

          <Separator className="my-4" />

          <dl className="space-y-3">
            <DetailRow label="Rendelés azonosító" value={orderData.id.slice(0, 8).toUpperCase()} />
            <DetailRow label="Dátum" value={formatDate(orderData.created_at)} />
            <DetailRow label="E-mail" value={orderData.email} />
            <DetailRow label="Végösszeg" value={formatHUF(orderData.total_amount)} bold />
          </dl>
        </div>
      )}

      {!orderData && orderId && (
        <div className="mt-10 rounded-xl border border-border p-6 text-center">
          <Package className="mx-auto size-8 text-muted-foreground" />
          <p className="mt-3 text-sm text-muted-foreground">
            Rendelés azonosító:{" "}
            <span className="font-mono font-medium text-foreground">
              {orderId.slice(0, 8).toUpperCase()}
            </span>
          </p>
        </div>
      )}

      {/* ── CTAs ────────────────────────────────────────── */}
      <div className="mt-8 flex flex-col items-center gap-3">
        {user && siteConfig.features.enableAccounts ? (
          <Button size="lg" render={<Link href="/profile/orders" />}>
            Rendeléseim
            <ArrowRight className="ml-1.5 size-4" />
          </Button>
        ) : (
          <>
            {orderId && (
              <Button
                size="lg"
                render={
                  <Link
                    href={`/order-tracking?order=${encodeURIComponent(orderId.slice(0, 8).toUpperCase())}`}
                  />
                }
              >
                Rendelés követése
                <ArrowRight className="ml-1.5 size-4" />
              </Button>
            )}
            <Button size="lg" variant="outline" render={<Link href="/products" />}>
              Vissza a boltba
              <ArrowRight className="ml-1.5 size-4" />
            </Button>
          </>
        )}

        <Link
          href="/"
          className="text-sm text-muted-foreground transition-colors duration-300 hover:text-foreground"
        >
          Vissza a főoldalra
        </Link>
      </div>
    </div>
  );
}

/* ── Helper ─────────────────────────────────────────────────────── */

function DetailRow({
  label,
  value,
  bold = false,
}: {
  label: string;
  value: string;
  bold?: boolean;
}) {
  return (
    <div className="flex items-baseline justify-between text-sm">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className={bold ? "text-base font-semibold tabular-nums" : "font-medium"}>{value}</dd>
    </div>
  );
}
