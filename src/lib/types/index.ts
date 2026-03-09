/* ------------------------------------------------------------------ */
/*  Shared application types (cart, checkout, address)                 */
/* ------------------------------------------------------------------ */

export type { Database } from "@/lib/types/database";
export type {
  AppRole,
  OrderStatus,
  SubscriberStatus,
  AddressJson,
  VariantSnapshotJson,
  ProfileRow,
  CategoryRow,
  ProductRow,
  ProductVariantRow,
  CouponRow,
  OrderRow,
  OrderItemRow,
  SubscriberRow,
  AuditLogRow,
} from "@/lib/types/database";

// ── Address ────────────────────────────────────────────────────────

export interface Address {
  name: string;
  street: string;
  city: string;
  zip: string;
  country: string;
}

// ── Cart ───────────────────────────────────────────────────────────

export interface CartItem {
  productId: string;
  variantId: string | null;
  title: string;
  variantLabel: string;
  price: number;
  quantity: number;
  image: string | null;
  slug: string;
  stock: number;
}

// ── Shipping method discriminator ──────────────────────────────────

export type ShippingMethod = "home" | "pickup";

export type HomeDeliveryCarrier = "gls" | "mpl" | "express_one";

export type PickupPointProvider =
  | "foxpost"
  | "gls_automata"
  | "packeta"
  | "mpl_automata"
  | "easybox";

// ── Checkout form ──────────────────────────────────────────────────

export interface CheckoutFormData {
  /** Contact */
  email: string;
  phone: string;

  /** Shipping */
  shippingMethod: ShippingMethod;
  shippingAddress: Address;

  /** Billing (always required for invoicing) */
  billingAddress: Address;
  sameAsBilling: boolean;

  /** Pickup point selection (only when shippingMethod === 'pickup') */
  pickupPointProvider: PickupPointProvider | null;
  pickupPointId: string | null;
  pickupPointLabel: string | null;

  /** Home delivery carrier (only when shippingMethod === 'home') */
  carrier: HomeDeliveryCarrier | null;

  /** Extras */
  notes: string;
  couponCode: string;
}
