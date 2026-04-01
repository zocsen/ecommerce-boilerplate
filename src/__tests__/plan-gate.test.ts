import { describe, it, expect, vi, beforeEach } from "vitest"
import type { PlanFeaturesJson } from "@/lib/types/database"

/* ------------------------------------------------------------------ */
/*  plan-gate.test.ts                                                   */
/*                                                                     */
/*  Unit tests for the getPlanGate() factory.                          */
/*  The Supabase admin client is mocked so no real DB calls are made.  */
/* ------------------------------------------------------------------ */

// ── Mock @/lib/supabase/admin ────────────────────────────────────────
const mockSingle = vi.fn()
const mockLimit = vi.fn(() => ({ single: mockSingle }))
const mockOrder = vi.fn(() => ({ limit: mockLimit }))
const mockIn = vi.fn(() => ({ order: mockOrder }))
const mockEq = vi.fn(() => ({ in: mockIn }))
const mockSelect = vi.fn(() => ({ eq: mockEq }))
const mockFrom = vi.fn(() => ({ select: mockSelect }))
const mockAdminClient = { from: mockFrom }

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => mockAdminClient,
}))

// ── Mock @/lib/config/site.config ────────────────────────────────────
vi.mock("@/lib/config/site.config", () => ({
  siteConfig: {
    subscription: {
      defaultShopIdentifier: "test-shop",
      enforceGating: false,
    },
  },
}))

// ── Import after mocks ───────────────────────────────────────────────
import { getPlanGate } from "@/lib/security/plan-gate"

// ── Full features fixture ────────────────────────────────────────────
const FULL_FEATURES: PlanFeaturesJson = {
  max_products: 100,
  max_admins: 3,
  max_categories: 20,
  delivery_options: 5,
  enable_coupons: true,
  enable_marketing_module: false,
  enable_abandoned_cart: false,
  enable_b2b_wholesale: false,
  enable_reviews: true,
  enable_price_history: true,
  enable_product_extras: false,
  enable_scheduled_publishing: false,
  enable_agency_viewer: true,
  enable_custom_pages: false,
}

const MOCK_PLAN = {
  id: "f1000001-0000-0000-0000-000000000001",
  name: "Alap",
  slug: "alap",
  description: null,
  base_monthly_price: 9900,
  base_annual_price: 99000,
  features: FULL_FEATURES,
  sort_order: 1,
  is_active: true,
  created_at: "2026-01-01T00:00:00Z",
  updated_at: "2026-01-01T00:00:00Z",
}

const MOCK_SUBSCRIPTION = {
  id: "b0000001-0000-0000-0000-000000000001",
  plan_id: MOCK_PLAN.id,
  shop_identifier: "test-shop",
  status: "active" as const,
  billing_cycle: "monthly" as const,
  custom_monthly_price: null,
  custom_annual_price: null,
  current_period_start: "2026-03-01T00:00:00Z",
  current_period_end: "2026-04-01T00:00:00Z",
  trial_ends_at: null,
  cancelled_at: null,
  feature_overrides: {},
  notes: null,
  created_at: "2026-01-01T00:00:00Z",
  updated_at: "2026-01-01T00:00:00Z",
  plan: MOCK_PLAN,
}

beforeEach(() => {
  vi.clearAllMocks()
})

/* ------------------------------------------------------------------ */
/*  No-subscription behaviour                                          */
/* ------------------------------------------------------------------ */

describe("getPlanGate — nincs előfizetés (enforceGating=false)", () => {
  beforeEach(() => {
    mockSingle.mockResolvedValue({ data: null, error: null })
  })

  it("check() minden funkciót engedélyez", async () => {
    const gate = await getPlanGate()
    expect(gate.check("enable_coupons").allowed).toBe(true)
    expect(gate.check("enable_marketing_module").allowed).toBe(true)
  })

  it("checkLimit() minden limitet engedélyez", async () => {
    const gate = await getPlanGate()
    expect(gate.checkLimit("max_products", 999).allowed).toBe(true)
    expect(gate.checkLimit("max_categories", 9999).allowed).toBe(true)
  })

  it("features null értéket ad vissza", async () => {
    const gate = await getPlanGate()
    expect(gate.features).toBeNull()
  })
})

/* ------------------------------------------------------------------ */
/*  Active subscription — boolean feature gating                      */
/* ------------------------------------------------------------------ */

