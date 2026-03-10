"use server";

/* ------------------------------------------------------------------ */
/*  Order server actions                                               */
/* ------------------------------------------------------------------ */

import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAuth, requireAdmin, requireAdminOrViewer, getCurrentUser } from "@/lib/security/roles";
import { logAudit } from "@/lib/security/logger";
import { checkoutSchema } from "@/lib/validators/checkout";
import { uuidSchema } from "@/lib/validators/uuid";
import { siteConfig } from "@/lib/config/site.config";
import { getHooks } from "@/lib/config/hooks";
import { calculateShippingFee } from "@/lib/utils/shipping";
import type { CartItem, CheckoutFormData } from "@/lib/types";
import type {
  OrderRow,
  OrderItemRow,
  OrderStatus,
  AddressJson,
  OrderItemInsert,
} from "@/lib/types/database";

// ── Types ──────────────────────────────────────────────────────────

interface ActionResult<T = undefined> {
  success: boolean;
  data?: T;
  error?: string;
}

interface OrderWithItems extends OrderRow {
  order_items: OrderItemRow[];
}

interface AdminOrderListData {
  orders: OrderRow[];
  total: number;
  page: number;
  totalPages: number;
}

interface AdminOrderFilters {
  status?: string;
  search?: string;
  page?: number;
  perPage?: number;
  dateFrom?: string;
  dateTo?: string;
}

// ── Validation schemas ─────────────────────────────────────────────

const cartItemSchema = z.object({
  productId: uuidSchema,
  variantId: uuidSchema.nullable(),
  title: z.string(),
  variantLabel: z.string(),
  price: z.number().int().min(0),
  quantity: z.number().int().min(1),
  image: z.string().nullable(),
  slug: z.string(),
  stock: z.number().int().min(0),
});

const createOrderInputSchema = z.object({
  items: z.array(cartItemSchema).min(1, "A kosár nem lehet üres."),
  checkout: checkoutSchema,
});

const adminFiltersSchema = z.object({
  status: z.string().optional(),
  search: z.string().optional(),
  page: z.number().int().min(1).optional(),
  perPage: z.number().int().min(1).max(100).optional(),
  dateFrom: z.string().optional(),
  dateTo: z.string().optional(),
});

const orderStatusSchema = z.enum([
  "draft",
  "awaiting_payment",
  "paid",
  "processing",
  "shipped",
  "cancelled",
  "refunded",
]);

// ── Main checkout action ───────────────────────────────────────────

