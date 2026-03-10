/* ------------------------------------------------------------------ */
/*  Manual Database types matching the Supabase SQL schema             */
/*  Keep in sync with /supabase/migrations/001_init.sql                */
/*                                                                     */
/*  IMPORTANT: Row/Insert/Update MUST be `type` aliases (not           */
/*  `interface`) so they get implicit index signatures required by     */
/*  @supabase/postgrest-js GenericTable.                               */
/* ------------------------------------------------------------------ */

// ── Enums ──────────────────────────────────────────────────────────
export type AppRole = "customer" | "admin" | "agency_viewer";
export type OrderStatus =
  | "draft"
  | "awaiting_payment"
  | "paid"
  | "processing"
  | "shipped"
  | "cancelled"
  | "refunded";
export type SubscriberStatus = "subscribed" | "unsubscribed";

// ── Helper aliases ─────────────────────────────────────────────────
type Uuid = string;
type Timestamptz = string; // ISO-8601

// ── Address JSON shape (stored in orders.shipping_address / billing_address) ─
export type AddressJson = {
  name: string;
  street: string;
  city: string;
  zip: string;
  country: string;
};

// ── Billing address JSON (extends AddressJson with optional B2B fields) ─
export type BillingAddressJson = AddressJson & {
  company_name?: string;
  tax_number?: string;
};

// ── Pickup point JSON (stored in profiles.default_pickup_point) ─
export type PickupPointJson = {
  provider?: string;
  point_id?: string;
  point_label?: string;
};

// ── Variant snapshot shape (stored in order_items.variant_snapshot) ─
export type VariantSnapshotJson = {
  option1Name?: string;
  option1Value?: string;
  option2Name?: string;
  option2Value?: string;
  sku?: string;
};

// ── Table row / insert / update types ──────────────────────────────

/* ---------- profiles ---------- */
export type ProfileRow = {
  id: Uuid;
  role: AppRole;
  full_name: string | null;
  phone: string | null;
  default_shipping_address: AddressJson | Record<string, never>;
  default_billing_address: BillingAddressJson | Record<string, never>;
  default_pickup_point: PickupPointJson | Record<string, never>;
  created_at: Timestamptz;
};

export type ProfileInsert = {
  id: Uuid;
  role?: AppRole;
  full_name?: string | null;
  phone?: string | null;
  default_shipping_address?: AddressJson | Record<string, never>;
  default_billing_address?: BillingAddressJson | Record<string, never>;
  default_pickup_point?: PickupPointJson | Record<string, never>;
  created_at?: Timestamptz;
};

export type ProfileUpdate = {
  id?: Uuid;
  role?: AppRole;
  full_name?: string | null;
  phone?: string | null;
  default_shipping_address?: AddressJson | Record<string, never>;
  default_billing_address?: BillingAddressJson | Record<string, never>;
  default_pickup_point?: PickupPointJson | Record<string, never>;
  created_at?: Timestamptz;
};

/* ---------- categories ---------- */
export type CategoryRow = {
  id: Uuid;
  slug: string;
  name: string;
  parent_id: Uuid | null;
  sort_order: number;
  is_active: boolean;
};

export type CategoryInsert = {
  id?: Uuid;
  slug: string;
  name: string;
  parent_id?: Uuid | null;
  sort_order?: number;
  is_active?: boolean;
};

export type CategoryUpdate = {
  id?: Uuid;
  slug?: string;
  name?: string;
  parent_id?: Uuid | null;
  sort_order?: number;
  is_active?: boolean;
};

/* ---------- products ---------- */
export type ProductRow = {
  id: Uuid;
  slug: string;
  title: string;
  description: string | null;
  base_price: number;
  compare_at_price: number | null;
  main_image_url: string | null;
  image_urls: string[];
  is_active: boolean;
  created_at: Timestamptz;
  updated_at: Timestamptz;
};

