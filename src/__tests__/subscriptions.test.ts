import { describe, it, expect } from "vitest";
import {
  planFeaturesSchema,
  planCreateSchema,
  planUpdateSchema,
  subscriptionCreateSchema,
  subscriptionUpdateSchema,
  invoiceCreateSchema,
  invoiceUpdateSchema,
} from "@/lib/validators/subscription";

/* ------------------------------------------------------------------ */
/*  subscriptions.test.ts                                              */
/*                                                                     */
/*  Zod schema validation tests for the plan subscription system      */
/*  (FE-003): plans, subscriptions, and invoices.                      */
/* ------------------------------------------------------------------ */

// ── Shared fixtures ─────────────────────────────────────────────────

const VALID_FEATURES = {
  max_products: 0,
  max_admins: 0,
  max_categories: 0,
  delivery_options: 0,
  enable_coupons: true,
  enable_marketing_module: false,
  enable_abandoned_cart: false,
  enable_b2b_wholesale: false,
  enable_reviews: false,
  enable_price_history: true,
  enable_product_extras: false,
  enable_scheduled_publishing: false,
  enable_agency_viewer: false,
  enable_custom_pages: false,
};

const VALID_UUID = "f1000001-0000-4000-8000-000000000001";

// ── planFeaturesSchema ───────────────────────────────────────────────

describe("planFeaturesSchema", () => {
  it("elfogad érvényes funkció adatot", () => {
    expect(planFeaturesSchema.safeParse(VALID_FEATURES).success).toBe(true);
  });

  it("elutasítja a negatív max_products értéket", () => {
    expect(planFeaturesSchema.safeParse({ ...VALID_FEATURES, max_products: -1 }).success).toBe(
      false,
    );
  });

  it("elfogadja a 0-t (korlátlan)", () => {
    expect(planFeaturesSchema.safeParse({ ...VALID_FEATURES, max_products: 0 }).success).toBe(true);
  });

  it("elutasítja a nem boolean enable_coupons értéket", () => {
    expect(
      planFeaturesSchema.safeParse({ ...VALID_FEATURES, enable_coupons: "igen" }).success,
    ).toBe(false);
  });

  it("elutasítja a hiányzó mezőt", () => {
    const { max_products: _, ...missing } = VALID_FEATURES;
    expect(planFeaturesSchema.safeParse(missing).success).toBe(false);
  });

  it("elutasítja a tizedes értéket (int kötelező)", () => {
    expect(planFeaturesSchema.safeParse({ ...VALID_FEATURES, max_products: 5.5 }).success).toBe(
      false,
    );
  });
});

// ── planCreateSchema ──────────────────────────────────────────────────

describe("planCreateSchema", () => {
  const VALID_PLAN = {
    name: "Alap csomag",
    slug: "alap",
    description: "Belépő szintű csomag",
    base_monthly_price: 9900,
    base_annual_price: 99000,
    features: VALID_FEATURES,
    sort_order: 1,
    is_active: true,
  };

  it("elfogad érvényes csomag adatot", () => {
    expect(planCreateSchema.safeParse(VALID_PLAN).success).toBe(true);
  });

  it("elutasítja az üres nevet", () => {
    expect(planCreateSchema.safeParse({ ...VALID_PLAN, name: "" }).success).toBe(false);
  });

  it("elutasítja az érvénytelen slugot (nagybetűk)", () => {
    expect(planCreateSchema.safeParse({ ...VALID_PLAN, slug: "Alap" }).success).toBe(false);
  });

  it("elutasítja az érvénytelen slugot (szóköz)", () => {
    expect(planCreateSchema.safeParse({ ...VALID_PLAN, slug: "alap csomag" }).success).toBe(false);
  });

  it("elfogad kötőjeles slugot", () => {
    expect(planCreateSchema.safeParse({ ...VALID_PLAN, slug: "alap-csomag" }).success).toBe(true);
  });

  it("elutasítja a negatív havi árat", () => {
    expect(planCreateSchema.safeParse({ ...VALID_PLAN, base_monthly_price: -1 }).success).toBe(
      false,
    );
  });

  it("elfogadja a 0 Ft havi árat", () => {
    expect(planCreateSchema.safeParse({ ...VALID_PLAN, base_monthly_price: 0 }).success).toBe(true);
  });

  it("elutasítja a hiányzó features mezőt", () => {
    const { features: _, ...noFeatures } = VALID_PLAN;
    expect(planCreateSchema.safeParse(noFeatures).success).toBe(false);
  });

  it("opcionális mezők elhagyhatók (sort_order, is_active)", () => {
    const { sort_order: _, is_active: __, description: ___, ...minimal } = VALID_PLAN;
    expect(planCreateSchema.safeParse(minimal).success).toBe(true);
  });
});

