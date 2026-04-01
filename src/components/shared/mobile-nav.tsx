"use client"

import Link from "next/link"
import { ShoppingBag, User, LogIn, Menu } from "lucide-react"
import { siteConfig } from "@/lib/config/site.config"
import { Button } from "@/components/ui/button"
import {
  Sheet,
  SheetTrigger,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetClose,
} from "@/components/ui/sheet"
import { Separator } from "@/components/ui/separator"
import { useUIStore } from "@/lib/store/ui"

/* ------------------------------------------------------------------ */
/*  Nav links                                                          */
/* ------------------------------------------------------------------ */

const navLinks = [
  { label: "Termékek", href: "/products" },
  { label: "Kategóriák", href: "/products?category=all" },
] as const

/* ------------------------------------------------------------------ */
/*  MobileNav — slide-out side menu for small screens                  */
/* ------------------------------------------------------------------ */

interface MobileNavProps {
  accountHref: string
  accountLabel: string
  isLoggedIn: boolean
  enableAccounts: boolean
}

export function MobileNav({
  accountHref,
  accountLabel,
  isLoggedIn,
  enableAccounts,
}: MobileNavProps) {
  const { branding } = siteConfig
  const openCartDrawer = useUIStore((s) => s.openCartDrawer)

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

          {/* Cart — closes mobile nav and opens the cart drawer */}
          <SheetClose
            className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm font-medium text-foreground transition-colors duration-300 hover:bg-muted"
            onClick={() => {
              // Let the mobile sheet close animation finish before opening drawer
              setTimeout(() => openCartDrawer(), 300)
            }}
          >
            <ShoppingBag className="size-4" />
            Kosár
          </SheetClose>

          {enableAccounts && (
            <SheetClose
              render={
                <Link
                  href={accountHref}
                  className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-foreground transition-colors duration-300 hover:bg-muted"
                />
              }
            >
              {isLoggedIn ? <User className="size-4" /> : <LogIn className="size-4" />}
              {accountLabel}
            </SheetClose>
          )}
        </nav>
      </SheetContent>
    </Sheet>
  )
}
