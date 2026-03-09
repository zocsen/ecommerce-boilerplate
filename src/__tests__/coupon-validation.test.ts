import { describe, it, expect } from "vitest";
import { couponCreateSchema, couponApplySchema } from "@/lib/validators/coupon";

/* ------------------------------------------------------------------ */
/*  Zod schema validation tests for coupons                            */
/*                                                                     */
/*  Tests couponCreateSchema (admin) and couponApplySchema (storefront)*/
/*  using Zod 4 safeParse.                                             */
/* ------------------------------------------------------------------ */

// ── couponCreateSchema ─────────────────────────────────────────────

describe("couponCreateSchema: valid inputs", () => {
  it("accepts valid coupon creation with all fields", () => {
    const input = {
      code: "NYARI20",
      discountType: "percentage",
      value: 20,
      minOrderAmount: 5000,
      maxUses: 100,
      validFrom: "2025-06-01T00:00:00Z",
      validUntil: "2025-08-31T23:59:59Z",
      isActive: true,
    };

    const result = couponCreateSchema.safeParse(input);
    expect(result.success).toBe(true);
    if (result.success) {
      // code should be uppercased by the transform
      expect(result.data.code).toBe("NYARI20");
      expect(result.data.discountType).toBe("percentage");
      expect(result.data.value).toBe(20);
    }
  });

  it("accepts coupon creation with minimal required fields", () => {
    const input = {
      code: "FIX",
      discountType: "fixed",
      value: 1000,
      isActive: false,
    };

    const result = couponCreateSchema.safeParse(input);
    expect(result.success).toBe(true);
  });

  it("transforms code to uppercase", () => {
    const input = {
      code: "teszt",
      discountType: "fixed",
      value: 500,
      isActive: true,
    };

    const result = couponCreateSchema.safeParse(input);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.code).toBe("TESZT");
    }
  });

  it("accepts percentage value of exactly 1", () => {
    const input = {
      code: "MIN",
      discountType: "percentage",
      value: 1,
      isActive: true,
    };

    const result = couponCreateSchema.safeParse(input);
    expect(result.success).toBe(true);
  });

  it("accepts fixed value of exactly 1", () => {
    const input = {
      code: "ONE",
      discountType: "fixed",
      value: 1,
      isActive: true,
    };

    const result = couponCreateSchema.safeParse(input);
    expect(result.success).toBe(true);
  });
});

describe("couponCreateSchema: invalid inputs", () => {
  it("rejects value of 0 (value must be >= 1)", () => {
    const input = {
      code: "BAD",
      discountType: "percentage",
      value: 0,
      isActive: true,
    };

    const result = couponCreateSchema.safeParse(input);
    expect(result.success).toBe(false);
  });

  it("rejects negative value", () => {
    const input = {
      code: "NEG",
      discountType: "fixed",
      value: -500,
      isActive: true,
    };

    const result = couponCreateSchema.safeParse(input);
    expect(result.success).toBe(false);
  });

  it("rejects missing code", () => {
    const input = {
      discountType: "percentage",
      value: 10,
      isActive: true,
    };

    const result = couponCreateSchema.safeParse(input);
    expect(result.success).toBe(false);
  });

  it("rejects code shorter than 3 characters", () => {
    const input = {
      code: "AB",
      discountType: "fixed",
      value: 100,
      isActive: true,
    };

    const result = couponCreateSchema.safeParse(input);
    expect(result.success).toBe(false);
  });

  it("rejects code longer than 20 characters", () => {
    const input = {
      code: "A".repeat(21),
      discountType: "fixed",
      value: 100,
      isActive: true,
    };

    const result = couponCreateSchema.safeParse(input);
    expect(result.success).toBe(false);
  });

  it("rejects discount_type not in enum", () => {
    const input = {
      code: "BAD",
      discountType: "buy_one_get_one",
      value: 10,
      isActive: true,
    };

    const result = couponCreateSchema.safeParse(input);
    expect(result.success).toBe(false);
  });

  it("rejects non-integer value (float)", () => {
    const input = {
      code: "FLOAT",
      discountType: "fixed",
      value: 10.5,
      isActive: true,
    };

    const result = couponCreateSchema.safeParse(input);
    expect(result.success).toBe(false);
  });

  it("rejects missing isActive", () => {
    const input = {
      code: "NOPE",
      discountType: "fixed",
      value: 100,
    };

    const result = couponCreateSchema.safeParse(input);
    expect(result.success).toBe(false);
  });
});

// ── couponApplySchema ──────────────────────────────────────────────

describe("couponApplySchema: valid inputs", () => {
  it("accepts valid code and subtotal", () => {
    const input = {
      code: "NYARI20",
      subtotal: 15000,
    };

    const result = couponApplySchema.safeParse(input);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.code).toBe("NYARI20");
      expect(result.data.subtotal).toBe(15000);
    }
  });

  it("accepts subtotal of 0", () => {
    const input = {
      code: "TEST",
      subtotal: 0,
    };

    const result = couponApplySchema.safeParse(input);
    expect(result.success).toBe(true);
  });
});

describe("couponApplySchema: invalid inputs", () => {
  it("rejects empty code", () => {
    const input = {
      code: "",
      subtotal: 10000,
    };

    const result = couponApplySchema.safeParse(input);
    expect(result.success).toBe(false);
  });

  it("rejects missing code", () => {
    const input = {
      subtotal: 10000,
    };

    const result = couponApplySchema.safeParse(input);
    expect(result.success).toBe(false);
  });

  it("rejects negative subtotal", () => {
    const input = {
      code: "TEST",
      subtotal: -100,
    };

    const result = couponApplySchema.safeParse(input);
    expect(result.success).toBe(false);
  });

  it("rejects non-integer subtotal (float)", () => {
    const input = {
      code: "TEST",
      subtotal: 100.5,
    };

    const result = couponApplySchema.safeParse(input);
    expect(result.success).toBe(false);
  });
});
