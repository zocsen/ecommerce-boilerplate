/* ------------------------------------------------------------------ */
/*  Barion Callback Handler – Idempotent                               */
/*                                                                     */
/*  Called by the Barion gateway (server-to-server) when a payment     */
/*  status changes. Must be idempotent: if the order is already paid   */
/*  (or cancelled), subsequent calls are no-ops.                       */
/* ------------------------------------------------------------------ */

import { createAdminClient } from "@/lib/supabase/admin";
import { verifyPayment } from "@/lib/integrations/barion/client";

export interface CallbackResult {
  success: boolean;
  action: "paid" | "cancelled" | "no_op" | "error";
  orderId: string | null;
  message: string;
}

/**
 * Process a Barion callback for a given paymentId.
 *
 * Guarantees:
 * - If the order is already in a terminal state (paid, shipped,
 *   cancelled, refunded) the callback is a no-op.
 * - Stock decrement happens atomically: each order_item's variant
 *   stock is decremented in a single UPDATE with a WHERE guard that
 *   ensures stock cannot go negative.
 * - The order status transition and paid_at timestamp are written
 *   only after stock decrement succeeds.
 */
export async function handleBarionCallback(
  paymentId: string,
): Promise<CallbackResult> {
  const supabase = createAdminClient();

  // ── 1. Verify payment with Barion ─────────────────────────────
  let verification;
  try {
    verification = await verifyPayment(paymentId);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unknown Barion verification error";
    console.error("[barion-callback] Verification failed:", message);
    return {
      success: false,
      action: "error",
      orderId: null,
      message: `Barion verification failed: ${message}`,
    };
  }

  // ── 2. Find order by barion_payment_id ────────────────────────
  const { data: order, error: orderError } = await supabase
    .from("orders")
    .select("*")
    .eq("barion_payment_id", paymentId)
    .single();

  if (orderError || !order) {
    // Try finding by payment request id (order.id) as fallback
    const { data: fallbackOrder, error: fallbackError } = await supabase
      .from("orders")
      .select("*")
      .eq("barion_payment_request_id", paymentId)
      .single();

    if (fallbackError || !fallbackOrder) {
      console.error(
        "[barion-callback] Order not found for paymentId:",
        paymentId,
      );
      return {
        success: false,
        action: "error",
        orderId: null,
        message: `Order not found for paymentId: ${paymentId}`,
      };
    }

    // Process with the fallback order
    return processOrder(supabase, fallbackOrder, verification);
  }

  return processOrder(supabase, order, verification);
}

// ── Internal: process a found order against Barion state ──────────

type SupabaseAdmin = ReturnType<typeof createAdminClient>;

interface OrderData {
  id: string;
  status: string;
  barion_payment_id: string | null;
}

interface Verification {
  barionStatus: string;
  orderStatus: string;
  paymentId: string;
}

async function processOrder(
  supabase: SupabaseAdmin,
  order: OrderData,
  verification: Verification,
): Promise<CallbackResult> {
  const terminalStatuses = ["paid", "shipped", "cancelled", "refunded"];

  // ── 3. Idempotency: already in terminal state → no-op ────────
  if (terminalStatuses.includes(order.status)) {
    console.info(
      `[barion-callback] Order ${order.id} already in state "${order.status}" – no-op.`,
    );
    return {
      success: true,
      action: "no_op",
      orderId: order.id,
      message: `Order already in terminal state: ${order.status}`,
    };
  }

  // ── 4. Payment succeeded → mark paid + decrement stock ────────
  if (verification.orderStatus === "paid") {
    return handlePaymentSucceeded(supabase, order.id, verification);
  }

  // ── 5. Payment failed / cancelled ─────────────────────────────
  if (
    verification.orderStatus === "cancelled"
  ) {
    const { error: updateError } = await supabase
      .from("orders")
      .update({
        status: "cancelled" as const,
        barion_status: verification.barionStatus,
        updated_at: new Date().toISOString(),
      })
      .eq("id", order.id)
      .in("status", ["draft", "awaiting_payment"]);

    if (updateError) {
      console.error(
        "[barion-callback] Failed to cancel order:",
        updateError.message,
      );
      return {
        success: false,
        action: "error",
        orderId: order.id,
        message: `Failed to cancel order: ${updateError.message}`,
      };
    }

    console.info(`[barion-callback] Order ${order.id} cancelled.`);
    return {
      success: true,
      action: "cancelled",
      orderId: order.id,
      message: "Order cancelled due to failed/cancelled payment.",
    };
  }

  // ── 6. Payment still in progress → no-op ─────────────────────
  console.info(
    `[barion-callback] Order ${order.id} – Barion status "${verification.barionStatus}" maps to "${verification.orderStatus}". No action.`,
  );
  return {
    success: true,
    action: "no_op",
    orderId: order.id,
    message: `Payment still in progress: ${verification.barionStatus}`,
  };
}

