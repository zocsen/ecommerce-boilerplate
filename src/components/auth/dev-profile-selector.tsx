"use client";

/* ------------------------------------------------------------------ */
/*  DevProfileSelector                                                 */
/*  Quick-login grid for seed users. Only renders in development.      */
/* ------------------------------------------------------------------ */

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

import { devSignIn } from "@/lib/actions/dev-auth";
import { Badge } from "@/components/ui/badge";

// ── Seed users ────────────────────────────────────────────────────

interface SeedUser {
  email: string;
  name: string;
  role: "admin" | "agency_viewer" | "customer";
}

const SEED_USERS: SeedUser[] = [
  { email: "admin@agency.test", name: "Nagy Istvan", role: "admin" },
  { email: "admin2@agency.test", name: "Szabo Anna", role: "admin" },
  { email: "viewer@agency.test", name: "Toth Peter", role: "agency_viewer" },
  { email: "customer1@test.hu", name: "Kovacs Maria", role: "customer" },
  { email: "customer2@test.hu", name: "Kiss Janos", role: "customer" },
  { email: "customer3@test.hu", name: "Horvath Eva", role: "customer" },
  { email: "customer4@test.hu", name: "Varga Balazs", role: "customer" },
  { email: "customer5@test.hu", name: "Molnar Kata", role: "customer" },
];

// ── Role badge config ─────────────────────────────────────────────

const ROLE_CONFIG: Record<
  SeedUser["role"],
  { label: string; variant: "default" | "secondary" | "outline" }
> = {
  admin: { label: "Admin", variant: "default" },
  agency_viewer: { label: "Viewer", variant: "secondary" },
  customer: { label: "Customer", variant: "outline" },
};

// ── Component ─────────────────────────────────────────────────────

export function DevProfileSelector() {
  // Hard guard: never render in production
  if (process.env.NODE_ENV !== "development") {
    return null;
  }

  return <DevProfileSelectorInner />;
}

function DevProfileSelectorInner() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [activeEmail, setActiveEmail] = useState<string | null>(null);

  function handleSelect(user: SeedUser) {
    setActiveEmail(user.email);
    startTransition(async () => {
      const result = await devSignIn(user.email);

      if (!result.success) {
        toast.error(result.error ?? "Dev login failed.");
        setActiveEmail(null);
        return;
      }

      toast.success(`Signed in as ${user.name}`);
      router.push(user.role === "customer" ? "/" : "/admin");
      router.refresh();
    });
  }

  return (
    <div className="mt-6 rounded-lg border border-dashed border-amber-500/40 bg-amber-50/50 p-4 dark:bg-amber-950/10">
      <div className="mb-3 flex items-center gap-2">
        <div className="h-2 w-2 animate-pulse rounded-full bg-amber-500" />
        <span className="text-xs font-medium tracking-wide text-amber-700 uppercase dark:text-amber-400">
          Dev Quick Login
        </span>
      </div>

      <div className="grid grid-cols-1 gap-1.5">
        {SEED_USERS.map((user) => {
          const config = ROLE_CONFIG[user.role];
          const isActive = activeEmail === user.email;
          const isDisabled = isPending;

          return (
            <button
              key={user.email}
              type="button"
              disabled={isDisabled}
              onClick={() => handleSelect(user)}
              className="flex cursor-pointer items-center gap-3 rounded-md px-3 py-2 text-left text-sm transition-all duration-200 hover:bg-amber-100/60 disabled:cursor-not-allowed disabled:opacity-50 dark:hover:bg-amber-900/20"
            >
              {isActive && isPending ? (
                <Loader2 className="size-3.5 shrink-0 animate-spin text-amber-600" />
              ) : (
                <div className="size-3.5 shrink-0" />
              )}

              <span className="text-foreground/80 flex-1 truncate font-medium">{user.name}</span>

              <span className="text-muted-foreground hidden max-w-[140px] truncate text-xs sm:block">
                {user.email}
              </span>

              <Badge variant={config.variant} className="ml-auto shrink-0">
                {config.label}
              </Badge>
            </button>
          );
        })}
      </div>
    </div>
  );
}
