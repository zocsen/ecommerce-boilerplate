/* ------------------------------------------------------------------ */
/*  Resend Webhook Handlers                                           */
/*                                                                     */
/*  Processes email events from Resend (bounces, complaints, opens,    */
/*  clicks, delivered) to maintain data integrity and manage           */
/*  subscriber status.                                                 */
/*                                                                     */
/*  Setup in Resend Dashboard:                                        */
/*    Endpoint: https://yourdomain.com/api/email/webhook/resend       */
/*    Events: email.bounced, email.complained, email.delivered, etc.  */
/* ------------------------------------------------------------------ */

import { createAdminClient } from "@/lib/supabase/admin";
import { logAudit } from "@/lib/security/logger";

// ── Types ──────────────────────────────────────────────────────────

export type ResendEventType =
  | "email.sent"
  | "email.delivered"
  | "email.bounced"
  | "email.complained"
  | "email.opened"
  | "email.clicked";

export interface ResendWebhookEvent {
  type: ResendEventType;
  created_at: string;
  data: {
    email_id: string;
    to?: string[];
    from?: string;
    subject?: string;
    reason?: string; // For bounces/complaints
    tags?: Record<string, string>;
  };
}

// ── Webhook Signature Verification ─────────────────────────────────

/**
 * Verify Resend webhook signature.
 *
 * Resend signs webhooks with HMAC-SHA256.
 * The signature is provided in the X-Resend-Signature header.
 */
export async function verifyWebhookSignature(
  body: string,
  signature: string,
  secret: string,
): Promise<boolean> {
  try {
    const crypto = await import("crypto");
    const hmac = crypto.createHmac("sha256", secret);
    const computed = hmac.update(body).digest("base64");

    // Constant-time comparison to prevent timing attacks
    return crypto.timingSafeEqual(
      Buffer.from(computed),
      Buffer.from(signature),
    );
  } catch (error) {
    console.error("[webhook] Signature verification failed", { error });
    return false;
  }
}

// ── Event Handlers ─────────────────────────────────────────────────

/**
 * Handle bounce events.
 *
 * Bounces indicate the email was rejected by the recipient's mail server.
 * Hard bounces (invalid address) mark the subscriber as 'bounced'.
 * Soft bounces increment the bounce count for monitoring.
 */
export async function handleBounce(event: ResendWebhookEvent): Promise<void> {
  const email = event.data.to?.[0];
  const reason = event.data.reason || "unknown";

  if (!email) {
    console.warn("[webhook] Bounce event missing recipient email", { event });
    return;
  }

  const supabase = createAdminClient();

  const isSoftBounce =
    reason.includes("soft") || reason.includes("temporary");

  if (isSoftBounce) {
    console.log("[webhook] Soft bounce recorded", { email, reason });

    // Increment bounce count for monitoring; too many soft bounces
    // may warrant manual review. Supabase JS doesn't support column
    // increment natively, so we fetch-then-update.
    const { data: sub } = await supabase
      .from("subscribers")
      .select("id, bounce_count")
      .eq("email", email)
      .single();

    if (sub) {
      await supabase
        .from("subscribers")
        .update({ bounce_count: sub.bounce_count + 1 })
        .eq("id", sub.id);
    }
  } else {
    console.log("[webhook] Hard bounce, marking subscriber as bounced", {
      email,
      reason,
    });

    const { error } = await supabase
      .from("subscribers")
      .update({ status: "bounced" })
      .eq("email", email);

    if (error) {
      console.error("[webhook] Failed to update subscriber on bounce", {
        email,
        error,
      });
    }

    // Audit log for hard bounces
    await logAudit({
      actorId: null,
      actorRole: null,
      action: "subscriber.bounced",
      entityType: "subscriber",
      entityId: null,
      metadata: {
        email,
        reason,
        event_type: event.type,
        email_id: event.data.email_id,
      },
    });
  }
}

/**
 * Handle complaint events.
 *
 * Complaints indicate the recipient marked the email as spam.
 * Always mark as 'complained' to preserve the reason and prevent
 * future sends.
 */
