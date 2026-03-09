import Link from "next/link";
import { ShoppingBag, User, Menu } from "lucide-react";
import { siteConfig } from "@/lib/config/site.config";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetTrigger,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetClose,
} from "@/components/ui/sheet";
import { Separator } from "@/components/ui/separator";
import { CartCount } from "@/components/shared/cart-count";

/* ------------------------------------------------------------------ */
/*  Navigation data                                                    */
/* ------------------------------------------------------------------ */

const navLinks = [
  { label: "Termékek", href: "/products" },
  { label: "Kategóriák", href: "/products?category=all" },
] as const;

/* ------------------------------------------------------------------ */
/*  Header (server component)                                          */
/* ------------------------------------------------------------------ */

export function Header() {
  const { branding, features } = siteConfig;

  return (
    <header className="sticky top-0 z-40 w-full border-b border-border bg-background/95 backdrop-blur-sm supports-backdrop-filter:bg-background/80">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6 lg:px-8">
        {/* ── Logo ─────────────────────────────────────── */}
        <Link
          href="/"
          className="text-xl font-semibold tracking-[-0.04em] transition-opacity duration-500 ease-out hover:opacity-70"
        >
          {branding.logoText}
        </Link>

        {/* ── Desktop nav ──────────────────────────────── */}
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

        {/* ── Actions ──────────────────────────────────── */}
        <div className="flex items-center gap-1">
          {/* Cart */}
          <Link href="/cart">
            <Button variant="ghost" size="icon" className="relative">
              <ShoppingBag className="size-[18px]" />
              <CartCount />
              <span className="sr-only">Kosár</span>
            </Button>
          </Link>

          {/* Account */}
          {features.enableAccounts && (
            <Link href="/login" className="hidden md:inline-flex">
              <Button variant="ghost" size="icon">
                <User className="size-[18px]" />
                <span className="sr-only">Fiók</span>
              </Button>
            </Link>
          )}

          {/* Mobile menu trigger */}
          <div className="md:hidden">
            <MobileNav />
          </div>
        </div>
      </div>
    </header>
  );
}

/* ------------------------------------------------------------------ */
/*  Mobile navigation (uses Sheet — needs client boundary via Sheet)   */
/* ------------------------------------------------------------------ */

function MobileNav() {
  const { branding, features } = siteConfig;

  return (
    <Sheet>
      <SheetTrigger
        render={
          <Button variant="ghost" size="icon">
            <Menu className="size-[18px]" />
            <span className="sr-only">Menü megnyitása</span>
          </Button>
        }
      />
      <SheetContent side="right" className="w-[280px] sm:w-[320px]">
        <SheetHeader>
          <SheetTitle className="text-left text-lg font-semibold tracking-[-0.04em]">
            {branding.logoText}
          </SheetTitle>
        </SheetHeader>

        <Separator />

        <nav className="flex flex-col gap-1 px-4">
          {navLinks.map((link) => (
            <SheetClose
              key={link.href}
              render={
                <Link
                  href={link.href}
                  className="rounded-lg px-3 py-2.5 text-sm font-medium text-foreground transition-colors duration-300 hover:bg-muted"
                />
              }
            >
              {link.label}
            </SheetClose>
          ))}

          <Separator className="my-2" />

          <SheetClose
            render={
              <Link
                href="/cart"
                className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-foreground transition-colors duration-300 hover:bg-muted"
              />
            }
          >
            <ShoppingBag className="size-4" />
            Kosár
          </SheetClose>

          {features.enableAccounts && (
            <SheetClose
              render={
                <Link
                  href="/login"
                  className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-foreground transition-colors duration-300 hover:bg-muted"
                />
              }
            >
              <User className="size-4" />
              Bejelentkezés
            </SheetClose>
          )}
        </nav>
      </SheetContent>
    </Sheet>
  );
}
