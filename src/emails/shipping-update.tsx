/* ------------------------------------------------------------------ */
/*  Shipping Update Email                                               */
/*                                                                     */
/*  Sent to the customer when their order has been shipped.            */
/*  All text in Hungarian.                                             */
/* ------------------------------------------------------------------ */

import {
  Html,
  Head,
  Preview,
  Body,
  Container,
  Section,
  Row,
  Column,
  Heading,
  Text,
  Hr,
  Link,
} from "@react-email/components";

import { siteConfig } from "@/lib/config/site.config";
import type { OrderRow } from "@/lib/types/database";

// ── Helpers ───────────────────────────────────────────────────────

function formatHuf(amount: number): string {
  return `${amount.toLocaleString("hu-HU")} Ft`;
}

// ── Types ─────────────────────────────────────────────────────────

export interface ShippingUpdateEmailProps {
  order: OrderRow;
  trackingCode?: string;
}

// ── Component ─────────────────────────────────────────────────────

export default function ShippingUpdateEmail({ order, trackingCode }: ShippingUpdateEmailProps) {
  const { store, branding, urls } = siteConfig;
  const isPickup = order.shipping_method === "pickup";

  return (
    <Html lang="hu">
      <Head />
      <Preview>Csomagod úton van! – {order.id.slice(0, 8).toUpperCase()}</Preview>
      <Body
        style={{
          margin: 0,
          padding: 0,
          backgroundColor: branding.theme.muted,
          fontFamily:
            "-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif",
          color: branding.theme.foreground,
        }}
      >
        <Container
          style={{
            maxWidth: "600px",
            margin: "40px auto",
            backgroundColor: branding.theme.background,
            borderRadius: "8px",
            overflow: "hidden",
          }}
        >
          {/* ── Header ──────────────────────────────────── */}
          <Section
            style={{
              padding: "32px 40px 24px",
              borderBottom: `1px solid ${branding.theme.border}`,
            }}
          >
            <Text
              style={{
                margin: 0,
                fontSize: "20px",
                fontWeight: 700,
                letterSpacing: "-0.02em",
                color: branding.theme.foreground,
              }}
            >
              {branding.logoText}
            </Text>
          </Section>

          {/* ── Body ────────────────────────────────────── */}
          <Section style={{ padding: "32px 40px" }}>
            <Heading
              as="h1"
              style={{
                margin: "0 0 8px",
                fontSize: "24px",
                fontWeight: 700,
                letterSpacing: "-0.02em",
              }}
            >
              Csomagod úton van!
            </Heading>
            <Text
              style={{
                margin: "0 0 24px",
                color: branding.theme.mutedForeground,
                fontSize: "14px",
              }}
            >
              A(z) <strong>{order.id.slice(0, 8).toUpperCase()}</strong> számú rendelésed feladásra
              került.
            </Text>

            {/* ── Tracking code ────────────── */}
            {trackingCode && (
              <Section
                style={{
                  marginBottom: "24px",
                  backgroundColor: branding.theme.muted,
                  borderRadius: "8px",
                  padding: "20px 24px",
                }}
              >
                <Text
                  style={{
                    margin: "0 0 4px",
                    fontSize: "12px",
                    textTransform: "uppercase",
                    letterSpacing: "0.05em",
                    color: branding.theme.mutedForeground,
                  }}
                >
                  Nyomkövetési szám
                </Text>
                <Text
                  style={{
                    margin: 0,
                    fontSize: "18px",
                    fontWeight: 700,
                    letterSpacing: "0.02em",
                    fontFamily: "monospace",
                  }}
                >
                  {trackingCode}
                </Text>
              </Section>
            )}

            {/* ── Shipment details ─────────── */}
            <Section style={{ marginBottom: "24px", fontSize: "14px" }}>
              <Row>
                <Column style={{ color: branding.theme.mutedForeground, padding: "4px 0" }}>
                  Szállítási mód:
                </Column>
                <Column style={{ textAlign: "right", padding: "4px 0" }}>
                  {isPickup ? "Csomagautomata" : "Házhozszállítás"}
                </Column>
              </Row>
              {isPickup && order.pickup_point_label && (
                <Row>
                  <Column style={{ color: branding.theme.mutedForeground, padding: "4px 0" }}>
                    Átvételi pont:
                  </Column>
                  <Column style={{ textAlign: "right", padding: "4px 0" }}>
                    {order.pickup_point_label}
                  </Column>
                </Row>
              )}
              <Row>
                <Column style={{ color: branding.theme.mutedForeground, padding: "4px 0" }}>
                  Rendelés összege:
                </Column>
                <Column style={{ textAlign: "right", fontWeight: 600, padding: "4px 0" }}>
                  {formatHuf(order.total_amount)}
                </Column>
              </Row>
            </Section>

            <Hr style={{ borderColor: branding.theme.border, margin: "0 0 24px" }} />

            <Text style={{ margin: 0, fontSize: "14px", color: branding.theme.mutedForeground }}>
              Ha kérdésed van, keress minket a{" "}
              <Link
                href={`mailto:${urls.supportEmail}`}
                style={{ color: branding.theme.foreground, textDecoration: "underline" }}
              >
                {urls.supportEmail}
              </Link>{" "}
              címen.
            </Text>
          </Section>

          {/* ── Footer ──────────────────────────────────── */}
          <Section
            style={{
              padding: "24px 40px 32px",
              borderTop: `1px solid ${branding.theme.border}`,
            }}
          >
            <Text
              style={{
                margin: "0 0 8px",
                fontSize: "12px",
                color: branding.theme.mutedForeground,
                lineHeight: "1.6",
              }}
            >
              {store.legalName} &middot; {store.address}
            </Text>
            <Text
              style={{
                margin: "0 0 8px",
                fontSize: "12px",
                color: branding.theme.mutedForeground,
                lineHeight: "1.6",
              }}
            >
              {store.email} &middot; {store.phone}
            </Text>
            <Text
              style={{
                margin: 0,
                fontSize: "12px",
                color: branding.theme.mutedForeground,
                lineHeight: "1.6",
              }}
            >
              <a
                href={urls.siteUrl}
                style={{ color: branding.theme.mutedForeground, textDecoration: "underline" }}
              >
                {urls.siteUrl}
              </a>
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
}

ShippingUpdateEmail.PreviewProps = {
  order: {
    id: "00000000-0000-0000-0000-000000000001",
    email: "teszt@example.hu",
    status: "shipped",
    currency: "HUF",
    subtotal_amount: 12000,
    shipping_fee: 1490,
    discount_total: 0,
    total_amount: 13490,
    shipping_method: "home",
    shipping_address: {
      name: "Kovács János",
      street: "Váci utca 1.",
      city: "Budapest",
      zip: "1052",
      country: "HU",
    },
    billing_address: {
      name: "Kovács János",
      street: "Váci utca 1.",
      city: "Budapest",
      zip: "1052",
      country: "HU",
    },
    pickup_point_provider: null,
    pickup_point_label: null,
    coupon_code: null,
    notes: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    paid_at: new Date().toISOString(),
    shipped_at: new Date().toISOString(),
    user_id: null,
    barion_payment_id: null,
    barion_payment_request_id: null,
    barion_status: null,
    invoice_provider: null,
    invoice_number: null,
    invoice_url: null,
    shipping_phone: null,
    pickup_point_id: null,
    idempotency_key: null,
    payment_method: "barion",
    cod_fee: 0,
    abandoned_cart_sent_at: null,
  } satisfies OrderRow,
  trackingCode: "GLS-123456789HU",
} satisfies ShippingUpdateEmailProps;
