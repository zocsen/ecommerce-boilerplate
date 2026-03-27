'use client'

/* ------------------------------------------------------------------ */
/*  Cookie consent banner                                              */
/*                                                                     */
/*  Fixed bottom banner with Accept all / Only necessary / Customize.  */
/*  The customize panel exposes toggle switches per category.          */
/* ------------------------------------------------------------------ */

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Switch } from '@base-ui/react/switch'
import { Button } from '@/components/ui/button'
import { useCookieConsent } from '@/components/providers/cookie-consent-provider'
import { cn } from '@/lib/utils'

// ── Category definitions ───────────────────────────────────────────

interface CookieCategory {
  id: 'necessary' | 'analytics' | 'marketing'
  label: string
  description: string
  locked: boolean
}

const CATEGORIES: CookieCategory[] = [
  {
    id: 'necessary',
    label: 'Szükséges',
    description:
      'A weboldal működéséhez elengedhetetlen sütik. Ezek nélkül az oldal nem tud megfelelően működni.',
    locked: true,
  },
  {
    id: 'analytics',
    label: 'Analitika',
    description:
      'Segítenek megérteni, hogyan használják a látogatók az oldalt, így javíthatjuk a felhasználói élményt.',
    locked: false,
  },
  {
    id: 'marketing',
    label: 'Marketing',
    description:
      'Személyre szabott hirdetések megjelenítését teszik lehetővé a látogatók érdeklődése alapján.',
    locked: false,
  },
]

// ── Toggle switch ──────────────────────────────────────────────────

function ConsentToggle({
  checked,
  disabled,
  onCheckedChange,
}: {
  checked: boolean
  disabled?: boolean
  onCheckedChange?: (checked: boolean) => void
}) {
  return (
    <Switch.Root
      checked={checked}
      disabled={disabled}
      onCheckedChange={onCheckedChange}
      className={cn(
        'relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors duration-300 ease-out',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
        'data-[checked]:bg-foreground data-[unchecked]:bg-border',
        'data-[disabled]:cursor-not-allowed data-[disabled]:opacity-60',
      )}
    >
      <Switch.Thumb
        className={cn(
          'pointer-events-none block size-5 rounded-full bg-background shadow-sm ring-0 transition-transform duration-300 ease-out',
          'data-[checked]:translate-x-5 data-[unchecked]:translate-x-0',
        )}
      />
    </Switch.Root>
  )
}

// ── Banner ─────────────────────────────────────────────────────────

export function CookieConsentBanner() {
  const { consent, showBanner, showCustomize, updateConsent, dismissBanner } = useCookieConsent()

  const [customizing, setCustomizing] = useState(false)
  const [analyticsOn, setAnalyticsOn] = useState(consent?.analytics ?? false)
  const [marketingOn, setMarketingOn] = useState(consent?.marketing ?? false)
  // Separate visible state so the CSS transition can play on mount
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    if (showBanner) {
      const id = setTimeout(() => setVisible(true), 16)
      return () => clearTimeout(id)
    } else {
      const id = setTimeout(() => setVisible(false), 0)
      return () => clearTimeout(id)
    }
  }, [showBanner])

  const isCustomizing = customizing || showCustomize

  if (!showBanner && !visible) return null

  function handleAcceptAll() {
    updateConsent({ necessary: true, analytics: true, marketing: true })
  }

  function handleNecessaryOnly() {
    updateConsent({ necessary: true, analytics: false, marketing: false })
  }

  function handleSaveSelections() {
    updateConsent({
      necessary: true,
      analytics: analyticsOn,
      marketing: marketingOn,
    })
  }

  function handleOpenCustomize() {
    setAnalyticsOn(consent?.analytics ?? false)
    setMarketingOn(consent?.marketing ?? false)
    setCustomizing(true)
  }

  return (
    <div
      style={{
        position: 'fixed',
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 50,
        transform: visible ? 'translateY(0)' : 'translateY(100%)',
        transition: 'transform 500ms cubic-bezier(0.4, 0, 0.2, 1)',
      }}
      className="border-t border-border bg-background shadow-lg"
    >
      <div className="mx-auto max-w-7xl px-6 py-6">
        {/* ── Main message ─────────────────────────── */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex-1">
            <p className="text-sm leading-relaxed text-foreground">
              Ez a weboldal sütiket használ a legjobb felhasználói élmény érdekében.{' '}
              <Link
                href="/cookie-policy"
                className="underline underline-offset-2 transition-colors duration-300 hover:text-muted-foreground"
                onClick={dismissBanner}
              >
                Részletek
              </Link>
            </p>
          </div>

          {!isCustomizing && (
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
              <Button onClick={handleAcceptAll} size="sm">
                Összes elfogadása
              </Button>
              <Button onClick={handleNecessaryOnly} variant="outline" size="sm">
                Csak a szükségesek
              </Button>
              <Button
                onClick={handleOpenCustomize}
                variant="link"
                size="sm"
                className="text-muted-foreground"
              >
                Testreszabás
              </Button>
            </div>
          )}
        </div>

        {/* ── Customize panel ──────────────────────── */}
        {isCustomizing && (
          <div className="mt-6 space-y-4">
            {CATEGORIES.map((cat) => {
              const isChecked =
                cat.id === 'necessary' ? true : cat.id === 'analytics' ? analyticsOn : marketingOn

              const handleChange =
                cat.id === 'analytics'
                  ? setAnalyticsOn
                  : cat.id === 'marketing'
                    ? setMarketingOn
                    : undefined

              return (
                <div
                  key={cat.id}
                  className="flex items-start justify-between gap-4 rounded-lg border border-border p-4"
                >
                  <div className="flex-1">
                    <p className="text-sm font-medium text-foreground">{cat.label}</p>
                    <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                      {cat.description}
                    </p>
                  </div>
                  <ConsentToggle
                    checked={isChecked}
                    disabled={cat.locked}
                    onCheckedChange={handleChange}
                  />
                </div>
              )
            })}

            <div className="flex flex-col gap-2 pt-2 sm:flex-row sm:justify-end sm:gap-3">
              <Button onClick={handleAcceptAll} variant="outline" size="sm">
                Összes elfogadása
              </Button>
              <Button onClick={handleSaveSelections} size="sm">
                Kiválasztottak mentése
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
