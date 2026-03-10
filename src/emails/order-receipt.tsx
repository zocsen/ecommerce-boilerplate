/* ------------------------------------------------------------------ */
/*  Order Receipt Email                                                 */
/*                                                                     */
/*  Sent to the customer after a successful payment.                   */
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
} from "@react-email/components";

import { siteConfig } from "@/lib/config/site.config";
import type { OrderRow, OrderItemRow } from "@/lib/types/database";

// ── Helpers ───────────────────────────────────────────────────────

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

// ── Types ─────────────────────────────────────────────────────────

export interface OrderReceiptEmailProps {
  order: OrderRow;
  items: OrderItemRow[];
}

// ── Component ─────────────────────────────────────────────────────

export default function OrderReceiptEmail({
  order,
  items,
}: OrderReceiptEmailProps) {
  const { store, branding, urls } = siteConfig;
  const shippingAddr = order.shipping_address;
  const billingAddr = order.billing_address;
  const isPickup = order.shipping_method === "pickup";

  return (
    <Html lang="hu">
      <Head />
      <Preview>Rendelés visszaigazolás – {order.id.slice(0, 8).toUpperCase()}</Preview>
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
              Rendelés visszaigazolás
            </Heading>
            <Text
              style={{
                margin: "0 0 24px",
                color: branding.theme.mutedForeground,
                fontSize: "14px",
              }}
            >
              Köszönjük a rendelésed! Az alábbiakban találod a részleteket.
            </Text>

            {/* ── Order meta ───────────────── */}
            <Section style={{ marginBottom: "24px", fontSize: "14px" }}>
              <Row>
                <Column style={{ color: branding.theme.mutedForeground, padding: "4px 0" }}>Rendelésszám:</Column>
                <Column style={{ textAlign: "right", fontWeight: 600, padding: "4px 0" }}>
                  {order.id.slice(0, 8).toUpperCase()}
                </Column>
              </Row>
              <Row>
                <Column style={{ color: branding.theme.mutedForeground, padding: "4px 0" }}>Dátum:</Column>
                <Column style={{ textAlign: "right", padding: "4px 0" }}>
                  {formatDate(order.created_at)}
                </Column>
              </Row>
              <Row>
                <Column style={{ color: branding.theme.mutedForeground, padding: "4px 0" }}>Státusz:</Column>
                <Column
                  style={{ textAlign: "right", fontWeight: 600, color: "#16a34a", padding: "4px 0" }}
                >
                  Fizetve
                </Column>
              </Row>
            </Section>

            <Hr style={{ borderColor: branding.theme.border, margin: "0 0 24px" }} />

            {/* ── Line items ───────────────── */}
            <Section style={{ marginBottom: "24px" }}>
              <Row>
                <Column
                  style={{
                    padding: "8px 0",
                    borderBottom: `2px solid ${branding.theme.foreground}`,
                    fontSize: "12px",
                    textTransform: "uppercase",
                    letterSpacing: "0.05em",
                    fontWeight: 600,
                  }}
                >
                  Termék
                </Column>
                <Column
                  style={{
                    padding: "8px 0",
                    borderBottom: `2px solid ${branding.theme.foreground}`,
                    fontSize: "12px",
                    textTransform: "uppercase",
                    letterSpacing: "0.05em",
                    textAlign: "center",
                    fontWeight: 600,
                    whiteSpace: "nowrap",
                  }}
                >
                  Darab
                </Column>
                <Column
                  style={{
                    padding: "8px 0",
                    borderBottom: `2px solid ${branding.theme.foreground}`,
                    fontSize: "12px",
                    textTransform: "uppercase",
                    letterSpacing: "0.05em",
                    textAlign: "right",
                    fontWeight: 600,
                    whiteSpace: "nowrap",
                  }}
                >
                  Összeg
                </Column>
              </Row>
              {items.map((item) => (
                <Row key={item.id}>
                  <Column
                    style={{
                      padding: "12px 0",
                      borderBottom: `1px solid ${branding.theme.muted}`,
                      fontSize: "14px",
                    }}
                  >
                    <strong>{item.title_snapshot}</strong>
                    {item.variant_snapshot.option1Value && (
                      <Text
                        style={{
                          margin: "2px 0 0",
                          fontSize: "12px",
                          color: branding.theme.mutedForeground,
                        }}
                      >
                        {item.variant_snapshot.option1Name ?? "Méret"}:{" "}
                        {item.variant_snapshot.option1Value}
                        {item.variant_snapshot.option2Value
                          ? `, ${item.variant_snapshot.option2Name ?? "Szín"}: ${item.variant_snapshot.option2Value}`
                          : ""}
                      </Text>
                    )}
                  </Column>
                  <Column
                    style={{
                      padding: "12px 0",
                      borderBottom: `1px solid ${branding.theme.muted}`,
                      fontSize: "14px",
                      textAlign: "center",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {item.quantity} db
                  </Column>
                  <Column
                    style={{
                      padding: "12px 0",
                      borderBottom: `1px solid ${branding.theme.muted}`,
                      fontSize: "14px",
                      textAlign: "right",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {formatHuf(item.line_total)}
                  </Column>
                </Row>
              ))}
            </Section>

            {/* ── Totals ───────────────────── */}
            <Section style={{ marginBottom: "32px", fontSize: "14px" }}>
              <Row>
                <Column style={{ color: branding.theme.mutedForeground, padding: "4px 0" }}>Részösszeg:</Column>
                <Column style={{ textAlign: "right", padding: "4px 0" }}>{formatHuf(order.subtotal_amount)}</Column>
              </Row>
              <Row>
                <Column style={{ color: branding.theme.mutedForeground, padding: "4px 0" }}>Szállítás:</Column>
                <Column style={{ textAlign: "right", padding: "4px 0" }}>
                  {order.shipping_fee === 0 ? "Ingyenes" : formatHuf(order.shipping_fee)}
                </Column>
              </Row>
              {order.discount_total > 0 && (
                <Row>
                  <Column style={{ color: branding.theme.mutedForeground, padding: "4px 0" }}>Kedvezmény:</Column>
                  <Column style={{ textAlign: "right", color: "#dc2626", padding: "4px 0" }}>
                    -{formatHuf(order.discount_total)}
                  </Column>
                </Row>
              )}
              <Row>
                <Column
                  style={{
                    padding: "8px 0",
                    borderTop: `2px solid ${branding.theme.foreground}`,
                    fontWeight: 700,
                    fontSize: "16px",
                  }}
                >
                  Összesen:
                </Column>
                <Column
                  style={{
                    padding: "8px 0",
                    borderTop: `2px solid ${branding.theme.foreground}`,
                    textAlign: "right",
                    fontWeight: 700,
                    fontSize: "16px",
                  }}
                >
                  {formatHuf(order.total_amount)}
                </Column>
              </Row>
            </Section>

            <Hr style={{ borderColor: branding.theme.border, margin: "0 0 24px" }} />

            {/* ── Addresses ────────────────── */}
            <Section>
              <Row>
                <Column style={{ verticalAlign: "top", paddingRight: "16px" }}>
                  <Text
                    style={{
                      margin: "0 0 8px",
                      fontSize: "12px",
                      textTransform: "uppercase",
                      letterSpacing: "0.05em",
                      color: branding.theme.mutedForeground,
                      fontWeight: 600,
                    }}
                  >
                    Szállítási cím
                  </Text>
                  {isPickup ? (
                    <Text style={{ margin: 0, fontSize: "14px", lineHeight: "1.5" }}>
                      {order.pickup_point_provider ?? ""} – {order.pickup_point_label ?? ""}
                    </Text>
                  ) : (
                    <Text style={{ margin: 0, fontSize: "14px", lineHeight: "1.5" }}>
                      {shippingAddr.name}
                      <br />
                      {shippingAddr.zip} {shippingAddr.city}
                      <br />
                      {shippingAddr.street}
                      <br />
                      {shippingAddr.country}
                    </Text>
                  )}
                </Column>
                <Column style={{ verticalAlign: "top", paddingLeft: "16px" }}>
                  <Text
                    style={{
                      margin: "0 0 8px",
                      fontSize: "12px",
                      textTransform: "uppercase",
                      letterSpacing: "0.05em",
                      color: branding.theme.mutedForeground,
                      fontWeight: 600,
                    }}
                  >
                    Számlázási cím
                  </Text>
                  <Text style={{ margin: 0, fontSize: "14px", lineHeight: "1.5" }}>
                    {billingAddr.name}
                    <br />
                    {billingAddr.zip} {billingAddr.city}
                    <br />
                    {billingAddr.street}
                    <br />
                    {billingAddr.country}
                  </Text>
                </Column>
              </Row>
            </Section>
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
              <a href={urls.siteUrl} style={{ color: branding.theme.mutedForeground, textDecoration: "underline" }}>
                {urls.siteUrl}
              </a>
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
}

OrderReceiptEmail.PreviewProps = {
  order: {
    id: "00000000-0000-0000-0000-000000000001",
    email: "teszt@example.hu",
    status: "paid",
    currency: "HUF",
    subtotal_amount: 12000,
    shipping_fee: 1490,
    discount_total: 0,
    total_amount: 13490,
    shipping_method: "home",
    shipping_address: { name: "Kovács János", street: "Váci utca 1.", city: "Budapest", zip: "1052", country: "HU" },
    billing_address: { name: "Kovács János", street: "Váci utca 1.", city: "Budapest", zip: "1052", country: "HU" },
    pickup_point_provider: null,
    pickup_point_label: null,
    coupon_code: null,
    notes: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    paid_at: null,
    shipped_at: null,
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
  },
  items: [
    {
      id: "item-1",
      order_id: "00000000-0000-0000-0000-000000000001",
      product_id: "prod-1",
      variant_id: null,
      title_snapshot: "Prémium póló",
      variant_snapshot: { option1Name: "Méret", option1Value: "M" },
      unit_price_snapshot: 6000,
      quantity: 2,
      line_total: 12000,
    },
  ],
} satisfies OrderReceiptEmailProps;