describe("getPlanGate — aktív előfizetés (boolean funkciók)", () => {
  beforeEach(() => {
    mockSingle.mockResolvedValue({ data: MOCK_SUBSCRIPTION, error: null })
  })

  it("engedélyez egy bekapcsolt funkciót (enable_coupons=true)", async () => {
    const gate = await getPlanGate()
    const result = gate.check("enable_coupons")
    expect(result.allowed).toBe(true)
  })

  it("blokkolja a kikapcsolt funkciót (enable_marketing_module=false)", async () => {
    const gate = await getPlanGate()
    const result = gate.check("enable_marketing_module")
    expect(result.allowed).toBe(false)
    expect(result.reason).toBeDefined()
    expect(result.reason).toContain("marketing modul")
  })

  it("blokkolja az enable_b2b_wholesale=false funkciót", async () => {
    const gate = await getPlanGate()
    expect(gate.check("enable_b2b_wholesale").allowed).toBe(false)
  })

  it("features nem null aktív előfizetésnél", async () => {
    const gate = await getPlanGate()
    expect(gate.features).not.toBeNull()
  })
})

/* ------------------------------------------------------------------ */
/*  Active subscription — numeric limit gating                        */
/* ------------------------------------------------------------------ */

describe("getPlanGate — aktív előfizetés (numerikus limitek)", () => {
  beforeEach(() => {
    mockSingle.mockResolvedValue({ data: MOCK_SUBSCRIPTION, error: null })
  })

  it("engedélyez ha count < limit (max_products=100, count=50)", async () => {
    const gate = await getPlanGate()
    const result = gate.checkLimit("max_products", 50)
    expect(result.allowed).toBe(true)
    expect(result.limit).toBe(100)
  })

  it("engedélyez ha count === limit - 1 (max_products=100, count=99)", async () => {
    const gate = await getPlanGate()
    const result = gate.checkLimit("max_products", 99)
    expect(result.allowed).toBe(true)
  })

  it("blokkolja ha count >= limit (max_products=100, count=100)", async () => {
    const gate = await getPlanGate()
    const result = gate.checkLimit("max_products", 100)
    expect(result.allowed).toBe(false)
    expect(result.limit).toBe(100)
    expect(result.reason).toContain("100")
  })

  it("blokkolja ha count > limit (max_products=100, count=150)", async () => {
    const gate = await getPlanGate()
    const result = gate.checkLimit("max_products", 150)
    expect(result.allowed).toBe(false)
  })
})

/* ------------------------------------------------------------------ */
/*  Unlimited (limit=0)                                                */
/* ------------------------------------------------------------------ */

describe("getPlanGate — unlimited limit (0)", () => {
  beforeEach(() => {
    // Override max_categories to 0 (unlimited)
    const unlimitedSub = {
      ...MOCK_SUBSCRIPTION,
      plan: { ...MOCK_PLAN, features: { ...FULL_FEATURES, max_categories: 0 } },
    }
    mockSingle.mockResolvedValue({ data: unlimitedSub, error: null })
  })

  it("0 limit esetén korlátlan hozzáférést ad (checkLimit)", async () => {
    const gate = await getPlanGate()
    const result = gate.checkLimit("max_categories", 99999)
    expect(result.allowed).toBe(true)
    expect(result.limit).toBe(0)
  })
})

/* ------------------------------------------------------------------ */
/*  Feature overrides                                                  */
/* ------------------------------------------------------------------ */

describe("getPlanGate — feature_overrides felülírja a plan feature-öket", () => {
  it("override enable_coupons=false blokkolja a funkciót", async () => {
    const subWithOverride = {
      ...MOCK_SUBSCRIPTION,
      feature_overrides: { enable_coupons: false },
    }
    mockSingle.mockResolvedValue({ data: subWithOverride, error: null })

    const gate = await getPlanGate()
    const result = gate.check("enable_coupons")
    expect(result.allowed).toBe(false)
  })

  it("override enable_marketing_module=true engedélyezi a funkciót", async () => {
    const subWithOverride = {
      ...MOCK_SUBSCRIPTION,
      feature_overrides: { enable_marketing_module: true },
    }
    mockSingle.mockResolvedValue({ data: subWithOverride, error: null })

    const gate = await getPlanGate()
    const result = gate.check("enable_marketing_module")
    expect(result.allowed).toBe(true)
  })

  it("override max_products=10 korlátoz (count=10)", async () => {
    const subWithOverride = {
      ...MOCK_SUBSCRIPTION,
      feature_overrides: { max_products: 10 },
    }
    mockSingle.mockResolvedValue({ data: subWithOverride, error: null })

    const gate = await getPlanGate()
    const result = gate.checkLimit("max_products", 10)
    expect(result.allowed).toBe(false)
    expect(result.limit).toBe(10)
  })
})
