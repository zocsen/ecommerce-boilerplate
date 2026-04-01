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

export interface CookieConsentConfig {
  enabled: boolean;
  categories: readonly ["necessary", "analytics", "marketing"];
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

export interface CodConfig {
  /** Whether cash on delivery is available as a payment method */
  enabled: boolean;
  /** Utánvét kezelési díj in HUF (added to total_amount) */
  fee: number;
  /** Maximum order amount (before COD fee) for which COD is available (HUF). 0 = no limit. */
  maxOrderAmount: number;
  /** Which shipping methods allow COD */
  allowedShippingMethods: Array<"home" | "pickup">;
}

export interface PaymentsConfig {
  provider: "barion";
  barion: BarionConfig;
  cod: CodConfig;
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
  /** Default weight for products without explicit weight_grams (in grams) */
  defaultProductWeightGrams: number;
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
  /**
   * When true, the /agency panel is accessible and agency-specific
   * server actions are enabled. Set to false when using this boilerplate
   * for a standalone shop (no multi-tenant agency management).
   */
  enableAgencyMode: boolean;
}

export interface EmailConfig {
  /** Recipients for admin order notification emails */
  adminNotificationRecipients: string[];
  /** Send a confirmation email after email+password signup */
  sendSignupConfirmation: boolean;
  /** Send a welcome email on the user's first sign-in */
  sendWelcomeEmail: boolean;
  /** Send an admin notification when an order is paid */
  sendAdminOrderNotification: boolean;
}

export interface TaxConfig {
  /** Default ÁFA rate for new products (percentage) */
  defaultVatRate: number;
  /** Available ÁFA rates in the admin product form */
  availableRates: readonly number[];
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

export interface SubscriptionConfig {
  /** Default shop identifier to use when no SHOP_IDENTIFIER env var is set */
  defaultShopIdentifier: string;
  /**
   * When true, missing subscriptions block plan-gated actions.
   * When false (default/dev), missing subscription = unlimited access.
   */
  enforceGating: boolean;
}

export interface SiteConfig {
  store: StoreConfig;
  urls: UrlsConfig;
  features: FeaturesConfig;
  cookieConsent: CookieConsentConfig;
  payments: PaymentsConfig;
  shipping: ShippingConfig;
  invoicing: InvoicingConfig;
  admin: AdminConfig;
  email: EmailConfig;
  tax: TaxConfig;
  branding: BrandingConfig;
  subscription: SubscriptionConfig;
}

// ── Helpers ────────────────────────────────────────────────────────

function env(key: string, fallback: string = ""): string {
  return process.env[key] ?? fallback;
}

function envAs<T extends string>(key: string, allowed: readonly T[], fallback: T): T {
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

  /* ── cookie consent ──────────────────────────────────── */
  cookieConsent: {
    enabled: true,
    categories: ["necessary", "analytics", "marketing"] as const,
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
    cod: {
      enabled: true,
      fee: 590,
      maxOrderAmount: 100_000,
      allowedShippingMethods: ["home", "pickup"],
    },
  },

  /* ── shipping ─────────────────────────────────────────── */
  shipping: {
    methods: {
      homeDelivery: true,
      pickupPoint: true,
    },
    homeDeliveryCarriers: ["gls", "mpl", "express_one"],
    pickupPointCarriers: ["foxpost", "gls_automata", "packeta", "mpl_automata", "easybox"],
    rules: {
      baseFee: 1490,
      freeOver: 15000,
      defaultProductWeightGrams: 500,
      weightTiers: [
        { maxWeightKg: 2, fee: 1490 },
        { maxWeightKg: 5, fee: 1990 },
        { maxWeightKg: 10, fee: 2990 },
        { maxWeightKg: 20, fee: 4490 },
      ],
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
    provider: envAs("INVOICING_PROVIDER", ["billingo", "szamlazz", "none"] as const, "none"),
    mode: "manual",
  },

  /* ── admin ────────────────────────────────────────────── */
  admin: {
    agencyViewerEnabled: true,
    readonlyByDefaultForAgency: true,
    enableAgencyMode: true,
  },

  /* ── email ────────────────────────────────────────────── */
  email: {
    adminNotificationRecipients: [env("ADMIN_EMAIL", "admin@agency.hu")],
    sendSignupConfirmation: true,
    sendWelcomeEmail: true,
    sendAdminOrderNotification: true,
  },

  /* ── tax (ÁFA) ───────────────────────────────────────── */
  tax: {
    defaultVatRate: 27,
    availableRates: [5, 18, 27] as const,
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

  /* ── subscription ─────────────────────────────────────── */
  subscription: {
    defaultShopIdentifier: env("SHOP_IDENTIFIER", "agency-store"),
    enforceGating: env("SUBSCRIPTION_ENFORCE_GATING", "false") === "true",
  },
} as const satisfies SiteConfig;
