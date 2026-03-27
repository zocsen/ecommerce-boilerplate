"use client";

/* ------------------------------------------------------------------ */
/*  Cookie consent context & provider                                  */
/*                                                                     */
/*  Stores consent state in a `cookie_consent` cookie (365 days).      */
/*  Other components use `useCookieConsent()` to check before loading  */
/*  analytics/marketing scripts.                                       */
/* ------------------------------------------------------------------ */

import { createContext, useCallback, useContext, useEffect, useMemo, useReducer } from "react";

// ── Types ──────────────────────────────────────────────────────────

export interface CookieConsent {
  necessary: boolean;
  analytics: boolean;
  marketing: boolean;
}

interface CookieConsentState {
  /** Current consent — null means visitor hasn't consented yet */
  consent: CookieConsent | null;
  /** Whether the visitor has made any consent choice */
  hasConsented: boolean;
  /** Update consent (partial merge, always keeps necessary=true) */
  updateConsent: (consent: Partial<CookieConsent>) => void;
  /** Re-open the preferences panel */
  openPreferences: () => void;
  /** Whether the preferences panel should be shown */
  showBanner: boolean;
  /** Whether the panel is in customize mode */
  showCustomize: boolean;
  /** Dismiss the banner without changing consent */
  dismissBanner: () => void;
}

const CookieConsentContext = createContext<CookieConsentState | null>(null);

// ── Cookie helpers ─────────────────────────────────────────────────

const COOKIE_NAME = "cookie_consent";
const COOKIE_MAX_AGE = 365 * 24 * 60 * 60; // 365 days in seconds

interface StoredConsent extends CookieConsent {
  timestamp: string;
}

function readConsentCookie(): CookieConsent | null {
  if (typeof document === "undefined") return null;

  try {
    const raw = document.cookie.split("; ").find((c) => c.startsWith(`${COOKIE_NAME}=`));

    if (!raw) return null;

    const value = decodeURIComponent(raw.split("=")[1]);
    const parsed: StoredConsent = JSON.parse(value);

    if (
      typeof parsed.necessary !== "boolean" ||
      typeof parsed.analytics !== "boolean" ||
      typeof parsed.marketing !== "boolean"
    ) {
      return null;
    }

    return {
      necessary: true,
      analytics: parsed.analytics,
      marketing: parsed.marketing,
    };
  } catch {
    return null;
  }
}

function writeConsentCookie(consent: CookieConsent): void {
  if (typeof document === "undefined") return;

  const stored: StoredConsent = {
    ...consent,
    necessary: true,
    timestamp: new Date().toISOString(),
  };

  try {
    const value = encodeURIComponent(JSON.stringify(stored));
    document.cookie = `${COOKIE_NAME}=${value}; path=/; max-age=${COOKIE_MAX_AGE}; SameSite=Lax`;
  } catch {
    console.warn(
      "[cookie-consent] A süti mentése nem sikerült. A böngésző blokkolhatja a sütiket.",
    );
  }
}

// ── Reducer ────────────────────────────────────────────────────────

interface ProviderState {
  consent: CookieConsent | null;
  hasConsented: boolean;
  showBanner: boolean;
  showCustomize: boolean;
  hydrated: boolean;
}

type ProviderAction =
  | { type: "HYDRATE"; stored: CookieConsent | null }
  | { type: "UPDATE"; next: CookieConsent }
  | { type: "OPEN_PREFERENCES" }
  | { type: "DISMISS" };

const initialState: ProviderState = {
  consent: null,
  hasConsented: false,
  showBanner: false,
  showCustomize: false,
  hydrated: false,
};

function reducer(state: ProviderState, action: ProviderAction): ProviderState {
  switch (action.type) {
    case "HYDRATE":
      return {
        ...state,
        consent: action.stored,
        hasConsented: action.stored !== null,
        showBanner: action.stored === null,
        hydrated: true,
      };
    case "UPDATE":
      return {
        ...state,
        consent: action.next,
        hasConsented: true,
        showBanner: false,
        showCustomize: false,
      };
    case "OPEN_PREFERENCES":
      return { ...state, showBanner: true, showCustomize: true };
    case "DISMISS":
      return { ...state, showBanner: false, showCustomize: false };
  }
}

// ── Provider ───────────────────────────────────────────────────────

export function CookieConsentProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(reducer, initialState);

  // Hydrate from cookie on mount — single dispatch avoids the
  // react-hooks/set-state-in-effect cascading-render warning.
  useEffect(() => {
    dispatch({ type: "HYDRATE", stored: readConsentCookie() });
  }, []);

  const updateConsent = useCallback(
    (partial: Partial<CookieConsent>) => {
      const next: CookieConsent = {
        necessary: true,
        analytics: partial.analytics ?? state.consent?.analytics ?? false,
        marketing: partial.marketing ?? state.consent?.marketing ?? false,
      };
      dispatch({ type: "UPDATE", next });
      writeConsentCookie(next);
    },
    [state.consent],
  );

  const openPreferences = useCallback(() => {
    dispatch({ type: "OPEN_PREFERENCES" });
  }, []);

  const dismissBanner = useCallback(() => {
    dispatch({ type: "DISMISS" });
  }, []);

  const value = useMemo<CookieConsentState>(
    () => ({
      consent: state.consent,
      hasConsented: state.hasConsented,
      updateConsent,
      openPreferences,
      showBanner: state.hydrated && state.showBanner,
      showCustomize: state.showCustomize,
      dismissBanner,
    }),
    [state, updateConsent, openPreferences, dismissBanner],
  );

  return <CookieConsentContext.Provider value={value}>{children}</CookieConsentContext.Provider>;
}

// ── Hook ───────────────────────────────────────────────────────────

export function useCookieConsent(): CookieConsentState {
  const ctx = useContext(CookieConsentContext);
  if (!ctx) {
    throw new Error("useCookieConsent must be used within <CookieConsentProvider>");
  }
  return ctx;
}
