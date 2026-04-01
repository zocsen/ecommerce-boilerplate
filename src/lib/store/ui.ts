"use client";

import { create } from "zustand";

/* ------------------------------------------------------------------ */
/*  UI Store — ephemeral UI state (no persistence)                    */
/* ------------------------------------------------------------------ */

interface UIState {
  cartDrawerOpen: boolean;
  openCartDrawer: () => void;
  closeCartDrawer: () => void;
  toggleCartDrawer: () => void;
}

export const useUIStore = create<UIState>((set) => ({
  cartDrawerOpen: false,
  openCartDrawer: () => set({ cartDrawerOpen: true }),
  closeCartDrawer: () => set({ cartDrawerOpen: false }),
  toggleCartDrawer: () => set((s) => ({ cartDrawerOpen: !s.cartDrawerOpen })),
}));
