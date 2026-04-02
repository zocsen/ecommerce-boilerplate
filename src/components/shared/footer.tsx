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
  { label: "Blog", href: "/blog" },
  { label: "Rólunk", href: "/about" },
  { label: "Kosár", href: "/cart" },
  { label: "Rendeléskövetés", href: "/order-tracking" },
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
    <footer className="border-border bg-background border-t">
      {/* ── Main grid ──────────────────────────────────── */}
      <div className="mx-auto max-w-7xl px-6 pt-16 pb-12 lg:px-8">
        <div className="grid gap-12 sm:grid-cols-2 lg:grid-cols-4">
          {/* Brand column */}
          <div className="lg:col-span-1">
            <Link href="/" className="text-xl font-semibold tracking-[-0.04em]">
              {siteConfig.branding.logoText}
            </Link>
            <p className="text-muted-foreground mt-4 max-w-xs text-sm leading-relaxed">
              Prémium termékek, megbízható minőség.
            </p>
          </div>

          {/* Shop links */}
          <div>
            <h3 className="text-muted-foreground text-xs font-semibold tracking-[0.1em] uppercase">
              Bolt
            </h3>
            <ul className="mt-4 flex flex-col gap-3">
              {shopLinks.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-foreground/80 hover:text-foreground text-sm transition-colors duration-300"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Legal links */}
          <div>
            <h3 className="text-muted-foreground text-xs font-semibold tracking-[0.1em] uppercase">
              Információ
            </h3>
            <ul className="mt-4 flex flex-col gap-3">
              {legalLinks.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-foreground/80 hover:text-foreground text-sm transition-colors duration-300"
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
            <h3 className="text-muted-foreground text-xs font-semibold tracking-[0.1em] uppercase">
              Kapcsolat
            </h3>
            <ul className="text-foreground/80 mt-4 flex flex-col gap-3 text-sm">
              <li>
                <a
                  href={`mailto:${store.email}`}
                  className="hover:text-foreground transition-colors duration-300"
                >
                  {store.email}
                </a>
              </li>
              <li>
                <a
                  href={`tel:${store.phone.replace(/\s/g, "")}`}
                  className="hover:text-foreground transition-colors duration-300"
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
            <p className="text-muted-foreground mt-1 text-sm">
              Iratkozz fel az újdonságokért és exkluzív ajánlatokért.
            </p>
          </div>
          <NewsletterForm />
        </div>

        {/* ── Copyright ────────────────────────────────── */}
        <Separator className="my-12" />

        <p className="text-muted-foreground text-xs">
          &copy; {currentYear} {store.legalName} — Minden jog fenntartva.
        </p>
      </div>
    </footer>
  );
}