export type ProductInsert = {
  id?: Uuid;
  slug: string;
  title: string;
  description?: string | null;
  base_price: number;
  compare_at_price?: number | null;
  main_image_url?: string | null;
  image_urls?: string[];
  is_active?: boolean;
  created_at?: Timestamptz;
  updated_at?: Timestamptz;
};

export type ProductUpdate = {
  id?: Uuid;
  slug?: string;
  title?: string;
  description?: string | null;
  base_price?: number;
  compare_at_price?: number | null;
  main_image_url?: string | null;
  image_urls?: string[];
  is_active?: boolean;
  created_at?: Timestamptz;
  updated_at?: Timestamptz;
};

/* ---------- product_variants ---------- */
export type ProductVariantRow = {
  id: Uuid;
  product_id: Uuid;
  sku: string | null;
  option1_name: string;
  option1_value: string | null;
  option2_name: string | null;
  option2_value: string | null;
  price_override: number | null;
  stock_quantity: number;
  is_active: boolean;
  created_at: Timestamptz;
  updated_at: Timestamptz;
};

export type ProductVariantInsert = {
  id?: Uuid;
  product_id: Uuid;
  sku?: string | null;
  option1_name?: string;
  option1_value?: string | null;
  option2_name?: string | null;
  option2_value?: string | null;
  price_override?: number | null;
  stock_quantity?: number;
  is_active?: boolean;
  created_at?: Timestamptz;
  updated_at?: Timestamptz;
};

export type ProductVariantUpdate = {
  id?: Uuid;
  product_id?: Uuid;
  sku?: string | null;
  option1_name?: string;
  option1_value?: string | null;
  option2_name?: string | null;
  option2_value?: string | null;
  price_override?: number | null;
  stock_quantity?: number;
  is_active?: boolean;
  created_at?: Timestamptz;
  updated_at?: Timestamptz;
};

/* ---------- product_categories (join table) ---------- */
export type ProductCategoryRow = {
  product_id: Uuid;
  category_id: Uuid;
};

export type ProductCategoryInsert = {
  product_id: Uuid;
  category_id: Uuid;
};

export type ProductCategoryUpdate = {
  product_id?: Uuid;
  category_id?: Uuid;
};

/* ---------- coupons ---------- */
export type CouponRow = {
  id: Uuid;
  code: string;
  discount_type: "percentage" | "fixed";
  value: number;
  min_order_amount: number | null;
  max_uses: number | null;
  used_count: number;
  valid_from: Timestamptz | null;
  valid_until: Timestamptz | null;
  is_active: boolean;
};

export type CouponInsert = {
  id?: Uuid;
  code: string;
  discount_type: "percentage" | "fixed";
  value: number;
  min_order_amount?: number | null;
  max_uses?: number | null;
  used_count?: number;
  valid_from?: Timestamptz | null;
  valid_until?: Timestamptz | null;
  is_active?: boolean;
};

export type CouponUpdate = {
  id?: Uuid;
  code?: string;
  discount_type?: "percentage" | "fixed";
  value?: number;
  min_order_amount?: number | null;
  max_uses?: number | null;
  used_count?: number;
  valid_from?: Timestamptz | null;
  valid_until?: Timestamptz | null;
  is_active?: boolean;
};

/* ---------- orders ---------- */
export type OrderRow = {
  id: Uuid;
  user_id: Uuid | null;
  email: string;
  status: OrderStatus;
  currency: string;
  subtotal_amount: number;
  shipping_fee: number;
  discount_total: number;
  total_amount: number;
  coupon_code: string | null;
  shipping_method: string;
  shipping_address: AddressJson;
  shipping_phone: string | null;
  pickup_point_provider: string | null;
  pickup_point_id: string | null;
  pickup_point_label: string | null;
  billing_address: AddressJson;
  notes: string | null;
  barion_payment_id: string | null;
  barion_payment_request_id: string | null;
  barion_status: string | null;
  invoice_provider: string | null;
  invoice_number: string | null;
  invoice_url: string | null;
  created_at: Timestamptz;
  updated_at: Timestamptz;
  paid_at: Timestamptz | null;
  shipped_at: Timestamptz | null;
  idempotency_key: string | null;
};

