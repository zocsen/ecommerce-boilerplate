/* ------------------------------------------------------------------ */
/*  Email Sending Actions                                              */
/*                                                                     */
/*  Server-side functions that fetch data, render templates, and       */
/*  send emails via the email provider.                                */
/* ------------------------------------------------------------------ */

"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { sendEmail } from "@/lib/integrations/email/provider";
import { getFullFromAddress, getRecipient, getReplyToEmail } from "@/lib/integrations/email/sender";
import {
  renderOrderReceiptEmail,
  renderShippingUpdateEmail,
  renderAbandonedCartEmail,
  renderNewsletterEmail,
  renderSignupConfirmationEmail,
  renderWelcomeEmail,
  renderAdminOrderNotificationEmail,
} from "@/lib/integrations/email/templates";
import type { NewsletterContent } from "@/lib/integrations/email/templates";
import { signUnsubscribeToken } from "@/lib/security/unsubscribe-token";
import { siteConfig } from "@/lib/config/site.config";

// ── Result type ───────────────────────────────────────────────────

export interface EmailActionResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

// ── 1. Send Order Receipt ─────────────────────────────────────────

export async function sendReceipt(orderId: string): Promise<EmailActionResult> {
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
  const html = await renderOrderReceiptEmail(order, items);
  const replyTo = getReplyToEmail();
  const result = await sendEmail({
    to: getRecipient(order.email),
    from: getFullFromAddress("transactional", siteConfig.store.name),
    subject: `Rendelés visszaigazolás – ${order.id.slice(0, 8).toUpperCase()}`,
    html,
    ...(replyTo ? { replyTo } : {}),
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
    console.error("[email-actions] sendShippingUpdate – order fetch failed:", message);
    return { success: false, error: message };
  }

  const html = await renderShippingUpdateEmail(order, trackingCode);
  const replyTo = getReplyToEmail();
  const result = await sendEmail({
    to: getRecipient(order.email),
    from: getFullFromAddress("transactional", siteConfig.store.name),
    subject: `Csomagod úton van! – ${order.id.slice(0, 8).toUpperCase()}`,
    html,
    ...(replyTo ? { replyTo } : {}),
    tags: [
      { name: "type", value: "shipping" },
      { name: "order_id", value: orderId },
    ],
  });

  if (!result.success) {
    console.error("[email-actions] sendShippingUpdate – send failed:", result.error);
  }

  return {
    success: result.success,
    messageId: result.messageId,
    error: result.error,
  };
}

// ── 3. Send Abandoned Cart Email ─────────────────────────────────

export async function sendAbandonedCartEmail(orderId: string): Promise<EmailActionResult> {
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
    console.error("[email-actions] sendAbandonedCartEmail – order fetch failed:", message);
    return { success: false, error: message };
  }

  // Fetch order items with product info for images
  const { data: items, error: itemsError } = await supabase
    .from("order_items")
    .select("*, products(main_image_url)")
    .eq("order_id", orderId);

  if (itemsError || !items) {
    const message = itemsError?.message ?? "Order items not found";
    console.error("[email-actions] sendAbandonedCartEmail – items fetch failed:", message);
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

  const html = await renderAbandonedCartEmail(order.email, cartItems);
  const result = await sendEmail({
    to: getRecipient(order.email),
    from: getFullFromAddress("marketing", siteConfig.store.name),
    subject: "Termékek várnak a kosaradban!",
    html,
    tags: [
      { name: "type", value: "abandoned_cart" },
      { name: "order_id", value: orderId },
    ],
  });

  if (!result.success) {
    console.error("[email-actions] sendAbandonedCartEmail – send failed:", result.error);
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

/**
 * Render a newsletter email preview as HTML.
 * Used by the admin campaign builder to show a live preview before sending.
 */
export async function renderNewsletterPreview(
  content: NewsletterContent,
): Promise<{ success: boolean; html?: string; error?: string }> {
  try {
    const html = await renderNewsletterEmail(content, "preview-token");
    return { success: true, html };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[email-actions] renderNewsletterPreview failed:", message);
    return { success: false, error: message };
  }
}

export async function sendNewsletterCampaign(
  to: string[],
  subject: string,
  content: NewsletterContent,
): Promise<NewsletterCampaignResult> {
  if (to.length === 0) {
    return { totalSent: 0, totalFailed: 0, errors: [] };
  }

  // Generate a unique unsubscribe token per recipient and render individual HTML.
  // This is required so each unsubscribe link carries a signed token for that specific email.
  const marketingFrom = getFullFromAddress("marketing", siteConfig.store.name);

  const sends = await Promise.allSettled(
    to.map(async (email) => {
      const token = await signUnsubscribeToken(email);
      const html = await renderNewsletterEmail(content, token);
      return sendEmail({
        to: getRecipient(email),
        from: marketingFrom,
        subject,
        html,
        tags: [{ name: "type", value: "newsletter" }],
      });
    }),
  );

  let totalSent = 0;
  let totalFailed = 0;
  const errors: string[] = [];

  for (const settled of sends) {
    if (settled.status === "rejected") {
      totalFailed++;
      errors.push(
        settled.reason instanceof Error ? settled.reason.message : String(settled.reason),
      );
    } else if (settled.value.success) {
      totalSent++;
    } else {
      totalFailed++;
      if (settled.value.error) {
        errors.push(settled.value.error);
      }
    }
  }

  if (totalFailed > 0) {
    console.warn(`[email-actions] Newsletter campaign: ${totalSent} sent, ${totalFailed} failed.`);
  }

  return { totalSent, totalFailed, errors };
}

// ── 5. Send Signup Confirmation ───────────────────────────────────

export async function sendSignupConfirmationEmail(params: {
  to: string;
  name: string;
}): Promise<EmailActionResult> {
  if (!siteConfig.email.sendSignupConfirmation) {
    return { success: true };
  }

  try {
    const html = await renderSignupConfirmationEmail(params.name);
    const result = await sendEmail({
      to: getRecipient(params.to),
      from: getFullFromAddress("transactional", siteConfig.store.name),
      subject: `Sikeres regisztráció – ${siteConfig.store.name}`,
      html,
      tags: [{ name: "type", value: "signup_confirmation" }],
    });

    if (!result.success) {
      console.error("[email-actions] sendSignupConfirmationEmail – send failed:", result.error);
    }

    return result;
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[email-actions] sendSignupConfirmationEmail – error:", message);
    return { success: false, error: message };
  }
}

// ── 6. Send Welcome Email ─────────────────────────────────────────

export async function sendWelcomeEmail(params: {
  to: string;
  name: string;
}): Promise<EmailActionResult> {
  if (!siteConfig.email.sendWelcomeEmail) {
    return { success: true };
  }

  try {
    const html = await renderWelcomeEmail(params.name);
    const result = await sendEmail({
      to: getRecipient(params.to),
      from: getFullFromAddress("transactional", siteConfig.store.name),
      subject: `Üdvözlünk a ${siteConfig.store.name} webáruházban!`,
      html,
      tags: [{ name: "type", value: "welcome" }],
    });

    if (!result.success) {
      console.error("[email-actions] sendWelcomeEmail – send failed:", result.error);
    }

    return result;
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[email-actions] sendWelcomeEmail – error:", message);
    return { success: false, error: message };
  }
}

// ── 7. Send Admin Order Notification ─────────────────────────────

export async function sendAdminOrderNotification(params: {
  orderId: string;
  orderNumber: string;
  customerName: string;
  customerEmail: string;
  itemCount: number;
  total: number;
  shippingMethod: string;
  paymentMethod?: string;
}): Promise<EmailActionResult> {
  if (!siteConfig.email.sendAdminOrderNotification) {
    return { success: true };
  }

  const recipients = siteConfig.email.adminNotificationRecipients;
  if (recipients.length === 0) {
    console.warn("[email-actions] sendAdminOrderNotification – no recipients configured.");
    return { success: true };
  }

  try {
    const html = await renderAdminOrderNotificationEmail(params);
    const result = await sendEmail({
      to: recipients,
      from: getFullFromAddress("transactional", siteConfig.store.name),
      subject: `Új rendelés: ${params.orderNumber} — ${params.customerName}`,
      html,
      tags: [
        { name: "type", value: "admin_order_notification" },
        { name: "order_id", value: params.orderId },
      ],
    });

    if (!result.success) {
      console.error("[email-actions] sendAdminOrderNotification – send failed:", result.error);
    }

    return result;
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[email-actions] sendAdminOrderNotification – error:", message);
    return { success: false, error: message };
  }
}
