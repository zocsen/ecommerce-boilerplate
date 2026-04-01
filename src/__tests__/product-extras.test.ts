import { describe, it, expect, vi, beforeEach } from "vitest";

/* ------------------------------------------------------------------ */
/*  Product Extras — unit tests for FE-025                             */
/*                                                                     */
/*  Tests cover:                                                       */
/*    - getProductExtras: validation, fetching, enrichment             */
/*    - adminSetProductExtras: validation, self-ref guard, CRUD        */
/* ------------------------------------------------------------------ */

// ── Hoisted mocks ──────────────────────────────────────────────────

const { mockRequireAdmin, mockLogAudit, mockAdminFrom, mockServerFrom } = vi.hoisted(() => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const mockAdminFrom = vi.fn() as ReturnType<typeof vi.fn<(...args: any[]) => any>>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const mockServerFrom = vi.fn() as ReturnType<typeof vi.fn<(...args: any[]) => any>>;

  return {
    mockRequireAdmin: vi.fn(),
    mockLogAudit: vi.fn(),
    mockAdminFrom,
    mockServerFrom,
  };
});

// ── Module mocks ──────────────────────────────────────────────────

vi.mock("server-only", () => ({}));

vi.mock("next/headers", () => ({
  headers: vi.fn(async () => new Map()),
}));

vi.mock("@/lib/security/roles", () => ({
  requireAuth: vi.fn(),
  requireAdmin: mockRequireAdmin,
  requireAdminOrViewer: vi.fn(),
  getCurrentUser: vi.fn(),
}));

vi.mock("@/lib/security/logger", () => ({
  logAudit: mockLogAudit,
}));

vi.mock("@/lib/security/rate-limit", () => ({
  orderTrackingRateLimiter: {
    check: vi.fn(() => ({ allowed: true })),
  },
}));

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => ({
    from: mockAdminFrom,
  }),
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(async () => ({
    from: mockServerFrom,
  })),
}));

vi.mock("@/lib/config/site.config", () => ({
  siteConfig: {
    store: { name: "Agency Store", currency: "HUF" },
    shipping: { rules: { baseFee: 1490, freeOver: 15000, weightTiers: [] } },
    features: { enableGuestCheckout: true },
    email: { adminNotificationRecipients: [], sendAdminOrderNotification: false },
    tax: { defaultVatRate: 27, availableRates: [5, 18, 27] },
  },
}));

vi.mock("@/lib/config/hooks", () => ({
  getHooks: vi.fn(() => ({
    preCheckoutHook: (d: unknown) => d,
    postPaidHook: () => {},
    pricingHook: () => 0,
  })),
}));

vi.mock("@/lib/utils/shipping", () => ({
  calculateShippingFee: vi.fn(() => 1490),
}));

// ── Import after mocks ────────────────────────────────────────────

import { getProductExtras, adminSetProductExtras } from "@/lib/actions/products";

// ── Test constants ─────────────────────────────────────────────────

const ADMIN_USER = { id: "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa", role: "admin" as const };
const PRODUCT_ID = "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb";
const EXTRA_PRODUCT_ID = "cccccccc-cccc-cccc-cccc-cccccccccccc";
const EXTRA_VARIANT_ID = "dddddddd-dddd-dddd-dddd-dddddddddddd";

// ── Tests ──────────────────────────────────────────────────────────

beforeEach(() => {
  vi.clearAllMocks();
  mockRequireAdmin.mockResolvedValue(ADMIN_USER);
});

/* ────────────────────── getProductExtras ────────────────────── */

