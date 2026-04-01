/* ------------------------------------------------------------------ */
/*  Barion Callback Route Handler                                      */
/*                                                                     */
/*  Barion calls this endpoint via GET with ?paymentId=<uuid>          */
/*  after a payment status change. Must always return 200 OK.          */
/* ------------------------------------------------------------------ */

import { NextRequest, NextResponse } from "next/server";
import { handleBarionCallback } from "@/lib/integrations/barion/callback";

export async function GET(request: NextRequest): Promise<NextResponse> {
  const paymentId = request.nextUrl.searchParams.get("paymentId");

  if (!paymentId) {
    console.warn("[barion-route] Callback received without paymentId.");
    // Barion expects 200 even on errors to avoid retries
    return NextResponse.json({ error: "Missing paymentId parameter" }, { status: 200 });
  }

  try {
    const result = await handleBarionCallback(paymentId);

    console.info(
      `[barion-route] Callback processed: action=${result.action}, orderId=${result.orderId}`,
    );

    // Always return 200 to Barion regardless of outcome.
    // Non-200 causes Barion to retry the callback.
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
    console.error("[barion-route] Unhandled callback error:", message);

    // Return 200 even on unexpected errors – Barion retries on non-200
    return NextResponse.json({ success: false, error: message }, { status: 200 });
  }
}
