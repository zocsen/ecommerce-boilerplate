"use client";

/* ------------------------------------------------------------------ */
/*  Zustand cart store with localStorage persistence                   */
/* ------------------------------------------------------------------ */

import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { CartItem } from "@/lib/types";

// ── State shape ────────────────────────────────────────────────────

interface CartState {
  items: CartItem[];
  couponCode: string | null;
  couponDiscount: number;
}

interface CartActions {
  addItem: (item: CartItem) => void;
  removeItem: (productId: string, variantId: string | null) => void;
  updateQuantity: (productId: string, variantId: string | null, quantity: number) => void;
  clearCart: () => void;
  setCoupon: (code: string, discount: number) => void;
  removeCoupon: () => void;
}

interface CartComputeds {
  subtotal: () => number;
  itemCount: () => number;
  total: () => number;
}

type CartStore = CartState & CartActions & CartComputeds;

// ── Helpers ────────────────────────────────────────────────────────

function matchesItem(item: CartItem, productId: string, variantId: string | null): boolean {
  return item.productId === productId && item.variantId === variantId;
}

function computeSubtotal(items: CartItem[]): number {
  return items.reduce((sum, item) => sum + item.price * item.quantity, 0);
}

function computeItemCount(items: CartItem[]): number {
  return items.reduce((count, item) => count + item.quantity, 0);
}

// ── Store ──────────────────────────────────────────────────────────

export const useCartStore = create<CartStore>()(
  persist(
    (set, get) => ({
      // ── State ──
      items: [],
      couponCode: null,
      couponDiscount: 0,

      // ── Actions ──

      addItem: (newItem) =>
        set((state) => {
          const existing = state.items.find((item) =>
            matchesItem(item, newItem.productId, newItem.variantId),
          );

          if (existing) {
            // Merge: increase quantity, cap at stock
            return {
              items: state.items.map((item) =>
                matchesItem(item, newItem.productId, newItem.variantId)
                  ? {
                      ...item,
                      quantity: Math.min(item.quantity + newItem.quantity, item.stock),
                    }
                  : item,
              ),
            };
          }

          // New item — cap quantity at stock
          return {
            items: [
              ...state.items,
              {
                ...newItem,
                quantity: Math.min(newItem.quantity, newItem.stock),
              },
            ],
          };
        }),

      removeItem: (productId, variantId) =>
        set((state) => ({
          items: state.items.filter((item) => !matchesItem(item, productId, variantId)),
        })),

      updateQuantity: (productId, variantId, quantity) =>
        set((state) => {
          if (quantity <= 0) {
            return {
              items: state.items.filter((item) => !matchesItem(item, productId, variantId)),
            };
          }

          return {
            items: state.items.map((item) =>
              matchesItem(item, productId, variantId)
                ? { ...item, quantity: Math.min(quantity, item.stock) }
                : item,
            ),
          };
        }),

      clearCart: () =>
        set({
          items: [],
          couponCode: null,
          couponDiscount: 0,
        }),

      setCoupon: (code, discount) =>
        set({
          couponCode: code,
          couponDiscount: discount,
        }),

      removeCoupon: () =>
        set({
          couponCode: null,
          couponDiscount: 0,
        }),

      // ── Computed getters ──

      subtotal: () => computeSubtotal(get().items),

      itemCount: () => computeItemCount(get().items),

      total: () => {
        const sub = computeSubtotal(get().items);
        return Math.max(0, sub - get().couponDiscount);
      },
    }),
    {
      name: "cart-storage",
      partialize: (state) => ({
        items: state.items,
        couponCode: state.couponCode,
        couponDiscount: state.couponDiscount,
      }),
    },
  ),
);
