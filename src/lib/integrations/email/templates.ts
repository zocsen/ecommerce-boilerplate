/* ------------------------------------------------------------------ */
/*  Email Templates – HTML string renderers                            */
/*                                                                     */
/*  Minimal, inline-styled, responsive HTML templates for              */
/*  transactional and marketing emails. All text in Hungarian.         */
/* ------------------------------------------------------------------ */

import { siteConfig } from "@/lib/config/site.config";
import type { OrderRow, OrderItemRow } from "@/lib/types/database";

// ── Shared helpers ────────────────────────────────────────────────

function formatHuf(amount: number): string {
  return `${amount.toLocaleString("hu-HU")} Ft`;
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}. ${month}. ${day}.`;
}

function baseLayout(title: string, content: string): string {
  const { store, branding, urls } = siteConfig;
  return `<!DOCTYPE html>
<html lang="hu">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${title}</title>
</head>
<body style="margin:0;padding:0;background-color:#f5f5f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;color:#0a0a0a;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f5f5f5;">
    <tr>
      <td align="center" style="padding:40px 16px;">
        <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background-color:#ffffff;border-radius:8px;overflow:hidden;">
          <!-- Header -->
          <tr>
            <td style="padding:32px 40px 24px;border-bottom:1px solid ${branding.theme.border};">
              <span style="font-size:20px;font-weight:700;letter-spacing:-0.02em;color:${branding.theme.foreground};">${branding.logoText}</span>
            </td>
          </tr>
          <!-- Content -->
          <tr>
            <td style="padding:32px 40px;">
              ${content}
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="padding:24px 40px 32px;border-top:1px solid ${branding.theme.border};font-size:12px;color:${branding.theme.mutedForeground};line-height:1.6;">
              <p style="margin:0 0 8px;">${store.legalName} &middot; ${store.address}</p>
              <p style="margin:0 0 8px;">${store.email} &middot; ${store.phone}</p>
              <p style="margin:0;">
                <a href="${urls.siteUrl}" style="color:${branding.theme.mutedForeground};text-decoration:underline;">${urls.siteUrl}</a>
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

// ── 1. Order Receipt ──────────────────────────────────────────────

