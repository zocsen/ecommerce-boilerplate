"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import { Search, ChevronLeft, ChevronRight } from "lucide-react";
import { adminListOrders } from "@/lib/actions/orders";
import { formatHUF, formatDateTime } from "@/lib/utils/format";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

/* ------------------------------------------------------------------ */
/*  Admin Orders List (client component)                                */
/* ------------------------------------------------------------------ */

const STATUS_OPTIONS: Array<{ value: string; label: string }> = [
  { value: "", label: "Összes" },
  { value: "awaiting_payment", label: "Fizetésre vár" },
  { value: "paid", label: "Fizetve" },
  { value: "processing", label: "Feldolgozás" },
  { value: "shipped", label: "Kiszállítva" },
  { value: "cancelled", label: "Törölve" },
  { value: "refunded", label: "Visszatérítve" },
];

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
    draft: { label: "Piszkozat", variant: "outline" },
    awaiting_payment: { label: "Fizetésre vár", variant: "secondary" },
    paid: { label: "Fizetve", variant: "default" },
    processing: { label: "Feldolgozás", variant: "default" },
    shipped: { label: "Kiszállítva", variant: "secondary" },
    cancelled: { label: "Törölve", variant: "destructive" },
    refunded: { label: "Visszatérítve", variant: "destructive" },
  };
  const entry = map[status] ?? { label: status, variant: "outline" as const };
  return <Badge variant={entry.variant}>{entry.label}</Badge>;
}

interface OrderRow {
  id: string;
  email: string;
  status: string;
  total_amount: number;
  created_at: string;
  shipping_method: string;
}

export function AdminOrdersClient() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [loading, setLoading] = useState(true);

  const page = Number(searchParams.get("page") ?? "1");
  const status = searchParams.get("status") ?? "";
  const search = searchParams.get("search") ?? "";

  const fetchOrders = useCallback(async () => {
    setLoading(true);
    const result = await adminListOrders({
      page,
      perPage: 20,
      status: status || undefined,
      search: search || undefined,
    });
    if (result.success && result.data) {
      setOrders(result.data.orders as OrderRow[]);
      setTotal(result.data.total);
      setTotalPages(result.data.totalPages);
    }
    setLoading(false);
  }, [page, status, search]);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  function updateParam(key: string, value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value) {
      params.set(key, value);
    } else {
      params.delete(key);
    }
    // Reset page when filters change
    if (key !== "page") {
      params.delete("page");
    }
    router.push(`/admin/orders?${params.toString()}`);
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Rendelések</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {total} rendelés összesen
        </p>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Keresés email vagy rendelés ID..."
            className="h-8 w-64 pl-8"
            defaultValue={search}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                updateParam("search", e.currentTarget.value);
              }
            }}
          />
        </div>

        <div className="flex items-center gap-1">
          {STATUS_OPTIONS.map((opt) => (
            <Button
              key={opt.value}
              variant={status === opt.value ? "default" : "outline"}
              size="sm"
              className="h-7 text-xs"
              onClick={() => updateParam("status", opt.value)}
            >
              {opt.label}
            </Button>
          ))}
        </div>
      </div>

      {/* Table */}
      {loading ? (
        <div className="flex h-40 items-center justify-center text-sm text-muted-foreground">
          Betöltés...
        </div>
      ) : orders.length === 0 ? (
        <div className="flex h-40 items-center justify-center text-sm text-muted-foreground">
          Nincs találat.
        </div>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Rendelés</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Státusz</TableHead>
              <TableHead>Szállítás</TableHead>
              <TableHead className="text-right">Összeg</TableHead>
              <TableHead className="text-right">Dátum</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {orders.map((order) => (
              <TableRow
                key={order.id}
                className="cursor-pointer"
                onClick={() => router.push(`/admin/orders/${order.id}`)}
              >
                <TableCell className="font-medium">
                  <Link
                    href={`/admin/orders/${order.id}`}
                    className="underline-offset-4 hover:underline"
                  >
                    {order.id.slice(0, 8).toUpperCase()}
                  </Link>
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {order.email}
                </TableCell>
                <TableCell>
                  <StatusBadge status={order.status} />
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {order.shipping_method === "home"
                    ? "Házhozszállítás"
                    : "Csomagautomata"}
                </TableCell>
                <TableCell className="text-right font-medium tabular-nums">
                  {formatHUF(order.total_amount)}
                </TableCell>
                <TableCell className="text-right text-muted-foreground">
                  {formatDateTime(order.created_at)}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <span className="text-xs text-muted-foreground">
            {page}. / {totalPages}. oldal
          </span>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={page <= 1}
              onClick={() => updateParam("page", String(page - 1))}
            >
              <ChevronLeft className="size-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= totalPages}
              onClick={() => updateParam("page", String(page + 1))}
            >
              <ChevronRight className="size-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
