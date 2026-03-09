import { describe, it, expect, beforeEach } from "vitest";
import { useCartStore } from "@/lib/store/cart";
import type { CartItem } from "@/lib/types";

/* ------------------------------------------------------------------ */
/*  Cart store integration tests                                       */
/*                                                                     */
/*  Tests the Zustand cart store actions and computed getters           */
/*  directly, including add/remove/update/clear and totals.            */
/* ------------------------------------------------------------------ */

// ── Fixtures ───────────────────────────────────────────────────────

function makeItem(overrides: Partial<CartItem> = {}): CartItem {
  return {
    productId: "prod-001",
    variantId: "var-001",
    title: "Teszt Termek",
    variantLabel: "M / Fekete",
    price: 5990,
    quantity: 1,
    image: null,
    slug: "teszt-termek",
    stock: 10,
    ...overrides,
  };
}

const ITEM_A = makeItem({
  productId: "prod-a",
  variantId: "var-a",
  title: "Termek A",
  price: 5990,
  quantity: 2,
  stock: 10,
});

const ITEM_B = makeItem({
  productId: "prod-b",
  variantId: null,
  title: "Termek B",
  price: 12900,
  quantity: 1,
  stock: 5,
});

const ITEM_C = makeItem({
  productId: "prod-c",
  variantId: "var-c",
  title: "Termek C",
  price: 3490,
  quantity: 3,
  stock: 3,
});

// ── Reset store between tests ──────────────────────────────────────

beforeEach(() => {
  const { clearCart } = useCartStore.getState();
  clearCart();
});

// ── addItem ────────────────────────────────────────────────────────

describe("Cart store: addItem", () => {
  it("adds a new item to an empty cart", () => {
    const { addItem } = useCartStore.getState();
    addItem(ITEM_A);

    const { items } = useCartStore.getState();
    expect(items).toHaveLength(1);
    expect(items[0].productId).toBe("prod-a");
    expect(items[0].variantId).toBe("var-a");
    expect(items[0].quantity).toBe(2);
  });

  it("increments quantity for duplicate product+variant", () => {
    const { addItem } = useCartStore.getState();
    addItem(makeItem({ productId: "prod-x", variantId: "var-x", quantity: 2, stock: 10 }));
    addItem(makeItem({ productId: "prod-x", variantId: "var-x", quantity: 3, stock: 10 }));

    const { items } = useCartStore.getState();
    expect(items).toHaveLength(1);
    expect(items[0].quantity).toBe(5);
  });

  it("does not exceed stock quantity when merging", () => {
    const { addItem } = useCartStore.getState();
    addItem(makeItem({ productId: "prod-x", variantId: "var-x", quantity: 8, stock: 10 }));
    addItem(makeItem({ productId: "prod-x", variantId: "var-x", quantity: 5, stock: 10 }));

    const { items } = useCartStore.getState();
    expect(items[0].quantity).toBe(10); // capped at stock
  });

  it("does not exceed stock quantity on initial add", () => {
    const { addItem } = useCartStore.getState();
    addItem(makeItem({ productId: "prod-x", variantId: null, quantity: 20, stock: 3 }));

    const { items } = useCartStore.getState();
    expect(items[0].quantity).toBe(3);
  });

  it("treats different variantIds as separate items", () => {
    const { addItem } = useCartStore.getState();
    addItem(makeItem({ productId: "prod-x", variantId: "var-1", quantity: 1 }));
    addItem(makeItem({ productId: "prod-x", variantId: "var-2", quantity: 1 }));

    const { items } = useCartStore.getState();
    expect(items).toHaveLength(2);
  });

  it("treats null variantId as a distinct key", () => {
    const { addItem } = useCartStore.getState();
    addItem(makeItem({ productId: "prod-x", variantId: null, quantity: 1 }));
    addItem(makeItem({ productId: "prod-x", variantId: "var-1", quantity: 1 }));

    const { items } = useCartStore.getState();
    expect(items).toHaveLength(2);
  });
});

// ── removeItem ─────────────────────────────────────────────────────

describe("Cart store: removeItem", () => {
  it("removes item by productId + variantId", () => {
    const { addItem, removeItem } = useCartStore.getState();
    addItem(ITEM_A);
    addItem(ITEM_B);

    removeItem("prod-a", "var-a");

    const { items } = useCartStore.getState();
    expect(items).toHaveLength(1);
    expect(items[0].productId).toBe("prod-b");
  });

  it("removes item with null variantId", () => {
    const { addItem, removeItem } = useCartStore.getState();
    addItem(ITEM_B); // variantId is null

    removeItem("prod-b", null);

    const { items } = useCartStore.getState();
    expect(items).toHaveLength(0);
  });

  it("does nothing when item not found", () => {
    const { addItem, removeItem } = useCartStore.getState();
    addItem(ITEM_A);

    removeItem("nonexistent", null);

    const { items } = useCartStore.getState();
    expect(items).toHaveLength(1);
  });
});

