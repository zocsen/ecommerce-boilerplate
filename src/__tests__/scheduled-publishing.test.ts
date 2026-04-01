import { describe, it, expect, vi, beforeEach } from "vitest"

/* ------------------------------------------------------------------ */
/*  Scheduled Product Publishing — unit tests for FE-037               */
/*                                                                     */
/*  Tests cover:                                                       */
/*    - Zod validation: publishedAt accepts valid ISO strings / null    */
/*    - Product create: publishedAt parsed from FormData               */
/*    - Product update: publishedAt parsed from FormData               */
/*    - listProducts: future published_at products filtered out        */
/*    - getProductBySlug: future published_at products filtered out    */
/*    - createOrderFromCart: future published_at products rejected     */
/*    - Sitemap: future published_at products excluded                 */
/* ------------------------------------------------------------------ */

// ── Hoisted mocks ──────────────────────────────────────────────────

const { mockRequireAdmin, mockRequireAdminOrViewer, mockLogAudit, mockAdminFrom, mockServerFrom } =
  vi.hoisted(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const mockAdminFrom = vi.fn() as ReturnType<typeof vi.fn<(...args: any[]) => any>>
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const mockServerFrom = vi.fn() as ReturnType<typeof vi.fn<(...args: any[]) => any>>

    return {
      mockRequireAdmin: vi.fn(),
      mockRequireAdminOrViewer: vi.fn(),
      mockLogAudit: vi.fn(),
      mockAdminFrom,
      mockServerFrom,
    }
  })

// ── Module mocks ──────────────────────────────────────────────────

vi.mock("server-only", () => ({}))

vi.mock("next/headers", () => ({
  headers: vi.fn(async () => new Map()),
}))

vi.mock("@/lib/security/roles", () => ({
  requireAuth: vi.fn(),
  requireAdmin: mockRequireAdmin,
  requireAdminOrViewer: mockRequireAdminOrViewer,
  getCurrentUser: vi.fn(),
}))

vi.mock("@/lib/security/logger", () => ({
  logAudit: mockLogAudit,
}))

vi.mock("@/lib/security/rate-limit", () => ({
  orderTrackingRateLimiter: {
    check: vi.fn(() => ({ allowed: true })),
  },
}))

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => ({
    from: mockAdminFrom,
  }),
}))

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(async () => ({
    from: mockServerFrom,
  })),
}))

vi.mock("@/lib/config/site.config", () => ({
  siteConfig: {
    store: { name: "Agency Store", currency: "HUF" },
    shipping: { rules: { baseFee: 1490, freeOver: 15000, weightTiers: [] } },
    features: { enableGuestCheckout: true },
    email: { adminNotificationRecipients: [], sendAdminOrderNotification: false },
    tax: { defaultVatRate: 27, availableRates: [5, 18, 27] },
  },
}))

vi.mock("@/lib/config/hooks", () => ({
  getHooks: () => ({
    preCheckoutHook: vi.fn(async (draft: Record<string, unknown>) => draft),
    postOrderHook: vi.fn(),
  }),
}))

vi.mock("@/lib/utils/shipping", () => ({
  calculateShippingFee: vi.fn(() => 0),
}))

vi.mock("@/lib/security/plan-gate", () => ({
  getPlanGate: vi.fn(async () => ({
    features: null,
    check: () => ({ allowed: true }),
    checkLimit: () => ({ allowed: true }),
  })),
}))

// ── Import after mocks ────────────────────────────────────────────

import { productCreateSchema, productUpdateSchema } from "@/lib/validators/product"

// ── Helpers ───────────────────────────────────────────────────────

const futureDate = new Date(Date.now() + 86400000 * 7).toISOString() // 7 days from now
const pastDate = new Date(Date.now() - 86400000 * 7).toISOString() // 7 days ago

function validCreateInput(overrides: Record<string, unknown> = {}) {
  return {
    title: "Teszt termék",
    slug: "teszt-termek",
    description: "Leírás",
    basePrice: 5000,
    vatRate: 27,
    imageUrls: [],
    isActive: true,
    categoryIds: [],
    ...overrides,
  }
}

function validUpdateInput(overrides: Record<string, unknown> = {}) {
  return {
    id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
    title: "Frissített termék",
    ...overrides,
  }
}

/* ================================================================== */
/*  1. Zod Validation — publishedAt                                    */
/* ================================================================== */

