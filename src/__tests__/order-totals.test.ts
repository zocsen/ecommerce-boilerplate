import { describe, it, expect } from "vitest";
import {
  calculateShippingFee,
  getAvailableCarriers,
  getCarrierFee,
} from "@/lib/utils/shipping";
import { formatHUF, formatDate, formatDateTime, formatPhone } from "@/lib/utils/format";

/* ------------------------------------------------------------------ */
/*  Order total calculation tests                                      */
/*                                                                     */
/*  Tests the shipping fee calculation from @/lib/utils/shipping       */
/*  and Hungarian formatting utilities from @/lib/utils/format.        */
/* ------------------------------------------------------------------ */

// ── Shipping: calculateShippingFee ─────────────────────────────────

describe("calculateShippingFee", () => {
  it("returns base fee for home delivery below threshold", () => {
    const fee = calculateShippingFee("home", 5000);
    expect(fee).toBe(1490); // siteConfig.shipping.rules.baseFee
  });

  it("returns 0 (free shipping) for home delivery at threshold", () => {
    const fee = calculateShippingFee("home", 15000); // freeOver = 15000
    expect(fee).toBe(0);
  });

  it("returns 0 (free shipping) for home delivery above threshold", () => {
    const fee = calculateShippingFee("home", 50000);
    expect(fee).toBe(0);
  });

  it("returns fee for pickup below threshold", () => {
    const fee = calculateShippingFee("pickup", 5000);
    // pickup uses Math.min(baseFee, minPickupCarrierFee)
    // baseFee = 1490, min pickup fee = 690 (Packeta)
    expect(fee).toBe(690);
  });

  it("returns 0 (free shipping) for pickup at threshold", () => {
    const fee = calculateShippingFee("pickup", 15000);
    expect(fee).toBe(0);
  });

  it("returns 0 (free shipping) for pickup above threshold", () => {
    const fee = calculateShippingFee("pickup", 30000);
    expect(fee).toBe(0);
  });

  it("charges pickup less than or equal to home delivery", () => {
    const homeFee = calculateShippingFee("home", 5000);
    const pickupFee = calculateShippingFee("pickup", 5000);
    expect(pickupFee).toBeLessThanOrEqual(homeFee);
  });
});

// ── Shipping: getAvailableCarriers ─────────────────────────────────

describe("getAvailableCarriers", () => {
  it("returns all configured home delivery carriers", () => {
    const carriers = getAvailableCarriers("home");
    const ids = carriers.map((c) => c.id);
    expect(ids).toContain("gls");
    expect(ids).toContain("mpl");
    expect(ids).toContain("express_one");
    expect(carriers).toHaveLength(3);
  });

  it("returns all configured pickup carriers", () => {
    const carriers = getAvailableCarriers("pickup");
    const ids = carriers.map((c) => c.id);
    expect(ids).toContain("foxpost");
    expect(ids).toContain("gls_automata");
    expect(ids).toContain("packeta");
    expect(ids).toContain("mpl_automata");
    expect(ids).toContain("easybox");
    expect(carriers).toHaveLength(5);
  });

  it("all carriers have a non-empty name and positive fee", () => {
    const all = [
      ...getAvailableCarriers("home"),
      ...getAvailableCarriers("pickup"),
    ];
    for (const carrier of all) {
      expect(carrier.name.length).toBeGreaterThan(0);
      expect(carrier.fee).toBeGreaterThan(0);
    }
  });
});

// ── Shipping: getCarrierFee ────────────────────────────────────────

describe("getCarrierFee", () => {
  it("returns specific carrier fee for GLS", () => {
    const fee = getCarrierFee("home", "gls", 5000);
    expect(fee).toBe(1490);
  });

  it("returns specific carrier fee for Foxpost", () => {
    const fee = getCarrierFee("pickup", "foxpost", 5000);
    expect(fee).toBe(890);
  });

  it("returns 0 when subtotal is above free threshold", () => {
    const fee = getCarrierFee("home", "gls", 20000);
    expect(fee).toBe(0);
  });

  it("returns null for an unknown carrier id", () => {
    const fee = getCarrierFee("home", "nonexistent_carrier", 5000);
    expect(fee).toBeNull();
  });

  it("returns null for a pickup carrier queried as home", () => {
    const fee = getCarrierFee("home", "foxpost", 5000);
    expect(fee).toBeNull();
  });
});

// ── Format: formatHUF ──────────────────────────────────────────────

describe("formatHUF", () => {
  it("formats a standard integer price", () => {
    // 12345 -> "12\u00A0345 Ft"
    expect(formatHUF(12345)).toBe("12\u00A0345 Ft");
  });

  it("handles zero", () => {
    expect(formatHUF(0)).toBe("0 Ft");
  });

  it("handles large numbers with proper grouping", () => {
    // 1234567 -> "1\u00A0234\u00A0567 Ft"
    expect(formatHUF(1234567)).toBe("1\u00A0234\u00A0567 Ft");
  });

  it("handles typical Hungarian price point", () => {
    expect(formatHUF(5990)).toBe("5\u00A0990 Ft");
  });

  it("handles small amounts without thousands separator", () => {
    expect(formatHUF(999)).toBe("999 Ft");
  });

  it("handles negative amounts", () => {
    expect(formatHUF(-1500)).toBe("-1\u00A0500 Ft");
  });

  it("rounds non-integer input", () => {
    expect(formatHUF(1234.7)).toBe("1\u00A0235 Ft");
  });

  it("formats exactly 1000 with separator", () => {
    expect(formatHUF(1000)).toBe("1\u00A0000 Ft");
  });
});

// ── Format: formatDate ─────────────────────────────────────────────

describe("formatDate", () => {
  it("formats a Date object in Hungarian format", () => {
    const date = new Date(2026, 2, 9); // March 9, 2026
    expect(formatDate(date)).toBe("2026. 03. 09.");
  });

  it("formats a date string in Hungarian format", () => {
    expect(formatDate("2025-01-15T12:00:00Z")).toMatch(
      /^2025\. 01\. 1[45]\.$/,
    );
    // Note: exact day may vary by timezone, so we allow 14 or 15
  });

  it("pads single-digit month and day", () => {
    const date = new Date(2025, 0, 5); // Jan 5
    expect(formatDate(date)).toBe("2025. 01. 05.");
  });

  it("handles December 31", () => {
    const date = new Date(2025, 11, 31); // Dec 31
    expect(formatDate(date)).toBe("2025. 12. 31.");
  });
});

// ── Format: formatDateTime ─────────────────────────────────────────

describe("formatDateTime", () => {
  it("includes time after the date", () => {
    const date = new Date(2026, 2, 9, 14, 30); // 2026-03-09 14:30
    expect(formatDateTime(date)).toBe("2026. 03. 09 14:30");
  });

  it("pads hours and minutes", () => {
    const date = new Date(2025, 0, 1, 8, 5); // 2025-01-01 08:05
    expect(formatDateTime(date)).toBe("2025. 01. 01 08:05");
  });
});

// ── Format: formatPhone ────────────────────────────────────────────

describe("formatPhone", () => {
  it("formats a standard +36 number", () => {
    expect(formatPhone("+36301234567")).toBe("+36 30 123 4567");
  });

  it("formats a number with spaces", () => {
    expect(formatPhone("+36 30 123 4567")).toBe("+36 30 123 4567");
  });

  it("formats a 06-prefixed number", () => {
    expect(formatPhone("06301234567")).toBe("+36 30 123 4567");
  });

  it("returns raw input for unrecognized format", () => {
    const weird = "+1 555 1234";
    expect(formatPhone(weird)).toBe(weird.trim());
  });
});
