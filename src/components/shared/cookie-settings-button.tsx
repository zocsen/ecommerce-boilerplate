"use client";

/* ------------------------------------------------------------------ */
/*  Cookie settings button — re-opens consent banner in customize mode */
/* ------------------------------------------------------------------ */

import { useCookieConsent } from "@/components/providers/cookie-consent-provider";

export function CookieSettingsButton() {
  const { openPreferences } = useCookieConsent();

  return (
    <button
      type="button"
      onClick={openPreferences}
      className="text-foreground/80 hover:text-foreground text-sm transition-colors duration-300"
    >
      Cookie beállítások
    </button>
  );
}
