import Link from "next/link"
import { User, LogIn } from "lucide-react"
import { siteConfig } from "@/lib/config/site.config"
import { Button } from "@/components/ui/button"
import { CartDrawer } from "@/components/cart/cart-drawer"
import { MobileNav } from "@/components/shared/mobile-nav"
import { getCurrentProfile } from "@/lib/security/roles"
import type { AppRole } from "@/lib/types/database"

/* ------------------------------------------------------------------ */
/*  Navigation data                                                    */
/* ------------------------------------------------------------------ */

const navLinks = [
  { label: "Termékek", href: "/products" },
  { label: "Kategóriák", href: "/products?category=all" },
] as const

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function getAccountHref(role: AppRole | null): string {
  if (!role) return "/login"
  if (role === "admin" || role === "agency_viewer") return "/admin"
  return "/profile"
}

function getAccountLabel(role: AppRole | null): string {
  if (!role) return "Bejelentkezés"
  if (role === "admin" || role === "agency_viewer") return "Admin"
  return "Fiókom"
}

/* ------------------------------------------------------------------ */
/*  Header (async server component)                                    */
/* ------------------------------------------------------------------ */

export async function Header() {
  const { branding, features } = siteConfig

  const profile = await getCurrentProfile()
  const role = profile?.role ?? null
  const accountHref = getAccountHref(role)
  const accountLabel = getAccountLabel(role)
  const isLoggedIn = role !== null

  return (
    <header className="sticky top-0 z-40 w-full border-b border-border bg-background/95 backdrop-blur-sm supports-backdrop-filter:bg-background/80">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6 lg:px-8">
        {/* -- Logo -- */}
        <Link
          href="/"
          className="text-xl font-semibold tracking-[-0.04em] transition-opacity duration-500 ease-out hover:opacity-70"
        >
          {branding.logoText}
        </Link>

        {/* -- Desktop nav -- */}
        <nav className="hidden items-center gap-8 md:flex">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="text-sm font-medium text-muted-foreground transition-colors duration-300 hover:text-foreground"
            >
              {link.label}
            </Link>
          ))}
        </nav>

        {/* -- Actions -- */}
        <div className="flex items-center gap-1">
          {/* Cart drawer */}
          <CartDrawer />

          {/* Account / Login */}
          {features.enableAccounts && (
            <Link href={accountHref} className="hidden md:inline-flex">
              <Button variant="ghost" size="icon">
                {isLoggedIn ? <User className="size-[18px]" /> : <LogIn className="size-[18px]" />}
                <span className="sr-only">{accountLabel}</span>
              </Button>
            </Link>
          )}

          {/* Mobile menu */}
          <div className="md:hidden">
            <MobileNav
              accountHref={accountHref}
              accountLabel={accountLabel}
              isLoggedIn={isLoggedIn}
              enableAccounts={features.enableAccounts}
            />
          </div>
        </div>
      </div>
    </header>
  )
}
