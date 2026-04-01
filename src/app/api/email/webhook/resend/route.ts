/* ------------------------------------------------------------------ */
/*  Resend Webhook Route Handler                                      */
/*                                                                     */
/*  Receives and processes email events from Resend.                   */
/*  Endpoint: POST /api/email/webhook/resend                           */
/*                                                                     */
/*  Configure in Resend Dashboard:                                    */
/*    https://yourdomain.com/api/email/webhook/resend                 */
/* ------------------------------------------------------------------ */

import { NextRequest, NextResponse } from "next/server";
import {
  verifyWebhookSignature,
  handleWebhookEvent,
  getEventMetadata,
  type ResendWebhookEvent,
} from "@/lib/integrations/email/webhook";

/**
 * Handle incoming Resend webhooks.
 *
 * Requirements:
 * 1. Set RESEND_WEBHOOK_SECRET in environment
 * 2. Configure webhook in Resend Dashboard
 * 3. Make endpoint publicly accessible
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    // Get webhook secret from environment
    const secret = process.env.RESEND_WEBHOOK_SECRET;
    if (!secret) {
      console.error("[webhook] RESEND_WEBHOOK_SECRET not configured. Ignoring webhook.");
      return NextResponse.json({ error: "Webhook not configured" }, { status: 400 });
    }

    // Read request body as text for signature verification
    const body = await request.text();
    const signature = request.headers.get("X-Resend-Signature") || "";

    // Verify webhook signature
    const isValid = await verifyWebhookSignature(body, signature, secret);
    if (!isValid) {
      console.warn("[webhook] Invalid signature. Rejecting webhook.");
      return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
    }

    // Parse event
    let event: ResendWebhookEvent;
    try {
      event = JSON.parse(body) as ResendWebhookEvent;
    } catch (err) {
      console.error("[webhook] Failed to parse webhook body", { error: err });
      return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
    }

    // Log event for debugging
    console.log("[webhook] Received event:", {
      ...getEventMetadata(event),
    });

    // Route to handler
    try {
      await handleWebhookEvent(event);
    } catch (error) {
      console.error("[webhook] Handler error", {
        error,
        event: event.type,
      });
      // Still return 200 to acknowledge receipt
      // Resend will retry if we return 5xx
    }

    // Acknowledge webhook (return 200 immediately)
    return NextResponse.json({ status: "received" });
  } catch (error) {
    console.error("[webhook] Unexpected error", { error });
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

/**
 * Optional: expose webhook configuration info for debugging
 * Remove in production for security.
 */
export async function GET(_request: NextRequest): Promise<NextResponse> {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json({
    endpoint: "/api/email/webhook/resend",
    configured: !!process.env.RESEND_WEBHOOK_SECRET,
    events: [
      "email.sent",
      "email.delivered",
      "email.bounced",
      "email.complained",
      "email.opened",
      "email.clicked",
    ],
    docs: "https://resend.com/docs/webhooks",
  });
}
