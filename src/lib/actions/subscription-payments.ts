"use server";

/* ------------------------------------------------------------------ */
/*  Self-service subscription payment actions                          */
/*                                                                     */
/*  These actions are used by shop owners (admin role) to:             */
/*    - Start a subscription payment (first payment with token capture)*/
/*    - Handle payment callbacks from Barion                           */
/*    - Cancel their own subscription                                  */
/*    - Change/upgrade their plan                                      */
/*    - Process automated renewals (called by cron/Edge Function)      */
/* ------------------------------------------------------------------ */

import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdmin, getCurrentProfile } from "@/lib/security/roles";
import { logAudit } from "@/lib/security/logger";
import { siteConfig } from "@/lib/config/site.config";
import {
  startSubscriptionCheckout,
  chargeRecurringPayment,
  verifySubscriptionPayment,
  getPaymentState,
} from "@/lib/integrations/barion/client";
import { generateSubscriptionInvoice } from "@/lib/integrations/invoicing/subscription-invoice";
import { uuidSchema } from "@/lib/validators/uuid";
import type { Json } from "@/lib/types/database.generated";
import type {
  ShopSubscriptionWithPlan,
  SubscriptionPaymentEventType,
  BillingCycle,
} from "@/lib/types/database";

// ── Types ──────────────────────────────────────────────────────────

interface ActionResult<T = undefined> {
  success: boolean;
  data?: T;
  error?: string;
}

// ── Helpers ─────────────────────────────────────────────────────────

function getShopIdentifier(): string {
  return siteConfig.subscription.defaultShopIdentifier;
}

/** Calculate billing period end from start date and cycle */
function calculatePeriodEnd(start: Date, cycle: BillingCycle): Date {
  const end = new Date(start);
  if (cycle === "annual") {
    end.setFullYear(end.getFullYear() + 1);
  } else {
    end.setMonth(end.getMonth() + 1);
  }
  return end;
}

/** Get the effective price for a plan + cycle, considering custom pricing */
function getEffectivePrice(
  plan: { base_monthly_price: number; base_annual_price: number },
  cycle: BillingCycle,
  subscription?: {
    custom_monthly_price: number | null;
    custom_annual_price: number | null;
  } | null,
): number {
  if (cycle === "annual") {
    return subscription?.custom_annual_price ?? plan.base_annual_price;
  }
  return subscription?.custom_monthly_price ?? plan.base_monthly_price;
}

/** Log a subscription payment event */
async function logPaymentEvent(params: {
  subscriptionId: string;
  invoiceId?: string;
  eventType: SubscriptionPaymentEventType;
  barionPaymentId?: string;
  barionStatus?: string;
  amount?: number;
  metadata?: Record<string, unknown>;
}): Promise<void> {
  try {
    const admin = createAdminClient();
    await admin.from("subscription_payment_events").insert({
      subscription_id: params.subscriptionId,
      invoice_id: params.invoiceId ?? null,
      event_type: params.eventType,
      barion_payment_id: params.barionPaymentId ?? null,
      barion_status: params.barionStatus ?? null,
      amount: params.amount ?? null,
      currency: "HUF",
      metadata: (params.metadata ?? {}) as Json,
    });
  } catch (err) {
    console.error("[subscription-payment-event] Failed to log event:", err);
  }
}

// ═══════════════════════════════════════════════════════════════════
//  START SUBSCRIPTION PAYMENT (customer-initiated)
// ═══════════════════════════════════════════════════════════════════

/**
 * Start a subscription payment for a given plan.
 *
 * Flow:
 * 1. Validates the plan exists and is active
 * 2. Creates or updates the shop_subscription record
 * 3. Creates a pending subscription_invoice
 * 4. Initiates a Barion payment with token capture
 * 5. Returns the Barion gateway URL for redirect
 *
 * If the shop already has a subscription, this handles plan changes
 * (upgrades). The new plan takes effect immediately with a new billing
 * period starting from today.
 */
