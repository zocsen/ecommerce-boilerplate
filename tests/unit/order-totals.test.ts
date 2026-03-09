import { describe, it, expect } from "vitest"

/* ------------------------------------------------------------------ */
/*  Unit tests for order total calculations                            */
/*                                                                     */
/*  Tests the complete order total computation pipeline:               */
/*  - Line totals per item                                             */
/*  - Subtotal accumulation                                            */
/*  - Shipping fee rules                                               */
/*  - Discount application                                             */
/*  - Final total                                                      */
/* ------------------------------------------------------------------ */

// ── Types ──────────────────────────────────────────────────────────

interface OrderLineItem {
  unitPrice: number
  quantity: number
}

interface OrderTotals {
  subtotal: number
  shippingFee: number
  discount: number
  total: number
}

// ── Pure calculation functions ──────────────────────────────────────

function computeLineTotal(item: OrderLineItem): number {
  return item.unitPrice * item.quantity
}

function computeSubtotal(items: OrderLineItem[]): number {
  return items.reduce((sum, item) => sum + computeLineTotal(item), 0)
}

function computeShippingFee(
  subtotal: number,
  baseFee: number,
  freeThreshold: number,
): number {
  if (freeThreshold > 0 && subtotal >= freeThreshold) return 0
  return baseFee
}

function computeOrderTotals(
  items: OrderLineItem[],
  shippingBaseFee: number,
  freeShippingThreshold: number,
  discount: number,
): OrderTotals {
  const subtotal = computeSubtotal(items)
  const shippingFee = computeShippingFee(
    subtotal,
    shippingBaseFee,
    freeShippingThreshold,
  )
  const cappedDiscount = Math.min(discount, subtotal)
  const total = Math.max(0, subtotal + shippingFee - cappedDiscount)

  return {
    subtotal,
    shippingFee,
    discount: cappedDiscount,
    total,
  }
}

// ── Config (matches siteConfig defaults) ───────────────────────────

const BASE_FEE = 1490
const FREE_THRESHOLD = 15000

// ── Tests ──────────────────────────────────────────────────────────

describe("Order: line total", () => {
  it("computes price * quantity", () => {
    expect(computeLineTotal({ unitPrice: 5990, quantity: 2 })).toBe(11980)
  })

  it("handles single quantity", () => {
    expect(computeLineTotal({ unitPrice: 12900, quantity: 1 })).toBe(12900)
  })

  it("handles large quantities", () => {
    expect(computeLineTotal({ unitPrice: 100, quantity: 100 })).toBe(10000)
  })
})

describe("Order: subtotal", () => {
  it("returns 0 for empty order", () => {
    expect(computeSubtotal([])).toBe(0)
  })

  it("sums all line totals", () => {
    const items: OrderLineItem[] = [
      { unitPrice: 5990, quantity: 2 }, // 11980
      { unitPrice: 12900, quantity: 1 }, // 12900
      { unitPrice: 3490, quantity: 3 }, // 10470
    ]
    expect(computeSubtotal(items)).toBe(35350)
  })
})

describe("Order: shipping fee", () => {
  it("charges base fee under threshold", () => {
    expect(computeShippingFee(10000, BASE_FEE, FREE_THRESHOLD)).toBe(1490)
  })

  it("free shipping at exact threshold", () => {
    expect(computeShippingFee(15000, BASE_FEE, FREE_THRESHOLD)).toBe(0)
  })

  it("free shipping above threshold", () => {
    expect(computeShippingFee(50000, BASE_FEE, FREE_THRESHOLD)).toBe(0)
  })

  it("always charges when threshold is 0", () => {
    expect(computeShippingFee(100000, BASE_FEE, 0)).toBe(1490)
  })
})

describe("Order: full total calculation", () => {
  it("computes total for simple order under free shipping", () => {
    const result = computeOrderTotals(
      [{ unitPrice: 5990, quantity: 1 }],
      BASE_FEE,
      FREE_THRESHOLD,
      0,
    )

    expect(result).toEqual({
      subtotal: 5990,
      shippingFee: 1490,
      discount: 0,
      total: 7480,
    })
  })

  it("applies free shipping when subtotal meets threshold", () => {
    const result = computeOrderTotals(
      [{ unitPrice: 8000, quantity: 2 }], // subtotal = 16000
      BASE_FEE,
      FREE_THRESHOLD,
      0,
    )

    expect(result).toEqual({
      subtotal: 16000,
      shippingFee: 0,
      discount: 0,
      total: 16000,
    })
  })

  it("applies discount correctly", () => {
    const result = computeOrderTotals(
      [
        { unitPrice: 5990, quantity: 2 }, // 11980
        { unitPrice: 3490, quantity: 1 }, // 3490
      ],
      BASE_FEE,
      FREE_THRESHOLD,
      2000,
    )

    // subtotal = 15470, shipping = 0 (>= 15000), discount = 2000
    expect(result).toEqual({
      subtotal: 15470,
      shippingFee: 0,
      discount: 2000,
      total: 13470,
    })
  })

  it("caps discount at subtotal (does not make subtotal negative)", () => {
    const result = computeOrderTotals(
      [{ unitPrice: 1000, quantity: 1 }],
      BASE_FEE,
      FREE_THRESHOLD,
      5000, // more than subtotal
    )

    // subtotal = 1000, shipping = 1490, discount capped at 1000
    // total = max(0, 1000 + 1490 - 1000) = 1490
    expect(result.discount).toBe(1000)
    expect(result.total).toBe(1490)
  })

  it("handles zero-price order gracefully", () => {
    const result = computeOrderTotals([], BASE_FEE, FREE_THRESHOLD, 0)

    expect(result).toEqual({
      subtotal: 0,
      shippingFee: 1490,
      discount: 0,
      total: 1490,
    })
  })

  it("handles multi-item order with shipping + discount", () => {
    const result = computeOrderTotals(
      [
        { unitPrice: 2990, quantity: 2 }, // 5980
        { unitPrice: 1490, quantity: 3 }, // 4470
      ],
      BASE_FEE,
      FREE_THRESHOLD,
      1000,
    )

    // subtotal = 10450, shipping = 1490, discount = 1000
    // total = 10450 + 1490 - 1000 = 10940
    expect(result).toEqual({
      subtotal: 10450,
      shippingFee: 1490,
      discount: 1000,
      total: 10940,
    })
  })
})

describe("Order: HUF-specific edge cases", () => {
  it("all amounts are integers (no decimals)", () => {
    const result = computeOrderTotals(
      [{ unitPrice: 3333, quantity: 3 }],
      BASE_FEE,
      FREE_THRESHOLD,
      0,
    )

    expect(Number.isInteger(result.subtotal)).toBe(true)
    expect(Number.isInteger(result.shippingFee)).toBe(true)
    expect(Number.isInteger(result.total)).toBe(true)
  })

  it("handles typical Hungarian price points", () => {
    const items: OrderLineItem[] = [
      { unitPrice: 14990, quantity: 1 },
      { unitPrice: 6990, quantity: 2 },
    ]
    const result = computeOrderTotals(items, BASE_FEE, FREE_THRESHOLD, 0)

    // subtotal = 14990 + 13980 = 28970 (>15000 => free shipping)
    expect(result.subtotal).toBe(28970)
    expect(result.shippingFee).toBe(0)
    expect(result.total).toBe(28970)
  })
})
