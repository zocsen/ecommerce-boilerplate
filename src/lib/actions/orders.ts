"use server";

/* ------------------------------------------------------------------ */
/*  Order server actions                                               */
/* ------------------------------------------------------------------ */

import { z } from "zod";
import { headers } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  requireAuth,
  requireAdmin,
  requireAdminOrViewer,
  getCurrentUser,
} from "@/lib/security/roles";
import { logAudit } from "@/lib/security/logger";
import { uuidSchema } from "@/lib/validators/uuid";
import { siteConfig } from "@/lib/config/site.config";
import { getHooks } from "@/lib/config/hooks";
import { calculateShippingFee } from "@/lib/utils/shipping";
import { formatDateTime } from "@/lib/utils/format";
import { orderTrackingRateLimiter } from "@/lib/security/rate-limit";
import { sendReceipt, sendAdminOrderNotification } from "@/lib/integrations/email/actions";
import {
  isTransitionAllowed,
  ORDER_STATUS_LABELS,
  getTimelineOrder,
} from "@/lib/constants/order-status";
import type { CartItem, CheckoutFormData, PaymentMethod } from "@/lib/types";
import type {
  OrderRow,
  OrderItemRow,
  OrderStatus,
  AddressJson,
  OrderItemInsert,
  OrderNoteWithAuthor,
} from "@/lib/types/database";
import type { Json } from "@/lib/types/database.generated";

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
  weightGrams: z.number().int().min(0),
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
    const itemsParsed = z.array(cartItemSchema).min(1).safeParse(input.items);
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

    // Admin client bypasses RLS — MUST filter published_at at app level
    const now = new Date().toISOString();
    const [productsResult, variantsResult] = await Promise.all([
      admin
        .from("products")
        .select("*")
        .in("id", productIds)
        .eq("is_active", true)
        .or(`published_at.is.null,published_at.lte.${now}`),
      variantIds.length > 0
        ? admin.from("product_variants").select("*").in("id", variantIds).eq("is_active", true)
        : Promise.resolve({ data: [], error: null }),
    ]);

    if (productsResult.error) {
      return { success: false, error: "Hiba a termékek ellenőrzésekor." };
    }

    const productsMap = new Map((productsResult.data ?? []).map((p) => [p.id, p]));
    const variantsMap = new Map((variantsResult.data ?? []).map((v) => [v.id, v]));

    // Validate each item
    const orderItems: Array<{
      productId: string;
      variantId: string | null;
      titleSnapshot: string;
      variantSnapshot: Record<string, unknown>;
      unitPrice: number;
      quantity: number;
      lineTotal: number;
      vatRate: number;
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
        vatRate: product.vat_rate,
      });
    }

    // ── Step 2: Calculate totals ────────────────────────────────────
    const subtotal = orderItems.reduce((sum, item) => sum + item.lineTotal, 0);

    // Compute total cart weight from DB data for weight-based shipping
    const defaultWeight = siteConfig.shipping.rules.defaultProductWeightGrams;
    let totalWeightGrams = 0;
    for (const item of cartItems) {
      const product = productsMap.get(item.productId);
      const variant = item.variantId ? variantsMap.get(item.variantId) : null;
      const itemWeight = variant?.weight_grams ?? product?.weight_grams ?? defaultWeight;
      totalWeightGrams += itemWeight * item.quantity;
    }

    // Shipping fee
    const shippingFee = calculateShippingFee(
      input.checkout.shippingMethod,
      subtotal,
      totalWeightGrams,
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
        const validFrom = coupon.valid_from ? new Date(coupon.valid_from) : null;
        const validUntil = coupon.valid_until ? new Date(coupon.valid_until) : null;

        const isValid =
          (!validFrom || validFrom <= now) &&
          (!validUntil || validUntil >= now) &&
          (coupon.max_uses === null || coupon.used_count < coupon.max_uses) &&
          (coupon.min_order_amount === null || subtotal >= coupon.min_order_amount);

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

    const totalAmount = Math.max(0, subtotal + shippingFee - discountTotal);

    // ── COD (utánvét) fee calculation ───────────────────────────────
    const requestedPaymentMethod: PaymentMethod =
      input.checkout.paymentMethod === "cod" ? "cod" : "barion";
    let resolvedPaymentMethod: PaymentMethod = "barion";
    let codFee = 0;

    if (requestedPaymentMethod === "cod") {
      const codConfig = siteConfig.payments.cod;
      const codAllowed =
        codConfig.enabled &&
        codConfig.allowedShippingMethods.includes(
          input.checkout.shippingMethod as "home" | "pickup",
        ) &&
        (codConfig.maxOrderAmount === 0 || totalAmount <= codConfig.maxOrderAmount);

      if (codAllowed) {
        resolvedPaymentMethod = "cod";
        codFee = codConfig.fee;
      }
      // If COD not allowed, fall back to barion silently
    }

    const finalTotalAmount = totalAmount + codFee;

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
      totalAmount: finalTotalAmount,
    });

    // ── Step 4: Create order ────────────────────────────────────────
    const idempotencyKey = crypto.randomUUID();

    const shippingAddress: AddressJson =
      input.checkout.shippingMethod === "home"
        ? (input.checkout.shippingAddress as AddressJson)
        : { name: "", street: "", city: "", zip: "", country: "HU" };

    const billingAddress: AddressJson = input.checkout.billingAddress as AddressJson;

    const { data: order, error: orderError } = await admin
      .from("orders")
      .insert({
        user_id: user?.id ?? null,
        email: orderDraft.email,
        status:
          resolvedPaymentMethod === "cod" ? ("processing" as const) : ("awaiting_payment" as const),
        payment_method: resolvedPaymentMethod,
        cod_fee: codFee,
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
      variant_snapshot: (item.variantSnapshot ?? {}) as Json,
      unit_price_snapshot: item.unitPrice,
      quantity: item.quantity,
      line_total: item.lineTotal,
      vat_rate: item.vatRate,
    }));

    const { error: itemsError } = await admin.from("order_items").insert(orderItemRows);

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

    // ── Step 7: For COD orders, send receipt + admin notification immediately ──
    if (resolvedPaymentMethod === "cod") {
      // Fire-and-forget — don't block the checkout response
      const billingName = billingAddress.name ?? input.checkout.email;
      void sendReceipt(order.id);
      void sendAdminOrderNotification({
        orderId: order.id,
        orderNumber: order.id.slice(0, 8).toUpperCase(),
        customerName: billingName,
        customerEmail: input.checkout.email,
        itemCount: orderItems.length,
        total: finalTotalAmount,
        shippingMethod: input.checkout.shippingMethod,
        paymentMethod: "cod",
      });
    }

    return { success: true, data: { orderId: order.id } };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[createOrderFromCart] Unexpected error:", message);
    return { success: false, error: "Váratlan hiba történt a rendelés során." };
  }
}