export type OrderInsert = {
  id?: Uuid;
  user_id?: Uuid | null;
  email: string;
  status?: OrderStatus;
  currency?: string;
  subtotal_amount: number;
  shipping_fee: number;
  discount_total?: number;
  total_amount: number;
  coupon_code?: string | null;
  shipping_method?: string;
  shipping_address: AddressJson;
  shipping_phone?: string | null;
  pickup_point_provider?: string | null;
  pickup_point_id?: string | null;
  pickup_point_label?: string | null;
  billing_address: AddressJson;
  notes?: string | null;
  barion_payment_id?: string | null;
  barion_payment_request_id?: string | null;
  barion_status?: string | null;
  invoice_provider?: string | null;
  invoice_number?: string | null;
  invoice_url?: string | null;
  created_at?: Timestamptz;
  updated_at?: Timestamptz;
  paid_at?: Timestamptz | null;
  shipped_at?: Timestamptz | null;
  idempotency_key?: string | null;
};

export type OrderUpdate = {
  id?: Uuid;
  user_id?: Uuid | null;
  email?: string;
  status?: OrderStatus;
  currency?: string;
  subtotal_amount?: number;
  shipping_fee?: number;
  discount_total?: number;
  total_amount?: number;
  coupon_code?: string | null;
  shipping_method?: string;
  shipping_address?: AddressJson;
  shipping_phone?: string | null;
  pickup_point_provider?: string | null;
  pickup_point_id?: string | null;
  pickup_point_label?: string | null;
  billing_address?: AddressJson;
  notes?: string | null;
  barion_payment_id?: string | null;
  barion_payment_request_id?: string | null;
  barion_status?: string | null;
  invoice_provider?: string | null;
  invoice_number?: string | null;
  invoice_url?: string | null;
  created_at?: Timestamptz;
  updated_at?: Timestamptz;
  paid_at?: Timestamptz | null;
  shipped_at?: Timestamptz | null;
  idempotency_key?: string | null;
};

/* ---------- order_items ---------- */
export type OrderItemRow = {
  id: Uuid;
  order_id: Uuid;
  product_id: Uuid;
  variant_id: Uuid | null;
  title_snapshot: string;
  variant_snapshot: VariantSnapshotJson;
  unit_price_snapshot: number;
  quantity: number;
  line_total: number;
};

export type OrderItemInsert = {
  id?: Uuid;
  order_id: Uuid;
  product_id: Uuid;
  variant_id?: Uuid | null;
  title_snapshot: string;
  variant_snapshot?: VariantSnapshotJson;
  unit_price_snapshot: number;
  quantity: number;
  line_total: number;
};

export type OrderItemUpdate = {
  id?: Uuid;
  order_id?: Uuid;
  product_id?: Uuid;
  variant_id?: Uuid | null;
  title_snapshot?: string;
  variant_snapshot?: VariantSnapshotJson;
  unit_price_snapshot?: number;
  quantity?: number;
  line_total?: number;
};

/* ---------- subscribers ---------- */
export type SubscriberRow = {
  id: Uuid;
  email: string;
  status: SubscriberStatus;
  tags: string[];
  source: string | null;
  created_at: Timestamptz;
  unsubscribed_at: Timestamptz | null;
};

export type SubscriberInsert = {
  id?: Uuid;
  email: string;
  status?: SubscriberStatus;
  tags?: string[];
  source?: string | null;
  created_at?: Timestamptz;
  unsubscribed_at?: Timestamptz | null;
};

export type SubscriberUpdate = {
  id?: Uuid;
  email?: string;
  status?: SubscriberStatus;
  tags?: string[];
  source?: string | null;
  created_at?: Timestamptz;
  unsubscribed_at?: Timestamptz | null;
};

