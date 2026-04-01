/* ------------------------------------------------------------------ */
/*  Order status — single source of truth                              */
/*  All labels, transitions, badge variants, and timeline definitions  */
/*  live here. Import from @/lib/constants/order-status everywhere.    */
/* ------------------------------------------------------------------ */

import type { OrderStatus, PaymentMethod } from "@/lib/types/database";

// ── Hungarian labels (consistent across admin, guest tracking, CSV) ─

export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  draft: "Piszkozat",
  awaiting_payment: "Fizetésre vár",
  paid: "Fizetve",
  processing: "Feldolgozás alatt",
  shipped: "Kiszállítva",
  cancelled: "Lemondva",
  refunded: "Visszatérítve",
};

// ── Badge variants for shadcn Badge component ──────────────────────

export const ORDER_STATUS_BADGE_VARIANT: Record<
  OrderStatus,
  "default" | "secondary" | "destructive" | "outline"
> = {
  draft: "outline",
  awaiting_payment: "secondary",
  paid: "default",
  processing: "default",
  shipped: "secondary",
  cancelled: "destructive",
  refunded: "destructive",
};

// ── Transition maps ────────────────────────────────────────────────
//
// Forward-only transitions. No backward transitions allowed because
// each status change triggers side effects (emails, stock changes,
// invoicing) that cannot be reliably undone.
//
// Exception handling: use cancel/refund to handle mistakes, not
// backward status changes.

/**
 * Barion (online payment) order status transitions.
 *
 * Lifecycle: awaiting_payment → paid → processing → shipped
 * Terminal:  cancelled, refunded
 */
export const BARION_STATUS_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  draft: ["awaiting_payment", "cancelled"],
  awaiting_payment: ["paid", "cancelled"],
  paid: ["processing", "cancelled", "refunded"],
  processing: ["shipped", "cancelled"],
  shipped: [],
  cancelled: [],
  refunded: [],
};

/**
 * COD (utánvét) order status transitions.
 *
 * COD orders skip `awaiting_payment` — they start at `processing`.
 * Payment happens on delivery, so the lifecycle is:
 *
 *   processing → shipped → paid (courier collected payment)
 *
 * After paid (delivered + paid), only refund is possible.
 * From shipped, order can also be cancelled (delivery failed / returned).
 */
export const COD_STATUS_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  draft: ["processing", "cancelled"],
  awaiting_payment: [], // COD orders never enter this state
  paid: ["refunded"], // Post-delivery paid — only refund is valid
  processing: ["shipped", "cancelled"],
  shipped: ["paid", "cancelled"], // paid = courier collected; cancelled = delivery failed
  cancelled: [],
  refunded: [],
};

/**
 * Get the correct transition map based on payment method.
 */
export function getStatusTransitions(
  paymentMethod: PaymentMethod,
): Record<OrderStatus, OrderStatus[]> {
  return paymentMethod === "cod" ? COD_STATUS_TRANSITIONS : BARION_STATUS_TRANSITIONS;
}

/**
 * Check if a status transition is allowed.
 */
export function isTransitionAllowed(
  currentStatus: OrderStatus,
  newStatus: OrderStatus,
  paymentMethod: PaymentMethod,
): boolean {
  const transitions = getStatusTransitions(paymentMethod);
  return transitions[currentStatus]?.includes(newStatus) ?? false;
}

// ── Confirmation dialog descriptions ───────────────────────────────
//
// Each transition has a description explaining what will happen,
// shown in the confirmation dialog.

interface TransitionMeta {
  /** Button label for the action */
  label: string;
  /** Description shown in confirmation dialog */
  description: string;
  /** Whether this is a destructive/dangerous action */
  destructive: boolean;
  /** Icon hint for the UI (lucide icon name) */
  icon: "check" | "package" | "truck" | "x" | "undo" | "banknote";
}