describe("getProductExtras", () => {
  it("returns enriched extras for a product", async () => {
    const rawExtras = [
      {
        id: "eeee0001-0000-0000-0000-000000000000",
        product_id: PRODUCT_ID,
        extra_product_id: EXTRA_PRODUCT_ID,
        extra_variant_id: null,
        label: "Díszcsomag (+990 Ft)",
        is_default_checked: false,
        sort_order: 0,
        created_at: "2026-03-31T10:00:00Z",
      },
    ];

    // Mock server-side createClient().from()
    mockServerFrom.mockImplementation((table: string) => {
      if (table === "product_extras") {
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              order: vi.fn(() => ({ data: rawExtras, error: null })),
            })),
          })),
        };
      }
      if (table === "products") {
        return {
          select: vi.fn(() => ({
            in: vi.fn(() => ({
              data: [
                {
                  id: EXTRA_PRODUCT_ID,
                  title: "Díszcsomag",
                  slug: "diszcsomag",
                  base_price: 990,
                  main_image_url: null,
                  is_active: true,
                },
              ],
              error: null,
            })),
          })),
        };
      }
      if (table === "product_variants") {
        return {
          select: vi.fn(() => ({
            in: vi.fn(() => ({ data: [], error: null })),
          })),
        };
      }
      return { select: vi.fn(() => ({ in: vi.fn(() => ({ data: [], error: null })) })) };
    });

    const result = await getProductExtras(PRODUCT_ID);

    expect(result.success).toBe(true);
    expect(result.data).toHaveLength(1);
    expect(result.data![0].extra_product_title).toBe("Díszcsomag");
    expect(result.data![0].extra_product_price).toBe(990);
    expect(result.data![0].label).toBe("Díszcsomag (+990 Ft)");
  });

  it("returns error for invalid product ID", async () => {
    const result = await getProductExtras("not-a-uuid");
    expect(result.success).toBe(false);
    expect(result.error).toContain("Érvénytelen");
  });

  it("returns empty list when no extras exist", async () => {
    mockServerFrom.mockImplementation((table: string) => {
      if (table === "product_extras") {
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              order: vi.fn(() => ({ data: [], error: null })),
            })),
          })),
        };
      }
      if (table === "products") {
        return {
          select: vi.fn(() => ({
            in: vi.fn(() => ({ data: [], error: null })),
          })),
        };
      }
      if (table === "product_variants") {
        return {
          select: vi.fn(() => ({
            in: vi.fn(() => ({ data: [], error: null })),
          })),
        };
      }
      return { select: vi.fn(() => ({ in: vi.fn(() => ({ data: [], error: null })) })) };
    });

    const result = await getProductExtras(PRODUCT_ID);
    expect(result.success).toBe(true);
    expect(result.data).toEqual([]);
  });

  it("returns error on database failure", async () => {
    mockServerFrom.mockImplementation((table: string) => {
      if (table === "product_extras") {
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              order: vi.fn(() => ({ data: null, error: { message: "DB error" } })),
            })),
          })),
        };
      }
      return { select: vi.fn(() => ({ eq: vi.fn(() => ({ order: vi.fn() })) })) };
    });

    const result = await getProductExtras(PRODUCT_ID);
    expect(result.success).toBe(false);
    expect(result.error).toContain("Hiba");
  });

  it("enriches extras with variant info when extra_variant_id is present", async () => {
    const rawExtras = [
      {
        id: "eeee0002-0000-0000-0000-000000000000",
        product_id: PRODUCT_ID,
        extra_product_id: EXTRA_PRODUCT_ID,
        extra_variant_id: EXTRA_VARIANT_ID,
        label: "Díszcsomag - Nagy (+1 490 Ft)",
        is_default_checked: true,
        sort_order: 0,
        created_at: "2026-03-31T10:00:00Z",
      },
    ];

    mockServerFrom.mockImplementation((table: string) => {
      if (table === "product_extras") {
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              order: vi.fn(() => ({ data: rawExtras, error: null })),
            })),
          })),
        };
      }
      if (table === "products") {
        return {
          select: vi.fn(() => ({
            in: vi.fn(() => ({
              data: [
                {
                  id: EXTRA_PRODUCT_ID,
                  title: "Díszcsomag",
                  slug: "diszcsomag",
                  base_price: 990,
                  main_image_url: null,
                  is_active: true,
                },
              ],
              error: null,
            })),
          })),
        };
      }
      if (table === "product_variants") {
        return {
          select: vi.fn(() => ({
            in: vi.fn(() => ({
              data: [
                {
                  id: EXTRA_VARIANT_ID,
                  price_override: 1490,
                  stock_quantity: 25,
                  is_active: true,
                },
              ],
              error: null,
            })),
          })),
        };
      }
      return { select: vi.fn(() => ({ in: vi.fn(() => ({ data: [], error: null })) })) };
    });

    const result = await getProductExtras(PRODUCT_ID);

    expect(result.success).toBe(true);
    expect(result.data).toHaveLength(1);
    expect(result.data![0].extra_variant_price).toBe(1490);
    expect(result.data![0].extra_variant_stock).toBe(25);
    expect(result.data![0].extra_variant_is_active).toBe(true);
  });

  it("filters out extras whose extra product no longer exists", async () => {
    const rawExtras = [
      {
        id: "eeee0003-0000-0000-0000-000000000000",
        product_id: PRODUCT_ID,
        extra_product_id: EXTRA_PRODUCT_ID,
        extra_variant_id: null,
        label: "Díszcsomag",
        is_default_checked: false,
        sort_order: 0,
        created_at: "2026-03-31T10:00:00Z",
      },
    ];

    mockServerFrom.mockImplementation((table: string) => {
      if (table === "product_extras") {
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              order: vi.fn(() => ({ data: rawExtras, error: null })),
            })),
          })),
        };
      }
      if (table === "products") {
        return {
          select: vi.fn(() => ({
            in: vi.fn(() => ({
              data: [], // product was deleted
              error: null,
            })),
          })),
        };
      }
      if (table === "product_variants") {
        return {
          select: vi.fn(() => ({
            in: vi.fn(() => ({ data: [], error: null })),
          })),
        };
      }
      return { select: vi.fn(() => ({ in: vi.fn(() => ({ data: [], error: null })) })) };
    });

    const result = await getProductExtras(PRODUCT_ID);
    expect(result.success).toBe(true);
    expect(result.data).toEqual([]);
  });
});

/* ────────────────────── adminSetProductExtras ────────────────────── */

