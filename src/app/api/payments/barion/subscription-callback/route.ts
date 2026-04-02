/* ------------------------------------------------------------------ */
/*  Barion Subscription Callback Route Handler                         */
/*                                                                     */
/*  Barion calls this endpoint via GET with ?paymentId=<uuid>          */
/*  after a subscription payment status change.                        */
/*  Must always return 200 OK to prevent Barion retries.               */
/* ------------------------------------------------------------------ */

import { NextRequest, NextResponse } from "next/server";
import { handleSubscriptionCallback } from "@/lib/actions/subscription-payments";

export async function GET(request: NextRequest): Promise<NextResponse> {
  const paymentId = request.nextUrl.searchParams.get("paymentId");

  if (!paymentId) {
    console.warn("[subscription-callback-route] Callback received without paymentId.");
    return NextResponse.json({ error: "Missing paymentId parameter" }, { status: 200 });
  }

  try {
    const result = await handleSubscriptionCallback(paymentId);

    console.info(
      `[subscription-callback-route] Processed: action=${result.action}, subscriptionId=${result.subscriptionId}`,
    );

    return NextResponse.json(
      {
        success: result.success,
        action: result.action,
        message: result.message,
      },
      { status: 200 },
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected callback error";
    console.error("[subscription-callback-route] Unhandled error:", message);

    return NextResponse.json({ success: false, error: message }, { status: 200 });
  }
}
