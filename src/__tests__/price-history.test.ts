import { describe, it, expect, vi, beforeEach } from "vitest";

/* ------------------------------------------------------------------ */
/*  Price History — unit tests for FE-006                              */
/*                                                                     */
/*  Tests cover:                                                       */
/*    - resolveLowest30DayPrice: pure function for map resolution      */
/*    - getLowest30DayPrice: server function with mocked Supabase      */
/*    - getLowest30DayPriceMap: batch query with grouping logic        */
/*    - getPriceHistory: chronological history retrieval                */
/* ------------------------------------------------------------------ */

// ── Hoisted mocks ──────────────────────────────────────────────────

const { mockServerFrom } = vi.hoisted(() => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const mockServerFrom = vi.fn() as ReturnType<typeof vi.fn<(...args: any[]) => any>>;

  return { mockServerFrom };
});

// ── Module mocks ──────────────────────────────────────────────────

vi.mock("server-only", () => ({}));

vi.mock("next/headers", () => ({
  headers: vi.fn(async () => new Map()),
  cookies: vi.fn(async () => ({
    getAll: vi.fn(() => []),
    set: vi.fn(),
  })),
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(async () => ({
    from: mockServerFrom,
  })),
}));

// ── Import after mocks ────────────────────────────────────────────

import { resolveLowest30DayPrice } from "@/lib/utils/price-history-shared";
import type { LowestPriceMap } from "@/lib/utils/price-history-shared";
import {
  getLowest30DayPrice,
  getLowest30DayPriceMap,
  getPriceHistory,
} from "@/lib/utils/price-history";

// ── Helper: create a chainable Supabase query mock ────────────────

function createChainableMock(
  resolvedData: Record<string, unknown>[] | null,
  resolvedError: { message: string } | null = null,
) {
  const result = { data: resolvedData, error: resolvedError };

  const chain: Record<string, ReturnType<typeof vi.fn>> = {};

  chain.select = vi.fn().mockReturnValue(chain);
  chain.eq = vi.fn().mockReturnValue(chain);
  chain.is = vi.fn().mockReturnValue(chain);
  chain.gte = vi.fn().mockReturnValue(chain);
  chain.gt = vi.fn().mockReturnValue(chain);
  chain.order = vi.fn().mockReturnValue(chain);
  chain.limit = vi.fn().mockResolvedValue(result);

  // For queries without .limit() — resolve on .order()
  chain.order.mockImplementation(() => {
    // Return both the chain AND make it thenable
    const proxy = { ...chain, then: (resolve: (val: typeof result) => void) => resolve(result) };
    return proxy;
  });

  return chain;
}

// ── Tests ──────────────────────────────────────────────────────────

describe("resolveLowest30DayPrice (pure function)", () => {
  it("returns product-level price when no variantId", () => {
    const map: LowestPriceMap = {
      product: { lowestPrice: 5000, date: "2026-03-01T00:00:00Z" },
    };

    const result = resolveLowest30DayPrice(map, null);
    expect(result).toEqual({ lowestPrice: 5000, date: "2026-03-01T00:00:00Z" });
  });

  it("returns variant-level price when variantId has history", () => {
    const map: LowestPriceMap = {
      product: { lowestPrice: 5000, date: "2026-03-01T00:00:00Z" },
      "variant-1": { lowestPrice: 4500, date: "2026-03-05T00:00:00Z" },
    };

    const result = resolveLowest30DayPrice(map, "variant-1");
    expect(result).toEqual({ lowestPrice: 4500, date: "2026-03-05T00:00:00Z" });
  });

  it("falls back to product-level when variant has no history", () => {
    const map: LowestPriceMap = {
      product: { lowestPrice: 5000, date: "2026-03-01T00:00:00Z" },
      "variant-1": null,
    };

    const result = resolveLowest30DayPrice(map, "variant-1");
    expect(result).toEqual({ lowestPrice: 5000, date: "2026-03-01T00:00:00Z" });
  });

  it("falls back to product-level when variant key is missing", () => {
    const map: LowestPriceMap = {
      product: { lowestPrice: 5000, date: "2026-03-01T00:00:00Z" },
    };

    const result = resolveLowest30DayPrice(map, "nonexistent-variant");
    expect(result).toEqual({ lowestPrice: 5000, date: "2026-03-01T00:00:00Z" });
  });

  it("returns null when no product-level history and no variant match", () => {
    const map: LowestPriceMap = {
      product: null,
    };

    const result = resolveLowest30DayPrice(map, "variant-1");
    expect(result).toBeNull();
  });

  it("returns null for empty map", () => {
    const map: LowestPriceMap = {};
    const result = resolveLowest30DayPrice(map, null);
    expect(result).toBeNull();
  });
});

