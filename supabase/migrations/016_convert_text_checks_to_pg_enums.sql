/* ------------------------------------------------------------------ */
/*  016 — Convert text+CHECK columns to proper PostgreSQL enums        */
/*                                                                     */
/*  This allows `supabase gen types` to generate proper union literal  */
/*  TypeScript types instead of `string`.                              */
/*                                                                     */
/*  Columns converted:                                                 */
/*    coupons.discount_type            → discount_type enum            */
/*    orders.payment_method            → payment_method enum           */
/*    reviews.status                   → review_status enum            */
/*    subscription_invoices.status     → invoice_status enum           */
/*    shop_subscriptions.billing_cycle → billing_cycle enum            */
/* ------------------------------------------------------------------ */

-- 1. Create the new enum types

CREATE TYPE public.discount_type AS ENUM ('percentage', 'fixed');

CREATE TYPE public.payment_method AS ENUM ('barion', 'cod');

CREATE TYPE public.review_status AS ENUM ('pending', 'approved', 'rejected');

CREATE TYPE public.invoice_status AS ENUM ('pending', 'paid', 'failed', 'refunded');

CREATE TYPE public.billing_cycle AS ENUM ('monthly', 'annual');

-- 2. Convert coupons.discount_type
ALTER TABLE public.coupons DROP CONSTRAINT IF EXISTS coupons_discount_type_check;

ALTER TABLE public.coupons
  ALTER COLUMN discount_type DROP DEFAULT,
  ALTER COLUMN discount_type TYPE public.discount_type USING discount_type::public.discount_type,
  ALTER COLUMN discount_type SET DEFAULT 'percentage';

-- 3. Convert orders.payment_method
ALTER TABLE public.orders DROP CONSTRAINT IF EXISTS chk_orders_payment_method;

ALTER TABLE public.orders
  ALTER COLUMN payment_method DROP DEFAULT,
  ALTER COLUMN payment_method TYPE public.payment_method USING payment_method::public.payment_method,
  ALTER COLUMN payment_method SET DEFAULT 'barion';

-- 4. Convert reviews.status
--    The product_review_stats VIEW and multiple RLS policies depend on
--    reviews.status, so we must drop them all first, then recreate.

DROP VIEW IF EXISTS public.product_review_stats;

DROP POLICY IF EXISTS reviews_public_read ON public.reviews;
DROP POLICY IF EXISTS reviews_own_read ON public.reviews;
DROP POLICY IF EXISTS reviews_insert ON public.reviews;
DROP POLICY IF EXISTS reviews_own_update ON public.reviews;
DROP POLICY IF EXISTS reviews_admin_all ON public.reviews;
DROP POLICY IF EXISTS reviews_agency_viewer_read ON public.reviews;

ALTER TABLE public.reviews DROP CONSTRAINT IF EXISTS reviews_status_check;

ALTER TABLE public.reviews
  ALTER COLUMN status DROP DEFAULT,
  ALTER COLUMN status TYPE public.review_status USING status::public.review_status,
  ALTER COLUMN status SET DEFAULT 'pending';

-- Recreate the view with the enum column
CREATE OR REPLACE VIEW public.product_review_stats AS
SELECT
  product_id,
  COUNT(*) FILTER (WHERE status = 'approved')::int AS review_count,
  COALESCE(ROUND(AVG(rating) FILTER (WHERE status = 'approved'), 1), 0)::numeric AS average_rating,
  COUNT(*) FILTER (WHERE status = 'approved' AND rating = 5)::int AS five_star,
  COUNT(*) FILTER (WHERE status = 'approved' AND rating = 4)::int AS four_star,
  COUNT(*) FILTER (WHERE status = 'approved' AND rating = 3)::int AS three_star,
  COUNT(*) FILTER (WHERE status = 'approved' AND rating = 2)::int AS two_star,
  COUNT(*) FILTER (WHERE status = 'approved' AND rating = 1)::int AS one_star
FROM public.reviews
GROUP BY product_id;

-- Recreate all RLS policies on reviews
CREATE POLICY reviews_public_read ON public.reviews
  FOR SELECT
  USING (status = 'approved');

CREATE POLICY reviews_own_read ON public.reviews
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY reviews_insert ON public.reviews
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY reviews_own_update ON public.reviews
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY reviews_admin_all ON public.reviews
  FOR ALL
  TO authenticated
  USING (public.current_app_role() = 'admin')
  WITH CHECK (public.current_app_role() = 'admin');

CREATE POLICY reviews_agency_viewer_read ON public.reviews
  FOR SELECT
  TO authenticated
  USING (public.current_app_role() = 'agency_viewer');

-- 5. Convert subscription_invoices.status
ALTER TABLE public.subscription_invoices DROP CONSTRAINT IF EXISTS subscription_invoices_status_check;

ALTER TABLE public.subscription_invoices
  ALTER COLUMN status DROP DEFAULT,
  ALTER COLUMN status TYPE public.invoice_status USING status::public.invoice_status,
  ALTER COLUMN status SET DEFAULT 'pending';

-- 6. Convert shop_subscriptions.billing_cycle
ALTER TABLE public.shop_subscriptions DROP CONSTRAINT IF EXISTS shop_subscriptions_billing_cycle_check;

ALTER TABLE public.shop_subscriptions
  ALTER COLUMN billing_cycle DROP DEFAULT,
  ALTER COLUMN billing_cycle TYPE public.billing_cycle USING billing_cycle::public.billing_cycle,
  ALTER COLUMN billing_cycle SET DEFAULT 'monthly';