export const TRANSITION_META: Record<OrderStatus, TransitionMeta> = {
  draft: {
    label: "Piszkozat",
    description: "A rendelés piszkozat állapotba kerül.",
    destructive: false,
    icon: "check",
  },
  awaiting_payment: {
    label: "Fizetésre vár",
    description: "A rendelés fizetésre váró állapotba kerül.",
    destructive: false,
    icon: "check",
  },
  paid: {
    label: "Fizetve",
    description:
      "A rendelés fizetett státuszba kerül. Visszaigazoló e-mail kerül kiküldésre a vevőnek.",
    destructive: false,
    icon: "banknote",
  },
  processing: {
    label: "Feldolgozás alatt",
    description: "A rendelés feldolgozás alá kerül. A csomag összekészítése megkezdődik.",
    destructive: false,
    icon: "package",
  },
  shipped: {
    label: "Kiszállítva",
    description:
      "A rendelés kiszállított státuszba kerül. Szállítási értesítő e-mail kerül kiküldésre a vevőnek.",
    destructive: false,
    icon: "truck",
  },
  cancelled: {
    label: "Lemondva",
    description:
      "A rendelés lemondásra kerül. Ez a művelet nem vonható vissza. Ha a vevő már fizetett, külön visszatérítés szükséges.",
    destructive: true,
    icon: "x",
  },
  refunded: {
    label: "Visszatérítve",
    description:
      "A rendelés visszatérített státuszba kerül. Győződjön meg róla, hogy a visszatérítés ténylegesen megtörtént a fizetési szolgáltatónál.",
    destructive: true,
    icon: "undo",
  },
};

/**
 * Get COD-specific description overrides.
 */
export function getTransitionDescription(
  targetStatus: OrderStatus,
  paymentMethod: PaymentMethod,
  currentStatus: OrderStatus,
): string {
  // COD: shipped → paid means courier collected money
  if (paymentMethod === "cod" && currentStatus === "shipped" && targetStatus === "paid") {
    return "A futár beszedett fizetés visszaigazolása. A rendelés fizetett státuszba kerül és visszaigazoló e-mail kerül kiküldésre.";
  }

  // COD: shipped → cancelled means delivery failed
  if (paymentMethod === "cod" && currentStatus === "shipped" && targetStatus === "cancelled") {
    return "A kézbesítés sikertelen volt, a csomag visszaérkezett. A rendelés lemondásra kerül.";
  }

  return TRANSITION_META[targetStatus].description;
}

// ── Timeline definitions (for guest order tracking) ────────────────

/** Barion: awaiting_payment → paid → processing → shipped */
export const BARION_TIMELINE_ORDER: OrderStatus[] = [
  "awaiting_payment",
  "paid",
  "processing",
  "shipped",
];

/** COD: processing → shipped → paid (payment on delivery) */
export const COD_TIMELINE_ORDER: OrderStatus[] = ["processing", "shipped", "paid"];

/**
 * Get the timeline order based on payment method.
 */
export function getTimelineOrder(paymentMethod: PaymentMethod): OrderStatus[] {
  return paymentMethod === "cod" ? COD_TIMELINE_ORDER : BARION_TIMELINE_ORDER;
}

// ── Visual status step order (for admin stepper) ───────────────────
//
// This defines the canonical "happy path" order for visual display.

export const BARION_STEP_ORDER: OrderStatus[] = [
  "awaiting_payment",
  "paid",
  "processing",
  "shipped",
];

export const COD_STEP_ORDER: OrderStatus[] = ["processing", "shipped", "paid"];

export function getStepOrder(paymentMethod: PaymentMethod): OrderStatus[] {
  return paymentMethod === "cod" ? COD_STEP_ORDER : BARION_STEP_ORDER;
}

/**
 * Determine if a status is a terminal (end) state.
 */
export function isTerminalStatus(status: OrderStatus): boolean {
  return status === "cancelled" || status === "refunded" || status === "shipped";
}

/**
 * Determine if a status is a terminal state specifically for COD.
 * For COD, `shipped` is NOT terminal (it transitions to `paid`).
 */
export function isTerminalStatusForPayment(
  status: OrderStatus,
  paymentMethod: PaymentMethod,
): boolean {
  if (paymentMethod === "cod") {
    return status === "cancelled" || status === "refunded" || status === "paid";
  }
  return status === "cancelled" || status === "refunded" || status === "shipped";
}
