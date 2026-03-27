import Link from "next/link";
import { siteConfig } from "@/lib/config/site.config";
import { Separator } from "@/components/ui/separator";
import { NewsletterForm } from "@/components/shared/newsletter-form";
import { CookieSettingsButton } from "@/components/shared/cookie-settings-button";

/* ------------------------------------------------------------------ */
/*  Column data                                                        */
/* ------------------------------------------------------------------ */

const shopLinks = [
  { label: "Termékek", href: "/products" },
  { label: "Kategóriák", href: "/products?category=all" },
  { label: "Kosár", href: "/cart" },
] as const;

const legalLinks = [
  { label: "ÁSZF", href: "/terms" },
  { label: "Adatvédelem", href: "/privacy" },
  { label: "Szállítás és visszaküldés", href: "/shipping-and-returns" },
  { label: "Cookie szabályzat", href: "/cookie-policy" },
] as const;

/* ------------------------------------------------------------------ */
/*  Footer (server component)                                          */
/* ------------------------------------------------------------------ */

export function Footer() {
  const { store } = siteConfig;
  const currentYear = new Date().getFullYear();

  return (
    <footer className="border-t border-border bg-background">
      {/* ── Main grid ──────────────────────────────────── */}
      <div className="mx-auto max-w-7xl px-6 pb-12 pt-16 lg:px-8">
        <div className="grid gap-12 sm:grid-cols-2 lg:grid-cols-4">
          {/* Brand column */}
          <div className="lg:col-span-1">
            <Link href="/" className="text-xl font-semibold tracking-[-0.04em]">
              {siteConfig.branding.logoText}
            </Link>
            <p className="mt-4 max-w-xs text-sm leading-relaxed text-muted-foreground">
              Prémium termékek, megbízható minőség.
            </p>
          </div>

          {/* Shop links */}
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-[0.1em] text-muted-foreground">
              Bolt
            </h3>
            <ul className="mt-4 flex flex-col gap-3">
              {shopLinks.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-sm text-foreground/80 transition-colors duration-300 hover:text-foreground"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Legal links */}
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-[0.1em] text-muted-foreground">
              Információ
            </h3>
            <ul className="mt-4 flex flex-col gap-3">
              {legalLinks.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-sm text-foreground/80 transition-colors duration-300 hover:text-foreground"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
              <li>
                <CookieSettingsButton />
              </li>
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-[0.1em] text-muted-foreground">
              Kapcsolat
            </h3>
            <ul className="mt-4 flex flex-col gap-3 text-sm text-foreground/80">
              <li>
                <a
                  href={`mailto:${store.email}`}
                  className="transition-colors duration-300 hover:text-foreground"
                >
                  {store.email}
                </a>
              </li>
              <li>
                <a
                  href={`tel:${store.phone.replace(/\s/g, "")}`}
                  className="transition-colors duration-300 hover:text-foreground"
                >
                  {store.phone}
                </a>
              </li>
              <li className="text-muted-foreground">{store.address}</li>
            </ul>
          </div>
        </div>

        {/* ── Newsletter ───────────────────────────────── */}
        <Separator className="my-12" />

        <div className="flex flex-col items-start gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h3 className="text-sm font-semibold">Hírlevél</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Iratkozz fel az újdonságokért és exkluzív ajánlatokért.
            </p>
          </div>
          <NewsletterForm />
        </div>

        {/* ── Copyright ────────────────────────────────── */}
        <Separator className="my-12" />

        <p className="text-xs text-muted-foreground">
          &copy; {currentYear} {store.legalName} — Minden jog fenntartva.
        </p>
      </div>
    </footer>
  );
}
