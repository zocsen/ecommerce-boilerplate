"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  ShoppingCart,
  Package,
  FolderTree,
  Ticket,
  Truck,
  Megaphone,
  BookOpen,
  Settings,
  FileText,
  Menu,
  X,
  LogOut,
  ArrowLeft,
  PanelLeftClose,
  PanelRightClose,
} from "lucide-react";
import { cn } from "@/lib/utils";
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
import { Badge } from "@/components/ui/badge";

/* ------------------------------------------------------------------ */
/*  Admin sidebar navigation items                                     */
/* ------------------------------------------------------------------ */

interface NavItem {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  featureFlag?: keyof typeof import("@/lib/config/site.config").siteConfig.features;
}

const navItems: NavItem[] = [
  { label: "Dashboard", href: "/admin", icon: LayoutDashboard },
  { label: "Rendelések", href: "/admin/orders", icon: ShoppingCart },
  { label: "Termékek", href: "/admin/products", icon: Package },
  { label: "Kategóriák", href: "/admin/categories", icon: FolderTree },
  { label: "Kuponok", href: "/admin/coupons", icon: Ticket, featureFlag: "enableCoupons" },
  { label: "Szállítás", href: "/admin/shipping", icon: Truck },
  {
    label: "Marketing",
    href: "/admin/marketing",
    icon: Megaphone,
    featureFlag: "enableMarketingModule",
  },
  { label: "Oldalak", href: "/admin/pages/about", icon: BookOpen },
  { label: "Beállítások", href: "/admin/settings", icon: Settings },
  { label: "Audit log", href: "/admin/audit", icon: FileText },
];

/* ------------------------------------------------------------------ */
/*  Shared navigation list                                             */
/* ------------------------------------------------------------------ */

function NavLinks({
  pathname,
  isAgencyViewer,
  enabledFeatures,
  onNavigate,
}: {
  pathname: string;
  isAgencyViewer: boolean;
  enabledFeatures?: Record<string, boolean>;
  onNavigate?: () => void;
}) {
  const visibleItems = navItems.filter((item) => {
    if (!item.featureFlag) return true;
    return enabledFeatures?.[item.featureFlag] !== false;
  });

  return (
    <nav className="flex flex-col gap-1">
      {visibleItems.map((item) => {
        const isActive =
          pathname === item.href || (item.href !== "/admin" && pathname.startsWith(item.href));

        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            className={cn(
              "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all duration-300",
              isActive
                ? "bg-foreground text-background"
                : "text-muted-foreground hover:bg-muted hover:text-foreground",
            )}
          >
            <item.icon className="size-4 shrink-0" />
            {item.label}
          </Link>
        );
      })}

      {isAgencyViewer && (
        <>
          <Separator className="my-3" />
          <div className="px-3">
            <Badge variant="secondary" className="text-[10px] uppercase tracking-wider">
              Csak olvasás
            </Badge>
          </div>
        </>
      )}
    </nav>
  );
}

/* ------------------------------------------------------------------ */
/*  Desktop sidebar                                                    */
/* ------------------------------------------------------------------ */

function DesktopSidebar({
  collapsed,
  isAgencyViewer,
  enabledFeatures,
}: {
  collapsed: boolean;
  isAgencyViewer: boolean;
  enabledFeatures?: Record<string, boolean>;
}) {
  const pathname = usePathname();

  if (collapsed) return null;

  return (
    <aside className="hidden w-[260px] shrink-0 border-r border-border bg-background lg:flex lg:flex-col">
      {/* Logo area */}
      <div className="flex h-16 items-center border-b border-border px-6">
        <Link
          href="/admin"
          className="text-sm font-semibold uppercase tracking-[0.15em] text-foreground"
        >
          Admin
        </Link>
      </div>

      {/* Navigation */}
      <div className="flex-1 overflow-y-auto px-3 py-4">
        <NavLinks
          pathname={pathname}
          isAgencyViewer={isAgencyViewer}
          enabledFeatures={enabledFeatures}
        />
      </div>

      {/* Footer */}
      <div className="border-t border-border p-3 space-y-0.5">
        <Link
          href="/"
          className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-muted-foreground transition-colors duration-300 hover:bg-muted hover:text-foreground"
        >
          <ArrowLeft className="size-4" />
          Vissza a boltba
        </Link>
        <Link
          href="/logout"
          className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-muted-foreground transition-colors duration-300 hover:bg-muted hover:text-destructive"
        >
          <LogOut className="size-4" />
          Kijelentkezés
        </Link>
      </div>
    </aside>
  );
}

