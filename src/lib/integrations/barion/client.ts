/* ------------------------------------------------------------------ */
/*  Barion Payment Gateway – Client                                    */
/*                                                                     */
/*  Handles payment initiation and status retrieval against the        */
/*  Barion Smart Gateway API v2.                                       */
/*                                                                     */
/*  Supports:                                                          */
/*    - One-time immediate payments (orders)                           */
/*    - Customer-initiated recurring payments (subscription checkout)  */
/*    - Merchant-initiated recurring payments (subscription renewals)  */
/* ------------------------------------------------------------------ */

import { siteConfig } from "@/lib/config/site.config";
import type { OrderRow, OrderItemRow, OrderStatus } from "@/lib/types/database";

// ── Barion response shapes ────────────────────────────────────────

interface BarionStartPaymentResponse {
  PaymentId: string;
  PaymentRequestId: string;
  Status: string;
  GatewayUrl: string;
  RecurrenceResult: string | null;
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
  RecurrenceResult: string | null;
  FundingSource: string | null;
  RecurrenceType: string | null;
  TraceId: string | null;
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
  recurrenceResult: string | null;
  fundingSource: string | null;
  traceId: string | null;
}

export interface VerifyPaymentResult {
  barionStatus: string;
  orderStatus: OrderStatus;
  paymentId: string;
}

/** Result from a subscription checkout (customer-initiated, captures token) */
export interface SubscriptionCheckoutResult {
  paymentId: string;
  gatewayUrl: string;
}

/** Result from a merchant-initiated recurring charge (no redirect needed) */
export interface RecurringChargeResult {
  paymentId: string;
  status: string;
  traceId: string;
}

// ── Subscription payment input types ──────────────────────────────

export interface SubscriptionCheckoutInput {
  /** Unique ID for this payment request (use subscription_invoice.id) */
  paymentRequestId: string;
  /** Description shown on Barion checkout page */
  description: string;
  /** Amount in HUF */
  amount: number;
  /** Payee email (agency's Barion email) */
  payeeEmail: string;
}

export interface RecurringChargeInput {
  /** Unique ID for this payment request (use subscription_invoice.id) */
  paymentRequestId: string;
  /** Stored recurrence token from the initial payment */
  recurrenceToken: string;
  /** Description for the recurring charge */
  description: string;
  /** Amount in HUF */
  amount: number;
  /** Payee email (agency's Barion email) */
  payeeEmail: string;
  /** Unique trace ID for this recurring payment (use a UUID) */
  traceId: string;
}

// ── Internal helpers ──────────────────────────────────────────────

function getBaseUrl(): string {
  const env = siteConfig.payments.barion.environment;
  return env === "prod" ? "https://api.barion.com" : "https://api.test.barion.com";
}

function getPosKey(): string {
  const envVar = siteConfig.payments.barion.posKeyEnvVar;
  const key = process.env[envVar];
  if (!key) {
    throw new Error(`Missing Barion POS key. Set the "${envVar}" environment variable.`);
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

// ── Public API: One-time payments (orders) ────────────────────────

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
    const messages = data.Errors.map((e) => `${e.ErrorCode}: ${e.Description}`).join("; ");
    throw new Error(`Barion Payment/Start returned errors: ${messages}`);
  }

  if (!data.PaymentId || !data.GatewayUrl) {
    throw new Error("Barion Payment/Start response missing PaymentId or GatewayUrl.");
  }

  return {
    paymentId: data.PaymentId,
    gatewayUrl: data.GatewayUrl,
  };
}

// ── Public API: Subscription payments ─────────────────────────────

/**
 * Start a customer-initiated subscription checkout payment.
 *
 * This is the first payment in a subscription. It uses
 * `RecurrenceType: "RecurringPayment"` with `InitiateRecurrence: true`
 * to capture a recurrence token that can be used for future
 * merchant-initiated charges (renewals).
 *
 * The customer is redirected to the Barion gateway to complete 3DS
 * authentication and payment.
 */
