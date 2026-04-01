import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdminOrViewer } from "@/lib/security/roles";
import { formatHUF, formatDate } from "@/lib/utils/format";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { OrderStatusBadge } from "@/components/admin/order-status-badge";
import Link from "next/link";
import { DashboardCharts, type DailyDataPoint } from "@/components/admin/dashboard-charts";
import type { OrderStatus } from "@/lib/types/database";

/* ------------------------------------------------------------------ */
/*  Admin Dashboard — "God view" KPIs                                  */
/* ------------------------------------------------------------------ */

interface KpiData {
  revenue30d: number;
  orders30d: number;
  aov: number;
  lowStockVariants: number;
  recentPaidOrders: Array<{
    id: string;
    email: string;
    total_amount: number;
    created_at: string;
    status: string;
  }>;
  dailyData: DailyDataPoint[];
}

async function getDashboardData(): Promise<KpiData> {
  const admin = createAdminClient();
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

  const [ordersResult, lowStockResult, recentResult] = await Promise.all([
    // Orders in last 30 days that are paid or beyond
    admin
      .from("orders")
      .select("total_amount, status, created_at")
      .gte("created_at", thirtyDaysAgo)
      .in("status", ["paid", "processing", "shipped"]),

    // Variants with low stock (< 5 and active)
    admin
      .from("product_variants")
      .select("id", { count: "exact" })
      .eq("is_active", true)
      .lt("stock_quantity", 5),

    // Recent paid orders
    admin
      .from("orders")
      .select("id, email, total_amount, created_at, status")
      .in("status", ["paid", "processing", "shipped"])
      .order("created_at", { ascending: false })
      .limit(5),
  ]);

  const orders = ordersResult.data ?? [];
  const revenue30d = orders.reduce((sum, o) => sum + o.total_amount, 0);
  const orders30d = orders.length;
  const aov = orders30d > 0 ? Math.round(revenue30d / orders30d) : 0;
  const lowStockVariants = lowStockResult.count ?? 0;

  // Build daily aggregation for charts
  const dailyMap = new Map<string, { revenue: number; orders: number }>();

  // Pre-fill all 30 days so the chart always has entries
  for (let i = 29; i >= 0; i--) {
    const d = new Date(Date.now() - i * 24 * 60 * 60 * 1000);
    const key = `${String(d.getMonth() + 1).padStart(2, "0")}. ${String(d.getDate()).padStart(2, "0")}.`;
    dailyMap.set(key, { revenue: 0, orders: 0 });
  }

  for (const order of orders) {
    const d = new Date(order.created_at);
    const key = `${String(d.getMonth() + 1).padStart(2, "0")}. ${String(d.getDate()).padStart(2, "0")}.`;
    const entry = dailyMap.get(key);
    if (entry) {
      entry.revenue += order.total_amount;
      entry.orders += 1;
    }
  }

  const dailyData: DailyDataPoint[] = Array.from(dailyMap.entries()).map(([date, vals]) => ({
    date,
    revenue: vals.revenue,
    orders: vals.orders,
  }));

  return {
    revenue30d,
    orders30d,
    aov,
    lowStockVariants,
    recentPaidOrders: recentResult.data ?? [],
    dailyData,
  };
}

export default async function AdminDashboardPage() {
  await requireAdminOrViewer();
  const data = await getDashboardData();

  return (
    <div className="space-y-8">
      {/* Page heading */}
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
        <p className="mt-1 text-sm text-muted-foreground">Áttekintés az elmúlt 30 napról</p>
      </div>

      {/* KPI cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader>
            <CardDescription>Bevétel (30 nap)</CardDescription>
            <CardTitle className="text-2xl tabular-nums">{formatHUF(data.revenue30d)}</CardTitle>
          </CardHeader>
        </Card>

        <Card>
          <CardHeader>
            <CardDescription>Rendelések (30 nap)</CardDescription>
            <CardTitle className="text-2xl tabular-nums">{data.orders30d}</CardTitle>
          </CardHeader>
        </Card>

        <Card>
          <CardHeader>
            <CardDescription>Átlagos rendelési érték</CardDescription>
            <CardTitle className="text-2xl tabular-nums">{formatHUF(data.aov)}</CardTitle>
          </CardHeader>
        </Card>

        <Card>
          <CardHeader>
            <CardDescription>Alacsony készlet</CardDescription>
            <CardTitle className="text-2xl tabular-nums">
              {data.lowStockVariants}
              <span className="ml-1 text-sm font-normal text-muted-foreground">változat</span>
            </CardTitle>
          </CardHeader>
        </Card>
      </div>

      {/* Daily charts */}
      <DashboardCharts data={data.dailyData} />

      {/* Recent orders */}
      <Card>
        <CardHeader>
          <CardTitle>Legutóbbi fizetett rendelések</CardTitle>
          <CardDescription>Az utolsó 5 kifizetett rendelés</CardDescription>
        </CardHeader>
        <CardContent>
          {data.recentPaidOrders.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nincsenek rendelések.</p>
          ) : (
            <div className="space-y-3">
              {data.recentPaidOrders.map((order) => (
                <Link
                  key={order.id}
                  href={`/admin/orders/${order.id}`}
                  className="flex items-center justify-between rounded-lg border border-border p-3 transition-colors duration-300 hover:bg-muted/50"
                >
                  <div className="flex flex-col gap-0.5">
                    <span className="text-sm font-medium">
                      {order.id.slice(0, 8).toUpperCase()}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {order.email} &middot; {formatDate(order.created_at)}
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <OrderStatusBadge status={order.status as OrderStatus} />
                    <span className="text-sm font-medium tabular-nums">
                      {formatHUF(order.total_amount)}
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