export function renderOrderReceiptEmail(
  order: OrderRow,
  items: OrderItemRow[],
): string {
  const shippingAddr = order.shipping_address;
  const billingAddr = order.billing_address;

  const itemRows = items
    .map(
      (item) => `
      <tr>
        <td style="padding:12px 0;border-bottom:1px solid #f0f0f0;font-size:14px;">
          <strong>${item.title_snapshot}</strong>
          ${
            item.variant_snapshot.option1Value
              ? `<br /><span style="color:#737373;font-size:12px;">${item.variant_snapshot.option1Name ?? "Méret"}: ${item.variant_snapshot.option1Value}${item.variant_snapshot.option2Value ? `, ${item.variant_snapshot.option2Name ?? "Szín"}: ${item.variant_snapshot.option2Value}` : ""}</span>`
              : ""
          }
        </td>
        <td style="padding:12px 0;border-bottom:1px solid #f0f0f0;font-size:14px;text-align:center;white-space:nowrap;">${item.quantity} db</td>
        <td style="padding:12px 0;border-bottom:1px solid #f0f0f0;font-size:14px;text-align:right;white-space:nowrap;">${formatHuf(item.line_total)}</td>
      </tr>`,
    )
    .join("");

  const content = `
    <h1 style="margin:0 0 8px;font-size:24px;font-weight:700;letter-spacing:-0.02em;">Rendelés visszaigazolás</h1>
    <p style="margin:0 0 24px;color:#737373;font-size:14px;">Köszönjük a rendelésed! Az alábbiakban találod a részleteket.</p>

    <table role="presentation" width="100%" style="margin-bottom:24px;font-size:14px;">
      <tr>
        <td style="padding:4px 0;color:#737373;">Rendelésszám:</td>
        <td style="padding:4px 0;text-align:right;font-weight:600;">${order.id.slice(0, 8).toUpperCase()}</td>
      </tr>
      <tr>
        <td style="padding:4px 0;color:#737373;">Dátum:</td>
        <td style="padding:4px 0;text-align:right;">${formatDate(order.created_at)}</td>
      </tr>
      <tr>
        <td style="padding:4px 0;color:#737373;">Státusz:</td>
        <td style="padding:4px 0;text-align:right;font-weight:600;color:#16a34a;">Fizetve</td>
      </tr>
    </table>

    <!-- Line items -->
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px;">
      <tr>
        <th style="padding:8px 0;border-bottom:2px solid #0a0a0a;font-size:12px;text-transform:uppercase;letter-spacing:0.05em;text-align:left;">Termék</th>
        <th style="padding:8px 0;border-bottom:2px solid #0a0a0a;font-size:12px;text-transform:uppercase;letter-spacing:0.05em;text-align:center;">Darab</th>
        <th style="padding:8px 0;border-bottom:2px solid #0a0a0a;font-size:12px;text-transform:uppercase;letter-spacing:0.05em;text-align:right;">Összeg</th>
      </tr>
      ${itemRows}
    </table>

    <!-- Totals -->
    <table role="presentation" width="100%" style="margin-bottom:32px;font-size:14px;">
      <tr>
        <td style="padding:4px 0;color:#737373;">Részösszeg:</td>
        <td style="padding:4px 0;text-align:right;">${formatHuf(order.subtotal_amount)}</td>
      </tr>
      <tr>
        <td style="padding:4px 0;color:#737373;">Szállítás:</td>
        <td style="padding:4px 0;text-align:right;">${order.shipping_fee === 0 ? "Ingyenes" : formatHuf(order.shipping_fee)}</td>
      </tr>
      ${
        order.discount_total > 0
          ? `<tr>
        <td style="padding:4px 0;color:#737373;">Kedvezmény:</td>
        <td style="padding:4px 0;text-align:right;color:#dc2626;">-${formatHuf(order.discount_total)}</td>
      </tr>`
          : ""
      }
      <tr>
        <td style="padding:8px 0;border-top:2px solid #0a0a0a;font-weight:700;font-size:16px;">Összesen:</td>
        <td style="padding:8px 0;border-top:2px solid #0a0a0a;text-align:right;font-weight:700;font-size:16px;">${formatHuf(order.total_amount)}</td>
      </tr>
    </table>

    <!-- Addresses -->
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
      <tr>
        <td width="50%" valign="top" style="padding-right:16px;">
          <h3 style="margin:0 0 8px;font-size:12px;text-transform:uppercase;letter-spacing:0.05em;color:#737373;">Szállítási cím</h3>
          ${
            order.shipping_method === "pickup"
              ? `<p style="margin:0;font-size:14px;line-height:1.5;">${order.pickup_point_provider ?? ""} – ${order.pickup_point_label ?? ""}</p>`
              : `<p style="margin:0;font-size:14px;line-height:1.5;">
            ${shippingAddr.name}<br />
            ${shippingAddr.zip} ${shippingAddr.city}<br />
            ${shippingAddr.street}<br />
            ${shippingAddr.country}
          </p>`
          }
        </td>
        <td width="50%" valign="top" style="padding-left:16px;">
          <h3 style="margin:0 0 8px;font-size:12px;text-transform:uppercase;letter-spacing:0.05em;color:#737373;">Számlázási cím</h3>
          <p style="margin:0;font-size:14px;line-height:1.5;">
            ${billingAddr.name}<br />
            ${billingAddr.zip} ${billingAddr.city}<br />
            ${billingAddr.street}<br />
            ${billingAddr.country}
          </p>
        </td>
      </tr>
    </table>
  `;

  return baseLayout("Rendelés visszaigazolás", content);
}

// ── 2. Shipping Update ────────────────────────────────────────────

export function renderShippingUpdateEmail(
  order: OrderRow,
  trackingCode?: string,
): string {
  const content = `
    <h1 style="margin:0 0 8px;font-size:24px;font-weight:700;letter-spacing:-0.02em;">Csomagod úton van!</h1>
    <p style="margin:0 0 24px;color:#737373;font-size:14px;">
      A(z) <strong>${order.id.slice(0, 8).toUpperCase()}</strong> számú rendelésed feladásra került.
    </p>

    ${
      trackingCode
        ? `
    <table role="presentation" width="100%" style="margin-bottom:24px;background-color:#f5f5f5;border-radius:8px;">
      <tr>
        <td style="padding:20px 24px;">
          <p style="margin:0 0 4px;font-size:12px;text-transform:uppercase;letter-spacing:0.05em;color:#737373;">Nyomkövetési szám</p>
          <p style="margin:0;font-size:18px;font-weight:700;letter-spacing:0.02em;font-family:monospace;">${trackingCode}</p>
        </td>
      </tr>
    </table>
    `
        : ""
    }

    <table role="presentation" width="100%" style="margin-bottom:24px;font-size:14px;">
      <tr>
        <td style="padding:4px 0;color:#737373;">Szállítási mód:</td>
        <td style="padding:4px 0;text-align:right;">${order.shipping_method === "pickup" ? "Csomagautomata" : "Házhozszállítás"}</td>
      </tr>
      ${
        order.shipping_method === "pickup" && order.pickup_point_label
          ? `<tr>
        <td style="padding:4px 0;color:#737373;">Átvételi pont:</td>
        <td style="padding:4px 0;text-align:right;">${order.pickup_point_label}</td>
      </tr>`
          : ""
      }
      <tr>
        <td style="padding:4px 0;color:#737373;">Rendelés összege:</td>
        <td style="padding:4px 0;text-align:right;font-weight:600;">${formatHuf(order.total_amount)}</td>
      </tr>
    </table>

    <p style="margin:0;font-size:14px;color:#737373;">
      Ha kérdésed van, keress minket a <a href="mailto:${siteConfig.urls.supportEmail}" style="color:#0a0a0a;text-decoration:underline;">${siteConfig.urls.supportEmail}</a> címen.
    </p>
  `;

  return baseLayout("Csomagod úton van!", content);
}

