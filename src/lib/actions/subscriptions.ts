"use server";

/* ------------------------------------------------------------------ */
/*  Subscription management server actions (FE-003)                    */
/*  Agency-owner actions require is_agency_owner flag +                 */
/*  enableAgencyMode config.                                           */
/*  Shop-owner actions use requireAdminOrViewer().                      */
/* ------------------------------------------------------------------ */

import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAgencyOwner, requireAdminOrViewer } from "@/lib/security/roles";
import { logAudit } from "@/lib/security/logger";
import { siteConfig } from "@/lib/config/site.config";
import {
  planCreateSchema,
  planUpdateSchema,
  subscriptionCreateSchema,
  subscriptionUpdateSchema,
  invoiceCreateSchema,
  invoiceUpdateSchema,
} from "@/lib/validators/subscription";
import { uuidSchema } from "@/lib/validators/uuid";
import type {
  ShopPlanRow,
  ShopSubscriptionRow,
  ShopSubscriptionWithPlan,
  SubscriptionInvoiceRow,
} from "@/lib/types/database";

// ── Types ──────────────────────────────────────────────────────────

interface ActionResult<T = undefined> {
  success: boolean;
  data?: T;
  error?: string;
}

// ── Agency mode guard ──────────────────────────────────────────────

const AGENCY_MODE_DISABLED_ERROR = "Az ügynökségi mód nincs engedélyezve.";

function isAgencyModeEnabled(): boolean {
  return siteConfig.admin.enableAgencyMode;
}

// ═══════════════════════════════════════════════════════════════════
//  PLAN ACTIONS
// ═══════════════════════════════════════════════════════════════════

/** List all active plans (any admin or viewer can read) */
export async function listPlans(): Promise<ActionResult<ShopPlanRow[]>> {
  try {
    await requireAdminOrViewer();
    const admin = createAdminClient();

    const { data, error } = await admin
      .from("shop_plans")
      .select("*")
      .order("sort_order", { ascending: true });

    if (error) {
      console.error("[listPlans] Error:", error.message);
      return { success: false, error: "Hiba a csomagok lekérésekor." };
    }

    return { success: true, data: data ?? [] };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[listPlans] Unexpected error:", message);
    return { success: false, error: "Váratlan hiba történt." };
  }
}

/** Get a single plan by ID */
export async function getPlan(id: string): Promise<ActionResult<ShopPlanRow>> {
  try {
    await requireAdminOrViewer();

    const idParsed = uuidSchema.safeParse(id);
    if (!idParsed.success) {
      return { success: false, error: "Érvénytelen csomag azonosító." };
    }

    const admin = createAdminClient();
    const { data, error } = await admin.from("shop_plans").select("*").eq("id", id).single();

    if (error || !data) {
      return { success: false, error: "A csomag nem található." };
    }

    return { success: true, data };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[getPlan] Unexpected error:", message);
    return { success: false, error: "Váratlan hiba történt." };
  }
}

/** Create a new plan (agency owner only) */
export async function adminCreatePlan(input: unknown): Promise<ActionResult<{ id: string }>> {
  try {
    if (!isAgencyModeEnabled()) {
      return { success: false, error: AGENCY_MODE_DISABLED_ERROR };
    }
    const profile = await requireAgencyOwner();

    const parsed = planCreateSchema.safeParse(input);
    if (!parsed.success) {
      const firstIssue = parsed.error.issues[0];
      return { success: false, error: firstIssue?.message ?? "Érvénytelen adatok." };
    }

    const data = parsed.data;
    const admin = createAdminClient();

    const { data: plan, error } = await admin
      .from("shop_plans")
      .insert({
        name: data.name,
        slug: data.slug,
        description: data.description ?? null,
        base_monthly_price: data.base_monthly_price,
        base_annual_price: data.base_annual_price,
        features: data.features,
        sort_order: data.sort_order ?? 0,
        is_active: data.is_active ?? true,
      })
      .select("id")
      .single();

    if (error || !plan) {
      if (error?.code === "23505") {
        return { success: false, error: "Ez a slug már foglalt." };
      }
      console.error("[adminCreatePlan] Insert error:", error?.message);
      return { success: false, error: "Hiba a csomag létrehozásakor." };
    }

    await logAudit({
      actorId: profile.id,
      actorRole: profile.role,
      action: "plan.create",
      entityType: "shop_plan",
      entityId: plan.id,
      metadata: { name: data.name, slug: data.slug },
    });

    return { success: true, data: { id: plan.id } };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[adminCreatePlan] Unexpected error:", message);
    return { success: false, error: "Váratlan hiba történt." };
  }
}

