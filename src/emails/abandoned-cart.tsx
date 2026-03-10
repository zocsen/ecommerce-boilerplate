/* ------------------------------------------------------------------ */
/*  Abandoned Cart Email                                                */
/*                                                                     */
/*  Sent when a user leaves items in their cart without purchasing.    */
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
  Button,
  Hr,
  Img,
} from "@react-email/components";

import { siteConfig } from "@/lib/config/site.config";

// ── Types ─────────────────────────────────────────────────────────

export interface AbandonedCartItem {
  title: string;
  price: number;
  image?: string;
}

export interface AbandonedCartEmailProps {
  recipientEmail: string;
  items: AbandonedCartItem[];
}

// ── Helpers ───────────────────────────────────────────────────────

function formatHuf(amount: number): string {
  return `${amount.toLocaleString("hu-HU")} Ft`;
}

// ── Component ─────────────────────────────────────────────────────

export default function AbandonedCartEmail({
  recipientEmail,
  items,
}: AbandonedCartEmailProps) {
  const { store, branding, urls } = siteConfig;
  const cartTotal = items.reduce((sum, item) => sum + item.price, 0);

  return (
    <Html lang="hu">
      <Head />
      <Preview>Elfelejtettél valamit? Termékek várnak a kosaradban.</Preview>
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
              Elfelejtettél valamit?
            </Heading>
            <Text
              style={{
                margin: "0 0 24px",
                color: branding.theme.mutedForeground,
                fontSize: "14px",
              }}
            >
              Észrevettük, hogy termékek maradtak a kosaradban. Ne hagyd, hogy
              lemaradj róluk!
            </Text>

            {/* ── Cart items ───────────────── */}
            <Section style={{ marginBottom: "24px" }}>
              {items.map((item, idx) => (
                <Row
                  key={idx}
                  style={{
                    borderBottom: `1px solid ${branding.theme.muted}`,
                    padding: "12px 0",
                  }}
                >
                  <Column style={{ width: "72px", verticalAlign: "middle" }}>
                    {item.image ? (
                      <Img
                        src={item.image}
                        alt={item.title}
                        width={60}
                        height={60}
                        style={{ borderRadius: "4px", objectFit: "cover", display: "block" }}
                      />
                    ) : (
                      <div
                        style={{
                          width: "60px",
                          height: "60px",
                          backgroundColor: branding.theme.muted,
                          borderRadius: "4px",
                        }}
                      />
                    )}
                  </Column>
                  <Column style={{ verticalAlign: "middle" }}>
                    <Text style={{ margin: 0, fontSize: "14px", fontWeight: 600 }}>
                      {item.title}
                    </Text>
                    <Text
                      style={{
                        margin: "4px 0 0",
                        fontSize: "14px",
                        color: branding.theme.mutedForeground,
                      }}
                    >
                      {formatHuf(item.price)}
                    </Text>
                  </Column>
                </Row>
              ))}
            </Section>

            {/* ── Total ────────────────────── */}
            <Section style={{ marginBottom: "32px" }}>
              <Row>
                <Column style={{ fontSize: "14px", color: branding.theme.mutedForeground }}>
                  Összesen:
                </Column>
                <Column
                  style={{ textAlign: "right", fontSize: "16px", fontWeight: 700 }}
                >
                  {formatHuf(cartTotal)}
                </Column>
              </Row>
            </Section>

            {/* ── CTA ──────────────────────── */}
            <Section style={{ textAlign: "center", marginBottom: "32px" }}>
              <Button
                href={`${urls.siteUrl}/cart`}
                style={{
                  display: "inline-block",
                  padding: "14px 32px",
                  backgroundColor: branding.theme.foreground,
                  color: branding.theme.background,
                  fontSize: "14px",
                  fontWeight: 600,
                  textDecoration: "none",
                  borderRadius: "6px",
                  letterSpacing: "0.01em",
                }}
              >
                Vissza a kosárhoz
              </Button>
            </Section>

            <Hr style={{ borderColor: branding.theme.border, margin: "0 0 16px" }} />

            <Text
              style={{
                margin: 0,
                fontSize: "12px",
                color: branding.theme.mutedForeground,
                textAlign: "center",
                lineHeight: "1.6",
              }}
            >
              Ezt az emailt a(z) {recipientEmail} címre küldtük. Ha nem te
              vagy az, kérjük hagyd figyelmen kívül.
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

AbandonedCartEmail.PreviewProps = {
  recipientEmail: "teszt@example.hu",
  items: [
    { title: "Prémium póló", price: 6000 },
    { title: "Klasszikus nadrág", price: 12500 },
  ],
} satisfies AbandonedCartEmailProps;
