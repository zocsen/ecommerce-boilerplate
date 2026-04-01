import { describe, it, expect } from "vitest";
import {
  calculateShippingFee,
  getAvailableCarriers,
  getCarrierFee,
  getWeightTierFee,
} from "@/lib/utils/shipping";
import { siteConfig } from "@/lib/config/site.config";

/* ------------------------------------------------------------------ */
/*  Unit tests for shipping fee calculations                           */
/* ------------------------------------------------------------------ */

describe("Shipping: calculateShippingFee", () => {
  it("returns base fee for home delivery under threshold", () => {
    const fee = calculateShippingFee("home", 5000);
    expect(fee).toBeGreaterThan(0);
  });

  it("returns 0 for home delivery at or above free threshold", () => {
    expect(calculateShippingFee("home", 15000)).toBe(0);
    expect(calculateShippingFee("home", 20000)).toBe(0);
  });

  it("returns 0 for pickup at or above free threshold", () => {
    expect(calculateShippingFee("pickup", 15000)).toBe(0);
    expect(calculateShippingFee("pickup", 50000)).toBe(0);
  });

  it("returns a fee for pickup below threshold", () => {
    const fee = calculateShippingFee("pickup", 5000);
    expect(fee).toBeGreaterThan(0);
  });

  it("uses weight tier fee when weight is provided", () => {
    // 1500g = 1.5 kg → first tier (maxWeightKg: 2, fee: 1490)
    const fee = calculateShippingFee("home", 5000, 1500);
    expect(fee).toBe(1490);
  });

  it("uses higher weight tier for heavier packages", () => {
    // 3000g = 3 kg → second tier (maxWeightKg: 5, fee: 1990)
    const fee = calculateShippingFee("home", 5000, 3000);
    expect(fee).toBe(1990);
  });

  it("free shipping overrides weight tier", () => {
    // Even with weight, free shipping threshold takes priority
    const fee = calculateShippingFee("home", 20000, 5000);
    expect(fee).toBe(0);
  });

  it("falls back to baseFee when no weight provided", () => {
    const fee = calculateShippingFee("home", 5000);
    expect(fee).toBe(siteConfig.shipping.rules.baseFee);
  });

  it("falls back to baseFee when weight is 0", () => {
    const fee = calculateShippingFee("home", 5000, 0);
    expect(fee).toBe(siteConfig.shipping.rules.baseFee);
  });
});

describe("Shipping: getAvailableCarriers", () => {
  it("returns home delivery carriers", () => {
    const carriers = getAvailableCarriers("home");
    expect(carriers.length).toBeGreaterThan(0);
    const ids = carriers.map((c) => c.id);
    expect(ids).toContain("gls");
    expect(ids).toContain("mpl");
  });

  it("returns pickup point carriers", () => {
    const carriers = getAvailableCarriers("pickup");
    expect(carriers.length).toBeGreaterThan(0);
    const ids = carriers.map((c) => c.id);
    expect(ids).toContain("foxpost");
    expect(ids).toContain("packeta");
  });

  it("all carriers have positive fees", () => {
    const all = [...getAvailableCarriers("home"), ...getAvailableCarriers("pickup")];
    for (const carrier of all) {
      expect(carrier.fee).toBeGreaterThan(0);
      expect(carrier.name.length).toBeGreaterThan(0);
    }
  });
});

describe("Shipping: getCarrierFee", () => {
  it("returns fee for valid home carrier", () => {
    const fee = getCarrierFee("home", "gls", 5000);
    expect(fee).toBeGreaterThan(0);
  });

  it("returns 0 for valid carrier when above free threshold", () => {
    const fee = getCarrierFee("home", "gls", 20000);
    expect(fee).toBe(0);
  });

  it("returns null for unknown carrier", () => {
    const fee = getCarrierFee("home", "nonexistent", 5000);
    expect(fee).toBeNull();
  });

  it("returns fee for valid pickup carrier", () => {
    const fee = getCarrierFee("pickup", "foxpost", 5000);
    expect(fee).toBeGreaterThan(0);
  });

  it("returns weight tier fee instead of carrier fee when weight provided", () => {
    // 1500g = 1.5 kg → first tier (maxWeightKg: 2, fee: 1490)
    const fee = getCarrierFee("home", "gls", 5000, 1500);
    expect(fee).toBe(1490);
  });

  it("returns carrier fee when weight is not provided", () => {
    // GLS carrier fee is 1490
    const fee = getCarrierFee("home", "gls", 5000);
    expect(fee).toBe(1490); // GLS fixed fee
  });

  it("free shipping overrides weight-based carrier fee", () => {
    const fee = getCarrierFee("home", "gls", 20000, 5000);
    expect(fee).toBe(0);
  });
});

/* ------------------------------------------------------------------ */
/*  Weight tier lookup                                                 */
/* ------------------------------------------------------------------ */

describe("Shipping: getWeightTierFee", () => {
  // Based on config: [{maxWeightKg:2,fee:1490},{maxWeightKg:5,fee:1990},{maxWeightKg:10,fee:2990},{maxWeightKg:20,fee:4490}]

  it("returns first tier fee for weight within first tier", () => {
    expect(getWeightTierFee(500)).toBe(1490); // 0.5 kg
    expect(getWeightTierFee(1000)).toBe(1490); // 1 kg
    expect(getWeightTierFee(2000)).toBe(1490); // 2 kg (boundary)
  });

  it("returns second tier fee for weight within second tier", () => {
    expect(getWeightTierFee(2001)).toBe(1990); // just above 2 kg
    expect(getWeightTierFee(3000)).toBe(1990); // 3 kg
    expect(getWeightTierFee(5000)).toBe(1990); // 5 kg (boundary)
  });

  it("returns third tier fee for weight within third tier", () => {
    expect(getWeightTierFee(5001)).toBe(2990); // just above 5 kg
    expect(getWeightTierFee(8000)).toBe(2990); // 8 kg
    expect(getWeightTierFee(10000)).toBe(2990); // 10 kg (boundary)
  });

  it("returns fourth tier fee for weight within fourth tier", () => {
    expect(getWeightTierFee(10001)).toBe(4490); // just above 10 kg
    expect(getWeightTierFee(15000)).toBe(4490); // 15 kg
    expect(getWeightTierFee(20000)).toBe(4490); // 20 kg (boundary)
  });

  it("returns highest tier fee when weight exceeds all tiers", () => {
    expect(getWeightTierFee(25000)).toBe(4490); // 25 kg — beyond max tier
    expect(getWeightTierFee(50000)).toBe(4490); // 50 kg
    expect(getWeightTierFee(100000)).toBe(4490); // 100 kg
  });

  it("returns first tier fee for very light items", () => {
    expect(getWeightTierFee(1)).toBe(1490); // 1g
    expect(getWeightTierFee(100)).toBe(1490); // 100g
  });
});
