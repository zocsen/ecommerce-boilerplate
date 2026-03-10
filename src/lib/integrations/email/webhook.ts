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
 * Hard bounces (invalid address) should prevent future sends.
 * Soft bounces may be retried.
 */
export async function handleBounce(event: ResendWebhookEvent): Promise<void> {
  const email = event.data.to?.[0];
  const reason = event.data.reason || "unknown";
  
  if (!email) {
    console.warn("[webhook] Bounce event missing recipient email", { event });
    return;
  }
  
  const supabase = createAdminClient();
  
  // Mark subscriber as bounced (hard bounce = invalid)
  const isSoftBounce = reason.includes("soft") || reason.includes("temporary");
  
  if (isSoftBounce) {
    console.log("[webhook] Soft bounce recorded", { email, reason });
    // Optionally: increment bounce count, retry later
  } else {
    console.log("[webhook] Hard bounce, disabling subscriber", { email });
    
    // Disable this subscriber from marketing sends
    // Note: Update to "unsubscribed" since "bounced" status is not yet in schema
    // Consider adding "bounced" | "complained" status to subscribers table in future migration
    const { error } = await supabase
      .from("subscribers")
      .update({ status: "unsubscribed" })
      .eq("email", email);
    
    if (error) {
      console.error("[webhook] Failed to update subscriber on bounce", {
        email,
        error,
      });
    }
  }
}

/**
 * Handle complaint events.
 * 
 * Complaints indicate the recipient marked the email as spam.
 * Always disable future sends to this address.
 */
export async function handleComplaint(event: ResendWebhookEvent): Promise<void> {
  const email = event.data.to?.[0];
  
  if (!email) {
    console.warn("[webhook] Complaint event missing recipient email", { event });
    return;
  }
  
  const supabase = createAdminClient();
  
  console.warn("[webhook] Complaint received, unsubscribing", { email });
  
  // Immediately unsubscribe
  const { error } = await supabase
    .from("subscribers")
    .update({
      status: "unsubscribed",
      unsubscribed_at: new Date().toISOString(),
    })
    .eq("email", email);
  
  if (error) {
    console.error("[webhook] Failed to unsubscribe on complaint", {
      email,
      error,
    });
  }
}

/**
 * Handle delivered events.
 * 
 * Optional: log successful deliveries for analytics.
 */
export async function handleDelivered(event: ResendWebhookEvent): Promise<void> {
  const email = event.data.to?.[0];
  
  if (!email) {
    console.warn("[webhook] Delivered event missing recipient email", { event });
    return;
  }
  
  console.debug("[webhook] Email delivered", { email });
  
  // Optional: update delivery timestamp in orders or audit logs
  // Most users skip this as Resend dashboard provides analytics
}

/**
 * Handle opened events.
 * 
 * Optional: track engagement for segmentation and insights.
 */
export async function handleOpened(event: ResendWebhookEvent): Promise<void> {
  // Example: Update subscriber engagement metrics
  // For now, just log for monitoring
  console.debug("[webhook] Email opened", {
    email: event.data.to?.[0],
    tags: event.data.tags,
  });
}

/**
 * Handle clicked events.
 * 
 * Optional: track link clicks for insights.
 */
export async function handleClicked(event: ResendWebhookEvent): Promise<void> {
  console.debug("[webhook] Email link clicked", {
    email: event.data.to?.[0],
    tags: event.data.tags,
  });
}

// ── Main Event Router ──────────────────────────────────────────────

/**
 * Route webhook events to appropriate handlers.
 */
export async function handleWebhookEvent(event: ResendWebhookEvent): Promise<void> {
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
export function getEventMetadata(event: ResendWebhookEvent): Record<string, unknown> {
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