/* ------------------------------------------------------------------ */
/*  Mobile sidebar (Sheet)                                             */
/* ------------------------------------------------------------------ */

function MobileSidebar({
  isAgencyViewer,
  enabledFeatures,
}: {
  isAgencyViewer: boolean;
  enabledFeatures?: Record<string, boolean>;
}) {
  const pathname = usePathname();

  return (
    <Sheet>
      <SheetTrigger
        render={
          <Button variant="ghost" size="icon" className="lg:hidden">
            <Menu className="size-[18px]" />
            <span className="sr-only">Menü megnyitása</span>
          </Button>
        }
      />
      <SheetContent side="left" className="w-[280px] p-0">
        <SheetHeader className="border-b border-border px-6">
          <SheetTitle className="text-left text-sm font-semibold uppercase tracking-[0.15em]">
            Admin
          </SheetTitle>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto px-3 py-4">
          <NavLinks
            pathname={pathname}
            isAgencyViewer={isAgencyViewer}
            enabledFeatures={enabledFeatures}
          />
        </div>

        <div className="border-t border-border p-3 space-y-0.5">
          <SheetClose
            render={
              <Link
                href="/"
                className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-muted-foreground transition-colors duration-300 hover:bg-muted hover:text-foreground"
              />
            }
          >
            <ArrowLeft className="size-4" />
            Vissza a boltba
          </SheetClose>
          <SheetClose
            render={
              <Link
                href="/logout"
                className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-muted-foreground transition-colors duration-300 hover:bg-muted hover:text-destructive"
              />
            }
          >
            <LogOut className="size-4" />
            Kijelentkezés
          </SheetClose>
        </div>
      </SheetContent>
    </Sheet>
  );
}

/* ------------------------------------------------------------------ */
/*  Top bar                                                            */
/* ------------------------------------------------------------------ */

function TopBar({
  collapsed,
  onToggleCollapse,
  isAgencyViewer,
  enabledFeatures,
}: {
  collapsed: boolean;
  onToggleCollapse: () => void;
  isAgencyViewer: boolean;
  enabledFeatures?: Record<string, boolean>;
}) {
  return (
    <header className="flex h-16 shrink-0 items-center justify-between border-b border-border bg-background px-4 lg:px-6">
      <div className="flex items-center gap-3">
        {/* Mobile hamburger */}
        <MobileSidebar isAgencyViewer={isAgencyViewer} enabledFeatures={enabledFeatures} />

        {/* Desktop collapse toggle */}
        <Button
          variant="ghost"
          size="icon"
          onClick={onToggleCollapse}
          className="hidden lg:inline-flex"
        >
          {collapsed ? (
            <PanelRightClose className="size-[18px]" />
          ) : (
            <PanelLeftClose className="size-[18px]" />
          )}
          <span className="sr-only">{collapsed ? "Sidebar megnyitása" : "Sidebar bezárása"}</span>
        </Button>

        <span className="text-xs font-semibold uppercase tracking-[0.15em] text-muted-foreground lg:hidden">
          Admin
        </span>
      </div>

      <div className="flex items-center gap-2">
        {isAgencyViewer && (
          <Badge variant="outline" className="text-[10px] uppercase tracking-wider">
            Agency Viewer
          </Badge>
        )}
      </div>
    </header>
  );
}

/* ------------------------------------------------------------------ */
/*  Exported AdminShell — combines sidebar + topbar + content area     */
/* ------------------------------------------------------------------ */

export function AdminShell({
  children,
  isAgencyViewer = false,
  enabledFeatures,
}: {
  children: React.ReactNode;
  isAgencyViewer?: boolean;
  enabledFeatures?: Record<string, boolean>;
}) {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div className="flex h-screen overflow-hidden bg-muted/30">
      <DesktopSidebar
        collapsed={collapsed}
        isAgencyViewer={isAgencyViewer}
        enabledFeatures={enabledFeatures}
      />

      <div className="flex flex-1 flex-col overflow-hidden">
        <TopBar
          collapsed={collapsed}
          onToggleCollapse={() => setCollapsed((prev) => !prev)}
          isAgencyViewer={isAgencyViewer}
          enabledFeatures={enabledFeatures}
        />

        <main className="flex-1 overflow-y-auto">
          <div className="mx-auto max-w-7xl px-4 py-6 lg:px-8">{children}</div>
        </main>
      </div>
    </div>
  );
}
