import { describe, it, expect, vi, beforeEach } from "vitest";

/* ------------------------------------------------------------------ */
/*  Order Notes — unit tests for FE-018                                */
/*                                                                     */
/*  Tests cover:                                                       */
/*    - addOrderNote: validation, creation, author resolution          */
/*    - getOrderNotes: fetching, author name resolution                */
/*    - deleteOrderNote: ownership check, deletion                     */
/* ------------------------------------------------------------------ */

// ── Hoisted mocks ──────────────────────────────────────────────────

const { mockRequireAdmin, mockRequireAdminOrViewer, mockLogAudit, mockAdminFrom } = vi.hoisted(
  () => {
    // Use a loosely-typed vi.fn() for mockAdminFrom so that
    // per-test mockImplementation() calls don't need to match
    // every possible Supabase chain shape.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const mockAdminFrom = vi.fn() as ReturnType<typeof vi.fn<(...args: any[]) => any>>;

    return {
      mockRequireAdmin: vi.fn(),
      mockRequireAdminOrViewer: vi.fn(),
      mockLogAudit: vi.fn(),
      mockAdminFrom,
    };
  },
);

// ── Module mocks ──────────────────────────────────────────────────

vi.mock("server-only", () => ({}));

vi.mock("next/headers", () => ({
  headers: vi.fn(async () => new Map()),
}));

vi.mock("@/lib/security/roles", () => ({
  requireAuth: vi.fn(),
  requireAdmin: mockRequireAdmin,
  requireAdminOrViewer: mockRequireAdminOrViewer,
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
  createClient: vi.fn(),
}));

vi.mock("@/lib/config/site.config", () => ({
  siteConfig: {
    store: { name: "Agency Store", currency: "HUF" },
    shipping: { rules: { baseFee: 1490, freeOver: 15000, weightTiers: [] } },
    features: { enableGuestCheckout: true },
    email: { adminNotificationRecipients: [], sendAdminOrderNotification: false },
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

import { addOrderNote, getOrderNotes, deleteOrderNote } from "@/lib/actions/orders";

// ── Test constants ─────────────────────────────────────────────────

const ADMIN_USER = { id: "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa", role: "admin" as const };
const ORDER_ID = "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb";
const NOTE_ID = "cccccccc-cccc-cccc-cccc-cccccccccccc";

// ── Tests ──────────────────────────────────────────────────────────

beforeEach(() => {
  vi.clearAllMocks();
  mockRequireAdmin.mockResolvedValue(ADMIN_USER);
  mockRequireAdminOrViewer.mockResolvedValue(ADMIN_USER);
});

/* ────────────────────── getOrderNotes ────────────────────── */

describe("getOrderNotes", () => {
  it("returns notes with author names resolved", async () => {
    const mockNotes = [
      {
        id: NOTE_ID,
        order_id: ORDER_ID,
        author_id: ADMIN_USER.id,
        content: "VIP vásárló",
        created_at: "2026-03-31T10:00:00Z",
      },
    ];

    // First from() call: order_notes.select()
    // Second from() call: profiles.select()
    let callCount = 0;
    mockAdminFrom.mockImplementation((table: string) => {
      if (table === "order_notes") {
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              order: vi.fn(() => ({ data: mockNotes, error: null })),
            })),
          })),
        };
      }
      if (table === "profiles") {
        return {
          select: vi.fn(() => ({
            in: vi.fn(() => ({
              data: [{ id: ADMIN_USER.id, full_name: "Nagy István" }],
              error: null,
            })),
          })),
        };
      }
      return {
        select: vi.fn(() => ({
          eq: vi.fn(() => ({ order: vi.fn(() => ({ data: [], error: null })) })),
        })),
      };
    });

    const result = await getOrderNotes(ORDER_ID);

    expect(result.success).toBe(true);
    expect(result.data).toHaveLength(1);
    expect(result.data![0].author_name).toBe("Nagy István");
    expect(result.data![0].content).toBe("VIP vásárló");
  });

  it("returns error for invalid order ID", async () => {
    const result = await getOrderNotes("not-a-uuid");
    expect(result.success).toBe(false);
    expect(result.error).toBeDefined();
  });

  it("returns empty list when no notes exist", async () => {
    mockAdminFrom.mockImplementation(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          order: vi.fn(() => ({ data: [], error: null })),
        })),
      })),
    }));

    const result = await getOrderNotes(ORDER_ID);
    expect(result.success).toBe(true);
    expect(result.data).toEqual([]);
  });

  it("shows 'Törölt felhasználó' for notes with deleted authors", async () => {
    const mockNotes = [
      {
        id: NOTE_ID,
        order_id: ORDER_ID,
        author_id: "dddddddd-dddd-dddd-dddd-dddddddddddd",
        content: "Régi jegyzet",
        created_at: "2026-03-30T10:00:00Z",
      },
    ];

    mockAdminFrom.mockImplementation((table: string) => {
      if (table === "order_notes") {
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              order: vi.fn(() => ({ data: mockNotes, error: null })),
            })),
          })),
        };
      }
      if (table === "profiles") {
        return {
          select: vi.fn(() => ({
            in: vi.fn(() => ({
              data: [], // Profile not found
              error: null,
            })),
          })),
        };
      }
      return {
        select: vi.fn(() => ({
          eq: vi.fn(() => ({ order: vi.fn(() => ({ data: [], error: null })) })),
        })),
      };
    });

    const result = await getOrderNotes(ORDER_ID);
    expect(result.success).toBe(true);
    expect(result.data![0].author_name).toBe("Törölt felhasználó");
  });
});

