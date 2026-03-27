/* ------------------------------------------------------------------ */
/*  Welcome Email                                                      */
/*                                                                     */
/*  Sent on the user's first sign-in after account creation.          */
/*  All text in Hungarian.                                             */
/* ------------------------------------------------------------------ */

import {
  Html,
  Head,
  Preview,
  Body,
  Container,
  Section,
  Heading,
  Text,
  Hr,
  Button,
} from "@react-email/components";

import { siteConfig } from "@/lib/config/site.config";

// ── Types ─────────────────────────────────────────────────────────

export interface WelcomeEmailProps {
  name: string;
}

// ── Component ─────────────────────────────────────────────────────

export default function WelcomeEmail({ name }: WelcomeEmailProps) {
  const { store, branding, urls } = siteConfig;

  return (
    <Html lang="hu">
      <Head />
      <Preview>Üdvözlünk a {store.name} webáruházban!</Preview>
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
              Üdvözlünk, {name}!
            </Heading>
            <Text
              style={{
                margin: "0 0 24px",
                fontSize: "14px",
                lineHeight: "1.7",
                color: branding.theme.foreground,
              }}
            >
              Örülünk, hogy csatlakoztál hozzánk. A {store.name} webáruházban prémium termékeket
              találsz gyors szállítással és egyszerű visszárukezeléssel.
            </Text>

            <Text
              style={{
                margin: "0 0 32px",
                fontSize: "14px",
                lineHeight: "1.7",
                color: branding.theme.mutedForeground,
              }}
            >
              Ha bármilyen kérdésed van, írj nekünk:{" "}
              <a href={`mailto:${urls.supportEmail}`} style={{ color: branding.theme.foreground }}>
                {urls.supportEmail}
              </a>
            </Text>

            <Button
              href={`${urls.siteUrl}/products`}
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
              Vásárlás megkezdése
            </Button>
          </Section>

          <Hr style={{ borderColor: branding.theme.border, margin: 0 }} />

          {/* ── Footer ──────────────────────────────────── */}
          <Section style={{ padding: "24px 40px 32px" }}>
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
                margin: 0,
                fontSize: "12px",
                color: branding.theme.mutedForeground,
                lineHeight: "1.6",
              }}
            >
              {store.email} &middot; {store.phone}
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
}

WelcomeEmail.PreviewProps = {
  name: "Kovács János",
} satisfies WelcomeEmailProps;
