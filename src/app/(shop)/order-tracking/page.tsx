"use client";

/* ------------------------------------------------------------------ */
/*  Guest Order Tracking page — /order-tracking                        */
/*                                                                     */
/*  Clean, centered form: order number + email → order status card     */
/*  with timeline. Pre-fillable via ?order=XXX&email=XXX query params. */
/* ------------------------------------------------------------------ */

import { Suspense, useReducer, useEffect, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import {
  Search,
  Package,
  Truck,
  CheckCircle2,
  Clock,
  XCircle,
  ArrowRight,
  Loader2,
} from "lucide-react";
import { trackGuestOrder } from "@/lib/actions/orders";
import type { GuestOrderTrackingData } from "@/lib/actions/orders";
import { formatDate } from "@/lib/utils/format";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { OrderStatusBadge } from "@/components/admin/order-status-badge";
import { Separator } from "@/components/ui/separator";
import type { OrderStatus } from "@/lib/types/database";

// ── State ──────────────────────────────────────────────────────────

interface State {
  orderNumber: string;
  email: string;
  loading: boolean;
  error: string | null;
  result: GuestOrderTrackingData | null;
}

type Action =
  | { type: "SET_ORDER_NUMBER"; value: string }
  | { type: "SET_EMAIL"; value: string }
  | { type: "SUBMIT" }
  | { type: "SUCCESS"; data: GuestOrderTrackingData }
  | { type: "ERROR"; error: string }
  | { type: "PREFILL"; orderNumber: string; email: string };

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case "SET_ORDER_NUMBER":
      return { ...state, orderNumber: action.value, error: null };
    case "SET_EMAIL":
      return { ...state, email: action.value, error: null };
    case "SUBMIT":
      return { ...state, loading: true, error: null, result: null };
    case "SUCCESS":
      return { ...state, loading: false, result: action.data };
    case "ERROR":
      return { ...state, loading: false, error: action.error };
    case "PREFILL":
      return { ...state, orderNumber: action.orderNumber, email: action.email };
    default:
      return state;
  }
}

const initialState: State = {
  orderNumber: "",
  email: "",
  loading: false,
  error: null,
  result: null,
};

const SHIPPING_LABELS: Record<string, string> = {
  home: "Házhozszállítás",
  pickup: "Csomagpont",
};

// ── Component ──────────────────────────────────────────────────────

export default function OrderTrackingPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[60vh] items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      }
    >
      <OrderTrackingContent />
    </Suspense>
  );
}

function OrderTrackingContent() {
  const searchParams = useSearchParams();
  const [state, dispatch] = useReducer(reducer, initialState);

  // Pre-fill from URL query params
  useEffect(() => {
    const order = searchParams.get("order");
    const email = searchParams.get("email");
    if (order || email) {
      dispatch({
        type: "PREFILL",
        orderNumber: order ?? "",
        email: email ?? "",
      });
    }
  }, [searchParams]);

  const handleSubmit = useCallback(
    async (e: React.FormEvent<HTMLFormElement>) => {
      e.preventDefault();

      if (!state.orderNumber.trim() || !state.email.trim()) {
        dispatch({ type: "ERROR", error: "Kérjük, töltse ki mindkét mezőt." });
        return;
      }

      dispatch({ type: "SUBMIT" });

      const result = await trackGuestOrder({
        orderNumber: state.orderNumber.trim(),
        email: state.email.trim(),
      });

      if (result.success && result.data) {
        dispatch({ type: "SUCCESS", data: result.data });
      } else {
        dispatch({
          type: "ERROR",
          error: result.error ?? "Nem találtunk rendelést ezekkel az adatokkal.",
        });
      }
    },
    [state.orderNumber, state.email],
  );

  return (
    <div className="mx-auto max-w-xl px-6 py-20 lg:px-8">
      {/* ── Header ──────────────────────────────────── */}
      <div className="text-center">
        <div className="mx-auto flex size-16 items-center justify-center rounded-full bg-muted">
          <Package className="size-8 text-muted-foreground" />
        </div>
        <h1 className="mt-6 text-3xl font-semibold tracking-[-0.03em]">Rendeléskövetés</h1>
        <p className="mt-2 text-muted-foreground">
          Adja meg a rendelésszámát és az e-mail címét a rendelés állapotának megtekintéséhez.
        </p>
      </div>

      {/* ── Search form ─────────────────────────────── */}
      <form onSubmit={handleSubmit} className="mt-10 space-y-4">
        <div>
          <label htmlFor="orderNumber" className="mb-1.5 block text-sm font-medium">
            Rendelésszám
          </label>
          <Input
            id="orderNumber"
            type="text"
            placeholder="pl. A1B2C3D4"
            value={state.orderNumber}
            onChange={(e) => dispatch({ type: "SET_ORDER_NUMBER", value: e.target.value })}
            className="h-10"
            autoComplete="off"
          />
        </div>
        <div>
          <label htmlFor="email" className="mb-1.5 block text-sm font-medium">
            E-mail cím
          </label>
          <Input
            id="email"
            type="email"
            placeholder="pelda@email.hu"
            value={state.email}
            onChange={(e) => dispatch({ type: "SET_EMAIL", value: e.target.value })}
            className="h-10"
          />
        </div>

        <Button type="submit" className="w-full" size="lg" disabled={state.loading}>
          {state.loading ? (
            <span className="flex items-center gap-2">
              <span className="size-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
              Keresés…
            </span>
          ) : (
            <span className="flex items-center gap-2">
              <Search className="size-4" />
              Keresés
            </span>
          )}
        </Button>
      </form>

      {/* ── Error message ──────────────────────────── */}
      {state.error && (
        <div className="mt-6 rounded-lg border border-destructive/20 bg-destructive/5 px-4 py-3 text-center text-sm text-destructive">
          {state.error}
        </div>
      )}

      {/* ── Result card ────────────────────────────── */}
      {state.result && <OrderStatusCard data={state.result} />}
    </div>
  );
}