export async function createOrderFromCart(input: {
  items: CartItem[];
  checkout: CheckoutFormData;
}): Promise<ActionResult<{ orderId: string }>> {
  try {
    // Validate input structure
    // We do a manual mapping since CheckoutFormData and checkoutSchema
    // have different shapes (the schema uses nested contact/homeDelivery/pickupPoint)
    const checkoutForValidation = {
      contact: {
        email: input.checkout.email,
        phone: input.checkout.phone,
      },
      shippingMethod: input.checkout.shippingMethod,
      homeDelivery:
        input.checkout.shippingMethod === "home"
          ? {
              carrier: input.checkout.carrier,
              address: input.checkout.shippingAddress,
              phone: input.checkout.phone,
            }
          : undefined,
      pickupPoint:
        input.checkout.shippingMethod === "pickup"
          ? {
              provider: input.checkout.pickupPointProvider,
              pointId: input.checkout.pickupPointId,
              pointLabel: input.checkout.pickupPointLabel,
              phone: input.checkout.phone,
            }
          : undefined,
      billingAddress: input.checkout.billingAddress,
      sameAsBilling: input.checkout.sameAsBilling,
      notes: input.checkout.notes || undefined,
      couponCode: input.checkout.couponCode || undefined,
    };

    const itemsParsed = z
      .array(cartItemSchema)
      .min(1)
      .safeParse(input.items);
    if (!itemsParsed.success) {
      return { success: false, error: "Érvénytelen kosár adatok." };
    }

    // Get current user (may be null for guest checkout)
    const user = await getCurrentUser();

    if (!user && !siteConfig.features.enableGuestCheckout) {
      return {
        success: false,
        error: "Vendég fizetés nem engedélyezett. Kérjük, jelentkezzen be.",
      };
    }

    const admin = createAdminClient();
    const cartItems = itemsParsed.data;

    // ── Step 1: Validate cart against DB ────────────────────────────
    const productIds = [...new Set(cartItems.map((item) => item.productId))];
    const variantIds = cartItems
      .map((item) => item.variantId)
      .filter((id): id is string => id !== null);

    const [productsResult, variantsResult] = await Promise.all([
      admin
        .from("products")
        .select("*")
        .in("id", productIds)
        .eq("is_active", true),
      variantIds.length > 0
        ? admin
            .from("product_variants")
            .select("*")
            .in("id", variantIds)
            .eq("is_active", true)
        : Promise.resolve({ data: [], error: null }),
    ]);

    if (productsResult.error) {
      return { success: false, error: "Hiba a termékek ellenőrzésekor." };
    }

    const productsMap = new Map(
      (productsResult.data ?? []).map((p) => [p.id, p]),
    );
    const variantsMap = new Map(
      (variantsResult.data ?? []).map((v) => [v.id, v]),
    );

    // Validate each item
    const orderItems: Array<{
      productId: string;
      variantId: string | null;
      titleSnapshot: string;
      variantSnapshot: Record<string, unknown>;
      unitPrice: number;
      quantity: number;
      lineTotal: number;
    }> = [];

    for (const item of cartItems) {
      const product = productsMap.get(item.productId);
      if (!product) {
        return {
          success: false,
          error: `A "${item.title}" termék már nem elérhető.`,
        };
      }

      let unitPrice = product.base_price;
      let variantSnapshot: Record<string, unknown> = {};

      if (item.variantId) {
        const variant = variantsMap.get(item.variantId);
        if (!variant) {
          return {
            success: false,
            error: `A "${item.title}" kiválasztott változata már nem elérhető.`,
          };
        }

        if (variant.stock_quantity < item.quantity) {
          return {
            success: false,
            error: `A "${item.title}" termékből csak ${variant.stock_quantity} db áll rendelkezésre.`,
          };
        }

        unitPrice = variant.price_override ?? product.base_price;
        variantSnapshot = {
          option1Name: variant.option1_name,
          option1Value: variant.option1_value,
          option2Name: variant.option2_name,
          option2Value: variant.option2_value,
          sku: variant.sku,
        };
      }

      orderItems.push({
        productId: product.id,
        variantId: item.variantId,
        titleSnapshot: product.title,
        variantSnapshot,
        unitPrice,
        quantity: item.quantity,
        lineTotal: unitPrice * item.quantity,
      });
    }

    // ── Step 2: Calculate totals ────────────────────────────────────
    const subtotal = orderItems.reduce((sum, item) => sum + item.lineTotal, 0);

    // Shipping fee
    const shippingFee = calculateShippingFee(
      input.checkout.shippingMethod,
      subtotal,
    );

    // Coupon discount
    let discountTotal = 0;
    let appliedCouponCode: string | null = null;

    if (input.checkout.couponCode && siteConfig.features.enableCoupons) {
      const { data: coupon } = await admin
        .from("coupons")
        .select("*")
        .eq("code", input.checkout.couponCode.toUpperCase())
        .eq("is_active", true)
        .single();

      if (coupon) {
        const now = new Date();
        const validFrom = coupon.valid_from
          ? new Date(coupon.valid_from)
          : null;
        const validUntil = coupon.valid_until
          ? new Date(coupon.valid_until)
          : null;

        const isValid =
          (!validFrom || validFrom <= now) &&
          (!validUntil || validUntil >= now) &&
          (coupon.max_uses === null || coupon.used_count < coupon.max_uses) &&
          (coupon.min_order_amount === null ||
            subtotal >= coupon.min_order_amount);

        if (isValid) {
          if (coupon.discount_type === "percentage") {
            discountTotal = Math.round((subtotal * coupon.value) / 100);
          } else {
            discountTotal = coupon.value;
          }
          discountTotal = Math.min(discountTotal, subtotal);
          appliedCouponCode = coupon.code;
        }
      }
    }

    const totalAmount = Math.max(
      0,
      subtotal + shippingFee - discountTotal,
    );

    // ── Step 3: Run preCheckoutHook ─────────────────────────────────
    const hooks = getHooks();

    const orderDraft = await hooks.preCheckoutHook({
      email: input.checkout.email,
      phone: input.checkout.phone,
      shippingMethod: input.checkout.shippingMethod,
      shippingAddress: input.checkout.shippingAddress as unknown as Record<string, unknown>,
      billingAddress: input.checkout.billingAddress as unknown as Record<string, unknown>,
      carrier: input.checkout.carrier,
      pickupPointProvider: input.checkout.pickupPointProvider,
      pickupPointId: input.checkout.pickupPointId,
      pickupPointLabel: input.checkout.pickupPointLabel,
      couponCode: appliedCouponCode,
      notes: input.checkout.notes || null,
      items: orderItems.map((item) => ({
        productId: item.productId,
        variantId: item.variantId,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
      })),
      subtotalAmount: subtotal,
      shippingFee,
      discountTotal,
      totalAmount,
    });

    // ── Step 4: Create order ────────────────────────────────────────
    const idempotencyKey = crypto.randomUUID();

    const shippingAddress: AddressJson =
      input.checkout.shippingMethod === "home"
        ? (input.checkout.shippingAddress as AddressJson)
        : { name: "", street: "", city: "", zip: "", country: "HU" };

    const billingAddress: AddressJson =
      input.checkout.billingAddress as AddressJson;

    const { data: order, error: orderError } = await admin
      .from("orders")
      .insert({
        user_id: user?.id ?? null,
        email: orderDraft.email,
        status: "awaiting_payment" as const,
        currency: "HUF",
        subtotal_amount: orderDraft.subtotalAmount,
        shipping_fee: orderDraft.shippingFee,
        discount_total: orderDraft.discountTotal,
        total_amount: orderDraft.totalAmount,
        coupon_code: orderDraft.couponCode,
        shipping_method: orderDraft.shippingMethod,
        shipping_address: shippingAddress,
        shipping_phone: orderDraft.phone,
        pickup_point_provider: orderDraft.pickupPointProvider,
        pickup_point_id: orderDraft.pickupPointId,
        pickup_point_label: orderDraft.pickupPointLabel,
        billing_address: billingAddress,
        notes: orderDraft.notes,
        idempotency_key: idempotencyKey,
      })
      .select("id")
      .single();

    if (orderError || !order) {
      console.error("[createOrderFromCart] Order insert error:", orderError?.message);
      return { success: false, error: "Hiba a rendelés létrehozásakor." };
    }

    // ── Step 5: Create order items ──────────────────────────────────
    const orderItemRows: OrderItemInsert[] = orderItems.map((item) => ({
      order_id: order.id,
      product_id: item.productId,
      variant_id: item.variantId,
      title_snapshot: item.titleSnapshot,
      variant_snapshot: item.variantSnapshot as Record<string, unknown>,
      unit_price_snapshot: item.unitPrice,
      quantity: item.quantity,
      line_total: item.lineTotal,
    }));

    const { error: itemsError } = await admin
      .from("order_items")
      .insert(orderItemRows);

    if (itemsError) {
      console.error("[createOrderFromCart] Items insert error:", itemsError.message);
      // Attempt to clean up the order
      await admin.from("orders").delete().eq("id", order.id);
      return {
        success: false,
        error: "Hiba a rendelési tételek létrehozásakor.",
      };
    }

    // ── Step 6: Decrement stock (idempotent — guarded by order creation) ──
    for (const item of orderItems) {
      if (item.variantId) {
        try {
          // Read current stock, then write decremented value.
          // The order's idempotency_key guards against duplicate decrements.
          const { data: variantRow } = await admin
            .from("product_variants")
            .select("stock_quantity")
            .eq("id", item.variantId)
            .single();

          if (variantRow && variantRow.stock_quantity >= item.quantity) {
            const { error: stockError } = await admin
              .from("product_variants")
              .update({
                stock_quantity: variantRow.stock_quantity - item.quantity,
                updated_at: new Date().toISOString(),
              })
              .eq("id", item.variantId);

            if (stockError) {
              console.error(
                `[createOrderFromCart] Stock decrement failed for variant ${item.variantId}:`,
                stockError.message,
              );
            }
          }
        } catch (stockErr) {
          // Stock decrement is best-effort — log but don't fail the order
          console.error(
            `[createOrderFromCart] Stock decrement error for variant ${item.variantId}:`,
            stockErr instanceof Error ? stockErr.message : String(stockErr),
          );
        }
      }
    }

    // Increment coupon usage
    if (appliedCouponCode) {
      const { data: coupon } = await admin
        .from("coupons")
        .select("used_count")
        .eq("code", appliedCouponCode)
        .single();

      if (coupon) {
        await admin
          .from("coupons")
          .update({ used_count: coupon.used_count + 1 })
          .eq("code", appliedCouponCode);
      }
    }

    return { success: true, data: { orderId: order.id } };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[createOrderFromCart] Unexpected error:", message);
    return { success: false, error: "Váratlan hiba történt a rendelés során." };
  }
}

