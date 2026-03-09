/* ------------------------------------------------------------------ */
/*  Email Sending Actions                                              */
/*                                                                     */
/*  Server-side functions that fetch data, render templates, and       */
/*  send emails via the email provider.                                */
/* ------------------------------------------------------------------ */

"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { sendEmail, sendBatchEmail } from "@/lib/integrations/email/provider";
import {
  renderOrderReceiptEmail,
  renderShippingUpdateEmail,
  renderAbandonedCartEmail,
  renderNewsletterEmail,
} from "@/lib/integrations/email/templates";
import type { NewsletterContent } from "@/lib/integrations/email/templates";

// ── Result type ───────────────────────────────────────────────────

export interface EmailActionResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

// ── 1. Send Order Receipt ─────────────────────────────────────────

export async function sendReceipt(
  orderId: string,
): Promise<EmailActionResult> {
  const supabase = createAdminClient();

  // Fetch order
  const { data: order, error: orderError } = await supabase
    .from("orders")
    .select("*")
    .eq("id", orderId)
    .single();

  if (orderError || !order) {
    const message = orderError?.message ?? "Order not found";
    console.error("[email-actions] sendReceipt – order fetch failed:", message);
    return { success: false, error: message };
  }

  // Fetch order items
  const { data: items, error: itemsError } = await supabase
    .from("order_items")
    .select("*")
    .eq("order_id", orderId);

  if (itemsError || !items) {
    const message = itemsError?.message ?? "Order items not found";
    console.error("[email-actions] sendReceipt – items fetch failed:", message);
    return { success: false, error: message };
  }

  // Render and send
  const html = renderOrderReceiptEmail(order, items);
  const result = await sendEmail({
    to: order.email,
    subject: `Rendelés visszaigazolás – ${order.id.slice(0, 8).toUpperCase()}`,
    html,
    tags: [
      { name: "type", value: "receipt" },
      { name: "order_id", value: orderId },
    ],
  });

  if (!result.success) {
    console.error("[email-actions] sendReceipt – send failed:", result.error);
  }

  return {
    success: result.success,
    messageId: result.messageId,
    error: result.error,
  };
}

// ── 2. Send Shipping Update ──────────────────────────────────────

export async function sendShippingUpdate(
  orderId: string,
  trackingCode?: string,
): Promise<EmailActionResult> {
  const supabase = createAdminClient();

  const { data: order, error: orderError } = await supabase
    .from("orders")
    .select("*")
    .eq("id", orderId)
    .single();

  if (orderError || !order) {
    const message = orderError?.message ?? "Order not found";
    console.error(
      "[email-actions] sendShippingUpdate – order fetch failed:",
      message,
    );
    return { success: false, error: message };
  }

  const html = renderShippingUpdateEmail(order, trackingCode);
  const result = await sendEmail({
    to: order.email,
    subject: `Csomagod úton van! – ${order.id.slice(0, 8).toUpperCase()}`,
    html,
    tags: [
      { name: "type", value: "shipping" },
      { name: "order_id", value: orderId },
    ],
  });

  if (!result.success) {
    console.error(
      "[email-actions] sendShippingUpdate – send failed:",
      result.error,
    );
  }

  return {
    success: result.success,
    messageId: result.messageId,
    error: result.error,
  };
}

// ── 3. Send Abandoned Cart Email ─────────────────────────────────

export async function sendAbandonedCartEmail(
  orderId: string,
): Promise<EmailActionResult> {
  const supabase = createAdminClient();

  // Fetch the draft/awaiting_payment order
  const { data: order, error: orderError } = await supabase
    .from("orders")
    .select("*")
    .eq("id", orderId)
    .in("status", ["draft", "awaiting_payment"])
    .single();

  if (orderError || !order) {
    const message = orderError?.message ?? "Abandoned order not found";
    console.error(
      "[email-actions] sendAbandonedCartEmail – order fetch failed:",
      message,
    );
    return { success: false, error: message };
  }

  // Fetch order items with product info for images
  const { data: items, error: itemsError } = await supabase
    .from("order_items")
    .select("*, products(main_image_url)")
    .eq("order_id", orderId);

  if (itemsError || !items) {
    const message = itemsError?.message ?? "Order items not found";
    console.error(
      "[email-actions] sendAbandonedCartEmail – items fetch failed:",
      message,
    );
    return { success: false, error: message };
  }

  // Transform to abandoned cart item format
  const cartItems = items.map((item) => {
    // The joined products data comes as a nested object
    const productData = item.products as { main_image_url: string | null } | null;
    return {
      title: item.title_snapshot,
      price: item.line_total,
      image: productData?.main_image_url ?? undefined,
    };
  });

  const html = renderAbandonedCartEmail(order.email, cartItems);
  const result = await sendEmail({
    to: order.email,
    subject: "Termékek várnak a kosaradban!",
    html,
    tags: [
      { name: "type", value: "abandoned_cart" },
      { name: "order_id", value: orderId },
    ],
  });

  if (!result.success) {
    console.error(
      "[email-actions] sendAbandonedCartEmail – send failed:",
      result.error,
    );
  }

  return {
    success: result.success,
    messageId: result.messageId,
    error: result.error,
  };
}

// ── 4. Send Newsletter Campaign ──────────────────────────────────

export interface NewsletterCampaignResult {
  totalSent: number;
  totalFailed: number;
  errors: string[];
}

export async function sendNewsletterCampaign(
  to: string[],
  subject: string,
  content: NewsletterContent,
): Promise<NewsletterCampaignResult> {
  if (to.length === 0) {
    return { totalSent: 0, totalFailed: 0, errors: [] };
  }

  const html = renderNewsletterEmail(content);

  const results = await sendBatchEmail({
    to,
    subject,
    html,
    tags: [{ name: "type", value: "newsletter" }],
  });

  let totalSent = 0;
  let totalFailed = 0;
  const errors: string[] = [];

  for (const result of results) {
    if (result.success) {
      totalSent++;
    } else {
      totalFailed++;
      if (result.error) {
        errors.push(result.error);
      }
    }
  }

  if (totalFailed > 0) {
    console.warn(
      `[email-actions] Newsletter campaign: ${totalSent} sent, ${totalFailed} failed.`,
    );
  }

  return { totalSent, totalFailed, errors };
}
