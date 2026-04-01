-- ============================================================================
-- Migration 013: Plan Subscription Management System (FE-003)
-- Introduces plan tiers, per-shop subscriptions, feature gating,
-- agency-owner role flag, and subscription invoicing.
-- ============================================================================

-- 1. Extend profiles: add agency owner flag
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS is_agency_owner boolean NOT NULL DEFAULT false;

-- 2. Create subscription_status enum
do $$ begin
  create type subscription_status as enum ('active', 'past_due', 'cancelled', 'trialing');
exception when duplicate_object then null; end $$;

-- 3. Helper function for RLS: is the current user an agency owner?
CREATE OR REPLACE FUNCTION is_agency_owner()
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid()
      AND is_agency_owner = true
  );
$$;

-- 4. shop_plans table
CREATE TABLE shop_plans (
  id            uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  name          text        NOT NULL,
  slug          text        UNIQUE NOT NULL,
  description   text,
  base_monthly_price  int   NOT NULL DEFAULT 0,
  base_annual_price   int   NOT NULL DEFAULT 0,
  features      jsonb       NOT NULL DEFAULT '{}',
  sort_order    int         NOT NULL DEFAULT 0,
  is_active     boolean     NOT NULL DEFAULT true,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_shop_plans_slug       ON shop_plans (slug);
CREATE INDEX idx_shop_plans_is_active  ON shop_plans (is_active);

CREATE TRIGGER trg_shop_plans_updated_at
  BEFORE UPDATE ON shop_plans
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- 5. shop_subscriptions table
CREATE TABLE shop_subscriptions (
  id                    uuid              PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id               uuid              NOT NULL REFERENCES shop_plans(id),
  shop_identifier       text              UNIQUE NOT NULL,
  status                subscription_status NOT NULL DEFAULT 'active',
  billing_cycle         text              NOT NULL DEFAULT 'monthly' CHECK (billing_cycle IN ('monthly', 'annual')),
  custom_monthly_price  int,
  custom_annual_price   int,
  current_period_start  timestamptz       NOT NULL DEFAULT now(),
  current_period_end    timestamptz       NOT NULL DEFAULT (now() + interval '1 month'),
  trial_ends_at         timestamptz,
  cancelled_at          timestamptz,
  feature_overrides     jsonb             NOT NULL DEFAULT '{}',
  notes                 text,
  created_at            timestamptz       NOT NULL DEFAULT now(),
  updated_at            timestamptz       NOT NULL DEFAULT now()
);

CREATE INDEX idx_shop_subscriptions_plan_id          ON shop_subscriptions (plan_id);
CREATE INDEX idx_shop_subscriptions_shop_identifier  ON shop_subscriptions (shop_identifier);
CREATE INDEX idx_shop_subscriptions_status           ON shop_subscriptions (status);

CREATE TRIGGER trg_shop_subscriptions_updated_at
  BEFORE UPDATE ON shop_subscriptions
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- 6. subscription_invoices table
CREATE TABLE subscription_invoices (
  id                    uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  subscription_id       uuid        NOT NULL REFERENCES shop_subscriptions(id) ON DELETE CASCADE,
  amount                int         NOT NULL,
  currency              text        NOT NULL DEFAULT 'HUF',
  billing_period_start  timestamptz NOT NULL,
  billing_period_end    timestamptz NOT NULL,
  status                text        NOT NULL DEFAULT 'pending'
                                    CHECK (status IN ('pending', 'paid', 'failed', 'refunded')),
  paid_at               timestamptz,
  invoice_provider      text,
  invoice_number        text,
  invoice_url           text,
  payment_method        text,
  notes                 text,
  created_at            timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_subscription_invoices_subscription_id  ON subscription_invoices (subscription_id);
CREATE INDEX idx_subscription_invoices_status           ON subscription_invoices (status);
CREATE INDEX idx_subscription_invoices_created_at       ON subscription_invoices (created_at DESC);

-- 7. RLS policies

-- shop_plans: any authenticated user can read; only agency owners can write
ALTER TABLE shop_plans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "shop_plans_authenticated_read"
  ON shop_plans FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "shop_plans_agency_owner_insert"
  ON shop_plans FOR INSERT
  WITH CHECK (is_agency_owner());

CREATE POLICY "shop_plans_agency_owner_update"
  ON shop_plans FOR UPDATE
  USING (is_agency_owner());

CREATE POLICY "shop_plans_agency_owner_delete"
  ON shop_plans FOR DELETE
  USING (is_agency_owner());

-- shop_subscriptions: only agency owners can manage
ALTER TABLE shop_subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "shop_subscriptions_agency_owner_select"
  ON shop_subscriptions FOR SELECT
  USING (is_agency_owner());

CREATE POLICY "shop_subscriptions_agency_owner_insert"
  ON shop_subscriptions FOR INSERT
  WITH CHECK (is_agency_owner());

CREATE POLICY "shop_subscriptions_agency_owner_update"
  ON shop_subscriptions FOR UPDATE
  USING (is_agency_owner());

CREATE POLICY "shop_subscriptions_agency_owner_delete"
  ON shop_subscriptions FOR DELETE
  USING (is_agency_owner());

-- subscription_invoices: only agency owners can manage
ALTER TABLE subscription_invoices ENABLE ROW LEVEL SECURITY;

CREATE POLICY "subscription_invoices_agency_owner_select"
  ON subscription_invoices FOR SELECT
  USING (is_agency_owner());

CREATE POLICY "subscription_invoices_agency_owner_insert"
  ON subscription_invoices FOR INSERT
  WITH CHECK (is_agency_owner());

CREATE POLICY "subscription_invoices_agency_owner_update"
  ON subscription_invoices FOR UPDATE
  USING (is_agency_owner());

CREATE POLICY "subscription_invoices_agency_owner_delete"
  ON subscription_invoices FOR DELETE
  USING (is_agency_owner());

-- 8. Seed plan data: Basic and Premium tiers
INSERT INTO shop_plans (id, name, slug, description, base_monthly_price, base_annual_price, features, sort_order, is_active) VALUES
(
  'f1000001-0000-0000-0000-000000000001',
  'Alap',
  'basic',
  'Kisebb üzletek számára ideális csomag, alapvető funkcionalitással.',
  9900,
  99900,
  '{
    "max_products": 500,
    "max_admins": 1,
    "max_categories": 50,
    "delivery_options": 2,
    "enable_coupons": false,
    "enable_marketing_module": false,
    "enable_abandoned_cart": false,
    "enable_b2b_wholesale": false,
    "enable_reviews": false,
    "enable_price_history": false,
    "enable_product_extras": false,
    "enable_scheduled_publishing": false,
    "enable_agency_viewer": false,
    "enable_custom_pages": false
  }'::jsonb,
  1,
  true
),
(
  'f1000001-0000-0000-0000-000000000002',
  'Prémium',
  'premium',
  'Nagyobb webáruházak számára minden funkciót tartalmaz, korlátlan termékekkel és teljes integrációval.',
  14990,
  149900,
  '{
    "max_products": 0,
    "max_admins": 5,
    "max_categories": 0,
    "delivery_options": 0,
    "enable_coupons": true,
    "enable_marketing_module": true,
    "enable_abandoned_cart": true,
    "enable_b2b_wholesale": true,
    "enable_reviews": true,
    "enable_price_history": true,
    "enable_product_extras": true,
    "enable_scheduled_publishing": true,
    "enable_agency_viewer": true,
    "enable_custom_pages": true
  }'::jsonb,
  2,
  true
);

-- 9. Comments
COMMENT ON TABLE shop_plans IS 'Subscription plan tiers offered by the agency. Features stored as JSONB; 0 = unlimited for numeric limits.';
COMMENT ON TABLE shop_subscriptions IS 'Per-shop subscriptions linking a shop_identifier to a plan. shop_identifier is a free-text key (e.g. domain or internal ID), not a FK.';
COMMENT ON TABLE subscription_invoices IS 'Billing invoice records for shop subscriptions. status: pending | paid | failed | refunded.';
COMMENT ON COLUMN shop_plans.features IS 'JSONB feature set. Numeric fields: 0 = unlimited. Boolean fields: true = enabled.';
COMMENT ON COLUMN shop_subscriptions.feature_overrides IS 'Per-shop overrides applied on top of the plan features. Same schema as shop_plans.features.';
COMMENT ON COLUMN shop_subscriptions.shop_identifier IS 'Free-text unique key identifying the client shop (e.g. domain name or internal slug). Not a FK.';
COMMENT ON FUNCTION is_agency_owner IS 'Returns true if the current authenticated user has is_agency_owner=true in their profile. Used in RLS policies.';