/* ────────────────────── addOrderNote ────────────────────── */

describe("addOrderNote", () => {
  it("creates a note and returns it with author name", async () => {
    const newNote = {
      id: NOTE_ID,
      order_id: ORDER_ID,
      author_id: ADMIN_USER.id,
      content: "Új megjegyzés",
      created_at: "2026-03-31T12:00:00Z",
    };

    mockAdminFrom.mockImplementation((table: string) => {
      if (table === "orders") {
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              single: vi.fn(() => ({ data: { id: ORDER_ID }, error: null })),
            })),
          })),
        };
      }
      if (table === "order_notes") {
        return {
          insert: vi.fn(() => ({
            select: vi.fn(() => ({
              single: vi.fn(() => ({ data: newNote, error: null })),
            })),
          })),
        };
      }
      if (table === "profiles") {
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              single: vi.fn(() => ({ data: { full_name: "Nagy István" }, error: null })),
            })),
          })),
        };
      }
      return { select: vi.fn(() => ({ eq: vi.fn(() => ({ single: vi.fn() })) })) };
    });

    const result = await addOrderNote(ORDER_ID, "Új megjegyzés");

    expect(result.success).toBe(true);
    expect(result.data!.content).toBe("Új megjegyzés");
    expect(result.data!.author_name).toBe("Nagy István");
    expect(mockLogAudit).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "order_note.create",
        entityType: "order_note",
      }),
    );
  });

  it("rejects empty content", async () => {
    const result = await addOrderNote(ORDER_ID, "");
    expect(result.success).toBe(false);
    expect(result.error).toContain("üres");
  });

  it("rejects content exceeding 2000 characters", async () => {
    const longContent = "a".repeat(2001);
    const result = await addOrderNote(ORDER_ID, longContent);
    expect(result.success).toBe(false);
    expect(result.error).toContain("2000");
  });

  it("rejects invalid order ID", async () => {
    const result = await addOrderNote("not-uuid", "Teszt");
    expect(result.success).toBe(false);
    expect(result.error).toBeDefined();
  });

  it("returns error when order not found", async () => {
    mockAdminFrom.mockImplementation((table: string) => {
      if (table === "orders") {
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              single: vi.fn(() => ({ data: null, error: { message: "Not found" } })),
            })),
          })),
        };
      }
      return { select: vi.fn(() => ({ eq: vi.fn(() => ({ single: vi.fn() })) })) };
    });

    const result = await addOrderNote(ORDER_ID, "Teszt megjegyzés");
    expect(result.success).toBe(false);
    expect(result.error).toContain("nem található");
  });
});

/* ────────────────────── deleteOrderNote ────────────────────── */

describe("deleteOrderNote", () => {
  it("deletes own note successfully", async () => {
    mockAdminFrom.mockImplementation((table: string) => {
      if (table === "order_notes") {
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              single: vi.fn(() => ({
                data: { id: NOTE_ID, author_id: ADMIN_USER.id, order_id: ORDER_ID },
                error: null,
              })),
            })),
          })),
          delete: vi.fn(() => ({
            eq: vi.fn(() => ({ error: null })),
          })),
        };
      }
      return { select: vi.fn(() => ({ eq: vi.fn(() => ({ single: vi.fn() })) })) };
    });

    const result = await deleteOrderNote(NOTE_ID);

    expect(result.success).toBe(true);
    expect(mockLogAudit).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "order_note.delete",
        entityType: "order_note",
        entityId: NOTE_ID,
      }),
    );
  });

  it("prevents deleting other user's note", async () => {
    mockAdminFrom.mockImplementation((table: string) => {
      if (table === "order_notes") {
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              single: vi.fn(() => ({
                data: {
                  id: NOTE_ID,
                  author_id: "eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee",
                  order_id: ORDER_ID,
                },
                error: null,
              })),
            })),
          })),
        };
      }
      return { select: vi.fn(() => ({ eq: vi.fn(() => ({ single: vi.fn() })) })) };
    });

    const result = await deleteOrderNote(NOTE_ID);

    expect(result.success).toBe(false);
    expect(result.error).toContain("saját");
    expect(mockLogAudit).not.toHaveBeenCalled();
  });

  it("returns error for invalid note ID", async () => {
    const result = await deleteOrderNote("bad-id");
    expect(result.success).toBe(false);
  });

  it("returns error when note not found", async () => {
    mockAdminFrom.mockImplementation((table: string) => {
      if (table === "order_notes") {
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              single: vi.fn(() => ({
                data: null,
                error: { message: "Not found" },
              })),
            })),
          })),
        };
      }
      return { select: vi.fn(() => ({ eq: vi.fn(() => ({ single: vi.fn() })) })) };
    });

    const result = await deleteOrderNote(NOTE_ID);
    expect(result.success).toBe(false);
    expect(result.error).toContain("nem található");
  });
});
