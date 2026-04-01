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
  CreditCard,
  Lock,
  Building2,
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
  /** Plan feature key; when missing from plan the item renders with a lock */
  planFeature?: string;
}

const navItems: NavItem[] = [
  { label: "Dashboard", href: "/admin", icon: LayoutDashboard },
  { label: "Rendelések", href: "/admin/orders", icon: ShoppingCart },
  { label: "Termékek", href: "/admin/products", icon: Package },
  { label: "Kategóriák", href: "/admin/categories", icon: FolderTree },
  {
    label: "Kuponok",
    href: "/admin/coupons",
    icon: Ticket,
    featureFlag: "enableCoupons",
    planFeature: "enable_coupons",
  },
  { label: "Szállítás", href: "/admin/shipping", icon: Truck },
  {
    label: "Marketing",
    href: "/admin/marketing",
    icon: Megaphone,
    featureFlag: "enableMarketingModule",
    planFeature: "enable_marketing_module",
  },
  { label: "Oldalak", href: "/admin/pages/about", icon: BookOpen },
  { label: "Beállítások", href: "/admin/settings", icon: Settings },
  { label: "Audit log", href: "/admin/audit", icon: FileText },
  { label: "Előfizetés", href: "/admin/subscription", icon: CreditCard },
];

/* ------------------------------------------------------------------ */
/*  Shared navigation list                                             */
/* ------------------------------------------------------------------ */