/** Update an existing plan (agency owner only) */
export async function adminUpdatePlan(
  id: string,
  input: unknown,
): Promise<ActionResult<{ id: string }>> {
  try {
    if (!isAgencyModeEnabled()) {
      return { success: false, error: AGENCY_MODE_DISABLED_ERROR };
    }
    const profile = await requireAgencyOwner();

    const idParsed = uuidSchema.safeParse(id);
    if (!idParsed.success) {
      return { success: false, error: "Érvénytelen csomag azonosító." };
    }

    const parsed = planUpdateSchema.safeParse(input);
    if (!parsed.success) {
      const firstIssue = parsed.error.issues[0];
      return { success: false, error: firstIssue?.message ?? "Érvénytelen adatok." };
    }

    const data = parsed.data;
    const admin = createAdminClient();

    const updatePayload: Record<string, unknown> = {};
    if (data.name !== undefined) updatePayload.name = data.name;
    if (data.slug !== undefined) updatePayload.slug = data.slug;
    if (data.description !== undefined) updatePayload.description = data.description;
    if (data.base_monthly_price !== undefined)
      updatePayload.base_monthly_price = data.base_monthly_price;
    if (data.base_annual_price !== undefined)
      updatePayload.base_annual_price = data.base_annual_price;
    if (data.features !== undefined) updatePayload.features = data.features;
    if (data.sort_order !== undefined) updatePayload.sort_order = data.sort_order;
    if (data.is_active !== undefined) updatePayload.is_active = data.is_active;

    const { data: plan, error } = await admin
      .from("shop_plans")
      .update(updatePayload)
      .eq("id", id)
      .select("id")
      .single();

    if (error || !plan) {
      if (error?.code === "23505") {
        return { success: false, error: "Ez a slug már foglalt." };
      }
      console.error("[adminUpdatePlan] Update error:", error?.message);
      return { success: false, error: "Hiba a csomag frissítésekor." };
    }

    await logAudit({
      actorId: profile.id,
      actorRole: profile.role,
      action: "plan.update",
      entityType: "shop_plan",
      entityId: plan.id,
      metadata: { changes: data },
    });

    return { success: true, data: { id: plan.id } };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[adminUpdatePlan] Unexpected error:", message);
    return { success: false, error: "Váratlan hiba történt." };
  }
}

// ═══════════════════════════════════════════════════════════════════
//  SHOP-OWNER SUBSCRIPTION ACTIONS
//  These use requireAdminOrViewer() — any admin can view their shop's
//  subscription. No agency mode check needed.
// ═══════════════════════════════════════════════════════════════════

/**
 * Get the current shop's subscription (by shop identifier from config).
 * Any admin or agency viewer can call this — it returns the first
 * active/trialing subscription for this shop, or null.
 */
export async function getMySubscription(): Promise<ActionResult<ShopSubscriptionWithPlan | null>> {
  try {
    await requireAdminOrViewer();
    const admin = createAdminClient();
    const shopId = siteConfig.subscription.defaultShopIdentifier;

    const { data, error } = await admin
      .from("shop_subscriptions")
      .select("*, plan:shop_plans(*)")
      .eq("shop_identifier", shopId)
      .in("status", ["active", "trialing", "past_due"])
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      console.error("[getMySubscription] Error:", error.message);
      return { success: false, error: "Hiba az előfizetés lekérésekor." };
    }

    return { success: true, data: (data as ShopSubscriptionWithPlan) ?? null };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[getMySubscription] Unexpected error:", message);
    return { success: false, error: "Váratlan hiba történt." };
  }
}

