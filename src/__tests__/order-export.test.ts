import { describe, it, expect, vi, beforeEach } from "vitest";

/* ------------------------------------------------------------------ */
/*  Order Export CSV — unit tests for FE-026                            */
/*                                                                     */
/*  Tests cover:                                                       */
/*    - exportOrdersCsv: validation, CSV generation, filters,          */
/*      BOM, field escaping, empty results, line items                 */
/* ------------------------------------------------------------------ */

// ── Hoisted mocks ──────────────────────────────────────────────────

const { mockRequireAdminOrViewer, mockAdminFrom } = vi.hoisted(() => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const mockAdminFrom = vi.fn() as ReturnType<typeof vi.fn<(...args: any[]) => any>>;

  return {
    mockRequireAdminOrViewer: vi.fn(),
    mockAdminFrom,
  };
});

// ── Module mocks ──────────────────────────────────────────────────

vi.mock("server-only", () => ({}));

vi.mock("next/headers", () => ({
  headers: vi.fn(async () => new Map()),
}));

vi.mock("@/lib/security/roles", () => ({
  requireAuth: vi.fn(),
  requireAdmin: vi.fn(),
  requireAdminOrViewer: mockRequireAdminOrViewer,
  getCurrentUser: vi.fn(),
}));

vi.mock("@/lib/security/logger", () => ({
  logAudit: vi.fn(),
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
  createClient: vi.fn(),
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

import { exportOrdersCsv } from "@/lib/actions/orders";

// ── Test data ─────────────────────────────────────────────────────

const ORDER_1 = {
  id: "aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa",
  user_id: null,
  email: "teszt@example.com",
  status: "paid",
  currency: "HUF",
  subtotal_amount: 10000,
  shipping_fee: 1490,
  discount_total: 0,
  total_amount: 11490,
  coupon_code: null,
  shipping_method: "home",
  shipping_address: {
    name: "Teszt Elek",
    street: "Fő utca 1.",
    city: "Budapest",
    zip: "1011",
    country: "HU",
  },
  shipping_phone: "+36301234567",
  pickup_point_provider: null,
  pickup_point_id: null,
  pickup_point_label: null,
  billing_address: {
    name: "Teszt Elek",
    street: "Fő utca 1.",
    city: "Budapest",
    zip: "1011",
    country: "HU",
  },
  notes: null,
  barion_payment_id: null,
  barion_payment_request_id: null,
  barion_status: null,
  invoice_provider: null,
  invoice_number: null,
  invoice_url: null,
  created_at: "2026-03-15T10:30:00.000Z",
  updated_at: "2026-03-15T10:30:00.000Z",
  paid_at: "2026-03-15T10:32:00.000Z",
  shipped_at: null,
  idempotency_key: null,
};

const ORDER_2 = {
  ...ORDER_1,
  id: "bbbbbbbb-bbbb-4bbb-bbbb-bbbbbbbbbbbb",
  email: "masik@example.com",
  status: "shipped",
  total_amount: 25000,
  subtotal_amount: 25000,
  shipping_fee: 0,
  shipping_method: "pickup",
  shipping_address: {
    name: "Nagy, Béla",
    street: "Kossuth tér 5.",
    city: "Debrecen",
    zip: "4024",
    country: "HU",
  },
  notes: "Nyomkövetési szám: GLS123456",
  created_at: "2026-03-20T14:00:00.000Z",
  updated_at: "2026-03-20T16:00:00.000Z",
  shipped_at: "2026-03-20T16:00:00.000Z",
};

const ORDER_ITEMS = [
  {
    id: "item-1111",
    order_id: ORDER_1.id,
    product_id: "prod-1111",
    variant_id: "var-1111",
    title_snapshot: "Prémium póló",
    variant_snapshot: { option1Value: "L", option2Value: "Fekete", sku: "PP-L-BLK" },
    unit_price_snapshot: 5000,
    quantity: 2,
    line_total: 10000,
    vat_rate: 27,
  },
  {
    id: "item-2222",
    order_id: ORDER_2.id,
    product_id: "prod-2222",
    variant_id: null,
    title_snapshot: "Luxus táska",
    variant_snapshot: {},
    unit_price_snapshot: 25000,
    quantity: 1,
    line_total: 25000,
    vat_rate: 27,
  },
];

// ── Helpers ───────────────────────────────────────────────────────

function buildChain(data: unknown[] | null, error: { message: string } | null = null) {
  const result = { data, error };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const chain: Record<string, any> = {};
  chain.select = vi.fn().mockReturnValue(chain);
  chain.order = vi.fn().mockReturnValue(chain);
  chain.limit = vi.fn().mockReturnValue(chain);
  chain.eq = vi.fn().mockReturnValue(chain);
  chain.gte = vi.fn().mockReturnValue(chain);
  chain.lte = vi.fn().mockReturnValue(chain);
  chain.in = vi.fn().mockReturnValue(chain);

  // Make the chain thenable so `await` resolves to result
  chain.then = (resolve: (v: unknown) => void) => Promise.resolve(result).then(resolve);

  return chain;
}

// ── Tests ──────────────────────────────────────────────────────────

beforeEach(() => {
  vi.clearAllMocks();
  mockRequireAdminOrViewer.mockResolvedValue(undefined);
});

describe("exportOrdersCsv", () => {
  it("returns CSV with BOM and correct headers", async () => {
    const ordersChain = buildChain([ORDER_1]);
    const itemsChain = buildChain([{ order_id: ORDER_1.id, quantity: 2 }]);

    mockAdminFrom.mockImplementation((table: string) => {
      if (table === "orders") return ordersChain;
      if (table === "order_items") return itemsChain;
      return buildChain([]);
    });

    const result = await exportOrdersCsv({});

    expect(result.success).toBe(true);
    expect(result.data).toBeDefined();

    const csv = result.data!.csv;

    // Check BOM
    expect(csv.charCodeAt(0)).toBe(0xfeff);

    // Check headers
    const firstLine = csv.split("\r\n")[0].replace("\uFEFF", "");
    expect(firstLine).toContain("Rendelés szám");
    expect(firstLine).toContain("Dátum");
    expect(firstLine).toContain("Státusz");
    expect(firstLine).toContain("Vevő név");
    expect(firstLine).toContain("Vevő email");
    expect(firstLine).toContain("Szállítási mód");
    expect(firstLine).toContain("Végösszeg");
    expect(firstLine).toContain("Nyomkövetési szám");
  });

  it("includes order data in correct CSV format", async () => {
    const ordersChain = buildChain([ORDER_1]);
    const itemsChain = buildChain([{ order_id: ORDER_1.id, quantity: 2 }]);

    mockAdminFrom.mockImplementation((table: string) => {
      if (table === "orders") return ordersChain;
      if (table === "order_items") return itemsChain;
      return buildChain([]);
    });

    const result = await exportOrdersCsv({});
    const csv = result.data!.csv;
    const lines = csv.split("\r\n");

    // Second line is first data row
    const dataLine = lines[1];

    // Order number = first 8 chars uppercase
    expect(dataLine).toContain("AAAAAAAA");
    // Email
    expect(dataLine).toContain("teszt@example.com");
    // Status label in Hungarian
    expect(dataLine).toContain("Fizetve");
    // Shipping method
    expect(dataLine).toContain("Házhozszállítás");
    // Total amount
    expect(dataLine).toContain("11490");
    // Item count
    expect(dataLine).toContain("2");
  });

  it("escapes CSV fields with commas in name", async () => {
    const ordersChain = buildChain([ORDER_2]);
    const itemsChain = buildChain([{ order_id: ORDER_2.id, quantity: 1 }]);

    mockAdminFrom.mockImplementation((table: string) => {
      if (table === "orders") return ordersChain;
      if (table === "order_items") return itemsChain;
      return buildChain([]);
    });

    const result = await exportOrdersCsv({});
    const csv = result.data!.csv;
    const lines = csv.split("\r\n");
    const dataLine = lines[1];

    // "Nagy, Béla" should be quoted due to comma
    expect(dataLine).toContain('"Nagy, Béla"');
  });

  it("extracts tracking number from notes", async () => {
    const ordersChain = buildChain([ORDER_2]);
    const itemsChain = buildChain([{ order_id: ORDER_2.id, quantity: 1 }]);

    mockAdminFrom.mockImplementation((table: string) => {
      if (table === "orders") return ordersChain;
      if (table === "order_items") return itemsChain;
      return buildChain([]);
    });

    const result = await exportOrdersCsv({});
    const csv = result.data!.csv;

    expect(csv).toContain("GLS123456");
  });

  it("returns empty CSV with headers when no orders match", async () => {
    const ordersChain = buildChain([]);

    mockAdminFrom.mockImplementation(() => ordersChain);

    const result = await exportOrdersCsv({});

    expect(result.success).toBe(true);
    expect(result.data!.orderCount).toBe(0);

    const csv = result.data!.csv;
    const lines = csv.split("\r\n").filter(Boolean);

    // Only header line
    expect(lines.length).toBe(1);
    expect(lines[0].replace("\uFEFF", "")).toContain("Rendelés szám");
  });

  it("passes date filters to query", async () => {
    const ordersChain = buildChain([]);
    mockAdminFrom.mockImplementation(() => ordersChain);

    await exportOrdersCsv({
      dateFrom: "2026-03-01",
      dateTo: "2026-03-31",
    });

    expect(ordersChain.gte).toHaveBeenCalledWith("created_at", "2026-03-01");
    expect(ordersChain.lte).toHaveBeenCalledWith("created_at", "2026-03-31T23:59:59.999Z");
  });

  it("passes status filter to query", async () => {
    const ordersChain = buildChain([]);
    mockAdminFrom.mockImplementation(() => ordersChain);

    await exportOrdersCsv({ status: "paid" });

    expect(ordersChain.eq).toHaveBeenCalledWith("status", "paid");
  });

  it("generates filename with timestamp", async () => {
    const ordersChain = buildChain([]);
    mockAdminFrom.mockImplementation(() => ordersChain);

    const result = await exportOrdersCsv({});

    expect(result.data!.filename).toMatch(/^rendelesek_\d{8}_\d{4}\.csv$/);
  });

  it("includes line items when includeLineItems is true", async () => {
    const ordersChain = buildChain([ORDER_1, ORDER_2]);
    const itemsCountChain = buildChain([
      { order_id: ORDER_1.id, quantity: 2 },
      { order_id: ORDER_2.id, quantity: 1 },
    ]);
    const itemsFullChain = buildChain(ORDER_ITEMS);

    let itemsCallCount = 0;
    mockAdminFrom.mockImplementation((table: string) => {
      if (table === "orders") return ordersChain;
      if (table === "order_items") {
        itemsCallCount++;
        // First call is for item counts, second is for full items
        return itemsCallCount === 1 ? itemsCountChain : itemsFullChain;
      }
      return buildChain([]);
    });

    const result = await exportOrdersCsv({ includeLineItems: true });
    const csv = result.data!.csv;

    // Should have the line items header
    expect(csv).toContain("Termék");
    expect(csv).toContain("Variáns");
    expect(csv).toContain("Cikkszám");
    expect(csv).toContain("Egységár");
    expect(csv).toContain("Tétel összeg");

    // Should contain product titles
    expect(csv).toContain("Prémium póló");
    expect(csv).toContain("Luxus táska");

    // Should contain variant info and SKU
    expect(csv).toContain("L / Fekete");
    expect(csv).toContain("PP-L-BLK");
  });

  it("does not include line items by default", async () => {
    const ordersChain = buildChain([ORDER_1]);
    const itemsChain = buildChain([{ order_id: ORDER_1.id, quantity: 2 }]);

    mockAdminFrom.mockImplementation((table: string) => {
      if (table === "orders") return ordersChain;
      if (table === "order_items") return itemsChain;
      return buildChain([]);
    });

    const result = await exportOrdersCsv({});
    const csv = result.data!.csv;

    // Should NOT have line items section
    expect(csv).not.toContain("Cikkszám");
    expect(csv).not.toContain("Prémium póló");
  });

  it("returns error when auth fails", async () => {
    mockRequireAdminOrViewer.mockRejectedValue(new Error("Nincs jogosultság."));

    const result = await exportOrdersCsv({});

    expect(result.success).toBe(false);
    expect(result.error).toBe("Váratlan hiba történt.");
  });

  it("returns error on invalid filter input", async () => {
    // Pass something that would fail Zod validation
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = await exportOrdersCsv({ dateFrom: 123 as any });

    expect(result.success).toBe(false);
    expect(result.error).toContain("Érvénytelen");
  });

  it("returns error when DB query fails", async () => {
    const ordersChain = buildChain(null, { message: "DB error" });
    mockAdminFrom.mockImplementation(() => ordersChain);

    const result = await exportOrdersCsv({});

    expect(result.success).toBe(false);
    expect(result.error).toContain("Hiba");
  });

  it("handles multiple orders correctly", async () => {
    const ordersChain = buildChain([ORDER_1, ORDER_2]);
    const itemsChain = buildChain([
      { order_id: ORDER_1.id, quantity: 2 },
      { order_id: ORDER_2.id, quantity: 1 },
    ]);

    mockAdminFrom.mockImplementation((table: string) => {
      if (table === "orders") return ordersChain;
      if (table === "order_items") return itemsChain;
      return buildChain([]);
    });

    const result = await exportOrdersCsv({});

    expect(result.data!.orderCount).toBe(2);

    const csv = result.data!.csv;
    const lines = csv.split("\r\n").filter(Boolean);

    // Header + 2 data rows
    expect(lines.length).toBe(3);
    expect(lines[1]).toContain("AAAAAAAA");
    expect(lines[2]).toContain("BBBBBBBB");
  });

  it("shows pickup method for non-home delivery", async () => {
    const ordersChain = buildChain([ORDER_2]);
    const itemsChain = buildChain([{ order_id: ORDER_2.id, quantity: 1 }]);

    mockAdminFrom.mockImplementation((table: string) => {
      if (table === "orders") return ordersChain;
      if (table === "order_items") return itemsChain;
      return buildChain([]);
    });

    const result = await exportOrdersCsv({});
    const csv = result.data!.csv;

    expect(csv).toContain("Csomagautomata");
  });

  it("formats shipping address as single line", async () => {
    const ordersChain = buildChain([ORDER_1]);
    const itemsChain = buildChain([{ order_id: ORDER_1.id, quantity: 2 }]);

    mockAdminFrom.mockImplementation((table: string) => {
      if (table === "orders") return ordersChain;
      if (table === "order_items") return itemsChain;
      return buildChain([]);
    });

    const result = await exportOrdersCsv({});
    const csv = result.data!.csv;

    // Address should be formatted as "zip city street"
    expect(csv).toContain("1011 Budapest Fő utca 1.");
  });
});