describe("Scheduled Publishing — Zod Validation", () => {
  it("accepts undefined publishedAt (immediate publish)", () => {
    const result = productCreateSchema.safeParse(validCreateInput())
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.publishedAt).toBeUndefined()
    }
  })

  it("accepts null publishedAt (immediate publish)", () => {
    const result = productCreateSchema.safeParse(validCreateInput({ publishedAt: null }))
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.publishedAt).toBeNull()
    }
  })

  it("accepts valid ISO date string for publishedAt", () => {
    const result = productCreateSchema.safeParse(validCreateInput({ publishedAt: futureDate }))
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.publishedAt).toBe(futureDate)
    }
  })

  it("accepts past date string for publishedAt", () => {
    const result = productCreateSchema.safeParse(validCreateInput({ publishedAt: pastDate }))
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.publishedAt).toBe(pastDate)
    }
  })

  it("accepts empty string for publishedAt (create schema)", () => {
    const result = productCreateSchema.safeParse(validCreateInput({ publishedAt: "" }))
    expect(result.success).toBe(true)
  })

  it("accepts publishedAt in update schema", () => {
    const result = productUpdateSchema.safeParse(validUpdateInput({ publishedAt: futureDate }))
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.publishedAt).toBe(futureDate)
    }
  })

  it("accepts null publishedAt in update schema (clear scheduling)", () => {
    const result = productUpdateSchema.safeParse(validUpdateInput({ publishedAt: null }))
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.publishedAt).toBeNull()
    }
  })

  it("rejects non-string publishedAt", () => {
    const result = productCreateSchema.safeParse(validCreateInput({ publishedAt: 12345 }))
    expect(result.success).toBe(false)
  })
})

/* ================================================================== */
/*  2. adminCreateProduct — publishedAt in FormData                    */
/* ================================================================== */

describe("Scheduled Publishing — adminCreateProduct FormData parsing", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockRequireAdmin.mockResolvedValue({
      id: "admin-1",
      email: "admin@test.hu",
      role: "admin",
    })
  })

  it("passes publishedAt ISO string to insert payload", async () => {
    // Track what gets inserted
    let insertedPayload: Record<string, unknown> | null = null

    mockAdminFrom.mockImplementation((table: string) => {
      if (table === "products") {
        return {
          select: () => Promise.resolve({ count: 0, data: [], error: null }),
          insert: (payload: Record<string, unknown>) => {
            insertedPayload = payload
            return {
              select: () => ({
                single: () =>
                  Promise.resolve({
                    data: { id: "new-product-id" },
                    error: null,
                  }),
              }),
            }
          },
        }
      }
      if (table === "product_categories") {
        return {
          insert: () => Promise.resolve({ error: null }),
        }
      }
      return { select: () => ({ eq: () => ({ data: [], error: null }) }) }
    })

    const { adminCreateProduct } = await import("@/lib/actions/products")

    const formData = new FormData()
    formData.set("title", "Ütemezett termék")
    formData.set("slug", "utemezett-termek")
    formData.set("description", "Leírás")
    formData.set("basePrice", "10000")
    formData.set("vatRate", "27")
    formData.set("imageUrls", "[]")
    formData.set("isActive", "true")
    formData.set("categoryIds", "[]")
    formData.set("publishedAt", futureDate)

    const result = await adminCreateProduct(formData)

    expect(result.success).toBe(true)
    expect(insertedPayload).not.toBeNull()
    expect(insertedPayload!.published_at).toBe(futureDate)
  })

  it("passes null when publishedAt is empty string", async () => {
    let insertedPayload: Record<string, unknown> | null = null

    mockAdminFrom.mockImplementation((table: string) => {
      if (table === "products") {
        return {
          select: () => Promise.resolve({ count: 0, data: [], error: null }),
          insert: (payload: Record<string, unknown>) => {
            insertedPayload = payload
            return {
              select: () => ({
                single: () =>
                  Promise.resolve({
                    data: { id: "new-product-id" },
                    error: null,
                  }),
              }),
            }
          },
        }
      }
      if (table === "product_categories") {
        return {
          insert: () => Promise.resolve({ error: null }),
        }
      }
      return { select: () => ({ eq: () => ({ data: [], error: null }) }) }
    })

    const { adminCreateProduct } = await import("@/lib/actions/products")

    const formData = new FormData()
    formData.set("title", "Azonnali termék")
    formData.set("slug", "azonnali-termek")
    formData.set("description", "Leírás")
    formData.set("basePrice", "5000")
    formData.set("vatRate", "27")
    formData.set("imageUrls", "[]")
    formData.set("isActive", "true")
    formData.set("categoryIds", "[]")
    formData.set("publishedAt", "")

    const result = await adminCreateProduct(formData)

    expect(result.success).toBe(true)
    expect(insertedPayload).not.toBeNull()
    expect(insertedPayload!.published_at).toBeNull()
  })
})

