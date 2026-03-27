import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Toaster } from "@/components/ui/sonner";
import { CookieConsentProvider } from "@/components/providers/cookie-consent-provider";
import { CookieConsentBanner } from "@/components/cookie-consent";
import { siteConfig } from "@/lib/config/site.config";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-sans",
  subsets: ["latin", "latin-ext"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: siteConfig.store.name,
    template: `%s | ${siteConfig.store.name}`,
  },
  description: `${siteConfig.store.name} — Prémium webáruház`,
  metadataBase: new URL(siteConfig.urls.siteUrl),
  openGraph: {
    type: "website",
    locale: "hu_HU",
    siteName: siteConfig.store.name,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="hu" suppressHydrationWarning>
      <body className={`${geistSans.variable} ${geistMono.variable} font-sans antialiased`}>
        <CookieConsentProvider>
          {children}
          <CookieConsentBanner />
        </CookieConsentProvider>
        <Toaster position="bottom-right" richColors closeButton />
      </body>
    </html>
  );
}