// ── planUpdateSchema ──────────────────────────────────────────────────

describe("planUpdateSchema", () => {
  it("üres objektum érvényes (minden mező opcionális)", () => {
    expect(planUpdateSchema.safeParse({}).success).toBe(true);
  });

  it("csak a nevet frissíti", () => {
    expect(planUpdateSchema.safeParse({ name: "Prémium csomag" }).success).toBe(true);
  });

  it("elutasítja az érvénytelen slugot", () => {
    expect(planUpdateSchema.safeParse({ slug: "PREMIUM" }).success).toBe(false);
  });

  it("elfogad null leírást (törlés)", () => {
    expect(planUpdateSchema.safeParse({ description: null }).success).toBe(true);
  });
});

// ── subscriptionCreateSchema ──────────────────────────────────────────

describe("subscriptionCreateSchema", () => {
  const VALID_SUB = {
    plan_id: VALID_UUID,
    shop_identifier: "demo-bolt",
    status: "active",
    billing_cycle: "monthly",
    current_period_start: "2026-01-01T00:00:00.000Z",
    current_period_end: "2026-02-01T00:00:00.000Z",
  };

  it("elfogad érvényes előfizetés adatot", () => {
    expect(subscriptionCreateSchema.safeParse(VALID_SUB).success).toBe(true);
  });

  it("elutasítja az érvénytelen UUID plan_id-t", () => {
    expect(subscriptionCreateSchema.safeParse({ ...VALID_SUB, plan_id: "nem-uuid" }).success).toBe(
      false,
    );
  });

  it("elutasítja az üres shop_identifier-t", () => {
    expect(subscriptionCreateSchema.safeParse({ ...VALID_SUB, shop_identifier: "" }).success).toBe(
      false,
    );
  });

  it("elutasítja az érvénytelen állapotot", () => {
    expect(subscriptionCreateSchema.safeParse({ ...VALID_SUB, status: "expired" }).success).toBe(
      false,
    );
  });

  it("elutasítja az érvénytelen számlázási ciklust", () => {
    expect(
      subscriptionCreateSchema.safeParse({ ...VALID_SUB, billing_cycle: "weekly" }).success,
    ).toBe(false);
  });

  it("opcionális mezők elhagyhatók", () => {
    const minimal = { plan_id: VALID_UUID, shop_identifier: "bolt-1" };
    expect(subscriptionCreateSchema.safeParse(minimal).success).toBe(true);
  });

  it("elfogad egyedi havi árat", () => {
    expect(
      subscriptionCreateSchema.safeParse({ ...VALID_SUB, custom_monthly_price: 7500 }).success,
    ).toBe(true);
  });

  it("elutasítja a negatív egyedi árat", () => {
    expect(
      subscriptionCreateSchema.safeParse({ ...VALID_SUB, custom_monthly_price: -1 }).success,
    ).toBe(false);
  });
});

// ── subscriptionUpdateSchema ──────────────────────────────────────────

