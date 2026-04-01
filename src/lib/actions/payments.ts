"use server";

/* ------------------------------------------------------------------ */
/*  Payment server actions                                             */
/* ------------------------------------------------------------------ */

import { createAdminClient } from "@/lib/supabase/admin";
import { uuidSchema } from "@/lib/validators/uuid";
import { startPayment as startBarionPayment } from "@/lib/integrations/barion/client";
import type { OrderRow, OrderItemRow } from "@/lib/types/database";

interface ActionResult<T = undefined> {
  success: boolean;
  data?: T;
  error?: string;
}

interface StartPaymentData {
  gatewayUrl: string;
  paymentId: string;
}

/**
 * Start a Barion payment for the given order.
 *
 * 1. Fetches order + items
 * 2. Validates the order is in a payable state
 * 3. Calls Barion startPayment
 * 4. Updates order with barion_payment_id and barion_payment_request_id
 * 5. Returns the gateway redirect URL
 */
export async function startPaymentAction(orderId: string): Promise<ActionResult<StartPaymentData>> {
  try {
    const idParsed = uuidSchema.safeParse(orderId);
    if (!idParsed.success) {
      return { success: false, error: "Érvénytelen rendelés azonosító." };
    }

    const admin = createAdminClient();

    // Fetch the order
    const { data: order, error: orderError } = await admin
      .from("orders")
      .select("*")
      .eq("id", idParsed.data)
      .single();

    if (orderError || !order) {
      return { success: false, error: "A rendelés nem található." };
    }

    // Validate order is in a payable state
    if (order.status !== "awaiting_payment" && order.status !== "draft") {
      return {
        success: false,
        error: "Ez a rendelés már nem fizethető.",
      };
    }

    // COD orders should never reach Barion
    if (order.payment_method === "cod") {
      return {
        success: false,
        error: "Utánvétes rendeléshez nem szükséges online fizetés.",
      };
    }

    // If already has a Barion payment, return the existing gateway URL
    if (order.barion_payment_id) {
      return {
        success: false,
        error: "A fizetés már elindításra került ehhez a rendeléshez.",
      };
    }

    // Fetch order items
    const { data: items, error: itemsError } = await admin
      .from("order_items")
      .select("*")
      .eq("order_id", order.id)
      .order("id", { ascending: true });

    if (itemsError || !items || items.length === 0) {
      return { success: false, error: "A rendelési tételek nem találhatóak." };
    }

    // Start Barion payment
    const barionResult = await startBarionPayment(order as OrderRow, items as OrderItemRow[]);

    // Update order with Barion payment details
    const { error: updateError } = await admin
      .from("orders")
      .update({
        barion_payment_id: barionResult.paymentId,
        barion_payment_request_id: order.id,
        barion_status: "Prepared",
        updated_at: new Date().toISOString(),
      })
      .eq("id", order.id);

    if (updateError) {
      console.error(
        "[startPaymentAction] Failed to update order with Barion IDs:",
        updateError.message,
      );
      // Payment was started but we failed to record it — still return the URL
    }

    return {
      success: true,
      data: {
        gatewayUrl: barionResult.gatewayUrl,
        paymentId: barionResult.paymentId,
      },
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[startPaymentAction] Unexpected error:", message);
    return {
      success: false,
      error: "Hiba történt a fizetés indításakor. Kérlek, próbáld újra.",
    };
  }
}
