-- ============================================================================
-- Migration 018: Self-Service Subscription Payments
-- Adds recurring payment support (Barion token storage), self-service
-- subscription management, and payment tracking for automated billing.
-- ============================================================================

-- 1. Add 'suspended' to subscription_status enum
-- (used after grace period expires on failed renewals)
ALTER TYPE subscription_status ADD VALUE IF NOT EXISTS 'suspended';

-- 2. Add recurring payment columns to shop_subscriptions
ALTER TABLE shop_subscriptions
  ADD COLUMN IF NOT EXISTS barion_recurrence_token text,
  ADD COLUMN IF NOT EXISTS barion_funding_source text,
  ADD COLUMN IF NOT EXISTS last_payment_id text,
  ADD COLUMN IF NOT EXISTS grace_period_end timestamptz,
  ADD COLUMN IF NOT EXISTS renewal_attempts int NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS payment_method text DEFAULT 'barion';

COMMENT ON COLUMN shop_subscriptions.barion_recurrence_token IS 'Barion recurrence token for automated recurring charges. Stored after first successful payment with InitiateRecurrence=true.';
COMMENT ON COLUMN shop_subscriptions.barion_funding_source IS 'Funding source used for the initial payment (e.g. BankCard). Informational only.';
COMMENT ON COLUMN shop_subscriptions.last_payment_id IS 'Barion PaymentId of the most recent successful charge (initial or renewal).';
COMMENT ON COLUMN shop_subscriptions.grace_period_end IS 'End of grace period after a failed renewal. NULL when not in grace period. Status transitions to suspended after this date.';
COMMENT ON COLUMN shop_subscriptions.renewal_attempts IS 'Number of consecutive failed renewal attempts in the current billing cycle. Reset to 0 on successful payment.';
COMMENT ON COLUMN shop_subscriptions.payment_method IS 'Payment method for this subscription: barion (card) or manual (agency-managed).';

-- 3. Add Barion payment tracking columns to subscription_invoices
ALTER TABLE subscription_invoices
  ADD COLUMN IF NOT EXISTS barion_payment_id text,
  ADD COLUMN IF NOT EXISTS barion_trace_id text,
  ADD COLUMN IF NOT EXISTS is_renewal boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN subscription_invoices.barion_payment_id IS 'Barion PaymentId associated with this invoice record.';
COMMENT ON COLUMN subscription_invoices.barion_trace_id IS 'Barion TraceId for merchant-initiated recurring payments (renewals).';
COMMENT ON COLUMN subscription_invoices.is_renewal IS 'True if this invoice was created by the automated renewal system, false for initial/manual payments.';

-- 4. Create subscription_payment_events table for detailed payment event logging
CREATE TABLE subscription_payment_events (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  subscription_id uuid        NOT NULL REFERENCES shop_subscriptions(id) ON DELETE CASCADE,
  invoice_id      uuid        REFERENCES subscription_invoices(id) ON DELETE SET NULL,
  event_type      text        NOT NULL CHECK (event_type IN (
    'checkout_started',
    'checkout_succeeded',
    'checkout_failed',
    'renewal_started',
    'renewal_succeeded',
    'renewal_failed',
    'cancellation_requested',
    'subscription_suspended',
    'subscription_reactivated',
    'plan_changed',
    'token_updated'
  )),
  barion_payment_id text,
  barion_status     text,
  amount            int,
  currency          text       DEFAULT 'HUF',
  metadata          jsonb      NOT NULL DEFAULT '{}',
  created_at        timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_spe_subscription_id ON subscription_payment_events (subscription_id);
CREATE INDEX idx_spe_event_type      ON subscription_payment_events (event_type);
CREATE INDEX idx_spe_created_at      ON subscription_payment_events (created_at DESC);

COMMENT ON TABLE subscription_payment_events IS 'Detailed event log for subscription payment lifecycle. Used for debugging, auditing, and customer support.';

-- 5. RLS for subscription_payment_events (agency owners only for now)
ALTER TABLE subscription_payment_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "spe_agency_owner_select"
  ON subscription_payment_events FOR SELECT
  USING (is_agency_owner());

CREATE POLICY "spe_agency_owner_insert"
  ON subscription_payment_events FOR INSERT
  WITH CHECK (is_agency_owner());

-- Service role (admin client) bypasses RLS, so automated systems can write events.
-- Shop owners read events through server actions that use the admin client.

-- 6. Update shop_subscriptions RLS to allow authenticated users to read their own subscription
-- The shop_identifier is matched against the SHOP_IDENTIFIER config, but since RLS can't
-- read app config, we use a broader approach: any authenticated user in the admin role
-- can read subscriptions. The server action layer handles the shop_identifier filtering.

-- Add a SELECT policy for admin users (shop owners) to read their subscription
CREATE POLICY "shop_subscriptions_admin_select"
  ON shop_subscriptions FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role = 'admin'
    )
  );

-- Add UPDATE policy for admin users to update their own subscription (for self-service cancel)
CREATE POLICY "shop_subscriptions_admin_update"
  ON shop_subscriptions FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role = 'admin'
    )
  );

-- Allow admin users to read their subscription invoices
CREATE POLICY "subscription_invoices_admin_select"
  ON subscription_invoices FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role = 'admin'
    )
  );

-- 7. Add indexes for the new columns on shop_subscriptions
CREATE INDEX idx_shop_subscriptions_payment_method
  ON shop_subscriptions (payment_method);

CREATE INDEX idx_subscription_invoices_barion_payment_id
  ON subscription_invoices (barion_payment_id)
  WHERE barion_payment_id IS NOT NULL;

-- 8. Comments
COMMENT ON POLICY "shop_subscriptions_admin_select" ON shop_subscriptions IS 'Allows admin-role users (shop owners) to read their subscription. Server actions filter by shop_identifier.';
COMMENT ON POLICY "shop_subscriptions_admin_update" ON shop_subscriptions IS 'Allows admin-role users to update their subscription for self-service actions (cancel, plan change). Server actions validate ownership.';
COMMENT ON POLICY "subscription_invoices_admin_select" ON subscription_invoices IS 'Allows admin-role users to read subscription invoices. Server actions filter by subscription ownership.';
