/* ------------------------------------------------------------------ */
/*  Email Templates — render wrappers                                  */
/*                                                                     */
/*  Renders React Email JSX components to HTML strings via             */
/*  `render()` from @react-email/components.                           */
/*                                                                     */
/*  The actual template JSX lives in /src/emails/*.tsx so they can     */
/*  be previewed with the React Email dev server.                      */
/* ------------------------------------------------------------------ */

import { render } from "@react-email/components";

import OrderReceiptEmail from "@/emails/order-receipt";
import ShippingUpdateEmail from "@/emails/shipping-update";
import AbandonedCartEmail from "@/emails/abandoned-cart";
import NewsletterEmail from "@/emails/newsletter";
import SignupConfirmationEmail from "@/emails/signup-confirmation";
import WelcomeEmail from "@/emails/welcome";
import AdminOrderNotificationEmail from "@/emails/admin-order-notification";

import type { OrderRow, OrderItemRow } from "@/lib/types/database";
import type { AdminOrderNotificationEmailProps } from "@/emails/admin-order-notification";

// ── Re-export types needed by callers ────────────────────────────

export type { AbandonedCartItem } from "@/emails/abandoned-cart";
export type { AdminOrderNotificationEmailProps };

// ── 1. Order Receipt ──────────────────────────────────────────────

export async function renderOrderReceiptEmail(
  order: OrderRow,
  items: OrderItemRow[],
): Promise<string> {
  return render(<OrderReceiptEmail order={order} items={items} />);
}

// ── 2. Shipping Update ────────────────────────────────────────────

export async function renderShippingUpdateEmail(
  order: OrderRow,
  trackingCode?: string,
): Promise<string> {
  return render(<ShippingUpdateEmail order={order} trackingCode={trackingCode} />);
}

// ── 3. Abandoned Cart ─────────────────────────────────────────────

export async function renderAbandonedCartEmail(
  email: string,
  items: Array<{ title: string; price: number; image?: string }>,
): Promise<string> {
  return render(<AbandonedCartEmail recipientEmail={email} items={items} />);
}

// ── 4. Newsletter ─────────────────────────────────────────────────

export interface NewsletterContent {
  headline: string;
  body: string;
  ctaText: string;
  ctaUrl: string;
}

export async function renderNewsletterEmail(
  content: NewsletterContent,
  unsubscribeToken: string,
): Promise<string> {
  return render(
    <NewsletterEmail
      headline={content.headline}
      body={content.body}
      ctaText={content.ctaText}
      ctaUrl={content.ctaUrl}
      unsubscribeToken={unsubscribeToken}
    />,
  );
}

// ── 5. Signup Confirmation ────────────────────────────────────────

export async function renderSignupConfirmationEmail(name: string): Promise<string> {
  return render(<SignupConfirmationEmail name={name} />);
}

// ── 6. Welcome ────────────────────────────────────────────────────

export async function renderWelcomeEmail(name: string): Promise<string> {
  return render(<WelcomeEmail name={name} />);
}

// ── 7. Admin Order Notification ───────────────────────────────────

export async function renderAdminOrderNotificationEmail(
  params: AdminOrderNotificationEmailProps,
): Promise<string> {
  return render(<AdminOrderNotificationEmail {...params} />);
}