// ── Order status card ──────────────────────────────────────────────

function OrderStatusCard({ data }: { data: GuestOrderTrackingData }) {
  return (
    <div className="mt-10 rounded-xl border border-border p-6">
      {/* ── Header row ──────────────── */}
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold uppercase tracking-widest text-muted-foreground">
          Rendelés állapota
        </h2>
        <OrderStatusBadge status={data.status as OrderStatus} />
      </div>

      <Separator className="my-4" />

      {/* ── Details ─────────────────── */}
      <dl className="space-y-3">
        <DetailRow label="Rendelésszám" value={data.orderNumber} />
        <DetailRow label="Dátum" value={formatDate(data.createdAt)} />
        <DetailRow
          label="Szállítás"
          value={SHIPPING_LABELS[data.shippingMethod] ?? data.shippingMethod}
        />
        {data.trackingNumber && (
          <DetailRow label="Csomagkövetési szám" value={data.trackingNumber} isTracking />
        )}
      </dl>

      <Separator className="my-4" />

      {/* ── Timeline ────────────────── */}
      <OrderTimeline timeline={data.timeline} currentStatus={data.status} />
    </div>
  );
}

// ── Timeline ───────────────────────────────────────────────────────

function OrderTimeline({
  timeline,
  currentStatus,
}: {
  timeline: GuestOrderTrackingData["timeline"];
  currentStatus: string;
}) {
  return (
    <div className="space-y-0">
      <h3 className="mb-4 text-sm font-semibold uppercase tracking-widest text-muted-foreground">
        Rendelés folyamata
      </h3>
      <div className="relative ml-3">
        {timeline.map((step, i) => {
          const isCompleted = step.date !== null;
          const isCurrent = step.status === currentStatus;
          const isLast = i === timeline.length - 1;

          return (
            <div key={step.status} className="relative flex gap-4 pb-6 last:pb-0">
              {/* Vertical line */}
              {!isLast && (
                <div
                  className={`absolute left-[7px] top-[20px] h-[calc(100%-8px)] w-[2px] ${
                    isCompleted ? "bg-foreground" : "bg-border"
                  }`}
                />
              )}

              {/* Dot */}
              <div className="relative z-10 flex-shrink-0">
                {isCompleted ? (
                  <div className="flex size-4 items-center justify-center rounded-full bg-foreground">
                    {isCurrent ? (
                      <StatusIcon status={step.status} className="size-2.5 text-background" />
                    ) : (
                      <CheckCircle2 className="size-2.5 text-background" />
                    )}
                  </div>
                ) : (
                  <div className="size-4 rounded-full border-2 border-border bg-background" />
                )}
              </div>

              {/* Text */}
              <div className="flex-1 -mt-0.5">
                <p
                  className={`text-sm font-medium ${
                    isCompleted ? "text-foreground" : "text-muted-foreground"
                  }`}
                >
                  {step.label}
                </p>
                {step.date && (
                  <p className="mt-0.5 text-xs text-muted-foreground">{formatDate(step.date)}</p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Status icon helper ─────────────────────────────────────────────

function StatusIcon({ status, className }: { status: string; className?: string }) {
  switch (status) {
    case "shipped":
      return <Truck className={className} />;
    case "cancelled":
    case "refunded":
      return <XCircle className={className} />;
    case "paid":
    case "processing":
      return <ArrowRight className={className} />;
    default:
      return <Clock className={className} />;
  }
}

// ── Detail row helper ──────────────────────────────────────────────

function DetailRow({
  label,
  value,
  isTracking = false,
}: {
  label: string;
  value: string;
  isTracking?: boolean;
}) {
  return (
    <div className="flex items-baseline justify-between text-sm">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="font-medium">
        {isTracking ? <span className="font-mono">{value}</span> : value}
      </dd>
    </div>
  );
}
