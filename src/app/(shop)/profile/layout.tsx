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

export default async function ProfileLayout({
  children,
}: {
  children: React.ReactNode;
}) {
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
            <p className="text-sm text-muted-foreground">Fiókom</p>
            <p className="mt-0.5 text-base font-medium truncate">
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
                  className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground transition-colors duration-300 hover:bg-muted hover:text-foreground"
                >
                  <Icon className="size-4" />
                  {link.label}
                </Link>
              );
            })}

            <div className="my-2 h-px bg-border" />

            <Link
              href="/logout"
              className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground transition-colors duration-300 hover:bg-muted hover:text-destructive"
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
