import { describe, it, expect } from "vitest"
import {
  calculateShippingFee,
  getAvailableCarriers,
  getCarrierFee,
} from "@/lib/utils/shipping"

/* ------------------------------------------------------------------ */
/*  Unit tests for shipping fee calculations                           */
/* ------------------------------------------------------------------ */

describe("Shipping: calculateShippingFee", () => {
  it("returns base fee for home delivery under threshold", () => {
    const fee = calculateShippingFee("home", 5000)
    expect(fee).toBeGreaterThan(0)
  })

  it("returns 0 for home delivery at or above free threshold", () => {
    expect(calculateShippingFee("home", 15000)).toBe(0)
    expect(calculateShippingFee("home", 20000)).toBe(0)
  })

  it("returns 0 for pickup at or above free threshold", () => {
    expect(calculateShippingFee("pickup", 15000)).toBe(0)
    expect(calculateShippingFee("pickup", 50000)).toBe(0)
  })

  it("returns a fee for pickup below threshold", () => {
    const fee = calculateShippingFee("pickup", 5000)
    expect(fee).toBeGreaterThan(0)
  })
})

describe("Shipping: getAvailableCarriers", () => {
  it("returns home delivery carriers", () => {
    const carriers = getAvailableCarriers("home")
    expect(carriers.length).toBeGreaterThan(0)
    const ids = carriers.map((c) => c.id)
    expect(ids).toContain("gls")
    expect(ids).toContain("mpl")
  })

  it("returns pickup point carriers", () => {
    const carriers = getAvailableCarriers("pickup")
    expect(carriers.length).toBeGreaterThan(0)
    const ids = carriers.map((c) => c.id)
    expect(ids).toContain("foxpost")
    expect(ids).toContain("packeta")
  })

  it("all carriers have positive fees", () => {
    const all = [
      ...getAvailableCarriers("home"),
      ...getAvailableCarriers("pickup"),
    ]
    for (const carrier of all) {
      expect(carrier.fee).toBeGreaterThan(0)
      expect(carrier.name.length).toBeGreaterThan(0)
    }
  })
})

describe("Shipping: getCarrierFee", () => {
  it("returns fee for valid home carrier", () => {
    const fee = getCarrierFee("home", "gls", 5000)
    expect(fee).toBeGreaterThan(0)
  })

  it("returns 0 for valid carrier when above free threshold", () => {
    const fee = getCarrierFee("home", "gls", 20000)
    expect(fee).toBe(0)
  })

  it("returns null for unknown carrier", () => {
    const fee = getCarrierFee("home", "nonexistent", 5000)
    expect(fee).toBeNull()
  })

  it("returns fee for valid pickup carrier", () => {
    const fee = getCarrierFee("pickup", "foxpost", 5000)
    expect(fee).toBeGreaterThan(0)
  })
})
