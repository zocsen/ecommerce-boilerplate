import Link from "next/link";
import { User, Package, MapPin, Settings, LogOut } from "lucide-react";
import { getCurrentProfile } from "@/lib/security/roles";
import { redirect } from "next/navigation";

/* ------------------------------------------------------------------ */
/*  Profile layout — sidebar navigation for customer account pages     */
/* ------------------------------------------------------------------ */

const sidebarLinks = [
  { href: "/profile", label: "Áttekintés", icon: User },
  { href: "/profile/orders", label: "Rendeléseim", icon: Package },
  { href: "/profile/addresses", label: "Címeim", icon: MapPin },
  { href: "/profile/settings", label: "Beállítások", icon: Settings },
] as const;

export default async function ProfileLayout({ children }: { children: React.ReactNode }) {
  const profile = await getCurrentProfile();

  if (!profile) {
    redirect("/login");
  }

  return (
    <div className="mx-auto max-w-7xl px-6 py-12 lg:px-8">
      <div className="grid gap-10 lg:grid-cols-[240px_1fr]">
        {/* -- Sidebar -- */}
        <aside className="space-y-1">
          <div className="mb-6">
            <p className="text-muted-foreground text-sm">Fiókom</p>
            <p className="mt-0.5 truncate text-base font-medium">
              {profile.full_name || "Felhasználó"}
            </p>
          </div>

          <nav className="flex flex-col gap-0.5">
            {sidebarLinks.map((link) => {
              const Icon = link.icon;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className="text-muted-foreground hover:bg-muted hover:text-foreground flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors duration-300"
                >
                  <Icon className="size-4" />
                  {link.label}
                </Link>
              );
            })}

            <div className="bg-border my-2 h-px" />

            <Link
              href="/logout"
              className="text-muted-foreground hover:bg-muted hover:text-destructive flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors duration-300"
            >
              <LogOut className="size-4" />
              Kijelentkezés
            </Link>
          </nav>
        </aside>

        {/* -- Content -- */}
        <div className="min-w-0">{children}</div>
      </div>
    </div>
  );
}
