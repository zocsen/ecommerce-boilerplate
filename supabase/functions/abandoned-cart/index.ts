// Supabase Edge Function: abandoned-cart
// Scheduled cron – runs every 30 minutes via supabase/config.toml.
//
// Logic:
//   1. Check ENABLE_ABANDONED_CART env var (mirrors site.config features.enableAbandonedCart).
//   2. Find orders with status IN ('draft','awaiting_payment') that:
//      - were last updated more than 2 hours ago
//      - have NOT already had an abandoned cart email sent (abandoned_cart_sent_at IS NULL)
//      - have a non-empty email address
//   3. For each such order, POST to the Next.js /api/email/abandoned-cart route handler
//      which calls sendAbandonedCartEmail(). This keeps the Resend API key out of the
//      Edge Function environment.
//   4. On success, stamp abandoned_cart_sent_at = NOW() to prevent re-sends.

import { createClient } from "jsr:@supabase/supabase-js@2";

const ENABLE_ABANDONED_CART =
  (Deno.env.get("ENABLE_ABANDONED_CART") ?? "true") === "true";
const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SUPABASE_SERVICE_ROLE_KEY =
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const SITE_URL = Deno.env.get("SITE_URL") ?? "";
const CRON_SECRET = Deno.env.get("CRON_SECRET") ?? "";

Deno.serve(async (_req: Request): Promise<Response> => {
  if (!ENABLE_ABANDONED_CART) {
    console.log("[abandoned-cart] Feature disabled via ENABLE_ABANDONED_CART.");
    return new Response(
      JSON.stringify({ skipped: true, reason: "feature_disabled" }),
      { headers: { "Content-Type": "application/json" } },
    );
  }

  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    console.error("[abandoned-cart] Missing Supabase env vars.");
    return new Response(
      JSON.stringify({ error: "Missing Supabase configuration." }),
      { status: 500, headers: { "Content-Type": "application/json" } },
    );
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  // Cutoff: orders not touched in the last 2 hours
  const cutoff = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString();

  const { data: orders, error: fetchError } = await supabase
    .from("orders")
    .select("id, email")
    .in("status", ["draft", "awaiting_payment"])
    .lt("updated_at", cutoff)
    .is("abandoned_cart_sent_at", null)
    .not("email", "is", null)
    .limit(50); // Safety cap — process in batches

  if (fetchError) {
    console.error("[abandoned-cart] DB fetch error:", fetchError.message);
    return new Response(
      JSON.stringify({ error: fetchError.message }),
      { status: 500, headers: { "Content-Type": "application/json" } },
    );
  }

  if (!orders || orders.length === 0) {
    console.log("[abandoned-cart] No eligible orders found.");
    return new Response(
      JSON.stringify({ processed: 0 }),
      { headers: { "Content-Type": "application/json" } },
    );
  }

  console.log(`[abandoned-cart] Processing ${orders.length} order(s).`);

  let sent = 0;
  let failed = 0;

  for (const order of orders) {
    try {
      // Delegate email sending to the Next.js app so Resend credentials stay there
      const res = await fetch(
        `${SITE_URL}/api/email/abandoned-cart`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-cron-secret": CRON_SECRET,
          },
          body: JSON.stringify({ orderId: order.id }),
        },
      );

      if (!res.ok) {
        const body = await res.text();
        console.error(
          `[abandoned-cart] Email send failed for order ${order.id}: ${res.status} ${body}`,
        );
        failed++;
        continue;
      }

      // Stamp sent timestamp so we never re-send
      const { error: stampError } = await supabase
        .from("orders")
        .update({ abandoned_cart_sent_at: new Date().toISOString() })
        .eq("id", order.id);

      if (stampError) {
        console.error(
          `[abandoned-cart] Failed to stamp order ${order.id}:`,
          stampError.message,
        );
        // Email was already sent — log but do not increment failed counter
      }

      sent++;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error(
        `[abandoned-cart] Unexpected error for order ${order.id}:`,
        msg,
      );
      failed++;
    }
  }

  console.log(`[abandoned-cart] Done. Sent: ${sent}, Failed: ${failed}.`);

  return new Response(
    JSON.stringify({ processed: orders.length, sent, failed }),
    { headers: { "Content-Type": "application/json" } },
  );
});