/**
 * Get invoices for the current shop's subscription.
 * Looks up the subscription by shop identifier, then fetches invoices.
 */
export async function getMyInvoices(): Promise<ActionResult<SubscriptionInvoiceRow[]>> {
  try {
    await requireAdminOrViewer();
    const admin = createAdminClient();
    const shopId = siteConfig.subscription.defaultShopIdentifier;

    // Find the shop's subscription first
    const { data: sub } = await admin
      .from("shop_subscriptions")
      .select("id")
      .eq("shop_identifier", shopId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!sub) {
      return { success: true, data: [] };
    }

    const { data, error } = await admin
      .from("subscription_invoices")
      .select("*")
      .eq("subscription_id", sub.id)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("[getMyInvoices] Error:", error.message);
      return { success: false, error: "Hiba a számlák lekérésekor." };
    }

    return { success: true, data: data ?? [] };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[getMyInvoices] Unexpected error:", message);
    return { success: false, error: "Váratlan hiba történt." };
  }
}

// ═══════════════════════════════════════════════════════════════════
//  SUBSCRIPTION ACTIONS (agency owner only)
// ═══════════════════════════════════════════════════════════════════

/** List all subscriptions with their plans (agency owner only) */
export async function listSubscriptions(): Promise<ActionResult<ShopSubscriptionWithPlan[]>> {
  try {
    if (!isAgencyModeEnabled()) {
      return { success: false, error: AGENCY_MODE_DISABLED_ERROR };
    }
    await requireAgencyOwner();
    const admin = createAdminClient();

    const { data, error } = await admin
      .from("shop_subscriptions")
      .select("*, plan:shop_plans(*)")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("[listSubscriptions] Error:", error.message);
      return { success: false, error: "Hiba az előfizetések lekérésekor." };
    }

    return { success: true, data: (data ?? []) as ShopSubscriptionWithPlan[] };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[listSubscriptions] Unexpected error:", message);
    return { success: false, error: "Váratlan hiba történt." };
  }
}

/** Get a single subscription with its plan (agency owner only) */
export async function getSubscription(id: string): Promise<ActionResult<ShopSubscriptionWithPlan>> {
  try {
    if (!isAgencyModeEnabled()) {
      return { success: false, error: AGENCY_MODE_DISABLED_ERROR };
    }
    await requireAgencyOwner();

    const idParsed = uuidSchema.safeParse(id);
    if (!idParsed.success) {
      return { success: false, error: "Érvénytelen előfizetés azonosító." };
    }

    const admin = createAdminClient();
    const { data, error } = await admin
      .from("shop_subscriptions")
      .select("*, plan:shop_plans(*)")
      .eq("id", id)
      .single();

    if (error || !data) {
      return { success: false, error: "Az előfizetés nem található." };
    }

    return { success: true, data: data as ShopSubscriptionWithPlan };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[getSubscription] Unexpected error:", message);
    return { success: false, error: "Váratlan hiba történt." };
  }
}