describe("adminSetProductExtras", () => {
  it("saves extras successfully", async () => {
    mockAdminFrom.mockImplementation((table: string) => {
      if (table === "product_extras") {
        return {
          delete: vi.fn(() => ({
            eq: vi.fn(() => ({ error: null })),
          })),
          insert: vi.fn(() => ({ error: null })),
        };
      }
      return { delete: vi.fn(() => ({ eq: vi.fn(() => ({ error: null })) })) };
    });

    const result = await adminSetProductExtras(PRODUCT_ID, [
      {
        extraProductId: EXTRA_PRODUCT_ID,
        label: "Díszcsomag (+990 Ft)",
        isDefaultChecked: false,
        sortOrder: 0,
      },
    ]);

    expect(result.success).toBe(true);
    expect(mockLogAudit).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "product.set_extras",
        entityType: "product",
        entityId: PRODUCT_ID,
        metadata: { extrasCount: 1 },
      }),
    );
  });

  it("clears all extras when empty array is passed", async () => {
    const mockDelete = vi.fn(() => ({
      eq: vi.fn(() => ({ error: null })),
    }));

    mockAdminFrom.mockImplementation((table: string) => {
      if (table === "product_extras") {
        return {
          delete: mockDelete,
          insert: vi.fn(() => ({ error: null })),
        };
      }
      return { delete: vi.fn(() => ({ eq: vi.fn(() => ({ error: null })) })) };
    });

    const result = await adminSetProductExtras(PRODUCT_ID, []);

    expect(result.success).toBe(true);
    expect(mockDelete).toHaveBeenCalled();
    expect(mockLogAudit).toHaveBeenCalledWith(
      expect.objectContaining({
        metadata: { extrasCount: 0 },
      }),
    );
  });

  it("rejects invalid product ID", async () => {
    const result = await adminSetProductExtras("bad-id", []);
    expect(result.success).toBe(false);
    expect(result.error).toContain("Érvénytelen");
  });

  it("rejects self-referencing extras", async () => {
    const result = await adminSetProductExtras(PRODUCT_ID, [
      {
        extraProductId: PRODUCT_ID, // same as product ID
        label: "Saját termék",
        isDefaultChecked: false,
        sortOrder: 0,
      },
    ]);

    expect(result.success).toBe(false);
    expect(result.error).toContain("saját");
  });

  it("rejects extras with invalid extraProductId", async () => {
    const result = await adminSetProductExtras(PRODUCT_ID, [
      {
        extraProductId: "not-a-uuid",
        label: "Teszt",
        isDefaultChecked: false,
        sortOrder: 0,
      },
    ]);

    expect(result.success).toBe(false);
  });

  it("rejects extras with empty label", async () => {
    const result = await adminSetProductExtras(PRODUCT_ID, [
      {
        extraProductId: EXTRA_PRODUCT_ID,
        label: "",
        isDefaultChecked: false,
        sortOrder: 0,
      },
    ]);

    expect(result.success).toBe(false);
  });

  it("rejects extras with negative sort order", async () => {
    const result = await adminSetProductExtras(PRODUCT_ID, [
      {
        extraProductId: EXTRA_PRODUCT_ID,
        label: "Teszt",
        isDefaultChecked: false,
        sortOrder: -1,
      },
    ]);

    expect(result.success).toBe(false);
  });

  it("handles database insert failure", async () => {
    mockAdminFrom.mockImplementation((table: string) => {
      if (table === "product_extras") {
        return {
          delete: vi.fn(() => ({
            eq: vi.fn(() => ({ error: null })),
          })),
          insert: vi.fn(() => ({ error: { message: "Insert failed" } })),
        };
      }
      return { delete: vi.fn(() => ({ eq: vi.fn(() => ({ error: null })) })) };
    });

    const result = await adminSetProductExtras(PRODUCT_ID, [
      {
        extraProductId: EXTRA_PRODUCT_ID,
        label: "Díszcsomag",
        isDefaultChecked: false,
        sortOrder: 0,
      },
    ]);

    expect(result.success).toBe(false);
    expect(result.error).toContain("Hiba");
    expect(mockLogAudit).not.toHaveBeenCalled();
  });

  it("saves extras with variant ID", async () => {
    mockAdminFrom.mockImplementation((table: string) => {
      if (table === "product_extras") {
        return {
          delete: vi.fn(() => ({
            eq: vi.fn(() => ({ error: null })),
          })),
          insert: vi.fn(() => ({ error: null })),
        };
      }
      return { delete: vi.fn(() => ({ eq: vi.fn(() => ({ error: null })) })) };
    });

    const result = await adminSetProductExtras(PRODUCT_ID, [
      {
        extraProductId: EXTRA_PRODUCT_ID,
        extraVariantId: EXTRA_VARIANT_ID,
        label: "Díszcsomag - Nagy (+1 490 Ft)",
        isDefaultChecked: true,
        sortOrder: 0,
      },
    ]);

    expect(result.success).toBe(true);
    expect(mockLogAudit).toHaveBeenCalled();
  });
});