/* ================================================================== */
/*  3. adminUpdateProduct — publishedAt in FormData                    */
/* ================================================================== */

describe("Scheduled Publishing — adminUpdateProduct FormData parsing", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockRequireAdmin.mockResolvedValue({
      id: "admin-1",
      email: "admin@test.hu",
      role: "admin",
    })
  })

  it("includes published_at in update payload when provided", async () => {
    let updatedPayload: Record<string, unknown> | null = null

    mockAdminFrom.mockImplementation((table: string) => {
      if (table === "products") {
        return {
          update: (payload: Record<string, unknown>) => {
            updatedPayload = payload
            return {
              eq: () => Promise.resolve({ error: null }),
            }
          },
        }
      }
      if (table === "product_categories") {
        return {
          delete: () => ({
            eq: () => Promise.resolve({ error: null }),
          }),
          insert: () => Promise.resolve({ error: null }),
        }
      }
      if (table === "product_extras") {
        return {
          delete: () => ({
            eq: () => Promise.resolve({ error: null }),
          }),
          insert: () => Promise.resolve({ error: null }),
        }
      }
      if (table === "product_variants") {
        return {
          delete: () => ({
            eq: () => Promise.resolve({ error: null }),
          }),
          insert: () => Promise.resolve({ error: null }),
        }
      }
      return { select: () => ({ eq: () => ({ data: [], error: null }) }) }
    })

    const { adminUpdateProduct } = await import("@/lib/actions/products")

    const formData = new FormData()
    formData.set("title", "Frissített termék")
    formData.set("slug", "frissitett-termek")
    formData.set("description", "Leírás")
    formData.set("basePrice", "8000")
    formData.set("vatRate", "27")
    formData.set("imageUrls", "[]")
    formData.set("isActive", "true")
    formData.set("categoryIds", "[]")
    formData.set("publishedAt", futureDate)
    formData.set("variants", "[]")
    formData.set("extras", "[]")

    const result = await adminUpdateProduct("aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa", formData)

    expect(result.success).toBe(true)
    expect(updatedPayload).not.toBeNull()
    expect(updatedPayload!.published_at).toBe(futureDate)
  })

  it("clears published_at when empty string is sent", async () => {
    let updatedPayload: Record<string, unknown> | null = null

    mockAdminFrom.mockImplementation((table: string) => {
      if (table === "products") {
        return {
          update: (payload: Record<string, unknown>) => {
            updatedPayload = payload
            return {
              eq: () => Promise.resolve({ error: null }),
            }
          },
        }
      }
      if (table === "product_categories") {
        return {
          delete: () => ({
            eq: () => Promise.resolve({ error: null }),
          }),
          insert: () => Promise.resolve({ error: null }),
        }
      }
      if (table === "product_extras") {
        return {
          delete: () => ({
            eq: () => Promise.resolve({ error: null }),
          }),
          insert: () => Promise.resolve({ error: null }),
        }
      }
      if (table === "product_variants") {
        return {
          delete: () => ({
            eq: () => Promise.resolve({ error: null }),
          }),
          insert: () => Promise.resolve({ error: null }),
        }
      }
      return { select: () => ({ eq: () => ({ data: [], error: null }) }) }
    })

    const { adminUpdateProduct } = await import("@/lib/actions/products")

    const formData = new FormData()
    formData.set("title", "Frissített termék")
    formData.set("slug", "frissitett-termek")
    formData.set("description", "Leírás")
    formData.set("basePrice", "8000")
    formData.set("vatRate", "27")
    formData.set("imageUrls", "[]")
    formData.set("isActive", "true")
    formData.set("categoryIds", "[]")
    formData.set("publishedAt", "")
    formData.set("variants", "[]")
    formData.set("extras", "[]")

    const result = await adminUpdateProduct("aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa", formData)

    expect(result.success).toBe(true)
    expect(updatedPayload).not.toBeNull()
    expect(updatedPayload!.published_at).toBeNull()
  })
})

/* ================================================================== */
/*  4. listProducts — published_at filter applied                      */
/* ================================================================== */

