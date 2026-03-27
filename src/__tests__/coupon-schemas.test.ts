import { describe, it, expect } from "vitest";
import { couponCreateSchema, couponApplySchema } from "@/lib/validators/coupon";

/* ------------------------------------------------------------------ */
/*  Coupon Zod validation schema tests                                 */
/*                                                                     */
/*  Tests the couponCreateSchema (admin) and couponApplySchema         */
/*  (storefront) validators for valid/invalid inputs.                  */
/* ------------------------------------------------------------------ */

// ── couponCreateSchema ─────────────────────────────────────────────

describe("couponCreateSchema", () => {
  const validInput = {
    code: "NYAR20",
    discountType: "percentage" as const,
    value: 20,
    minOrderAmount: 5000,
    maxUses: 100,
    validFrom: "2025-06-01",
    validUntil: "2025-08-31",
    isActive: true,
  };

  it("accepts valid coupon data", () => {
    const result = couponCreateSchema.safeParse(validInput);
    expect(result.success).toBe(true);
  });

  it("transforms code to uppercase", () => {
    const result = couponCreateSchema.safeParse({ ...validInput, code: "nyar20" });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.code).toBe("NYAR20");
    }
  });

  it("rejects code shorter than 3 characters", () => {
    const result = couponCreateSchema.safeParse({ ...validInput, code: "AB" });
    expect(result.success).toBe(false);
  });

  it("rejects code longer than 20 characters", () => {
    const result = couponCreateSchema.safeParse({
      ...validInput,
      code: "A".repeat(21),
    });
    expect(result.success).toBe(false);
  });

  it("accepts code with exactly 3 characters", () => {
    const result = couponCreateSchema.safeParse({ ...validInput, code: "ABC" });
    expect(result.success).toBe(true);
  });

  it("accepts code with exactly 20 characters", () => {
    const result = couponCreateSchema.safeParse({
      ...validInput,
      code: "A".repeat(20),
    });
    expect(result.success).toBe(true);
  });

  it('accepts "percentage" discount type', () => {
    const result = couponCreateSchema.safeParse({
      ...validInput,
      discountType: "percentage",
    });
    expect(result.success).toBe(true);
  });

  it('accepts "fixed" discount type', () => {
    const result = couponCreateSchema.safeParse({
      ...validInput,
      discountType: "fixed",
    });
    expect(result.success).toBe(true);
  });

  it("rejects invalid discount type", () => {
    const result = couponCreateSchema.safeParse({
      ...validInput,
      discountType: "bogus",
    });
    expect(result.success).toBe(false);
  });

  it("rejects value less than 1", () => {
    const result = couponCreateSchema.safeParse({ ...validInput, value: 0 });
    expect(result.success).toBe(false);
  });

  it("rejects negative value", () => {
    const result = couponCreateSchema.safeParse({ ...validInput, value: -10 });
    expect(result.success).toBe(false);
  });

  it("accepts value of exactly 1", () => {
    const result = couponCreateSchema.safeParse({ ...validInput, value: 1 });
    expect(result.success).toBe(true);
  });

  it("allows optional fields to be omitted", () => {
    const minimal = {
      code: "TESZT",
      discountType: "fixed" as const,
      value: 500,
      isActive: false,
    };
    const result = couponCreateSchema.safeParse(minimal);
    expect(result.success).toBe(true);
  });

  it("allows minOrderAmount of 0", () => {
    const result = couponCreateSchema.safeParse({
      ...validInput,
      minOrderAmount: 0,
    });
    expect(result.success).toBe(true);
  });

  it("rejects negative minOrderAmount", () => {
    const result = couponCreateSchema.safeParse({
      ...validInput,
      minOrderAmount: -1,
    });
    expect(result.success).toBe(false);
  });

  it("rejects maxUses less than 1", () => {
    const result = couponCreateSchema.safeParse({
      ...validInput,
      maxUses: 0,
    });
    expect(result.success).toBe(false);
  });

  it("rejects non-boolean isActive", () => {
    const result = couponCreateSchema.safeParse({
      ...validInput,
      isActive: "yes",
    });
    expect(result.success).toBe(false);
  });

  it("rejects missing required code field", () => {
    const { code: _, ...noCode } = validInput;
    const result = couponCreateSchema.safeParse(noCode);
    expect(result.success).toBe(false);
  });

  it("rejects missing required isActive field", () => {
    const { isActive: _, ...noActive } = validInput;
    const result = couponCreateSchema.safeParse(noActive);
    expect(result.success).toBe(false);
  });

  it("rejects decimal (non-integer) value", () => {
    const result = couponCreateSchema.safeParse({ ...validInput, value: 10.5 });
    expect(result.success).toBe(false);
  });
});

// ── couponApplySchema ──────────────────────────────────────────────

describe("couponApplySchema", () => {
  it("accepts valid coupon apply input", () => {
    const result = couponApplySchema.safeParse({ code: "NYAR20", subtotal: 10000 });
    expect(result.success).toBe(true);
  });

  it("rejects empty code", () => {
    const result = couponApplySchema.safeParse({ code: "", subtotal: 10000 });
    expect(result.success).toBe(false);
  });

  it("rejects negative subtotal", () => {
    const result = couponApplySchema.safeParse({ code: "ABC", subtotal: -1 });
    expect(result.success).toBe(false);
  });

  it("accepts zero subtotal", () => {
    const result = couponApplySchema.safeParse({ code: "ABC", subtotal: 0 });
    expect(result.success).toBe(true);
  });

  it("rejects missing code", () => {
    const result = couponApplySchema.safeParse({ subtotal: 5000 });
    expect(result.success).toBe(false);
  });

  it("rejects missing subtotal", () => {
    const result = couponApplySchema.safeParse({ code: "TESZT" });
    expect(result.success).toBe(false);
  });

  it("rejects decimal subtotal (must be integer)", () => {
    const result = couponApplySchema.safeParse({ code: "TESZT", subtotal: 99.5 });
    expect(result.success).toBe(false);
  });
});