/** Create a new subscription for a client shop (agency owner only) */
export async function adminCreateSubscription(
  input: unknown,
): Promise<ActionResult<{ id: string }>> {
  try {
    if (!isAgencyModeEnabled()) {
      return { success: false, error: AGENCY_MODE_DISABLED_ERROR };
    }
    const profile = await requireAgencyOwner();

    const parsed = subscriptionCreateSchema.safeParse(input);
    if (!parsed.success) {
      const firstIssue = parsed.error.issues[0];
      return { success: false, error: firstIssue?.message ?? "Érvénytelen adatok." };
    }

    const data = parsed.data;
    const admin = createAdminClient();

    // Verify plan exists
    const { data: plan } = await admin
      .from("shop_plans")
      .select("id")
      .eq("id", data.plan_id)
      .single();

    if (!plan) {
      return { success: false, error: "A megadott csomag nem található." };
    }

    const { data: subscription, error } = await admin
      .from("shop_subscriptions")
      .insert({
        plan_id: data.plan_id,
        shop_identifier: data.shop_identifier,
        status: data.status ?? "active",
        billing_cycle: data.billing_cycle ?? "monthly",
        custom_monthly_price: data.custom_monthly_price ?? null,
        custom_annual_price: data.custom_annual_price ?? null,
        current_period_start: data.current_period_start ?? new Date().toISOString(),
        current_period_end:
          data.current_period_end ?? new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        trial_ends_at: data.trial_ends_at ?? null,
        feature_overrides: data.feature_overrides ?? {},
        notes: data.notes ?? null,
      })
      .select("id")
      .single();

    if (error || !subscription) {
      if (error?.code === "23505") {
        return { success: false, error: "Ez a bolt azonosító már rendelkezik előfizetéssel." };
      }
      console.error("[adminCreateSubscription] Insert error:", error?.message);
      return { success: false, error: "Hiba az előfizetés létrehozásakor." };
    }

    await logAudit({
      actorId: profile.id,
      actorRole: profile.role,
      action: "subscription.create",
      entityType: "shop_subscription",
      entityId: subscription.id,
      metadata: { shop_identifier: data.shop_identifier, plan_id: data.plan_id },
    });

    return { success: true, data: { id: subscription.id } };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[adminCreateSubscription] Unexpected error:", message);
    return { success: false, error: "Váratlan hiba történt." };
  }
}

/** Update a subscription (agency owner only) */
export async function adminUpdateSubscription(
  id: string,
  input: unknown,
): Promise<ActionResult<{ id: string }>> {
  try {
    if (!isAgencyModeEnabled()) {
      return { success: false, error: AGENCY_MODE_DISABLED_ERROR };
    }
    const profile = await requireAgencyOwner();

    const idParsed = uuidSchema.safeParse(id);
    if (!idParsed.success) {
      return { success: false, error: "Érvénytelen előfizetés azonosító." };
    }

    const parsed = subscriptionUpdateSchema.safeParse(input);
    if (!parsed.success) {
      const firstIssue = parsed.error.issues[0];
      return { success: false, error: firstIssue?.message ?? "Érvénytelen adatok." };
    }

    const data = parsed.data;
    const admin = createAdminClient();

    const updatePayload: Record<string, unknown> = {};
    if (data.plan_id !== undefined) updatePayload.plan_id = data.plan_id;
    if (data.shop_identifier !== undefined) updatePayload.shop_identifier = data.shop_identifier;
    if (data.status !== undefined) updatePayload.status = data.status;
    if (data.billing_cycle !== undefined) updatePayload.billing_cycle = data.billing_cycle;
    if (data.custom_monthly_price !== undefined)
      updatePayload.custom_monthly_price = data.custom_monthly_price;
    if (data.custom_annual_price !== undefined)
      updatePayload.custom_annual_price = data.custom_annual_price;
    if (data.current_period_start !== undefined)
      updatePayload.current_period_start = data.current_period_start;
    if (data.current_period_end !== undefined)
      updatePayload.current_period_end = data.current_period_end;
    if (data.trial_ends_at !== undefined) updatePayload.trial_ends_at = data.trial_ends_at;
    if (data.cancelled_at !== undefined) updatePayload.cancelled_at = data.cancelled_at;
    if (data.feature_overrides !== undefined)
      updatePayload.feature_overrides = data.feature_overrides;
    if (data.notes !== undefined) updatePayload.notes = data.notes;

    const { data: subscription, error } = await admin
      .from("shop_subscriptions")
      .update(updatePayload)
      .eq("id", id)
      .select("id")
      .single();

    if (error || !subscription) {
      if (error?.code === "23505") {
        return { success: false, error: "Ez a bolt azonosító már rendelkezik előfizetéssel." };
      }
      console.error("[adminUpdateSubscription] Update error:", error?.message);
      return { success: false, error: "Hiba az előfizetés frissítésekor." };
    }

    await logAudit({
      actorId: profile.id,
      actorRole: profile.role,
      action: "subscription.update",
      entityType: "shop_subscription",
      entityId: subscription.id,
      metadata: { changes: data },
    });

    return { success: true, data: { id: subscription.id } };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[adminUpdateSubscription] Unexpected error:", message);
    return { success: false, error: "Váratlan hiba történt." };
  }
}