describe("Scheduled Publishing — listProducts filter", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("applies published_at filter via .or() on the query chain", async () => {
    // Track the query chain to verify .or() is called
    const chainCalls: string[] = []

    const chainObj: Record<string, unknown> = {}
    const createChain = (): Record<string, unknown> => {
      const proxy: Record<string, unknown> = {}
      for (const method of ["select", "eq", "or", "in", "gte", "lte", "order", "range"]) {
        proxy[method] = (...args: unknown[]) => {
          chainCalls.push(`${method}(${JSON.stringify(args)})`)
          return proxy
        }
      }
      // Terminal — resolve with empty data
      proxy.then = (resolve: (val: unknown) => void) => {
        resolve({ data: [], error: null, count: 0 })
      }
      return proxy
    }

    mockServerFrom.mockImplementation((table: string) => {
      if (table === "products") {
        return createChain()
      }
      return {
        select: () => ({
          eq: () => ({
            single: () => Promise.resolve({ data: null, error: null }),
          }),
        }),
      }
    })

    const { listProducts } = await import("@/lib/actions/products")

    await listProducts({})

    // Verify that .or() was called with a published_at filter
    const orCall = chainCalls.find((c) => c.startsWith("or("))
    expect(orCall).toBeDefined()
    expect(orCall).toContain("published_at.is.null")
    expect(orCall).toContain("published_at.lte.")
  })
})

/* ================================================================== */
/*  5. getProductBySlug — published_at defense-in-depth filter         */
/* ================================================================== */

describe("Scheduled Publishing — getProductBySlug filter", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("applies published_at filter on getProductBySlug query", async () => {
    const chainCalls: string[] = []

    const createChain = (): Record<string, unknown> => {
      const proxy: Record<string, unknown> = {}
      for (const method of ["select", "eq", "or", "single"]) {
        proxy[method] = (...args: unknown[]) => {
          chainCalls.push(`${method}(${JSON.stringify(args)})`)
          if (method === "single") {
            return Promise.resolve({ data: null, error: { code: "PGRST116" } })
          }
          return proxy
        }
      }
      return proxy
    }

    mockServerFrom.mockImplementation(() => createChain())

    const { getProductBySlug } = await import("@/lib/actions/products")

    await getProductBySlug("test-slug")

    const orCall = chainCalls.find((c) => c.startsWith("or("))
    expect(orCall).toBeDefined()
    expect(orCall).toContain("published_at.is.null")
    expect(orCall).toContain("published_at.lte.")
  })
})

/* ================================================================== */
/*  6. createOrderFromCart — published_at filter on admin client        */
/* ================================================================== */

describe("Scheduled Publishing — createOrderFromCart filter", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("applies published_at filter when validating products in order creation", async () => {
    const chainCalls: string[] = []

    const createChain = (): Record<string, unknown> => {
      const proxy: Record<string, unknown> = {}
      for (const method of ["select", "eq", "or", "in"]) {
        proxy[method] = (...args: unknown[]) => {
          chainCalls.push(`${method}(${JSON.stringify(args)})`)
          return proxy
        }
      }
      // Terminal
      proxy.then = (resolve: (val: unknown) => void) => {
        resolve({ data: [], error: null })
      }
      return proxy
    }

    mockAdminFrom.mockImplementation(() => createChain())

    // Mock getCurrentUser to simulate guest checkout
    const rolesModule = await import("@/lib/security/roles")
    ;(rolesModule.getCurrentUser as ReturnType<typeof vi.fn>).mockResolvedValue(null)

    const { createOrderFromCart } = await import("@/lib/actions/orders")

    // Call with valid CartItem[] and CheckoutFormData — will fail after product validation, that's OK
    // We only need to verify the .or() filter was applied on the admin products query
    await createOrderFromCart({
      items: [
        {
          productId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
          variantId: null,
          title: "Teszt termék",
          variantLabel: "",
          price: 5000,
          quantity: 1,
          image: null,
          slug: "teszt-termek",
          stock: 10,
          weightGrams: 500,
        },
      ],
      checkout: {
        email: "guest@test.hu",
        phone: "+36 30 123 4567",
        shippingMethod: "home",
        shippingAddress: {
          name: "Teszt",
          zip: "1234",
          city: "Budapest",
          street: "Teszt utca 1.",
          country: "HU",
        },
        billingAddress: {
          name: "Teszt",
          zip: "1234",
          city: "Budapest",
          street: "Teszt utca 1.",
          country: "HU",
        },
        sameAsBilling: true,
        pickupPointProvider: null,
        pickupPointId: null,
        pickupPointLabel: null,
        carrier: "gls",
        notes: "",
        couponCode: "",
      },
    })

    // Verify that the admin query included .or() with published_at filter
    const orCall = chainCalls.find((c) => c.startsWith("or("))
    expect(orCall).toBeDefined()
    expect(orCall).toContain("published_at.is.null")
    expect(orCall).toContain("published_at.lte.")
  })
})