// ── 3. Abandoned Cart ─────────────────────────────────────────────

export interface AbandonedCartItem {
  title: string;
  price: number;
  image?: string;
}

export function renderAbandonedCartEmail(
  email: string,
  items: AbandonedCartItem[],
): string {
  const cartTotal = items.reduce((sum, item) => sum + item.price, 0);

  const itemRows = items
    .map(
      (item) => `
      <tr>
        <td style="padding:12px 0;border-bottom:1px solid #f0f0f0;">
          <table role="presentation" cellpadding="0" cellspacing="0">
            <tr>
              ${
                item.image
                  ? `<td style="padding-right:12px;"><img src="${item.image}" alt="${item.title}" width="60" height="60" style="border-radius:4px;object-fit:cover;display:block;" /></td>`
                  : `<td style="padding-right:12px;"><div style="width:60px;height:60px;background-color:#f5f5f5;border-radius:4px;"></div></td>`
              }
              <td valign="middle">
                <p style="margin:0;font-size:14px;font-weight:600;">${item.title}</p>
                <p style="margin:4px 0 0;font-size:14px;color:#737373;">${formatHuf(item.price)}</p>
              </td>
            </tr>
          </table>
        </td>
      </tr>`,
    )
    .join("");

  const content = `
    <h1 style="margin:0 0 8px;font-size:24px;font-weight:700;letter-spacing:-0.02em;">Elfelejtettél valamit?</h1>
    <p style="margin:0 0 24px;color:#737373;font-size:14px;">
      Észrevettük, hogy termékek maradtak a kosaradban. Ne hagyd, hogy lemaradj róluk!
    </p>

    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px;">
      ${itemRows}
    </table>

    <table role="presentation" width="100%" style="margin-bottom:32px;">
      <tr>
        <td style="font-size:14px;color:#737373;">Összesen:</td>
        <td style="text-align:right;font-size:16px;font-weight:700;">${formatHuf(cartTotal)}</td>
      </tr>
    </table>

    <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
      <tr>
        <td align="center">
          <a href="${siteConfig.urls.siteUrl}/cart" style="display:inline-block;padding:14px 32px;background-color:#0a0a0a;color:#ffffff;font-size:14px;font-weight:600;text-decoration:none;border-radius:6px;letter-spacing:0.01em;">
            Vissza a kosárhoz
          </a>
        </td>
      </tr>
    </table>

    <p style="margin:32px 0 0;font-size:12px;color:#a3a3a3;text-align:center;">
      Ezt az emailt a(z) ${email} címre küldtük. Ha nem te vagy az, kérjük hagyd figyelmen kívül.
    </p>
  `;

  return baseLayout("Termékek várnak a kosaradban", content);
}

// ── 4. Newsletter ─────────────────────────────────────────────────

export interface NewsletterContent {
  headline: string;
  body: string;
  ctaText: string;
  ctaUrl: string;
}

export function renderNewsletterEmail(content: NewsletterContent): string {
  const { headline, body, ctaText, ctaUrl } = content;

  const htmlContent = `
    <h1 style="margin:0 0 16px;font-size:28px;font-weight:700;letter-spacing:-0.02em;line-height:1.2;">${headline}</h1>

    <div style="margin:0 0 32px;font-size:15px;line-height:1.7;color:#404040;">
      ${body}
    </div>

    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:32px;">
      <tr>
        <td align="center">
          <a href="${ctaUrl}" style="display:inline-block;padding:14px 32px;background-color:#0a0a0a;color:#ffffff;font-size:14px;font-weight:600;text-decoration:none;border-radius:6px;letter-spacing:0.01em;">
            ${ctaText}
          </a>
        </td>
      </tr>
    </table>

    <hr style="border:none;border-top:1px solid #e5e5e5;margin:32px 0;" />

    <p style="margin:0;font-size:12px;color:#a3a3a3;text-align:center;line-height:1.6;">
      Ezt a hírlevelet azért kaptad, mert feliratkoztál a(z) ${siteConfig.store.name} hírlevelére.<br />
      <a href="${siteConfig.urls.siteUrl}/api/newsletter/unsubscribe?token={{unsubscribe_token}}" style="color:#a3a3a3;text-decoration:underline;">Leiratkozás</a>
    </p>
  `;

  return baseLayout(headline, htmlContent);
}
