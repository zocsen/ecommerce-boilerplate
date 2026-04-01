"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import { Search, ChevronLeft, ChevronRight, Download, Loader2 } from "lucide-react";
import { adminListOrders, exportOrdersCsv } from "@/lib/actions/orders";
import { formatHUF, formatDateTime } from "@/lib/utils/format";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { OrderStatusBadge } from "@/components/admin/order-status-badge";
import { ORDER_STATUS_LABELS } from "@/lib/constants/order-status";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

import type { OrderStatus } from "@/lib/types/database";

/* ------------------------------------------------------------------ */
/*  Admin Orders List (client component)                                */
/* ------------------------------------------------------------------ */

const STATUS_OPTIONS: Array<{ value: string; label: string }> = [
  { value: "", label: "Összes" },
  ...Object.entries(ORDER_STATUS_LABELS)
    .filter(([key]) => key !== "draft")
    .map(([value, label]) => ({ value, label })),
];

const EXPORT_STATUS_OPTIONS: Array<{ value: string; label: string }> = [
  { value: "all", label: "Összes státusz" },
  ...Object.entries(ORDER_STATUS_LABELS)
    .filter(([key]) => key !== "draft")
    .map(([value, label]) => ({ value, label })),
];

interface OrderRow {
  id: string;
  email: string;
  status: string;
  total_amount: number;
  created_at: string;
  shipping_method: string;
}

/* ------------------------------------------------------------------ */
/*  Export Dialog                                                        */
/* ------------------------------------------------------------------ */

function ExportDialog() {
  const [open, setOpen] = useState(false);
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [exportStatus, setExportStatus] = useState("all");
  const [includeLineItems, setIncludeLineItems] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState("");

  function resetForm() {
    setDateFrom("");
    setDateTo("");
    setExportStatus("all");
    setIncludeLineItems(false);
    setExportError("");
  }

  async function handleExport() {
    setExporting(true);
    setExportError("");

    try {
      const result = await exportOrdersCsv({
        dateFrom: dateFrom || undefined,
        dateTo: dateTo || undefined,
        status: exportStatus === "all" ? undefined : exportStatus,
        includeLineItems,
      });

      if (!result.success || !result.data) {
        setExportError(result.error ?? "Ismeretlen hiba történt.");
        return;
      }

      // Trigger browser download
      const blob = new Blob([result.data.csv], {
        type: "text/csv;charset=utf-8",
      });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = result.data.filename;
      document.body.appendChild(anchor);
      anchor.click();
      document.body.removeChild(anchor);
      URL.revokeObjectURL(url);

      setOpen(false);
      resetForm();
    } catch {
      setExportError("Váratlan hiba történt az exportálás során.");
    } finally {
      setExporting(false);
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        setOpen(nextOpen);
        if (!nextOpen) resetForm();
      }}
    >
      <DialogTrigger render={<Button variant="outline" size="sm" className="gap-1.5" />}>
        <Download className="size-4" />
        Exportálás
      </DialogTrigger>

      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Rendelések exportálása</DialogTitle>
          <DialogDescription>
            Válaszd ki a szűrőket, majd kattints a letöltésre. A fájl CSV formátumban készül, UTF-8
            kódolással (Excel-kompatibilis).
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Date range */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="export-date-from">Dátum -tól</Label>
              <Input
                id="export-date-from"
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="export-date-to">Dátum -ig</Label>
              <Input
                id="export-date-to"
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
              />
            </div>
          </div>

          {/* Status filter */}
          <div className="space-y-1.5">
            <Label>Státusz szűrő</Label>
            <Select
              value={exportStatus}
              onValueChange={(val: string | null) => setExportStatus(val ?? "all")}
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {EXPORT_STATUS_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Include line items */}
          <div className="flex items-center gap-2">
            <Checkbox
              id="export-line-items"
              checked={includeLineItems}
              onCheckedChange={(checked) => setIncludeLineItems(checked === true)}
            />
            <Label htmlFor="export-line-items" className="cursor-pointer">
              Tételek részletezése (terméksorok)
            </Label>
          </div>

          {/* Error banner */}
          {exportError && (
            <div className="rounded-md border border-destructive/50 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {exportError}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button onClick={handleExport} disabled={exporting} className="gap-1.5">
            {exporting ? (
              <>
                <Loader2 className="size-4 animate-spin" />
                Exportálás...
              </>
            ) : (
              <>
                <Download className="size-4" />
                Letöltés
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ------------------------------------------------------------------ */
/*  Main Orders Client                                                  */
/* ------------------------------------------------------------------ */

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
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Rendelések</h1>
          <p className="mt-1 text-sm text-muted-foreground">{total} rendelés összesen</p>
        </div>
        <ExportDialog />
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
                <TableCell className="text-muted-foreground">{order.email}</TableCell>
                <TableCell>
                  <OrderStatusBadge status={order.status as OrderStatus} />
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {order.shipping_method === "home" ? "Házhozszállítás" : "Csomagautomata"}
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