export async function handleComplaint(
  event: ResendWebhookEvent,
): Promise<void> {
  const email = event.data.to?.[0];

  if (!email) {
    console.warn("[webhook] Complaint event missing recipient email", {
      event,
    });
    return;
  }

  const supabase = createAdminClient();

  console.warn("[webhook] Complaint received, marking as complained", {
    email,
  });

  const { error } = await supabase
    .from("subscribers")
    .update({
      status: "complained",
      unsubscribed_at: new Date().toISOString(),
    })
    .eq("email", email);

  if (error) {
    console.error("[webhook] Failed to update subscriber on complaint", {
      email,
      error,
    });
  }

  // Audit log for complaints — important for deliverability monitoring
  await logAudit({
    actorId: null,
    actorRole: null,
    action: "subscriber.complained",
    entityType: "subscriber",
    entityId: null,
    metadata: {
      email,
      reason: event.data.reason ?? "spam_complaint",
      event_type: event.type,
      email_id: event.data.email_id,
    },
  });
}

/**
 * Handle delivered events.
 *
 * Successful delivery confirmation from the recipient's mail server.
 */
export async function handleDelivered(
  event: ResendWebhookEvent,
): Promise<void> {
  const email = event.data.to?.[0];

  if (!email) {
    console.warn("[webhook] Delivered event missing recipient email", {
      event,
    });
    return;
  }

  console.debug("[webhook] Email delivered", { email });
}

/**
 * Handle opened events.
 *
 * Track engagement: update last_opened_at and increment open_count
 * for subscriber segmentation.
 */
export async function handleOpened(event: ResendWebhookEvent): Promise<void> {
  const email = event.data.to?.[0];

  if (!email) {
    console.debug("[webhook] Opened event missing recipient email");
    return;
  }

  const supabase = createAdminClient();

  // Fetch current open_count then increment
  const { data: sub } = await supabase
    .from("subscribers")
    .select("id, open_count")
    .eq("email", email)
    .single();

  if (sub) {
    await supabase
      .from("subscribers")
      .update({
        last_opened_at: new Date().toISOString(),
        open_count: sub.open_count + 1,
      })
      .eq("id", sub.id);
  }

  console.debug("[webhook] Email opened", { email, tags: event.data.tags });
}

/**
 * Handle clicked events.
 *
 * Track engagement: update last_clicked_at and increment click_count
 * for subscriber segmentation.
 */
export async function handleClicked(event: ResendWebhookEvent): Promise<void> {
  const email = event.data.to?.[0];

  if (!email) {
    console.debug("[webhook] Clicked event missing recipient email");
    return;
  }

  const supabase = createAdminClient();

  // Fetch current click_count then increment
  const { data: sub } = await supabase
    .from("subscribers")
    .select("id, click_count")
    .eq("email", email)
    .single();

  if (sub) {
    await supabase
      .from("subscribers")
      .update({
        last_clicked_at: new Date().toISOString(),
        click_count: sub.click_count + 1,
      })
      .eq("id", sub.id);
  }

  console.debug("[webhook] Email link clicked", {
    email,
    tags: event.data.tags,
  });
}

// ── Main Event Router ──────────────────────────────────────────────

/**
 * Route webhook events to appropriate handlers.
 */
export async function handleWebhookEvent(
  event: ResendWebhookEvent,
): Promise<void> {
  try {
    switch (event.type) {
      case "email.bounced":
        await handleBounce(event);
        break;

      case "email.complained":
        await handleComplaint(event);
        break;

      case "email.delivered":
        await handleDelivered(event);
        break;

      case "email.opened":
        await handleOpened(event);
        break;

      case "email.clicked":
        await handleClicked(event);
        break;

      case "email.sent":
        console.debug("[webhook] Email sent", { event });
        break;

      default:
        console.warn("[webhook] Unknown event type", { type: event.type });
    }
  } catch (error) {
    console.error("[webhook] Event handler error", { error, event });
    throw error;
  }
}

// ── Utilities ──────────────────────────────────────────────────────

/**
 * Extract useful metadata from webhook event.
 * Useful for debugging and audit logging.
 */
export function getEventMetadata(
  event: ResendWebhookEvent,
): Record<string, unknown> {
  return {
    type: event.type,
    email_id: event.data.email_id,
    recipient: event.data.to?.[0],
    from: event.data.from,
    subject: event.data.subject,
    tags: event.data.tags,
    created_at: event.created_at,
    reason: event.data.reason,
  };
}
