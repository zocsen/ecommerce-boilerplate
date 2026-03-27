import { describe, it, expect, beforeEach } from "vitest";
import { useCartStore } from "@/lib/store/cart";
import type { CartItem } from "@/lib/types";

/* ------------------------------------------------------------------ */
/*  Cart store — hydration & persistence tests                         */
/*                                                                     */
/*  Complements cart-math.test.ts which covers add/remove/update/      */
/*  clear and totals. This file focuses on store hydration,            */
/*  coupon state management, and edge cases around persistence.        */
/* ------------------------------------------------------------------ */

// ── Fixtures ───────────────────────────────────────────────────────

function makeItem(overrides: Partial<CartItem> = {}): CartItem {
  return {
    productId: "prod-001",
    variantId: "var-001",
    title: "Teszt Termék",
    variantLabel: "M / Fekete",
    price: 5990,
    quantity: 1,
    image: null,
    slug: "teszt-termek",
    stock: 10,
    ...overrides,
  };
}

// ── Reset store between tests ──────────────────────────────────────

beforeEach(() => {
  const { clearCart } = useCartStore.getState();
  clearCart();
});

// ── Coupon state management ────────────────────────────────────────

describe("Cart store: setCoupon", () => {
  it("sets coupon code and discount amount", () => {
    const { setCoupon } = useCartStore.getState();
    setCoupon("NYAR20", 3000);

    const state = useCartStore.getState();
    expect(state.couponCode).toBe("NYAR20");
    expect(state.couponDiscount).toBe(3000);
  });

  it("overwrites a previously applied coupon", () => {
    const { setCoupon } = useCartStore.getState();
    setCoupon("ELSO", 1000);
    setCoupon("MASODIK", 2500);

    const state = useCartStore.getState();
    expect(state.couponCode).toBe("MASODIK");
    expect(state.couponDiscount).toBe(2500);
  });

  it("allows zero discount (free coupon tracking)", () => {
    const { setCoupon } = useCartStore.getState();
    setCoupon("TESZT0", 0);

    const state = useCartStore.getState();
    expect(state.couponCode).toBe("TESZT0");
    expect(state.couponDiscount).toBe(0);
  });
});

describe("Cart store: removeCoupon", () => {
  it("resets coupon code to null and discount to 0", () => {
    const { setCoupon, removeCoupon } = useCartStore.getState();
    setCoupon("KUPON10", 1500);

    removeCoupon();

    const state = useCartStore.getState();
    expect(state.couponCode).toBeNull();
    expect(state.couponDiscount).toBe(0);
  });

  it("is safe to call when no coupon is set", () => {
    const { removeCoupon } = useCartStore.getState();

    expect(() => removeCoupon()).not.toThrow();

    const state = useCartStore.getState();
    expect(state.couponCode).toBeNull();
    expect(state.couponDiscount).toBe(0);
  });
});

// ── Hydration / initial state ──────────────────────────────────────

describe("Cart store: initial state", () => {
  it("starts with empty items array", () => {
    const { items } = useCartStore.getState();
    expect(items).toEqual([]);
  });

  it("starts with null couponCode", () => {
    const { couponCode } = useCartStore.getState();
    expect(couponCode).toBeNull();
  });

  it("starts with zero couponDiscount", () => {
    const { couponDiscount } = useCartStore.getState();
    expect(couponDiscount).toBe(0);
  });

  it("has all expected action methods", () => {
    const state = useCartStore.getState();
    expect(typeof state.addItem).toBe("function");
    expect(typeof state.removeItem).toBe("function");
    expect(typeof state.updateQuantity).toBe("function");
    expect(typeof state.clearCart).toBe("function");
    expect(typeof state.setCoupon).toBe("function");
    expect(typeof state.removeCoupon).toBe("function");
    expect(typeof state.itemCount).toBe("function");
    expect(typeof state.subtotal).toBe("function");
    expect(typeof state.total).toBe("function");
  });
});

// ── Multiple operations chaining ───────────────────────────────────

describe("Cart store: operation chaining", () => {
  it("handles rapid add/remove/update sequences correctly", () => {
    const store = useCartStore.getState();

    store.addItem(
      makeItem({ productId: "a", variantId: "v1", price: 1000, quantity: 2, stock: 10 }),
    );
    store.addItem(
      makeItem({ productId: "b", variantId: null, price: 2000, quantity: 1, stock: 5 }),
    );
    store.updateQuantity("a", "v1", 5);
    store.removeItem("b", null);
    store.addItem(makeItem({ productId: "c", variantId: "v3", price: 500, quantity: 3, stock: 8 }));

    const { items, subtotal } = useCartStore.getState();
    expect(items).toHaveLength(2);
    // 1000 * 5 + 500 * 3 = 6500
    expect(subtotal()).toBe(6500);
  });

  it("maintains coupon state across cart modifications", () => {
    const store = useCartStore.getState();

    store.addItem(
      makeItem({ productId: "a", variantId: null, price: 10000, quantity: 1, stock: 5 }),
    );
    store.setCoupon("TESZT", 2000);
    store.addItem(
      makeItem({ productId: "b", variantId: null, price: 5000, quantity: 1, stock: 5 }),
    );

    const state = useCartStore.getState();
    expect(state.couponCode).toBe("TESZT");
    expect(state.couponDiscount).toBe(2000);
    // 10000 + 5000 - 2000 = 13000
    expect(state.total()).toBe(13000);
  });

  it("clearCart also clears coupon", () => {
    const store = useCartStore.getState();

    store.addItem(
      makeItem({ productId: "a", variantId: null, price: 10000, quantity: 1, stock: 5 }),
    );
    store.setCoupon("KUPON", 1000);
    store.clearCart();

    const state = useCartStore.getState();
    expect(state.items).toHaveLength(0);
    expect(state.couponCode).toBeNull();
    expect(state.couponDiscount).toBe(0);
    expect(state.subtotal()).toBe(0);
    expect(state.total()).toBe(0);
  });
});
