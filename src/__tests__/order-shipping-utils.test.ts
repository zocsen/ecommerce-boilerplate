import { describe, it, expect } from "vitest";
import { calculateShippingFee, getAvailableCarriers, getCarrierFee } from "@/lib/utils/shipping";

/* ------------------------------------------------------------------ */
/*  Shipping utility tests                                             */
/*                                                                     */
/*  Tests calculateShippingFee, getAvailableCarriers, and              */
/*  getCarrierFee against the site configuration:                      */
/*    baseFee = 1490, freeOver = 15000                                 */
/* ------------------------------------------------------------------ */

// ── calculateShippingFee ───────────────────────────────────────────

describe("calculateShippingFee", () => {
  it("returns baseFee for home delivery below free threshold", () => {
    const fee = calculateShippingFee("home", 10000);
    expect(fee).toBe(1490);
  });

  it("returns 0 for home delivery at free shipping threshold", () => {
    const fee = calculateShippingFee("home", 15000);
    expect(fee).toBe(0);
  });

  it("returns 0 for home delivery above free shipping threshold", () => {
    const fee = calculateShippingFee("home", 20000);
    expect(fee).toBe(0);
  });

  it("returns 0 for pickup at free shipping threshold", () => {
    const fee = calculateShippingFee("pickup", 15000);
    expect(fee).toBe(0);
  });

  it("returns 0 for pickup above free shipping threshold", () => {
    const fee = calculateShippingFee("pickup", 50000);
    expect(fee).toBe(0);
  });

  it("returns reduced fee for pickup below threshold (min of baseFee and cheapest carrier)", () => {
    const fee = calculateShippingFee("pickup", 5000);
    // baseFee = 1490, cheapest pickup carrier = Packeta at 690
    // Math.min(1490, 690) = 690
    expect(fee).toBe(690);
  });

  it("returns a fee for zero subtotal (home)", () => {
    const fee = calculateShippingFee("home", 0);
    expect(fee).toBe(1490);
  });

  it("returns a fee for zero subtotal (pickup)", () => {
    const fee = calculateShippingFee("pickup", 0);
    // Math.min(1490, 690) = 690
    expect(fee).toBe(690);
  });

  it("returns numeric result for subtotal just below threshold", () => {
    const fee = calculateShippingFee("home", 14999);
    expect(fee).toBeGreaterThan(0);
  });
});

// ── getAvailableCarriers ───────────────────────────────────────────

describe("getAvailableCarriers", () => {
  it("returns home delivery carriers", () => {
    const carriers = getAvailableCarriers("home");
    expect(carriers.length).toBeGreaterThan(0);

    const ids = carriers.map((c) => c.id);
    expect(ids).toContain("gls");
    expect(ids).toContain("mpl");
    expect(ids).toContain("express_one");
  });

  it("returns pickup point carriers", () => {
    const carriers = getAvailableCarriers("pickup");
    expect(carriers.length).toBeGreaterThan(0);

    const ids = carriers.map((c) => c.id);
    expect(ids).toContain("foxpost");
    expect(ids).toContain("gls_automata");
    expect(ids).toContain("packeta");
    expect(ids).toContain("mpl_automata");
    expect(ids).toContain("easybox");
  });

  it("each carrier has id, name, and fee", () => {
    const carriers = getAvailableCarriers("home");

    for (const carrier of carriers) {
      expect(typeof carrier.id).toBe("string");
      expect(carrier.id.length).toBeGreaterThan(0);
      expect(typeof carrier.name).toBe("string");
      expect(carrier.name.length).toBeGreaterThan(0);
      expect(typeof carrier.fee).toBe("number");
      expect(carrier.fee).toBeGreaterThan(0);
    }
  });

  it("all carrier fees are positive integers", () => {
    const allCarriers = [...getAvailableCarriers("home"), ...getAvailableCarriers("pickup")];

    for (const carrier of allCarriers) {
      expect(Number.isInteger(carrier.fee)).toBe(true);
      expect(carrier.fee).toBeGreaterThan(0);
    }
  });
});

// ── getCarrierFee ──────────────────────────────────────────────────

describe("getCarrierFee", () => {
  it("returns carrier fee for valid home carrier below threshold", () => {
    const fee = getCarrierFee("home", "gls", 5000);
    expect(fee).toBe(1490);
  });

  it("returns carrier fee for valid pickup carrier below threshold", () => {
    const fee = getCarrierFee("pickup", "foxpost", 5000);
    expect(fee).toBe(890);
  });

  it("returns 0 for valid carrier at/above free threshold", () => {
    const fee = getCarrierFee("home", "gls", 15000);
    expect(fee).toBe(0);
  });

  it("returns 0 for pickup carrier above free threshold", () => {
    const fee = getCarrierFee("pickup", "packeta", 20000);
    expect(fee).toBe(0);
  });

  it("returns null for unknown carrier id", () => {
    const fee = getCarrierFee("home", "nonexistent_carrier", 5000);
    expect(fee).toBeNull();
  });

  it("returns null for pickup carrier queried as home", () => {
    const fee = getCarrierFee("home", "foxpost", 5000);
    expect(fee).toBeNull();
  });

  it("returns null for home carrier queried as pickup", () => {
    const fee = getCarrierFee("pickup", "gls", 5000);
    expect(fee).toBeNull();
  });

  it("returns correct fee for each pickup carrier", () => {
    const expectedFees: Record<string, number> = {
      foxpost: 890,
      gls_automata: 790,
      packeta: 690,
      mpl_automata: 790,
      easybox: 890,
    };

    for (const [carrierId, expectedFee] of Object.entries(expectedFees)) {
      const fee = getCarrierFee("pickup", carrierId, 1000);
      expect(fee).toBe(expectedFee);
    }
  });

  it("returns correct fee for each home carrier", () => {
    const expectedFees: Record<string, number> = {
      gls: 1490,
      mpl: 1290,
      express_one: 1790,
    };

    for (const [carrierId, expectedFee] of Object.entries(expectedFees)) {
      const fee = getCarrierFee("home", carrierId, 1000);
      expect(fee).toBe(expectedFee);
    }
  });
});
