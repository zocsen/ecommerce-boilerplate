import { describe, it, expect } from "vitest"

/* ------------------------------------------------------------------ */
/*  Unit tests for coupon validation logic                             */
/*                                                                     */
/*  Tests the pure validation logic for coupons:                       */
/*  - Percentage vs fixed discount calculation                         */
/*  - Minimum order amount checks                                      */
/*  - Usage limit checks                                               */
/*  - Validity date checks                                             */
/*  - Discount capping                                                 */
/* ------------------------------------------------------------------ */

// ── Coupon type (mirrors DB row) ───────────────────────────────────

interface Coupon {
  code: string
  discount_type: "percentage" | "fixed"
  value: number
  min_order_amount: number | null
  max_uses: number | null
  used_count: number
  valid_from: string | null
  valid_until: string | null
  is_active: boolean
}

// ── Pure validation functions ──────────────────────────────────────

function isCouponValid(
  coupon: Coupon,
  now: Date = new Date(),
): { valid: true } | { valid: false; reason: string } {
  if (!coupon.is_active) {
    return { valid: false, reason: "A kupon inaktív." }
  }

  if (coupon.valid_from && new Date(coupon.valid_from) > now) {
    return { valid: false, reason: "A kupon még nem érvényes." }
  }

  if (coupon.valid_until && new Date(coupon.valid_until) < now) {
    return { valid: false, reason: "A kupon lejárt." }
  }

  if (coupon.max_uses !== null && coupon.used_count >= coupon.max_uses) {
    return { valid: false, reason: "A kupon felhasználási kerete elfogyott." }
  }

  return { valid: true }
}

function meetsMinimumOrder(
  coupon: Coupon,
  subtotal: number,
): boolean {
  if (coupon.min_order_amount === null) return true
  return subtotal >= coupon.min_order_amount
}

function calculateDiscount(
  coupon: Coupon,
  subtotal: number,
): number {
  let discount: number

  if (coupon.discount_type === "percentage") {
    discount = Math.round((subtotal * coupon.value) / 100)
  } else {
    discount = coupon.value
  }

  // Discount cannot exceed subtotal
  return Math.min(discount, subtotal)
}

// ── Test data ──────────────────────────────────────────────────────

const PERCENTAGE_COUPON: Coupon = {
  code: "TESZT10",
  discount_type: "percentage",
  value: 10,
  min_order_amount: null,
  max_uses: null,
  used_count: 0,
  valid_from: null,
  valid_until: null,
  is_active: true,
}

const FIXED_COUPON: Coupon = {
  code: "FIX2000",
  discount_type: "fixed",
  value: 2000,
  min_order_amount: 10000,
  max_uses: 100,
  used_count: 50,
  valid_from: "2024-01-01T00:00:00Z",
  valid_until: "2099-12-31T23:59:59Z",
  is_active: true,
}

// ── Tests ──────────────────────────────────────────────────────────

describe("Coupon: validity checks", () => {
  it("accepts active coupon with no restrictions", () => {
    const result = isCouponValid(PERCENTAGE_COUPON)
    expect(result.valid).toBe(true)
  })

  it("rejects inactive coupon", () => {
    const result = isCouponValid({ ...PERCENTAGE_COUPON, is_active: false })
    expect(result.valid).toBe(false)
    if (!result.valid) expect(result.reason).toContain("inaktív")
  })

  it("rejects coupon not yet valid", () => {
    const futureCoupon: Coupon = {
      ...PERCENTAGE_COUPON,
      valid_from: "2099-01-01T00:00:00Z",
    }
    const result = isCouponValid(futureCoupon)
    expect(result.valid).toBe(false)
    if (!result.valid) expect(result.reason).toContain("nem érvényes")
  })

  it("rejects expired coupon", () => {
    const expiredCoupon: Coupon = {
      ...PERCENTAGE_COUPON,
      valid_until: "2020-01-01T00:00:00Z",
    }
    const result = isCouponValid(expiredCoupon)
    expect(result.valid).toBe(false)
    if (!result.valid) expect(result.reason).toContain("lejárt")
  })

  it("rejects coupon that has reached max uses", () => {
    const maxedCoupon: Coupon = {
      ...PERCENTAGE_COUPON,
      max_uses: 5,
      used_count: 5,
    }
    const result = isCouponValid(maxedCoupon)
    expect(result.valid).toBe(false)
    if (!result.valid) expect(result.reason).toContain("elfogyott")
  })

  it("accepts coupon under max uses", () => {
    const underMaxCoupon: Coupon = {
      ...PERCENTAGE_COUPON,
      max_uses: 5,
      used_count: 4,
    }
    const result = isCouponValid(underMaxCoupon)
    expect(result.valid).toBe(true)
  })

  it("accepts coupon within valid date range", () => {
    const now = new Date("2025-06-15T12:00:00Z")
    const result = isCouponValid(FIXED_COUPON, now)
    expect(result.valid).toBe(true)
  })
})

describe("Coupon: minimum order check", () => {
  it("passes when no minimum is set", () => {
    expect(meetsMinimumOrder(PERCENTAGE_COUPON, 100)).toBe(true)
  })

  it("passes when subtotal meets minimum", () => {
    expect(meetsMinimumOrder(FIXED_COUPON, 10000)).toBe(true)
  })

  it("passes when subtotal exceeds minimum", () => {
    expect(meetsMinimumOrder(FIXED_COUPON, 50000)).toBe(true)
  })

  it("fails when subtotal is below minimum", () => {
    expect(meetsMinimumOrder(FIXED_COUPON, 9999)).toBe(false)
  })

  it("fails when subtotal is zero", () => {
    expect(meetsMinimumOrder(FIXED_COUPON, 0)).toBe(false)
  })
})

describe("Coupon: discount calculation", () => {
  it("calculates 10% percentage discount", () => {
    // 10% of 15000 = 1500
    expect(calculateDiscount(PERCENTAGE_COUPON, 15000)).toBe(1500)
  })

  it("calculates percentage discount with rounding", () => {
    // 10% of 9999 = 999.9 => rounds to 1000
    expect(calculateDiscount(PERCENTAGE_COUPON, 9999)).toBe(1000)
  })

  it("calculates fixed discount", () => {
    expect(calculateDiscount(FIXED_COUPON, 15000)).toBe(2000)
  })

  it("caps discount at subtotal for percentage", () => {
    const bigPercentage: Coupon = {
      ...PERCENTAGE_COUPON,
      value: 100,
    }
    // 100% of 5000 = 5000, capped at 5000
    expect(calculateDiscount(bigPercentage, 5000)).toBe(5000)
  })

  it("caps fixed discount at subtotal", () => {
    // Fixed 2000, but subtotal is only 500
    expect(calculateDiscount(FIXED_COUPON, 500)).toBe(500)
  })

  it("returns 0 for zero subtotal", () => {
    expect(calculateDiscount(PERCENTAGE_COUPON, 0)).toBe(0)
  })

  it("handles 50% discount correctly", () => {
    const half: Coupon = {
      ...PERCENTAGE_COUPON,
      value: 50,
    }
    expect(calculateDiscount(half, 20000)).toBe(10000)
  })
})
