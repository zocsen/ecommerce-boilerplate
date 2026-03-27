/* ------------------------------------------------------------------ */
/*  Admin Order Notification Email                                     */
/*                                                                     */
/*  Sent to the store admin when a new order is paid.                 */
/*  Minimal, information-dense design — this is for internal use.     */
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
  Button,
} from "@react-email/components";

import { siteConfig } from "@/lib/config/site.config";

// ── Helpers ───────────────────────────────────────────────────────

function formatHuf(amount: number): string {
  return `${amount.toLocaleString("hu-HU")} Ft`;
}

// ── Types ─────────────────────────────────────────────────────────

export interface AdminOrderNotificationEmailProps {
  orderId: string;
  orderNumber: string;
  customerName: string;
  customerEmail: string;
  itemCount: number;
  total: number;
  shippingMethod: string;
}

// ── Component ─────────────────────────────────────────────────────

export default function AdminOrderNotificationEmail({
  orderId,
  orderNumber,
  customerName,
  customerEmail,
  itemCount,
  total,
  shippingMethod,
}: AdminOrderNotificationEmailProps) {
  const { store, branding, urls } = siteConfig;

  const adminOrderUrl = `${urls.siteUrl}/admin/orders/${orderId}`;

  const shippingLabel = shippingMethod === "pickup" ? "Csomagpont" : "Házhozszállítás";

  return (
    <Html lang="hu">
      <Head />
      <Preview>
        Új rendelés: {orderNumber} — {customerName} — {formatHuf(total)}
      </Preview>
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
                margin: "0 0 4px",
                fontSize: "20px",
                fontWeight: 700,
                letterSpacing: "-0.02em",
                color: branding.theme.foreground,
              }}
            >
              {branding.logoText}
            </Text>
            <Text
              style={{
                margin: 0,
                fontSize: "12px",
                color: branding.theme.mutedForeground,
                textTransform: "uppercase",
                letterSpacing: "0.05em",
              }}
            >
              Admin értesítő
            </Text>
          </Section>

          {/* ── Body ────────────────────────────────────── */}
          <Section style={{ padding: "32px 40px" }}>
            <Heading
              as="h1"
              style={{
                margin: "0 0 4px",
                fontSize: "22px",
                fontWeight: 700,
                letterSpacing: "-0.02em",
                color: "#16a34a",
              }}
            >
              Új rendelés érkezett
            </Heading>
            <Text
              style={{
                margin: "0 0 28px",
                fontSize: "13px",
                color: branding.theme.mutedForeground,
              }}
            >
              Rendelésszám: <strong>{orderNumber}</strong>
            </Text>

            {/* ── Order details ────────────── */}
            <Section style={{ marginBottom: "24px", fontSize: "14px" }}>
              <Row>
                <Column style={{ color: branding.theme.mutedForeground, padding: "5px 0" }}>
                  Vevő neve:
                </Column>
                <Column style={{ textAlign: "right", fontWeight: 600, padding: "5px 0" }}>
                  {customerName}
                </Column>
              </Row>
              <Row>
                <Column style={{ color: branding.theme.mutedForeground, padding: "5px 0" }}>
                  E-mail:
                </Column>
                <Column style={{ textAlign: "right", padding: "5px 0" }}>
                  <a href={`mailto:${customerEmail}`} style={{ color: branding.theme.foreground }}>
                    {customerEmail}
                  </a>
                </Column>
              </Row>
              <Row>
                <Column style={{ color: branding.theme.mutedForeground, padding: "5px 0" }}>
                  Tételek száma:
                </Column>
                <Column style={{ textAlign: "right", padding: "5px 0" }}>{itemCount} db</Column>
              </Row>
              <Row>
                <Column style={{ color: branding.theme.mutedForeground, padding: "5px 0" }}>
                  Szállítás:
                </Column>
                <Column style={{ textAlign: "right", padding: "5px 0" }}>{shippingLabel}</Column>
              </Row>
              <Row>
                <Column
                  style={{
                    padding: "10px 0 5px",
                    borderTop: `2px solid ${branding.theme.foreground}`,
                    fontWeight: 700,
                    fontSize: "16px",
                  }}
                >
                  Végösszeg:
                </Column>
                <Column
                  style={{
                    padding: "10px 0 5px",
                    borderTop: `2px solid ${branding.theme.foreground}`,
                    textAlign: "right",
                    fontWeight: 700,
                    fontSize: "16px",
                  }}
                >
                  {formatHuf(total)}
                </Column>
              </Row>
            </Section>

            <Hr style={{ borderColor: branding.theme.border, margin: "0 0 28px" }} />

            <Button
              href={adminOrderUrl}
              style={{
                display: "inline-block",
                padding: "12px 28px",
                backgroundColor: branding.theme.accent,
                color: branding.theme.accentForeground,
                fontSize: "14px",
                fontWeight: 600,
                textDecoration: "none",
                borderRadius: "6px",
                letterSpacing: "-0.01em",
              }}
            >
              Rendelés megtekintése
            </Button>
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
                margin: 0,
                fontSize: "12px",
                color: branding.theme.mutedForeground,
                lineHeight: "1.6",
              }}
            >
              Ez az e-mail automatikusan lett küldve a {store.name} rendszere által. Kérjük, ne
              válaszolj rá.
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
}

AdminOrderNotificationEmail.PreviewProps = {
  orderId: "00000000-0000-0000-0000-000000000001",
  orderNumber: "0001AB",
  customerName: "Kovács János",
  customerEmail: "kovacs.janos@example.hu",
  itemCount: 3,
  total: 18970,
  shippingMethod: "home",
} satisfies AdminOrderNotificationEmailProps;