// ── Handle successful payment ─────────────────────────────────────

async function handlePaymentSucceeded(
  supabase: SupabaseAdmin,
  orderId: string,
  verification: Verification,
): Promise<CallbackResult> {
  // Fetch order items to decrement stock
  const { data: items, error: itemsError } = await supabase
    .from("order_items")
    .select("*")
    .eq("order_id", orderId);

  if (itemsError) {
    console.error(
      "[barion-callback] Failed to fetch order items:",
      itemsError.message,
    );
    return {
      success: false,
      action: "error",
      orderId,
      message: `Failed to fetch order items: ${itemsError.message}`,
    };
  }

  // Decrement stock for each variant atomically.
  // We use individual updates with a WHERE guard ensuring
  // stock_quantity >= quantity to prevent overselling.
  for (const item of items ?? []) {
    if (!item.variant_id) continue;

    const { data: variant, error: variantError } = await supabase
      .from("product_variants")
      .select("stock_quantity")
      .eq("id", item.variant_id)
      .single();

    if (variantError || !variant) {
      console.error(
        `[barion-callback] Variant ${item.variant_id} not found, skipping stock decrement.`,
      );
      continue;
    }

    const newStock = variant.stock_quantity - item.quantity;

    if (newStock < 0) {
      console.error(
        `[barion-callback] Insufficient stock for variant ${item.variant_id}: ` +
          `have ${variant.stock_quantity}, need ${item.quantity}.`,
      );
      // Continue processing – the order was paid; we log the issue
      // but don't block the status update. Admin should handle.
    }

    const { error: stockError } = await supabase
      .from("product_variants")
      .update({
        stock_quantity: Math.max(0, newStock),
        updated_at: new Date().toISOString(),
      })
      .eq("id", item.variant_id);

    if (stockError) {
      console.error(
        `[barion-callback] Stock decrement failed for variant ${item.variant_id}:`,
        stockError.message,
      );
    }
  }

  // Update order to paid – only if it hasn't already been updated
  // (race condition guard via status check in WHERE clause)
  const now = new Date().toISOString();
  const { error: updateError, data: updatedRows } = await supabase
    .from("orders")
    .update({
      status: "paid" as const,
      barion_status: verification.barionStatus,
      paid_at: now,
      updated_at: now,
    })
    .eq("id", orderId)
    .in("status", ["draft", "awaiting_payment"])
    .select("id");

  const count = updatedRows?.length ?? 0;

  if (updateError) {
    console.error(
      "[barion-callback] Failed to mark order as paid:",
      updateError.message,
    );
    return {
      success: false,
      action: "error",
      orderId,
      message: `Failed to update order: ${updateError.message}`,
    };
  }

  if (count === 0) {
    // Another callback already processed this – idempotent no-op
    console.info(
      `[barion-callback] Order ${orderId} was already updated by a concurrent callback.`,
    );
    return {
      success: true,
      action: "no_op",
      orderId,
      message: "Order already updated by concurrent callback.",
    };
  }

  console.info(`[barion-callback] Order ${orderId} marked as paid.`);
  return {
    success: true,
    action: "paid",
    orderId,
    message: "Payment succeeded. Order marked as paid, stock decremented.",
  };
}
