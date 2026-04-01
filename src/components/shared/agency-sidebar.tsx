"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  BookOpen,
  Menu,
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
import { Badge } from "@/components/ui/badge";

/* ------------------------------------------------------------------ */
/*  Agency sidebar navigation items                                    */
/* ------------------------------------------------------------------ */

interface NavItem {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
}

const navItems: NavItem[] = [
  { label: "Áttekintés", href: "/agency", icon: LayoutDashboard },
  { label: "Ügyfelek", href: "/agency/clients", icon: Users },
  { label: "Csomagok", href: "/agency/plans", icon: BookOpen },
];

/* ------------------------------------------------------------------ */
/*  Shared navigation list                                             */
/* ------------------------------------------------------------------ */

function NavLinks({ pathname, onNavigate }: { pathname: string; onNavigate?: () => void }) {
  return (
    <nav className="flex flex-col gap-1">
      {navItems.map((item) => {
        const isActive =
          pathname === item.href || (item.href !== "/agency" && pathname.startsWith(item.href));

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
            <span className="flex-1">{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}

/* ------------------------------------------------------------------ */
/*  Desktop sidebar                                                    */
/* ------------------------------------------------------------------ */

function DesktopSidebar({ collapsed }: { collapsed: boolean }) {
  const pathname = usePathname();

  if (collapsed) return null;

  return (
    <aside className="border-border bg-background hidden w-[260px] shrink-0 border-r lg:flex lg:flex-col">
      {/* Logo area */}
      <div className="border-border flex h-16 items-center border-b px-6">
        <Link
          href="/agency"
          className="text-foreground text-sm font-semibold tracking-[0.15em] uppercase"
        >
          Agency
        </Link>
      </div>

      {/* Navigation */}
      <div className="flex-1 overflow-y-auto px-3 py-4">
        <NavLinks pathname={pathname} />
      </div>

      {/* Footer */}
      <div className="border-border space-y-0.5 border-t p-3">
        <Link
          href="/admin"
          className="text-muted-foreground hover:bg-muted hover:text-foreground flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors duration-300"
        >
          <ArrowLeft className="size-4" />
          Bolt admin
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

function MobileSidebar() {
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
            Agency
          </SheetTitle>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto px-3 py-4">
          <NavLinks pathname={pathname} />
        </div>

        <div className="border-border space-y-0.5 border-t p-3">
          <SheetClose
            render={
              <Link
                href="/admin"
                className="text-muted-foreground hover:bg-muted hover:text-foreground flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors duration-300"
              />
            }
          >
            <ArrowLeft className="size-4" />
            Bolt admin
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
}: {
  collapsed: boolean;
  onToggleCollapse: () => void;
}) {
  return (
    <header className="border-border bg-background flex h-16 shrink-0 items-center justify-between border-b px-4 lg:px-6">
      <div className="flex items-center gap-3">
        {/* Mobile hamburger */}
        <MobileSidebar />

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
          Agency
        </span>
      </div>

      <div className="flex items-center gap-2">
        <Badge variant="secondary" className="text-[10px] tracking-wider uppercase">
          Agency Owner
        </Badge>
      </div>
    </header>
  );
}

/* ------------------------------------------------------------------ */
/*  Exported AgencyShell — combines sidebar + topbar + content area    */
/* ------------------------------------------------------------------ */

export function AgencyShell({ children }: { children: React.ReactNode }) {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div className="bg-muted/30 flex h-screen overflow-hidden">
      <DesktopSidebar collapsed={collapsed} />

      <div className="flex flex-1 flex-col overflow-hidden">
        <TopBar collapsed={collapsed} onToggleCollapse={() => setCollapsed((prev) => !prev)} />

        <main className="flex-1 overflow-y-auto">
          <div className="mx-auto max-w-7xl px-4 py-6 lg:px-8">{children}</div>
        </main>
      </div>
    </div>
  );
}