/** Cancel a subscription (sets status=cancelled, records cancelled_at) */
export async function adminCancelSubscription(id: string): Promise<ActionResult> {
  try {
    if (!isAgencyModeEnabled()) {
      return { success: false, error: AGENCY_MODE_DISABLED_ERROR };
    }
    const profile = await requireAgencyOwner();

    const idParsed = uuidSchema.safeParse(id);
    if (!idParsed.success) {
      return { success: false, error: "Érvénytelen előfizetés azonosító." };
    }

    const admin = createAdminClient();

    const { data: subscription, error } = await admin
      .from("shop_subscriptions")
      .update({ status: "cancelled", cancelled_at: new Date().toISOString() })
      .eq("id", id)
      .select("id, shop_identifier")
      .single();

    if (error || !subscription) {
      console.error("[adminCancelSubscription] Update error:", error?.message);
      return { success: false, error: "Hiba az előfizetés lemondásakor." };
    }

    await logAudit({
      actorId: profile.id,
      actorRole: profile.role,
      action: "subscription.cancel",
      entityType: "shop_subscription",
      entityId: subscription.id,
      metadata: { shop_identifier: subscription.shop_identifier },
    });

    return { success: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[adminCancelSubscription] Unexpected error:", message);
    return { success: false, error: "Váratlan hiba történt." };
  }
}

// ═══════════════════════════════════════════════════════════════════
//  INVOICE ACTIONS
// ═══════════════════════════════════════════════════════════════════

/** List invoices for a subscription (agency owner only) */
export async function listInvoices(
  subscriptionId: string,
): Promise<ActionResult<SubscriptionInvoiceRow[]>> {
  try {
    if (!isAgencyModeEnabled()) {
      return { success: false, error: AGENCY_MODE_DISABLED_ERROR };
    }
    await requireAgencyOwner();

    const idParsed = uuidSchema.safeParse(subscriptionId);
    if (!idParsed.success) {
      return { success: false, error: "Érvénytelen előfizetés azonosító." };
    }

    const admin = createAdminClient();
    const { data, error } = await admin
      .from("subscription_invoices")
      .select("*")
      .eq("subscription_id", subscriptionId)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("[listInvoices] Error:", error.message);
      return { success: false, error: "Hiba a számlák lekérésekor." };
    }

    return { success: true, data: data ?? [] };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[listInvoices] Unexpected error:", message);
    return { success: false, error: "Váratlan hiba történt." };
  }
}