export async function startSubscriptionCheckout(
  input: SubscriptionCheckoutInput,
): Promise<SubscriptionCheckoutResult> {
  const posKey = getPosKey();
  const baseUrl = getBaseUrl();
  const { subscriptionRedirectUrls } = siteConfig.subscription;

  const body = {
    POSKey: posKey,
    PaymentType: "Immediate",
    PaymentRequestId: input.paymentRequestId,
    GuestCheckout: false, // Must be false for recurring — user needs a Barion wallet
    FundingSources: ["All"],
    Currency: "HUF",
    Locale: "hu-HU",
    OrderNumber: `sub-${input.paymentRequestId}`,
    RedirectUrl: subscriptionRedirectUrls.success,
    CallbackUrl: subscriptionRedirectUrls.callback,
    // Recurring payment fields
    RecurrenceType: "RecurringPayment",
    InitiateRecurrence: true,
    ChallengePreference: "NoPreference",
    Transactions: [
      {
        POSTransactionId: `${input.paymentRequestId}-sub-txn`,
        Payee: input.payeeEmail,
        Total: input.amount,
        Items: [
          {
            Name: input.description,
            Description: input.description,
            Quantity: 1,
            Unit: "db",
            UnitPrice: input.amount,
            ItemTotal: input.amount,
            SKU: `sub-${input.paymentRequestId}`,
          },
        ],
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
      `Barion subscription checkout failed with HTTP ${response.status}: ${response.statusText}`,
    );
  }

  const data = (await response.json()) as BarionStartPaymentResponse;

  if (data.Errors && data.Errors.length > 0) {
    const messages = data.Errors.map((e) => `${e.ErrorCode}: ${e.Description}`).join("; ");
    throw new Error(`Barion subscription checkout returned errors: ${messages}`);
  }

  if (!data.PaymentId || !data.GatewayUrl) {
    throw new Error("Barion subscription checkout response missing PaymentId or GatewayUrl.");
  }

  return {
    paymentId: data.PaymentId,
    gatewayUrl: data.GatewayUrl,
  };
}

/**
 * Execute a merchant-initiated recurring charge using a stored
 * recurrence token. Used for automated subscription renewals.
 *
 * This payment does NOT require customer interaction — it is
 * processed entirely server-side using the stored token from the
 * initial subscription checkout.
 *
 * Important: This is a `MerchantInitiatedPayment` with
 * `ChallengePreference: "NoChallengeNeeded"`. The bank may still
 * decline if SCA is required.
 */
export async function chargeRecurringPayment(
  input: RecurringChargeInput,
): Promise<RecurringChargeResult> {
  const posKey = getPosKey();
  const baseUrl = getBaseUrl();
  const { subscriptionRedirectUrls } = siteConfig.subscription;

  const body = {
    POSKey: posKey,
    PaymentType: "Immediate",
    PaymentRequestId: input.paymentRequestId,
    GuestCheckout: false,
    FundingSources: ["All"],
    Currency: "HUF",
    Locale: "hu-HU",
    OrderNumber: `renewal-${input.paymentRequestId}`,
    // No redirect needed for merchant-initiated payments, but Barion requires it
    RedirectUrl: subscriptionRedirectUrls.success,
    CallbackUrl: subscriptionRedirectUrls.callback,
    // Merchant-initiated recurring charge fields
    RecurrenceType: "MerchantInitiatedPayment",
    RecurrenceId: input.recurrenceToken,
    ChallengePreference: "NoChallengeNeeded",
    TraceId: input.traceId,
    Transactions: [
      {
        POSTransactionId: `${input.paymentRequestId}-renewal-txn`,
        Payee: input.payeeEmail,
        Total: input.amount,
        Items: [
          {
            Name: input.description,
            Description: input.description,
            Quantity: 1,
            Unit: "db",
            UnitPrice: input.amount,
            ItemTotal: input.amount,
            SKU: `renewal-${input.paymentRequestId}`,
          },
        ],
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
      `Barion recurring charge failed with HTTP ${response.status}: ${response.statusText}`,
    );
  }

  const data = (await response.json()) as BarionStartPaymentResponse;

  if (data.Errors && data.Errors.length > 0) {
    const messages = data.Errors.map((e) => `${e.ErrorCode}: ${e.Description}`).join("; ");
    throw new Error(`Barion recurring charge returned errors: ${messages}`);
  }

  if (!data.PaymentId) {
    throw new Error("Barion recurring charge response missing PaymentId.");
  }

  return {
    paymentId: data.PaymentId,
    status: data.Status,
    traceId: input.traceId,
  };
}

// ── Public API: Payment state & verification ──────────────────────

/**
 * Retrieve the current payment state from Barion.
 * Works for both order payments and subscription payments.
 */
export async function getPaymentState(paymentId: string): Promise<PaymentStateResult> {
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
    const messages = data.Errors.map((e) => `${e.ErrorCode}: ${e.Description}`).join("; ");
    throw new Error(`Barion GetPaymentState returned errors: ${messages}`);
  }

  return {
    paymentId: data.PaymentId,
    status: data.Status,
    total: data.Total,
    currency: data.Currency,
    completedAt: data.CompletedAt,
    recurrenceResult: data.RecurrenceResult ?? null,
    fundingSource: data.FundingSource ?? null,
    traceId: data.TraceId ?? null,
  };
}

/**
 * Verify a payment and return a normalized status that maps to our
 * internal OrderStatus enum. Used primarily for order payments.
 */
export async function verifyPayment(paymentId: string): Promise<VerifyPaymentResult> {
  const state = await getPaymentState(paymentId);

  return {
    barionStatus: state.status,
    orderStatus: mapBarionStatusToOrderStatus(state.status),
    paymentId: state.paymentId,
  };
}

/**
 * Check if a Barion payment succeeded and the recurrence token was
 * captured. Used for subscription checkout verification.
 *
 * Returns the token capture status alongside the payment status.
 */
export async function verifySubscriptionPayment(paymentId: string): Promise<{
  succeeded: boolean;
  barionStatus: string;
  recurrenceTokenCaptured: boolean;
  fundingSource: string | null;
  total: number;
}> {
  const state = await getPaymentState(paymentId);

  return {
    succeeded: state.status === "Succeeded",
    barionStatus: state.status,
    recurrenceTokenCaptured: state.recurrenceResult === "Successful",
    fundingSource: state.fundingSource,
    total: state.total,
  };
}