describe("subscriptionUpdateSchema", () => {
  it("üres objektum érvényes", () => {
    expect(subscriptionUpdateSchema.safeParse({}).success).toBe(true);
  });

  it("elfogad státusz frissítést", () => {
    expect(subscriptionUpdateSchema.safeParse({ status: "past_due" }).success).toBe(true);
  });

  it("elutasítja az érvénytelen státuszt", () => {
    expect(subscriptionUpdateSchema.safeParse({ status: "expired" }).success).toBe(false);
  });

  it("elfogad null cancelled_at-t", () => {
    expect(subscriptionUpdateSchema.safeParse({ cancelled_at: null }).success).toBe(true);
  });
});

// ── invoiceCreateSchema ───────────────────────────────────────────────

describe("invoiceCreateSchema", () => {
  const VALID_INVOICE = {
    subscription_id: VALID_UUID,
    amount: 9900,
    billing_period_start: "2026-01-01T00:00:00.000Z",
    billing_period_end: "2026-02-01T00:00:00.000Z",
    status: "pending",
  };

  it("elfogad érvényes számla adatot", () => {
    expect(invoiceCreateSchema.safeParse(VALID_INVOICE).success).toBe(true);
  });

  it("elutasítja a 0 összegű számlát", () => {
    expect(invoiceCreateSchema.safeParse({ ...VALID_INVOICE, amount: 0 }).success).toBe(false);
  });

  it("elutasítja a negatív összeget", () => {
    expect(invoiceCreateSchema.safeParse({ ...VALID_INVOICE, amount: -100 }).success).toBe(false);
  });

  it("elfogadja az 1 Ft-os összeget", () => {
    expect(invoiceCreateSchema.safeParse({ ...VALID_INVOICE, amount: 1 }).success).toBe(true);
  });

  it("elutasítja az érvénytelen státuszt", () => {
    expect(invoiceCreateSchema.safeParse({ ...VALID_INVOICE, status: "open" }).success).toBe(false);
  });

  it("elutasítja az érvénytelen subscription_id UUID-t", () => {
    expect(
      invoiceCreateSchema.safeParse({ ...VALID_INVOICE, subscription_id: "nem-uuid" }).success,
    ).toBe(false);
  });

  it("elutasítja az érvénytelen invoice_url-t", () => {
    expect(
      invoiceCreateSchema.safeParse({ ...VALID_INVOICE, invoice_url: "nem-url" }).success,
    ).toBe(false);
  });

  it("elfogad érvényes invoice_url-t", () => {
    expect(
      invoiceCreateSchema.safeParse({
        ...VALID_INVOICE,
        invoice_url: "https://billingo.hu/szamla/123",
      }).success,
    ).toBe(true);
  });

  it("opcionális mezők elhagyhatók", () => {
    const minimal = {
      subscription_id: VALID_UUID,
      amount: 9900,
      billing_period_start: "2026-01-01T00:00:00.000Z",
      billing_period_end: "2026-02-01T00:00:00.000Z",
    };
    expect(invoiceCreateSchema.safeParse(minimal).success).toBe(true);
  });
});

// ── invoiceUpdateSchema ───────────────────────────────────────────────

describe("invoiceUpdateSchema", () => {
  it("üres objektum érvényes", () => {
    expect(invoiceUpdateSchema.safeParse({}).success).toBe(true);
  });

  it("elfogad státusz frissítést (paid)", () => {
    expect(invoiceUpdateSchema.safeParse({ status: "paid" }).success).toBe(true);
  });

  it("elutasítja az érvénytelen státuszt", () => {
    expect(invoiceUpdateSchema.safeParse({ status: "open" }).success).toBe(false);
  });

  it("elfogad null paid_at-t", () => {
    expect(invoiceUpdateSchema.safeParse({ paid_at: null }).success).toBe(true);
  });

  it("elutasítja a 0 összeget", () => {
    expect(invoiceUpdateSchema.safeParse({ amount: 0 }).success).toBe(false);
  });
});
