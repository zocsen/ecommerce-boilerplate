/* ------------------------------------------------------------------ */
/*  Site configuration — single source of truth for store settings     */
/* ------------------------------------------------------------------ */

// ── Types ──────────────────────────────────────────────────────────

export interface StoreConfig {
  name: string;
  legalName: string;
  email: string;
  phone: string;
  address: string;
  currency: "HUF";
}

export interface UrlsConfig {
  siteUrl: string;
  supportEmail: string;
}

export interface FeaturesConfig {
  enableAccounts: boolean;
  enableGuestCheckout: boolean;
  enableCoupons: boolean;
  enableReviews: boolean;
  enableMarketingModule: boolean;
  enableAbandonedCart: boolean;
  enableB2BWholesaleMode: boolean;
}

export interface BarionConfig {
  environment: "test" | "prod";
  posKeyEnvVar: string;
  payeeEmail: string;
  redirectUrls: {
    success: string;
    cancel: string;
    callback: string;
  };
}

export interface PaymentsConfig {
  provider: "barion";
  barion: BarionConfig;
}

export type HomeDeliveryCarrier = "gls" | "mpl" | "express_one";
export type PickupPointProvider =
  | "foxpost"
  | "gls_automata"
  | "packeta"
  | "mpl_automata"
  | "easybox";

export interface ShippingRules {
  baseFee: number;
  freeOver: number;
  weightTiers: Array<{
    maxWeightKg: number;
    fee: number;
  }>;
}

export interface ShippingConfig {
  methods: {
    homeDelivery: boolean;
    pickupPoint: boolean;
  };
  homeDeliveryCarriers: HomeDeliveryCarrier[];
  pickupPointCarriers: PickupPointProvider[];
  rules: ShippingRules;
  pickupPointProviders: Record<PickupPointProvider, boolean>;
}

export type InvoicingProvider = "billingo" | "szamlazz" | "none";
export type InvoicingMode = "auto_on_paid" | "manual";

export interface InvoicingConfig {
  provider: InvoicingProvider;
  mode: InvoicingMode;
}

export interface AdminConfig {
  agencyViewerEnabled: boolean;
  readonlyByDefaultForAgency: boolean;
}

export interface BrandingConfig {
  logoText: string;
  logoUrl: string | null;
  theme: {
    background: string;
    foreground: string;
    muted: string;
    mutedForeground: string;
    accent: string;
    accentForeground: string;
    border: string;
  };
}

export interface SiteConfig {
  store: StoreConfig;
  urls: UrlsConfig;
  features: FeaturesConfig;
  payments: PaymentsConfig;
  shipping: ShippingConfig;
  invoicing: InvoicingConfig;
  admin: AdminConfig;
  branding: BrandingConfig;
}

// ── Helpers ────────────────────────────────────────────────────────

function env(key: string, fallback: string = ""): string {
  return process.env[key] ?? fallback;
}

function envAs<T extends string>(
  key: string,
  allowed: readonly T[],
  fallback: T,
): T {
  const raw = process.env[key] as T | undefined;
  if (raw && (allowed as readonly string[]).includes(raw)) return raw;
  return fallback;
}

// ── Config ─────────────────────────────────────────────────────────

const siteUrl = env("NEXT_PUBLIC_SITE_URL", "http://localhost:3000");

export const siteConfig: SiteConfig = {
  /* ── store ────────────────────────────────────────────── */
  store: {
    name: "Agency Store",
    legalName: "Agency Kft.",
    email: "info@agency.hu",
    phone: "+36 1 234 5678",
    address: "1052 Budapest, Váci utca 1.",
    currency: "HUF",
  },

  /* ── urls ─────────────────────────────────────────────── */
  urls: {
    siteUrl,
    supportEmail: "support@agency.hu",
  },

  /* ── features ─────────────────────────────────────────── */
  features: {
    enableAccounts: true,
    enableGuestCheckout: true,
    enableCoupons: true,
    enableReviews: false,
    enableMarketingModule: true,
    enableAbandonedCart: true,
    enableB2BWholesaleMode: false,
  },

  /* ── payments ─────────────────────────────────────────── */
  payments: {
    provider: "barion",
    barion: {
      environment: envAs("BARION_ENVIRONMENT", ["test", "prod"] as const, "test"),
      posKeyEnvVar: "BARION_POS_KEY",
      payeeEmail: env("RESEND_FROM_EMAIL", "orders@agency.hu"),
      redirectUrls: {
        success: `${siteUrl}/checkout/success`,
        cancel: `${siteUrl}/checkout/cancel`,
        callback: `${siteUrl}/api/payments/barion/callback`,
      },
    },
  },

  /* ── shipping ─────────────────────────────────────────── */
  shipping: {
    methods: {
      homeDelivery: true,
      pickupPoint: true,
    },
    homeDeliveryCarriers: ["gls", "mpl", "express_one"],
    pickupPointCarriers: [
      "foxpost",
      "gls_automata",
      "packeta",
      "mpl_automata",
      "easybox",
    ],
    rules: {
      baseFee: 1490,
      freeOver: 15000,
      weightTiers: [],
    },
    pickupPointProviders: {
      foxpost: true,
      gls_automata: true,
      packeta: true,
      mpl_automata: true,
      easybox: true,
    },
  },

  /* ── invoicing ────────────────────────────────────────── */
  invoicing: {
    provider: envAs(
      "INVOICING_PROVIDER",
      ["billingo", "szamlazz", "none"] as const,
      "none",
    ),
    mode: "manual",
  },

  /* ── admin ────────────────────────────────────────────── */
  admin: {
    agencyViewerEnabled: true,
    readonlyByDefaultForAgency: true,
  },

  /* ── branding ─────────────────────────────────────────── */
  branding: {
    logoText: "AGENCY",
    logoUrl: null,
    theme: {
      background: "#ffffff",
      foreground: "#0a0a0a",
      muted: "#f5f5f5",
      mutedForeground: "#737373",
      accent: "#0a0a0a",
      accentForeground: "#ffffff",
      border: "#e5e5e5",
    },
  },
} as const satisfies SiteConfig;
