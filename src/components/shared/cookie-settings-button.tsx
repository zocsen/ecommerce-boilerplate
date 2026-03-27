'use client'

/* ------------------------------------------------------------------ */
/*  Cookie settings button — re-opens consent banner in customize mode */
/* ------------------------------------------------------------------ */

import { useCookieConsent } from '@/components/providers/cookie-consent-provider'

export function CookieSettingsButton() {
  const { openPreferences } = useCookieConsent()

  return (
    <button
      type="button"
      onClick={openPreferences}
      className="text-sm text-foreground/80 transition-colors duration-300 hover:text-foreground"
    >
      Cookie beállítások
    </button>
  )
}