export async function startSubscriptionPayment(
  planId: string,
  billingCycle: BillingCycle,
): Promise<ActionResult<{ gatewayUrl: string; paymentId: string }>> {
  try {
    const profile = await requireAdmin();
    const shopIdentifier = getShopIdentifier();
    const admin = createAdminClient();

    // Validate plan ID
    const planIdParsed = uuidSchema.safeParse(planId);
    if (!planIdParsed.success) {
      return { success: false, error: "Érvénytelen csomag azonosító." };
    }

    // Fetch plan
    const { data: plan, error: planError } = await admin
      .from("shop_plans")
      .select("*")
      .eq("id", planId)
      .eq("is_active", true)
      .single();

    if (planError || !plan) {
      return { success: false, error: "A kiválasztott csomag nem található vagy inaktív." };
    }

    // Check for existing subscription
    const { data: existingSub } = await admin
      .from("shop_subscriptions")
      .select("*")
      .eq("shop_identifier", shopIdentifier)
      .single();

    const amount = getEffectivePrice(plan, billingCycle, existingSub);

    if (amount <= 0) {
      return {
        success: false,
        error: "Az ár nem lehet nulla. Kérjük, vedd fel a kapcsolatot az ügynökségeddel.",
      };
    }

    const now = new Date();
    const periodStart = now;
    const periodEnd = calculatePeriodEnd(periodStart, billingCycle);

    // Handle trial period
    const { trialDays } = siteConfig.subscription;
    const isNewSubscription = !existingSub;
    const hasTrial = isNewSubscription && trialDays > 0;
    const trialEndsAt = hasTrial ? new Date(now.getTime() + trialDays * 24 * 60 * 60 * 1000) : null;

    // Create or update subscription
    let subscriptionId: string;

    if (existingSub) {
      // Update existing subscription: plan change / resubscribe
      const { error: updateError } = await admin
        .from("shop_subscriptions")
        .update({
          plan_id: planId,
          billing_cycle: billingCycle,
          status: "active",
          current_period_start: periodStart.toISOString(),
          current_period_end: periodEnd.toISOString(),
          cancelled_at: null,
          grace_period_end: null,
          renewal_attempts: 0,
          payment_method: "barion",
          updated_at: now.toISOString(),
        })
        .eq("id", existingSub.id);

      if (updateError) {
        console.error("[startSubscriptionPayment] Update subscription error:", updateError.message);
        return { success: false, error: "Hiba az előfizetés frissítésekor." };
      }

      subscriptionId = existingSub.id;
    } else {
      // Create new subscription
      const { data: newSub, error: insertError } = await admin
        .from("shop_subscriptions")
        .insert({
          plan_id: planId,
          shop_identifier: shopIdentifier,
          billing_cycle: billingCycle,
          status: hasTrial ? "trialing" : "active",
          current_period_start: periodStart.toISOString(),
          current_period_end: periodEnd.toISOString(),
          trial_ends_at: trialEndsAt?.toISOString() ?? null,
          payment_method: "barion",
        })
        .select("id")
        .single();

      if (insertError || !newSub) {
        console.error(
          "[startSubscriptionPayment] Insert subscription error:",
          insertError?.message,
        );
        return { success: false, error: "Hiba az előfizetés létrehozásakor." };
      }

      subscriptionId = newSub.id;
    }

    // Create pending invoice
    const { data: invoice, error: invoiceError } = await admin
      .from("subscription_invoices")
      .insert({
        subscription_id: subscriptionId,
        amount,
        currency: "HUF",
        billing_period_start: periodStart.toISOString(),
        billing_period_end: periodEnd.toISOString(),
        status: "pending",
        payment_method: "barion",
        is_renewal: false,
      })
      .select("id")
      .single();

    if (invoiceError || !invoice) {
      console.error("[startSubscriptionPayment] Invoice create error:", invoiceError?.message);
      return { success: false, error: "Hiba a számla létrehozásakor." };
    }

    // Start Barion payment with token capture
    const description = `${plan.name} csomag – ${billingCycle === "annual" ? "éves" : "havi"} előfizetés`;

    let barionResult;
    try {
      barionResult = await startSubscriptionCheckout({
        paymentRequestId: invoice.id,
        description,
        amount,
        payeeEmail: siteConfig.payments.barion.payeeEmail,
      });
    } catch (barionError) {
      const message = barionError instanceof Error ? barionError.message : "Barion hiba";
      console.error("[startSubscriptionPayment] Barion error:", message);

      // Mark invoice as failed
      await admin.from("subscription_invoices").update({ status: "failed" }).eq("id", invoice.id);

      await logPaymentEvent({
        subscriptionId,
        invoiceId: invoice.id,
        eventType: "checkout_failed",
        amount,
        metadata: { error: message, plan_id: planId, billing_cycle: billingCycle },
      });

      return { success: false, error: "Hiba a fizetés indításakor. Kérjük, próbáld újra." };
    }

    // Update invoice with Barion payment ID
    await admin
      .from("subscription_invoices")
      .update({ barion_payment_id: barionResult.paymentId })
      .eq("id", invoice.id);

    // Log event
    await logPaymentEvent({
      subscriptionId,
      invoiceId: invoice.id,
      eventType: "checkout_started",
      barionPaymentId: barionResult.paymentId,
      amount,
      metadata: {
        plan_id: planId,
        plan_name: plan.name,
        billing_cycle: billingCycle,
        is_plan_change: !isNewSubscription,
      },
    });

    await logAudit({
      actorId: profile.id,
      actorRole: profile.role,
      action: isNewSubscription
        ? "subscription.checkout_started"
        : "subscription.plan_change_started",
      entityType: "shop_subscription",
      entityId: subscriptionId,
      metadata: {
        plan_id: planId,
        plan_name: plan.name,
        billing_cycle: billingCycle,
        amount,
        barion_payment_id: barionResult.paymentId,
      },
    });

    return {
      success: true,
      data: {
        gatewayUrl: barionResult.gatewayUrl,
        paymentId: barionResult.paymentId,
      },
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[startSubscriptionPayment] Unexpected error:", message);
    return { success: false, error: "Váratlan hiba történt." };
  }
}

// ═══════════════════════════════════════════════════════════════════
//  HANDLE SUBSCRIPTION PAYMENT CALLBACK (Barion server-to-server)
// ═══════════════════════════════════════════════════════════════════

export interface SubscriptionCallbackResult {
  success: boolean;
  action: "activated" | "renewed" | "failed" | "no_op" | "error";
  subscriptionId: string | null;
  message: string;
}

/**
 * Process a Barion callback for a subscription payment.
 *
 * This is called by the callback route handler when Barion sends a
 * server-to-server notification about a subscription payment status change.
 *
 * Handles both initial checkout payments and renewal payments.
 */
export async function handleSubscriptionCallback(
  paymentId: string,
): Promise<SubscriptionCallbackResult> {
  const admin = createAdminClient();

  // 1. Find the invoice by Barion payment ID
  const { data: invoice, error: invoiceError } = await admin
    .from("subscription_invoices")
    .select("*")
    .eq("barion_payment_id", paymentId)
    .single();

  if (invoiceError || !invoice) {
    console.error("[subscription-callback] Invoice not found for paymentId:", paymentId);
    return {
      success: false,
      action: "error",
      subscriptionId: null,
      message: `Subscription invoice not found for paymentId: ${paymentId}`,
    };
  }

  // Idempotency: if invoice is already paid or refunded, no-op
  if (invoice.status === "paid" || invoice.status === "refunded") {
    console.info(
      `[subscription-callback] Invoice ${invoice.id} already in state "${invoice.status}" – no-op.`,
    );
    return {
      success: true,
      action: "no_op",
      subscriptionId: invoice.subscription_id,
      message: `Invoice already in terminal state: ${invoice.status}`,
    };
  }

  // 2. Verify payment with Barion
  let verification;
  try {
    verification = await verifySubscriptionPayment(paymentId);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown Barion verification error";
    console.error("[subscription-callback] Verification failed:", message);
    return {
      success: false,
      action: "error",
      subscriptionId: invoice.subscription_id,
      message: `Barion verification failed: ${message}`,
    };
  }

  // 3. Fetch the subscription
  const { data: subscription, error: subError } = await admin
    .from("shop_subscriptions")
    .select("*, shop_plans(*)")
    .eq("id", invoice.subscription_id)
    .single();

  if (subError || !subscription) {
    console.error("[subscription-callback] Subscription not found:", invoice.subscription_id);
    return {
      success: false,
      action: "error",
      subscriptionId: invoice.subscription_id,
      message: `Subscription not found: ${invoice.subscription_id}`,
    };
  }

  // 4. Handle payment outcome
  if (verification.succeeded) {
    return handleSubscriptionPaymentSuccess(admin, subscription, invoice, paymentId, verification);
  }

  // Payment failed
  const barionState = await getPaymentState(paymentId);
  const isFinalFailure = ["Canceled", "Expired", "Failed"].includes(barionState.status);

  if (isFinalFailure) {
    return handleSubscriptionPaymentFailure(
      admin,
      subscription,
      invoice,
      paymentId,
      barionState.status,
    );
  }

  // Payment still in progress
  console.info(
    `[subscription-callback] Payment ${paymentId} still in progress (${barionState.status}).`,
  );
  return {
    success: true,
    action: "no_op",
    subscriptionId: subscription.id,
    message: `Payment still in progress: ${barionState.status}`,
  };
}

// ── Handle successful subscription payment ────────────────────────

type SupabaseAdmin = ReturnType<typeof createAdminClient>;

async function handleSubscriptionPaymentSuccess(
  admin: SupabaseAdmin,
  subscription: Record<string, unknown> & {
    id: string;
    shop_plans: Record<string, unknown> | null;
  },
  invoice: Record<string, unknown> & { id: string; subscription_id: string; is_renewal: boolean },
  paymentId: string,
  verification: { recurrenceTokenCaptured: boolean; fundingSource: string | null },
): Promise<SubscriptionCallbackResult> {
  const now = new Date().toISOString();
  const isRenewal = invoice.is_renewal;

  // Update invoice to paid
  await admin
    .from("subscription_invoices")
    .update({
      status: "paid",
      paid_at: now,
    })
    .eq("id", invoice.id);

  // Build subscription update
  const subscriptionUpdate: Record<string, unknown> = {
    status: "active",
    last_payment_id: paymentId,
    grace_period_end: null,
    renewal_attempts: 0,
    updated_at: now,
  };

  // Store recurrence token if this was the initial payment
  if (verification.recurrenceTokenCaptured) {
    // For Barion, the PaymentId of the first successful recurring payment
    // IS the recurrence token (RecurrenceId) for future charges
    subscriptionUpdate.barion_recurrence_token = paymentId;
  }

  if (verification.fundingSource) {
    subscriptionUpdate.barion_funding_source = verification.fundingSource;
  }

  await admin.from("shop_subscriptions").update(subscriptionUpdate).eq("id", subscription.id);

  // Log event
  const eventType: SubscriptionPaymentEventType = isRenewal
    ? "renewal_succeeded"
    : "checkout_succeeded";

  await logPaymentEvent({
    subscriptionId: subscription.id,
    invoiceId: invoice.id,
    eventType,
    barionPaymentId: paymentId,
    barionStatus: "Succeeded",
    amount: invoice.amount as number,
    metadata: {
      recurrence_token_captured: verification.recurrenceTokenCaptured,
      funding_source: verification.fundingSource,
    },
  });

  // Generate invoice via configured provider (Billingo / Számlázz.hu)
  try {
    const invoiceResult = await generateSubscriptionInvoice(invoice.id);
    if (!invoiceResult.success) {
      console.error(
        `[subscription-callback] Invoice generation failed for ${invoice.id}:`,
        invoiceResult.error,
      );
    }
  } catch (invoiceErr) {
    // Invoice generation failure is non-blocking — payment already succeeded
    console.error(
      "[subscription-callback] Invoice generation threw:",
      invoiceErr instanceof Error ? invoiceErr.message : invoiceErr,
    );
  }

  const action = isRenewal ? "renewed" : "activated";
  console.info(
    `[subscription-callback] Subscription ${subscription.id} ${action}. Payment: ${paymentId}`,
  );

  return {
    success: true,
    action,
    subscriptionId: subscription.id,
    message: `Subscription ${action} successfully.`,
  };
}

// ── Handle failed subscription payment ────────────────────────────

async function handleSubscriptionPaymentFailure(
  admin: SupabaseAdmin,
  subscription: Record<string, unknown> & { id: string },
  invoice: Record<string, unknown> & { id: string; subscription_id: string; is_renewal: boolean },
  paymentId: string,
  barionStatus: string,
): Promise<SubscriptionCallbackResult> {
  const now = new Date().toISOString();

  // Update invoice to failed
  await admin.from("subscription_invoices").update({ status: "failed" }).eq("id", invoice.id);

  const isRenewal = invoice.is_renewal;
  const eventType: SubscriptionPaymentEventType = isRenewal ? "renewal_failed" : "checkout_failed";

  // For renewals, handle grace period logic
  if (isRenewal) {
    const currentAttempts = (subscription.renewal_attempts as number) ?? 0;
    const newAttempts = currentAttempts + 1;
    const maxAttempts = siteConfig.subscription.renewalRetryAttempts;

    if (newAttempts >= maxAttempts) {
      // Max retries reached — suspend the subscription
      const gracePeriodEnd = new Date(
        Date.now() + siteConfig.subscription.gracePeriodDays * 24 * 60 * 60 * 1000,
      );

      await admin
        .from("shop_subscriptions")
        .update({
          status: "past_due",
          renewal_attempts: newAttempts,
          grace_period_end: gracePeriodEnd.toISOString(),
          updated_at: now,
        })
        .eq("id", subscription.id);

      await logPaymentEvent({
        subscriptionId: subscription.id,
        invoiceId: invoice.id,
        eventType,
        barionPaymentId: paymentId,
        barionStatus,
        amount: invoice.amount as number,
        metadata: {
          renewal_attempts: newAttempts,
          max_attempts: maxAttempts,
          grace_period_end: gracePeriodEnd.toISOString(),
          action: "grace_period_started",
        },
      });
    } else {
      // Increment retry counter, keep status as-is
      await admin
        .from("shop_subscriptions")
        .update({
          renewal_attempts: newAttempts,
          updated_at: now,
        })
        .eq("id", subscription.id);

      await logPaymentEvent({
        subscriptionId: subscription.id,
        invoiceId: invoice.id,
        eventType,
        barionPaymentId: paymentId,
        barionStatus,
        amount: invoice.amount as number,
        metadata: { renewal_attempts: newAttempts, max_attempts: maxAttempts },
      });
    }
  } else {
    // Initial checkout failed — log and leave subscription in current state
    await logPaymentEvent({
      subscriptionId: subscription.id,
      invoiceId: invoice.id,
      eventType,
      barionPaymentId: paymentId,
      barionStatus,
      amount: invoice.amount as number,
    });
  }

  console.info(
    `[subscription-callback] Payment ${paymentId} failed (${barionStatus}) for subscription ${subscription.id}.`,
  );

  return {
    success: true,
    action: "failed",
    subscriptionId: subscription.id,
    message: `Payment failed: ${barionStatus}`,
  };
}

// ═══════════════════════════════════════════════════════════════════
//  CANCEL SUBSCRIPTION (shop owner self-service)
// ═══════════════════════════════════════════════════════════════════

/**
 * Cancel the current shop's subscription.
 *
 * The subscription remains active until the end of the current billing
 * period (no refund). After the period ends, features are locked.
 * No further renewal charges will be attempted.
 */
export async function cancelMySubscription(): Promise<ActionResult> {
  try {
    const profile = await requireAdmin();
    const shopIdentifier = getShopIdentifier();
    const admin = createAdminClient();

    // Fetch current subscription
    const { data: subscription, error: subError } = await admin
      .from("shop_subscriptions")
      .select("*")
      .eq("shop_identifier", shopIdentifier)
      .single();

    if (subError || !subscription) {
      return { success: false, error: "Nincs aktív előfizetés." };
    }

    // Can only cancel active or trialing subscriptions
    if (!["active", "trialing"].includes(subscription.status)) {
      return {
        success: false,
        error: `Az előfizetés jelenlegi állapota (${subscription.status}) nem teszi lehetővé a lemondást.`,
      };
    }

    const now = new Date().toISOString();

    // Set cancelled_at but keep status active until period end
    // The renewal cron will transition to 'cancelled' after period_end
    await admin
      .from("shop_subscriptions")
      .update({
        cancelled_at: now,
        updated_at: now,
      })
      .eq("id", subscription.id);

    await logPaymentEvent({
      subscriptionId: subscription.id,
      eventType: "cancellation_requested",
      metadata: {
        effective_until: subscription.current_period_end,
        cancelled_by: profile.id,
      },
    });

    await logAudit({
      actorId: profile.id,
      actorRole: profile.role,
      action: "subscription.cancel_requested",
      entityType: "shop_subscription",
      entityId: subscription.id,
      metadata: {
        shop_identifier: shopIdentifier,
        effective_until: subscription.current_period_end,
      },
    });

    return { success: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[cancelMySubscription] Unexpected error:", message);
    return { success: false, error: "Váratlan hiba történt." };
  }
}

// ═══════════════════════════════════════════════════════════════════
//  GET MY SUBSCRIPTION (enhanced with payment info)
// ═══════════════════════════════════════════════════════════════════

/**
 * Get the current shop's subscription with payment information.
 * Includes whether the subscription has a stored payment method,
 * whether it's scheduled for cancellation, etc.
 */
export async function getMySubscriptionWithPaymentInfo(): Promise<
  ActionResult<
    ShopSubscriptionWithPlan & {
      hasPaymentMethod: boolean;
      isCancelScheduled: boolean;
      canResubscribe: boolean;
    }
  >
> {
  try {
    await requireAdmin();
    const shopIdentifier = getShopIdentifier();
    const admin = createAdminClient();

    const { data, error } = await admin
      .from("shop_subscriptions")
      .select("*, shop_plans(*)")
      .eq("shop_identifier", shopIdentifier)
      .single();

    if (error || !data) {
      return { success: true, data: undefined };
    }

    const plan = data.shop_plans;
    if (!plan) {
      return { success: false, error: "A csomag adatai nem elérhetők." };
    }

    const result = {
      ...data,
      plan,
      hasPaymentMethod: !!data.barion_recurrence_token,
      isCancelScheduled: !!data.cancelled_at && ["active", "trialing"].includes(data.status),
      canResubscribe: ["cancelled", "suspended"].includes(data.status),
    };

    return { success: true, data: result };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[getMySubscriptionWithPaymentInfo] Unexpected error:", message);
    return { success: false, error: "Váratlan hiba történt." };
  }
}

// ═══════════════════════════════════════════════════════════════════
//  PROCESS RENEWAL (called by cron/Edge Function)
// ═══════════════════════════════════════════════════════════════════

/**
 * Process a single subscription renewal.
 *
 * This is called by the renewal scheduler for subscriptions whose
 * current_period_end has passed. It:
 * 1. Creates a new invoice
 * 2. Charges the stored recurrence token
 * 3. Extends the billing period on success
 * 4. Handles failures with retry logic
 *
 * This function uses the admin client and does NOT require
 * authentication — it's designed to be called from a cron job
 * or Edge Function with a service role key.
 */
export async function processSubscriptionRenewal(
  subscriptionId: string,
): Promise<ActionResult<{ invoiceId: string; status: "charged" | "failed" | "skipped" }>> {
  const admin = createAdminClient();

  try {
    // Fetch subscription with plan
    const { data: subscription, error: subError } = await admin
      .from("shop_subscriptions")
      .select("*, shop_plans(*)")
      .eq("id", subscriptionId)
      .single();

    if (subError || !subscription) {
      return { success: false, error: `Előfizetés nem található: ${subscriptionId}` };
    }

    // Skip if cancelled (and cancellation should take effect)
    if (subscription.cancelled_at) {
      const cancelDate = new Date(subscription.cancelled_at);
      const periodEnd = new Date(subscription.current_period_end);

      if (cancelDate <= periodEnd) {
        // Cancellation was requested before period end — transition to cancelled
        await admin
          .from("shop_subscriptions")
          .update({
            status: "cancelled",
            updated_at: new Date().toISOString(),
          })
          .eq("id", subscriptionId);

        console.info(`[renewal] Subscription ${subscriptionId} transitioned to cancelled.`);
        return {
          success: true,
          data: { invoiceId: "", status: "skipped" },
        };
      }
    }

    // Skip if no recurrence token
    if (!subscription.barion_recurrence_token) {
      console.warn(`[renewal] Subscription ${subscriptionId} has no recurrence token. Skipping.`);
      return {
        success: true,
        data: { invoiceId: "", status: "skipped" },
      };
    }

    // Skip if already suspended and past grace period
    if (subscription.status === "suspended") {
      console.info(`[renewal] Subscription ${subscriptionId} is suspended. Skipping renewal.`);
      return {
        success: true,
        data: { invoiceId: "", status: "skipped" },
      };
    }

    // Check grace period expiry for past_due subscriptions
    if (subscription.status === "past_due" && subscription.grace_period_end) {
      const graceEnd = new Date(subscription.grace_period_end);
      if (new Date() > graceEnd) {
        // Grace period expired — suspend
        await admin
          .from("shop_subscriptions")
          .update({
            status: "suspended",
            updated_at: new Date().toISOString(),
          })
          .eq("id", subscriptionId);

        await logPaymentEvent({
          subscriptionId,
          eventType: "subscription_suspended",
          metadata: { grace_period_end: subscription.grace_period_end },
        });

        console.info(`[renewal] Subscription ${subscriptionId} suspended (grace period expired).`);
        return {
          success: true,
          data: { invoiceId: "", status: "skipped" },
        };
      }
    }

    const plan = subscription.shop_plans;
    if (!plan) {
      return { success: false, error: "A csomag adatai nem elérhetők." };
    }

    // Calculate renewal amount
    const amount = getEffectivePrice(
      plan as { base_monthly_price: number; base_annual_price: number },
      subscription.billing_cycle,
      subscription,
    );

    if (amount <= 0) {
      console.warn(`[renewal] Subscription ${subscriptionId} has zero price. Skipping.`);
      return { success: true, data: { invoiceId: "", status: "skipped" } };
    }

    // Calculate new billing period
    const newPeriodStart = new Date(subscription.current_period_end);
    const newPeriodEnd = calculatePeriodEnd(newPeriodStart, subscription.billing_cycle);

    // Create renewal invoice
    const traceId = crypto.randomUUID();
    const { data: invoice, error: invoiceError } = await admin
      .from("subscription_invoices")
      .insert({
        subscription_id: subscriptionId,
        amount,
        currency: "HUF",
        billing_period_start: newPeriodStart.toISOString(),
        billing_period_end: newPeriodEnd.toISOString(),
        status: "pending",
        payment_method: "barion",
        is_renewal: true,
        barion_trace_id: traceId,
      })
      .select("id")
      .single();

    if (invoiceError || !invoice) {
      console.error("[renewal] Invoice create error:", invoiceError?.message);
      return { success: false, error: "Hiba a számla létrehozásakor." };
    }

    // Charge recurring payment
    const planName = (plan as { name: string }).name;
    const description = `${planName} csomag – ${subscription.billing_cycle === "annual" ? "éves" : "havi"} megújítás`;

    let chargeResult;
    try {
      chargeResult = await chargeRecurringPayment({
        paymentRequestId: invoice.id,
        recurrenceToken: subscription.barion_recurrence_token,
        description,
        amount,
        payeeEmail: siteConfig.payments.barion.payeeEmail,
        traceId,
      });
    } catch (barionError) {
      const message = barionError instanceof Error ? barionError.message : "Barion hiba";
      console.error("[renewal] Barion charge error:", message);

      await admin.from("subscription_invoices").update({ status: "failed" }).eq("id", invoice.id);

      // Handle renewal failure
      const currentAttempts = subscription.renewal_attempts ?? 0;
      const newAttempts = currentAttempts + 1;

      if (newAttempts >= siteConfig.subscription.renewalRetryAttempts) {
        const gracePeriodEnd = new Date(
          Date.now() + siteConfig.subscription.gracePeriodDays * 24 * 60 * 60 * 1000,
        );

        await admin
          .from("shop_subscriptions")
          .update({
            status: "past_due",
            renewal_attempts: newAttempts,
            grace_period_end: gracePeriodEnd.toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq("id", subscriptionId);
      } else {
        await admin
          .from("shop_subscriptions")
          .update({
            renewal_attempts: newAttempts,
            updated_at: new Date().toISOString(),
          })
          .eq("id", subscriptionId);
      }

      await logPaymentEvent({
        subscriptionId,
        invoiceId: invoice.id,
        eventType: "renewal_failed",
        amount,
        metadata: { error: message, renewal_attempts: (subscription.renewal_attempts ?? 0) + 1 },
      });

      return {
        success: true,
        data: { invoiceId: invoice.id, status: "failed" },
      };
    }

    // Update invoice with Barion payment ID
    await admin
      .from("subscription_invoices")
      .update({ barion_payment_id: chargeResult.paymentId })
      .eq("id", invoice.id);

    // For merchant-initiated payments, Barion may process them synchronously.
    // The callback will handle the final status update.
    // Log the renewal attempt.
    await logPaymentEvent({
      subscriptionId,
      invoiceId: invoice.id,
      eventType: "renewal_started",
      barionPaymentId: chargeResult.paymentId,
      barionStatus: chargeResult.status,
      amount,
      metadata: { trace_id: traceId },
    });

    // If the payment already succeeded synchronously (common for merchant-initiated),
    // update immediately instead of waiting for callback
    if (chargeResult.status === "Succeeded") {
      await admin
        .from("subscription_invoices")
        .update({ status: "paid", paid_at: new Date().toISOString() })
        .eq("id", invoice.id);

      await admin
        .from("shop_subscriptions")
        .update({
          status: "active",
          current_period_start: newPeriodStart.toISOString(),
          current_period_end: newPeriodEnd.toISOString(),
          last_payment_id: chargeResult.paymentId,
          grace_period_end: null,
          renewal_attempts: 0,
          updated_at: new Date().toISOString(),
        })
        .eq("id", subscriptionId);

      await logPaymentEvent({
        subscriptionId,
        invoiceId: invoice.id,
        eventType: "renewal_succeeded",
        barionPaymentId: chargeResult.paymentId,
        barionStatus: "Succeeded",
        amount,
      });

      // Generate invoice via configured provider
      try {
        const invoiceGenResult = await generateSubscriptionInvoice(invoice.id);
        if (!invoiceGenResult.success) {
          console.error(
            `[renewal] Invoice generation failed for ${invoice.id}:`,
            invoiceGenResult.error,
          );
        }
      } catch (invoiceErr) {
        // Non-blocking — renewal payment already succeeded
        console.error(
          "[renewal] Invoice generation threw:",
          invoiceErr instanceof Error ? invoiceErr.message : invoiceErr,
        );
      }

      console.info(`[renewal] Subscription ${subscriptionId} renewed successfully (sync).`);
      return {
        success: true,
        data: { invoiceId: invoice.id, status: "charged" },
      };
    }

    // Payment is still processing — callback will handle the rest
    console.info(
      `[renewal] Subscription ${subscriptionId} renewal initiated (status: ${chargeResult.status}). Awaiting callback.`,
    );
    return {
      success: true,
      data: { invoiceId: invoice.id, status: "charged" },
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[processSubscriptionRenewal] Unexpected error:", message);
    return { success: false, error: `Váratlan hiba: ${message}` };
  }
}

// ═══════════════════════════════════════════════════════════════════
//  FIND SUBSCRIPTIONS DUE FOR RENEWAL (used by cron)
// ═══════════════════════════════════════════════════════════════════

/**
 * Find all subscriptions that are due for renewal.
 * A subscription is due when:
 * - current_period_end <= now
 * - status is 'active' or 'past_due' (retry)
 * - cancelled_at is null (not scheduled for cancellation)
 * - barion_recurrence_token is not null
 */
export async function findSubscriptionsDueForRenewal(): Promise<ActionResult<string[]>> {
  try {
    const admin = createAdminClient();
    const now = new Date().toISOString();

    const { data, error } = await admin
      .from("shop_subscriptions")
      .select("id")
      .lte("current_period_end", now)
      .in("status", ["active", "past_due"])
      .is("cancelled_at", null)
      .not("barion_recurrence_token", "is", null);

    if (error) {
      console.error("[findSubscriptionsDueForRenewal] Error:", error.message);
      return { success: false, error: "Hiba a megújítandó előfizetések lekérésekor." };
    }

    return { success: true, data: (data ?? []).map((s) => s.id) };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[findSubscriptionsDueForRenewal] Unexpected error:", message);
    return { success: false, error: "Váratlan hiba történt." };
  }
}
