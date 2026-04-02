/* ------------------------------------------------------------------ */
/*  Subscription Renewal Cron Route                                    */
/*                                                                     */
/*  Called by a cron job (e.g., Vercel Cron, Supabase Edge Function,   */
/*  or external scheduler) to process all subscriptions due for        */
/*  renewal.                                                           */
/*                                                                     */
/*  Authentication: Requires CRON_SECRET header to prevent             */
/*  unauthorized invocations.                                          */
/*                                                                     */
/*  Recommended schedule: Every hour (to catch renewals promptly).     */
/* ------------------------------------------------------------------ */

import { NextRequest, NextResponse } from "next/server";
import {
  findSubscriptionsDueForRenewal,
  processSubscriptionRenewal,
} from "@/lib/actions/subscription-payments";

/**
 * Verify the cron secret from the request headers.
 * Set CRON_SECRET in environment variables.
 */
function verifyCronSecret(request: NextRequest): boolean {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) {
    console.warn("[cron:renewals] CRON_SECRET not set — rejecting request.");
    return false;
  }

  const authHeader = request.headers.get("authorization");
  if (!authHeader) return false;

  // Support both "Bearer <secret>" and raw "<secret>"
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : authHeader;

  return token === cronSecret;
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  // Verify authentication
  if (!verifyCronSecret(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // Find subscriptions due for renewal
    const dueResult = await findSubscriptionsDueForRenewal();

    if (!dueResult.success || !dueResult.data) {
      return NextResponse.json(
        { error: dueResult.error ?? "Hiba a megújítandó előfizetések keresésében." },
        { status: 500 },
      );
    }

    const subscriptionIds = dueResult.data;

    if (subscriptionIds.length === 0) {
      return NextResponse.json({
        success: true,
        message: "Nincs megújítandó előfizetés.",
        processed: 0,
      });
    }

    console.info(
      `[cron:renewals] Processing ${subscriptionIds.length} subscription(s) for renewal.`,
    );

    // Process each renewal sequentially to avoid overwhelming Barion
    const results: Array<{
      subscriptionId: string;
      status: string;
      invoiceId?: string;
      error?: string;
    }> = [];

    for (const subscriptionId of subscriptionIds) {
      const result = await processSubscriptionRenewal(subscriptionId);

      results.push({
        subscriptionId,
        status: result.success ? (result.data?.status ?? "unknown") : "error",
        invoiceId: result.data?.invoiceId,
        error: result.error,
      });

      // Small delay between charges to be nice to Barion
      await new Promise((resolve) => setTimeout(resolve, 500));
    }

    const charged = results.filter((r) => r.status === "charged").length;
    const failed = results.filter((r) => r.status === "failed").length;
    const skipped = results.filter((r) => r.status === "skipped").length;
    const errors = results.filter((r) => r.status === "error").length;

    console.info(
      `[cron:renewals] Done. Charged: ${charged}, Failed: ${failed}, Skipped: ${skipped}, Errors: ${errors}`,
    );

    return NextResponse.json({
      success: true,
      message: `Megújítás feldolgozva: ${subscriptionIds.length} előfizetés.`,
      processed: subscriptionIds.length,
      summary: { charged, failed, skipped, errors },
      results,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected renewal error";
    console.error("[cron:renewals] Unhandled error:", message);

    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
