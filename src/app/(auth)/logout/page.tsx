"use client";

import { useEffect, useState } from "react";
import { signOut } from "@/lib/actions/profile";
import { Loader2 } from "lucide-react";

/* ------------------------------------------------------------------ */
/*  Universal Logout Page                                              */
/*  Accessible to all authenticated users (customer, admin, viewer).   */
/*  Immediately signs out and redirects to home.                       */
/* ------------------------------------------------------------------ */

export default function LogoutPage() {
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function doLogout() {
      const result = await signOut();

      if (cancelled) return;

      if (result.success) {
        // Force full reload to clear all client state
        window.location.href = "/";
      } else {
        setError(result.error ?? "Hiba a kijelentkezéskor.");
      }
    }

    doLogout();

    return () => {
      cancelled = true;
    };
  }, []);

  if (error) {
    return (
      <div className="flex flex-col items-center gap-4">
        <p className="text-lg font-medium tracking-tight">Kijelentkezés</p>
        <div className="rounded-lg border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
        <button
          onClick={() => (window.location.href = "/")}
          className="cursor-pointer text-sm underline text-muted-foreground hover:text-foreground"
        >
          Vissza a főoldalra
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-3">
      <Loader2 className="size-5 animate-spin text-muted-foreground" />
      <p className="text-sm text-muted-foreground">Kijelentkezés...</p>
    </div>
  );
}
