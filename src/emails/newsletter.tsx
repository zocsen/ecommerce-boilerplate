/* ------------------------------------------------------------------ */
/*  Newsletter Email                                                    */
/*                                                                     */
/*  General-purpose marketing newsletter with headline, body, CTA,     */
/*  and a signed unsubscribe link.                                      */
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
  Button,
  Hr,
  Link,
} from "@react-email/components";

import { siteConfig } from "@/lib/config/site.config";

// ── Types ─────────────────────────────────────────────────────────

export interface NewsletterEmailProps {
  headline: string;
  body: string;
  ctaText: string;
  ctaUrl: string;
  unsubscribeToken: string;
}

// ── Component ─────────────────────────────────────────────────────

export default function NewsletterEmail({
  headline,
  body,
  ctaText,
  ctaUrl,
  unsubscribeToken,
}: NewsletterEmailProps) {
  const { store, branding, urls } = siteConfig;
  const unsubscribeUrl = `${urls.siteUrl}/api/newsletter/unsubscribe?token=${unsubscribeToken}`;

  return (
    <Html lang="hu">
      <Head />
      <Preview>{headline}</Preview>
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
                margin: "0 0 16px",
                fontSize: "28px",
                fontWeight: 700,
                letterSpacing: "-0.02em",
                lineHeight: "1.2",
              }}
            >
              {headline}
            </Heading>

            <Text
              style={{
                margin: "0 0 32px",
                fontSize: "15px",
                lineHeight: "1.7",
                color: "#404040",
              }}
            >
              {body}
            </Text>

            {/* ── CTA ──────────────────────── */}
            <Section style={{ textAlign: "center", marginBottom: "32px" }}>
              <Button
                href={ctaUrl}
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
                {ctaText}
              </Button>
            </Section>

            <Hr style={{ borderColor: branding.theme.border, margin: "0 0 24px" }} />

            {/* ── Unsubscribe ──────────────── */}
            <Text
              style={{
                margin: 0,
                fontSize: "12px",
                color: branding.theme.mutedForeground,
                textAlign: "center",
                lineHeight: "1.6",
              }}
            >
              Ezt a hírlevelet azért kaptad, mert feliratkoztál a(z){" "}
              {store.name} hírlevelére.
              <br />
              <Link
                href={unsubscribeUrl}
                style={{ color: branding.theme.mutedForeground, textDecoration: "underline" }}
              >
                Leiratkozás
              </Link>
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

NewsletterEmail.PreviewProps = {
  headline: "Tavaszi kollekció — most érkezett",
  body: "Fedezd fel legújabb tavaszi kollekcióinkat! Prémium anyagok, letisztult formák, időtálló darabok. Korlátozott ideig ingyenes szállítás minden rendelésre.",
  ctaText: "Kollekció megtekintése",
  ctaUrl: "https://example.hu/products",
  unsubscribeToken: "preview-token",
} satisfies NewsletterEmailProps;
