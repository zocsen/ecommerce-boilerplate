/* ------------------------------------------------------------------ */
/*  POST /api/email/abandoned-cart                                     */
/*                                                                     */
/*  Called by the Supabase Edge Function cron job.                     */
/*  Validates the shared CRON_SECRET, then fires sendAbandonedCartEmail*/
/*  for the given orderId.                                             */
/* ------------------------------------------------------------------ */

import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { sendAbandonedCartEmail } from "@/lib/integrations/email/actions";

const bodySchema = z.object({
  orderId: z.string().min(1),
});

export async function POST(request: NextRequest): Promise<NextResponse> {
  // Verify caller is our cron job
  const cronSecret = process.env.CRON_SECRET;
  const provided = request.headers.get("x-cron-secret");

  if (!cronSecret || provided !== cronSecret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Missing or invalid orderId" },
      { status: 400 },
    );
  }

  const result = await sendAbandonedCartEmail(parsed.data.orderId);

  if (!result.success) {
    console.error(
      `[api/email/abandoned-cart] Send failed for ${parsed.data.orderId}:`,
      result.error,
    );
    return NextResponse.json({ error: result.error }, { status: 500 });
  }

  return NextResponse.json({ success: true, messageId: result.messageId });
}