// ── User order fetch ───────────────────────────────────────────────

export async function getOrderForUser(
  orderId: string,
): Promise<ActionResult<OrderWithItems>> {
  try {
    const idParsed = uuidSchema.safeParse(orderId);
    if (!idParsed.success) {
      return { success: false, error: "Érvénytelen rendelés azonosító." };
    }

    const user = await requireAuth();
    const supabase = await createClient();

    const { data: order, error } = await supabase
      .from("orders")
      .select("*")
      .eq("id", idParsed.data)
      .eq("user_id", user.id)
      .single();

    if (error || !order) {
      return { success: false, error: "A rendelés nem található." };
    }

    const { data: items } = await supabase
      .from("order_items")
      .select("*")
      .eq("order_id", order.id)
      .order("id", { ascending: true });

    const orderWithItems: OrderWithItems = {
      ...order,
      order_items: items ?? [],
    };

    return { success: true, data: orderWithItems };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[getOrderForUser] Unexpected error:", message);
    return { success: false, error: "Váratlan hiba történt." };
  }
}

// ── Admin actions ──────────────────────────────────────────────────

export async function adminListOrders(
  filters: AdminOrderFilters = {},
): Promise<ActionResult<AdminOrderListData>> {
  try {
    await requireAdminOrViewer();

    const parsed = adminFiltersSchema.safeParse(filters);
    if (!parsed.success) {
      return { success: false, error: "Érvénytelen szűrő paraméterek." };
    }

    const {
      status,
      search,
      page = 1,
      perPage = 20,
      dateFrom,
      dateTo,
    } = parsed.data;

    const admin = createAdminClient();

    let query = admin
      .from("orders")
      .select("*", { count: "exact" })
      .order("created_at", { ascending: false });

    if (status) {
      query = query.eq("status", status as OrderStatus);
    }

    if (search) {
      // Search by email or order ID — only include id.eq if search is a valid UUID
      const isUuid = uuidSchema.safeParse(search).success;
      if (isUuid) {
        query = query.or(`email.ilike.%${search}%,id.eq.${search}`);
      } else {
        query = query.ilike("email", `%${search}%`);
      }
    }

    if (dateFrom) {
      query = query.gte("created_at", dateFrom);
    }

    if (dateTo) {
      query = query.lte("created_at", dateTo);
    }

    const from = (page - 1) * perPage;
    const to = from + perPage - 1;
    query = query.range(from, to);

    const { data: orders, count, error } = await query;

    if (error) {
      console.error("[adminListOrders] DB error:", error.message);
      return { success: false, error: "Hiba a rendelések lekérésekor." };
    }

    const total = count ?? 0;

    return {
      success: true,
      data: {
        orders: orders ?? [],
        total,
        page,
        totalPages: Math.ceil(total / perPage),
      },
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[adminListOrders] Unexpected error:", message);
    return { success: false, error: "Váratlan hiba történt." };
  }
}

export async function adminGetOrder(
  orderId: string,
): Promise<ActionResult<OrderWithItems>> {
  try {
    await requireAdminOrViewer();

    const idParsed = uuidSchema.safeParse(orderId);
    if (!idParsed.success) {
      return { success: false, error: "Érvénytelen rendelés azonosító." };
    }

    const admin = createAdminClient();

    const { data: order, error } = await admin
      .from("orders")
      .select("*")
      .eq("id", idParsed.data)
      .single();

    if (error || !order) {
      return { success: false, error: "A rendelés nem található." };
    }

    const { data: items } = await admin
      .from("order_items")
      .select("*")
      .eq("order_id", order.id)
      .order("id", { ascending: true });

    const orderWithItems: OrderWithItems = {
      ...order,
      order_items: items ?? [],
    };

    return { success: true, data: orderWithItems };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[adminGetOrder] Unexpected error:", message);
    return { success: false, error: "Váratlan hiba történt." };
  }
}

export async function adminUpdateOrderStatus(
  orderId: string,
  status: OrderStatus,
  trackingCode?: string,
): Promise<ActionResult> {
  try {
    const profile = await requireAdmin();

    const idParsed = uuidSchema.safeParse(orderId);
    if (!idParsed.success) {
      return { success: false, error: "Érvénytelen rendelés azonosító." };
    }

    const statusParsed = orderStatusSchema.safeParse(status);
    if (!statusParsed.success) {
      return { success: false, error: "Érvénytelen státusz." };
    }

    const admin = createAdminClient();

    // Fetch current order to validate state transitions
    const { data: currentOrder } = await admin
      .from("orders")
      .select("status")
      .eq("id", idParsed.data)
      .single();

    if (!currentOrder) {
      return { success: false, error: "A rendelés nem található." };
    }

    // Build update payload
    const updatePayload: Record<string, unknown> = {
      status: statusParsed.data,
      updated_at: new Date().toISOString(),
    };

    if (statusParsed.data === "paid") {
      updatePayload.paid_at = new Date().toISOString();
    }

    if (statusParsed.data === "shipped") {
      updatePayload.shipped_at = new Date().toISOString();
    }

    if (trackingCode) {
      updatePayload.notes = trackingCode;
    }

    const { error } = await admin
      .from("orders")
      .update(updatePayload)
      .eq("id", idParsed.data);

    if (error) {
      console.error("[adminUpdateOrderStatus] Update error:", error.message);
      return { success: false, error: "Hiba a rendelés frissítésekor." };
    }

    // Run postPaidHook if status changed to paid
    if (statusParsed.data === "paid") {
      const { data: fullOrder } = await admin
        .from("orders")
        .select("*")
        .eq("id", idParsed.data)
        .single();

      if (fullOrder) {
        const hooks = getHooks();
        try {
          await hooks.postPaidHook(fullOrder);
        } catch (hookErr) {
          console.error(
            "[adminUpdateOrderStatus] postPaidHook error:",
            hookErr instanceof Error ? hookErr.message : String(hookErr),
          );
        }
      }
    }

    await logAudit({
      actorId: profile.id,
      actorRole: profile.role,
      action: "order.status_update",
      entityType: "order",
      entityId: idParsed.data,
      metadata: {
        previousStatus: currentOrder.status,
        newStatus: statusParsed.data,
        trackingCode: trackingCode ?? null,
      },
    });

    return { success: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[adminUpdateOrderStatus] Unexpected error:", message);
    return { success: false, error: "Váratlan hiba történt." };
  }
}
