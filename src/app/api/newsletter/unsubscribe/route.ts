/* ------------------------------------------------------------------ */
/*  GET /api/newsletter/unsubscribe?token=<signed_token>               */
/*                                                                     */
/*  Verifies the HMAC-SHA256 token, marks the subscriber as            */
/*  unsubscribed in Supabase, and returns a plain HTML confirmation    */
/*  page (no JS, works in any email client's browser).                 */
/* ------------------------------------------------------------------ */

import { type NextRequest, NextResponse } from "next/server";
import { verifyUnsubscribeToken } from "@/lib/security/unsubscribe-token";
import { createAdminClient } from "@/lib/supabase/admin";
import { siteConfig } from "@/lib/config/site.config";

function htmlPage(title: string, message: string, isError = false): string {
  const color = isError ? "#dc2626" : "#16a34a";
  return `<!DOCTYPE html>
<html lang="hu">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${title} — ${siteConfig.store.name}</title>
</head>
<body style="margin:0;padding:0;background-color:#f5f5f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;color:#0a0a0a;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="min-height:100vh;background-color:#f5f5f5;">
    <tr>
      <td align="center" valign="middle" style="padding:60px 16px;">
        <table role="presentation" width="480" cellpadding="0" cellspacing="0" style="max-width:480px;width:100%;background-color:#ffffff;border-radius:8px;overflow:hidden;">
          <tr>
            <td style="padding:40px;">
              <p style="margin:0 0 16px;font-size:20px;font-weight:700;letter-spacing:-0.02em;">${siteConfig.branding.logoText}</p>
              <h1 style="margin:0 0 12px;font-size:22px;font-weight:700;letter-spacing:-0.01em;color:${color};">${title}</h1>
              <p style="margin:0 0 32px;font-size:15px;line-height:1.6;color:#404040;">${message}</p>
              <a href="${siteConfig.urls.siteUrl}" style="display:inline-block;padding:12px 28px;background-color:#0a0a0a;color:#ffffff;font-size:14px;font-weight:600;text-decoration:none;border-radius:6px;">
                Vissza a boltba
              </a>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  const token = request.nextUrl.searchParams.get("token");

  if (!token) {
    return new NextResponse(
      htmlPage(
        "Érvénytelen hivatkozás",
        "A leiratkozási hivatkozás érvénytelen vagy lejárt. Kérjük, használd az e-mailben kapott linket.",
        true,
      ),
      { status: 400, headers: { "Content-Type": "text/html; charset=utf-8" } },
    );
  }

  const email = await verifyUnsubscribeToken(token);

  if (!email) {
    return new NextResponse(
      htmlPage(
        "Érvénytelen hivatkozás",
        "A leiratkozási hivatkozás érvénytelen vagy lejárt. Kérjük, használd az e-mailben kapott linket.",
        true,
      ),
      { status: 400, headers: { "Content-Type": "text/html; charset=utf-8" } },
    );
  }

  // Mark subscriber as unsubscribed
  const supabase = createAdminClient();
  const { error } = await supabase
    .from("subscribers")
    .update({
      status: "unsubscribed" as const,
      unsubscribed_at: new Date().toISOString(),
    })
    .eq("email", email)
    .eq("status", "subscribed"); // no-op if already unsubscribed (idempotent)

  if (error) {
    console.error("[unsubscribe-route] DB update failed:", error.message);
    return new NextResponse(
      htmlPage(
        "Hiba történt",
        "Sajnos a leiratkozás nem sikerült. Kérjük, próbáld újra, vagy lépj velünk kapcsolatba: " +
          siteConfig.urls.supportEmail,
        true,
      ),
      { status: 500, headers: { "Content-Type": "text/html; charset=utf-8" } },
    );
  }

  return new NextResponse(
    htmlPage(
      "Sikeresen leiratkoztál",
      `A(z) ${email} e-mail cím eltávolításra került hírlevelünk küldési listájáról. Többé nem fogsz tőlünk marketing e-maileket kapni.`,
    ),
    { status: 200, headers: { "Content-Type": "text/html; charset=utf-8" } },
  );
}