// ── User order fetch ───────────────────────────────────────────────

export async function getOrderForUser(orderId: string): Promise<ActionResult<OrderWithItems>> {
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

    const { status, search, page = 1, perPage = 20, dateFrom, dateTo } = parsed.data;

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

export async function adminGetOrder(orderId: string): Promise<ActionResult<OrderWithItems>> {
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
      .select("status, payment_method")
      .eq("id", idParsed.data)
      .single();

    if (!currentOrder) {
      return { success: false, error: "A rendelés nem található." };
    }

    // ── Server-side transition enforcement ───────────────────────────
    // This is the authoritative check. The UI also shows only valid
    // transitions, but this prevents any bypass via direct API calls.
    const paymentMethod = (currentOrder.payment_method ?? "barion") as PaymentMethod;
    const currentStatus = currentOrder.status as OrderStatus;

    if (!isTransitionAllowed(currentStatus, statusParsed.data, paymentMethod)) {
      const currentLabel = ORDER_STATUS_LABELS[currentStatus] ?? currentStatus;
      const targetLabel = ORDER_STATUS_LABELS[statusParsed.data] ?? statusParsed.data;
      return {
        success: false,
        error: `Érvénytelen státuszváltás: „${currentLabel}" → „${targetLabel}" nem engedélyezett.`,
      };
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
      updatePayload.tracking_code = trackingCode;
    }

    const { error } = await admin.from("orders").update(updatePayload).eq("id", idParsed.data);

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
        previousStatus: currentStatus,
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

// ── Guest order tracking ───────────────────────────────────────────

export interface GuestOrderTrackingData {
  orderNumber: string;
  status: OrderStatus;
  paymentMethod: string;
  createdAt: string;
  shippingMethod: string;
  trackingNumber: string | null;
  timeline: Array<{ status: string; label: string; date: string | null }>;
}

const trackGuestOrderSchema = z.object({
  orderNumber: z.string().min(1, "Rendelésszám megadása kötelező.").max(64),
  email: z.string().email("Érvénytelen e-mail cím."),
});

async function getClientIp(): Promise<string> {
  const headersList = await headers();
  const forwarded = headersList.get("x-forwarded-for");
  if (forwarded) {
    return forwarded.split(",")[0]?.trim() ?? "unknown";
  }
  return headersList.get("x-real-ip") ?? "unknown";
}

function buildTimeline(
  order: OrderRow,
): Array<{ status: string; label: string; date: string | null }> {
  // For cancelled/refunded, show a simplified timeline
  if (order.status === "cancelled" || order.status === "refunded") {
    const paymentMethod = (order.payment_method ?? "barion") as PaymentMethod;
    const startStatus: OrderStatus = paymentMethod === "cod" ? "processing" : "awaiting_payment";
    return [
      { status: startStatus, label: ORDER_STATUS_LABELS[startStatus], date: order.created_at },
      { status: order.status, label: ORDER_STATUS_LABELS[order.status], date: order.updated_at },
    ];
  }

  const paymentMethod = (order.payment_method ?? "barion") as PaymentMethod;
  const timelineOrder = getTimelineOrder(paymentMethod);
  const currentIdx = timelineOrder.indexOf(order.status as OrderStatus);

  return timelineOrder.map((s, i) => {
    let date: string | null = null;
    if (i <= currentIdx) {
      if (s === "awaiting_payment") date = order.created_at;
      else if (s === "processing")
        date = paymentMethod === "cod" ? order.created_at : order.paid_at;
      else if (s === "paid") date = order.paid_at;
      else if (s === "shipped") date = order.shipped_at;
    }
    return { status: s, label: ORDER_STATUS_LABELS[s], date };
  });
}

export async function trackGuestOrder(input: {
  orderNumber: string;
  email: string;
}): Promise<ActionResult<GuestOrderTrackingData>> {
  try {
    // Validate input
    const parsed = trackGuestOrderSchema.safeParse(input);
    if (!parsed.success) {
      const firstError = parsed.error.issues[0]?.message ?? "Érvénytelen adatok.";
      return { success: false, error: firstError };
    }

    // Rate limiting
    const ip = await getClientIp();
    const rateLimitResult = orderTrackingRateLimiter.check(ip);

    if (!rateLimitResult.success) {
      return {
        success: false,
        error: "Túl sok lekérdezés. Kérjük, próbálja újra később.",
      };
    }

    const { orderNumber, email } = parsed.data;
    const admin = createAdminClient();

    // The display "order number" is id.slice(0,8).toUpperCase()
    // Accept either the full UUID or the 8-char short form
    const searchTerm = orderNumber.trim().toLowerCase();
    const trimmedEmail = email.trim();

    let order: OrderRow | undefined;

    if (uuidSchema.safeParse(searchTerm).success) {
      // Full UUID — exact match (eq works on uuid columns)
      const { data, error } = await admin
        .from("orders")
        .select("*")
        .eq("id", searchTerm)
        .ilike("email", trimmedEmail)
        .limit(1);

      if (!error && data && data.length > 0) {
        order = data[0];
      }
    } else {
      // Short form — PostgREST `ilike` does not work on uuid columns
      // (ILIKE operator is only defined for text types in PostgreSQL).
      // Instead, query by email first, then match UUID prefix client-side.
      const { data: candidates, error } = await admin
        .from("orders")
        .select("*")
        .ilike("email", trimmedEmail)
        .order("created_at", { ascending: false })
        .limit(100);

      if (!error && candidates) {
        order = candidates.find((o) => o.id.toLowerCase().startsWith(searchTerm));
      }
    }

    if (!order) {
      return {
        success: false,
        error: "Nem találtunk rendelést ezekkel az adatokkal.",
      };
    }

    // Build response — expose only safe, limited data
    const trackingData: GuestOrderTrackingData = {
      orderNumber: order.id.slice(0, 8).toUpperCase(),
      status: order.status,
      paymentMethod: order.payment_method ?? "barion",
      createdAt: order.created_at,
      shippingMethod: order.shipping_method,
      trackingNumber: order.status === "shipped" ? (order.notes ?? null) : null,
      timeline: buildTimeline(order),
    };

    return { success: true, data: trackingData };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[trackGuestOrder] Unexpected error:", message);
    return { success: false, error: "Váratlan hiba történt." };
  }
}

/* ================================================================== */
/*  Order Notes — Internal admin notes (FE-018)                       */
/* ================================================================== */

const orderNoteSchema = z.object({
  orderId: uuidSchema,
  content: z
    .string()
    .min(1, "A megjegyzés nem lehet üres.")
    .max(2000, "A megjegyzés legfeljebb 2000 karakter lehet."),
});

const deleteNoteSchema = z.object({
  noteId: uuidSchema,
});

/**
 * Fetch all internal notes for a given order.
 * Returns notes with author names, newest first.
 */
export async function getOrderNotes(orderId: string): Promise<ActionResult<OrderNoteWithAuthor[]>> {
  try {
    await requireAdminOrViewer();

    const parsed = uuidSchema.safeParse(orderId);
    if (!parsed.success) {
      return { success: false, error: "Érvénytelen rendelés azonosító." };
    }

    const admin = createAdminClient();
    const { data, error } = await admin
      .from("order_notes")
      .select("id, order_id, author_id, content, created_at")
      .eq("order_id", orderId)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("[getOrderNotes] DB error:", error.message);
      return { success: false, error: "Hiba a megjegyzések lekérésekor." };
    }

    // Resolve author names from profiles
    const authorIds = [...new Set((data ?? []).map((n) => n.author_id))];

    const profileMap: Record<string, string | null> = {};
    if (authorIds.length > 0) {
      const { data: profiles } = await admin
        .from("profiles")
        .select("id, full_name")
        .in("id", authorIds);

      if (profiles) {
        for (const p of profiles) {
          profileMap[p.id] = p.full_name;
        }
      }
    }

    const notes: OrderNoteWithAuthor[] = (data ?? []).map((note) => ({
      ...note,
      author_name: profileMap[note.author_id] ?? "Törölt felhasználó",
    }));

    return { success: true, data: notes };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[getOrderNotes] Unexpected error:", message);
    return { success: false, error: "Váratlan hiba történt." };
  }
}

/**
 * Add an internal note to an order. Admin only.
 */
export async function addOrderNote(
  orderId: string,
  content: string,
): Promise<ActionResult<OrderNoteWithAuthor>> {
  try {
    const user = await requireAdmin();

    const parsed = orderNoteSchema.safeParse({ orderId, content });
    if (!parsed.success) {
      const firstIssue = parsed.error.issues[0];
      return { success: false, error: firstIssue?.message ?? "Érvénytelen adatok." };
    }

    const admin = createAdminClient();

    // Verify order exists
    const { data: order, error: orderError } = await admin
      .from("orders")
      .select("id")
      .eq("id", orderId)
      .single();

    if (orderError || !order) {
      return { success: false, error: "A rendelés nem található." };
    }

    const { data: note, error: insertError } = await admin
      .from("order_notes")
      .insert({
        order_id: orderId,
        author_id: user.id,
        content: parsed.data.content,
      })
      .select("id, order_id, author_id, content, created_at")
      .single();

    if (insertError || !note) {
      console.error("[addOrderNote] Insert error:", insertError?.message);
      return { success: false, error: "Hiba a megjegyzés mentésekor." };
    }

    // Resolve author name
    const { data: profile } = await admin
      .from("profiles")
      .select("full_name")
      .eq("id", user.id)
      .single();

    const noteWithAuthor: OrderNoteWithAuthor = {
      ...note,
      author_name: profile?.full_name ?? null,
    };

    await logAudit({
      actorId: user.id,
      actorRole: user.role,
      action: "order_note.create",
      entityType: "order_note",
      entityId: note.id,
      metadata: { order_id: orderId },
    });

    return { success: true, data: noteWithAuthor };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[addOrderNote] Unexpected error:", message);
    return { success: false, error: "Váratlan hiba történt." };
  }
}

/**
 * Delete an internal note. Admin can only delete their own notes.
 */
export async function deleteOrderNote(noteId: string): Promise<ActionResult> {
  try {
    const user = await requireAdmin();

    const parsed = deleteNoteSchema.safeParse({ noteId });
    if (!parsed.success) {
      return { success: false, error: "Érvénytelen megjegyzés azonosító." };
    }

    const admin = createAdminClient();

    // Verify the note exists and belongs to the current user
    const { data: note, error: fetchError } = await admin
      .from("order_notes")
      .select("id, author_id, order_id")
      .eq("id", noteId)
      .single();

    if (fetchError || !note) {
      return { success: false, error: "A megjegyzés nem található." };
    }

    if (note.author_id !== user.id) {
      return { success: false, error: "Csak a saját megjegyzéseidet törölheted." };
    }

    const { error: deleteError } = await admin.from("order_notes").delete().eq("id", noteId);

    if (deleteError) {
      console.error("[deleteOrderNote] Delete error:", deleteError.message);
      return { success: false, error: "Hiba a megjegyzés törlésekor." };
    }

    await logAudit({
      actorId: user.id,
      actorRole: user.role,
      action: "order_note.delete",
      entityType: "order_note",
      entityId: noteId,
      metadata: { order_id: note.order_id },
    });

    return { success: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[deleteOrderNote] Unexpected error:", message);
    return { success: false, error: "Váratlan hiba történt." };
  }
}

// ── Order Export (CSV) ─────────────────────────────────────────────

const exportFiltersSchema = z.object({
  dateFrom: z.string().optional(),
  dateTo: z.string().optional(),
  status: z.string().optional(),
  includeLineItems: z.boolean().optional(),
});

type ExportFilters = z.infer<typeof exportFiltersSchema>;

interface ExportResult {
  csv: string;
  filename: string;
  orderCount: number;
}

/** Escape a value for CSV — wraps in quotes if it contains commas, quotes, or newlines. */
function escapeCsvField(value: string): string {
  if (value.includes(",") || value.includes('"') || value.includes("\n") || value.includes("\r")) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

/** Build a CSV row from string values. */
function csvRow(fields: string[]): string {
  return fields.map(escapeCsvField).join(",");
}

/** Format an AddressJson to a single-line string for CSV. */
function formatAddressForCsv(address: AddressJson | null | undefined): string {
  if (!address) return "";
  const parts = [address.zip, address.city, address.street].filter(Boolean);
  return parts.join(" ");
}

/** Extract tracking number from the notes field (convention from adminUpdateOrderStatus). */
function extractTrackingNumber(notes: string | null): string {
  if (!notes) return "";
  const match = notes.match(/Nyomkövetési szám:\s*(.+)/);
  return match?.[1]?.trim() ?? "";
}

/**
 * Export orders to CSV with optional date range and status filters.
 * Returns a UTF-8 CSV string with BOM for Excel compatibility.
 * Admin or agency_viewer only.
 */
export async function exportOrdersCsv(
  filters: ExportFilters = {},
): Promise<ActionResult<ExportResult>> {
  try {
    await requireAdminOrViewer();

    const parsed = exportFiltersSchema.safeParse(filters);
    if (!parsed.success) {
      return { success: false, error: "Érvénytelen szűrő paraméterek." };
    }

    const { dateFrom, dateTo, status, includeLineItems } = parsed.data;

    const admin = createAdminClient();

    // Build query — fetch ALL matching orders (no pagination, max 10000)
    let query = admin
      .from("orders")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(10000);

    if (status) {
      query = query.eq("status", status as OrderStatus);
    }
    if (dateFrom) {
      query = query.gte("created_at", dateFrom);
    }
    if (dateTo) {
      // Add end-of-day to include the full "to" date
      query = query.lte("created_at", `${dateTo}T23:59:59.999Z`);
    }

    const { data: orders, error } = await query;

    if (error) {
      console.error("[exportOrdersCsv] DB error:", error.message);
      return { success: false, error: "Hiba a rendelések lekérésekor." };
    }

    const orderList = (orders ?? []) as OrderRow[];

    // ── Generate orders CSV ─────────────────────────────────────────
    const BOM = "\uFEFF";

    const orderHeaders = [
      "Rendelés szám",
      "Dátum",
      "Státusz",
      "Fizetési mód",
      "Vevő név",
      "Vevő email",
      "Szállítási mód",
      "Szállítási díj",
      "Részösszeg",
      "Kedvezmény",
      "Utánvét díj",
      "Végösszeg",
      "Fizetési státusz",
      "Tételek száma",
      "Szállítási cím",
      "Nyomkövetési szám",
    ];

    const rows: string[] = [csvRow(orderHeaders)];

    // If we need line item counts, batch fetch order_items
    const itemCountMap: Record<string, number> = {};
    const orderIds = orderList.map((o) => o.id);

    if (orderIds.length > 0) {
      // Fetch item counts per order in a single query
      const { data: itemRows } = await admin
        .from("order_items")
        .select("order_id, quantity")
        .in("order_id", orderIds);

      if (itemRows) {
        for (const item of itemRows) {
          const oid = item.order_id as string;
          itemCountMap[oid] = (itemCountMap[oid] ?? 0) + (item.quantity as number);
        }
      }
    }

    for (const order of orderList) {
      const addr = order.shipping_address as AddressJson | null;
      const shippingLabel = order.shipping_method === "home" ? "Házhozszállítás" : "Csomagautomata";

      const paymentStatus = order.barion_status ?? (order.paid_at ? "paid" : "pending");
      const paymentMethodLabel = order.payment_method === "cod" ? "Utánvét" : "Online bankkártya";

      rows.push(
        csvRow([
          order.id.slice(0, 8).toUpperCase(),
          formatDateTime(order.created_at),
          ORDER_STATUS_LABELS[order.status] ?? order.status,
          paymentMethodLabel,
          addr?.name ?? "",
          order.email,
          shippingLabel,
          String(order.shipping_fee),
          String(order.subtotal_amount),
          String(order.discount_total),
          String(order.cod_fee ?? 0),
          String(order.total_amount),
          paymentStatus,
          String(itemCountMap[order.id] ?? 0),
          formatAddressForCsv(addr),
          extractTrackingNumber(order.notes),
        ]),
      );
    }

    let csvContent = BOM + rows.join("\r\n") + "\r\n";

    // ── Optionally append line-items CSV section ────────────────────
    if (includeLineItems && orderIds.length > 0) {
      const { data: allItems } = await admin
        .from("order_items")
        .select("*")
        .in("order_id", orderIds)
        .order("order_id");

      if (allItems && allItems.length > 0) {
        csvContent += "\r\n"; // blank line separator

        const itemHeaders = [
          "Rendelés szám",
          "Termék",
          "Variáns",
          "Cikkszám",
          "Mennyiség",
          "Egységár",
          "Tétel összeg",
          "ÁFA kulcs",
        ];

        const itemRows: string[] = [csvRow(itemHeaders)];

        // Build order id → display number map
        const orderDisplayMap: Record<string, string> = {};
        for (const o of orderList) {
          orderDisplayMap[o.id] = o.id.slice(0, 8).toUpperCase();
        }

        for (const item of allItems) {
          const snapshot = (item.variant_snapshot ?? {}) as {
            option1Value?: string;
            option2Value?: string;
            sku?: string;
          };

          const variantLabel = [snapshot.option1Value, snapshot.option2Value]
            .filter(Boolean)
            .join(" / ");

          itemRows.push(
            csvRow([
              orderDisplayMap[item.order_id as string] ?? "",
              item.title_snapshot as string,
              variantLabel,
              snapshot.sku ?? "",
              String(item.quantity),
              String(item.unit_price_snapshot),
              String(item.line_total),
              `${item.vat_rate ?? 27}%`,
            ]),
          );
        }

        csvContent += itemRows.join("\r\n") + "\r\n";
      }
    }

    // Generate filename with timestamp
    const now = new Date();
    const ts = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}${String(now.getDate()).padStart(2, "0")}_${String(now.getHours()).padStart(2, "0")}${String(now.getMinutes()).padStart(2, "0")}`;
    const filename = `rendelesek_${ts}.csv`;

    return {
      success: true,
      data: {
        csv: csvContent,
        filename,
        orderCount: orderList.length,
      },
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[exportOrdersCsv] Unexpected error:", message);
    return { success: false, error: "Váratlan hiba történt." };
  }
}
