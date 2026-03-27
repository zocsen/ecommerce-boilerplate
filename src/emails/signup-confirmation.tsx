/* ------------------------------------------------------------------ */
/*  Signup Confirmation Email                                          */
/*                                                                     */
/*  Sent after a new email+password registration.                     */
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

export interface SignupConfirmationEmailProps {
  name: string;
}

// ── Component ─────────────────────────────────────────────────────

export default function SignupConfirmationEmail({ name }: SignupConfirmationEmailProps) {
  const { store, branding, urls } = siteConfig;

  return (
    <Html lang="hu">
      <Head />
      <Preview>Sikeres regisztráció – {store.name}</Preview>
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
              Sikeres regisztráció
            </Heading>
            <Text
              style={{
                margin: "0 0 24px",
                color: branding.theme.mutedForeground,
                fontSize: "14px",
                lineHeight: "1.6",
              }}
            >
              Kedves {name}!
            </Text>
            <Text
              style={{
                margin: "0 0 32px",
                fontSize: "14px",
                lineHeight: "1.7",
                color: branding.theme.foreground,
              }}
            >
              Sikeresen létrehoztad fiókodat a {store.name} webáruházban. Mostantól böngészhetsz
              termékeink között, leadhatsz rendeléseket és nyomon követheted azok állapotát.
            </Text>

            <Button
              href={`${urls.siteUrl}/login`}
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
              Belépés
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

SignupConfirmationEmail.PreviewProps = {
  name: "Kovács János",
} satisfies SignupConfirmationEmailProps;
