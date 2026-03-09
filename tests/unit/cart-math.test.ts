import { describe, it, expect } from "vitest"

/* ------------------------------------------------------------------ */
/*  Unit tests for cart math logic                                     */
/*                                                                     */
/*  Tests pure functions extracted from the cart store:                 */
/*  - subtotal calculation                                             */
/*  - item count                                                       */
/*  - total with coupon discount                                       */
/*  - quantity capping at stock                                        */
/* ------------------------------------------------------------------ */

import type { CartItem } from "@/lib/types"

// ── Pure helpers (mirrored from store internals) ───────────────────

function computeSubtotal(items: CartItem[]): number {
  return items.reduce((sum, item) => sum + item.price * item.quantity, 0)
}

function computeItemCount(items: CartItem[]): number {
  return items.reduce((count, item) => count + item.quantity, 0)
}

function computeTotal(items: CartItem[], couponDiscount: number): number {
  const sub = computeSubtotal(items)
  return Math.max(0, sub - couponDiscount)
}

function capQuantity(quantity: number, stock: number): number {
  return Math.min(quantity, stock)
}

// ── Test data ──────────────────────────────────────────────────────

const ITEM_A: CartItem = {
  productId: "aaaa-bbbb-cccc-dddd",
  variantId: "1111-2222-3333-4444",
  title: "Teszt Termék A",
  variantLabel: "M / Fekete",
  price: 5990,
  quantity: 2,
  image: null,
  slug: "teszt-termek-a",
  stock: 10,
}

const ITEM_B: CartItem = {
  productId: "eeee-ffff-gggg-hhhh",
  variantId: null,
  title: "Teszt Termék B",
  variantLabel: "",
  price: 12900,
  quantity: 1,
  image: null,
  slug: "teszt-termek-b",
  stock: 5,
}

const ITEM_C: CartItem = {
  productId: "iiii-jjjj-kkkk-llll",
  variantId: "5555-6666-7777-8888",
  title: "Teszt Termék C",
  variantLabel: "XL",
  price: 3490,
  quantity: 3,
  image: null,
  slug: "teszt-termek-c",
  stock: 3,
}

// ── Tests ──────────────────────────────────────────────────────────

describe("Cart: subtotal calculation", () => {
  it("returns 0 for empty cart", () => {
    expect(computeSubtotal([])).toBe(0)
  })

  it("computes subtotal for single item", () => {
    // 5990 * 2 = 11980
    expect(computeSubtotal([ITEM_A])).toBe(11980)
  })

  it("computes subtotal for multiple items", () => {
    // (5990 * 2) + (12900 * 1) + (3490 * 3) = 11980 + 12900 + 10470 = 35350
    expect(computeSubtotal([ITEM_A, ITEM_B, ITEM_C])).toBe(35350)
  })

  it("handles single quantity items", () => {
    const item: CartItem = { ...ITEM_A, quantity: 1 }
    expect(computeSubtotal([item])).toBe(5990)
  })
})

describe("Cart: item count", () => {
  it("returns 0 for empty cart", () => {
    expect(computeItemCount([])).toBe(0)
  })

  it("sums all quantities", () => {
    // 2 + 1 + 3 = 6
    expect(computeItemCount([ITEM_A, ITEM_B, ITEM_C])).toBe(6)
  })
})

describe("Cart: total with coupon discount", () => {
  it("returns subtotal when no discount", () => {
    const subtotal = computeSubtotal([ITEM_A, ITEM_B])
    expect(computeTotal([ITEM_A, ITEM_B], 0)).toBe(subtotal)
  })

  it("subtracts fixed discount", () => {
    // subtotal = 11980 + 12900 = 24880
    // discount = 2000 => total = 22880
    expect(computeTotal([ITEM_A, ITEM_B], 2000)).toBe(22880)
  })

  it("never goes below zero", () => {
    // subtotal = 5990 * 2 = 11980
    // discount = 99999 => total = 0
    expect(computeTotal([ITEM_A], 99999)).toBe(0)
  })

  it("handles exact discount match", () => {
    const subtotal = computeSubtotal([ITEM_A])
    expect(computeTotal([ITEM_A], subtotal)).toBe(0)
  })
})

describe("Cart: quantity capping at stock", () => {
  it("does not exceed stock", () => {
    expect(capQuantity(20, 10)).toBe(10)
  })

  it("keeps quantity when under stock", () => {
    expect(capQuantity(3, 10)).toBe(3)
  })

  it("keeps quantity when equal to stock", () => {
    expect(capQuantity(10, 10)).toBe(10)
  })

  it("handles zero stock", () => {
    expect(capQuantity(5, 0)).toBe(0)
  })
})

describe("Cart: percentage discount calculation", () => {
  it("calculates 10% discount correctly", () => {
    const subtotal = 25000
    const discount = Math.round((subtotal * 10) / 100)
    expect(discount).toBe(2500)
    expect(computeTotal([{ ...ITEM_B, price: 25000, quantity: 1 }], discount)).toBe(22500)
  })

  it("calculates 50% discount correctly", () => {
    const subtotal = 20000
    const discount = Math.round((subtotal * 50) / 100)
    expect(discount).toBe(10000)
  })

  it("caps percentage discount at subtotal", () => {
    const subtotal = 5000
    const discount = Math.min(Math.round((subtotal * 100) / 100), subtotal)
    expect(discount).toBe(subtotal)
  })
})
