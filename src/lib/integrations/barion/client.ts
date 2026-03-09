/* ------------------------------------------------------------------ */
/*  Barion Payment Gateway – Client                                    */
/*                                                                     */
/*  Handles payment initiation and status retrieval against the        */
/*  Barion Smart Gateway API v2.                                       */
/* ------------------------------------------------------------------ */

import { siteConfig } from "@/lib/config/site.config";
import type { OrderRow, OrderItemRow, OrderStatus } from "@/lib/types/database";

// ── Barion response shapes ────────────────────────────────────────

interface BarionStartPaymentResponse {
  PaymentId: string;
  PaymentRequestId: string;
  Status: string;
  GatewayUrl: string;
  Errors: Array<{ Title: string; Description: string; ErrorCode: string }>;
}

interface BarionPaymentStateResponse {
  PaymentId: string;
  PaymentRequestId: string;
  Status: string;
  OrderNumber: string;
  CreatedAt: string;
  CompletedAt: string | null;
  Total: number;
  Currency: string;
  Transactions: Array<{
    TransactionId: string;
    Status: string;
    Total: number;
  }>;
  Errors: Array<{ Title: string; Description: string; ErrorCode: string }>;
}

// ── Public result types ───────────────────────────────────────────

export interface StartPaymentResult {
  paymentId: string;
  gatewayUrl: string;
}

export interface PaymentStateResult {
  paymentId: string;
  status: string;
  total: number;
  currency: string;
  completedAt: string | null;
}

export interface VerifyPaymentResult {
  barionStatus: string;
  orderStatus: OrderStatus;
  paymentId: string;
}

// ── Internal helpers ──────────────────────────────────────────────

function getBaseUrl(): string {
  const env = siteConfig.payments.barion.environment;
  return env === "prod"
    ? "https://api.barion.com"
    : "https://api.test.barion.com";
}

function getPosKey(): string {
  const envVar = siteConfig.payments.barion.posKeyEnvVar;
  const key = process.env[envVar];
  if (!key) {
    throw new Error(
      `Missing Barion POS key. Set the "${envVar}" environment variable.`,
    );
  }
  return key;
}

/**
 * Map a Barion payment status string to our internal OrderStatus.
 *
 * Barion statuses:
 *   Prepared, Started, InProgress, Waiting, Reserved,
 *   Authorized, Canceled, Succeeded, Failed, PartiallySucceeded, Expired
 */
function mapBarionStatusToOrderStatus(barionStatus: string): OrderStatus {
  switch (barionStatus) {
    case "Succeeded":
      return "paid";
    case "Prepared":
    case "Started":
    case "InProgress":
    case "Waiting":
    case "Reserved":
    case "Authorized":
      return "awaiting_payment";
    case "Canceled":
    case "Expired":
      return "cancelled";
    case "Failed":
    case "PartiallySucceeded":
      return "cancelled";
    default:
      return "awaiting_payment";
  }
}

// ── Public API ────────────────────────────────────────────────────

/**
 * Start a Barion payment session for the given order.
 *
 * Returns the Barion PaymentId and the GatewayUrl the customer should
 * be redirected to.
 */
export async function startPayment(
  order: OrderRow,
  items: OrderItemRow[],
): Promise<StartPaymentResult> {
  const posKey = getPosKey();
  const baseUrl = getBaseUrl();
  const { redirectUrls, payeeEmail } = siteConfig.payments.barion;

  const transactionItems = items.map((item) => ({
    Name: item.title_snapshot,
    Description: item.title_snapshot,
    Quantity: item.quantity,
    Unit: "db",
    UnitPrice: item.unit_price_snapshot,
    ItemTotal: item.line_total,
    SKU: item.variant_id ?? item.product_id,
  }));

  const body = {
    POSKey: posKey,
    PaymentType: "Immediate",
    PaymentRequestId: order.id,
    GuestCheckout: true,
    FundingSources: ["All"],
    Currency: "HUF",
    Locale: "hu-HU",
    OrderNumber: order.id,
    RedirectUrl: redirectUrls.success,
    CallbackUrl: redirectUrls.callback,
    Transactions: [
      {
        POSTransactionId: `${order.id}-txn`,
        Payee: payeeEmail,
        Total: order.total_amount,
        Items: transactionItems,
      },
    ],
  };

  const response = await fetch(`${baseUrl}/v2/Payment/Start`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    throw new Error(
      `Barion Payment/Start failed with HTTP ${response.status}: ${response.statusText}`,
    );
  }

  const data = (await response.json()) as BarionStartPaymentResponse;

  if (data.Errors && data.Errors.length > 0) {
    const messages = data.Errors.map(
      (e) => `${e.ErrorCode}: ${e.Description}`,
    ).join("; ");
    throw new Error(`Barion Payment/Start returned errors: ${messages}`);
  }

  if (!data.PaymentId || !data.GatewayUrl) {
    throw new Error(
      "Barion Payment/Start response missing PaymentId or GatewayUrl.",
    );
  }

  return {
    paymentId: data.PaymentId,
    gatewayUrl: data.GatewayUrl,
  };
}

/**
 * Retrieve the current payment state from Barion.
 */
export async function getPaymentState(
  paymentId: string,
): Promise<PaymentStateResult> {
  const posKey = getPosKey();
  const baseUrl = getBaseUrl();

  const url = `${baseUrl}/v2/Payment/GetPaymentState?POSKey=${encodeURIComponent(posKey)}&PaymentId=${encodeURIComponent(paymentId)}`;

  const response = await fetch(url, { method: "GET" });

  if (!response.ok) {
    throw new Error(
      `Barion GetPaymentState failed with HTTP ${response.status}: ${response.statusText}`,
    );
  }

  const data = (await response.json()) as BarionPaymentStateResponse;

  if (data.Errors && data.Errors.length > 0) {
    const messages = data.Errors.map(
      (e) => `${e.ErrorCode}: ${e.Description}`,
    ).join("; ");
    throw new Error(`Barion GetPaymentState returned errors: ${messages}`);
  }

  return {
    paymentId: data.PaymentId,
    status: data.Status,
    total: data.Total,
    currency: data.Currency,
    completedAt: data.CompletedAt,
  };
}

/**
 * Verify a payment and return a normalized status that maps to our
 * internal OrderStatus enum.
 */
export async function verifyPayment(
  paymentId: string,
): Promise<VerifyPaymentResult> {
  const state = await getPaymentState(paymentId);

  return {
    barionStatus: state.status,
    orderStatus: mapBarionStatusToOrderStatus(state.status),
    paymentId: state.paymentId,
  };
}
