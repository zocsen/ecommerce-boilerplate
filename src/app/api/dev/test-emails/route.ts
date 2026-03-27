/* ------------------------------------------------------------------ */
/*  Dev-only: Send test emails to local Mailpit                        */
/*                                                                     */
/*  GET /api/dev/test-emails                                           */
/*  Only available when NODE_ENV === "development".                    */
/*  Renders all 3 FE-007 email templates and posts them directly       */
/*  to Mailpit's HTTP API at http://127.0.0.1:54334/api/v1/send       */
/* ------------------------------------------------------------------ */

import { NextResponse } from "next/server";
import {
  renderSignupConfirmationEmail,
  renderWelcomeEmail,
  renderAdminOrderNotificationEmail,
} from "@/lib/integrations/email/templates";

const MAILPIT_SEND_URL = "http://127.0.0.1:54334/api/v1/send";
const TEST_INBOX = "inbox@mailpit.local";
const FROM_EMAIL = "no-reply@agency.hu";
const FROM_NAME = "Agency Store (teszt)";

interface MailpitSendPayload {
  from: { Email: string; Name: string };
  To: Array<{ Email: string; Name: string }>;
  Subject: string;
  HTML: string;
}

interface SendResult {
  template: string;
  success: boolean;
  mailpitId?: string;
  error?: string;
}

async function sendToMailpit(
  subject: string,
  html: string,
  templateName: string,
): Promise<SendResult> {
  const payload: MailpitSendPayload = {
    from: { Email: FROM_EMAIL, Name: FROM_NAME },
    To: [{ Email: TEST_INBOX, Name: "Teszt Postafiók" }],
    Subject: subject,
    HTML: html,
  };

  try {
    const res = await fetch(MAILPIT_SEND_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const text = await res.text();
      return { template: templateName, success: false, error: `Mailpit ${res.status}: ${text}` };
    }

    const data = (await res.json()) as { ID: string };
    return { template: templateName, success: true, mailpitId: data.ID };
  } catch (err) {
    return {
      template: templateName,
      success: false,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

export async function GET() {
  if (process.env.NODE_ENV !== "development") {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const results: SendResult[] = [];

  // ── 1. Sikeres regisztráció ────────────────────────────────────
  const signupHtml = await renderSignupConfirmationEmail("Kovács János");
  results.push(
    await sendToMailpit("Sikeres regisztráció – Agency Store", signupHtml, "signup-confirmation"),
  );

  // ── 2. Üdvözlő levél ──────────────────────────────────────────
  const welcomeHtml = await renderWelcomeEmail("Szabó Éva");
  results.push(
    await sendToMailpit("Üdvözlünk az Agency Store webáruházban!", welcomeHtml, "welcome"),
  );

  // ── 3. Admin rendelés értesítő ────────────────────────────────
  const adminHtml = await renderAdminOrderNotificationEmail({
    orderId: "test-order-uuid-0001",
    orderNumber: "ORD-0001",
    customerName: "Kiss Anna",
    customerEmail: "kiss.anna@example.hu",
    itemCount: 3,
    total: 24990,
    shippingMethod: "Foxpost automatából",
  });
  results.push(
    await sendToMailpit("Új rendelés: ORD-0001 — Kiss Anna", adminHtml, "admin-order-notification"),
  );

  const allOk = results.every((r) => r.success);

  return NextResponse.json(
    {
      ok: allOk,
      mailpitUrl: "http://127.0.0.1:54334",
      results,
    },
    { status: allOk ? 200 : 207 },
  );
}