/** Create a new subscription invoice (agency owner only) */
export async function adminCreateInvoice(input: unknown): Promise<ActionResult<{ id: string }>> {
  try {
    if (!isAgencyModeEnabled()) {
      return { success: false, error: AGENCY_MODE_DISABLED_ERROR };
    }
    const profile = await requireAgencyOwner();

    const parsed = invoiceCreateSchema.safeParse(input);
    if (!parsed.success) {
      const firstIssue = parsed.error.issues[0];
      return { success: false, error: firstIssue?.message ?? "Érvénytelen adatok." };
    }

    const data = parsed.data;
    const admin = createAdminClient();

    // Verify subscription exists
    const { data: sub } = await admin
      .from("shop_subscriptions")
      .select("id")
      .eq("id", data.subscription_id)
      .single();

    if (!sub) {
      return { success: false, error: "Az előfizetés nem található." };
    }

    const { data: invoice, error } = await admin
      .from("subscription_invoices")
      .insert({
        subscription_id: data.subscription_id,
        amount: data.amount,
        currency: data.currency ?? "HUF",
        billing_period_start: data.billing_period_start,
        billing_period_end: data.billing_period_end,
        status: data.status ?? "pending",
        paid_at: data.paid_at ?? null,
        invoice_provider: data.invoice_provider ?? null,
        invoice_number: data.invoice_number ?? null,
        invoice_url: data.invoice_url ?? null,
        payment_method: data.payment_method ?? null,
        notes: data.notes ?? null,
      })
      .select("id")
      .single();

    if (error || !invoice) {
      console.error("[adminCreateInvoice] Insert error:", error?.message);
      return { success: false, error: "Hiba a számla létrehozásakor." };
    }

    await logAudit({
      actorId: profile.id,
      actorRole: profile.role,
      action: "invoice.create",
      entityType: "subscription_invoice",
      entityId: invoice.id,
      metadata: {
        subscription_id: data.subscription_id,
        amount: data.amount,
        currency: data.currency ?? "HUF",
      },
    });

    return { success: true, data: { id: invoice.id } };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[adminCreateInvoice] Unexpected error:", message);
    return { success: false, error: "Váratlan hiba történt." };
  }
}

/** Update invoice status/details (agency owner only) */
export async function adminUpdateInvoice(
  id: string,
  input: unknown,
): Promise<ActionResult<{ id: string }>> {
  try {
    if (!isAgencyModeEnabled()) {
      return { success: false, error: AGENCY_MODE_DISABLED_ERROR };
    }
    const profile = await requireAgencyOwner();

    const idParsed = uuidSchema.safeParse(id);
    if (!idParsed.success) {
      return { success: false, error: "Érvénytelen számla azonosító." };
    }

    const parsed = invoiceUpdateSchema.safeParse(input);
    if (!parsed.success) {
      const firstIssue = parsed.error.issues[0];
      return { success: false, error: firstIssue?.message ?? "Érvénytelen adatok." };
    }

    const data = parsed.data;
    const admin = createAdminClient();

    const updatePayload: Record<string, unknown> = {};
    if (data.amount !== undefined) updatePayload.amount = data.amount;
    if (data.status !== undefined) updatePayload.status = data.status;
    if (data.paid_at !== undefined) updatePayload.paid_at = data.paid_at;
    if (data.invoice_provider !== undefined) updatePayload.invoice_provider = data.invoice_provider;
    if (data.invoice_number !== undefined) updatePayload.invoice_number = data.invoice_number;
    if (data.invoice_url !== undefined) updatePayload.invoice_url = data.invoice_url;
    if (data.payment_method !== undefined) updatePayload.payment_method = data.payment_method;
    if (data.notes !== undefined) updatePayload.notes = data.notes;

    // Auto-set paid_at when marking as paid
    if (data.status === "paid" && !data.paid_at) {
      updatePayload.paid_at = new Date().toISOString();
    }

    const { data: invoice, error } = await admin
      .from("subscription_invoices")
      .update(updatePayload)
      .eq("id", id)
      .select("id")
      .single();

    if (error || !invoice) {
      console.error("[adminUpdateInvoice] Update error:", error?.message);
      return { success: false, error: "Hiba a számla frissítésekor." };
    }

    await logAudit({
      actorId: profile.id,
      actorRole: profile.role,
      action: "invoice.update",
      entityType: "subscription_invoice",
      entityId: invoice.id,
      metadata: { changes: data },
    });

    return { success: true, data: { id: invoice.id } };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[adminUpdateInvoice] Unexpected error:", message);
    return { success: false, error: "Váratlan hiba történt." };
  }
}