describe("getLowest30DayPrice", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns the lowest price record when history exists", async () => {
    const chain = createChainableMock([{ price: 3990, recorded_at: "2026-03-15T10:00:00Z" }]);
    mockServerFrom.mockReturnValue(chain);

    const result = await getLowest30DayPrice("product-id-1");

    expect(result).toEqual({
      lowestPrice: 3990,
      date: "2026-03-15T10:00:00Z",
    });

    // Verify correct table was queried
    expect(mockServerFrom).toHaveBeenCalledWith("price_history");
    // Verify product_id filter
    expect(chain.eq).toHaveBeenCalledWith("product_id", "product-id-1");
    // Verify variant_id IS NULL for product-level
    expect(chain.is).toHaveBeenCalledWith("variant_id", null);
    // Verify sorted by price ascending
    expect(chain.order).toHaveBeenCalledWith("price", { ascending: true });
  });

  it("filters by variant_id when provided", async () => {
    const chain = createChainableMock([{ price: 4500, recorded_at: "2026-03-20T12:00:00Z" }]);
    mockServerFrom.mockReturnValue(chain);

    await getLowest30DayPrice("product-id-1", "variant-id-1");

    expect(chain.eq).toHaveBeenCalledWith("variant_id", "variant-id-1");
    // Should NOT call .is() for null
    expect(chain.is).not.toHaveBeenCalled();
  });

  it("returns null when no data exists", async () => {
    const chain = createChainableMock([]);
    mockServerFrom.mockReturnValue(chain);

    const result = await getLowest30DayPrice("product-no-history");
    expect(result).toBeNull();
  });

  it("returns null on query error", async () => {
    const chain = createChainableMock(null, { message: "Database error" });
    mockServerFrom.mockReturnValue(chain);

    const result = await getLowest30DayPrice("product-error");
    expect(result).toBeNull();
  });

  it("respects custom days parameter", async () => {
    const chain = createChainableMock([]);
    mockServerFrom.mockReturnValue(chain);

    await getLowest30DayPrice("product-id-1", null, 7);

    // Verify the cutoff date is approximately 7 days ago
    const gteCall = chain.gte.mock.calls[0];
    expect(gteCall[0]).toBe("recorded_at");
    const cutoff = new Date(gteCall[1]);
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    // Allow 1 second tolerance
    expect(Math.abs(cutoff.getTime() - sevenDaysAgo.getTime())).toBeLessThan(1000);
  });

  it("excludes free product records (price > 0)", async () => {
    const chain = createChainableMock([]);
    mockServerFrom.mockReturnValue(chain);

    await getLowest30DayPrice("product-id-1");

    expect(chain.gt).toHaveBeenCalledWith("price", 0);
  });
});

describe("getLowest30DayPriceMap", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("groups records by variant_id correctly", async () => {
    const chain = createChainableMock([
      // Sorted by price ASC (as the query orders)
      { variant_id: null, price: 3000, recorded_at: "2026-03-10T00:00:00Z" },
      { variant_id: "v1", price: 3500, recorded_at: "2026-03-12T00:00:00Z" },
      { variant_id: null, price: 4000, recorded_at: "2026-03-05T00:00:00Z" },
      { variant_id: "v1", price: 4500, recorded_at: "2026-03-08T00:00:00Z" },
      { variant_id: "v2", price: 5000, recorded_at: "2026-03-15T00:00:00Z" },
    ]);
    // For getLowest30DayPriceMap, the chain resolves on .order()
    mockServerFrom.mockReturnValue(chain);

    const result = await getLowest30DayPriceMap("product-1", ["v1", "v2", "v3"]);

    // Product-level: lowest is 3000
    expect(result["product"]).toEqual({
      lowestPrice: 3000,
      date: "2026-03-10T00:00:00Z",
    });

    // v1: lowest is 3500
    expect(result["v1"]).toEqual({
      lowestPrice: 3500,
      date: "2026-03-12T00:00:00Z",
    });

    // v2: only 5000
    expect(result["v2"]).toEqual({
      lowestPrice: 5000,
      date: "2026-03-15T00:00:00Z",
    });

    // v3: no history
    expect(result["v3"]).toBeNull();
  });

  it("returns product: null when no data", async () => {
    const chain = createChainableMock(null, { message: "error" });
    mockServerFrom.mockReturnValue(chain);

    const result = await getLowest30DayPriceMap("product-1", []);
    expect(result).toEqual({ product: null });
  });

  it("returns product: null when data is empty", async () => {
    const chain = createChainableMock([]);
    mockServerFrom.mockReturnValue(chain);

    const result = await getLowest30DayPriceMap("product-1", ["v1"]);
    expect(result["product"]).toBeNull();
    expect(result["v1"]).toBeNull();
  });
});

describe("getPriceHistory", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns chronologically sorted price points", async () => {
    const chain = createChainableMock([
      { price: 5000, compare_at_price: null, recorded_at: "2026-03-01T00:00:00Z" },
      { price: 4500, compare_at_price: 5000, recorded_at: "2026-03-10T00:00:00Z" },
      { price: 4000, compare_at_price: 5000, recorded_at: "2026-03-20T00:00:00Z" },
    ]);
    mockServerFrom.mockReturnValue(chain);

    const result = await getPriceHistory("product-1");

    expect(result).toEqual([
      { price: 5000, compareAtPrice: null, date: "2026-03-01T00:00:00Z" },
      { price: 4500, compareAtPrice: 5000, date: "2026-03-10T00:00:00Z" },
      { price: 4000, compareAtPrice: 5000, date: "2026-03-20T00:00:00Z" },
    ]);

    // Verify ascending order
    expect(chain.order).toHaveBeenCalledWith("recorded_at", { ascending: true });
  });

  it("returns empty array when no history", async () => {
    const chain = createChainableMock([]);
    mockServerFrom.mockReturnValue(chain);

    const result = await getPriceHistory("product-1");
    expect(result).toEqual([]);
  });

  it("returns empty array on error", async () => {
    const chain = createChainableMock(null, { message: "error" });
    mockServerFrom.mockReturnValue(chain);

    const result = await getPriceHistory("product-error");
    expect(result).toEqual([]);
  });

  it("filters by variant_id when provided", async () => {
    const chain = createChainableMock([]);
    mockServerFrom.mockReturnValue(chain);

    await getPriceHistory("product-1", "variant-1");

    expect(chain.eq).toHaveBeenCalledWith("variant_id", "variant-1");
    expect(chain.is).not.toHaveBeenCalled();
  });

  it("filters for product-level (variant_id IS NULL) when no variant", async () => {
    const chain = createChainableMock([]);
    mockServerFrom.mockReturnValue(chain);

    await getPriceHistory("product-1");

    expect(chain.is).toHaveBeenCalledWith("variant_id", null);
  });
});