function NavLinks({
  pathname,
  isAgencyViewer,
  isAgencyOwner,
  enableAgencyMode,
  enabledFeatures,
  planFeatures,
  onNavigate,
}: {
  pathname: string;
  isAgencyViewer: boolean;
  isAgencyOwner?: boolean;
  enableAgencyMode?: boolean;
  enabledFeatures?: Record<string, boolean>;
  planFeatures?: Record<string, boolean | number>;
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
        const isLocked =
          item.planFeature !== undefined &&
          planFeatures !== undefined &&
          planFeatures[item.planFeature] === false;

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
              isLocked && "opacity-50",
            )}
          >
            <item.icon className="size-4 shrink-0" />
            <span className="flex-1">{item.label}</span>
            {isLocked && <Lock className="size-3 shrink-0 opacity-60" />}
          </Link>
        );
      })}

      {enableAgencyMode && isAgencyOwner && (
        <>
          <Separator className="my-3" />
          <Link
            href="/agency"
            onClick={onNavigate}
            className="text-muted-foreground hover:bg-muted hover:text-foreground flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all duration-300"
          >
            <Building2 className="size-4 shrink-0" />
            <span className="flex-1">Ügynökségi kezelő</span>
          </Link>
        </>
      )}

      {isAgencyViewer && (
        <>
          <Separator className="my-3" />
          <div className="px-3">
            <Badge variant="secondary" className="text-[10px] tracking-wider uppercase">
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
  isAgencyOwner,
  enableAgencyMode,
  enabledFeatures,
  planFeatures,
}: {
  collapsed: boolean;
  isAgencyViewer: boolean;
  isAgencyOwner?: boolean;
  enableAgencyMode?: boolean;
  enabledFeatures?: Record<string, boolean>;
  planFeatures?: Record<string, boolean | number>;
}) {
  const pathname = usePathname();

  if (collapsed) return null;

  return (
    <aside className="border-border bg-background hidden w-[260px] shrink-0 border-r lg:flex lg:flex-col">
      {/* Logo area */}
      <div className="border-border flex h-16 items-center border-b px-6">
        <Link
          href="/admin"
          className="text-foreground text-sm font-semibold tracking-[0.15em] uppercase"
        >
          Admin
        </Link>
      </div>

      {/* Navigation */}
      <div className="flex-1 overflow-y-auto px-3 py-4">
        <NavLinks
          pathname={pathname}
          isAgencyViewer={isAgencyViewer}
          isAgencyOwner={isAgencyOwner}
          enableAgencyMode={enableAgencyMode}
          enabledFeatures={enabledFeatures}
          planFeatures={planFeatures}
        />
      </div>

      {/* Footer */}
      <div className="border-border space-y-0.5 border-t p-3">
        <Link
          href="/"
          className="text-muted-foreground hover:bg-muted hover:text-foreground flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors duration-300"
        >
          <ArrowLeft className="size-4" />
          Vissza a boltba
        </Link>
        <Link
          href="/logout"
          className="text-muted-foreground hover:bg-muted hover:text-destructive flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors duration-300"
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
  isAgencyOwner,
  enableAgencyMode,
  enabledFeatures,
  planFeatures,
}: {
  isAgencyViewer: boolean;
  isAgencyOwner?: boolean;
  enableAgencyMode?: boolean;
  enabledFeatures?: Record<string, boolean>;
  planFeatures?: Record<string, boolean | number>;
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
        <SheetHeader className="border-border border-b px-6">
          <SheetTitle className="text-left text-sm font-semibold tracking-[0.15em] uppercase">
            Admin
          </SheetTitle>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto px-3 py-4">
          <NavLinks
            pathname={pathname}
            isAgencyViewer={isAgencyViewer}
            isAgencyOwner={isAgencyOwner}
            enableAgencyMode={enableAgencyMode}
            enabledFeatures={enabledFeatures}
            planFeatures={planFeatures}
          />
        </div>

        <div className="border-border space-y-0.5 border-t p-3">
          <SheetClose
            render={
              <Link
                href="/"
                className="text-muted-foreground hover:bg-muted hover:text-foreground flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors duration-300"
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
                className="text-muted-foreground hover:bg-muted hover:text-destructive flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors duration-300"
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
  isAgencyOwner,
  enableAgencyMode,
  enabledFeatures,
  planFeatures,
}: {
  collapsed: boolean;
  onToggleCollapse: () => void;
  isAgencyViewer: boolean;
  isAgencyOwner?: boolean;
  enableAgencyMode?: boolean;
  enabledFeatures?: Record<string, boolean>;
  planFeatures?: Record<string, boolean | number>;
}) {
  return (
    <header className="border-border bg-background flex h-16 shrink-0 items-center justify-between border-b px-4 lg:px-6">
      <div className="flex items-center gap-3">
        {/* Mobile hamburger */}
        <MobileSidebar
          isAgencyViewer={isAgencyViewer}
          isAgencyOwner={isAgencyOwner}
          enableAgencyMode={enableAgencyMode}
          enabledFeatures={enabledFeatures}
          planFeatures={planFeatures}
        />

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

        <span className="text-muted-foreground text-xs font-semibold tracking-[0.15em] uppercase lg:hidden">
          Admin
        </span>
      </div>

      <div className="flex items-center gap-2">
        {isAgencyOwner && (
          <Badge variant="secondary" className="text-[10px] tracking-wider uppercase">
            Agency Owner
          </Badge>
        )}
        {isAgencyViewer && !isAgencyOwner && (
          <Badge variant="outline" className="text-[10px] tracking-wider uppercase">
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
  isAgencyOwner = false,
  enableAgencyMode = false,
  enabledFeatures,
  planFeatures,
}: {
  children: React.ReactNode;
  isAgencyViewer?: boolean;
  isAgencyOwner?: boolean;
  enableAgencyMode?: boolean;
  enabledFeatures?: Record<string, boolean>;
  planFeatures?: Record<string, boolean | number>;
}) {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div className="bg-muted/30 flex h-screen overflow-hidden">
      <DesktopSidebar
        collapsed={collapsed}
        isAgencyViewer={isAgencyViewer}
        isAgencyOwner={isAgencyOwner}
        enableAgencyMode={enableAgencyMode}
        enabledFeatures={enabledFeatures}
        planFeatures={planFeatures}
      />

      <div className="flex flex-1 flex-col overflow-hidden">
        <TopBar
          collapsed={collapsed}
          onToggleCollapse={() => setCollapsed((prev) => !prev)}
          isAgencyViewer={isAgencyViewer}
          isAgencyOwner={isAgencyOwner}
          enableAgencyMode={enableAgencyMode}
          enabledFeatures={enabledFeatures}
          planFeatures={planFeatures}
        />

        <main className="flex-1 overflow-y-auto">
          <div className="mx-auto max-w-7xl px-4 py-6 lg:px-8">{children}</div>
        </main>
      </div>
    </div>
  );
}