// ── updateQuantity ─────────────────────────────────────────────────

describe("Cart store: updateQuantity", () => {
  it("updates quantity of existing item", () => {
    const { addItem, updateQuantity } = useCartStore.getState();
    addItem(ITEM_A);

    updateQuantity("prod-a", "var-a", 5);

    const { items } = useCartStore.getState();
    expect(items[0].quantity).toBe(5);
  });

  it("removes item when quantity is set to 0", () => {
    const { addItem, updateQuantity } = useCartStore.getState();
    addItem(ITEM_A);

    updateQuantity("prod-a", "var-a", 0);

    const { items } = useCartStore.getState();
    expect(items).toHaveLength(0);
  });

  it("removes item when quantity is negative", () => {
    const { addItem, updateQuantity } = useCartStore.getState();
    addItem(ITEM_A);

    updateQuantity("prod-a", "var-a", -1);

    const { items } = useCartStore.getState();
    expect(items).toHaveLength(0);
  });

  it("caps quantity at stock", () => {
    const { addItem, updateQuantity } = useCartStore.getState();
    addItem(makeItem({ productId: "prod-x", variantId: "var-x", quantity: 1, stock: 5 }));

    updateQuantity("prod-x", "var-x", 99);

    const { items } = useCartStore.getState();
    expect(items[0].quantity).toBe(5);
  });
});

// ── clearCart ───────────────────────────────────────────────────────

describe("Cart store: clearCart", () => {
  it("empties all items", () => {
    const { addItem, clearCart } = useCartStore.getState();
    addItem(ITEM_A);
    addItem(ITEM_B);
    addItem(ITEM_C);

    clearCart();

    const { items } = useCartStore.getState();
    expect(items).toHaveLength(0);
  });

  it("resets coupon state", () => {
    const { addItem, setCoupon, clearCart } = useCartStore.getState();
    addItem(ITEM_A);
    setCoupon("TESZT10", 1000);

    clearCart();

    const state = useCartStore.getState();
    expect(state.items).toHaveLength(0);
    expect(state.couponCode).toBeNull();
    expect(state.couponDiscount).toBe(0);
  });
});

// ── Computed: itemCount (totalItems equivalent) ────────────────────

describe("Cart store: itemCount", () => {
  it("returns 0 for empty cart", () => {
    const { itemCount } = useCartStore.getState();
    expect(itemCount()).toBe(0);
  });

  it("sums all quantities across items", () => {
    const { addItem } = useCartStore.getState();
    addItem(ITEM_A); // qty 2
    addItem(ITEM_B); // qty 1
    addItem(ITEM_C); // qty 3

    const { itemCount } = useCartStore.getState();
    expect(itemCount()).toBe(6);
  });
});

// ── Computed: subtotal (totalPrice equivalent) ─────────────────────

describe("Cart store: subtotal", () => {
  it("returns 0 for empty cart", () => {
    const { subtotal } = useCartStore.getState();
    expect(subtotal()).toBe(0);
  });

  it("sums all price * quantity", () => {
    const { addItem } = useCartStore.getState();
    addItem(ITEM_A); // 5990 * 2 = 11980
    addItem(ITEM_B); // 12900 * 1 = 12900
    addItem(ITEM_C); // 3490 * 3 = 10470

    const { subtotal } = useCartStore.getState();
    // 11980 + 12900 + 10470 = 35350
    expect(subtotal()).toBe(35350);
  });
});

// ── Computed: total (with coupon discount) ─────────────────────────

describe("Cart store: total", () => {
  it("equals subtotal when no coupon applied", () => {
    const { addItem } = useCartStore.getState();
    addItem(ITEM_A);

    const { subtotal, total } = useCartStore.getState();
    expect(total()).toBe(subtotal());
  });

  it("subtracts coupon discount from subtotal", () => {
    const { addItem, setCoupon } = useCartStore.getState();
    addItem(ITEM_A); // 5990 * 2 = 11980
    setCoupon("FIX2000", 2000);

    const { total } = useCartStore.getState();
    expect(total()).toBe(9980);
  });

  it("never goes below zero", () => {
    const { addItem, setCoupon } = useCartStore.getState();
    addItem(makeItem({ price: 1000, quantity: 1 }));
    setCoupon("HUGE", 99999);

    const { total } = useCartStore.getState();
    expect(total()).toBe(0);
  });
});