/* ---------- audit_logs ---------- */
export type AuditLogRow = {
  id: Uuid;
  actor_id: Uuid | null;
  actor_role: AppRole | null;
  action: string;
  entity_type: string;
  entity_id: Uuid | null;
  metadata: Record<string, unknown>;
  created_at: Timestamptz;
};

export type AuditLogInsert = {
  id?: Uuid;
  actor_id?: Uuid | null;
  actor_role?: AppRole | null;
  action: string;
  entity_type: string;
  entity_id?: Uuid | null;
  metadata?: Record<string, unknown>;
  created_at?: Timestamptz;
};

export type AuditLogUpdate = {
  id?: Uuid;
  actor_id?: Uuid | null;
  actor_role?: AppRole | null;
  action?: string;
  entity_type?: string;
  entity_id?: Uuid | null;
  metadata?: Record<string, unknown>;
  created_at?: Timestamptz;
};

// ── Database type (Supabase client generic) ────────────────────────

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: ProfileRow;
        Insert: ProfileInsert;
        Update: ProfileUpdate;
        Relationships: [
          {
            foreignKeyName: "profiles_id_fkey";
            columns: ["id"];
            isOneToOne: true;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      categories: {
        Row: CategoryRow;
        Insert: CategoryInsert;
        Update: CategoryUpdate;
        Relationships: [
          {
            foreignKeyName: "categories_parent_id_fkey";
            columns: ["parent_id"];
            isOneToOne: false;
            referencedRelation: "categories";
            referencedColumns: ["id"];
          },
        ];
      };
      products: {
        Row: ProductRow;
        Insert: ProductInsert;
        Update: ProductUpdate;
        Relationships: [];
      };
      product_variants: {
        Row: ProductVariantRow;
        Insert: ProductVariantInsert;
        Update: ProductVariantUpdate;
        Relationships: [
          {
            foreignKeyName: "product_variants_product_id_fkey";
            columns: ["product_id"];
            isOneToOne: false;
            referencedRelation: "products";
            referencedColumns: ["id"];
          },
        ];
      };
      product_categories: {
        Row: ProductCategoryRow;
        Insert: ProductCategoryInsert;
        Update: ProductCategoryUpdate;
        Relationships: [
          {
            foreignKeyName: "product_categories_product_id_fkey";
            columns: ["product_id"];
            isOneToOne: false;
            referencedRelation: "products";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "product_categories_category_id_fkey";
            columns: ["category_id"];
            isOneToOne: false;
            referencedRelation: "categories";
            referencedColumns: ["id"];
          },
        ];
      };
      coupons: {
        Row: CouponRow;
        Insert: CouponInsert;
        Update: CouponUpdate;
        Relationships: [];
      };
      orders: {
        Row: OrderRow;
        Insert: OrderInsert;
        Update: OrderUpdate;
        Relationships: [
          {
            foreignKeyName: "orders_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      order_items: {
        Row: OrderItemRow;
        Insert: OrderItemInsert;
        Update: OrderItemUpdate;
        Relationships: [
          {
            foreignKeyName: "order_items_order_id_fkey";
            columns: ["order_id"];
            isOneToOne: false;
            referencedRelation: "orders";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "order_items_product_id_fkey";
            columns: ["product_id"];
            isOneToOne: false;
            referencedRelation: "products";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "order_items_variant_id_fkey";
            columns: ["variant_id"];
            isOneToOne: false;
            referencedRelation: "product_variants";
            referencedColumns: ["id"];
          },
        ];
      };
      subscribers: {
        Row: SubscriberRow;
        Insert: SubscriberInsert;
        Update: SubscriberUpdate;
        Relationships: [];
      };
      audit_logs: {
        Row: AuditLogRow;
        Insert: AuditLogInsert;
        Update: AuditLogUpdate;
        Relationships: [
          {
            foreignKeyName: "audit_logs_actor_id_fkey";
            columns: ["actor_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      [_ in never]: never;
    };
    Enums: {
      app_role: AppRole;
      order_status: OrderStatus;
      subscriber_status: SubscriberStatus;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};
